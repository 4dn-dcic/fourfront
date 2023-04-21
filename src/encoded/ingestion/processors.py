import structlog
from dcicutils.misc_utils import str_to_bool
from ..loadxl import load_data_via_ingester
from ..types.ingestion import IngestionSubmission, SubmissionFolio
from .exceptions import UndefinedIngestionProcessorType

log = structlog.getLogger(__name__)

INGESTION_UPLOADERS = {}


def INFO(args):
    if isinstance(args, list):
        for arg in args:
            print(arg)
            log.info(arg)
    else:
        print(args)
        log.info(args)


def ingestion_processor(processor_type):
    """
    @ingestion_uploader(<ingestion-type-name>) is a decorator that declares the upload handler for an ingestion type.
    """

    # Make sure the ingestion type specified for the decorated function is supported by
    # our IngestionSubmission type; this info comes from schemas/ingestion_submission.json.
    if not IngestionSubmission.supports_type(processor_type):
        raise UndefinedIngestionProcessorType(processor_type)

    def ingestion_type_decorator(fn):
        if processor_type in INGESTION_UPLOADERS:
            raise RuntimeError(f"Ingestion type {processor_type} is already defined.")
        INGESTION_UPLOADERS[processor_type] = fn
        return fn

    return ingestion_type_decorator


def get_ingestion_processor(processor_type):
    handler = INGESTION_UPLOADERS.get(processor_type, None)
    if not handler:
        raise UndefinedIngestionProcessorType(processor_type)
    return handler


@ingestion_processor('data_bundle')
def handle_data_bundle(submission: SubmissionFolio):

    # We originally called it 'data_bundle' and we retained that as OK in the schema
    # to not upset anyone testing with the old name, but this is not the name to use
    # any more, so reject new submissions of this kind. -kmp 27-Aug-2020

    with submission.processing_context():

        raise RuntimeError("handle_data_bundle was called (for ingestion_type=%s). This is always an error."
                           " The ingestion_type 'data_bundle' was renamed to 'metadata_bundle'"
                           " prior to the initial release. Your submission program probably needs to be updated."
                           % submission.ingestion_type)


