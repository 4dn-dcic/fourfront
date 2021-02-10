"""Collection for the Ontology and OntologyTerms objects."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)
from .dependencies import DependencyEmbedder


def _build_ontology_term_embedded_list():
    """ Helper function intended to be used to create the embedded list for ontology_term.
        All types should implement a function like this going forward.
    """
    slim_terms_embed = DependencyEmbedder.embed_defaults_for_type(base_path='slim_terms',
                                                                  t='ontology_term')
    parents_embed = DependencyEmbedder.embed_defaults_for_type(base_path='parents',
                                                               t='ontology_term')
    return slim_terms_embed + parents_embed + [
        # Ontology linkTo
        'source_ontologies.ontology_name',
        # Ontology linkTo
        'parents.source_ontologies.ontology_name',
    ]


@collection(
    name='ontology-terms',
    unique_key='ontology_term:term_id',
    lookup_key='preferred_name',
    properties={
        'title': 'Ontology Terms',
        'description': 'Listing of Ontology Terms',
    })
class OntologyTerm(Item):
    """The OntologyTerm class that holds info on a term from an ontology."""

    item_type = 'ontology_term'
    schema = load_schema('encoded:schemas/ontology_term.json')
    embedded_list = _build_ontology_term_embedded_list()
    name_key = 'term_id'

    def _update(self, properties, sheets=None):
        '''set preferred_name field to term_name if it's not already populated
        '''
        if properties.get('preferred_name', None) is None:
            termname = properties.get('term_name')
            if termname:
                properties['preferred_name'] = termname

        super(OntologyTerm, self)._update(properties, sheets)

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, term_id, preferred_name=None, term_name=None):
        if preferred_name:
            return preferred_name
        if term_name:
            return term_name
        return term_id


def _build_ontology_embedded_list():
    """ Helper function intended to be used to create the embedded list for ontology.
        All types should implement a function like this going forward.
    """
    synonym_terms_embed = DependencyEmbedder.embed_defaults_for_type(base_path='synonym_terms',
                                                                     t='ontology_term')
    definition_terms_embed = DependencyEmbedder.embed_defaults_for_type(base_path='parents',
                                                                        t='ontology_term')
    return synonym_terms_embed + definition_terms_embed


@collection(
    name='ontologys',
    unique_key='ontology:ontology_prefix',
    properties={
        'title': 'Ontologies',
        'description': 'Listing of Ontologies',
    })
class Ontology(Item):
    """The Ontology class that holds info on an ontology."""

    item_type = 'ontology'
    schema = load_schema('encoded:schemas/ontology.json')
    embedded_list = _build_ontology_embedded_list()

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, ontology_name):
        return ontology_name
