import csv
import datetime
import json
import re
from copy import deepcopy
from pathlib import PurePath
from urllib import parse

import openpyxl
import structlog
from dcicutils.lang_utils import conjoined_list, n_of
from dcicutils.misc_utils import VirtualAppError, ignored
from webtest import AppError

from .util import s3_local_file

log = structlog.getLogger(__name__)

GENERIC_FIELD_MAPPINGS = (
    {  # for spreadsheet column names that are different from schema property names
        "individual": {
            "mother id": "mother",
            "father id": "father",
            "hpo terms": "phenotypic_features",
            "mondo terms": "disorders",
            "deceased": "is_deceased",
            "termination of pregnancy": "is_termination_of_pregnancy",
            "still birth": "is_still_birth",
            "pregnancy": "is_pregnancy",
            "spontaneous abortion": "is_spontaneous_abortion",
            "infertile": "is_infertile",
            "no children by choice": "is_no_children_by_choice",
            "diagnosis age of onset": "diagnosis_onset_age",
            "diagnosis age of onset units": "diagnosis_onset_age_units",
        },
        "family": {},
        "sample": {
            "date collected": "specimen_collection_date",
            "location stored": "specimen_storage_location",
            "specimen id": "specimen_accession",
            "transport method": "transported_by",
            "sequencing ref lab": "sequencing_lab",
            "date rec'd at ref lab": "date_received",
            "specimen accepted by ref lab": "specimen_accepted",
            "sample id by ref lab": "sequence_id",
            "req type": "requisition_type",
            "date req rec'd": "date_requisition_received",
            "physician/provider": "ordering_physician",
            "test requested": "workup_type",
        },
        "requisition": {
            "req accepted y/n": "accepted_rejected",
            "reason rejected": "rejection_reason",
            "corrective action taken": "corrective_action",
            "corrective action taken by": "action_taken_by",
            "correction notes": "notes",
        },
    }
)


ABBREVS = {
    "male": "M",
    "female": "F",
    "unknown": "U",
    "yes": "Y",
    "no": "N",
    "p": "proband",
    "mth": "mother",
    "fth": "father",
    "sf": "sibling",
}
YES_VALS = ["y", "yes"]

# SS at end refers to spreadsheet, to distinguish from prop names in schema if we need
# vars for those at any point.
SS_INDIVIDUAL_ID = "individual id"
SS_FAMILY_ID = "family id"
SS_SEX = "sex"
SS_SPECIMEN_ID = "specimen id"
SS_ANALYSIS_ID = "analysis id"
SS_RELATION = "relation to proband"
SS_REPORT_REQUIRED = "report required"
SS_PROBAND = "proband"

REQUIRED_COLS_FOR_CASE = [SS_ANALYSIS_ID, SS_SPECIMEN_ID]
REQUIRED_COLS_FOR_ACCESSIONING = REQUIRED_COLS_FOR_CASE + [
    SS_INDIVIDUAL_ID,
    SS_SEX,
    SS_RELATION,
    SS_REPORT_REQUIRED,
]
REQUIRED_COLS_FOR_PEDIGREE = [SS_FAMILY_ID, SS_INDIVIDUAL_ID, SS_SEX, SS_PROBAND]

# half-siblings not currently supported, because pedigree info is needed to know
# which parent is shared. Can come back to this after pedigree processing is integrated.
SIBLING_LABEL = "sibling"
SIBLINGS = [
    "sibling",
    "brother",
    "sister",
    "full sibling",
    "full brother",
    "full sister",
]

RELATIONS = SIBLINGS + ["proband", "mother", "father"]

POST_ORDER = [
    "file_submitted",
    "sample",
    "individual",
    "family",
    "sample_processing",
    "report",
    "case",
]


LINKTO_FIELDS = [  # linkTo properties that we will want to patch in second-round
    "samples",
    "members",
    "mother",
    "father",
    "proband",
    "report",
    "individual",
    "sample_processing",
    "families",
    "family",
    "files",
    "related_files",
]


ID_SOURCES = ["UDN"]

HPO_TERM_ID_PATTERN = re.compile(r"^HP:[0-9]{7}$")
MONDO_TERM_ID_PATTERN = re.compile(r"^MONDO:[0-9]{7}$")


def submit_metadata_bundle(
    *,
    s3_client,
    bucket,
    key,
    project,
    institution,
    submission_type,
    vapp,
    validate_only=False,
):
    """
    Handles processing of a submitted workbook.

    Args:
        s3_client: a boto3 s3 client object
        bucket: the name of the s3 bucket that contains the data to be processed
        key: the name of a key within the given bucket that contains the data to be processed
        project: a project identifier
        institution: an institution identifier
        vapp: a VirtualApp object
        validate_only: a bool. If True, only do validation, not posting; otherwise (if False), do posting, too.
    """
    with s3_local_file(s3_client, bucket=bucket, key=key) as filename:
        project_json = vapp.get(project).json
        institution_json = vapp.get(institution).json
        results = {
            "success": False,
            "validation_output": [],
            "result": {},
            "post_output": [],
            "upload_info": [],
        }
        if filename.endswith(".xlsx"):
            rows = digest_xlsx(filename)
        elif filename.endswith(".csv") or filename.endswith(".tsv"):
            delim = "," if filename.endswith("csv") else "\t"
            rows = digest_csv(filename, delim=delim)
        else:
            msg = (
                "Metadata bundle must be a file of type .xlsx, .csv, or .tsv. "
                "Please submit a file of the proper type."
            )
            results["validation_output"].append(msg)
            return results
        json_data, json_success = xls_to_json(
            vapp=vapp,
            xls_data=rows,
            project=project_json,
            institution=institution_json,
            ingestion_id=key.split("/")[0],
            submission_type=submission_type,
        )
        if not json_success:
            results["validation_output"] = json_data["errors"]
            return results
        processing_result, validation_log_lines, validate_success = validate_all_items(
            vapp, json_data
        )
        results["result"] = processing_result
        results["validation_output"] = validation_log_lines
        if not validate_success:
            return results
        results["success"] = validate_success
        if validate_only:
            return results
        result_lines, post_success, upload_info = post_and_patch_all_items(
            vapp, json_data_final=processing_result
        )
        results["post_output"] = result_lines
        results["success"] = post_success
        results["upload_info"] = upload_info
        return results


def map_fields(row, metadata_dict, addl_fields, item_type):
    """
    function for grabbing metadata from spreadsheet row (in dictionary form) based on
    mapping column headers to schema properties.

    Args:
        row - dictionary of format {column name1: value1, column name 2: value 2}
        metadata_dict - the dictionary (json) to be filled with metadata parsed in this function.
            Can be empty.
        addl_fields - list of fields not present in GENERIC_FIELD_MAPPINGS. These fields will appear
            in the output dictionary as keys, with spaces replaced with underscores. E.g., a field
            'individual id' will appear in the output dict as 'individual_id'.
        item_type - the key in GENERIC_FIELD_MAPPINGS to look at for column name to schema property mappings.

    Example usage:
    output = map_fields(row_dict, {}, ['individual_id', 'sex', 'age', 'birth_year'], 'individual')
    """
    for field in addl_fields:
        metadata_dict[field] = use_abbrev(row.get(field.replace("_", " ")))
    for map_field in GENERIC_FIELD_MAPPINGS[item_type]:
        if map_field in row:
            metadata_dict[GENERIC_FIELD_MAPPINGS[item_type][map_field]] = use_abbrev(
                row.get(map_field)
            )
    return metadata_dict


def use_abbrev(value):
    if value and value.lower() in ABBREVS:
        return ABBREVS[value.lower()]
    else:
        return value


def get_column_name(row, columns):
    """Get header in row when multiple headers exist for the field.

    Defaults to last header given.

    :param row: Spreadsheet row, headers mapped to values
    :type row: dict
    :param columns: Header names possible for the desired value
    :type columns: list(str)
    :returns: Header found in row (or last header given)
    :rtype: str
    """
    for col in columns:
        if row.get(col) is not None:
            return col
    return columns[-1]


def digest_xlsx(xlsx_data):
    book = openpyxl.load_workbook(xlsx_data, data_only=True)
    sheet = book.worksheets[0]
    return row_generator(sheet)


def digest_csv(input_data, delim=","):
    with open(input_data) as csvfile:
        rows = list(csv.reader(csvfile, delimiter=delim))
    for row in rows:
        yield row


def replace_cell_contents(info_dict, field, **kwargs):
    existing = info_dict.get(field, "").lower()
    if existing in kwargs:
        info_dict[field] = kwargs[existing]


def remove_spaces_in_id(id_value):
    if not id_value:
        return None
    return id_value.replace(" ", "_")


def generate_individual_alias(project_name, individual_id):
    return "{}:individual-{}".format(project_name, remove_spaces_in_id(individual_id))


def is_yes_value(str_value):
    """
    Determines whether the value of a field means 'yes'.
    """
    if not isinstance(str_value, str):
        return False
    if str_value.lower() in YES_VALS:
        return True
    return False


def string_to_array(str_value):
    """converts cell contents to list, splitting by commas"""
    if str_value is None:
        str_value = ""
    return [item.strip() for item in str_value.split(",") if item.strip()]


def format_ontology_term_with_colon(str_value):
    """
    Used for ontology terms, to convert underscore-formatted term ids to
    colon-formatted term ids. Also converts term IDs to uppercase.
    Example input: 'hp_0000124'
    Example output: 'HP:0000124'
    """
    if not isinstance(str_value, str):
        raise ValueError("String value expected.")
    return str_value.upper().replace("_", ":")


def make_conjoined_list(list_values, conjunction="and"):
    """Make conjoined list with more sane defaults.

    :param list_values: The strings to join
    :type list_values: list
    :param conjunction: Conjunction for joining strings
    :type conjunction: str
    :returns: Joined strings
    :rtype: str
    """
    if conjunction:
        result = conjoined_list(
            list_values, oxford_comma=True, conjunction=conjunction, nothing=" "
        )
    else:
        result = conjoined_list(list_values, oxford_comma=True, nothing=" ")
    return result


def update_value_capitalization(properties, to_upper=None, to_lower=None):
    """Update capitalization of key values in dictionary.

    Given keys, check if values are strings and then format them
    appropriately.

    :param properties: Dictionary to update
    :type properties: dict
    :param to_upper: Keys whose values should be capitalized
    :type to_upper: list(str) or None
    :param to_lower: Keys whose values should be lower-case
    :type to_lower: list(str) or None
    """
    if to_upper:
        apply_capitalization(properties, to_upper, str.upper)
    if to_lower:
        apply_capitalization(properties, to_lower, str.lower)


def apply_capitalization(properties, property_names_to_change, string_method):
    """Apply given capitalization method to designated strings.

    Helper function for update_value_capitalization. Updates dictionary
    values in place.

    :param properties: Dictionary to update
    :type properties: dict
    :param property_names_to_change: Dictionary keys whose values
        will have string method applied
    :type property_names_to_change: set[str]
    :param string_method: Method to apply to string values
    :type string_method: class:`str` method
    """
    for property_name in property_names_to_change:
        property_value = properties.get(property_name)
        if isinstance(property_value, str):
            properties[property_name] = string_method(property_value)


class MetadataItem:
    """
    class for single DB-item-worth of json
    """

    def __init__(self, metadata, idx, itemtype):
        self.metadata = metadata
        self.row = idx
        self.alias = self.metadata.get("aliases", [""])[0]
        self.itemtype = itemtype
        self.metadata["row"] = self.row


