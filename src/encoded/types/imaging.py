"""Imaging related objects.
"""
from snovault import (
    collection,
    load_schema,
)
from .base import (
    Item
)


@collection(
    name='imaging-paths',
    properties={
        'title': 'Imaging Path',
        'description': 'Path from target to the imaging probe',
    })
class ImagingPath(Item):
    """Imaging Path class."""
    item_type = 'imaging_path'
    schema = load_schema('encoded:schemas/imaging_path.json')
    embedded_list = []
