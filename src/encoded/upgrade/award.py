from ..migrator import upgrade_step


@upgrade_step('award', '', '2')
def award_0_2(value, system):
    # http://redmine.encodedcc.org/issues/1295
    # http://redmine.encodedcc.org/issues/1307

    rfa_mapping = ['ENCODE2', 'ENCODE2-Mouse']
    if value['rfa'] in rfa_mapping:
        value['status'] = 'disabled'
    else:
        value['status'] = 'current'

    # http://encode.stanford.edu/issues/1022
    if 'url' in value:
        if value['url'] == '':
            del value['url']


@upgrade_step('award', '2', '3')
def award_2_3(value, system):
    # http://encode.stanford.edu/issues/2726

    if 'project' not in value:
        value['project'] = 'ENCODE'
