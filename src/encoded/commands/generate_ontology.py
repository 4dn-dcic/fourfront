import os
import sys
import argparse
import json
from rdflib.collection import Collection
from encoded.commands.owltools import (
    Namespace,
    Owler,
    splitNameFromNamespace,
    convert2URIRef,
    isBlankNode,
    getObjectLiteralsOfType,
    subClassOf,
    SomeValuesFrom,
    IntersectionOf,
    OnProperty
)
from wranglertools.fdnDCIC import (
    FDN_Key,
    FDN_Connection,
    get_FDN
)


EPILOG = __doc__

PART_OF = "http://purl.obolibrary.org/obo/BFO_0000050"
DEVELOPS_FROM = "http://purl.obolibrary.org/obo/RO_0002202"
HUMAN_TAXON = "http://purl.obolibrary.org/obo/NCBITaxon_9606"
HAS_PART = "http://purl.obolibrary.org/obo/BFO_0000051"
ACHIEVES_PLANNED_OBJECTIVE = "http://purl.obolibrary.org/obo/OBI_0000417"


def iterative_parents(nodes, terms, data):
    '''returns all the parents traversing the term graph structure
        - (not the direct RDF graph) by iteratively following parents
        until there are no more parents
    '''
    results = []
    while 1:
        newNodes = []
        if len(nodes) == 0:
            break
        for node in nodes:
            if not terms.get(node):
                continue  # deal with a parent not being in the term dict
            results.append(node)
            if terms[node].get(data):
                for parent in terms[node][data]:
                    if parent not in results:
                        newNodes.append(parent)
        nodes = list(set(newNodes))
    return list(set(results))


def get_all_ancestors(term, terms):
    if 'closure' not in term:
        term['closure'] = []
    if 'all_parents' in term:
        words = iterative_parents(term['all_parents'], terms, 'all_parents')
        term['closure'].extend(words)
    term['closure'].append(term['term_url'])
    return term  # is this necessary


def _combine_all_parents(term):
    parents = set()
    relations = set()
    if 'parents' in term:
        parents = set(term['parents'])
    if 'relationships' in term:
        relations = set(term['relationships'])
    term['all_parents'] = list(parents | relations)
    return term


def _has_human_partof(cols):
    ans = False
    if HUMAN_TAXON in cols and PART_OF in cols:
        ans = True
    return ans


def get_termid_from_uri(uri):
    '''Given a uri - takes the last part (name) and converts _ to :
        eg. http://www.ebi.ac.uk/efo/EFO_0002784 => EFO:0002784
    '''
    return splitNameFromNamespace(uri)[0].replace('_', ':')


def get_term_name_from_rdf(class_, data):
    '''Looks for label for class in the rdf graph'''
    name = None
    try:
        name = data.rdfGraph.label(class_).__str__()
    except:
        pass
    return name


def create_term_dict(class_, termid, data, ontology_id=None):
    '''Adds basic term info to the dictionary of all terms
    '''
    term = {
        'term_id': termid,
        'term_url': class_.__str__(),
    }
    if ontology_id is not None:
        term['source_ontology'] = ontology_id
    (name, ns) = splitNameFromNamespace(term['term_url'])
    term['namespace'] = ns
    name = get_term_name_from_rdf(class_, data)
    if name is not None:
        term['term_name'] = name
    return term


def add_term_and_info(class_, term, relationship, data, terms):
    for subclass in data.rdfGraph.objects(class_, subClassOf):
        term_id = get_termid_from_uri(term)
        if terms.get(term_id) is None:
            terms[term_id] = create_term_dict(class_, term_id, data)
        if terms[term_id].get(relationship) is None:
            terms[term_id][relationship] = []
        terms[term_id][relationship].append(get_termid_from_uri(subclass))
    return terms


def process_intersection_of(class_, intersection, data, terms):
    '''Given a class with IntersectionOf predicate determine if the
        intersected class is part of human or if our term develops_from
        the class and if so make ontology_term json for it if it doesn't
        already exist
    '''
    # the intersectionOf rdf consists of a collection of 2 members
    # the first (collection[0]) is the resource uri (term)
    # the second (collection[1]) is a restriction
    collection = Collection(data.rdfGraph, intersection)
    col_list = []
    for col in data.rdfGraph.objects(collection[1]):
        # get restriction terms and add to col_list as string
        col_list.append(col.__str__())
    if _has_human_partof(col_list):
        terms = add_term_and_info(class_, collection[0], 'part_of', data, terms)
    elif DEVELOPS_FROM in col_list:
        # will we never have both part of and develops_from??
        terms = add_term_and_info(class_, collection[0], 'develops_from', data, terms)
    return terms


def process_blank_node(class_, data, terms):
    '''Given a blank node determine if there are any parent resources
        of relevant types and if so process them appropriately
    '''
    for object_ in data.rdfGraph.objects(class_, subClassOf):
        # direct parents of blank nodes
        if not isBlankNode(object_):
            # we have a resource
            for intersection in data.rdfGraph.objects(class_, IntersectionOf):
                # intersectionOf triples are checked for human part_of
                # or develops_from
                terms = process_intersection_of(class_, intersection, data, terms)
    return terms


