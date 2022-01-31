#!/bin/bash

echo "Starting up Fourfront WSGI"

# Run assume_identity.py to access the desired deployment configuration from
# secrets manager - this builds production.ini
poetry run python -m assume_identity

# Start nginx proxy
service nginx start

# Start application
echo "Starting server 1"
pserve production.ini http_port=6543 &
echo "Starting server 2"
pserve production.ini http_port=6544 &
echo "Starting server 3"
pserve production.ini http_port=6545 &
echo "Starting server 4"
pserve production.ini http_port=6546 &
echo "Starting server 5"
pserve production.ini http_port=6547
