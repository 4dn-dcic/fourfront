import pytest
pytestmark = pytest.mark.working

def test_experiment_update_experiment_relation(testapp, base_experiment, experiment):
    relation = [{'relationship_type': 'controlled by',
                 'experiment': experiment['@id']
                }]
    res = testapp.patch_json(base_experiment['@id'], {'experiment_relation': relation})
    assert res.json['@graph'][0]['experiment_relation'] == relation

    #patching an experiement should also update the related experiement
    exp_res = testapp.get(experiment['@id'])

    exp_relation = [{'relationship_type': 'control for',
                 'experiment': base_experiment['@id']
                }]
    assert exp_res.json['experiment_relation'] == exp_relation

def test_experiment_hic_sop_map(testapp, experiment_data, sop_map):
    res = testapp.post_json('/experiment_hic', experiment_data)
    assert 'sop_mapping' in res.json['@graph'][0]

