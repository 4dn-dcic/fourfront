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

    # Moving Around Pages

    if value['name'] == 'help':                          #and value['uuid'] == "311d0f4f-56ee-4450-8cbb-780c10229284":
        value['name'] = "help/user-guide/data-organization"

    if value['name'] == 'help/account-creation':         #and value['uuid'] == "5153c902-a0d2-4246-9b41-cea7a1c91f52":
        value['name'] = "help/user-guide/account-creation"

    if value['name'] == "help/getting-started":          #and value['uuid'] == "6292facf-9eb4-451e-8d05-2e56e1bd7cbe":
        value['name'] = "help/user-guide/getting-started"

    if value['name'] == "help/biosample":                #and value['uuid'] == "3c999ac4-1727-4aac-96f5-61ae701a4006":
        value['name'] = "help/user-guide/biosample-metadata"
    
    if value['name'] == "help/rest-api":                 #and value['uuid'] == "cb2dda1c-a53f-4ec5-bf94-8a866ca836fb":
        value['name'] = "help/user-guide/rest-api"

    if value['name'] == "help/web-submission":           #and value['uuid'] == "251d6d2b-4ed0-4fbe-b8b1-eaa49569187b":
        value['name'] = "help/submitter-guide/web-submission"

    if value['name'] == "help/spreadsheet":              #and value['uuid'] == "4f115e02-5291-436d-92e8-617af96355df":
        value['name'] = "help/submitter-guide/spreadsheet"

    if value['name'] == "help/data-processing-pipelines": #and value['uuid'] == "cb2dda1c-a53f-4ec5-bf94-8a866ca836fc":
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



