## Overview

The 4DN-DCIC metadata database can be accessed using a Hypertext-Transfer-Protocol-(HTTP)-based, Representational-state-transfer (RESTful) application programming interface (API) - aka the REST API.  In fact, this API is used by the ```import_data``` script used to submit metadata entered into excel spreadsheets as described [on this page](./excel_submission.md). This API was developed by the [ENCODE][encode] project so if you have experience retrieving data from or submitting data to ENCODE use of the 4DN-DCIC API should be familiar to you.   The REST API can be used both for data submission and data retrieval, typically using scripts written in your language of choice.  Data objects exchanged with the server conform to the standard JavaScript Object Notation (JSON) format.  Libraries written for use with your chosen language are typically used for the network connection, data transfer, and parsing of data  (for example, requests and json, respectively for Python).  For a good introduction to scripting data retrieval (using GET requests) you can refer to [this page](https://www.encodeproject.org/help/rest-api/) on the [ENCODE][encode] web site that also has a good introduction to viewing and understanding JSON formatted data.

[encode]: https://www.encodeproject.org/

## Connecting to the server
Your script will need to use an access key and secret that you can obtain by following [these instructions](./excel_submission.md#access) to connect with either the test or production server.  Exactly how you format and pass the connection information to the server depends on your scripting language and the libraries that you use with it.

**Base URLs for submitting and fetching data are:**
*Test Server:* <https://testportal.4dnucleome.org/>
*Production Server:* <https://data.4dnucleome.org/>

You can refer to the ```FDN_key``` and ```FDN_connection``` classes in [the ```fdnDCIC.py``` library](https://github.com/4dn-dcic/Submit4DN/blob/master/wranglertools/fdnDCIC.py) in Submit4DN for an example of how to generate the necessary information that will be passed to the server with each request.

## Identifying specific items
Your script will need to add a uniquely identifying token to the Base URL in order to GET, POST or PATCH metadata for that item. IDs that can be used include: uuids, accessions, certain type specific identifiers and aliases.  See the sections on ['Using Aliases' and 'Referencing existing items'](./excel_submission.md#using-aliases) for the types of identifiers that can be used in your requests.

## Ordering of POST requests
Because in many cases fields in one Item may refer to another Item eg. the ```biosample``` field in the ```experiment_hi_c``` schema it is necessary to POST the referenced item prior to POSTing the item that refers to it.  A sensible POSTing order is specified in the ```sheet_order``` array located around line 144 in the [```fdnDCIC.py```](https://github.com/4dn-dcic/Submit4DN/blob/master/wranglertools/fdnDCIC.py) library.

## JSON formatting
The most important component of your submission is the proper formatting of the data into json so it will map correctly onto the 4DN metadata schemas.  The details of the schemas for all object types in the database can be viewed at <https://data.4dnucleome.org/profiles/>.  Individual schemas can be viewed and/or retrieved via GET by appending the schema file name to the above URL (eg. for the Hi-C experiment schema <https://data.4dnucleome.org/profiles/experiment_hi_c.json>). For a listing of all schema files and associated resource names see [this table](schema_info.md), which is up to date with the current schemas in the database.

Depending on the Item type that you are submitting there may be fields that require values (eg. *experiment_type* for experiments), fields for which values should never be submitted (eg. ‘date_created’ as this is an automatically generated value) and fields with specific formatting and fields that accept values of specific types.  In many cases the values must be selected from a list of constrained choices.  The documentation on field values [described in detail above](#values) and the annotated json document below can be used as a guide on formatting your json.  In addition, the unordered and unfiltered excel workbooks produced by ```get_field_info``` can be a useful reference for determining exactly what fields are associated with what object types.  The processed workbook that is actually used for data submission does not reflect the exact schema structure **should not** be used as a direct reference for API submission.


**JSON for an ExperimentHiC POST request**

```
{
    "lab": "4dn-dcic-lab",
    "award": "/awards/OD008540-01/",
    "aliases": ["dcic:myalias"]
    "experiment_type": "in situ Hi-C",
    "biosample":"4DNBS1NUPXMH",
    "biosample_quantity": 2000000,
    "biosample_quantity_units": "cells",
    "dbxrefs": ["SRA:SRX764985", "GEO:GSM1551599"],
    "description": "A useful description of this experiment",
    "documents": ["dcf15d5e-40aa-43bc-b81c-32c70c9afb01"],
    "experiment_relation":[{"relationship_type":"controlled by","experiment":"4DNEX067APU1"}],
    "experiment_sets":["431106bc-8535-4448-903e-854af460b260"],
    "files": ["4DNFI067APU1", "4DNFI067APU2", "4DNFI067APA1"],
    "filesets": ["4d6ecff9-7c67-4096-bca8-515246767feb"],
    "follows_sop": "Yes",
    "crosslinking_method": "1% Formaldehyde",
    "crosslinking_time": 30,
    "crosslinking_temperature": 37,
    "digestion_enzyme": "MboI",
    "enzyme_lot_number": "123456",
    "digestion_temperature": 37,
    "digestion_time": 30,
    "ligation_time": 30,
    "ligation_temperature": 37,
    "ligation_volume": 1,
    "tagging_method": "Biotinylated ATP",
    "fragmentation_method": "chemical",
    "average_fragment_size": 100,
    "notes": "sample dcic notes",
    "protocol": "131106bc-8535-4448-903e-854af460b244"
}
```

**Field specification - how to find out what fields need what format, when to provide values and other useful tips**

The three fields below are common to every Item - you don't always need to include aliases but they will make some things a lot easier.

```
    "lab": "4dn-dcic-lab",  # required for POST with value of an existing lab identifier - this is an alias
    "award": "/awards/OD008540-01/", # required for POST with value of an existing award identifier - this a specific item type identifier
    "aliases": ["dcic:myalias", "dcic:myotheralias"], # POST or PATCH an array with values that can be used as identifiers
```
Accession and uuid are automatically assigned during initial posting so can only be used as identifiers to PATCH existing Items - not for POSTing.  Note that all item types have a uuid but not all items have accessions.

```
    "accession":"4DNEX067APU1", # PATCH ONLY can be used as an identifier - automatically assigned on POST
    "uuid": "75041e2f-3e43-4388-8bbb-e861f209c444", # PATCH ONLY can be used as an identifier - automatically assigned on POST
```
While we encourage you to submit as many fields as possible there are some fields that are absolutely required to post an item.  These required fields are identified in the "required" field of the schema.

```
    "required": [
        "experiment_type",
        "award",
        "lab",
        "biosample"
    ],
```
If they are left out of a POST request will cause an error.  You don't need to include required fields if you are PATCHing an existing Item.

```
    "experiment_type": "in situ Hi-C", # required for POST string field
    "biosample":"231111bc-8535-4448-903e-854af460b254", # required for POST with value of an alias used in Biosample sheet or previously existing biosample identifier
```
There are number fields and string fields - the field type can be found by referring to the schema directly or the workbook templates produced by ```get_field_info```.

```
   "biosample_quantity_units": {
        "title": "Quantity Units",
        "description": "The units that go along with the biological sample quantity",
        "enum": [
            "g",
            "mg",
            "μg",
            "ml",
            "cells"
        ],
        "type": "string"
    },
    "biosample_quantity": {
        "title": "Biological Sample Quantity",
        "description": "The amount of starting Biological sample going into the experiment",
        "type": "number"
    },
```

Some of the fields will only accept values from a constrained set of choices.  These are indicated by 'enum' lists in the schemas (see above) or the 'Choices' list in the Excel workbooks.  Some fields also have dependencies in that if one field has a value then another field must also have a value.  Dependencies are specified in the schema.

```
    "dependencies": {
      "biosample_quantity": ["biosample_quantity_units"],
      "biosample_quantity_units": ["biosample_quantity"]
    },
```

```
    "biosample_quantity": 2000000, # number field
    "biosample_quantity_units": "cells", # string field - possible values from enum list
```
Some fields accept an array of string values.

```
    "dbxrefs": {
        "description": "Unique identifiers from external resources.",
        "type": "array",
        "items": {
            "title": "External identifier",
            "type": "string",
        }
```
 and must be enclosed in square braces [].  The braces are required even if only a single value is being submitted for that field.  The strings may be literal values for the fields or references to other objects, for example by UUID as in the "documents" field below and the acceptable value type can be determined by looking at the "items" stanza of the field.

```
    "dbxrefs": ["SRA:SRX764985", "GEO:GSM1551599"], # string - array with values of specific format db_prefix:accession
    "documents": ["dcf15d5e-40aa-43bc-b81c-32c70c9afb01"], # uuid to existing document as identifer
```

Some fields contain lists of sub fields that remain linked - effectively lists of embedded objects.

```
"experiment_relation": {
    "title": "Experiment relations",
    "description": "All related experiments",
    "type": "array",
    "items": {
        "title": "Experiment relation",
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "relationship_type": {
                "type": "string",
                "description": "A controlled term specifying the relationship between experiments.",
                "title": "Relationship Type",
                "enum": [
                    "controlled by",
                    "control for",
                    "derived from",
                    "source for"
                ]
            },
            "experiment": {
                "type": "string",
                "description": "The related experiment",
                "linkTo": "Experiment"
            }
        }
    }
}
```
The embedded objects are enclosed in curly braces {} and as usual objects in the list are comma separated and enclosed in square brackets [].

```
    "experiment_relation":[{"relationship_type":"controlled by","experiment":"4DNEX067APU1"}, {"relationship_type":"derived from","experiment":"4DNEX067APV1"}], # array of embedded objects - one experiment_relation object with 2 linked fields
```

When a field references another object the value you provide can be any identifier for that object eg. uuid, accession or type specific identifiers.  If you are not sure if a field is referencing another object look for the 'linkTo' tag in the field specification in the schema.

```
    "protocol": {
        "title": "Reference Protocol",
        "description": "Reference Protocol Document.",
        "type": "string",
        "linkTo": "Protocol"
    },
```

The identifiers that you can use can be found in the "identifyingProperties" field of the schema of that Item type.

*Protocol identifyingProperties*
```
"identifyingProperties": ["uuid", "aliases"],
```

*protocol field in experiment_hi_c submission*
```
"protocol": "131106bc-8535-4448-903e-854af460b244"
```

Finally there are some fields that cannot or should not be submitted.  Many of these are marked with ```"permission": "import-items"``` and ```"readonly":true```.

```
"accession": {
    "type": "string",
    ...
    "comment": "Only admins are allowed to set or update this value.",
    "readonly": true,
    "permission": "import_items"
},
```

Others are marked as calculated properties that are derived from other existing information.

```
"experiment_summary": {
    "type": "string",
    "calculatedProperty": true,
    ...
},
```
 Trying to submit protected or calculated fields will result in an error.
