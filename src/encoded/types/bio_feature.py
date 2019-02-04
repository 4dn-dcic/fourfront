"""The type file for the collection BioFeature.
"""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    lab_award_attribution_embed_list,
    get_item_if_you_can
)


@collection(
    name='bio-features',
    properties={
        'title': 'Biological Features',
        'description': 'Listing of BioFeature Items',
    })
class BioFeature(Item):
    """BioFeature class."""

    item_type = 'bio_feature'
    schema = load_schema('encoded:schemas/bio_feature.json')
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
        'feature_type.preferred_name'
    ]

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request):
        props = self.properties
        pname = props.get('preferred_label')
        if pname:
            return pname
        ft = props.get('feature_type')
        ftype = get_item_if_you_can(request, ft)
        if ftype is not None:
            ftype = ftype.get('preferred_name')

        # first pass will not assume combined fields
        if ftype == 'cellular_component':
            struct = props.get('cellular_structure')
            if struct is None:
                struct = 'unspecified cellular component'
            return struct

        # gene overrides location
        featstr = ''
        modstr = ''
        genes = props.get('relevant_genes', [])
        for g in genes:
            try:
                symb = get_item_if_you_can(request, g).get('display_title')
            except AttributeError:
                pass
            else:
                featstr = featstr + symb + ', '
            # check for mods
            mods = props.get('feature_mods', [])
            for mod in mods:
                if mod.get('mod_position'):
                    modstr += (mod.get('mod_position') + ' ')
                modstr += (mod.get('mod_type') + ', ')
            if modstr:
                modstr = 'with ' + modstr[:-2]
        if not genes:
            for loc in props.get('genome_location', []):
                try:
                    locstr = get_item_if_you_can(request, loc).get('display_title')
                except AttributeError:
                    pass
                else:
                    featstr += (locstr + ', ')
        if featstr:
            featstr = featstr[:-2]
        return ' '.join([featstr, ftype, modstr]).strip()
