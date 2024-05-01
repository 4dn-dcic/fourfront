from pyramid.security import Allow, principals_allowed_by_permission
from pyramid.view import view_config
from snovault import Item, calculated_property, collection
from snovault.attachment import ItemWithAttachment
from snovault.interfaces import CONNECTION
from sqlalchemy import inspect
from transaction.interfaces import TransientError


def includeme(config):
    config.scan(__name__)


@view_config(name='testing-user', request_method='GET')
def user(request):
    return {
        'authenticated_userid': request.authenticated_userid,
        'effective_principals': request.effective_principals,
    }


@view_config(name='testing-allowed', request_method='GET')
def allowed(context, request):
    permission = request.params.get('permission', 'view')
    return {
        'has_permission': bool(request.has_permission(permission, context)),
        'principals_allowed_by_permission': principals_allowed_by_permission(context, permission),
    }


@collection(
    'testing-downloads',
    properties={
        'title': 'Test download collection',
        'description': 'Testing. Testing. 1, 2, 3.',
    },
)
class TestingDownload(ItemWithAttachment):
    item_type = 'testing_download'
    schema = {
        'type': 'object',
        'properties': {
            'attachment': {
                'type': 'object',
                'attachment': True,
                'properties': {
                    'type': {
                        'type': 'string',
                        'enum': ['image/png'],
                    }
                }
            },
            'attachment2': {
                'type': 'object',
                'attachment': True,
                'properties': {
                    'type': {
                        'type': 'string',
                        'enum': ['image/png'],
                    }
                }
            }
        }
    }


@collection(
    'testing-keys',
    properties={
        'title': 'Test keys',
        'description': 'Testing. Testing. 1, 2, 3.',
    },
    unique_key='testing_accession',
)
class TestingKey(Item):
    item_type = 'testing_key'
    schema = {
        'type': 'object',
        'properties': {
            'name': {
                'type': 'string',
                'uniqueKey': True,
            },
            'accession': {
                'type': 'string',
                'uniqueKey': 'testing_accession',
            },
        }
    }


@collection('testing-link-sources', unique_key='testing_link_sources:name')
class TestingLinkSource(Item):
    item_type = 'testing_link_source'
    schema = {
        'type': 'object',
        'properties': {
            'name': {
                'type': 'string',
                'uniqueKey': True,
            },
            'uuid': {
                'type': 'string',
            },
            'target': {
                'type': 'string',
                'linkTo': 'TestingLinkTarget',
            },
            'status': {
                'type': 'string',
            },
        },
        'required': ['target'],
        'additionalProperties': False,
    }


@collection('testing-link-targets', unique_key='testing_link_target:name')
class TestingLinkTarget(Item):
    item_type = 'testing_link_target'
    name_key = 'name'
    schema = {
        'type': 'object',
        'properties': {
            'name': {
                'type': 'string',
                'uniqueKey': True,
            },
            'uuid': {
                'type': 'string',
            },
            'status': {
                'type': 'string',
            },
        },
        'additionalProperties': False,
    }
    rev = {
        'reverse': ('TestingLinkSource', 'target'),
    }
    filtered_rev_statuses = ('deleted', 'replaced')
    embedded = [
        'reverse.*',
    ]

    def rev_link_atids(self, request, rev_name):
        conn = request.registry[CONNECTION]
        return [request.resource_path(conn[uuid]) for uuid in
                self.get_filtered_rev_links(request, rev_name)]

    @calculated_property(schema={
        "title": "Sources",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkTo": "TestingLinkSource",
        },
    })
    def reverse(self, request):
        return self.rev_link_atids(request, rev_name="reverse")


TESTING_POST_PUT_PATCH_ACL = [(Allow, 'group.submitter', ['add', 'edit', 'view'])]

@collection(
    'testing-post-put-patch',
    acl=TESTING_POST_PUT_PATCH_ACL
)
class TestingPostPutPatch(Item):

    def __acl__(self):
        return TESTING_POST_PUT_PATCH_ACL

    item_type = 'testing_post_put_patch'
    schema = {
        'required': ['required'],
        'type': 'object',
        'additionalProperties': False,
        'properties': {
            "schema_version": {
                "type": "string",
                "pattern": "^\\d+(\\.\\d+)*$",
                "requestMethod": [],
                "default": "1",
            },
            "uuid": {
                "title": "UUID",
                "description": "",
                "type": "string",
                "format": "uuid",
                "permission": "import_items",
                "requestMethod": "POST",
            },
            'required': {
                'type': 'string',
            },
            'simple1': {
                'type': 'string',
                'default': 'simple1 default',
            },
            'simple2': {
                'type': 'string',
                'default': 'simple2 default',
            },
            'protected': {
                # This should be allowed on PUT so long as value is the same
                'type': 'string',
                'default': 'protected default',
                'permission': 'import_items',
            },
            'protected_link': {
                # This should be allowed on PUT so long as the linked uuid is
                # the same
                'type': 'string',
                'linkTo': 'TestingLinkTarget',
                'permission': 'import_items',
            },
            'field_no_default': {
                'type': 'string',
            },
        }
    }