class AccessionRow:
    """
    Class used to hold metadata parsed from one row of case spreadsheet at a time. Called
    from class AccessionMetadata
    """

    # Schema constants
    ALIASES = "aliases"
    SAMPLES = "samples"
    FAMILIES = "families"
    SUBMITTED_FILES = "files"
    WORKUP_TYPE = "workup_type"
    TAGS = "tags"

    # Spreadsheet constants
    GENOME_BUILD = "genome_build"
    FILES = "files"
    CASE_FILES = "case_files"
    VARIANT_TYPE = "variant_type"

    # Class constants
    ACCEPTED_GENOME_BUILDS = {
        "hg19": ["19", "hg19"],
        "GRCh37": ["37", "grch37"],
        "GRCh38": ["38", "hg38", "grch38"],
    }
    FILE_SUBMITTED = "file_submitted"
    PROPERTY_VALUES_TO_UPPER = set([VARIANT_TYPE, SS_SEX, WORKUP_TYPE])

    def __init__(
        self, vapp, metadata, idx, family_alias, project, institution, file_parser=None
    ):
        """
        :param vapp: used for pytesting
        :type vapp: webtest TestApp object
        :param dict metadata: dictionary of form {column heading1: row value1, ...}, for the given row
        :param int idx: current row's number within original submitted spreadsheet
        :param str family_alias: analysis ID value for the current row being processed
        :param str project: project name
        :param str institution: institution name
        :param file_parser: handler for submitted files
        :type file_parser: SubmittedFileParser object

        :ivar str project: initial value: project
        :ivar str institution: initial value: institution
        :ivar virtualapp: initial value: vapp
        :vartype virtual app: webtest TestApp object
        :ivar dict metadata: initial value: metadata
        :ivar int row: initial value: idx
        :ivar errors: errors arising from invalid MONDO terms, HPO terms, etc., within row cells
        :vartype errors: list[str]
        :ivar str indiv_alias: alias of this row's individual
        :ivar str sample_alias: alias of this sample, including specimen ID and workup type
        :ivar str analysis_alias: alias of the sample analysis, including analysis ID and project name
        :ivar str case_name: the unique analysis ID of this row, if present
        :ivar individual: single DB-item-worth of json, for current row's individual
        :vartype individual: MetadataItem object
        :ivar family: single DB-item-worth of json, for current row's individual's family info
        :vartype family: MetadataItem object
        :ivar sample: single DB-item-worth of json, containing info about current sample
        :vartype sample: MetadataItem object
        :ivar analysis: single DB-item-worth of json, containing info about current sample's analysis
        :vartype analysis: MetadataItem object
        :ivar files_fastq: list of current fastq files, as single DB-item-worth of jsons
        :vartype files_fastq: list[MetadataItems]
        :ivar files_processed: same as self.files_fastq, but for processed files
        :vartype files_processed: list[MetadataItems]
        """
        self.project = project
        self.institution = institution
        self.virtualapp = vapp
        self.metadata = metadata
        self.row = idx
        self.file_parser = file_parser
        self.errors = []
        if not self.found_missing_values():
            self.files = []
            self.indiv_alias = generate_individual_alias(
                project, metadata[SS_INDIVIDUAL_ID]
            )
            self.fam_alias = family_alias
            self.sample_alias = "{}:sample-{}-{}".format(
                project,
                remove_spaces_in_id(metadata[SS_SPECIMEN_ID]),
                remove_spaces_in_id(
                    metadata[
                        get_column_name(metadata, ["workup type", "test requested"])
                    ]
                ).upper(),
            )
            if self.metadata.get("test number"):
                self.sample_alias = (
                    self.sample_alias + "-" + self.metadata["test number"]
                )
            self.analysis_alias = "{}:analysis-{}".format(
                project, remove_spaces_in_id(metadata[SS_ANALYSIS_ID])
            )
            self.case_name = remove_spaces_in_id(metadata.get("unique analysis id"))
            self.individual = self.extract_individual_metadata()
            self.family = self.extract_family_metadata()
            self.sample, self.analysis = self.extract_sample_metadata()

    def found_missing_values(self):
        # makes sure no required values from spreadsheet are missing
        missing_required = [
            col
            for col in REQUIRED_COLS_FOR_ACCESSIONING
            if col not in self.metadata or not self.metadata[col]
        ]
        if missing_required:
            self.errors.append(
                "Row {} - missing required field(s) {}. This row cannot be processed.".format(
                    self.row, ", ".join(missing_required)
                )
            )
        return len(self.errors) > 0

    def extract_individual_metadata(self):
        """
        Extracts 'individual' item metadata from each row,
        generating a MetadataItem object (assigned to self.individual in __init__).
        """
        info = {"aliases": [self.indiv_alias]}
        info = map_fields(
            self.metadata,
            info,
            ["individual_id", "sex", "age", "birth_year"],
            "individual",
        )
        update_value_capitalization(info, to_upper=self.PROPERTY_VALUES_TO_UPPER)
        other_id_col = get_column_name(
            self.metadata, ["other id", "other individual id"]
        )
        if self.metadata.get(other_id_col):  # for 'other_id' sub-embedded object
            other_id = {
                "id": remove_spaces_in_id(self.metadata[other_id_col]),
                "id_source": self.institution,
            }
            if self.metadata.get("other individual id type"):
                other_id["id_source"] = self.metadata["other individual id source"]
            else:
                for id_source in ID_SOURCES:
                    if self.metadata[other_id_col].upper().startswith(id_source):
                        other_id["id_source"] = id_source
            info["institutional_id"] = other_id
        for col in ["age", "birth_year"]:
            if info.get(col) and isinstance(info[col], str) and info[col].isnumeric():
                info[col] = int(info[col])
        return MetadataItem(info, self.row, "individual")

    def extract_family_metadata(self):
        """
        Extracts 'family' item metadata from each row, generating a
        MetadataItem object (assigned to self.family in __init__)
        """
        info = {
            "aliases": [self.fam_alias],
            "family_id": self.metadata.get("family id"),
            "members": [self.indiv_alias],
        }
        if not info["family_id"]:
            alias = (
                self.project + ":" + self.fam_alias
                if ":" not in self.fam_alias
                else self.fam_alias
            )
            info["family_id"] = alias[alias.index(":") + 1 :]
        relation_found = False
        for relation in RELATIONS:
            if self.metadata.get(SS_RELATION, "").lower().startswith(relation):
                relation_found = True
                if relation in SIBLINGS:
                    info[SIBLING_LABEL] = [self.indiv_alias]
                else:
                    info[relation] = self.indiv_alias
                break
        if not relation_found:
            # check if family is already in db
            # if family in db and member in family, ok
            try:
                family_match = self.virtualapp.get(
                    f"/search/?type=Family&aliases={parse.quote_plus(self.fam_alias)}&frame=object"
                ).json["@graph"][0]
                individual_match = self.virtualapp.get(
                    f"/search/?type=Individual&aliases={parse.quote_plus(self.indiv_alias)}&frame=object"
                ).json["@graph"][0]
            except Exception:  # if family and individual not already in DB
                pass  # relation_found remains False
            else:
                if individual_match.get("@id", "") in family_match.get("members", []):
                    relation_found = True
        if not relation_found:
            msg = 'Row {} - Invalid relation "{}" for individual {} - Relation should be one of: {}'.format(
                self.row,
                self.metadata.get(SS_RELATION),
                self.metadata.get(SS_INDIVIDUAL_ID),
                ", ".join(RELATIONS),
            )
            msg += (
                ". To submit extended relations (grandparent, uncle, aunt, cousin, etc.),"
                " please submit family history first."
            )
            self.errors.append(msg)
        return MetadataItem(info, self.row, "family")

    def extract_sample_metadata(self):
        """
        Extracts 'sample' item metadata from each row, generating MetadataItem objects
        (assigned to self.sample and self.analysis in __init__)
        """
        info = {"aliases": [self.sample_alias]}
        fields = [
            "workup_type",
            "specimen_type",
            "dna_concentration",
            "date_transported",
            "indication",
            "specimen_notes",
            "research_protocol_name",
            "sent_by",
            "physician_id",
            "bam_sample_id",
            self.FILES,
            self.CASE_FILES,
            self.GENOME_BUILD,
            self.VARIANT_TYPE,
            self.TAGS,
        ]
        info = map_fields(self.metadata, info, fields, "sample")
        update_value_capitalization(
            info,
            to_upper=self.PROPERTY_VALUES_TO_UPPER,
        )
        # handle enum values
        replace_cell_contents(info, "specimen_accepted", y="Yes", n="No")
        # handle bam sample ID
        if not info.get("bam_sample_id"):
            info["bam_sample_id"] = self.sample_alias.split(":sample-")[-1]
        if info.get("specimen_type"):
            info["specimen_type"] = info["specimen_type"].lower().replace("_", " ")
        # SEO
        if self.metadata.get("second specimen id"):
            other_id = {
                "id": self.metadata["second specimen id"],
                "id_type": self.project,
            }  # add proj info?
            if self.metadata.get("second specimen id type"):
                other_id["id_type"] = self.metadata["second specimen id type"]
            info["other_specimen_ids"] = [other_id]
        tags = info.get(self.TAGS)
        if tags:
            info[self.TAGS] = string_to_array(tags)
        req_info = map_fields(
            self.metadata, {}, ["date sent", "date completed"], "requisition"
        )
        # handle requisition enum
        replace_cell_contents(req_info, "accepted_rejected", y="Accepted", n="Rejected")
        # remove keys if no value
        info["requisition_acceptance"] = {k: v for k, v in req_info.items() if v}
        if self.individual:
            self.individual.metadata["samples"] = [self.sample_alias]
        sample_processing = self.make_sample_processing_metadata()
        self.process_and_add_file_metadata(info, sample_processing)
        return (
            MetadataItem(info, self.row, "sample"),
            MetadataItem(sample_processing, self.row, "sample_processing"),
        )

    def make_sample_processing_metadata(self):
        """Create SampleProcessing properties, except possibly files.

        :returns: SampleProcessing properties
        :rtype: dict
        """
        properties = {
            self.ALIASES: [self.analysis_alias],
            self.SAMPLES: [self.sample_alias],
            self.FAMILIES: [self.fam_alias],
        }
        return properties

    def process_and_add_file_metadata(self, sample, sample_processing):
        """Parse/validate file information and update Sample or
        SampleProcessing properties accordingly.

        :param sample: Sample properties
        :type sample: dict
        :param sample_processing: SampleProcessing properties
        :type sample_processing: dict
        """
        submitted_genome_build = sample.pop(self.GENOME_BUILD, None)
        genome_build = self.validate_genome_build(submitted_genome_build)
        variant_type = sample.pop(self.VARIANT_TYPE, None)
        submitted_sample_files = sample.pop(self.FILES, None)
        submitted_sample_processing_files = sample.pop(self.CASE_FILES, None)
        if submitted_sample_files:
            self.update_item_files(
                sample, submitted_sample_files, genome_build, variant_type
            )
        if submitted_sample_processing_files:
            self.update_item_files(
                sample_processing,
                submitted_sample_processing_files,
                genome_build,
                variant_type,
            )

    def update_item_files(self, item, submitted_files, genome_build, variant_type):
        """Attempt to build File items and update the given item's
        properties accordingly.

        Add created File aliases to the item, and add any errors to the
        class' errors for reporting.

        :param item: The Item to update with created Files
        :type item: dict
        :param submitted_files: Comma-separated file names
        :type submitted_files: str or None
        :param genome_build: Validated genome assembly to set as
            property on all created File items
        :type genome_build: str or None
        :param variant_type: Variant type for submitted files
        :type variant_type: str or None
        """
        file_items, file_aliases, file_errors = self.file_parser.extract_file_metadata(
            submitted_files,
            genome_build=genome_build,
            row_index=self.row,
            variant_type=variant_type,
        )
        for file_item in file_items:
            file_metadata_item = MetadataItem(file_item, self.row, self.FILE_SUBMITTED)
            self.files.append(file_metadata_item)
        if file_aliases:
            item[self.SUBMITTED_FILES] = file_aliases
        self.errors.extend(file_errors)

    def validate_genome_build(self, submitted_genome_build):
        """Validate submitted genome build and report any errors.

        :param submitted_genome_build: Submitted genome assembly
        :type submitted_genome_build: str or None
        :returns: Validated genome assembly if found
        :rtype: str or None
        """
        result = None
        if submitted_genome_build:
            submitted_genome_build_lower = submitted_genome_build.lower()
            for genome_build, accepted_values in self.ACCEPTED_GENOME_BUILDS.items():
                accepted_values = map(str.lower, accepted_values)
                if submitted_genome_build_lower in accepted_values:
                    result = genome_build
                    break
            if result is None:
                msg = (
                    f"Row {self.row} - Invalid genome build provided:"
                    f" {submitted_genome_build}."
                )
                if self.ACCEPTED_GENOME_BUILDS:
                    accepted_genome_builds = make_conjoined_list(
                        list(self.ACCEPTED_GENOME_BUILDS.keys()), conjunction="or"
                    )
                    msg += (
                        " Accepted genome builds include the following:"
                        f" {accepted_genome_builds}."
                    )
                self.errors.append(msg)
        return result


