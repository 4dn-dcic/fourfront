import sys
import uptime
import re

from collections import OrderedDict
from dcicutils import lang_utils
from dcicutils.env_utils import infer_foursight_url_from_env
from collections import OrderedDict
from dcicutils.s3_utils import HealthPageKey
from encoded import APP_VERSION_REGISTRY_KEY
from pyramid.decorator import reify
from pyramid.security import ALL_PERMISSIONS, Allow, Authenticated, Deny, Everyone
from snovault import Root, calculated_property, root, COLLECTIONS, STORAGE
from .appdefs import APP_VERSION_REGISTRY_KEY, ITEM_INDEX_ORDER
from .schema_formats import is_accession

# for more information, visit http://detectmobilebrowsers.com/
_IS_MOBILE_BROWSER_MATCH_B = re.compile(r"(android|bb\\d+|meego).+mobile|avantgo|bada\\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\\.(browser|link)|vodafone|wap|windows ce|xda|xiino", re.I|re.M)
_IS_MOBILE_BROWSER_MATCH_V = re.compile(r"1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\\-(n|u)|c55\\/|capi|ccwa|cdm\\-|cell|chtm|cldc|cmd\\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\\-s|devi|dica|dmob|do(c|p)o|ds(12|\\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\\-|_)|g1 u|g560|gene|gf\\-5|g\\-mo|go(\\.w|od)|gr(ad|un)|haie|hcit|hd\\-(m|p|t)|hei\\-|hi(pt|ta)|hp( i|ip)|hs\\-c|ht(c(\\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\\-(20|go|ma)|i230|iac( |\\-|\\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\\/)|klon|kpt |kwc\\-|kyo(c|k)|le(no|xi)|lg( g|\\/(k|l|u)|50|54|\\-[a-w])|libw|lynx|m1\\-w|m3ga|m50\\/|ma(te|ui|xo)|mc(01|21|ca)|m\\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\\-2|po(ck|rt|se)|prox|psio|pt\\-g|qa\\-a|qc(07|12|21|32|60|\\-[2-7]|i\\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\\-|oo|p\\-)|sdk\\/|se(c(\\-|0|1)|47|mc|nd|ri)|sgh\\-|shar|sie(\\-|m)|sk\\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\\-|v\\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\\-|tdg\\-|tel(i|m)|tim\\-|t\\-mo|to(pl|sh)|ts(70|m\\-|m3|m5)|tx\\-9|up(\\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\\-|your|zeto|zte\\-", re.I|re.M)


def includeme(config):
    config.include(health_check)
    config.include(item_counts)
    config.include(type_metadata)
    config.include(submissions_page)
    config.scan(__name__)


def item_counts(config):
    config.add_route(
        'item-counts',
        '/counts'
    )

    def counts_view(request):
        response = request.response
        response.content_type = 'application/json; charset=utf-8'

        db_total = 0
        es_total = 0
        # find db and es counts for each item type
        db_es_compare = OrderedDict()
        for item_type in request.registry[COLLECTIONS].by_item_type:
            # use the write (DB) storage with only the specific item_type
            # need to count items with props in ES differently
            db_count = request.registry[STORAGE].write.__len__(item_type)
            es_count = request.registry[STORAGE].read.__len__(item_type)
            db_total += db_count
            es_total += es_count
            warn_str = build_warn_string(db_count, es_count)
            item_name = request.registry[COLLECTIONS][item_type].type_info.name
            db_es_compare[item_name] = ("DB: %s   ES: %s %s" % (str(db_count), str(es_count), warn_str))
        warn_str = build_warn_string(db_total, es_total)
        db_es_total = ("DB: %s   ES: %s %s" %
                       (str(db_total), str(es_total), warn_str))
        response_dict = {
            'title': 'Item Counts',
            'db_es_total': db_es_total,
            'db_es_compare': db_es_compare
        }
        return response_dict

    config.add_view(counts_view, route_name='item-counts')


def type_metadata(config):

    config.add_route(
        'type-metadata',
        '/type-metadata'
    )

    def type_metadata_view(request):

        return {
            'index_order': ITEM_INDEX_ORDER
        }

    config.add_view(type_metadata_view, route_name='type-metadata')



def uptime_info():
    try:
        return lang_utils.relative_time_string(uptime.uptime())
    except Exception:
        return "unavailable"


