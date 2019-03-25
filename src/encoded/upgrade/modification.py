from snovault import upgrade_step
from . import _get_biofeat_for_target as getbf4t


@upgrade_step('modification', '1', '2')
def modification_1_2(value, system):
    ''' upgrading target to array of biofeatures '''
    ttarget = value.get('target_of_mod')
    if ttarget:
        del value['target_of_mod']
        note = 'Old Target: {}'.format(ttarget)
        targets = system['registry']['collections']['Target']
        biofeats = system['registry']['collections']['BioFeature']
        target = targets.get(ttarget)
        if target:
            bfuuid = getbf4t(target, biofeats)
        if bfuuid:
            value['target_of_mod'] = [bfuuid]
        else:
            note = 'UPDATE NEEDED: ' + note
        if 'notes' in value:
            note = value['notes'] + '; ' + note
        value['notes'] = note
