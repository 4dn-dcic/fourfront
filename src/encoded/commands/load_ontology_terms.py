#!/usr/bin/env python3

import os
import argparse
import json
from datetime import datetime
from wranglertools import fdnDCIC


def getArgs():  # pragma: no cover
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument('infile',
                        help="the datafile containing object data to import")
    parser.add_argument('--key',
                        default='default',
                        help="The keypair identifier from the keyfile.  \
                        Default is --key=default")
    parser.add_argument('--keyfile',
                        default=os.path.expanduser("~/keypairs.json"),
                        help="The keypair file.  Default is --keyfile=%s" %
                             (os.path.expanduser("~/keypairs.json")))
    args = parser.parse_args()
    return args


def main():  # pragma: no cover
    start = datetime.now()
    print(str(start))
    args = getArgs()
    key = fdnDCIC.FDN_Key(args.keyfile, args.key)
    if key.error:
        sys.exit(1)
    connection = fdnDCIC.FDN_Connection(key)

    phase2 = {}
    # assumes a single line corresponds to json for single term
    with open(args.infile) as terms:
        for t in terms:
            parents = None
            term = json.loads(t)
            tid = '/ontology-terms/' + term['term_id']
            # look for parents and remove for phase 2 loading if they are there
            if 'parents' in term:
                parents = term['parents']
                del term['parents']

            dbterm = fdnDCIC.get_FDN(tid, connection)
            if 'OntologyTerm' in dbterm['@type']:
                e = fdnDCIC.patch_FDN(dbterm["uuid"], connection, term)
            else:
                e = fdnDCIC.new_FDN(connection, 'OntologyTerm', term)
            if e and parents:
                phase2[e['@graph'][0]['uuid']] = parents

    print("START LOADING PHASE2 at ", str(datetime.now()))
    for tid, parents in phase2.items():
        puuids = []
        for p in parents:
            res = fdnDCIC.get_FDN('/ontology-terms/' + p, connection)
            if res.get('uuid', None):
                puuids.append(res['uuid'])
        e = fdnDCIC.patch_FDN(tid, connection, {'parents': puuids})
    end = datetime.now()
    print("FINISHED - START: ", str(start), "\tEND: ", str(end))


if __name__ == '__main__':
        main()
