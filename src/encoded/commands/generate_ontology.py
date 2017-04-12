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
    isURIRef,
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


def get_all_ancestors(term, terms, field):
    '''Adds a list of all the term's ancestors to a term up to the root
        of the ontology and adds to closure fields - used in adding slims
    '''
    closure = 'closure'
    if field == 'development':
        closure = 'closure_with_develops_from'
    if closure not in term:
        term[closure] = []
    if field in term:
        words = iterative_parents(term[field], terms, field)
        term[closure].extend(words)
    term[closure].append(term['term_id'])
    return term  # is this necessary


def _combine_all_parents(term):
    '''internal method to combine the directly related terms into 2 uniqued lists
        of all_parents or development terms that will be used as starting terms
        to generate closures of all ancestors

        the development terms have those with has_part_inverse filtered out to
        prevent over expansion of the ancestors to incorrect associations
    '''
    parents = set()
    relations = set()
    develops = set()
    if 'parents' in term:
        parents = set(term['parents'])
    if 'relationships' in term:
        relations = set(term['relationships'])
    if 'develops_from' in term:
        develops = set(term['develops_from'])
    term['all_parents'] = list(parents | relations)
    development = list(parents | relations | develops)
    if 'has_part_inverse' in term:
        development = [dev for dev in development if dev not in term['has_part_inverse']]
    term['development'] = development
    return term


def _has_human(cols):
    '''True if human taxon is part of the collection'''
    ans = False
    human = HUMAN_TAXON
    if cols:
        if isURIRef(cols[0]):
            human = convert2URIRef(human)
        if human in cols:
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


def _add_term_and_info(class_, parent_uri, relationship, data, terms):
    '''Internal function to add new terms that are part of an IntersectionOf
        along with the appropriate relationships
    '''
    if not terms:
        terms = {}
    for subclass in data.rdfGraph.objects(class_, subClassOf):
        term_id = get_termid_from_uri(parent_uri)
        if terms.get(term_id) is None:
            terms[term_id] = create_term_dict(parent_uri, term_id, data)
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
    if _has_human(col_list):
        if PART_OF in col_list:
            terms = _add_term_and_info(class_, collection[0], 'relationships', data, terms)
        elif DEVELOPS_FROM in col_list:
            terms = _add_term_and_info(class_, collection[0], 'develops_from', data, terms)
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


def _find_and_add_parent_of(parent, child, data, terms, has_part=False, relation=None):
    '''Add parent terms with the provided relationship to the 'relationships'
        field of the term - treating has_part specially

        NOTE: encode had added fields for each relationship type to the dict
        our default is a  'relationships' field - but can pass in a specific
        relation string eg. develops_from and that will get added as field
    '''
    child_id = get_termid_from_uri(child)
    for obj in data.rdfGraph.objects(parent, SomeValuesFrom):
        if not isBlankNode(obj):
            objid = get_termid_from_uri(obj)
            term2add = objid
            if has_part:
                relation = 'has_part_inverse'
                term2add = child_id
                child_id = objid
                child = obj
                if child_id not in terms:
                    terms[child_id] = create_term_dict(child, child_id, data)
            if relation is None:
                relation = 'relationships'
            if not terms[child_id].get(relation):
                terms[child_id][relation] = []
            terms[child_id][relation].append(term2add)
    return terms


def process_parents(class_, data, terms):
    '''Gets the parents of the class - direct and those linked via
        specified relationship types
    '''
    termid = get_termid_from_uri(class_)
    for parent in data.get_classDirectSupers(class_, excludeBnodes=False):
        rtypes = {PART_OF: 'part_of',
                  DEVELOPS_FROM: 'develops_from',
                  HAS_PART: 'has_part',
                  ACHIEVES_PLANNED_OBJECTIVE: 'achieves_planned_objective'}
        if isBlankNode(parent):
            for s, v, o in data.rdfGraph.triples((parent, OnProperty, None)):
                rel = o.__str__()
                if rel in rtypes:
                    relation = None
                    has_part = None
                    if rtypes[rel] == 'has_part':
                        has_part = True
                    if rtypes[rel] == 'develops_from':
                        relation = rtypes[rel]
                    # terms = _find_and_add_parent_of(parent, termid, data, terms, has_part, relation)
                    terms = _find_and_add_parent_of(parent, class_, data, terms, has_part, relation)
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


