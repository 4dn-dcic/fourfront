import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def imaging_path_1_w_3targs(targ_w_alias, targ_gr_w_alias, targ_agr_w_alias):
    ''' one target will not have a corresponding biofeature '''
    return{
        'target': [
            targ_w_alias.get('aliases')[0],
            targ_gr_w_alias.get('aliases')[0],
            targ_agr_w_alias.get('aliases')[0]
        ]
    }


def test_imaging_path_1_2(
        registry, targ_w_alias, biofeat_w_alias, targ_gr_w_alias,
        gr_biofeat_w_alias, targ_agr_w_alias, imaging_path_1_w_3targs
):
    ''' need to use registry to check items '''
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('imaging_path', imaging_path_1_w_3targs, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    aliases2chk = [targ_w_alias.get('aliases')[0], targ_gr_w_alias.get('aliases')[0], targ_agr_w_alias.get('aliases')[0]]
    uuids2chk = [biofeat_w_alias['uuid'], gr_biofeat_w_alias['uuid']]
    trs = value['target']
    for a2c in aliases2chk:
        assert a2c in value.get('notes')
    for tr in trs:
        assert tr in uuids2chk
    # check that the one target without the corresponding biofeature has special note
    assert 'UPDATE NEEDED {};'.format(targ_agr_w_alias.get('aliases')[0]) in value['notes']
