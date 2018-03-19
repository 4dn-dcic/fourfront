'''
These are a set of functions which may be used by browser tests. They are not tests nor fixtures. Import and use them like any old regular function.
'''

from splinter import Browser

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

def scroll_elem_into_view_by_css(browser, css_selector):
    browser.execute_script("document.querySelector('" + css_selector + "').scrollIntoView();")


################################
##### Search Page Funcs ########
################################


def get_search_page_result_count(browser: Browser):
    result_count_box = browser.find_by_css('div.above-results-table-row .box.results-count > span.text-500')
    return int(result_count_box.text)


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


