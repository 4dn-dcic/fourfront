from snovault import COLLECTIONS


def groupfinder(login, request):
    if '.' not in login:
        return None
    namespace, localname = login.split('.', 1)
    user = None

    collections = request.registry[COLLECTIONS]

    if namespace == 'remoteuser':
        if localname in ['EMBED', 'INDEXER']:
            return []
        elif localname in ['TEST', 'IMPORT', 'UPGRADE']:
            return ['group.admin']
        elif localname in ['TEST_SUBMITTER']:
            return ['group.submitter']
        elif localname in ['TEST_AUTHENTICATED']:
            return ['viewing_group.ENCODE']

    if namespace in ('mailto', 'remoteuser', 'auth0'):
        users = collections.by_item_type['user']
        try:
            user = users[localname]
        except KeyError:
            return None

    elif namespace == 'accesskey':

        access_keys = collections.by_item_type['access_key']
        try:
            access_key = access_keys[localname]
        except KeyError:
            return None

        if access_key.properties.get('status') in ('deleted', 'revoked'):
            return None

        userid = access_key.properties['user']
        user = collections.by_item_type['user'][userid]

    if user is None:
        return None

    user_properties = user.properties

    if user_properties.get('status') in ('deleted', 'revoked'):
        return None

    principals = ['userid.%s' % user.uuid]
    institution = user_properties.get('institution')
    if institution:
        principals.append('institution.%s' % institution)

    project = user_properties.get('project')
    if project:
        principals.append('project.%s' % project)

    submits_for = user_properties.get('submits_for', [])
    principals.extend('institution.%s' % inst_uuid for inst_uuid in submits_for)
    principals.extend('submits_for.%s' % inst_uuid for inst_uuid in submits_for)
    if submits_for:
        principals.append('group.submitter')

    # user role. should always be present
    user_role = user_properties.get('role')
    if user_role:
        principals.append('user_role.%s' % user_role)

    groups = user_properties.get('groups', [])
    principals.extend('group.%s' % group for group in groups)
    return principals
