# Use workbook fixture from BDD tests (including elasticsearch)
from .features.conftest import app_settings, app, workbook
import pytest
from encoded.commands.run_upgrader_on_inserts import get_inserts
from snovault.elasticsearch.indexer_utils import get_namespaced_index
import json
import time
from snovault import TYPES

def delay_rerun(*args):
    """ Rerun function for flaky """
    time.sleep(1)
    return True


pytestmark = [pytest.mark.working, pytest.mark.schema, pytest.mark.indexing] #pytest.mark.flaky(rerun_filter=delay_rerun)]

### IMPORTANT
# uses the inserts in ./data/workbook_inserts
# design your tests accordingly


# just a little helper function
def recursively_find_uuids(json, uuids):
    for key, val in json.items():
        if key == 'uuid':
            uuids.add(val)
        elif isinstance(val, list):
            for item in val:
                if isinstance(item, dict):
                    uuids = recursively_find_uuids(item, uuids)
        elif isinstance(val, dict):
            uuids = recursively_find_uuids(val, uuids)
    return uuids


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
    # redirected_from is not used for search
    res = testapp.get('/biosamples/', status=301).follow(status=200)
    assert res.json['@type'] == ['BiosampleSearchResults', 'Search']
    assert res.json['@id'] == '/search/?type=Biosample'
    assert 'redirected_from' not in res.json['@id']
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
    # check default embedding: @id and display_title for submitted_by
    assert test_json['submitted_by']['display_title'] == 'Wrangler Wrangler'
    assert test_json['submitted_by']['@id'] == '/users/986b362f-4eb6-4a9c-8173-3ab267307e3b/'
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
    assert res['@type'] == ['OrganismSearchResults', 'Search']
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
    # TODO: Adjust ordering of mixed-in facets, perhaps sort by lookup or something, in order to un-xfail.
    test_type = 'experiment_set_replicate'
    type_info = registry[TYPES].by_item_type[test_type]
    schema = type_info.schema
    schema_facets = [('type', {'title': 'Data Type'})]
    schema_facets.extend(schema['facets'].items())
    # the following facets are added after schema facets
    schema_facets.append(('status', {'title': 'Status'}))
    # remove any disabled facets
    schema_facets = [fct for fct in schema_facets if not fct[1].get('disabled', False)]
    sort_facets = sorted(schema_facets, key=lambda fct: fct[1].get('order', 0))
    res = testapp.get('/search/?type=ExperimentSetReplicate&limit=all').json
    for i,val in enumerate(sort_facets):
        assert res['facets'][i]['field'] == val[0]
    # assert order of columns when we officially upgrade to python 3.6 (ordered dicts)
    for key,val in schema.get('columns', {}).items():
        assert res['columns'][key]['title'] == val['title']


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
        search = '/search/?type=Enzyme&date_created.from=%s&date_created.to=%s' % dp
        sres = testapp.get(search).json
        s_uuids = [item['uuid'] for item in sres['@graph'] if 'uuid' in item]
        assert set(g_uuids).issubset(set(s_uuids))


def test_search_with_nested_integer(testapp, workbook):
    search0 = '/search/?type=ExperimentHiC'
    s0res = testapp.get(search0).json
    s0_uuids = [item['uuid'] for item in s0res['@graph'] if 'uuid' in item]

    search1 = '/search/?type=ExperimentHiC&files.file_size.to=1500'
    s1res = testapp.get(search1).json
    s1_uuids = [item['uuid'] for item in s1res['@graph'] if 'uuid' in item]
    assert len(s1_uuids) > 0

    search2 = '/search/?type=ExperimentHiC&files.file_size.from=1501'
    s2res = testapp.get(search2).json
    s2_uuids = [item['uuid'] for item in s2res['@graph'] if 'uuid' in item]
    assert len(s2_uuids) > 0

    # make sure there is no intersection of the uuids
    assert not set(s1_uuids) & set(s2_uuids)
    assert set(s1_uuids) | set(s2_uuids) == set(s0_uuids)


