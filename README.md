# Fourfront Metadata Database 

[![Build Status](https://travis-ci.org/4dn-dcic/fourfront.png?branch=master)](https://travis-ci.org/4dn-dcic/fourfront)
[![Test Coverage](https://coveralls.io/repos/github/4dn-dcic/fourfront/badge.svg?branch=master)](https://coveralls.io/github/4dn-dcic/fourfront?branch=master)
[![Codacy](https://api.codacy.com/project/badge/Grade/f5fc54006b4740b5800e83eb2aeeeb43)](https://www.codacy.com/app/4dn/fourfront?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=4dn-dcic/fourfront&amp;utm_campaign=Badge_Grade)

This is a fork from [ENCODE-DCC/encoded](https://github.com/ENCODE-DCC/encoded). We are working to modularize the project and adapted to our needs for the 4D Nucleome project.

## Setup

---

**Step 0**: Obtain AWS keys. These will need to added to your environment variables or through the AWS CLI (installed later in this process).

---

**Step 1**: Verify that homebrew is working properly::
```bash
$ brew doctor
```

---

**Step 2**: Install or update dependencies::
```bash
$ brew install libevent libmagic libxml2 libxslt openssl postgresql graphviz nginx python3
$ brew install freetype libjpeg libtiff littlecms webp  # Required by Pillow
$ brew cask install caskroom/versions/java8
$ brew tap homebrew/versions
$ brew install elasticsearch@5.6 node4-lts
```
If you need to update dependencies::

    $ brew update
    $ brew upgrade
    $ rm -rf encoded/eggs

---

**Step 3**: Run buildout:

```bash
$ python3 bootstrap.py --buildout-version 2.9.5 --setuptools-version 36.6.0
$ bin/buildout
```

*NOTES*:
If you have issues with postgres or the python interface to it (psycogpg2) you probably need to install postgresql
via homebrew (as above).

If you have issues with Pillow you may need to install new xcode command line tools, first, update XCode dev tools from AppStore (reboot): 
```bash
$ xcode-select --install
```


If you wish to completely rebuild the application, or have updated dependencies:
```
$ make clean
```
Then goto *Step 3*.

---

**Step 4**: Start the application locally

In one terminal startup the database servers and nginx proxy with::
```bash
$ bin/dev-servers development.ini --app-name app --clear --init --load
```
This will first clear any existing data in /tmp/encoded.
Then postgres and elasticsearch servers will be initiated within /tmp/encoded.
An nginx proxy running on port 8000 will be started.
The servers are started, and finally the test set will be loaded.

In a second terminal, run the app with::
```bash
$ bin/pserve development.ini
```
Indexing will then proceed in a background thread similar to the production setup.

Browse to the interface at http://localhost:8000/.