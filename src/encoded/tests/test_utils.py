import datetime
import inspect
import pytest
import re
import unittest.mock

from ..utils import compute_set_difference_one, find_other_in_pair, delay_rerun, utc_today_str, use_fixtures


pytestmark = pytest.mark.working


def test_compute_set_difference_one():
    """ Tests that our set difference utility function behaves correctly under various cases """
    s1 = {1, 2, 3, 4}
    s2 = {1, 2, 3}
    assert compute_set_difference_one(s1, s2) == 4
    s1 = {1, 2, 3, 4}
    s2 = {1, 2, 3, 4}
    with pytest.raises(StopIteration):
        compute_set_difference_one(s1, s2)
    with pytest.raises(StopIteration):
        compute_set_difference_one(s2, s1)
    s1 = {1, 2, 3, 4, 5, 6}
    s2 = {1, 2, 3, 4}
    with pytest.raises(RuntimeError):
        compute_set_difference_one(s1, s2)
    with pytest.raises(StopIteration):
        compute_set_difference_one(s2, s1)
    s1 = {1, 2}
    s2 = {1}
    assert compute_set_difference_one(s1, s2) == 2


def test_find_other_in_pair():
    """ Tests the wrapper for the above function """
    assert find_other_in_pair(1, [1, 2]) == 2
    assert find_other_in_pair(2, [1, 2]) == 1
    lst = [1, 2, 3]
    val = [1, 2]
    with pytest.raises(TypeError):
        find_other_in_pair(val, lst)  # val is 'not single valued'
    val = 1
    with pytest.raises(TypeError):
        find_other_in_pair(val, None)  # no pair to compare to
    with pytest.raises(RuntimeError):  # too many results
        find_other_in_pair(None, lst)


def test_delay_rerun():
    t0 = datetime.datetime.now()
    delay_rerun()
    t1 = datetime.datetime.now()
    assert (t1 - t0).total_seconds() > 1


def test_utc_today_str():
    pattern = "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]"
    actual = utc_today_str()
    assert re.match(pattern, actual), "utc_today_str() result %s did not match format: %s" % (actual, pattern)


def test_use_fixtures():
    mock_fixtures = {}

    def declare_mock_fixture(name, mock_fixture):
        mock_fixtures[name] = mock_fixture

    def mock_fixtures_for_function(f):
        return { name: mock_fixtures[name]
                 for name in inspect.getfullargspec(f)[0]
                 if name in mock_fixtures }

    def mock_pytest_call(f, *args, **kwargs):
        full_kwargs = dict(kwargs, **mock_fixtures_for_function(f))
        return f(*args, **full_kwargs)

    dummy = 'dummy-fixture'
    declare_mock_fixture('dummy', dummy)

    @use_fixtures(dummy)
    def f(x, y, dummy):
        return {'fixture': dummy, 'sum': x+y}

    assert mock_fixtures_for_function(f) == {'dummy': 'dummy-fixture'}

    actual = mock_pytest_call(f, 3, 4)
    expected = {'fixture': 'dummy-fixture', 'sum': 7}
    assert actual == expected, "Expected %r but got %r." % (expected, actual)
