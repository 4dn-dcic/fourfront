import datetime
import io
import os
import pytest
from pyramid.httpexceptions import HTTPForbidden

from ..util import (
    # compute_set_difference_one, find_other_in_pair,
    delay_rerun,  # utc_today_str,
    customized_delay_rerun, check_user_is_logged_in,
    temporary_file
)


pytestmark = pytest.mark.working
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


def test_temporary_file_context_manager():
    temporary_filename = None
    with temporary_file(extension=".json") as filename:
        assert filename.endswith(".json")
        temporary_filename = filename
        sample_content = "Hello, world!"
        with io.open(filename, "w") as fp:
            fp.write(sample_content)
        with io.open(filename, "r") as fp:
            content = fp.read()
            assert content == sample_content
    assert not os.path.exists(temporary_filename)
