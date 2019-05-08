from snovault import upgrade_step
from . import _get_biofeat_for_target as getbf4t


@upgrade_step('antibody', '1', '2')
def antibody_1_2(value, system):
    ''' upgrading target to array of biofeatures '''
    abtarget = value.get('antibody_target')
    if abtarget:
        del value['antibody_target']
        note = 'Old Target: {}'.format(abtarget)
        targets = system['registry']['collections']['Target']
        biofeats = system['registry']['collections']['BioFeature']
        target = targets.get(abtarget)
        if target:
            bfuuid = getbf4t(target, biofeats)
        if bfuuid:
            value['antibody_target'] = [bfuuid]
        else:
            note = 'UPDATE NEEDED: ' + note
        if 'notes' in value:
            note = value['notes'] + '; ' + note
        value['notes'] = note
