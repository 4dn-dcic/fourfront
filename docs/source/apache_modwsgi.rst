Apache and ModWSGI Setup
===========================

This document gives a basic overview of the Apache/WSGI setup used in conjunction with AWS Elastic Beanstalk (EB) to configure our web server. Please note that there are many oddities with EB that require some of the workarounds covered below.

Overview
----------------
All code referenced here is contained in `.ebextensions directory <https://github.com/4dn-dcic/fourfront/tree/master/.ebextensions>`_. For information on EB deployment, see `this document <https://github.com/4dn-dcic/fourfront/tree/master/docs/source/beanstalk_deployment.rst>`_.

Useful documentation is the `Apache directives <https://httpd.apache.org/docs/2.4/mod/directives.html>`_ and `WSGIDaemonProcess config <https://modwsgi.readthedocs.io/en/develop/configuration-directives/WSGIDaemonProcess.html>`_, the latter of which is what we use modWSGI for.

Original Setup
----------------
Previously, ``05_set_wsgi.config`` included a `platform hook <https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/custom-platform-hooks.html>`_ that would run a Python script to edit ``/etc/httpd/wsgi.conf.d`` to add an Apache directive to include all files matching ```/etc/httpd/wsgi.conf.d/*.conf`` in the Apache configuration. The deployment then created two files, ``/etc/httpd/wsgi.conf.d/extra_config.conf`` (created by a hook) and ``/etc/httpd/conf.d/encoded-apache.conf`` (copied from ``.ebextensions`` in during app deployment). These files contained all custom Apache and WSGI settings.

However, this approach is quite complex and leveraged an old version of modWSGI that didn't have some configuration options that we wanted. The new system is described below.

Apache
----------------
The main Apache directives are now set in ``01_apache.config``, which creates ``/etc/httpd/conf.modules.d/00-mpm.conf`` on EB deployment. Currently, we use the default ``mpm_prefork_module``, which is not the best MPM for use with modWSGI. The Event or Worker MPMs are likely better, as `described here <https://modwsgi.readthedocs.io/en/develop/user-guides/processes-and-threading.html#the-unix-worker-mpm>`_, but using them did not properly shutdown running WSGI process upon Apache restarting. This is an issue that was run into before when using EB; `see here <https://groups.google.com/d/msg/modwsgi/NtjQzbKhOrA/G43n5bOBFAAJ>`_ for more. If you do want to load the Event MPM module, it is located at ``/etc/httpd/modules/mod_mpm_event.so``. Additionally, there are some inline comments explaining the values used for the Apache directives.

Various Apache settings, such as ``LogLevel`` are also set inside ``05_set_wsgi.config``. This file is explained in detail in the **ModWSGI** section below. Most of the values there are holdovers from the old ``encoded-apache.conf``.

As a useful tip, you can add the following to the Apache config on the live server::

    LoadModule info_module modules/mod_info.so
    <Location "/server-info">
        SetHandler server-info
    </Location>

After restarting Apache, you will lots of helpful Apache information on the ``/server-info`` endpoint. As a note, you can restart Apache on the live EB using ``sudo service httpd restart`` or ``sudo service httpd graceful`` (graceful attempts to serve existing requests before restarting).

ModWSGI
----------------
At the time of writing this, the version of modWSGI used by EB is ancient. As such, ``04_upgrade_mod_wsgi.config`` is used to write an execute a temporary script that downloads and installs modWSGI 4.6.5. **IMPORTANT:** configure modWSGI to run with the same Python that is running the web application. That is currently ``/opt/python/run/venv/bin/python3.4``.

The entire modWSGI configuration is set in ``05_set_wsgi.config``. This file writes a Python script that is run on pre-hooks for application and configuration deployments in EB. This technique was adopted `from a post on the AWS forum <https://forums.aws.amazon.com/thread.jspa?threadID=163369>`_ by ``spatula75``. The script overrides the default EB modWSGI config file, which is currently located at ``/etc/httpd/conf.d/wsgi.conf``. The contents of the script contain a lot of legacy code and comments which were not changed; some of the more important details are highlighted below:

* **wsgi:** a multi-process, multi-threaded ``WSGIDaemonProcess`` used to run the indexer listener. Read more about options `here <https://modwsgi.readthedocs.io/en/develop/configuration-directives/WSGIDaemonProcess.html>`_.
* **encoded-indexer:** a single-process, single-threaded ``WSGIDaemonProcess`` used to run the indexer listener.
* **WSGIRestrictEmbedded:** set to "On" since we want to run in Daemon mode.
* **WSGIPassAuthorization:** set to "On" since the WSGI Application, not Apache, handles authorization.
* **LogLevel:** set to "Info". This is an Apache setting, which can show useful output in ``/var/log/httpd/error_log``. Remove or adjust to reduce verbosity.


Future Improvements
----------------
Using Apache + ModWSGI with EB has proven to be quite messy. It might be best to replace it entirely with Nginx and a WSGI server like `waitress <https://docs.pylonsproject.org/projects/waitress/en/stable/>`_, which is the stack used for local deployments.
