SHELL=/bin/bash

clean:  # clear node modules, eggs, npm build stuff
	make clean-python-caches
	make clean-npm-caches

clean-python-caches:
	rm -rf src/*.egg-info/
	rm -rf eggs
	rm -rf develop
	rm -rf develop-eggs

clean-npm-caches:
	make clean-node-modules
	rm -rf .sass-cache
	rm -f src/encoded/static/css/*.css
	rm -f src/encoded/static/build/*.js
	rm -f src/encoded/static/build/*.html

clean-node-modules:
	rm -rf node_modules

clear-poetry-cache:  # clear poetry/pypi cache. for user to do explicitly, never automatic
	poetry cache clear pypi --all

aws-ip-ranges:
	curl -o aws-ip-ranges.json https://ip-ranges.amazonaws.com/ip-ranges.json

npm-setup-if-needed:  # sets up npm only if not already set up
	if [ ! -d "node_modules" ]; then make npm-setup; fi

npm-setup:  # runs all front-end setup
	npm ci
	npm run build | grep -v "node_modules\|\[built\]"
	npm run build-scss
	make aws-ip-ranges

moto-setup:  # optional moto setup that must be done separately
	pip install "moto[server]==1.3.7"

configure:  # does any pre-requisite installs
	pip install --upgrade pip==24.1.2
	pip install poetry==1.8.5
	pip install wheel
	poetry config virtualenvs.create false --local # do not create a virtualenv - the user should have already done this -wrr 20-Sept-2021

check-awscli:
	@if ! aws --version > /dev/null 2>&1; then \
		echo "AWS CLI is not installed."; \
		exit 0; \
	else \
		echo "AWS CLI is already installed. Exiting."; \
		exit 1; \
	fi

install-awscli: check-awscli  # installs awscli v2 for use with credentialing
	@echo "Installing AWS CLI v2..."
	curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
	sudo installer -pkg AWSCLIV2.pkg -target /usr/local/bin/
	aws --version
	rm AWSCLIV2.pkg

clear-aws:
	@echo "unset AWS_ACCESS_KEY_ID" > ~/.clear_aws_env && \
	echo "unset AWS_SECRET_ACCESS_KEY" >> ~/.clear_aws_env && \
	echo "unset AWS_SESSION_TOKEN" >> ~/.clear_aws_env && \
	echo "Run 'source ~/.clear_aws_env' to finish clearing"

build-poetry:
	make configure
	poetry install

build:  # builds
	make build-poetry
	make build-after-poetry

rebuild:
	make clean  # Among other things, this assures 'make npm-setup' will run, but it also does other cleanup.
	make build

build-full:  # rebuilds for Catalina, addressing zlib possibly being in an alternate location.
	make clean-node-modules  # This effectively assures that 'make npm-setup' will need to run.
	make build

build-after-poetry:  # continuation of build after poetry install
	make moto-setup
	make npm-setup-if-needed
	poetry run python setup_eb.py develop
	make fix-dist-info
	poetry run prepare-local-dev

fix-dist-info:
	@scripts/fix-dist-info

build-dev:  # same as build, but sets up locust as well
	make build
	make build-locust

build-locust:  # just pip installs locust - may cause instability
	pip install locust

deploy1:  # starts postgres/ES locally and loads inserts, and also starts ingestion engine
	@DEBUGLOG=`pwd` SNOVAULT_DB_TEST_PORT=`grep 'sqlalchemy[.]url =' development.ini | sed -E 's|.*:([0-9]+)/.*|\1|'` dev-servers development.ini --app-name app --clear --init --load

deploy1a:  # starts postgres/ES locally and loads inserts, but does not start the ingestion engine
#	@DEBUGLOG=`pwd` SNOVAULT_DB_TEST_PORT=`grep 'sqlalchemy[.]url =' development.ini | sed -E 's|.*:([0-9]+)/.*|\1|'` dev-servers development.ini --app-name app --clear --init --load --no_ingest
	@DEBUGLOG=`pwd` SNOVAULT_DB_TEST_PORT=`grep 'sqlalchemy[.]url =' development.ini | sed -E 's|.*:([0-9]+)/.*|\1|'` dev-servers development.ini --app-name app --clear --init --load --no_ingest

deploy1b:  # starts ingestion engine separately so it can be easily stopped and restarted for debugging in foreground
	@echo "Starting ingestion listener. Press ^C to exit." && DEBUGLOG=`pwd` SNOVAULT_DB_TEST_PORT=`grep 'sqlalchemy[.]url =' development.ini | sed -E 's|.*:([0-9]+)/.*|\1|'` poetry run ingestion-listener development.ini --app-name app

deploy2:  # spins up waittress to serve the application
	@DEBUGLOG=`pwd` pserve development.ini
	# TODO/QUESTION: SHould the above be more like this (from cgap-portal)?
	# @DEBUGLOG=`pwd` SNOVAULT_DB_TEST_PORT=`grep 'sqlalchemy[.]url =' development.ini | sed -E 's|.*:([0-9]+)/.*|\1|'` pserve development.ini

psql-dev:  # starts psql with the url after 'sqlalchemy.url =' in development.ini
	@psql `grep 'sqlalchemy[.]url =' development.ini | sed -E 's/^.* = (.*)/\1/'`

kibana-start:
	scripts/kibana-start

kibana-stop:
	scripts/kibana-stop

kill:  # kills back-end processes associated with the application. Use with care.
	pkill -f postgres &
	pkill -f opensearch &
	pkill -f elasticsearch &
	pkill -f moto_server &

clean-python:
	@echo -n "Are you sure? This will wipe all libraries installed on this virtualenv [y/N] " && read ans && [ $${ans:-N} = y ]
	pip uninstall encoded
	pip uninstall -y -r <(pip freeze)

test:
	@git log -1 --decorate | head -1
	@date
	make test-unit || echo "unit tests failed"
	make test-npm
	@git log -1 --decorate | head -1
	@date


retest:
	poetry run python -m pytest -vv -r w --last-failed

test-any:
	bin/test -vv --timeout=200


test-npm:
	bin/test -xvv --durations=50 --timeout=300 -m "working and not manual and not integratedx and not performance and not broken and not sloppy and workbook"

test-unit:
	bin/test -xvv --durations=50 --timeout=200 -m "working and not manual and not integratedx and not performance and not broken and not sloppy and not workbook"

remote-test:  # Actually, we don't normally use this. Instead the GA workflow sets up two parallel tests.
	make remote-test-npm
	make remote-test-unit

remote-test-npm:  # Note this only does the 'not indexing' tests
	bin/test -xvv --force-flaky --max-runs=3 --timeout=300 -m "working and not manual and not integratedx and not performance and not broken and not sloppy and workbook" --aws-auth --durations=10 --cov src/encoded --es search-fourfront-testing-opensearch-kqm7pliix4wgiu4druk2indorq.us-east-1.es.amazonaws.com:443

remote-test-unit:  # Note this does the 'indexing' tests
	bin/test -xvv --force-flaky --max-runs=3 --timeout=300 -m "working and not manual and not integratedx and not performance and not broken and not sloppy and not workbook" --aws-auth --durations=10 --cov src/encoded --es search-fourfront-testing-opensearch-kqm7pliix4wgiu4druk2indorq.us-east-1.es.amazonaws.com:443

update:  # updates dependencies
	poetry update

debug-docker-local:
	@scripts/debug-docker-local

build-docker-local:
	docker-compose build

build-docker-local-clean:
	docker-compose build --no-cache

deploy-docker-local:
	docker-compose up -V

deploy-docker-local-daemon:
	docker-compose up -d -V

ENV_NAME ?= fourfront-mastertest
AWS_ACCOUNT ?= 643366669028

ecr-login:
	@echo "Making ecr-login AWS_ACCOUNT=${AWS_ACCOUNT} ..."
	aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.us-east-1.amazonaws.com

build-docker-mastertest:
	scripts/build-docker-test --login --env_name fourfront-mastertest

build-docker-production:
	@echo "Making build-docker-production AWS_ACCOUNT=${AWS_ACCOUNT} ENV_NAME=${ENV_NAME} ..."
	docker build -t ${ENV_NAME}:latest .
	make tag-and-push-docker-production ENV_NAME=${ENV_NAME} AWS_ACCOUNT=${AWS_ACCOUNT}

tag-and-push-docker-production:
	@echo "Making tag-and-push-docker-production AWS_ACCOUNT=${AWS_ACCOUNT} ENV_NAME=${ENV_NAME} ..."
	docker tag ${ENV_NAME}:latest ${AWS_ACCOUNT}.dkr.ecr.us-east-1.amazonaws.com/${ENV_NAME}:latest
	date
	docker push ${AWS_ACCOUNT}.dkr.ecr.us-east-1.amazonaws.com/${ENV_NAME}:latest
	date

publish:
	poetry run publish-to-pypi

publish-for-ga:
	poetry run publish-to-pypi --noconfirm

help:
	@make info

info:
	@: $(info Here are some 'make' options:)
	   $(info - Use 'make aws-ip-ranges' to download latest ip range information. Invoked automatically when needed.)
	   $(info - Use 'make build' (or 'make macbuild' on OSX Catalina) to build only application dependencies.)
	   $(info - Use 'make build-dev' (or 'make macbuild-dev' on OSX Catalina) to build all dependencies, even locust.)
	   $(info - Use 'make build-locust' to install locust. Do not do this unless you know what you are doing.)
	   $(info - Use 'make clean' to clear out (non-python) dependencies.)
	   $(info - Use 'make clean-python' to clear python virtualenv for fresh poetry install.)
	   $(info - Use 'make clear-poetry-cache' to clear the poetry pypi cache if in a bad state. (Safe, but later recaching can be slow.))
	   $(info - Use 'make configure' to install poetry. You should not have to do this directly.)
	   $(info - Use 'make deploy1' to spin up postgres/elasticsearch and load inserts.)
	   $(info - Use 'make deploy2' to spin up the application server.)
	   $(info - Use 'make kibana-start' to start kibana, and 'make kibana-stop' to stop it.)
	   $(info - Use 'make kill' to kill postgres and elasticsearch proccesses. Please use with care.)
	   $(info - Use 'make moto-setup' to install moto, for less flaky tests. Implied by 'make build'.)
	   $(info - Use 'make npm-setup' to build the front-end. Implied by 'make build'.)
	   $(info - Use 'make psql-dev' to start psql on data associated with an active 'make deploy1'.)
	   $(info - Use 'make test' to run tests with normal options similar to what we use on GitHub Actions.)
	   $(info - Use 'make test-any' to run tests without marker constraints (i.e., with no '-m' option).)
	   $(info - Use 'make update' to update dependencies (and the lock file).)
	   $(info - Use 'make build-docker-local' to build the local Docker image.)
	   $(info - Use 'make build-docker-local-clean' to build the local Docker image with no cache.)
	   $(info - Use 'make deploy-docker-local' start up the cluster - pserve output will follow if successful.)
	   $(info - Use 'make deploy-docker-local-daemon' will start the cluster in daemon mode.)
	   $(info - Use 'make ecr-login' to login to ECR with the currently sourced AWS creds.)
	   $(info - Use 'make build-docker-production' to build/tag/push a production image.)
