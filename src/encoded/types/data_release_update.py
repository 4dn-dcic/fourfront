from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
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
        "update_items.primary_id.status",
        "update_items.primary_id.tags",
        "update_items.primary_id.experiments_in_set.status",
        "update_items.primary_id.experiments_in_set.experiment_type",
        "update_items.primary_id.experiments_in_set.experiment_categorizer",
        "update_items.primary_id.experiments_in_set.biosample.biosource_summary",
        "update_items.primary_id.experiments_in_set.files.status",
        "update_items.primary_id.experiments_in_set.files.file_type",
        "update_items.primary_id.experiments_in_set.processed_files.status",
        "update_items.primary_id.experiments_in_set.processed_files.file_type",
        "update_items.primary_id.processed_files.status",
        "update_items.primary_id.processed_files.file_type"
    ]
