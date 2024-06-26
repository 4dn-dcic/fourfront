"""Abstract collection for experiment and integration of all experiment types."""

import itertools
import re

from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema
)
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_put,
    validate_item_content_patch,
    validate_item_content_in_place,
    no_validate_item_content_post,
    no_validate_item_content_put,
    no_validate_item_content_patch
)
from snovault.crud_views import (
    collection_add,
    item_edit,
)
from pyramid.view import view_config
from snovault.attachment import ItemWithAttachment
from snovault.util import debug_log
from .base import (
    Item,
    ALLOW_SUBMITTER_ADD_ACL,
    get_item_or_none,
    lab_award_attribution_embed_list
)
from .dependencies import DependencyEmbedder

EXP_CATEGORIZER_SCHEMA = {
    "title": "Categorizer",
    "description": "Fields used as an additional level of categorization for an experiment",
    "type": "object",
    "properties": {
        "field": {
            "type": "string",
            "description": "The name of the field as to be displayed in tables."
        },
        "value": {
            "type": "string",
            "description": "The value displayed for the field"
        },
        "combined": {
            "type": "string",
            "description": "Combined field:value string used for categorization of this experiment."
        }
    }
}


def _build_experiment_embedded_list():
    """ Helper function intended to be used to create the embedded list for experiment.
        All types should implement a function like this going forward.
    """
    pass


@abstract_collection(
    name='experiments',
    unique_key='accession',
    acl=ALLOW_SUBMITTER_ADD_ACL,
    properties={
        'title': "Experiments",
        'description': 'Listing of all types of experiments.',
    })
