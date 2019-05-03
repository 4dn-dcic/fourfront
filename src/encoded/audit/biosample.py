from snovault import (
    AuditFailure,
    audit_checker,
)


@audit_checker('biosample', frame=['biosource', 'cell_culture_details'])
def audit_biosample_tier1_cell_lines_have_required_cell_culture_properties(value, system):
    '''
    tier1 cell lines have required fields from biosample_cell_culture
    that must be present and that depend on the cell_line
    '''
    # check to see if any of the biosources (usually only 1) are Tier1 cell_lines
    if not any(bs.get('cell_line_tier') == 'Tier 1' for bs in value.get('biosource')):
        return
    if len(value['biosource']) != 1:
        # special case for multi-biosource
        return
    required = ['culture_duration', 'morphology_image', 'culture_harvest_date']
    missing = []
    if 'cell_culture_details' not in value:
        missing.append('cell_culture_details')
    else:
        cell_cult_info = value['cell_culture_details']
        # if 'passage_number' in cell_cult_info:
        #    if cell_cult_info['passage_number'] >= 10:
        #        # they need karyotype image so add to required
        #        required.append('karyotype')
        for ccinfo in cell_cult_info:
            for prop in required:
                if prop not in ccinfo:
                    if ':' in prop:
                        orred = prop.split(':')
                        ok = None
                        for choice in orred:
                            if choice in ccinfo:
                                ok = True
                                if not ok:
                                    missing.extend(orred)
                    else:
                        missing.append(prop)

    if missing:
        detail = 'In Biosample {}'.format(value['@id']) + \
                 ' - Missing Required Info for Tier 1 Cell Line ' + \
                 '{}'.format(value['biosource'][0]['cell_line']) + \
                 ' linked BiosampleCellCulture is missing required {}'.format(missing)
        yield AuditFailure('missing mandatory metadata', detail,
                           level='WARNING')
    return
