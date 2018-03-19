import pytest
from splinter import Browser
from splinter.driver import ElementAPI
from selenium.webdriver.common.keys import Keys
import time
from pkg_resources import resource_filename
from encoded.loadxl import read_single_sheet
from .browser_functions import (
    scroll_page_down,
    scroll_to,
    get_search_page_result_count,
    get_browse_view_quickinfobar_counts
)

from .macro_functions import (
    compare_quickinfo_vs_barplot_counts
)

pytestmark = [
    pytest.mark.postdeploy
]

@pytest.mark.postdeploy_local
def test_search_page_basic(session_browser: Browser, host_url: str, config: dict, splinter_selenium_implicit_wait: int):
    '''
    Test load as you scroll functionality for /search/?type=Item page
    '''
    session_browser.visit(host_url + '/search/') # Should redirect us to /search/?type=Item
    search_table_rows = session_browser.find_by_css('.search-results-container .search-result-row')
    assert len(search_table_rows) ==  config['table_load_limit'] # On initial req, before load as you scroll, we have 25 rows.

    result_count = get_search_page_result_count(session_browser)

    assert result_count > 100

    # Scroll down. Wait until we have next row loaded. Check if its loaded. x4.
    for interval in range(0, 4):
        scroll_page_down(session_browser)
        assert session_browser.is_element_present_by_css('.search-results-container .search-result-row[data-row-number="' + str( config['table_load_limit'] * (interval + 1) ) + '"]', splinter_selenium_implicit_wait) is True


@pytest.mark.skip
@pytest.mark.postdeploy_local
def test_login_logout_on_search_page(session_browser: Browser, host_url: str, config: dict):
    '''TODO: This test. We need login credentials stored in a secure place to test login so will wait on this.'''
    session_browser.visit(host_url + '/search/') # Should redirect us to /search/?type=Item
    logged_out_init_result_count = get_search_page_result_count(session_browser)


@pytest.mark.postdeploy_local
def test_pages_collection(session_browser: Browser, host_url: str, config: dict):
    '''
    Tests whether all pages are in collection, rendering properly.
    '''
    master_page_inserts = read_single_sheet(resource_filename('encoded', 'tests/data/master-inserts/'), 'page')
    session_browser.visit(host_url + '/pages') # Should redirect us to /search/?type=Page

    search_table_rows = session_browser.find_by_css('.search-results-container .search-result-row')

    # We have at least as many (or 25) pages visible in results on initial page load.
    assert min(len(search_table_rows), config['table_load_limit']) >= min(len(master_page_inserts), config['table_load_limit'])


@pytest.mark.postdeploy_local
def test_browse_url_proper_redirection(session_browser: Browser, host_url: str, config: dict, splinter_selenium_implicit_wait: int):
    session_browser.visit(host_url + '/') # Start at home page
    session_browser.find_by_id('sBrowse').first.click() # Click Browse menu item / link
    assert session_browser.is_element_present_by_text('Data Browser', splinter_selenium_implicit_wait) is True # Wait for page load
    assert 'award.project=4DN' in session_browser.url

    session_browser.visit('https://example.com') # Visit some external site
    session_browser.visit(host_url + '/browse/') # Visit 'naked' browse page URL, expect redirection

    assert session_browser.wait_for_condition(   # We have proper URL
        lambda browser: 'award.project=4DN' in browser.url,
        timeout=splinter_selenium_implicit_wait
    ) is True