def _cleanup_non_fields(terms):
    '''Removes unwanted fields and empty terms from final json'''
    to_delete = ['relationships', 'all_parents', 'development',
                 'has_part_inverse', 'develops_from',
                 'closure', 'closure_with_develops_from',
                 'achieves_planned_objective', 'part_of'  # these 2 should never be present
                 ]
    tids2delete = []
    for termid, term in terms.items():
        if not term:
            tids2delete.append(termid)
        else:
            for field in to_delete:
                if field in term:
                    del term[field]
    for tid in tids2delete:
        del terms[tid]
    return terms


def add_slim_to_term(term, slim_terms):
    '''Checks the list of ancestor terms to see if any are slim_terms
        and if so adds the slim_term to the term in slim_term slot

        for now checking both closure and closure_with_develops_from
        but consider having only single 'ancestor' list
    '''
    slimterms2add = {}
    for slimterm in slim_terms:
        if term.get('closure') and slimterm['term_id'] in term['closure']:
            if slimterm['is_slim_for'] != 'developmental':
                slimterms2add[slimterm['term_id']] = slimterm['uuid']
        if term.get('closure_with_develops_from') and slimterm['term_id'] in term['closure_with_develops_from']:
            if slimterm['is_slim_for'] == 'developmental':
                slimterms2add[slimterm['term_id']] = slimterm['uuid']
    if slimterms2add:
        term['slim_terms'] = list(slimterms2add.values())
    return term


def add_slim_terms(terms, slim_terms):
    for termid, term in terms.items():
        term = _combine_all_parents(term)
    for termid, term in terms.items():
        term = get_all_ancestors(term, terms, 'all_parents')
        term = get_all_ancestors(term, terms, 'development')
        term = add_slim_to_term(term, slim_terms)
    terms = _cleanup_non_fields(terms)
    return terms


def convert2namespace(uri):
    name, ns = splitNameFromNamespace(uri)

    if '#' in uri:
        ns = ns + '#'
    else:
        ns = ns + '/'
    ns = Namespace(ns)
    return ns[name]


def get_definition_terms1(connection, ontology_id):
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


