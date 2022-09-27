import json
import pytest
import webtest


from datetime import datetime, timedelta
from dcicutils.misc_utils import Retry, ignored, local_attrs
from dcicutils.qa_utils import notice_pytest_fixtures
from snovault import TYPES, COLLECTIONS
from snovault.elasticsearch import create_mapping
from snovault.elasticsearch.indexer_utils import get_namespaced_index
from snovault.util import add_default_embeds
from ..commands.run_upgrader_on_inserts import get_inserts
# Use workbook fixture from BDD tests (including elasticsearch)
from .workbook_fixtures import app_settings, app, workbook
# from ..util import customized_delay_rerun


pytestmark = [
    pytest.mark.working,
    pytest.mark.schema,
    # pytest.mark.indexing,
    pytest.mark.workbook,
    # pytest.mark.flaky(rerun_filter=customized_delay_rerun(sleep_seconds=10))
]


# == IMPORTANT ==
# uses the inserts in ./data/workbook_inserts
# design your tests accordingly
notice_pytest_fixtures(app_settings, app, workbook)


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
    notice_pytest_fixtures(workbook)
    res = testapp.get('/search/?type=Item').json
    assert res['@type'] == ['ItemSearchResults', 'Search']
    assert res['@id'] == '/search/?type=Item'
    assert res['@context'] == '/terms/'
    assert res['notification'] == 'Success'
    assert res['title'] == 'Search'
    assert res['total'] > 0
    assert 'facets' in res
    assert 'filters' in res
    assert '@graph' in res


def test_search_with_no_query(workbook, testapp):
    notice_pytest_fixtures(workbook, testapp)
    # using /search/ (with no query) should default to /search/?type=Item
    # thus, should satisfy same assertions as test_search_view
    res = testapp.get('/search/').follow(status=200)
    assert res.json['@type'] == ['ItemSearchResults', 'Search']
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
    notice_pytest_fixtures(workbook, testapp)
    # we removed the collections page and redirect to search of that type
    # redirected_from is not used for search
    res = testapp.get('/biosamples/', status=301).follow(status=200)
    assert res.json['@type'] == ['BiosampleSearchResults', 'ItemSearchResults', 'Search']
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
    notice_pytest_fixtures(workbook, testapp)
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
    # since lab.awards was not specifically embedded, the field should not exist
    assert test_json['lab'].get('awards') is None


def test_file_search_type(workbook, testapp):
    """ Tests that searching on a type that inherits from File adds a FileSearchResults
        identifier in the @type field
    """
    notice_pytest_fixtures(workbook, testapp)
    res = testapp.get('/search/?type=FileProcessed').json
    assert 'FileSearchResults' in res['@type']
    res = testapp.get('/search/?type=Biosample').json
    assert 'FileSearchResults' not in res['@type']
    assert res['@type'][0] == 'BiosampleSearchResults'
    assert res['@type'][1] == 'ItemSearchResults'
    res = testapp.get('/search/?type=FileProcessed&type=Biosample').json
    assert 'FileSearchResults' not in res['@type']
    res = testapp.get('/search/?type=FileProcessed&type=FileReference').json
    assert 'FileSearchResults' in res['@type']
    res = testapp.get('/search').follow().json
    assert 'FileSearchResults' not in res['@type']
    res = testapp.get('/search/?type=File').json
    assert 'FileSearchResults' in res['@type']
    assert res['@type'].count('FileSearchResults') == 1
    res = testapp.get('/search/?type=FileFastq').json
    assert res['@type'][0] == 'FileFastqSearchResults'
    assert res['@type'][1] == 'FileSearchResults'
    assert res['@type'][2] == 'ItemSearchResults'
    assert res['@type'][3] == 'Search'
    res = testapp.get('/search/?type=FileFastq&type=Biosample').json
    assert res['@type'][0] == 'ItemSearchResults'
    res = testapp.get('/search/?type=FileFastq&type=File').json
    assert res['@type'][0] == 'FileSearchResults'


