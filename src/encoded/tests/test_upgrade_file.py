import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def file_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
    }


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
    file_1['file_format'] = 'bg'
    value = upgrader.upgrade('file_processed', file_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['file_format'] == file_formats['other'].get('uuid')
    assert ' FILE FORMAT: bg' in value['notes']
