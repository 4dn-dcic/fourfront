"""The type file for the collection Badge.
"""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    set_namekey_from_title
)


@collection(
    name='badges',
    unique_key='badge:badge_name',
    properties={
        'title': 'Badges',
        'description': 'Listing of badges for 4DN items',
    })
class Badge(Item):
    """The Badge class that describes a badge that can be associated with an item."""

    item_type = 'badge'
    schema = load_schema('encoded:schemas/badge.json')
    name_key = 'badge_name'

    @calculated_property(schema={
        "title": "Commendation",
        "description": "Filled with title only if badge is positive.",
        "type": "string",
    })
    def commendation(self, title, badge_classification=None):
        if badge_classification == 'Commendation':
            return title
        return

    @calculated_property(schema={
        "title": "Warning",
        "description": "Filled with title only if badge is negative.",
        "type": "string",
    })
    def warning(self, title, badge_classification=None):
        if badge_classification == 'Warning':
            return title
        return

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['badge_name'] = set_namekey_from_title(properties)

        super(Badge, self)._update(properties, sheets)
