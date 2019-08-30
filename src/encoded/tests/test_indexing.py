""" Test full indexing setup

The fixtures in this module setup a full system with postgresql and
elasticsearch running as subprocesses.
"""
import pytest
import json
import time
from encoded.verifier import verify_item
from snovault.elasticsearch.interfaces import INDEXER_QUEUE
from .features.conftest import app_settings, app as conf_app

pytestmark = [pytest.mark.working, pytest.mark.indexing, pytest.mark.flaky]

# subset of collections to run test on
TEST_COLLECTIONS = ['testing_post_put_patch', 'file_processed']


@pytest.yield_fixture(scope='session')
def app(app_settings, use_collections=TEST_COLLECTIONS):
    """
    Use to pass kwargs for create_mapping to conftest app
    """
    for app in conf_app(app_settings, collections=use_collections, skip_indexing=True):
        yield app


@pytest.fixture(autouse=True)
def teardown(app, use_collections=TEST_COLLECTIONS):
    import transaction
    from sqlalchemy import MetaData
    from zope.sqlalchemy import mark_changed
    from snovault import DBSESSION
    from snovault.elasticsearch import create_mapping
    from .conftest import indexer_testapp
    # index and then run create mapping to clear things out
    indexer_testapp(app).post_json('/index', {'record': True})
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
    es = app.registry['elasticsearch']
    doc_count = es.count(index='testing_post_put_patch', doc_type='testing_post_put_patch').get('count')
    assert doc_count == 0
    # First post a single item so that subsequent indexing is incremental
    testapp.post_json('/testing-post-put-patch/', {'required': ''})
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

    indexing_doc = es.get(index='indexing', doc_type='indexing', id='latest_indexing')
    indexing_source = indexing_doc['_source']
    assert 'indexing_count' in indexing_source
    assert 'indexing_finished' in indexing_source
    assert 'indexing_content' in indexing_source
    assert indexing_source['indexing_status'] == 'finished'
    assert indexing_source['indexing_count'] > 0
    testing_ppp_mappings = es.indices.get_mapping(index='testing_post_put_patch')['testing_post_put_patch']
    assert 'mappings' in testing_ppp_mappings
    testing_ppp_settings = es.indices.get_settings(index='testing_post_put_patch')['testing_post_put_patch']
    assert 'settings' in testing_ppp_settings
    # ensure we only have 1 shard for tests
    assert testing_ppp_settings['settings']['index']['number_of_shards'] == '1'


def test_create_mapping_on_indexing(app, testapp, registry, elasticsearch):
    """
    Test overall create_mapping functionality using app.
    Do this by checking es directly before and after running mapping.
    Delete an index directly, run again to see if it recovers.
    """
    from snovault.elasticsearch.create_mapping import (
        type_mapping,
        create_mapping_by_type,
        build_index_record,
        compare_against_existing_mapping
    )
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
        found_index_mapping_emb = item_index[item_type]['mappings'][item_type]['properties']['embedded']
        found_index_settings = item_index[item_type]['settings']
        assert found_index_mapping_emb
        assert found_index_settings
        # compare the manually created mapping to the one in ES
        full_mapping = create_mapping_by_type(item_type, registry)
        item_record = build_index_record(full_mapping, item_type)
        # below is True if the found mapping matches manual one
        assert compare_against_existing_mapping(es, item_type, item_record, True)


@pytest.fixture
def test_fp_uuid(testapp, award, experiment, lab, file_formats):
    # this is a processed file
    item = {
        'accession': '4DNFIO67APU2',
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': file_formats.get('pairs').get('@id'),
        'filename': 'test.pairs.gz',
        'md5sum': '0123456789abcdef0123456789abcdef',
        'status': 'uploading',
    }
    res = testapp.post_json('/file_processed', item)
    return res.json['@graph'][0]['uuid']


