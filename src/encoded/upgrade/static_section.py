from snovault import (
    upgrade_step,
)


@upgrade_step('static_section', '1', '2')
def static_section_1_2(value, system):

    # Rename/move sections

    if value['name'] == "help#introduction":
        value['name'] = "help.user-guide.data-organization.introduction"

    if value['name'] == "help#carousel-place-holder":
        value['name'] = "help.user-guide.data-organization.carousel-place-holder"

    if value['name'] == "help#introduction2":
        value['name'] = "help.user-guide.data-organization.introduction2"

    if value['name'] == "help.account-creation#account_creation":
        value['name'] = "help.user-guide.account-creation.account_creation"

    if value['name'] == "help.getting-started#getting_started":
        value['name'] = "help.user-guide.getting-started.getting_started"

    if value['name'] == "help.biosample#metadata":
        value['name'] = "help.submitter-guide.biosample-metadata.metadata"

    if value['name'] == "help.spreadsheet#excel_submission":
        value['name'] = "help.submitter-guide.spreadsheet.excel_submission"

    if value['name'] == "help.spreadsheet#schema_info":
        value['name'] = "help.submitter-guide.spreadsheet.schema_info"

    if value['name'] == "help.rest-api#rest_api_submission":
        value['name'] = "help.submitter-guide.rest-api.rest_api_submission"

    if value['name'] == "help.data-processing-pipelines":
        value['name'] = "help.analysis.cwl-docker.data-processing-pipelines"

    if value['name'] == "help.spreadsheet#schema_info":
        value['name'] = "help.submitter-guide.spreadsheet.schema_info"


    if "#" in value['name']:
        value['name'] = value['name'].replace('#', '.', 1)