class Experiment(Item):
    """The main experiment class.

        As a special reminder on this item, which is a "parent type" item, that when you linkTo this and
        embed fields from it, you are picking up default_embeds (display_title) and must embed ALL possible
        fields that could impact it by analyzing the child types.
    """
    # TODO: Review embeds of this item for correctness. - Will 1/26/2021
    item_type = 'experiment'
    base_types = ['Experiment'] + Item.base_types
    schema = load_schema('encoded:schemas/experiment.json')
    name_key = 'accession'
    rev = {
        'experiment_sets': ('ExperimentSet', 'experiments_in_set')
    }
    aggregated_items = {
        'badges': [
            'messages',
            'badge.commendation',
            'badge.warning',
            'badge.uuid',
            'badge.@id',
            'badge.badge_icon',
            'badge.description'
        ]
    }
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
        # Badge linkTo
        'badges.badge.title',
        'badges.badge.commendation',
        'badges.badge.warning',
        'badges.badge.badge_classification',
        'badges.badge.description',
        'badges.badge.badge_icon',
        'badges.messages',

        # ExperimentSet linkTo
        'experiment_sets.experimentset_type',
        'experiment_sets.@type',
        'experiment_sets.accession',

        # Publication linkTo
        'produced_in_pub.ID',
        'produced_in_pub.title',
        'produced_in_pub.abstract',
        'produced_in_pub.journal',
        'produced_in_pub.authors',
        'produced_in_pub.short_attribution',
        'produced_in_pub.date_published',

        # Publication linkTo
        'publications_of_exp.ID',
        'publications_of_exp.title',
        'publications_of_exp.abstract',
        'publications_of_exp.journal',
        'publications_of_exp.authors',
        'publications_of_exp.short_attribution',
        'publications_of_exp.date_published',

        # Biosample linkTo
        'biosample.accession',
        'biosample.modifications_summary',  # XXX: investigate these calc props for needed embeds
        'biosample.treatments_summary',
        'biosample.biosource_summary',
        'biosample.biosample_type',

        # Biosouce linkTo (lots)
        'biosample.biosource.*',

        # OntologyTerm linkTo
        'biosample.biosource.cell_line.slim_terms',
        'biosample.biosource.cell_line.synonyms',
        'biosample.biosource.cell_line.preferred_name',
        'biosample.biosource.cell_line.term_name',
        'biosample.biosource.cell_line.term_id',

        # OntologyTerm linkTo
        'biosample.biosource.tissue.slim_terms',
        'biosample.biosource.tissue.synonyms',
        'biosample.biosource.tissue.preferred_name',
        'biosample.biosource.tissue.term_name',
        'biosample.biosource.tissue.term_id',

        # Individual linkTo
        'biosample.biosource.individual.protected_data',

        # Organism linkTo
        'biosample.biosource.organism.name',

        # Modification linkTo
        'biosample.modifications.modification_type',
        'biosample.modifications.genomic_change',
        'biosample.modifications.override_modification_name',
        'biosample.modifications.description',

        # BioFeature linkTo
        'biosample.modifications.target_of_mod.feature_type',
        'biosample.modifications.target_of_mod.preferred_label',
        'biosample.modifications.target_of_mod.cellular_structure',
        'biosample.modifications.target_of_mod.organism_name',
        'biosample.modifications.target_of_mod.relevant_genes',
        'biosample.modifications.target_of_mod.feature_mods',
        'biosample.modifications.target_of_mod.genome_location',

        # Treatment linkTo
        'biosample.treatments.treatment_type',
        'biosample.treatments.description',
        'biosample.treatments.chemical',
        'biosample.treatments.biological_agent',
        'biosample.treatments.duration',
        'biosample.treatments.duration_units',
        'biosample.treatments.concentration',
        'biosample.treatments.concentration_units',
        'biosample.treatments.temperature',

        # Construct linkTo
        'biosample.treatments.constructs.name',

        # Badge linkTo
        'biosample.badges.badge.title',
        'biosample.badges.badge.commendation',
        'biosample.badges.badge.warning',
        'biosample.badges.badge.badge_classification',
        'biosample.badges.badge.description',
        'biosample.badges.badge.badge_icon',
        'biosample.badges.messages',

        # ExperimentType linkTo
        'experiment_type.title',
        'experiment_type.experiment_category',
        'experiment_type.assay_subclass_short',

        # Files linkTo
        'files.href',
        'files.accession',
        'files.uuid',
        'files.file_size',
        'files.upload_key',
        'files.file_classification',
        'files.file_type',
        'files.file_type_detailed',
        'files.paired_end',
        'files.notes_to_tsv',
        'files.dbxrefs',
        'files.external_references.*',
        'files.related_files.relationship_type',
        'files.related_files.file.accession',
        'files.related_files.file.paired_end',
        'files.related_files.file.file_type',
        'files.related_files.file.file_type_detailed',

        # FileFormat linkTo
        'files.file_format.file_format',

        # QualityMetric linkTo
        'files.quality_metric.Total Sequences',
        'files.quality_metric.Sequence length',
        'files.quality_metric.url',
        'files.quality_metric.overall_quality_status',
        'files.quality_metric.quality_metric_summary.*',

        # FileProcessed linkTo
        'processed_files.href',
        'processed_files.accession',
        'processed_files.uuid',
        'processed_files.file_size',
        'processed_files.upload_key',
        'processed_files.file_classification',
        'processed_files.file_type',
        'processed_files.file_type_detailed',
        'processed_files.external_references.*',

        # FileFormat linkTo
        'processed_files.file_format.file_format',

        # QualityMetric linkTo
        'processed_files.quality_metric.url',
        'processed_files.quality_metric.overall_quality_status',
        'processed_files.quality_metric.quality_metric_summary.*',
        'processed_files.quality_metric.Total reads',
        'processed_files.quality_metric.qc_list.value.Total reads',

        # Static Section linkTo
        'processed_files.static_content.location',
        'processed_files.static_content.description',
        'processed_files.static_content.content.@type',

        # Object
        'other_processed_files.title',
        'other_processed_files.description',
        'other_processed_files.type',
        'other_processed_files.files.notes_to_tsv',

        # File linkTo
        "processed_files.href",
        "processed_files.accession",
        "processed_files.uuid",
        "processed_files.file_size",
        "processed_files.upload_key",
        "processed_files.file_format",
        "processed_files.file_classification",
        "processed_files.file_type",
        "processed_files.file_type_detailed",
        "processed_files.external_references.*",
        "processed_files.quality_metric.url",
        "processed_files.quality_metric.overall_quality_status",
        "processed_files.quality_metric.quality_metric_summary.*",
        "processed_files.quality_metric.Total reads",
        "processed_files.quality_metric.qc_list.value.Total reads",
        "processed_files.notes_to_tsv",
        "processed_files.open_data_url",
        "processed_files.track_and_facet_info.*",

        "other_processed_files.files.accession",
        "other_processed_files.files.href",
        "other_processed_files.files.file_type",
        "other_processed_files.files.file_type_detailed",
        "other_processed_files.files.file_size",
        "other_processed_files.files.higlass_uid",
        "other_processed_files.files.genome_assembly",
        "other_processed_files.files.status",
        "other_processed_files.files.notes_to_tsv",
        "other_processed_files.files.open_data_url",
        "other_processed_files.files.track_and_facet_info.*",
        "other_processed_files.files.quality_metric.url",
        "other_processed_files.files.quality_metric.overall_quality_status",
        "other_processed_files.files.quality_metric.quality_metric_summary.*",

        # FileFormat linkTo
        "other_processed_files.files.file_format.file_format",

        # Static Section linkTo
        "other_processed_files.files.static_content.location",
        "other_processed_files.files.static_content.description",
        "other_processed_files.files.static_content.content.@type",

        # last modification (since just time, no invalidation)
        "other_processed_files.files.last_modified.date_modified",

        # QualityMetric linkTo
        'other_processed_files.files.quality_metric.url',
        'other_processed_files.files.quality_metric.overall_quality_status',
        'other_processed_files.files.quality_metric.quality_metric_summary.*',

        # higlass view config linkTO
        "other_processed_files.higlass_view_config.description",
        "other_processed_files.higlass_view_config.last_modified.date_modified",

        # FileReference linkTo
        "reference_files.accession",
        "reference_files.file_type",
        "reference_files.file_type_detailed",
        "reference_files.file_size",
        "reference_files.file_format.file_format",
        "reference_files.file_classification",
        "reference_files.status",
        "reference_files.notes_to_tsv",

        # Static Section linkTo
        "reference_files.static_content.location",
        "reference_files.static_content.description",
        "reference_files.static_content.content.@type"
    ]

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
            except AttributeError:  # pragma: no cover
                pass
        return None

    def _update(self, properties, sheets=None):
        sop_coll = None
        exp_type = self.registry['collections']['ExperimentType']
        exp_type_title = exp_type.get(properties['experiment_type']).properties['title']
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
            sopmap = self.find_current_sop_map(exp_type_title, sop_coll)
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
            "source for": "derived from",
            "input of": "has input",
            "has input": "input of",
            "matched with": "matched with",
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
    def produced_in_pub(self, request, references=None):
        # references field is the boss if it exists
        # in each case selecting the first member if multiple
        if references:
            return references[0]

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
        pubs = list(set(itertools.chain.from_iterable([eset.get('publications_of_set', [])
                                                      for eset in esets])))
        return pubs

    @calculated_property(schema=EXP_CATEGORIZER_SCHEMA)
    def experiment_categorizer(self, request, experiment_type, digestion_enzyme=None, targeted_factor=None):
        ''' The generalish case for if there is a targeted_factor use that
            and if not use enzyme - more specific cases in specific schemas
        '''
        out_dict = {
            "field": "Default",
            "value": None
        }
        types4control = [
            '/experiment-types/damid-seq/', '/experiment-types/chip-seq/',
            '/experiment-types/nad-seq/', '/experiment-types/cut-n-run/'
        ]
        if experiment_type in types4control and not targeted_factor:
            out_dict['field'] = 'Target'
            out_dict['value'] = 'None (Control)'
        elif targeted_factor:
            tstring = ''
            for tf in targeted_factor:
                target_props = request.embed(tf, '@@object')
                tstring += ', {}'.format(target_props['display_title'])
            out_dict['field'] = 'Target'
            out_dict['value'] = tstring[2:]
        elif digestion_enzyme:
            obj = request.embed('/', digestion_enzyme, '@@object')
            out_dict['field'] = 'Enzyme'
            out_dict['value'] = obj['display_title']
        if out_dict['value'] is not None:
            out_dict['combined'] = out_dict['field'] + ': ' + out_dict['value']
        return out_dict

    class Collection(Item.Collection):
        pass


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
    embedded_list = Experiment.embedded_list + [
        # Enzyme linkTo
        'digestion_enzyme.name'
    ]
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type, biosample, digestion_enzyme=None):
        sum_str = request.embed(experiment_type, '@@object')['display_title']
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
    def display_title(self, request, experiment_type, biosample, digestion_enzyme=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, digestion_enzyme))


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
    embedded_list = Experiment.embedded_list + [
        # Enzyme linkTo
        'digestion_enzyme.name',

        # Biofeature linkTo
        'targeted_regions.target.feature_type',
        'targeted_regions.target.preferred_label',
        'targeted_regions.target.cellular_structure',
        'targeted_regions.target.organism_name',

        # GenomicRegion linkTo
        'targeted_regions.target.genome_location.genome_assembly',
        'targeted_regions.target.genome_location.location_description',
        'targeted_regions.target.genome_location.start_coordinate',
        'targeted_regions.target.genome_location.end_coordinate',
        'targeted_regions.target.genome_location.chromosome',

        # Object
        'targeted_regions.target.feature_mods.mod_type',
        'targeted_regions.target.feature_mods.mod_position',

        # Gene linkTo
        'targeted_regions.target.relevant_genes.geneid',
        'targeted_regions.target.relevant_genes.preferred_symbol',

        # File linkTo
        'targeted_regions.oligo_file.file_format.*',
        'targeted_regions.oligo_file.accession',
        'targeted_regions.oligo_file.href',
    ]
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type, biosample, digestion_enzyme=None):
        sum_str = request.embed(experiment_type, '@@object')['display_title']

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
    def display_title(self, request, experiment_type, biosample, digestion_enzyme=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, digestion_enzyme))

    @calculated_property(schema=EXP_CATEGORIZER_SCHEMA)
    def experiment_categorizer(self, request, experiment_type, biosample, targeted_regions=None, digestion_enzyme=None):
        ''' Use targeted_regions information for capture-c'''
        if targeted_regions:
            regions = []
            for tregion in targeted_regions:
                targetfeats = tregion.get('target', [])
                for feat in targetfeats:
                    region = request.embed(feat, '@@object')['display_title']
                    regions.append(region)
            if regions:
                value = ', '.join(sorted(regions))
                return {
                    'field': 'Target',
                    'value': value,
                    'combined': 'Target: ' + value
                }

        return super(ExperimentCaptureC, self).experiment_categorizer(request, experiment_type, digestion_enzyme)