class AccessionMetadata:
    """
    Class to hold info parsed from one spreadsheet.

    One row is parsed at a time and a AccessionRow object is generated; this is then
    compared with previous rows already added to AccessionMetadata object, and compared,
    and changes made if necessary. This is because some objects (like family and sample_processing)
    have metadata that occurs across multiple rows.
    """

    def __init__(self, vapp, rows, project, institution, ingestion_id):
        """
        :param vapp: used for pytesting
        :type vapp: webtest TestApp object
        :param rows: list of tuples that consist of a row metadata dictionary,
            which contains key-value pairs of header of current column and its cell value within
            that row; and an integer, the row number within the overall spreadsheet
        :type rows: list[tuple(dict, int)]
        :param project: project identifier (e.g. contains status, date created, project title, @id, etc.)
        :type project: dict
        :param institution: institution identifier
        :type institution: dict
        :param ingestion_id: ID of current ingestion, determined by the name of the key of the given S3 bucket
        :type ingestion_id: str

        :ivar virtualapp: initial value: vapp
        :vartype virtualapp: webtest TestApp object
        :ivar rows: initial value: rows
        :vartype rows: list[tuple(dict, int)]
        :ivar row_data_dicts: dictionaries of form {column heading1: row value1, ...}, for every row
        :vartype row_data_dicts: list[dict]
        :ivar str project: name of current project
        :ivar str project_atid: @ID of current project
        :ivar str institution: name of current institution
        :ivar str institution_atid: @ID of current institution
        :ivar str ingestion_id: initial value: ingestion_id
        :ivar proband_rows: dictionaries of form {column heading1: row value1, ...},
            only for row(s) corresponding to the proband
        :vartype proband_rows: list[dict]
        :ivar dict family_dict: keys = analysis ID, values = <project>:family-<individual id> for every proband present
        :ivar dict individuals: dictionary of each individual within the spreadsheet and key-value pairs of individual metadata
        :ivar dict families: dictionary representing the members within each family in the accession spreadsheet
        :ivar dict samples: dictionary of samples
        :ivar dict sample_processings: dictionary of analyses and their corresponding samples, families involved,
            and analysis type
        :ivar dict reports: dictionary of reports with their corresponding metadata (aliases, descriptions)
        :ivar dict cases: dictionary of cases involved in the given spreadsheet, including individuals, projects,
            sample processings, etc.
        :ivar dict files_fastq: dictionary of fastq files and corresponding metadata
        :ivar dict files_processed: dictionary of files that have already been processed
        :ivar errors: errors arising from failure in validation of PedigreeRows
        :vartype errors: list[str]
        :ivar dict analysis_types: dictionary of form {analysis id: analysis type}
            (type includes workup type and grouping)
        :ivar dict case_info: dictionary containing case metadata, after processing samples
        :ivar dict json_out: json file used for subsequent validation function
        :ivar itemtype_dict: a dictionary of all the dictionaries defined prior
        :vartype itemtype_dict: dict[str, dict]
        """
        self.virtualapp = vapp
        self.rows = rows
        self.row_data_dicts = self.get_row_metadata(rows)
        self.project = project.get("name")
        self.project_atid = project.get("@id")
        self.institution = institution.get("name")
        self.institution_atid = institution.get("@id")
        self.ingestion_id = ingestion_id
        self.proband_rows = [
            row
            for row in self.row_data_dicts
            if row.get(SS_RELATION).lower() == "proband"
        ]
        self.family_dict = {
            row.get(SS_ANALYSIS_ID): "{}:family-{}".format(
                self.project, row.get(SS_INDIVIDUAL_ID)
            )
            for row in self.proband_rows
        }
        self.individuals = {}
        self.families = {}
        self.samples = {}
        self.sample_processings = {}
        self.reports = {}
        self.cases = {}
        self.files = {}
        self.errors = []
        self.analysis_types = self.get_analysis_types()
        self.case_info = {}
        self.json_out = {}
        self.itemtype_dict = {
            "individual": self.individuals,
            "family": self.families,
            "sample": self.samples,
            "sample_processing": self.sample_processings,
            "file_submitted": self.files,
            "case": self.cases,
            "report": self.reports,
        }
        self.process_rows()
        self.create_json_out()

    def get_row_metadata(self, row_tuples):
        """
        Iterates through the list of row metadata tuples of the form ({column heading1: row value1, ...}, row_number),
        and extracts the dictionaries from the tuples, returning them as a list of row dictionaries.

        :param row_tuples: list of tuples that consist of a row metadata dictionary,
            which contains key-value pairs of header of current column and its cell value within
            that row; and an integer, the row number within the overall spreadsheet
        :type row_tuples: list[tuple(dict, int)]

        :return rows_metadata: list of dictionaries of row column headings and corresponding row values,
            of the form {column heading1: row value1, ...}
        :rtype rows_metadata: list[dict]
        """
        rows_metadata = list(map(lambda x: x[0], row_tuples))
        return rows_metadata

    def get_analysis_types(self):
        """
        'analysis_type' is a property of sample_processing items, denoting the workup type (WGS, WES, etc)
        as well as describing the grouping (Trio, Group, etc). This info needs to be extracted from the spreadsheet
        separately from most of the metadata since it depends info extracted from more than one row.

        An example analysis_relations dict as created by the method is shown below, with the corresponding
        analysis type returned by the second half of the method:
        analysis_relations = {
            '111': (['proband', 'mother', 'father'], ['WGS', 'WGS', 'WGS']),  # --> WGS-Trio
            '222': (['proband'], ['WES']),                                    # --> WES
            '333': (['proband', 'father', 'sibling'], ['WGS', 'WGS', 'WGS']), # --> WGS-Group
            '234': (['proband', 'mother'], ['WGS', 'WES']),                   # --> WES/WGS-Group
        }
        """
        analysis_relations = {}
        analysis_types = {}
        for row, row_index in self.rows:
            analysis_relations.setdefault(row.get(SS_ANALYSIS_ID), [[], []])
            analysis_relations[row.get(SS_ANALYSIS_ID)][0].append(
                row.get(SS_RELATION, "").lower()
            )
            workup_col = get_column_name(row, ["test requested", "workup type"])
            workup_value = row.get(workup_col, "").upper()
            if not workup_value:
                msg = (
                    f'Row {row_index} - missing required field "{workup_col}".'
                    f" Please re-submit with appropriate value."
                )
                self.errors.append(msg)
            analysis_relations[row.get(SS_ANALYSIS_ID)][1].append(workup_value)
        for analysis_id, (relations, workup_types) in analysis_relations.items():
            workups = sorted(list(set(item for item in workup_types if item)))
            analysis_type_add_on = self.get_analysis_type_add_on(relations)
            if workups:
                workup_name = "/".join(workups)
                analysis_type = workup_name + analysis_type_add_on
            else:
                analysis_type = None
            analysis_types[analysis_id] = analysis_type
        return analysis_types

    def get_analysis_type_add_on(self, relations):
        """Get analysis type label based on relations.

        :param relations: Relations across the case submission
        :type relations: list
        :returns: Analysis type label
        :rtype: str
        """
        if relations == ["proband"]:
            result = ""
        elif sorted(relations) == ["father", "mother", "proband"]:
            result = "-Trio"
        else:
            result = "-Group"
        return result

    def add_metadata_single_item(self, item):
        """
        Looks at metadata from a AccessionRow object, one DB itemtype at a time
        and compares and adds it. If each item is not
        already represented in metadata for current AccessionMetadata instance,
        it is added; if it is represented, missing fields are added to item.
        Currently used for Individual and Sample items
        """
        previous = self.itemtype_dict[item.itemtype]
        prev = [p for p in previous.keys()]
        if item.alias not in prev:
            previous[item.alias] = item.metadata
        else:
            for key, value in item.metadata.items():
                if key not in previous[item.alias]:
                    previous[item.alias][key] = value
                # extend list field (e.g. combine samples in diff rows for Individual item)
                elif key != "aliases" and isinstance(value, list):
                    previous[item.alias][key].extend(value)
                    # special handling for list of dict rather than list of string
                    if all(
                        isinstance(item, dict) for item in previous[item.alias][key]
                    ):
                        vals = [item.values() for item in previous[item.alias][key]]
                        unique = [
                            dict(t)
                            for t in {
                                tuple(d.items()) for d in previous[item.alias][key]
                            }
                        ]
                        # error if fastq file (paired end 2) has conflicting 'paired with' relations
                        if key == "related_files" and (
                            all("paired with" in val for val in vals)
                            and len(unique) > 1
                        ):
                            msg = (
                                "Fastq file {} appears multiple times in sheet"
                                " with inconsistent paired file. Please ensure fastq is"
                                " paired with correct file in all rows where it appears."
                                "".format(item.metadata.get("filename", ""))
                            )
                            self.errors.append(msg)
                        else:
                            previous[item.alias][key] = unique
                    else:
                        previous[item.alias][key] = list(set(previous[item.alias][key]))

    def add_family_metadata(self, idx, family, individual):
        """
        Looks at 'family' metadata from AccessionRow object. Adds family to AccessionMetadata
        instance if not already present. If present, family is compared and necessary changes added.
        """
        if family.alias in self.families:
            # consolidate members
            for member in family.metadata.get("members", []):
                if member not in self.families[family.alias]["members"]:
                    self.families[family.alias]["members"].append(member)
            # deal with relations
            for relation in RELATIONS:
                if family.metadata.get(relation):
                    if relation in self.families[family.alias]:
                        if relation in SIBLINGS:
                            if (
                                individual.alias
                                not in self.families[family.alias][relation]
                            ):
                                self.families[family.alias][SIBLING_LABEL].extend(
                                    family.metadata[relation]
                                )
                        elif self.families[family.alias][relation] != individual.alias:
                            msg = (
                                'Row {} - Multiple values for relation "{}" in family {}'
                                " found in spreadsheet".format(
                                    idx, relation, family.metadata["family_id"]
                                )
                            )
                            self.errors.append(msg)
                    else:
                        self.families[family.alias][relation] = family.metadata[
                            relation
                        ]
        else:
            self.families[family.alias] = family.metadata

    def add_sample_processing(self, sp_item, analysis_id):
        """
        Looks at 'sample_processing' metadata from AccessionRow object. Adds SP item to AccessionMetadata
        instance if not already present. If present, SP metadata is compared and necessary changes added.
        """
        sp_item.metadata["analysis_type"] = self.analysis_types.get(analysis_id)
        if analysis_id in self.analysis_types:
            sp_item.metadata["analysis_type"] = self.analysis_types.get(analysis_id)
            if not self.analysis_types[analysis_id]:
                msg = (
                    "Row {} - Samples with analysis ID {} contain mis-matched or invalid workup type values. "
                    "Sample cannot be processed.".format(sp_item.row, analysis_id)
                )
                self.errors.append(msg)
        if sp_item.alias in self.sample_processings:
            for field in ["samples", "families", "files"]:
                # the sp_item.metadata generated by a single row is expected to only have one
                # sample and family even though these props are arrays - extend the arrays in
                # sample_processings dict when necessary.
                new_property_value = sp_item.metadata.get(field)
                if new_property_value:
                    existing_property_value = self.sample_processings[
                        sp_item.alias
                    ].get(field)
                    if existing_property_value:
                        if existing_property_value != new_property_value:
                            existing_property_value += [
                                value
                                for value in new_property_value
                                if value not in existing_property_value
                            ]
                    else:
                        self.sample_processings[sp_item.alias][
                            field
                        ] = new_property_value
        else:
            self.sample_processings[sp_item.alias] = sp_item.metadata

    def create_case_metadata(self):
        """
        Cases can only be created after sample_processing items are done. Reports also
        created here, if spreadsheet row indicates it is required.
        """
        for k, v in self.sample_processings.items():
            analysis_id = k[k.index("analysis-") + 9 :]
            for sample in v["samples"]:
                case_key = "{}-{}".format(
                    analysis_id, self.samples[sample].get("specimen_accession", "")
                )
                name = False
                case_name = case_key
                if case_key in self.case_info and self.case_info[case_key]["case id"]:
                    name = True
                    case_name = self.case_info[case_key]["case id"]
                case_alias = "{}:case-{}".format(self.project, case_name)
                try:
                    indiv = [
                        ikey
                        for ikey, ival in self.individuals.items()
                        if sample in ival.get("samples", [])
                    ][0]
                except IndexError:
                    indiv = ""
                case_info = {
                    "aliases": [case_alias],
                    "sample_processing": k,
                    "individual": indiv,
                    "ingestion_ids": [self.ingestion_id],
                }
                for fam in v.get("families", []):
                    if fam in self.families and indiv in self.families[fam]["members"]:
                        case_info["family"] = fam
                        break
                if (
                    name
                ):  # 'case_id' prop only added if explicitly present in spreadsheet
                    case_info["case_id"] = case_name
                # if report is True for that particular case, create report item
                if (
                    case_key in self.case_info
                    and self.case_info[case_key]["report req"]
                ):
                    report_alias = case_alias.replace("case", "report")
                    report_info = {"aliases": [report_alias]}
                    if indiv:
                        report_info[
                            "description"
                        ] = "Analysis Report for Individual ID {} (Analysis {})".format(
                            self.individuals[indiv]["individual_id"], analysis_id
                        )
                    else:
                        report_info[
                            "description"
                        ] = "Analysis Report for Case {}".format(case_name)
                    case_info["report"] = report_alias
                    self.reports[report_alias] = report_info
                self.cases[case_alias] = case_info

    def add_case_info(self, row_item):
        """
        Creates a dictionary linking analysis ID and specimen ID combination to the Case name
        indicated in the spreadsheet.
        """
        if all(field in row_item.metadata for field in REQUIRED_COLS_FOR_CASE):
            key = "{}-{}".format(
                row_item.metadata[SS_ANALYSIS_ID], row_item.metadata[SS_SPECIMEN_ID]
            )
            case_id_col = get_column_name(
                row_item.metadata, ["unique analysis id", "case id"]
            )
            self.case_info[key] = {
                "case id": remove_spaces_in_id(row_item.metadata.get(case_id_col)),
                "family": row_item.fam_alias,
                "report req": is_yes_value(
                    row_item.metadata.get(SS_REPORT_REQUIRED, "")
                ),
            }

    def add_individual_relations(self):
        """
        After family metadata has finished parsing/processing, mother and father fields are added to
        proband and sibling if relevant metadata are present.
        """
        for family in self.families.values():
            for parent in ["mother", "father"]:
                if family.get(parent):
                    if family.get("proband"):
                        self.individuals[family["proband"]][parent] = family[parent]
                    for term in SIBLINGS:
                        if family.get(term):
                            for sibling in family[term]:
                                self.individuals[sibling][parent] = family[parent]
                    del family[parent]
            for term in SIBLINGS:
                if family.get(term):
                    del family[term]

    def process_rows(self):
        """
        Method for iterating over spreadsheet rows to process each one and compare it to previous rows.
        Case creation and family relations added after all rows have been processed.
        """
        file_parser = SubmittedFilesParser(self.virtualapp, self.project)
        for (row, row_number) in self.rows:
            try:
                fam = self.family_dict[row.get("analysis id")]
            except KeyError:
                self.errors.append(
                    "Row {} - Family/Analysis does not include a proband."
                    " Row cannot be processed.".format(row_number)
                )
                continue
            try:
                processed_row = AccessionRow(
                    self.virtualapp,
                    row,
                    row_number,
                    fam,
                    self.project,
                    self.institution,
                    file_parser=file_parser,
                )
                simple_add_items = [processed_row.individual, processed_row.sample]
                simple_add_items.extend(processed_row.files)
                for item in simple_add_items:
                    self.add_metadata_single_item(item)
                self.add_family_metadata(
                    processed_row.row, processed_row.family, processed_row.individual
                )
                self.add_sample_processing(
                    processed_row.analysis, processed_row.metadata.get("analysis id")
                )
                self.add_case_info(processed_row)
                self.errors.extend(processed_row.errors)
            except AttributeError:
                self.errors.extend(processed_row.errors)
                continue
        file_parsing_general_errors = file_parser.check_for_errors()
        self.errors.extend(file_parsing_general_errors)
        self.add_individual_relations()
        self.create_case_metadata()

    def create_json_out(self):
        """
        Creates final json that can be used for subsequent validation function.
        """
        for key in self.itemtype_dict:
            self.json_out[key] = {}
            for alias, metadata in self.itemtype_dict[key].items():
                new_metadata = {k: v for k, v in metadata.items() if v}
                new_metadata["project"] = self.project_atid
                new_metadata["institution"] = self.institution_atid
                self.json_out[key][alias] = new_metadata
            self.json_out["errors"] = self.errors


