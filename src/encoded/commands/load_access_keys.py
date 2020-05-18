import argparse
import logging
import structlog
import json
import os
import boto3
from pyramid.paster import get_app
from webtest import TestApp, AppError
from dcicutils.beanstalk_utils import get_beanstalk_real_url

log = structlog.getLogger(__name__)
EPILOG = __doc__


def get_existing_key_ids(testapp, user_uuid, key_desc):
    """
    Search for an access key with given description and user uuid.
    If successful return list of @id values of all found access keys.
    This is expected to fail if the current server is not up.
    Logs information on errors.

    Args:
        testapp (webtest.TestApp): current TestApp
        user_uuid (str): uuid of the user used to generate the key
        key_desc (str): description of the access key to find

    Return:
        list: of str access keys ids
    """
    try:
        search_res = testapp.get('/search/?type=AccessKey&description=%s&user.uuid=%s'
                                 % (key_desc, user_uuid)).json
    except Exception as exc:
        log.error('load_access_keys: search failed for access key with desc'
                  ' %s. Exception: %s' % (key_desc, exc))
        return []
    if len(search_res['@graph']) > 1:
        log.warning('load_access_keys: %s access keys found with '
                    'description %s and user.uuid %s.'
                    % (len(search_res['@graph']), key_desc, user_uuid))
    return [res['@id'] for res in search_res['@graph']]


def generate_access_key(testapp, env, user_uuid, description):
    """
    Generate an access key for given user on given environment.

    Args:
        testapp (webtest.TestApp): current TestApp
        env (str): application environment used to find server
        user_uuid (str): uuid of the user to gener
        description (str): description to add to access key

    Returns:
        dict: access key contents with server
    """
    server = get_beanstalk_real_url(env)
    access_key_req = {'user': user_uuid, 'description': description}
    res = testapp.post_json('/access_key', access_key_req).json
    return {'secret': res['secret_access_key'],
            'key': res['access_key_id'],
            'server': server}


def main():
    """
    Function to create and load access keys for multiple users to the system s3
    bucket. The description of the key is set to the s3 object name. Before
    creating the keys, will attempt to delete pre-existing keys with the given
    descriptions. This command is not meant to be run locally.

    Provide required `config_uri` and `--app-name` to the command.
    Example usage:
    `bin/load_access_keys production.ini --app-name app`
    """
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.INFO)

    parser = argparse.ArgumentParser(
        description="Load Access Keys", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('config_uri', help='path to configfile')
    parser.add_argument('--app-name', help='Pyramid app name in configfile')
    args = parser.parse_args()

    app = get_app(args.config_uri, args.app_name)
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

    env = app.registry.settings.get('env.name')
    if not env:
        raise RuntimeError('load_access_keys: cannot find env.name in settings')

    encrypt_key = os.environ.get('S3_ENCRYPT_KEY')
    if not encrypt_key:
        raise RuntimeError('load_access_keys: must define S3_ENCRYPT_KEY in env')

    # will need to use a dynamic region at some point (not just here)
    s3 = boto3.client('s3', region_name='us-east-1')
    s3_bucket = app.registry.settings['system_bucket']

    # we generate keys for the following accounts w/ corresponding descriptions
    to_generate = [('4dndcic@gmail.com', 'access_key_admin'),
                   ('tibanna.app@gmail.com', 'access_key_tibanna'),
                   ('foursight.app@gmail.com', 'access_key_foursight')]
    for email, key_name in to_generate:
        try:
            user_props = testapp.get('/users/%s?datastore=database' % (email)).follow().json
        except Exception as exc:
            log.error('load_access_keys: could not get user %s. Exception: %s' % (email, exc))
            continue

        key_ids = get_existing_key_ids(testapp,  user_props['uuid'], key_name)
        for key_id in key_ids:
            try:
                testapp.patch_json(key_id, {'status': 'deleted'})
            except AppError:
                log.error('load_access_keys: key_id: %s does not exist in database but exists in ES' % key_id)


        key = generate_access_key(testapp, env, user_props['uuid'], key_name)
        s3.put_object(Bucket=s3_bucket,
                      Key=key_name,
                      Body=json.dumps(key),
                      SSECustomerKey=encrypt_key,
                      SSECustomerAlgorithm='AES256')
        log.info('load_access_keys: successfully generated access key %s' % key_name)


if __name__ == "__main__":
    main()
