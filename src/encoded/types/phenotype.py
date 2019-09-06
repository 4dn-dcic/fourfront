"""Collection for Phenotypes objects."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)


@collection(
    name='phenotypes',
    unique_key='phenotype:hpo_id',
    lookup_key='phenotype_name',
    properties={
        'title': 'Phenotypes',
        'description': 'Listing of Phenotypes',
    })
class Phenotype(Item):
    """The Phenotype class that holds info on HPO terms."""

    item_type = 'phenotype'
    schema = load_schema('encoded:schemas/phenotype.json')
    # rev = {'associated_disorders': ('Disorder', 'associated_phenotypes')}
    embedded_list = [
        'slim_terms.is_slim_for',
        'slim_terms.phenotype_name',
        'parents.hpo_id'
    ]
    name_key = 'hpo_id'

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, hpo_id, phenotype_name=None):
        if phenotype_name:
            return phenotype_name
        return hpo_id

    # def _update(self, properties, sheets=None):
    #     '''set preferred_name field to term_name if it's not already populated
    #     '''
    #     if properties.get('preferred_name', None) is None:
    #         termname = properties.get('term_name')
    #         if termname:
    #             properties['preferred_name'] = termname
    #
    #     super(OntologyTerm, self)._update(properties, sheets)

    # @calculated_property(schema={
    #     "title": "Associated Disorders",
    #     "description": "Disorders associated with this phenotype",
    #     "type": "array",
    #     "exclude_from": ["submit4dn", "FFedit-create"],
    #     "items": {
    #         "title": "Disorder",
    #         "type": "string",
    #         "linkTo": "Disorder"
    #     }
    # })
    # def associated_disorders(self, request):
    #     return self.rev_link_atids(request, "associated_disorders")
