from snovault import upgrade_step


@upgrade_step('experiment_repliseq', '1', '2')
def experiment_repliseq_1_2(value, system):
    if value['experiment_type'] == 'repliseq':
        value['experiment_type'] = 'Repli-seq'


@upgrade_step('experiment_repliseq', '2', '3')
def experiment_repliseq_2_3(value, system):
    # sticking the string in antibody field into Notes
    # will require subsequent manual fix to link to Antibody object
    if value.get('antibody'):
        if value.get('notes'):
            value['notes'] = value['notes'] + '; ' + value['antibody']
        else:
            value['notes'] = value['antibody']
        del value['antibody']
    # if antibody_lot_id exists it should be fine in new field


@upgrade_step('experiment_chiapet', '1', '2')
def experiment_chiapet_1_2(value, system):
    # sticking the string in antibody field into Notes
    # will require subsequent manual fix to link to Antibody object
    if value.get('antibody'):
        if value.get('notes'):
            value['notes'] = value['notes'] + '; ' + value['antibody']
        else:
            value['notes'] = value['antibody']
        del value['antibody']


@upgrade_step('experiment_chiapet', '2', '3')
def experiment_chiapet_2_3(value, system):
    if value.get('experiment_type') == 'CHIA-pet':
        value['experiment_type'] = 'ChIA-PET'


@upgrade_step('experiment_damid', '1', '2')
def experiment_damid_1_2(value, system):
    if value.get('index_pcr_cycles'):
        value['pcr_cycles'] = value['index_pcr_cycles']
        del value['index_pcr_cycles']
    if value.get('fusion'):
        if value.get('notes'):
            value['notes'] = value['notes'] + '; ' + value['fusion']
        else:
            value['notes'] = value['fusion']
        del value['fusion']


@upgrade_step('experiment_mic', '1', '2')
def experiment_mic_1_2(value, system):
    fish_dict = {'DNA-FiSH': 'DNA FISH', 'RNA-FiSH': 'RNA FISH', 'FiSH': 'FISH'}
    if value.get('experiment_type') and value['experiment_type'] in fish_dict.keys():
        value['experiment_type'] = fish_dict[value['experiment_type']]


@upgrade_step('experiment_seq', '1', '2')
def experiment_seq_1_2(value, system):
    # sticking the string in antibody field into Notes
    # will require subsequent manual fix to link to Antibody object
    if value.get('antibody'):
        if value.get('notes'):
            value['notes'] = value['notes'] + '; ' + value['antibody']
        else:
            value['notes'] = value['antibody']
        del value['antibody']


@upgrade_step('experiment_seq', '2', '3')
def experiment_seq_2_3(value, system):
    if value.get('experiment_type') == 'CHIP-seq':
        value['experiment_type'] = 'ChIP-seq'


@upgrade_step('experiment_atacseq', '1', '2')
@upgrade_step('experiment_capture_c', '1', '2')
@upgrade_step('experiment_chiapet', '3', '4')
@upgrade_step('experiment_damid', '2', '3')
@upgrade_step('experiment_hi_c', '1', '2')
@upgrade_step('experiment_mic', '2', '3')
@upgrade_step('experiment_repliseq', '3', '4')
@upgrade_step('experiment_seq', '3', '4')
@upgrade_step('experiment_tsaseq', '1', '2')
def experiment_1_2(value, system):
    types_list = [
        'ATAC-seq', 'CUT&RUN', 'capture Hi-C', 'ChIA-PET', 'ChIP-seq',
        'dilution Hi-C', 'DNA-paint', 'in situ Hi-C', 'PLAC-seq', 'TSA-seq',
        'DNA FISH', 'RNA FISH', 'RNA-seq', 'SPT', 'DNase Hi-C', 'DNA SPRITE',
        'RNA-DNA SPRITE', 'micro-C', 'sci-Hi-C', 'MARGI', 'TrAC-loop', 'TCC',
        'MC-3C', 'MC-Hi-C', 'GAM', 'NAD-seq', 'single cell Hi-C'
    ]
    if value.get('experiment_type') in types_list:
        exptype = value.get('experiment_type')
    elif value.get('experiment_type') == 'DAM-ID seq':
        exptype = '/experiment-types/damid-seq/'
    elif value.get('experiment_type') == 'Repli-seq':
        if value.get('total_fractions_in_exp') == 2:
            exptype = '/experiment-types/2-stage-repli-seq/'
        elif value.get('total_fractions_in_exp') > 2:
            exptype = '/experiment-types/multi-stage-repli-seq/'
    valid_exptypes = system['registry']['collections']['ExperimentType']
    formats = system['registry']['collections']['FileFormat']
    exptype_item = valid_exptypes.get(exptype)
    exptype_uuid = None
    try:
        exptype_uuid = str(exptype_item.uuid)
    except AttributeError:
        pass
    value['experiment_type'] = exptype_uuid
