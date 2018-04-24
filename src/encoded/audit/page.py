from snovault import (
    AuditFailure,
    audit_checker,
)


@audit_checker('page', frame=['children'])
def audit_page_children_routes(value, system):
    '''
    Ensure that each children has a path in its 'name' field which is a 1-level-deep sub-path of this Page's own 'name' path.
    If, for example, '/help' page has a child '/about', then it is invalid. The child should have the name, '/help/about', at least.
    '''

    children = value.get('children', [])
    if len(children) == 0:
        return

    self_name = value['name']
    self_name_parts = self_name.split('/')
    self_name_depth = len(self_name_parts)

    for child_idx, child_item in enumerate(children):
        child_item_name = child_item['name']
        child_item_name_parts = child_item_name.split('/')
        if len(child_item_name_parts) != self_name_depth + 1:
            yield AuditFailure(
                "Child has bad name or route",
                'Child: ' + child_item_name + ' is not a direct sub-route of ' + self_name,
                level="ERROR"
            )
        else:
            for idx in range(0, self_name_depth):
                if child_item_name_parts[idx] != self_name_parts[idx]:
                    yield AuditFailure(
                        "Child has bad name or route",
                        'Child: "' + child_item_name + '" sub-route does not match parent route "' + self_name + '" at path component "' + child_item_name_parts[idx] + '"',
                        level="ERROR"
                    )
