"""Exercise export routes, mocking only the search result stream."""

import csv
import io

import pytest

from .. import batch_download

pytestmark = [pytest.mark.working, pytest.mark.setone]


def rows(response):
    return list(csv.reader(io.StringIO(response.body.decode('utf-8')), delimiter='\t'))


@pytest.mark.parametrize('query,expected_fields', [
    ('type=Document', None),
    ('type=document&frame=raw', None),
    ('type=Document&field=lab.display_title', ['lab.display_title']),
])
@pytest.mark.parametrize('items', [[], [{'display_title': '=1+1', 'status': 'released'}]])
def test_report_route_initializes_schema_and_bounds_fields(testapp, monkeypatch, query, expected_fields, items):
    calls = []

    def search(context, request):
        calls.append(request.GET.getall('field'))
        assert request.GET['limit'] == 'all'
        assert request.normalized_params.getall('type') == ['Document']
        return iter(items)

    monkeypatch.setattr(batch_download, 'iter_search_results', search)
    response = testapp.get('/report.tsv?' + query, status=200)
    rendered = rows(response)
    assert len(rendered) == len(items) + 1
    assert len(calls) == 1
    if expected_fields:
        assert calls[0] == expected_fields
    else:
        assert 'display_title' in calls[0]
        assert '*' not in calls[0]
    if items:
        assert rendered[1][rendered[0].index('Title')] == "'=1+1"
        assert len(rendered[0]) == len(rendered[1])


@pytest.mark.parametrize('query', ['', 'type=Missing', 'type=Document&type=Lab'])
def test_report_rejects_bad_types_without_search(testapp, monkeypatch, query):
    monkeypatch.setattr(batch_download, 'iter_search_results', lambda *args: pytest.fail('must not search'))
    testapp.get('/report.tsv?' + query, status=400)


def test_metadata_summary_cells_are_neutralized_too(testapp, monkeypatch):
    file_item = {
        'accession': '=1+1',
        'href': '/files/one/@@download/one.txt',
        'status': 'restricted',
        'file_format': {'display_title': 'txt'},
    }
    monkeypatch.setattr(batch_download, 'get_iterable_search_results', lambda *args: iter([file_item]))
    monkeypatch.setitem(batch_download.endpoints_initialized, 'metadata', True)
    rendered = rows(testapp.get('/metadata/?type=File', status=200))
    details = [row for row in rendered if len(row) > 1 and row[1] == "'    - Details:"]
    assert details
    assert details[0][2] == "'=1+1.txt"
