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
    embedded_list = ["award.project",
                "lab.city",
                "lab.state",
                "lab.country",
                "lab.postal_code",
                "lab.city",
                "lab.title",

                "produced_in_pub.*",
                "publications_of_set.*",

                "experiments_in_set.experiment_type",
                "experiments_in_set.accession",

                "experiments_in_set.biosample.accession",
                "experiments_in_set.biosample.modifications_summary",
                "experiments_in_set.biosample.treatments_summary",
                "experiments_in_set.biosample.biosource_summary",
                "experiments_in_set.biosample.biosource.biosource_type",
                "experiments_in_set.biosample.biosource.cell_line.slim_terms",
                "experiments_in_set.biosample.biosource.cell_line.synonyms",
                "experiments_in_set.biosample.biosource.tissue.slim_terms",
                "experiments_in_set.biosample.biosource.tissue.synonyms",
                "experiments_in_set.biosample.biosource.individual.organism.name",
                'experiments_in_set.biosample.modifications.modification_type',
                'experiments_in_set.biosample.treatments.treatment_type',

                "experiments_in_set.files.href",
                "experiments_in_set.files.accession",
                "experiments_in_set.files.uuid",
                "experiments_in_set.files.file_size",
                "experiments_in_set.files.upload_key",
                "experiments_in_set.files.md5sum",
                "experiments_in_set.files.file_format",
                "experiments_in_set.files.file_classification",
                "experiments_in_set.files.paired_end",

                "experiments_in_set.files.related_files.relationship_type",
                "experiments_in_set.files.related_files.file.accession",
                "experiments_in_set.files.related_files.file.paired_end",
                "experiments_in_set.files.related_files.file.file_type",

                "experiments_in_set.filesets.files_in_set.accession",

                "experiments_in_set.digestion_enzyme.name",

                "processed_files.href",
                "processed_files.accession",
                "processed_files.uuid",
                "processed_files.file_size",
                "processed_files.upload_key",
                "processed_files.file_format",
                "processed_files.file_classification",
                "processed_files.@type",
                
                "experiments_in_set.processed_files.href",
                "experiments_in_set.processed_files.accession",
                "experiments_in_set.processed_files.uuid",
                "experiments_in_set.processed_files.file_size",
                "experiments_in_set.processed_files.upload_key",
                "experiments_in_set.processed_files.file_format",
                "experiments_in_set.processed_files.file_classification",
                "experiments_in_set.processed_files.@type"
                ]

    def _update(self, properties, sheets=None):
        if 'date_released' not in properties:
            status = properties.get('status', None)
            if status == 'released':
                release_date = datetime.datetime.now().strftime("%Y-%m-%d")
                properties['date_released'] = release_date
        super(ExperimentSet, self)._update(properties, sheets)
        # if 'experiments_in_set' in properties:
        #    invalidate_linked_items(self, 'experiments_in_set')

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
            return sorted(pubs, key=lambda pub: pub.get('date_released', pub['date_created']),
                          reverse=True)[0].get('@id')

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
        pubs = [request.embed('/', uuid, '@@object')
                for uuid in paths_filtered_by_status(request, pubs)]
        return [pub['@id'] for pub in pubs]

    @calculated_property(schema={
        "title": "Number of Experiments",
        "description": "The number of Experiments in this Experiment Set.",
        "type": "integer"
    })
    def number_of_experiments(self, request, experiments_in_set=None):
        if experiments_in_set:
            return len(experiments_in_set)


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
    embedded_list = ExperimentSet.embedded_list + [
        "replicate_exps.replicate_exp.accession"
    ]

    def _update(self, properties, sheets=None):
        all_experiments = [exp['replicate_exp'] for exp in properties['replicate_exps']]
        properties['experiments_in_set'] = all_experiments
        super(ExperimentSetReplicate, self)._update(properties, sheets)
