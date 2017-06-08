from snovault import (
    AuditFailure,
    audit_checker,
)
from collections import defaultdict


@audit_checker(
    'experiment_hi_c',
    frame=['files', 'files.files'])
def audit_experiments_have_raw_files(value, system):
    '''
    experiments should have associated raw files whose status is one of
    'uploaded', 'released', 'in review by project', 'released by project'
    to be release ready

    warning is generated if files are missing and status is not 'released'
    error is generated if files are missing and status is 'released'
    '''
    ok_stati = ['uploaded', 'released', 'in review by project', 'released by project']
    files = value.get('files', None)
    has_raw = False
    if files is not None:
        for i in range(len(files)):
            f = value['files'][i]
            if f['file_classification'] == 'raw file' and f['status'] in ok_stati:
                has_raw = True
                break
    if not has_raw:
        level = 'WARNING'
        if value['status'] == 'released':
            level = 'ERROR'
        detail = 'Experiment {}'.format(value['@id']) + \
                ' - Raw files are absent!'
        yield AuditFailure('missing data', detail, level=level)
    return
