from snovault import (
    upgrade_step,
)


@upgrade_step('data_release_update', '1', '2')
def data_release_update_1_2(value, system):

    if int(value.get('schema_version', '1')) >= 2:
        return

    update_items = value.get('update_items')
    if update_items and isinstance(update_items, list):
        for i in range(len(update_items)):
            if not update_items[i].get('secondary_id'):
                continue
            secondary = update_items[i]['secondary_id']
            update_items[i]['secondary_ids'] = [secondary]
            del update_items[i]['secondary_id']


@upgrade_step('data_release_update', '2', '3')
def data_release_update_2_3(value, system):

    if int(value.get('schema_version', '2')) >= 3:
        return

    update_items = value.get('update_items')
    if update_items and isinstance(update_items, list):
        for i in range(len(update_items)):
            if not update_items[i].get('secondary_ids'):
                continue
            secondary_ids = update_items[i]['secondary_ids']
            for idx, secondary in enumerate(secondary_ids):
                if not isinstance(secondary, dict):
                    update_items[i]['secondary_ids'][idx] = {'secondary_id': secondary,
                                                               'additional_info': ''}
