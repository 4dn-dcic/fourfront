import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def workflow_run_1():
    return {
        "uuid": "3b7066ef-f9e4-43ce-85b5-a994a15bbcaf",
        "lab": "4dn-dcic-lab",
        "award": "1U01CA200059-01",
        "workflow": "c77a117b-9a58-477e-aaa5-291a109a99f6",
        "run_status": "complete",
        "status": "in review by lab",
        "metadata_only": True,
        "input_files": [
            {
                "ordinal": 1,
                "value": "4ecd9cfb-369b-4f8e-866c-cfb2cc3c8ad2",
                "workflow_argument_name": "inputs",
                "format_if_extra": "pairs_px2"
            }
        ],
        "title": "Some md5 workflow run on an extra file",
        "output_files": [
            {
                "type": "Output report file",
                "workflow_argument_name": "report"
            }
        ]
    }


def test_workflow_run_upgrade_1_2(workflow_run_1, registry, file_formats):
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('workflow_run', workflow_run_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    ef_format = value['input_files'][0].get('format_if_extra')
    assert ef_format == file_formats['pairs_px2'].get('uuid')


def test_workflow_run_upgrade_1_2_bad_file_format(workflow_run_1, registry):
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('workflow_run', workflow_run_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert not value['input_files'][0].get('format_if_extra')
    assert value['input_files'][0].get('notes') == ' EXTRA_FILE_FORMAT: pairs_px2 NOT FOUND'
