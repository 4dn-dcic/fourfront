#!/usr/bin/env python3
import argparse
import json
import logging
from datetime import datetime

from dcicutils import ff_utils

logger = logging.getLogger(__name__)
logging.basicConfig()
logger.setLevel(logging.INFO)

EPILOG = __doc__

def get_args():
    parser = argparse.ArgumentParser(  # noqa - PyCharm wrongly thinks the formatter_class is specified wrong here.
        description="Load Ontology Term Data", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('json_file', help="File containing terms to load")
    parser.add_argument('--patch-only', default=False,
                        action='store_true', help='Use if not posting any new items')
    parser.add_argument('--env', default='local',
                        help='FF environment to update from. Defaults to local')
    parser.add_argument('--local-key', help='Access key ID if using local')
    parser.add_argument('--local-secret', help='Access key secret if using local')
    return parser.parse_args() 


def get_auth_config_uri(env, local_key=None, local_secret=None):  
    # authentication with Fourfront
    if env == 'local':
        # prompt access key ID and secret from user
        config_uri = 'development.ini'
        local_id = local_key if local_key else input('[local access key ID] ')
        local_secret = local_secret if local_secret else input('[local access key secret] ')
        auth = {'key': local_id, 'secret': local_secret, 'server': 'http://localhost:8000'}
    else:
        config_uri = 'production.ini'
        auth = ff_utils.get_authentication_with_server(None, env)
    return auth, config_uri

def load_terms(auth, config_uri, json_file, patch_only=False):
    load_endpoint = '/'.join([auth['server'], 'load_data'])
    logger.info('load_ontology_terms: Starting POST to %s' % load_endpoint)
    json_data = {'config_uri': config_uri, 'itype': 'ontology_term',
                 'overwrite': True, 'iter_response': True, 'patch_only': patch_only}
    with open(json_file) as infile:
        all_items = json.load(infile)
        json_data['store'] = {'ontology_term': all_items['terms']}
    num_to_load = len(json_data['store']['ontology_term'])
    logger.info('Will attempt to load %s ontology terms to %s'
                % (num_to_load, auth['server']))
    if patch_only:
        logger.info('Posting phase will be skipped, running patches only.')
    start = datetime.now()
    try:
        # sustained by returning Response.app_iter from loadxl.load_data
        res = ff_utils.authorized_request(load_endpoint, auth=auth, verb='POST',
                                          timeout=None, json=json_data)
    except Exception as exc:
        logger.error('Error on POST: %s' % str(exc))
    else:
        # process the individual item responses from the generator.
        # each item should be "POST: <uuid>,", "PATCH: <uuid>,", or "SKIP: <uuid>"
        load_res = {'POST': [], 'PATCH': [], 'SKIP': [], 'ERROR': []}
        for val in res.text.split('\n'):
            if val.startswith('POST') or val.startswith('SKIP'):
                prefix_len = 4  # 'POST' or 'SKIP'
            else:
                prefix_len = 5  # 'PATCH' or 'ERROR'
            # this is a bit weird, but we want to split out the POST/PATCH...
            # and also remove ': ' from the value for each message
            cat, msg = val[:prefix_len], val[prefix_len + 2:]
            if not msg:
                continue
            if cat in load_res:
                load_res[cat].append(msg)
        logger.info("Success! Attempted to load %s items. Result: POSTed %s, PATCHed %s, skipped %s"
                    % (num_to_load, len(load_res['POST']), len(load_res['PATCH']), len(load_res['SKIP'])))
        if load_res['ERROR']:
            logger.error("ERROR encountered during load_data! Error: %s" % load_res['ERROR'])
        if (len(load_res['POST']) + len(load_res['SKIP'])) > len(load_res['PATCH']):
            logger.error("The following items passed round I (POST/skip) but not round II (PATCH): %s"
                         % (set(load_res['POST'] + load_res['SKIP']) - set(load_res['PATCH'])))
        elif not load_res['ERROR']:
            if all_items.get('ontologies'):
                o = {'patched': 0, 'not patched': 0}
                for k, v in all_items['ontologies'].items():
                    try:
                        response = ff_utils.patch_metadata(v, k, key=auth)
                        if response['status'] == 'success':
                            o['patched'] += 1
                        else:
                            o['not patched'] += 1
                    except Exception:
                        o['not patched'] += 1
                logger.info('Attempted to patch {} ontologies. Result: {} succeeded, {} failed'.format(
                    len(all_items['ontologies'].keys()), o['patched'], o['not patched']
                ))
    logger.info("Finished request in %s" % str(datetime.now() - start))
    logger.info("DONE!")


def main():
    """
    Load a given JSON file with ontology terms inserts to a server using
    the `load_data` endpoint defined in loadxl.
    """   
    # Loading app will have configured from config file. Reconfigure here:
    logging.basicConfig()
    logging.getLogger('encoded').setLevel(logging.INFO)
    args = get_args()

    auth, config_uri = get_auth_config_uri(args.env, local_key=args.local_key, local_secret=args.local_secret)
    load_terms(auth, config_uri, args.json_file, args.patch_only)


if __name__ == "__main__":
    main()
