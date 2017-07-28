## Overview

Many 4DN experiments are performed using cell lines.  The consortium has designated 4 cell lines as [Tier 1](https://data.4dnucleome.org/search/?type=Biosource&cell_line_tier=Tier+1), which will be a primary focus of 4DN research and integrated analysis.  A number of other lines that are expected to be used by multiple labs and have approved SOPs for maintaining them have been designated [Tier 2](https://data.4dnucleome.org/search/?type=Biosource&cell_line_tier=Tier+2).  In addition, some labs may wish to submit datasets produced using other cell lines.  To maintain consistent data standards and in order to facilitate integrated analysis the samples working group has designated what metadata regarding cell line biosample preparation is required.  Other metadata is strongly encouraged.  The exact requirements may vary somewhat depending on the cell type and when the data was produced (i.e. some older experiments can be 'grandfathered' in even if they do not 'pass' all the requirements.  The biosample metadata fields that can be submitted are described below.

*Note that the sample working group is still discussing some of the metadata and requirements are evolving.  If you have any questions or concerns please feel free to [contact us](mailto:4DN.DCIC.support@hms-dbmi.atlassian.net).*

## Biosample cell culture fields

```description``` - Highly Recommended

* A short description of the cell culture procedure
* example "Details on culturing a preparation of K562 cells"

```morphology_image``` - **Required**

* Phase Contrast Image of at least 50 cells showing morphology at the time of collection
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

```authentications``` - Optional

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
