#!/bin/bash


# Global Fourfront Application Entrypoint
# This script resolves which application type is desired based on
# the "$application_type" environment variable. Possible options are:
#  * "deployment" to run the deployment
#  * "ingester" to run the production ingester (forever)
#  * "indexer" to run the production indexer (forever)
#  * "portal" to run the production portal worker (API back-end)
#  * "local" to run a local deployment

# Note that only "local" can be run from the local machine
# but the same image build is run across the entire local/production stack.

deployment="deployment"
ingester="ingester"
indexer="indexer"
portal="portal"
local="local"

echo "Generating session randomness"
cat /dev/urandom | head -c 256 | base64 >> session-secret.b64

echo "Resolving which entrypoint is desired"

# shellcheck disable=SC2154
if [ "$application_type" = $deployment ]; then
  /bin/bash entrypoint_deployment.bash
elif [ "$application_type" = $ingester ]; then
  /bin/bash entrypoint_ingester.bash
elif [ "$application_type" = $indexer ]; then
  /bin/bash entrypoint_indexer.bash
elif [ "$application_type" = $portal ]; then
  /bin/bash entrypoint_portal.bash
elif [ "$application_type" = $local ]; then
  /bin/bash entrypoint_local.bash
else
  echo "Could not resolve entrypoint! Check that \$application_type is set."
  exit 1
fi

exit 0


