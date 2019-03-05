from snovault import (
    upgrade_step,
)


@upgrade_step('workflow_run_awsem', '1', '2')
@upgrade_step('workflow_run_sbg', '1', '2')
@upgrade_step('workflow_run', '1', '2')
def workflow_run_1_2(value, system):
    '''Change input_files.format_if_extra to FileFormat'''
    formats = system['registry']['collections']['FileFormat']
    input_files = value.get('input_files', [])
    for i, infile in enumerate(input_files):
        if 'format_if_extra' not in infile:
            continue
        eformat_item = formats.get(infile['format_if_extra'])
        efuuid = None
        try:
            efuuid = str(eformat_item.uuid)
        except AttributeError:
            pass
        if not efuuid:
            msg = 'EXTRA_FILE_FORMAT: %s NOT FOUND' % infile['format_if_extra']
            note = value['input_files'][i].get('notes', '')
            msg = ' '.join([note, msg])
            value['input_files'][i]['notes'] = msg
            del value['input_files'][i]['format_if_extra']
        else:
            value['input_files'][i]['format_if_extra'] = efuuid


@upgrade_step('workflow_run_awsem', '2', '3')
@upgrade_step('workflow_run_sbg', '2', '3')
@upgrade_step('workflow_run', '2', '3')
def workflow_run_2_3(value, system):
    if 'output_quality_metrics' in value:
        del value['output_quality_metrics']
