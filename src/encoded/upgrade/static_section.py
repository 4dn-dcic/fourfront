from snovault import (
    upgrade_step,
)


@upgrade_step('static_section', '1', '2')
def static_section_1_2(value, system):

    if "#" in value['name']:
        value['name'] = value['name'].replace('#', '.', 1)

