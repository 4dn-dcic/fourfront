#!/bin/bash

if [  -z ${TEST+x} ]; then

    if [ ! -z ${LOAD+x} ]; then

        # Clear db/es since this is the local entry point
        poetry run clear-db-es-contents development.ini --app-name app --env "$FOURFRONT_ENV_NAME"

        # Create mapping
        poetry run create-mapping-on-deploy development.ini --app-name app --clear-queue

        # Load Data (based on development.ini, for now just master-inserts)
        poetry run load-data development.ini --app-name app --prod

    fi

    # Start nginx proxy
    service nginx start

    # Start application
    make deploy2

else

    echo "Not starting serving application"
    echo "Enter the container with docker exec"
    sleep 100000000

fi
