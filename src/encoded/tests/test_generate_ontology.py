import json
import os
import pytest

from collections import OrderedDict
from rdflib import URIRef
from unittest import mock
from ..commands import generate_ontology as go
from ..commands.owltools import Owler


pytestmark = [pytest.mark.setone, pytest.mark.working]


def test_parse_args_defaults():
    args = []
    args = go.parse_args(args)
    assert args.ontology == 'all'
    assert args.env == 'data'
    assert args.simple is False
    assert args.full is False
    assert args.pretty is False
    assert args.phase is False
    assert args.owlfile is None
    assert args.keyfile == "{}/keypairs.json".format(os.path.expanduser('~'))
    assert args.key is None
    assert args.keyname == 'default'


@pytest.fixture
def connection():
    return {
        "server": "https://data.4dnucleome.org/",
        "key": "testkey",
        "secret": "testsecret"
    }


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


def test_connect2server(connection):
    # parameters we pass in don't really matter
    key = "{'server': 'https://data.4dnucleome.org/', 'key': 'testkey', 'secret': 'testsecret'}"
    with mock.patch('encoded.commands.generate_ontology.get_authentication_with_server', return_value=connection):
        retval = go.connect2server(None, key)
        assert retval == connection


# see ontology schema for full schema
# now synonym_terms and definition_terms are fully embedded
all_ontology = [
    {
        'download_url': 'http://www.ebi.ac.uk/efo/efo_inferred.owl',
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
    {
        'ontology_name': 'Uberon',
        '@type': ['Ontology', 'Item'],
        'ontology_prefix': 'UBERON',
        'namespace_url': 'http://purl.obolibrary.org/obo/',
        'download_url': 'http://purl.obolibrary.org/obo/uberon/composite-metazoan.owl',
        '@id': '/ontologys/530016bc-8535-4448-903e-854af460b254/',
        'definition_terms': ['/ontology-terms/111116bc-8535-4448-903e-854af460a233/'],
        'uuid': '530016bc-8535-4448-903e-854af460b254',
    },
    {
        'ontology_name': 'Ontology for Biomedical Investigations',
        '@type': ['Ontology', 'Item'],
        'ontology_prefix': 'OBI',
        'namespace_url': 'http://purl.obolibrary.org/obo/',
        'download_url': 'http://purl.obolibrary.org/obo/obi.owl',
        '@id': '/ontologys/530026bc-8535-4448-903e-854af460b254/',
        'definition_terms': [
            {
                'term_name': 'definition',
                '@type': ['OntologyTerm', 'Item'],
                'term_id': 'IAO:0000115',
                '@id': '/ontology-terms/111116bc-8535-4448-903e-854af460a233/',
                'uuid': '111116bc-8535-4448-903e-854af460a233',
                'term_url': 'http://purl.obolibrary.org/obo/IAO_0000115'
            }
        ],
        'uuid': '530026bc-8535-4448-903e-854af460b254',
        'synonym_terms': [
            {
                'term_name': 'alternative term',
                '@type': ['OntologyTerm', 'Item'],
                'term_id': 'IAO:0000118',
                '@id': '/ontology-terms/111117bc-8535-4448-903e-854af460a233/',
                'uuid': '111117bc-8535-4448-903e-854af460a233',
                'term_url': 'http://purl.obolibrary.org/obo/IAO_0000118'
            },
            {
                'term_name': 'alternative term',
                '@type': ['OntologyTerm', 'Item'],
                'term_id': 'IAO:0000118',
                '@id': '/ontology-terms/111117bc-8535-4448-903e-854af460a233/',
                'uuid': '111117bc-8535-4448-903e-854af460a233',
                'term_url': 'http://purl.obolibrary.org/obo/IAO_0000118'
            }
        ]
    }
]


def get_fdn_ontology_side_effect(*args, **kwargs):
    for i, arg in enumerate(args):
        print('ARG', i, ' = ', arg)
    if args[0] is not None:
        return all_ontology[0]
    else:
        return all_ontology


def test_get_ontologies_all(connection):
    prefixes = ['EFO', 'UBERON', 'OBI']
    with mock.patch('encoded.commands.generate_ontology.search_metadata', return_value=all_ontology):
        ont_list = 'all'
        ontologies = go.get_ontologies(connection, ont_list)
        assert len(ontologies) == 3
        for ont in ontologies:
            assert ont['ontology_prefix'] in prefixes


def test_get_ontologies_one(connection):
    prefix = 'EFO'
    with mock.patch('encoded.commands.generate_ontology.get_metadata', side_effect=get_fdn_ontology_side_effect):
        ont_list = 'EFO'
        ontologies = go.get_ontologies(connection, ont_list)
        assert len(ontologies) == 1
        assert ontologies[0]['ontology_prefix'] == prefix


def test_get_ontologies_not_in_db(connection):
    all_ontology.append({'@type': ['Error', 'Item'], 'ontology_prefix': 'FAKE'})
    with mock.patch('encoded.commands.generate_ontology.get_metadata',
                    return_value={'@type': ['Error', 'Item'], 'ontology_prefix': 'FAKE'}):
        ont_list = 'FAKE'
        ontologies = go.get_ontologies(connection, ont_list)
        assert not ontologies


@pytest.fixture
def slim_term_list():
    # see ontology_term schema for full schema
    return [{'term_id': 'a_term1', 'uuid': 'uuida1', 'is_slim_for': 'assay'},
            {'term_id': 'a_term2', 'uuid': 'uuida2', 'is_slim_for': 'assay'},
            {'term_id': 'd_term1', 'uuid': 'uuidd1', 'is_slim_for': 'developmental'}]


@pytest.fixture
def slim_terms_by_ont(slim_term_list):
    return [
        [slim_term_list[0],
         slim_term_list[1]],
        [slim_term_list[2]],
        None,
        None,
        None
    ]


@pytest.fixture
def term_w_closure():
    return {'term_id': '1', 'uuid': 'uuid1',
            'closure': ['id1', 'id2', 'a_term1']}


@pytest.fixture
def terms_w_closures(term_w_closure):
    # term with 2 slims
    term_w_two = term_w_closure.copy()
    term_w_two['term_id'] = '4'
    term_w_two['uuid'] = 'uuid2'
    term_w_two['closure'] = term_w_closure['closure'].copy()
    term_w_two['closure'].append('a_term2')
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
    term_with_both['closure_with_develops_from'] = ['d_term1']
    print(term_with_both)
    # term with 'closure_with_develops_from' slim term'
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


@pytest.fixture
def terms():
    return {
        'a_term1': {
            'term_id': 'a_term1',
            'term_name': 'name1',
            'all_parents': []
        },
        'id2': {
            'term_id': 'id2',
            'term_name': 'name2',
            'parents': ['a_term1', 'ObsoleteClass'],
            'all_parents': ['a_term1']
        },
        'id3': {
            'term_id': 'id3',
            'term_name': 'obsolete name',
            'relationships': ['id2'],
            'all_parents': ['id2']
        },
        'id4': {
            'term_id': 'id4',
            'term_name': 'Obsolete name',
            'relationships': ['a_term1', 'id2'],
            'all_parents': ['a_term11', 'id2']
        },
        'd_term1': {
            'term_id': 'd_term1',
            'term_name': '',
            'all_parents': ['id4']
        },
        'id6': {
            'term_id': 'id6',
            'develops_from': ['id7'],
            'parents': ['id2'],
            'all_parents': []
        },
        'id7': {
            'term_id': 'id7',
            'parents': ['d_term1'],
            'all_parents': ['id6']
        },
        'id8': {
            'term_id': 'id8',
            'develops_from': ['id7', 'id3'],
            'all_parents': ['id7', 'id3']
        },
        'id9': {
            'term_id': 'id9',
            'has_part_inverse': ['id3'],
            'develops_from': ['id3'],
            'all_parents': ['id10']
        }
    }


@pytest.fixture
def syn_uris():
    return ['http://www.ebi.ac.uk/efo/alternative_term',
            'http://www.geneontology.org/formats/oboInOwl#hasExactSynonym',
            'http://purl.obolibrary.org/obo/IAO_0000118']


@pytest.fixture
def syn_uris_as_URIRef(syn_uris):
    return [go.convert2namespace(uri) for uri in syn_uris]


def test_get_slim_terms(connection, slim_terms_by_ont):
    present = ['developmental', 'assay']
    absent = ['organ', 'system', 'cell']
    test_slim_terms = slim_terms_by_ont
    with mock.patch('encoded.commands.generate_ontology.search_metadata',
                    side_effect=test_slim_terms):
        terms = go.get_slim_terms(connection)
        assert len(terms) == 3
        for term in terms:
            assert term['is_slim_for'] in present
            assert term['is_slim_for'] not in absent


def test_add_slim_to_term(terms_w_closures, slim_term_list):
    slim_ids = ['a_term1', 'd_term1', 'a_term2']
    for i, term in enumerate(terms_w_closures):
        test_term = go.add_slim_to_term(term, slim_term_list)
        assert test_term['term_id'] == str(i + 1)
        if i < 2:
            assert len(test_term['slim_terms']) == 1
            assert test_term['slim_terms'][0] == slim_ids[i]
        elif i <= 3:
            assert len(test_term['slim_terms']) == 2
            for t in test_term['slim_terms']:
                assert t in slim_ids
        elif i > 3:
            assert 'slim_terms' not in test_term


def test_add_slim_terms(terms, slim_term_list):
    terms = go.add_slim_terms(terms, slim_term_list)
    print(terms)
    for tid, term in terms.items():
        if tid == 'id6':
            assert len(term['slim_terms']) == 2
            assert 'd_term1' in term['slim_terms']
            assert 'a_term1' in term['slim_terms']
        elif tid == 'id9':
            assert 'slim_terms' not in term
        else:
            assert len(term['slim_terms']) == 1
            if tid in ['a_term1', 'id2', 'id3', 'id4']:
                assert term['slim_terms'][0] == 'a_term1'
            elif tid in ['d_term1', 'id7', 'id8']:
                assert term['slim_terms'][0] == 'd_term1'


def test_remove_obsoletes_and_unnamed_obsoletes(terms):
    db_terms = []
    terms['id10'] = {'term_id': 'id10', 'term_name': 'new_term that is deprecated'}
    ids = ['a_term1', 'id2', 'id3', 'id4', 'd_term1', 'id6', 'id7', 'id8', 'id9', 'id10']
    deprecated = 'id10'
    for i in ids:
        assert i in terms
    terms = go.remove_obsoletes_and_unnamed(terms, deprecated, db_terms)
    remaining = ids.pop(0)
    assert remaining in terms
    for i in ids:
        assert i not in terms


def check_if_URIRef(uri):
    return isinstance(uri, URIRef)


def test_convert2namespace(syn_uris):
    for uri in syn_uris:
        ns = go.convert2namespace(uri)
        assert check_if_URIRef(ns)
        assert str(ns) == uri


def test_get_syndef_terms_as_uri(syn_uris):
    asrdf = [True, False]
    for rdf in asrdf:
        uris = go.get_syndef_terms_as_uri(all_ontology[2], 'synonym_terms', rdf)
        if rdf:
            for uri in uris:
                assert check_if_URIRef(uri)
                assert str(uri) in syn_uris
        else:
            assert str(uri) in syn_uris


def test_get_synonym_term_uris_no_ontology():
    with mock.patch('encoded.commands.generate_ontology.get_syndef_terms_as_uri',
                    return_value=[]):
        synterms = go.get_synonym_term_uris('ontologys/FAKE')
        assert not synterms


def test_get_definition_term_uris_no_ontology():
    with mock.patch('encoded.commands.generate_ontology.get_syndef_terms_as_uri',
                    return_value=[]):
        synterms = go.get_definition_term_uris('ontologys/FAKE')
        assert not synterms


def test_get_synonym_term_uris(syn_uris, syn_uris_as_URIRef):
    asrdf = [True, False]
    with mock.patch('encoded.commands.generate_ontology.get_syndef_terms_as_uri',
                    return_value=syn_uris_as_URIRef):
        for rdf in asrdf:
            uris = go.get_synonym_term_uris('ontid', rdf)
            if rdf:
                for uri in uris:
                    assert check_if_URIRef(uri)
                    assert str(uri) in syn_uris
            else:
                assert str(uri) in syn_uris


def test_get_definition_term_uris(syn_uris, syn_uris_as_URIRef):
    asrdf = [True, False]
    with mock.patch('encoded.commands.generate_ontology.get_syndef_terms_as_uri',
                    return_value=syn_uris_as_URIRef):
        for rdf in asrdf:
            uris = go.get_synonym_term_uris('ontid', rdf)
            if rdf:
                for uri in uris:
                    assert check_if_URIRef(uri)
                    assert str(uri) in syn_uris
            else:
                assert str(uri) in syn_uris


@pytest.fixture
def owler():
    with mock.patch.object(go, 'Owler') as mocked:
        yield mocked


@pytest.fixture
def returned_synonyms():
    return [
        [], [],
        ['testsyn1'], ['testsyn1'],
        ['testsyn1', 'testsyn2'], ['testsyn1', 'testsyn2']
    ]


def test_get_synonyms_and_definitions(owler, returned_synonyms):
    checks = ['testsyn1', 'testsyn2']
    with mock.patch('encoded.commands.generate_ontology.getObjectLiteralsOfType',
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


def test_iterative_parents(terms):
    for tid, term in terms.items():
        parents = []
        oks = []
        if 'all_parents' in term:
            parents = go.iterative_parents(term['all_parents'], terms, 'all_parents')
        if tid in ['a_term1', 'id6', 'id9']:
            assert not parents
        if tid == 'id2':
            oks = ['a_term1']
            assert len(parents) == 1
        if tid in ['id3', 'id4']:
            oks = ['a_term1', 'id2']
            assert len(parents) == 2
        if tid == 'd_term1':
            oks = ['a_term1', 'id2', 'id4']
            assert len(parents) == 3
        if tid == 'id7':
            oks = ['id6']
            assert len(parents) == 1
        if tid == 'id8':
            oks = ['id6', 'id7', 'a_term1', 'id2', 'id3']
            assert len(parents) == 5
        if oks:
            assert [_id in oks for _id in parents]


def test_get_all_ancestors(terms):
    for tid, term in terms.items():
        term['development'] = term['all_parents'].copy()  # adding development to all terms
    for tid, term in terms.items():
        term = go.get_all_ancestors(term, terms, 'all_parents')
        term = go.get_all_ancestors(term, terms, 'development')
        # check they're the same - no need to check both anymore
        assert term['closure'] == term['closure_with_develops_from']
        closure = term['closure']
        okids = []
        assert tid in closure  # checks that the term id is included
        if tid in ['a_term1', 'id6', 'id9']:
            assert len(closure) == 1
        if tid in ['id2', 'id7']:
            assert len(closure) == 2
            if tid == 'id2':
                okids = ['a_term1']
            else:
                okids = ['id6']
        if tid in ['id3', 'id4']:
            assert len(closure) == 3
            okids = ['a_term1', 'id2']
        if tid == 'd_term1':
            assert len(closure) == 4
            okids = ['a_term1', 'id2', 'id4']
        if tid == 'id8':
            assert len(closure) == 6
            okids = ['id6', 'id7', 'a_term1', 'id2', 'id3']
        if okids:
            assert [_id in okids for _id in closure]


def test_combine_all_parents_w_no_parents():
    term = {'term_id': 'id1'}
    term = go._combine_all_parents(term)
    assert not term['all_parents']  # both should be empty lists
    assert not term['development']


def test_combine_all_parents_w_empty_parents():
    term = {'term_id': 'id1', 'parents': [], 'relationships': [],
            'develops_from': [], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert not term['all_parents']  # both should be empty lists
    assert not term['development']


def test_combine_all_parents_w_one_parent():
    term = {'term_id': 'id1', 'parents': ['id2'], 'relationships': [],
            'develops_from': [], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert len(term['all_parents']) == 1
    assert term['all_parents'][0] == 'id2'
    assert term['development'] == term['all_parents']


def test_combine_all_parents_w_two_parents():
    term = {'term_id': 'id1', 'parents': ['id2', 'id3'], 'relationships': [],
            'develops_from': [], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert len(term['all_parents']) == 2
    assert 'id2' in term['all_parents']
    assert 'id3' in term['all_parents']
    assert sorted(term['development']) == sorted(term['all_parents'])


def test_combine_all_parents_w_two_same_parents():
    term = {'term_id': 'id1', 'parents': ['id2', 'id2'], 'relationships': [],
            'develops_from': [], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert len(term['all_parents']) == 1
    assert term['all_parents'][0] == 'id2'
    assert term['development'] == term['all_parents']


def test_combine_all_parents_w_parent_and_relationship_diff():
    term = {'term_id': 'id1', 'parents': ['id2'], 'relationships': ['id3'],
            'develops_from': [], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert len(term['all_parents']) == 2
    assert 'id2' in term['all_parents']
    assert 'id3' in term['all_parents']
    assert sorted(term['development']) == sorted(term['all_parents'])


def test_combine_all_parents_w_parent_and_relationship_same():
    term = {'term_id': 'id1', 'parents': ['id2'], 'relationships': ['id2'],
            'develops_from': [], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert len(term['all_parents']) == 1
    assert term['all_parents'][0] == 'id2'
    assert term['development'] == term['all_parents']


def test_combine_all_parents_w_parent_and_develops_from_diff():
    term = {'term_id': 'id1', 'parents': ['id2'], 'relationships': [],
            'develops_from': ['id3'], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert len(term['all_parents']) == 1
    assert len(term['development']) == 2
    assert term['all_parents'][0] == 'id2'
    assert 'id2' in term['development']
    assert 'id3' in term['development']


def test_combine_all_parents_w_parent_and_develops_from_same():
    term = {'term_id': 'id1', 'parents': ['id2'], 'relationships': [],
            'develops_from': ['id2'], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert len(term['all_parents']) == 1
    assert term['all_parents'][0] == 'id2'
    assert term['development'] == term['all_parents']


def test_combine_all_parents_w_only_develops_from():
    term = {'term_id': 'id1', 'parents': [], 'relationships': [],
            'develops_from': ['id2'], 'has_part_inverse': []}
    term = go._combine_all_parents(term)
    assert not term['all_parents']
    assert len(term['development']) == 1
    assert term['development'][0] == 'id2'


def test_combine_all_parents_w_has_part_inverse_only():
    term = {'term_id': 'id1', 'parents': [], 'relationships': [],
            'develops_from': [], 'has_part_inverse': ['id2']}
    term = go._combine_all_parents(term)
    assert not term['all_parents']  # both should be empty lists
    assert not term['development']


def test_combine_all_parents_w_has_part_inverse_to_exclude():
    term = {'term_id': 'id1', 'parents': [], 'relationships': [],
            'develops_from': ['id2'], 'has_part_inverse': ['id2']}
    term = go._combine_all_parents(term)
    assert not term['all_parents']  # both should be empty lists
    assert not term['development']


def test_combine_all_parents_w_has_part_inverse_to_exclude_plus_others():
    term = {'term_id': 'id1', 'parents': ['id2'], 'relationships': [],
            'develops_from': ['id3', 'id4', 'id5'], 'has_part_inverse': ['id4', 'id5', 'id6']}
    term = go._combine_all_parents(term)
    assert len(term['all_parents']) == 1
    assert len(term['development']) == 2
    assert term['all_parents'][0] == 'id2'
    assert 'id2' in term['development']
    assert 'id3' in term['development']


def test_has_human_empty():
    ll = []
    assert not go._has_human(ll)


def test_has_human_no_human():
    ll = ['http://purl.obolibrary.org/obo/BFO_0000051']
    assert not go._has_human(ll)


def test_has_human_human():
    ll = ['http://purl.obolibrary.org/obo/BFO_0000051', 'http://purl.obolibrary.org/obo/NCBITaxon_9606']
    assert go._has_human(ll)


def test_has_human_uriref_human():
    uri = 'http://purl.obolibrary.org/obo/NCBITaxon_9606'
    uri = go.convert2URIRef(uri)
    ll = [uri]
    assert go._has_human(ll)


def test_get_termid_from_uri_no_uri():
    uri = ''
    assert not go.get_termid_from_uri(uri)


def test_get_termid_from_uri_valid_uri():
    uri = 'http://www.ebi.ac.uk/efo/EFO_0002784'
    tid = go.get_termid_from_uri(uri)
    assert tid == 'EFO:0002784'


def test_get_termid_from_uri_funky_uri1():
    uri = 'http://www.ebi.ac.uk/efo/EFO_UFO_0002784'
    tid = go.get_termid_from_uri(uri)
    assert tid == 'EFO:UFO:0002784'


def test_get_termid_from_uri_funky_uri2():
    uri = 'http://www.ebi.ac.uk/efo/EFO0002784'
    tid = go.get_termid_from_uri(uri)
    assert tid == 'EFO0002784'


@pytest.fixture
def uberon_owler():
    return Owler('src/encoded/tests/data/documents/test_uberon.owl')


@pytest.fixture
def uberon_owler2():
    return Owler('src/encoded/tests/data/documents/test_uberon2.owl')


@pytest.fixture
def uberon_owler3():
    return Owler('src/encoded/tests/data/documents/test_uberon3.owl')


@pytest.fixture
def uberon_owler4():
    return Owler('src/encoded/tests/data/documents/test_uberon4.owl')


@pytest.fixture
def ll_class():
    return go.convert2URIRef('http://purl.obolibrary.org/obo/UBERON_0000101')


def test_get_term_name_from_rdf_no_name(uberon_owler):
    name = go.get_term_name_from_rdf('pickle', uberon_owler)
    assert not name


def test_get_term_name_from_rdf_has_name(uberon_owler, ll_class):
    name = go.get_term_name_from_rdf(ll_class, uberon_owler)
    assert name == 'lobe of lung'


def test_get_term_name_from_rdf_no_term(uberon_owler):
    class_ = go.convert2URIRef('http://purl.obolibrary.org/obo/UBERON_0000001')
    name = go.get_term_name_from_rdf(class_, uberon_owler)
    assert not name


def test_create_term_dict(ll_class, uberon_owler):
    with mock.patch('encoded.commands.generate_ontology.get_term_name_from_rdf',
                    return_value='lung lobe'):
        term = go.create_term_dict(ll_class, 'termid', uberon_owler, 'ontid')
        assert term['term_name'] == 'lung lobe'
        assert term['term_id'] == 'termid'
        assert 'ontid' in term['source_ontologies']
        assert term['namespace'] == 'http://purl.obolibrary.org/obo'
        assert term['term_url'] == 'http://purl.obolibrary.org/obo/UBERON_0000101'


def test_add_term_and_info(uberon_owler2):
    testid = 'UBERON:0001772'
    relid = 'UBERON:0010304'
    for c in uberon_owler2.allclasses:
        if go.isBlankNode(c):
            test_class = c
    parent = go.convert2URIRef('http://purl.obolibrary.org/obo/UBERON_0001772')
    terms = go._add_term_and_info(test_class, parent, 'test_rel', uberon_owler2, {})
    assert testid in terms
    term = terms[testid]
    assert term['term_id'] == testid
    assert relid in term['test_rel']


def test_process_intersection_of(uberon_owler3):
    terms = {}
    for c in uberon_owler3.allclasses:
        for i in uberon_owler3.rdfGraph.objects(c, go.IntersectionOf):
            terms = go.process_intersection_of(c, i, uberon_owler3, terms)
    assert len(terms) == 1
    term = list(terms.values())[0]
    assert len(term['relationships']) == 1
    assert term['relationships'][0] == 'UBERON:1'
    assert len(term['develops_from']) == 1
    assert term['develops_from'][0] == 'UBERON:2'


def test_process_blank_node(uberon_owler3):
    terms = {}
    for c in uberon_owler3.allclasses:
        terms = go.process_blank_node(c, uberon_owler3, terms)
    assert len(terms) == 1
    assert 'UBERON:0001772' in terms


def test_find_and_add_parent_of(uberon_owler4):
    tid = 'CL:0002553'
    terms = {tid: {'term_id': tid}}
    relids = ['UBERON:0002048', 'OBI:0000456', 'CL:0000058', 'CL:0000133']
    relation = None
    seen = False
    for c in uberon_owler4.allclasses:
        for _, p in enumerate(uberon_owler4.get_classDirectSupers(c, excludeBnodes=False)):
            if go.isBlankNode(p):
                has_part = False
                if not seen:
                    has_part = True
                    seen = True
                terms = go._find_and_add_parent_of(p, c, uberon_owler4, terms, has_part, relation)
    assert len(terms) == 2
    print(terms)
    for termid, term in terms.items():
        if termid == tid:
            assert len(term['relationships']) == 3
            for t in term['relationships']:
                assert t in relids
        else:
            assert termid in relids
            assert len(term['has_part_inverse']) == 1
            assert term['has_part_inverse'][0] == tid


def test_process_parents(uberon_owler4):
    tids = ['CL:0002553', 'CL:0000058']
    relids = ['OBI:0000456', 'UBERON:0002048']
    terms = {tids[0]: {'term_id': tids[0]}}
    for c in uberon_owler4.allclasses:
        terms = go.process_parents(c, uberon_owler4, terms)
    print(terms)
    assert len(terms) == 2
    term1 = terms[tids[0]]
    term2 = terms[tids[1]]
    assert term1['develops_from'][0] == 'CL:0000133'
    assert term1['parents'][0] == 'UBERON:0010313'
    assert len(term1['relationships']) == 2
    for r in relids:
        assert r in term1['relationships']
    assert term2['has_part_inverse'][0] == tids[0]


@pytest.fixture
def terms_w_stuff():
    return {
        'term1': {
            'term_id': 't1',
            'term_name': 'term1',
            'relationships': ['rel1', 'rel2'],
            'all_parents': ['p'],
            'development': 'd',
            'has_part_inverse': [],
            'develops_from': '',
            'part_of': ['p1'],
            'closure': [],
            'closure_with_develops_from': None
        },
        'term2': {
            'term_id': 't1',
            'term_name': 'term1'
        },
        'term3': {},
        'term4': None
    }


def test_cleanup_non_fields(terms_w_stuff):
    to_delete = ['relationships', 'all_parents', 'development',
                 'has_part_inverse', 'develops_from', 'part_of',
                 'closure', 'closure_with_develops_from']
    to_keep = ['term_id', 'term_name']
    for d in to_delete + to_keep:
        assert d in terms_w_stuff['term1']
    terms = go._cleanup_non_fields(terms_w_stuff)
    assert len(terms) == 2
    assert terms['term1'] == terms['term2']
    for d in to_delete:
        assert d not in terms['term1']
    for k in to_keep:
        assert k in terms['term1']


@pytest.fixture
def mock_get_synonyms():
    syn_lists = [[], ['syn1'], ['syn1', 'syn2']]
    with mock.patch('encoded.commands.generate_ontology.get_synonyms', side_effect=syn_lists) as mocked:
        yield mocked


@pytest.fixture
def mock_get_definitions():
    def_lists = [[], ['def1'], ['def1', 'def2']]
    with mock.patch('encoded.commands.generate_ontology.get_synonyms', side_effect=def_lists) as mocked:
        yield mocked


@pytest.fixture
def simple_terms():
    terms = {'t1': {'term_id': 't1', 'term_url': 'term1'},
             't2': {'term_id': 't2', 'term_url': 'term2'},
             't3': {'term_id': 't3', 'term_url': 'term3'}}
    return OrderedDict(sorted(terms.items(), key=lambda t: t[0]))


def test_add_additional_term_info(simple_terms):
    syn_lists = [[], ['syn1'], ['syn1', 'syn2']]
    def_lists = [[], ['def1'], ['def1', 'def2']]
    # terms = {'t1': {'term_id': 't1', 'term_url': 'term1'},
    #         't2': {'term_id': 't2', 'term_url': 'term2'},
    #         't3': {'term_id': 't3', 'term_url': 'term3'}}
    # terms = OrderedDict(sorted(terms.items(), key=lambda t: t[0]))
    with mock.patch('encoded.commands.generate_ontology.convert2URIRef', return_value='blah'):
        with mock.patch('encoded.commands.generate_ontology.get_synonyms', side_effect=syn_lists):
            with mock.patch('encoded.commands.generate_ontology.get_definitions', side_effect=def_lists):
                result = go.add_additional_term_info(simple_terms, 'data', 'synterms', 'defterms')
                for tid, term in result.items():
                    if tid == 't3':
                        assert 'UNK' in term['definitions']
                        assert 'def1' in term['definitions']['UNK']
                        assert 'def2' in term['definitions']['UNK']
                        assert len(term['synonyms']) == 2
                        assert 'syn1' in term['synonyms']
                        assert 'syn2' in term['synonyms']
                    elif tid == 't2':
                        assert 'UNK' in term['definitions']
                        assert 'def1' in term['definitions']['UNK']
                        assert len(term['synonyms']) == 1
                        assert term['synonyms'][0] == 'syn1'
                    else:
                        assert 'synonyms' not in term
                        assert 'definition' not in term


def test_write_outfile_pretty(simple_terms):
    filename = 'tmp_test_file'
    go.write_outfile(list(simple_terms.values()), filename, pretty=True)
    infile = open(filename, 'r')
    result = json.load(infile)
    print(result)
    for r in result:
        assert r in simple_terms.values()
    os.remove(filename)


def test_write_outfile_notpretty(simple_terms):
    print(simple_terms)
    filename = 'tmp_test_file'
    go.write_outfile(list(simple_terms.values()), filename)
    with open(filename, 'r') as infile:
        for line in infile:
            result = json.loads(line)
            for v in simple_terms.values():
                assert v in result
    os.remove(filename)


@pytest.fixture
def ontology_list():
    return [
        {'uuid': '1', 'ontology_name': 'ont1', 'ontology_prefix': 'TO'},
        {'uuid': '2', 'ontology_name': 'ont2', 'ontology_prefix': 'NN'}
    ]


@pytest.fixture
def matches(ontology_list):
    return [
        {'term_id': 'TO:t1', 'a': 1, 'b': 2, 'c': 3, 'source_ontologies': [ontology_list[0].get('uuid')]},
        {'term_id': 'TO:t1', 'a': 1, 'b': 2, 'c': 3, 'source_ontologies': [ontology_list[0].get('uuid')]}
    ]


def test_terms_match_identical(matches):
    assert go._terms_match(matches[0], matches[1])


def test_terms_match_w_parents(matches):
    t1 = matches[0]
    t2 = matches[1]
    p1 = ['OBI:01', 'EFO:01']
    p2 = [{'@id': '/ontology-terms/OBI:01/', 'display_title': 'blah'},
          {'@id': '/ontology-terms/EFO:01/', 'display_title': 'hah'}]
    t1['parents'] = p1
    t2['parents'] = p2
    assert go._terms_match(t1, t2)


def test_terms_match_unmatched_parents_1(matches):
    t1 = matches[0]
    t2 = matches[1]
    p1 = ['OBI:01', 'EFO:01']
    p2 = [{'@id': '/ontology-terms/OBI:01/', 'display_title': 'blah'}]
    t1['parents'] = p1
    t2['parents'] = p2
    assert not go._terms_match(t1, t2)


def test_terms_match_unmatched_parents_2(matches):
    t1 = matches[0]
    t2 = matches[1]
    p1 = ['OBI:01', 'EFO:01']
    p2 = [{'@id': '/ontology-terms/OBI:01/', 'display_title': 'blah'},
          {'@id': '/ontology-terms/EFO:02/', 'display_title': 'hah'}]
    t1['parents'] = p1
    t2['parents'] = p2
    assert not go._terms_match(t1, t2)


def test_terms_match_w_ontology(matches):
    t1 = matches[0]
    t2 = matches[1]
    o1 = '530016bc-8535-4448-903e-854af460b254'
    o2 = {'@id': '/ontologys/530016bc-8535-4448-903e-854af460b254/', 'display_title': 'blah'}
    t1['source_ontologies'] = [o1]
    t2['source_ontologies'] = [o2]
    assert go._terms_match(t1, t2)


@pytest.fixture
def ont_terms(matches, ontology_list):
    t2 = matches[1]
    t2['term_id'] = 'TO:t2'
    t2['parents'] = ['OBI:01', 'EFO:01']
    return {
        'TO:t1': matches[0],
        'TO:t2': t2,
        'NN:t3': {'term_id': 'NN:t3', 'x': 7, 'y': 8, 'z': 9, 'source_ontologies': [ontology_list[1]]}
    }


@pytest.fixture
def db_terms(ont_terms):
    db_terms = ont_terms.copy()
    db_terms['TO:t1']['uuid'] = '1234'
    db_terms['TO:t2']['uuid'] = '5678'
    del db_terms['TO:t2']['parents']
    del db_terms['NN:t3']
    for v in db_terms.values():
        v.update({'status': 'released'})
    return db_terms


def test_id_post_and_patch_filter(ont_terms, db_terms, ontology_list):
    id2chk = 'NN:t3'
    result = go.id_post_and_patch(ont_terms, db_terms, ontology_list)
    assert len(result[0]) == 1
    assert id2chk == result[0][0].get('term_id')
    assert id2chk in result[1]


def test_id_post_and_patch_no_filter(ont_terms, db_terms, ontology_list):
    tids = ['TO:t1', 'TO:t2', 'NN:t3']
    result = go.id_post_and_patch(ont_terms, db_terms, ontology_list, False)
    assert len(result[0]) == 3
    for t in result[0]:
        assert t.get('term_id') in tids
    for t in result[1]:
        assert t in tids


def test_id_post_and_patch_id_obs(ont_terms, db_terms, ontology_list):
    ''' term in db is no longer in ontology - tests that status of term will be set to obsolete'''
    db_terms['TO:t4'] = {
        'term_id': 'TO:t4',
        'source_ontologies': [{'uuid': '1', 'ontology_name': 'ont1', 'ontology_prefix': 'TO'}],
        'uuid': '7890',
        'status': 'released'}
    result = go.id_post_and_patch(ont_terms, db_terms, ontology_list)
    result_terms = result[0]
    assert len(result_terms) == 2
    assert '7890' in [tid.get('uuid') for tid in result_terms]
    for t in result_terms:
        if t.get('uuid') == '7890':
            assert t.get('status') == 'obsolete'


def test_id_post_and_patch_id_obs_simple(ont_terms, db_terms, ontology_list):
    db_terms['TO:t4'] = {
        'term_id': 'TO:t4',
        'source_ontologies': [{'uuid': '1', 'ontology_name': 'ont1', 'ontology_prefix': 'TO'}],
        'uuid': '7890',
        'status': 'released'}
    result = go.id_post_and_patch(ont_terms, db_terms, ontology_list, ontarg='1', simple=True)
    result_terms = result[0]
    assert len(result_terms) == 2
    assert '7890' in [tid.get('uuid') for tid in result_terms]
    for t in result_terms:
        if t.get('uuid') == '7890':
            assert t.get('status') == 'obsolete'


def test_id_post_and_patch_donot_obs(ont_terms, db_terms, ontology_list):
    db_terms['t4'] = {'term_id': 't4', 'source_ontologies': {'uuid': '1', 'ontology_name': 'ont1'}, 'uuid': '7890'}
    result = go.id_post_and_patch(ont_terms, db_terms, ontology_list, True, False)
    assert 't4' not in [t.get('term_id') for t in result[0]]


def test_order_terms_by_phasing_no_terms():
    assert not go.order_terms_by_phasing([], [])


def test_order_terms_by_phasing_no_new_terms(db_terms):
    term_list = db_terms.values()
    res = go.order_terms_by_phasing([], term_list)
    for r in res:
        assert r in term_list


def test_order_terms_by_phasing_only_new_terms(db_terms):
    id_list = db_terms.keys()
    term_list = db_terms.values()
    res = go.order_terms_by_phasing(id_list, term_list)
    assert len(res) == 4
    assert all([v in r for v in ['term_id', 'source_ontologies', 'uuid'] for r in res[:2]])
    assert all([v in r for v in ['a', 'b', 'c', 'status', 'uuid'] for r in res[2:]])


def test_order_terms_by_phasing_both_new_and_existing(db_terms):
    term_list = db_terms.values()
    new_id = list(term_list)[0].get('term_id')
    res = go.order_terms_by_phasing([new_id], term_list)
    assert len(res) == 3
    assert all([v in res[0] for v in ['term_id', 'source_ontologies', 'uuid']])
    assert all([v in r for v in ['a', 'b', 'c', 'status', 'uuid'] for r in res[1:]])


def valid_uuid(uid):
    validchars = '0123456789abcdef'
    uid = uid.replace('-', '')
    if len(uid) != 32:
        return False
    for c in uid:
        if c not in validchars:
            return False
    return True


@pytest.fixture
def embedded_dbterm():
    return {
        "synonyms": [
            "renal pelvis uroepithelium",
            "renal pelvis transitional epithelium",
            "pelvis of ureter uroepithelium",
            "renal pelvis urothelium",
            "kidney pelvis uroepithelium",
            "uroepithelium of pelvis of ureter",
            "urothelium of pelvis of ureter",
            "uroepithelium of kidney pelvis",
            "transitional epithelium of kidney pelvis",
            "transitional epithelium of renal pelvis",
            "urothelium of kidney pelvis",
            "uroepithelium of renal pelvis",
            "urothelium of renal pelvis",
            "kidney pelvis transitional epithelium",
            "pelvis of ureter urothelium"
        ],
        "preferred_name": "kidney pelvis urothelium",
        "references": [],
        "external_references": [],
        "status": "released",
        "term_name": "kidney pelvis urothelium",
        "submitted_by": {
            "principals_allowed": {
                "edit": [
                    "group.admin",
                    "userid.986b362f-4eb6-4a9c-8173-3ab267307e3a"
                ],
                "view": [
                    "group.admin",
                    "group.read-only-admin",
                    "remoteuser.EMBED",
                    "remoteuser.INDEXER",
                    "userid.986b362f-4eb6-4a9c-8173-3ab267307e3a"
                ]
            },
            "@id": "/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
            "@type": [
                "User",
                "Item"
            ],
            "uuid": "986b362f-4eb6-4a9c-8173-3ab267307e3a",
            "display_title": "4dn DCIC"
        },
        "display_title": "kidney pelvis urothelium",
        "schema_version": "1",
        "@type": [
            "OntologyTerm",
            "Item"
        ],
        "parents": [
            {
                "principals_allowed": {
                    "edit": [
                        "group.admin"
                    ],
                    "view": [
                        "system.Everyone"
                    ]
                },
                "@id": "/ontology-terms/UBERON:0001254/",
                "@type": [
                    "OntologyTerm",
                    "Item"
                ],
                "uuid": "38dbff69-aac7-46a4-837e-7340c2c5bcd5",
                "display_title": "urothelium of ureter"
            },
            {
                "principals_allowed": {
                    "edit": [
                        "group.admin"
                    ],
                    "view": [
                        "system.Everyone"
                    ]
                },
                "@id": "/ontology-terms/UBERON:0004819/",
                "@type": [
                    "OntologyTerm",
                    "Item"
                ],
                "uuid": "57ac2905-0533-43c9-988b-9add8c225a78",
                "display_title": "kidney epithelium"
            }
        ],
        "date_created": "2017-05-11T16:00:51.747446+00:00",
        "term_id": "UBERON:0004788",
        "source_ontology": {
            "uuid": "530016bc-8535-4448-903e-854af460b254",
            "display_title": "Uberon",
            "principals_allowed": {
                "edit": [
                    "group.admin"
                ],
                "view": [
                    "system.Everyone"
                ]
            },
            "@id": "/ontologys/530016bc-8535-4448-903e-854af460b254/",
            "@type": [
                "Ontology",
                "Item"
            ],
            "ontology_name": "Uberon"
        },
        "uuid": "e5e1690a-1a80-4e50-a3cf-58f2f269abd8",
        "term_url": "http://purl.obolibrary.org/obo/UBERON_0004788",
        "last_modified": {
            "date_modified": "2018-07-11T05:05:30.826642+00:00",
            "modified_by": {
                "principals_allowed": {
                    "edit": [
                        "group.admin",
                        "userid.986b362f-4eb6-4a9c-8173-3ab267307e3a"
                    ],
                    "view": [
                        "group.admin",
                        "group.read-only-admin",
                        "remoteuser.EMBED",
                        "remoteuser.INDEXER",
                        "userid.986b362f-4eb6-4a9c-8173-3ab267307e3a"
                    ]
                },
                "@id": "/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                "@type": [
                    "User",
                    "Item"
                ],
                "uuid": "986b362f-4eb6-4a9c-8173-3ab267307e3a",
                "display_title": "4dn DCIC"
            }
        },
        "principals_allowed": {
            "edit": [
                "group.admin"
            ],
            "view": [
                "system.Everyone"
            ]
        },
        "@id": "/ontology-terms/UBERON:0004788/",
        "slim_terms": [
            {
                "principals_allowed": {
                    "edit": [
                        "group.admin"
                    ],
                    "view": [
                        "system.Everyone"
                    ]
                },
                "term_name": "endoderm",
                "display_title": "endoderm",
                "is_slim_for": "developmental",
                "@id": "/ontology-terms/UBERON:0000925/",
                "@type": [
                    "OntologyTerm",
                    "Item"
                ],
                "uuid": "111121bc-8535-4448-903e-854af460a233"
            },
            {
                "principals_allowed": {
                    "edit": [
                        "group.admin"
                    ],
                    "view": [
                        "system.Everyone"
                    ]
                },
                "term_name": "kidney",
                "display_title": "kidney",
                "is_slim_for": "organ",
                "@id": "/ontology-terms/UBERON:0002113/",
                "@type": [
                    "OntologyTerm",
                    "Item"
                ],
                "uuid": "111167bc-8535-4448-903e-854af460a233"
            },
            {
                "principals_allowed": {
                    "edit": [
                        "group.admin"
                    ],
                    "view": [
                        "system.Everyone"
                    ]
                },
                "term_name": "ureter",
                "display_title": "ureter",
                "is_slim_for": "organ",
                "@id": "/ontology-terms/UBERON:0000056/",
                "@type": [
                    "OntologyTerm",
                    "Item"
                ],
                "uuid": "111148bc-8535-4448-903e-854af460a233"
            },
            {
                "principals_allowed": {
                    "edit": [
                        "group.admin"
                    ],
                    "view": [
                        "system.Everyone"
                    ]
                },
                "term_name": "renal system",
                "display_title": "renal system",
                "is_slim_for": "system",
                "@id": "/ontology-terms/UBERON:0001008/",
                "@type": [
                    "OntologyTerm",
                    "Item"
                ],
                "uuid": "111130bc-8535-4448-903e-854af460a233"
            },
            {
                "principals_allowed": {
                    "edit": [
                        "group.admin"
                    ],
                    "view": [
                        "system.Everyone"
                    ]
                },
                "term_name": "mesoderm",
                "display_title": "mesoderm",
                "is_slim_for": "developmental",
                "@id": "/ontology-terms/UBERON:0000926/",
                "@type": [
                    "OntologyTerm",
                    "Item"
                ],
                "uuid": "111120bc-8535-4448-903e-854af460a233"
            }
        ],
        "namespace": "http://purl.obolibrary.org/obo",
        "definition": "the epithelial lining of the luminal space of the kidney pelvis"
    }


def test_get_raw_form(embedded_dbterm):
    raw_term = go.get_raw_form(embedded_dbterm)
    print(raw_term)


def test_update_definition_double():
    prefix = 'EFO'
    tdef = 'here is EFO definition (EFO)'
    dbdef = 'here is outdated definition (EFO, OBI) and another def (SO)'
    newdef = go.update_definition(tdef, dbdef, prefix)
    assert tdef in newdef
    assert 'here is outdated definition (EFO, OBI)' not in newdef


def test_update_definition_single():
    prefix = 'EFO'
    tdef = 'here (ABL) is EFO definition (EFO)'
    dbdef = 'here (ABL) is outdated definition (EFO) and another (random abbrev) def (OBI, SO)'
    newdef = go.update_definition(tdef, dbdef, prefix)
    assert tdef in newdef
    assert newdef == 'here (ABL) is EFO definition (EFO) and another (random abbrev) def (OBI, SO)'
