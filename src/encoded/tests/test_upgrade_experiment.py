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
    value = migrator.upgrade('experiment_repliseq', experiment_repliseq_1, current_version='1', target_version='4')
    assert value['schema_version'] == '4'
    assert value['experiment_type'] == '/experiment-types/repliseq/'


def test_experiment_chiapet_update_type(app, experiment_chiapet_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_chiapet', experiment_chiapet_1, current_version='1', target_version='4')
    assert value['schema_version'] == '4'
    assert value['experiment_type'] == '/experiment-types/chiapet/'


def test_experiment_seq_update_type(app, experiment_seq_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_seq', experiment_seq_1, current_version='1', target_version='4')
    assert value['schema_version'] == '4'
    assert value['experiment_type'] == '/experiment-types/chipseq/'


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
