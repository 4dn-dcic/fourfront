"""The type file for the collection Software.

moving this out of __init.py__ and into it's own file as
add logic for autopopulating 'name' upon update or create
"""
from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    process_embeds
    # paths_filtered_by_status,
)


@collection(
    name='softwares',
    properties={
        'title': 'Softwares',
        'description': 'Listing of software for 4DN analyses',
    })
class Software(Item):
    """The Software class that contains the software... used."""
    item_type = 'software'
    schema = load_schema('encoded:schemas/software.json')

    def _update(self, properties, sheets=None):
        # update self first to ensure 'software_relation' are stored in self.properties
        properties['tile'] = properties['name'].replace(' ', '-').lower() + '_' + properties['version']
        super(Software, self)._update(properties, sheets)

        DicRefRelation = {
            "derived from": "parent of",
            "parent of": "derived from",
            "container for": "contained in",
            "contained in": "container for"
        }
        acc = str(self.uuid)
        if 'software_relation' in properties.keys():
            for relation in properties["software_relation"]:
                switch = relation["relationship_type"]
                rev_switch = DicRefRelation[switch]
                related_sw = relation["software"]
                relationship_entry = {"relationship_type": rev_switch, "software": acc}
                rel_dic = {'software_relation': [relationship_entry, ]}

                target_sw = self.collection.get(related_sw)
                # case one we don't have relations
                if 'software_relation' not in target_sw.properties.keys():
                    target_sw.properties.update(rel_dic)
                    target_sw.update(target_sw.properties)
                else:
                    # case two we have relations but not the one we need
                    for target_relation in target_sw.properties['software_relation']:
                        if target_relation['software'] == acc:
                            break
                    else:
                        # make data for new software_relation
                        target_sw.properties['software_relation'].append(relationship_entry)
                        target_sw.update(target_sw.properties)
