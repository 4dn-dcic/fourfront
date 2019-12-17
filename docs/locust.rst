Load Testing with Locust
========================

Locust is a load testing tool that can easily be provisioned to run against any of our environments. There are two required files - ``config.json`` and ``<env>.json`` where <env> is the environment you'd like to run load testing on.

Supported Environments
^^^^^^^^^^^^^^^^^^^^^^

- Data 
- Staging
- Mastertest
- Hotseat

Config.json
^^^^^^^^^^^

To configure the load testing you must write the file ``config.json``. A basic one is provided as a default and updates are gitignore'd (so if a change is needed you will have to force it). There are two important fields - ``routes`` and ``envs``. ``envs`` specifies a mapping from environment name to the associated URL. This should never really change unless our URL's do. You could also add new environments here, but a seperate key file is necessary. The second field is ``routes``. This is where you specify what routes you'd like Locust to hit. Locust will hit all routes specified approximately evenly. This behavior can be changed by explicitly specifying your routes in ``ff_locust.py``.

<env>.json
^^^^^^^^^^

In this file you will need to add your access keys for the environment you'd like to test. By default we will try to locate your credentials in <env>.json. If we do not locate them the program will exit. Provide the field 'username' with your access key ID and 'password' with the secret. You can generate new access keys from your use page when accessing the relevant portal. These keys will be different across environments, hence the need to provide a separate ``<env>.json`` file per environment you'd like to test

Command Line Arguments
^^^^^^^^^^^^^^^^^^^^^^

usage: main.py [-h] [--time TIME] [--clients CLIENTS] [--rate RATE]
               [--lower LOWER] [--upper UPPER]
               config key

Locust Load Testing

positional arguments:
  config             path to config.json
  key                path to  <env>.json

optional arguments:
  -h, --help         show this help message and exit
  --time TIME        time to run test for, default 1m. Format: 10s, 5m, 1h,
                     1h30m etc.
  --clients CLIENTS  number of clients, default 10
  --rate RATE        number of clients to hatch per second, default 10
  --lower LOWER      lower bound on time to wait between requests, default 1
  --upper UPPER      upper bound on time to wait between requests, default 2