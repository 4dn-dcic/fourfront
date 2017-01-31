import os
import pytest
pytestmark = pytest.mark.working
from encoded.commands import generate_ontology as go


def test_parse_args_defaults():
    args = ''
    args = go.parse_args(args)
    assert args.ontologies == 'all'
    assert args.keyfile == os.path.expanduser('~/keypairs.json')
    assert args.key == 'default'


@pytest.fixture
def slim_terms():
    return [
        {
            "uuid": "111119bc-8535-4448-903e-854af460a233",
            "term_name": "ectoderm",
            "term_id": "UBERON:0000924",
            "is_slim_for": "developmental",
        },
        {
            "uuid": "111122bc-8535-4448-903e-854af460a233",
            "preferred_name": "3D chromatin structure",
            "term_name": "chromosome conformation identification objective",
            "term_id": "OBI:0001917",
            "is_slim_for": "assay"
        }
    ]


@pytest.fixture
def brain_term():
    return {
        "term_name": 'brain',
        "term_id": "TEST:1234",
        "closure_with_develops_from": ['UBERON:0000924'],
        "closure": ['OBI:0001917']
    }


def test_add_slim_to_term(brain_term, slim_terms):
    slim_ids = ['UBERON:0000924', 'OBI:0001917']
    brain_term = go.add_slim_to_term(brain_term, slim_terms)
    assert brain_term['slim_terms']
    for term in brain_term['slim_terms']:
        assert term['term_id'] in slim_ids


@pytest.fixture
def connection(mocker):
    return mocker.patch.object(go, 'FDN_Connection')


def test_connect2server(mocker):
    # mock submit4dn stuff
    mocker.patch.object(go, 'FDN_Key')
    mocker.patch.object(go, 'FDN_Connection')
    go.FDN_Connection.server.return_value = 'test_server'
    go.FDN_Connection.check.return_value = True

    # run the test, we mocked everything so
    # parameters we pass in don't really matter
    retval = go.connect2server('dummy-keyfile', 'dummy-keyname')
    assert retval is not None


# see ontology schema for full schema
all_ontology = [{'download_url': 'http://www.ebi.ac.uk/efo/efo_inferred.owl',
                 'synonym_terms': [
                     '/ontology-terms/111111bc-8535-4448-903e-854af460a233/',
                     '/ontology-terms/111112bc-8535-4448-903e-854af460a233/'],
                 'notes': "The download link also downloads all of CL cell type ontology which will get split into it's own ontology during processing",
                 '@id': '/ontologys/530006bc-8535-4448-903e-854af460b254/',
                 '@type': ['Ontology', 'Item'],
                 'definition_terms': [
                     '/ontology-terms/111115bc-8535-4448-903e-854af460a233/',
                     '/ontology-terms/111116bc-8535-4448-903e-854af460a233/'],
                 'date_created': '2017-01-27T19:07:16.927423+00:00',
                 'namespace_url': 'http://www.ebi.ac.uk/efo/',
                 'ontology_prefix': 'EFO',
                 'description': 'The Experimental Factor Ontology (EFO) provides a systematic description of many experimental variables available in EBI databases, and for external projects such as the NHGRI GWAS catalog.',
                 'schema_version': '1',
                 'status': 'released',
                 'uuid': '530006bc-8535-4448-903e-854af460b254',
                 'references': [],
                 'ontology_url': 'http://www.ebi.ac.uk/efo/',
                 'ontology_name': 'Experimental Factor Ontology'},
                {'schema_version': '1',
                 'ontology_name': 'Ontology for Biomedical Investigations',
                 '@type': ['Ontology', 'Item'],
                 'ontology_url': 'obi-ontology.org',
                 'ontology_prefix': 'OBI',
                 'namespace_url': 'http://purl.obolibrary.org/obo/',
                 'references': [],
                 'download_url': 'http://purl.obolibrary.org/obo/obi.owl',
                 '@id': '/ontologys/530026bc-8535-4448-903e-854af460b254/',
                 'definition_terms': ['/ontology-terms/111116bc-8535-4448-903e-854af460a233/'],
                 'date_created': '2017-01-27T19:07:16.974003+00:00',
                 'description': 'The Ontology for Biomedical Investigations (OBI) project is developing an integrated ontology for the description of biological and clinical investigations.',
                 'uuid': '530026bc-8535-4448-903e-854af460b254',
                 'status': 'released'},
                {'schema_version': '1',
                 'synonym_terms': [
                     '/ontology-terms/111112bc-8535-4448-903e-854af460a233/',
                     '/ontology-terms/111113bc-8535-4448-903e-854af460a233/',
                     '/ontology-terms/111114bc-8535-4448-903e-854af460a233/'],
                 'ontology_name': 'Uberon',
                 '@type': ['Ontology', 'Item'],
                 'ontology_url': 'http://uberon.github.io/',
                 'ontology_prefix': 'UBERON',
                 'namespace_url': 'http://purl.obolibrary.org/obo/',
                 'references': [],
                 'download_url': 'http://purl.obolibrary.org/obo/uberon/composite-metazoan.owl',
                 '@id': '/ontologys/530016bc-8535-4448-903e-854af460b254/',
                 'definition_terms': ['/ontology-terms/111116bc-8535-4448-903e-854af460a233/'],
                 'date_created': '2017-01-27T19:07:16.950897+00:00',
                 'description': 'Uberon is an integrated cross-species ontology covering anatomical structures in animals.',
                 'uuid': '530016bc-8535-4448-903e-854af460b254',
                 'status': 'released'}]


