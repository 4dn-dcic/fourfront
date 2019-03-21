#!/usr/bin/env python3
import argparse
import logging

from pyramid.path import DottedNameResolver
from pyramid.paster import get_app
from encoded import configure_dbsession
import os
from datetime import datetime
from pkg_resources import resource_filename


logger = logging.getLogger(__name__)
EPILOG = __doc__


def main():
    start = datetime.now()
    print(str(start))
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.WARN)

    parser = argparse.ArgumentParser(
        description="Load Ontology Term Data", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('json_file', help="File containing terms to load")
    parser.add_argument('config_uri', help="path to configfile - development.ini or production.ini")
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    args = parser.parse_args()
    post = args.json_file

    # get the pyramids app
    app = get_app(args.config_uri, args.app_name)
    # create db schema
    configure_dbsession(app)

    load_term_data = 'encoded.loadxl:load_ontology_terms'
    print("****** load test data is %s" % (load_term_data))
    load_term_data = DottedNameResolver().resolve(load_term_data)
    load_term_data(app, post)
    end = datetime.now()
    print("FINISHED - START: ", str(start), "\tEND: ", str(end))


if __name__ == "__main__":
    main()
