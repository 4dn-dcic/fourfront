import argparse
import structlog
import logging
import json
from os import walk
# use ff_utils to find inserts and write data
from dcicutils.ff_utils import expand_es_metadata, dump_results_to_json
# use this function to read inserts
from .run_upgrader_on_inserts import get_inserts

logger = structlog.getLogger(__name__)
EPILOG = __doc__


def main():
    """
    Use this command to update the inserts from a given fourfront env
    """
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)


    parser = argparse.ArgumentParser(
        description="Update Inserts", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--env', default='data',
                        help='FF environment to update from. Defaults to data')
    parser.add_argument('--dest', default='inserts',
                        help="destination file in inserts dir to write to")
    parser.add_argument('--item-type', action='append', default=[],
                        help="item type, e.g. file_fastq. Defaults to all types")
    parser.add_argument('--ignore-field', action='append', default=[],
                        help='field name to ignore when running expand_es_metadata')

    args = parser.parse_args()
    # this will work since bin/ commands are run from root
    inserts_dir = 'src/encoded/tests/data'
    # hardcode these to prevent accidental creation of inserts files
    inserts_files = ['inserts', 'master-inserts', 'perf-testing', 'workbook-inserts']
    if args.dest not in inserts_files:
        raise Exception('Specified inserts destination %s must be one of: %s'
                        % (args.dest, inserts_files))
    inserts_path = '/'.join([inserts_dir, args.dest])
    item_types = []
    item_uuids = []
    local_inserts = {}
    # find item types that are represented in the given inserts path
    for (dirpath, dirnames, filenames) in walk(inserts_path):
        item_types = [it[:-5] for it in filenames if it.endswith('.json')]
    if args.item_type:
        bad_item_types = [it for it in args.item_type if it not in item_types]
        if bad_item_types:
            raise Exception('Specified item type(s) %s are not found in the inserts '
                            'dir. Found: %s' % (bad_item_types, item_types))
    # update item_types if user specified specific ones
    item_types = args.item_type if args.item_type else item_types
    # load current insert contents from json file
    for item_type in item_types:
        local_inserts[item_type] = {}  # key these by uuid for now
        for it_item in get_inserts(args.dest, item_type):
            item_uuids.append(it_item['uuid'])
            local_inserts[item_type][it_item['uuid']] = it_item
    # now find uuids and all linked from the given server
    # ignore attachments and add workflow runs related to file_fastq/file_processed
    if 'attachments' not in args.ignore_field:
        use_ignore = args.ignore_field + ['attachments']
    else:
        use_ignore = args.ignore_field
    svr_inserts, svr_uuids = expand_es_metadata(item_uuids, ff_env=args.env,
                                                store_frame='raw', add_pc_wfr=True,
                                                ignore_field=use_ignore)
    # now we need to update the server inserts with contents from local inserts
    for item_type in local_inserts:
        for item_uuid in local_inserts[item_type]:
            if item_uuid not in svr_uuids:
                svr_inserts[item_type].append(local_inserts[item_type][item_uuid])
    dump_results_to_json(svr_inserts, inserts_path)


if __name__ == "__main__":
    main()
