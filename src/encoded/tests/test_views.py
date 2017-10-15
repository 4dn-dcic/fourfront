import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]
from time import sleep


def _type_length():
    # Not a fixture as we need to parameterize tests on this
    from ..loadxl import ORDER
    from pkg_resources import resource_stream
    import codecs
    import json
    utf8 = codecs.getreader("utf-8")
    type_length_dict = {
        name: len(json.load(utf8(resource_stream('encoded', 'tests/data/inserts/%s.json' % name))))
        for name in ORDER
    }
    # hot fix for Inherited Non-Abstract Collections
    # list of parent object and children (nested list)
    inherited_list = [
     ["experiment_set", ["experiment_set_replicate"]],
     ["workflow_run", ["workflow_run_sbg", "workflow_run_awsem"]],
     ["file_set", ["file_set_calibration"]],
    ]
    for inh in inherited_list:
        try:
            # get the items in the inherited object first
            sum_exp_set = type_length_dict.get(inh[0], 0)
            # get the items in each inheriting object and sum
            for sub_inh in inh[1]:
                sum_exp_set += type_length_dict.get(sub_inh, 0)
            type_length_dict[inh[0]] = sum_exp_set
        except:
            pass
    return type_length_dict


TYPE_LENGTH = _type_length()

INDEX_DATA_TYPES = ['file_fastq', 'workflow_run_awsem', 'biosample', 'experiment_set']

PUBLIC_COLLECTIONS = [
    'source',
    'platform',
    'treatment',
    'lab',
    'award',
    'target',
    'organism',
]


def test_home(anonhtmltestapp):
    res = anonhtmltestapp.get('/', status=200)
    assert res.body.startswith(b'<!DOCTYPE html>')


def test_home_json(testapp):
    res = testapp.get('/', status=200)
    assert res.json['@type']


def test_home_app_version(testapp):
    res = testapp.get('/', status=200)
    assert 'app_version' in res.json


def test_vary_html(anonhtmltestapp):
    res = anonhtmltestapp.get('/', status=200)
    assert res.vary is not None
    assert 'Accept' in res.vary


def test_vary_json(anontestapp):
    res = anontestapp.get('/', status=200)
    assert res.vary is not None
    assert 'Accept' in res.vary


@pytest.mark.parametrize('item_type', [k for k in TYPE_LENGTH if k != 'user'])
def test_collections_anon(anontestapp, item_type):
    res = anontestapp.get('/' + item_type).follow(status=200)
    assert '@graph' in res.json


@pytest.mark.parametrize('item_type', [k for k in TYPE_LENGTH if k != 'user'])
def test_html_collections_anon(anonhtmltestapp, item_type):
    res = anonhtmltestapp.get('/' + item_type).follow(status=200)
    assert res.body.startswith(b'<!DOCTYPE html>')


@pytest.mark.parametrize('item_type', TYPE_LENGTH)
def test_html_collections(htmltestapp, item_type):
    res = htmltestapp.get('/' + item_type).follow(status=200)
    assert res.body.startswith(b'<!DOCTYPE html>')


@pytest.mark.slow
@pytest.mark.parametrize('item_type', [k for k in TYPE_LENGTH if k != 'user'])
def test_html_server_pages(item_type, wsgi_app):
    res = wsgi_app.get(
        '/%s?limit=1' % item_type,
        headers={'Accept': 'application/json'},
    ).follow(
        status=200,
        headers={'Accept': 'application/json'},
    )
    for item in res.json['@graph']:
        res = wsgi_app.get(item['@id'], status=200)
        assert res.body.startswith(b'<!DOCTYPE html>')
        assert b'Internal Server Error' not in res.body


@pytest.mark.parametrize('item_type', TYPE_LENGTH)
def test_json(testapp, item_type):
    res = testapp.get('/' + item_type).follow(status=200)
    assert res.json['@type']


def test_json_basic_auth(anonhtmltestapp):
    from base64 import b64encode
    from pyramid.compat import ascii_native_
    url = '/'
    value = "Authorization: Basic %s" % ascii_native_(b64encode(b'nobody:pass'))
    res = anonhtmltestapp.get(url, headers={'Authorization': value}, status=403)
    assert res.content_type == 'application/json'


def _test_antibody_approval_creation(testapp):
    from urllib.parse import urlparse
    new_antibody = {'foo': 'bar'}
    res = testapp.post_json('/antibodies/', new_antibody, status=201)
    assert res.location
    assert '/profiles/result' in res.json['@type']['profile']
    assert res.json['@graph'] == [{'href': urlparse(res.location).path}]
    res = testapp.get(res.location, status=200)
    assert '/profiles/antibody_approval' in res.json['@type']
    data = res.json
    for key in new_antibody:
        assert data[key] == new_antibody[key]
    res = testapp.get('/antibodies/', status=200)
    assert len(res.json['@graph']) == 1


def test_load_sample_data(
        analysis_step,
        award,
        human_biosample,
        construct,
        document,
        experiment,
        file,
        lab,
        organism,
        publication,
        publication_tracking,
        software,
        human_biosource,
        submitter,
        workflow_mapping,
        workflow_run_sbg,
        workflow_run_awsem,
        ):
    assert True, 'Fixtures have loaded sample data'


