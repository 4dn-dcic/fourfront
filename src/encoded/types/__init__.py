"""init.py lists all the collections that do not have a dedicated types file."""

from snovault.attachment import ItemWithAttachment
from snovault.crud_views import collection_add as sno_collection_add
from snovault.schema_utils import validate_request
from snovault.validation import ValidationFailure
from snovault import (
    calculated_property,
    collection,
    load_schema,
    CONNECTION,
    COLLECTIONS
)
# from pyramid.traversal import find_root
from .base import Item


def includeme(config):
    """include me method."""
    config.scan()


@collection(
    name='individuals',
    properties={
        'title': 'Individuals',
        'description': 'Listing of Individuals',
    })
class Individual(Item):
    item_type = 'individual'
    schema = load_schema('encoded:schemas/individual.json')
    embedded_list = []

    @calculated_property(schema={
        "title": "Title",
        "type": "string",
    })
    def title(self, first_name, last_name):
        """return first and last name."""
        title = u'{} {}'.format(first_name, last_name)
        return title

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, first_name, last_name):
        return self.title(first_name, last_name)


@collection(
    name='cases',
    properties={
        'title': 'Cases',
        'description': 'Listing of Cases',
    })
class Case(Item):
    item_type = 'case'
    schema = load_schema('encoded:schemas/case.json')
    embedded_list = []

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, title):
        return title


@collection(
    name='samples',
    properties={
        'title': 'Samples',
        'description': 'Listing of Samples',
    })
class Sample(Item):
    item_type = 'sample'
    schema = load_schema('encoded:schemas/sample.json')
    embedded_list = []


@collection(
    name='documents',
    properties={
        'title': 'Documents',
        'description': 'Listing of Documents',
    })
class Document(ItemWithAttachment, Item):
    """Document class."""

    item_type = 'document'
    schema = load_schema('encoded:schemas/document.json')

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title",
        "type": "string"
    })
    def display_title(self, attachment=None):
        if attachment:
            return attachment.get('download')
        return Item.display_title(self)


@collection(
    name='sysinfos',
    unique_key='sysinfo:name',
    properties={
        'title': 'Sysinfo',
        'description': 'Just for internal use',
    })
class Sysinfo(Item):
    """sysinfo class."""

    item_type = 'sysinfo'
    schema = load_schema('encoded:schemas/sysinfo.json')
    name_key = 'name'
    embedded_list = []


@collection(
    name='tracking-items',
    properties={
        'title': 'TrackingItem',
        'description': 'For internal tracking of Fourfront events',
    })
class TrackingItem(Item):
    """tracking-item class."""

    item_type = 'tracking_item'
    schema = load_schema('encoded:schemas/tracking_item.json')
    embedded_list = []

    @classmethod
    def create_and_commit(cls, request, properties, clean_headers=False):
        """
        Create a TrackingItem with a given request and properties, committing
        it directly to the DB. This works by manually committing the
        transaction, which may cause issues if this function is called as
        part of another POST. For this reason, this function should be used to
        track GET requests -- otherwise, use the standard POST method.
        If validator issues are hit, will not create the item but log to error

        Args:
            request: current request object
            properties (dict): TrackingItem properties to post
            clean_headers(bool): If True, remove 'Location' header created by POST

        Returns:
            dict response from snovault.crud_views.collection_add

        Raises:
            ValidationFailure if TrackingItem cannot be validated
        """
        import transaction
        collection = request.registry[COLLECTIONS]['TrackingItem']
        # set remote_user to standarize permissions
        prior_remote = request.remote_user
        request.remote_user = 'EMBED'
        # remove any missing attributes from DownloadTracking
        properties['download_tracking'] = {k: v for k, v in properties.get('download_tracking', {}).items()
                                           if v is not None}
        validate_request(collection.type_info.schema, request, properties)
        if request.errors:  # from validate_request
            request.remote_user = prior_remote
            raise ValidationFailure('body')  # use errors from validate_request
        ti_res = sno_collection_add(collection, request, False)  # render=False
        transaction.get().commit()
        if clean_headers and 'Location' in request.response.headers:
            del request.response.headers['Location']
        request.remote_user = prior_remote
        return ti_res

    @calculated_property(schema={
        "title": "Title",
        "type": "string",
    })
    def display_title(self, tracking_type, date_created=None, google_analytics=None):
        if date_created:  # pragma: no cover should always be true
            date_created = date_created[:10]
        if tracking_type == 'google_analytics':
            for_date = None
            if google_analytics:
                for_date = google_analytics.get('for_date', None)
            if for_date:
                return 'Google Analytics for ' + for_date
            return 'Google Analytics Item'
        elif tracking_type == 'download_tracking':
            title = 'Download Tracking Item'
            if date_created:
                title = title + ' from ' + date_created
            return title
        else:
            title = 'Tracking Item'
            if date_created:
                title = title + ' from ' + date_created
            return title
