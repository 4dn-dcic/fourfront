clean:  # clear node modules, eggs, npm build stuff
	rm -rf src/*.egg-info/
	rm -rf node_modules eggs
	rm -rf .sass-cache
	rm -f src/encoded/static/css/*.css
	rm -f src/encoded/static/build/*.js
	rm -f src/encoded/static/build/*.html
	rm -rf develop develop-eggs

aws-ip-ranges:
	curl -o aws-ip-ranges.json https://ip-ranges.amazonaws.com/ip-ranges.json

npm-setup:  # runs all front-end setup
	npm ci
	npm run build | grep -v "node_modules\|\[built\]"
	npm run build-scss
	curl -o aws-ip-ranges.json https://ip-ranges.amazonaws.com/ip-ranges.json

moto-setup:  # optional moto setup that must be done separately
	pip install "moto[server]==1.3.7"

macpoetry-install:  # install for OSX Catalina
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

build-dev:  # same as build but gives moto & locust setup as well
	make build
	make moto-setup
	pip install locust

macbuild-dev:  # same as macbuild but gives moto & locust setup as well
	make macbuild
	make moto-setup
	pip install locust

build-locust:  # just pip installs locust - may cause instability
	pip install locust

deploy1:  # starts postgres/ES locally and loads inserts
	dev-servers development.ini --app-name app --clear --init --load

deploy2:  # spins up waittress to serve the application
	pserve development.ini

clean-python:
	@echo -n "Are you sure? This will wipe all libraries installed on this virtualenv [y/N] " && read ans && [ $${ans:-N} = y ]
	pip uninstall encoded
	pip freeze | xargs pip uninstall -y

test:
	bin/test -vv --timeout=400

update:  # updates dependencies
	poetry update

help:
	@make info

info:
	@: $(info Here are some 'make' options:)
	   $(info - Use 'make aws-ip-ranges' to download latest ip range information. You should never have to do this yourself.)
	   $(info - Use 'make build' to build only application dependencies (or 'make macbuild' on OSX Catalina))
	   $(info - Use 'make build-dev' to build all dependencies (or 'make macbuild-dev' on OSX Catalina))
	   $(info - Use 'make build-locust' to install locust. Do not do this unless you know what you are doing)
	   $(info - Use 'make clean' to clear out (non-python) dependencies)
	   $(info - Use 'make clean-python' to clear python virtualenv for fresh poetry install)
	   $(info - Use 'make configure' to install poetry. You should not have to do this directly)
	   $(info - Use 'make deploy1' to spin up postgres/elasticsearch and load inserts)
	   $(info - Use 'make deploy2' to spin up the application server)
	   $(info - Use 'make moto-setup' to install moto, for less flaky tests)
	   $(info - Use 'make npm-setup' to build the front-end)
	   $(info - Use 'make test' to run tests with the normal options we use on travis)
	   $(info - Use 'make update' to update dependencies (and the lock file))