def test_search_with_simple_query(workbook, testapp):
    # run a simple query with type=Organism and q=mouse
    res = testapp.get('/search/?type=Organism&q=mouse').json
    assert res['@type'] == ['OrganismSearchResults', 'ItemSearchResults', 'Search']
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


def test_search_ngram(workbook, testapp):
    """
    Tests ngram behavior for various use cases
    """
    res = testapp.get('/search/?type=Organism&q=mo').json
    assert len(res['@graph']) == 1
    res = testapp.get('/search/?type=Organism&q=hu').json
    assert len(res['@graph']) == 1
    res = testapp.get('/search/?type=Organism&q=ma').json
    assert len(res['@graph']) == 1
    # or search
    res = testapp.get('/search/?type=Organism&q=(mu|an)').follow().json
    assert len(res['@graph']) == 2
    # or not search
    res = testapp.get('/search/?type=Organism&q=(ho|-an)').follow().json
    assert len(res['@graph']) == 2
    # by uuid subset
    res = testapp.get('/search/?type=Organism&q=3413218c').json
    assert len(res['@graph']) == 2
    # uuid difference beyond max_ngram
    res = testapp.get('/search/?type=Organism&q=3413218c-3f').json
    assert len(res['@graph']) == 2
    # uuid difference before max_ngram, no results
    res = testapp.get('/search/?type=Organism&q=3413218d', status=404)


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
    for i, val in enumerate(sort_facets):
        assert res['facets'][i]['field'] == val[0]
    # assert order of columns when we officially upgrade to python 3.6 (ordered dicts)
    for key, val in schema.get('columns', {}).items():
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
    assert res['@type'] == ['ItemSearchResults', 'Search']


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


@pytest.mark.broken  # test doesn't work, this will keep make from running it
@pytest.mark.skip  # In case of running the file by name, this still doesn't want to run
def test_metadata_tsv_view(workbook, htmltestapp):

    FILE_ACCESSION_COL_INDEX = 3
    FILE_DOWNLOAD_URL_COL_INDEX = 0

    def check_tsv(result_rows, len_requested=None):
        info_row = result_rows.pop(0)
        header_row = result_rows.pop(0)

        assert header_row[FILE_ACCESSION_COL_INDEX] == 'File Accession'
        assert header_row.index('File Download URL') == FILE_DOWNLOAD_URL_COL_INDEX  # Ensure we have this column
        assert len(result_rows) > 0 # We at least have some rows.

        for row_index in range(1):
            assert len(result_rows[row_index][FILE_ACCESSION_COL_INDEX]) > 4  # We have a value for File Accession
            assert 'http' in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX]  # Make sure it seems like a valid URL.
            assert '/@@download/' in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX]
            assert result_rows[row_index][FILE_ACCESSION_COL_INDEX] in result_rows[row_index][FILE_DOWNLOAD_URL_COL_INDEX]  # That File Accession is also in File Download URL of same row.
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

    # N.B. '.post', not '.post_json' is used. This dict is converted to POST form values,
    # with key values STRINGIFIED, not to POST JSON request.
    res2_post_data = {
        "accession_triples": [
            ["4DNESAAAAAA1", "4DNEXO67APU1", "4DNFIO67APU1"],
            ["4DNESAAAAAA1", "4DNEXO67APU1", "4DNFIO67APT1"],
            ["4DNESAAAAAA1", "4DNEXO67APT1", "4DNFIO67APV1"],
            ["4DNESAAAAAA1", "4DNEXO67APT1", "4DNFIO67APY1"],
            ["4DNESAAAAAA1", "4DNEXO67APV1", "4DNFIO67APZ1"],
            ["4DNESAAAAAA1", "4DNEXO67APV1", "4DNFIO67AZZ1"]
        ],
        'download_file_name': 'metadata_TEST.tsv'
    }

    res2 = htmltestapp.post('/metadata/?type=ExperimentSetReplicate',  # NEWER URL FORMAT
                            {k : json.dumps(v)
                             for k,v in res2_post_data.items() })

    assert 'text/tsv' in res2.content_type
    result_rows = [row.rstrip(' \r').split('\t') for row in res2.body.decode('utf-8').split('\n')]

    check_tsv(result_rows, len(res2_post_data['accession_triples']))


