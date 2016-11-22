"""Abstract collection for experiment and integration of all experiment types."""

from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)


@abstract_collection(
    name='experiments',
    unique_key='accession',
    properties={
        'title': "Experiments",
        'description': 'Listing of all types of experiments.',
    })
class Experiment(Item):
    """The main experiment class."""

    base_types = ['Experiment'] + Item.base_types
    embedded = ["protocol", "protocol_variation", "lab", "award", "biosample",
                "biosample.biosource", "biosample.modifications",
                "biosample.treatments", "biosample.biosource.individual.organism"]
    name_key = 'accession'

    def generate_mapid(self, experiment_type, num):
        delim = '_'
        mapid = str(type(self).__name__)
        mapid = mapid + delim + ''.join(experiment_type.split())
        return mapid + delim + str(num)

    def find_current_sop_map(self, experiment_type):
        maps = []
        suffnum = 1
        mapid = self.generate_mapid(experiment_type, suffnum)
        sop_coll = self.registry['collections']['SopMap']
        if sop_coll is not None:
            while(True):
                m = sop_coll.get(mapid)
                if not m:
                    break
                maps.append(m)
                suffnum += 1
                mapid = self.generate_mapid(experiment_type, suffnum)

        if len(maps) > 0:
            return maps[-1]
        return None

    def _update(self, properties, sheets=None):
        # if the sop_mapping field is not present see if it should be
        if 'sop_mapping' not in properties.keys():
            sopmap = self.find_current_sop_map(properties['experiment_type'])
            properties['sop_mapping'] = {}
            if sopmap is not None:
                sop_mapping = str(sopmap.uuid)
                properties['sop_mapping']['sop_map'] = sop_mapping
                properties['sop_mapping']['has_sop'] = "Yes"
            else:
                properties['sop_mapping']['has_sop'] = "No"
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

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', digestion_enzyme=None, biosample=None):
        sum_str = experiment_type
        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        if digestion_enzyme:
            de_props = request.embed(digestion_enzyme, '@@object')
            de_name = de_props['name']
            sum_str += (' with ' + de_name)
        return sum_str


@collection(
    name='experiments-capture-hic',
    unique_key='accession',
    properties={
        'title': 'Experiments Capture Hi-C',
        'description': 'Listing Capture Hi-C Experiments',
    })
class ExperimentCaptureC(Experiment):
    """The experiment class for Capture Hi-C experiments."""
    item_type = 'experiment_capture_c'
    schema = load_schema('encoded:schemas/experiment_capture_c.json')
    embedded = Experiment.embedded + ["digestion_enzyme", "submitted_by"]

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', digestion_enzyme=None, biosample=None):
        sum_str = experiment_type
        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        if digestion_enzyme:
            de_props = request.embed(digestion_enzyme, '@@object')
            de_name = de_props['name']
            sum_str += (' with ' + de_name)
        return sum_str


@collection(
    name='experiments-repliseq',
    unique_key='accession',
    properties={
        'title': 'Experiments Repliseq',
        'description': 'Listing of Repliseq Experiments',
    })
class ExperimentRepliseq(Experiment):
    """The experiment class for Repliseq experiments."""
    item_type = 'experiment_repliseq'
    schema = load_schema('encoded:schemas/experiment_repliseq.json')
    embedded = Experiment.embedded + ["submitted_by"]

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', cell_cycle_stage=None, biosample=None):
        sum_str = experiment_type
        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        if cell_cycle_stage:
            sum_str += (' at ' + cell_cycle_stage)
        return sum_str
