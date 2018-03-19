import pytest
import time
from pkg_resources import resource_filename
from encoded.loadxl import read_single_sheet
from .browser_functions import (
    scroll_page_down,
    #scroll_to_bottom
)

pytestmark = [
    pytest.mark.postdeploy,
    pytest.mark.postdeploy_local
]


def test_front_page_title(session_browser, host_url: str):
    '''
    Test browser title and HTML front page title. Should only fail re: 500 errors or failed deployment.
    '''
    assert len(host_url) > 8
    session_browser.visit(host_url)

    assert host_url.replace('http://','') in session_browser.url # We may be redirected to https (fine), etc.
    assert session_browser.title == '4DN Data Portal'

    page_title = session_browser.find_by_css('#page-title-container span.title')
    assert page_title.first.text == '4D Nucleome Data Portal'
    page_subtitle = session_browser.find_by_css('#page-title-container div.subtitle')
    assert page_subtitle.first.text == 'A platform to search, visualize, and download nucleomics data.'

