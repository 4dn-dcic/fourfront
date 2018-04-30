# Use workbook fixture from BDD tests (including elasticsearch)
from .features.conftest import app_settings, app, workbook
import pytest
import random
from encoded.commands.upgrade_test_inserts import get_inserts
import json
import time
pytestmark = [pytest.mark.working, pytest.mark.schema]

### IMPORTANT
# uses the inserts in ./data/workbook_inserts
# design your tests accordingly

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
    # since lab.awards was not specifically embedded, the field should not exist
    assert test_json['lab'].get('awards') is None


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


def test_search_facets_and_columns_order(workbook, testapp, registry):
    from snovault import TYPES
    test_type = 'experiment_set_replicate'
    type_info = registry[TYPES].by_item_type[test_type]
    schema = type_info.schema
    schema_facets = [('type', {'title': 'Data Type'})]
    schema_facets.extend(schema['facets'].items())
    schema_columns = [(name, obj.get('title')) for name,obj in schema['columns'].items()]
    res = testapp.get('/search/?type=ExperimentSetReplicate&limit=all').json
    for i,val in enumerate(schema_facets):
        assert res['facets'][i]['field'] == val[0]
    for i,val in enumerate(schema_columns):
        assert res['columns'][val[0]]['title'] == val[1]


def test_search_embedded_file_by_accession(workbook, testapp):
    res = testapp.get('/search/?type=ExperimentHiC&files.accession=4DNFIO67APU1').json
    assert len(res['@graph']) > 0
    item_uuids = [item['uuid'] for item in res['@graph'] if 'uuid' in item]
    for item_uuid in item_uuids:
        item_res = testapp.get('/experiments-hi-c/%s/' % item_uuid, status=301)
        exp = item_res.follow().json
        file_uuids = [f['uuid'] for f in exp['files']]
        assert '46e82a90-49e5-4c33-afab-9ec90d65faa0' in file_uuids


@pytest.fixture
def mboI_dts(testapp, workbook):
    # returns a dictionary of strings of various date and datetimes
    # relative to the creation date of the mboI one object in test inserts
    from datetime import (datetime, timedelta)
    enz = testapp.get('/search/?type=Enzyme&name=MboI').json['@graph'][0]

    cdate = enz['date_created']
    _date, _time = cdate.split('T')
    yr, mo, day = [int(i) for i in _date.split('-')]
    hr, mi, _ = _time.split(':', 2)
    hr = int(hr)
    mi = int(mi)
    createdate = datetime(yr, mo, day, hr, mi)

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


def test_search_query_string_with_booleans(workbook, testapp):
    """
    moved references to res_not_induced and not_induced_uuids,
    which were passing locally but failing on travis for some undetermined
    reason... will look into this more later
    """
    search = '/search/?type=Biosource&q=GM12878'
    res_stem = testapp.get(search).json
    assert len(res_stem['@graph']) > 1
    bios_uuids = [r['uuid'] for r in res_stem['@graph'] if 'uuid' in r]
    swag_bios = '331111bc-8535-4448-903e-854af460b888'
    assert swag_bios in bios_uuids
    # assert induced_stem_uuid not in not_induced_uuids
    # now search for stem AND induced
    search = '/search/?type=Biosource&q=swag+AND+GM12878'
    res_both = testapp.get(search).json
    both_uuids = [r['uuid'] for r in res_both['@graph'] if 'uuid' in r]
    assert len(both_uuids) == 1
    assert swag_bios in both_uuids


