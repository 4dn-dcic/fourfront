import pytest

'''
FF-701
Multiple ontologies get imported to form each of the three ontologies that we are currently using
(and I can foresee us wanting to add additional ontology sources).  The same name can be used for
terms with different identifiers (we may not currently have such cases but I can check) so you might
have the term ‘lung’ from UBERON and ‘lung’ from EFO and in theory these 2 terms could be meaning
different things.  For the most part this shouldn’t be a problem but without pre-screening for name
uniqueness and somehow (likely through human inspection) figuring out which name should be used and
which changed during the generate_ontology processing step then names aren’t guaranteed unique.

Ideally I’m hoping that the sort of check that I’m asking for can be set up in such a way so that
there can be some additional validation built in.

For instance checking to see that if someone is entering a new tissue term then that term is not
really referring to a cell line.

This can be determined by info that will be stored with the term in the system.

So basically what I’m looking for is validation that can get the  json from the request and also get
info on existing terms that are in the system and do some checks prior to post or patch of the item
and also change the json to use uuid rather than the info included in the post (eg. preferred_name)
as an identifying property if the term validates.
'''


@pytest.fixture
def ontology(testapp):
    data = {
            "uuid": "530006bc-8535-4448-903e-854af460b254",
            "ontology_name": "Experimental Factor Ontology",
            "ontology_url": "http://www.ebi.ac.uk/efo/",
            "download_url": "http://sourceforge.net/p/efo/code/HEAD/tree/trunk/src/efoinowl/InferredEFOOWLview/EFO_inferred.owl?format=raw",
            "namespace_url": "http://www.ebi.ac.uk/efo/",
            "ontology_prefix": "EFO",
            "description": "The description",
            "notes": "The download",
        }
    return testapp.post_json('/ontology', data).json['@graph'][0]


@pytest.fixture
def oterm(ontology):
    return {
        "uuid": "530036bc-8535-4448-903e-854af460b254",
        "preferred_name": "GM12878",
        "term_name": "GM12878",
        "term_id": "EFO:0002784",
        "term_url": "http://www.ebi.ac.uk/efo/EFO_0002784",
        "source_ontology": ontology['@id']
    }


'''
ontology terms have uuid or term_id as unique ID keys
and if neither of those are included in post, try to 
use prefered_name such that:
No - fail load with non-existing term message
Multiple - fail load with ‘ambiguous name - more than 1 term with that name exist use ID’
Single result - get uuid and use that for post/patch
'''
def test_store_ontology_term_by_uuid(testapp, oterm):
    oterm.pop('preferred_name')
    res = testapp.post_json('/ontology_term', oterm)
    assert res.json['@graph'][0]['uuid'] == oterm['uuid']
    assert res.json['@graph'][0]['term_id'] == oterm['term_id']
    assert res.json['@graph'][0].get('preferred_name', None) is None


def test_store_ontology_term_by_term_id(testapp, oterm):
    oterm.pop('preferred_name')
    oterm.pop('uuid')
    res = testapp.post_json('/ontology_term', oterm)
    assert res.json['@graph'][0]['term_id'] == oterm['term_id']
    assert res.json['@graph'][0].get('preferred_name', None) is None
    res2 = testapp.get('/ontology_term/' + oterm['term_id'])


def test_store_ontology_no_required_keys(testapp, oterm):
    oterm.pop('preferred_name')
    oterm.pop('uuid')
    oterm.pop('term_id')
    res = testapp.post_json('/ontology_term', oterm, status=422)


def test_linkto_ontology_term_by_preffered_name(testapp, lab, award, oterm):
    item = {
        "accession": "4DNSR000AAQ1",
        "biosource_type": "immortalized cell line",
        "cell_line": "GM12878",
        'award': award['@id'],
        'lab': lab['@id'],
        'tissue': oterm['preferred_name']
    }

    res = testapp.post_json('/ontology_term', oterm).json['@graph'][0]
    res_biosource = testapp.post_json('/biosource', item).json['@graph'][0]
    assert res['@id'] == res_biosource['tissue']

