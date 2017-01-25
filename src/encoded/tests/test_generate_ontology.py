import os
import pytest
pytestmark = pytest.mark.working
from encoded.commands import generate_ontology as go
# TODO: move /deploy to src/encoded.commands and write tests for deployment
# from encoded.commands import beanstalk_deploy


def test_parse_args_defaults():
    args = ''
    args = go.parse_args(args)
    assert args.ontologies == 'all'
    assert args.keyfile == os.path.expanduser('~/keypairs.json')
    assert args.key == 'default'


# def test_connect2server():
    # keypath = 'data/documents/keypairs.json'
    # keyname = 'default'
    # connection = go.connect2server(keypath, keyname)
    # assert(connection)


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
