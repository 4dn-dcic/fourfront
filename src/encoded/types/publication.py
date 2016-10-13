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


@collection(
    name='publications',
    unique_key='publication:PMID',
    properties={
        'title': 'Publications',
        'description': 'Publication pages',
    })
class Publication(Item):
    """Publication class."""

    item_type = 'publication'
    schema = load_schema('encoded:schemas/publication.json')
    '''"title": {
        "title": "Title",
        "description": "Title of the publication or communication.",
        "uniqueKey": true,
        "type": "string"
    },
    "abstract": {
        "rdfs:subPropertyOf": "dc:abstract",
        "title": "Abstract",
        "description": "Abstract of the publication or communication.",
        "type": "string"
    },
    "contact_author": {
        "title": "Contact Author",
        "description": "Please select a user as the contact person",
        "type": "string",
        "comment": "for use of internal tracking",
        "linkTo": "User"
    },
    "authors": {
        "title": "Authors",
        "description": "All authors, with format Bernstein BE, Birney E, Dunham I,...",
        "type": "string"
    },
    '''
