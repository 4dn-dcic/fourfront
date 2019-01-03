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
as an identifying property if the term validates.'''


def test_store_ontology_term_by_uuid(testapp, oterm):
    oterm.pop('term_name')  # this will create preferred_name in _update
    oterm.pop('preferred_name')
    res = testapp.post_json('/ontology_term', oterm)
    assert res.json['@graph'][0]['uuid'] == oterm['uuid']
    assert res.json['@graph'][0]['term_id'] == oterm['term_id']
    assert res.json['@graph'][0].get('preferred_name', None) is None


def test_store_ontology_term_by_term_id(testapp, oterm):
    oterm.pop('term_name')  # this will create preferred_name in _update
    oterm.pop('preferred_name')
    oterm.pop('uuid')
    res = testapp.post_json('/ontology_term', oterm)
    assert res.json['@graph'][0]['term_id'] == oterm['term_id']
    assert res.json['@graph'][0].get('preferred_name', None) is None
    testapp.get('/ontology_term/' + oterm['term_id'])


def test_store_ontology_no_required_keys(testapp, oterm):
    oterm.pop('term_name')
    oterm.pop('uuid')
    oterm.pop('term_id')
    testapp.post_json('/ontology_term', oterm, status=422)


def test_linkto_ontology_term_by_term_id(testapp, lab, award, oterm):
    item = {
        "accession": "4DNSROOOAAQ1",
        "biosource_type": "immortalized cell line",
        'award': award['@id'],
        'lab': lab['@id'],
        'tissue': oterm['term_id']
    }

    res = testapp.post_json('/ontology_term', oterm).json['@graph'][0]
    res_biosource = testapp.post_json('/biosource', item).json['@graph'][0]
    assert res['@id'] == res_biosource['tissue']
