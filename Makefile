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
	pip install locust

deploy1:  # starts postgres/ES locally and loads inserts
	dev-servers development.ini --app-name app --clear --init --load

deploy2:  # spins up waittress to serve the application
	pserve development.ini