@pytest.mark.postdeploy_local
def test_search_bar_basic(session_browser: Browser, host_url: str, config: dict, splinter_selenium_implicit_wait: int):
    '''
    Tests whether search bar works.
    
    This test specificially relies on SELENIUM WEBDRIVER rather than PYTEST-SPLINTER wrapper.
    Thus there is a chance it might not work with a couple of browser/BrowserDrivers.
    '''
    session_browser.visit(host_url + '/') # Start at home page

    session_browser.find_by_name('q').first.fill('mouse')

    selenium_search_bar_input_field = session_browser.driver.switch_to_active_element() # Grab un-wrapped selenium element (last elem interacted w/)
    selenium_search_bar_input_field.send_keys(Keys.ENTER) # Send 'Enter' key (form submit).

    # Wait for searh results / browse page to load -- check by title to handle case if no results.
    assert session_browser.is_element_present_by_text('Data Browser', splinter_selenium_implicit_wait) is True

    # Make sure we land on /browse/ page by default
    assert '/browse/' in session_browser.url

    # And make sure we have award.project=4DN selected.
    assert 'award.project=4DN' in session_browser.url
    assert 'q=mouse' in session_browser.url

    # And make sure we have some results - SKIPPED FOR NOW SO WE CAN USE FOR LOCAL W/ NO PUBLIC EXPSETS
    #search_table_rows = session_browser.find_by_css('.search-results-container .search-result-row')
    #assert len(search_table_rows) > 0

    # Select 'All Items' from drop-down
    search_type_dropdown_button: ElementAPI = session_browser.find_by_css('form.navbar-search-form-container button#search-item-type-selector').first
    search_type_dropdown_button.click()

    time.sleep(0.1)

    search_type_dropdown_all_items_option: ElementAPI = session_browser.find_by_css('form.navbar-search-form-container ul.dropdown-menu li:not(.active) a').first
    search_type_dropdown_all_items_option.click()

    # Wait for searh results / search page to load -- check by title to handle case if no results.
    assert session_browser.is_element_present_by_text('Search', splinter_selenium_implicit_wait) is True

    # Make sure we land on /search/ page now
    assert '/search/' in session_browser.url

    # And make sure we DON'T have award.project=4DN selected.
    assert 'award.project=4DN' not in session_browser.url

    assert 'q=mouse' in session_browser.url




def test_quick_info_barplot_counts(session_browser: Browser, host_url: str, config: dict, splinter_selenium_implicit_wait: int):
    '''
    Ensure that bar plot counts and quick info bar count match / add up in various situations.
    '''
    session_browser.visit(host_url + '/') # Start at home page

    assert session_browser.is_element_present_by_css('#stats-stat-expsets.stat-value:not(.loading)', splinter_selenium_implicit_wait) is True
    assert session_browser.is_element_present_by_id('select-barplot-field-1', splinter_selenium_implicit_wait) is True
    
    only_4dn_data_counts = get_browse_view_quickinfobar_counts(session_browser)
    
    # Compare default/initial counts
    compare_quickinfo_vs_barplot_counts(session_browser)

    # Toggle 'Include External Data' & repeat comparsion test.
    session_browser.find_by_css('.browse-base-state-toggle-container label.onoffswitch-label').first.click()

    time.sleep(0.1) # Wait for JS/transition
    assert session_browser.is_element_present_by_css('#select-barplot-field-1:not([disabled])', splinter_selenium_implicit_wait) is True
    assert session_browser.is_element_present_by_css('#stats-stat-expsets.stat-value:not(.loading)', splinter_selenium_implicit_wait) is True

    incl_external_data_counts = get_browse_view_quickinfobar_counts(session_browser)

    # Make sure our 'external data' set is greater than 'only 4dn' data for all counts (expsets, exps, files).
    for idx in range(0,2):
        assert incl_external_data_counts[idx] > only_4dn_data_counts[idx]

    compare_quickinfo_vs_barplot_counts(session_browser)

    # Search something random-ish and compare again.
    session_browser.find_by_name('q').first.fill('mouse')
    selenium_search_bar_input_field = session_browser.driver.switch_to_active_element() # Grab un-wrapped selenium element (last elem interacted w/)
    selenium_search_bar_input_field.send_keys(Keys.ENTER) # Send 'Enter' key (form submit).

    assert session_browser.is_element_present_by_text('Data Browser', splinter_selenium_implicit_wait) is True
    assert session_browser.is_element_present_by_css('#select-barplot-show-type:not([disabled])', splinter_selenium_implicit_wait) is True # Wait for this field to be on page and not disabled (== filtered data has been fetched)

    assert session_browser.wait_for_condition( # Auto-selects 'filtered' data
        lambda browser: 'Selected' in browser.find_by_id('select-barplot-show-type').first.text,
        timeout=splinter_selenium_implicit_wait
    ) is True

    time.sleep(0.5) # Wait for JS/transition (transitioning-out bars)
    assert session_browser.is_element_present_by_css('#select-barplot-field-1:not([disabled])', splinter_selenium_implicit_wait) is True
    assert session_browser.is_element_present_by_css('#stats-stat-expsets.stat-value:not(.loading)', splinter_selenium_implicit_wait) is True


    incl_external_but_filtered_data_counts = get_browse_view_quickinfobar_counts(session_browser)
    for idx in range(0,2):
        assert incl_external_data_counts[idx] > incl_external_but_filtered_data_counts[idx]


    compare_quickinfo_vs_barplot_counts(session_browser)

    # Exit/clear search
    session_browser.find_by_css('form.navbar-search-form-container i.reset-button').first.click()

    assert session_browser.wait_for_condition( # Wait until unselects
        lambda browser: 'q=mouse' not in browser.url,
        timeout=splinter_selenium_implicit_wait
    ) is True

    time.sleep(0.5) # Wait for JS/transition (transitioning-out bars)

    incl_external_data_counts_2 = get_browse_view_quickinfobar_counts(session_browser) # Make sure our counts changed back after reset search.
    for idx in range(0,2):
        assert incl_external_data_counts[idx] == incl_external_data_counts_2[idx]

    # Toggle back 'Incl External Data' to false
    session_browser.find_by_css('.browse-base-state-toggle-container label.onoffswitch-label').first.click()
    time.sleep(0.1)
    assert session_browser.wait_for_condition( # Wait until unselects
        lambda browser: 'award.project=4DN' in browser.url,
        timeout=splinter_selenium_implicit_wait
    ) is True
    assert session_browser.is_element_present_by_css('#select-barplot-field-1:not([disabled])', splinter_selenium_implicit_wait) is True

    only_4dn_data_counts_2 = get_browse_view_quickinfobar_counts(session_browser) # Make sure our counts changed back after reset search.
    for idx in range(0,2):
        assert only_4dn_data_counts[idx] == only_4dn_data_counts_2[idx]

    

