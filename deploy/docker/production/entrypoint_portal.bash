#!/bin/bash

echo "Starting up Fourfront WSGI"

# Run assume_identity.py to access the desired deployment configuration from
# secrets manager - this builds production.ini
poetry run python -m assume_identity

# Start nginx proxy
service nginx start

# Start application
pserve production.ini