def _build_experiment_repliseq_embedded_list():
    """ Helper function intended to be used to create the embedded list for ExperimentRepliseq.
        All types should implement a function like this going forward.
    """
    antibody_embeds = DependencyEmbedder.embed_defaults_for_type(
        base_path='antibody',
        t='antibody')
    return (
        Experiment.embedded_list + antibody_embeds
    )


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
    embedded_list = _build_experiment_repliseq_embedded_list()
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type, biosample, cell_cycle_phase=None, stage_fraction=None):
        sum_str = request.embed(experiment_type, '@@object')['display_title']
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
    def display_title(self, request, experiment_type, biosample, cell_cycle_phase=None, stage_fraction=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, cell_cycle_phase, stage_fraction))

    @calculated_property(schema=EXP_CATEGORIZER_SCHEMA)
    def experiment_categorizer(self, request, experiment_type, biosample, stage_fraction=None, total_fractions_in_exp=None):
        ''' Use combination of fraction and total number of fractions'''
        if stage_fraction:
            value = stage_fraction + ' of '
            if not total_fractions_in_exp:
                fraction = 'an unspecified number of fractions'
            else:
                fraction = str(total_fractions_in_exp) + ' fractions'
            value = value + fraction
            return {
                'field': 'Fraction',
                'value': value,
                'combined': 'Fraction: ' + value
            }
        else:
            return super(ExperimentRepliseq, self).experiment_categorizer(request, experiment_type)


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
    def experiment_summary(self, request, experiment_type, biosample):
        sum_str = request.embed(experiment_type, '@@object')['display_title']
        biosamp_props = request.embed(biosample, '@@object')
        biosource = biosamp_props['biosource_summary']
        sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type, biosample):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample))


