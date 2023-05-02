# Script to generate a SAMPLE ontology file (to stdout) based on a give ontology file (e.g. generated
# by the generate-ontology script), containing (nominally) just the specified number of initial ontology
# term records from the source ontology file, OR specified by a (comma-separated) list of ontology term
# uuids or ids. Also INCLUDED in the sample will be ALL parent ontology term records (RECURSIVELY) upon
# which each chosen ontology term record DEPENDS (this is the important/value-add bit).
#
# Example Usage:
# create-sample-ontology-file-from-ontology-file --help
# create-sample-ontology-file-from-ontology-file ontology_file.json --count NUMBER > output.json
# create-sample-ontology-file-from-ontology-file ontology_file.json --uuids COMMA-SEPARATED-UUIDS > output.json

import argparse
import json
import io
import sys
from typing import Optional


def main():
    args = parse_args(sys.argv[1:])
    sample_ontology_json = create_sample_ontology_from_ontology_file(args.ontology_file,
                                                                     args.count, args.uuids, args.terms,
                                                                     args.quiet)
    print(json.dumps(sample_ontology_json, indent=4))


def parse_args(args):
    parser = argparse.ArgumentParser()
    parser.add_argument('ontology_file', help="Source ontology file.")
    parser.add_argument('--count', default=None, type=int,
                        help="Number of ontology term records to put in the sample; default is 1.")
    parser.add_argument('--uuids', default=None, type=str,
                        help="One or more comma-separated list of ontology term uuids.")
    parser.add_argument('--terms', default=None, type=str,
                        help="One or more comma-separated list of ontology term ids.")
    parser.add_argument('--quiet', default=False, action='store_true',
                        help="If specified silently supress warnings/errors.")
    args = parser.parse_args(args)
    if args.count is not None and args.count <= 0:
        print("Count must be greater than zero!")
        exit(1)
    if args.uuids:
        if args.count:
            print("May not specify both count and uuids!")
            exit(1)
        args.uuids = [uuid.strip() for uuid in args.uuids.split(",") if uuid.strip()]
    if args.terms:
        if args.count:
            print("May not specify both count and terms!")
            exit(1)
        args.terms = [uuid.strip() for uuid in args.terms.split(",") if uuid.strip()]
    if not args.count and not args.uuids and not args.terms:
        print("Must specify either --count or --uuids or --terms")
        print(args)
        exit(1)
    return args


def create_sample_ontology_from_ontology_file(ontology_file: str,
                                              count: Optional[int],
                                              uuids: Optional[list],
                                              terms: Optional[list],
                                              quiet: bool = False) -> dict:
    """
    Returns a sample (subset) ontology (JSON/dictionary) of the given ontology file based on
    either the (initial) count ontology term records in the file, OR based on the given list
    of uuids and/or terms. This INCLUDES any/all referenced parent (RECURSIVELY) ontology term
    records. Returned list is SORTED by uuid (for debugging/troubleshooting consistency).
    """
    with io.open(ontology_file, "r") as fp:
        ontology_json = json.load(fp)
    ontology_terms_by_uuid = {ontology_term["uuid"]: ontology_term for ontology_term in ontology_json["ontology_term"]}
    ontology_terms_by_term_id = {ontology_term["term_id"]: ontology_term
                                 for ontology_term in ontology_json["ontology_term"]if ontology_term.get("term_id")}
    sample_ontology_term_uuids = get_unique_sample_ontology_term_uuids(count, uuids, terms,
                                                                       quiet,
                                                                       ontology_terms_by_uuid,
                                                                       ontology_terms_by_term_id)
    sample_ontology_terms = get_ontology_terms(sample_ontology_term_uuids, quiet, ontology_terms_by_uuid)
    ontology_json["ontology_term"] = sample_ontology_terms
    return ontology_json


def get_unique_sample_ontology_term_uuids(count: Optional[int],
                                          uuids: Optional[list],
                                          terms: Optional[list],
                                          quiet: bool,
                                          source_ontology_terms_by_uuid: dict,
                                          source_ontology_terms_by_term_id: dict) -> list:
    """
    Returns a set of ontology term uuids for the given number of (initial) ontology term records in
    the give source ontology, OR the for the ontology terms specified in the given list of ontology
    term uuids. This will also INCLUDE uuids for any/all referenced parent (recursively) ontology terms.
    """
    if not uuids and not terms:
        chosen_ontology_terms = source_ontology_terms_by_uuid
    else:
        chosen_ontology_terms = {}
        if uuids:
            for uuid in uuids:
                chosen_ontology_term = source_ontology_terms_by_uuid.get(uuid)
                if chosen_ontology_term:
                    chosen_ontology_terms[uuid] = chosen_ontology_term
                elif not quiet:
                    raise Exception(f"Specified ontology term uuid ({uuid}) not found source ontology!")
        if terms:
            for term in terms:
                chosen_ontology_term = source_ontology_terms_by_term_id.get(term)
                if chosen_ontology_term:
                    chosen_ontology_terms[chosen_ontology_term["uuid"]] = chosen_ontology_term
                elif not quiet:
                    raise Exception(f"Specified ontology term id ({term}) not found source ontology!")
    ontology_term_uuids = set()
    for ontology_term_uuid in chosen_ontology_terms:
        if count is not None:
            if count <= 0:
                break
            count -= 1
        ontology_term = source_ontology_terms_by_uuid[ontology_term_uuid]
        ontology_term_uuids.add(ontology_term_uuid)
        ontology_term_uuids.update(get_ontology_term_parent_uuids(ontology_term, quiet, source_ontology_terms_by_uuid))
    if not ontology_term_uuids and not quiet:
        raise Exception("No ontology terms chosen from source ontology!")
    return sorted(ontology_term_uuids)


def get_ontology_term_parent_uuids(ontology_term: dict, quiet: bool, source_ontology_terms_by_uuid: dict) -> set:
    """
    Returns the full set of (ontology term) uuids of all parents (recursively)
    of the given ontology term, or an empty set if None.
    """
    parents = set()
    ontology_term_parents = ontology_term.get("parents")
    if ontology_term_parents:
        for parent_ontology_term_uuid in ontology_term_parents:
            if not source_ontology_terms_by_uuid.get(parent_ontology_term_uuid):
                print(f"WARNING: Parent ({parent_ontology_term_uuid}) of ontology term"
                      f" not found in ontology: {ontology_term['uuid']}")
                return set()
            parent_ontology_term = source_ontology_terms_by_uuid[parent_ontology_term_uuid]
            if not parent_ontology_term:
                if not quiet:
                    raise Exception(f"Referenced parent ontology term not found in ontology:"
                                    " {parent_ontology_term_uuid}")
            else:
                parents.add(parent_ontology_term_uuid)
                parents.update(get_ontology_term_parent_uuids(parent_ontology_term,
                                                              quiet,
                                                              source_ontology_terms_by_uuid))
    return parents


def get_ontology_terms(ontology_term_uuids: list, quiet: bool, source_ontology_terms_by_uuid: dict) -> list:
    """
    Returns a list of ontology terms (list of dictionary) for the given set of ontology term uuids.
    If an ontology term is not found for a given ontology term uuid is not found then and exception is raised.
    """
    ontology_terms = []
    for ontology_term_uuid in ontology_term_uuids:
        ontology_term = source_ontology_terms_by_uuid[ontology_term_uuid]
        if not ontology_term:
            if not quiet:
                raise Exception(f"Ontology term term not found in ontology: {ontology_term_uuid}")
        else:
            ontology_terms.append(ontology_term)
    return ontology_terms


if __name__ == '__main__':
    main()