class SubmittedFilesParser:
    """Class to manage File item creation during submission."""

    # Schema constants
    FILES = "files"
    ALIASES = "aliases"
    SAMPLES = "samples"
    FAMILIES = "families"
    RELATED_FILES = "related_files"
    RELATIONSHIP_TYPE = "relationship_type"
    PAIRED_WITH = "paired with"
    FILE = "file"
    FILE_FORMAT = "file_format"
    EXTRA_FILE_FORMATS = "extrafile_formats"
    FILE_NAME = "filename"
    EXTRA_FILES = "extra_files"
    STANDARD_FILE_EXTENSION = "standard_file_extension"
    OTHER_ALLOWED_EXTENSIONS = "other_allowed_extensions"
    GENOME_ASSEMBLY = "genome_assembly"
    VARIANT_TYPE = "variant_type"
    PAIRED_END = "paired_end"
    PAIRED_END_1 = "1"
    PAIRED_END_2 = "2"
    AT_ID = "@id"

    # Spreadsheet constants
    GENOME_BUILD = "genome_build"
    CASE_FILES = "case_files"

    # Class constants
    FILE_FORMAT_FASTQ_ATID = "/file-formats/fastq/"
    PAIRED_END_PATTERN = r"(_[rR]{number}_)|(_[rR]{number}\.)"
    PAIRED_END_1_REGEX = re.compile(PAIRED_END_PATTERN.format(number=1))
    PAIRED_END_2_REGEX = re.compile(PAIRED_END_PATTERN.format(number=2))
    FILE_NAME_REGEX = re.compile(r"^[\w+=,.@-]+$")

    def __init__(self, virtualapp, project_name):
        """Initialize class and set attributes.

        :param virtualapp: App for requests
        :type virtualapp: WebTest Testapp
        :param project_name: Project name for created Files
        :type project_name: str

        :var virtualapp: App for requests
        :vartype: WebTest Testapp
        :var project_name: Project name used for the submission
        :vartype project_name: str
        :var errors: Errors across rows that don't need to be repeated
        :vartype errors: list(str)
        :var accepted_file_formats: FileFormats accepted for submission,
            mapped @id to properties. Updated from None via
            self.get_accepted_file_formats()
        :vartype accepted_file_formats: dict or None
        :var primary_to_extra_file_formats: Mapping of @ids from
            FileFormats accepted for submission to their extra file
            FileFormats
        :vartype: primary_to_extra_file_formats: dict
        :var unidentified_file_format: Whether a submitted file name
            could not be associated with a suitable FileFormat
        :vartype unidentified_file_format: bool
        :var file_extensions_to_file_formats: Mapping of file
            extensions to found FileFormat @ids
        :vartype file_extensions_to_file_formats: dict
        """
        self.virtualapp = virtualapp
        self.project_name = project_name
        self.errors = []  # Errors across rows that don't need to be repeated
        self.accepted_file_formats = None
        self.extra_file_formats = {}
        self.primary_to_extra_file_formats = {}
        self.unidentified_file_format = False
        self.file_extensions_to_file_formats = {}  # Cache extensions --> file formats

    def check_for_errors(self):
        """Identify any global errors, i.e. those found across multiple
        spreadsheet rows that only need to be reported once.

        Method called within AccessionMetadata.process_rows().
        Intended to call helper functions that will update self.errors
        prior to returning them for reporting purposes.

        :returns: Global errors found while processing all submitted
            file information on the spreadsheet
        :rtype: list
        """
        self.check_for_multiple_file_formats()
        return self.errors

    def check_for_multiple_file_formats(self):
        """Identify file extensions that matched to multiple FileFormat
        items and update self.errors for reporting.
        """
        multiple_file_formats = {}
        for (
            file_extension,
            file_formats,
        ) in self.file_extensions_to_file_formats.items():
            if len(file_formats) > 1:
                multiple_file_formats[file_extension] = file_formats
        if multiple_file_formats:
            msg = (
                "Could not identify a unique file format for the following file"
                f" extensions: {make_conjoined_list(list(multiple_file_formats.keys()))}."
                f" Please report this error to the CGAP team for assistance:"
                f" {multiple_file_formats}."
            )
            self.errors.append(msg)

    def extract_file_metadata(
        self, submitted_file_names, genome_build=None, variant_type=None, row_index=None
    ):
        """Primary method for validating and creating Files from
        submitted information.

        Updates self.errors with any errors to report for an individual
        accession row (see self.check_for_errors() for "global" errors
        that should only be reported once across all rows).

        :param submitted_file_names: Comma-separated submitted file
            names
        :type submitted_file_names: str or None
        :param genome_build: Validated genome assembly
        :type genome_build: str or None
        :param variant_type: Variant type for files
        :type variant_type: str or None
        :param row_index: Row index within spreadsheet
        :type row_index: int or None
        :returns: Validated File items, validated File aliases, errors
            to report for this row
        :rtype: tuple(dict, list, list)
        """
        invalid_file_names = []
        file_names_to_items = {}
        file_aliases = []
        fastq_files = {}
        files_without_file_format = {}
        files_to_check_extra_files = {}
        errors = []
        submitted_file_names = self.parse_file_names(submitted_file_names)
        for submitted_file_name in submitted_file_names:
            file_path = PurePath(submitted_file_name)
            file_name = file_path.name
            file_suffixes = file_path.suffixes
            file_name_valid = self.is_file_name_valid(file_name)
            if not file_name_valid:
                invalid_file_names.append(file_name)
            (
                file_format_atid,
                extra_file_format_atids,
                suffix_found,
            ) = self.identify_file_format(file_suffixes)
            if not file_format_atid:
                files_without_file_format[file_name] = submitted_file_name
                continue
            if extra_file_format_atids:
                files_to_check_extra_files[file_name] = (
                    extra_file_format_atids,
                    suffix_found,
                )
            file_alias = "{}:{}".format(self.project_name, file_name)
            file_properties = {
                self.ALIASES: [file_alias],
                self.FILE_FORMAT: file_format_atid,
                self.FILE_NAME: submitted_file_name,
            }
            if genome_build:
                file_properties[self.GENOME_ASSEMBLY] = genome_build
            if variant_type:
                file_properties[self.VARIANT_TYPE] = variant_type
            file_names_to_items[file_name] = file_properties
            if file_format_atid == self.FILE_FORMAT_FASTQ_ATID:
                fastq_files[file_name] = file_properties
        self.associate_extra_files(
            files_to_check_extra_files, file_names_to_items, files_without_file_format
        )
        file_items = file_names_to_items.values()
        file_aliases = [item[self.ALIASES][0] for item in file_items]
        if invalid_file_names:
            msg = (
                f"Row {row_index} - Invalid file name(s) found:"
                f" {make_conjoined_list(invalid_file_names)}. File names can only"
                " contain alphanumeric characters, underscores, dashes, and periods."
            )
            errors.append(msg)
        if fastq_files:
            invalid_fastq_names, unpaired_fastqs = self.validate_and_pair_fastqs(
                fastq_files
            )
            if invalid_fastq_names:
                msg = (
                    f"Row {row_index} - Invalid FASTQ file name(s) found:"
                    f" {make_conjoined_list(invalid_fastq_names)}. FASTQ file names"
                    f" must contain read information; see documentation for details."
                )
                errors.append(msg)
            if unpaired_fastqs:
                msg = (
                    f"Row {row_index} - No matched pair-end file found for FASTQ file"
                    f" name(s): {make_conjoined_list(unpaired_fastqs)}."
                    f" Matched FASTQ file names must differ only in the read number."
                )
                errors.append(msg)
        if files_without_file_format:
            if self.unidentified_file_format is False:
                accepted_file_extensions = self.get_accepted_file_extensions()
                msg = (
                    "Unable to identify at least 1 file extension on this submission."
                    f" The following extensions are currently accepted:"
                    f" {make_conjoined_list(accepted_file_extensions)}."
                )
                self.errors.append(msg)
                self.unidentified_file_format = True
            msg = (
                f"Row {row_index} - Invalid file extensions provided for the following"
                f" file name(s):"
                f" {make_conjoined_list(list(files_without_file_format.keys()))}."
            )
            errors.append(msg)
        return file_items, file_aliases, errors

    def is_file_name_valid(self, file_name):
        """Validate file name to match schema expectations.

        :param file_name: File name to validate
        :type file_name: str
        :returns: Whether file name is valid
        :rtype: bool
        """
        result = False
        regex_match = self.FILE_NAME_REGEX.match(file_name)
        if regex_match:
            result = True
        return result

    def associate_extra_files(
        self, files_to_check_extra_files, file_names_to_items, files_without_file_format
    ):
        """For files that accept extra files, find them and update the
        metadata accordingly.

        :param files_to_check_extra_files: Mapping of files accepting
            extra files to possible extra file file formats and the
            file's suffix
        :type files_to_check_extra_files: dict
        :param file_names_to_items: Mapping of files to properties
        :type file_names_to_items: dict
        :param files_without_file_format: Mapping of files without
            associated file format to submitted file names
        :type files_without_file_format: dict
        """
        for (
            file_name,
            (extra_file_format_atids, file_suffix),
        ) in files_to_check_extra_files.items():
            file_properties = file_names_to_items.get(file_name)
            if not file_properties:
                log.warning(
                    f"Cannot match a file to its extra files during submission."
                    f" FileFormats may have recursive or nested chains of extra file"
                    f" FileFormats. File name: {file_name}, file suffix: {file_suffix},"
                    f" extra file FileFormat @ids: {extra_file_format_atids}."
                )
                continue
            extra_file_names_and_formats = self.generate_extra_file_names_with_formats(
                file_name, file_suffix, extra_file_format_atids
            )
            for (
                extra_file_names,
                extra_file_format_atid,
            ) in extra_file_names_and_formats:
                for extra_file_name in extra_file_names:
                    existing_file_item = file_names_to_items.get(extra_file_name)
                    if existing_file_item:
                        submitted_file_name = existing_file_item.get(self.FILE_NAME)
                        self.associate_file_with_extra_file(
                            file_properties, submitted_file_name, extra_file_format_atid
                        )
                        del file_names_to_items[extra_file_name]
                        break
                    submitted_file_name = files_without_file_format.get(extra_file_name)
                    if submitted_file_name:
                        self.associate_file_with_extra_file(
                            file_properties, submitted_file_name, extra_file_format_atid
                        )
                        del files_without_file_format[extra_file_name]
                        break

    def generate_extra_file_names_with_formats(
        self, file_name, file_suffix, extra_file_format_atids
    ):
        """For given file, create expected file names for given extra
        file formats.

        :param file_name: File name (without path info)
        :type file_name: str
        :param file_suffix: Suffix found for file
        :type file_suffix: str
        :param extra_file_format_atids: Possible extra file format @id
            identifiers
        :type extra_file_format_atids: list(str)
        :returns: Expected file names and FileFormat @ids for all extra
            files
        :rtype: list(tuple(str, str))
        """
        result = []
        base_file_name = self.get_file_name_without_suffix(file_name, file_suffix)
        for extra_file_format_atid in extra_file_format_atids:
            file_names_for_extra_file_format = []
            extra_file_format = self.extra_file_formats.get(extra_file_format_atid, {})
            extra_file_format_extension = extra_file_format.get(
                self.STANDARD_FILE_EXTENSION
            )
            if extra_file_format_extension:
                file_names_for_extra_file_format.append(
                    self.make_file_name_for_extension(
                        base_file_name, extra_file_format_extension
                    )
                )
            other_extra_file_extensions = extra_file_format.get(
                self.OTHER_ALLOWED_EXTENSIONS, []
            )
            for extension in other_extra_file_extensions:
                file_names_for_extra_file_format.append(
                    self.make_file_name_for_extension(base_file_name, extension)
                )
            if file_names_for_extra_file_format:
                result.append(
                    (file_names_for_extra_file_format, extra_file_format_atid)
                )
        return result

    def get_file_name_without_suffix(self, file_name, suffix):
        """Remove suffix from file name.

        :param file_name: File name (without path)
        :type file_name: str
        :param suffix: File suffix
        :type suffix: str
        :returns: File name without given suffix
        :rtype: str
        """
        suffix = suffix.lstrip(".")
        result = file_name.rstrip(suffix)
        return result.rstrip(".")

    def make_file_name_for_extension(self, base_file_name, extension):
        """Add suffix to given file name.

        :param base_file_name: File name stripped of accepted suffix
        :type base_file_name: str
        :param extension: Suffix to add
        :type extension: str
        :returns: File name with new suffix
        :rtype: str
        """
        base_file_name = base_file_name.rstrip(".")
        extension = extension.lstrip(".")
        return f"{base_file_name}.{extension}"

    def associate_file_with_extra_file(
        self, file_item, extra_file_name, extra_file_format_atid
    ):
        """Update file properties with extra file metadata, if
        required.

        NOTE: PATCHing "extra_files" property does not overwrite the
        existing property but adds the new extra file, so need to check
        the item on the portal (if exists) and see if extra file
        already exists before adding the extra file metadata.

        :param file_item: File properties
        :type file_item: dict
        :param extra_file_name: Extra file name
        :type extra_file_name: str
        :param extra_file_format_atid: @id of FileFormat for extra file
        :type extra_file_format_atid: str
        """
        patch_extra_file = True
        file_alias = file_item.get(self.ALIASES, [""])[0]
        existing_file_item = self.make_get_request(
            file_alias, query_string="frame=object", result_expected=False
        )
        if existing_file_item:
            existing_extra_files = existing_file_item.get(self.EXTRA_FILES, [])
            for existing_extra_file in existing_extra_files:
                existing_extra_file_format = existing_extra_file.get(self.FILE_FORMAT)
                if existing_extra_file_format == extra_file_format_atid:
                    patch_extra_file = False
                    break
        if patch_extra_file:
            extra_file_properties = {
                self.FILE_FORMAT: extra_file_format_atid,
                self.FILE_NAME: extra_file_name,
            }
            existing_extra_files = file_item.get(self.EXTRA_FILES)
            if existing_extra_files:
                existing_extra_files.append(extra_file_properties)
            else:
                file_item[self.EXTRA_FILES] = [extra_file_properties]

    def parse_file_names(self, submitted_file_names):
        """Parse submitted file names.

        :param submitted_file_names: Comma-separated file names
        :type submitted_file_names: str
        :returns: Unique, parsed file names
        :rtype: set(str)
        """
        return set(string_to_array(submitted_file_names))

    def get_accepted_file_extensions(self):
        """Grab all accepted extensions for FileFormats that can be
        used for FileSubmitted items.

        :returns: Unique file extensions in alphabetical order
        :rtype: set(str)
        """
        result = []
        file_format_atids_to_items = self.get_accepted_file_formats()
        for file_format in file_format_atids_to_items.values():
            result.append(file_format.get(self.STANDARD_FILE_EXTENSION))
            result += file_format.get(self.OTHER_ALLOWED_EXTENSIONS, [])
        return sorted(list(set(result)))

    def get_accepted_file_formats(self):
        """Find all FileFormats acceptable for FileSubmitted items as
        well as all FileFormats utilized for extra files.

        Only make this search request once and store as attribute.

        :returns: Acceptable FileFormats found
        :rtype: list(dict)
        """
        if self.accepted_file_formats is None:
            query = "/search/?type=FileFormat&valid_item_types=FileSubmitted"
            search_results = self.search_query(query)
            file_format_atids_to_items = {}
            for file_format in search_results:
                file_format_atid = file_format.get(self.AT_ID)
                file_format_atids_to_items[file_format_atid] = file_format
                extra_file_formats = file_format.get(self.EXTRA_FILE_FORMATS)
                if extra_file_formats:
                    extra_file_format_atids = [
                        item.get(self.AT_ID) for item in extra_file_formats
                    ]
                    self.update_extra_file_formats(extra_file_format_atids)
                    self.associate_file_formats(
                        file_format_atid, extra_file_format_atids
                    )
            self.accepted_file_formats = file_format_atids_to_items
        return self.accepted_file_formats

    def update_extra_file_formats(self, extra_file_format_atids):
        """Update attribute (self.extra_file_formats) with extra file
        FileFormat properties, if not already present.

        :param extra_file_format_atids: FileFormat @ids found for extra
            files
        :type extra_file_format_atid: list(str)
        """
        for file_format_atid in extra_file_format_atids:
            extra_file_format = self.extra_file_formats.get(file_format_atid)
            if extra_file_format:
                continue
            file_format_properties = self.make_get_request(file_format_atid)
            self.extra_file_formats[file_format_atid] = file_format_properties

    def associate_file_formats(self, primary_file_format_atid, extra_file_format_atids):
        """Associate "primary" FileFormats with extra file FileFormats
        via attribute (self.primary_to_extra_file_formats).

        :param primary_file_format_atid: @id for FileFormat accepted
            for "primary" file submission
        :type primary_file_format_atid: str
        :param extra_file_format_atids: @ids for FileFormats acceptable
            for extra files for the "primary" FileFormat
        :type extra_file_format_atids: list(str)
        """
        existing_values = self.primary_to_extra_file_formats.get(
            primary_file_format_atid
        )
        if existing_values is None:
            self.primary_to_extra_file_formats[primary_file_format_atid] = set(
                extra_file_format_atids
            )
        else:
            existing_values.update(extra_file_format_atids)

    def identify_file_format(self, file_suffixes):
        """Find FileFormat(s) that accept the given file extension.

        Attempt to find FileFormats from largest possible extension to
        smallest to provide flexibility for users to name files with
        extensions; e.g. foo_bar.updated.fastq.gz should match to a
        FASTQ file format by not finding a match for the extension
        updated.fastq.gz and then finding one for fastq.gz.

        Cache all file extension --> matched FileFormats so can be
        re-used across entire spreadsheet to avoid repeated identical
        requests.

        :param file_suffixes: Suffixes of submitted file name
        :type file_suffixes: list(str)
        :returns: Valid matching FileFormat @id, associated extra file
            FileFormat @ids, and file extension
        :rtype: tuple(str or None, set(str) or None, str or None)
        """
        file_format_atid = None
        extra_file_formats = None
        suffix_found = None
        for idx in range(len(file_suffixes)):  # Iterate through largest to smallest
            suffix_for_search = "".join(file_suffixes[idx:]).lstrip(".")
            cached_formats = self.file_extensions_to_file_formats.get(suffix_for_search)
            if cached_formats is not None:
                search_result = cached_formats
            else:
                search_result = self.search_file_format_for_suffix(suffix_for_search)
                self.file_extensions_to_file_formats[suffix_for_search] = search_result
            if not search_result:
                continue
            else:
                if len(search_result) == 1:
                    [file_format] = search_result
                    file_format_atid = file_format.get(self.AT_ID)
                    extra_file_formats = self.primary_to_extra_file_formats.get(
                        file_format_atid
                    )
                    suffix_found = suffix_for_search
                break
        return file_format_atid, extra_file_formats, suffix_found

    def search_file_format_for_suffix(self, suffix):
        """Find all FileFormats that can be used for the given file
        extension.

        NOTE: We grab all FileFormats that can be used for FileSubmitted
        items via self.get_accepted_file_formats() (caches search
        result) and then iterate through them here. Expecting
        reasonably small number of accepted FileFormats so iterating
        through them for every extension rather than making separate
        search request for all such extensions.

        :param suffix: File extension
        :type suffix: str
        :returns: FileFormats accepting the extension
        :rtype: list
        """
        result = []
        file_format_atids_to_items = self.get_accepted_file_formats()
        for file_format in file_format_atids_to_items.values():
            standard_file_extension = file_format.get(self.STANDARD_FILE_EXTENSION, "")
            other_allowed_extensions = file_format.get(
                self.OTHER_ALLOWED_EXTENSIONS, []
            )
            alternative_suffix = "." + suffix
            if (
                suffix == standard_file_extension
                or suffix in other_allowed_extensions
                or alternative_suffix == standard_file_extension
                or alternative_suffix in other_allowed_extensions
            ):
                result.append(file_format)
                continue
        return result

    def search_query(self, query):
        """Make GET request for given search query and return items
        found.

        :param query: Search query
        :type query: str
        :returns: Items matching query
        :rtype: list
        """
        return self.make_get_request(query).get("@graph", [])

    def make_get_request(self, url, query_string=None, result_expected=True):
        """Make GET request.

        Follow response if re-directed, and handle response errors.

        :param url: URL to GET
        :type url: str
        :param query_string: Query string add-on
        :type query_string: str or None
        :returns: GET response
        :rtype: dict
        """
        if not url.startswith("/"):
            url = "/" + url
        try:
            response = self.virtualapp.get(url, params=query_string, status=[200, 301])
            if response.status_code == 301:
                response = response.follow()
            result = response.json
        except (VirtualAppError, AppError):
            result = {}
            if result_expected:
                log.warning(
                    f"GET request failed when a result was expected."
                    f" URL: {url}, parameters: {query_string}."
                )
        return result

    def validate_and_pair_fastqs(self, fastq_files):
        """Enforce increased validation for FASTQ files.

        Require strict name formatting and pairing of FASTQs.

        Updates paired file properties accordingly.

        :param fastq_files: Mapping of file names to corresponding item
            properties
        :type fastq_files: dict
        :returns: File names for which paired-end unknown, file names
            with paired-end but not paired
        :rtype: tuple(list, list)
        """
        fastq_paired_end_1 = {}
        fastq_paired_end_2 = {}
        fastq_unknown_paired_end = []
        for file_name, file_item in fastq_files.items():
            paired_end = self.get_paired_end_from_name(file_name)
            if paired_end == 1:
                file_item[self.PAIRED_END] = self.PAIRED_END_1
                fastq_paired_end_1[file_name] = file_item
            elif paired_end == 2:
                file_item[self.PAIRED_END] = self.PAIRED_END_2
                fastq_paired_end_2[file_name] = file_item
            else:
                fastq_unknown_paired_end.append(file_name)
        unpaired_fastqs = self.pair_fastqs_by_name(
            fastq_paired_end_1, fastq_paired_end_2
        )
        return fastq_unknown_paired_end, unpaired_fastqs

    def get_paired_end_from_name(self, file_name):
        """Identify unique FASTQ paired-end from file name.

        :param file_name: File name
        :type file_name: str
        :returns: Paired-end, if found and unique
        :rtype: str or None
        """
        result = None
        matches = []
        if self.PAIRED_END_1_REGEX.search(file_name):
            matches.append(1)
        if self.PAIRED_END_2_REGEX.search(file_name):
            matches.append(2)
        if len(matches) == 1:
            [result] = matches
        return result

    def pair_fastqs_by_name(self, fastq_paired_end_1, fastq_paired_end_2):
        """Attempt to pair FASTQ files by name, updating File
        properties accordingly.

        NOTE: Expecting paired-end 1 and 2 file names to match exactly
        besides the paired-end info within the name.

        :param fastq_paired_end_1: Mapping of file names --> File
            properties for paired-end 1 FASTQs
        :type fastq_paired_end_1: dict
        :param fastq_paired_end_2: Mapping of file names --> File
            properties for paired-end 2 FASTQs
        :type fastq_paired_end_2: dict
        :returns: File names that could not be paired
        :rtype: list
        """
        unmatched_fastqs = []
        matched_paired_end_2 = set()
        for file_name, file_item in fastq_paired_end_1.items():
            expected_paired_end_2_name = self.make_expected_paired_end_2_name(file_name)
            match = fastq_paired_end_2.get(expected_paired_end_2_name)
            if match is not None:
                matched_paired_end_2.add(expected_paired_end_2_name)
                match_alias = match[self.ALIASES][0]
                file_item[self.RELATED_FILES] = [
                    {
                        self.RELATIONSHIP_TYPE: self.PAIRED_WITH,
                        self.FILE: match_alias,
                    }
                ]
            else:
                unmatched_fastqs.append(file_name)
        for file_name in fastq_paired_end_2.keys():
            if file_name not in matched_paired_end_2:
                unmatched_fastqs.append(file_name)
        return unmatched_fastqs

    def make_expected_paired_end_2_name(self, file_name):
        """Create expected paired-end 2 file name from a paired-end 1
        file name.

        :param file_name: Paired-end 1 file name
        :type file_name: str
        :returns: Expected paired-end 2 file name
        :rtype: str
        """

        def r1_to_r2(match):
            return match.group().replace("1", "2")

        return re.sub(self.PAIRED_END_1_REGEX, r1_to_r2, file_name)


