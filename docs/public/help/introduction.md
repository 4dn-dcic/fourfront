## Overview

* The 4DN Data Portal will be the primary access point to the omics and imaging data, analysis tools, and integrative models
generated and utilized by the 4DN Network.
* The primary high level organizing principle for the data is sets of replicate experiments.
* A good entry point for exploring available data is the [Browse Page](/browse/?type=ExperimentSetReplicate&experimentset_type=replicate).
* See [below](#metadata-structure) for an overview of our metadata model.
* As of September 2017, the portal is currently open to the network
  for data submission for standard functional genomics experiments (Hi-C and
  variants, ChIA-PET and variants, RNA-seq, ChIP-seq,
  ATAC-seq).
* Continuing developments in the metadata model and data portal are ongoing.

#### Notes for prospective submitters

If you would like submit data to the portal:

* You will need to [create a user account](/help/account-creation).
* Please skim through the [metadata structure](#metadata-structure).
* Check out the other pages in the **Help** menu for detailed information on the submission process.
* Of note are the required metadata for the biological samples used in experiments, which is specified [on this page](/help/biosample).
* We can set up a webex call to discuss the details and the most convenient approach for your existing system.

## Metadata Structure

The DCIC, with input from different 4DN Network Working groups, has defined a metadata structure to describe:

* biological samples
* experimental methods
* data files
* analysis steps
* and other pertinent data.

The framework for the the metadata structure is based on the work of
[ENCODE DCC](https://www.encodeproject.org/help/getting-started/#organization).

The metadata is organized as objects that are related with each other.
An overview of the major objects is provided in the following slides.
