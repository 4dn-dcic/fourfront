Metadata Inserts
============

[This directory](.) contains subdirectories for each of the different inserts folders we used for Fourfront. Each folder contains a number of json files which are named by the type of item they contain -- for example, file_fastq.json contains a list of individual json objects that represent FileFastq items.

The outline of what each insert subdirectory contains and where is it used used is contained below.

It may also be helpful to read [the documentation](../../../../docs/inserts.md) on loading inserts.

### Summary of the inserts

- **inserts** are loaded for local, mastertest
- **master-inserts** are loaded everywhere, but not by default on staging/data
- **temp-local-inserts** are exclusively loaded for local (or with `load_local_data` load function) if data exists in the directory. This directory is ignored by git
- **perf-testing** used with `pytest -m performance` tests. Currently not working
- **workbook-inserts** used in a number of tests, including those leveraging ES

### Updating inserts from the server

You can use the `bin/update-inserts-from-server` command to update contents of any inserts directory using data from any Fourfront server. This can be used to keep important `master-inserts` up-to-date or pull in data to test locally, likely with the `inserts` or `temp-local-inserts` directory. Here are the arguments for the command:
- **--env <FF>** environment name of Fourfront server to load from, such as `data` or `fourfront-webdev`. Default: `data`
- **--dest <dir>**  inserts directory to write to. Default: `temp-local-inserts`
- **--item-type <type>** item types to update. Corresponds to the name of the file in the inserts folder. Optional
- **--ignore-field <field>** field to skip when updating items. Optional
- **--from-search <query>** string query that is passed to `dcicutils.ff_utils.search_metdata` to find uuids to add to the target inserts directory

There a few important to keep in mind when updating inserts:
- Adding and committing items to `master-inserts` should be done with care, since they are loaded on all environments.
- If targeting `inserts` directory, the update will fail if any items already exist in `master-inserts` and differ in value. Any existing items in `master-inserts` that are up-to-date with the update will not be written to `inserts` to prevent duplication.
- For local testing, it is best to use `temp-local-inserts`, which is a directory ignored by Git.
- The easiest way to add new inserts is to add `{"uuid": <uuid on server>}` to the item type JSON file in the desired inserts directory. This will then get replaced with the full data for the inserts when running the command.
- If you want your local updates to inserts to persist, you MUST commit them and merge into the master Fourfront.

### inserts

These files contain test items that are intended to create a development environment with some minimal amount of data. These are loaded with `load_local_data` or `load_test_data` load functions, meaning these inserts are generally used if:
- Running locally and there are NO inserts in `temp-local-inserts`
- Running on mastertest

These inserts are kept up-to-date by hand and eventually by using `bin/update-inserts-from-server`. Items should NOT be in both `inserts` and `master-inserts`. These inserts are not used in any tests.

### master-inserts

These files contain a subset of items that are minimally linked and are crucial to other metadata items or portal function. This includes static pages, labs, and awards, among other items. These inserts are **always** loaded, with the exception of fourfront-webprod and fourfront-webprod2. To load them on these environments, you must provide the `--prod` flag to `bin/load-data`. This is to prevent accidental loading of inserts that may be malformed into the production database. To do this, run the following command directly on the server:

```
bin/load-data production.ini --app-name app --prod
```

Certain item types from these inserts are loaded in a couple tests within `test_loadxl.py`, so try not too add an excessive number of items to them.

### temp-local-inserts

Only loaded locally (or if the load function is set to `load_local_data`). This is a special directory that is meant to be used as an "override" option for the test inserts by adding json inserts to the directory. When `temp-local-inserts` are loaded, neither `inserts` or `master-inserts` will be loaded to provide isolation of inserts.

If there is nothing in this directory, then the `inserts` and `master-inserts` will be used regularly with `load_local_data`.

This directory is ignored by git; inserts that you want to permanently add for use on local/mastertests should be added the `inserts` directory instead.

### perf-testing

Minimal set of inserts used with performance tests that are run with `pytest -m "performance"`. Never loaded into Fourfront environments.

### workbook-inserts

Pared-down set of inserts used with a number of tests, namely those that leverage Elasticsearch to test indexing and searching. They are loaded by tests that use the workbook feature:

```
from .workbook_fixtures import workbook
```

Never loaded into fourfront environments.
