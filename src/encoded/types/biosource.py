"""Collection for the Biosource object."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_put,
    validate_item_content_patch,
    validate_item_content_in_place,
    no_validate_item_content_post,
    no_validate_item_content_put,
    no_validate_item_content_patch
)
from snovault.crud_views import (
    collection_add,
    item_edit,
)
from pyramid.view import view_config
from .base import (
    Item,
    get_item_if_you_can,
    lab_award_attribution_embed_list
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
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
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
        "tissue.preferred_name",
        "tissue.slim_terms",
        "tissue.synonyms",
        "tissue.source_ontologies.ontology_name",
        "cell_line.term_name",
        "cell_line.preferred_name",
        "cell_line.slim_terms",
        "cell_line.synonyms",
        'SOP_cell_line.attachment.href',
        'SOP_cell_line.attachment.type',
        'SOP_cell_line.attachment.md5sum',
        'SOP_cell_line.description'
    ]

    @calculated_property(schema={
        "title": "Biosource name",
        "description": "Specific name of the biosource.",
        "type": "string",
    })
    def biosource_name(self, request, biosource_type, individual=None,
                       cell_line=None, cell_line_tier=None, tissue=None,
                       modifications=None, override_biosource_name=None):
        if override_biosource_name:
            # if this field is present just return it
            return override_biosource_name
        cell_line_types = [
            'primary cell',
            'primary cell line',
            'immortalized cell line',
            'stem cell',
            'induced pluripotent stem cell',
            'stem cell derived cell line',
        ]
        mod_str = ''
        if modifications:
            mod_str = ' with ' + ', '.join([get_item_if_you_can(request, mod, 'modifications').get('modification_name_short', '')
                                            for mod in modifications])
        # elif modifications and len(modifications) > 1:
        #     mod_str = ' with genetic modifications'
        if biosource_type == "tissue":
            if tissue:
                tissue_props = get_item_if_you_can(request, tissue, 'ontology_terms')
                if tissue_props:
                    return tissue_props.get('preferred_name') + mod_str
                else:
                    return biosource_type + mod_str
        elif biosource_type in cell_line_types:
            if cell_line:
                cell_line_props = get_item_if_you_can(request, cell_line, 'ontology_terms')
                if cell_line_props:
                    cell_line_name = cell_line_props.get('preferred_name')
                    if cell_line_tier:
                        if cell_line_tier != 'Unclassified':
                            return cell_line_name + ' (' + cell_line_tier + ')' + mod_str
                    return cell_line_name + mod_str
            return biosource_type + mod_str
        elif biosource_type == "multicellular organism":
            if individual:
                organism_name = 'Unknown'
                individual_props = get_item_if_you_can(request, individual, 'individuals')
                if individual_props:
                    organism = individual_props.get('organism')
                    organism_props = get_item_if_you_can(request, organism, 'organisms')
                    if organism_props:
                        organism_name = organism_props['name']
                return "whole " + organism_name + mod_str
        return biosource_type + mod_str

    @calculated_property(schema={
        "title": "Biosource categories",
        "description": "Categories for the biosource.",
        "type": "array",
        "items": {
            "title": "Category",
            "type": "string"
        }
    })
    def biosource_category(self, request, biosource_type, individual=None,
                           cell_line=None, cell_line_tier=None, tissue=None,
                           modifications=None):
        oterms = self.registry['collections']['OntologyTerm']
        tid2cat = {
            'EFO:0003042': 'H1-hESC',
            'EFO:0002784': 'GM12878',
            '4DN:0000014': 'HFF (c6 or hTERT)',
            'EFO:0009318': 'HFF (c6 or hTERT)',
            '4DN:0000001': 'HFF (c6 or hTERT)',
            '4DN:0000005': 'WTC-11',
            'EFO:0009747': 'WTC-11',
            'EFO:0001196': 'IMR-90',
            '4DN:0000260': 'Tier 2',
            '4DN:0000250': 'Tier 2',
            'EFO:0002824': 'Tier 2',
            '4DN:0000003': 'Tier 2',
            'EFO:0007598': 'Tier 2',
            'EFO:0002067': 'Tier 2',
            'EFO:0003045': 'Tier 2',
            'EFO:0002869': 'Tier 2',
            'EFO:0001182': 'Tier 2',
            '4DN:0000004': 'Tier 2',
            '4DN:0000002': 'Tier 2',
            '4DN:0000262': 'Tier 2',
            'EFO:0009319': 'Tier 2'
        }
        category = []
        tiered_line_cat = {}
        for tid, cat in tid2cat.items():
            oterm = oterms.get(tid)
            if oterm:
                tiered_line_cat[str(oterm.uuid)] = cat
        # import pdb; pdb.set_trace()
        if cell_line:
            cl_term = get_item_if_you_can(request, cell_line, 'ontology-terms')
            cluid = cl_term.get('uuid')
            if cluid and cluid in tiered_line_cat:
                category.append(tiered_line_cat[cluid])
        if biosource_type in ['stem cell', 'induced pluripotent stem cell',
                              'stem cell derived cell line']:
            ind = get_item_if_you_can(request, individual, 'individuals')
            try:
                ind_at_type = ind.get('@type', [])
            except AttributeError:
                ind_at_type = []
            for at in ind_at_type:
                if 'Human' in at:
                    category.append('Human stem cell')
                elif 'Mouse' in at:
                    category.append('Mouse stem cell')
        elif biosource_type == 'primary cell':
            category.append('Primary Cells')
        elif biosource_type in ['tissue', 'multicellular organism']:
            category.append('Multicellular Tissue')
        if tissue:
            tis_term = get_item_if_you_can(request, tissue, 'ontology-terms')
            # case for 1000 genomes/Hap Map
            if tis_term.get('preferred_name') == 'B-lymphocyte':
                if cl_term:
                    cl_name = cl_term.get('term_name')
                    if cl_name.startswith('GM') or cl_name.startswith('HG'):
                        category.append('1000 genomes/Hap Map')
        if not category:
            category.append('Other')
        return category

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, biosource_type, individual=None,
                      cell_line=None, cell_line_tier=None, tissue=None, modifications=None, override_biosource_name=None):
        return self.add_accession_to_title(self.biosource_name(request, biosource_type, individual, cell_line,
                                                               cell_line_tier, tissue, modifications, override_biosource_name))

    class Collection(Item.Collection):
        pass


# # validator for tissue field
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
        ontologies = term.upgrade_properties()['source_ontologies']
    except AttributeError:
        pass
    request.validated.update({})
    for o in ontologies:
        oname = get_item_if_you_can(request, o, 'ontologys').get('ontology_name')
        if oname in ['Uberon', '4DN Controlled Vocabulary']:
            term_ok = True
            break
    if not term_ok:
        try:
            tissuename = tissue.get('term_name')
        except AttributeError:
            tissuename = str(tissue)
        request.errors.add('body', 'Biosource: invalid tissue term', 'Term: ' + tissuename + ' is not found in UBERON')
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
        slims = term.upgrade_properties().get('slim_terms', [])
        for slim in slims:
            slim_term = getter.get(slim)
            slimfor = slim_term.upgrade_properties().get('is_slim_for')
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
        request.errors.add('body', 'Biosource: invalid cell_line term', 'Term: ' + cellname + ' is not a known valid cell line')
    else:
        request.validated.update({})


@view_config(context=Biosource.Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post, validate_biosource_cell_line, validate_biosource_tissue])
@view_config(context=Biosource.Collection, permission='add_unvalidated', request_method='POST',
             validators=[no_validate_item_content_post],
             request_param=['validate=false'])
def biosource_add(context, request, render=None):
    return collection_add(context, request, render)


@view_config(context=Biosource, permission='edit', request_method='PUT',
             validators=[validate_item_content_put, validate_biosource_cell_line, validate_biosource_tissue])  # , validate_biosource_cell_line])
@view_config(context=Biosource, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch, validate_biosource_cell_line, validate_biosource_tissue])  # , validate_biosource_cell_line])
@view_config(context=Biosource, permission='edit_unvalidated', request_method='PUT',
             validators=[no_validate_item_content_put],
             request_param=['validate=false'])
@view_config(context=Biosource, permission='edit_unvalidated', request_method='PATCH',
             validators=[no_validate_item_content_patch],
             request_param=['validate=false'])
@view_config(context=Biosource, permission='index', request_method='GET',
             validators=[validate_item_content_in_place, validate_biosource_cell_line, validate_biosource_tissue],  # , validate_biosource_cell_line],
             request_param=['check_only=true'])
def biosource_edit(context, request, render=None):
    return item_edit(context, request, render)
