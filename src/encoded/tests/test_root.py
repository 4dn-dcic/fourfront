from unittest import mock
from ..root import uptime_info
from dcicutils import lang_utils
from dcicutils.misc_utils import ignored


def test_uptime_info():

    with mock.patch("uptime.uptime", return_value=65 * 60):
        assert uptime_info() == "1 hour, 5 minutes"

    def fail(*args, **kwargs):
        ignored(args, kwargs)
        raise RuntimeError("Failure")

    with mock.patch("uptime.uptime", side_effect=fail):
        assert uptime_info() == "unavailable"

    with mock.patch.object(lang_utils, "relative_time_string", fail):
        assert uptime_info() == "unavailable"
