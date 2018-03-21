import pytest
import time
from splinter import Browser
from splinter.driver import ElementAPI
import requests
from .browser_functions import (
    scroll_page_down,
    scroll_elem_into_view_by_css,
    get_search_page_result_count,
    scroll_search_results
    #scroll_to_bottom
)

pytestmark = [
    pytest.mark.postdeploy,
    pytest.mark.postdeploy_local
]



def assert_wf_page(session_browser: Browser, root_url, config, splinter_selenium_implicit_wait: int = 10):
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




@pytest.mark.postdeploy_local
def test_workflow_collection(session_browser: Browser, root_url, config, splinter_selenium_implicit_wait: int):
    '''
    Tests whether all workflows are in collection, rendering properly.
    '''
    session_browser.visit(root_url + '/search/?type=Workflow')

    total_results = get_search_page_result_count(session_browser)
    assert total_results > 3 # Number of those released, at least.

    scroll_search_results(session_browser, root_url, config, splinter_selenium_implicit_wait, assert_wf_page, min(50, total_results))





def assert_expset_page_provenance_graph(session_browser: Browser, root_url, config, splinter_selenium_implicit_wait: int = 10):
    session_browser.find_by_text(' Processed Files').first.click()
    time.sleep(2)
    file_accessions = [ f.text for f in session_browser.find_by_css('.s-block.file a.name-title') ]
    session_browser.find_by_text(' Graph').first.click()
    time.sleep(0.25)
    for f in file_accessions:
        print('\n\n\n', f)
        assert session_browser.is_element_present_by_text(f, splinter_selenium_implicit_wait)


@pytest.mark.skip(reason="Doesn't read processed s-block file titles/accession; maybe grab from JSON via requests.get") # TODO
@pytest.mark.postdeploy_local
def test_expset_provenance_graphs(session_browser: Browser, root_url, config, splinter_selenium_implicit_wait: int = 10):
    session_browser.visit(root_url + '/search/?q=processed_files.display_title%3A%2A&type=ExperimentSet')

    total_results = get_search_page_result_count(session_browser)
    assert total_results > 0 # Number of those released, at least.

    scroll_search_results(session_browser, root_url, config, splinter_selenium_implicit_wait, assert_expset_page_provenance_graph, min(50, total_results))

