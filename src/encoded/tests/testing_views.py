from pyramid.view import view_config
from ..contentbase import (
    Collection,
    location,
)
from ..views.download import ItemWithDocument


def includeme(config):
    config.scan(__name__)


@view_config(name='testing-user', request_method='GET')
def user(request):
    from pyramid.security import (
        authenticated_userid,
        effective_principals,
    )
    return {
        'authenticated_userid': authenticated_userid(request),
        'effective_principals': effective_principals(request),
    }


@location('testing-downloads')
class TestingDownload(Collection):
    properties = {
        'title': 'Test download collection',
        'description': 'Testing. Testing. 1, 2, 3.',
    }

    class Item(ItemWithDocument):
        pass


@location('testing-keys')
class TestingKey(Collection):
    properties = {
        'title': 'Test keys',
        'description': 'Testing. Testing. 1, 2, 3.',
    }

    item_keys = [
        'name',
        {'name': 'testing_accession', 'value': '{accession}', 'templated': True},
    ]
