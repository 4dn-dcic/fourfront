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


@upgrade_step('experiment_damid', '1', '2')
def experiment_damid_1_2(value, system):
    if value.get('index_pcr_cycles'):
        value['pcr_cycles'] = value['index_pcr_cycles']
        del value['index_pcr_cycles']


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
