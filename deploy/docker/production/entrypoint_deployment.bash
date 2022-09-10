#!/bin/bash

echo "Running a Fourfront deployment on the given environment"

# Run assume_identity.py to access the desired deployment configuration from
# secrets manager - this builds production.ini
poetry run python -m assume_identity

# Clear db/es on fourfront-mastertest if we run an "initial" deploy
# Do nothing on other environments
if [ -n "${INITIAL_DEPLOYMENT}" ]; then
  poetry run clear-db-es-contents production.ini --app-name app --only-if-env fourfront-mastertest
fi

## Create mapping
poetry run create-mapping-on-deploy production.ini --app-name app --clear-queue

# Load Data (based on development.ini, for now just master-inserts)
# Not necessary after first deploy
if [ -n "${INITIAL_DEPLOYMENT}" ]; then
    poetry run load-data production.ini --app-name app --prod
fi

# Load access keys
# Note that the secret name must match that which was created for this environment
poetry run load-access-keys production.ini --app-name app --secret-name "$IDENTITY"

exit 0
