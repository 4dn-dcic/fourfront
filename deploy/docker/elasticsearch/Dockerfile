# Pin the OpenSearch base image to a specific version for reproducible local/test
# builds instead of tracking the mutable `latest` tag.
FROM opensearchproject/opensearch:2.6.0
MAINTAINER William Ronchetti "william_ronchetti@hms.harvard.edu"

ENV OPENSEARCH_VERSION="2.6.0"
ENV OPENSEARCH_SERVICE_PORT=9200
EXPOSE $OPENSEARCH_SERVICE_PORT
