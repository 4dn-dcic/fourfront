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
    res = testapp.get('/search/?type=Item&q=mauxz', status=[200, 404]).json
    # make this test robust by either assuming no results are found
    # (true when this test was written)
    # OR that results that happen to contain "mauze" do not include what
    # we're looking for.
    mauxz_uuids = [item['uuid'] for item in res['@graph'] if 'uuid' in item]
    # make sure all uuids found in the first search are present in the second
    assert not set(mouse_uuids).issubset(set(mauxz_uuids))


def test_search_embedded_file_by_accession(workbook, testapp):
    res = testapp.get('/search/?type=WorkflowRunSbg&output_files.value.accession=4DNFSYWQ59JI').json
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
    from datetime import datetime
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
        'daybefore': ':'.join(str(createdate.replace(day=(createdate.day - 1))).replace(' ', '+').split(':')[:-1]),
        'dayafter': ':'.join(str(createdate.replace(day=(createdate.day + 1))).replace(' ', '+').split(':')[:-1]),
        'hourbefore': ':'.join(str(createdate.replace(hour=(createdate.hour - 1))).replace(' ', '+').split(':')[:-1]),
        'hourafter': ':'.join(str(createdate.replace(hour=(createdate.hour + 1))).replace(' ', '+').split(':')[:-1])
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


def test_search_query_string_plus_minus_cancel_out(workbook, testapp):
    # if you use + and - with same field you should get no result
    search = '/search/?type=Biosource&q=+cell+-cell'
    assert testapp.get(search, status=404)


def test_search_query_string_cell_without_stem(workbook, testapp):
    # ensure that + and - leading characters work correctly
    positives = [
        '331111bc-8535-4448-903e-854af460b666',
        '331111bc-8535-4448-903e-854af460b254',
        '331111bc-8535-2248-903e-854af460b254',
        '331111bc-8535-4448-903e-854af460a254'
    ]
    negatives = [
        '331111bc-8535-4448-903e-854af460bab5',
        '331111bc-8535-4448-903e-854af460b89f',
        '331111bc-8535-4448-903e-854ab460b254'
    ]
    search = '/search/?type=Biosource&q=+cell+-stem'
    res = testapp.get(search).json
    assert len(res['@graph']) > 0  # mutiple wfr can be returned
    ruuids = [r['uuid'] for r in res['@graph'] if 'uuid' in r]
    assert set(positives).issubset(set(ruuids))
    for n in negatives:
        assert n not in ruuids


def test_search_query_string_cell_and_stem(workbook, testapp):
    # ensure that + and - leading characters work correctly
    negatives = [
        '331111bc-8535-4448-903e-854af460b666',
        '331111bc-8535-4448-903e-854af460b254',
        '331111bc-8535-2248-903e-854af460b254',
        '331111bc-8535-4448-903e-854af460a254'
    ]
    positives = [
        '331111bc-8535-4448-903e-854af460bab5',
        '331111bc-8535-4448-903e-854af460b89f',
        '331111bc-8535-4448-903e-854ab460b254'
    ]
    search = '/search/?type=Biosource&q=cell+AND+stem'
    res = testapp.get(search).json
    assert len(res['@graph']) > 0  # mutiple wfr can be returned
    ruuids = [r['uuid'] for r in res['@graph'] if 'uuid' in r]
    assert set(positives).issubset(set(ruuids))
    for n in negatives:
        assert n not in ruuids

def test_metadata_tsv_view(workbook, htmltestapp):
    # run a simple query with type=ExperimentSet
    res = htmltestapp.get('/metadata/type=ExperimentSet/metadata.tsv')
    assert 'text/tsv' in res.content_type
    result_rows = [ row.rstrip(' \r').split('\t') for row in res.body.decode('utf-8').split('\n') ] # Strip out carriage returns and whatnot. Make a plain multi-dim array.
    header_row = result_rows.pop(0)

    assert header_row[0] == 'File Accession'

    col_index_of_download_url = header_row.index('File Download URL')

    assert col_index_of_download_url > 0 # Ensure we have this column

    assert len(result_rows) > 3 # We at least have some rows.

    assert len(result_rows[0][0]) > 4 # We have a value for File Accession
    assert 'http' in result_rows[0][col_index_of_download_url] # Make sure it seems like a valid URL.
    assert '/@@download/' in result_rows[0][col_index_of_download_url]
    assert result_rows[0][0] in result_rows[0][col_index_of_download_url] # That File Accession is also in File Download URL of same row.
    assert len(result_rows[0][0]) < len(result_rows[0][col_index_of_download_url])

    # TODO: More testing, maybe get some File Accession ordering in (?), form POST query, (maybe) URL uuid query, (maybe) JSON POST query