def test_file_processed_detailed(app, testapp, indexer_testapp, test_fp_uuid,
                                 award, lab, file_formats):
    # Todo, input a list of accessions / uuids:
    verify_item(test_fp_uuid, indexer_testapp, testapp, app.registry)
    # While we're here, test that _update of the file properly
    # queues the file with given relationship
    indexer_queue = app.registry[INDEXER_QUEUE]
    rel_file = {
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': file_formats.get('pairs').get('@id')
    }
    rel_res = testapp.post_json('/file_processed', rel_file)
    rel_uuid = rel_res.json['@graph'][0]['uuid']
    # now update the original file with the relationship
    # ensure rel_file is properly queued
    related_files = [{'relationship_type': 'derived from', 'file': rel_uuid}]
    testapp.patch_json('/' + test_fp_uuid, {'related_files': related_files}, status=200)
    time.sleep(2)
    # may need to make multiple calls to indexer_queue.receive_messages
    received = []
    received_batch = None
    while received_batch is None or len(received_batch) > 0:
        received_batch = indexer_queue.receive_messages()
        received.extend(received_batch)
    to_replace = []
    to_delete = []
    found_fp_sid = None
    found_rel_sid = None
    # keep track of the PATCH of the original file and the associated PATCH
    # of the related file. Compare uuids
    for msg in received:
        json_body = json.loads(msg.get('Body', {}))
        if json_body['uuid'] == test_fp_uuid and json_body['method'] == 'PATCH':
            found_fp_sid = json_body['sid']
            to_delete.append(msg)
        elif json_body['uuid'] == rel_uuid and json_body['method'] == 'PATCH':
            assert json_body['info'] == "queued from %s _update" % test_fp_uuid
            found_rel_sid = json_body['sid']
            to_delete.append(msg)
        else:
            to_replace.append(msg)
    indexer_queue.delete_messages(to_delete)
    indexer_queue.replace_messages(to_replace, vis_timeout=0)
    assert found_fp_sid is not None and found_rel_sid is not None
    assert found_rel_sid > found_fp_sid  # sid of related file is greater


def test_real_validation_error(app, indexer_testapp, testapp, lab, award, file_formats):
    """
    Create an item (file-processed) with a validation error and index,
    to ensure that validation errors work
    """
    import uuid
    from snovault.elasticsearch.interfaces import ELASTIC_SEARCH
    es = app.registry[ELASTIC_SEARCH]
    fp_body = {
        'schema_version': '3',
        'uuid': str(uuid.uuid4()),
        'file_format': file_formats.get('mcool').get('uuid'),
        'lab': lab['uuid'],
        'award': award['uuid'],
        'higlass_uid': 1  # validation error -- higlass_uid should be string
    }
    res = testapp.post_json('/files-processed/?validate=false&upgrade=False',
                                  fp_body, status=201).json
    fp_id = res['@graph'][0]['@id']
    val_err_view = testapp.get(fp_id + '@@validation-errors', status=200).json
    assert val_err_view['@id'] == fp_id
    assert val_err_view['validation_errors'] == []

    # call to /index will throw MissingIndexItemException multiple times, since
    # associated file_format, lab, and award are not indexed. That's okay
    indexer_testapp.post_json('/index', {'record': True})
    time.sleep(2)
    es_res = es.get(index='file_processed', doc_type='file_processed', id=res['@graph'][0]['uuid'])
    assert len(es_res['_source'].get('validation_errors', [])) == 1
    # check that validation-errors view works
    val_err_view = testapp.get(fp_id + '@@validation-errors', status=200).json
    assert val_err_view['@id'] == fp_id
    assert val_err_view['validation_errors'] == es_res['_source']['validation_errors']


# @pytest.mark.performance
@pytest.mark.skip(reason="need to update perf-testing inserts")
def test_load_and_index_perf_data(testapp, indexer_testapp):
    '''
    ~~ CURRENTLY NOT WORKING ~~

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
        json_inserts[type_name] = json.loads(open(insert_dir + insert).read())
        # pluck a few uuids for testing
        if type_name in test_types:
            test_inserts.append({'type_name': type_name, 'data': json_inserts[type_name][0]})

    # load -em up
    start = timer()
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        data = {'store': json_inserts}
        res = testapp.post_json('/load_data', data,  # status=200
                                )
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
