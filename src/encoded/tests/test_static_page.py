import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def help_page_json():
    return {"name": "help/rest-api",
            "title": "The REST-API",
            "directory": "/docs/public/metadata-submission",
            "sections": [
                {
                    "title": "",
                    "filename": "rest_api_submission.md"
                }
            ],
            "table-of-contents": {
                "enabled": True,
                "header-depth": 4,
                "list-styles": ["decimal", "lower-alpha", "lower-roman"],
                "include-top-link": False,
                "skip-depth": 1
             }
            }


@pytest.fixture
def help_page(testapp, help_page_json):
    res = testapp.post_json('/page', help_page_json, status=201)
    return res.json['@graph'][0]


@pytest.fixture
def help_page_deleted(testapp, help_page_json):
    help_page_json['status'] = 'deleted'
    res = testapp.post_json('/page', help_page_json, status=201)
    return res.json['@graph'][0]


@pytest.fixture
def help_page_restricted(testapp, help_page_json):
    help_page_json['status'] = 'draft'
    res = testapp.post_json('/page', help_page_json, status=201)
    return res.json['@graph'][0]


def test_get_help_page(testapp, help_page):
    help_page_url = "/" + help_page['name']
    res = testapp.get(help_page_url, status=200)
    assert res.json['@id'] == help_page_url
    assert res.json['@context'] == help_page_url
    assert 'HelpPage' in res.json['@type']
    assert 'Rest-apiPage' in res.json['@type']
    assert 'StaticPage' in res.json['@type']
    assert res.json['content'] == help_page['content']
    assert res.json['toc'] == help_page['table-of-contents']


def test_get_help_page_deleted(anonhtmltestapp, help_page_deleted):
    help_page_url = "/" + help_page_deleted['name']
    anonhtmltestapp.get(help_page_url, status=403)


def test_get_help_page_no_access(anonhtmltestapp, testapp, help_page_restricted):
    help_page_url = "/" + help_page_restricted['name']
    anonhtmltestapp.get(help_page_url, status=403)
    testapp.get(help_page_url, status=200)