class PedigreeRow:
    """
    Class that holds relevant information for processing of a singular row from a
    Family History case spreadsheet, creating an instance of the metadata extracted
    from the current row. Called within the class PedigreeMetadata.
    """

    # Schema constants
    PHENOTYPIC_FEATURES = "phenotypic_features"
    PHENOTYPIC_FEATURE = "phenotypic_feature"
    DISORDERS = "disorders"
    DISORDER = "disorder"
    ONSET_AGE = "onset_age"
    ONSET_AGE_UNITS = "onset_age_units"
    DIAGNOSTIC_CONFIDENCE = "diagnostic_confidence"
    IS_PRIMARY_DIAGNOSIS = "is_primary_diagnosis"
    YEAR = "year"

    # Spreadsheet constants
    PHENOTYPES = "phenotypes"
    PRIMARY_DIAGNOSIS = "primary_diagnosis"
    PRIMARY_DIAGNOSIS_ONSET_AGE = "diagnosis_onset_age"
    PRIMARY_DIAGNOSIS_ONSET_AGE_UNITS = "diagnosis_onset_age_units"
    HPO_TERMS = "hpo_terms"
    MONDO_TERMS = "mondo_terms"

    # Class constants
    PROPERTY_VALUES_TO_UPPER = set([SS_SEX])

    def __init__(self, metadata, idx, project, institution):
        """
        :param dict metadata: dictionary of form {column heading1: row value1, ...}, for the given row
        :param int idx: current row's number within original submitted spreadsheet
        :param str project: project name
        :param str institution: institution name

        :ivar str project: initial value: project
        :ivar str institution: initial value: institution
        :ivar int row: initial value: idx
        :ivar dict metadata: initial value: metadata
        :ivar errors: errors arising from invalid MONDO terms, HPO terms, etc., within row cells
        :vartype errors: list[str]
        :ivar str indiv_alias: alias of this row's individual
        :ivar individual: single DB-item-worth of json, for current row's individual
        :vartype individual: MetadataItem object
        :ivar bool proband: True if individual of this current row is this family's proband
        """
        self.project = project
        self.institution = institution
        self.row = idx
        self.metadata = metadata
        self.errors = []
        if not self.found_missing_values():
            self.indiv_alias = generate_individual_alias(
                project, metadata[SS_INDIVIDUAL_ID]
            )
            self.individual = self.extract_individual_metadata()
            self.proband = self.is_proband()

    def found_missing_values(self):
        # makes sure no required values from spreadsheet are missing
        missing_required = [
            col
            for col in REQUIRED_COLS_FOR_PEDIGREE
            if col not in self.metadata or not self.metadata[col]
        ]
        if missing_required:
            self.errors.append(
                "Row {} - missing required field(s) {}. This row cannot be processed.".format(
                    self.row, ", ".join(missing_required)
                )
            )
        return len(self.errors) > 0

    def validate_ontology_terms(self, ontology_term_input, match_pattern):
        """Identify valid and invalid ontology terms in provided string
        using given term regex.

        :param ontology_term_input: Spreadsheet cell input containing
            comma-separated ontology terms
        :type ontology_term_input: str
        :param match_pattern: Compiled regex pattern to validate
            ontology identifiers
        :type match_pattern: object
        :returns: Valid and invalid ontology terms
        :rtype: tuple(set, set)
        """
        valid_terms = set()
        invalid_terms = set()
        ontology_terms = string_to_array(ontology_term_input)
        formatted_ontology_terms = map(format_ontology_term_with_colon, ontology_terms)
        for idx, formatted_ontology_term in enumerate(formatted_ontology_terms):
            if match_pattern.match(formatted_ontology_term):
                valid_terms.add(formatted_ontology_term)
            else:
                invalid_terms.add(ontology_terms[idx])
        return valid_terms, invalid_terms

    def update_phenotypes(self, individual_metadata):
        """Process spreadsheet phenotype metadata.

        Reformat validated HPO terms into sub-embedded object and
        update Individual metadata in place.

        :param individual_metadata: Raw Individual properties as parsed
            from spreadsheet.
        :type: dict
        """
        phenotypes = []
        input_phenotypes = individual_metadata.get(self.PHENOTYPIC_FEATURES)
        if input_phenotypes:
            phenotypes = self.get_phenotypes(input_phenotypes)
        if phenotypes:
            individual_metadata[self.PHENOTYPIC_FEATURES] = phenotypes
        else:
            individual_metadata.pop(self.PHENOTYPIC_FEATURES, None)

    def get_phenotypes(self, phenotypes_input):
        """Validate input HPO identifiers and format to sub-embedded
        object.

        Add error if any HPO identifiers not validated.

        :param phenotypes_input: Raw, comma-separated HPO terms from
            spreadsheet
        :type phenotypes_input: str
        :returns: Formatted validated phenotypes
        :rtype: list(dict)
        """
        result = []
        valid_hpo_terms, invalid_hpo_terms = self.validate_ontology_terms(
            phenotypes_input, HPO_TERM_ID_PATTERN
        )
        if invalid_hpo_terms:
            msg = (
                "Row %s - column %s contains the following invalid HPO identifier(s):"
                " %s. Please edit and resubmit."
            ) % (self.row, self.HPO_TERMS.upper(), ", ".join(invalid_hpo_terms))
            self.errors.append(msg)
        result += [
            {self.PHENOTYPIC_FEATURE: self.format_phenotype_atid(hpo_term)}
            for hpo_term in valid_hpo_terms
        ]
        return result

    def format_phenotype_atid(self, hpo_term):
        """Convert HPO term to @id.

        :param hpo_term: Validated HPO identifier
        :type hpo_term: str
        :returns: LinkTo (as @id) for phenotype item
        :rtype: str
        """
        return f"/phenotypes/{hpo_term}/"

    def update_disorders(self, individual_metadata):
        """Process spreadsheet disorder metadata.

        Reformat validated MONDO terms into sub-embedded objects and
        update Individual metadata in place.

        :param individual_metadata: Raw Individual properties as parsed
            from spreadsheet.
        :type: dict
        """
        disorders = []
        primary_disorder = individual_metadata.get(self.PRIMARY_DIAGNOSIS)
        onset_age = individual_metadata.get(self.PRIMARY_DIAGNOSIS_ONSET_AGE)
        onset_age_units = individual_metadata.get(
            self.PRIMARY_DIAGNOSIS_ONSET_AGE_UNITS
        )
        diagnostic_confidence = individual_metadata.get(self.DIAGNOSTIC_CONFIDENCE)
        secondary_disorders = individual_metadata.get(self.DISORDERS)
        if primary_disorder:
            disorders += self.get_primary_disorder(
                primary_disorder=primary_disorder,
                onset_age=onset_age,
                onset_age_units=onset_age_units,
                diagnostic_confidence=diagnostic_confidence,
            )
        if secondary_disorders:
            disorders += self.get_secondary_disorders(secondary_disorders)
        if disorders:
            individual_metadata[self.DISORDERS] = disorders
        else:
            individual_metadata.pop(self.DISORDERS, None)
        for input_term in [
            self.PRIMARY_DIAGNOSIS,
            self.PRIMARY_DIAGNOSIS_ONSET_AGE,
            self.PRIMARY_DIAGNOSIS_ONSET_AGE_UNITS,
            self.DIAGNOSTIC_CONFIDENCE,
        ]:
            individual_metadata.pop(input_term, None)

    def get_primary_disorder(
        self,
        primary_disorder=None,
        onset_age=None,
        onset_age_units=None,
        diagnostic_confidence=None,
    ):
        """Validate primary disorder MONDO term and format sub-embedded
        object, including optional associated data.

        Add error if any MONDO identifiers not validated, more than one
        MONDO term given, or onset age not formatted correctly.

        :param primary_disorder: MONDO term(s) from spreadsheet
        :type primary_disorder: str
        :param onset_age: Onset age from spreadsheet
        :type onset_age: str
        :param onset_age_units: Onset age units from spreadsheet
        :type onset_age_units: str
        :param diagnostic_confidence: Diagnostic confidence from
            spreadsheet
        :type diagnostic_confidence: str
        :returns: Formatted, validated disorders for Individual item
        :rtype: list(dict)
        """
        result = []
        valid_mondo_terms, invalid_mondo_terms = self.validate_ontology_terms(
            primary_disorder, MONDO_TERM_ID_PATTERN
        )
        if invalid_mondo_terms:
            msg = (
                "Row %s - column %s contains the following invalid MONDO identifier(s): %s."
                " Note that only one identifier should be provided for a primary"
                " diagnosis. Please edit and resubmit."
            ) % (
                self.row,
                self.PRIMARY_DIAGNOSIS.upper(),
                ", ".join(invalid_mondo_terms),
            )
            self.errors.append(msg)
        if len(valid_mondo_terms) > 1:  # Only expecting 1 currently 20220512 -drr
            msg = (
                "Row %s - column %s contains more than one valid MONDO identifier: %s."
                " Please edit and resubmit."
            ) % (self.row, self.PRIMARY_DIAGNOSIS.upper(), ", ".join(valid_mondo_terms))
            self.errors.append(msg)
        elif valid_mondo_terms:
            for mondo_term_id in valid_mondo_terms:
                primary_disorder_properties = {}
                primary_disorder_properties[self.DISORDER] = self.format_disorder_atid(
                    mondo_term_id
                )
                primary_disorder_properties[self.IS_PRIMARY_DIAGNOSIS] = True
                if onset_age:
                    if onset_age.isnumeric():
                        primary_disorder_properties[self.ONSET_AGE] = int(onset_age)
                        if onset_age_units is None:
                            onset_age_units = self.YEAR
                        primary_disorder_properties[
                            self.ONSET_AGE_UNITS
                        ] = onset_age_units
                    else:
                        msg = (
                            "Row %s - column %s contains a non-integer onset age: %s."
                            " Please edit and resubmit."
                        ) % (self.row, self.DIAGNOSIS_ONSET_AGE.upper(), onset_age)
                        self.errors.append(msg)
                if diagnostic_confidence:
                    primary_disorder_properties[
                        self.DIAGNOSTIC_CONFIDENCE
                    ] = diagnostic_confidence.lower()
                result.append(primary_disorder_properties)
        return result

    def format_disorder_atid(self, mondo_term):
        """Convert MONDO term to @id.

        :param mondo_term: Validated MONDO identifier
        :type mondo_term: str
        :returns: LinkTo (as @id) for disorder item
        :rtype: str
        """
        return f"/disorders/{mondo_term}/"

    def get_secondary_disorders(self, disorders):
        """Validate disorder MONDO term(s) and format sub-embedded
        object.

        As opposed to a "primary" disorder, these lack additional
        associated metadata.

        Add error if any MONDO identifiers not validated.

        :param disorders: Comma-separated MONDO terms from spreadsheet
        :type disorders: str
        :returns: Formatted, validated disorders for Individual item
        """
        result = []
        valid_mondo_terms, invalid_mondo_terms = self.validate_ontology_terms(
            disorders, MONDO_TERM_ID_PATTERN
        )
        if invalid_mondo_terms:
            msg = (
                "Row %s - column %s contains the following invalid MONDO ontology"
                " identifier(s): %s. Please edit and resubmit."
            ) % (self.row, self.MONDO_TERMS.upper(), ", ".join(invalid_mondo_terms))
            self.errors.append(msg)
        result += [
            {self.DISORDER: self.format_disorder_atid(mondo_term)}
            for mondo_term in valid_mondo_terms
        ]
        return result

    def extract_individual_metadata(self):
        info = {"aliases": [self.indiv_alias]}
        simple_fields = [
            "family_id",
            "individual_id",
            "sex",
            "age",
            "age_units",
            "clinic_notes",
            "ancestry",
            "quantity",
            "life_status",
            "cause_of_death",
            "age_at_death",
            "age_at_death_units",
            "gestational_age",
            "cause_of_infertility",
            "primary_diagnosis",
            "diagnostic_confidence",
        ]
        info = map_fields(self.metadata, info, simple_fields, "individual")
        update_value_capitalization(info, to_upper=self.PROPERTY_VALUES_TO_UPPER)
        for field in info:
            if field.startswith("is_"):
                info[field] = is_yes_value(info[field])
        for field in [
            "mother",
            "father",
        ]:  # turn mother and father IDs into item aliases
            if info.get(field):
                info[field] = generate_individual_alias(self.project, info[field])
        info["proband"] = self.is_proband()
        if info.get("age") and not info.get("age_units"):
            info["age_units"] = "year"
        if info.get("ancestry"):
            info["ancestry"] = string_to_array(info["ancestry"])
        if info.get("life_status") == "U":  # TODO: Make use_abbrev property-specific
            info["life_status"] = "unknown"
        for col in ["age", "birth_year", "age_at_death", "gestational_age", "quantity"]:
            if info.get(col) and isinstance(info[col], str) and info[col].isnumeric():
                info[col] = int(info[col])
        self.update_disorders(info)
        self.update_phenotypes(info)
        return MetadataItem(info, self.row, "individual")

    def is_proband(self):
        return is_yes_value(self.metadata["proband"])


