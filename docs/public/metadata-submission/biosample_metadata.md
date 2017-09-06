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

* A brief specific description of the biosample
* example "K562 cells prepared for in situ Hi-C experiments"
* example "GM12878 cells modified using Crispr to delete CTCF sites in the PARK2 region prepared for chromatin capture experiments"

```biosource``` - **Required**

* The value of this field is a reference to usually one **Biosource** object whose metadata is submitted separately.
* This biosource can be a cell line or a tissue that has its own associated metadata.
   * **NOTE**: The tiered cell lines all have an existing biosource in the database that can be re-used and referenced by it's accession, alias or uuid - while other biosources may require you to submit metadata for them.
* It is possible, though rare, for a single biosample to consist of more than one biosource - eg. pooling of two different cell lines - in these cases you can reference multiple biosources in this field.

```cell_culture_details``` - **Required only for cultured cell lines**

* The value of this field is a reference to a _BiosampleCellCulture_ object whose metadata is submitted separately and is detailed in the *Cell Culture Metadata section below*.

```modifications``` - **Required** if cells have been genomically modified

* **Genetic modifications** - this field is **required** when a Biosample has been genomically modified eg. Crispr modification of a cell line.
* The value of this field is a list of one or more references to a **Modification** object whose metadata is submitted separately.
* Modifications include information on expression or targeting vectors stably transfected to generate Crispr'ed or other genomically modified samples.

```treatments``` - **Required** if cells have been treated 'transiently' with drugs or by transfection.

* This field is used when a Biosample has been treated with a chemical/drug or transiently altered using RNA interference techniques.
* The value of this field is a reference to a **Treatment** object whose metadata is submitted separately.
* There are currently two general types of treatments - more will be added as needed.
  1. Addition of a drug or chemical
  2. Transient or inducible RNA interference

```biosample_protocols``` - Optional

<span id="cc_meta"></span>

* Protocols used in Biosample Preparation - this is distinct from SOPs and protocol from cell culture_duration
* example protocol description "Preparation of isolated brain tissue from BALB/c adult mice for chromatin capture experiments"
* The value of this field is a list of references to a **Protocol** object - an alias or uuid.
* The **Protocol** object can include an attachment to a pdf document describing the steps of the preparation.
* The **Protocol** object is of type 'Biosample preparation protocol' and can be further classified as 'Tissue Preparation Methods' if applicable.

## Cell Culture Metadata

