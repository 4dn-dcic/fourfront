"""Focused, ES-free unit tests for search query shaping and complete scans.

These cover the Fourfront-local ports of the snovault search #318 efficiency
fixes (see src/encoded/search.py):

* ``limit=all`` must use stable ``search_after`` pagination, return more than
  10,000 hits, and avoid repeated aggregations/total counts.
* `list_source_fields` must not pull the (discarded) ``embedded.*`` blob into
  ``_source`` for object/raw frames, while preserving embedded-frame and
  explicit ``field=`` behavior exactly.

They intentionally avoid the ``workbook``/ES fixtures so they run in the plain
unit suite.
"""

import pytest

from elasticsearch_dsl import Search
from pyramid.httpexceptions import HTTPBadRequest

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


def test_get_all_subsequent_results_uses_cursor_without_aggs_or_total(monkeypatch):
    captured = []
    page_number = 0

    def fake_execute_search(search):
        nonlocal page_number
        captured.append(search.to_dict())
        page_number += 1
        page_size = 100 if page_number == 1 else 1
        return {
            'hits': {
                'hits': [
                    {
                        '_id': str(page_number * 100 + index),
                        'sort': [page_number, index],
                    }
                    for index in range(page_size)
                ]
            }
        }

    monkeypatch.setattr(search_module, 'execute_search', fake_execute_search)

    base_search = _search_with_aggs_and_total()
    initial_hits = [
        {'_id': str(index), 'sort': [0, index]}
        for index in range(100)
    ]
    hits = list(search_module.get_all_subsequent_results(
        initial_hits=initial_hits,
        search=base_search,
        size_increment=100,
    ))

    # A full page is followed by another full page, then a final partial page.
    assert len(captured) == 2
    assert len(hits) == 101

    for page in captured:
        # Aggregations must NOT be recomputed on subsequent pages.
        assert 'aggs' not in page
        assert 'aggregations' not in page
        # Exact total-hit counting must be disabled on subsequent pages.
        assert page.get('track_total_hits') is False
        # Query and sort are preserved, and no deep `from` offset is used.
        assert page['query'] == {'match_all': {}}
        assert page['sort'] == ['embedded.uuid.raw']
        assert 'from' not in page
        assert page['size'] == 100
    assert captured[0]['search_after'] == [0, 99]
    assert captured[1]['search_after'] == [1, 99]

    # The original (first-page) search object must be left untouched so its
    # aggregations/total are still available to the caller.
    original = base_search.to_dict()
    assert 'aggs' in original
    assert original.get('track_total_hits') is True


def test_execute_search_for_all_results_is_complete_beyond_10000(monkeypatch):
    total_hits = 10050
    chunk_size = 1000
    captured = []

    def fake_execute_search(search):
        body = search.to_dict()
        captured.append(body)
        cursor = body.get('search_after')
        start = int(cursor[-1]) + 1 if cursor else 0
        stop = min(start + body['size'], total_hits)
        hits = [
            {
                '_id': str(index),
                '_source': {'embedded': {'uuid': str(index)}},
                'sort': [0, str(index)],
            }
            for index in range(start, stop)
        ]
        # Model the ES7 cap unless the caller explicitly requests an exact
        # first-page total.
        reported_total = (
            total_hits if body.get('track_total_hits') is True else 10000
        )
        return {
            'hits': {
                'total': {
                    'value': reported_total,
                    'relation': (
                        'eq' if reported_total == total_hits else 'gte'
                    ),
                },
                'hits': hits,
            },
            'aggregations': {'all_items': {'doc_count': total_hits}},
        }

    monkeypatch.setattr(search_module, 'execute_search', fake_execute_search)
    base_search = Search(index='x').query('match_all').sort(
        {'embedded.date_created.raw': {'order': 'desc'}}
    )
    base_search.aggs.bucket('all_items', 'global')

    result = search_module.execute_search_for_all_results(
        base_search,
        chunk_size=chunk_size,
    )
    hits = list(result['hits']['hits'])

    assert result['hits']['total'] == {'value': total_hits, 'relation': 'eq'}
    assert len(hits) == total_hits
    assert hits[-1]['_id'] == str(total_hits - 1)
    assert captured[0]['track_total_hits'] is True
    assert 'aggs' in captured[0]
    assert captured[0]['sort'][-1] == {'uuid': {'order': 'asc'}}
    assert all(page['track_total_hits'] is False for page in captured[1:])
    assert all('aggs' not in page for page in captured[1:])
    assert all('from' not in page for page in captured[1:])
    assert captured[1]['search_after'] == [0, '999']


