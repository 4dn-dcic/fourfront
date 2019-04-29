"""Collection for the Biosample object."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    lab_award_attribution_embed_list
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
    aggregated_items = {
        "badges": [
            "messages",
            "badge.commendation",
            "badge.warning",
            "badge.uuid",
            "badge.@id",
            "badge.badge_icon",
            "badge.description"
        ]
    }
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
        'badges.badge.title',
        'badges.badge.commendation',
        'badges.badge.warning',
        'badges.badge.badge_classification',
        'badges.badge.description',
        'badges.badge.badge_icon',
        'badges.messages',
        'biosource.biosource_type',
        'biosource.individual.sex',
        'biosource.individual.organism.name',
        'biosource.biosource_vendor.name',
        "biosource.cell_line.slim_terms",
        "biosource.cell_line.synonyms",
        "biosource.cell_line_tier",
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
        'cell_culture_details.differentiation_tissue.term_name',
        'modifications.modification_type',
        'modifications.display_title',
        'modifications.description',
        'treatments.treatment_type',
        'treatments.description',
        'treatments.display_title',
        'biosample_protocols.attachment.href',
        'biosample_protocols.attachment.type',
        'biosample_protocols.attachment.md5sum',
        'biosample_protocols.description'
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
            return ' and '.join(sorted(treat_list))
        return 'None'

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
                ret_str = ret_str[:-5]
                cc = self.properties.get('cell_culture_details')
                if cc:
                    cc_props = request.embed(cc, '@@embedded')
                    if 'differentiation_tissue' in cc_props:
                        ret_str = ret_str + ' differentiated to ' + cc_props['differentiation_tissue'].get('display_title')
                return ret_str
            else:
                return 'None'
        return 'None'

    @calculated_property(schema={
        "title": "Sample type",
        "description": "The type of biosample used in an experiment.",
        "type": "string",
    })
    def biosample_type(self, request):
        biosources = self.properties.get('biosource')
        biosource_types = []
        for bs in biosources:
            # silliness in case we ever have multiple biosources
            biosource = request.embed(bs, '@@object')
            btype = biosource.get('biosource_type')
            if btype is not None:
                biosource_types.append(btype)
        biosource_types = list(set(biosource_types))
        if len(biosource_types) > 1:
            # hopefully rare or never happen
            return 'mixed sample'
        elif len(biosource_types) < 1:  # pragma: no cover
            # shouldn't happen so raise an exception
            raise "Biosource always needs type - why can't we find it"

        # we've got a single type of biosource
        bcc = self.properties.get('cell_culture_details')
        if bcc is not None:
            cell_culture = request.embed(bcc, '@@object')
            ds = cell_culture.get('differentiation_state')
            dt = cell_culture.get('differentiation_term')
            if ds or dt:
                return 'in vitro differentiated cells'

        biosource_type = biosource_types[0]
        if biosource_type == 'multicellular organism':
            biosource_type = 'whole organism'
        elif biosource_type == 'stem cell derived cell line':
            biosource_type = 'stem cell'
        elif biosource_type.endswith(' line'):
            biosource_type = biosource_type[:-5]
        if biosource_type == 'tissue':
            return biosource_type
        return biosource_type + 's'

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
