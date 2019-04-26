from snovault import upgrade_step
from . import _get_biofeat_for_target as getbf4t


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
    exptype = value.get('experiment_type')
    if exptype == 'Repli-seq':
        tot_fracs = value.get('total_fractions_in_exp', 2)
        if tot_fracs > 2:
            exptype = 'Multi-stage Repli-seq'
        else:
            exptype = '2-stage Repli-seq'
    elif exptype == 'DAM-ID seq':
        exptype = 'DamID-seq'
    valid_exptypes = system['registry']['collections']['ExperimentType']
    exptype_item = valid_exptypes.get(exptype)
    if not exptype_item:
        exptypename = exptype.lower().replace(' ', '-')
        exptype_item = valid_exptypes.get(exptypename)
    exptype_uuid = None
    try:
        exptype_uuid = str(exptype_item.uuid)
    except AttributeError:
        note = '{} ITEM NOT FOUND'.format(exptype)
        if 'notes' in value:
            note = value['notes'] + '; ' + note
        value['notes'] = note
    value['experiment_type'] = exptype_uuid


@upgrade_step('experiment_seq', '4', '5')
@upgrade_step('experiment_chiapet', '4', '5')
@upgrade_step('experiment_damid', '3', '4')
@upgrade_step('experiment_tsaseq', '2', '3')
def experiment_targeted_factor_upgrade(value, system):
    factor = value.get('targeted_factor')
    if factor:
        del value['targeted_factor']
        note = 'Old Target: {}'.format(factor)
        targets = system['registry']['collections']['Target']
        biofeats = system['registry']['collections']['BioFeature']
        target = targets.get(factor)
        if target:
            bfuuid = getbf4t(target, biofeats)
        if bfuuid:
            value['targeted_factor'] = [bfuuid]
        else:
            note = 'UPDATE NEEDED: ' + note
        if 'notes' in value:
            note = value['notes'] + '; ' + note
        value['notes'] = note


@upgrade_step('experiment_capture_c', '2', '3')
def experiment_capture_c_1_2(value, system):
    tregions = value.get('targeted_regions')
    if tregions:
        new_vals = []
        del value['targeted_regions']
        targets = system['registry']['collections']['Target']
        biofeats = system['registry']['collections']['BioFeature']
        note = ''
        for tr in tregions:
            t = tr.get('target')  # it's required
            of = tr.get('oligo_file', '')
            tstr = 'Old Target: {} {}'.format(t, of)
            target = targets.get(t)
            if target:
                bfuuid = getbf4t(target, biofeats)
            if bfuuid:
                tinfo = {'target': [bfuuid]}
                if of:
                    tinfo['oligo_file'] = of
                new_vals.append(tinfo)
            else:
                tstr = 'UPDATE NEEDED: ' + tstr
            note += tstr
        if new_vals:
            value['targeted_regions'] = new_vals
        if 'notes' in value:
            note = value['notes'] + '; ' + note
        value['notes'] = note
