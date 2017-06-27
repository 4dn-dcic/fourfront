In order to make your data accessible, searchable and assessable you should submit as much metadata as possible to the 4DN system along with the raw you have generated. This guide will show you how to find out what kind of metadata we collect for your particular type of experiment and the mechanisms by which you can submit your metadata and data to the 4DN system.

For an overview of the metadata structure and relationships between different items please see [these slides](https://drive.google.com/file/d/0B6cuZNSltxB9RERJNl81ZTRVUlE/view?usp=sharing).

### A note on Experiments and Replicate Sets

The 4DN Consortium is strongly encouraging that chromatin conformation capture genomic experiments be performed using at least two different preparations of the same source biomaterial - i.e. bioreplicates.  In terms of submitting metadata you would submit two Experiments that used the same Biosource, but have different Biosamples. In many cases the only difference between Biosamples may be the dates at which the cell culture or tissue was harvested.  The experimental techniques and parameters will be shared by all experiments of the same bioreplicate set.

You may also have multiple sequencing runs performed at different times using a library prepared from the same Biosample and the same methods up until the sample is sent to the sequencer - i.e. technical replicates.

The replicate information is stored and represented as a set of experiments that includes labels indicating the replicate type and replicate number of each experiment in the set.

The mechanism that you use to submit your metadata will dictate the type of item that you will associate replicate information with, though in the database the information will always end up directly associated with ExperimentSetReplicate objects.  Specific details on formatting information regarding replicates is given in the [Excel Work Book Submission](./excel_submission.md) page.  When submitting using the REST API you should format your json according to the specifications in the schema as described in the [REST API page](./REST_API_submission.md).