def get_fdn_ontology_side_effect(*args):
    for i, arg in enumerate(args):
        print('ARG', i, ' = ', arg)
    if args[0] is not None:
        return all_ontology[0]
    else:
        return all_ontology


def test_get_ontologies_all(mocker, connection):
    prefixes = ['EFO', 'UBERON', 'OBI']
    with mocker.patch('encoded.commands.generate_ontology.get_FDN', side_effect=get_fdn_ontology_side_effect):
        ont_list = 'all'
        ontologies = go.get_ontologies(connection, ont_list)
        assert len(ontologies) == 3
        for ont in ontologies:
            assert ont['ontology_prefix'] in prefixes


def test_get_ontologies_one(mocker, connection):
    prefix = 'EFO'
    with mocker.patch('encoded.commands.generate_ontology.get_FDN', side_effect=get_fdn_ontology_side_effect):
        ont_list = ['EFO']
        ontologies = go.get_ontologies(connection, ont_list)
        assert len(ontologies) == 1
        assert ontologies[0]['ontology_prefix'] == prefix


def test_get_ontologies_not_in_db(mocker, connection):
    prefix = 'EFO'
    all_ontology.append({'@type': ['Error', 'Item'], 'ontology_prefix': 'FAKE'})
    with mocker.patch('encoded.commands.generate_ontology.get_FDN',
                      side_effect=[all_ontology[0],
                                   {'@type': ['Error', 'Item'], 'ontology_prefix': 'FAKE'}]):
        ont_list = ['EFO', 'FAKE']
        ontologies = go.get_ontologies(connection, ont_list)
        for ont in ontologies:
            print(ont)
        assert len(ontologies) == 1
        assert ontologies[0]['ontology_prefix'] == prefix


@pytest.fixture
def slim_terms():
    # see ontology_term schema for full schema
    return [{'term_id': 'd_term1', 'is_slim_for': 'developmental'},
            {'term_id': 'd_term2', 'is_slim_for': 'developmental'},
            {'term_id': 'a_term1', 'is_slim_for': 'assay'}]


@pytest.fixture
def slim_terms_by_ont(slim_terms):
    return [
        [slim_terms[0],
         slim_terms[1]],
        [slim_terms[2]],
        {'notification': 'No result found'},
        {'notification': 'No result found'}
    ]


def test_get_slim_terms(mocker, connection, slim_terms_by_ont):
    present = ['developmental', 'assay']
    absent = ['organ', 'system']
    test_slim_terms = slim_terms_by_ont
    with mocker.patch('encoded.commands.generate_ontology.get_FDN',
                      side_effect=test_slim_terms):
        terms = go.get_slim_terms(connection)
        assert len(terms) == 3
        for term in terms:
            assert term['is_slim_for'] in present
            assert term['is_slim_for'] not in absent


