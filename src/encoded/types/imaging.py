"""Imaging related objects."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    get_item_or_none,
    lab_award_attribution_embed_list
)
from .dependencies import DependencyEmbedder


def _build_imaging_embedded_list():
    """ Helper function intended to be used to create the embedded list for imaging path.
        All types should implement a function like this going forward.
    """
    bio_feature_embeds = DependencyEmbedder.embed_defaults_for_type(base_path='target',
                                                                    t='bio_feature')
    return (
            Item.embedded_list + lab_award_attribution_embed_list + bio_feature_embeds + [
                # Antibody linkTo - primary_antibodies and secondary_antibody
                'primary_antibodies.antibody_name',  # display_title uses this
                'primary_antibodies.antibody_product_no',
                'secondary_antibody.antibody_name',  # display_title uses this
                'secondary_antibody.antibody_product_no'

                # FileReference linkTo
                'file_reference.accession',
                'file_reference.file_format.standard_file_extension'

                # ExperimentType linkTo
                'experiment_type.title'
            ]
    )


@collection(
    name='imaging-paths',
    properties={
        'title': 'Imaging Path',
        'description': 'Path from target to the imaging probe',
    })
class ImagingPath(Item):
    """Imaging Path class."""
    item_type = 'imaging_path'
    schema = load_schema('encoded:schemas/imaging_path.json')
    embedded_list = _build_imaging_embedded_list()

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, target=None, labels=None,
                      labeled_probe=None, secondary_antibody=None,
                      other_probes=[], primary_antibodies=[],
                      override_display_title=None):

        if override_display_title:
            return override_display_title

        # create a summary for the imaging paths
        # example Chromosomes targeted by DAPI
        # example Protein:Actin_Human targeted by Atto647N-labeled phalloidin
        # example Protein:Myoglobin_Human targeted by Human Globin Antibody (with GFP-labeled Goat Secondary Antibody)
        # example GRCh38:1:1000000 targeted by RFP-labeled BAC

        if target:
            targets = []
            for a_target in target:
                target_title = get_item_or_none(request, a_target, 'bio_feature').get('display_title')
                targets.append(target_title)
            target = ", ".join(targets)

        labeled_probes = []
        if labeled_probe:
            labeled_probes.append(labeled_probe)
        if secondary_antibody:
            labeled_probes.append(get_item_or_none(request, secondary_antibody, 'antibody').get('antibody_name'))
        if labeled_probes:
            labeled_probes = ", ".join(labeled_probes)

        primary_probes = []
        if other_probes:
            primary_probes.extend(other_probes)
        if primary_antibodies:
            for ab in primary_antibodies:
                antibody = get_item_or_none(request, ab, 'antibody').get('antibody_name')
                primary_probes.append(antibody)
        if primary_probes:
            primary_probes = ", ".join(primary_probes)

        if labels:
            # remove label if present in labeled_probes (e.g. name of secondary Ab)
            labels = [l for l in labels if l not in labeled_probes]
            labels = ",".join(labels)

        labels_title = ""
        if labels and labeled_probes:
            labels_title = labels + "-labeled " + labeled_probes
        elif labels or labeled_probes:
            labels_title = labels or labeled_probes

        probes_title = ""
        if primary_probes and labels_title:
            probes_title = primary_probes + " (with {})".format(labels_title)
        elif primary_probes or labels_title:
            probes_title = primary_probes or labels_title

        title = ""
        if target and probes_title:
            title = target + " targeted by " + probes_title
        elif target or probes_title:
            title = target or probes_title

        if title:
            return title
        else:
            return "not enough information"