@collection('testing-server-defaults')
class TestingServerDefault(Item):
    item_type = 'testing_server_default'
    schema = {
        'type': 'object',
        'properties': {
            'uuid': {
                'serverDefault': 'uuid4',
                'type': 'string',
            },
            'user': {
                'serverDefault': 'userid',
                'linkTo': 'User',
                'type': 'string',
            },
            'now': {
                'serverDefault': 'now',
                'format': 'date-time',
                'type': 'string',
            },
            'accession': {
                'serverDefault': 'accession',
                'accessionType': 'BS',
                'format': 'accession',
                'type': 'string',
            },
        }
    }


@collection('testing-dependencies')
class TestingDependencies(Item):
    item_type = 'testing_dependencies'
    schema = {
        'type': 'object',
        'dependentRequired': {
            'dep1': ['dep2'],
            'dep2': ['dep1'],
        },
        'properties': {
            'dep1': {
                'type': 'string',
            },
            'dep2': {
                'type': 'string',
                'enum': ['dep2'],
            },
        }
    }


@view_config(context=TestingPostPutPatch, name='testing-retry')
def testing_retry(context, request):

    model = context.model
    request.environ['_attempt'] = request.environ.get('_attempt', 0) + 1

    if request.environ['_attempt'] == 1:
        raise TransientError()

    return {
        'attempt': request.environ['_attempt'],
        'detached': inspect(model).detached,
    }


@collection('testing-hidden-facets')
class TestingHiddenFacets(Item):
    """ Collection designed to test searching with hidden facets. Yes this is large, but this is a complex feature
        with many possible cases. """
    item_type = 'testing_hidden_facets'
    schema = {
        'type': 'object',
        'properties': {
            'first_name': {
                'type': 'string'
            },
            'last_name': {
                'type': 'string'
            },
            'sid': {
                'type': 'integer'
            },
            'unfaceted_string': {
                'type': 'string'
            },
            'unfaceted_integer': {
                'type': 'integer'
            },
            'disabled_string': {
                'type': 'string',
            },
            'disabled_integer': {
                'type': 'integer',
            },
            'unfaceted_object': {
                'type': 'object',
                'properties': {
                    'mother': {
                        'type': 'string'
                    },
                    'father': {
                        'type': 'string'
                    }
                }
            },
            'unfaceted_array_of_objects': {
                'type': 'array',
                'enable_nested': True,
                'items': {
                    'type': 'object',
                    'properties': {
                        'fruit': {
                            'type': 'string'
                        },
                        'color': {
                            'type': 'string'
                        },
                        'uid': {
                            'type': 'integer'
                        }
                    }
                }
            }
        },
        'facets': {
            'first_name': {
                'title': 'First Name'
            },
            'last_name': {
                'default_hidden': True,
                'title': 'Last Name'
            },
            'sid': {
                'default_hidden': True,
                'title': 'SID',
                'aggregation_type': 'stats',
                'number_step': 1
            },
            'disabled_string': {
                'disabled': True
            },
            'disabled_integer': {
                'disabled': True
            }
        }
    }

    @calculated_property(schema={
        'type': 'array',
        'items': {
            'type': 'object',
            'properties': {
                'fruit': {
                    'type': 'string'
                },
                'color': {
                    'type': 'string'
                },
                'uid': {
                    'type': 'integer'
                }
            }
        }
    })
    def non_nested_array_of_objects(self, unfaceted_array_of_objects):
        """ Non-nested view of the unfaceted_array_of_objects field """
        return unfaceted_array_of_objects


@collection('testing-bucket-range-facets')
class TestingBucketRangeFacets(Item):
    """ Collection for testing BucketRange facets. """
    item_type = 'testing_bucket_range_facets'
    schema = {
        'type': 'object',
        'properties': {
            'special_integer': {
                'type': 'integer'
            },
            'special_object_that_holds_integer': {
                'type': 'object',
                'properties': {
                    'embedded_integer': {
                        'type': 'integer'
                    }
                }
            },
            'array_of_objects_that_holds_integer': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'enable_nested': True,
                    'properties': {
                        'embedded_identifier': {
                            'type': 'string'
                        },
                        'embedded_integer': {
                            'type': 'integer'
                        }
                    }
                }
            }
        },
        'facets': {
            'special_integer': {
                'title': 'Special Integer',
                'aggregation_type': 'range',
                'ranges': [
                    {'from': 0, 'to': 5},
                    {'from': 5, 'to': 10}
                ]
            },
            'special_object_that_holds_integer.embedded_integer': {
                'title': 'Single Object Embedded Integer',
                'aggregation_type': 'range',
                'ranges': [
                    {'from': 0, 'to': 5},
                    {'from': 5, 'to': 10}
                ]
            },
            'array_of_objects_that_holds_integer.embedded_integer': {
                'title': 'Array of Objects Embedded Integer',
                'aggregation_type': 'range',
                'ranges': [
                    {'from': 0, 'to': 5, 'label': 'Low'},
                    {'from': 5, 'to': 10, 'label': 'High'}
                ]
            }
        }
    }
