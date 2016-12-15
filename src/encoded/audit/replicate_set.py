from snovault import (
    AuditFailure,
    audit_checker,
)


@audit_checker(
    'experiment_set_replicate',
    frame=[
        'replicate_exps',
        'replicate_exps.replicate_exp',
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
    if reps:
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


@audit_checker(
    'experiment_set_replicate',
    frame=[
        'experiment',
        'replicate_exps',
        'replicate_exps.replicate_exp',
        'replicate_exps.replicate_exp.replicate_exp',
        'replicate_exps.replicate_exp.biosample.biosample'
    ]
)
def audit_replicate_sets_consistency_check(value, system):
    '''
    the experiments present in a replicate set must be consistent
    with regard to their shared fields in biosample and experiment
    '''
    genrl_fields2ignore = [
        '@id',
        '@type',
        'accession',
        'aliases',
        'alternate_accessions',
        'audit',
        'award',
        'date_created',
        'dbxrefs',
        'description',
        'documents',
        'lab',
        'references',
        'schema_version',
        'sop_mapping',
        'status',
        'submitted_by',
        'uuid',
    ]

    expt_fields2ignore = [
        'experiment_relation',
        'files',
        'filesets',
        'average_fragment_size',
        'fragment_size_range',
        'experiment_summary'
    ]

    bs_fields2ignore = [
        'biosample_relation',
        'biosource_summary',
        'modifications_summary',
        'modifications_summary_short',
        'treatments_summary'
    ]
    # print(system)
    reps = value.get('replicate_exps', None)
    if reps is not None:
        repcnt = len(reps)
        if repcnt != 1:
            '''
                all experiments in a replicate set should share the
                same experimental details except for biosample, description
                and raw files

                those that share the same biosample should have the same bio_rep_no
            '''
            # first merge all the experiments of the replicate
            from collections import defaultdict
            merged_expts = defaultdict(list)
            for i, rep in enumerate(reps):
                bio_rep_no = rep['bio_rep_no']
                expt = value['replicate_exps'][i]['replicate_exp']
                for k, v in expt.items():
                    merged_expts[k].append(v)

            # print(merged_expts)
            fields2ignore = genrl_fields2ignore + expt_fields2ignore
            for field, values in merged_expts.items():
                if field not in fields2ignore:
                    stringified = [str(x) for x in values]
                    if field == 'biosample':
                        # check for biosample concurrence
                        pass
                    else:
                        # we've got different values so warn
                        if len(set(stringified)) != 1:
                            print("Field: ", field, "\nValues: ", set(stringified))
                        else:
                            print("We're Good!")
