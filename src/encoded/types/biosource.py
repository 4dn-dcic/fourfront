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
    embedded = ["individual", "individual.organism", "tissue", "tissue.name"]

    def _update(self, properties, sheets=None):
        name2info = {
            'H1-hESC': ['Tier 1', 'EFO_0003042'],
            'GM12878': ['Tier 1', 'EFO_0002784'],
            'IMR-90': ['Tier 1', 'EFO_0001196'],
            'HFF-hTERT': ['Tier 1', None],
            'F121-9-CASTx129': ['Tier 2', None],
            'K562': ['Tier 2', 'EFO_0002067'],
            'HEK293': ['Tier 2', 'EFO_0001182'],
            'HAP-1': ['Tier 2', 'EFO_0007598'],
            'H9': ['Tier 2', 'EFO_0003045'],
            'U2OS': ['Tier 2', 'EFO_0002869'],
            'RPE-hTERT': ['Tier 2', None],
            'WTC-11': ['Tier 2', None],
            'F123-CASTx129': ['Tier 2', None],
            'HHF': ['Unclassified', None],
            'HHFc6': ['Tier 1', None],
            "CC-2551": ['Unclassified', None],
            "CH12-LX": ['Unclassified', 'EFO:0005233'],
            "KBM-7": ['Unclassified', 'EFO_0005903'],
            "192627": ['Unclassified', None],
            "CC-2517": ['Unclassified', 'EFO:0002795'],
            "HeLa-S3": ['Unclassified', 'EFO:0002791'],
            "SK-N-DZ": ['Unclassified', 'EFO:0005721'],
            "A549": ['Unclassified', 'EFO:0001086'],
            "NCI-H460": ['Unclassified', 'EFO:0003044'],
            "SK-N-MC": ['Unclassified', 'EFO:0002860'],
            "T47D": ['Unclassified', 'EFO:0001247'],
            "SK-MEL-5": ['Unclassified', 'EFO:0005720'],
            "G401": ['Unclassified', 'EFO:0002179'],
            "Panc1": ['Unclassified', 'EFO:0002713'],
            "Caki2": ['Unclassified', 'EFO:0002150'],
            "LNCaP clone FGC": ['Unclassified', 'EFO:0005726'],
            "RPMI-7951": ['Unclassified', 'EFO:0005712'],
            "SJCRH30": ['Unclassified', 'EFO:0005722'],
            "GM19238": ['Unclassified', 'EFO:0002788'],
            "GM19239": ['Unclassified', 'EFO:0002789'],
            "GM19240": ['Unclassified', 'EFO:0002790'],
            "HG00731": ['Unclassified', None],
            "HG00732": ['Unclassified', None],
            "HG00733": ['Unclassified', None],
            "HG00512": ['Unclassified', None],
            "HG00513": ['Unclassified', None],
            "HG00514": ['Unclassified', None],
        }
        if 'cell_line' in properties:
            if properties['cell_line'] in name2info:
                termid = None
                info = name2info.get(properties['cell_line'])
                if info is not None:
                    termid = info[1]
                    if termid is not None:
                        properties['cell_line_termid'] = termid

        super(Biosource, self)._update(properties, sheets)

    @calculated_property(schema={
        "title": "Biosource name",
        "description": "Specific name of the biosource.",
        "type": "string",
    })
    def biosource_name(self, request, biosource_type, individual=None,
                       cell_line=None, cell_line_tier=None, tissue=None):
        cell_line_types = ['immortalized cell line', 'primary cell', 'in vitro differentiated cells',
                           'induced pluripotent stem cell line', 'stem cell']
        if biosource_type == "tissue":
            if tissue:
                return request.embed(tissue, '@@object').get('term_name')
        elif biosource_type in cell_line_types:
            if cell_line:
                if cell_line_tier:
                    if cell_line_tier != 'Unclassified':
                        return cell_line + ' (' + cell_line_tier + ')'
                return cell_line
        elif biosource_type == "whole organisms":
            if individual:
                individual_props = request.embed(individual, '@@object')
                organism = individual_props['organism']
                organism_props = request.embed(organism, '@@object')
                organism_name = organism_props['name']
                return "whole " + organism_name
        return biosource_type

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, biosource_type, individual=None,
                      cell_line=None, cell_line_tier=None, tissue=None):
        return self.biosource_name(request, biosource_type, individual, cell_line, cell_line_tier, tissue)
