# Use workbook fixture from BDD tests (including elasticsearch)
from .features.conftest import app_settings, app, workbook
import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


def test_search_view(workbook, testapp):
    res = testapp.get('/search/?type=Item').json
    assert res['@type'] == ['Search']
    assert res['@id'] == '/search/?type=Item'
    assert res['@context'] == '/terms/'
    assert res['notification'] == 'Success'
    assert res['title'] == 'Search'
    assert res['total'] > 0
    assert 'facets' in res
    assert 'filters' in res
    assert '@graph' in res


def test_search_with_no_query(workbook, testapp):
    # using /search/ (with no query) should default to /search/?type=Item
    # thus, should satisfy same assertions as test_search_view
    res = testapp.get('/search/').follow(status=200)
    assert res.json['@type'] == ['Search']
    assert res.json['@id'] == '/search/?type=Item'
    assert res.json['@context'] == '/terms/'
    assert res.json['notification'] == 'Success'
    assert res.json['title'] == 'Search'
    assert res.json['total'] > 0
    assert 'facets' in res
    # test default facets (data type and status)
    default_facets = [facet['field'] for facet in res.json['facets']]
    assert 'type' in default_facets
    assert 'status' in default_facets
    assert 'filters' in res
    assert '@graph' in res


def test_collections_redirect_to_search(workbook, testapp):
    # we removed the collections page and redirect to search of that type
    res = testapp.get('/biosamples/').follow(status=200)
    assert res.json['@type'] == ['Search']
    assert res.json['@id'] == '/search/?type=Biosample'
    assert res.json['@context'] == '/terms/'
    assert res.json['notification'] == 'Success'
    assert res.json['title'] == 'Search'
    assert res.json['total'] > 0
    assert 'facets' in res
    assert 'filters' in res
    assert '@graph' in res


def test_search_with_embedding(workbook, testapp):
    res = testapp.get('/search/?type=Biosample').json
    # Use a specific biosample, found by accession from test data
    # Check the embedding /types/biosample.py entry; test ensures
    # that the actual embedding matches that
    res_json = [bios for bios in res['@graph'] if bios['accession'] == '4DNBS1234567']
    assert len(res_json) == 1
    test_json = res_json[0]
    # check defualt embedding: link_id and display_title for submitted_by
    assert test_json['submitted_by']['display_title'] == 'Wrangler Wrangler'
    assert test_json['submitted_by']['link_id'] == '~users~986b362f-4eb6-4a9c-8173-3ab267307e3b~'
    # this specific field should be embedded ('biosource.biosource_type')
    assert test_json['biosource'][0]['biosource_type'] == 'immortalized cell line'
    # this specific linked should be embedded ('biosource.biosource_vendor')
    assert isinstance(test_json['biosource'][0]['biosource_vendor'], dict)
    # this specific field was not embedded and should not be present
    assert 'description' not in test_json['biosource'][0]
    # since lab.awards.uuid was not specifically embedded, the field should not exist
    # (removed @id-like field)
    assert 'uuid' not in test_json['lab'].get('awards')
    # @id-like field that should still be embedded (not a valid @id)
    assert test_json['lab']['city'] == 'Boston'


def test_search_with_simple_query(workbook, testapp):
    # run a simple query with type=Organism and q=mouse
    res = testapp.get('/search/?type=Organism&q=mouse').json
    assert len(res['@graph']) > 0
    # get the uuids from the results
    mouse_uuids = [org['uuid'] for org in res['@graph'] if 'uuid' in org]
    # run the same search with type=Item
    res = testapp.get('/search/?type=Item&q=mouse').json
    assert len(res['@graph']) > 0
    all_uuids = [item['uuid'] for item in res['@graph'] if 'uuid' in item]
    # make sure all uuids found in the first search are present in the second
    assert set(mouse_uuids).issubset(set(all_uuids))
    # run with q=mous returns the same hits...
    res = testapp.get('/search/?type=Item&q=mous').json
    mous_uuids = [item['uuid'] for item in res['@graph'] if 'uuid' in item]
    # make sure all uuids found in the first search are present in the second
    assert set(mouse_uuids).issubset(set(mous_uuids))
    # run with q=musculus, which should return the same hits as mouse
    res = testapp.get('/search/?type=Item&q=musculus').json
    musculus_uuids = [item['uuid'] for item in res['@graph'] if 'uuid' in item]
    # make sure all uuids found in the first search are present in the second
    assert set(mouse_uuids).issubset(set(musculus_uuids))
    # run with q=mauze (misspelled) and ensure uuids are not in results
    res = testapp.get('/search/?type=Item&q=mauxz', status=[200,404]).json
    # make this test robust by either assuming no results are found
    # (true when this test was written)
    # OR that results that happen to contain "mauze" do not include what
    # we're looking for.
    mauxz_uuids = [item['uuid'] for item in res['@graph'] if 'uuid' in item]
    # make sure all uuids found in the first search are present in the second
    assert not set(mouse_uuids).issubset(set(mauxz_uuids))
