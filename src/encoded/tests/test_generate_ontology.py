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


# see ontology_term schema for full schema
test_slim_terms = [
    [{'term_id': 'd_term1', 'is_slim_for': 'developmental'},
     {'term_id': 'd_term2', 'is_slim_for': 'developmental'}],
    [{'term_id': 'a_term1', 'is_slim_for': 'assay'}],
    {'notification': 'No result found'},
    {'notification': 'No result found'}
]


def test_get_slim_terms(mocker, connection):
    present = ['developmental', 'assay']
    absent = ['organ', 'system']
    with mocker.patch('encoded.commands.generate_ontology.get_FDN',
                      side_effect=test_slim_terms):
        terms = go.get_slim_terms(connection)
        assert len(terms) == 3
        for term in terms:
            assert term['is_slim_for'] in present
            assert term['is_slim_for'] not in absent


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


def test_convert2namespace_slash(mocker):
    uri = 'http://www.ebi.ac.uk/efo/alternative_term'
    #mocker.patch.object(go, 'Namespace')
    #with mocker.patch('encoded.commands.generate_ontology.splitNameFromNamespace',
    #                  return_value=('http://www.ebi.ac.uk/efo', 'alternative_term')):
    ns = go.convert2namespace(uri)
    #assert isinstance(ns, go.Namespace)
    assert str(ns) == uri
