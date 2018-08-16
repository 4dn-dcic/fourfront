from snovault import (
    upgrade_step,
)
from encoded.schema_formats import is_uuid


@upgrade_step('workflow_run', '1', '2')
def workflow_run_1_2(value, system):
    '''Change input_files.format_if_extra to FileFormat'''
    formats = system['registry']['collections']['FileFormat']
    input_files = value.get('input_files', [])
    for i, infile in enumerate(input_files):
        eformat = infile.get('format_if_extra')
        eformat_item = formats.get(eformat)
        efuuid = None
        try:
            efuuid = str(eformat_item.uuid)
        except AttributeError:
            pass
        if not efuuid:
            del value['input_files'][i]['format_if_extra']
            msg = ' EXTRA_FILE_FORMAT: %s NOT FOUND' % eformat
            note = value['input_files'][i].get('notes', '')
            msg = note + msg
            value['input_files'][i]['notes'] = msg
        else:
            value['input_files'][i]['format_if_extra'] = efuuid
