"""Modifications types file."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)


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
    def target_summary(self, request, targeted_genes=None, targeted_genome_regions=None,
                       targeted_proteins=None, targeted_rnas=None, targeted_structure=None):
        if targeted_genes:
            value = ""
            value += ' and '.join(targeted_genes)
            return value
        elif targeted_proteins:
            value = ""
            value += ' and '.join(targeted_proteins)
            return value
        elif targeted_rnas:
            value = ""
            value += ' and '.join(targeted_rnas)
            return value
        elif targeted_structure:
            return targeted_structure
        elif targeted_genome_regions:
            values = []
            # since targetted region is a list, go through each item and get summary elements
            for each_target in targeted_genome_regions:
                genomic_region = request.embed(each_target, '@@object')
                value = ""
                value += genomic_region['genome_assembly']
                if genomic_region['chromosome']:
                    value += ':'
                    value += genomic_region['chromosome']
                if genomic_region['start_coordinate'] and genomic_region['end_coordinate']:
                    value += ':' + str(genomic_region['start_coordinate']) + '-' + str(genomic_region['end_coordinate'])
                values.append(value)
            return ", ".join(filter(None, values))
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

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, targeted_genes=None, description=None):
        # biosample = '/biosample/'+ self.properties['biosample']
        return self.target_summary_short(request, targeted_genes, description)