def test_abstract_collection(testapp, experiment):
    # TODO: ASK_BEN how to get experiment to function as catch all
    pass
    # testapp.get('/experiment/{accession}'.format(**experiment))
    # testapp.get('/expermient/{accession}'.format(**experiment))


@pytest.mark.slow
def test_collection_limit(workbook, testapp):
    res = testapp.get('/enzymes/?limit=2', status=200)
    assert len(res.json['@graph']) == 2


def test_collection_post(testapp):
    item = {
        'name': 'human',
        'scientific_name': 'Homo sapiens',
        'taxon_id': '9606',
    }
    return testapp.post_json('/organism', item, status=201)


def test_collection_post_bad_json(testapp):
    item = {'foo': 'bar'}
    res = testapp.post_json('/organism', item, status=422)
    assert res.json['errors']


def test_collection_post_malformed_json(testapp):
    item = '{'
    headers = {'Content-Type': 'application/json'}
    res = testapp.post('/organism', item, status=400, headers=headers)
    assert res.json['detail'].startswith('Expecting')


def test_collection_post_missing_content_type(testapp):
    item = '{}'
    testapp.post('/organism', item, status=415)


def test_collection_post_bad_(anontestapp):
    from base64 import b64encode
    from pyramid.compat import ascii_native_
    value = "Authorization: Basic %s" % ascii_native_(b64encode(b'nobody:pass'))
    anontestapp.post_json('/organism', {}, headers={'Authorization': value}, status=403)


def test_collection_actions_filtered_by_permission(workbook, testapp, anontestapp):
    res = testapp.get('/protocols/')
    assert any(action for action in res.json.get('actions', []) if action['name'] == 'add')

    res = anontestapp.get('/protocols/')
    assert not any(action for action in res.json.get('actions', []) if action['name'] == 'add')


def test_item_actions_filtered_by_permission(testapp, authenticated_testapp, human_biosource):
    location = human_biosource['@id'] + '?frame=page'

    res = testapp.get(location)
    assert any(action for action in res.json.get('actions', []) if action['name'] == 'edit')

    res = authenticated_testapp.get(location)
    assert not any(action for action in res.json.get('actions', []) if action['name'] == 'edit')


def test_collection_put(testapp, execute_counter):
    initial = {
        "name": "human",
        "scientific_name": "Homo sapiens",
        "taxon_id": "9606",
    }
    item_url = testapp.post_json('/organism', initial).location

    with execute_counter.expect(1):
        item = testapp.get(item_url + '?frame=object').json

    for key in initial:
        assert item[key] == initial[key]

    update = {
        'name': 'mouse',
        'scientific_name': 'Mus musculus',
        'taxon_id': '10090',
    }
    testapp.put_json(item_url, update, status=200)
    res = testapp.get('/' + item['uuid'] + '?frame=object').follow().json

    for key in update:
        assert res[key] == update[key]


def test_post_duplicate_uuid(testapp, mouse):
    item = {
        'uuid': mouse['uuid'],
        'name': 'human',
        'scientific_name': 'Homo sapiens',
        'taxon_id': '9606',
    }
    testapp.post_json('/organism', item, status=409)


def test_user_effective_principals(submitter, lab, anontestapp, execute_counter):
    email = submitter['email']
    with execute_counter.expect(1):
        res = anontestapp.get('/@@testing-user',
                              extra_environ={'REMOTE_USER': str(email)})
    assert sorted(res.json['effective_principals']) == [
        'group.submitter',
        'lab.%s' % lab['uuid'],
        'remoteuser.%s' % email,
        'submits_for.%s' % lab['uuid'],
        'system.Authenticated',
        'system.Everyone',
        'userid.%s' % submitter['uuid'],
        'viewing_group.4DN',
    ]


def test_jsonld_context(testapp):
    res = testapp.get('/terms/')
    assert res.json


def test_jsonld_term(testapp):
    res = testapp.get('/terms/submitted_by')
    assert res.json


@pytest.mark.parametrize('item_type', TYPE_LENGTH)
def test_index_data_workbook(workbook, testapp, indexer_testapp, htmltestapp, item_type):
    import random
    # randomly sample all items and take 2
    res = testapp.get('/%s?limit=all' % item_type).follow(status=200)
    # previously test_load_workbook
    item_len = len(res.json['@graph'])
    assert item_len == TYPE_LENGTH[item_type]
    num_items = 2 if item_len >= 2 else item_len
    random_id_idxs = random.sample(range(item_len), num_items)
    random_ids = [res.json['@graph'][idx]['@id'] for idx in random_id_idxs]
    for item_id in random_ids:
        indexer_testapp.get(item_id + '@@index-data', status=200)
        # previously test_html_pages
        try:
            res = htmltestapp.get(item_id)
        except Exception as e:
            print(e)
            continue
        assert res.body.startswith(b'<!DOCTYPE html>')


@pytest.mark.parametrize('item_type', TYPE_LENGTH)
def test_profiles(testapp, item_type):
    from jsonschema_serialize_fork import Draft4Validator
    res = testapp.get('/profiles/%s.json' % item_type).maybe_follow(status=200)
    errors = Draft4Validator.check_schema(res.json)
    assert not errors


def test_bad_frame(testapp, human):
    res = testapp.get(human['@id'] + '?frame=bad', status=404)
    assert res.json['detail'] == '?frame=bad'
