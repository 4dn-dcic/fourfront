import pytest
from snovault.ingestion.ingestion_processor_decorator import ingestion_processor
from snovault.types.ingestion import SubmissionFolio


def test_error_ingestion_processor():
    with pytest.raises(Exception):
        @ingestion_processor('some_unknown_ingestion_type')
        def some_processor_for_unknown_ingestion_type(submission: SubmissionFolio):
            pass
