#!/usr/bin/python
'''
given and env in beanstalk do the follow
2. backup database
1. clone the existing environment to new beanstalk
   eb clone
3. set env variables on new beanstalk to point to database backup
4. for each buck in existing environment:
    a.  create new bucket with proper naming
    b.  move files from existing bucket to new bucket
5. new ES instance?  (probably not covered by this script yet)
'''
import subprocess
import argparse
import boto3
import os
import json
import requests
from botocore.exceptions import ClientError
from time import sleep


def delete_db(db_identifier):
    client = boto3.client('rds')
    try:
        resp = client.delete_db_instance(
            DBInstanceIdentifier=db_identifier,
            SkipFinalSnapshot=False,
            FinalDBSnapshotIdentifier=db_identifier + "-final"
        )
    except:
        # try without the snapshot
        resp = client.delete_db_instance(
            DBInstanceIdentifier=db_identifier,
            SkipFinalSnapshot=True,
        )

    print(resp)


def delete_bs_env(env_name):
    subprocess.check_call(['eb', 'terminate', env_name, '-nh', '--force'])


def delete_s3_buckets(env_name):
    # each env needs the following buckets
    buckets = [
        'elasticbeanstalk-%s-blobs' % env_name,
        'elasticbeanstalk-%s-files' % env_name,
        'elasticbeanstalk-%s-wfoutput' % env_name,
        'elasticbeanstalk-%s-system' % env_name,
    ]

    s3 = boto3.resource('s3')
    for bucket in buckets:
        print("deleteing content for " + bucket)
        try:
            s3.Bucket(bucket).objects.delete()
            s3.Bucket(bucket).delete()
        except:
            print(bucket + " not found skipping...")


def remove_from_auth0_client(env_name):
    # first get the url of the newly created beanstalk environment
    eb = boto3.client('elasticbeanstalk')
    env = eb.describe_environments(EnvironmentNames=[env_name])
    url = None
    while url is None:
        url = env['Environments'][0].get('CNAME')
        if url is None:
            sleep(10)
    auth0_client_remove(url)

    # TODO: need to also update ES permissions policy with ip addresses of elasticbeanstalk
    # or configure application to use AWS IAM stuff


def auth0_client_remove(url):
    # Auth0 stuff
    # generate a jwt to validate future requests
    client = os.environ.get("Auth0Client")
    secret = os.environ.get("Auth0Secret")

    payload = {"grant_type": "client_credentials",
               "client_id": client,
               "client_secret": secret,
               "audience": "https://hms-dbmi.auth0.com/api/v2/"}
    headers = {'content-type': "application/json"}
    res = requests.post("https://hms-dbmi.auth0.com/oauth/token",
                        data=json.dumps(payload),
                        headers=headers)

    print(res.json())
    jwt = res.json()['access_token']
    client_url = "https://hms-dbmi.auth0.com/api/v2/clients/%s" % client
    headers['authorization'] = 'Bearer %s' % jwt

    get_res = requests.get(client_url + '?fields=callbacks', headers=headers)

    callbacks = get_res.json()['callbacks']
    full_url = 'http://' + url
    try:
        idx = callbacks.index(full_url)
    except ValueError:
        print(full_url + " Not in auth0 auth, doesn't need to be removed")
        return
    if idx:
        callbacks.pop(idx)
    client_data = {'callbacks': callbacks}

    update_res = requests.patch(client_url, data=json.dumps(client_data), headers=headers)
    print(update_res.json()['callbacks'])


def delete_es_domain(new):
    # get the status of this bad boy
    es = boto3.client('es')
    try:
        res = es.delete_elasticsearch_domain(DomainName=new)
        print(res)
    except:
        print("es domain %s not found, skipping" % new)


def main():
    parser = argparse.ArgumentParser(
        description="Clone a beanstalk env into a new one",
        )
    parser.add_argument('--env')

    args = parser.parse_args()
    name = input("This will totally blow away the env if you are sure"
                 "type the env name to confirm:")
    if str(name) != args.env:
        print("that aint it")
        return
    print("### removing access to auth0")
    remove_from_auth0_client(args.env)
    print("### Deleting beanstalk enviornment")
    delete_bs_env(args.env)
    print("### delete contents of s3")
    delete_s3_buckets(args.env)
    print("### delete es domain")
    delete_es_domain(args.env)
    print("### delete database")
    delete_db(args.env)



if __name__ == "__main__":
    main()