def test_browse_view_file_selection_and_download(session_browser: Browser, host_url: str, config: dict, splinter_selenium_implicit_wait: int):
    session_browser.visit(host_url + '/browse/')
    assert session_browser.wait_for_condition( # Wait until unselects
        lambda browser: 'award.project=4DN' in browser.url,
        timeout=splinter_selenium_implicit_wait
    ) is True
    assert session_browser.is_element_not_present_by_css('#slow-load-container[visible="true"]', splinter_selenium_implicit_wait) is True
    assert session_browser.is_element_present_by_id('select-barplot-field-1', splinter_selenium_implicit_wait) is True # Counts, barplot data loaded

    expset_count, exp_count, file_count = get_browse_view_quickinfobar_counts(session_browser)

    assert expset_count > 5 and file_count > 10 # Some bare minimums

    def get_select_all_files_button() -> ElementAPI:
        # TODO: Change to find_by_id('select-all-files-button') once deployed.
        return session_browser.find_by_css('div.above-results-table-row > div > div:nth-child(1) > div:nth-child(1) > div > button').first

    def get_file_type_panel_button() -> ElementAPI:
        # TODO: Change to find_by_id('selected-files-file-type-filter-button')
        return session_browser.find_by_css('div.above-results-table-row > div.clearfix > div:nth-child(1) > div:nth-child(2) > div > button.btn').first

    def get_download_button() -> ElementAPI:
        return session_browser.find_by_css('div.above-results-table-row > div.clearfix > div:nth-child(1) > div:nth-child(2) > div > button.btn.btn-primary').first

    get_select_all_files_button().click()

    assert session_browser.wait_for_condition( # Wait until unselects
        lambda browser: 'Deselect All' in get_select_all_files_button().text,
        timeout=splinter_selenium_implicit_wait
    ) is True # Wait until it's selected. If it doesn't select, this be an issue (less files than results),

    # Click button for file type filtering
    get_file_type_panel_button().click()
    time.sleep(0.5)

    file_type_selection_buttons = session_browser.find_by_css('.search-result-config-panel.file-type-selector-panel .file-type-checkbox label')

    assert len(file_type_selection_buttons) > 1

    initial_download_files_count = int(''.join(filter(str.isdigit, get_download_button().text)))

    file_type_selection_buttons[0].click()
    time.sleep(0.1)

    assert int(''.join(filter(str.isdigit, get_download_button().text))) < initial_download_files_count

    file_type_selection_buttons[0].click()
    time.sleep(0.1)

    assert int(''.join(filter(str.isdigit, get_download_button().text))) == initial_download_files_count

    assert initial_download_files_count == file_count

    get_file_type_panel_button().click()
    time.sleep(0.5)

    # Assert all search table result rows are checked
    search_table_row_checkboxes = session_browser.find_by_css('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]')
    for search_table_row_checkbox in search_table_row_checkboxes:
        assert search_table_row_checkbox.checked

    '''
    search_table_row_detail_buttons = session_browser.find_by_css('.search-results-container .search-result-row .search-result-column-block button.toggle-detail-button')
    for idx in range(0,5):
        scroll_elem_into_view_by_css(session_browser, '.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] .search-result-column-block button.toggle-detail-button')
        time.sleep(0.1)
        session_browser.find_by_css('.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] .search-result-column-block button.toggle-detail-button').first.click()
        time.sleep(0.25)
        scroll_elem_into_view_by_css(session_browser, '.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] h4.pane-section-title')
        time.sleep(0.1)
        file_header = session_browser.find_by_css('.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] h4.pane-section-title').first.click() # Open 'Raw Files' section.
    '''

    '''
    for idx in range(0,5):
        scroll_to(session_browser, 400 + (30 * idx))
        time.sleep(0.25)
        session_browser.find_by_css('.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] .search-result-column-block button.toggle-detail-button').first.click() # Open detail section
        time.sleep(0.25)
        session_browser.find_by_css('.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] h4.pane-section-title').first.click() # Open files section
        time.sleep(0.25)
        table_checkboxes = session_browser.find_by_css('.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] .stacked-block-table input[type="checkbox"]')
        for checkbox in table_checkboxes:
            assert checkbox.checked

        session_browser.find_by_css('.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] h4.pane-section-title').first.click() # Close files section
        time.sleep(0.25)
        scroll_to(session_browser, 400 + (30 * idx))
        time.sleep(0.1)
        session_browser.find_by_css('.search-results-container .search-result-row[data-row-number="' + str(idx) + '"] .search-result-column-block button.toggle-detail-button').first.click() # Close detail section
    '''

    # Click download button, wait for modal
    get_download_button().click()
    assert session_browser.is_element_present_by_css('div.modal-dialog .modal-body form[method="POST"] input[type="hidden"][name="accession_triples"]', splinter_selenium_implicit_wait)
    
    # This might download stuff: .... TODO: we can download / get from download dir, then run metadata tsv unit test against it.
    #session_browser.find_by_css('div.modal-dialog .modal-body form[method="POST"] button[type="submit"][name="Download"]').first.click()



