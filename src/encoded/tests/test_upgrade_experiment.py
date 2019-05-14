import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working]


@pytest.fixture
def experiment_repliseq_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "repliseq",
        "total_fractions_in_exp": 2
    }


@pytest.fixture
def experiment_chiapet_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "CHIA-pet",
        "antibody": "ENCAB1234567"
    }


@pytest.fixture
def experiment_seq_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "CHIP-seq",
        "antibody": "ENCAB1234567"
    }


@pytest.fixture
def experiment_repliseq_2(award, lab):
    return{
        "schema_version": '2',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "Repli-seq",
        "antibody": "ENCAB1234567",
        "antibody_lot_id": "1234",
        "total_fractions_in_exp": 16
    }


@pytest.fixture
def experiment_damid_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "DAM-ID seq",
        "index_pcr_cycles": 5,
        "fusion": 'LaminB'
    }


@pytest.fixture
def experiment_mic_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "DNA-FiSH",
    }


@pytest.fixture
def experiment_n(targ_w_alias):
    return{
        'targeted_factor': targ_w_alias.get('aliases')[0]
    }


@pytest.fixture
def experiment_dilution_hic_1(award, lab):
    return {
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "dilution Hi-C",
    }


@pytest.fixture
def experiment_capc_w2targs(targ_w_alias, targ_gr_w_alias, file_fastq):
    return{
        'schema_version': '1',
        'targeted_regions': [
            {'target': targ_w_alias.get('aliases')[0],
             'oligo_file': file_fastq['@id']},
            {'target': targ_gr_w_alias.get('aliases')[0]}
        ]
    }


def test_experiment_convert_targeted_factor_to_biofeat(
        registry, targ_w_alias, biofeat_w_alias, experiment_n):
    ''' need to use registry to check items '''
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    upgrade_info = [
        ('experiment_seq', '4', '5'),
        ('experiment_chiapet', '4', '5'),
        ('experiment_damid', '3', '4'),
        ('experiment_tsaseq', '2', '3')
    ]
    for upg in upgrade_info:
        test_expt = experiment_n.copy()
        test_expt['schema_version'] = upg[1]
        value = upgrader.upgrade(upg[0], test_expt, registry=registry,
                                 current_version=upg[1], target_version=upg[2])
        assert value['schema_version'] == upg[2]
        assert value['targeted_factor'][0] == biofeat_w_alias['uuid']
        assert targ_w_alias['aliases'][0] in value['notes']


def test_experiment_capture_c_target_to_biofeat(
        registry, targ_w_alias, biofeat_w_alias, targ_gr_w_alias,
        gr_biofeat_w_alias, experiment_capc_w2targs
):
    ''' need to use registry to check items '''
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('experiment_capture_c', experiment_capc_w2targs, registry=registry,
                             current_version='2', target_version='3')
    assert value['schema_version'] == '3'
    aliases2chk = [targ_w_alias.get('aliases')[0], targ_gr_w_alias.get('aliases')[0]]
    uuids2chk = [biofeat_w_alias['uuid'], gr_biofeat_w_alias['uuid']]
    trs = value['targeted_regions']
    for a2c in aliases2chk:
        assert a2c in value.get('notes')
    for tr in trs:
        for t in tr.get('target'):
            assert t in uuids2chk


@pytest.fixture
def experiment_hic_new_type_1(award, lab):
    return {
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "special new Hi-C",
    }


def test_experiment_damid_upgrade_pcr_cycles(app, experiment_damid_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_damid', experiment_damid_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['pcr_cycles'] == 5
    assert 'index_pcr_cycles' not in value
    assert 'fusion' not in value
    assert 'LaminB' in value['notes']


def test_experiment_damid_update_type(registry, experiment_damid_1, exp_types):
    upgrader = registry['upgrader']
    value = upgrader.upgrade('experiment_damid', experiment_damid_1, registry=registry,
                             current_version='1', target_version='3')
    assert value['schema_version'] == '3'
    assert value['experiment_type'] == exp_types['dam']['uuid']


def test_experiment_repliseq_2stage_update_type(registry, experiment_repliseq_1, exp_types):
    upgrader = registry['upgrader']
    value = upgrader.upgrade('experiment_repliseq', experiment_repliseq_1, registry=registry,
                             current_version='1', target_version='4')
    assert value['schema_version'] == '4'
    assert value['experiment_type'] == exp_types['repliseq']['uuid']


def test_experiment_repliseq_multi_update_type(registry, experiment_repliseq_2, exp_types):
    migrator = registry['upgrader']
    value = migrator.upgrade('experiment_repliseq', experiment_repliseq_2, registry=registry,
                             current_version='2', target_version='4')
    assert value['schema_version'] == '4'
    assert value['experiment_type'] == exp_types['multi']['uuid']


def test_experiment_chiapet_update_type(registry, experiment_chiapet_1, exp_types):
    migrator = registry['upgrader']
    value = migrator.upgrade('experiment_chiapet', experiment_chiapet_1, registry=registry,
                             current_version='1', target_version='4')
    assert value['schema_version'] == '4'
    assert value['experiment_type'] == exp_types['chia']['uuid']


def test_experiment_seq_update_type(registry, experiment_seq_1, exp_types):
    upgrader = registry['upgrader']
    value = upgrader.upgrade('experiment_seq', experiment_seq_1, registry=registry,
                             current_version='1', target_version='4')
    assert value['schema_version'] == '4'
    assert value['experiment_type'] == exp_types['chipseq']['uuid']


def test_experiment_mic_update_type(registry, experiment_mic_1, exp_types):
    migrator = registry['upgrader']
    value = migrator.upgrade('experiment_mic', experiment_mic_1, registry=registry,
                             current_version='1', target_version='3')
    assert value['schema_version'] == '3'
    assert value['experiment_type'] == exp_types['fish']['uuid']


def test_dilution_hic_update_type(registry, experiment_dilution_hic_1, exp_types):
    ''' there is a captilization difference between string type and item title'''
    migrator = registry['upgrader']
    value = migrator.upgrade('experiment_hi_c', experiment_dilution_hic_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['experiment_type'] == exp_types['dilution']['uuid']


def test_expt_w_unknown_experiment_type(registry, experiment_hic_new_type_1, exp_types):
    migrator = registry['upgrader']
    value = migrator.upgrade('experiment_hi_c', experiment_hic_new_type_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert 'special new Hi-C ITEM NOT FOUND' in value['notes']
    assert value['experiment_type'] is None


def test_experiment_repliseq_update_antibody(app, experiment_repliseq_2):
    ab = experiment_repliseq_2['antibody']
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_repliseq', experiment_repliseq_2,
                             current_version='2', target_version='3')
    assert value['schema_version'] == '3'
    assert not value.get('antibody')
    assert ab in value['notes']
    assert value['antibody_lot_id'] == "1234"


def test_experiment_chiapet_update_antibody(app, experiment_chiapet_1):
    ab = experiment_chiapet_1['antibody']
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_chiapet', experiment_chiapet_1,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert not value.get('antibody')
    assert ab in value['notes']


def test_experiment_seq_update_antibody(app, experiment_seq_1):
    ab = experiment_seq_1['antibody']
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_seq', experiment_seq_1,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert not value.get('antibody')
    assert ab in value['notes']
