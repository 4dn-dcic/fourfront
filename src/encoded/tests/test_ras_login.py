import pytest


def test_login_redirects_to_ras(ras_testapp):
    """ Tests that a POST to /login will redirect the user to the RAS login page """
    res = ras_testapp.get('/login')
    assert '307' in res.status
    assert 'nih.gov' in res.location
