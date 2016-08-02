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
        'biosource',
        'biosource.individual',
        'biosource.individual.organism',
        'biosource.biosource_vendor',
        'references',
        'biosample_protocols',
    ]

    def _update(self, properties, sheets=None):
        # update self first to ensure 'biosample_relation' are stored in self.properties
        super(Biosample, self)._update(properties, sheets)
        DicRefRelation = {
             "derived from": "parent of",
             "parent of": "derived from"
             }
        acc = str(self.uuid)
        if 'biosample_relation' in properties.keys():
            for relation in properties["biosample_relation"]:
                switch = relation["relationship_type"]
                rev_switch = DicRefRelation[switch]
                related_bs = relation["biosample"]
                relationship_entry = {"relationship_type": rev_switch, "biosample": acc}
                rel_dic = {'biosample_relation': [relationship_entry, ]}

                target_bs = self.collection.get(related_bs)
                # case one we don't have relations
                if 'biosample_relation' not in target_bs.properties.keys():
                    target_bs.properties.update(rel_dic)
                    target_bs.update(target_bs.properties)
                else:
                    # case two we have relations but not the one we need
                    for target_relation in target_bs.properties['biosample_relation']:
                        if target_relation['biosample'] == acc:
                            break
                    else:
                        # make data for new biosample_relation
                        target_bs.properties['biosample_relation'].append(relationship_entry)
                        target_bs.update(target_bs.properties)
