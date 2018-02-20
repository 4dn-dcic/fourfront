"""Targets types file."""
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
    embedded_list = ['targeted_genome_regions.*']

    @calculated_property(schema={
        "title": "Target summary",
        "description": "Summary of target information, either specific genes or genomic coordinates.",
        "type": "string",
    })
    def target_summary(self, request, targeted_genes=None, targeted_genome_regions=None,
                       targeted_proteins=None, targeted_rnas=None, targeted_structure=None):
        value = ""
        for target_info, name in [[targeted_genes, "Gene"], [targeted_proteins, "Protein"], [targeted_rnas, "RNA"]]:
            try:
                add = name + ':' + ','.join(target_info)
                # if there are multiple species of targets combine them with &
                if value and add:
                    value += " & "
                if add:
                    value += add
            except:
                pass
        if targeted_structure:
            if value:
                value += " & "
            value += targeted_structure

        if value:
            return value

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
            return ",".join(filter(None, values))
        return "no target"

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, targeted_genes=None, targeted_genome_regions=None,
                      targeted_proteins=None, targeted_rnas=None, targeted_structure=None):
        # biosample = '/biosample/'+ self.properties['biosample']
        return self.target_summary_short(request, targeted_genes, targeted_genome_regions,
                                         targeted_proteins, targeted_rnas, targeted_structure)
