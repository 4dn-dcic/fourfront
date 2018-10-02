from snovault import (
    AuditFailure,
    audit_checker,
)


# @audit_checker(
#     'ExperimentSet',
#     frame=['other_processed_files']
# )
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


# @audit_checker(
#     'ExperimentSet',
#     frame=['other_processed_files', 'experiments_in_set', 'experiments_in_set.other_processed_files']
# )
def audit_experiment_sets_unique_files_in_other_processed_files_list_with_experiments(value, system):
    '''
    Ensure that each combination on title between ExperimentSet other_processed_files.files and
    Experiment other_processed_files.files contain all unique files.

    Assumes that `audit_experiment_sets_unique_titles_in_other_processed_files_list` has passed.
    '''

    expset_other_processed_files = value.get('other_processed_files')

    if expset_other_processed_files is None or len(expset_other_processed_files) == 0:
        return

    expset_file_ids_by_title = {
        collection['title'] : set(collection.get('files', [])) # collection['files'] are in form of @ids.
        for collection in expset_other_processed_files if collection.get('title') is not None
    }

    for experiment in value.get('experiments_in_set', []):
        exp_other_processed_files = experiment.get('other_processed_files')
        if exp_other_processed_files is None:
            continue
        for exp_opf_collection in exp_other_processed_files:
            exp_opf_collection_title = exp_opf_collection.get('title')
            if exp_opf_collection_title is None:
                yield AuditFailure('Missing title', 'Experiment {} has an other_processed_files collection with a missing title.'.format(experiment['accession']), level='ERROR')
                continue
            if expset_file_ids_by_title.get(exp_opf_collection_title) is None:
                continue
            for exp_opf in exp_opf_collection.get('files', []):
                if exp_opf in expset_file_ids_by_title[exp_opf_collection_title]:
                    yield AuditFailure('Duplicate file', 'Experiment {} other_processed_files collection with title "{}" has file {} which is also present in parent ExperimentSet {} other_processed_files collection of the same name.'.format(experiment['accession'], exp_opf_collection_title, exp_opf, value['accession']), level='WARNING')
                    continue

    return