def get_syndef_terms_as_uri(connection, ontology, termtype, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms or definitions in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    sdterms = ontology.get(termtype)
    uris = [term['term_url'] for term in sdterms]
    if as_rdf:
        uris = [convert2namespace(uri) for uri in uris]
    return uris


def get_synonym_term_uris(connection, ontology, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    return get_syndef_terms_as_uri(connection, ontology, 'synonym_terms', as_rdf)


def get_definition_term_uris(connection, ontology, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate definitions in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    return get_syndef_terms_as_uri(connection, ontology, 'definition_terms', as_rdf)


def get_slim_terms(connection):
    '''Retrieves ontology_term jsons for those terms that have 'is_slim_for'
        field populated
    '''
    # currently need to hard code the categories of slims but once the ability
    # to search all can add parameters to retrieve all or just the terms in the
    # categories passed as a list
    slim_categories = ['developmental', 'assay', 'organ', 'system']
    search_suffix = 'search/?type=OntologyTerm&limit=all&is_slim_for='
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


def get_existing_ontology_terms(connection):
    '''Retrieves all existing ontology terms from the db
    '''
    search_suffix = 'search/?type=OntologyTerm&limit=all'
    return get_FDN(None, connection, None, search_suffix)


def get_ontologies(connection, ont_list):
    '''return list of ontology jsons retrieved from server
        ontology jsons are now fully embedded
    '''
    ontologies = []
    if ont_list == 'all':
        ontologies = get_FDN(None, connection, None, 'ontologys')
    else:
        ontologies = [get_FDN('ontologys/' + ontology, connection, frame='embedded') for ontology in ont_list]

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


def remove_obsoletes_and_unnamed(terms):
    terms = {termid: term for termid, term in terms.items()
             if ('parents' not in term) or ('ObsoleteClass' not in term['parents'])}
    terms = {termid: term for termid, term in terms.items()
             if 'term_name' in term and (term['term_name'] and not term['term_name'].lower().startswith('obsolete'))}
    return terms


def verify_and_update_ontology(terms, ontologies):
    '''checks to be sure the ontology associated with the term agrees with
        the term prefix.  If it doesn't it is likely that the term was
        imported into a previously processed ontology and so the ontlogy
        of the term should be updated to the one that matches the prefix
    '''
    ont_lookup = {o['uuid']: o['ontology_prefix'] for o in ontologies}
    ont_prefi = {v: k for k, v in ont_lookup.items()}
    for termid, term in terms.items():
        if ont_lookup.get(term['source_ontology'], None):
            prefix = termid.split(':')[0]
            if prefix in ont_prefi:
                if prefix != ont_lookup[term['source_ontology']]:
                    term['source_ontology'] = ont_prefi[prefix]
    return terms


def _terms_match(t1, t2):
    '''check that all the fields in the first term t1 are in t2 and
        have the same values
    '''
    for k, val in t1.items():
        if k not in t2:
            return False
        else:
            if k == 'parents':
                if len(val) != len(t2['parents']):
                    return False
                for p1 in val:
                    found = False
                    for p2 in t2['parents']:
                        # this bit depends on the {link_id: val, display_title: val}
                        # form of embedded info - may need to make more complex to deal with
                        # other scenarios like a list of uuids or fully embedded terms
                        if p1 in p2['link_id']:
                            found = True
                    if not found:
                        return False
            elif k == 'source_ontology':
                # same as above comment to potentially deal with different response
                t2ont = t2['source_ontology']['link_id']
                if val not in t2ont:
                    return False
            else:
                if val != t2[k]:
                    return False
    return True


def id_post_and_patch(terms, dbterms, ontologies, rm_unchanged=True, set_obsoletes=True):
    '''compares terms to terms that are already in db - if no change
        removes them from the list of updates, if new adds to post dict,
        if changed adds uuid and add to patch dict
    '''
    to_post = {}
    to_patch = {}
    tid2uuid = {}  # to keep track of existing uuids
    for tid, term in terms.items():
        if tid not in dbterms:
            # new term
            to_post[tid] = term
        else:
            # add uuid to mapping
            dbterm = dbterms[tid]
            uuid = dbterm['uuid']
            tid2uuid[term['term_id']] = uuid
            if rm_unchanged and _terms_match(term, dbterm):
                # check to see if contents of term are also in db_term
                continue
            else:
                term['uuid'] = uuid
                to_patch[uuid] = term

    if set_obsoletes:
        # go through db terms and find which aren't in terms and set status
        # to obsolete by adding to to_patch
        # need a way to exclude our own terms and synonyms and definitions
        ontids = [o['uuid'] for o in ontologies]

        for tid, term in dbterms.items():
            if tid not in terms:
                if not term.get('source_ontology') or term['source_ontology'] not in ontids:
                    continue
                dbuid = term['uuid']
                # add simple term with only status and uuid to to_patch
                # a little worried about obsolete terms getting left as
                # parents or slims so need to test that
                to_patch[dbuid] = {'status': 'obsolete', 'uuid': dbuid}
                tid2uuid[term['term_id']] = dbuid

    return {'post': to_post, 'patch': to_patch, 'idmap': tid2uuid}


def add_uuids(partitioned_terms):
    '''adds new uuids to terms to post and existing uuids to patch terms
        this function depends on the partitioned term dictionary that
        contains keys 'post', 'patch' and 'idmap'
    '''
    from uuid import uuid4
    # go through all the new terms and add uuids to them and idmap
    idmap = partitioned_terms.get('idmap', {})
    newterms = partitioned_terms.get('post', None)
    if newterms:
        for tid, term in newterms.items():
            uid = str(uuid4())
            idmap[tid] = uid
            term['uuid'] = uid
        # now that we should have all uuids go through again
        # and switch parent term ids for uuids
        for term in newterms.values():
            if term.get('parents'):
                puuids = []
                for p in term['parents']:
                    if p in idmap:
                        puuids.append(idmap[p])
                    else:
                        print('WARNING - ', p, ' MSSING FROM IDMAP')
                term['parents'] = puuids
    # and finally do the same for the patches
    patches = partitioned_terms.get('patch', None)
    if patches:
        for term in patches.values():
            if term.get('parents'):
                puuids = []
                for p in term['parents']:
                    if p in idmap:
                        puuids.append(idmap[p])
                    else:
                        print('WARNING - ', p, ' MSSING FROM IDMAP')
                term['parents'] = puuids
    try:
        post = list(newterms.values())
    except AttributeError:
        post = None
    try:
        patch = list(patches.values())
    except AttributeError:
        patch = None
    return [post, patch]


def add_additional_term_info(terms, data, synonym_terms, definition_terms):
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
    return terms


def download_and_process_owl(ontology, connection, terms):
    synonym_terms = get_synonym_term_uris(connection, ontology)
    definition_terms = get_definition_term_uris(connection, ontology)
    data = Owler(ontology['download_url'])
    for class_ in data.allclasses:
        if isBlankNode(class_):
            terms = process_blank_node(class_, data, terms)
        else:
            if not terms:
                terms = {}
            termid = get_termid_from_uri(class_)
            if terms.get(termid) is None:
                terms[termid] = create_term_dict(class_, termid, data, ontology['uuid'])
            else:
                if 'term_name' not in terms[termid]:
                    terms[termid]['term_name'] = get_term_name_from_rdf(class_, data)
                if 'source_ontology' not in terms[termid]:
                    terms[termid]['source_ontology'] = ontology['uuid']
            # deal with parents
            # terms = process_parents(class_, termid, data, terms)
            terms = process_parents(class_, data, terms)
    # add synonyms and definitions
    terms = add_additional_term_info(terms, data, synonym_terms, definition_terms)
    return terms


def write_outfile(terms, filename, pretty=False):
    '''terms is a list of dicts
        write to file by default as a json list or if pretty
        then same with indents and newlines
    '''
    indent = None
    lenterms = len(terms)
    with open(filename, 'w') as outfile:
        if pretty:
            indent = 4
            outfile.write('[\n')
        else:
            outfile.write('[')
        for i, term in enumerate(terms):
            json.dump(term, outfile, indent=indent)
            if i != lenterms - 1:
                outfile.write(',')
            if pretty:
                outfile.write('\n')
        outfile.write(']')
        if pretty:
            outfile.write('\n')


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
    parser.add_argument('--outfile',
                        default='ontology.json',
                        help="The name of the output file.  \
                        Default is --outfile=ontology.json")
    parser.add_argument('--pretty',
                        default=False,
                        action='store_true',
                        help="Default False - set True if you want json format easy to read, hard to parse")
    parser.add_argument('--full',
                        default=False,
                        action='store_true',
                        help="Default False - set True to generate full file to load - do not filter out existing unchanged terms")
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
    for i, o in enumerate(ontologies):
        if o['ontology_name'].startswith('4DN'):
            ontologies.pop(i)
    slim_terms = get_slim_terms(connection)
    db_terms = get_existing_ontology_terms(connection)
    db_terms = {t['term_id']: t for t in db_terms}

    # start iteratively downloading and processing ontologies
    terms = {}
    for ontology in ontologies:
        print('Processing: ', ontology['ontology_name'])
        if ontology['download_url'] is not None:
            # get all the terms for an ontology
            terms = download_and_process_owl(ontology, connection, terms)

    # at this point we've processed the rdf of all the ontologies
    if terms:
        terms = add_slim_terms(terms, slim_terms)
        terms = remove_obsoletes_and_unnamed(terms)
        terms = verify_and_update_ontology(terms, ontologies)
        filter_unchanged = True
        if args.full:
            filter_unchanged = False
        partitioned_terms = id_post_and_patch(terms, db_terms, ontologies, filter_unchanged)
        terms2write = add_uuids(partitioned_terms)

        name, ext = args.outfile.split('.', -1)
        postfile = name + '_post.' + ext
        patchfile = name + '_patch.' + ext
        write_outfile(terms2write[0], postfile)
        write_outfile(terms2write[1], patchfile)


if __name__ == '__main__':
    main()
