"""Abstract collection for experiment and integration of all experiment types."""

from snovault import (
    abstract_collection,
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
from .base import (
    Item
    # paths_filtered_by_status,
)


@abstract_collection(
    name='experiments',
    unique_key='accession',
    properties={
        'title': "Experiments",
        'description': 'Listing of all types of experiments.',
    })
class Experiment(Item):
    """The main expeperiment class."""

    base_types = ['Experiment'] + Item.base_types
    embedded = ["protocol", "protocol_variation", "lab", "award", "biosample",
                "biosample.biosource", "biosample.modifications",
                "biosample.treatments", "biosample.biosource.individual.organism"]
    name_key = 'accession'

    def _update(self, properties, sheets=None):
        # update self first to ensure 'experiment_relation' are stored in self.properties
        super(Experiment, self)._update(properties, sheets)
        DicRefRelation = {
             "controlled by": "control for",
             "derived from": "source for",
             "control for": "controlled by",
             "source for": "derived from"
             }
        acc = str(self.uuid)
        if 'experiment_relation' in properties.keys():
            for relation in properties["experiment_relation"]:
                switch = relation["relationship_type"]
                rev_switch = DicRefRelation[switch]
                related_exp = relation["experiment"]
                relationship_entry = {"relationship_type": rev_switch, "experiment": acc}
                rel_dic = {'experiment_relation': [relationship_entry, ]}

                target_exp = self.collection.get(related_exp)
                # case one we don't have relations
                if 'experiment_relation' not in target_exp.properties.keys():
                    target_exp.properties.update(rel_dic)
                    target_exp.update(target_exp.properties)
                else:
                    # case two we have relations but not the one we need
                    for target_relation in target_exp.properties['experiment_relation']:
                        if target_relation['experiment'] == acc:
                            break
                    else:
                        # make data for new experiemnt_relation
                        target_exp.properties['experiment_relation'].append(relationship_entry)
                        target_exp.update(target_exp.properties)

        # this part is for experiment_set
        if 'experiment_sets' in properties.keys():
            for exp_set in properties['experiment_sets']:
                target_exp_set = self.collection.get(exp_set)
                # look at the experiments inside the set
                if acc in target_exp_set.properties["experiments_in_set"]:
                    break
                else:
                    # incase it is not in the list of files
                    target_exp_set.properties["experiments_in_set"].append(acc)
                    target_exp_set.update(target_exp_set.properties)


@collection(
    name='experiment-sets',
    unique_key='uuid',
    properties={
        'title': 'Experiment Sets',
        'description': 'Listing Experiment Sets',
    })
class ExperimentSet(Item):
    """The experiment class for Hi-C experiments."""

    item_type = 'experiment_set'
    schema = load_schema('encoded:schemas/experiment_set.json')
    name_key = "uuid"

    def _update(self, properties, sheets=None):
        # update self first
        super(ExperimentSet, self)._update(properties, sheets)
        esacc = str(self.uuid)
        if "experiments_in_set" in properties.keys():
            for each_exp in properties["experiments_in_set"]:
                target_exp = self.collection.get(each_exp)
                # are there any experiment sets in the experiment
                if 'experiment_sets' not in target_exp.properties.keys():
                    target_exp.properties.update({'experiment_sets': [esacc, ]})
                    target_exp.update(target_exp.properties)
                else:
                    # incase file already has the fileset_type
                    if esacc in target_exp.properties['experiment_sets']:
                        break
                    else:
                        target_exp.properties['experiment_sets'].append(esacc)
                        target_exp.update(target_exp.properties)


@collection(
    name='experiments-hic',
    unique_key='accession',
    properties={
        'title': 'Experiments Hi-C',
        'description': 'Listing Hi-C Experiments',
    })
class ExperimentHiC(Experiment):
    """The experiment class for Hi-C experiments."""

    item_type = 'experiment_hic'
    schema = load_schema('encoded:schemas/experiment_hic.json')
    embedded = Experiment.embedded + ["digestion_enzyme", "submitted_by"]
