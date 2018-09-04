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
    embedded_list = [
        "individual.age",
        "individual.age_units",
        "individual.sex",
        "individual.organism.name",
        "individual.life_stage",
        "individual.mouse_life_stage",
        "individual.mouse_strain",
        "individual.ethnicity",
        "individual.health_status",
        "modifications.modification_type",
        "tissue.term_name",
        "tissue.slim_terms",
        "tissue.synonyms",
        "tissue.source_ontology.ontology_name",
        "cell_line.term_name",
        "cell_line.slim_terms",
        "cell_line.synonyms",
        'SOP_cell_line.attachment.href',
        'SOP_cell_line.attachment.type',
        'SOP_cell_line.attachment.md5sum',
        'SOP_cell_line.description',
        'award.project'
    ]

    @calculated_property(schema={
        "title": "Biosource name",
        "description": "Specific name of the biosource.",
        "type": "string",
    })
    def biosource_name(self, request, biosource_type, individual=None,
                       cell_line=None, cell_line_tier=None, tissue=None,
                       modifications=None):
        self.upgrade_properties()
        cell_line_types = [
            'primary cell',
            'primary cell line',
            'immortalized cell line',
            'stem cell',
            'induced pluripotent stem cell',
            'stem cell derived cell line',
        ]
        mod_str = ''
        if modifications and len(modifications) == 1:
            mod_str = ' ' + request.embed(modifications[0], '@@object').get('modification_name_short', '')
        elif modifications and len(modifications) > 1:
            mod_str = ' with genetic modifications'
        if biosource_type == "tissue":
            if tissue:
                tissue_props = request.embed(tissue, '@@object')
                if tissue_props.get('term_name') is not None:
                    return tissue_props.get('term_name') + mod_str
                else:
                    return biosource_type + mod_str
        elif biosource_type in cell_line_types:
            if cell_line:
                cell_line_props = request.embed(cell_line, '@@object')
                if cell_line_props.get('term_name') is not None:
                    cell_line_name = cell_line_props.get('term_name')
                    if cell_line_tier:
                        if cell_line_tier != 'Unclassified':
                            return cell_line_name + ' (' + cell_line_tier + ')' + mod_str
                    return cell_line_name + mod_str
            return biosource_type + mod_str
        elif biosource_type == "multicellular organism":
            if individual:
                individual_props = request.embed(individual, '@@object')
                organism = individual_props['organism']
                organism_props = request.embed(organism, '@@object')
                organism_name = organism_props['name']
                return "whole " + organism_name + mod_str
        return biosource_type + mod_str

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, biosource_type, individual=None,
                      cell_line=None, cell_line_tier=None, tissue=None, modifications=None):
        return self.add_accession_to_title(self.biosource_name(request, biosource_type, individual, cell_line,
                                                               cell_line_tier, tissue, modifications))

    class Collection(Item.Collection):
        pass


# validator for tissue field
def validate_biosource_tissue(context, request):
    data = request.json
    if 'tissue' not in data:
        return
    term_ok = False
    tissue = data['tissue']
    ontology_name = None
    try:
        termuid = get_item_if_you_can(request, tissue, 'ontology-terms').get('uuid')
        try:
            # checking to see if our context is a collection or an item to set get
            context.get('blah')
            getter = context
        except AttributeError:
            getter = context.collection
        term = getter.get(termuid)
        ontology = getter.get(term.properties['source_ontology'])
        ontology_name = ontology.properties.get('ontology_name')
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
    data = request.json
    if 'cell_line' not in data:
        return
    term_ok = False
    cell_line = data['cell_line']
    try:
        # checking to see if our context is a collection or an item to set get
        context.get('blah')
        getter = context
    except AttributeError:
        getter = context.collection
    slimfor = None
    try:
        termuid = get_item_if_you_can(request, cell_line, 'ontology-terms').get('uuid')
        term = getter.get(termuid)
        slims = term.properties.get('slim_terms', [])
        for slim in slims:
            slim_term = getter.get(slim)
            slimfor = slim_term.properties.get('is_slim_for')
            if slimfor is not None and slimfor == 'cell':
                term_ok = True
                break
    except AttributeError:
        pass

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
             validators=[validate_item_content_put, validate_biosource_tissue, validate_biosource_cell_line])
@view_config(context=Biosource, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch, validate_biosource_tissue, validate_biosource_cell_line])
def biosource_edit(context, request, render=None):
    return item_edit(context, request, render)
