"""Collection for the Biosample object."""
from snovault import (
    calculated_property,
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
    # name_key = 'accession'
    embedded_list = [
        'biosource.biosource_type',
        'biosource.individual.sex',
        'biosource.individual.organism.name',
        'biosource.biosource_vendor.name',
        "biosource.cell_line.slim_terms",
        "biosource.cell_line.synonyms",
        "biosource.tissue.slim_terms",
        "biosource.tissue.synonyms",
        'cell_culture_details.*',
        'cell_culture_details.morphology_image.caption',
        'cell_culture_details.morphology_image.attachment.href',
        'cell_culture_details.morphology_image.attachment.type',
        'cell_culture_details.morphology_image.attachment.md5sum',
        'cell_culture_details.morphology_image.attachment.download',
        'cell_culture_details.morphology_image.attachment.width',
        'cell_culture_details.morphology_image.attachment.height',
        'modifications.modification_type',
        'modifications.description',
        'treatments.treatment_type',
        'treatments.description',
        'biosample_protocols.attachment.href',
        'biosample_protocols.attachment.type',
        'biosample_protocols.attachment.md5sum',
        'biosample_protocols.description',
        'award.project'
    ]
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Modifications summary",
        "description": "Summary of any modifications on the biosample.",
        "type": "string",
    })
    def modifications_summary(self, request, modifications=None):
        if modifications:
            ret_str = ''
            for i in range(len(modifications)):
                mod_props = request.embed(modifications[i], '@@object')
                ret_str += (mod_props['modification_name'] + ' and ') if mod_props['modification_name'] else ''
            if len(ret_str) > 0:
                return ret_str[:-5]
            else:
                return 'None'
        return 'None'

    @calculated_property(schema={
        "title": "Modifications summary short",
        "description": "Shorter summary of any modifications on the biosample for tables.",
        "type": "string",
    })
    def modifications_summary_short(self, request, modifications=None):
        if modifications:
            # use only the first modification
            mod_props = request.embed(modifications[0], '@@object')
            return mod_props['modification_name_short']
        return 'None'

    @calculated_property(schema={
        "title": "Treatment types",
        "description": "Summary of treatments on the biosample.",
        "type": "string",
    })
    def treatments_type(self, request, treatments=None):
        if treatments:
            treat_list = []
            for i in range(len(treatments)):
                treat_props = request.embed(treatments[i], '@@object')
                treat_list.append(treat_props.get('treatment_type', ''))
            return ' and '.join(sorted(list(set(treat_list))))
            # if len(ret_str) > 5:
            #    return ret_str[:-5]
            # else:
            #    return 'None'
        return 'None'

    @calculated_property(schema={
        "title": "Treatment summary",
        "description": "Summary of treatments on the biosample.",
        "type": "string",
    })
    def treatments_summary(self, request, treatments=None):
        if treatments:
            treat_list = []
            for i in range(len(treatments)):
                treat_props = request.embed(treatments[i], '@@object')
                treat_list.append(treat_props.get('display_title', ''))
            return '; '.join(sorted(treat_list))
        return 'None'

#    @calculated_property(schema={
#        "title": "Treatment summary",
#        "description": "Summary of treatments on the biosample.",
#        "type": "string",
#    })
#    def treatments_summary(self, request, treatments=None):
#        if treatments:
#            treat_list = []
#            for i in range(len(treatments)):
#                treat_props = request.embed(treatments[i], '@@object')
#                treat_list.append(treat_props.get('description', ''))
#            return ', '.join(sorted(treat_list))
        # if len(ret_str) > 5:
        #    return ret_str[:-5]
        # else:
        #    return 'None'
#        return 'None'

    @calculated_property(schema={
        "title": "Biosource summary",
        "description": "Summary of any biosources comprising the biosample.",
        "type": "string",
    })
    def biosource_summary(self, request, biosource=None):
        if biosource:
            ret_str = ''
            for i in range(len(biosource)):
                bios_props = request.embed(biosource[i], '@@object')
                ret_str += (bios_props['biosource_name'] + ' and ') if bios_props['biosource_name'] else ''
            if len(ret_str) > 0:
                return ret_str[:-5]
            else:
                return 'None'
        return 'None'

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


@calculated_property(context=Biosample, category='action')
def clone(context, request):
    """If the user submits for any lab, allow them to clone
    This is like creating, but keeps previous fields"""
    if request.has_permission('create'):
        return {
            'name': 'clone',
            'title': 'Clone',
            'profile': '/profiles/{ti.name}.json'.format(ti=context.type_info),
            'href': '{item_uri}#!clone'.format(item_uri=request.resource_path(context)),
        }