def _find_and_add_parent_of(parent, child_id, data, terms, has_part=False):
    '''Add parent terms with the provided relationship to the 'relationships'
        field of the term - does inverse for 'has_part'

        NOTE: encode had added fields for each relationship type to the dict
        for now we'll just add to a single 'relationships' field - may need to
        modify
    '''
    for obj in data.rdfGraph.objects(parent, SomeValuesFrom):
        if not isBlankNode(obj):
            objid = get_termid_from_uri(obj)
            term2add = objid
            if has_part:
                term2add = child_id
                child_id = objid
                if child_id not in terms:
                    terms[child_id] = create_term_dict(convert2URIRef(child_id), child_id, data)
            if not terms[child_id].get('relationships'):
                terms[child_id]['relationships'] = []
            terms[child_id]['relationships'].append(term2add)
    return terms


def process_parents(class_, termid, data, terms):
    '''Gets the parents of the class - direct and those linked via
        specified relationship types
    '''
    for parent in data.get_classDirectSupers(class_, excludeBnodes=False):
        rtypes = {PART_OF: 'part_of',
                  DEVELOPS_FROM: 'develops_from',
                  HAS_PART: 'has_part',
                  ACHIEVES_PLANNED_OBJECTIVE: 'achieves_planned_objective'}
        if isBlankNode(parent):
            for s, v, o in data.rdfGraph.triples((parent, OnProperty, None)):
                rel = o.__str__()
                if rel in rtypes:
                    has_part = None
                    if rtypes[rel] == 'has_part':
                        has_part = True
                    terms = _find_and_add_parent_of(parent, termid, data, terms, has_part)
        else:
            if not terms[termid].get('parents'):
                terms[termid]['parents'] = []
            terms[termid]['parents'].append(get_termid_from_uri(parent))
    return terms


def get_synonyms(class_, data, synonym_terms):
    '''Gets synonyms for the class as strings
    '''
    return getObjectLiteralsOfType(class_, data, synonym_terms)


def get_definitions(class_, data, definition_terms):
    '''Gets definitions for the class as strings
    '''
    return getObjectLiteralsOfType(class_, data, definition_terms)


def add_slim_to_term(term, slim_terms):
    '''Checks the list of ancestor terms to see if any are slim_terms
        and if so adds the slim_term to the term in slim_term slot

        for now checking both closure and closure_with_develops_from
        but consider having only single 'ancestor' list
    '''
    slimterms2add = {}
    for slimterm in slim_terms:
        if term.get('closure') and slimterm['term_id'] in term['closure']:
            slimterms2add[slimterm['term_id']] = slimterm['uuid']
        if term.get('closure_with_develops_from') and slimterm['term_id'] in term['closure_with_develops_from']:
            slimterms2add[slimterm['term_id']] = slimterm['uuid']
    if slimterms2add:
        term['slim_terms'] = list(slimterms2add.values())
    return term


def convert2namespace(uri):
    name, ns = splitNameFromNamespace(uri)

    if '#' in uri:
        ns = ns + '#'
    else:
        ns = ns + '/'
    ns = Namespace(ns)
    return ns[name]


def get_definition_terms(connection, ontology_id):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms in that ontology and returns a list
        of OntologyTerm dicts.
    '''
    synterms = None
    ontologies = get_ontologies(connection, [ontology_id])
    if ontologies:
        ontology = ontologies[0]
        synonym_ids = ontology.get('synonym_terms')
        if synonym_ids is not None:
            synterms = [get_FDN(termid, connection) for termid in synonym_ids]

    return synterms


def get_syndef_terms(connection, ontology_id, termtype):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms or definitions in that ontology and
        returns a list of OntologyTerm dicts.
    '''
    sterms = None
    ontologies = get_ontologies(connection, [ontology_id])
    if ontologies:
        ontology = ontologies[0]
        term_ids = ontology.get(termtype)
        if term_ids is not None:
            sterms = [get_FDN(termid, connection) for termid in term_ids]

    return sterms


