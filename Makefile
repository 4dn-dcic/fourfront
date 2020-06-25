clean:  # clear node modules, eggs, npm build stuff
	rm -rf src/*.egg-info/
	rm -rf node_modules eggs
	rm -rf .sass-cache
	rm -f src/encoded/static/css/*.css
	rm -f src/encoded/static/build/*.js
	rm -f src/encoded/static/build/*.html
	rm -rf develop
	rm -rf develop-eggs

aws-ip-ranges:
	curl -o aws-ip-ranges.json https://ip-ranges.amazonaws.com/ip-ranges.json

npm-setup:  # runs all front-end setup
	npm ci
	npm run build | grep -v "node_modules\|\[built\]"
	npm run build-scss
	make aws-ip-ranges

moto-setup:  # optional moto setup that must be done separately
	pip install "moto[server]==1.3.7"

macpoetry-install:  # Same as 'poetry install' except that on OSX Catalina, an environment variable wrapper is needed
	bin/macpoetry-install

configure:  # does any pre-requisite installs
	pip install poetry

macbuild:  # builds for Catalina
	make configure
	make macpoetry-install
	make build-after-poetry

build:  # builds
	make configure
	poetry install
	make build-after-poetry

build-after-poetry:  # continuation of build after poetry install
	make moto-setup
	make npm-setup
	python setup_eb.py develop

build-dev:  # same as build, but sets up locust as well
	make build
	make build-locust

macbuild-dev:  # same as macbuild, but sets up locust as well
	make macbuild
	pip install locust

build-locust:  # just pip installs locust - may cause instability
	pip install locust

deploy1:  # starts postgres/ES locally and loads inserts
	@SNOVAULT_DB_TEST_PORT=`grep 'sqlalchemy[.]url =' development.ini | sed -E 's|.*:([0-9]+)/.*|\1|'` dev-servers development.ini --app-name app --clear --init --load

deploy2:  # spins up waittress to serve the application
	pserve development.ini

kill:  # kills back-end processes associated with the application. Use with care.
	pkill -f postgres &
	pkill -f elasticsearch &

clean-python:
	@echo -n "Are you sure? This will wipe all libraries installed on this virtualenv [y/N] " && read ans && [ $${ans:-N} = y ]
	pip uninstall encoded
	pip freeze | xargs pip uninstall -y

test:
	bin/test -vv --timeout=200 -m "working and not performance"

test-any:
	bin/test -vv --timeout=200

travis-test-npm:  # Note this only does the 'not indexing' tests
	bin/test -vv --timeout=200 -m "working and not performance and not indexing" --aws-auth --durations=10 --cov src/encoded --es search-fourfront-builds-uhevxdzfcv7mkm5pj5svcri3aq.us-east-1.es.amazonaws.com:80

travis-test-unit:  # Note this does the 'indexing' tests
	bin/test -vv --timeout=200 -m "working and not performance and indexing" --aws-auth --durations=10 --cov src/encoded --es search-fourfront-builds-uhevxdzfcv7mkm5pj5svcri3aq.us-east-1.es.amazonaws.com:80

update:  # updates dependencies
	poetry update

help:
	@make info

info:
	@: $(info Printing some info on how to use make)
	   $(info - Use 'make aws-ip-ranges' to download latest ip range information. Invoked automatically when needed.)
	   $(info - Use 'make build' (or 'make macbuild' on OSX Catalina) to build only application dependencies.)
	   $(info - Use 'make build-dev' (or 'make macbuild-dev' on OSX Catalina) to build all dependencies, even locust.)
	   $(info - Use 'make build-locust' to install locust. Do not do this unless you know what you are doing.)
	   $(info - Use 'make clean' to clear out (non-python) dependencies.)
	   $(info - Use 'make clean-python' to clear python virtualenv for fresh poetry install.)
	   $(info - Use 'make configure' to install poetry. You should not have to do this directly.)
	   $(info - Use 'make deploy1' to spin up postgres/elasticsearch and load inserts.)
	   $(info - Use 'make deploy2' to spin up the application server.)
	   $(info - Use 'make kill' to kill postgres and elasticsearch proccesses. Please use with care.)
	   $(info - Use 'make moto-setup' to install moto, for less flaky tests. Implied by 'make build'.)
	   $(info - Use 'make npm-setup' to build the front-end. Implied by 'make build'.)
	   $(info - Use 'make test' to run tests with normal options we use on travis ('-m "working and not performance"').)
	   $(info - Use 'make test-any' to run tests without marker constraints (i.e., with no '-m' option).)
	   $(info - Use 'make update' to update dependencies (and the lock file).)