class PedigreeMetadata:
    """
    Class that holds relevant information for processing of a Family History case,
    thus creating an instance of metadata extracted from the submitted spreadsheet,
    row by row.
    """

    def __init__(self, vapp, rows, project, institution, ingestion_id):
        """
        :param vapp: used for pytesting
        :type vapp: webtest TestApp object
        :param rows: populated within class method create_row_tuples() -- the tuples consist
            of the row dictionary, which contains key-value pairs of header of current column and its cell value within
            that row; the integer is the row number within the overall spreadsheet
        :type rows: list[tuple(dict, int)]
        :param project: project identifier (e.g. contains status, date created, project title, @id, etc.)
        :type project: dict
        :param institution: institution identifier
        :type institution: dict
        :param ingestion_id: ID of current ingestion, determined by the name of the key of the given S3 bucket
        :type ingestion_id: str

        :ivar virtualapp: initial value: vapp
        :vartype virtualapp: webtest TestApp object
        :ivar rows: initial value: rows
        :vartype rows: list[tuple(dict, int)]
        :ivar str project: name of project
        :ivar str project_atid: @ID of the project
        :ivar str institution: name of institution
        :ivar str institution_atid: @ID of the institution
        :ivar str ingestion_id: initial value: ingestion_id
        :ivar dict individuals: dictionary of each individual within the spreadsheet and key-value pairs of individual metadata
        :ivar dict families: dictionary representing the proband and corresponding family members
        :ivar errors: errors arising from failure in validation of PedigreeRows
        :vartype errors: list[str]
        :ivar dict json_out: json file used for subsequent validation function
        """
        self.virtualapp = vapp
        self.rows = rows
        self.project = project.get("name")
        self.project_atid = project.get("@id")
        self.institution = institution.get("name")
        self.institution_atid = institution.get("@id")
        self.ingestion_id = ingestion_id
        self.individuals = {}
        self.families = {}
        self.errors = []
        self.json_out = {}
        self.process_rows()
        self.create_json_out()

    def add_individual_metadata(self, item):
        """
        Looks at metadata from a PedigreeRow object, one DB itemtype at a time
        and compares and adds it. If each item is not
        already represented in metadata for current AccessionMetadata instance,
        it is added; if it is represented, missing fields are added to item.
        """
        previous = self.individuals
        prev = [p for p in previous.keys()]
        if item.alias not in prev:
            previous[item.alias] = item.metadata
        else:
            for key in item.metadata:
                if key not in previous[item.alias]:
                    previous[item.alias][key] = item.metadata[key]

    def add_family_metadata(self):
        """
        Creates family metadata based on family_id for each individual in sheet.

        In some scenarios we will have multiple Family items in the DB for the same family,
        if the proband needs to be changed (e.g. the family has 2 affected siblings). In these cases
        we want to update the family history for both families, so we will look up the family ID and patch
        all families with the ID.
        """
        family_metadata = {}
        for alias, item in self.individuals.items():
            family_metadata.setdefault(
                item["family_id"],
                {
                    "family_id": item["family_id"],
                    "members": [],
                    "ingestion_ids": [self.ingestion_id],
                },
            )
            family_metadata[item["family_id"]]["members"].append(alias)
            if item.get("proband", False):
                if "proband" not in family_metadata[item["family_id"]]:
                    family_metadata[item["family_id"]]["proband"] = alias
                    family_metadata[item["family_id"]]["aliases"] = [
                        self.project + ":family-" + item["individual_id"]
                    ]
                else:
                    msg = (
                        f'More than one proband indicated for family {item["family_id"]}.'
                        " Please indicate a single proband in the spreadsheet and resubmit."
                    )
                    self.errors.append(msg)
            del item["family_id"]
        final_family_dict = {}
        for key, value in family_metadata.items():
            try:
                family_matches = self.virtualapp.get(
                    f"/search/?type=Family&family_id={key}"
                )
            except Exception:
                # if family not in DB, create a new one
                # first make sure a proband is indicated for a family if its not already in DB
                if not value.get("proband"):
                    msg = f'No proband indicated for family {value["family_id"]}. Please edit and resubmit.'
                    self.errors.append(msg)
                else:
                    final_family_dict[value["aliases"][0]] = value
            else:
                for match in family_matches.json["@graph"]:
                    final_family_dict[match["@id"]] = value
                    if value.get("proband"):
                        phenotypes = list(
                            set(
                                [
                                    item["phenotypic_feature"]
                                    for item in self.individuals[value["proband"]].get(
                                        "phenotypic_features", []
                                    )
                                ]
                            )
                        )
                        # Add other family member phenotypes if proband phenotypes < 4
                        if len(phenotypes) < 4:
                            for member in value["members"]:
                                if member != value["proband"]:
                                    member_phenotypes = [
                                        item["phenotypic_feature"]
                                        for item in self.individuals[member].get(
                                            "phenotypic_features", []
                                        )
                                    ]
                                    phenotypes.extend(member_phenotypes)
                                    phenotypes = list(set(phenotypes))
                                    if len(phenotypes) >= 4:
                                        break
                        if phenotypes:
                            final_family_dict[match["@id"]][
                                "family_phenotypic_features"
                            ] = phenotypes[:4]
                        del final_family_dict[match["@id"]]["proband"]
                        del final_family_dict[match["@id"]]["aliases"]
        return final_family_dict

    def check_individuals(self):
        """
        Make sure that every value in mother ID or father ID columns are also in sheet in same family.
        If a mother or father ID does not have a line in the sheet, just create minimal metadata for it
        and add it to the family.
        """
        parent_dict = {"mother": "F", "father": "M"}
        for fam_alias, fam_metadata in self.families.items():
            for member in fam_metadata["members"]:
                individual = self.individuals[member]
                for parent in ["mother", "father"]:
                    if individual.get(parent):
                        if individual[parent] not in fam_metadata["members"]:
                            info = {
                                "individual_id": individual[parent],
                                "sex": parent_dict[parent],
                            }
                            self.individuals[individual[parent]] = info
                            fam_metadata["members"].append(individual[parent])

    def process_rows(self):
        """
        Method for iterating over spreadsheet rows to process each one and compare it to previous rows.
        Spreadsheet rows are saved as tuples -- (dict, int), where the dictionary is of the form
        {column heading1: row value1, ...}, and the integer is the row number within the spreadsheet.
        """
        for (row, row_number) in self.rows:
            try:
                processed_row = PedigreeRow(
                    row, row_number, self.project, self.institution
                )
                self.errors.extend(processed_row.errors)
                self.add_individual_metadata(processed_row.individual)
            except AttributeError:
                continue
        self.families = self.add_family_metadata()
        self.check_individuals()

    def create_json_out(self):
        """
        Creates final json that can be used for subsequent validation function.
        """
        itemtype_dict = {"family": self.families, "individual": self.individuals}
        for key in itemtype_dict:
            self.json_out[key] = {}
            for alias, metadata in itemtype_dict[key].items():
                new_metadata = {k: v for k, v in metadata.items() if v}
                new_metadata["project"] = self.project_atid
                new_metadata["institution"] = self.institution_atid
                if key == "individual" and "proband" in new_metadata:
                    del new_metadata["proband"]
                self.json_out[key][alias] = new_metadata
            self.json_out["errors"] = self.errors


