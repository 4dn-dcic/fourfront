from snovault import upgrade_step


@upgrade_step('biosample_cell_culture', '1', '2')
def biosample_cell_culture_1_2(value, system):
    tissue = value.get('differentiation_tissue')
    if tissue:
        value['tissue'] = tissue
        del value['differentiation_tissue']
