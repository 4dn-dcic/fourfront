# Use workbook fixture from BDD tests (including elasticsearch)
from .features.conftest import app_settings, app, workbook
import pytest
from encoded.commands.upgrade_test_inserts import get_inserts
pytestmark = [pytest.mark.working, pytest.mark.schema]


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


@pytest.mark.skip
def test_search_with_embedding(workbook, testapp):
    res = testapp.get('/search/?type=Biosample&limit=all').json
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
    res = testapp.get('/search/?type=Item&q=mauxz', status=[200, 404]).json
    # make this test robust by either assuming no results are found
    # (true when this test was written)
    # OR that results that happen to contain "mauze" do not include what
    # we're looking for.
    mauxz_uuids = [item['uuid'] for item in res['@graph'] if 'uuid' in item]
    # make sure all uuids found in the first search are present in the second
    assert not set(mouse_uuids).issubset(set(mauxz_uuids))


@pytest.mark.skip
def test_search_facets_and_columns_order(workbook, testapp, registry):
    from snovault import TYPES
    test_type = 'experiment_set'
    type_info = registry[TYPES].by_item_type[test_type]
    schema = type_info.schema
    schema_facets = [('type', {'title': 'Data Type'})]
    schema_facets.extend(schema['facets'].items())
    schema_columns = [(name, obj.get('title')) for name,obj in schema['columns'].items()]
    res = testapp.get('/search/?type=ExperimentSet&limit=all').json
    for i,val in enumerate(schema_facets):
        assert res['facets'][i]['field'] == val[0]
    for i,val in enumerate(schema_columns):
        assert res['columns'][val[0]] == val[1]


def test_search_embedded_file_by_accession(workbook, testapp):
    res = testapp.get('/search/?type=WorkflowRunSbg&output_files.value.accession=4DNFIYWQ59JI').json
    assert len(res['@graph']) > 0  # mutiple wfr can be returned
    wfr_uuids = [wfr['uuid'] for wfr in res['@graph'] if 'uuid' in wfr]
    for wfruuid in wfr_uuids:
        path = '/workflow-runs-sbg/%s/' % wfruuid
        wfr = testapp.get(path).json
        file_uuids = [f['value']['uuid'] for f in wfr['output_files']]
        assert 'fbd7e4ad-49e5-4c33-afab-9ec90d65faf3' in file_uuids


def test_search_parameter_name_and_value(workbook, testapp):
    # only workflow run sbgs with both ncores wf_argname and some value = 8 returned
    res = testapp.get('/search/?type=WorkflowRunSbg&parameters.workflow_argument_name=ncores&parameters.value=8').json
    assert len(res['@graph']) > 0  # mutiple wfr can be returned
    wfr_uuids = [wfr['uuid'] for wfr in res['@graph'] if 'uuid' in wfr]
    assert 'e5927906-cf80-46da-8a81-1093926865af' in wfr_uuids


@pytest.fixture
def mboI_dts(testapp, workbook):
    # returns a dictionary of strings of various date and datetimes
    # relative to the creation date of the mboI one object in test inserts
    from datetime import (datetime, timedelta)
    enz = testapp.get('/search/?type=Enzyme&name=MboI').json['@graph'][0]

    cdate = enz['date_created']
    date, time = cdate.split('T')
    yr, mo, day = [int(i) for i in date.split('-')]
    hr, mi, _ = time.split(':', 2)
    hr = int(hr)
    mi = int(mi)
    createdate = datetime(yr, mo, day, hr, mi)
    print(createdate)

    return {
        'creationdatetime': ':'.join(str(createdate).replace(' ', '+').split(':')[:-1]),
        'creationdate': str(createdate.date()) + '+00:00',
        'daybefore': ':'.join(str(createdate - timedelta(days=1)).replace(' ', '+').split(':')[:-1]),
        'dayafter': ':'.join(str(createdate + timedelta(days=1)).replace(' ', '+').split(':')[:-1]),
        'hourbefore': ':'.join(str(createdate - timedelta(hours=1)).replace(' ', '+').split(':')[:-1]),
        'hourafter': ':'.join(str(createdate + timedelta(hours=1)).replace(' ', '+').split(':')[:-1])
    }


def test_search_date_range_find_within(mboI_dts, testapp, workbook):
    # the MboI enzyme should be returned with all the provided pairs
    gres = testapp.get('/search/?type=Enzyme&name=MboI').json
    g_uuids = [item['uuid'] for item in gres['@graph'] if 'uuid' in item]
    dts = {k: v.replace(':', '%3A') for k, v in mboI_dts.items()}
    datepairs = [
        (dts['daybefore'], dts['dayafter']),
        (dts['creationdatetime'], dts['dayafter']),
        (dts['daybefore'], dts['creationdatetime']),
        (dts['creationdate'], dts['dayafter']),
        (dts['hourbefore'], dts['hourafter'])
    ]

    for dp in datepairs:
        search = '/search/?type=Enzyme&after=%s&before=%s' % dp
        sres = testapp.get(search).json
        s_uuids = [item['uuid'] for item in sres['@graph'] if 'uuid' in item]
        assert set(g_uuids).issubset(set(s_uuids))


