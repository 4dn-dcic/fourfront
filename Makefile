clean:  # clear node modules, eggs, npm build stuff
	rm -rf node_modules eggs
	rm -rf .sass-cache
	rm -f src/encoded/static/css/*.css
	rm -f src/encoded/static/build/*.js
	rm -f src/encoded/static/build/*.html
	rm -rf develop

aws-ip-ranges:
	curl -o aws-ip-ranges.json https://ip-ranges.amazonaws.com/ip-ranges.json

npm-setup:  # runs all front-end setup
	npm install
	npm run build | grep -v "node_modules\|\[built\]"
	npm run build-scss

moto-setup:  # optional moto setup that must be done separately
	pip install "moto[server]"

macpoetry-install:  # install for OSX Catalina
	bin/macpoetry-install

macbuild:
	make clean
	make macpoetry-install
	make moto-setup

configure:  # does any pre-requisite installs
	pip install poetry

build:  # builds
	make configure
	poetry install
	make npm-setup
	python setup_eb.py develop

build-dev:  # same as build but gives moto setup as well
	make build
	make moto-setup

build-locust:  # just pip installs locust - may cause instability
	pip install locust

deploy1:  # starts postgres/ES locally and loads inserts
	poetry run dev-servers development.ini --app-name app --clear --init --load

deploy2:  # spins up waittress to serve the application
	poetry run pserve development.ini


clean-python:
	@echo -n "Are you sure? This will wipe all libraries installed on this virtualenv [y/N] " && read ans && [ $${ans:-N} = y ]
	pip uninstall encoded
	pip freeze | xargs pip uninstall -y


info:
	@: $(info Printing some info on how to use make)
	   $(info   Use 'make build-dev' to build all dependencies)
	   $(info   Use 'make build' to build only application dependencies)
	   $(info   Use 'make deploy1' to spin up postgres/elasticsearch and load inserts)
	   $(info   Use 'make deploy2' to spin up the application server)
	   $(info   Use 'make clean' to clear out (non-python) dependencies)
	   $(info   Use 'make clean-python' to clear python virtualenv for fresh poetry install)
	   $(info   Use 'make aws-ip-ranges' to download latest ip range information. You should never have to do this yourself.)
	   $(info   Use 'make npm-setup' to build the front-end)
	   $(info   Use 'make moto-setup' to install moto, for less flaky tests)
	   $(info   Use 'make macpoetry-install' to install fourfront on OSX catalina)
	   $(info   Use 'make build-locust' to intall locust. Do not do this unless you know what you are doing)
	   $(info   Use 'make configure' to install poetry. You should not have to do this directly)