def test_execute_search_for_all_results_raises_on_first_page_shard_failure(monkeypatch):
    # A partial shard failure on the very first page returns a short hits array
    # with a plausible total; the scan must fail loudly instead of silently
    # truncating.
    def fake_execute_search(search):
        return {
            '_shards': {'total': 5, 'successful': 4, 'failed': 1},
            'hits': {
                'total': {'value': 3, 'relation': 'eq'},
                'hits': [
                    {'_id': str(index), '_source': {'embedded': {}}, 'sort': [0, index]}
                    for index in range(3)
                ],
            },
            'aggregations': {'all_items': {'doc_count': 3}},
        }

    monkeypatch.setattr(search_module, 'execute_search', fake_execute_search)
    base_search = Search(index='x').query('match_all').sort('embedded.uuid.raw')
    base_search.aggs.bucket('all_items', 'global')

    with pytest.raises(HTTPBadRequest, match='shards failed'):
        result = search_module.execute_search_for_all_results(base_search, chunk_size=100)
        list(result['hits']['hits'])


def test_get_all_subsequent_results_raises_on_midscan_shard_failure(monkeypatch):
    page_number = 0

    def fake_execute_search(search):
        nonlocal page_number
        page_number += 1
        if page_number == 1:
            return {
                'hits': {
                    'hits': [
                        {'_id': str(index), 'sort': [1, index]}
                        for index in range(100)
                    ],
                },
            }
        return {
            '_shards': {'total': 5, 'successful': 4, 'failed': 1},
            'hits': {
                'hits': [
                    {'_id': str(200 + index), 'sort': [2, index]}
                    for index in range(100)
                ],
            },
        }

    monkeypatch.setattr(search_module, 'execute_search', fake_execute_search)
    initial_hits = [{'_id': str(index), 'sort': [0, index]} for index in range(100)]

    with pytest.raises(HTTPBadRequest, match='shards failed'):
        list(search_module.get_all_subsequent_results(
            initial_hits=initial_hits,
            search=_search_with_aggs_and_total(),
            size_increment=100,
        ))


def test_get_all_subsequent_results_fails_without_cursor(monkeypatch):
    monkeypatch.setattr(
        search_module,
        'execute_search',
        lambda search: pytest.fail(
            "Elasticsearch must not be called without a cursor"
        ),
    )
    first_page = {
        'hits': {
            'hits': [{'_id': str(index)} for index in range(2)],
        },
    }
    with pytest.raises(HTTPBadRequest, match='stable pagination cursor'):
        list(search_module.get_all_subsequent_results(
            first_page['hits']['hits'],
            Search(index='x').sort('_id'),
            size_increment=2,
        ))


def test_get_all_subsequent_results_fails_on_repeated_cursor(monkeypatch):
    repeated_page = [
        {'_id': str(index), 'sort': [0, index]}
        for index in range(2)
    ]
    monkeypatch.setattr(
        search_module,
        'execute_search',
        lambda search: {'hits': {'hits': repeated_page}},
    )

    with pytest.raises(HTTPBadRequest, match='same pagination cursor twice'):
        list(search_module.get_all_subsequent_results(
            repeated_page,
            Search(index='x').sort('_id'),
            size_increment=2,
        ))


@pytest.mark.parametrize('partial_flag', ['timed_out', 'terminated_early'])
@pytest.mark.parametrize('page_number', [1, 2])
def test_scan_rejects_partial_pages_without_shard_failures(monkeypatch, partial_flag, page_number):
    calls = 0

    def execute(search):
        nonlocal calls
        calls += 1
        return {
            partial_flag: calls == page_number,
            '_shards': {'total': 1, 'successful': 1, 'failed': 0},
            'hits': {
                'total': {'value': 2, 'relation': 'eq'},
                'hits': [{'_id': str(calls), 'sort': [calls]}],
            },
        }

    monkeypatch.setattr(search_module, 'execute_search', execute)
    with pytest.raises(HTTPBadRequest, match='incomplete'):
        result = search_module.execute_search_for_all_results(Search(), chunk_size=1)
        list(result['hits']['hits'])
    assert calls == page_number


@pytest.mark.parametrize('sort', ['uuid', '-uuid', {'uuid': {'order': 'desc'}}])
def test_uuid_tiebreaker_is_not_duplicated(sort):
    search = Search().sort(sort)
    assert search_module._search_with_stable_tiebreaker(search).to_dict() == search.to_dict()


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


def test_nonembedded_facets_do_not_add_empty_global_aggregation():
    search = Search(index='x').query('match_all')
    result = search_module.set_facets(
        search=search,
        facets=[('status', {'title': 'Status'})],
        search_filters={},
        string_query=None,
        request=object(),
        doc_types=['File'],
        search_frame='object',
    )
    assert 'aggs' not in result.to_dict()
