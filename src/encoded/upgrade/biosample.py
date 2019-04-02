from snovault import upgrade_step


@upgrade_step('biosample', '1', '2')
def biosample_1_2(value, system):
    if 'cell_culture_details' in value:
        value['cell_culture_details'] = [value['cell_culture_details']]
