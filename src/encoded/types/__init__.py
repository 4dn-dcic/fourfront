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
    COLLECTIONS,
    display_title_schema
)
# from pyramid.traversal import find_root
from .base import (
    Item,
    get_item_if_you_can
)


def includeme(config):
    """include me method."""
    config.scan()


@collection(
    name='individuals',
    unique_key='accession',
    properties={
        'title': 'Individuals',
        'description': 'Listing of Individuals',
    })
class Individual(Item):
    item_type = 'individual'
    name_key = 'accession'
    schema = load_schema('encoded:schemas/individual.json')

    embedded_list = []

    # rev = {
    #     'cases_proband': ('Case', 'proband'),
    #     'cases_affiliate' : ('Case', 'trio.individual')
    # }

    # @calculated_property(schema={
    #     "title": "Cases (proband)",
    #     "description": "Cases that this individual is a proband of",
    #     "type": "array",
    #     "items": {
    #         "title": "Case",
    #         "type": "string",
    #         "linkTo": "Case"
    #     }
    # })
    # def cases_proband(self, request):
    #     return self.rev_link_atids(request, "cases_proband")

    # @calculated_property(schema={
    #     "title": "Cases (affiliated)",
    #     "description": "Cases that this individual is affiliated with",
    #     "type": "array",
    #     "items": {
    #         "title": "Case",
    #         "type": "string",
    #         "linkTo": "Case"
    #     }
    # })
    # def cases_affiliate(self, request):
    #     return self.rev_link_atids(request, "cases_affiliate")

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, accession, bgm_id=None, other_id=None):
        """Use bgm_id, other_id, or accession (in that order)"""
        if bgm_id:
            title = bgm_id
        elif other_id:
            title = '%s (%s)' % (other_id['id'], other_id['id_source'])
        else:
            title = accession
        return title


@collection(
    name='cases',
    unique_key='accession',
    properties={
        'title': 'Cases',
        'description': 'Listing of Cases',
    })
class Case(Item):
    item_type = 'case'
    name_key = 'accession'
    schema = load_schema('encoded:schemas/case.json')
    embedded_list = [
    ]

    # @calculated_property(schema={
    #     "title" : "Family Trio",
    #     "type" : "array",
    #     "items" : {
    #         "type" : "object",
    #         "title" : "Trio Relationship",
    #         "properties" : {
    #             "individual": {
    #                 "title": "Individual",
    #                 "type": "string",
    #                 "linkTo": "Individual"
    #             },
    #             "relationship_type": {
    #                 "title": "Relationship Type",
    #                 "type": "string"
    #             }
    #         }
    #     }
    # })
    # def trio(self, request, proband=None):
    #     if not proband:
    #         return []
    #     individual_list = [{ "individual" : proband, "relationship_type" : "self" }]
    #     proband_object = get_item_if_you_can(request, proband, "Individual")
    #     for relation in proband_object.get("related_individuals", []):
    #         if relation["relationship_type"] in ["mother", "father", "parent"]:
    #             relationship_type = relation["relationship_type"]
    #             if relationship_type == "parent": # no gender defined
    #                 related_individual_object = get_item_if_you_can(request, relation['related_individual'], "Individual")
    #                 related_individual_gender = related_individual_object.get("gender")
    #                 if related_individual_gender == "male":
    #                     relationship_type = "father"
    #                 elif related_individual_gender == "female":
    #                     relationship_type = "mother"
    #             individual_list.append({
    #                 "individual" : relation['related_individual'],
    #                 "relationship_type" : relationship_type
    #             })
    #     return individual_list

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, title):
        return title


@collection(
    name='samples',
    unique_key='accession',
    properties={
        'title': 'Samples',
        'description': 'Listing of Samples',
    })
class Sample(Item):
    item_type = 'sample'
    name_key = 'accession'
    schema = load_schema('encoded:schemas/sample.json')
    embedded_list = [
    ]


@collection(
    name='disorderss',
    properties={
        'title': 'Disorders',
        'description': 'Listing of Disorders',
    })
class Disorder(Item):
    item_type = 'disorder'
    schema = load_schema('encoded:schemas/disorder.json')
    embedded_list = [
        'associated_phenotypes.term_name',
        'associated_phenotypes.term_id',
        'associated_phenotypes.definition'
    ]

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, disorder_name):
        return disorder_name


@collection(
    name='genes',
    unique_key='gene:gene_id',
    lookup_key='preferred_symbol',
    properties={
        'title': 'Genes',
        'description': 'Gene items',
    })
class Gene(Item):
    """Gene class."""
    item_type = 'gene'
    name_key = 'gene_id'
    schema = load_schema('encoded:schemas/gene.json')
    embedded_list = []

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, gene_id, preferred_symbol=None):
        if preferred_symbol:
            return preferred_symbol
        return 'GENE ID:{}'.format(gene_id)


@collection(
    name='phenotypes',
    properties={
        'title': 'Phenotypes',
        'description': 'Listing of Phenotypes',
    })
class Phenotype(Item):
    item_type = 'phenotype'
    schema = load_schema('encoded:schemas/phenotype.json')
    rev = {
        'associated_disorders': ('Disorder', 'associated_phenotypes')
    }
    embedded_list = [
        'associated_disorders.term_name',
        'associated_disorders.term_id',
        'associated_disorders.associated_genes'
    ]

    @calculated_property(schema={
        "title": "Associated Disorders",
        "description": "Disorders associated with this phenotype",
        "type": "array",
        "exclude_from": ["submit4dn", "FFedit-create"],
        "items": {
            "title": "Disorder",
            "type": "string",
            "linkTo": "Disorder"
        }
    })
    def associated_disorders(self, request):
        return self.rev_link_atids(request, "associated_disorders")

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, term_name):
        return term_name


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

    embedded_list = []

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
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
        properties['download_tracking'] = {
            k: v for k, v in properties.get('download_tracking', {}).items() if v is not None
        }
        validate_request(collection.type_info.schema, request, properties)
        if request.errors:  # added from validate_request
            request.remote_user = prior_remote
            raise ValidationFailure('body', 'TrackingItem: create_and_commit',
                                    'Cannot validate request')
        ti_res = sno_collection_add(collection, request, False)  # render=False
        transaction.get().commit()
        if clean_headers and 'Location' in request.response.headers:
            del request.response.headers['Location']
        request.remote_user = prior_remote
        return ti_res

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
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
