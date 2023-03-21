import structlog
from dcicutils.misc_utils import PRINT
from ..loadxl import load_data_via_ingester
from ..types.ingestion import IngestionSubmission, SubmissionFolio
from .exceptions import UndefinedIngestionProcessorType

log = structlog.getLogger(__name__)

INGESTION_UPLOADERS = {}


def INFO(*args):
    PRINT(*args)
    log.info(*args)


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
    """ Idea being you can submit a SubmissionFolio item that corresponds to an ontology term update.
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
        # The loadx module expects to see the terms in the "ontology_terms" key.
        ontology_json["ontology_term"] = ontology_json.pop("terms", [])
        # Get the number of ontology terms just for logging purposes.
        ontology_term_count = len(ontology_json["ontology_term"])
        INFO(f"Ontology ingestion handler ontology file term count: {ontology_term_count}")
        # Call into the loadx module to do the actual load of the ontology data.
        load_data_response = load_data_via_ingester(submission.vapp, ontology_json)
        INFO(f"Ontology ingestion handler initiated load.")
        # The response is a generate so we need to dereference it to actually cause it to do its work;
        # and its string value is a text summary of what was done.
        dereferenced_load_data_response = str(load_data_response)
        INFO(f"Ontology ingestion handler load complete; summary below.")
        INFO(dereferenced_load_data_response)
    log.warning("Ontology ingestion handler done.")
