Database Documentation
======================

The (encodeD) system uses a Postgres implementation of a document store of a _JSON-LD_ object hierarchy.   Multiple view of each document are indexed in _Elasticsearch_ for speed and efficient faceting and filtering.  The JSON-LD object tree can be exported from Elasticsearch with a query, converted to _RDF_ and loaded into a _SPARQL_ store for arbitrary queries.

## PostgreSQL RDB

When an object is POSTed to a collection, and has passed schema validation, it is inserted into the Postgres object store, defined in _storage.py_.   

There are 7 tables in the RDB.  Of these, Resource_ represents a single URI.  Most Resources (otherwise known as Items or simpley "objects" are represented by a single _PropSheet_, but the facility exists for multiple PropSheets per Resource (this is used for attachments and files, in which the actual data is stored as BLOBS instead of JSON).  

The Key_ and Link_ tables are indexes used for performance optimziation.  Keys are to find specific unique aliases of Resources (so that all objects have identifiers other than the UUID primary key), while Links are used to track all the JSON-LD relationships between objects (Resources).  Specifically, the Link table is accessed when an Item is updated, to trigger reindexing of all Items that imbed the updated Item.

The _CurrentPropSheet_ and _TransactionRecord_ tables are used to track all changes made to objects via transactions.

## A Local Server

The `bin/dev-servers` command completely drops and restarts a local copy of postgres db. Posts all the objects in tests/data/inserts (plus /tests/data/documents as attachments). Then indexes them all in local elastic search.
but these dbs are both destroyed when you kill the dev-servers process