def test_search_date_range_dontfind_without(mboI_dts, testapp, workbook):
    # the MboI enzyme should be returned with all the provided pairs
    dts = {k: v.replace(':', '%3A') for k, v in mboI_dts.items()}
    datepairs = [
        (dts['daybefore'], dts['creationdate']),
        (dts['hourafter'], dts['dayafter']),
        (dts['daybefore'], dts['hourbefore'])
    ]
    for dp in datepairs:
        search = '/search/?type=Enzyme&date_created.from=%s&date_created.to=%s' % dp
        assert testapp.get(search, status=404)


def test_search_query_string_AND_NOT_cancel_out(workbook, testapp):
    # if you use + and - with same field you should get no result
    search = '/search/?q=cell+-cell&type=Biosource'
    assert testapp.get(search, status=404)


def test_search_multiple_types(workbook, testapp):
    # multiple types work with @type in response
    search = '/search/?type=Biosample&type=ExperimentHiC'
    res = testapp.get(search).json
    assert res['@type'] == ['BiosampleSearchResults', 'ExperimentHiCSearchResults', 'Search']


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
    # now search for stem +induced (AND is now "+")
    search_and = '/search/?type=Biosource&q=swag+%2BGM12878'
    res_both = testapp.get(search_and).json
    both_uuids = [r['uuid'] for r in res_both['@graph'] if 'uuid' in r]
    assert len(both_uuids) == 1
    assert swag_bios in both_uuids
    # search with OR ("|")
    search_or = '/search/?type=Biosource&q=swag+%7CGM12878'
    res_or = testapp.get(search_or).json
    or_uuids = [r['uuid'] for r in res_or['@graph'] if 'uuid' in r]
    assert len(or_uuids) > 1
    assert swag_bios in or_uuids
    # search with NOT ("-")
    search_not = '/search/?type=Biosource&q=GM12878+-swag'
    res_not = testapp.get(search_not).json
    not_uuids = [r['uuid'] for r in res_not['@graph'] if 'uuid' in r]
    assert swag_bios not in not_uuids


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
    res = htmltestapp.get('/metadata/type=ExperimentSetReplicate/metadata.tsv') # OLD URL FORMAT IS USED -- TESTING REDIRECT TO NEW URL
    res = res.maybe_follow() # Follow redirect -- https://docs.pylonsproject.org/projects/webtest/en/latest/api.html#webtest.response.TestResponse.maybe_follow
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

    res2 = htmltestapp.post('/metadata/?type=ExperimentSetReplicate', { k : json.dumps(v) for k,v in res2_post_data.items() }) # NEWER URL FORMAT

    assert 'text/tsv' in res2.content_type
    result_rows = [ row.rstrip(' \r').split('\t') for row in res2.body.decode('utf-8').split('\n') ]

    check_tsv(result_rows, len(res2_post_data['accession_triples']))


def test_default_schema_and_non_schema_facets(workbook, testapp, registry):
    from snovault import TYPES
    from snovault.util import add_default_embeds
    test_type = 'biosample'
    type_info = registry[TYPES].by_item_type[test_type]
    schema = type_info.schema
    embeds = add_default_embeds(test_type, registry[TYPES], type_info.embedded_list, schema)
    # we're looking for this specific facet, which is not in the schema
    assert 'biosource.biosource_type' in embeds
    res = testapp.get('/search/?type=Biosample&biosource.biosource_type=immortalized+cell+line').json
    assert 'facets' in res
    facet_fields = [ facet['field'] for facet in res['facets'] ]
    assert 'type' in facet_fields
    assert 'status' in facet_fields
    for facet in schema['facets'].keys():
        if not schema['facets'][facet].get('hide_from_view'):
            assert facet in facet_fields
    # now ensure that facets can also be created outside of the schema
    assert 'biosource.biosource_type' in facet_fields


