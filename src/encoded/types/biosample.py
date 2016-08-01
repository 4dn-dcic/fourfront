"""Collection for the Biosample object."""
from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
    # paths_filtered_by_status,
)

# from .shared_calculated_properties import (
#    CalculatedBiosampleSlims,
#    CalculatedBiosampleSynonyms
# )


@collection(
    name='biosamples',
    unique_key='accession',
    properties={
        'title': 'Biosamples',
        'description': 'Biosamples used in the 4DN project',
    })
class Biosample(Item):  # CalculatedBiosampleSlims, CalculatedBiosampleSynonyms):
    """Biosample class."""

    item_type = 'biosample'
    schema = load_schema('encoded:schemas/biosample.json')
    name_key = 'accession'
    embedded = [
        'individual',
        'individual.organism',
        'individual.documents',
        'individual.documents.award',
        'individual.documents.lab',
        'biosource',
        'biosource.biosource_vendor',
        'organism',
        'references',
        'biosample_protocols',
    ]