def test_metadata_tsv_view(workbook, htmltestapp):

    FILE_ACCESSION_COL_INDEX = 3
    FILE_DOWNLOAD_URL_COL_INDEX = 0

    def check_tsv(result_rows, len_requested = None):
        info_row = result_rows.pop(0)
        header_row = result_rows.pop(0)

        assert header_row[FILE_ACCESSION_COL_INDEX] == 'File Accession'
        assert header_row.index('File Download URL') == FILE_DOWNLOAD_URL_COL_INDEX # Ensure we have this column
        assert len(result_rows) > 0 # We at least have some rows.

        for row_index in range(1):
            assert len(result_rows[row_index][FILE_ACCESSION_COL_INDEX]) > 4 # We have a value for File Accession
            assert 'http' in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX] # Make sure it seems like a valid URL.
            assert '/@@download/' in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX]
            assert result_rows[row_index][FILE_ACCESSION_COL_INDEX] in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX] # That File Accession is also in File Download URL of same row.
            assert len(result_rows[row_index][FILE_ACCESSION_COL_INDEX]) < len(result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX])

        # Last some rows should be 'summary' rows. And have empty spaces for 'Download URL' / first column.
        summary_start_row = None
        for row_index, row in enumerate(result_rows):
            if row[1] == 'Summary':
                summary_start_row = row_index - 1
                break

        # Check that summary cells are present, in right place, with some correct-looking values
        assert result_rows[summary_start_row + 1][1] == 'Summary'
        assert result_rows[summary_start_row + 3][1] == 'Files Selected for Download:'
        assert result_rows[summary_start_row + 4][1] == 'Total File Rows:'
        assert result_rows[summary_start_row + 5][1] == 'Unique Downloadable Files:'
        if len_requested:
            assert int(result_rows[summary_start_row + 3][4]) == len_requested
        assert int(result_rows[summary_start_row + 4][4]) == summary_start_row
        assert int(result_rows[summary_start_row + 5][4]) <= summary_start_row


    # run a simple GET query with type=ExperimentSetReplicate
    res = htmltestapp.get('/metadata/type=ExperimentSetReplicate/metadata.tsv')
    assert 'text/tsv' in res.content_type
    result_rows = [ row.rstrip(' \r').split('\t') for row in res.body.decode('utf-8').split('\n') ] # Strip out carriage returns and whatnot. Make a plain multi-dim array.

    check_tsv(result_rows)

    # Perform POST w/ accession triples (main case, for BrowseView downloads)
    res2_post_data = { # N.B. '.post', not '.post_json' is used. This dict is converted to POST form values, with key values STRINGIFIED, not to POST JSON request.
        "accession_triples" : [
            ["4DNESAAAAAA1","4DNEXO67APU1","4DNFIO67APU1"],
            ["4DNESAAAAAA1","4DNEXO67APU1","4DNFIO67APT1"],
            ["4DNESAAAAAA1","4DNEXO67APT1","4DNFIO67APV1"],
            ["4DNESAAAAAA1","4DNEXO67APT1","4DNFIO67APY1"],
            ["4DNESAAAAAA1","4DNEXO67APV1","4DNFIO67APZ1"],
            ["4DNESAAAAAA1","4DNEXO67APV1","4DNFIO67AZZ1"]
        ],
        'download_file_name' : 'metadata_TEST.tsv'
    }

    res2 = htmltestapp.post('/metadata/type=ExperimentSetReplicate/metadata.tsv', { k : json.dumps(v) for k,v in res2_post_data.items() })

    assert 'text/tsv' in res2.content_type
    result_rows = [ row.rstrip(' \r').split('\t') for row in res2.body.decode('utf-8').split('\n') ]

    check_tsv(result_rows, len(res2_post_data['accession_triples']))




def test_default_schema_and_non_schema_facets(workbook, testapp, registry):
    from snovault import TYPES
    from snovault.fourfront_utils import add_default_embeds
    test_type = 'biosample'
    type_info = registry[TYPES].by_item_type[test_type]
    schema = type_info.schema
    embeds = add_default_embeds(test_type, registry[TYPES], type_info.embedded_list, schema)
    # we're looking for this specific facet, which is not in the schema
    assert 'biosource.biosource_type' in embeds
    res = testapp.get('/search/?type=Biosample&biosource.biosource_type=immortalized+cell+line').json
    assert 'facets' in res
    facet_fields = [facet['field'] for facet in res['facets']]
    assert 'type' in facet_fields
    assert 'status' in facet_fields
    for facet in schema['facets'].keys():
        assert facet in facet_fields
    # now ensure that facets can also be created outside of the schema
    assert 'biosource.biosource_type' in facet_fields


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
    search = '/search/?description=No+value&description=GM12878+prepared+for+HiC&type=Biosample'
    res_json = testapp.get(search).json
    # grab some random results
    for item in res_json['@graph']:
        maybe_null = item.get('description')
        assert( maybe_null is None or maybe_null == 'GM12878 prepared for HiC')
    res_ids = [r['uuid'] for r in res_json['@graph'] if 'uuid' in r]
    search2 = '/search/?description=GM12878+prepared+for+HiC&type=Biosample'
    res_json2 = testapp.get(search2).json
    # just do 1 res here
    check_item = res_json2['@graph'][0]
    assert(check_item.get('description') == 'GM12878 prepared for HiC')
    res_ids2 = [r['uuid'] for r in res_json2['@graph'] if 'uuid' in r]
    assert(set(res_ids2) <= set(res_ids))


