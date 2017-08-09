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


def snapshot_db(db_identifier, snapshot_name):
    client = boto3.client('rds')
    try:
        response = client.create_db_snapshot(
             DBSnapshotIdentifier=snapshot_name,
             DBInstanceIdentifier=db_identifier)
    except ClientError:
        # probably the guy already exists
        client.delete_db_snapshot(DBSnapshotIdentifier=snapshot_name)
        response = client.create_db_snapshot(
             DBSnapshotIdentifier=snapshot_name,
             DBInstanceIdentifier=db_identifier)
    print("Response from create db snapshot", response)
    print("waiting for snapshot to create")
    waiter = client.get_waiter('db_snapshot_completed')
    waiter.wait(DBSnapshotIdentifier=snapshot_name)
    print("done waiting, let's create a new database")
    response = client.restore_db_instance_from_db_snapshot(
            DBInstanceIdentifier=snapshot_name,
            DBSnapshotIdentifier=snapshot_name,
            DBInstanceClass='db.t2.medium')
    print("Response from restore db from snapshot", response)
    waiter = client.get_waiter('db_instance_available')
    print("waiting for db to be restore... this might take some time")
    # waiter.wait(DBInstanceIdentifier=snapshot_name)
    # This doesn't mean the database is done creating, but
    # we now have enough information to continue to the next step
    endpoint = ''
    while not endpoint:
        resp = client.describe_db_instances(DBInstanceIdentifier=snapshot_name)
        endpoint = resp['DBInstances'][0].get('Endpoint')
        if endpoint and endpoint.get('Address'):
            print("we got an endpoint:", endpoint['Address'])
            return endpoint['Address']
        print(".")
        sleep(10)


def clone_bs_env(old, new, load_prod, db_endpoint, es_url):
    env = 'RDS_HOSTNAME=%s,ENV_NAME=%s,ES_URL=%s' % (db_endpoint, new, es_url)
    if load_prod is True:
        env += ",LOAD_FUNCTION=load_prod_data"
    subprocess.check_call(['eb', 'clone', old, '-n', new,
                           '--envvars', env,
                           '--exact', '--nohang'])


def create_s3_buckets(new):
    new_buckets = [
        'elasticbeanstalk-%s-blobs' % new,
        'elasticbeanstalk-%s-files' % new,
        'elasticbeanstalk-%s-wfoutput' % new,
        'elasticbeanstalk-%s-system' % new,
    ]
    s3 = boto3.client('s3')
    for bucket in new_buckets:
        s3.create_bucket(Bucket=bucket)


def copy_s3_buckets(new, old):
    # each env needs the following buckets
    new_buckets = [
        'elasticbeanstalk-%s-blobs' % new,
        'elasticbeanstalk-%s-files' % new,
        'elasticbeanstalk-%s-wfoutput' % new,
        'elasticbeanstalk-%s-system' % new,
    ]
    old_buckets = [
        'elasticbeanstalk-%s-blobs' % old,
        'elasticbeanstalk-%s-files' % old,
        'elasticbeanstalk-%s-wfoutput' % old,
    ]
    s3 = boto3.client('s3')
    for bucket in new_buckets:
        try:
            s3.create_bucket(Bucket=bucket)
        except:
            print("bucket already created....")

    # now copy them
    #aws s3 sync s3://mybucket s3://backup-mybucket
    # get rid of system bucket
    new_buckets.pop()
    for old, new in zip(old_buckets, new_buckets):
        oldb = "s3://%s" % old
        newb = "s3://%s" % new
        print("copying data from old %s to new %s" % (oldb, newb))
        subprocess.call(['aws', 's3', 'sync', oldb, newb])


def add_to_auth0_client(new):
    # first get the url of the newly created beanstalk environment
    eb = boto3.client('elasticbeanstalk')
    env = eb.describe_environments(EnvironmentNames=[new])
    url = None
    print("waiting for beanstalk to be up, this make take some time...")
    while url is None:
        url = env['Environments'][0].get('CNAME')
        if url is None:
            print(".")
            sleep(10)
    auth0_client_update(url)

    # TODO: need to also update ES permissions policy with ip addresses of elasticbeanstalk
    # or configure application to use AWS IAM stuff


def auth0_client_update(url):
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
    callbacks.append("http://" + url)
    client_data = {'callbacks': callbacks}

    update_res = requests.patch(client_url, data=json.dumps(client_data), headers=headers)
    print(update_res.json().get('callbacks'))


def add_es(new):
    es = boto3.client('es')
    resp = es.create_elasticsearch_domain(
        DomainName=new,
        ElasticsearchVersion='5.3',
        ElasticsearchClusterConfig={
            'InstanceType': 'm3.large.elasticsearch',
            'InstanceCount': 3,
            'DedicatedMasterEnabled': False,
        },
        AccessPolicies=json.dumps({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "*"
                    },
                    "Action": [
                        "es:*"
                    ],
                    "Condition": {
                        "IpAddress": {
                            "aws:SourceIp": [
                                "0.0.0.0/0",
                                "134.174.140.197/32",
                                "134.174.140.208/32",
                                "172.31.16.84/32"
                            ]
                        }
                    },
                }
            ]
        })
    )
    print(resp)
    return resp['DomainStatus']['ARN']


def get_es_build_status(new):
    # get the status of this bad boy
    es = boto3.client('es')
    endpoint = None
    while endpoint is None:
        describe_resp = es.describe_elasticsearch_domain(DomainName=new)
        endpoint = describe_resp['DomainStatus'].get('Endpoint')
        if endpoint is None:
            print(".")
            sleep(10)

    print(endpoint)

    # aws uses port 80 for es connection, lets be specific
    return endpoint + ":80"


def eb_deploy(new):
    subprocess.check_call(['eb', 'deploy', new])


def main():
    parser = argparse.ArgumentParser(
        description="Clone a beanstalk env into a new one",
        )
    parser.add_argument('--old')
    parser.add_argument('--new')
    parser.add_argument('--prod', action='store_true', default=False, help='load prod data on new env?')
    parser.add_argument('--deploy_current', action='store_true', help='deploy current branch')
    parser.add_argument('--skips3', action='store_true', default=False,
                        help='skip copying files from s3')

    parser.add_argument('--onlys3', action='store_true', default=False,
                        help='skip copying files from s3')

    args = parser.parse_args()
    if args.onlys3:
        print("### only copy contents of s3")
        copy_s3_buckets(args.new, args.old)
        return

    print("### start build ES service")
    add_es(args.new)
    print("### create the s3 buckets")
    create_s3_buckets(args.new)
    print("### copy database")
    db_endpoint = snapshot_db(args.old, args.new)
    print("### waiting for ES service")
    es_endpoint = get_es_build_status(args.new)
    print("### clone elasticbeanstalk envrionment")
    # TODO, can we pass in github commit id here?
    clone_bs_env(args.old, args.new, args.prod, db_endpoint, es_endpoint)
    print("### allow auth-0 requests")
    add_to_auth0_client(args.new)
    if not args.skips3:
        print("### copy contents of s3")
        copy_s3_buckets(args.new, args.old)
    if args.deploy_current:
        print("### deploying local code to new eb environment")
        eb_deploy(args.new)

    print("all set, it may take some time for the beanstalk env to finish starting up")


if __name__ == "__main__":
    main()