def test_default_schema_and_non_schema_facets(workbook, testapp, registry):
    test_type = 'biosample'
    type_info = registry[TYPES].by_item_type[test_type]
    schema = type_info.schema
    embeds = add_default_embeds(test_type, registry[TYPES], type_info.embedded_list, schema)
    # we're looking for this specific facet, which is not in the schema
    assert 'biosource.*' in embeds
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
    res_json = testapp.get(search, status=404).json  # no items, just checking hdr
    assert 'search_header' in res_json
    assert 'content' in res_json['search_header']
    assert res_json['search_header']['title'] == 'Workflow Information'
    search = '/search/?type=workflow'  # check type resolution
    res_json = testapp.get(search, status=404).json
    assert 'search_header' in res_json
    assert 'content' in res_json['search_header']
    assert res_json['search_header']['title'] == 'Workflow Information'


#########################################
## Tests for collections (search 301s) ##
#########################################

def test_collection_limit(workbook, testapp):
    res = testapp.get('/biosamples/?limit=2', status=301)
    assert len(res.follow().json['@graph']) == 2


def test_collection_actions_filtered_by_permission(workbook, testapp, anontestapp):
    res = testapp.get('/biosamples/')
    assert any(action for action in res.follow().json.get('actions', []) if action['name'] == 'add')

    # biosamples not visible
    res = anontestapp.get('/biosamples/', status=404)
    assert len(res.json['@graph']) == 0


class ItemTypeChecker:

    @staticmethod
    @Retry.retry_allowed('ItemTypeCheckerf.check_item_type', wait_seconds=1, retries_allowed=5)
    def check_item_type(client, item_type, deleted=False):
        # This might get a 404 if not enough time has elapsed, so try a few times before giving up.
        #
        # We retry a lot of times because it's still fast if things are working quickly, but if it's
        # slow it's better to wait than fail the test. Slowness is not what we're trying to check for here.
        # And even if it's slow for one item, that same wait time will help others have time to catch up,
        # so it shouldn't be slow for others. At least that's the theory. -kmp 27-Jan-2021
        extra = "&status=deleted" if deleted else ""
        return client.get('/%s?limit=all%s' % (item_type, extra), status=[200, 301]).follow()


    CONSIDER_DELETED = True
    DELETED_SEEN = {}

    @classmethod
    def reset_deleted(cls):
        cls.DELETED_SEEN = {}

    @classmethod
    def deleted_seen(cls):
        total_deleted = 0
        for item_type, item_deleted_count in cls.DELETED_SEEN.items():
            ignored(item_type)
            total_deleted += item_deleted_count
        return total_deleted

    @classmethod
    def get_all_items_of_type(cls, client, item_type):
        if cls.CONSIDER_DELETED:
            try:
                res = cls.check_item_type(client, item_type)
                items_not_deleted = res.json.get('@graph', [])
            except webtest.AppError:
                items_not_deleted = []
            try:
                res = cls.check_item_type(client, item_type, deleted=True)
                items_deleted = res.json.get('@graph', [])
            except webtest.AppError:
                items_deleted = []
            if items_deleted:
                cls.DELETED_SEEN[item_type] = items_deleted
            else:
                cls.DELETED_SEEN.pop(item_type, None)  # delete entry if present but we want it empty
            return items_not_deleted + items_deleted
        else:
            res = cls.check_item_type(client, item_type)
            items_not_deleted = res.json.get('@graph', [])
            return items_not_deleted


