"""Abstract collection for experiment and integration of all experiment types."""

from snovault import (
    collection,
    calculated_property,
    load_schema,
)
from .base import (
    Item
)


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
    embedded = ["experiments_in_set",
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
    embedded = ["experiments_in_set",
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
        all_experiments = [exp['replicate_exp'] for exp in properties['replicate_exps']]
        properties['experiments_in_set'] = all_experiments
        super(ExperimentSetReplicate, self)._update(properties, sheets)