def _build_experiment_chiapet_embedded_list():
    """ Helper function intended to be used to create the embedded list for ExperimentChiapet.
        All types should implement a function like this going forward.
    """
    antibody_embeds = DependencyEmbedder.embed_defaults_for_type(
        base_path='antibody',
        t='antibody')
    return (
        Experiment.embedded_list + antibody_embeds
    )


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
    embedded_list = _build_experiment_chiapet_embedded_list()
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type, biosample, targeted_factor=None):
        sum_str = request.embed(experiment_type, '@@object')['display_title']

        if targeted_factor:
            tstring = ''
            for tf in targeted_factor:
                target_props = request.embed(tf, '@@object')
                tstring += ', {}'.format(target_props['display_title'])
            sum_str += (' against ' + tstring[2:])

        biosamp_props = request.embed(biosample, '@@object')
        biosource = biosamp_props['biosource_summary']
        sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type, biosample, targeted_factor=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, targeted_factor))


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
    def experiment_summary(self, request, experiment_type, biosample, targeted_factor=None):
        sum_str = request.embed(experiment_type, '@@object')['display_title']

        if targeted_factor:
            if len(targeted_factor) == 1:
                tname = request.embed(targeted_factor[0], '@@object')['display_title']
                fusion = tname.split(' ')[0]
                sum_str += (' with DAM-' + fusion)
            else:
                sum_str += (' with mulitiple DAM fusions')

        biosamp_props = request.embed(biosample, '@@object')
        biosource = biosamp_props['biosource_summary']
        sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type, biosample, targeted_factor=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, targeted_factor))


