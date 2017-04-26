from snovault import upgrade_step


@upgrade_step('target', '1', '2')
def target_1_2(value, system):
    if 'targeted_region' in value:
        value['targeted_genome_regions'] = [value['targeted_region']]
        del value['targeted_region']
