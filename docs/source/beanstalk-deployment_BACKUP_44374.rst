
TODO: document beanstalk deployment

Dropping database
-----------------

For test environment the database is not dropped for each deploy.  This means that new upserts,
which change existing data will in most cases not execute succesfully on the test environment.

When that happens we need to drop the database and recreate it, so the inserts can be run.

Easiest way to do that is to ssh into the beanstalk instance and do the follow:

** Note ** to ssh in first ``pip install awsebcli`` then follow the setup instructions.  With that installed you can simply type eb ssh (ensuring that the master branch is checked out).

Once conneted do the following:

```bash
source /opt/python/current/env
sudo services httpd stop
echo $RDS_PASSWORD

..

   ..

      ..

         ..

            ..

               ..

                  ..

                     > e657b55... forcing build
                     dropdb -p $RDS_PORT -h $RDS_HOSTNAME -U $RDS_USERNAME -e $RDS_DB_NAME

