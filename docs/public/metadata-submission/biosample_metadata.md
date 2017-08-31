## Overview

* The 4DN consortium will collect metadata on the preparation of a biological sample (biosample) in order to make the data FAIR, Findable, Accessible, Interoperable and Reusable, to the extent that such a service benefits the network and scientific community at large. 
* Many 4DN experiments are performed using cell lines.  Other experiments may be performed on isolated primary cells or tissues. 
* Experimenters may also perform assays where cells are transiently treated, for example by addition of a drug or introduction of a silencing construct, or stably genomically modified through Crispr technologies.  

This page outlines and describes the types of metadata that is requested for biological samples.
  
* The first part of the document outlines the few fields shared by all biosamples.  
* The Cell Lines and Samples Working Group has focused on developing requirements for cell line metadata and this is the primary focus of the [remainder of this document](#cc_meta).

*Note that the working group is still discussing some of the metadata and requirements are evolving.  If you have any questions or concerns please feel free to [contact us](mailto:support@4dnucleome.org).*

## Basic Biosample Metadata

```description```  - **Required**

* A brief description of the biosample
* example "K562 cells prepared for in situ Hi-C experiments"

```biosource``` - **Required**

* The value of this field is a reference to usually one _Biosource_ object whose metadata is submitted separately.
* This biosource can be a cell line or a tissue that has its own associated metadata.
   * **NOTE**: The tiered cell lines all have an existing biosource in the database that can be re-used and referenced by it's accession, alias or uuid - while other biosources may require you to submit metadata for them.
* It is possible, though rare, for a single biosample to consist of more than one biosource - eg. pooling of two different cell lines - in these cases you can reference multiple biosources in this field.

```cell_culture_details``` - **Required only for cultured cell lines**

* The value of this field is a reference to a _BiosampleCellCulture_ object whose metadata is submitted separately and is detailed in the Cell Culture Metadata section below.

```modifications``` - Optional

* *Genetic modifications* - this field is used when a Biosample has been genomically modified eg. Crispr modification of a cell line.
* The value of this field is a list of one or more references to a _Modification_ object whose metadata is submitted separately.
* Modifications include information on expression or targeting vectors stably transfected to generate Crispr'ed or other genomically modified samples.

```treatments``` - Optional

* This field is used when a Biosample has been treated with a chemical/drug or transiently altered using RNA interference techniques.
* The value of this field is a reference to a _Treatment_ object whose metadata is submitted separately.
* There are currently two general types of treatments - 1) Addition of a drug or chemical and 2) transient or inducible RNA interference - more may be added as necessary

```biosample_protocols``` - Optional

<span id="cc_meta"></span>

* Protocols used in Biosample Preparation
*  The value of this field is a list of references to a _Protocol_ object - an alias or uuid.  The _Protocol_ object will include an attachment to the pdf document.

## Cell Culture Metadata

* The consortium has designated 4 cell lines as [Tier 1](https://data.4dnucleome.org/search/?type=Biosource&cell_line_tier=Tier+1), which will be a primary focus of 4DN research and integrated analysis.  
* A number of other lines that are expected to be used by multiple labs and have approved SOPs for maintaining them have been designated [Tier 2](https://data.4dnucleome.org/search/?type=Biosource&cell_line_tier=Tier+2).  
* In addition, some labs may wish to submit datasets produced using other cell lines.  

To maintain consistent data standards and in order to facilitate integrated analysis the Cell Lines and Samples Working Group has designated:

1. metadata regarding cell line biosample preparation is required.   
2. metadata that is strongly encouraged.  

The exact requirements may vary somewhat depending on the cell type and when the data was produced (i.e. some older experiments can be 'grandfathered' in even if they do not 'pass' all the requirements.  

The biosample metadata fields that can be submitted are described below.

### BiosampleCellCulture fields

```description``` - Strongly Encouraged

* A short description of the cell culture procedure
* example "Details on culturing a preparation of K562 cells"

```morphology_image``` - **Required**

* Phase Contrast or DIC Image of at least 50 cells showing morphology at the time of collection
* This is an authentication standard particularly relevant to Tiered cell lines.
* The value of this field is a reference to an _Image_ object that needs to be submitted separately.

```culture_start_date``` - **Required**

* The date the the cells were most recently thawed and cultured for the submitted experiment
* Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD ((TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).

```culture_harvest_date``` - **Required**

* The date the culture was harvested for biosample preparation.
* Date format as above.

```culture_duration``` - **Required**

* Total Days in Culture.
* Total number of culturing days since receiving original vial, including pyramid stocking and expansion since thawing the working stock, through to harvest date.

```passage_number``` - **Required**

* Number of passages since receiving original vial, including pyramid stocking and expansion since thawing the working stock, through to harvest date.

```doubling_number``` - **Required**

* The number of times the population has doubled since the time of thaw (culture start date) until harvest.
* This may be reported in different ways - eg. 1) passage ratio and number of passages or 2) direct cell counts.

```doubling_time``` - Optional

* Population Doubling Time
* The average time from thaw (culture start date) until harvest it takes for the population to double.
* Researchers can record the number of times they split the cells and by what ratio as a simple approximation of doubling time. This is especially important for some cell lines eg. IMR90 (a mortal line) and HI and H9 human stem cells.

```protocols_additional``` - Optional

* Additional Protocols used in Cell Culture
* Protocols describing non-4DN protocols or deviations from 4DN SOPs, including additional culture manipulations eg. stem cell differentiation or cell cycle synchronization if they do not follow recommended 4DN SOPs
*  The value of this field is a list of references to a _Protocol_ object - an alias or uuid.  The _Protocol_ object will include an attachment to the pdf document.

```authentication_protocols``` - Optional

* References to one or more *Protocol* objects can be submitted in this field.  The *Protocol* objects should be of the type 'Authentication document' and can be further classified by indicating a specific classification eg. 'Karyotyping authentication' or 'Differentiation authentication'.
* The value of this field is a list of references to a _Protocol_ object - an alias or uuid.  The _Protocol_ object will include an attachment to the pdf or image document.

```karyotype``` - Optional

* Karyotype Description - a textual description of the population karyotype
* Important for potentially genomically unstable lines and strongly encouraged if the passage number of an unstable line is greater than 10.
* A textual description of chromosome count and any noted rearrangements or copy number variations.
* Using this field allows this information to be queried in searches.
* **NOTE** An image or authentication document (see above) may be submitted in place or in addition to this.

```karyotype_image``` - Optional

* Image of the karyotype
* The value of this field is a reference to an _Image_ object that needs to be submitted separately.
* **NOTE** A description or authentication document (see above) can be submitted in place or in addition to this.

```differentiation_state``` - Optional

* For cells that have undergone differentiation a description of the differention state and markers used to determine the state.
* Using this field allows this information to be queried in searches.
* **NOTE** An authentication document (see above) can be submitted in place or in addition to this.

```synchronization_stage``` - Optional

* If a culture is synchronized the cell cycle stage or description of the point from which the biosample used in an experiment is prepared.
* Using this field allows this information to be queried in searches.
* **NOTE** An authentication document (see above) can be submitted in place or in addition to this.

```cell_line_lot_number``` - Strongly Suggested for non-Tier 1 cells

* For 4DN Tier2 or unclassified cell lines - a lot number or other information to uniquely identify the source/lot of the cells

```follows_sop``` - Strongly Suggested

* Flag to indicate if all the 4DN SOPs for the specified cell line was followed - Yes or No
