clean:
	rm -rf node_modules eggs parts
	rm -rf .sass-cache
	rm -f src/encoded/static/css/*.css
	rm -f src/encoded/static/build/*.js
	rm -f src/encoded/static/build/*.html
	rm -rf develop
npm-setup:
	npm install
	npm run build | grep -v "node_modules\|\[built\]"
	npm run build-scss
	curl -o aws-ip-ranges.json https://ip-ranges.amazonaws.com/ip-ranges.json
moto-setup:
	pip install "moto[server]"
macpoetry-install:
	bin/macpoetry-install
macbuild:
	make clean
	make macpoetry-install
	make moto-setup