@ingestion_processor('ontology')
def handle_ontology_update(submission: SubmissionFolio):
    """
    Main handler for ontology file ingestion. Use submit-ontoloy (in SubmitCGAP repo) to submit a local ontology
    file (presumably generated via generate-ontology in this repo, with some possible manual steps there), which
    creates file_other and ingestion_submission objects, uploads the ontology file to S3 (via aws command-line
    directly from the submit-ontology process, i.e. not via Fourfront), and places message on SQS to pick up here.
    Here we download the ontology file from S3, process it (into the database, via loadx), and returns a summary.

    Here is a more detailed summary of the steps for the submit-ontology process:
   - Call Fourfront /FileOther endpoint to create file_other type object (in database); returns HTTP 201 and its uuid,
     e.g. 19734227-f380-4283-a1bb-ac14c169240f, which corresponds to S3 bucket key where actual given ontology file
     will be uploaded; this bucket (e.g. encoded-4dn-blobs) comes from the blob_bucket property in development.ini;
     returns JSON containing (crucially) an upload_credentials property with an upload_url (e.g. s3://encoded-4dn-blobs/
     19734227-f380-4283-a1bb-ac14c169240f/4DNFIN2WOIYQ.json) and other credentials which will allow submit-ontology to
     actually upload the ontology file via the aws command via sub-process.
   - Upload actual (local) ontology file to S3, e.g. s3://encoded-4dn-blobs/19734227-f380-4283-a1bb-ac14c169240f/
     4DNFIN2WOIYQ.json, using upload_credentials returned from the above /FileOther call, using a sub-process to
     the aws command-line utility. This is the crucial thing that differentiates this new process from existing
     ingestion processes, i.e. we upload the file directly, locally from submit-ontology rather than submitting
     to a (Fourfront) HTTP based endpoint call, which would be susceptible to timeouts for large files.
   - Call Fourfront /IngestionSubmission endpoint to create ingestion_submission type object (in database); returns
     HTTP 201 and its uuid, e.g. 8c24d660-68ad-4671-aa9d-38e0eb81cd94, which corresponds to S3 bucket key where the
     metadata about the ontology ingestion processing will be stored; this bucket (e.g. metadata-bundles-fourfront-local) 
     comes from the metadata_bundles_bucket property in development.ini.
   - Call Fourfront /ingestion-submissions/{ingestion_submission_uuid}/submit_for_ingestion endpoint which uploads
     the manifest.json to S3, e.g. s3:///8c24d660-68ad-4671-aa9d-38e0eb81cd94/manifest.json, and updates the
     ingestion_submission object, e.g. 8c24d660-68ad-4671-aa9d-38e0eb81cd94, in the database with more info;
     and puts a message on SQS which will notify the ingester ontology process that we have a file to process.
   - Ingester then picks up the (above mentioned) SQS message, its ID corresponding to the ingestion_submission object ID,
     e.g. 8c24d660-68ad-4671-aa9d-38e0eb81cd94, and downloads the manifest.json, e.g. from s3://metadata-bundles-fourfront-local/
     8c24d660-68ad-4671-aa9d-38e0eb81cd94/manifest.json from where it gets the location of the actual ontology data file,
     e.g. s3://encoded-4dn-blobs/19734227-f380-4283-a1bb-ac14c169240f/4DNFIN2WOIYQ.json, which it downloads and processes;
     this also creates in S3, e.g. s3://metadata-bundles-fourfront-local/8c24d660-68ad-4671-aa9d-38e0eb81cd94, the files
     started.txt, resolution.json (with S3 locations of manifest.json, started.txt, and submission.json),
     and submission.json (with detailed results of ingestion process).
    """
    log.warning("Ontology ingestion handler starting.")
    with submission.processing_context():
        # The following get_s3_input_json call downloads from S3 the payload/data file,
        # opens it, and loads its contents (assumed to be JSON), and returns it as a dictionary.
        if not isinstance(submission.parameters, dict):
            log.error(f"Ontology ingestion handler found no parameters with file location!")  
            return
        datafile_bucket = submission.parameters.get("datafile_bucket")
        if not datafile_bucket:
            log.error(f"Ontology ingestion handler found no file bucket!")  
            return
        datafile_key = submission.parameters.get("datafile_key")
        if not datafile_key:
            log.error(f"Ontology ingestion handler found no file key (bucket: {datafile_bucket})!")  
            return
        log.warning(f"Ontology ingestion handler file: {datafile_bucket}/{datafile_key}")
        try:
            ontology_json = submission.get_s3_input_json(bucket=datafile_bucket, key=datafile_key)
        except Exception as e:
            log.error(f"Ontology ingestion handler error on file load: {datafile_bucket}/{datafile_key}")
            log.error(str(e))
            return 
        log.warning(f"Ontology ingestion handler file loaded: {datafile_bucket}/{datafile_key}")
        # Get the number of ontology terms just for logging purposes.
        ontology_term_count = len(ontology_json["ontology_term"])
        INFO(f"Ontology ingestion handler ontology file term count: {ontology_term_count}")
        validate_only = str_to_bool(submission.parameters.get("validate_only"))
        if validate_only:
            INFO(f"Ontology ingestion handler is VALIDATE ONLY.")
        # Call into the loadx module to do the actual load of the ontology data;
        # its results are a dictionary itemizing the created (post), updated (patch),
        # skipped (skip), and errored (error) ontology term uuids.
        load_data_results = load_data_via_ingester(vapp=submission.vapp, ontology=ontology_json, validate_only=validate_only)
        # Note we take special care to ensure the details of the load (i.e. the itemization of all
        # ontology term uuids created, updated, skipped, or errored) are placed in the submission.json
        # file in S3 (s3://{submission.bucket}/{submission.submission_id}/submission.json), but NOT put
        # into the database (as it could be a large amount of data which we do not need in the database).
        log.warning(f"Ontology ingestion handler file processed: {datafile_bucket}/{datafile_key}")
        load_data_summary = [
            f"Ontology ingestion summary:",
            f"Created: {len(load_data_results['post'])}",
            f"Updated: {len(load_data_results['patch'])}",
            f"Skipped: {len(load_data_results['skip'])}",
            f"Checked: {len(load_data_results['check'])}",
            f"Errored: {len(load_data_results['error'])}",
            f"Uniques: {load_data_results['unique']}",
            f"Ontology ingestion files:",
            f"Summary: s3://{submission.bucket}/{submission.submission_id}/submission.json",
            f"TheFile: {submission.parameters.get('datafile_url')}"
        ]
        INFO(load_data_summary)
        results = {"result": load_data_results, "validation_output": load_data_summary}
        # This causes the load_data_summary to be made available to the output of submit-ontology.
        # as well as inserting this load_data_summary into the database (additional_data/validation_output).
        submission.note_additional_datum("validation_output", from_dict=results)
        # This causes the results to be written to s3://{submission.bucket}/{submission.submission_id}/submission.json;
        # note that it does NOT insert the results into the database (due to the s3_only=True flag), as we do NOT want
        # to insert this potentially huge results (i.e. the lists of created, updated, skippped, errored uuids) into
        # the database (not to mention its path to get there, i.e. via HTTP POST/PATCH to the Portal); but we DO
        # want these more detailed results in S3 for auditing/inspection/troubleshooting purposes.
        submission.process_standard_bundle_results(results, s3_only=True)
    log.warning("Ontology ingestion handler returning.")
