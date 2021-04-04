"""Imaging related objects."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    lab_award_attribution_embed_list
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
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, target=None, labeled_probe=None, other_probes=None, labels=None):
        # create a summary for the imaging paths
        # example Chromosomes targeted by DAPI
        # example Protein:Actin_Human targeted by Atto647N-labeled phalloidin
        # example Protein:Myoglobin_Human targeted by Human Globin Antibody (with GFP-labeled Goat Secondary Antibody)
        # example GRCh38:1:1000000 targeted by RFP-labeled BAC

        if target:
            targets = []
            for a_target in target:
                target_title = request.embed(a_target, '@@object').get('display_title')
                targets.append(target_title)
            target = ", ".join(targets)
        if other_probes:
            other_probes = ", ".join(other_probes)
        if labels:
            labels = ",".join(labels)

        labels_title = ""
        if labels and labeled_probe:
            labels_title = labels + "-labeled " + labeled_probe
        elif labels or labeled_probe:
            labels_title = labels or labeled_probe

        probes_title = ""
        if other_probes and labels_title:
            probes_title = other_probes + " (with {})".format(labels_title)
        elif other_probes or labels_title:
            probes_title = other_probes or labels_title

        title = ""
        if target and probes_title:
            title = target + " targeted by " + probes_title
        elif target or probes_title:
            title = target or probes_title

        if title:
            return title
        else:
            return "not enough information"