def _build_experiment_seq_embedded_list():
    """ Helper function intended to be used to create the embedded list for ExperimentSeq.
        All types should implement a function like this going forward.
    """
    antibody_embeds = DependencyEmbedder.embed_defaults_for_type(
        base_path='antibody',
        t='antibody')
    return (
        Experiment.embedded_list + antibody_embeds
    )


@collection(
    name='experiments-seq',
    unique_key='accession',
    properties={
        'title': 'Experiments CHIPseq, RNAseq ...',
        'description': 'Listing of ChIP and RNA seq type experiments',
    })
class ExperimentSeq(ItemWithAttachment, Experiment):
    """The experiment class for ChIPseq and RNAseq and potentially other types."""

    item_type = 'experiment_seq'
    schema = load_schema('encoded:schemas/experiment_seq.json')
    embedded_list = _build_experiment_seq_embedded_list()
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type, biosample, targeted_factor=None):
        sum_str = request.embed(experiment_type, '@@object')['display_title']

        if targeted_factor:
            tstring = ''
            for tf in targeted_factor:
                target_props = request.embed(tf, '@@object')
                tstring += ', {}'.format(target_props['display_title'])
            sum_str += (' against ' + tstring[2:])

        biosamp_props = request.embed(biosample, '@@object')
        biosource = biosamp_props['biosource_summary']
        sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type, biosample, targeted_factor=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, targeted_factor))


