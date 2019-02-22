import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.yield_fixture(scope='session')
def minitestdata(app, conn):
    tx = conn.begin_nested()

    from webtest import TestApp
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

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

    from webtest import TestApp
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

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
    from .datafixtures import ORDER
    from webtest import TestApp
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)
    master_types = []
    profiles = testapp.get('/profiles/?frame=raw').json
    for a_type in profiles:
        if profiles[a_type].get('id'):
            schema_name = profiles[a_type]['id'].split('/')[-1][:-5]
            master_types.append(schema_name)
    print(ORDER)
    print(master_types)
    print(len(ORDER))
    print(len(master_types))

    missing_types = [i for i in master_types if i not in ORDER]
    extra_types = [i for i in ORDER if i not in master_types]
    print(missing_types)
    print(extra_types)

    assert missing_types == []
    assert extra_types == []


