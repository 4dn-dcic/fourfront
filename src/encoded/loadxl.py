# -*- coding: utf-8 -*-
"""Load collections and determine the order."""

import json
import magic
import mimetypes
import os
import structlog
import webtest

from base64 import b64encode
from dcicutils.misc_utils import ignored, VirtualApp
from PIL import Image
from pkg_resources import resource_filename
from pyramid.paster import get_app
from pyramid.response import Response
from pyramid.view import view_config
from snovault.util import debug_log
from .server_defaults import add_last_modified


text = type(u'')
logger = structlog.getLogger(__name__)


def includeme(config):
    # provide an endpoint to do bulk uploading that just uses loadxl
    config.add_route('load_data', '/load_data')
    config.scan(__name__)


# order of items references with linkTo in a field in  'required' in schemas
ORDER = [
    'user',
    'award',
    'lab',
    'file_format',
    'ontology',
    'ontology_term',  # validate_biosource_cell_line requires term_name
    'experiment_type',
    'biosource',
    'biosample',
    'organism',  # allow the 'default' linkTo in individuals work
    'workflow',
    'vendor',
]


IS_ATTACHMENT = [
    'attachment',
    'file_format_specification',
]


LOADXL_USER_UUID = "3202fd57-44d2-44fb-a131-afb1e43d8ae5"


class LoadGenWrapper(object):
    """
    Simple class that accepts a generator function and handles errors by
    setting self.caught to the error message.
    """
    def __init__(self, gen):
        self.gen = gen
        self.caught = None

    def __iter__(self):
        """
        Iterate through self.gen and see if 'ERROR: ' bytes are in any yielded
        value. If so, store the error message as self.caught and raise
        StopIteration to halt the generator.
        """
        # self.caught = yield from self.gen
        for iter_val in self.gen:
            if b'ERROR:' in iter_val:
                self.caught = iter_val.decode()
            yield iter_val

    def close(self):
        if self.caught:
            logger.error('load_data: failed to load with iter_response', error=self.caught)


def load_data_via_ingester(vapp: VirtualApp, ontology_json: dict, itype: str = "ontology_term") -> dict:
    """
    Entry point for call from encoded.ingester.processors.handle_ontology_update (2023-03-08).
    """
    response = load_all_gen(vapp, ontology_json, None, overwrite=True, itype=itype, from_json=True, patch_only=False)
    results = {"post": [], "patch": [], "skip": [], "error": []}
    unique_uuids = set()
    for item in response:
        if (item := item.decode("ascii")) and (item_split := item.split()) and len(item_split) == 2:
            action = item_split[0].lower()
            if action.endswith(":"):
                action = action[:-1]
            uuid = item_split[1]
            if action == "post":
                results["post"].append(uuid)
            elif action == "patch":
                results["patch"].append(uuid)
            elif action == "skip":
                results["skip"].append(uuid)
            elif action == "error":
                results["error"].append(uuid)
            unique_uuids.add(uuid)
    results["unique"] = len(unique_uuids)
    return results


def obsolete_load_data_via_ingester(vapp, ontology_json):
    """
    Entry point for call from encoded.ingester.processors.handle_ontology_update (2023-03-08).
    """
    return Response(
        content_type="text/plain",
        app_iter=LoadGenWrapper(
            load_all_gen(vapp, ontology_json, None, overwrite=True,
                         itype="ontology_term", from_json=True, patch_only=False)
        )
    )


