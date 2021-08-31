#!/bin/bash

echo "Starting up CGAP-Portal Indexer"

# Run assume_identity.py to access the desired deployment configuration from
# secrets manager - this builds production.ini
poetry run python -m assume_identity

# Start indexer, run forever
while true
do
  poetry run es-index-data production.ini --app-name app || echo "Indexing Runtime Error thrown - check previous output"
  sleep 1
done

exit 0
