"""Collection for the Biosample object."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    lab_award_attribution_embed_list,
    get_item_or_none
)


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
        'cell_culture_details.tissue.term_name',
        'cell_culture_details.tissue.preferred_name',
        'modifications.modification_type',
        'modifications.description',
        'treatments.treatment_type',
        'treatments.description',
        'treatments.constructs.expression_products.relevant_genes',
        'treatments.constructs.expression_products.feature_mods.mod_type',
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
            for mod in modifications:
                mod_props = get_item_or_none(request, mod, 'modifications')
                if mod_props and mod_props.get('modification_name'):
                    ret_str += (mod_props['modification_name'] + ' and ')
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
            mod_props = get_item_or_none(request, modifications[0], 'modifications')
            if mod_props and mod_props.get('modification_name_short'):
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
            for tmt in treatments:
                treat_props = get_item_or_none(request, tmt, 'treatments')
                treat_list.append(treat_props.get('display_title'))
            return ' and '.join(sorted([t for t in treat_list if t]))
        return 'None'

    def _get_biosource_summary(self, request, biosource, cell_culture_details=None):
        summary = ''
        for bios in biosource:
            if bios.get('biosource_name'):
                summary += (bios['biosource_name'] + ' and ')
        if len(summary) > 0:
            summary = summary[:-5]
            if cell_culture_details and len(cell_culture_details) == 1:
                if 'tissue' in cell_culture_detail:
                    tissue_term = get_item_info(request, cell_culture_details.get('tissue'), 'ontology_terms')
                    summary = summary + ' differentiated to ' + tissue_term.get('display_title')
        return summary

    def _get_biosample_type(self, biosource, cell_culture_details):
        biosource_types = []
        for bs in biosource:
            biosource_types.append(bs.get('biosource_type'))
        biosource_types = list(set(biosource_types))
        if len(biosource_types) > 1:
            # hopefully rare or never happen
            return 'mixed sample'
        elif len(biosource_types) < 1:  # pragma: no cover
            # shouldn't happen so raise an exception
            raise "Biosource always needs type - why can't we find it"

        # we've got a single type of biosource
        if cell_culture_details:  # this is now an array but just check the first
            cell_culture = cell_culture_details[0]
            if cell_culture.get('in_vitro_differentiated') == 'Yes':
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

    def _get_biosample_category(self, biosource, cell_culture_details):
        if not biosource:  # should not happen
            return None
        if len(biosource) > 1:
            return ['Mixed samples']
        categories = []
        categories = biosource[0].get('biosource_category', [])
        if cell_culture_details:  # this is now an array but just check the first
            if cell_culture_details[0].get('in_vitro_differentiated') == 'Yes':
                categories.append('In vitro Differentiation')
                return [c for c in categories if 'stem cell' not in c]
        return categories

    def _get_sample_tissue_organ(self, request, item_w_tissue):
        tissue = None
        organ_system = []
        tissue_term = get_item_info(request, item_w_tissue.get('tissue'), 'ontology_terms')
        if tissue_term is not None:
            tissue = tissue_term.get('display_title')
            if 'slim_terms' in tissue_term:
                slim_terms = get_item_info(request, tissue_term.get('slim_terms'), 'ontology_terms')
                for st in slim_terms:
                    if st.get('is_slim_for') in ['developmental', 'system', 'organ']:
                        organ_system.append(st.get('display_title'))
        return tissue, organ_system

    def _get_item_info(self, request, item, itype):
        """ Getting object representation of Items which may be passed as a list
            both of which may have more than one associated
        """
        items = []
        for it in item:
            items.append(get_item_or_none(request, it, itype))
        # don't want any None values
        return [i for i in items if i]

    @calculated_property(schema={
        "title": "Sample Info",
        "description": "Useful faceting info for biosample",
        "type": "object",
        "properties": {
            "biosource_summary": {
                "type": "string"
            },
            "biosample_category": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "biosample_type": {
                "type": "string"
            },
            "tissue_source": {
                "type": "string"
            },
            "organ_system": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
        }
    })
    def sample_info(self, request, biosource, cell_culture_details=None):
        sample_info = {}
        biosource = self._get_item_info(request, biosource, 'biosources')
        if cell_culture_details:
            cell_culture_details = self.get_item_info(request, cell_culture_details, 'cell_culture_details')
        sample_info = {}
        biosrc_summary = self._get_biosource_summary(request, biosource, cell_culture_details)
        if biosrc_summary:
            sample_info['biosource_summary'] = biosrc_summary
        categories = self._get_biosample_category(biosource, cell_culture_details)
        if categories:
            sample_info['biosample_category'] = categories
        bstype = self._get_biosample_type(biosource, cell_culture_details)
        if bstype:
            sample_info['biosample_type'] = bstype
        # getting tissue and organ/system info from cell culture info first (as it is differentiated)
        # then biosource second
        tissue = None
        organ = None
        if cell_culture_details and 'tissue' in cell_culture_details:
            tissue, organ = self._get_sample_tissue_organ(request, cell_culture_details)
        elif 'tissue' in biosource:
            tissue, organ = self._get_sample_tissue_organ(request, biosource)
        if tissue:
            sample_info['tissue_source'] = tissue
        if organ:
            sample_info['organ_system'] = organ
        return sample_info

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
