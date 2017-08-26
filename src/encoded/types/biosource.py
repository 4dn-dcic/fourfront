"""Collection for the Biosource object."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_patch,
    validate_item_content_put,
)
from snovault.etag import if_match_tid
from pyramid.view import view_config
from .base import (
    Item,
    collection_add,
    get_item_if_you_can,
    item_edit,
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
    embedded_list = ["individual.age",
                "individual.age_units",
                "individual.sex",
                "individual.organism.name",
                "tissue.slim_terms",
                "tissue.synonyms",
                "cell_line.slim_terms",
                "cell_line.synonyms"]

    @calculated_property(schema={
        "title": "Biosource name",
        "description": "Specific name of the biosource.",
        "type": "string",
    })
    def biosource_name(self, request, biosource_type, individual=None,
                       cell_line=None, cell_line_tier=None, tissue=None):
        self.upgrade_properties()
        cell_line_types = ['immortalized cell line', 'primary cell', 'in vitro differentiated cells',
                           'induced pluripotent stem cell line', 'stem cell']
        if biosource_type == "tissue":
            if tissue:
                return request.embed(tissue, '@@object').get('term_name')
        elif biosource_type in cell_line_types:
            if cell_line:
                cell_line_name = request.embed(cell_line, '@@object').get('term_name')
                if cell_line_tier:
                    if cell_line_tier != 'Unclassified':
                        return cell_line_name + ' (' + cell_line_tier + ')'
                return cell_line_name
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

    class Collection(Item.Collection):
        pass


# validator for tissue field
def validate_biosource_tissue(context, request):
    # import pdb; pdb.set_trace()
    data = request.json
    if 'tissue' not in data:
        return
    term_ok = False
    tissue = data['tissue']
    # print(tissue)
    tissue = get_item_if_you_can(request, tissue, 'ontology-terms')
    ontology = None
    ontology_name = None
    try:
        ontology = tissue.get('source_ontology')
    except AttributeError:
        pass

    if ontology is not None:
        ontology = get_item_if_you_can(request, ontology, 'ontologys')
        try:
            ontology_name = ontology.get('ontology_name')
        except AttributeError:
            pass

    if ontology_name is not None and (
            ontology_name == 'Uberon' or ontology_name == '4DN Controlled Vocabulary'):
        term_ok = True
    if not term_ok:
        try:
            tissuename = tissue.get('term_name')
        except AttributeError:
            tissuename = str(tissue)
        request.errors.add('body', None, 'Term: ' + tissuename + ' is not found in UBERON')
    else:
        request.validated.update({})


# validator for cell_line field
def validate_biosource_cell_line(context, request):
    # import pdb; pdb.set_trace()
    data = request.json
    if 'cell_line' not in data:
        return
    term_ok = False
    cell_line = data['cell_line']
    cell_line = get_item_if_you_can(request, cell_line, 'ontology-terms')
    slims = None
    try:
        slims = cell_line.get('slim_terms')
    except AttributeError:
        pass

    if slims is not None:
        for slim in slims:
            slim_term = get_item_if_you_can(request, slim, 'ontology-terms')
            try:
                slimfor = slim_term.get('is_slim_for')
            except AttributeError:
                pass

            if slimfor is not None and slimfor == 'cell':
                term_ok = True

    if not term_ok:
        try:
            cellname = cell_line.get('term_name')
        except AttributeError:
            cellname = str(cell_line)
        request.errors.add('body', None, 'Term: ' + cellname + ' is not a known valid cell line')
    else:
        request.validated.update({})


@view_config(context=Biosource.Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post, validate_biosource_tissue, validate_biosource_cell_line])
def biosource_add(context, request, render=None):
    return collection_add(context, request, render)


@view_config(context=Biosource, permission='edit', request_method='PUT',
             validators=[validate_item_content_put, validate_biosource_tissue, validate_biosource_cell_line],
             decorator=if_match_tid)
@view_config(context=Biosource, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch, validate_biosource_tissue, validate_biosource_cell_line],
             decorator=if_match_tid)
def biosource_edit(context, request, render=None):
    return item_edit(context, request, render)
