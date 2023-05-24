from snovault.authorization import (
    groupfinder,
    SnovaultProjectAuthorization
)

class FourfrontProjectAuthorization(SnovaultProjectAuthorization):

    def authorization_create_principals(self, login, user, collections):
        user_properties = user.properties
        principals = ['userid.%s' % user.uuid]
        lab = user_properties.get('lab')
        if lab:
            principals.append('lab.%s' % lab)
            lab_properties = collections.by_item_type['lab'][lab].properties
            # for members sharing awards but in different labs
            awards = lab_properties.get('awards')
            if awards:
                principals.extend('award.%s' % award for award in awards)
        submits_for = user_properties.get('submits_for', [])
        principals.extend('lab.%s' % lab_uuid for lab_uuid in submits_for)
        principals.extend('submits_for.%s' % lab_uuid for lab_uuid in submits_for)
        if submits_for:
            principals.append('group.submitter')
        groups = user_properties.get('groups', [])
        principals.extend('group.%s' % group for group in groups)
        viewing_groups = user_properties.get('viewing_groups', [])
        principals.extend('viewing_group.%s' % group for group in viewing_groups)
        return principals
