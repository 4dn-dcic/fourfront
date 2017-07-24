""" Test full indexing setup

The fixtures in this module setup a full system with postgresql and
elasticsearch running as subprocesses.
"""
import pytest
from snovault import TYPES
from functools import wraps

pytestmark = [pytest.mark.working, pytest.mark.indexing]


@pytest.fixture(scope='session')
def app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server):
    from .conftest import _app_settings
    settings = _app_settings.copy()
    settings['create_tables'] = True
    settings['persona.audiences'] = 'http://%s:%s' % wsgi_server_host_port
    settings['elasticsearch.server'] = elasticsearch_server
    settings['sqlalchemy.url'] = postgresql_server
    settings['collection_datastore'] = 'elasticsearch'
    settings['item_datastore'] = 'elasticsearch'
    settings['indexer'] = True
    settings['indexer.processes'] = 2
    return settings


@pytest.yield_fixture(scope='session')
def app(app_settings):
    from encoded import main
    app = main({}, **app_settings)

    yield app

    # Shutdown multiprocessing pool to close db conns.
    from snovault.elasticsearch import INDEXER
    app.registry[INDEXER].shutdown()

    from snovault import DBSESSION
    DBSession = app.registry[DBSESSION]
    # Dispose connections so postgres can tear down.
    DBSession.bind.pool.dispose()


@pytest.fixture(scope='session')
def DBSession(app):
    from snovault import DBSESSION
    return app.registry[DBSESSION]


@pytest.fixture(autouse=True)
def teardown(app, dbapi_conn):
    from snovault.elasticsearch import create_mapping
    create_mapping.run(app, collections=['biosample',
                                         'testing_post_put_patch',
                                         'file_processed'])
    cursor = dbapi_conn.cursor()
    cursor.execute("""TRUNCATE resources, transactions CASCADE;""")
    cursor.close()


@pytest.fixture
def external_tx():
    pass


@pytest.yield_fixture
def dbapi_conn(DBSession):
    connection = DBSession.bind.pool.unique_connection()
    connection.detach()
    conn = connection.connection
    conn.autocommit = True
    yield conn
    conn.close()


@pytest.yield_fixture
def listening_conn(dbapi_conn):
    cursor = dbapi_conn.cursor()
    cursor.execute("""LISTEN "snovault.transaction";""")
    yield dbapi_conn
    cursor.close()


@pytest.mark.slow
def test_indexing_workbook(testapp, indexer_testapp):
    # First post a single item so that subsequent indexing is incremental
    testapp.post_json('/testing-post-put-patch/', {'required': ''})
    res = indexer_testapp.post_json('/index', {'record': True})
    assert res.json['indexed'] == 1

    from ..loadxl import load_all
    from pkg_resources import resource_filename
    inserts = resource_filename('encoded', 'tests/data/inserts/')
    docsdir = [resource_filename('encoded', 'tests/data/documents/')]
    load_all(testapp, inserts, docsdir)
    res = indexer_testapp.post_json('/index', {'record': True})
    assert res.json['updated']
    assert res.json['indexed']
    res = testapp.get('/search/?type=Biosample')
    # Compare specific fields of the search result from expected inserts
    # The following assertions correspond to insert data for these embeds,
    # (in types/biosample.py): 'biosource.biosource_type', 'biosource.individual.organism.name'
    test_json = [bios for bios in res.json['@graph'] if bios['accession'] == '4DNBS1234567'][0]
    assert test_json['uuid'] == "231111bc-8535-4448-903e-854af460b254"
    assert test_json['biosource'][0]['biosource_type'] == "immortalized cell line"
    assert test_json['biosource'][0]['individual']['organism']['name'] == "human"
    assert res.json['total'] > 1


def test_indexing_simple(app, testapp, indexer_testapp):
    import time
    # First post a single item so that subsequent indexing is incremental
    res = testapp.post_json('/testing-post-put-patch/', {'required': ''})
    res = indexer_testapp.post_json('/index', {'record': True})
    assert res.json['indexed'] == 1
    res = testapp.post_json('/testing-post-put-patch/', {'required': ''})
    uuid = res.json['@graph'][0]['uuid']
    res = indexer_testapp.post_json('/index', {'record': True})
    assert res.json['indexed'] == 1
    assert res.json['txn_count'] == 1
    assert res.json['updated'] == [uuid]
    res = testapp.get('/search/?type=TestingPostPutPatch')
    uuids = [indv_res['uuid'] for indv_res in res.json['@graph']]
    count = 0
    while uuid not in uuids and count < 20:
        time.sleep(1)
        res = testapp.get('/search/?type=TestingPostPutPatch')
        uuids = [indv_res['uuid'] for indv_res in res.json['@graph']]
        count += 1
    assert res.json['total'] >= 2
    assert uuid in uuids
    # test the meta index
    es = app.registry['elasticsearch']
    indexing_doc = es.get(index='meta', doc_type='meta', id='indexing')
    indexing_source = indexing_doc['_source']
    assert 'xmin' in indexing_source
    assert 'last_xmin' in indexing_source
    assert 'indexed' in indexing_source
    assert indexing_source['xmin'] >= indexing_source['last_xmin']
    testing_ppp_meta = es.get(index='meta', doc_type='meta', id='testing_post_put_patch')
    testing_ppp_source = testing_ppp_meta['_source']
    assert 'mappings' in testing_ppp_source
    assert 'settings' in testing_ppp_source


