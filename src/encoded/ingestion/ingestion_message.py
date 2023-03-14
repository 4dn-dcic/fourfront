import json


class IngestionMessage:
    """
    Wrapper for raw ingestion message from SQS. Extracts ingestion type and uuid
    for easy/unified access. This is the type (of the first argument) expected by
    the ingestion_message_handler decorator. Note that the ingestion type name
    string is trimmed and treated as case-insensitive.
    """
    def __init__(self, raw_message: dict) -> None:
        self.body = json.loads(raw_message["Body"]) or {}
        self.uuid = self.body["uuid"] or ""
        self.type = self.body.get("ingestion_type", "vcf").strip().lower()

    def is_type(self, value: str) -> bool:
        return isinstance(value, str) and self.type == value.lower()
