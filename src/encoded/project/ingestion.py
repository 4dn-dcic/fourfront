from snovault.project.ingestion import SnovaultProjectIngestion

class FourfrontProjectIngestion(SnovaultProjectIngestion):
    def ingestion_submission_schema_file(self):
        return "encoded:schemas/ingestion_submission.json"
