# Fourfront (Production) Dockerfile
# Based off of the cgap-portal Dockerfile
# Note that images are pinned via sha256 as opposed to tag
# so that we don't pick up new images unintentionally

# Debian Buster with Python 3.6.15
# Note image is updated from cgap-portal
FROM python:3.7.12-slim-buster

MAINTAINER William Ronchetti "william_ronchetti@hms.harvard.edu"

# Build Arguments
ARG INI_BASE
ENV INI_BASE=${INI_BASE:-"fourfront_any_alpha.ini"}

# Configure (global) Env
ENV NGINX_USER=nginx
ENV DEBIAN_FRONTEND=noninteractive
ENV CRYPTOGRAPHY_DONT_BUILD_RUST=1
ENV PYTHONFAULTHANDLER=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONHASHSEED=random \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=100 \
  NVM_VERSION=v0.39.1 \
  NODE_VERSION=12.22.9

# Configure Python3.7 venv
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv /opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install system level dependencies (poetry, nvm, nginx)
# Note that the ordering of these operations is intentional to minimize package footprint
WORKDIR /home/nginx/.nvm
ENV NVM_DIR=/home/nginx/.nvm
COPY deploy/docker/production/install_nginx.sh /
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends vim emacs net-tools ca-certificates \
    gcc zlib1g-dev postgresql-client libpq-dev git make curl libmagic-dev && \
    pip install --upgrade pip && \
    curl -sSL https://install.python-poetry.org | POETRY_HOME=/opt/venv python - && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} && \
    nvm use v${NODE_VERSION} && \
    nvm alias default v${NODE_VERSION} && \
    curl -o aws-ip-ranges.json https://ip-ranges.amazonaws.com/ip-ranges.json && \
    bash /install_nginx.sh && \
    chown -R nginx:nginx /opt/venv && \
    mkdir -p /home/nginx/fourfront && \
    mv aws-ip-ranges.json /home/nginx/fourfront/aws-ip-ranges.json && \
    apt-get clean

# Link, verify installations
ENV PATH="/home/nginx/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
#RUN node --version
#RUN npm --version
#RUN nginx --version

WORKDIR /home/nginx/fourfront

# Do the back-end dependency install
COPY pyproject.toml .
COPY poetry.lock .
RUN poetry install --no-root --no-dev

# Do the front-end dependency install
COPY package.json .
COPY package-lock.json .
RUN npm ci --no-fund --no-progress --no-optional --no-audit --python=/opt/venv/bin/python

# Copy over the rest of the code
COPY . .

# Build remaining back-end
RUN poetry install && \
    python setup_eb.py develop && \
    make fix-dist-info

# Build front-end, remove node_modules when done
ENV NODE_ENV=production
RUN npm run build && \
    npm run build-scss && \
    rm -rf node_modules/

# Misc
RUN cat /dev/urandom | head -c 256 | base64 > session-secret.b64

# Copy config files in (down here for quick debugging)
# Remove default configuration from Nginx
RUN rm /etc/nginx/nginx.conf && \
    rm /etc/nginx/conf.d/default.conf
COPY deploy/docker/production/nginx.conf /etc/nginx/nginx.conf

# nginx filesystem setup
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    rm -f /var/log/nginx/* && \
    touch /var/log/nginx/access.log && \
    chown -R nginx:nginx /var/log/nginx/access.log && \
    touch /var/log/nginx/error.log && \
    chown -R nginx:nginx /var/log/nginx/error.log && \
    mkdir -p /data/nginx/cache && \
    chown -R nginx:nginx /data/nginx/cache

# Pull all required files
# Note that *.ini must match the env name in secrets manager!
# Note that deploy/docker/production/entrypoint.sh resolves which entrypoint to run
# based on env variable "application_type".
COPY deploy/docker/local/docker_development.ini development.ini
COPY deploy/docker/local/entrypoint.bash entrypoint_local.bash
RUN chown nginx:nginx development.ini
RUN chmod +x entrypoint_local.bash

# Production setup
RUN touch production.ini
RUN chown nginx:nginx production.ini
COPY deploy/docker/production/$INI_BASE deploy/ini_files/.
COPY deploy/docker/production/entrypoint.bash .
COPY deploy/docker/production/entrypoint_portal.bash .
COPY deploy/docker/production/entrypoint_deployment.bash .
COPY deploy/docker/production/entrypoint_indexer.bash .
# Note that fourfront does not have an ingester
# COPY deploy/docker/production/entrypoint_ingester.sh .
COPY deploy/docker/production/assume_identity.py .
RUN chmod +x entrypoint.bash
RUN chmod +x entrypoint_deployment.bash
RUN chmod +x entrypoint_deployment.bash
RUN chmod +x entrypoint_indexer.bash
RUN chmod +x assume_identity.py
EXPOSE 8000

# Container does not run as root
USER nginx

ENTRYPOINT ["/home/nginx/fourfront/entrypoint.bash"]