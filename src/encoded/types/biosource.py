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
        name2info = {
            'H1-hESC': ['Tier 1', 'EFO_0003042'],
            'GM12878': ['Tier 1', 'EFO_0002784'],
            'IMR-90': ['Tier 1', 'EFO_0001196'],
            'HFF-hTERT': ['Tier 1', None],
            'F121-9-CASKx129': ['Tier 1', None],
            'K562': ['Tier 2', 'EFO_0002067'],
            'HEK293': ['Tier 2', 'EFO_0001182'],
            'HAP-1': ['Tier 2', 'EFO_0007598'],
            'H9': ['Tier 2', 'EFO_0003045'],
            'U2OS': ['Tier 2', 'EFO_0002869'],
            'RPE-hTERT': ['Tier 2', None],
            'WTC-11': ['Tier 2', None],
            'F123-CASKx129': ['Tier 2', None],
        }
        if 'cell_line' in properties:
            if properties['cell_line'] in name2info:
                tier = 'Unclassified'
                termid = None
                info = name2info.get(properties['cell_line'])
                if info is not None:
                    tier = info[0]
                    properties['cell_line_tier'] = tier
                    termid = info[1]
                    if termid is not None:
                        properties['cell_line_termid'] = termid

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
