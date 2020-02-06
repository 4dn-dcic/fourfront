# from snovault import (
#     calculated_property,
#     collection,
#     load_schema
# )
# from .base import (
#     Item,
#     set_namekey_from_title
# )
#
#
# @collection(
#     name='experiment-types',
#     unique_key='experiment_type:experiment_name',
#     lookup_key='title',
#     properties={
#         'title': 'Experiment Types',
#         'description': 'Listing of experiment types for 4DN items',
#     }
# )
# class ExperimentType(Item):
#     """The ExperimentType class that descrbes an experiment type that can be associated with an experiment."""
#
#     item_type = 'experiment_type'
#     schema = load_schema('encoded:schemas/experiment_type.json')
#     name_key = 'experiment_name'
#
#     embedded_list = Item.embedded_list + [
#         "sop.description",
#         "reference_pubs.short_attribution",
#         "reference_pubs.authors",
#         "reference_pubs.date_published",
#         "reference_pubs.journal"
#     ]
#
#     def _update(self, properties, sheets=None):
#         # set name based on what is entered into title
#         properties['experiment_name'] = set_namekey_from_title(properties)
#         super(ExperimentType, self)._update(properties, sheets)
