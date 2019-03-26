from snovault import upgrade_step
from . import _get_biofeat_for_target as getbf4t


@upgrade_step('imaging_path', '1', '2')
def imaging_path_1_2(value, system):
    ''' convert targets to biofeatures '''
    iptargets = value.get('target')
    if iptargets:
        targets = system['registry']['collections']['Target']
        biofeats = system['registry']['collections']['BioFeature']
        del value['target']
        note = 'Old Target: {}'.format(iptargets)
        targets2add = []
        for ipt in iptargets:
            target = targets.get(ipt)
            if target:
                bfuuid = getbf4t(target, biofeats)
            if bfuuid:
                targets2add.append(bfuuid)
            else:
                note += 'UPDATE NEEDED {}; '.format(ipt)
        if 'notes' in value:
            note = value['notes'] + '; ' + note
        value['notes'] = note
        value['target'] = targets2add
