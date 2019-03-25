#!/usr/bin/env python3
import argparse
import logging
import os
import requests
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
    args = parser.parse_args()

    # authentication with Fourfront
    if args.env == 'local':
        # prompt access key ID and secret from user
        config_uri = 'development.ini'
        local_id = input('[local access key ID] ')
        local_secret = input('[local access key secret] ')
        auth = {'key': local_id, 'secret': local_secret, 'server': 'http://localhost:8000'}
    else:
        config_uri = 'production.ini'
        auth = ff_utils.get_authentication_with_server(None, args.env)
    load_endpoint = '/'.join([auth['server'], 'load_data'])

    use_value = None  # use this value instead of file handle if set

    # post to load_data
    logger.info('load_ontology_terms: Starting POST to %s' % load_endpoint)
    start = datetime.now()
    with open(args.json_file) as infile:
        use_data = {'ontology_term': json.load(infile)}
        json_data = {'config_uri': config_uri, 'store': use_data, 'itype': 'ontology_term'}
        try:

            ### CURRENTLY GETTING 413
            ### bin/load-ontology /Users/carl/Downloads/ontology_term.json

            res = ff_utils.authorized_request(load_endpoint, auth=auth,
                                              verb='POST', json=json_data)
            logger.info("load_ontology_terms: load_data result: %s" % res)
        except Exception as exc:
            logger.error('load_ontology_terms: error on POST: %s' % str(exc))

    logger.info("load_ontology_terms: Finished request in %s" % str(datetime.now() - start))

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
        logger.info("load_ontology_terms: Updated sysinfo with name %s" % data['name'])
    logger.info("load_ontology_terms: DONE!")

if __name__ == "__main__":
    main()
