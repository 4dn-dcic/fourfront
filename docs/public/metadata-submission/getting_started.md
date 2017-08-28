## Overview

In order to make your data accessible, searchable and assessable you should submit as much metadata as possible to the 4DN system along with the raw files you have generated in your experiments. 

These pages are designed to

* show you how to find out what kind of metadata we collect for your particular type of experiment
*  the mechanisms by which you can submit your metadata and data to the 4DN system.

For an overview of the metadata structure and relationships between different items please see [the slides](/help#metadata-structure) available on the [introductory page](/help).

We have three primary ways that you can submit data to the 4DN data portal.

### Web Submission

The online web submission forms are best used

* To submit one or a few experiments.
* To edit one or a few fields of an already submitted but not yet released item.
* As a hands on way to gain familiarity with the 4DN data model. 

Documentation on how to get started with this interface is [here](/help/web-submission).

### Data Submission via Spreadsheet

The excel metadata workbooks

* Are useful for submitting metadata for several experiments or biosamples all at once
* Can be used to make bulk edits of submitted but not yet released metadata
* Contain multiple sheets with each sheet a data submission form that is a flattened version of an object metadata schema
containing only the fields that actually can and should be submitted.
* Can be generated using the Submit4DN software
* Are used as input to the Submit4DN software which validates submissions and pushes the content of the forms to our database.

Documentation of the data submission process using these forms can be found
[here](/help/spreadsheet).

### REST API

For both meta/data submission and retrival, you can also access our database directly via the REST-API.

*  Data objects exchanged with the server conform to the standard JavaScript Object Notation (JSON) format.
* Our implementation is analagous to the one developed
by the [ENCODE DCC](https://www.encodeproject.org/help/rest-api/).

If you would like to directly interact with the REST API for data submission see the documentation [here](/help/rest-api).


## A note on Experiments and Replicate Sets

The 4DN Consortium is strongly encouraging that chromatin conformation capture genomic experiments be performed using at least two different preparations of the same source biomaterial - i.e. bioreplicates.  In terms of submitting metadata you would submit two Experiments that used the same Biosource, but have different Biosamples. In many cases the only difference between Biosamples may be the dates at which the cell culture or tissue was harvested.  The experimental techniques and parameters will be shared by all experiments of the same bioreplicate set.

You may also have multiple sequencing runs performed at different times using a library prepared from the same Biosample and the same methods up until the sample is sent to the sequencer - i.e. technical replicates.

The replicate information is stored and represented as a set of experiments that includes labels indicating the replicate type and replicate number of each experiment in the set.

The mechanism that you use to submit your metadata will dictate the type of item that you will associate replicate information with, though in the database the information will always end up directly associated with ExperimentSetReplicate objects.  Specific details on formatting information regarding replicates is given in the [Spreadsheet Submission](/help/spreadsheet) page.  When submitting using the REST API you should format your json according to the specifications in the schema as described in the [REST API page](/help/rest-api).


## Referencing existing objects

### Using aliases
**Aliases** are a convenient way for you to refer to other items that you are submitting or have submitted in the past.
An **alias** is a lab specific identifier that you can assign to any item and take the form of *lab:id\_string* eg. ```parklab:myalias```. Note that an alias must be unique within all items. Generally it is good practice to assign an alias to any item that you submit and if you use the Online Submission Interface to create new items designating an alias is the first required step.  Once you submit an alias for an Item then that alias can be used as an identifier for that Item in the current submission as well as in any subsequent submission.

You don't need to use an alias if you are referencing an item that already exists in the database.

### Other ways to reference existing items
Every item in our database is assigned a “uuid” upon its creation, e.g. “44d3cdd1-a842-408e-9a60-7afadca11575”. Items from some item types (Files, Experiments, Biosamples, Biosources, Individuals...) also get a shorter “accession” assigned, e.g. 4DNEX4723419. These two are the default identifying terms of any item. In some special cases object specific identifying terms are also available, eg. award number for awards, or lab name for labs.


| Object | Field | Example | Example (simple)|
|---|---|---|---|
| Lab | name | /labs/peter-park-lab/ | peter-park-lab |
| Award | number | /awards/ODO1234567-01/ | ODO1234567-01 |
| User | email | /users/test@test.com/ | test@test.com |
| Vendor | name | /vendors/fermentas/ | fermentas |
| Enzyme | name | /enzymes/HindIII/ | HindIII |
| Construct | name | /constructs/GFP-H1B/ | GFP-H1B


These types of values can be used for referencing items in the excel sheets or when using the REST-API for items that already exist in the 4DN database.


The DCIC has already created all the labs and awards that are part of the 4DN consortium. There will also be other items, for example vendors, enzymes and biosources that will already exist in the database and can be reused in your submissions.  If there is an existing biosource (e.g. accession 4DNSRV3SKQ8M forH1-hESC (Tier 1) ) for the new biosample you are creating, you should reference the existing one instead of creating a new one.

## Getting Added as a 4DN User or Submitter

Before you can view protected lab or project data or submit data to the 4DN system you must be a registered user of the site and have the appropriate access credentials. To view lab data that is still in the review phase you must be registered as a member of the lab that produced the data.  You must be designated as a submitter for the lab for which you want to submit files and metadata.  Most current 4DN lab members should already be registered in our system.

For instructions on creating an account, please see [this page](/help/account-creation).


**A note on metadata and data accessibility.**
 For most metadata items the default permission will be that the data will only be viewable by the members of the submitting lab and will only be editable by users who have been designated as submitters for that lab. The metadata will also be accessible to data wranglers who can help you review the data and alert you to any issues as the submission is ongoing. Once the data and metadata are complete and quality controlled, they will be released according to the data release policy adopted by the 4DN network.


**A note on the test deployment:** We are deploying the 4DN Data Portal at <https://data.4dnucleome.org>. We also have a test portal accessible at <https://testportal.4dnucleome.org>. Data submitted to the test portal may be deleted when server redeployments are necessary; however the forms you prepare can be used for submission to our production portal later.

## Getting Connection Keys for the 4DN-DCIC servers
If you have been designated as a submitter for the project and plan to use either our spreadsheet-based submission system or the REST-API an access key and a secret key are required to establish a connection to the 4DN database and to fetch, upload (post), or change (patch) data. Please follow these steps to get your keys.

1. Log in to the 4DN [website](https://data.4dnucleome.org) with your username (email) and password. If you have not yet created an account, see [this page](/help/account-creation) for instructions.


2. Once logged in, go to your ”Profile” page by clicking **Account** on the upper right side of the page.  In your profile page, click the green “Add Access Key” button, and copy the “access key ID” and “secret access key” values from the pop-up page. _Note that once the pop-up page disappears you will not be able to see the secret access key value._ However, if you forget or lose your secret key you can always delete and add new access keys from your profile page at any time.


3. Once you have your access key information, for use with Submit4DN our spreadsheet submission system, create a file in your home directory named “keypairs.json”. This file will contain your key information in json format and will be read by the Submit4DN scripts to establish a secure connection. The contents of the file must be formatted as shown below - replace key and secret with your new “Access Key ID” and “Secret Access Key”.  You can use the same key and secret to use the 4DN [REST-API](/help/rest-api).

**Sample content for keypairs.json**

```json
{
  "default": {
    "key": "ABCDEFG",
    "secret": "abcdefabcd1ab",
    "server": "https://data.4dnucleome.org/"
  }
}
```

**Tip:** If you don’t want to use that filename or keep the file in your home directory you can use the --keyfile parameter as an argument to any of the scripts to provide the path to your keypairs file.
If in the file, the key is not called “default” you can use the --key parameter to indicate the stored key name.

    import_data --keyfile Path/name_of_file.json --key NotDefault
