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

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, modification_type=None, target_of_mod=None):
        # biosample = '/biosample/'+ self.properties['biosample']
        return self.modification_name_short(request, modification_type, target_of_mod)
