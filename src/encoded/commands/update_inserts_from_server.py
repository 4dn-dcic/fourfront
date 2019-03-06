import structlog
import logging
import argparse
import json
from os import walk
# use ff_utils to find inserts and write data
from dcicutils.ff_utils import expand_es_metadata, dump_results_to_json
# use this function to read inserts
from .run_upgrader_on_inserts import get_inserts

logger = structlog.getLogger(__name__)
EPILOG = __doc__


def read_local_inserts_dir(dir, path, target_types=[]):
    """
    Given path string path, read local inserts directory and return a
    dictionary of all inserts keyed by item type, as well as a list of all
    found uuids

    Args:
        dir (str): string name of the inserts directory
        path (str): string path to the inserts directory
        target_types (list): list of item types to load. Empty means all types

    Returns:
        dict of inserts, list of item uuids
    """
    item_types = []
    item_uuids = []
    local_inserts = {}
    # find item types that are represented in the given inserts path
    for (dirpath, dirnames, filenames) in walk(path):
        item_types = [it[:-5] for it in filenames if it.endswith('.json')]
    if target_types:
        bad_item_types = [it for it in target_types if it not in item_types]
        if bad_item_types:
            raise Exception('update_inserts: Specified item type(s) %s are not found in '
                            'the inserts dir. Found: %s' % (bad_item_types, item_types))
    # update item_types if user specified specific ones
    fetch_item_types = target_types if target_types else item_types
    # load current insert contents from json file
    for item_type in item_types:
        local_inserts[item_type] = {}  # key these by uuid for now
        for it_item in get_inserts(dir, item_type):
            # only fetch items for specified fetch_item_types
            if item_type in fetch_item_types:
                item_uuids.append(it_item['uuid'])
            local_inserts[item_type][it_item['uuid']] = it_item
    return local_inserts, item_uuids


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
    parser.add_argument('--dest', default='temp-local-inserts',
                        help="destination file in inserts dir to write to")
    parser.add_argument('--item-type', action='append', default=[],
                        help="item type, e.g. file_fastq. Defaults to all types")
    parser.add_argument('--ignore-field', action='append', default=[],
                        help='field name to ignore when running expand_es_metadata')

    args = parser.parse_args()
    # this will work since bin/ commands are run from root FF directory
    inserts_location = 'src/encoded/tests/data'
    # hardcode these to prevent accidental creation of inserts files
    inserts_files = ['inserts', 'master-inserts', 'perf-testing',
                     'workbook-inserts', 'temp-local-inserts']
    if args.dest not in inserts_files:
        raise Exception('Specified inserts destination %s must be one of: %s'
                        % (args.dest, inserts_files))
    inserts_path = '/'.join([inserts_location, args.dest])

    local_inserts, item_uuids = read_local_inserts_dir(args.dest, inserts_path, args.item_type)

    # now find uuids and all linked from the given server
    svr_inserts, svr_uuids = expand_es_metadata(item_uuids, ff_env=args.env,
                                                store_frame='raw', add_pc_wfr=True,
                                                ignore_field=args.ignore_field)

    # if we are updating `inserts`, must make sure that items don't conflict
    # with those in `master-inserts`
    skip_uuids = set()
    if args.dest == 'inserts':
        master_path = '/'.join([inserts_location, 'master-inserts'])
        master_inserts, master_uuids = read_local_inserts_dir('master-inserts', master_path)
        item_conflict_report = {}
        for item_type in svr_inserts:
            itype_err = []
            itype_okay = []
            conflicting_items = [item for item in svr_inserts[item_type] if item['uuid'] in master_uuids]
            for conflict in conflicting_items:
                # compare inserts by loading json objects
                svr_json = json.dumps(conflict, sort_keys=True)
                mstr_json = json.dumps(master_inserts[item_type][conflict['uuid']], sort_keys=True)
                if svr_json != mstr_json:
                    itype_err.append(conflict['uuid'])
                else:
                    # the json is the same. Remove from the `inserts` update
                    skip_uuids.add(conflict['uuid'])
                    itype_okay.append(conflict['uuid'])
            item_conflict_report[item_type] = {'error': itype_err, 'okay': itype_okay}
        if any([it for it in item_conflict_report if item_conflict_report[it]['error']]):
            error_report = {it: item_conflict_report[it]['error'] for it in item_conflict_report}
            raise Exception('update_inserts: Cannot update the following items in "inserts" directory,'
                            ' since there are conflicting items with different values'
                            'in the master-inserts. Update those first. Conflicts: %s' % error_report)
        elif any([it for it in item_conflict_report if item_conflict_report[it]['okay']]):
            conflict_report = {it: item_conflict_report[it]['okay'] for it in item_conflict_report}
            logger.warning('update_inserts: The following items are already in "master-inserts".'
                           ' Will not add to "inserts". Items:' % conflict_report)

    # now we need to update the server inserts with contents from local inserts
    # so that existing information is not lost
    for item_type in svr_inserts:
        # remove items specified by skip uuids
        if skip_uuids:
            svr_inserts[item_type] = [insrt for insrt in svr_inserts[item_type]
                                      if insrt['uuid'] not in skip_uuids]
        for item_uuid in local_inserts.get(item_type, {}):
            if item_uuid not in svr_uuids and item_uuid not in skip_uuids:
                svr_inserts[item_type].append(local_inserts[item_type][item_uuid])
    dump_results_to_json(svr_inserts, inserts_path)
    logger.info('update_inserts: Successfully wrote to %s' % inserts_path)
    for item_type in svr_inserts:
        logger.info('update_inserts: Wrote %s items to %s' %
                    (len(svr_inserts[item_type]), item_type + '.json'))



if __name__ == "__main__":
    main()
