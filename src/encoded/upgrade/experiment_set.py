from snovault import upgrade_step


@upgrade_step('experiment_set', '1', '2')
def experiment_set_1_2(value, system):
    if 'date_released' in value:
        value['public_release'] = value['date_released']
        del value['date_released']


@upgrade_step('experiment_set_replicate', '1', '2')
def experiment_set_replicate_1_2(value, system):
    if 'date_released' in value:
        value['public_release'] = value['date_released']
        del value['date_released']
