"""Collection for ExperimentSet and ExperimentSetReplicate."""

from pyramid.view import (
    view_config,
)
from pyramid.threadlocal import get_current_request

from snovault import (
    collection,
    load_schema,
    AfterModified,
    BeforeModified
)
from snovault.resource_views import item_view_page
from snovault.calculated import calculate_properties

from .base import (
    Item
)


def invalidate_linked_items(item, field, updates=None):
    '''Invalidates the linkTo item(s) in the given field of an item
        which will trigger re-indexing the linked items
        a dictionary of field value pairs to update for the linked item(s)
        can be provided that will be applied prior to invalidation -
        beware that each update will be applied to every linked item in the field
    '''
    request = get_current_request()
    registry = item.registry
    properties = item.properties
    if field in properties:
        links = properties[field]
        if hasattr(links, 'lower'):
            # if string turn into list
            links = [links]
        for link in links:
            linked_item = item.collection.get(link)
            registry.notify(BeforeModified(linked_item, request))
            # update item info if provided
            if updates is not None:
                for f, val in updates.items():
                    linked_item.properties[f] = val
                    linked_item.update(linked_item.properties)
            registry.notify(AfterModified(linked_item, request))


@collection(
    name='experiment-sets',
    unique_key='accession',
    properties={
        'title': 'Experiment Sets',
        'description': 'Listing Experiment Sets',
    })
class ExperimentSet(Item):
    """The experiment set class."""

    item_type = 'experiment_set'
    schema = load_schema('encoded:schemas/experiment_set.json')
    name_key = "accession"
    embedded = ["award",
                "lab",
                "experiments_in_set",
                "experiments_in_set.protocol",
                "experiments_in_set.protocol_variation",
                "experiments_in_set.lab",
                "experiments_in_set.award",
                "experiments_in_set.biosample",
                "experiments_in_set.biosample.biosource",
                "experiments_in_set.biosample.modifications",
                "experiments_in_set.biosample.treatments",
                "experiments_in_set.biosample.biosource.individual.organism",
                "experiments_in_set.files",
                "experiments_in_set.filesets",
                "experiments_in_set.filesets.files_in_set",
                "experiments_in_set.digestion_enzyme"]

    def _update(self, properties, sheets=None):
        super(ExperimentSet, self)._update(properties, sheets)
        if 'experiments_in_set' in properties:
            invalidate_linked_items(self, 'experiments_in_set')


@collection(
    name='experiment-set-replicates',
    unique_key='accession',
    properties={
        'title': 'Replicate Experiment Sets',
        'description': 'Experiment set covering biological and technical experiments',
    })
class ExperimentSetReplicate(ExperimentSet):
    """The experiment set class for replicate experiments."""

    item_type = 'experiment_set_replicate'
    schema = load_schema('encoded:schemas/experiment_set_replicate.json')
    name_key = "accession"
    embedded = ExperimentSet.embedded + ["replicate_exps.replicate_exp"]

    def _update(self, properties, sheets=None):
        all_experiments = [exp['replicate_exp'] for exp in properties['replicate_exps']]
        properties['experiments_in_set'] = all_experiments
        super(ExperimentSetReplicate, self)._update(properties, sheets)


# Use the the page view as default for experiment sets. This means that embedding
# IS relevant with regard to this specific object pages
@view_config(context=ExperimentSet, permission='view', request_method='GET', name='page')
def item_page_view(context, request):
    """Return the frame=page view rather than object view by default."""
    return item_view_page(context, request)
