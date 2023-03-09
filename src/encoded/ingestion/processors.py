from dcicutils.misc_utils import PRINT
from .exceptions import UndefinedIngestionProcessorType
from .ingestion_connection import IngestionConnection
from ..types.ingestion import IngestionSubmission, SubmissionFolio
from ..util import temporary_file, make_vapp_for_email, make_vapp_for_ingestion, s3_local_file
import json
import io
import shutil


INGESTION_UPLOADERS = {}


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
    """ Idea being you can submit a SubmissionFolio item that corresponds to an ontology
        term update.
    """
    from ..loadxl import load_data_via_ingester
    PRINT(f"Ingestion ontology update handler: {submission.bucket}/{submission.object_name}")
    with submission.processing_context():
        PRINT(f"Ingestion ontology update handler; entered processing context.")
        # import pdb ; pdb.set_trace()
        with submission.s3_input_json() as ontology_json:
            ontology_json["ontology_term"] = ontology_json.pop("terms", [])
            ontology_term_count = len(ontology_json["ontology_term"])
            PRINT(f"Ingestion ontology update handler; downloaded ontology file; term count: {ontology_term_count}")
            load_data_response = load_data_via_ingester(submission.vapp, ontology_json)
            PRINT(f"Ingestion ontology update handler; loaded ontology.")
            PRINT(load_data_response)
        PRINT(f"Ingestion ontology update handler; exiting processing context.")
    PRINT("Ingestion ontology update handler; returning.")