def test_search_query_string_no_longer_functional(workbook, testapp):
    # since we now use simple_query_string, cannot use field:value or range
    # expect 404s, since simple_query_string doesn't return exceptions
    search_field = '/search/?q=name%3Ahuman&type=Item'
    res_field = testapp.get(search_field, status=404)
    assert len(res_field.json['@graph']) == 0

    search_range = '/search/?q=date_created%3A>2018-01-01&type=Item'
    res_search = testapp.get(search_range, status=404)
    assert len(res_search.json['@graph']) == 0


def test_search_with_added_display_title(workbook, testapp, registry):
    # 4DNBS1234567 is display_title for biosample
    search = '/search/?type=ExperimentHiC&biosample=4DNBS1234567'
    # 301 because search query is changed
    res_json = testapp.get(search, status=301).follow(status=200).json
    assert res_json['@id'] == '/search/?type=ExperimentHiC&biosample.display_title=4DNBS1234567'
    added_facet = [fct for fct in res_json['facets'] if fct['field'] == 'biosample.display_title']
    # use the title from biosample in experiment schema
    bios_title = registry[TYPES]['ExperimentHiC'].schema['properties']['biosample']['title']
    assert added_facet[0]['title'] == bios_title
    exps = [exp['uuid'] for exp in res_json['@graph']]

    # make sure the search result is the same for the explicit query
    res_json2 = testapp.get(res_json['@id']).json
    exps2 = [exp['uuid'] for exp in res_json2['@graph']]
    assert set(exps) == set(exps2)

    # 'sort' also adds display_title for ascending and descending queries
    for use_sort in ['biosample', '-biosample']:
        search = '/search/?type=ExperimentHiC&sort=%s' % use_sort
        res_json = testapp.get(search, status=301).follow(status=200).json
        assert res_json['@id'] == '/search/?type=ExperimentHiC&sort=%s.display_title' % use_sort

    # regular sort queries remain unchanged
    search = '/search/?type=ExperimentHiC&sort=uuid'
    res_json = testapp.get(search).json
    assert res_json['@id'] == '/search/?type=ExperimentHiC&sort=uuid'

    # check to see that added facet doesn't conflict with existing facet title
    # query below will change to file_format.display_title=fastq
    search = '/search/?type=File&file_format=fastq'
    res_json = testapp.get(search, status=301).follow(status=200).json
    assert res_json['@id'] == '/search/?type=File&file_format.display_title=fastq'
    # find title from schema
    ff_title = registry[TYPES]['File'].schema['properties']['file_format']['title']
    existing_ff_facet = [fct for fct in res_json['facets'] if fct['field'] == 'file_format.file_format']
    assert existing_ff_facet[0]['title'] == ff_title
    added_ff_facet = [fct for fct in res_json['facets'] if fct['field'] == 'file_format.display_title']
    assert added_ff_facet[0]['title'] == ff_title + ' (Title)'


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


