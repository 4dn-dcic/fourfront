from snovault import (
    AuditFailure,
    audit_checker,
)


@audit_checker('biosource')
def audit_biosource_type_cell_lines_have_cell_line_value(value, system):
    '''
    biosource types that correspond to cell lines or primary cells should have
    a value in the cell_line field - if it is filled the validator ensures it's
    a valid cellish ontology term so don't need to check that here
    '''
    cell_types = ["primary cell", "immortalized cell line", "in vitro differentiated cells",
                  "induced pluripotent stem cell line", "stem cell"]
    bstype = value.get('biosource_type')  # required
    if bstype in cell_types:
        if not value.get('cell_line'):
            detail = 'In Biosource {}'.format(value['@id']) + \
                     ' - Missing Required cell_line field value for biosource type  ' + \
                     '{}'.format(bstype)
            yield AuditFailure('missing mandatory metadata', detail, level='ERROR')
    return
