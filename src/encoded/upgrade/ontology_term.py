from snovault import upgrade_step


@upgrade_step('ontology_term', '1', '2')
def ontology_term_1_2(value, system):
    if 'source_ontology' in value:
        value['source_ontologies'] = [value['source_ontology']]
        del value['source_ontology']
