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
                 '@id': '/ontologys/530006bc-8535-4448-903e-854af460b254/',
                 '@type': ['Ontology', 'Item'],
                 'definition_terms': [
                     '/ontology-terms/111115bc-8535-4448-903e-854af460a233/',
                     '/ontology-terms/111116bc-8535-4448-903e-854af460a233/'],
                 'namespace_url': 'http://www.ebi.ac.uk/efo/',
                 'ontology_prefix': 'EFO',
                 'uuid': '530006bc-8535-4448-903e-854af460b254',
                 'ontology_name': 'Experimental Factor Ontology'
                 },
                {'ontology_name': 'Ontology for Biomedical Investigations',
                 '@type': ['Ontology', 'Item'],
                 'ontology_prefix': 'OBI',
                 'namespace_url': 'http://purl.obolibrary.org/obo/',
                 'download_url': 'http://purl.obolibrary.org/obo/obi.owl',
                 '@id': '/ontologys/530026bc-8535-4448-903e-854af460b254/',
                 'definition_terms': ['/ontology-terms/111116bc-8535-4448-903e-854af460a233/'],
                 'uuid': '530026bc-8535-4448-903e-854af460b254',
                 },
                {'synonym_terms': [
                    '/ontology-terms/111112bc-8535-4448-903e-854af460a233/',
                    '/ontology-terms/111113bc-8535-4448-903e-854af460a233/',
                    '/ontology-terms/111114bc-8535-4448-903e-854af460a233/'],
                 'ontology_name': 'Uberon',
                 '@type': ['Ontology', 'Item'],
                 'ontology_prefix': 'UBERON',
                 'namespace_url': 'http://purl.obolibrary.org/obo/',
                 'download_url': 'http://purl.obolibrary.org/obo/uberon/composite-metazoan.owl',
                 '@id': '/ontologys/530016bc-8535-4448-903e-854af460b254/',
                 'definition_terms': ['/ontology-terms/111116bc-8535-4448-903e-854af460a233/'],
                 'uuid': '530016bc-8535-4448-903e-854af460b254',
                 }]


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
def slim_term_list():
    # see ontology_term schema for full schema
    return [{'term_id': 'd_term1', 'uuid': 'uuidd1', 'is_slim_for': 'developmental'},
            {'term_id': 'd_term2', 'uuid': 'uuidd2', 'is_slim_for': 'developmental'},
            {'term_id': 'a_term1', 'uuid': 'uuida1', 'is_slim_for': 'assay'}]


