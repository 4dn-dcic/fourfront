from snovault.loadxl import *
# -*- coding: utf-8 -*-
"""Load collections and determine the order."""

import json
import magic
import mimetypes
import os
import re
import structlog
from typing import Union
import webtest

from base64 import b64encode
from dcicutils.misc_utils import ignored, VirtualApp
from PIL import Image
from pkg_resources import resource_filename
from pyramid.paster import get_app
from pyramid.response import Response
from pyramid.view import view_config
from snovault.util import debug_log
from .server_defaults import add_last_modified



@view_config(route_name='load_data', request_method='POST', permission='add')
@debug_log
def load_data_view(context, request):
    return snovault_load_data_view(context, request)
