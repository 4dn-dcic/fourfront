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
        'feature_type.preferred_name',
    ]

    @calculated_property(schema={
        "title": "Species",
        "description": "The organism common name",
        "type": "string"
    })
    def organism_name(self, request):
        props = self.properties
        if 'override_organism_name' in props:
            return props.get('override_organism_name')

        # get info on organisms in database
        dborgs = self.registry.get('collections').get('Organism').values()
        taxid2name = {}
        genome2name = {}
        for dorg in dborgs:
            oprops = dorg.properties
            name = oprops.get('name')
            taxid2name[oprops.get('taxon_id')] = name
            if 'genome_assembly' in oprops:
                genome2name[oprops.get('genome_assembly')] = name

        organisms = set()
        # first see if we can get any info from genes
        genes = props.get('relevant_genes', [])
        for g in genes:
            gene = get_item_if_you_can(request, g)
            if gene is not None:
                orgn = gene.get('organism')
                if orgn is None:
                    organisms.add(orgn)
                else:
                    if orgn.endswith('/'):
                        orgn = orgn[:-1]
                    for tid, name in taxid2name.items():
                        if orgn.endswith(tid):
                            organisms.add(name)
                            break

        # now check for genomic regions
        regions = props.get('genome_location', [])
        for r in regions:
            region = get_item_if_you_can(request, r)
            if region is not None:
                assembly = region.get('genome_assembly')  # required
                if assembly in genome2name:
                    organisms.add(genome2name[assembly])
        if organisms:
            if len(organisms) > 1:
                return 'multiple organisms'
            oname = organisms.pop()
            if oname:
                return oname

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

        featstr = ''
        modstr = ''
        orgstr = ''
        # see if there is an organism_name
        oname = self.organism_name(request)
        if oname and oname != 'human':
            orgstr = oname

        # gene trumps location
        genes = props.get('relevant_genes', [])
        for g in genes:
            gene = get_item_if_you_can(request, g)
            if gene is not None:
                symb = gene.get('display_title')
                featstr = featstr + symb + ', '

        # check for mods
        mods = props.get('feature_mods', [])
        for mod in mods:
            if mod.get('mod_position'):
                modstr += (mod.get('mod_position') + ' ')
            modstr += (mod.get('mod_type') + ', ')
        if modstr:
            modstr = 'with ' + modstr[:-2]

        # if no genes use genome location
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
            if ', ' in featstr:
                ftype += 's'
        if orgstr:
            if 'multiple' in orgstr:
                return ' '.join([featstr, ftype, orgstr, modstr]).strip()
            else:
                featstr += ' {}'.format(orgstr)
        return ' '.join([featstr, ftype, modstr]).strip()