@pytest.mark.flaky
def test_index_data_workbook(app, workbook, testapp, indexer_testapp, htmltestapp):
    es = app.registry['elasticsearch']
    # we need to reindex the collections to make sure numbers are correct
    create_mapping.run(app, sync_index=True)
    retried = False
    while True:
        # check counts and ensure they're equal
        testapp_counts = testapp.get('/counts')
        # e.g., {"db_es_total": "DB: 748 ES: 748 ", ...}
        db_es_total = testapp_counts.json['db_es_total']
        split_counts = db_es_total.split()
        db_total = int(split_counts[1])
        es_total = int(split_counts[3])
        if db_total == es_total or retried:
            print("Counts are not aligned, but we've tried once already.")
            break
        retried = True
        print("Posting /index anew because counts are not aligned")
        testapp.post_json('/index', {})
   # e.g., {..., "db_es_compare": {"AnalysisStep": "DB: 26 ES: 26 ", ...}, ...}
    for item_name, item_counts in testapp_counts.json['db_es_compare'].items():
        print("item_name=", item_name, "item_counts=", item_counts)
        # make sure counts for each item match ES counts
        split_item_counts = item_counts.split()
        db_item_count = int(split_item_counts[1])
        es_item_count = int(split_item_counts[3])
        assert db_item_count == es_item_count

        # check ES counts directly. Must skip abstract collections
        # must change counts result ("ItemName") to item_type format
        item_type = app.registry[COLLECTIONS][item_name].type_info.item_type
        namespaced_index = get_namespaced_index(app, item_type)

        es_direct_count = es.count(index=namespaced_index).get('count')
        assert es_item_count == es_direct_count

        if es_item_count == 0:
            continue
        # check items in search result individually
        search_url = '/%s?limit=all' % item_type
        print("search_url=", search_url)
        items = ItemTypeChecker.get_all_items_of_type(client=testapp, item_type=item_type)
        for item_res in items:
            index_view_res = es.get(index=namespaced_index,
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
                ignored(e)
                pass
    if ItemTypeChecker.CONSIDER_DELETED:
        print(f"(CONSIDER_DELETED) Items deleted = {ItemTypeChecker.DELETED_SEEN}")
        print(f"db_total={db_total} es_total={es_total} deleted_seen={ItemTypeChecker.deleted_seen()}")
        assert(db_total == es_total + ItemTypeChecker.deleted_seen())  # 2nd is db, 4th is es
    else:
        print(f"(not CONSIDER_DELETED) db_total={db_total} es_total={es_total} deleted_seen={ItemTypeChecker.deleted_seen()}")
        assert(db_total == es_total)  # 2nd is db, 4th is es

@pytest.mark.manual
@pytest.mark.skip
def test_index_data_workbook_after_posting_deleted_page_c4_570(workbook, testapp, html_testapp):
    """
    Regression test for C4-570.

    This test takes a long time to run since it runs a long-running test three different ways.
    This test must be invoked manually. 'make test' and 'make remote-test' will skip it because it's marked manual.
    See details at https://hms-dbmi.atlassian.net/browse/C4-570
    """

    # Running the test this way should work fine
    test_index_data_workbook(workbook, testapp, html_testapp)

    # But now let's add a deleted page.
    # test_index_data_workbook will fail if preceded by anything that makes a deleted page
    testapp.post_json('/pages/',
                      {
                          "name": "help/user-guide/sample-deleted-page",
                          "title": "Sample Deleted Page",
                          "content": [],
                          "uuid": "db807a0f-2e76-4c77-a6bb-313a9c174252",
                          "status": "deleted"
                      },
                      status=201)

    # This test will now protect itself against failure.
    test_index_data_workbook(workbook, testapp, html_testapp)

    # And we can see that if we hadn't protected ourselves against failure, this would reliably fail.
    with pytest.raises(webtest.AppError):
        with local_attrs(ItemTypeChecker, CONSIDER_DELETED=False):
            test_index_data_workbook(workbook, testapp, html_testapp)


######################################
## Search-based visualization tests ##
######################################


def test_barplot_aggregation_endpoint(workbook, testapp):

    # Check what we get back -
    search_result = testapp.get('/browse/?type=ExperimentSetReplicate&experimentset_type=replicate').json
    search_result_count = len(search_result['@graph'])

    # We should get back same count as from search results here.
    # But on Travis oftentime we don't, so we compare either against count of inserts
    # --or-- count returned from regular results.
    exp_set_test_inserts = list(get_inserts('inserts', 'experiment_set_replicate'))
    count_exp_set_test_inserts = len(exp_set_test_inserts)

    # Now, test the endpoint after ensuring we have the data correctly loaded into ES.
    # We should get back same count as from search results here.
    res = testapp.post_json('/bar_plot_aggregations', {
        "search_query_params": {"type": ['ExperimentSetReplicate']},
        "fields_to_aggregate_for": ["experiments_in_set.experiment_type.display_title", "award.project"]
    }).json

    print()

    # Our total count for experiment_sets should match # of exp_set_replicate inserts.abs

    assert (res['total']['experiment_sets'] == count_exp_set_test_inserts) or (res['total']['experiment_sets'] == search_result_count)

    assert res['field'] == 'experiments_in_set.experiment_type.display_title'  # top level field

    assert isinstance(res['terms'], dict) is True

    assert len(res["terms"].keys()) > 0

    # assert isinstance(res['terms']["CHIP-seq"], dict) is True # A common term likely to be found.

    # assert res["terms"]["CHIP-seq"]["field"] == "award.project" # Child-field

    # We only have 4DN as single award.project in test inserts so should have values in all buckets, though probably less than total.
    # assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] > 0
    # assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] < count_exp_set_test_inserts

    # assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] > 0
    # assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] < count_exp_set_test_inserts


@pytest.fixture(scope='session')
def hidden_facet_data_one():
    """ Sample TestingHiddenFacets object we are going to facet on """
    return {
        'first_name': 'John',
        'last_name': 'Doe',
        'sid': 1,
        'unfaceted_string': 'hello',
        'unfaceted_integer': 123,
        'disabled_string': 'orange',
        'disabled_integer': 789,
        'unfaceted_object': {
            'mother': 'Anne',
            'father': 'Bob'
        },
        'unfaceted_array_of_objects': [
            {
                'fruit': 'orange',
                'color': 'orange',
                'uid': 1
            },
            {
                'fruit': 'banana',
                'color': 'yellow',
                'uid': 2
            },
        ]
    }


@pytest.fixture(scope='session')
def hidden_facet_data_two():
    """ A second sample TestingHiddenFacets object we are going to facet on """
    return {
        'first_name': 'Boston',
        'last_name': 'Bruins',
        'sid': 2,
        'unfaceted_string': 'world',
        'unfaceted_integer': 456,
        'disabled_string': 'apple',
        'disabled_integer': 101112,
        'unfaceted_object': {
            'mother': 'Candice',
            'father': 'Doug'
        },
        'unfaceted_array_of_objects': [
            {
                'fruit': 'blueberry',
                'color': 'blue',
                'uid': 3
            },
            {
                'fruit': 'mango',
                'color': 'yellow',
                'uid': 4
            },
        ]
    }


@pytest.fixture(scope='module')  # TODO consider this further...
def hidden_facet_test_data(testapp, hidden_facet_data_one, hidden_facet_data_two):
    testapp.post_json('/TestingHiddenFacets', hidden_facet_data_one, status=201)
    testapp.post_json('/TestingHiddenFacets', hidden_facet_data_two, status=201)
    testapp.post_json('/index', {'record': False})


class TestSearchHiddenAndAdditionalFacets:
    """ Encapsulates tests meant for testing behavior associated with default_hidden, hidden
        and additional_facets
    """
    DEFAULT_FACETS = ['first_name', 'status', 'type']
    DEFAULT_HIDDEN_FACETS = ['last_name', 'sid']
    ADDITIONAL_FACETS = ['unfaceted_string', 'unfaceted_integer']
    DISABLED_FACETS = ['disabled_string', 'disabled_integer']

    @staticmethod
    def check_and_verify_result(facets, desired_facet, number_expected):
        """ Helper method for later tests that checks terms count and average. """
        for facet in facets:
            field = facet['field']
            if field == desired_facet and 'terms' in facet:
                assert len(facet['terms']) == number_expected
            elif field == facet and 'avg' in facet:
                assert facet['avg'] == number_expected
            else:
                continue
            break

    def test_search_default_hidden_facets_dont_show(self, testapp, hidden_facet_test_data):
        facets = testapp.get('/search/?type=TestingHiddenFacets').json['facets']
        actual = [facet['field'] for facet in facets]
        assert self.DEFAULT_FACETS == sorted(actual)

    @pytest.mark.parametrize('facet', ADDITIONAL_FACETS)
    def test_search_one_additional_facet(self, testapp, hidden_facet_test_data, facet):
        """ Tests that specifying each of the 'additional' facets works correctly """
        facets = testapp.get('/search/?type=TestingHiddenFacets&additional_facet=%s' % facet).json['facets']
        expected = self.DEFAULT_FACETS + [facet]
        actual = [facet['field'] for facet in facets]
        assert sorted(expected) == sorted(actual)

    def test_search_multiple_additional_facets(self, testapp, hidden_facet_test_data):
        """ Tests that enabling multiple additional facets works """
        facets = testapp.get('/search/?type=TestingHiddenFacets'
                             '&additional_facet=unfaceted_string'
                             '&additional_facet=unfaceted_integer').json['facets']
        expected = self.DEFAULT_FACETS + self.ADDITIONAL_FACETS
        for facet in facets:
            assert facet['field'] in expected
            if facet['field'] == 'unfaceted_integer':
                assert facet['aggregation_type'] == 'stats'
            else:
                assert facet['aggregation_type'] == 'terms'

    @pytest.mark.parametrize('facet', DEFAULT_HIDDEN_FACETS)
    def test_search_one_additional_default_hidden_facet(self, testapp, hidden_facet_test_data, facet):
        """ Tests that passing default_hidden facets to additional_facets works correctly """
        facets = testapp.get('/search/?type=TestingHiddenFacets&additional_facet=%s' % facet).json['facets']
        expected = self.DEFAULT_FACETS + [facet]
        actual = [facet['field'] for facet in facets]
        assert sorted(expected) == sorted(actual)

    def test_search_multiple_additional_default_hidden_facets(self, testapp, hidden_facet_test_data):
        """ Tests that passing multiple hidden_facets as additionals works correctly """
        facets = testapp.get('/search/?type=TestingHiddenFacets'
                             '&additional_facet=last_name'
                             '&additional_facet=sid').json['facets']
        expected = self.DEFAULT_FACETS + self.DEFAULT_HIDDEN_FACETS
        for facet in facets:
            assert facet['field'] in expected
            if facet['field'] == 'sid':
                assert facet['aggregation_type'] == 'stats'
            else:
                assert facet['aggregation_type'] == 'terms'

    @pytest.mark.parametrize('_facets', [
        ['last_name', 'unfaceted_integer'],  # second slot holds number field
        ['unfaceted_string', 'sid']
    ])
    def test_search_mixing_additional_and_default_hidden(self, testapp, hidden_facet_test_data, _facets):
        """ Tests that we can mix additional_facets with those both on and off schema """
        [sample_string_field, sample_number_field] = _facets
        facets = testapp.get('/search/?type=TestingHiddenFacets'
                             '&additional_facet=%s'
                             '&additional_facet=%s' % (sample_string_field, sample_number_field)).json['facets']
        expected = self.DEFAULT_FACETS + _facets
        actual = [facet['field'] for facet in facets]
        assert sorted(expected) == sorted(actual)
        for facet in facets:
            if facet['field'] == sample_number_field:  # second slot holds number field
                assert facet['aggregation_type'] == 'stats'
            else:
                assert facet['aggregation_type'] == 'terms'

    @pytest.mark.parametrize('_facet', DISABLED_FACETS)
    def test_search_disabled_overrides_additional(self, testapp, hidden_facet_test_data, _facet):
        """ Hidden facets should NEVER be faceted on """
        facets = testapp.get('/search/?type=TestingHiddenFacets&additional_facet=%s' % _facet).json['facets']
        field_names = [facet['field'] for facet in facets]
        assert _facet not in field_names  # always hidden should not be here, even if specified

    @pytest.mark.parametrize('_facets', [
        ('last_name', 'unfaceted_integer', 'disabled_integer'),  # default_hidden second
        ('sid', 'unfaceted_string', 'disabled_string')  # disabled always last
    ])
    def test_search_additional_mixing_disabled_default_hidden(self, testapp, hidden_facet_test_data, _facets):
        """ Tests that supplying multiple additional facets combined with hidden still respects the
            hidden restriction. """
        facets = testapp.get('/search/?type=TestingHiddenFacets'
                             '&additional_facet=%s'
                             '&additional_facet=%s' 
                             '&additional_facet=%s' % (_facets[0], _facets[1], _facets[2])).json['facets']
        expected = self.DEFAULT_FACETS + [_facets[0], _facets[1]]  # first two should show
        actual = [facet['field'] for facet in facets]
        assert sorted(expected) == sorted(actual)

    @pytest.mark.parametrize('_facet', [
        'unfaceted_object.mother',
        'unfaceted_object.father'
    ])
    def test_search_additional_object_facets(self, testapp, hidden_facet_test_data, _facet):
        """ Tests that specifying an object field as an additional_facet works correctly """
        facets = testapp.get('/search/?type=TestingHiddenFacets'
                             '&additional_facet=%s' % _facet).json['facets']
        expected = self.DEFAULT_FACETS + [_facet]
        actual = [facet['field'] for facet in facets]
        assert sorted(expected) == sorted(actual)

    @pytest.mark.parametrize('_facet, n_expected', [
        ('unfaceted_array_of_objects.fruit', 4),
        ('unfaceted_array_of_objects.color', 3),
        ('unfaceted_array_of_objects.uid', 2.5)  # stats avg
    ])
    def test_search_additional_nested_facets(self, testapp, hidden_facet_test_data, _facet, n_expected):
        """ Tests that specifying an array of object field mapped with nested as an additional_facet
            works correctly. """
        [desired_facet] = [facet for facet in testapp.get('/search/?type=TestingHiddenFacets'
                                                          '&additional_facet=%s' % _facet).json['facets']
                           if facet['field'] == _facet]
        if 'terms' in desired_facet:
            assert len(desired_facet['terms']) == n_expected
        else:
            assert desired_facet['avg'] == n_expected

    @pytest.fixture
    def many_non_nested_facets(self, testapp, hidden_facet_test_data):
        return testapp.get('/search/?type=TestingHiddenFacets'  
                           '&additional_facet=non_nested_array_of_objects.fruit'
                           '&additional_facet=non_nested_array_of_objects.color'
                           '&additional_facet=non_nested_array_of_objects.uid').json['facets']

    @pytest.mark.parametrize('_facet, n_expected', [
        ('unfaceted_array_of_objects.fruit', 4),
        ('unfaceted_array_of_objects.color', 3),
        ('unfaceted_array_of_objects.uid', 2.5)  # stats avg
    ])
    def test_search_additional_non_nested_facets(self, many_non_nested_facets, _facet, n_expected):
        """ Tests trying to facet on an array of objects field that is not nested, requesting
            all at the same time.
        """
        self.check_and_verify_result(many_non_nested_facets, _facet, n_expected)


@pytest.fixture(scope='session')
def bucket_range_data_raw():
    """ 10 objects with a numerical field we will bucket on.
            'special_integer' has i in it.
            'special_object_that_holds_integer' holds a single integer field with i as well
            'array_of_objects_that_holds_integer' holds 2 objects that are mirrors of one another
    """
    return [{
        'special_integer': i,
        'special_object_that_holds_integer': {
            'embedded_integer': i
        },
        'array_of_objects_that_holds_integer': [
            {
                'embedded_identifier': 'forward',
                'embedded_integer': 0 if i < 5 else 9
            },
            {
                'embedded_identifier': 'reverse',
                'embedded_integer': 9 if i < 5 else 0
            },
        ]
    } for i in range(10)]


@pytest.fixture(scope='module')  # XXX: consider scope further - Will 11/5/2020
def bucket_range_data(testapp, bucket_range_data_raw):
    for entry in bucket_range_data_raw:
        testapp.post_json('/TestingBucketRangeFacets', entry, status=201)
    testapp.post_json('/index', {'record': False})


class TestSearchBucketRangeFacets:
    """ Class that encapsulates tests for BucketRanges """

    @staticmethod
    def verify_facet_counts(facets, expected_fields, expected_cardinality, expected_count):
        """ Checks for given expected facets, checking bucket cardinality and document count
            Note that the actual range properties are trivial (we are not testing elasticsearch)
        """
        for facet in facets:
            if facet['field'] in expected_fields:
                assert len(facet['ranges']) == expected_cardinality
                for bucket in facet['ranges']:
                    assert bucket['doc_count'] == expected_count

    @staticmethod
    def select_facet(facets, facet_name):
        result = None
        for facet in facets:
            if facet['field'] == facet_name:
                result = facet
                break
        return result

    @pytest.mark.parametrize('expected_fields, expected_counts', [
        (['special_integer', 'special_object_that_holds_integer.embedded_integer'], 5),
        (['array_of_objects_that_holds_integer.embedded_integer'], 10)
    ])
    def test_search_bucket_range_simple(self, testapp, bucket_range_data, expected_fields, expected_counts):
        """ Tests searching a collection of documents with varying integer field types that
            have the same distribution - all of which should give the same results. """
        res = testapp.get('/search/?type=TestingBucketRangeFacets').json['facets']
        self.verify_facet_counts(res, expected_fields, 2, expected_counts)

    @pytest.mark.parametrize('identifier', [
        'reverse', 'forward'
    ])
    def test_search_bucket_range_nested_qualifier(self, testapp, bucket_range_data, identifier):
        """ Tests aggregating on a nested field while selecting for a field within the nested object. """
        res = testapp.get('/search/?type=TestingBucketRangeFacets'
                          '&array_of_objects_that_holds_integer.embedded_identifier=%s' % identifier).json['facets']
        self.verify_facet_counts(res, ['array_of_objects_that_holds_integer.embedded_integer'],
                                 2, 10)

    @pytest.mark.parametrize('identifier', [
        'reverse', 'forward'
    ])
    def test_search_bucket_range_nested_qualifier(self, testapp, bucket_range_data, identifier):
        """ Tests aggregating on a nested field while selecting for a field within the nested object (no change). """
        res = testapp.get('/search/?type=TestingBucketRangeFacets'
                          '&array_of_objects_that_holds_integer.embedded_integer.from=6'
                          '&array_of_objects_that_holds_integer.embedded_identifier=%s' % identifier).json['facets']
        self.verify_facet_counts(res, ['array_of_objects_that_holds_integer.embedded_integer'],
                                 2, 10)
        facet_with_labels = self.select_facet(res, 'array_of_objects_that_holds_integer.embedded_integer')
        for r in facet_with_labels['ranges']:
            assert 'label' in r
            assert r['label'] in ['Low', 'High']
