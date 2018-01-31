from snovault import (
    upgrade_step,
)
from encoded.schema_formats import is_uuid
from encoded.loadxl import read_single_sheet
from pkg_resources import resource_filename



def generate_content_map_for_page_1_2_upgrader():
    return {
        insert_item['name'] : insert_item.get('content', [])
        for insert_item in read_single_sheet(resource_filename('encoded', 'tests/data/master-inserts/'), 'page')
    }


@upgrade_step('page', '1', '2')
def page_1_2(value, system):
    '''Primarily, we delete old properties and add new property "content" from a map generated from page inserts.'''

    content_map = generate_content_map_for_page_1_2_upgrader()

    value['content'] = content_map.get(value['name'])

    if value['content'] is None:
        raise Exception('Page ' + value['name'] + ' is not in inserts. Could not get "content" field.') # We should have an empty list, at very least (@see def generate_content_map_for_page_1_2_upgrader)

    if value.get('directory') is not None:
        del value['directory']

    if value.get('sections') is not None:
        del value['sections']

    if value.get('notification') is not None:
        del value['notification']

    if value.get('description') == '':
        del value['description']
