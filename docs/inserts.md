Loading Inserts
===============

Fourfront has a set of json insert files that are used to load data in various environments. These are loaded using `bin/load-data`, which calls the functions defined in src/encoded/loadxl.py.

The behavior of load-data depends on the current Fourfront environment and the `snovault.load_test_data` setting in the used .ini file. This documentation goes into some detail on those options; to read about which inserts are used, see [this documentation](../src/encoded/tests/data/README.md).

### bin/load-data

Main command for loading insert data. Example usage is:

```
bin/load-data production.ini --app-name app
```

The arguments are as follows:
- **config_uri**: required. Path to the .ini configuration file
- **--app-name**: Pyramid app name in configfile, usually "app"
- **--access-key**: if "s3" (default), will create and upload a new admin access key to s3. Otherwise, if "local", will build a local `keypairs.json` file and add the key to that
- **--drop-db-on-mt**: if True and the Fourfront environment is "fourfront-mastertest", will drop the DB before loading inserts for a fresh test DB
- **--prod**: boolean flag that must be used to run load inserts on either "fourfront-webprod" or "fourfront-webprod2" environments

### App configuration

The load function used is defined under `snovault.load_test_data` in the .ini configuration file. For local usage, this is `development.ini` and the default load function used is `encoded.loadxl:load_local_data`. For production environments, the value of this setting should be set as the `LOAD_FUNCTION` environment variable. This will probably be either `load_prod_data` for staging/data environments or `load_test_data` for test environments. Again, these configuration values correspond to the functions used in [loadxl.py](../src/encoded/loadxl.py).