def test_search_date_range_dontfind_without(mboI_dts, testapp, workbook):
    # the MboI enzyme should be returned with all the provided pairs
    dts = {k: v.replace(':', '%3A') for k, v in mboI_dts.items()}
    datepairs = [
        (dts['daybefore'], dts['creationdate']),
        (dts['hourafter'], dts['dayafter']),
        (dts['daybefore'], dts['hourbefore'])
    ]
    for dp in datepairs:
        search = '/search/?type=Enzyme&after=%s&before=%s' % dp
        assert testapp.get(search, status=404)


def test_search_query_string_AND_NOT_cancel_out(workbook, testapp):
    # if you use + and - with same field you should get no result
    search = '/search/?q=cell+AND+NOT+cell&type=Biosource'
    assert testapp.get(search, status=404)

### TEST PASSES LOCALLY BUT WILL NOT ON TRAVIS...
### Problem with +AND+ strings in search?
@pytest.mark.skip
def test_search_query_string_with_booleans(workbook, testapp):
    """
    moved references to res_not_induced and not_induced_uuids,
    which were passing locally but failing on travis for some undetermined
    reason... will look into this more later
    """
    # search = '/search/?type=Biosource&q=stem+AND+NOT+induced'
    # res_not_induced = testapp.get(search).json
    search = '/search/?type=Biosource&q=stem'
    res_stem = testapp.get(search).json
    assert len(res_stem['@graph']) > 0
    # assert len(res_not_induced['@graph']) > 0
    # not_induced_uuids = [r['uuid'] for r in res_not_induced['@graph'] if 'uuid' in r]
    stem_uuids = [r['uuid'] for r in res_stem['@graph'] if 'uuid' in r]
    # assert set(not_induced_uuids).issubset(set(stem_uuids))
    # uuid of induced stem cell = 331111bc-8535-4448-903e-854af460b89f
    induced_stem_uuid = '331111bc-8535-4448-903e-854af460b89f'
    assert induced_stem_uuid in stem_uuids
    # assert induced_stem_uuid not in not_induced_uuids
    # now search for stem AND induced
    search = '/search/?type=Biosource&q=stem+AND+induced'
    res_both = testapp.get(search).json
    both_uuids = [r['uuid'] for r in res_both['@graph'] if 'uuid' in r]
    assert len(both_uuids) == 1
    assert induced_stem_uuid in both_uuids


def test_metadata_tsv_view(workbook, htmltestapp):

    FILE_ACCESSION_COL_INDEX = 3
    FILE_DOWNLOAD_URL_COL_INDEX = 0

    # run a simple GET query with type=ExperimentSet
    res = htmltestapp.get('/metadata/type=ExperimentSet/metadata.tsv')
    assert 'text/tsv' in res.content_type
    result_rows = [ row.rstrip(' \r').split('\t') for row in res.body.decode('utf-8').split('\n') ] # Strip out carriage returns and whatnot. Make a plain multi-dim array.
    header_row = result_rows.pop(0)

    assert header_row[FILE_ACCESSION_COL_INDEX] == 'File Accession'

    assert header_row.index('File Download URL') == FILE_DOWNLOAD_URL_COL_INDEX # Ensure we have this column

    assert len(result_rows) > 3 # We at least have some rows.

    for row_index in range(4):
        assert len(result_rows[row_index][FILE_ACCESSION_COL_INDEX]) > 4 # We have a value for File Accession
        assert 'http' in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX] # Make sure it seems like a valid URL.
        assert '/@@download/' in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX]
        assert result_rows[row_index][FILE_ACCESSION_COL_INDEX] in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX] # That File Accession is also in File Download URL of same row.
        assert len(result_rows[row_index][FILE_ACCESSION_COL_INDEX]) < len(result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX])

    # TODO: More testing: form POST query


@pytest.mark.skip
def test_default_schema_and_non_schema_facets(workbook, testapp, registry):
    from snovault import TYPES
    from snovault.fourfront_utils import add_default_embeds
    test_type = 'biosample'
    type_info = registry[TYPES].by_item_type[test_type]
    schema = type_info.schema
    embeds = add_default_embeds(test_type, registry[TYPES], type_info.embedded_list, schema)
    # we're looking for this specific facet, which is not in the schema
    assert 'treatments.rnai_vendor.display_title' in embeds
    res = testapp.get('/search/?type=Biosample&treatments.rnai_vendor.display_title=Worthington+Biochemical').json
    assert 'facets' in res
    facet_fields = [facet['field'] for facet in res['facets']]
    assert 'type' in facet_fields
    assert 'status' in facet_fields
    for facet in schema['facets'].keys():
        assert facet in facet_fields
    # now ensure that facets can also be created outside of the schema
    assert 'treatments.rnai_vendor.display_title' in facet_fields


