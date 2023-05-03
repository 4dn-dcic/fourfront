#!/bin/sh

echo "Starting Fourfront Ingester"

# Run assume_identity.py to access the desired deployment configuration from
# secrets manager - this builds production.ini
poetry run python -m assume_identity

# will serve forever
poetry run ingestion-listener production.ini --app-name app
