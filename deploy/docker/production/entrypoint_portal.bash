#!/bin/bash

echo "Starting up Fourfront WSGI"

# Run assume_identity.py to access the desired deployment configuration from
# secrets manager - this builds production.ini
poetry run python -m assume_identity

# Start application. nginx is now supervised as a supervisord program (see
# supervisord.conf) rather than started here with `service nginx start`, so that
# it is restarted on crash and its logs are unified under supervisord.
echo "Starting supervisor"
supervisord -c supervisord.conf
