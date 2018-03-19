import pytest
import time
from splinter import Browser
from splinter.driver import ElementAPI
import requests
from .browser_functions import (
    scroll_page_down,
    scroll_elem_into_view_by_css,
    get_search_page_result_count
    #scroll_to_bottom
)

pytestmark = [
    pytest.mark.postdeploy,
    pytest.mark.postdeploy_local
]



def visit_and_assert_wf_page(session_browser: Browser, wf_link: ElementAPI, splinter_selenium_implicit_wait: int = 10):
    wf_link.click()
    session_browser.is_element_present_by_css('.item-page-container.type-Workflow.type-Item', splinter_selenium_implicit_wait)

    json_resp = requests.get(session_browser.url + '?format=json').json() # Compare against steps in JSON
    assert len(json_resp['steps']) > 0

    session_browser.find_by_css('.workflow-view-controls-container .checkbox-container.for-state-showReferenceFiles label').first.click()
    session_browser.find_by_css('.workflow-view-controls-container .checkbox-container.for-state-showParameters label').first.click()
    time.sleep(0.25)

    for step in json_resp['steps']:
        assert session_browser.is_element_present_by_text(step['name'], splinter_selenium_implicit_wait)
        for step_output in step.get('outputs', []): # Outputs override inputs, so we may get some misses for step_inputs.
            try:
                out_name = [ t for t in step_output.get('target', []) if t.get('step') is None and t.get('name') is not None ][0]['name']
            except:
                out_name = step_output['name']
            assert session_browser.is_element_present_by_text(out_name, splinter_selenium_implicit_wait)

        global_inputs = [ step_input for step_input in step.get('inputs', []) if step_input.get('meta', {}).get('global', False) == True ]
        for step_input in global_inputs:
            try:
                out_name = [ t for t in step_input.get('source', []) if t.get('step') is None and t.get('name') is not None ][0]['name']
            except:
                out_name = step_input['name']
            assert session_browser.is_element_present_by_text(out_name, splinter_selenium_implicit_wait)



    pass



@pytest.mark.postdeploy_local
def test_workflow_collection(session_browser: Browser, host_url: str, config: dict, splinter_selenium_implicit_wait: int):
    '''
    Tests whether all workflows are in collection, rendering properly.
    '''
    session_browser.visit(host_url + '/search/?type=Workflow')

    total_results = get_search_page_result_count(session_browser)

    assert total_results > 3 # Number of those released, at least.

    for idx in range(0, total_results):
        row_css_selector = '.search-results-container .search-result-row[data-row-number="{}"]'.format(str(idx))
        scroll_elem_into_view_by_css(session_browser, row_css_selector, -180)
        time.sleep(0.5)
        category_col = session_browser.find_by_css(row_css_selector + ' .search-result-column-block[data-field="category"]').first
        assert category_col.text is not None and category_col.text != ''
        visit_and_assert_wf_page(
            session_browser,
            session_browser.find_by_css(row_css_selector + ' .search-result-column-block[data-field="display_title"] .title-block a').first,
            splinter_selenium_implicit_wait
        )
        session_browser.back()

        for interval in range(0, int(idx / config['table_load_limit']) ):
            scroll_page_down(session_browser)
            assert session_browser.is_element_present_by_css('.search-results-container .search-result-row[data-row-number="' + str( config['table_load_limit'] * (interval + 1) ) + '"]', splinter_selenium_implicit_wait) is True
        if total_results - idx < config['table_load_limit']:
            assert session_browser.is_element_present_by_css('.fin.search-result-row', splinter_selenium_implicit_wait)

        assert session_browser.is_element_present_by_css(row_css_selector, splinter_selenium_implicit_wait)


