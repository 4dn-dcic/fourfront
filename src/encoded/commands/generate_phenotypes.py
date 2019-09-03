import os
import json
import sys
import argparse
import datetime
from uuid import uuid4
from collections import Counter
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
    OnProperty,
    Deprecated
)
from dcicutils.ff_utils import (
    get_authentication_with_server,
    get_metadata,
    search_metadata,
    unified_authentication
)
from dcicutils.s3_utils import s3Utils
from pyramid.paster import get_app

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
    if closure not in term:
        term[closure] = []
    if field in term:
        words = iterative_parents(term[field], terms, field)
        term[closure].extend(words)
    term[closure].append(term['hpo_id'])
    return term  # is this necessary


# def _combine_all_parents(term):
#     '''internal method to combine the directly related terms into 2 uniqued lists
#         of all_parents or development terms that will be used as starting terms
#         to generate closures of all ancestors
#
#         the development terms have those with has_part_inverse filtered out to
#         prevent over expansion of the ancestors to incorrect associations
#     '''
#     parents = set()
#     relations = set()
#     develops = set()
#     if 'parents' in term:
#         parents = set(term['parents'])
#     if 'relationships' in term:
#         relations = set(term['relationships'])
#     if 'develops_from' in term:
#         develops = set(term['develops_from'])
#     term['all_parents'] = list(parents | relations)
#     development = list(parents | relations | develops)
#     if 'has_part_inverse' in term:
#         development = [dev for dev in development if dev not in term['has_part_inverse']]
#     term['development'] = development
#     return term


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
    except AttributeError:
        pass
    return name


def create_term_dict(class_, termid, data):
    '''Adds basic term info to the dictionary of all terms
    '''
    term = {
        'hpo_id': termid,
        'hpo_url': class_.__str__(),
    }
    name = get_term_name_from_rdf(class_, data)
    if name is not None:
        term['phenotype_name'] = name
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


# def process_intersection_of(class_, intersection, data, terms):
#     '''Given a class with IntersectionOf predicate determine if the
#         intersected class is part of human or if our term develops_from
#         the class and if so make ontology_term json for it if it doesn't
#         already exist
#     '''
#     # the intersectionOf rdf consists of a collection of 2 members
#     # the first (collection[0]) is the resource uri (term)
#     # the second (collection[1]) is a restriction
#     collection = Collection(data.rdfGraph, intersection)
#     col_list = []
#     for col in data.rdfGraph.objects(collection[1]):
#         # get restriction terms and add to col_list as string
#         col_list.append(col.__str__())
#     if _has_human(col_list):
#         if PART_OF in col_list:
#             terms = _add_term_and_info(class_, collection[0], 'relationships', data, terms)
#         elif DEVELOPS_FROM in col_list:
#             terms = _add_term_and_info(class_, collection[0], 'develops_from', data, terms)
#     return terms


# def process_blank_node(class_, data, terms, simple=False):
#     '''Given a blank node determine if there are any parent resources
#         of relevant types and if so process them appropriately
#     '''
#     for object_ in data.rdfGraph.objects(class_, subClassOf):
#         # direct parents of blank nodes
#         if not isBlankNode(object_):
#             if not simple:
#                 # we have a resource
#                 for intersection in data.rdfGraph.objects(class_, IntersectionOf):
#                     # intersectionOf triples are checked for human part_of
#                     # or develops_from
#                     terms = process_intersection_of(class_, intersection, data, terms)
#     return terms


# def _find_and_add_parent_of(parent, child, data, terms, has_part=False, relation=None):
#     '''Add parent terms with the provided relationship to the 'relationships'
#         field of the term - treating has_part specially
#
#         NOTE: encode had added fields for each relationship type to the dict
#         our default is a  'relationships' field - but can pass in a specific
#         relation string eg. develops_from and that will get added as field
#     '''
#     child_id = get_termid_from_uri(child)
#     for obj in data.rdfGraph.objects(parent, SomeValuesFrom):
#         if not isBlankNode(obj):
#             objid = get_termid_from_uri(obj)
#             term2add = objid
#             if has_part:
#                 relation = 'has_part_inverse'
#                 term2add = child_id
#                 child_id = objid
#                 child = obj
#                 if child_id not in terms:
#                     terms[child_id] = create_term_dict(child, child_id, data)
#             if relation is None:
#                 relation = 'relationships'
#             if not terms[child_id].get(relation):
#                 terms[child_id][relation] = []
#             terms[child_id][relation].append(term2add)
#     return terms


