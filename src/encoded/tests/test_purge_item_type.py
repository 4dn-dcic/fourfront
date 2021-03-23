import pytest
import time

from ..commands.purge_item_type import purge_item_type_from_storage


@pytest.fixture
def dummy_static_section(es_testapp):
    static_section = {  # from workbook_inserts
        "name": "search-info-header.Workflow_copy",
        "uuid": "442c8aa0-dc6c-43d7-814a-854af460b015",
        "section_type": "Search Info Header",
        "title": "Workflow Information",
        "body": "Some text to be rendered as a header"
    }
    es_testapp.post_json('/static_section', static_section, status=201)
    es_testapp.post_json('/index', {'record': True})


@pytest.fixture
def many_dummy_static_sections(es_testapp):
    static_section_template = {
        "name": "search-info-header.Workflow",
        "section_type": "Search Info Header",
        "title": "Workflow Information",
        "body": "Some text to be rendered as a header"
    }
    paths = []
    for i in range(6):  # arbitrarily defined
        static_section_template['name'] = 'search-info-header.Workflow:%s' % i
        resp = es_testapp.post_json('/static_section', static_section_template, status=201).json
        paths.append(resp['@graph'][0]['@id'])
    es_testapp.post_json('/index', {'record': True})
    return paths


@pytest.mark.parametrize('item_type', ['static_section'])  # XXX: Maybe parametrize on a few types?
def test_purge_item_type_from_db(es_testapp, dummy_static_section, item_type):
    """ Tests purging all items of a certain item type from the DB """
    # Next 3 lines experimental
    # es_testapp.post_json('/index', {'record': True})
    # time.sleep(10)
    # purge_item_type_from_storage(es_testapp, ['pages'])  # get rid of these guys, could have links left over
    assert purge_item_type_from_storage(es_testapp, [item_type]) is True
    es_testapp.post_json('/index', {'record': True})
    es_testapp.get('/search/?type=StaticSection', status=404)
    es_testapp.get('/static-sections/442c8aa0-dc6c-43d7-814a-854af460b015?datastore=database', status=404)


def test_purge_item_type_from_db_many(es_testapp, many_dummy_static_sections):
    """ Tests posting/deleting several static sections and checking all are gone """
    paths_to_check = many_dummy_static_sections
    assert purge_item_type_from_storage(es_testapp, ['static_section']) is True
    es_testapp.post_json('/index', {'record': True})
    path_string = '%s?datastore=database'
    for path in paths_to_check:
        es_testapp.get(path_string % path, status=404)
    es_testapp.get('/search/?type=StaticSection', status=404)


# Just this one test is a workbook test, but note well that it does not modify the workbook.
# It should just try and fail, so that should be OK for the workbook. -kmp 22-Mar-2021
@pytest.mark.workbook
def test_purge_item_type_with_links_fails(es_testapp, workbook):
    """ Tries to remove 'lab', which should fail since it has links """
    es_testapp.post_json('/index', {'record': True})  # must index everything so individual links show up
    time.sleep(5)  # wait for indexing to catch up
    assert not purge_item_type_from_storage(es_testapp, ['lab'])
    es_testapp.post_json('/index', {'record': True})
