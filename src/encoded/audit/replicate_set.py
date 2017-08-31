from snovault import (
    AuditFailure,
    audit_checker,
)
from collections import defaultdict


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
            return seq == list(range(seq[0], seq[-1] + 1))

        details = []
        # check biorep numbers
        if not is_coherent(list(set(bio_nos))):
            details.append('In ReplicateSet {}'.format(value['@id']) +
                           ' - biological replicate numbers are not in sequence ' +
                           '{}'.format(bio_nos))

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
        'replicate_exps',
        'replicate_exps.replicate_exp',
        'replicate_exps.replicate_exp.files',
        'replicate_exps.replicate_exp',
        'replicate_exps.replicate_exp.biosample',
        'replicate_exps.replicate_exp.biosample.cell_culture_details'
    ]
)
def audit_replicate_sets_consistency_check(value, system):
    '''
    the experiments present in a replicate set must be consistent
    with regard to their shared fields in biosample and experiment
    '''

    fields2check = [
        'lab',
        'award',
        'biosample',
        'experiment_type',
        'crosslinking_method',
        'crosslinking_time',
        'crosslinking_temperature',
        'digestion_enzyme',
        'enzyme_lot_number',
        'digestion_time',
        'digestion_temperature',
        'tagging_method',
        'ligation_time',
        'ligation_temperature',
        'ligation_volume',
        'biotin_removed',
        'protocol',
        'protocol_variation',
        'follows_sop',
        'average_fragment_size',
        'fragment_size_range',
        'fragmentation_method',
        'fragment_size_selection_method',
        'rna_tag',
        'target_regions',
        'dna_label',
        'labeling_time',
        'antibody',
        'antibody_lot_id',
        'cell_cycle_phase',
        'stage_fraction',
        'cell_sorting_protocol',
        'microscopy_technique',
        'imaging_paths',
        'biosource',
        'biosample_protocols',
        'cell_culture_details',
        'modifications',
        'treatments',
        'differentiation_state'
    ]

    def merge_items(merged, mergee):
        for k, v in mergee.items():
            merged[k].append(v)
        return merged

    def stringify(l):
        try:
            return [str(x['@id']) for x in l]
        except:
            try:
                r = []
                for x in l:
                    x.sort
                    s = ''.join(stringify(x))
                    r.append(s)
                return r
            except:
                return [str(x) for x in l]

    def find_conflict(field, value):
        if field in fields2check:
            stringified = stringify(value)
            if len(set(stringified)) != 1:
                return field
        return None

    '''
        add to detail array the conflicting fields and values for the particular experiment
        they can occur on the cell_culture_detail, biosample or experiment level
    '''
    def get_conflict_detail(conflict, values, collection):
        from collections import Counter
        v_strings = stringify(values)
        cnts = dict(Counter(v_strings))
        if collection == 'cell_culture_details':
            sstart = 'Cell Culture Detail field '
        elif collection == 'biosamples':
            sstart = 'Biosample field '
        else:
            sstart = 'Experiment field '
        return sstart + conflict + ' has conflicting values ' + str(cnts)

    reps = value.get('replicate_exps', None)
    if reps is not None:
        repcnt = len(reps)
        if repcnt != 1:
            '''
                all experiments in a replicate set should share the
                same experimental details except for biosample, description
                and raw files
            '''
            # first merge all the experiments of the replicate
            merged_expts = defaultdict(list)
            for i, rep in enumerate(reps):
                # if i == 3:
                    # print(rep)
                expt = value['replicate_exps'][i]['replicate_exp']
                expt['bio_rep_no'] = rep['bio_rep_no']
                merged_expts = merge_items(merged_expts, expt)
            # print(merged_expts)

            details = []
            for field, values in merged_expts.items():
                if field == 'biosample':
                    merged_biosamples = defaultdict(list)
                    # check for biosample concurrence
                    for biosample in values:
                        merged_biosamples = merge_items(merged_biosamples, biosample)
                    for bfield, bvalues in merged_biosamples.items():
                        if bfield == 'cell_culture_details':
                            merged_cc_details = defaultdict(list)
                            for cc in bvalues:
                                merged_cc_details = merge_items(merged_cc_details, cc)
                            for cfield, cvalues in merged_cc_details.items():
                                conflict = find_conflict(cfield, cvalues)
                                if conflict is not None:
                                    details.append(get_conflict_detail(conflict, cvalues, 'cell_culture_details'))
                        else:
                            conflict = find_conflict(bfield, bvalues)
                            if conflict is not None:
                                details.append(get_conflict_detail(conflict, bvalues, 'biosamples'))
                else:
                    conflict = find_conflict(field, values)
                    if conflict is not None:
                        details.append(get_conflict_detail(conflict, values, 'experiments'))

            if details:
                detail = '\n'.join(details)
                yield AuditFailure('inconsistent replicate data', detail, level='ERROR')

            return


@audit_checker(
    'experiment_set',
    frame=['award', 'publications_of_set']
)
def audit_external_experiment_sets_have_pub(value, system):
    '''
    an experiment set from an external group should have an associated pub
    '''
    award = value.get('award', None)
    if award is not None and award.get('project') == 'External':
        if not value['publications_of_set']:
            # we don't have a publications_of_set
            detail = 'External ExperimentSet {} is missing attribution to a publication'.format(value['@id'])
            yield AuditFailure('missing mandatory metadata', detail, level='WARNING')
    return
