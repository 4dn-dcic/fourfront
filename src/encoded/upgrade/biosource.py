from snovault import (
    upgrade_step,
    CONNECTION
)


@upgrade_step('biosource', '1', '2')
def biosource_1_2(value, system):
    # value is object - can get properites referencing names as dict keys, system is ?
    print(value)
    print(system)
    if 'cell_line' in value:
        # find ontology_term for cell_line based on term_name
        conn = system['registry'][CONNECTION]
        print(value['cell_line'])
