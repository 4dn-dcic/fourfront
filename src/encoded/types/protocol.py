"""The type file for the collection Protocol."""
from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
from .base import (
    Item
    # paths_filtered_by_status
)

#TODO: ASK_BEN about generic classes
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
    name='protocols-cell-culture',
    properties={
        'title': 'Protocols Cell Culture',
        'description': 'Listing Cell Culture Protocols',
    })
class ProtocolsCellCulture(Protocol):
    """sub class of protocol with special variables for cell culture."""

    base_types = ['ProtocolCellCulture'] + Item.base_types
    item_type = 'protocol_cell_culture'
    schema = load_schema('encoded:schemas/protocol_cell_culture.json')
    embedded = Protocol.embedded