@pytest.fixture
def slim_terms_by_ont(slim_term_list):
    return [
        [slim_term_list[0],
         slim_term_list[1]],
        [slim_term_list[2]],
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
    return {'term_id': '1', 'uuid': 'uuid1', 'closure': ['id1', 'id2', 'd_term1']}


@pytest.fixture
def terms_w_closures(term_w_closure):
    # term with 2 slims
    term_w_two = term_w_closure.copy()
    term_w_two['term_id'] = '4'
    term_w_two['uuid'] = 'uuid2'
    term_w_two['closure'] = term_w_closure['closure'].copy()
    term_w_two['closure'].append('d_term2')
    # term w closure but no slim terms
    term_wo_slim = term_w_closure.copy()
    term_wo_slim['term_id'] = '5'
    term_wo_slim['uuid'] = 'uuid5'
    term_wo_slim['closure'] = term_w_closure['closure'].copy()
    term_wo_slim['closure'].pop()
    # term with both 'closure' and 'closure_with_develops_from' both with the same slim
    term_with_both = term_w_closure.copy()
    term_with_both['term_id'] = '3'
    term_with_both['uuid'] = 'uuid3'
    term_with_both['closure_with_develops_from'] = term_with_both['closure']
    # term with 'closure_with_develops_from with slim term'
    term_cwdf = term_with_both.copy()
    term_cwdf['term_id'] = '2'
    term_cwdf['uuid'] = 'uuid2'
    del term_cwdf['closure']
    # term with no closures
    term_w_none = term_cwdf.copy()
    term_w_none['term_id'] = '6'
    term_w_none['uuid'] = 'uuid6'
    del term_w_none['closure_with_develops_from']
    return [term_w_closure, term_cwdf, term_with_both,
            term_w_two, term_wo_slim, term_w_none]


def test_add_slim_to_term(terms_w_closures, slim_term_list):
    slim_ids = ['uuidd1', 'uuidd2']
    for i, term in enumerate(terms_w_closures):
        test_term = go.add_slim_to_term(term, slim_term_list)
        assert test_term['term_id'] == str(i + 1)
        if i < 3:
            assert len(test_term['slim_terms']) == 1
            assert test_term['slim_terms'][0] == slim_ids[0]
        elif i == 3:
            assert len(test_term['slim_terms']) == 2
            for t in test_term['slim_terms']:
                assert t in slim_ids
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


def test_get_syndef_terms_has_terms(mocker, connection):
    mocker.patch('encoded.commands.generate_ontology.get_ontologies',
                 return_value=[all_ontology[0]])
    with mocker.patch('encoded.commands.generate_ontology.get_FDN',
                      side_effect=test_syn_terms):
        synterms = go.get_syndef_terms(connection, 'ontologys/EFO', 'synonym_terms')
        assert len(synterms) == 2
        uuids = ['1', '2']
        for syn in synterms:
            assert syn['uuid'] in uuids


def test_get_syndef_terms_no_terms(mocker, connection):
    with mocker.patch('encoded.commands.generate_ontology.get_ontologies',
                      return_value=[all_ontology[1]]):
        synterms = go.get_syndef_terms(connection, 'ontologys/OBI', 'synonym_terms')
        assert not synterms


def test_get_syndef_terms_no_ontology(mocker, connection):
    with mocker.patch('encoded.commands.generate_ontology.get_ontologies',
                      return_value=[]):
        synterms = go.get_syndef_terms(connection, 'ontologys/FAKE', 'synonym_terms')
        assert synterms is None


@pytest.fixture
def syn_uris():
    return ['http://www.ebi.ac.uk/efo/alternative_term',
            'http://www.geneontology.org/formats/oboInOwl#hasExactSynonym']


@pytest.fixture
def syn_uris_as_URIRef(syn_uris):
    return [go.convert2namespace(uri) for uri in syn_uris]


def check_if_URIRef(uri):
    from rdflib import URIRef
    return isinstance(uri, URIRef)


def test_convert2namespace(syn_uris):
    for uri in syn_uris:
        ns = go.convert2namespace(uri)
        assert check_if_URIRef(ns)
        assert str(ns) == uri


def test_get_syndef_terms_as_uri(mocker, connection, syn_uris):
    asrdf = [True, False]
    with mocker.patch('encoded.commands.generate_ontology.get_syndef_terms',
                      return_value=test_syn_terms):
        for rdf in asrdf:
            uris = go.get_syndef_terms_as_uri(connection, 'ontid', 'synonym_terms', rdf)
            if rdf:
                for uri in uris:
                    assert check_if_URIRef(uri)
                    assert str(uri) in syn_uris
            else:
                assert str(uri) in syn_uris


def test_get_synonym_term_uris_no_ontology(mocker, connection):
    with mocker.patch('encoded.commands.generate_ontology.get_syndef_terms_as_uri',
                      return_value=[]):
        synterms = go.get_synonym_term_uris(connection, 'ontologys/FAKE')
        assert not synterms


def test_get_definition_term_uris_no_ontology(mocker, connection):
    with mocker.patch('encoded.commands.generate_ontology.get_syndef_terms_as_uri',
                      return_value=[]):
        synterms = go.get_definition_term_uris(connection, 'ontologys/FAKE')
        assert not synterms


def test_get_synonym_term_uris(mocker, connection, syn_uris, syn_uris_as_URIRef):
    asrdf = [True, False]
    with mocker.patch('encoded.commands.generate_ontology.get_syndef_terms_as_uri',
                      return_value=syn_uris_as_URIRef):
        for rdf in asrdf:
            uris = go.get_synonym_term_uris(connection, 'ontid', rdf)
            if rdf:
                for uri in uris:
                    assert check_if_URIRef(uri)
                    assert str(uri) in syn_uris
            else:
                assert str(uri) in syn_uris


def test_get_definition_term_uris(mocker, connection, syn_uris, syn_uris_as_URIRef):
    asrdf = [True, False]
    with mocker.patch('encoded.commands.generate_ontology.get_syndef_terms_as_uri',
                      return_value=syn_uris_as_URIRef):
        for rdf in asrdf:
            uris = go.get_synonym_term_uris(connection, 'ontid', rdf)
            if rdf:
                for uri in uris:
                    assert check_if_URIRef(uri)
                    assert str(uri) in syn_uris
            else:
                assert str(uri) in syn_uris


@pytest.fixture
def owler(mocker):
    return mocker.patch.object(go, 'Owler')


@pytest.fixture
def returned_synonyms():
    return [
        [], [],
        ['testsyn1'], ['testsyn1'],
        ['testsyn1', 'testsyn2'], ['testsyn1', 'testsyn2']
    ]


def test_get_synonyms_and_definitions(mocker, owler, returned_synonyms):
    checks = ['testsyn1', 'testsyn2']
    with mocker.patch('encoded.commands.generate_ontology.getObjectLiteralsOfType',
                      side_effect=returned_synonyms):
        class_ = 'test_class'
        synonym_terms = ['1']
        definition_terms = ['1']
        for i in range(int(len(returned_synonyms) / 2)):
            synonyms = go.get_synonyms(class_, owler, synonym_terms)
            definitions = go.get_definitions(class_, owler, definition_terms)
            assert synonyms == definitions
            if i == 0:
                assert not synonyms
            else:
                assert len(synonyms) == i
                for syn in synonyms:
                    assert syn in checks


@pytest.fixture
def terms():
    return {
        'id1': {
            'term_id': 'id1',
            'all_parents': []
        },
        'id2': {
            'term_id': 'id2',
            'all_parents': ['id1']
        },
        'id3': {
            'term_id': 'id3',
            'all_parents': ['id2']
        },
        'id4': {
            'term_id': 'id4',
            'all_parents': ['id1', 'id2']
        },
        'id5': {
            'term_id': 'id5',
            'all_parents': ['id4']
        },
        'id6': {
            'term_id': 'id6',
            'all_parents': []
        },
        'id7': {
            'term_id': 'id7',
            'all_parents': ['id6']
        },
        'id8': {
            'term_id': 'id8',
            'all_parents': ['id7', 'id3']
        },
        'id9': {
            'term_id': 'id9',
            'all_parents': ['id10']
        }
    }


def test_iterative_parents(terms):
    for tid, term in terms.items():
        parents = []
        if 'all_parents' in term:
            parents = go.iterative_parents(term['all_parents'], terms, 'all_parents')
        if tid in ['id1', 'id6', 'id9']:
            assert not parents
        if tid == 'id2':
            assert len(parents) == 1
            assert 'id1' in parents
        if tid in ['id3', 'id4']:
            assert len(parents) == 2
            assert 'id1' in parents
            assert 'id2' in parents
        if tid == 'id5':
            assert len(parents) == 3
            assert 'id1' in parents
            assert 'id2' in parents
            assert 'id4' in parents
        if tid == 'id7':
            assert len(parents) == 1
            assert 'id6' in parents
        if tid == 'id8':
            assert len(parents) == 5
            assert 'id6' in parents
            assert 'id7' in parents
            assert 'id1' in parents
            assert 'id2' in parents
            assert 'id3' in parents
