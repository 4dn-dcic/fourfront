## Data Processing Pipelines

### Overview
* 4DN Data are processed through pipelines packaged in Common Workflow Language (CWL) and Docker. All the workflow description CWL files can be found on a public Github repo, https://github.com/4dn-dcic/pipelines-cwl. CWLs are versioned according to the release versions of this repo. Individual docker images are stored in Docker Hub (https://hub.docker.com) and the source files for individual docker image is stored and versioned in a repo under the 4dn-dcic account (https://github.com/4dn-dcic, see sections below for each data type). 

### Workflow Description by data type
#### Hi-C
##### Source files
* Latest runs (0.2.5)
  * CWL : https://github.com/4dn-dcic/pipelines-cwl/tree/0.2.5/cwl_awsem/hic
  * Docker : https://github.com/4dn-dcic/docker-4dn-hic/tree/v42
* Previous runs
  * Run V0.9 (0.2.0)
    * CWL : https://github.com/4dn-dcic/pipelines-cwl/tree/0.2.0/cwl_awsem/
    * Docker : https://github.com/4dn-dcic/docker-4dn-hic/tree/v40

#### Repli-seq
##### Source files
* Latest runs (0.2.5)
  * CWL : https://github.com/4dn-dcic/pipelines-cwl/tree/0.2.5/cwl_awsem/repliseq
  * Docker : https://github.com/4dn-dcic/docker-4dn-repliseq/tree/v11


