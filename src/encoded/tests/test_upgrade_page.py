import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def page_1():
    return {
        "name":"help/web-submission",
        "uuid":"251d6d2b-4ed0-4fbe-b8b1-eaa49569187b",
        "title":"Online Submissions",
        "directory":"/docs/public/metadata-submission",
        "sections":[
            {
                "title":"",
                "filename":"web_submission.md"
            }
        ],
        "table-of-contents":{
            "enabled":True,
            "header-depth":4,
            "list-styles":[
                "decimal",
                "lower-alpha",
                "lower-roman"
            ],
            "include-top-link":False,
            "skip-depth":1
        }
    }


def test_page_upgrade_1_2(app, page_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('page', page_1, current_version='1', target_version='2')

    assert value['schema_version'] == '2'
    assert value.get('sections') is None
    assert value.get('directory') is None
    assert isinstance(value.get('content'), list) is True
    assert "help.web-submission#web_submission" in value.get('content')
