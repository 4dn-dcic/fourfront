from snovault import upgrade_step


@upgrade_step('ingestion_submission', '1', '2')
def ingestion_submission_1_2(value, system):
    if 'errors' in value and value['errors'] == []:
        del value['errors']