def process_parents(class_, data, terms):
    '''Gets the parents of the class - direct and those linked via
        specified relationship types
    '''
    termid = get_termid_from_uri(class_)
    for parent in data.get_classDirectSupers(class_, excludeBnodes=False):
        # rtypes = {PART_OF: 'part_of',
        #           DEVELOPS_FROM: 'develops_from',
        #           HAS_PART: 'has_part',
        #           ACHIEVES_PLANNED_OBJECTIVE: 'achieves_planned_objective'}
        if isBlankNode(parent):
            continue
        #     for s, v, o in data.rdfGraph.triples((parent, OnProperty, None)):
        #         rel = o.__str__()
        #         if rel in rtypes:
        #             relation = None
        #             has_part = None
        #             if rtypes[rel] == 'has_part':
        #                 has_part = True
        #             if rtypes[rel] == 'develops_from':
        #                 relation = rtypes[rel]
        #             # terms = _find_and_add_parent_of(parent, termid, data, terms, has_part, relation)
        #             terms = _find_and_add_parent_of(parent, class_, data, terms, has_part, relation)
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
    to_delete = 'closure'
    tids2delete = []
    for termid, term in terms.items():
        if not term:
            tids2delete.append(termid)
        else:
            if to_delete in term:
                del term[to_delete]
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
        if term.get('closure') and slimterm['hpo_id'] in term['closure']:
            slimterms2add[slimterm['hpo_id']] = slimterm['hpo_id']
    if slimterms2add:
        term['slim_terms'] = list(slimterms2add.values())
    return term


def add_slim_terms(terms, slim_terms):
    for termid, term in terms.items():
        term = get_all_ancestors(term, terms, 'parents')
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


