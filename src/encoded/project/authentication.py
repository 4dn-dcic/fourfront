from dcicutils.misc_utils import ignored
from pyramid.httpexceptions import HTTPUnauthorized
from snovault.project.authentication import SnovaultProjectAuthentication

class FourfrontProjectAuthentication(SnovaultProjectAuthentication):

    def login(self, context, request, *, samesite):
        ignored(samesite)
        samesite = "lax"
        return super().login(context, request, samesite=samesite)

    def namespaced_authentication_policy_authenticated_userid(self, namespaced_authentication_policy, request, set_user_info_property):
        set_user_info_property = True
        return super().namespaced_authentication_policy_authenticated_userid(namespaced_authentication_policy, request, set_user_info_property)

    def note_auth0_authentication_policy_unauthenticated_userid(self, auth0_authentication_policy, request, email, id_token):
        # Allow access basic user credentials from request obj after authenticating & saving request
        def get_user_info(request):
            user_props = request.embed('/session-properties', as_user=email) # Performs an authentication against DB for user.
            if not user_props.get('details'):
                raise HTTPUnauthorized(
                    title="Could not find user info for {}".format(email),
                    headers={'WWW-Authenticate': "Bearer realm=\"{}\"; Basic realm=\"{}\"".format(request.domain, request.domain) }
                )
            user_props['id_token'] = id_token
            return user_props
        request.set_property(get_user_info, "user_info", True)
