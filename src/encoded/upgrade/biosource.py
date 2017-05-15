from snovault import (
    upgrade_step,
    CONNECTION
)


@upgrade_step('biosource', '1', '2')
def biosource_1_2(value, system):
    # import pdb; pdb.set_trace()
    if 'cell_line' in value:
        # find ontology_term for cell_line based on term_name
        terms = system['registry']['collections']['OntologyTerm']
        oterm = terms.get(value['cell_line'])
        del value['cell_line']
        if oterm:
            try:
                value['cell_line'] = str(oterm.uuid)
            except:
                pass
