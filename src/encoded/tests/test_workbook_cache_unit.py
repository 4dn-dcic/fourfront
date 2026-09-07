"""Credential-free coverage for deterministic workbook reconciliation."""

from types import SimpleNamespace
from unittest import mock

from snovault import COLLECTIONS, STORAGE

from . import conftest as portal_conftest


def _response(payload):
    return SimpleNamespace(json=payload)


def test_workbook_reconciles_missing_uuids_synchronously():
    queue_result = {
        'indexing_count': 40,
        'errors': [],
        'indexing_content': {
            'initial_queue_status': {'primary_waiting': 40},
            'finished_queue_status': {'primary_waiting': 0},
        },
    }
    sync_result = {
        'indexing_count': 1,
        'errors': [],
        'indexing_content': {},
    }
    testapp = mock.Mock()
    testapp.post_json.side_effect = [
        _response(queue_result),
        _response(sync_result),
    ]
    testapp.get.return_value = _response({'db_es_total': 'DB 41 ES 40'})

    with mock.patch.object(
        portal_conftest.webtest,
        'TestApp',
        return_value=testapp,
    ):
        with mock.patch.object(portal_conftest, 'load_all', return_value=None):
            with mock.patch.object(
                portal_conftest.WorkbookCache,
                '_workbook_index_delta',
                side_effect=[
                    ({'missing-uuid'}, set()),
                    (set(), set()),
                ],
            ):
                result = portal_conftest.WorkbookCache.make_fresh_workbook(
                    mock.Mock()
                )

    assert result is True
    assert testapp.post_json.call_args_list == [
        mock.call('/index', {'record': True}),
        mock.call('/index', {
            'record': True,
            'uuids': ['missing-uuid'],
        }),
    ]


def test_workbook_index_delta_uses_concrete_collection_types():
    class StorageSide:
        def __init__(self, uuids):
            self.uuids = uuids
            self.requested_types = None

        def __iter__(self, *item_types):
            self.requested_types = item_types
            return iter(self.uuids)

    write = StorageSide(['shared', 'missing'])
    read = StorageSide(['shared', 'extra'])
    storage = SimpleNamespace(write=write, read=read)
    collections = SimpleNamespace(
        by_item_type={'workflow': object(), 'software': object()}
    )
    es_app = SimpleNamespace(registry={
        STORAGE: storage,
        COLLECTIONS: collections,
    })

    missing, extra = portal_conftest.WorkbookCache._workbook_index_delta(es_app)

    assert missing == {'missing'}
    assert extra == {'extra'}
    assert set(write.requested_types) == {'workflow', 'software'}
    assert set(read.requested_types) == {'workflow', 'software'}