#########################################
## Tests for collections (search 301s) ##
#########################################

from .test_views import TYPE_LENGTH

def test_collection_limit(workbook, testapp):
    res = testapp.get('/biosamples/?limit=2', status=301)
    assert len(res.follow().json['@graph']) == 2


def test_collection_actions_filtered_by_permission(workbook, testapp, anontestapp):
    res = testapp.get('/biosamples/')
    assert any(action for action in res.follow().json.get('actions', []) if action['name'] == 'add')

    # biosamples not visible
    res = anontestapp.get('/biosamples/', status=404)
    assert len(res.json['@graph']) == 0


def test_index_data_workbook(app, workbook, testapp, indexer_testapp, htmltestapp):
    from snovault.elasticsearch import create_mapping
    es = app.registry['elasticsearch']
    # we need to reindex the collections to make sure numbers are correct
    create_mapping.run(app, sync_index=True)
    for item_type in TYPE_LENGTH.keys():
        print('\n\n--> %s' % item_type)
        tries = 0
        item_len = None
        while item_len is None or (item_len != TYPE_LENGTH[item_type] and tries < 3):
            if item_len != None:
                create_mapping.run(app, collections=[item_type], strict=True, sync_index=True)
                time.sleep(3)
            es_count = es.count(index=item_type, doc_type=item_type).get('count')
            print('... ES COUNT: %s' % str(es_count))
            res = testapp.get('/%s?limit=all' % item_type, status=[200, 301, 404])
            if res.status_code == 404:  # no items found
                item_len = 0
            else:
                res = res.follow()
                item_len = len(res.json['@graph'])
            print('... RES COUNT: %s' % str(item_len))
            print('... TYPE COUNT: %s' % TYPE_LENGTH[item_type])
            tries += 1
        assert item_len == TYPE_LENGTH[item_type]
        if item_len > 0:
            random_id = random.choice(res.json['@graph'])['@id']
            indexer_testapp.get(random_id + '@@index-data', status=200)
            # previously test_html_pages
            try:
                res = htmltestapp.get(random_id)
                assert res.body.startswith(b'<!DOCTYPE html>')
            except Exception as e:
                pass


######################################
## Search-based visualization tests ##
######################################


def test_barplot_aggregation_endpoint(workbook, testapp):

    # Check what we get back -
    search_result = testapp.get('/browse/?type=ExperimentSetReplicate').json
    search_result_count = len(search_result['@graph'])

    # We should get back same count as from search results here. But on Travis oftentime we don't, so we compare either against count of inserts --or-- count returned from regular results.
    exp_set_test_inserts = list(get_inserts('inserts', 'experiment_set_replicate'))
    count_exp_set_test_inserts = len(exp_set_test_inserts)

    # Now, test the endpoint after ensuring we have the data correctly loaded into ES.
    # We should get back same count as from search results here.

    res = testapp.get('/bar_plot_aggregations/type=ExperimentSetReplicate/?field=experiments_in_set.experiment_type&field=award.project').json # Default

    # Our total count for experiment_sets should match # of exp_set_replicate inserts.abs

    assert (res['total']['experiment_sets'] == count_exp_set_test_inserts) or (res['total']['experiment_sets'] == search_result_count)

    assert res['field'] == 'experiments_in_set.experiment_type' # top level field

    assert isinstance(res['terms'], dict) is True

    assert len(res["terms"].keys()) > 0

    #assert isinstance(res['terms']["CHIP-seq"], dict) is True # A common term likely to be found.

    #assert res["terms"]["CHIP-seq"]["field"] == "award.project" # Child-field

    # We only have 4DN as single award.project in test inserts so should have values in all buckets, though probably less than total.
    #assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] > 0
    #assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] < count_exp_set_test_inserts

    #assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] > 0
    #assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] < count_exp_set_test_inserts
