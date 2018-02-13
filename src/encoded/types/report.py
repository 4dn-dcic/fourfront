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
    name='reports',
    properties={
        'title': 'Reports',
        'description': 'Metadata reports for the Portal',
    })
class Report(Item):
    item_type = 'report'
    schema = load_schema('encoded:schemas/report.json')
    embedded_list = [
        "report_items.primary_id.status",
        "report_items.primary_id.tags",
        "report_items.primary_id.experiments_in_set.status",
        "report_items.primary_id.experiments_in_set.experiment_type",
        "report_items.primary_id.experiments_in_set.files.status",
        "report_items.primary_id.experiments_in_set.files.file_type",
        "report_items.primary_id.experiments_in_set.processed_files.status",
        "report_items.primary_id.experiments_in_set.processed_files.file_type",
        "report_items.primary_id.processed_files.status",
        "report_items.primary_id.processed_files.file_type"
    ]
