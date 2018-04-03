'''
These are a set of functions which may be used by browser tests. They are not tests nor fixtures. Import and use them like any old regular function.
'''

from splinter import Browser
import time


################################
###### Scroll the browser ######
################################


def scroll_to(browser: Browser, to: int = 0):
    browser.execute_script('window.scrollTo(0,' + str(to) + ');')

def scroll_page_down(browser):
    browser.execute_script("window.scrollTo(0, (document.documentElement.scrollHeight || document.body.scrollHeight) + 200);")

def scroll_page_up(browser):
    browser.execute_script("window.scrollTo(0, -((document.documentElement.scrollHeight || document.body.scrollHeight) + 200));")

def scroll_viewport_up(browser):
    browser.execute_script("window.scrollTo(0, window.innerHeight);")

def scroll_viewport_down(browser):
    browser.execute_script("window.scrollTo(0, -window.innerHeight);")


################################
###### Scroll an element  ######
################################


def scroll_elem_into_view_by_css(browser, css_selector, top_offset = 0):
    browser.execute_script('''
        var elem = document.querySelector('{}');
        var boundingRect = elem.getBoundingClientRect();
        window.scrollBy(0, boundingRect.top + {});
    '''.format(css_selector, top_offset))


################################
##### Search Page Funcs ########
################################


def get_search_page_result_count(browser: Browser):
    result_count_box = browser.find_by_css('div.above-results-table-row .box.results-count > span.text-500').first
    if not result_count_box:
        return 0
    return int(result_count_box.text)


def scroll_search_results(session_browser: Browser, host_url, config, splinter_selenium_implicit_wait, function_to_run, num_results_to_get:int=None):
    total_results = get_search_page_result_count(session_browser)
    if num_results_to_get is None or num_results_to_get > total_results:
        num_results_to_get = total_results

    for idx in range(0, num_results_to_get):
        row_css_selector = '.search-results-container .search-result-row[data-row-number="{}"]'.format(str(idx))
        scroll_elem_into_view_by_css(session_browser, row_css_selector, -180)
        time.sleep(0.5)
        session_browser.find_by_css(row_css_selector + ' .search-result-column-block[data-field="display_title"] .title-block').first.click()
        function_to_run(session_browser, host_url, config, splinter_selenium_implicit_wait)
        session_browser.back()

        for interval in range(0, int(idx / config['table_load_limit']) ):
            scroll_page_down(session_browser)
            assert session_browser.is_element_present_by_css('.search-results-container .search-result-row[data-row-number="' + str( config['table_load_limit'] * (interval + 1) ) + '"]', splinter_selenium_implicit_wait) is True
        if total_results - idx < config['table_load_limit']:
            assert session_browser.is_element_present_by_css('.fin.search-result-row', splinter_selenium_implicit_wait)

        assert session_browser.is_element_present_by_css(row_css_selector, splinter_selenium_implicit_wait)


################################
##### Browse Page Funcs ########
################################


def get_browse_view_quickinfobar_counts(browser: Browser):
    '''
    :returns 3-item tuple of integers - expsets, exps, and files counts. Returns filtered values if both filtered & total counts present (e.g. '12 / 54' -> 12, '54' -> 54).
    '''
    def count_text_to_int(count_str: str):
        if ' / ' in count_str:
            pos = count_str.find(' / ')
            count_str = count_str[:pos]
        return int(count_str)

    return (
        count_text_to_int(browser.find_by_id('stats-stat-expsets').first.text),
        count_text_to_int(browser.find_by_id('stats-stat-experiments').first.text),
        count_text_to_int(browser.find_by_id('stats-stat-files').first.text)
    )