class SettingsKey:
    APPLICATION_BUCKET_PREFIX = 'application_bucket_prefix'
    # fourfront-only. cgap uses eb_app_version instead.
    BEANSTALK_APP_VERSION = "beanstalk_app_version"
    BLOB_BUCKET = 'blob_bucket'
    # cgap-only?:
    EB_APP_VERSION = 'eb_app_version'
    ELASTICSEARCH_SERVER = 'elasticsearch.server'
    ENCODED_VERSION = 'encoded_version'
    FILE_UPLOAD_BUCKET = 'file_upload_bucket'
    FILE_WFOUT_BUCKET = 'file_wfout_bucket'
    FOURSIGHT_BUCKET_PREFIX = 'foursight_bucket_prefix'
    IDENTITY = 'identity'
    INDEXER = 'indexer'
    INDEXER_NAMESPACE = 'indexer.namespace'
    INDEX_SERVER = 'index_server'
    LOAD_TEST_DATA = 'load_test_data'
    # cgap-only:
    # METADATA_BUNDLES_BUCKET = 'metadata_bundles_bucket'
    S3_ENCRYPT_KEY_ID = 's3_encrypt_key_id'
    SNOVAULT_VERSION = 'snovault_version'
    SQLALCHEMY_URL = 'sqlalchemy.url'
    SYSTEM_BUCKET = 'system_bucket'
    TIBANNA_CWLS_BUCKET = 'tibanna_cwls_bucket'
    TIBANNA_OUTPUT_BUCKET = 'tibanna_output_bucket'
    UTILS_VERSION = 'utils_version'


def health_check(config):
    """
    Emulate a lite form of Alex's static page routing
    """
    config.add_route(
        'health-check',
        '/health'
    )

    def health_page_view(request):

        class ExtendedHealthPageKey(HealthPageKey):
            # This class can contain new entries in HealthPageKey that are waiting to move to dcicutils
            PYTHON_VERSION = "python_version"
            pass

        h = ExtendedHealthPageKey

        s = SettingsKey

        response = request.response
        response.content_type = 'application/json; charset=utf-8'
        settings = request.registry.settings

        # TODO: This computation of app_url is unused. Is that a bug, or should we remove it? -kmp 4-Oct-2021
        app_url = request.application_url
        if not app_url.endswith('/'):
            app_url = ''.join([app_url, '/'])

        env_name = settings.get('env.name')
        foursight_url = infer_foursight_url_from_env(request, env_name)

        response_dict = {

            "@type": ["Health", "Portal"],
            "@context": "/health",
            "@id": "/health",
            "content": None,

            h.APPLICATION_BUCKET_PREFIX: settings.get(s.APPLICATION_BUCKET_PREFIX),
            h.BEANSTALK_APP_VERSION: settings.get(s.EB_APP_VERSION),
            h.BEANSTALK_ENV: env_name,
            h.BLOB_BUCKET: settings.get(s.BLOB_BUCKET),
            h.DATABASE: settings.get(s.SQLALCHEMY_URL).split('@')[1],  # don't show user /password
            h.DISPLAY_TITLE: "Fourfront Status and Foursight Monitoring",
            h.ELASTICSEARCH: settings.get(s.ELASTICSEARCH_SERVER),
            h.FILE_UPLOAD_BUCKET: settings.get(s.FILE_UPLOAD_BUCKET),
            h.FOURSIGHT: foursight_url,
            h.FOURSIGHT_BUCKET_PREFIX: settings.get(s.FOURSIGHT_BUCKET_PREFIX),
            h.IDENTITY: settings.get(s.IDENTITY),
            h.INDEXER: settings.get(s.INDEXER),
            h.INDEX_SERVER: settings.get(s.INDEX_SERVER),
            h.LOAD_DATA: settings.get(s.LOAD_TEST_DATA),
            # h.METADATA_BUNDLES_BUCKET: settings.get(s.METADATA_BUNDLES_BUCKET),  # cgap-only
            h.NAMESPACE: settings.get(s.INDEXER_NAMESPACE),
            h.PROCESSED_FILE_BUCKET: settings.get(s.FILE_WFOUT_BUCKET),
            h.PROJECT_VERSION: settings.get(s.ENCODED_VERSION),
            h.PYTHON_VERSION: f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            # h.S3_ENCRYPT_KEY_ID: settings.get(s.S3_ENCRYPT_KEY_ID),  # cgap-only
            h.SNOVAULT_VERSION: settings.get(s.SNOVAULT_VERSION),
            h.SYSTEM_BUCKET: settings.get(s.SYSTEM_BUCKET),
            h.TIBANNA_CWLS_BUCKET: settings.get(s.TIBANNA_CWLS_BUCKET),
            h.TIBANNA_OUTPUT_BUCKET: settings.get(s.TIBANNA_OUTPUT_BUCKET),
            h.UPTIME: uptime_info(),
            h.UTILS_VERSION: settings.get(s.UTILS_VERSION),
        }

        return response_dict

    config.add_view(health_page_view, route_name='health-check')


def build_warn_string(db_count, es_count):
    if db_count > es_count:
        warn_str = '  < DB has %s more items >' % (str(db_count - es_count))
    elif db_count < es_count:
        warn_str = '  < ES has %s more items >' % (str(es_count - db_count))
    else:
        warn_str = ''
    return warn_str


