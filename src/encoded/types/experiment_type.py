from snovault import (
    calculated_property,
    collection,
    load_schema
)
from .base import (
    Item,
    set_namekey_from_title
)


@collection(
    name='experiment-types',
    unique_key='experiment_type:experiment_name',
    lookup_key='title',
    properties={
        'title': 'Experiment Types',
        'description': 'Listing of experiment types for 4DN items',
    }
)
class ExperimentType(Item):
    """The ExperimentType class that descrbes an experiment type that can be associated with an experiment."""

    item_type = 'experiment_type'
    schema = load_schema('encoded:schemas/experiment_type.json')
    name_key = 'experiment_name'
    rev = {
        'additional_protocols': ('Protocol', 'experiment_type')
    }

    embedded_list = Item.embedded_list + [
        "sop.description",
        "reference_pubs.short_attribution",
        "reference_pubs.authors",
        "reference_pubs.date_published",
        "reference_pubs.journal"
    ]

    @calculated_property(schema={
        "title": "Experiment Type Grouping",
        "description": "A shorter and more succinct name for the assay subclassification",
        "type": "string"
    })
    def assay_subclass_short(self, request, assay_classification=None, assay_subclassification=None):
        subclass_dict = {
            "Replication Timing": "Repli-seq",
            "Proximity to Organelle": "Organelle-seq",
            "DNA Binding": "DNA Binding",
            "Open Chromatin": "Open Chromatin",
            "DNA-DNA Pairwise Interactions": "Hi-C",
            "DNA-DNA Pairwise Interactions - Single Cell": "Hi-C (single cell)",
            "DNA-DNA Multi-way Interactions": "Hi-C (multi-contact)",
            "DNA-DNA Multi-way Interactions of Selected Loci": "3/4/5-C (multi-contact)",
            "DNA-DNA Pairwise Interactions of Enriched Regions": "Enrichment Hi-C",
            "DNA-DNA Pairwise Interactions of Selected Loci": "3/4/5-C",
            "Ligation-free Multi-fragment 3C": "Ligation-free 3C",
            "Transcription": "RNA-seq",
            "RNA-DNA Pairwise Interactions": "RNA-DNA HiC",
            "Fixed Sample DNA Localization": "DNA FISH",
            "Fixed Sample RNA Localization": "RNA FISH",
            "Single Particle Tracking": "SPT"
        }
        if assay_classification in subclass_dict:
            return subclass_dict[assay_classification]
        elif assay_subclassification in subclass_dict:
            return subclass_dict[assay_subclassification]
        else:
            return 'Unclassified'

    @calculated_property(schema={
        "title": "Other Protocols",
        "description": "Other protocols associated with this experiment type besides the SOP",
        "type": "string",
        "linkTo": "Protocol"
    })
    def other_protocols(self, request, sop=None):
        protocol_paths = self.rev_link_atids(request, 'additional_protocols')
        protocols = [path for path in protocol_paths if path != sop]
        if protocols:
            return protocols

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['experiment_name'] = set_namekey_from_title(properties)
        super(ExperimentType, self)._update(properties, sheets)
