import pytest
from snovault.schema_utils import load_schema
pytestmark = [pytest.mark.working, pytest.mark.schema]


# data from test/datafixtures
def test_update_publication_PMID(testapp, publication_PMID):
    try:
        assert publication_PMID['title'][:50] == 'A deep proteomics perspective on CRM1-mediated nuc'
    except KeyError:
        # pub med seems to go down at times... let's ignore this if it does
        return 
    assert publication_PMID['abstract'][:50] == 'CRM1 is a highly conserved, RanGTPase-driven expor'
    assert publication_PMID['authors'] == 'Kirli K, Karaca S, Dehne HJ, Samwer M, Pan KT, Lenz C, Urlaub H, Gorlich D'
    assert publication_PMID['url'] == 'https://www.ncbi.nlm.nih.gov/pubmed/26673895'


# def test_update_publication_doi_pubmed(testapp, publication_doi_pubmed):
#     assert publication_doi_pubmed['title'][:50] == 'FlyBase: establishing a Gene Group resource for Dr'
#     assert publication_doi_pubmed['abstract'][:50] == 'Many publications describe sets of genes or gene p'
#     assert publication_doi_pubmed['authors'] == 'Attrill H, Falls K, Goodman JL, Millburn GH, Antonazzo G, Rey AJ, Marygold SJ, FlyBase Consortium'
#     assert publication_doi_pubmed['url'] == 'https://www.ncbi.nlm.nih.gov/pubmed/26467478'


def test_update_publication_doi_biorxiv(testapp, publication_doi_biorxiv):
    assert publication_doi_biorxiv['title'][:50] == 'Designing Robustness to Temperature in a Feedforwa'
    assert publication_doi_biorxiv['abstract'][:50] == 'Incoherent feedforward loops represent important b'
    assert publication_doi_biorxiv['authors'] == 'Shaunak Sen, Jongmin Kim, Richard M. Murray'
    assert publication_doi_biorxiv['url'] == 'http://biorxiv.org/content/early/2013/11/07/000091'
