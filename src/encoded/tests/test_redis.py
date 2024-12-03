import pytest
from dcicutils.redis_tools import RedisSessionToken


pytestmark = [pytest.mark.setone, pytest.mark.working]


class TestRedisSession:
    """ Class for testing Redis sessions
        No automatic setup/teardown at this point, so redis entries will persist
    """

    def test_redis_session_basic(self, redis_testapp):
        """ Tests that we can grab a handle to redis when the server URL
            is specified.
        """
        assert redis_testapp.app.registry.settings['redis.server']
        assert redis_testapp.app.registry['redis']
