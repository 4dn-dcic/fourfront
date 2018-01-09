"""Abstract collection for experiment and integration of all experiment types."""

from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    paths_filtered_by_status,
    get_item_if_you_can,
    ALLOW_SUBMITTER_ADD
)


@abstract_collection(
    name='experiments',
    unique_key='accession',
    acl=ALLOW_SUBMITTER_ADD,
    properties={
        'title': "Experiments",
        'description': 'Listing of all types of experiments.',
    })
class Experiment(Item):
    """The main experiment class."""

    base_types = ['Experiment'] + Item.base_types
    schema = load_schema('encoded:schemas/experiment.json')
    rev = {
        'experiment_sets': ('ExperimentSet', 'experiments_in_set'),
    }
    embedded_list = ["award.project",
                     "lab.city",
                     "lab.state",
                     "lab.country",
                     "lab.postal_code",
                     "lab.city",
                     "lab.title",

                     "experiment_sets.experimentset_type",
                     "experiment_sets.@type",
                     "experiment_sets.accession",

                     "produced_in_pub.*",
                     "publications_of_exp.*",

                     "biosample.accession",
                     "biosample.modifications_summary",
                     "biosample.treatments_summary",
                     "biosample.biosource_summary",
                     "biosample.biosource.biosource_type",
                     "biosample.biosource.cell_line.slim_terms",
                     "biosample.biosource.cell_line.synonyms",
                     "biosample.biosource.tissue.slim_terms",
                     "biosample.biosource.tissue.synonyms",
                     "biosample.biosource.individual.organism.name",
                     'biosample.modifications.modification_type',
                     'biosample.treatments.treatment_type',

                     "files.href",
                     "files.accession",
                     "files.uuid",
                     "files.file_size",
                     "files.upload_key",
                     "files.file_format",
                     "files.file_classification",
                     "files.paired_end",

                     "processed_files.href",
                     "processed_files.accession",
                     "processed_files.uuid",
                     "processed_files.file_size",
                     "processed_files.upload_key",
                     "processed_files.file_format",
                     "processed_files.file_classification"]
    name_key = 'accession'

    def generate_mapid(self, experiment_type, num):
        delim = '_'
        mapid = str(type(self).__name__)
        mapid = mapid + delim + ''.join(experiment_type.split())
        return mapid + delim + str(num)

    def has_bad_status(self, status):
        bad_statuses = ["revoked", "deleted", "obsolete", "replaced"]
        return status in bad_statuses

    def find_current_sop_map(self, experiment_type, sop_coll=None):
        maps = []
        suffnum = 1
        mapid = self.generate_mapid(experiment_type, suffnum)
        if sop_coll is not None:
            while(True):
                m = sop_coll.get(mapid)
                if not m:
                    break
                if not self.has_bad_status(m.properties.get('status')):
                    maps.append(m)
                suffnum += 1
                mapid = self.generate_mapid(experiment_type, suffnum)

        if len(maps) > 0:
            sopmap = maps[-1]
            try:
                status = sopmap.properties.get('status')
                if not self.has_bad_status(status):
                    return sopmap
            except AttributeError:
                pass
        return None

    def _update(self, properties, sheets=None):
        sop_coll = None
        if 'sop_mapping' in properties.keys():
            # check if the SopMap has bad Status
            sop_coll = self.registry['collections']['SopMap']
            currmap = properties['sop_mapping'].get('sopmap')
            if currmap:
                try:
                    if self.has_bad_status(sop_coll.get(currmap)['status']):
                        # delete mapping from properties
                        del properties['sop_mapping']
                except AttributeError:
                    # want to do some logging
                    print("CHECK STATUS OF SOP MAP")

        if 'sop_mapping' not in properties.keys():
            if sop_coll is None:
                sop_coll = self.registry['collections']['SopMap']
            # if sop_mapping field not present see if it should be
            sopmap = self.find_current_sop_map(properties['experiment_type'], sop_coll)
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

    @calculated_property(schema={
        "title": "Experiment Sets",
        "description": "Experiment Sets to which this experiment belongs.",
        "type": "array",
        "exclude_from": ["submit4dn", "FFedit-create"],
        "items": {
            "title": "Experiment Set",
            "type": ["string", "object"],
            "linkTo": "ExperimentSet"
        }
    })
    def experiment_sets(self, request):
        return self.rev_link_atids(request, "experiment_sets")

    @calculated_property(schema={
        "title": "Produced in Publication",
        "description": "The Publication in which this Experiment was produced.",
        "type": "string",
        "linkTo": "Publication"
    })
    def produced_in_pub(self, request):
        esets = [request.embed('/', str(uuid), '@@object') for uuid in
                 self.experiment_sets(request)]
        # replicate experiment set is the boss
        reps = [eset for eset in esets if 'ExperimentSetReplicate' in eset['@type']]
        if reps:
            return reps[0].get('produced_in_pub')

    @calculated_property(schema={
        "title": "Publications",
        "description": "Publications associated with this Experiment.",
        "type": "array",
        "items": {
            "title": "Publication",
            "type": "string",
            "linkTo": "Publication"
        }
    })
    def publications_of_exp(self, request):
        esets = [request.embed('/', str(uuid), '@@object') for uuid in
                 self.experiment_sets(request)]
        import itertools
        pubs = list(set(itertools.chain.from_iterable([eset.get('publications_of_set', [])
                                                      for eset in esets])))
        return pubs


@collection(
    name='experiments-hi-c',
    unique_key='accession',
    properties={
        'title': 'Experiments Hi-C',
        'description': 'Listing Hi-C Experiments',
    })