@pytest.fixture
def term_w_closure():
    return {'term_id': '1', 'closure': ['id1', 'id2', 'd_term1']}


@pytest.fixture
def terms_w_closures(term_w_closure):
    # term with 2 slims
    term_w_two = term_w_closure.copy()
    term_w_two['term_id'] = '4'
    term_w_two['closure'] = term_w_closure['closure'].copy()
    term_w_two['closure'].append('d_term2')
    # term w closure but no slim terms
    term_wo_slim = term_w_closure.copy()
    term_wo_slim['term_id'] = '5'
    term_wo_slim['closure'] = term_w_closure['closure'].copy()
    term_wo_slim['closure'].pop()
    # term with both 'closure' and 'closure_with_develops_from' both with the same slim
    term_with_both = term_w_closure.copy()
    term_with_both['term_id'] = '3'
    term_with_both['closure_with_develops_from'] = term_with_both['closure']
    # term with 'closure_with_develops_from with slim term'
    term_cwdf = term_with_both.copy()
    term_cwdf['term_id'] = '2'
    del term_cwdf['closure']
    # term with no closures
    term_w_none = term_cwdf.copy()
    term_w_none['term_id'] = '6'
    del term_w_none['closure_with_develops_from']
    return [term_w_closure, term_cwdf, term_with_both,
            term_w_two, term_wo_slim, term_w_none]


def test_add_slim_to_term(terms_w_closures, slim_terms):
    slim_ids = ['d_term1', 'd_term2']
    for i, term in enumerate(terms_w_closures):
        test_term = go.add_slim_to_term(term, slim_terms)
        assert test_term['term_id'] == str(i + 1)
        if i < 3:
            assert len(test_term['slim_terms']) == 1
            assert test_term['slim_terms'][0]['term_id'] == slim_ids[0]
        elif i == 3:
            assert len(test_term['slim_terms']) == 2
            for t in test_term['slim_terms']:
                assert t['term_id'] in slim_ids
        elif i > 3:
            assert 'slim_terms' not in test_term


test_syn_terms = [
    {
        'uuid': '1',
        'term_url': 'http://www.ebi.ac.uk/efo/alternative_term'
    },
    {
        'uuid': '2',
        'term_url': 'http://www.geneontology.org/formats/oboInOwl#hasExactSynonym'
    },
]


def test_get_synonym_terms_has_terms(mocker, connection):
    mocker.patch('encoded.commands.generate_ontology.get_ontologies',
                 return_value=[all_ontology[0]])
    with mocker.patch('encoded.commands.generate_ontology.get_FDN',
                      side_effect=test_syn_terms):
        synterms = go.get_synonym_terms(connection, 'ontologys/EFO')
        assert len(synterms) == 2
        uuids = ['1', '2']
        for syn in synterms:
            assert syn['uuid'] in uuids


def test_get_synonym_terms_no_ontology(mocker, connection):
    with mocker.patch('encoded.commands.generate_ontology.get_ontologies',
                      return_value=[]):
        synterms = go.get_synonym_terms(connection, 'ontologys/FAKE')
        assert synterms is None


@pytest.fixture
def syn_uris():
    return ['http://www.ebi.ac.uk/efo/alternative_term',
            'http://www.geneontology.org/formats/oboInOwl#hasExactSynonym']


def check_if_URIRef(uri):
    from rdflib import URIRef
    return isinstance(uri, URIRef)


def test_convert2namespace(syn_uris):
    for uri in syn_uris:
        ns = go.convert2namespace(uri)
        assert check_if_URIRef(ns)
        assert str(ns) == uri


def test_get_synonym_terms_as_uri(mocker, connection, syn_uris):
    asrdf = [True, False]
    with mocker.patch('encoded.commands.generate_ontology.get_synonym_terms',
                      return_value=test_syn_terms):
        for rdf in asrdf:
            uris = go.get_synonym_terms_as_uri(connection, 'ontid', rdf)
            if rdf:
                for uri in uris:
                    assert check_if_URIRef(uri)
                    assert str(uri) in syn_uris
            else:
                assert str(uri) in syn_uris
