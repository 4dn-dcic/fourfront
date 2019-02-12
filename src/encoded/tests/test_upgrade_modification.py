import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def modification_1(targ_w_alias):
    return{
        'schema_version': '1',
        'target_of_mod': targ_w_alias.get('aliases')[0]
    }


def test_modification_1_2(
        registry, targ_w_alias, biofeat_w_alias, modification_1):
    ''' need to use registry to check items '''
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('modification', modification_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['target_of_mod'][0] == biofeat_w_alias['uuid']
    assert targ_w_alias['aliases'][0] in value['notes']
