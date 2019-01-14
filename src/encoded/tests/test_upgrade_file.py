import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def file_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
    }


@pytest.fixture
def file_w_extra_1(award, lab):
        return{
            "schema_version": '1',
            "award": award['@id'],
            "lab": lab['@id'],
            "file_format": "pairs",
            "extra_files": [{"file_format": "pairs_px2"}]
        }


@pytest.fixture
def file_wo_underscore_fields():
    return {
        "dataset_type": "in situ Hi-C",
        "assay_info": "Dpn II",
        "replicate_identifiers": ["Biorep 1, Techrep 1"],
        "biosource_name": "H1-hESC",
        "experiment_bucket": "processed files",
        "project_lab": "Some Lab"
    }


@pytest.fixture
def file_w_underscore_fields(file_wo_underscore_fields):
    fieldmap = {
        "dataset_type": "override_experiment_type",
        "assay_info": "override_assay_info",
        "replicate_identifiers": "override_replicate_info",
        "biosource_name": "override_biosource_name",
        "experiment_bucket": "override_experiment_bucket",
        "project_lab": "override_lab_name"
    }
    mod = {v: file_wo_underscore_fields.get(f) for f, v in fieldmap.items()}
    mod['override_replicate_info'] = mod['override_replicate_info'][0]
    return mod


def test_upgrade_vistrack_meta_one_repid(registry, file_wo_underscore_fields, file_w_underscore_fields):
    file_wo_underscore_fields['schema_version'] = '1'
    file_w_underscore_fields['schema_version'] = '2'
    del file_wo_underscore_fields['experiment_bucket']
    del file_w_underscore_fields['override_experiment_bucket']
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('file_vistrack', file_wo_underscore_fields, registry=registry,
                             current_version='1', target_version='2')
    for f, v in file_w_underscore_fields.items():
        assert f in value
        assert value.get(f) == v


def test_upgrade_vistrack_meta_multi_repids(registry, file_wo_underscore_fields, file_w_underscore_fields):
    file_wo_underscore_fields['schema_version'] = '1'
    file_w_underscore_fields['schema_version'] = '2'
    file_wo_underscore_fields['replicate_identifiers'] = ['Biorep 1, Techrep 1', 'Biorep 2, Techrep 1']
    file_w_underscore_fields['override_replicate_info'] = 'merged replicates'
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('file_vistrack', file_wo_underscore_fields, registry=registry,
                             current_version='1', target_version='2')
    for f, v in file_w_underscore_fields.items():
        assert f in value
        assert value.get(f) == v


def test_upgrade_file_processed_meta_multi_repids(registry, file_wo_underscore_fields, file_w_underscore_fields):
    file_wo_underscore_fields['schema_version'] = '2'
    file_w_underscore_fields['schema_version'] = '3'
    file_wo_underscore_fields['replicate_identifiers'] = ['Biorep 1, Techrep 1', 'Biorep 2, Techrep 1']
    file_w_underscore_fields['override_replicate_info'] = 'merged replicates'
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('file_processed', file_wo_underscore_fields, registry=registry,
                             current_version='2', target_version='3')
    for f, v in file_w_underscore_fields.items():
        assert f in value
        assert value.get(f) == v


def test_upgrade_file_format_known(
        registry, file_1, file_formats):
    type2format = {
        'file_fastq': 'fastq',
        'file_processed': 'pairs',
        'file_reference': 'chromsizes',
        'file_microscopy': 'tiff',
        'file_calibration': 'zip'
    }
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    for ftype, ff in type2format.items():
        file_1['file_format'] = ff
        value = upgrader.upgrade(ftype, file_1, registry=registry,
                                 current_version='1', target_version='2')
        assert value['schema_version'] == '2'
        assert value['file_format'] == file_formats[ff].get('uuid')


def test_upgrade_file_format_w_unknown_format(
        registry, file_1, file_formats):
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    file_1['file_format'] = 'hic'
    value = upgrader.upgrade('file_processed', file_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['file_format'] == file_formats['other'].get('uuid')
    assert ' FILE FORMAT: hic' in value['notes']


def test_upgrade_extrafile_formats_good_formats(
        registry, file_w_extra_1, file_formats):
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('file_processed', file_w_extra_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['extra_files'][0]['file_format'] == file_formats['pairs_px2'].get('uuid')


def test_upgrade_extrafile_format_w_unknown_format(
        registry, file_w_extra_1, file_formats):
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    file_w_extra_1['extra_files'] = [{'file_format': 'hic'}]
    value = upgrader.upgrade('file_processed', file_w_extra_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['extra_files'][0]['file_format'] == file_formats['other'].get('uuid')
    assert ' EXTRA FILE FORMAT: 0-hic' in value['notes']
