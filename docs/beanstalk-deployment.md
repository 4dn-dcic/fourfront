# Beanstalk Deployment

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
which change existing data will in most cases not execute succesfully on the test environment (Unit upgrades are put back in place).

When that happens we need to drop the database and recreate it, so the inserts can be run.

### The Old hard way to do it.. boooo :(
Easiest way to do that is to ssh into the beanstalk instance and do the follow:

** Note ** to ssh in first `pip install awsebcli` then follow the setup instructions.  With that installed you can simply type eb ssh (ensuring that the master branch is checked out). (If this doesn't work, try `eb init` before `eb ssh`)

Once conneted do the following:

```bash
source /opt/python/current/env
sudo service httpd stop
echo $RDS_PASSWORD

dropdb -p $RDS_PORT -h $RDS_HOSTNAME -U $RDS_USERNAME -e $RDS_DB_NAME

createdb -p $RDS_PORT -h $RDS_HOSTNAME -U $RDS_USERNAME -e $RDS_DB_NAME


# drop indexes in elastic search
curl -XDELETE 'http://172.31.49.128:9872/annotations'

# for 4dn-web-dev (Development Environment)
curl -XDELETE 'http://172.31.49.128:9872/snovault'

# for production (PLEASE DONT SCREW THIS UP :) )
curl -XDELETE 'http://172.31.49.128:9872/ffprod'

sudo shutdown -r now

# this will drop you back to your local machine, if you want to trigger latest build from master (and you know it's a clean build)

git checkout master
eb deploy
```

### The New awesome way to do it:

```
sudo /opt/python/current/app/bin/dropdb

# to bring things up again from back home
git checkout production 
eb deploy

```

Bye bye data. Use at your own risk, all warranties void.
![genghi](https://67.media.tumblr.com/6d863550ff51d672f8c3125344119f20/tumblr_oc5gn5Jvtt1qkjik5o1_540.gif)

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


## Rebuilding beanstalk environemtns

Any attempt to delete one of the beanstalk environment will most likely fail due to an inability to delete a secuirty group.  This is because our RDS security group sets inbound rules for the beanstalk enviroments.  So before you rebuild a beanstalk environment do the following:

1.  Go to EC2's (aws console)
2.  Select Security Groups
3.  Search for sg-ab1d63d1  (this is our RDS security group)
4.  Select inboud rules.
5.  Find the inboud rule associated with the beanstalk environment security group (probably sg-something)
6.  Remove that inboud rule.
7.  Rebuild the envrionemnt.
8.  You will need to add a new inbound rule to the RDS security group with the security group of the rebuilt Abeanstalk environment before deployment will be successful.
9.  Security group id for beanstalk environment can be found under configuration -> Instances -> EC2 security Groups.