def _build_experiment_tsaseq_embedded_list():
    """ Helper function intended to be used to create the embedded list for ExperimentTsaseq.
        All types should implement a function like this going forward.
    """
    antibody_embeds = DependencyEmbedder.embed_defaults_for_type(
        base_path='antibody',
        t='antibody')
    secondary_antibody_embeds = DependencyEmbedder.embed_defaults_for_type(
        base_path='secondary_antibody',
        t='antibody')
    return (
        Experiment.embedded_list + antibody_embeds + secondary_antibody_embeds
    )


@collection(
    name='experiments-tsaseq',
    unique_key='accession',
    properties={
        'title': 'Experiments TSA-Seq',
        'description': 'Listing of TSA-seq type experiments',
    })
class ExperimentTsaseq(ItemWithAttachment, Experiment):
    """The experiment class for TSA-seq."""

    item_type = 'experiment_tsaseq'
    schema = load_schema('encoded:schemas/experiment_tsaseq.json')
    embedded_list = _build_experiment_tsaseq_embedded_list()
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type, biosample, targeted_factor=None):
        sum_str = request.embed(experiment_type, '@@object')['display_title']

        if targeted_factor:
            tstring = ''
            for tf in targeted_factor:
                target_props = request.embed(tf, '@@object')
                tstring += ', {}'.format(target_props['display_title'])
            sum_str += (' against ' + tstring[2:])

        biosamp_props = request.embed(biosample, '@@object')
        biosource = biosamp_props['biosource_summary']
        sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type, biosample, targeted_factor=None):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample, targeted_factor))


def _build_experiment_mic_embedded_list():
    """ Helper function intended to be used to create the embedded list for ExperimentMic.
        All types should implement a function like this going forward.
    """
    imaging_path_embeds = DependencyEmbedder.embed_for_type(
        base_path='imaging_paths.path',
        t='imaging_path',
        additional_embeds=['imaging_rounds', 'experiment_type.title'])
    return (Experiment.embedded_list + imaging_path_embeds + [
        # Files linkTo
        'files.accession',  # detect display_title diff

        # MicroscopeSettings linkTo
        'files.microscope_settings.ch00_light_source_center_wl',
        'files.microscope_settings.ch01_light_source_center_wl',
        'files.microscope_settings.ch02_light_source_center_wl',
        'files.microscope_settings.ch03_light_source_center_wl',
        'files.microscope_settings.ch04_light_source_center_wl',
        'files.microscope_settings.ch00_lasers_diodes',
        'files.microscope_settings.ch01_lasers_diodes',
        'files.microscope_settings.ch02_lasers_diodes',
        'files.microscope_settings.ch03_lasers_diodes',
        'files.microscope_settings.ch04_lasers_diodes',

        # MicroscopeConfiguration linkTo
        'microscope_configuration_master.title',
        'microscope_configuration_master.microscope.Name',
        'files.microscope_configuration.title',
        'files.microscope_configuration.microscope.Name',

        # Image linkTo
        'sample_image.title',
        'sample_image.caption',
        'sample_image.microscopy_file.accession',
        'sample_image.microscopy_file.omerolink',
        'sample_image.attachment.href',
        'sample_image.attachment.type',
        'sample_image.attachment.md5sum',
        'sample_image.attachment.download',
        'sample_image.attachment.width',
        'sample_image.attachment.height',
        ]
    )


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

    embedded_list = _build_experiment_mic_embedded_list()
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Experiment summary",
        "description": "Summary of the experiment, including type, enzyme and biosource.",
        "type": "string",
    })
    def experiment_summary(self, request, experiment_type, biosample):
        sum_str = request.embed(experiment_type, '@@object')['display_title']
        biosamp_props = request.embed(biosample, '@@object')
        biosource = biosamp_props['biosource_summary']
        sum_str += (' on ' + biosource)
        return sum_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, experiment_type, biosample):
        return self.add_accession_to_title(self.experiment_summary(request, experiment_type, biosample))

    @calculated_property(schema=EXP_CATEGORIZER_SCHEMA)
    def experiment_categorizer(self, request, experiment_type, imaging_paths=None):
        ''' Use the target(s) in the imaging path'''
        if imaging_paths:
            path_targets_by_type = {}
            for pathobj in imaging_paths:
                path = get_item_or_none(request, pathobj['path'], 'imaging_path')
                for target in path.get('target', []):
                    biofeature = get_item_or_none(request, target, 'bio_feature')
                    if biofeature:
                        ftype = biofeature.get('feature_type')
                        atid = biofeature.get('@id')
                        path_targets_by_type.setdefault(ftype, {}).setdefault(atid, '')
                        path_targets_by_type[ftype][atid] = biofeature.get('display_title')
            if path_targets_by_type:
                value = []
                for feat_type, targets in path_targets_by_type.items():
                    if len(targets) > 5:
                        ftype_term = get_item_or_none(request, feat_type, 'ontology_term')
                        ftype_str = ftype_term.get('display_title')
                        if ftype_str == 'region':
                            ftype_str = 'genomic region'
                        ftype_str = f"{ftype_str.replace('_', ' ')}s"
                        value.append(f"{len(targets)} {ftype_str}")
                    else:
                        sum_targets = {}
                        for tname in targets.values():
                            # check if target starts with numbers, e.g. '50 TADs', '40 TADs'
                            # sum them if there are more: '90 TADs'
                            split_target = re.split(r'(^[0-9]+)', tname, maxsplit=1)
                            if len(split_target) > 1:
                                t_num, t_name = split_target[1:3]
                                sum_targets[t_name] = sum_targets.setdefault(t_name, 0) + int(t_num)
                            elif tname not in value:
                                value.append(tname)
                        if sum_targets:
                            value = [str(n) + t for t, n in sum_targets.items()] + value
                value = ', '.join(value)
                return {
                    'field': 'Target',
                    'value': value,
                    'combined': 'Target: ' + value
                }
        return super(ExperimentMic, self).experiment_categorizer(request, experiment_type)


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


