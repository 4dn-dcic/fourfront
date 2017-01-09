"""Abstract collection for experiment and integration of all experiment types."""

from pyramid.view import (
    view_config,
)
from snovault import (
    collection,
    load_schema,
)
from .base import (
    Item
)
from snovault.resource_views import item_view_page
from snovault.calculated import calculate_properties

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


@collection(
    name='experiment-set-replicates',
    unique_key='accession',
    properties={
        'title': 'Replicate Experiment Sets',
        'description': 'Experiment set covering biological and technical experiments',
    })
class ExperimentSetReplicate(Item):
    """The experiment set class for replicate experiments."""

    item_type = 'experiment_set_replicate'
    schema = load_schema('encoded:schemas/experiment_set_replicate.json')
    name_key = "accession"
    embedded = ["replicate_exps.replicate_exp",
                "award",
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
                "experiments_in_set.digestion_enzyme",
                "replicate_exps.replicate_exp"]

    def _update(self, properties, sheets=None):
        all_experiments = [exp['replicate_exp'] for exp in properties['replicate_exps']]
        properties['experiments_in_set'] = all_experiments
        super(ExperimentSetReplicate, self)._update(properties, sheets)

# Use the the page view as default for experiment sets. This means that embedding
# IS relevant with regard to this specific object pages
@view_config(context=ExperimentSetReplicate, permission='view', request_method='GET', name='page')
def item_page_view(context, request):
    """Return the frame=page view rather than object view by default."""
    return item_view_page(context, request)
