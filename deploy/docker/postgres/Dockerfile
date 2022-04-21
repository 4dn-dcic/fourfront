# TODO: upgrade to latest version we can tolerate
FROM postgres:12.3

MAINTAINER William Ronchetti "william_ronchetti@hms.harvard.edu"

# Install some system level dependencies
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates htop vim emacs curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy over our custom conf, enable inbound connections
COPY postgresql.conf /etc/postgresql/postgresql.conf
RUN echo "host    all             all              0.0.0.0/0                       trust" >> /etc/postgresql/pg_hba.conf

ENV PGDATA=/var/lib/postgresql/data/pgdata
