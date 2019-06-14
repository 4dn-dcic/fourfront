from snovault import (
    upgrade_step,
)


# EXAMPLE UPGRADER

# @upgrade_step('tracking_item', '1', '2')
# def data_release_update_1_2(value, system):
#
#     if int(value.get('schema_version', '1')) >= 2:
#         return
#
#     if 'download_tracking' not in value:
#         return
#
#     download_tracking = value['download_tracking']
#     if download_tracking and 'is_visualization' in download_tracking:
#         del download_tracking['is_visualization']
