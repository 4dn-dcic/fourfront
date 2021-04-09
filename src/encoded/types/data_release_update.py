from snovault import (
    collection,
    load_schema,
)
from .base import (
    Item
)


@collection(
    name='data-release-updates',
    properties={
        'title': 'Data Release Updates',
        'description': 'Metadata release updates for the Portal',
    })
class DataReleaseUpdate(Item):
    item_type = 'data_release_update'
    schema = load_schema('encoded:schemas/data_release_update.json')
    embedded_list = [
        # ExperimentSetReplicate linkTo (accession)
        'update_items.primary_id.status',
        'update_items.primary_id.tags',
        'update_items.primary_id.accession',

        # Experiment linkTo (accession)
        'update_items.primary_id.experiments_in_set.status',
        'update_items.primary_id.experiments_in_set.accession',

        # ExperimentType linkTo (title)
        'update_items.primary_id.experiments_in_set.experiment_type.title',
        'update_items.primary_id.experiments_in_set.experiment_type.display_title',

        # Experiment linkTo (accession)
        'update_items.primary_id.experiments_in_set.accession',
        'update_items.primary_id.experiments_in_set.experiment_categorizer',
        'update_items.primary_id.experiments_in_set.files.status',
        'update_items.primary_id.experiments_in_set.files.file_type',

        # Biosample linkTo
        'update_items.primary_id.experiments_in_set.biosample.accession',
        'update_items.primary_id.experiments_in_set.biosample.biosource_summary',

        # FileProcessed linkTo
        'update_items.primary_id.experiments_in_set.processed_files.accession',
        'update_items.primary_id.experiments_in_set.processed_files.status',
        'update_items.primary_id.experiments_in_set.processed_files.file_type',

        # FileProcessed linkTo
        'update_items.primary_id.processed_files.accession',
        'update_items.primary_id.processed_files.status',
        'update_items.primary_id.processed_files.file_type'
    ]