def get_syndef_terms_as_uri(connection, ontology_id, termtype, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms or definitions in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    sdterms = get_syndef_terms(connection, ontology_id, termtype)
    uris = [term['term_url'] for term in sdterms]
    if as_rdf:
        uris = [convert2namespace(uri) for uri in uris]
    return uris


def get_synonym_term_uris(connection, ontology_id, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    return get_syndef_terms_as_uri(connection, ontology_id, 'synonym_terms', as_rdf)


def get_definition_term_uris(connection, ontology_id, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate definitions in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    return get_syndef_terms_as_uri(connection, ontology_id, 'definition_terms', as_rdf)


def get_slim_terms(connection):
    '''Retrieves ontology_term jsons for those terms that have 'is_slim_for'
        field populated
    '''
    # currently need to hard code the categories of slims but once the ability
    # to search all can add parameters to retrieve all or just the terms in the
    # categories passed as a list
    slim_categories = ['developmental', 'assay', 'organ', 'system']
    search_suffix = 'search/?type=OntologyTerm&is_slim_for='
    slim_terms = []
    for cat in slim_categories:
        terms = get_FDN(None, connection, None, search_suffix + cat)
        try:
            # a notification indicates an issue eg. No results found
            # so ignore
            terms.get('notification')
            pass
        except:
            slim_terms.extend(terms)
    return slim_terms


def get_ontologies(connection, ont_list):
    '''return list of ontology jsons retrieved from server
        ontology jsons include linkTo items
    '''
    ontologies = []
    if ont_list == 'all':
        ontologies = get_FDN(None, connection, None, 'ontologys')
        ontologies = [get_FDN(ontology['uuid'], connection) for ontology in ontologies]
    else:
        ontologies = [get_FDN('ontologys/' + ontology, connection) for ontology in ont_list]

    # removing item not found cases with reporting
    for i, ontology in enumerate(ontologies):
        if 'Ontology' not in ontology['@type']:
            ontologies.pop(i)
    return ontologies


def connect2server(keyfile, keyname):
    '''Sets up credentials for accessing the server.  Generates a key using info
       from the named keyname in the keyfile and checks that the server can be
       reached with that key'''
    key = FDN_Key(keyfile, keyname)
    connection = FDN_Connection(key)
    print("Running on:       {server}".format(server=connection.server))
    # test connection
    if connection.check:
        return connection
    print("CONNECTION ERROR: Please check your keys.")
    return None


def parse_args(args):
    parser = argparse.ArgumentParser(
        description="Process specified Ontologies and create OntologyTerm inserts for updates",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--ontologies',
                        nargs='+',
                        default='all',
                        help="Names of ontologies to process - eg. UBERON, OBI, EFO; \
                        all retrieves all ontologies that exist in db")
    parser.add_argument('--key',
                        default='default',
                        help="The keypair identifier from the keyfile.  \
                        Default is --key=default")
    parser.add_argument('--keyfile',
                        default=os.path.expanduser("~/keypairs.json"),
                        help="The keypair file.  Default is --keyfile=%s" %
                             (os.path.expanduser("~/keypairs.json")))
    return parser.parse_args(args)


def main():
    ''' Downloads latest Ontology OWL files for Ontologies in the database
        and Updates Terms by generating json inserts
    '''
    # setup
    args = parse_args(sys.argv[1:])  # to facilitate testing
    connection = connect2server(args.keyfile, args.key)

    ontologies = get_ontologies(connection, args.ontologies)
    slim_terms = get_slim_terms(connection)

    # for testing with local copy of file pass in ontologies EFO
    # ontologies[0]['download_url'] = '/Users/andrew/Documents/work/untracked_work_ff/test_families.owl'

    # start iteratively downloading and processing ontologies
    terms = {}
    for ontology in ontologies:
        print('Processing: ', ontology['ontology_name'])
        if ontology['download_url'] is not None:
            synonym_terms = get_synonym_term_uris(connection, ontology['uuid'])
            definition_terms = get_definition_term_uris(connection, ontology['uuid'])
            data = Owler(ontology['download_url'])
            for class_ in data.allclasses:
                if isBlankNode(class_):
                    terms = process_blank_node(class_, data, terms)
                else:
                    termid = get_termid_from_uri(class_)
                    if terms.get(termid) is None:
                        terms[termid] = create_term_dict(class_, termid, data, ontology['uuid'])
                    else:
                        if 'term_name' not in terms[termid]:
                            terms[termid]['term_name'] = get_term_name_from_rdf(class_, data)
                        if 'source_ontology' not in terms[termid]:
                            terms[termid]['source_ontology'] = ontology['uuid']
                    # deal with parents
                    terms = process_parents(class_, termid, data, terms)

            # here we should have all terms for a single ontology

            # add other term info - synonyms, definitions, ontology, namespace
            for termid, term in terms.items():
                termuri = convert2URIRef(term['term_url'])

                # add any missing synonyms
                synonyms = get_synonyms(termuri, data, synonym_terms)
                if synonyms:
                    if 'synonyms' not in term:
                        term['synonyms'] = []
                    for syn in synonyms:
                        if syn not in term['synonyms']:
                            term['synonyms'].append(syn)

                # we only want one definition - may want to add some checking if multiple
                if term.get('definition') is None:
                    definitions = get_definitions(termuri, data, definition_terms)
                    if definitions:
                        term['definition'] = definitions[0]

    # at this point we've processed the rdf of all the ontologies
    for termid, term in terms.items():
        term = _combine_all_parents(term)
    for termid, term in terms.items():
        term = get_all_ancestors(term, terms)
        term = add_slim_to_term(term, slim_terms)
    for termid, term in terms.items():
        if 'relationships' in term:
            del term['relationships']
        if 'all_parents' in term:
            del term['all_parents']
        del term['closure']  # should always have this

    with open('test_ontology.json', 'w') as outfile:
        outfile.write('[\n')
        for term in terms.values():
            json.dump(term, outfile, indent=4)
            outfile.write('\n')
        outfile.write(']\n')


if __name__ == '__main__':
    main()
