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

    if int(value.get('schema_version', '1')) >= 2:
        return

    content_map = generate_content_map_for_page_1_2_upgrader()

    value['content'] = content_map.get(value['name'])

    if value['content'] is None:
        print('Page ' + value['name'] + ' is not in inserts or could not get "content" field from it. This is fine if intentional.')
        #raise Exception('Page ' + value['name'] + ' is not in inserts. Could not get "content" field.') # We should have an empty list, at very least (@see def generate_content_map_for_page_1_2_upgrader)

    if value.get('directory') is not None:
        del value['directory']

    if value.get('sections') is not None:
        del value['sections']

    if value.get('notification') is not None:
        del value['notification']

    if value.get('description') == '':
        del value['description']


@upgrade_step('page', '2', '3')
def page_2_3(value, system):
    '''Rename some pages, delete old unused properties'''

    if int(value.get('schema_version', '1')) >= 3:
        return

    # Moving Around Pages

    if value['name'] == 'help':
        value["title"] = "Help Section"
        value["description"] = "Documentation for using the 4DN Data Portal"
        value["children"] = [
            "f0f0f0f0-0000-0000-0000-aaaaaa000000",
            "f0f0f0f0-0000-0000-0000-aaaaaa000001",
            "f0f0f0f0-0000-0000-0000-aaaaaa000002",
            "f0f0f0f0-0000-0000-0000-aaaaaa000003",
            "f0f0f0f0-0000-0000-0000-aaaaaa000004",
            "f0f0f0f0-0000-0000-0000-aaaaaa000005"
        ]
        if value.get('table-of-contents') is not None:
            del value['table-of-contents']
        value['content'] = []

    if value['name'] == 'help/account-creation':
        value['name'] = "help/user-guide/account-creation"
        value['table-of-contents'] = {
            "enabled" : True
        }

    if value['name'] == "help/getting-started":
        value['name'] = "help/user-guide/getting-started"

    if value['name'] == "help/biosample":
        value['name'] = "help/user-guide/biosample-metadata"
    
    if value['name'] == "help/rest-api":
        value['name'] = "help/user-guide/rest-api"

    if value['name'] == "help/web-submission":
        value['name'] = "help/submitter-guide/web-submission"

    if value['name'] == "help/spreadsheet":
        value['name'] = "help/submitter-guide/spreadsheet"

    if value['name'] == "help/data-processing-pipelines":
        value['content'] = []
        value['redirect'] = { "target" : "/help/analysis/cwl-docker", "enabled" : True, "code" : 307 }
        if value.get('title') is not None:
            del value['title']


    # Remove old fields

    if value.get('table-of-contents') is not None:
        toc = value['table-of-contents']
        if toc.get('skip-depth') is not None:
            del toc['skip-depth']
        if toc.get('include-top-link') is not None:
            del toc['include-top-link']
        value['table-of-contents'] = toc



