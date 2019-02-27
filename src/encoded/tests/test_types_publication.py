import pytest
from encoded.types.publication import find_best_date
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def publication_PMID(testapp, lab, award):
    item = {
        'uuid': '8312fc0c-b241-4cb2-9b01-143891055000',
        'award': award['@id'],
        'lab': lab['@id'],
        'ID': "PMID:26673895",
    }
    return testapp.post_json('/publication', item).json['@graph'][0]


@pytest.fixture
def publication_doi_pubmed(testapp, lab, award):
    item = {
        'uuid': '8312fc0c-b241-4cb2-9b01-143891055001',
        'award': award['@id'],
        'lab': lab['@id'],
        'ID': "doi:10.1093/nar/gkv1046",
    }
    return testapp.post_json('/publication', item).json['@graph'][0]


@pytest.fixture
def publication_doi_biorxiv(testapp, lab, award):
    item = {
        'uuid': '8312fc0c-b241-4cb2-9b01-143891055002',
        'award': award['@id'],
        'lab': lab['@id'],
        'ID': "doi:10.1101/000091"
    }
    return testapp.post_json('/publication', item).json['@graph'][0]


# data from test/datafixtures
def test_update_publication_PMID(testapp, publication_PMID):
    assert publication_PMID['title'][:50] == 'A deep proteomics perspective on CRM1-mediated nuc'
    assert publication_PMID['abstract'][:50] == 'CRM1 is a highly conserved, RanGTPase-driven expor'
    assert publication_PMID['authors'][:4] == ['Kirli K', 'Karaca S', 'Dehne HJ', 'Samwer M']
    assert publication_PMID['url'] == 'https://www.ncbi.nlm.nih.gov/pubmed/26673895'
    assert publication_PMID['date_published'] == '2015-12-17'
    assert publication_PMID['journal'] == 'eLife'


def test_update_publication_doi_pubmed(testapp, publication_doi_pubmed):
    assert publication_doi_pubmed['title'][:50] == 'FlyBase: establishing a Gene Group resource for Dr'
    assert publication_doi_pubmed['abstract'][:50] == 'Many publications describe sets of genes or gene p'
    assert publication_doi_pubmed['authors'][:4] == ['Attrill H', 'Falls K', 'Goodman JL', 'Millburn GH']
    assert publication_doi_pubmed['url'] == 'https://www.ncbi.nlm.nih.gov/pubmed/26467478'
    assert publication_doi_pubmed['date_published'] == '2016-01-04'
    assert publication_doi_pubmed['journal'] == 'Nucleic acids research'


def test_update_publication_doi_biorxiv(testapp, publication_doi_biorxiv):
    assert publication_doi_biorxiv['title'][:50] == 'Designing Robustness to Temperature in a Feedforwa'
    assert publication_doi_biorxiv['abstract'][:50] == 'Incoherent feedforward loops represent important b'
    assert publication_doi_biorxiv['authors'] == ['Shaunak Sen', 'Jongmin Kim', 'Richard M. Murray']
    assert publication_doi_biorxiv['url'] == 'https://www.biorxiv.org/content/10.1101/000091v1'
    assert publication_doi_biorxiv['date_published'] == '2013-11-07'
    assert publication_doi_biorxiv['journal'] == 'bioRxiv'


def test_update_publication_date_published(testapp, publication_PMID):
    assert publication_PMID['date_published'] == '2015-12-17'
    # make sure we can overwrite date_published
    res = testapp.patch_json(publication_PMID['@id'], {'date_published': '01-01-1990'})
    assert res.json['@graph'][0]['date_published'] == '01-01-1990'
    # now make sure it reverts when we delete it
    res2 = testapp.patch_json(publication_PMID['@id'] + '?delete_fields=date_published', {})
    assert res2.json['@graph'][0]['date_published'] == '2015-12-17'


def test_find_best_date_full_dp():
    date_info = {'DP': '2018 Jan 7', 'DEP': '20170122', 'DA': '20170111'}
    date = find_best_date(date_info)
    assert date == '2018-01-07'


def test_find_best_date_dp_missing_day():
    date_info = {'DP': '2018 Nov', 'DEP': '20170122', 'DA': '20170111'}
    date = find_best_date(date_info)
    assert date == '2018-11'


def test_find_best_date_dp_missing_mnth_day():
    date_info = {'DP': '2018', 'DEP': '20170122', 'DA': '20170111'}
    date = find_best_date(date_info)
    assert date == '2018'


def test_find_best_date_dp_misformat_yr():
    date_info = {'DP': '201', 'DEP': '20170122', 'DA': '20170111'}
    date = find_best_date(date_info)
    assert date == '2017-01-22'


def test_find_best_date_dp_unknown_month():
    date_info = {'DP': '2018 22', 'DEP': '20170122', 'DA': '20170111'}
    date = find_best_date(date_info)
    assert date == '2018'


def test_find_best_date_dp_misformated_day():
    date_info = {'DP': '2018 Jan 222', 'DEP': '20170122', 'DA': '20170111'}
    date = find_best_date(date_info)
    assert date == '2018-01'


def test_find_best_date_no_dp():
    date_info = {'DEP': '20170122', 'DA': '20170111'}
    date = find_best_date(date_info)
    assert date == '2017-01-22'


def test_find_best_date_misformatted_dp_w_da():
    date_info = {'DEP': '2017012', 'DA': '20170111'}
    date = find_best_date(date_info)
    assert date == '2017-01-11'


def test_find_best_date_misformatted_dp_only():
    date_info = {'DEP': '2017012'}
    date = find_best_date(date_info)
    assert date is None


def test_find_best_date_da_only():
    date_info = {'DA': '20161104'}
    date = find_best_date(date_info)
    assert date == '2016-11-04'


def test_publication_diplay_title(testapp, publication_PMID):
    print(publication_PMID)
    assert publication_PMID['display_title'].startswith('Kirli K et al. (2015) A deep proteomics')


def test_publication_unique_ID(testapp, publication_doi_pubmed, publication_doi_biorxiv):
    # POST again with same ID and expect a ValidationError
    new_pub = {fld: publication_doi_pubmed[fld] for fld in ['ID', 'lab', 'award']}
    res = testapp.post_json('/publication', new_pub, status=422)
    expected_val_err = "%s already exists with ID '%s'" % (publication_doi_pubmed['uuid'], new_pub['ID'])
    assert expected_val_err in res.json['errors'][0]['description']

    # also test PATCH of an existing publication with another pub's ID
    res = testapp.patch_json(publication_doi_biorxiv['@id'], {'ID': new_pub['ID']}, status=422)
    assert expected_val_err in res.json['errors'][0]['description']