@view_config(route_name='load_data', request_method='POST', permission='add')
@debug_log
def load_data_view(context, request):
    """
    expected input data

    {'local_path': path to a directory or file in file system
     'fdn_dir': inserts folder under encoded
     'store': if not local_path or fdn_dir, look for a dictionary of items here
     'overwrite' (Bool): overwrite if existing data
     'itype': (list or str): only pick some types from the source or specify type in in_file
     'iter_response': invoke the Response as an app_iter, directly calling load_all_gen
     'config_uri': user supplied configuration file}

    post can contain 2 different styles of data
    1) reference to a folder or file (local_path or fd_dir). If this is done
       itype can be optionally used to specify type of items loaded from files
    2) store in form of {'item_type': [items], 'item_type2': [items]}
       item_type should be same as insert file names i.e. file_fastq
    """
    ignored(context)
    # this is a bit weird but want to reuse load_data functionality so I'm rolling with it
    config_uri = request.json.get('config_uri', 'production.ini')
    patch_only = request.json.get('patch_only', False)
    app = get_app(config_uri, 'app')
    environ = {'HTTP_ACCEPT': 'application/json', 'REMOTE_USER': 'TEST'}
    testapp = webtest.TestApp(app, environ)
    # expected response
    request.response.status = 200
    result = {
        'status': 'success',
        '@type': ['result'],
    }
    store = request.json.get('store', {})
    local_path = request.json.get('local_path')
    fdn_dir = request.json.get('fdn_dir')
    overwrite = request.json.get('overwrite', False)
    itype = request.json.get('itype')
    iter_resp = request.json.get('iter_response', False)
    inserts = None
    from_json = False
    if fdn_dir:
        inserts = resource_filename('encoded', 'tests/data/' + fdn_dir + '/')
    elif local_path:
        inserts = local_path
    elif store:
        inserts = store
        from_json = True
    # if we want to iterate over the response to keep the connection alive
    # this directly calls load_all_gen, instead of load_all
    if iter_resp:
        return Response(
            content_type='text/plain',
            app_iter=LoadGenWrapper(
                load_all_gen(testapp, inserts, None, overwrite=overwrite,
                             itype=itype, from_json=from_json, patch_only=patch_only)
            )
        )
    # otherwise, it is a regular view and we can call load_all as usual
    if inserts:
        res = load_all(testapp, inserts, None, overwrite=overwrite, itype=itype, from_json=from_json)
    else:
        res = 'No uploadable content found!'

    if res:  # None if load_all is successful
        print(LOAD_ERROR_MESSAGE)
        request.response.status = 422
        result['status'] = 'error'
        result['@graph'] = str(res)
    return result


def trim(value):
    """Shorten excessively long fields in error log."""
    if isinstance(value, dict):
        return {k: trim(v) for k, v in value.items()}
    if isinstance(value, list):
        return [trim(v) for v in value]
    if isinstance(value, str) and len(value) > 160:
        return value[:77] + '...' + value[-80:]
    return value


def find_doc(docsdir, filename):
    """tries to find the file, if not returns false."""
    path = None
    if not docsdir:
        return
    for dirpath in docsdir:
        candidate = os.path.join(dirpath, filename)
        if not os.path.exists(candidate):
            continue
        if path is not None:
            msg = 'Duplicate filenames: %s, %s' % (path, candidate)
            raise ValueError(msg)
        path = candidate
    if path is None:
        return
    return path


