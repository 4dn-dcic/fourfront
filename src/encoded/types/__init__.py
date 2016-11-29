"""init.py lists all the collections that do not have a dedicated types file."""

from snovault.attachment import ItemWithAttachment
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
# from pyramid.traversal import find_root
from .base import (
    Item
    # paths_filtered_by_status,
)


def includeme(config):
    """include me method."""
    config.scan()


@collection(
    name='analysis-steps',
    properties={
        'title': 'AnalysisSteps',
        'description': 'Listing of analysis steps for 4DN analyses',
    })
class AnalysisStep(Item):
    """The AnalysisStep class that descrbes a step in a workflow."""

    item_type = 'analysis_step'
    schema = load_schema('encoded:schemas/analysis_step.json')
    embedded = ['software_used', 'qa_stats_generated']


@collection(
    name='awards',
    unique_key='award:name',
    properties={
        'title': 'Awards (Grants)',
        'description': 'Listing of awards (aka grants)',
    })
class Award(Item):
    """Award class."""

    item_type = 'award'
    schema = load_schema('encoded:schemas/award.json')
    name_key = 'name'
    embedded = ['pi']


@collection(
    name='biosample-cell-cultures',
    properties={
        'title': 'Biosample Cell Culture Information',
        'description': 'Listing Biosample Cell Culture Information',
    })
class BiosampleCellCulture(Item):
    """Cell culture details for Biosample."""

    base_types = ['BiosampleCellCulture'] + Item.base_types
    item_type = 'biosample_cell_culture'
    schema = load_schema('encoded:schemas/biosample_cell_culture.json')


@collection(
    name='constructs',
    properties={
        'title': 'Constructs',
        'description': 'Listing of Constructs',
    })
class Construct(Item):
    """Construct class."""

    item_type = 'construct'
    schema = load_schema('encoded:schemas/construct.json')


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
    embedded = ['lab', 'award', 'submitted_by']


@collection(
    name='enzymes',
    unique_key='enzyme:name',
    properties={
        'title': 'Enzymes',
        'description': 'Listing of enzymes',
    })
class Enzyme(Item):
    """Enzyme class."""

    item_type = 'enzyme'
    schema = load_schema('encoded:schemas/enzyme.json')
    name_key = 'name'
    embedded = ['enzyme_source']


@collection(
    name='genomic-regions',
    properties={
        'title': 'Genomic Regions',
        'description': 'Listing of genomic regions',
    })
class GenomicRegion(Item):
    """The GenomicRegion class that describes a region of a genome."""

    item_type = 'genomic_region'
    schema = load_schema('encoded:schemas/genomic_region.json')


@collection(
    name='modifications',
    properties={
        'title': 'Modifications',
        'description': 'Listing of Stable Genomic Modifications',
    })
class Modification(Item):
    """Modification class."""

    item_type = 'modification'
    schema = load_schema('encoded:schemas/modification.json')
    embedded = ['constructs', 'modified_regions', 'created_by', 'target_of_mod']

    @calculated_property(schema={
        "title": "Modification name",
        "description": "Modification name including type and target.",
        "type": "string",
    })
    def modification_name(self, request, modification_type=None, target_of_mod=None):
        if modification_type and target_of_mod:
            target = request.embed(target_of_mod, '@@object')
            return modification_type + " for " + target['target_summary']
        elif modification_type:
            return modification_type
        return "None"

    @calculated_property(schema={
        "title": "Modification name short",
        "description": "Shorter version of modification name for display on tables.",
        "type": "string",
    })
    def modification_name_short(self, request, modification_type=None, target_of_mod=None):
        if modification_type and target_of_mod:
            target = request.embed(target_of_mod, '@@object')
            return modification_type + " for " + target['target_summary_short']
        elif modification_type:
            return modification_type
        return "None"


@collection(
    name='organisms',
    unique_key='organism:name',
    properties={
        'title': 'Organisms',
        'description': 'Listing of all registered organisms',
    })
class Organism(Item):
    """Organism class."""

    item_type = 'organism'
    schema = load_schema('encoded:schemas/organism.json')
    name_key = 'name'


@collection(
    name='protocols',
    properties={
        'title': 'Protocols',
        'description': 'Listing of protocols',
    })
class Protocol(Item):
    """Protocol class."""

    base_types = ['Protocol'] + Item.base_types
    item_type = 'protocol'
    schema = load_schema('encoded:schemas/protocol.json')


@collection(
    name='quality-metric-flags',
    properties={
        'title': 'Quality Metric Flags'
    })
class QualityMetricFlag(Item):
    """Quality Metrics Flag class."""

    item_type = 'quality_metric_flag'
    schema = load_schema('encoded:schemas/quality_metric_flag.json')
    embedded = ['quality_metrics']


@collection(
    name='targets',
    properties={
        'title': 'Targets',
        'description': 'Listing of genes and regions targeted for some purpose',
    })
class Target(Item):
    """The Target class that describes a target of something."""

    item_type = 'target'
    schema = load_schema('encoded:schemas/target.json')
    embedded = ['targeted_region']

    @calculated_property(schema={
        "title": "Target summary",
        "description": "Summary of target information, either specific genes or genomic coordinates.",
        "type": "string",
    })
    def target_summary(self, request, targeted_genes=None, targeted_region=None):
        if targeted_genes:
            value = ""
            value += ' and '.join(targeted_genes)
            return value
        elif targeted_region:
            value = ""
            genomic_region = request.embed(targeted_region, '@@object')
            value += genomic_region['genome_assembly']
            if genomic_region['chromosome']:
                value += ':'
                value += genomic_region['chromosome']
            if genomic_region['start_coordinate'] and genomic_region['end_coordinate']:
                value += ':' + str(genomic_region['start_coordinate']) + '-' + str(genomic_region['end_coordinate'])
            return value
        return "no target"

    @calculated_property(schema={
        "title": "Target summary short",
        "description": "Shortened version of target summary.",
        "type": "string",
    })
    def target_summary_short(self, request, targeted_genes=None, description=None):
        if targeted_genes:
            value = ""
            value += ' and '.join(targeted_genes)
            return value
        elif description:
            return description
        return "no target"


@collection(
    name='workflows',
    properties={
        'title': 'Workflows',
        'description': 'Listing of 4DN analysis workflows',
    })
class Workflow(Item):
    """The Workflow class that describes a workflow and steps in it."""

    item_type = 'workflow'
    schema = load_schema('encoded:schemas/workflow.json')


@collection(
    name='workflow-runs',
    properties={
        'title': 'Workflow Runs',
        'description': 'Listing of executions of 4DN analysis workflows',
    })
class WorkflowRun(Item):
    """The WorkflowRun class that describes execution of a workflow."""

    item_type = 'workflow_run'
    schema = load_schema('encoded:schemas/workflow_run.json')
    embedded = ['workflow']


@collection(
    name='workflow-mappings',
    properties={
        'title': 'Workflow Mappings',
        'description': 'Listing of all workflow mappings',
    })
class WorkflowMapping(Item):
    """The WorkflowRun class that describes execution of a workflow and tasks in it."""

    item_type = 'workflow_mapping'
    schema = load_schema('encoded:schemas/workflow_mapping.json')
