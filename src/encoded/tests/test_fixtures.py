import pytest
import webtest

from unittest import mock

from ..tests import conftest_settings


# in cgap these are marked broken -kmp 24-Feb-2021
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema, pytest.mark.indexing]


@pytest.yield_fixture(scope='session')
def minitestdata(app, conn):
    tx = conn.begin_nested()

    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = webtest.TestApp(app, environ)

    item = {
        'name': 'human',
        'scientific_name': 'Homo sapiens',
        'taxon_id': '9606',
    }
    testapp.post_json('/organism', item, status=201)

    yield
    tx.rollback()



@pytest.yield_fixture(scope='session')
def minitestdata2(app, conn):
    tx = conn.begin_nested()

    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = webtest.TestApp(app, environ)

    item = {
        'name': 'human',
        'scientific_name': 'Homo sapiens',
        'taxon_id': '9606',
    }
    testapp.post_json('/organism', item, status=201)

    yield
    tx.rollback()


@pytest.mark.usefixtures('minitestdata')
def test_fixtures1(testapp):
    """ This test is not really exhaustive.

    Still need to inspect the sql log to verify fixture correctness.
    """
    res = testapp.get('/organism').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 1

    # Trigger an error
    item = {'foo': 'bar'}
    res = testapp.post_json('/organism', item, status=422)
    assert res.json['errors']

    res = testapp.get('/organism').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 1

    item = {
        'name': 'mouse',
        'scientific_name': 'Mus musculus',
        'taxon_id': '10090',
    }
    testapp.post_json('/organism', item, status=201)

    res = testapp.get('/organism').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 2

    # Trigger an error
    item = {'foo': 'bar'}
    res = testapp.post_json('/organism', item, status=422)
    assert res.json['errors']

    res = testapp.get('/organism').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 2


def test_fixtures2(minitestdata2, testapp):
    # http://stackoverflow.com/questions/15775601/mutually-exclusive-fixtures
    res = testapp.get('/organisms/')
    items = res.json['@graph']
    assert len(items) == 1


def test_order_complete(app, conn):
    order_source_module = conftest_settings
    # TODO: This could use a doc string or comment. -kent & eric 29-Jun-2020
    print("original order_source_module.ORDER =", order_source_module.ORDER)
    print("original len(order_source_module.ORDER) =", len(order_source_module.ORDER))
    assert "access_key" not in order_source_module.ORDER
    print("confirmed: 'access_key' is NOT in ORDER")
    order_for_testing = order_source_module.ORDER + ["access_key"]
    assert order_source_module.ORDER is not order_for_testing
    assert len(order_for_testing) == len(order_source_module.ORDER) + 1
    with mock.patch.object(order_source_module, "ORDER", order_for_testing):
        print("=" * 24, "binding ORDER to add 'access_key'", "=" * 24)
        print("mocked order_source_module.ORDER =", order_source_module.ORDER)
        print("len(mocked order_source_module.ORDER) =", len(order_source_module.ORDER))
        assert "access_key" in order_source_module.ORDER
        print("confirmed: 'access_key' IS in ORDER")
        patched_order = order_source_module.ORDER
        environ = {
            'HTTP_ACCEPT': 'application/json',
            'REMOTE_USER': 'TEST',
        }
        testapp = webtest.TestApp(app, environ)
        master_types = []
        profiles = testapp.get('/profiles/?frame=raw').json
        print("constructing master_types from /profiles/?frame=raw")
        for a_type in profiles:
            if profiles[a_type].get('id') and profiles[a_type]['isAbstract'] is False:
                schema_name = profiles[a_type]['id'].split('/')[-1][:-5]
                master_types.append(schema_name)
        print("patched_order=", patched_order)
        print("master_types=", master_types)
        print("len(patched_order)=", len(patched_order))
        print("len(master_types)=", len(master_types))

        missing_types = [i for i in master_types if i not in patched_order]
        extra_types = [i for i in patched_order if i not in master_types]
        print("missing_types=", missing_types)
        print("extra_types=", extra_types)

        assert missing_types == []
        assert extra_types == []
        print("=" * 24, "exiting bound context for ORDER", "=" * 24)
    print("restored order_source_module.ORDER =", order_source_module.ORDER)
    print("restored len(order_source_module.ORDER) =", len(order_source_module.ORDER))
    assert "access_key" not in order_source_module.ORDER
    print("confirmed: 'access_key' is NOT in ORDER")