"""Collection for the Biosource object."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
    # paths_filtered_by_status,
)


@collection(
    name='biosources',
    unique_key='accession',
    properties={
        'title': 'Biosources',
        'description': 'Cell lines and tissues used for biosamples',
    })
class Biosource(Item):
    """Biosource class."""

    item_type = 'biosource'
    name_key = 'accession'
    schema = load_schema('encoded:schemas/biosource.json')
    embedded = ["individual", "individual.organism"]

    def _update(self, properties, sheets=None):
        #populate cell_line_termid by what is in cell_line field
        name2id = {
            'H1-hESC': 'EFO_0003042',
            'GM12878': 'EFO_0002784',
            'IMR-90': 'EFO_0001196',
            'K562': 'EFO_0002067',
            'HEK293': 'EFO_0001182',
            'H9': 'EFO_0003045',
            'U2OS': 'EFO_0002869',
        }
        if 'cell_line' in properties:
            if properties['cell_line'] in name2id:
                properties['cell_line_termid'] = name2id[properties['cell_line']]

        super(Biosource, self)._update(properties, sheets)

    @calculated_property(schema={
        "title": "Biosource name",
        "description": "Specific name of the biosource.",
        "type": "string",
    })
    def biosource_name(self, request, biosource_type, individual=None, cell_line=None, tissue=None):
        cell_line_types = ['immortalized cell line', 'primary cell', 'in vitro differentiated cells',
                           'induced pluripotent stem cell line', 'stem cell']
        if biosource_type == "tissue":
            if tissue:
                return tissue
        elif biosource_type in cell_line_types:
            if cell_line:
                return cell_line
        elif biosource_type == "whole organisms":
            if individual:
                individual_props = request.embed(individual, '@@object')
                organism = individual_props['organism']
                organism_props = request.embed(organism, '@@object')
                organism_name = organism_props['name']
                return "whole " + organism_name
        return biosource_type
