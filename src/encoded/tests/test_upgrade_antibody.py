import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def antibody_1(targ_w_alias):
    return{
        'schema_version': '1',
        'antibody_target': targ_w_alias.get('aliases')[0]
    }


def test_antibody_1_2(
        registry, targ_w_alias, biofeat_w_alias, antibody_1):
    ''' need to use registry to check items '''
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('antibody', antibody_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['antibody_target'][0] == biofeat_w_alias['uuid']
    assert targ_w_alias['aliases'][0] in value['notes']
