import pytest
from splinter import Browser
from splinter.driver import ElementAPI
from selenium.webdriver.common.keys import Keys
import time
from pkg_resources import resource_filename
from encoded.loadxl import read_single_sheet
from .browser_functions import (
    scroll_page_down,
    get_search_page_result_count
)

from .macro_functions import (
    compare_quickinfo_vs_barplot_counts
)

pytestmark = [
    pytest.mark.postdeploy
]

@pytest.mark.postdeploy_local
def test_search_page_basic(session_browser: Browser, host_url: str, config: dict):
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
        assert session_browser.is_element_present_by_css('.search-results-container .search-result-row[data-row-number="' + str( config['table_load_limit'] * (interval + 1) ) + '"]', 10) is True


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
def test_search_bar_basic(session_browser: Browser, host_url: str, config: dict):
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
    assert session_browser.is_element_present_by_text('Data Browser', 10) is True

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
    assert session_browser.is_element_present_by_text('Search', 10) is True

    # Make sure we land on /search/ page now
    assert '/search/' in session_browser.url

    # And make sure we DON'T have award.project=4DN selected.
    assert 'award.project=4DN' not in session_browser.url

    assert 'q=mouse' in session_browser.url




def test_quick_info_barplot_counts(session_browser: Browser, host_url: str, config: dict):
    '''
    Ensure that bar plot counts and quick info bar count match / add up.
    '''
    session_browser.visit(host_url + '/') # Start at home page

    time.sleep(5) # TEMPORARY - UNTIL HAS .loading CLASS ON STAGING, DATA
    assert session_browser.is_element_present_by_css('#stats-stat-expsets.stat-value:not(.loading)', 10) is True
    
    
    # Compare default/initial counts
    compare_quickinfo_vs_barplot_counts(session_browser)

    # Toggle 'Include External Data' & repeat comparsion test.
    session_browser.find_by_css('.browse-base-state-toggle-container label.onoffswitch-label').first.click()

    #time.sleep(5) # TEMPORARY - UNTIL HAS .loading CLASS ON STAGING, DATA
    time.sleep(0.1)
    assert session_browser.is_element_present_by_css('#select-barplot-field-1:not([disabled])', 10) is True
    assert session_browser.is_element_present_by_css('#stats-stat-expsets.stat-value:not(.loading)', 10) is True


    compare_quickinfo_vs_barplot_counts(session_browser)

    # Search something random-ish and compare again.
    session_browser.find_by_name('q').first.fill('mouse')
    selenium_search_bar_input_field = session_browser.driver.switch_to_active_element() # Grab un-wrapped selenium element (last elem interacted w/)
    selenium_search_bar_input_field.send_keys(Keys.ENTER) # Send 'Enter' key (form submit).

    #time.sleep(5) # TEMPORARY - UNTIL HAS .loading CLASS ON STAGING, DATA
    assert session_browser.is_element_present_by_text('Data Browser', 10) is True
    time.sleep(0.1)
    assert session_browser.is_element_present_by_css('#select-barplot-field-1:not([disabled])', 10) is True
    assert session_browser.is_element_present_by_css('#stats-stat-expsets.stat-value:not(.loading)', 10) is True


    compare_quickinfo_vs_barplot_counts(session_browser)
    


def test_browse_view_file_selection(session_browser: Browser, host_url: str, config: dict):
    pass


def test_search_for_olfactory_paged_result_consistency(session_browser: Browser, host_url: str, config: dict):
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
        assert session_browser.is_element_present_by_css('.search-results-container .search-result-row[data-row-number="' + str( config['table_load_limit'] * (interval + 1) ) + '"]', 10) is True

    # Check load as you scroll consistency for q=olfactory results
    #session_browser.find_by_name('q').first.fill('mouse')

    #selenium_search_bar_input_field = session_browser.driver.switch_to_active_element() # Grab un-wrapped selenium element (last elem interacted w/)
    #selenium_search_bar_input_field.send_keys(Keys.ENTER) # Send 'Enter' key (form submit).

    #session_browser.fill('q', 'mouse')

    #time.sleep(10)
