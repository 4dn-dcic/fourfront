from snovault import (
    AuditFailure,
    audit_checker,
)


@audit_checker('file_fastq')
def audit_file_with_pair_info_has_paired_with_related_file(value, system):
    '''
    fastq files can be paired and if they are they should have both the 'paired_end'
    field and a 'paired_with' related file - if one is missing it should be flagged
    '''
    detail = None
    found = False

    relatedfiles = value.get('related_files')
    if relatedfiles is not None:
        for rfile in relatedfiles:
            # see if there are any 'paired_with' related files
            if rfile.get('relationship_type') and rfile['relationship_type'] == 'paired with':
                found = True
                break

    if value.get('paired_end') is not None:
        if not found:
            detail = 'In File {}'.format(value['@id']) + \
                     ' - there is paired end info but related file with relationship type paired with is missing'
    elif found:
        detail = 'In File {}'.format(value['@id']) + \
                 ' - there is a related file with relationship type paired with but no paired end info'

    if detail is not None:
        yield AuditFailure('missing mandatory metadata', detail, level='WARNING')
    return
