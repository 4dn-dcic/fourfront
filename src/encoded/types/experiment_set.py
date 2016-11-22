"""Abstract collection for experiment and integration of all experiment types."""

from snovault import (
    collection,
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
    embedded = ["replicate_exps.replicate_exp",
                "replicate_exps.replicate_exp.protocol",
                "replicate_exps.replicate_exp.protocol_variation",
                "replicate_exps.replicate_exp.lab",
                "replicate_exps.replicate_exp.award",
                "replicate_exps.replicate_exp.biosample",
                "replicate_exps.replicate_exp.biosample.biosource",
                "replicate_exps.replicate_exp.biosample.modifications",
                "replicate_exps.replicate_exp.biosample.treatments",
                "replicate_exps.replicate_exp.biosample.biosource.individual.organism",
                "replicate_exps.replicate_exp.files",
                "replicate_exps.replicate_exp.filesets",
                "replicate_exps.replicate_exp.filesets.files_in_set",
                "replicate_exps.replicate_exp.digestion_enzyme"]
