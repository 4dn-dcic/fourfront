"""The type file for the collection Summary statistics."""
from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
from .base import (
    Item
    # paths_filtered_by_status,
)


@collection(
    name='summary-statistics',
    properties={
        'title': 'Summary Statistics',
        'description': 'Listing of summary statistics',
    })
class SummaryStatistic(Item):
    """Summary statistics class."""

    item_type = 'summary_statistic'
    schema = load_schema('encoded:schemas/summary_statistic.json')
    embedded_list = ['award.project']


@collection(
    name='summary-statistics-hi-c',
    properties={
        'title': 'Hi-C Summary Statistics',
        'description': 'Listing of Hi-C summary statistics',
    })
class SummaryStatisticHiC(SummaryStatistic):
    """the sub class of summary statistics for Hi-C experiments."""

    item_type = 'summary_statistic_hi_c'
    schema = load_schema('encoded:schemas/summary_statistic_hi_c.json')
    embedded_list = SummaryStatistic.embedded_list
