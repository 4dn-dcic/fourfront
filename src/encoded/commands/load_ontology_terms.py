#!/usr/bin/env python3
import argparse
import logging
import os
import json
from datetime import datetime
from dcicutils import ff_utils


logger = logging.getLogger(__name__)
EPILOG = __doc__


def main():
    """
    Load a given JSON file with ontology terms inserts to a server using
    the `load_data` endpoint defined in loadxl.
    """
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.INFO)

    parser = argparse.ArgumentParser(
        description="Load Ontology Term Data", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('json_file', help="File containing terms to load")
    parser.add_argument('--env', default='local',
                        help='FF environment to update from. Defaults to local')
    parser.add_argument('--local-key', help='Access key ID if using local')
    parser.add_argument('--local-secret', help='Access key secret if using local')
    args = parser.parse_args()

    # authentication with Fourfront
    if args.env == 'local':
        # prompt access key ID and secret from user
        config_uri = 'development.ini'
        local_id = args.local_key if args.local_key else input('[local access key ID] ')
        local_secret = args.local_secret if args.local_secret else input('[local access key secret] ')
        auth = {'key': local_id, 'secret': local_secret, 'server': 'http://localhost:8000'}
    else:
        config_uri = 'production.ini'
        auth = ff_utils.get_authentication_with_server(None, args.env)

    load_endpoint = '/'.join([auth['server'], 'load_data'])
    logger.info('load_ontology_terms: Starting POST to %s' % load_endpoint)
    json_data = {'config_uri': config_uri, 'itype': 'ontology_term',
                 'iter_response': True}
    with open(args.json_file) as infile:
        json_data['store'] = {'ontology_term': json.load(infile)}
    logger.info('Will attempt to load %s ontology terms to %s'
                % (len(json_data['store']['ontology_term']), auth['server']))
    start = datetime.now()
    try:
        # sustained by returning Response.app_iter from loadxl.load_data
        res =  ff_utils.authorized_request(load_endpoint, auth=auth, verb='POST',
                                           timeout=None, json=json_data)
    except Exception as exc:
        logger.error('Error on POST: %s' % str(exc))
    else:
        # process the individual item responses from the generator.
        # each item should be "POST: <uuid>,", "PATCH: <uuid>,", or "SKIP: <uuid>"
        load_res = {'POST': [], 'PATCH': [], 'SKIP': []}
        for val in res.text.split(','):
            val_split = val.strip().split(': ')
            if not val or len(val_split) != 2:
                continue
            if val_split[0] in load_res:
                load_res[val_split[0]].append(val_split[1])
        logger.info("Success! Result: POSTed %s, PATCHed %s, skipped %s"
                    % (len(load_res['POST']), len(load_res['PATCH']), len(load_res['SKIP'])))
        if len(load_res['POST']) > len(load_res['PATCH']):
            logger.error("The following items POSTed but did not PATCH: %s"
                         % (set(load_res['POST']) - set(load_res['PATCH'])))
    logger.info("Finished request in %s" % str(datetime.now() - start))

    # update sysinfo. Don't worry about doing this on local
    if args.env != 'local':
        data = {"name": "ffsysinfo", "ontology_updated": datetime.today().isoformat()}
        try:
            found_info = ff_utils.get_metadata('/sysinfos/' + data['name'], key=auth)
        except Exception:
            found_info = None

        if found_info:
            ff_utils.patch_metadata(data, found_info['uuid'], key=auth)
        else:
            ff_utils.post_metadata(data, 'sysinfos', key=auth)
        logger.info("Updated sysinfo with name %s" % data['name'])
    logger.info("DONE!")

if __name__ == "__main__":
    main()