class SpreadsheetProcessing:
    """
    Class that holds relevant information for processing of a single spreadsheet.
    After initial processing of header and rows, will create an instance of relevant
    'Metadata' class to hold all metadata extracted from spreadsheet.
    """

    REQUIRED_COLUMNS = []
    METADATA_CLASS = None
    COLUMN_HEADER_REMOVAL_PATTERN = re.compile(r"\(.*\)|[:*]")

    def __init__(
        self,
        vapp,
        xls_data,
        project,
        institution,
        ingestion_id,
        submission_type="accessioning",
    ):
        """
        :param vapp: used for pytesting
        :type vapp: webtest TestApp object
        :param xls_data: contains row cell values from spreadsheet
        :type xls_data: generator
        :param project: project identifier (e.g. contains status, date created, project title, @id, etc.)
        :type project: dict
        :param institution: institution identifier
        :type institution: dict
        :param ingestion_id: ID of current ingestion, determined by the name of the key of the given S3 bucket
        :type ingestion_id: str
        :param submission_type: determines whether submitting 'accessioning' (a case) or 'family_history' (pedigree)
        :type submission_type: str

        :cvar REQUIRED_COLUMNS: required column headers within submitted spreadsheet
        :vartype REQUIRED_COLUMNS: list[str]
        :cvar METADATA_CLASS: either AccessionMetadata or PedigreeMetadata class, based on submission type,
            and populated in class method extract_metadata()
        :vartype METADATA_CLASS: AccessionMetadata or PedigreeMetadata instance
        :cvar COLUMN_HEADER_REMOVAL_PATTERN: for parsing through Header row from spreadsheet, in reformat_column_header()
        :vartype COLUMN_HEADER_REMOVAL_PATTERN: regex

        :ivar virtualapp: initial value: vapp
        :vartype virtualapp: webtest TestApp object
        :ivar input: initial value: xls_data
        :vartype input: generator
        :ivar project: initial value: project
        :vartype project: dict
        :ivar institution: initial value: institution
        :vartype institution: dict
        :ivar output: json file used for subsequent validation after population of the respective metadata object
        :vartype output: dict
        :ivar errors: errors arising from failure in validation of header and spreadsheet contents
        :vartype errors: list[str]
        :ivar keys: holds spreadsheet's header values (i.e. column labels)
        :vartype keys: list[str]
        :ivar preheader_rows_counter: number of rows above the header in the spreadsheet
        :vartype preheader_rows_counter: int
        :ivar rows: populated within class method create_row_tuples() -- the tuples consist
            of the row dictionary, which contains key-value pairs of header of current column and its cell value within
            that row; the integer is the row number within the overall spreadsheet
        :vartype rows: list[tuple(dict, int)]
        :ivar passing: toggled to True once metadata class is populated in method extract_metadata()
        :vartype passing: bool
        """
        self.virtualapp = vapp
        self.input = xls_data
        self.project = project
        self.institution = institution
        self.ingestion_id = ingestion_id
        self.submission_type = submission_type
        self.output = {}
        self.errors = []
        self.keys = []
        self.preheader_rows_counter = 0
        self.rows = []
        self.passing = False

        # Once a satisfactory header is found, create list of tuples for row values
        if self.header_found():
            self.create_row_tuples()
        # If row tuples were created, populate the metadata object
        if self.rows:
            self.extract_metadata()

    def header_found(self):
        """
        The header we are looking for may not always be the first row - some iterations of the
        submission spreadsheet had super-headings to group columns into categories.
        :returns: True if correct type of header is found ("Individual ID*" present),
            else, False
        :rtype: bool
        """
        while self.input:
            try:
                keys = next(self.input)
                self.keys = [self.reformat_column_header(entry) for entry in keys]
                self.preheader_rows_counter += 1
                if "individual id" in self.keys:
                    return True
            except StopIteration:
                break
        msg = 'Column headers not detected in spreadsheet! "Individual ID*" column must be present in header.'
        self.errors.append(msg)
        return False

    @classmethod
    def reformat_column_header(cls, cell_entry):
        """Reformat column header from spreadsheet.

        Remove parentheses contents/undesired characters to allow more
        customization/commentary in spreadsheets given to users.

        :param cell_entry: Spreadsheet cell content
        :type cell_entry: str
        :returns: Reformatted entry content
        :rtype: str
        """
        return re.sub(cls.COLUMN_HEADER_REMOVAL_PATTERN, "", cell_entry).strip().lower()

    def create_row_tuples(self):
        """
        Turns each row into a tuple consisting of a dictionary of form {column heading1: row value1, ...},
        and integer representing the row number. Overall tuple: ({column heading1: row value1, ...}, row number)

        :returns: list of formatted rows and row position
        :rtype: list of tuples (dict, int)
        """
        missing = [col for col in self.REQUIRED_COLUMNS if col not in self.keys]
        if missing:
            msg = (
                'Column(s) "{}" not found in spreadsheet! Spreadsheet cannot be processed.'
            ).format('", "'.join(missing))
            self.errors.append(msg)
        else:
            for i, row in enumerate(self.input):
                r = [val for val in row]
                # skip comments/description/blank row if present
                if "y/n" in "".join(r).lower() or "".join(r) == "":
                    continue
                row_dict = {self.keys[i]: item for i, item in enumerate(r)}
                self.rows.append((row_dict, i + self.preheader_rows_counter + 1))

    def extract_metadata(self):
        """
        Populates the specified metadata class (either AccessionMetadata or PedigreeMetadata) with the
        formatted tuples for the rows, defined in create_row_tuples().
        """
        current_args = [
            self.virtualapp,
            self.rows,
            self.project,
            self.institution,
            self.ingestion_id,
        ]
        result = self.METADATA_CLASS(*current_args)
        self.output = result.json_out
        self.errors.extend(result.errors)
        self.passing = True


class AccessionProcessing(SpreadsheetProcessing):
    """
    Class that holds relevant information for processing of a single accessioning spreadsheet.
    After initial processing of header and rows, will create an instance of AccessionMetadata
    to hold all metadata extracted from spreadsheet. Refer to parent class SpreadsheetProcessing.
    """

    REQUIRED_COLUMNS = REQUIRED_COLS_FOR_ACCESSIONING
    METADATA_CLASS = AccessionMetadata


class PedigreeProcessing(SpreadsheetProcessing):
    """
    Class that holds relevant information for processing of a single pedigree/family history spreadsheet.
    After initial processing of header and rows, will create an instance of PedigreeMetadata
    to hold all metadata extracted from spreadsheet. Refer to parent class SpreadsheetProcessing.
    """

    REQUIRED_COLUMNS = REQUIRED_COLS_FOR_PEDIGREE
    METADATA_CLASS = PedigreeMetadata


def xls_to_json(vapp, xls_data, project, institution, ingestion_id, submission_type):
    """
    Wrapper for SpreadsheetProcessing that returns expected values:
    result.output - metadata to be submitted in json
    result.passing - whether submission "passes" this part of the code and can move
        on to the next step.
    """
    if submission_type == "accessioning":
        result = AccessionProcessing(
            vapp,
            xls_data=xls_data,
            project=project,
            institution=institution,
            ingestion_id=ingestion_id,
            submission_type=submission_type,
        )
    elif submission_type == "family_history":
        result = PedigreeProcessing(
            vapp,
            xls_data=xls_data,
            project=project,
            institution=institution,
            ingestion_id=ingestion_id,
            submission_type=submission_type,
        )
    else:
        raise ValueError(
            f"{submission_type} is not a valid submission_type argument,"
            ' expected values are "accessioning" or "family_history"'
        )
    result.output["errors"] = result.errors
    return result.output, result.passing


def compare_with_db(virtualapp, alias):
    try:  # check if already in db
        result = virtualapp.get("/" + alias + "/?frame=object")
        if result.status_code == 301:
            msg = json.loads(result.body).get("message", "")
            result = virtualapp.get(msg[msg.index("/") : msg.index(";")])
    except Exception as e:  # if not in db
        if "HTTPNotFound" in str(e):
            return None
    else:
        return result.json


def validate_item(virtualapp, item, method, itemtype, aliases, atid=None):
    data = deepcopy(item)
    if data.get("filename"):
        del data["filename"]
    if method == "post":
        try:
            validation = virtualapp.post_json(
                "/{}/?check_only=true".format(itemtype), data
            )
            ignored(validation)  # should it be? why did we assign it? -kmp 18-Sep-2020
        except (AppError, VirtualAppError) as e:
            return parse_exception(e, aliases)
        else:
            return
    elif method == "patch":
        try:
            validation = virtualapp.patch_json(
                atid + "?check_only=true", data, status=200
            )
            ignored(validation)  # should it be? why did we assign it? -kmp 18-Sep-2020
        except (AppError, VirtualAppError) as e:
            return parse_exception(e, aliases)
        else:
            return
    else:
        raise ValueError("Unrecognized method -- must be 'post' or 'patch'")