def test_search_for_olfactory_paged_result_consistency(session_browser: Browser, host_url: str, config: dict, splinter_selenium_implicit_wait: int):
    '''
    See test_search_bar_basic.

    This tests for presence of particular results which ... should be on data?
    '''
    session_browser.visit(host_url + '/')                                                                                       # Start at home page
    session_browser.find_by_name('q').first.fill('olfactory')                                                                   # Type in 'olfactory' into <input name="q"/> SearchBar input.
    session_browser.find_by_css('form.navbar-search-form-container button#search-item-type-selector').first.click()             # Click search type dropdown
    time.sleep(0.1)                                                                                                             # Wait for JSing, to show dropdown thingy.
    session_browser.find_by_css('form.navbar-search-form-container ul.dropdown-menu li:not(.active) a').first.click()           # Click 2nd option ('All Items')
    assert session_browser.is_element_present_by_text('Search') is True                                                         # Wait for Search page to load
    

    search_table_rows = session_browser.find_by_css('.search-results-container .search-result-row')
    assert len(search_table_rows) == config['table_load_limit'] # On initial req, before load as you scroll, we have 25 rows.

    result_count = get_search_page_result_count(session_browser)

    assert result_count > 300

    times_to_scroll_down = int(result_count / config['table_load_limit'])

    # Scroll down. Wait until we have next row loaded. Check if its loaded. All the way down to last result.
    # If fails, it means we got inconsistent paged result b/c table would refresh otherwise (possibly still indexing, also).
    for interval in range(0, times_to_scroll_down):
        scroll_page_down(session_browser)
        assert session_browser.is_element_present_by_css('.search-results-container .search-result-row[data-row-number="' + str( config['table_load_limit'] * (interval + 1) ) + '"]', splinter_selenium_implicit_wait) is True

