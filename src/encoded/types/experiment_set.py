"""Collection for ExperimentSet and ExperimentSetReplicate."""

from pyramid.threadlocal import get_current_request
from pyramid.view import view_config
from snovault import (
    calculated_property,
    collection,
    load_schema,
    AfterModified,
    BeforeModified
)
from snovault.calculated import calculate_properties
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_patch,
    validate_item_content_put,
)
from .base import (
    Item,
    paths_filtered_by_status,
    collection_add,
    item_edit,
    lab_award_attribution_embed_list
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
    embedded_list = lab_award_attribution_embed_list + [
        "static_headers.content",
        "static_headers.title",
        "static_headers.filetype",
        "static_headers.section_type",
        "static_headers.options.default_open",
        "static_headers.options.title_icon",

        "produced_in_pub.title",
        "produced_in_pub.abstract",
        "produced_in_pub.journal",
        "produced_in_pub.authors",
        "produced_in_pub.short_attribution",
        "publications_of_set.title",
        "publications_of_set.abstract",
        "publications_of_set.journal",
        "publications_of_set.authors",

        "experiments_in_set.experiment_type",
        "experiments_in_set.accession",
        "experiments_in_set.status",
        "experiments_in_set.experiment_categorizer.field",
        "experiments_in_set.experiment_categorizer.value",
        "experiments_in_set.experiment_categorizer.combined",
        "experiments_in_set.badges.*",

        "experiments_in_set.biosample.accession",
        "experiments_in_set.biosample.modifications_summary",
        "experiments_in_set.biosample.biosource_summary",
        "experiments_in_set.biosample.biosample_type",
        "experiments_in_set.biosample.biosource.biosource_type",
        "experiments_in_set.biosample.biosource.cell_line.slim_terms",
        "experiments_in_set.biosample.biosource.cell_line.synonyms",
        "experiments_in_set.biosample.biosource.tissue.slim_terms",
        "experiments_in_set.biosample.biosource.tissue.synonyms",
        "experiments_in_set.biosample.biosource.individual.organism.name",
        'experiments_in_set.biosample.modifications.modification_type',
        'experiments_in_set.biosample.modifications.display_title',
        'experiments_in_set.biosample.treatments.treatment_type',
        'experiments_in_set.biosample.treatments.display_title',
        'experiments_in_set.biosample.treatments_summary',
        "experiments_in_set.biosample.badges.*",

        "experiments_in_set.digestion_enzyme.name",
        "experiments_in_set.filesets.files_in_set.accession",

        # Files - For common embeds (href, file_format, etc) we could programatically get rid of a bunch of similar lines - e.g.:
        # for f in ['href', 'accession', 'file_size, ...]:
        #     ExperimentSet.embedded_list.append("experiments_in_set.files." + f)
        #     ExperimentSet.embedded_list.append("experiments_in_set.processed_files." + f) ...

        "experiments_in_set.files.href",
        "experiments_in_set.files.accession",
        "experiments_in_set.files.uuid",
        "experiments_in_set.files.file_size",
        "experiments_in_set.files.upload_key",
        "experiments_in_set.files.md5sum",
        "experiments_in_set.files.file_format",
        "experiments_in_set.files.file_type",
        "experiments_in_set.files.file_type_detailed",
        "experiments_in_set.files.file_classification",
        "experiments_in_set.files.paired_end",
        "experiments_in_set.files.status",
        "experiments_in_set.files.extra_files",
        "experiments_in_set.files.extra_files.href",
        "experiments_in_set.files.extra_files.file_format",
        "experiments_in_set.files.quality_metric.Total Sequences",
        "experiments_in_set.files.quality_metric.Sequence length",
        "experiments_in_set.files.quality_metric.url",
        "experiments_in_set.files.quality_metric.overall_quality_status",
        "experiments_in_set.files.badges.*",

        "experiments_in_set.files.related_files.relationship_type",
        "experiments_in_set.files.related_files.file.accession",
        "experiments_in_set.files.related_files.file.paired_end",
        "experiments_in_set.files.related_files.file.file_type",

        "processed_files.href",
        "processed_files.accession",
        "processed_files.uuid",
        "processed_files.file_size",
        "processed_files.upload_key",
        "processed_files.file_format",
        "processed_files.file_classification",
        "processed_files.file_type",
        "processed_files.file_type_detailed",
        "processed_files.status",
        "processed_files.md5sum",
        "processed_files.extra_files",
        "processed_files.extra_files.href",
        "processed_files.extra_files.file_format",
        "processed_files.higlass_uid",
        "processed_files.genome_assembly",

        #"processed_files.quality_metric.Total reads",
        #"processed_files.quality_metric.Total Sequences",
        #"processed_files.quality_metric.Sequence length",
        "processed_files.quality_metric.url",
        "processed_files.quality_metric.overall_quality_status",

        "processed_files.quality_metric.Total reads",
        "processed_files.quality_metric.Trans reads",
        "processed_files.quality_metric.Cis reads (>20kb)",
        "processed_files.quality_metric.Short cis reads (<20kb)",
        #"processed_files.@type",

        "experiments_in_set.processed_files.href",
        "experiments_in_set.processed_files.accession",
        "experiments_in_set.processed_files.uuid",
        "experiments_in_set.processed_files.file_size",
        "experiments_in_set.processed_files.upload_key",
        "experiments_in_set.processed_files.file_format",
        "experiments_in_set.processed_files.file_classification",
        "experiments_in_set.processed_files.file_type",
        "experiments_in_set.processed_files.file_type_detailed",
        "experiments_in_set.processed_files.status",
        "experiments_in_set.processed_files.md5sum",
        "experiments_in_set.processed_files.higlass_uid",
        "experiments_in_set.processed_files.genome_assembly",
        "experiments_in_set.processed_files.extra_files",
        "experiments_in_set.processed_files.extra_files.href",
        "experiments_in_set.processed_files.extra_files.file_format",
        "experiments_in_set.processed_files.quality_metric.url",
        "experiments_in_set.processed_files.quality_metric.overall_quality_status",
        "experiments_in_set.processed_files.quality_metric.Total reads",
        "experiments_in_set.processed_files.quality_metric.Trans reads",
        "experiments_in_set.processed_files.quality_metric.Cis reads (>20kb)",
        "experiments_in_set.processed_files.quality_metric.Short cis reads (<20kb)",
        #"experiments_in_set.processed_files.@type"

        "other_processed_files.files.accession",
        "other_processed_files.files.file_type_detailed",
        "other_processed_files.files.file_format",
        "other_processed_files.files.file_size",
        "other_processed_files.files.higlass_uid",
        "other_processed_files.files.genome_assembly",
        "other_processed_files.files.href",

        "experiments_in_set.other_processed_files.files.href",
        "experiments_in_set.other_processed_files.title",
        "experiments_in_set.other_processed_files.description",
        "experiments_in_set.other_processed_files.type",
        "experiments_in_set.other_processed_files.files.accession",
        "experiments_in_set.other_processed_files.files.file_type_detailed",
        "experiments_in_set.other_processed_files.files.file_format",
        "experiments_in_set.other_processed_files.files.file_size",
        "experiments_in_set.other_processed_files.files.higlass_uid",
        "experiments_in_set.other_processed_files.files.genome_assembly"
    ]

    @calculated_property(schema={
        "title": "Produced in Publication",
        "description": "The Publication in which this Experiment Set was produced.",
        "type": "string",
        "linkTo": "Publication"
    })
    def produced_in_pub(self, request):
        pub_paths = self.rev_link_atids(request, 'publications_produced')
        pubs = [request.embed('/', path, '@@object') for path in pub_paths]
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
        pubs_produced = self.rev_link_atids(request, 'publications_produced')
        pubs_using = self.rev_link_atids(request, 'publications_using')
        return list(set(pubs_produced + pubs_using))

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
        all_experiments = [exp['replicate_exp'] for exp in properties.get('replicate_exps', [])]
        properties['experiments_in_set'] = all_experiments
        super(ExperimentSetReplicate, self)._update(properties, sheets)

    class Collection(Item.Collection):
        pass


def validate_experiment_set_replicate_experiments(context, request):
    '''
    Validates that each replicate_exps.replicate_exp in context (ExperimentSetReplicate Item) is unique within the ExperimentSetReplicate.
    '''
    data = request.json
    replicate_exp_objects = data.get('replicate_exps', [])

    have_seen_exps = set()
    any_failures = False
    for replicate_idx, replicate_exp_object in enumerate(replicate_exp_objects):
        experiment = replicate_exp_object.get('replicate_exp')
        if experiment is None:
            request.errors.add('body', None, 'No experiment supplied for replicate_exps[' + str(replicate_idx) + ']')
            any_failures = True
            continue
        if experiment in have_seen_exps:
            request.errors.add('body', None, 'Duplicate experiment "' + experiment + '" defined in replicate_exps[' + str(replicate_idx) + ']')
            any_failures = True
            continue
        have_seen_exps.add(experiment)

    if not any_failures:
        request.validated.update({})


@view_config(context=ExperimentSetReplicate.Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post, validate_experiment_set_replicate_experiments])
def experiment_set_replicate_add(context, request, render=None):
    return collection_add(context, request, render)


@view_config(context=ExperimentSetReplicate, permission='edit', request_method='PUT',
             validators=[validate_item_content_put, validate_experiment_set_replicate_experiments])
@view_config(context=ExperimentSetReplicate, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch, validate_experiment_set_replicate_experiments])
def experiment_set_replicate_edit(context, request, render=None):
    return item_edit(context, request, render)