def parse_exception(e, aliases):
    """
    ff_utils functions raise an exception when the expected code is not returned.
    This response is a pre-formatted text, and this function will get the resonse json
    out of it. [Adapted from Submit4DN]
    """
    try:
        # try parsing the exception
        if isinstance(e, VirtualAppError):
            text = e.raw_exception.args[0]
        else:
            text = e.args[0]
        resp_text = text[text.index("{") : -1]
        resp_dict = json.loads(resp_text.replace('\\"', "'").replace("\\", ""))
    except Exception:  # pragma: no cover
        raise e
    if resp_dict.get("description") == "Failed validation":
        keep = []
        resp_list = [
            error["name"] + " - " + error["description"]
            for error in resp_dict["errors"]
        ]
        for error in resp_list:
            # if error is caused by linkTo to item not submitted yet but in aliases list,
            # remove that error
            if "not found" in error and error.split("'")[1] in aliases:
                continue
            else:
                if error.startswith("Schema: "):
                    error = error[8:]
                if error.index("- ") > 0:
                    field_name = error[: error.index(" - ")]
                    field = None
                    if field_name in GENERIC_FIELD_MAPPINGS["sample"].values():
                        field = [
                            key
                            for key, val in GENERIC_FIELD_MAPPINGS["sample"].items()
                            if val == field_name
                        ][0]
                    elif field_name == "requisition_acceptance.accepted_rejected":
                        field = "Req Accepted Y\\N"
                    error = map_enum_options(field_name, error)
                    if not field:
                        field = field_name.replace("_", " ")
                    error = "field: " + error.replace(field_name, field)
                    if "phenotypic feature" in field:
                        if "family phenotypic features" in field:
                            # family phenotypic features error is redundant to individual phenotypes
                            # from POV of user, so remove
                            continue
                        if "/phenotypes/" in error:  # find term name instead of @id
                            hpo_idx = error.index("/phenotypes/") + 12
                            hpo_term = error[hpo_idx : error.index("/", hpo_idx)]
                        else:
                            hpo_term = error.split("'")[1]
                        if error.endswith("not found"):
                            error = (
                                "HPO terms - HPO term {} not found in database."
                                " Please check HPO ID and resubmit."
                            ).format(hpo_term)
                    keep.append(error)
                elif "Additional properties are not allowed" in error:
                    keep.append(error[2:])
        return keep
    else:
        raise e


def map_enum_options(fieldname, error_message):
    if fieldname == "requisition_acceptance.accepted_rejected":
        error_message = error_message.replace("['Accepted', 'Rejected']", "['Y', 'N']")
    elif fieldname == "specimen_accepted":
        error_message = error_message.replace("['Yes', 'No']", "['Y', 'N']")
    return error_message


def compare_fields(profile, aliases, json_item, db_item):
    to_patch = {}
    for field in json_item:
        if field == "filename":
            if db_item.get("status") in [
                "uploading",
                "upload failed",
                "to be uploaded by workflow",
            ] or json_item["filename"].split("/")[-1] != db_item.get("filename"):
                to_patch["filename"] = json_item["filename"]
            continue
        # if not an array, patch field gets overwritten (if different from db)
        if profile["properties"][field]["type"] != "array":
            val = json_item[field]
            if profile["properties"][field]["type"] == "string" and val in aliases:
                val = aliases[val]
            if val != db_item.get(field):
                to_patch[field] = val
        else:
            # if array, patch field vals get added to what's in db
            if field != "aliases":
                if profile["properties"][field].get("items", {}).get("linkTo"):
                    val = [aliases[v] if v in aliases else v for v in json_item[field]]
                elif (
                    profile["properties"][field].get("items", {}).get("type")
                    == "object"
                ):
                    val = [  # handle sub-embedded object with or without linkTo
                        dict(
                            [
                                (k, aliases[v]) if v in aliases else (k, v)
                                for k, v in dict_item.items()
                            ]
                        )
                        for dict_item in json_item[field]
                    ]
                elif (
                    profile["properties"][field].get("items", {}).get("type")
                    == "string"
                ):
                    val = [v for v in json_item[field]]
            else:
                val = [v for v in json_item[field]]
            if all(v in db_item.get(field, []) for v in val):
                continue
            new_val = [item for item in db_item.get(field, [])]
            new_val.extend(val)
            try:
                to_patch[field] = list(set(new_val))
            except TypeError:  # above doesn't handle list of dictionaries
                to_patch[field] = [dict(t) for t in {tuple(d.items()) for d in new_val}]
    return to_patch


def validate_all_items(virtualapp, json_data):
    """
    Function that:
    1. looks up each item in json
    2. if item in db, will validate and patch any different metadata
    3. if item not in db, will post item
    """
    output = []
    if list(json_data.keys()) == ["errors"]:
        output.append(
            "Errors found in spreadsheet columns. Please fix spreadsheet before submitting."
        )
        return {}, output, False
    alias_dict = {}
    errors = json_data["errors"]
    all_aliases = [k for itype in json_data for k in json_data[itype]]
    json_data_final = {"post": {}, "patch": {}}
    validation_results = {}
    for itemtype in POST_ORDER:  # don't pre-validate case and report
        db_results = {}
        if itemtype in json_data:
            profile = virtualapp.get("/profiles/{}.json".format(itemtype)).json
            validation_results[itemtype] = {"validated": 0, "errors": 0}
            for alias in json_data[itemtype]:
                # first collect all atids before comparing and validating items
                db_result = compare_with_db(virtualapp, alias)
                if db_result:
                    alias_dict[alias] = db_result["@id"]
                    db_results[alias] = db_result
            for alias in json_data[itemtype]:
                data = json_data[itemtype][alias].copy()
                row = data.get("row")
                if row:
                    del data["row"]
                fname = json_data[itemtype][alias].get("filename")
                if not db_results.get(alias):
                    error = validate_item(
                        virtualapp, data, "post", itemtype, all_aliases
                    )
                    if error:  # check an report presence of validation errors
                        if itemtype not in ["case", "report"]:
                            for e in error:
                                if row:
                                    errors.append(
                                        "Row {} - Error found: {}".format(row, e)
                                    )
                                else:
                                    errors.append(
                                        "{} {} - Error found: {}".format(
                                            itemtype, alias, e
                                        )
                                    )
                            validation_results[itemtype]["errors"] += 1
                    else:
                        if fname:
                            if fname in "".join(json_data["errors"]):
                                validation_results[itemtype]["errors"] += 1
                        json_data_final["post"].setdefault(itemtype, [])
                        json_data_final["post"][itemtype].append(
                            json_data[itemtype][alias]
                        )
                        validation_results[itemtype]["validated"] += 1
                else:
                    # patch if item exists in db
                    patch_data = compare_fields(
                        profile, alias_dict, data, db_results[alias]
                    )
                    error = validate_item(
                        virtualapp,
                        patch_data,
                        "patch",
                        itemtype,
                        all_aliases,
                        atid=db_results[alias]["@id"],
                    )
                    if error:  # report validation errors
                        if itemtype not in ["case", "report"]:
                            for e in error:
                                if row:
                                    errors.append(
                                        "Row {} {} - Error found: {}".format(
                                            row, itemtype, e
                                        )
                                    )
                                else:
                                    errors.append(
                                        "{} {} - Error found: {}".format(
                                            itemtype, alias, e
                                        )
                                    )
                            validation_results[itemtype]["errors"] += 1
                    elif fname and fname in "".join(json_data["errors"]):
                        validation_results[itemtype]["errors"] += 1
                    else:  # patch
                        if patch_data:
                            json_data_final["patch"].setdefault(itemtype, {})
                            json_data_final["patch"][itemtype][
                                db_results[alias]["@id"]
                            ] = patch_data
                        elif itemtype not in [
                            "case",
                            "report",
                            "sample_processing",
                            "file_fastq",
                        ]:
                            if itemtype == "family" and ":" not in alias:
                                item_name = data.get("family_id")
                            else:
                                item_name = alias[alias.index(":") + 1 :]
                            if item_name.startswith(itemtype + "-"):
                                item_name = item_name[item_name.index("-") + 1 :]
                            if itemtype == "family":
                                item_name = "family for " + item_name
                            else:
                                item_name = itemtype + " " + item_name
                            output.append(
                                "{} - Item already in database, no changes needed".format(
                                    item_name
                                )
                            )
                        # record response
                        validation_results[itemtype]["validated"] += 1
    output.extend([error for error in errors])
    for itemtype in validation_results:
        output.append(
            "{} items: {} validated; {} errors".format(
                itemtype,
                validation_results[itemtype]["validated"],
                validation_results[itemtype]["errors"],
            )
        )
    if errors:
        output.append(
            "Errors found in items. Please fix spreadsheet before submitting."
        )
        return {}, output, False
    else:
        json_data_final["aliases"] = alias_dict
        output.append("All items validated.")
        return json_data_final, output, True


def post_and_patch_all_items(virtualapp, json_data_final):
    output = []
    files = []
    if not json_data_final:
        return output, "not run", []
    item_names = {
        "individual": "individual_id",
        "family": "family_id",
        "sample": "bam_sample_id",
    }
    final_status = {}
    no_errors = True
    if json_data_final.get("post"):
        for k, v in json_data_final["post"].items():
            final_status[k] = {
                "posted": 0,
                "not posted": 0,
                "patched": 0,
                "not patched": 0,
            }
            for item in v:
                patch_info = {}
                row = item.get("row")
                if row:
                    del item["row"]
                fname = item.get("filename")
                if fname:
                    del item["filename"]
                for field in LINKTO_FIELDS:
                    if field in item:
                        patch_info[field] = item[field]
                        del item[field]
                try:
                    response = virtualapp.post_json("/" + k, item, status=201)
                    if response.json["status"] == "success":
                        final_status[k]["posted"] += 1
                        atid = response.json["@graph"][0]["@id"]
                        json_data_final["aliases"][item["aliases"][0]] = atid
                        json_data_final["patch"].setdefault(k, {})
                        if patch_info:
                            json_data_final["patch"][k][atid] = patch_info
                        if k in item_names:
                            output.append(
                                "Success - {} {} posted".format(k, item[item_names[k]])
                            )
                        if fname:
                            files.append(
                                {
                                    "uuid": response.json["@graph"][0]["uuid"],
                                    "filename": fname,
                                }
                            )
                    else:
                        final_status[k]["not posted"] += 1
                        no_errors = False
                except Exception as e:
                    final_status[k]["not posted"] += 1
                    output.append(str(e))
                    no_errors = False
        for itype in final_status:
            if (
                final_status[itype]["posted"] > 0
                or final_status[itype]["not posted"] > 0
            ):
                output.append(
                    "{}: {} created (with POST); {} failed creation".format(
                        itype,
                        n_of(final_status[itype]["posted"], "item"),
                        n_of(final_status[itype]["not posted"], "item"),
                    )
                )
    for k, v in json_data_final["patch"].items():
        final_status.setdefault(k, {"patched": 0, "not patched": 0})
        for item_id, patch_data in v.items():
            fname = patch_data.get("filename")
            if fname:
                del patch_data["filename"]
            try:
                response = virtualapp.patch_json("/" + item_id, patch_data, status=200)
                if response.json["status"] == "success":
                    final_status[k]["patched"] += 1
                    if fname:
                        files.append(
                            {
                                "uuid": response.json["@graph"][0]["uuid"],
                                "filename": fname,
                            }
                        )
                else:
                    final_status[k]["not patched"] += 1
                    no_errors = False
            except Exception as e:
                final_status[k]["not patched"] += 1
                output.append(str(e))
                no_errors = False
        if final_status[k]["patched"] > 0 or final_status[k]["not patched"] > 0:
            output.append(
                "{}: attributes of {} updated (with PATCH);"
                " {} failed updating".format(
                    k,
                    n_of(final_status[k]["patched"], "item"),
                    n_of(final_status[k]["not patched"], "item"),
                )
            )
    return output, no_errors, files


def cell_value(cell):
    """Get cell value from excel. [From Submit4DN]"""
    # This should be always returning text format
    ctype = cell.data_type
    value = cell.value
    if ctype == openpyxl.cell.cell.TYPE_ERROR:  # pragma: no cover
        raise ValueError("Cell %s contains a cell error" % str(cell.coordinate))
    elif ctype == openpyxl.cell.cell.TYPE_BOOL:
        return str(value).upper().strip()
    elif ctype in (openpyxl.cell.cell.TYPE_NUMERIC, openpyxl.cell.cell.TYPE_NULL):
        if isinstance(value, float):
            if value.is_integer():
                value = int(value)
        if not value:
            value = ""
        return str(value).strip()
    elif isinstance(value, openpyxl.cell.cell.TIME_TYPES):
        if isinstance(value, datetime.datetime):
            if value.time() == datetime.time(0, 0, 0):
                return value.date().isoformat()
            else:  # pragma: no cover
                return value.isoformat()
        else:
            return value.isoformat()
    elif ctype in (openpyxl.cell.cell.TYPE_STRING, openpyxl.cell.cell.TYPE_INLINE):
        return value.strip()
    raise ValueError(
        "Cell %s is not an acceptable cell type" % str(cell.coordinate)
    )  # pragma: no cover


def row_generator(sheet):
    """Generator that gets rows from excel sheet [From Submit4DN]"""
    for row in sheet.rows:
        yield [cell_value(cell) for cell in row]
