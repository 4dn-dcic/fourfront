import codecs
import json
import pkg_resources
import pytest

from base64 import b64encode
from jsonschema import Draft202012Validator
from pyramid.compat import ascii_native_
from snovault import TYPES
from urllib.parse import urlparse
from .datafixtures import ORDER


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema, pytest.mark.indexing]


def _type_length():
    # Not a fixture as we need to parameterize tests on this
    utf8 = codecs.getreader("utf-8")
    type_length_dict = {}
    for name in ORDER:
        try:
            utf8_stream = utf8(pkg_resources.resource_stream('encoded', 'tests/data/workbook-inserts/%s.json' % name))
            type_length_dict[name] = len(json.load(utf8_stream))
        except Exception:
            type_length_dict[name] = 0

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


def test_get_health_page(testapp):
    """
    Tests that we can get the health page and various fields we expect are there
    """
    res = testapp.get('/health', status=200).json
    assert 'namespace' in res
    assert 'blob_bucket' in res
    assert 'elasticsearch' in res


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
def test_html_server_pages(item_type, htmltestapp):
    res = htmltestapp.get(
        '/%s?limit=1' % item_type,
        headers={'Accept': 'application/json'},
    ).follow(
        status=200,
        headers={'Accept': 'application/json'},
    )
    for item in res.json['@graph']:
        res = htmltestapp.get(item['@id'], status=200)
        assert res.body.startswith(b'<!DOCTYPE html>')
        assert b'Internal Server Error' not in res.body


@pytest.mark.parametrize('item_type', TYPE_LENGTH)
def test_json(testapp, item_type):
    res = testapp.get('/' + item_type).follow(status=200)
    assert res.json['@type']


def test_json_basic_auth(anonhtmltestapp):
    url = '/'
    value = "Authorization: Basic %s" % ascii_native_(b64encode(b'nobody:pass'))
    res = anonhtmltestapp.get(url, headers={'Authorization': value}, status=401)
    assert res.content_type == 'application/json'


def _test_antibody_approval_creation(testapp):
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
    value = "Authorization: Basic %s" % ascii_native_(b64encode(b'nobody:pass'))
    anontestapp.post_json('/organism', {}, headers={'Authorization': value}, status=401)


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
def test_profiles(testapp, item_type):
    # this will only be non-abstract types
    res = testapp.get('/profiles/%s.json' % item_type).maybe_follow(status=200)
    errors = Draft202012Validator.check_schema(res.json)
    assert not errors
    # added from snovault.schema_views._annotated_schema
    assert 'rdfs:seeAlso' in res.json
    assert 'rdfs:subClassOf' in res.json
    assert 'children' in res.json
    assert res.json['isAbstract'] is False


def test_profiles_all(testapp, registry):
    res = testapp.get('/profiles/').maybe_follow(status=200)
    # make sure all types are present, including abstract types
    for ti in registry[TYPES].by_item_type.values():
        assert ti.name in res.json
        assert res.json[ti.name]['isAbstract'] is False
    for ti in registry[TYPES].by_abstract_type.values():
        assert ti.name in res.json
        assert res.json[ti.name]['isAbstract'] is True


def test_bad_frame(testapp, human):
    res = testapp.get(human['@id'] + '?frame=bad', status=404)
    assert res.json['detail'] == '?frame=bad'
