""" Test full indexing setup

The fixtures in this module setup a full system with postgresql and
elasticsearch running as subprocesses.
"""
import pytest
from encoded.verifier import verify_item

pytestmark = [pytest.mark.working, pytest.mark.indexing]

# subset of collections to run test on
TEST_COLLECTIONS = ['testing_post_put_patch', 'file_processed']

@pytest.fixture(scope='session')
def DBSession(app):
    from snovault import DBSESSION
    return app.registry[DBSESSION]


@pytest.fixture(autouse=False)
def teardown(app, dbapi_conn):
    from snovault.elasticsearch import create_mapping
    create_mapping.run(app, collections=TEST_COLLECTIONS)
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
def test_indexing_simple(app, testapp, indexer_testapp, teardown):
    import time
    es = app.registry['elasticsearch']
    doc_count = es.count(index='testing_post_put_patch', doc_type='testing_post_put_patch').get('count')
    assert doc_count == 0
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
    time.sleep(3)
    # check es directly
    doc_count = es.count(index='testing_post_put_patch', doc_type='testing_post_put_patch').get('count')
    assert doc_count == 2
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


def test_create_mapping_on_indexing(app, testapp, registry, elasticsearch, teardown):
    """
    Test overall create_mapping functionality using app.
    Do this by checking es directly before and after running mapping.
    Delete an index directly, run again to see if it recovers.
    """
    from snovault.elasticsearch.create_mapping import type_mapping, create_mapping_by_type, build_index_record
    from snovault.elasticsearch import ELASTIC_SEARCH
    from snovault import TYPES
    es = registry[ELASTIC_SEARCH]
    item_types = TEST_COLLECTIONS
    # check that mappings and settings are in index
    for item_type in item_types:
        item_mapping = type_mapping(registry[TYPES], item_type)
        try:
            item_index = es.indices.get(index=item_type)
        except:
            assert False
        found_index_mapping = item_index.get(item_type, {}).get('mappings').get(item_type, {}).get('properties', {}).get('embedded')
        found_index_settings = item_index.get(item_type, {}).get('settings')
        assert found_index_mapping
        assert found_index_settings
        # get the item record from meta and compare that
        full_mapping = create_mapping_by_type(item_type, registry)
        item_record = build_index_record(full_mapping, item_type)
        try:
            item_meta = es.get(index='meta', doc_type='meta', id=item_type)
        except:
            assert False
        meta_record = item_meta.get('_source', None)
        assert meta_record
        assert item_record == meta_record


@pytest.mark.slow
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

def test_item_detailed(testapp, indexer_testapp, item_uuid, registry):
    # Todo, input a list of accessions / uuids:
    verify_item(item_uuid, indexer_testapp, testapp, registry)
