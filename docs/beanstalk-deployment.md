TODO: document beanstalk deployment

## Beanstalk deployment through travis

Currently Travis is set to deploy to beansalk on succesful build.

* Branch 'master' will deploy to the 4dn-web-dev environment (if all test pass)
* Branch 'prodution' will deploy to the 4dn-prod environment (if all tests pass)

So to push something to production it should go through the following steps.

1.  Pull request is created for feature branch.
2.  Pull request accepted and merged to master.
3.  Travis will pick this up run tests and deploy to 4dn-web-dev
4.  If that is all succcesful to deploy to production do.
5.  git checkout production
6.  git merge master
7.  edit deploy_beanstalk.py and change version number on line 10 to be next version.
8.  Check in your changes.
9.  git push origin production
10.  Travis will then run tests and if pass will deploy to production

## Dropping database

For test environment the database is not dropped for each deploy.  This means that new upserts,
which change existing data will in most cases not execute succesfully on the test environment.

When that happens we need to drop the database and recreate it, so the inserts can be run.

Easiest way to do that is to ssh into the beanstalk instance and do the follow:

** Note ** to ssh in first `pip install awsebcli` then follow the setup instructions.  With that installed you can simply type eb ssh (ensuring that the master branch is checked out). (If this doesn't work, try `eb init` before `eb ssh`)

Once conneted do the following:

```bash
source /opt/python/current/env
sudo service httpd stop
echo $RDS_PASSWORD

dropdb -p $RDS_PORT -h $RDS_HOSTNAME -U $RDS_USERNAME -e $RDS_DB_NAME

createdb -p $RDS_PORT -h $RDS_HOSTNAME -U $RDS_USERNAME -e $RDS_DB_NAME

sudo shutdown -r now
```

** Note ** this will temporarily bring the site down, for a couple of minutes

## Database backup / restore

Database snapshots are automatically taken every day.  To restore a backup on production (4dnweb-prod)
1. Go to the RDS tab and then look at the snapshots page.
2. Select the backup you want to restore.
3. Click Restore Snapshot
4. You will be prompted for a DB Instance Name, name it what you like.
5. Go to 4dnweb-prod environment and select configuration -> software configuration
6. Change the enviornment variable bnSTaLk_HOSTNAME to the name you just used for the new database.
7. Redeploy the applicaition production.
