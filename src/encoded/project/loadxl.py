from snovault.project.loadxl import SnovaultProjectLoadxl

class FourfrontProjectLoadxl(SnovaultProjectLoadxl):

    def loadxl_order(self):
        return [
            'user',
            'award',
            'lab',
            'file_format',
            'ontology',
            'ontology_term',  # validate_biosource_cell_line requires term_name
            'experiment_type',
            'biosource',
            'biosample',
            'organism',  # allow the 'default' linkTo in individuals work
            'workflow',
            'vendor',
        ]
