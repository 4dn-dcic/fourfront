#!/usr/bin/env python3
import argparse
import logging
import os
import json
from datetime import datetime
from dcicutils import ff_utils


logger = logging.getLogger(__name__)
EPILOG = __doc__


def parse_args():
    parser = argparse.ArgumentParser(
        description="Load Ontology Term Data", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('json_file', help="File containing json of items to load")
    parser.add_argument('--item_types',
                        nargs='*',
                        help="Type(s) of Item(s) to load - if not provided then a dictionary of jsons keyed by item_type is required \
                              NOTE if you do provide more than one value to item_types then as long as the item_types are keys of the store only \
                              the values of those keys will be loaded")
    parser.add_argument('--env', default='local',
                        help='FF environment to update from. Defaults to local')
    parser.add_argument('--local-key', help='Access key ID if using local')
    parser.add_argument('--local-secret', help='Access key secret if using local')
    return parser.parse_args()


def set_load_params(args):
    # authentication with Fourfront
    if args.env == 'local':
        # prompt access key ID and secret from user
        config_uri = 'development.ini'
        local_id = args.local_key if args.local_key else input('[local access key ID] ')
        local_secret = args.local_secret if args.local_secret else input('[local access key secret] ')
        auth = {'key': local_id, 'secret': local_secret, 'server': 'http://localhost:8000'}
    else:
        config_uri = 'production.ini'
        auth = ff_utils.get_authentication_with_server(None, args.env)
    return auth, config_uri


def load_json_to_store(json_file, itype=None):
    with open(json_file) as infile:
        try:
            json_data = json.load(infile)
        except json.JSONDecodeError:
            logger.error('ERROR - problem reading json file')
            return {}
        if isinstance(json_data, dict):
            if itype:
                # just make sure the keys exist
                if [i for i in itype if i not in json_data]:
                    logger.error('{} type(s) not in dictionary -- abort!!!'.format(', '.join(itype)))
                    return {}
            return {'store': json_data}
        elif isinstance(json_data, list):
            if not itype or len(itype) != 1:
                logger.error('you need to pass a single item_type with your json list -- abort!!!')
                return {}
            return {'store': {itype[0]: json_data}}
        else:
            logger.error("I don't understand the data in the file -- abort!!!")
            return{}


def update_sysinfo(auth):
    # update sysinfo. Don't worry about doing this on local
    data = {"name": "ffsysinfo", "ontology_updated": datetime.today().isoformat()}
    try:
        found_info = ff_utils.get_metadata('/sysinfos/' + data['name'], key=auth)
    except Exception:
        found_info = None

    if found_info:
        ff_utils.patch_metadata(data, found_info['uuid'], key=auth)
    else:
        ff_utils.post_metadata(data, 'sysinfos', key=auth)
    logger.info("Updated sysinfo with name %s" % data['name'])


def load_items(args):
    """
    Load a given JSON file with items inserts to a server using
    the `load_data` endpoint defined in loadxl.
    """
    auth, config_uri = set_load_params(args)
    load_endpoint = '/'.join([auth['server'], 'load_data'])
    logger.info('load_items: Starting POST to %s' % load_endpoint)
    json_data = {'config_uri': config_uri, 'overwrite': True, 'iter_response': True}
    itype = None
    if args.item_types:
        itype = args.item_types
    if itype:
        json_data['itype'] = itype
    json_data.update(load_json_to_store(args.json_file, itype))
    logger.info('Will attempt to load to {}'.format(auth['server']))
    num_to_load = 0
    for iname, idata in json_data.get('store', {}).items():
        num_items = len(idata)
        logger.info('{} {}'.format(num_items, iname))
        num_to_load += num_items
    start = datetime.now()
    if not json_data.get('store'):
        logger.error("No DATA to LOAD!")
        return
    try:
        # sustained by returning Response.app_iter from loadxl.load_data
        res = ff_utils.authorized_request(load_endpoint, auth=auth, verb='POST',
                                          timeout=None, json=json_data)
    except Exception as exc:
        logger.error('Error on POST: %s' % str(exc))
    else:
        # process the individual item responses from the generator.
        # each item should be "POST: <uuid>,", "PATCH: <uuid>,", or "SKIP: <uuid>"
        load_res = {'POST': [], 'PATCH': [], 'SKIP': [], 'ERROR': []}
        for val in res.text.split('\n'):
            if val.startswith('POST') or val.startswith('SKIP'):
                prefix_len = 4  # 'POST' or 'SKIP'
            else:
                prefix_len = 5  # 'PATCH' or 'ERROR'
            # this is a bit weird, but we want to split out the POST/PATCH...
            # and also remove ': ' from the value for each message
            cat, msg = val[:prefix_len], val[prefix_len + 2:]
            if not msg:
                continue
            if cat in load_res:
                load_res[cat].append(msg)
        logger.info("Success! Attempted to load %s items. Result: POSTed %s, PATCHed %s, skipped %s"
                    % (num_to_load, len(load_res['POST']), len(load_res['PATCH']), len(load_res['SKIP'])))
        if load_res['ERROR']:
            logger.error("ERROR encountered during load_data! Error: %s" % load_res['ERROR'])
        if (len(load_res['POST']) + len(load_res['SKIP'])) > len(load_res['PATCH']):
            missed = set(load_res['POST'] + load_res['SKIP']) - set(load_res['PATCH'])
            logger.error("The following {} items passed round I (POST/skip) but not round II (PATCH): {}".format(len(missed), missed))
    logger.info("Finished request in %s" % str(datetime.now() - start))


def main():
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.INFO)
    args = parse_args()
    load_items(args)
    logger.info("DONE!")


if __name__ == "__main__":
    main()
