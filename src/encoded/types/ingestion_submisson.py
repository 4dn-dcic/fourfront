from snovault import collection, load_schema
from snovault.types.ingestion import IngestionSubmission as SnovaultIngestionSubmission
from .base import Item


@collection(
    name="ingestion-submissions",
    properties={
        "title": "Ingestion Submissions",
        "description": "List of Ingestion Submissions",
    },
)
class IngestionSubmission(Item, SnovaultIngestionSubmission):
    """The IngestionSubmission class that holds info on requests to ingest data."""

    item_type = "ingestion_submission"
    schema = load_schema("encoded:schemas/ingestion_submission.json")
    embedded_list = []
