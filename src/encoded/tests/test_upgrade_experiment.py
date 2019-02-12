import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def experiment_repliseq_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "repliseq"
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
        "antibody_lot_id": "1234"
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
        ('experiment_seq', '3', '4'),
        ('experiment_chiapet', '3', '4'),
        ('experiment_damid', '2', '3'),
        ('experiment_tsaseq', '1', '2')
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
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    aliases2chk = [targ_w_alias.get('aliases')[0], targ_gr_w_alias.get('aliases')[0]]
    uuids2chk = [biofeat_w_alias['uuid'], gr_biofeat_w_alias['uuid']]
    trs = value['targeted_regions']
    for a2c in aliases2chk:
        assert a2c in value.get('notes')
    for tr in trs:
        assert tr.get('target') in uuids2chk


def test_experiment_damid_upgrade_pcr_cycles(app, experiment_damid_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_damid', experiment_damid_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['pcr_cycles'] == 5
    assert 'index_pcr_cycles' not in value
    assert 'fusion' not in value
    assert 'LaminB' in value['notes']


def test_experiment_repliseq_update_type(app, experiment_repliseq_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_repliseq', experiment_repliseq_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['experiment_type'] == 'Repli-seq'


def test_experiment_chiapet_update_type(app, experiment_chiapet_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_chiapet', experiment_chiapet_1, current_version='1', target_version='3')
    assert value['schema_version'] == '3'
    assert value['experiment_type'] == 'ChIA-PET'


def test_experiment_seq_update_type(app, experiment_seq_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_seq', experiment_seq_1, current_version='1', target_version='3')
    assert value['schema_version'] == '3'
    assert value['experiment_type'] == 'ChIP-seq'


def test_experiment_mic_update_type(app, experiment_mic_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_mic', experiment_mic_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['experiment_type'] == 'DNA FISH'


def test_experiment_repliseq_update_antibody(app, experiment_repliseq_2):
    ab = experiment_repliseq_2['antibody']
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_repliseq', experiment_repliseq_2, current_version='2', target_version='3')
    assert value['schema_version'] == '3'
    assert not value.get('antibody')
    assert ab in value['notes']
    assert value['antibody_lot_id'] == "1234"


def test_experiment_chiapet_update_antibody(app, experiment_chiapet_1):
    ab = experiment_chiapet_1['antibody']
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_chiapet', experiment_chiapet_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert not value.get('antibody')
    assert ab in value['notes']


def test_experiment_seq_update_antibody(app, experiment_seq_1):
    ab = experiment_seq_1['antibody']
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_seq', experiment_seq_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert not value.get('antibody')
    assert ab in value['notes']
