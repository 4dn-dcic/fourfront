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
    name='modifications',
    properties={
        'title': 'Modifications',
        'description': 'Listing of Stable Genomic Modifications',
    })
class Modification(Item):
    """Modification class."""

    item_type = 'modification'
    schema = load_schema('encoded:schemas/modification.json')
    embedded_list = ['constructs.construct_type',
                     'constructs.tags',
                     'constructs.designed_to_target',
                     'modified_regions.aliases',
                     'target_of_mod.target_summary']

    @calculated_property(schema={
        "title": "Modification name",
        "description": "Modification name including type and target.",
        "type": "string",
    })
    def modification_name(self, request, modification_type=None,
                          genomic_change=None, target_of_mod=None):
        if not modification_type:
            return "None"

        mod_name = modification_type
        if genomic_change:
            mod_name = mod_name + " " + genomic_change
        if target_of_mod:
            target = request.embed(target_of_mod, '@@object')
            mod_name = mod_name + " for " + target['target_summary']
        return mod_name

    @calculated_property(schema={
        "title": "Modification name short",
        "description": "Shorter version of modification name for display on tables.",
        "type": "string",
    })
    def modification_name_short(self, request, modification_type=None,
                                genomic_change=None, target_of_mod=None):
        if not modification_type:
            return "None"

        mod_name = modification_type
        if genomic_change:
            mod_name = mod_name + " " + genomic_change
        if target_of_mod:
            target = request.embed(target_of_mod, '@@object')
            mod_name = mod_name + " for " + target['target_summary_short']
        return mod_name

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, modification_type=None, genomic_change=None, target_of_mod=None):
        # biosample = '/biosample/'+ self.properties['biosample']
        return self.modification_name_short(request, modification_type, genomic_change, target_of_mod)