def validate_exp_type_validity_for_experiment(context, request):
    """Check if the specified experiment type (e.g. in situ Hi-C) is allowed
    for the experiment schema (e.g. ExperimentHiC).
    """
    data = request.json
    if 'experiment_type' in data:
        exp_type_item = get_item_or_none(request, data['experiment_type'], 'experiment-types')
        if not exp_type_item:  # pragma: no cover
            # item level validation will take care of generating the error
            return
        exp_type_name = exp_type_item['title']
        allowed_types = exp_type_item.get('valid_item_types', [])
        exp = context.type_info.name
        if exp not in allowed_types:
            msg = 'Experiment Type {} is not allowed for {}'.format(exp_type_name, exp)
            request.errors.add('body', 'Experiment: invalid experiment type', msg)
        else:
            request.validated.update({})


@view_config(context=Experiment.Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post, validate_exp_type_validity_for_experiment])
@view_config(context=Experiment.Collection, permission='add_unvalidated', request_method='POST',
             validators=[no_validate_item_content_post],
             request_param=['validate=false'])
@debug_log
def experiment_add(context, request, render=None):
    return collection_add(context, request, render)


@view_config(context=Experiment, permission='edit', request_method='PUT',
             validators=[validate_item_content_put, validate_exp_type_validity_for_experiment])
@view_config(context=Experiment, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch, validate_exp_type_validity_for_experiment])
@view_config(context=Experiment, permission='edit_unvalidated', request_method='PUT',
             validators=[no_validate_item_content_put],
             request_param=['validate=false'])
@view_config(context=Experiment, permission='edit_unvalidated', request_method='PATCH',
             validators=[no_validate_item_content_patch],
             request_param=['validate=false'])
@view_config(context=Experiment, permission='index', request_method='GET',
             validators=[validate_item_content_in_place, validate_exp_type_validity_for_experiment],
             request_param=['check_only=true'])
@debug_log
def experiment_edit(context, request, render=None):
    return item_edit(context, request, render)