def test_listening(testapp, listening_conn):
    import time
    testapp.post_json('/testing-post-put-patch/', {'required': ''})
    time.sleep(1)
    listening_conn.poll()
    assert len(listening_conn.notifies) == 1
    notify = listening_conn.notifies.pop()
    assert notify.channel == 'snovault.transaction'
    assert int(notify.payload) > 0


@pytest.fixture
def item_uuid(testapp, award, experiment, lab):
    # this is a processed file
    item = {
        'accession': '4DNFIO67APU2',
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': 'pairs',
        'filename': 'test.pairs.gz',
        'md5sum': '0123456789abcdef0123456789abcdef',
        'status': 'uploading',
    }
    res = testapp.post_json('/file_processed', item)
    return res.json['@graph'][0]['uuid']


def verifier(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print("running tests " + func.__name__)
        try:
            res = func(*args, **kwargs)
        except Exception as e:
            print("test failed with exception " + e)
        else:
            print("success")
        return res
    return wrapper


@verifier
def verify_get_from_es(item_uuid, indexer_testapp, registry):
    # get from elasticsearch
    es_item = indexer_testapp.get("/" + item_uuid + "/").follow(status=200).json
    item_type = es_item['@type'][0]
    ensure_basic_data(es_item, item_type)
    return es_item, item_type


@verifier
def verify_get_by_accession(es_item, item_type, indexer_testapp):
    # get by accession
    accession = es_item.get('accession')
    if accession:  # some items don't have acessions
        item_by_accession = indexer_testapp.get("/" + accession).follow(status=200).json
        ensure_basic_data(item_by_accession, item_type)


@verifier
def verify_get_from_db(item_uuid, item_type, indexer_testapp):
    # get from database
    db_item = indexer_testapp.get("/" + item_uuid + "/?datastore=database").follow(status=200).json
    ensure_basic_data(db_item, item_type)


@verifier
def verify_profile(item_type, indexer_testapp):
    # is this something we actually know about?
    profile = indexer_testapp.get("/profiles/" + item_type + ".json").json
    assert(profile)
    item_type_camel = profile['id'].strip('.json').split('/')[-1]
    return item_type_camel


@verifier
def verify_schema(item_type_camel, registry):
    # test schema
    from encoded.tests.test_schemas import master_mixins, test_load_schema
    test_load_schema(item_type_camel + ".json", master_mixins(), registry)


@verifier
def verify_can_embed(item_type_camel, es_item, indexer_testapp, registry):
    # get the embedds
    pyr_item_type = registry[TYPES].by_item_type[item_type_camel]
    embeds = pyr_item_type.embedded

    assert embeds == pyr_item_type.factory.embedded
    got_embeds = indexer_testapp.get(es_item['@id'] + "@@embedded").json
    assert(got_embeds)


@verifier
def verify_indexing(item_uuid, indexer_testapp):
    # test indexing this bad by
    res = indexer_testapp.get("/" + item_uuid + "/@@index-data")
    assert(res)


def verify_item(item_uuid, indexer_testapp, testapp, registry):

    es_item, item_type = verify_get_from_es(item_uuid, indexer_testapp, registry)
    verify_get_by_accession(es_item, item_type, indexer_testapp)
    verify_get_from_db(item_uuid, item_type, indexer_testapp)
    item_type_camel = verify_profile(item_type, indexer_testapp)
    verify_schema(item_type_camel, registry)
    verify_can_embed(item_type_camel, es_item, indexer_testapp, registry)
    verify_indexing(item_uuid, indexer_testapp)
    # call carls embed tester


def ensure_basic_data(item_data, item_type=None):
    # ensure we have basic identifing properties
    assert item_data
    if not item_type:
        item_type = item_data['@type'][0]
    assert item_data['uuid']
    assert item_data['@id']
    assert item_type in item_data['@type']


def test_item_detailed(testapp, indexer_testapp, item_uuid, registry):
    # Todo, input a list of accessions / uuids:
    verify_item(item_uuid, indexer_testapp, testapp, registry)