def submissions_page(config):
    """
    Emulate a lite form of Alex's static page routing
    """
    config.add_route(
        'submissions-page',
        '/submissions'
    )

    def submissions_page_view(request):
        response = request.response
        response.content_type = 'application/json; charset=utf-8'

        response_dict = {
            "title": "Submissions",
            "notification": "success",
            "@type": ["Submissions", "Portal"],
            "@context": "/submissions",
            "@id": "/submissions",
            "content": None
        }

        return response_dict

    config.add_view(submissions_page_view, route_name='submissions-page')


def acl_from_settings(settings):
    # XXX Unsure if any of the demo instance still need this
    acl = []
    for k, v in settings.items():
        if k.startswith('allow.'):
            action = Allow
            permission = k[len('allow.'):]
            principals = v.split()
        elif k.startswith('deny.'):
            action = Deny
            permission = k[len('deny.'):]
            principals = v.split()
        else:
            continue
        if permission == 'ALL_PERMISSIONS':
            permission = ALL_PERMISSIONS
        for principal in principals:
            if principal == 'Authenticated':
                principal = Authenticated
            elif principal == 'Everyone':
                principal = Everyone
            acl.append((action, principal, permission))
    return acl


@root
class FourfrontRoot(Root):
    properties = {
        'title': 'Home',
        'portal_title': '4DN Data Portal',
    }

    @reify
    def __acl__(self):
        acl = acl_from_settings(self.registry.settings) + [
            (Allow, Everyone, ['list', 'search']),
            (Allow, 'group.admin', ALL_PERMISSIONS),
            (Allow, 'remoteuser.EMBED', 'import_items'),
        ] + [
            (Allow, 'remoteuser.INDEXER', ['view', 'view_raw', 'list', 'index']),
            (Allow, 'remoteuser.EMBED', ['view', 'view_raw', 'expand']),
            (Allow, Everyone, ['visible_for_edit'])
        ]
        return acl

    def get(self, name, default=None):
        resource = super().get(name, None)
        if resource is not None:
            return resource
        resource = self.connection.get_by_unique_key('page:location', name)
        if resource is not None:
            return resource
        if is_accession(name):
            resource = self.connection.get_by_unique_key('accession', name)
            if resource is not None:
                return resource
        if ':' in name:
            resource = self.connection.get_by_unique_key('alias', name)
            if resource is not None:
                return resource
        return default

    def get_by_uuid(self, uuid, default=None):
        return self.connection.get_by_uuid(uuid, default)

    def jsonld_context(self):
        """Inherits from '@context' calculated property of Resource in snovault/resources.py"""
        return '/home'

    def jsonld_type(self):
        """Inherits from '@type' calculated property of Root in snovault/resources.py"""
        return ['HomePage', 'StaticPage'] + super().jsonld_type()

    @calculated_property(schema={
        "title": "Static Page Content",
        "type": "array"
    })
    def content(self, request):
        """Returns -object- with pre-named sections"""
        sections_to_get = ['home.introduction']
        user = request._auth0_authenticated if hasattr(request, '_auth0_authenticated') else True
        return_list = []
        for section_name in sections_to_get:
            try:  # Can be caused by 404 / Not Found during indexing
                res = request.embed('/static-sections', section_name, '@@embedded', as_user=user)
                return_list.append(res)
            except KeyError:
                pass
        return return_list

    @calculated_property(schema={
        "title": "Carousel Content",
        "type": "array"
    }, category="page")
    def carousel(self, request):
        """Returns list of carousel slides"""
        user = request._auth0_authenticated if hasattr(request, '_auth0_authenticated') else True
        try:
            return request.embed('/search/?type=StaticSection&section_type=Home+Page+Slide&sort=name', as_user=user).get('@graph', [])
        except KeyError:  # Can be caused by 404 / Not Found during indexing
            return []

    # It is no longer used at the moment, replaced by Twitter feed. 
    # @calculated_property(schema={
    #     "title": "Announcements",
    #     "type": "array"
    # }, category="page")
    # def announcements(self, request):
    #     '''Returns list of latest announcements'''
    #     user = request._auth0_authenticated if hasattr(request, '_auth0_authenticated') else True
    #     try:
    #         return request.embed('/search/?type=StaticSection&section_type=Announcement&sort=-date_created', as_user=user).get('@graph', [])
    #     except KeyError: # Can be caused by 404 / Not Found during indexing
    #         return []

    @calculated_property(schema={
        "title": "Application version",
        "type": "string",
    })
    def app_version(self, registry):
        return registry.settings[APP_VERSION_REGISTRY_KEY]

    @calculated_property(schema={
        "title": "Is request initiated by a mobile device",
        "description": "The calculation is based on request.user_agent that is not reliable source. It is for server-side rendering, passing as a prop is not recommended.",
        "type": "boolean"
    })
    def is_mobile_browser(self, request):
        if hasattr(request, 'user_agent'):
            user_agent = request.user_agent
            b = _IS_MOBILE_BROWSER_MATCH_B.search(user_agent)
            v = _IS_MOBILE_BROWSER_MATCH_V.search(user_agent[0:4])
            if b or v:
                return True      
        # fallback
        return False