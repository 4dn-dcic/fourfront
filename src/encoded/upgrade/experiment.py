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
