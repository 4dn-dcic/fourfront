## Overview

In order to make your data accessible, searchable and assessable you should submit as much metadata as possible to the 4DN system along with the raw files you have generated in your experiments. These pages can show you how to find out what kind of metadata we collect for your particular type of experiment and the mechanisms by which you can submit your metadata and data to the 4DN system.

For an overview of the metadata structure and relationships between different items please see [the slides](/help#metadata-structure) available on the [introductory page](/help).

## A note on Experiments and Replicate Sets

The 4DN Consortium is strongly encouraging that chromatin conformation capture genomic experiments be performed using at least two different preparations of the same source biomaterial - i.e. bioreplicates.  In terms of submitting metadata you would submit two Experiments that used the same Biosource, but have different Biosamples. In many cases the only difference between Biosamples may be the dates at which the cell culture or tissue was harvested.  The experimental techniques and parameters will be shared by all experiments of the same bioreplicate set.

You may also have multiple sequencing runs performed at different times using a library prepared from the same Biosample and the same methods up until the sample is sent to the sequencer - i.e. technical replicates.

The replicate information is stored and represented as a set of experiments that includes labels indicating the replicate type and replicate number of each experiment in the set.

The mechanism that you use to submit your metadata will dictate the type of item that you will associate replicate information with, though in the database the information will always end up directly associated with ExperimentSetReplicate objects.  Specific details on formatting information regarding replicates is given in the [Excel Work Book Submission](/help/spreadsheet) page.  When submitting using the REST API you should format your json according to the specifications in the schema as described in the [REST API page](/help/rest-api).

## Getting Added as a 4DN User or Submitter

Before you can view protected lab or project data or submit data to the 4DN system you must be a registered user of the site and have the appropriate access credentials. To view lab data that is still in the review phase you must be registered as a member of the lab that produced the data.  You must be designated as a submitter for the lab for which you want to submit files and metadata.  Most current 4DN lab members should already be registered in our system.  If you are a lab submitter or new to the project to get set up with an account with the correct access contact the data wranglers at [support@4dnucleome.org](mailto:support@4dnucleome.org).  To validate your credentials, please also cc your PI.


**A note on metadata and data accessibility.**
 For most metadata items the default permission will be that the data will only be viewable by the members of the submitting lab and will only be editable by users who have been designated as submitters for that lab. The metadata will also be accessible to data wranglers who can help you review the data and alert you to any issues as the submission is ongoing. Once the data and metadata are complete and quality controlled, they will be released according to the data release policy adopted by the 4DN network.


**A note on the test deployment:** We are deploying the 4DN Data Portal at <https://data.4dnucleome.org>. But at the moment, please use the test portal accessible at <https://testportal.4dnucleome.org>. Data submitted to the test portal may be deleted when server redeployments are necessary; however the forms you prepare can be used for submission to our production portal later.

## Getting Connection Keys for the 4DN-DCIC servers
If you have been designated as a submitter for the project and plan to use either our spreadsheet-based submission system or the REST-API an access key and a secret key are required to establish a connection to the 4DN database and to fetch, upload (post), or change (patch) data. Please follow these steps to get your keys.

1. Log in to the 4DN website with your username (email) and password.
    - server: <https://testportal.4dnucleome.org>

    Note that we are using the [Oauth](https://oauth.net/) authentication system which will allow you to login with a google or github login.  _The email associated with the account you use for login must be the same as the one registered with the 4DN-DCIC._

2. Once logged in, go to your ”Profile” page by clicking **Account** on the upper right side of the page.  In your profile page, click the green “Add Access Key” button, and copy the “access key ID” and “secret access key” values from the pop-up page. _Note that once the pop-up page disappears you will not be able to see the secret access key value._ However, if you forget or lose your secret key you can always delete and add new access keys from your profile page at any time.


3. Once you have your access key information, for use with Submit4DN our spreadsheet submission system, create a file in your home directory named “keypairs.json”. This file will contain your key information in json format and will be read by the Submit4DN scripts to establish a secure connection. The contents of the file must be formatted as shown below - replace key and secret with your new “Access Key ID” and “Secret Access Key”.  You can use the same key and secret to use the 4DN [REST-API](/help/rest-api).

**Sample content for keypairs.json**

```json
{
  "default": {
    "key": "ABCDEFG",
    "secret": "abcdefabcd1ab",
    "server": "https://testportal.4dnucleome.org/"
  }
}
```

**Tip:** If you don’t want to use that filename or keep the file in your home directory you can use the --keyfile parameter as an argument to any of the scripts to provide the path to your keypairs file.
If in the file, the key is not called “default” you can use the --key parameter to indicate the stored key name.

    import_data --keyfile Path/name_of_file.json --key NotDefault
