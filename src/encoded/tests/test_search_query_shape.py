"""Focused, ES-free unit tests for search query-shaping efficiency fixes.

These cover the Fourfront-local ports of the snovault search #318 efficiency
fixes (see src/encoded/search.py):

* `get_all_subsequent_results` must not re-run aggregations or exact total-hit
  counting on the 2nd..Nth page of a ``limit=all`` scan.
* `list_source_fields` must not pull the (discarded) ``embedded.*`` blob into
  ``_source`` for object/raw frames, while preserving embedded-frame and
  explicit ``field=`` behavior exactly.

They intentionally avoid the ``workbook``/ES fixtures so they run in the plain
unit suite.
"""

import pytest

from elasticsearch_dsl import Search
from webob.multidict import MultiDict

from .. import search as search_module


pytestmark = [pytest.mark.working, pytest.mark.unit, pytest.mark.search]


def _search_with_aggs_and_total():
    """Build a DSL Search shaped like the first `limit=all` page: has aggs +
    exact total-hit tracking."""
    s = Search(index='x').query('match_all')
    s.aggs.bucket('all_items', 'global').bucket(
        'type', 'terms', field='embedded.@type.raw'
    )
    s = s.sort('embedded.uuid.raw')
    s = s.extra(track_total_hits=True)
    return s


def test_get_all_subsequent_results_omits_aggs_and_total(monkeypatch):
    captured = []

    def fake_execute_search(search):
        captured.append(search.to_dict())
        # One synthetic hit per page so the generator yields something.
        return {'hits': {'hits': [{'_id': 'hit'}]}}

    monkeypatch.setattr(search_module, 'execute_search', fake_execute_search)

    base_search = _search_with_aggs_and_total()
    hits = list(search_module.get_all_subsequent_results(
        initial_search_result={'hits': {'total': {'value': 250}, 'hits': []}},
        search=base_search,
        extra_requests_needed_count=2,
        size_increment=100,
    ))

    # Two subsequent pages were fetched, each yielding its single hit.
    assert len(captured) == 2
    assert len(hits) == 2

    for page, expected_from in zip(captured, (100, 200)):
        # Aggregations must NOT be recomputed on subsequent pages.
        assert 'aggs' not in page
        assert 'aggregations' not in page
        # Exact total-hit counting must be disabled on subsequent pages.
        assert page.get('track_total_hits') is False
        # Query, sort and pagination are otherwise preserved.
        assert page['query'] == {'match_all': {}}
        assert page['sort'] == ['embedded.uuid.raw']
        assert page['from'] == expected_from
        assert page['size'] == 100

    # The original (first-page) search object must be left untouched so its
    # aggregations/total are still available to the caller.
    original = base_search.to_dict()
    assert 'aggs' in original
    assert original.get('track_total_hits') is True


class _FakeParams:
    def __init__(self, fields):
        self._fields = list(fields)

    def getall(self, key):
        return self._fields if key == 'field' else []


class _FakeRequest:
    def __init__(self, fields=None):
        self.normalized_params = _FakeParams(fields or [])


@pytest.mark.parametrize('frame,expected', [
    ('embedded', ['embedded.*']),
    ('object', ['object.*']),
    ('raw', ['properties.*']),  # frame=raw maps to 'properties' in ES
])
def test_list_source_fields_frames(frame, expected):
    result = search_module.list_source_fields(_FakeRequest(), ['File'], frame)
    assert result == expected
    # Object/raw frames must NOT drag the embedded blob into _source.
    if frame != 'embedded':
        assert 'embedded.*' not in result


def test_list_source_fields_explicit_fields_unchanged():
    # When explicit field= params are given, behavior must be exactly as before:
    # always include @id/@type plus the requested embedded paths.
    req = _FakeRequest(fields=['accession', 'file_format.display_title'])
    result = search_module.list_source_fields(req, ['File'], 'embedded')
    assert result == [
        'embedded.@id',
        'embedded.@type',
        'embedded.accession',
        'embedded.file_format.display_title',
    ]


def test_list_source_fields_unknown_frame_defaults_to_embedded():
    # A non-standard frame falls through to the embedded default (unchanged).
    result = search_module.list_source_fields(_FakeRequest(), ['File'], 'bogus')
    assert result == ['embedded.*']