class ExperimentHiC(Experiment):
    """The experiment class for Hi-C experiments."""

    item_type = 'experiment_hi_c'
    schema = load_schema('encoded:schemas/experiment_hi_c.json')
    embedded_list = Experiment.embedded_list + ["digestion_enzyme.name"]
    name_key = 'accession'

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

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type='Undefined', digestion_enzyme=None, biosample=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, digestion_enzyme, biosample))


@collection(
    name='experiments-capture-c',
    unique_key='accession',
    properties={
        'title': 'Experiments Capture Hi-C',
        'description': 'Listing Capture Hi-C Experiments',
    })
class ExperimentCaptureC(Experiment):
    """The experiment class for Capture Hi-C experiments."""
    item_type = 'experiment_capture_c'
    schema = load_schema('encoded:schemas/experiment_capture_c.json')
    embedded_list = Experiment.embedded_list + ["digestion_enzyme.name",
                                                "targeted_regions.target.target_summary",
                                                "targeted_regions.oligo_file.href"]
    name_key = 'accession'

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

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type='Undefined', digestion_enzyme=None, biosample=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, digestion_enzyme, biosample))


@collection(
    name='experiments-repliseq',
    unique_key='accession',
    properties={
        'title': 'Experiments Repli-seq',
        'description': 'Listing of Repli-seq Experiments',
    })
class ExperimentRepliseq(Experiment):
    """The experiment class for Repli-seq experiments."""
    item_type = 'experiment_repliseq'
    schema = load_schema('encoded:schemas/experiment_repliseq.json')
    embedded_list = Experiment.embedded_list
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', cell_cycle_phase=None, stage_fraction=None, biosample=None):
        sum_str = experiment_type
        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        if cell_cycle_phase:
            sum_str += (' ' + cell_cycle_phase + '-phase')
        if stage_fraction:
            sum_str += (' ' + stage_fraction)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type='Undefined', cell_cycle_phase=None, stage_fraction=None, biosample=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, cell_cycle_phase, stage_fraction, biosample))


@collection(
    name='experiments-atacseq',
    unique_key='accession',
    properties={
        'title': 'Experiments ATAC-seq',
        'description': 'Listing ATAC-seq Experiments',
    })
class ExperimentAtacseq(Experiment):
    """The experiment class for ATAC-seq experiments."""

    item_type = 'experiment_atacseq'
    schema = load_schema('encoded:schemas/experiment_atacseq.json')
    embedded_list = Experiment.embedded_list
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', biosample=None):
        sum_str = experiment_type
        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type='Undefined', biosample=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample))


@collection(
    name='experiments-chiapet',
    unique_key='accession',
    properties={
        'title': 'Experiments CHIA-pet',
        'description': 'Listing CHIA-pet and PLAC-seq Experiments',
    })
class ExperimentChiapet(Experiment):
    """The experiment class for CHIA-pet and PLAC-seq experiments."""

    item_type = 'experiment_chiapet'
    schema = load_schema('encoded:schemas/experiment_chiapet.json')
    embedded_list = Experiment.embedded_list
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', biosample=None, target=None):
        sum_str = experiment_type

        if target:
            target_props = request.embed(target, '@@object')
            target_summary = target_props['target_summary_short']
            sum_str += ('against ' + target_summary)

        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type='Undefined', biosample=None, target=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, target))


@collection(
    name='experiments-damid',
    unique_key='accession',
    properties={
        'title': 'Experiments DAM-ID',
        'description': 'Listing DAM-ID Experiments',
    })
class ExperimentDamid(Experiment):
    """The experiment class for DAM-ID experiments."""

    item_type = 'experiment_damid'
    schema = load_schema('encoded:schemas/experiment_damid.json')
    embedded_list = Experiment.embedded_list
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', biosample=None, fusion=None):
        sum_str = experiment_type

        if fusion:
            sum_str += (' with DAM-' + fusion)

        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type='Undefined', biosample=None, fusion=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, fusion))


@collection(
    name='experiments-seq',
    unique_key='accession',
    properties={
        'title': 'Experiments CHIPseq, RNAseq ...',
        'description': 'Listing of ChIP and RNA seq type experiments',
    })
class ExperimentSeq(Experiment):
    """The experiment class for ChIPseq and RNAseq and potentially other types."""

    item_type = 'experiment_seq'
    schema = load_schema('encoded:schemas/experiment_seq.json')
    embedded_list = Experiment.embedded_list
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', biosample=None, target=None):
        sum_str = experiment_type

        if target:
            target_props = request.embed(target, '@@object')
            target_summary = target_props['target_summary_short']
            sum_str += ('against ' + target_summary)

        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type='Undefined', biosample=None, target=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, target))


@collection(
    name='experiments-mic',
    unique_key='accession',
    properties={
        'title': 'Microscopy Experiments',
        'description': 'Listing of Microscopy Experiments',
    })
class ExperimentMic(Experiment):
    """The experiment class for Microscopy experiments."""
    item_type = 'experiment_mic'
    schema = load_schema('encoded:schemas/experiment_mic.json')
    embedded_list = Experiment.embedded_list
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type='Undefined', biosample=None):
        sum_str = experiment_type
        if biosample:
            biosamp_props = request.embed(biosample, '@@object')
            biosource = biosamp_props['biosource_summary']
            sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type='Undefined', biosample=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample))


@calculated_property(context=Experiment, category='action')
def clone(context, request):
    """If the user submits for any lab, allow them to clone
    This is like creating, but keeps previous fields"""
    if request.has_permission('create'):
        return {
            'name': 'clone',
            'title': 'Clone',
            'profile': '/profiles/{ti.name}.json'.format(ti=context.type_info),
            'href': '{item_uri}#!clone'.format(item_uri=request.resource_path(context)),
        }
