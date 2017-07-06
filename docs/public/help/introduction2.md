In our database, the objects are stored in the [JavaScript Object Notation format](http://www.json.org/).
The schemas for the different object types are described in [JSON-LD format](http://json-ld.org/)
and can be found [here](https://github.com/hms-dbmi/fourfront/tree/master/src/encoded/schemas).
A documentation of the metadata schema is also available as a google doc
[here](https://docs.google.com/document/d/15tuYHENH_xOvtlvToFJZMzm5BgYFjjKJ0-vSP7ODOG0/edit?usp=sharing).

## Data Submission via Spreadsheet

We provide data submission forms as excel workbooks that are flattened versions of the metadata schemas, but only
containing fields that actually can and should be submitted.
We also provide software tools that handle the interaction with our REST API to generate these forms and push the
content of the forms to our database.
Documentation of the data submission process using these forms can be found
[here](help/spreadsheet).

## REST API

For both meta/data submission and retrival, you can also access our database directly via the REST-API.
Data objects exchanged with the server conform to the standard JavaScript Object Notation (JSON) format.
Our implementation is analagous to the one developed
by the [ENCODE DCC](https://www.encodeproject.org/help/rest-api/).
If you would like to directly interact with the REST API for data submission see the documentation [here](help/rest-api).
