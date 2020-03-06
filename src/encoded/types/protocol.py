from snovault import (
    calculated_property,
    collection,
    load_schema
)
from snovault.attachment import ItemWithAttachment
from .base import Item


@collection(
    name='protocols',
    properties={
        'title': 'Protocols',
        'description': 'Listing of protocols',
    })
class Protocol(Item, ItemWithAttachment):
    """Protocol class."""

    item_type = 'protocol'
    schema = load_schema('encoded:schemas/protocol.json')
    embedded_list = Item.embedded_list + ["award.project", "lab.title"]
    rev = {
        'exp_type': ('ExperimentType', 'other_protocols'),
        'sop_exp': ('ExperimentType', 'sop')
    }

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title",
        "type": "string"
    })
    def display_title(self, protocol_type, title=None, attachment=None, date_created=None):
        if title:
            return title
        elif attachment:
            return attachment.get('download')
        else:
            if protocol_type == 'Other':
                protocol_type = 'Protocol'
            if date_created:  # pragma: no cover should always have this value
                protocol_type = protocol_type + " from " + date_created[:10]
            return protocol_type

    @calculated_property(schema={
        "title": "Experiment Type",
        "description": "The type of experiment associated with this protocol",
        "type": "string",
        "linkTo": "ExperimentType"
    })
    def experiment_type(self, request):
        sop_paths = self.rev_link_atids(request, 'sop_exp')
        if sop_paths:
            return sop_paths[0]
        exptype_paths = self.rev_link_atids(request, 'exp_type')
        if exptype_paths:
            return exptype_paths[0]
