'''
These are a set of functions which may be used by browser tests. They are not tests nor fixtures. Import and use them like any old regular function.
'''


################################
###### Scroll the browser ######
################################

def scroll_to(browser, to: int = 0):
    browser.execute_script('window.scrollTo(0,' + to + 'px);')

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


################################
##### Search Page Funcs ########
################################


def get_search_page_result_count(browser):
    result_count_box = browser.find_by_css('div.above-results-table-row .box.results-count > span.text-500')
    return int(result_count_box.text)


