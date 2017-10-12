from snovault import (
    AuditFailure,
    audit_checker,
)
from snovault import (
    UPGRADER,
)
from snovault.schema_utils import validate
from snovault.util import simple_path_ids


@audit_checker('Item', frame='object')
def audit_item_schema(value, system):
    context = system['context']
    registry = system['registry']
    if not context.schema:
        return

    properties = context.properties.copy()
    current_version = properties.get('schema_version', '')
    target_version = context.type_info.schema_version
    if target_version is not None and current_version != target_version:
        upgrader = registry[UPGRADER]
        try:
            properties = upgrader.upgrade(
                context.type_info.name, properties, current_version, target_version,
                finalize=False, context=context, registry=registry)
        except RuntimeError:
            raise
        except Exception as e:
            detail = '%r upgrading from %r to %r' % (e, current_version, target_version)
            yield AuditFailure('upgrade failure', detail, level='INTERNAL_ACTION')
            return

        properties['schema_version'] = target_version

    properties['uuid'] = str(context.uuid)
    validated, errors = validate(context.schema, properties, properties)
    for error in errors:
        category = 'validation error'
        path = list(error.path)
        if path:
            category += ': ' + '/'.join(str(elem) for elem in path)
        detail = 'Object {} has schema error {}'.format(value['@id'], error.message)
        yield AuditFailure(category, detail, level='INTERNAL_ACTION')


# 4 levels of status 0-3
# embedded sub items should have an equal or greater level
# than that of the item in which they are embedded
STATUS_LEVEL = {
    # standard_status
    'released': 3,
    'current': 3,
    'revoked': 3,
    'released to project': 2,
    'submission in progress': 2,
    'in review by lab': 1,
    'deleted': 0,
    'replaced': 0,
    'obsolete': 0,
    # additional file statuses
    'to be uploaded by workflow': 1,
    'uploading': 1,
    'uploaded': 1,
    'upload failed': 1,

    # publication
    'published': 3,
}


@audit_checker('Item', frame='object')
def audit_item_status(value, system):
    if 'status' not in value:
        return

    level = STATUS_LEVEL.get(value['status'], 1)
    if level == 0:
        return

    context = system['context']
    request = system['request']
    linked = set()
    for schema_path in context.type_info.schema_links:
        if schema_path in ['supercedes', 'step_run']:
            continue
        linked.update(simple_path_ids(value, schema_path))

    for path in linked:
        linked_value = request.embed(path + '@@object')
        if 'status' not in linked_value:
            continue
        if linked_value['status'] == 'disabled':
            continue
        linked_level = STATUS_LEVEL.get(linked_value['status'], 50)
#        if linked_level == 0:
#            detail = '{} {} has {} subobject {}'.format(
#                value['status'], value['@id'], linked_value['status'], linked_value['@id'])
#            yield AuditFailure('mismatched status', detail, level='INTERNAL_ACTION')
        if linked_level < level:
            detail = '{} {} has {} subobject {}'.format(
                value['status'], value['@id'], linked_value['status'], linked_value['@id'])
            yield AuditFailure('mismatched status', detail, level='INTERNAL_ACTION')
