============================
Elastic Beanstalk Deployment
============================

This document gives a brief overview of our deployment setup using `AWS Elastic Beanstalk <https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html>`_ (EB). **It is a work in progress!**

Overview
--------
All code referenced here is contained in `.ebextensions directory <https://github.com/4dn-dcic/fourfront/tree/master/.ebextensions>`_.  The config files within that directory are executed in alphanumeric order. The ordering is important!

Container Commands
------------------
The main deployment is contained within the ``container_commands`` section of `20_packages.config <https://github.com/4dn-dcic/fourfront/blob/master/.ebextensions/20_packages.config>`_. As with the config scripts, the container commands are executed in alphanumeric order. These commands run as ``root``.

Deployment with Travis
----------------------
If you set the ``tibanna_deploy`` environment variable (outdated name), then Travis will attempt to deploy current branch, which is equal to ``TRAVIS_BRANCH`` in the environment (set by Travis). This is done using the `deploy_beanstalk <https://github.com/4dn-dcic/fourfront/blob/master/deploy/deploy_beanstalk.py>`_ script. Torb currently does this to deploy to staging as part of our blue-green deployment. See ``kick_travis`` in Torb `utils.py <https://github.com/4dn-dcic/torb/blob/master/torb/utils.py>`_.

Other EB Config Notes
---------------------
Some minimal EB Python settings can be set under the ``aws:elasticbeanstalk:container:python`` section of ``option_settings`` in ``20_packages.config``. This are actually no longer used with our Apache/modWSGI configuration technique. For details on that process, `go here <https://github.com/4dn-dcic/fourfront/tree/master/docs/source/apache_modwsgi.rst>`_.

We created ``09_cloudwatch.config`` to set some Cloudwatch settings and create a CRON to monitor memory usage on the EC2s used within the environment. `This document <https://aws.amazon.com/premiumsupport/knowledge-center/elastic-beanstalk-memory-monitoring/>`_ describes the config; `this one <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/mon-scripts.html>`_ has more info on monitoring memory on EC2s.

The default ``logrotate`` configuration on EB caused an hourly hard restart of Apache, which interrupted with long-running requests. We use ``11_logs.config`` to overwrite that configuration. The new setup uses ``copytruncate`` mode so that a restart is not required.

At one point, an NPM error related to permissions started occuring in ``20_packages.config``. This is most likely due to the container commands running as ``root``. As a temporary fix, ``ignoreErrors: true`` is used with the ``06_buildout`` command, allowing the deployment to continue after the NPM build fails. To fix this, ``13_run_npm.config`` is used to create a post-deployment hook that runs ``npm install`` and ``npm build`` with the correct permissions. **This is messy and should be fixed**.

Previously, a CRON job defined in ``12_daily_restart.config`` triggered a daily graceful Apache restart to address a slow memory creep of the ``wsgi`` processes. However, this is no longer needed after upgrading the modWSGI version since the ``maximum-requests`` and ``graceful-timeout`` options are available for ``WSGIDaemonProcess`` with the newer version.