def test_search_with_static_header(workbook, testapp):
    """ Performs a search which should be accompanied by a search header """
    search = '/search/?type=Workflow'
    res_json = testapp.get(search, status=404).json # no items, just checking hdr
    assert 'search_header' in res_json
    assert 'content' in res_json['search_header']
    assert res_json['search_header']['title'] == 'Workflow Information'
    search = '/search/?type=workflow' # check type resolution
    res_json = testapp.get(search, status=404).json
    assert 'search_header' in res_json
    assert 'content' in res_json['search_header']
    assert res_json['search_header']['title'] == 'Workflow Information'


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
    # TODO: NAMESPACE - here, passed in list to create_mapping
    # turn of logging for a bit
    create_mapping.run(app, sync_index=True)
    # check counts and ensure they're equal
    testapp_counts = testapp.get('/counts')
    total_counts = testapp_counts.json['db_es_total']
    split_counts = total_counts.split()  # 2nd item is db counts, 4th is es
    assert(int(split_counts[1]) == int(split_counts[3]))
    for item_type in TYPE_LENGTH.keys():
        tries = 0
        item_len = None
        namespaced_index = get_namespaced_index(app, item_type)
        while item_len is None or (item_len != TYPE_LENGTH[item_type] and tries < 3):
            if item_len != None:
                create_mapping.run(app, collections=[item_type], strict=True, sync_index=True)
                es.indices.refresh(index=namespaced_index)
            item_len = es.count(index=namespaced_index, doc_type=item_type).get('count')
            print('... ES COUNT: %s' % item_len)
            print('... TYPE COUNT: %s' % TYPE_LENGTH[item_type])
            tries += 1
        assert item_len == TYPE_LENGTH[item_type]
        if item_len > 0:
            res = testapp.get('/%s?limit=all' % item_type, status=[200, 301, 404])
            res = res.follow()
            for item_res in res.json.get('@graph', []):
                index_view_res = es.get(index=namespaced_index, doc_type=item_type,
                                        id=item_res['uuid'])['_source']
                # make sure that the linked_uuids match the embedded data
                assert 'linked_uuids_embedded' in index_view_res
                assert 'embedded' in index_view_res
                found_uuids = recursively_find_uuids(index_view_res['embedded'], set())
                # all found uuids must be within the linked_uuids
                assert found_uuids <= set([link['uuid'] for link in index_view_res['linked_uuids_embedded']])
                # if uuids_rev_linking to me, make sure they show up in @@links
                if len(index_view_res.get('uuids_rev_linked_to_me', [])) > 0:
                    links_res = testapp.get('/' + item_res['uuid'] + '/@@links', status=200)
                    link_uuids = [lnk['uuid'] for lnk in links_res.json.get('uuids_linking_to')]
                    assert set(index_view_res['uuids_rev_linked_to_me']) <= set(link_uuids)
                # previously test_html_pages
                try:
                    html_res = htmltestapp.get(item_res['@id'])
                    assert html_res.body.startswith(b'<!DOCTYPE html>')
                except Exception as e:
                    pass


######################################
## Search-based visualization tests ##
######################################


def test_barplot_aggregation_endpoint(workbook, testapp):

    # Check what we get back -
    search_result = testapp.get('/browse/?type=ExperimentSetReplicate&experimentset_type=replicate').json
    search_result_count = len(search_result['@graph'])

    # We should get back same count as from search results here. But on Travis oftentime we don't, so we compare either against count of inserts --or-- count returned from regular results.
    exp_set_test_inserts = list(get_inserts('inserts', 'experiment_set_replicate'))
    count_exp_set_test_inserts = len(exp_set_test_inserts)

    # Now, test the endpoint after ensuring we have the data correctly loaded into ES.
    # We should get back same count as from search results here.
    res = testapp.post_json('/bar_plot_aggregations', {
        "search_query_params" : { "type" : ['ExperimentSetReplicate'] },
        "fields_to_aggregate_for" : ["experiments_in_set.experiment_type.display_title", "award.project"]
    }).json

    print()

    # Our total count for experiment_sets should match # of exp_set_replicate inserts.abs

    assert (res['total']['experiment_sets'] == count_exp_set_test_inserts) or (res['total']['experiment_sets'] == search_result_count)

    assert res['field'] == 'experiments_in_set.experiment_type.display_title' # top level field

    assert isinstance(res['terms'], dict) is True

    assert len(res["terms"].keys()) > 0

    #assert isinstance(res['terms']["CHIP-seq"], dict) is True # A common term likely to be found.

    #assert res["terms"]["CHIP-seq"]["field"] == "award.project" # Child-field

    # We only have 4DN as single award.project in test inserts so should have values in all buckets, though probably less than total.
    #assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] > 0
    #assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] < count_exp_set_test_inserts

    #assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] > 0
    #assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] < count_exp_set_test_inserts
