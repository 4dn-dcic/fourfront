""" Test full indexing setup

The fixtures in this module setup a full system with postgresql and
elasticsearch running as subprocesses.
"""
import pytest
from encoded.verifier import verify_item
from pyramid.paster import get_appsettings

pytestmark = [pytest.mark.working, pytest.mark.indexing]

# subset of collections to run test on
TEST_COLLECTIONS = ['testing_post_put_patch', 'file_processed']


@pytest.fixture(scope='session')
def app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server, aws_auth):
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

    # use aws auth to access elasticsearch
    if aws_auth:
        settings['elasticsearch.aws_auth'] = aws_auth
    return settings


@pytest.yield_fixture(scope='session')
def app(app_settings):
    from encoded import main
    app = main({}, **app_settings)

    yield app

    from snovault import DBSESSION
    DBSession = app.registry[DBSESSION]
    # Dispose connections so postgres can tear down.
    DBSession.bind.pool.dispose()


@pytest.fixture(autouse=True)
def teardown(app, use_collections=TEST_COLLECTIONS):
    import transaction
    from sqlalchemy import MetaData
    from zope.sqlalchemy import mark_changed
    from snovault import DBSESSION
    from snovault.elasticsearch import create_mapping
    create_mapping.run(app, collections=use_collections, skip_indexing=True)
    session = app.registry[DBSESSION]
    connection = session.connection().connect()
    meta = MetaData(bind=session.connection(), reflect=True)
    for table in meta.sorted_tables:
        print('Clear table %s' % table)
        print('Count before -->', str(connection.scalar("SELECT COUNT(*) FROM %s" % table)))
        connection.execute(table.delete())
        print('Count after -->', str(connection.scalar("SELECT COUNT(*) FROM %s" % table)), '\n')
    session.flush()
    mark_changed(session())
    transaction.commit()


@pytest.mark.slow
def test_indexing_simple(app, testapp, indexer_testapp):
    import time
    es = app.registry['elasticsearch']
    doc_count = es.count(index='testing_post_put_patch', doc_type='testing_post_put_patch').get('count')
    assert doc_count == 0
    # First post a single item so that subsequent indexing is incremental
    res = testapp.post_json('/testing-post-put-patch/', {'required': ''})
    res = indexer_testapp.post_json('/index', {'record': True})
    assert res.json['indexing_count'] == 1
    res = testapp.post_json('/testing-post-put-patch/', {'required': ''})
    uuid = res.json['@graph'][0]['uuid']
    res = indexer_testapp.post_json('/index', {'record': True})
    assert res.json['indexing_count'] == 1
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
    indexing_doc = es.get(index='indexing', doc_type='indexing', id='latest_indexing')
    indexing_source = indexing_doc['_source']
    assert 'indexing_count' in indexing_source
    testing_ppp_meta = es.get(index='meta', doc_type='meta', id='testing_post_put_patch')
    testing_ppp_source = testing_ppp_meta['_source']
    assert 'mappings' in testing_ppp_source
    assert 'settings' in testing_ppp_source


def test_create_mapping_on_indexing(app, testapp, registry, elasticsearch):
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
        print('Testing mapping for %s' % item_type)
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


@pytest.mark.performance
def test_load_and_index_perf_data(testapp, indexer_testapp):
    '''
    PERFORMANCE TESTING
    Loads all the perf-testing data and then indexes it
    Prints time for both

    this test is to ensure the performance testing data that is run
    nightly through the mastertest_deployment process in the torb repo
    it takes roughly 25 to run.
    Note: run with bin/test -s -m performance to see the prints from the test
    '''

    from os import listdir
    from os.path import isfile, join
    from encoded import loadxl
    from unittest import mock
    from timeit import default_timer as timer
    from pkg_resources import resource_filename
    insert_dir = resource_filename('encoded', 'tests/data/perf-testing/')
    inserts = [f for f in listdir(insert_dir) if isfile(join(insert_dir, f))]
    json_inserts = {}

    # pluck a few uuids for testing
    test_types = ['biosample', 'user', 'lab', 'experiment_set_replicate']
    test_inserts = []
    for insert in inserts:
        type_name = insert.split('.')[0]
        json_inserts[type_name] = loadxl.read_single_sheet(insert_dir, type_name)
        # pluck a few uuids for testing
        if type_name in test_types:
            test_inserts.append({'type_name': type_name, 'data':json_inserts[type_name][0]})

    # load -em up
    start = timer()
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', json_inserts, status=200)
        assert res.json['status'] == 'success'
    stop_insert = timer()
    print("PERFORMANCE: Time to load data is %s" % (stop_insert - start))
    index_res = indexer_testapp.post_json('/index', {'record': True})
    assert index_res.json['indexing_status'] == 'finished'
    stop_index = timer()
    print("PERFORMANCE: Time to index is %s" % (stop_index - start))

    # check a couple random inserts
    for item in test_inserts:
        start = timer()
        assert testapp.get("/" + item['data']['uuid'] + "?frame=raw").json['uuid']
        stop = timer()
        frame_time = stop - start

        start = timer()
        assert testapp.get("/" + item['data']['uuid']).follow().json['uuid']
        stop = timer()
        embed_time = stop - start

        print("PERFORMANCE: Time to query item %s - %s raw: %s embed %s" % (item['type_name'], item['data']['uuid'],
                                                               frame_time, embed_time))
    # userful for seeing debug messages
    # assert False
