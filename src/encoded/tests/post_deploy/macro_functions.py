'''
These are a set of functions which may be used by browser tests. They are not tests nor fixtures. Import and use them like any old regular function.
'''

import time
from .browser_functions import get_browse_view_quickinfobar_counts


################################
##### BarPlot Test Macros ######
################################


def compare_quickinfo_vs_barplot_counts(session_browser, skip_legend = False):
    '''Compare counts in QuickInfoBar for ExpSets, Exps, Files versus total counts of bars from BarPlotChart'''

    def get_bar_counts():
        return map(lambda x: int(x.text), session_browser.find_by_css('.bar-plot-chart.chart-container .chart-bar .bar-top-label'))

    def get_legend_counts():
        return map(lambda x: int(x.text.replace(' (', '').replace(')', '')), session_browser.find_by_css('.chart-aside > .legend-container > .legend-container-inner .chart-color-legend .term span.text-300'))

    expset_stat_count, exps_stat_count, files_stat_count = get_browse_view_quickinfobar_counts(session_browser)

    assert expset_stat_count > 0

    total_count_expsets_from_bar_elems          = 0
    total_count_experiments_from_bar_elems      = 0
    total_count_files_from_bar_elems            = 0

    total_count_expsets_from_legend_elems       = 0
    total_count_experiments_from_legend_elems   = 0
    total_count_files_from_legend_elems         = 0

    total_count_expsets_from_hover_elems        = 0
    total_count_experiments_from_hover_elems    = 0
    total_count_files_from_hover_elems          = 0

    # Compare ExpSets counts
    for count in get_bar_counts():
        total_count_expsets_from_bar_elems += count

    assert total_count_expsets_from_bar_elems == expset_stat_count

    if not skip_legend:
        for count in get_legend_counts():
            total_count_expsets_from_legend_elems += count

        assert total_count_expsets_from_legend_elems == expset_stat_count

    
    # Hover over all bar parts and count up counts
    
    session_browser.find_by_css('#top-nav .navbar-brand').first.mouse_over()
    bar_parts = session_browser.find_by_css('.bar-plot-chart.chart-container .chart-bar .bar-part')
    for bar_part in bar_parts:
        bar_part.mouse_over()
        time.sleep(0.05)
        total_count_expsets_from_hover_elems += int(session_browser.find_by_css('.cursor-component-root .details-title .primary-count').first.text)
        total_count_experiments_from_hover_elems += int(''.join(filter(str.isdigit, session_browser.find_by_css('.cursor-component-root .details.row .col-xs-6').first.text)))
        total_count_files_from_hover_elems += int(''.join(filter(str.isdigit, session_browser.find_by_css('.cursor-component-root .details.row .col-xs-4').first.text)))

    assert total_count_expsets_from_hover_elems == expset_stat_count
    assert total_count_experiments_from_hover_elems == exps_stat_count
    assert total_count_files_from_hover_elems == files_stat_count

    # Change to 'experiments' (2nd menu item in aggregate type drown); compare
    session_browser.find_by_id('select-barplot-aggregate-type').first.click() # Click dropdown for 'aggregateType' selection (expsets, exps, files)
    time.sleep(0.1)
    session_browser.find_by_css('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(2)').first.click()
    time.sleep(0.75)
    for count in get_bar_counts():
        total_count_experiments_from_bar_elems += count

    assert total_count_experiments_from_bar_elems == exps_stat_count

    if not skip_legend:
        for count in get_legend_counts():
            total_count_experiments_from_legend_elems += count

        assert total_count_experiments_from_legend_elems == exps_stat_count



    # Change to 'files' (3rd menu item in aggregate type drown); compare
    session_browser.find_by_id('select-barplot-aggregate-type').first.click() # Click dropdown for 'aggregateType' selection (expsets, exps, files)
    time.sleep(0.1)
    session_browser.find_by_css('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(3)').first.click()
    time.sleep(0.75)
    for count in get_bar_counts():
        total_count_files_from_bar_elems += count

    assert total_count_files_from_bar_elems == files_stat_count

    if not skip_legend:
        for count in get_legend_counts():
            total_count_files_from_legend_elems += count

        assert total_count_files_from_legend_elems == files_stat_count

    # Change back to 'expsets' (1st menu item in aggregate type drown)
    session_browser.find_by_id('select-barplot-aggregate-type').first.click() # Click dropdown for 'aggregateType' selection (expsets, exps, files)
    time.sleep(0.1)
    session_browser.find_by_css('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(1)').first.click()
    time.sleep(0.75)
