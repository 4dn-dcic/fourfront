from snovault import (
    upgrade_step,
)


@upgrade_step('file_fastq', '1', '2')
@upgrade_step('file_calibration', '1', '2')
@upgrade_step('file_microscopy', '1', '2')
@upgrade_step('file_processed', '1', '2')
@upgrade_step('file_reference', '1', '2')
def file_1_2(value, system):
    file_format = value.get('file_format')
    formats = system['registry']['collections']['FileFormat']
    format_item = formats.get(file_format)
    fuuid = None
    try:
        fuuid = str(format_item.uuid)
    except AttributeError:
        pass
    if not fuuid:
        other_format = formats.get('other')
        fuuid = str(other_format.uuid)
        note = value.get('notes', '')
        note = note + ' FILE FORMAT: ' + file_format
        value['notes'] = note
    value['file_format'] = fuuid

    # need to also check for extra files to upgrade_step
    extras = value.get('extra_files')
    if extras:
        for i, extra in enumerate(extras):
            eformat = extra.get('file_format')
            eformat_item = formats.get(eformat)
            efuuid = None
            try:
                efuuid = str(eformat_item.uuid)
            except AttributeError:
                pass
            if not efuuid:
                other_format = formats.get('other')
                efuuid = str(other_format.uuid)
                note = value.get('notes', '')
                note = note + ' EXTRA FILE FORMAT: ' + str(i) + '-' + eformat
                value['notes'] = note
            value['extra_files'][i]['file_format'] = efuuid