def get_syndef_terms_as_uri(ontology, termtype, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms or definitions in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    sdterms = ontology.get(termtype)
    uris = [term['term_url'] for term in sdterms if term is not None]
    if as_rdf:
        uris = [convert2namespace(uri) for uri in uris]
    return uris


def get_synonym_term_uris(ontology, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    return get_syndef_terms_as_uri(ontology, 'synonym_terms', as_rdf)


def get_definition_term_uris(ontology, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate definitions in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    return get_syndef_terms_as_uri(ontology, 'definition_terms', as_rdf)


def get_slim_terms(connection):
    '''Retrieves phenotype jsons for those phenotypes that have 'is_slim_for'
        field populated
    '''
    # currently need to hard code the categories of slims but once the ability
    # to search all can add parameters to retrieve all or just the terms in the
    # categories passed as a list
    slim_categories = ['Phenotypic abnormality']
    search_suffix = 'search/?type=Phenotype&is_slim_for='
    slim_terms = []
    for cat in slim_categories:
        try:
            terms = search_metadata(search_suffix + cat, connection)
            slim_terms.extend(terms)
        except TypeError as e:
            print(e)
            continue
    return slim_terms


def get_existing_phenotypes(connection):
    '''Retrieves all existing phenotypes from db '''
    search_suffix = 'search/?type=Phenotype'
    db_terms = search_metadata(search_suffix, connection, page_limit=200, is_generator=True)
    return {t['hpo_id']: t for t in db_terms}


def get_ontology(connection, ont):
    '''return HP ontology json retrieved from server
        ontology jsons are now fully embedded
    '''
    ontology = get_metadata('ontologys/' + ont, connection)
    if 'Ontology' not in ontology['@type']:
        return None
    return ontology


def connect2server(env=None, key=None):
    '''Sets up credentials for accessing the server.  Generates a key using info
       from the named keyname in the keyfile and checks that the server can be
       reached with that key.
       Also handles keyfiles stored in s3'''
    if key == 's3':
        assert env
        key = unified_authentication(None, env)

    if all([v in key for v in ['key', 'secret', 'server']]):
        import ast
        key = ast.literal_eval(key)

    try:
        auth = get_authentication_with_server(key, env)
    except Exception:
        print("Authentication failed")
        sys.exit(1)

    print("Running on: {server}".format(server=auth.get('server')))
    return auth


def remove_obsoletes_and_unnamed(terms):
    terms = {termid: term for termid, term in terms.items()
             if ('parents' not in term) or ('ObsoleteClass' not in term['parents'])}
    terms = {termid: term for termid, term in terms.items()
             if 'phenotype_name' in term and (term['phenotype_name'] and not term['phenotype_name'].lower().startswith('obsolete'))}
    return terms


# def verify_and_update_ontology(terms, ontologies):
#     '''checks to be sure the ontology associated with the term agrees with
#         the term prefix.  If it doesn't it is likely that the term was
#         imported into a previously processed ontology and so the ontlogy
#         of the term should be updated to the one that matches the prefix
#     '''
#     ont_lookup = {o['uuid']: o['ontology_prefix'] for o in ontologies}
#     ont_prefi = {v: k for k, v in ont_lookup.items()}
#     for termid, term in terms.items():
#         if ont_lookup.get(term['source_ontology'], None):
#             prefix = termid.split(':')[0]
#             if prefix in ont_prefi:
#                 if prefix != ont_lookup[term['source_ontology']]:
#                     term['source_ontology'] = ont_prefi[prefix]
#     return terms


# def _get_t_id(val):
#     # val can be: uuid string, dict with @id, dict with uuid if fully embedded
#     try:
#         linkid = val.get('@id')
#         if linkid is None:
#             linkid = val.get('term_id')
#         return linkid
#     except AttributeError:
#         return val


def _format_as_raw(val):
    if isinstance(val, dict):
        if 'uuid' in val:
            return val.get('uuid')
        else:
            d = {}
            for f, v in val.items():
                nv = _format_as_raw(v)
                d[f] = nv
            return d
    elif isinstance(val, list):
        nl = []
        for i in val:
            ni = _format_as_raw(i)
            nl.append(ni)
        return nl
    else:
        return val


def get_raw_form(term):
    ''' takes a term dict that could be in embedded or object format
        and transforms to raw (so uuids) are used for linked items
    '''
    raw_term = {}
    for field, val in term.items():
        if isinstance(val, str):
            raw_term[field] = val
        else:
            rawval = _format_as_raw(val)
            if rawval:
                raw_term[field] = rawval

    return raw_term


def compare_terms(t1, t2):
    '''check that all the fields in the first term t1 are in t2 and
        have the same values
    '''
    diff = {}
    for k, val in t1.items():
        if k not in t2:
            diff[k] = val
        elif k == 'parents' or k == 'slim_terms' or k == 'synonyms':
                if (len(val) != len(t2[k])) or (Counter(val) != Counter(t2[k])):
                    diff[k] = val
        elif val != t2[k]:
            diff[k] = val
    return diff


def check_for_fields_to_keep(term, dbterm):
    ''' see if any of the fields that are not added from the owl
        are present and also check for only other fields that have
        changed
    '''
    patches = {'uuid': term.get('uuid')}
    if 'is_slim_for' in dbterm:
        patches['is_slim_for'] = dbterm['is_slim_for']
    if 'comment' in dbterm:  # should alwawys be true
        patches['comment'] = dbterm['comment']
    return patches


def id_fields2patch(term, dbterm, rm_unch):
    ''' Looks at 2 terms and determines what fields to update
    '''
    rawdbterm = get_raw_form(dbterm)
    diff = compare_terms(term, rawdbterm)
    if rm_unch and not diff:
        return None
    elif rm_unch:
        term = check_for_fields_to_keep(term, rawdbterm)
        term.update(diff)
        return term
    else:
        return term


def id_post_and_patch(terms, dbterms, rm_unchanged=True, set_obsoletes=True):
    '''compares terms to terms that are already in db - if no change
        removes them from the list of updates, if new adds to post dict,
        if changed adds uuid and add to patch dict
    '''
    to_update = []
    to_post = []
    to_patch = 0
    obsoletes = 0
    tid2uuid = {}  # to keep track of existing uuids
    for tid, term in terms.items():
        if tid not in dbterms:
            # new term
            uid = str(uuid4())
            term['uuid'] = uid
            if tid in tid2uuid:
                print("WARNING HAVE SEEN {} BEFORE!".format(tid))
                print("PREVIOUS={}; NEW={}".format(tid2uuid[tid], uid))
            to_update.append(term)
            tid2uuid[tid] = uid
            to_post.append(tid)
        else:
            # add uuid to mapping and existing term
            dbterm = dbterms[tid]
            uuid = dbterm['uuid']
            if tid in tid2uuid:
                print("WARNING HAVE SEEN {} BEFORE!".format(tid))
                print("PREVIOUS={}; NEW={}".format(tid2uuid[tid], uuid))
            tid2uuid[tid] = uuid
            term['uuid'] = uuid

    # all terms have uuid - now add uuids to linked terms
    for term in terms.values():
        puuids = _get_uuids_for_linked(term, tid2uuid)
        for rt, uuids in puuids.items():
            term[rt] = list(set(uuids))  # to avoid redundant terms

    # now to determine what needs to be patched for patches
    for tid, term in terms.items():
        if tid in to_post:
            continue  # it's a new term
        dbterm = dbterms[tid]
        term = id_fields2patch(term, dbterm, rm_unchanged)
        if not term:
            continue
        to_update.append(term)
        to_patch += 1

    if set_obsoletes:
        # go through db terms and find which aren't in terms and set status
        # to obsolete by adding to to_patch
        # need a way to exclude our own terms and synonyms and definitions
        for tid, term in dbterms.items():
            if tid not in terms:
                source_onts = [so.get('uuid') for so in term['source_ontologies']]
                if not source_onts or not [o for o in ontids if o in source_onts]:
                    # don't obsolete terms that aren't in one of the ontologies being processed
                    continue
                dbuid = term['uuid']
                # add simple term with only status and uuid to to_patch
                obsoletes += 1
                to_update.append({'status': 'obsolete', 'uuid': dbuid})
                tid2uuid[term['term_id']] = dbuid
                to_patch += 1
    print("Will obsolete {} TERMS".format(obsoletes))
    print("{} TERMS ARE NEW".format(len(to_post)))
    print("{} LIVE TERMS WILL BE PATCHED".format(to_patch - obsoletes))
    return to_update


def _get_uuids_for_linked(term, idmap):
    puuids = {}
    for rt in ['parents', 'slim_terms']:
        if term.get(rt):
            puuids[rt] = []
            for p in term[rt]:
                if p in idmap:
                    puuids[rt].append(idmap[p])
                else:
                    print('WARNING - ', p, ' MISSING FROM IDMAP')
    return puuids


# def add_uuids_and_combine(partitioned_terms):
#     '''adds new uuids to terms to post and existing uuids to patch terms
#         this function depends on the partitioned term dictionary that
#         contains keys 'post', 'patch' and 'idmap'
#     '''
#     from uuid import uuid4
#     # go through all the new terms and add uuids to them and idmap
#     idmap = partitioned_terms.get('idmap', {})
#     newterms = partitioned_terms.get('post', None)
#     if newterms:
#         for tid, term in newterms.items():
#             uid = str(uuid4())
#             idmap[tid] = uid
#             term['uuid'] = uid
#         # now that we should have all uuids go through again
#         # and switch parent term ids for uuids
#         for term in newterms.values():
#             puuids = _get_uuids_for_linked(term, idmap)
#             for rt, uuids in puuids.items():
#                 term[rt] = uuids
#     # and finally do the same for the patches
#     patches = partitioned_terms.get('patch', None)
#     if patches:
#         for term in patches.values():
#             puuids = _get_uuids_for_linked(term, idmap)
#             for rt, uuids in puuids.items():
#                 term[rt] = uuids
#     try:
#         post = list(newterms.values())
#     except AttributeError:
#         post = []
#     try:
#         patch = list(patches.values())
#     except AttributeError:
#         patch = []
#     return post + patch


def add_additional_term_info(terms, data, synonym_terms, definition_terms):
    for termid, term in terms.items():
        termuri = convert2URIRef(term['hpo_url'])

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


def _is_deprecated(class_, data):
    dep = list(data.rdfGraph.objects(class_, Deprecated))
    if dep:
        for d in dep:
            if d.datatype and d.datatype.endswith('boolean') and d.value:
                return True
    return False


def download_and_process_owl(ontology, connection, terms, simple=False):
    synonym_terms = get_synonym_term_uris(ontology)
    definition_terms = get_definition_term_uris(ontology)
    data = Owler(ontology['download_url'])
    if not terms:
        terms = {}
    for class_ in data.allclasses:
        if not _is_deprecated(class_, data):
            if isBlankNode(class_):
                continue
                # terms = process_blank_node(class_, data, terms, simple)
            else:
                termid = get_termid_from_uri(class_)
                if simple and not termid.startswith(ontology.get('ontology_prefix')):
                    continue
                if terms.get(termid) is None:
                    terms[termid] = create_term_dict(class_, termid, data)
                else:
                    if 'phenotype_name' not in terms[termid]:
                        terms[termid]['phenotype_name'] = get_term_name_from_rdf(class_, data)
                    # deal with parents
                terms = process_parents(class_, data, terms)
    # add synonyms and definitions
    terms = add_additional_term_info(terms, data, synonym_terms, definition_terms)
    return terms


def write_outfile(terms, filename, pretty=False):
    '''terms is a list of dicts
        write to file by default as a json list or if pretty
        then same with indents and newlines
    '''
    with open(filename, 'w') as outfile:
        if pretty:
            json.dump(terms, outfile, indent=4)
        else:
            json.dump(terms, outfile)


def parse_args(args):
    parser = argparse.ArgumentParser(
        description="Process specified Ontologies and create OntologyTerm inserts for updates",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--outfile',
                        help="the optional path and file to write output default is src/encoded/ontology_term.json ")
    parser.add_argument('--pretty',
                        default=False,
                        action='store_true',
                        help="Default False - set True if you want json format easy to read, hard to parse")
    parser.add_argument('--full',
                        default=False,
                        action='store_true',
                        help="Default False - set True to generate full file to load - do not filter out existing unchanged terms")
    parser.add_argument('--env',
                        default='fourfront-cgap',
                        help="The environment to use i.e. fourfront-cgap, cgap-test ....\
                        Default is 'fourfront-cgap')")
    parser.add_argument('--key',
                        default='s3',
                        help="An access key dictionary including key, secret and server.\
                        {'key'='ABCDEF', 'secret'='supersecret', 'server'='http://fourfront-cgap.9wzadzju3p.us-east-1.elasticbeanstalk.com/'}")
    parser.add_argument('--app-name', help="Pyramid app name in configfile - needed to load terms directly")
    parser.add_argument('--config-uri', help="path to configfile - needed to load terms directly")

    return parser.parse_args(args)


def owl_runner(value):
    print('Processing: ', value[0]['ontology_name'])
    return download_and_process_owl(*value)


def last_ontology_load(app):
    from webtest import TestApp
    from webtest.app import AppError
    import dateutil

    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)
    try:
        sysinfo = testapp.get("/sysinfo/ffsysinfo").follow().json
        return dateutil.parser.parse(sysinfo['ontology_updated'])
    except AppError:
        return datetime.datetime.min


def main():
    ''' Downloads latest HPO OWL file
        and Updates Terms by generating json inserts
    '''
    args = parse_args(sys.argv[1:])
    postfile = args.outfile
    if not postfile:
        postfile = 'phenotypes.json'
    if '/' not in postfile:  # assume just a filename given
        from pkg_resources import resource_filename
        postfile = resource_filename('encoded', postfile)

    print('Writing to %s' % postfile)

    # fourfront connection
    connection = connect2server(args.env, args.key)
    ontology = get_ontology(connection, 'HP')
    slim_terms = get_slim_terms(connection)
    db_terms = get_existing_phenotypes(connection)
    terms = {}

    print('Processing: ', ontology['ontology_name'])
    if ontology.get('download_url', None) is not None:
        # want only simple processing for HP
        simple = True
        # get all the terms for an ontology
        terms = download_and_process_owl(ontology, connection, terms, simple)
    else:
        # bail out
        print("Need url to download file from")
        sys.exit()

    # at this point we've processed the rdf of all the ontologies
    if terms:
        terms = add_slim_terms(terms, slim_terms)
        terms = remove_obsoletes_and_unnamed(terms)
        filter_unchanged = True
        if args.full:
            filter_unchanged = False
        terms2write = id_post_and_patch(terms, db_terms, filter_unchanged)
        # terms2write = add_uuids_and_combine(partitioned_terms)
        pretty = False
        if args.pretty:
            pretty = True
        write_outfile(terms2write, postfile, pretty)


if __name__ == '__main__':
    main()
