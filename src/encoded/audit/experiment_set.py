from snovault import (
    AuditFailure,
    audit_checker,
)
from collections import defaultdict


@audit_checker(
    'ExperimentSet',
    frame=['other_processed_files']
)
def audit_experiment_sets_unique_titles_in_other_processed_files_list(value, system):
    '''
    Ensure that each collection (dict) in the `other_processed_files` field (list) has a `title` field
    which is unique across all other_processed_files collection title within the ExperimentSet.
    '''

    other_processed_files = value.get('other_processed_files')

    if other_processed_files is None or len(other_processed_files) == 0:
        return

    titles_set = set()
    for other_processed_files_collection in other_processed_files:
        collection_title = other_processed_files_collection.get('title')
        if collection_title is None:
            yield AuditFailure('Missing title', 'ExperimentSet {} has an other_processed_files collection with a missing title.'.format(value['accession']), level='ERROR')
            continue
        if collection_title in titles_set:
            yield AuditFailure('Duplicate title', 'ExperimentSet {} has 2+ other_processed_files collections with a duplicate title - {}.'.format(value['accession'], collection_title), level='ERROR')
            continue
        titles_set.add(collection_title)

    return 