* The consortium has designated 4 cell lines as [Tier 1](https://data.4dnucleome.org/search/?type=Biosource&cell_line_tier=Tier+1), which will be a primary focus of 4DN research and integrated analysis.
* A number of other lines that are expected to be used by multiple labs and have approved SOPs for maintaining them have been designated [Tier 2](https://data.4dnucleome.org/search/?type=Biosource&cell_line_tier=Tier+2).
* In addition, some labs may wish to submit datasets produced using other cell lines.

To maintain consistent data standards and in order to facilitate integrated analysis the Cell Lines and Samples Working Group has adopted the following policy.

Certain types of metadata, if not submitted will prevent your data from being flagged “gold standard”. For your data to be considered “gold standard”, you will need to obtain your cells from the approved source and grow them precisely according to the approved SOP and include the following required information:

1. A light microscopic image (DIC or phase contrast) of the cells at the time of harvesting (omics) or under each experimental condition (imaging);
2. culture start date, culture harvest date, culture duration, passage number and doubling number

Other metadata is strongly encouraged and the exact requirements may vary somewhat depending on the cell type and when the data was produced (i.e. some older experiments can be 'grandfathered' in even if they do not 'pass' all the requirements).

The biosample cell culture metadata fields that can be submitted are described below.

### BiosampleCellCulture fields

```description``` - Strongly Encouraged

* A short description of the cell culture procedure
* example "Details on culturing a preparation of K562 cells"

```morphology_image``` - **Required**

* Phase Contrast or DIC Image of at least 50 cells showing morphology at the time of collection
* This is an authentication standard particularly relevant to Tiered cell lines.
* The value of this field is a reference to an **Image** object that needs to be submitted separately.

```culture_start_date``` - **Required**

* The date the the cells were most recently thawed and cultured for the submitted experiment
* Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD ((TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).
* example Date only (most common use case) - "2017-01-01"
* example Date and Time (uncommonly used) -"2017-01-01T17:00:00+00:00" - note for time hours, minutes, seconds and offset (can be 00 filled) are required

```culture_harvest_date``` - **Required**

* The date the culture was harvested for biosample preparation.
* Date format as above.

```culture_duration``` - **Required**

* Total Days in Culture.
* Total number of culturing days since receiving original vial, including pyramid stocking and expansion since thawing the working stock, through to harvest date.
* The field value is a number - can be floating point
* example "5"
* example "3.5"

```passage_number``` - **Required**

* Number of passages since receiving original vial, including pyramid stocking and expansion since thawing the working stock, through to harvest date.
* Only integer values are allowed in this field eg. 3, 5, 11

```doubling_number``` - **Required**

* The number of times the population has doubled since the time of thaw (culture start date) until harvest.
* This may be determined and reported in different ways
  1. passage ratio and number of passages
  2. direct cell counts.
* Therefore, this field takes a string value
* example "7.88"
* example "5 passages split 1:4"

```follows_sop``` - **Required**

* Flag to indicate if the 4DN SOP for the specified cell line was followed - options 'Yes' or 'No'
* If a cell line is not one of the 'Tiered' 4DN lines this field should be set to 'No'

```protocols_additional``` - **Required** if 'follows_sop' is 'No'

* Protocols used in Cell Culture when there is deviation from a 4DN approved SOP.
* Protocols describing non-4DN protocols or deviations from 4DN SOPs, including additional culture manipulations eg. stem cell differentiation or cell cycle synchronization if they do not follow recommended 4DN SOPs
* The value of this field is a list of references to a **Protocol** object - an alias or uuid.
* The **Protocol** object can include an attachment to the pdf document.

```doubling_time``` - Optional

* Population Doubling Time
* The average time from thaw (culture start date) until harvest it takes for the population to double.
* Researchers can record the number of times they split the cells and by what ratio as a simple approximation of doubling time. This is especially important for some cell lines eg. IMR90 (a mortal line) and HI and H9 human stem cells.
* eg. '2 days'


```authentication_protocols``` - Optional

* References to one or more **Protocol** objects can be submitted in this field.
* The **Protocol** objects should be of the type 'Authentication document'
* The **Protocol** object can be further classified by indicating a specific classification eg. 'Karyotyping authentication' or 'Differentiation authentication'.
* The **Protocol** description should include specific information on the kind of authentication
  * example "g-banding karyotype report"
  * example "images of FoxA2 and Sox17 expression in differentiated endoderm cells"
* The **Protocol** object can include an attachment to the pdf or image document.

```karyotype``` - Optional description of cell ploidy and karyotype

* Description of cell Ploidy - a textual description of the population ploidy and/or karyotype.
* Important for potentially genomically unstable lines and strongly encouraged if the passage number of an unstable line is greater than 10.
* A textual description of chromosome count and any noted rearrangements or copy number variations.
* examples include
  * chromosome counts or structural variation using sequencing data
  * chromosome counts using droplet PCR
  * cytological G-banding
* Using this field allows this information to be queried in searches.
* **NOTE** An image or authentication document (see above) may be submitted in place or in addition to this.

```differentiation_state``` - Optional

* For cells that have undergone differentiation a description of the differention state and markers used to determine the state.
* Using this field allows this information to be queried in searches.
* example 'Definitive endoderm as determined by the expression of Sox17 and FoxA2'
* **NOTE** An authentication document (see above) can be submitted in place or in addition to this.

```synchronization_stage``` - Optional

* If a culture is synchronized then the cell cycle stage or description of the point from which the biosample used in an experiment is prepared.
* Using this field allows this information to be queried in searches.
* example 'M-phase metaphase arrested cells'
* **NOTE** An authentication document (see above) can be submitted in place or in addition to this.

```cell_line_lot_number``` - Strongly Suggested for non-Tier 1 cells

* For 4DN Tier2 or unclassified cell lines - a lot number or other information to uniquely identify the source/lot of the cells
