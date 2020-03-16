from pyramid.view import view_config

from snovault.resources import Item
from snovault.util import debug_log
from wranglertools.import_data import main as _import_data
from wranglertools.get_field_info import main as _get_field_info


@view_config(name='import_data', request_method='POST', permission='edit')
@debug_log
def run_import_data(context, request):
    """ Run the import_data command with relevant args """
    pass


@view_config(name='import_data', request_method='POST', permission='edit')
@debug_log
def run_get_field_info(context, request):
    """ Run the get_field_info command with relevant args """
    pass
