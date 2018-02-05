import argparse
import logging
import json

from encoded.loadxl import read_single_sheet
from pkg_resources import resource_filename

logger = logging.getLogger(__name__)
EPILOG = __doc__

def get_inserts(inserts_folder_name = 'inserts', inserts_file_name = 'workflow'):
    for insert_item in read_single_sheet(resource_filename('encoded', 'tests/data/' + inserts_folder_name + '/'), inserts_file_name):
        yield insert_item

def main():

    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)


    parser = argparse.ArgumentParser(
        description="Run inserts through an upgrader", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument('--inserts-folder', help="Folder to use to get the file of inserts from. E.g. 'master-inserts' or 'inserts'. Defaults to 'inserts'.")
    parser.add_argument('item_type', help="Type of item or filename of inserts, in lowercase/schema-filename form, e.g. 'page', 'static_section'.")
    parser.add_argument('upgrader_method_name', help="Name of upgrader method to use as it is defined in upgrade/<item_type> folder, e.g. 'workflow_3_4'.")
    args = parser.parse_args()


    upgrader_module = __import__('encoded.upgrade.' + args.item_type, fromlist=[''])
    upgrader_fxn = getattr(upgrader_module, args.upgrader_method_name)


    print(json.dumps([ upgrader_fxn(item, None) for item in get_inserts(args.inserts_folder or 'inserts', args.item_type) ], indent=4, sort_keys=True)) # Return instead of print?

if __name__ == "__main__":
    main()
