"""The type file for the collection Pages.  Which is used for static pages on the portal

"""
from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)


@collection(
    name='pages',
    properties={
        'title': 'Pages',
        'description': 'Static Pages for the Portal',
    })
class Page(Item):
    """The Software class that contains the software... used."""
    item_type = 'page'
    schema = load_schema('encoded:schemas/page.json')
    embedded_list = []
