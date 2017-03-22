"""Collection for the Ontology and OntologyTerms objects."""
from snovault import (
    collection,
    load_schema,
)
from .base import (
    Item
)


@collection(
    name='ontology-terms',
    unique_key='ontology_term:term_id',
    properties={
        'title': 'Ontology Terms',
        'description': 'Listing of Ontology Terms',
    })
class OntologyTerm(Item):
    """The OntologyTerm class that holds info on a term from an ontology."""

    item_type = 'ontology_term'
    schema = load_schema('encoded:schemas/ontology_term.json')
    embedded = []
    name_key = 'term_id'


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
        embedded = [
           'synonym_terms',
           'definition_terms',
        ]