def attachment(path):
    """Create an attachment upload object from a filename Embeds the attachment as a data url."""
    filename = os.path.basename(path)
    mime_type, encoding = mimetypes.guess_type(path)
    major, minor = mime_type.split('/')
    try:
        detected_type = magic.from_file(path, mime=True).decode('ascii')
    except AttributeError:
        detected_type = magic.from_file(path, mime=True)
    # XXX This validation logic should move server-side.
    if not (detected_type == mime_type or
            detected_type == 'text/plain' and major == 'text'):
        raise ValueError('Wrong extension for %s: %s' % (detected_type, filename))
    with open(path, 'rb') as stream:
        attach = {'download': filename,
                  'type': mime_type,
                  'href': 'data:%s;base64,%s' % (mime_type, b64encode(stream.read()).decode('ascii'))}
        if mime_type in ('application/pdf', "application/zip", 'text/plain',
                         'text/tab-separated-values', 'text/html', 'application/msword', 'application/vnd.ms-excel',
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
            # XXX Should use chardet to detect charset for text files here.
            return attach
        if major == 'image' and minor in ('png', 'jpeg', 'gif', 'tiff'):
            # XXX we should just convert our tiffs to pngs
            stream.seek(0, 0)
            im = Image.open(stream)
            im.verify()
            if im.format != minor.upper():
                msg = "Image file format %r does not match extension for %s"
                raise ValueError(msg % (im.format, filename))
            attach['width'], attach['height'] = im.size
            return attach
    raise ValueError("Unknown file type for %s" % filename)


def format_for_attachment(json_data, docsdir):
    for field in IS_ATTACHMENT:
        if field in json_data:
            if isinstance(json_data[field], dict):
                pass
            elif isinstance(json_data[field], str):
                path = find_doc(docsdir, json_data[field])
                if not path:
                    del json_data[field]
                    logger.error('Removing {} form {}, expecting path'.format(field, json_data['uuid']))
                else:
                    json_data[field] = attachment(path)
            else:
                # malformatted attachment
                del json_data[field]
                logger.error('Removing {} form {}, expecting path'.format(field, json_data['uuid']))
    return json_data


LOAD_ERROR_MESSAGE = """#   ██▓     ▒█████   ▄▄▄      ▓█████▄  ██▓ ███▄    █   ▄████
#  ▓██▒    ▒██▒  ██▒▒████▄    ▒██▀ ██▌▓██▒ ██ ▀█   █  ██▒ ▀█▒
#  ▒██░    ▒██░  ██▒▒██  ▀█▄  ░██   █▌▒██▒▓██  ▀█ ██▒▒██░▄▄▄░
#  ▒██░    ▒██   ██░░██▄▄▄▄██ ░▓█▄   ▌░██░▓██▒  ▐▌██▒░▓█  ██▓
#  ░██████▒░ ████▓▒░ ▓█   ▓██▒░▒████▓ ░██░▒██░   ▓██░░▒▓███▀▒
#  ░ ▒░▓  ░░ ▒░▒░▒░  ▒▒   ▓▒█░ ▒▒▓  ▒ ░▓  ░ ▒░   ▒ ▒  ░▒   ▒
#  ░ ░ ▒  ░  ░ ▒ ▒░   ▒   ▒▒ ░ ░ ▒  ▒  ▒ ░░ ░░   ░ ▒░  ░   ░
#    ░ ░   ░ ░ ░ ▒    ░   ▒    ░ ░  ░  ▒ ░   ░   ░ ░ ░ ░   ░
#      ░  ░    ░ ░        ░  ░   ░     ░           ░       ░
#                              ░
#   ██▓ ███▄    █   ██████ ▓█████  ██▀███  ▄▄▄█████▓  ██████
#  ▓██▒ ██ ▀█   █ ▒██    ▒ ▓█   ▀ ▓██ ▒ ██▒▓  ██▒ ▓▒▒██    ▒
#  ▒██▒▓██  ▀█ ██▒░ ▓██▄   ▒███   ▓██ ░▄█ ▒▒ ▓██░ ▒░░ ▓██▄
#  ░██░▓██▒  ▐▌██▒  ▒   ██▒▒▓█  ▄ ▒██▀▀█▄  ░ ▓██▓ ░   ▒   ██▒
#  ░██░▒██░   ▓██░▒██████▒▒░▒████▒░██▓ ▒██▒  ▒██▒ ░ ▒██████▒▒
#  ░▓  ░ ▒░   ▒ ▒ ▒ ▒▓▒ ▒ ░░░ ▒░ ░░ ▒▓ ░▒▓░  ▒ ░░   ▒ ▒▓▒ ▒ ░
#   ▒ ░░ ░░   ░ ▒░░ ░▒  ░ ░ ░ ░  ░  ░▒ ░ ▒░    ░    ░ ░▒  ░ ░
#   ▒ ░   ░   ░ ░ ░  ░  ░     ░     ░░   ░   ░      ░  ░  ░
#   ░           ░       ░     ░  ░   ░                    ░
#
#    █████▒▄▄▄       ██▓ ██▓    ▓█████ ▓█████▄
#  ▓██   ▒▒████▄    ▓██▒▓██▒    ▓█   ▀ ▒██▀ ██▌
#  ▒████ ░▒██  ▀█▄  ▒██▒▒██░    ▒███   ░██   █▌
#  ░▓█▒  ░░██▄▄▄▄██ ░██░▒██░    ▒▓█  ▄ ░▓█▄   ▌
#  ░▒█░    ▓█   ▓██▒░██░░██████▒░▒████▒░▒████▓
#   ▒ ░    ▒▒   ▓▒█░░▓  ░ ▒░▓  ░░░ ▒░ ░ ▒▒▓  ▒
#   ░       ▒   ▒▒ ░ ▒ ░░ ░ ▒  ░ ░ ░  ░ ░ ▒  ▒
#   ░ ░     ░   ▒    ▒ ░  ░ ░      ░    ░ ░  ░
#               ░  ░ ░      ░  ░   ░  ░   ░
#                                       ░                    """


def load_all(testapp, inserts, docsdir, overwrite=True, itype=None, from_json=False, patch_only=False):
    """
    Wrapper function for load_all_gen, which invokes the generator returned
    from that function. Takes all of the same args as load_all_gen, so
    please reference that docstring.

    This function uses LoadGenWrapper, which will catch a returned value from
    the execution of the generator, which is an Exception in the case of
    load_all_gen. Return that Exception if encountered, which is consistent
    with the functionality of load_all_gen.
    """
    gen = LoadGenWrapper(
        load_all_gen(testapp, inserts, docsdir, overwrite, itype, from_json, patch_only)
    )
    # run the generator; don't worry about the output
    for _ in gen:
        pass
    # gen.caught is None for success and an error message on failure
    if gen.caught is None:
        return None
    else:
        return Exception(gen.caught)


def load_all_gen(testapp, inserts, docsdir, overwrite=True, itype=None, from_json=False, patch_only=False):
    """
    Generator function that yields bytes information about each item POSTed/PATCHed.
    Is the base functionality of load_all function.

    convert data to store format dictionary (same format expected from from_json=True),
    assume main function is to load reasonable number of inserts from a folder

    Args:
        testapp
        inserts : either a folder, file, or a dictionary in the store format
        docsdir : attachment folder
        overwrite (bool)   : if the database contains the item already, skip or patch
        itype (list or str): limit selection to certain type/types
        from_json (bool)   : if set to true, inserts should be dict instead of folder name
        patch_only (bool)  : if set to true will only do second round patch - no posts

    Yields:
        Bytes with information on POSTed/PATCHed items

    Returns:
        None if successful, otherwise a bytes error message
    """
    # TODO: deal with option of file to load (not directory struture)
    if docsdir is None:
        docsdir = []
    # Collect Items
    store = {}
    if from_json:  # we are directly loading json
        store = inserts
    if not from_json:  # we are loading a file
        use_itype = False
        if os.path.isdir(inserts):  # we've specified a directory
            if not inserts.endswith('/'):
                inserts += '/'
            files = [i for i in os.listdir(inserts) if i.endswith('.json')]
        elif os.path.isfile(inserts):  # we've specified a single file
            files = [inserts]
            # use the item type if provided AND not a list
            # otherwise guess from the filename
            use_itype = True if (itype and isinstance(itype, str)) else False
        else:  # cannot get the file
            err_msg = 'Failure loading inserts from %s. Could not find matching file or directory.' % inserts
            print(err_msg)
            yield str.encode('ERROR: %s\n' % err_msg)
            return
            # raise StopIteration
        # load from the directory/file
        for a_file in files:
            if use_itype:
                item_type = itype
            else:
                item_type = a_file.split('/')[-1].replace(".json", "")
                a_file = inserts + a_file
            with open(a_file) as f:
                store[item_type] = json.loads(f.read())
    # if there is a defined set of items, subtract the rest
    if itype:
        if isinstance(itype, list):
            store = {i: store[i] for i in itype if i in store}
        else:
            store = {itype: store.get(itype, [])}
    # clear empty values
    store = {k: v for k, v in store.items() if v is not None}
    if not store:
        if from_json:
            err_msg = 'No items found in input "store" json'
        else:
            err_msg = 'No items found in %s' % inserts
        if itype:
            err_msg += ' for item type(s) %s' % itype
        print(err_msg)
        yield str.encode('ERROR: %s' % err_msg)
        return
        # raise StopIteration
    # order Items
    all_types = list(store.keys())
    for ref_item in reversed(ORDER):
        if ref_item in all_types:
            all_types.insert(0, all_types.pop(all_types.index(ref_item)))
    # collect schemas
    profiles = testapp.get('/profiles/?frame=raw').json

    # run step1 - if item does not exist, post with minimal metadata
    second_round_items = {}
    if not patch_only:
        for a_type in all_types:
            # this conversion of schema name to object type works for all existing schemas at the moment
            obj_type = "".join([i.title() for i in a_type.split('_')])
            # minimal schema
            schema_info = profiles[obj_type]
            req_fields = schema_info.get('required', [])
            ids = schema_info.get('identifyingProperties', [])
            # some schemas did not include aliases
            if 'aliases' not in ids:
                ids.append('aliases')
            # file format is required for files, but its usability depends this field
            if a_type in ['file_format', 'experiment_type']:
                req_fields.append('valid_item_types')
            first_fields = list(set(req_fields+ids))
            skip_existing_items = set()
            posted = 0
            skip_exist = 0
            for an_item in store[a_type]:
                try:
                    # 301 because @id is the existing item path, not uuid
                    testapp.get('/'+an_item['uuid'], status=[200, 301])
                    exists = True
                except Exception:
                    exists = False
                # skip the items that exists
                # if overwrite=True, still include them in PATCH round
                if exists:
                    skip_exist += 1
                    if not overwrite:
                        skip_existing_items.add(an_item['uuid'])
                    yield str.encode('SKIP: %s\n' % an_item['uuid'])
                else:
                    post_first = {key: value for (key, value) in an_item.items() if key in first_fields}
                    post_first = format_for_attachment(post_first, docsdir)
                    try:
                        res = testapp.post_json(f'/{a_type}?skip_indexing=true', post_first)
                        assert res.status_code == 201
                        posted += 1
                        # yield bytes to work with Response.app_iter
                        yield str.encode('POST: %s\n' % res.json['@graph'][0]['uuid'])
                    except Exception as e:
                        print('Posting {} failed. Post body:\n{}\nError Message:{}'
                              ''.format(a_type, str(first_fields), str(e)))
                        # remove newlines from error, since they mess with generator output
                        e_str = str(e).replace('\n', '')
                        yield str.encode('ERROR: %s\n' % e_str)
                        return
                        # raise StopIteration
            second_round_items[a_type] = [i for i in store[a_type] if i['uuid'] not in skip_existing_items]
            logger.info('{} 1st: {} items posted, {} items exists.'.format(a_type, posted, skip_exist))
            logger.info('{} 1st: {} items will be patched in second round'
                        .format(a_type, str(len(second_round_items.get(a_type, [])))))
    elif overwrite:
        logger.info('Posting round skipped')
        for a_type in all_types:
            second_round_items[a_type] = [i for i in store[a_type]]
            logger.info('{}: {} items will be patched in second round'
                        .format(a_type, str(len(second_round_items.get(a_type, [])))))

    # Round II - patch the rest of the metadata
    rnd = ' 2nd' if not patch_only else ''
    for a_type in all_types:
        patched = 0
        obj_type = "".join([i.title() for i in a_type.split('_')])
        if not second_round_items[a_type]:
            logger.info('{}{}: no items to patch'.format(a_type, rnd))
            continue
        for an_item in second_round_items[a_type]:
            an_item = format_for_attachment(an_item, docsdir)
            try:
                add_last_modified(an_item, userid=LOADXL_USER_UUID)
                res = testapp.patch_json('/'+an_item['uuid'], an_item)
                assert res.status_code == 200
                patched += 1
                # yield bytes to work with Response.app_iter
                yield str.encode('PATCH: %s\n' % an_item['uuid'])
            except Exception as e:
                print('Patching {} failed. Patch body:\n{}\n\nError Message:\n{}'.format(
                      a_type, str(an_item), str(e)))
                e_str = str(e).replace('\n', '')
                yield str.encode('ERROR: %s\n' % e_str)
                return
                # raise StopIteration
        logger.info('{}{}: {} items patched .'.format(a_type, rnd, patched))

    # explicit return upon finish
    return None


def load_data(app, indir='inserts', docsdir=None, overwrite=False,
              use_master_inserts=True):
    """
    This function will take the inserts folder as input, and place them to the given environment.
    args:
        app:
        indir (inserts): inserts folder, should be relative to tests/data/
        docsdir (None): folder with attachment documents, relative to tests/data
    """
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = webtest.TestApp(app, environ)
    # load master-inserts by default
    if indir != 'master-inserts' and use_master_inserts:
        master_inserts = resource_filename('encoded', 'tests/data/master-inserts/')
        master_res = load_all(testapp, master_inserts, [])
        if master_res:  # None if successful
            print(LOAD_ERROR_MESSAGE)
            logger.error('load_data: failed to load from %s' % master_inserts, error=master_res)
            return master_res

    if not indir.endswith('/'):
        indir += '/'
    inserts = resource_filename('encoded', 'tests/data/' + indir)
    if docsdir is None:
        docsdir = []
    else:
        if not docsdir.endswith('/'):
            docsdir += '/'
        docsdir = [resource_filename('encoded', 'tests/data/' + docsdir)]
    res = load_all(testapp, inserts, docsdir, overwrite=overwrite)
    if res:  # None if successful
        print(LOAD_ERROR_MESSAGE)
        logger.error('load_data: failed to load from %s' % docsdir, error=res)
        return res
    return None  # unnecessary, but makes it more clear that no error was encountered


def load_test_data(app, overwrite=False):
    """
    Load inserts and master-inserts

    Returns:
        None if successful, otherwise Exception encountered
    """
    return load_data(app, docsdir='documents', indir='inserts',
                     overwrite=overwrite)


def load_local_data(app, overwrite=False):
    """
    Load inserts from temporary insert folders, if present and populated
    with .json insert files.
    If not present, load inserts and master-inserts.

    Returns:
        None if successful, otherwise Exception encountered
    """
    # if we have any json files in temp-local-inserts, use those
    chk_dir = resource_filename('encoded', 'tests/data/temp-local-inserts')
    use_temp_local = False
    for (dirpath, dirnames, filenames) in os.walk(chk_dir):
        use_temp_local = any([fn for fn in filenames if fn.endswith('.json')])

    if use_temp_local:
        return load_data(app, docsdir='documents', indir='temp-local-inserts',
                         use_master_inserts=False, overwrite=overwrite)
    else:
        return load_data(app, docsdir='documents', indir='inserts',
                         overwrite=overwrite)


def load_prod_data(app, overwrite=False):
    """
    Load master-inserts

    Returns:
        None if successful, otherwise Exception encountered
    """
    return load_data(app, indir='master-inserts', overwrite=overwrite)