def test_search_query_string_with_fields(workbook, testapp):
    search = '/search/?q=age%3A53+OR+name%3Ahuman&type=Item'
    res_age_name = testapp.get(search).json
    age_name_ids = [r['uuid'] for r in res_age_name['@graph'] if 'uuid' in r]
    assert len(age_name_ids) == 2
    search = '/search/?q=age%3A53&type=Item'
    res_age = testapp.get(search).json
    age_ids = [r['uuid'] for r in res_age['@graph'] if 'uuid' in r]
    assert len(age_ids) == 1
    search = '/search/?q=name%3Ahuman&type=Item'
    res_name = testapp.get(search).json
    name_ids = [r['uuid'] for r in res_name['@graph'] if 'uuid' in r]
    assert len(name_ids) == 1
    assert name_ids[0] in age_name_ids
    assert age_ids[0] in age_name_ids
    search = '/search/?q=age%3A53+AND+organism.name%3Ahuman&type=Item'
    res_idv = testapp.get(search).json
    idv_ids = [r['uuid'] for r in res_idv['@graph'] if 'uuid' in r]
    assert len(idv_ids) == 1
    assert idv_ids[0] == age_ids[0]


def test_search_with_no_value(workbook, testapp):
    import random
    search = '/search/?digestion_enzyme.name=No+value&digestion_enzyme.name=DNaseI&q=cell&type=Experiment'
    res_json = testapp.get(search).json
    # grab some random results
    check_items = random.sample(res_json['@graph'], 4)
    for item in check_items:
        maybe_null = item.get('digestion_enzyme', {}).get('name')
        assert( maybe_null is None or maybe_null == 'DNaseI')
    res_ids = [r['uuid'] for r in res_json['@graph'] if 'uuid' in r]
    search2 = '/search/?digestion_enzyme.name=No+value&digestion_enzyme.name=DNaseI&publications_of_exp.display_title=No+value&q=cell&type=Experiment'
    res_json2 = testapp.get(search2).json
    # grab some random results
    check_items = random.sample(res_json2['@graph'], 4)
    for item in check_items:
        maybe_null = item.get('digestion_enzyme', {}).get('name')
        assert(maybe_null is None or maybe_null == 'DNaseI')
        assert(not item.get('publications_of_exp'))
    res_ids2 = [r['uuid'] for r in res_json2['@graph'] if 'uuid' in r]
    assert(set(res_ids2) <= set(res_ids))
    search3 = '/search/?digestion_enzyme.name=DNaseI&publications_of_exp.display_title=No+value&q=cell&type=Experiment'
    res_json3 = testapp.get(search3).json
    # just do 1 res here
    check_item = random.choice(res_json3['@graph'])
    assert(check_item.get('digestion_enzyme', {}).get('name') == 'DNaseI')
    assert(not check_item.get('publications_of_exp'))
    res_ids3 = [r['uuid'] for r in res_json3['@graph'] if 'uuid' in r]
    assert(set(res_ids3) <= set(res_ids))




######################################
## Search-based visualization tests ##
######################################


def test_barplot_aggregation_endpoint(workbook, testapp):

    # run a simple query with type=Organism and q=mouse
    search_result = testapp.get('/browse/?type=ExperimentSetReplicate').json

    # We should get back our test insert expsets here.
    exp_set_test_inserts = list(get_inserts('inserts', 'experiment_set_replicate'))
    count_exp_set_test_inserts = len(exp_set_test_inserts)
    assert len(search_result['@graph']) == count_exp_set_test_inserts

    # Now, test the endpoint after ensuring we have the data correctly loaded into ES.

    res = testapp.get('/bar_plot_aggregations/type=ExperimentSetReplicate/?field=experiments_in_set.experiment_type&field=award.project').json # Default

    # Our total count for experiment_sets should match # of exp_set_replicate inserts.abs

    assert res['total']['experiment_sets'] == count_exp_set_test_inserts

    assert res['field'] == 'experiments_in_set.experiment_type' # top level field

    assert isinstance(res['terms'], dict) is True

    assert len(res["terms"].keys()) > 2

    assert isinstance(res['terms']["CHIP-seq"], dict) is True # A common term likely to be found.

    assert res["terms"]["CHIP-seq"]["field"] == "award.project" # Child-field

    # We only have 4DN as single award.project in test inserts so should have values in all buckets, though probably less than total.
    assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] > 0
    assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] < count_exp_set_test_inserts

    assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] > 0
    assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] < count_exp_set_test_inserts
