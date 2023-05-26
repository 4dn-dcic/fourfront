from snovault.ingestion import ingestion_listener as snovault_ingestion_listener
from . import ingestion_processors


def main():
    return snovault_ingestion_listener.main()
