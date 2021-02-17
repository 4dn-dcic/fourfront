import datetime
import pytest
import re
from pyramid.httpexceptions import HTTPForbidden

from ..util import (compute_set_difference_one, find_other_in_pair, delay_rerun, utc_today_str,
                    customized_delay_rerun, check_user_is_logged_in)


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


DELAY_FUZZ_SECONDS = 0.1


def test_delay_rerun():
    expected_delay = 1.0
    t0 = datetime.datetime.now()
    delay_rerun()
    t1 = datetime.datetime.now()
    assert (t1 - t0).total_seconds() > expected_delay
    assert (t1 - t0).total_seconds() < expected_delay + DELAY_FUZZ_SECONDS


def test_customize_delay_rerun():
    custom_delay = 0.5
    half_delay_rerun = customized_delay_rerun(sleep_seconds=custom_delay)
    t0 = datetime.datetime.now()
    half_delay_rerun()
    t1 = datetime.datetime.now()
    assert (t1 - t0).total_seconds() > custom_delay
    assert (t1 - t0).total_seconds() < custom_delay + DELAY_FUZZ_SECONDS


def test_utc_today_str():
    pattern = "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]"
    actual = utc_today_str()
    assert re.match(pattern, actual), "utc_today_str() result %s did not match format: %s" % (actual, pattern)


@pytest.mark.parametrize('principals, allow', [
    (['role1', 'role2'], False),
    (['role1', 'userid.uuid'], True),
    (['role1', 'group.admin'], True),
    (['system.Everyone'], False)
])
def test_check_user_is_logged_in(principals, allow):
    """ Simple test that ensures the logged in check is working as expected """
    class MockRequest:
        def __init__(self, principals):
            self.effective_principals = principals
    req = MockRequest(principals)
    if allow:
        check_user_is_logged_in(req)
    else:
        with pytest.raises(HTTPForbidden):
            check_user_is_logged_in(req)
