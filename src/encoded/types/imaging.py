"""Imaging related objects."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
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
    embedded_list = ['award.project']

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request):
        # create a summary for the imaging paths
        # example Chromosomes targeted by DAPI
        # example Protein:Actin_Human targeted by Atto647N-labeled phalloidin
        # example Protein:Myoglobin_Human targeted by GFP-labeled Goat Secondary Antibody (with Human Globin Antibody)
        # example GRCh38:1:1000000 targeted by RFP-labeled BAC
        target = self.properties.get('target')
        labeled_probe = self.properties.get('labeled_probe')
        mediators = self.properties.get('other_probes')
        labels = self.properties.get('labels')
        title = ""
        if target:
            targets = []
            for a_target in target:
                target_title = request.embed(a_target, '@@object').get('display_title')
                targets.append(target_title)
            targets_title = ", ".join(targets)
            title = targets_title
        if labels:
            labels_title = ", ".join(labels)
            if title:
                title = title + " targeted by " + labels_title
            else:
                title = labels_title
        if labeled_probe:
            if labels:
                title = title + "-labeled " + labeled_probe
            elif title:
                title = title + " targeted by " + labeled_probe
        if mediators:
            mediators_title = ", ".join(mediators)
            title = title + " (with {})".format(mediators_title)
        if title:
            return title
        else:
            return "not enough information"
