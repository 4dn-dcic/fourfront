import pytest
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
    assert publication_PMID['journal'] == 'eLife'


def test_update_publication_doi_pubmed(testapp, publication_doi_pubmed):
    assert publication_doi_pubmed['title'][:50] == 'FlyBase: establishing a Gene Group resource for Dr'
    assert publication_doi_pubmed['abstract'][:50] == 'Many publications describe sets of genes or gene p'
    assert publication_doi_pubmed['authors'][:4] == ['Attrill H', 'Falls K', 'Goodman JL', 'Millburn GH']
    assert publication_doi_pubmed['url'] == 'https://www.ncbi.nlm.nih.gov/pubmed/26467478'
    assert publication_doi_pubmed['journal'] == 'Nucleic acids research'


def test_update_publication_doi_biorxiv(testapp, publication_doi_biorxiv):
    assert publication_doi_biorxiv['title'][:50] == 'Designing Robustness to Temperature in a Feedforwa'
    assert publication_doi_biorxiv['abstract'][:50] == 'Incoherent feedforward loops represent important b'
    assert publication_doi_biorxiv['authors'] == ['Shaunak Sen', 'Jongmin Kim', 'Richard M. Murray']
    assert publication_doi_biorxiv['url'] == 'https://www.biorxiv.org/content/early/2013/11/07/000091'
    assert publication_doi_biorxiv['journal'] == 'bioRxiv'


def test_publication_diplay_title(testapp, publication_PMID):
    print(publication_PMID)
    assert publication_PMID['display_title'].startswith('Kirli K et al. (2015) A deep proteomics')
