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
