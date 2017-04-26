"""Collection for ExperimentSet and ExperimentSetReplicate."""

from pyramid.threadlocal import get_current_request

from snovault import (
    calculated_property,
    collection,
    load_schema,
    AfterModified,
    BeforeModified
)
from snovault.calculated import calculate_properties

from .base import (
    Item,
    paths_filtered_by_status
)

import datetime


def is_newer_than(d1, d2):
    '''Takes 2 strings in format YYYY-MM-DD and tries to convert to date
        and if successful returns True if first string is more recent than
        second string, otherwise returns False
    '''
    try:
        date1 = datetime.datetime.strptime(d1, '%Y-%m-%d').date()
        date2 = datetime.datetime.strptime(d2, '%Y-%m-%d').date()
        if date1 > date2:
            return True
    except:
        pass
    return False


def invalidate_linked_items(item, field, updates=None):
    '''Invalidates the linkTo item(s) in the given field of an item
        which will trigger re-indexing the linked items
        a dictionary of field value pairs to update for the linked item(s)
        can be provided that will be applied prior to invalidation -
        beware that each update will be applied to every linked item in the field
    '''
    request = get_current_request()
    registry = item.registry
    try:
        properties = item.properties
    except KeyError:
        # if I try to invalidate an object that isn't yet fully stored, exit
        return
    if field in properties:
        links = properties[field]
        if hasattr(links, 'lower'):
            # if string turn into list
            links = [links]
        for link in links:
            linked_item = item.collection.get(link)
            registry.notify(BeforeModified(linked_item, request))
            # update item info if provided
            if updates is not None:
                for f, val in updates.items():
                    linked_item.properties[f] = val
                    linked_item.update(linked_item.properties)
            registry.notify(AfterModified(linked_item, request))


@collection(
    name='experiment-sets',
    unique_key='accession',
    properties={
        'title': 'Experiment Sets',
        'description': 'Listing Experiment Sets',
    })
class ExperimentSet(Item):
    """The experiment set class."""

    item_type = 'experiment_set'
    schema = load_schema('encoded:schemas/experiment_set.json')
    name_key = "accession"
    rev = {
        'publications_using': ('Publication', 'exp_sets_used_in_pub'),
        'publications_produced': ('Publication', 'exp_sets_prod_in_pub'),
    }
    embedded = ["award",
                "lab",
                "produced_in_pub",
                "publications_of_set",
                "experiments_in_set",
                "experiments_in_set.protocol",
                "experiments_in_set.protocol_variation",
                "experiments_in_set.lab",
                "experiments_in_set.award",
                "experiments_in_set.biosample",
                "experiments_in_set.biosample.biosource",
                "experiments_in_set.biosample.modifications",
                "experiments_in_set.biosample.treatments",
                "experiments_in_set.biosample.biosource.individual.organism",
                "experiments_in_set.files",
                "experiments_in_set.files.related_files.relationship_type",
                "experiments_in_set.files.related_files.file.uuid",
                "experiments_in_set.filesets",
                "experiments_in_set.filesets.files_in_set",
                "experiments_in_set.filesets.files_in_set.related_files.relationship_type",
                "experiments_in_set.filesets.files_in_set.related_files.file.uuid",
                "experiments_in_set.digestion_enzyme"]

    def _update(self, properties, sheets=None):
        if 'date_released' not in properties:
            status = properties.get('status', None)
            if status == 'released':
                release_date = datetime.datetime.now().strftime("%Y-%m-%d")
                properties['date_released'] = release_date
        super(ExperimentSet, self)._update(properties, sheets)
        if 'experiments_in_set' in properties:
            invalidate_linked_items(self, 'experiments_in_set')

    @calculated_property(schema={
        "title": "Produced in Publication",
        "description": "The Publication in which this Experiment Set was produced.",
        "type": "string",
        "linkTo": "Publication"
    })
    def produced_in_pub(self, request):
        uuids = [str(pub) for pub in self.get_rev_links('publications_produced')]
        pubs = [request.embed('/', uuid, '@@object')
                for uuid in paths_filtered_by_status(request, uuids)]
        if pubs:
            return sorted(pubs, key=lambda pub: pub.get('date_released', 0))[0]
        return []

    @calculated_property(schema={
        "title": "Publications",
        "description": "Publications associated with this Experiment Set.",
        "type": "array",
        "items": {
            "title": "Publication",
            "type": "string",
            "linkTo": "Publication"
        }
    })
    def publications_of_set(self, request):
        pubs = set([str(pub) for pub in self.get_rev_links('publications_produced') +
                self.get_rev_links('publications_using')])
        return [request.embed('/', uuid, '@@object')
                for uuid in paths_filtered_by_status(request, pubs)]


@collection(
    name='experiment-set-replicates',
    unique_key='accession',
    properties={
        'title': 'Replicate Experiment Sets',
        'description': 'Experiment set covering biological and technical experiments',
    })
class ExperimentSetReplicate(ExperimentSet):
    """The experiment set class for replicate experiments."""
    base_types = ['ExperimentSet'] + Item.base_types
    item_type = 'experiment_set_replicate'
    schema = load_schema('encoded:schemas/experiment_set_replicate.json')
    name_key = "accession"
    embedded = ExperimentSet.embedded + [
        "replicate_exps",
        "replicate_exps.replicate_exp.accession",
        "replicate_exps.replicate_exp.uuid"
    ]

    def _update(self, properties, sheets=None):
        all_experiments = [exp['replicate_exp'] for exp in properties['replicate_exps']]
        properties['experiments_in_set'] = all_experiments
        super(ExperimentSetReplicate, self)._update(properties, sheets)
