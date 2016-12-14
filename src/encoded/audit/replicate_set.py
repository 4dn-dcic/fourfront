from snovault import (
    AuditFailure,
    audit_checker,
)


@audit_checker(
    'experiment_set_replicate',
    frame=[
        'replicate_exps',
        'replicate_exps.replicate_exp'
    ]
)
def audit_replicate_sets_have_replicate_experiments(value, system):
    '''
    the experiments present in a replicate set must be consistent
    with regard to their designation as bio or technical replicate
    and numbering sequentially

    warning is generated if there is only one biorep number
    '''
    # check to see if there are any experiments in the replicate_set
    reps = value.get('replicate_exps', None)
    if reps is None:
        return

    # replicate_set contains only a single experiment so warn
    if len(reps) == 1:
        detail = 'In ReplicateSet {}'.format(value['@id']) + \
            ' - Only a single experiment present ' + \
            '{}'.format(value['replicate_exps'][0]['replicate_exp']['@id'])
        yield AuditFailure('missing replicate', detail, level='WARNING')

    rep_nos = sorted([(rep['bio_rep_no'], rep['tec_rep_no']) for rep in reps], key=lambda x: (x[0], x[1]))

    bio_nos = [r[0] for r in rep_nos]

    # biorep numbers are all the same
    if len(set(bio_nos)) == 1:
        detail = 'In ReplicateSet {}'.format(value['@id']) + \
            ' - Only technical replicates present - multiple experiments ' + \
            'but single bio replicate number {}'.format(bio_nos[0])
        yield AuditFailure('missing replicate', detail, level='WARNING')

    # rep numbers are not sequential i.e. there is a gap
    def is_coherent(seq):
        if (len(seq) < 2):
            return True
        return seq == range(seq[0], seq[-1] + 1)

    details = []
    # check biorep numbers
    if not is_coherent(bio_nos):
        details.append('In ReplicateSet {}'.format(value['@id']) +
                       ' - biological replicate numbers are not in sequence ' +
                       '{}'.format(set(bio_nos)))
        # yield AuditFailure('missing replicate', detail, level='WARNING')

    # check tecrep numbers of each biorep
    bio_no = -1
    tec_nos = []
    for rep in rep_nos[:-1]:
        if rep[0] != bio_no:
            if tec_nos and not is_coherent(tec_nos):
                details.append('In ReplicateSet {}'.format(value['@id']) +
                               ' - technical replicate numbers for bioreplicate number ' +
                               '{} are not in sequence '.format(bio_no) +
                               '{}'.format(tec_nos))
            bio_no = rep[0]
            tec_nos = []
        tec_nos.append(rep[1])

    if rep_nos:
        last_rep = rep_nos[-1]
        if last_rep[0] == bio_no:
            # need to check if the last item is in sequence
            tec_nos.append(last_rep[1])
            if not is_coherent(tec_nos):
                details.append('In ReplicateSet {}'.format(value['@id']) +
                               ' - technical replicate numbers for bioreplicate number ' +
                               '{} are not in sequence '.format(bio_no) +
                               '{}'.format(tec_nos))

    if details:
        detail = '\n'.join(details)
        yield AuditFailure('missing replicate', detail, level='WARNING')

    return
