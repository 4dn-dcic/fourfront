import argparse
import ast
import json
import re
import sys
from collections import Counter
from uuid import uuid4

import pkg_resources
import requests
from pathlib import Path
from dcicutils.ff_utils import (get_authentication_with_server, get_metadata,
                                search_metadata)
from rdflib.collection import Collection

from ..commands.owltools import (OBO, Deprecated, IntersectionOf, Namespace,
                                 OnProperty, Owler, SomeValuesFrom,
                                 convert2URIRef, getObjectLiteralsOfType,
                                 isBlankNode, isURIRef, splitNameFromNamespace,
                                 subClassOf)

EPILOG = __doc__

PART_OF = "http://purl.obolibrary.org/obo/BFO_0000050"
DEVELOPS_FROM = "http://purl.obolibrary.org/obo/RO_0002202"
HUMAN_TAXON = "http://purl.obolibrary.org/obo/NCBITaxon_9606"
HAS_PART = "http://purl.obolibrary.org/obo/BFO_0000051"
ACHIEVES_PLANNED_OBJECTIVE = "http://purl.obolibrary.org/obo/OBI_0000417"

ontregex = re.compile(r'( +\(((EFO|SO|UBERON|4DN|OBI), )*(EFO|SO|UBERON|4DN|OBI)\))')


def iterative_parents(nodes, terms, data):
    """returns all the parents traversing the term graph structure
        - (not the direct RDF graph) by iteratively following parents
        until there are no more parents
    """
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
    """Adds a list of all the term's ancestors to a term up to the root
        of the ontology and adds to closure fields - used in adding slims
    """
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
    """internal method to combine the directly related terms into 2 uniqued lists
        of all_parents or development terms that will be used as starting terms
        to generate closures of all ancestors

        the development terms have those with has_part_inverse filtered out to
        prevent over expansion of the ancestors to incorrect associations
    """
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
    """True if human taxon is part of the collection"""
    ans = False
    human = HUMAN_TAXON
    if cols:
        if isURIRef(cols[0]):
            human = convert2URIRef(human)
        if human in cols:
            ans = True
    return ans


def get_termid_from_uri(uri):
    """Given a uri - takes the last part (name) and converts _ to :
        eg. http://www.ebi.ac.uk/efo/EFO_0002784 => EFO:0002784
    """
    return splitNameFromNamespace(uri)[0].replace('_', ':')


def get_term_name_from_rdf(class_, data):
    """Looks for label for class in the rdf graph"""
    name = None
    try:
        unique = data.rdfGraph.value(class_, OBO['IAO_0000589'])
        if unique:
            name = unique.__str__()
        else:
            name = data.rdfGraph.label(class_).__str__()
    except AttributeError:
        pass
    return name


def create_term_dict(class_, termid, data, ontology_id=None):
    """Adds basic term info to the dictionary of all terms
    """
    term = {
        'term_id': termid,
        'term_url': class_.__str__(),
    }
    if ontology_id is not None:
        term.setdefault('source_ontologies', []).append(ontology_id)
    (name, ns) = splitNameFromNamespace(term['term_url'])
    term['namespace'] = ns
    name = get_term_name_from_rdf(class_, data)
    if name is not None:
        term['term_name'] = name
    return term


def _add_term_and_info(class_, parent_uri, relationship, data, terms):
    """Internal function to add new terms that are part of an IntersectionOf
        along with the appropriate relationships
    """
    if not terms:
        terms = {}
    for subclass in data.rdfGraph.objects(class_, subClassOf):
        term_id = get_termid_from_uri(parent_uri)
        if terms.get(term_id) is None:
            if _is_deprecated(parent_uri, data):
                continue
            terms[term_id] = create_term_dict(parent_uri, term_id, data)
        if terms[term_id].get(relationship) is None:
            terms[term_id][relationship] = []
        terms[term_id][relationship].append(get_termid_from_uri(subclass))
    return terms


def process_intersection_of(class_, intersection, data, terms):
    """Given a class with IntersectionOf predicate determine if the
        intersected class is part of human or if our term develops_from
        the class and if so make ontology_term json for it if it doesn't
        already exist
    """
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


def process_blank_node(class_, data, terms, simple=False):
    """Given a blank node determine if there are any parent resources
        of relevant types and if so process them appropriately
    """
    for object_ in data.rdfGraph.objects(class_, subClassOf):
        # direct parents of blank nodes
        if not isBlankNode(object_):
            if not simple:
                # TODO: this skip with simple assumes that UBERON will not be parsed simply - needs change
                # we have a resource
                for intersection in data.rdfGraph.objects(class_, IntersectionOf):
                    # intersectionOf triples are checked for human part_of
                    # or develops_from
                    terms = process_intersection_of(class_, intersection, data, terms)
    return terms


def _find_and_add_parent_of(parent, child, data, terms, has_part=False, relation=None):
    """Add parent terms with the provided relationship to the 'relationships'
        field of the term - treating has_part specially

        NOTE: encode had added fields for each relationship type to the dict
        our default is a  'relationships' field - but can pass in a specific
        relation string eg. develops_from and that will get added as field
    """
    child_id = get_termid_from_uri(child)
    for obj in data.rdfGraph.objects(parent, SomeValuesFrom):
        if _is_deprecated(obj, data):
            continue
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
    """Gets the parents of the class - direct and those linked via
        specified relationship types
    """
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
            if _is_deprecated(parent, data):
                continue
            if not terms[termid].get('parents'):
                terms[termid]['parents'] = []
            terms[termid]['parents'].append(get_termid_from_uri(parent))
    return terms


def get_synonyms(class_, data, synonym_terms):
    """Gets synonyms for the class as strings
    """
    if not synonym_terms:
        return
    return getObjectLiteralsOfType(class_, data, synonym_terms)


def get_definitions(class_, data, definition_terms):
    """Gets definitions for the class as strings
    """
    if not definition_terms:
        return
    return getObjectLiteralsOfType(class_, data, definition_terms)


def _cleanup_non_fields(terms):
    """Removes unwanted fields and empty terms from final json"""
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
    """Checks the list of ancestor terms to see if any are slim_terms
        and if so adds the slim_term to the term in slim_term slot

        for now checking both closure and closure_with_develops_from
        but consider having only single 'ancestor' list
    """
    slimterms2add = {}
    for slimterm in slim_terms:
        if term.get('closure') and slimterm['term_id'] in term['closure']:
            if slimterm['is_slim_for'] != 'developmental':
                slimterms2add[slimterm['term_id']] = slimterm['term_id']
        if term.get('closure_with_develops_from') and slimterm['term_id'] in term['closure_with_develops_from']:
            if slimterm['is_slim_for'] == 'developmental':
                slimterms2add[slimterm['term_id']] = slimterm['term_id']
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


def get_syndef_terms_as_uri(ontology, termtype, as_rdf=True):
    """Checks an ontology item for ontology_terms that are used
        to designate synonyms or definitions in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    """
    sdterms = ontology.get(termtype)
    uris = [term['term_url'] for term in sdterms if term is not None]
    if as_rdf:
        uris = [convert2namespace(uri) for uri in uris]
    return uris


def get_synonym_term_uris(ontology, as_rdf=True):
    """Checks an ontology item for ontology_terms that are used
        to designate synonyms in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    """
    return get_syndef_terms_as_uri(ontology, 'synonym_terms', as_rdf)


def get_definition_term_uris(ontology, as_rdf=True):
    """Checks an ontology item for ontology_terms that are used
        to designate definitions in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    """
    return get_syndef_terms_as_uri(ontology, 'definition_terms', as_rdf)


def get_slim_terms(connection):
    """Retrieves ontology_term jsons for those terms that have 'is_slim_for'
        field populated
    """
    # currently need to hard code the categories of slims but once the ability
    # to search all can add parameters to retrieve all or just the terms in the
    # categories passed as a list
    slim_categories = ['developmental', 'assay', 'organ', 'system', 'cell']
    search_suffix = 'search/?type=OntologyTerm&is_slim_for='
    slim_terms = []
    for cat in slim_categories:
        try:
            terms = search_metadata(search_suffix + cat, connection)
            slim_terms.extend(terms)
        except TypeError as e:
            print(e)
            continue
    return slim_terms


def get_existing_ontology_terms(connection, ontologies=None):
    """Retrieves all existing ontology terms from the db
    """
    search_suffix = 'search/?type=OntologyTerm&status=released&status=obsolete'  # + ont_list
    db_terms = {}
    ignore = [
        "111112bc-8535-4448-903e-854af460a233", "111113bc-8535-4448-903e-854af460a233",
        "111114bc-8535-4448-903e-854af460a233", "111116bc-8535-4448-903e-854af460a233",
        "111117bc-8535-4448-903e-854af460a233"
    ]
    for o in ontologies:
        search_query = f"search/?type=OntologyTerm&status=released&status=obsolete&source_ontologies.uuid={o.get('uuid')}"
        oterms = search_metadata(search_query, connection, page_limit=200, is_generator=True)
        db_terms.update({t['term_id']: t for t in oterms if t['uuid'] not in ignore})
    return db_terms


def get_ontologies(connection, ont_list):
    """return list of ontology jsons retrieved from server
        ontology jsons are now fully embedded
    """
    ontologies = []
    if ont_list == 'all':
        ontologies = search_metadata('search/?type=Ontology', connection)
    else:
        ontologies = [get_metadata('ontologys/' + ont_list, connection)]
    # removing item not found cases with reporting
    if not isinstance(ontologies, (list, tuple)):
        print("we must not have got ontologies... bailing")
        sys.exit()
    for i, ontology in enumerate(ontologies):
        if 'Ontology' not in ontology['@type']:
            ontologies.pop(i)
    return ontologies


def connect2server(env=None, key=None, args=None):
    """Sets up credentials for accessing the server.  Generates a key using info
       from the named keyname in the keyfile and checks that the server can be
       reached with that key.
       Also handles keyfiles stored in s3"""

    if env == "local":
        local_id = args.local_key if args.local_key else input('[local access key ID] ')
        local_secret = args.local_secret if args.local_secret else input('[local access key secret] ')
        local_server = "http://localhost:8000"
        print(f"Running in local mode: {local_server} (key: {local_id})")
        return {'key': local_id, 'secret': local_secret, 'server': 'http://localhost:8000'}

    if key and all([v in key for v in ['key', 'secret', 'server']]):
        key = ast.literal_eval(key)

    try:
        auth = get_authentication_with_server(key, env)
    except Exception:
        print("Authentication failed")
        sys.exit(1)

    print("Running on: {server}".format(server=auth.get('server')))
    return auth


def remove_obsoletes_and_unnamed(terms, deprecated, dbterms):
    live_terms = {}
    for termid, term in terms.items():
        if termid in deprecated:
            continue
        parents = term.get('parents')
        if parents:
            if 'ObsoleteClass' in parents:
                continue
            for p in parents:
                if p in deprecated:
                    parents.remove(p)
            term['parents'] = parents

        if not term.get('term_name'):
            if termid in dbterms:
                db_onts = [o.get('uuid') for o in dbterms[termid].get('source_ontologies', [])]
                if sorted(db_onts) == sorted(term.get('source_ontologies')):
                    continue
            else:
                continue
        if 'term_name' in term and term['term_name'].lower().startswith('obsolete'):
            continue
        live_terms[termid] = term
    return live_terms


def _format_def_str(defdict):
    dstring = ''
    for val in sorted(set([', '.join(v) for v in defdict.values()])):
        defstr = ' -- '.join(sorted([k for k in defdict.keys() if ', '.join(defdict[k]) == val]))
    # for d, o in sorted(defdict.items()):
    #     ostr = ', '.join(sorted([ostr.strip() for ostr in o]))
    #     dstring += '{} ({}) '.format(d, ostr)
        dstring += '{} ({}) '.format(defstr, val)
    return dstring.rstrip()


def set_definition(terms, ontologies):
    # uuid2prefix = {o.get('uuid'): o.get('ontology_prefix') for o in ontologies}
    for termid, term in terms.items():
        definition = {}
        found = False
        tdefs = term.get('definitions')
        if not tdefs:
            continue
        fromont = [p for p in tdefs.keys() if termid.startswith(p)]
        if fromont:
            ont = fromont[0]
            definition[ont] = tdefs[ont]
        elif len(tdefs) == 1:
            definition = tdefs  # we've got a single value to deal with
        for p, defs in definition.items():
            # ideal case where term is directly from the ontology based on termid prefix
            term['definition'] = '{} ({})'.format(' -- '.join(sorted(list(set([d.strip() for d in defs])))), p)
            found = True
        if found:
            del term['definitions']
            continue
        # if we get here add all the defs by uniquifying with onts
        for p, defs in tdefs.items():
            for d in defs:
                definition.setdefault(d.strip(), []).append(p)
        dstring = _format_def_str(definition)
        # for d, o in sorted(definition.items()):
        #    ostr = ', '.join(sorted(o))
        #    dstring += '{} ({})'.format(d, ostr)
        if dstring:
            term['definition'] = dstring
        del term['definitions']
    return terms


def _get_t_id(val):
    # val can be: uuid string, dict with @id, dict with uuid if fully embedded
    try:
        linkid = val.get('@id')
        if linkid is None:
            linkid = val.get('term_id')
        return linkid
    except AttributeError:
        return val


def _terms_match(t1, t2):
    """check that all the fields in the first term t1 are in t2 and
        have the same values
    """
    for k, val in t1.items():
        if k not in t2:
            if val:
                return False
        else:
            if k == 'parents' or k == 'slim_terms' or k == 'source_ontologies':
                if len(val) != len(t2[k]):
                    return False
                for p1 in val:
                    found = False
                    for p2 in t2[k]:
                        # p1 will be a uuid - need to get a string with uuid in it
                        # from dbterm
                        p2id = _get_t_id(p2)
                        if p1 in p2id:
                            found = True
                        else:
                            # need to lookup p1 info - it should be in terms
                            pass
                    if not found:
                        return False
            elif k == 'synonyms':
                t2syns = t2.get('synonyms')
                if not t2syns or (set(t2syns) != set(val)):
                    return False
            else:
                if val != t2[k]:
                    return False
    return True


def check_for_fields_to_keep(term, dbterm):
    """ see if is_slim_for present and check if preferred_name is different from
        term_name in dbterm if so add to term
    """
    if 'is_slim_for' in dbterm:
        term['is_slim_for'] = dbterm['is_slim_for']
    if 'preferred_name' in dbterm:  # should alwawys be true
        if dbterm.get('preferred_name') != dbterm.get('term_name'):
            term['preferred_name'] = dbterm['preferred_name']
    return term


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
    """ takes a term dict that could be in embedded or object format
        and transforms to raw (so uuids) are used for linked items
    """
    raw_term = {}
    for field, val in term.items():
        if isinstance(val, str):
            raw_term[field] = val
        else:
            rawval = _format_as_raw(val)
            if rawval:
                raw_term[field] = rawval

    return raw_term


def update_parents(termid, ontid, tparents, dparents, simple, connection):
    """ tricky bit is when to remove terms from existing term
        single ontology processing only remove parents that
        are not in term parents that are in dbterm parents from that ontology
        but if simple have additional restriction that term prefixes of
        parent and child _terms_match
    """
    parents2keep = [p.get('uuid') for p in dparents]
    if not tparents or Counter(parents2keep) == Counter(tparents):
        return None
    dp2chk = []
    dpmeta = dparents
    if not dpmeta or 'source_ontologies' not in dpmeta[0] or 'term_id' not in dpmeta[0]:
        # make sure we have the required fields - should be embedded but maybe not
        dpmeta = [get_metadata(p.get('uuid'), connection) for p in dparents]
    for dp in dpmeta:
        donts = [o.get('uuid') for o in dp.get('source_ontologies')]
    dp2chk = [p.get('uuid') for p in dpmeta if ontid in donts]
    if simple:
        # need to check for missing parents in term that have same prefix as term
        # that are in dbterm
        tpre, _ = termid.split(':')
        dp2chk = [p.get('uuid') for p in dpmeta if p.get('term_id', '').startswith(tpre)]
    # else:
    #     dp2chk = [p.get('uuid') for p in dpmeta if ontid in p.get('source_ontologies', [])]
    for uid in dp2chk:
        if uid not in tparents:
            try:
                parents2keep.remove(uid)
            except ValueError:
                print('{} not found in parent list'.format(uid))
                continue
    return parents2keep


def _definition_list(text):
    """
    This is a helper function that converts a definition string, possibly containing
    one or more references to associated ontologies, to a list of separated definitions
    and their sources ontologies.

    Example input:
    "Here is the first definition. (EFO) Here is a second definition that might contain
    an abbreviation for something like amyotrophic lateral sclerosis (ALS) that is not an
    ontology abbreviation. (OBI, SO)"

    Example output:
    ["Here is the first definition.", "EFO", "Here is a second definition that \
    might contain an abbreviation for something like amyotrophic lateral sclerosis \
    (ALS) that is not an ontology abbreviation.", "OBI, SO"]
    """
    dlist = []
    matches = re.findall(ontregex, text)
    remaining = ''.join(list(text))
    for item in matches:
        dlist.extend(remaining.split(item[0]))
        dlist.insert(-1, item[0].strip().strip('()'))
        remaining = dlist.pop(-1)
    return [s.strip() for s in dlist]


def update_definition(tdef, dbdef, ont):
    """
    This function is only invoked if we are updating from a single ontology, and is
    for resolving problems with updated and/or conflicting definitions.
    We check the def to see if it is already in the db definition.
    If not, we add it to the db definition.
    If the ontology newly added that term (from another ontology), we simply add it.
    If the term is not new to the current ontology being updated, and that ontology is
    reflected in the db definition, then we remove the association of the ontology to the
    portion of the old db definition and associate it with the new definition instead.
    """
    tstr = _definition_list(tdef)[0]
    dbmatch = _definition_list(dbdef)
    dbdefs = dict(zip(dbmatch[::2], dbmatch[1::2]))
    dbdefs = {k: [val.strip() for val in v.split(',')] for k, v in dbdefs.items()}
    # if term def not in db def
    # if for any db def the current ontology is in value
    # take the ont out of value (because it will be associated with new def instead)
    if tstr not in dbdefs.keys():
        # the def is new for that ontology so remove that prefix from
        # any existing def strings
        for o in dbdefs.values():
            if ont in o:
                o.remove(ont)
        dbdefs[tstr] = [ont]
        # remove defs no longer associated with any ontology
        dbdefs = {k: v for k, v in dbdefs.items() if v}
    else:
        if ont not in dbdefs[tstr]:
            dbdefs[tstr].append(ont)
            dbdefs[tstr].sort()
    return _format_def_str(dbdefs)


def id_fields2patch(term, dbterm, ont, ontids, simple, rm_unch, connection=None):
    """ Looks at 2 terms and depending on the type of processing - all or single ontology
        and simple or not determines what fields might need to be patched
    """
    rawdbterm = get_raw_form(dbterm)
    if ont == 'all':  # just need a simple comparison
        if rm_unch and _terms_match(term, rawdbterm):
            return None
        else:
            term = check_for_fields_to_keep(term, dbterm)
            return term
    else:
        patch_term = {}
        oid = ontids[0]
        for f, v in term.items():
            if f not in dbterm:
                patch_term[f] = v
            elif rawdbterm.get(f) == v:
                continue
            else:
                dbval = rawdbterm.get(f)
                if f == 'parents':
                    # special treatment for parents depending on simple or not
                    parents = update_parents(term.get('term_id'), oid, v, dbterm.get(f), simple, connection)
                    if parents:
                        if sorted(parents) == sorted(dbval):
                            continue
                        elif all([p in dbval for p in parents]):
                            continue
                        patch_term['parents'] = parents
                elif f == 'definition':
                    # deal with definition parsing
                    dbdef = dbterm.get('definition')
                    if v in dbdef:  # checking to see if the string is in the db def string
                        continue
                    elif all([part in dbdef for part in v.rstrip(' (' + ont + ')').split(' -- ')]):
                        continue
                    else:
                        prefix = term['term_id'][:term['term_id'].index(':')]
                        if prefix in ['EFO', 'UBERON', 'SO', 'OBI'] and prefix != ont:
                            continue
                    new_def = update_definition(v, dbdef, ont)
                    if new_def:
                        patch_term['definition'] = new_def
                elif f == 'term_name':
                    db_onts = [o.get('uuid') for o in dbterm.get('source_ontologies')]
                    if not v:
                        continue
                    elif ont not in term.get('term_id') and sorted(ontids) != sorted(db_onts):
                        # skip if trying to change term name for term with multiple source ontologies
                        continue
                elif isinstance(v, list):
                    if sorted(v) == sorted(rawdbterm.get(f)):
                        continue
                    to_add = []
                    for val in v:
                        if val not in dbval:
                            to_add.append(val)
                    if to_add:
                        dbval.extend(to_add)
                    if sorted(rawdbterm.get(f)) == sorted(dbval):
                        continue
                    patch_term[f] = dbval
                else:
                    patch_term[f] = v
        if patch_term:
            patch_term['uuid'] = term.get('uuid')
        return patch_term


def id_post_and_patch(terms, dbterms, ontologies, rm_unchanged=True, set_obsoletes=True, ontarg='all',
                      simple=False, connection=None):
    """compares terms to terms that are already in db - if no change
        removes them from the list of updates, if new adds to post dict,
        if changed adds uuid and add to patch dict
    """
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
    missing_from_idmap = []
    for term in terms.values():
        puuids, ext, missing = _get_uuids_for_linked(term, dbterms, tid2uuid)
        tid2uuid.update(ext)
        missing_from_idmap.extend(missing)
        for rt, uuids in puuids.items():
            uniq_uuids = list(set(uuids))  # to avoid redundant terms
            term[rt] = uniq_uuids
    for p in set(missing_from_idmap):
        print('WARNING - ', p, ' MISSING FROM IDMAP')

    # now to determine what needs to be patched for patches
    ontids = [o['uuid'] for o in ontologies]
    for tid, term in terms.items():
        if tid in to_post:
            continue  # it's a new term
        dbterm = dbterms[tid]
        term = id_fields2patch(term, dbterm, ontarg, ontids, simple, rm_unchanged, connection)
        if not term:
            continue
        to_update.append(term)
        to_patch += 1

    if set_obsoletes:
        prefixes = [o.get('ontology_prefix', '') for o in ontologies]
        if simple:
            use_terms = {tid: term for tid, term in dbterms.items() if tid.startswith(prefixes[0])}
        else:
            use_terms = {tid: term for tid, term in dbterms.items()}
        # go through db terms and find which aren't in terms and set status
        # to obsolete by adding to to_patch
        # need a way to exclude our own terms and synonyms and definitions
        for tid, term in use_terms.items():
            if tid not in terms and term['status'] != 'obsolete':
                source_onts = [so.get('uuid') for so in term['source_ontologies']]
                if not source_onts:
                    continue  # should not happen
                elif [o for o in source_onts if o not in ontids]:
                    # don't obsolete terms that are in an ontology in addition to the ones being processed
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
    return to_update, to_post


def _get_uuids_for_linked(term, dbterms, idmap):
    puuids = {}
    ext = {}
    missing = []
    for rt in ['parents', 'slim_terms']:
        if term.get(rt):
            puuids[rt] = []
            for p in term[rt]:
                if p in idmap:
                    puuids[rt].append(idmap[p])
                elif p in dbterms:
                    # term exists linked to anohter ontology
                    duid = dbterms[p].get('uuid')
                    puuids[rt].append(duid)
                    ext[p] = duid
                else:
                    missing.append(p)
    return puuids, ext, missing


def add_additional_term_info(terms, data, synonym_terms, definition_terms, prefix='UNK'):
    for termid, term in terms.items():
        termuri = convert2URIRef(term['term_url'])

        # add any missing synonyms
        synonyms = get_synonyms(termuri, data, synonym_terms)
        if synonyms:
            if 'synonyms' not in term:
                term['synonyms'] = []
            for syn in synonyms:
                syn = syn.strip()
                if syn not in term['synonyms']:
                    term['synonyms'].append(syn)

        # adding all defs
        # if term.get('definition') is None:
        definitions = get_definitions(termuri, data, definition_terms)
        if definitions:
            if 'definitions' not in term:
                term['definitions'] = {}
            definitions = sorted(list(set([d.strip() for d in definitions])))
            term['definitions'].setdefault(prefix, []).extend(definitions)
    return terms


def _is_deprecated(class_, data):
    dep = list(data.rdfGraph.objects(class_, Deprecated))
    if dep:
        for d in dep:
            if d.datatype and d.datatype.endswith('boolean') and d.value:
                return True
    return False


def download_and_process_owl(ontology, terms, deprecated, simple=False, owlfile=None):
    synonym_terms = get_synonym_term_uris(ontology)
    definition_terms = get_definition_term_uris(ontology)
    input_source = ontology.get('download_url')
    if owlfile:  # parse terms from provided local file
        input_source = owlfile
    data = Owler(input_source)
    print("have data to process")
    ont_prefix = ontology.get('ontology_prefix')
    if not terms:
        terms = {}
    if not deprecated:
        deprecated = []
    for class_ in data.allclasses:
        if _is_deprecated(class_, data):
            deprecated.append(get_termid_from_uri(class_))
    for class_ in data.allclasses:
        if isBlankNode(class_):
            terms = process_blank_node(class_, data, terms, simple)
        else:
            termid = get_termid_from_uri(class_)
            if simple and ont_prefix and not termid.startswith(ont_prefix):
                # we only want to process terms from the same ontology
                continue
            if terms.get(termid) is None:
                terms[termid] = create_term_dict(class_, termid, data, ontology['uuid'])
            else:
                if 'term_name' not in terms[termid] or not terms[termid].get('term_name'):
                    terms[termid]['term_name'] = get_term_name_from_rdf(class_, data)
                if (not terms[termid].get('source_ontologies') or
                        ontology.get('uuid') not in terms[termid]['source_ontologies']):
                    terms[termid].setdefault('source_ontologies', []).append(ontology['uuid'])
            # deal with parents
            if ontology.get('ontology_name') != 'Sequence Ontology':
                terms = process_parents(class_, data, terms)
    # add synonyms and definitions
    terms = add_additional_term_info(terms, data, synonym_terms, definition_terms, ont_prefix)
    if ontology.get('ontology_name') == 'Sequence Ontology':
        terms = {k: v for k, v in terms.items() if k in ['SO:0000001', 'SO:0000104', 'SO:0000673', 'SO:0000704']}
    return terms, data.version, list(set(deprecated))


def _split_oterm_required_from_other_props(term):
    '''internal function that assumes we are dealing with OntologyTerm items only'''
    required_props = ['term_id', 'source_ontologies']
    tid = term.get('uuid')
    post_first = {key: value for (key, value) in term.items() if key in required_props}
    patch_second = {key: value for (key, value) in term.items() if key not in required_props}
    post_first['uuid'] = patch_second['uuid'] = tid
    return post_first, patch_second


def order_terms_by_phasing(post_ids, terms2upd):
    """ ensure that required props for new terms are ordered before other props
        of those terms as well as terms that exist that need patching
    """
    phased_info = {'phase1': [], 'phase2': []}
    for term in terms2upd:
        tid = term.get('term_id')
        if tid in post_ids:
            req_info, other_info = _split_oterm_required_from_other_props(term)
            phased_info['phase1'].append(req_info)
            phased_info['phase2'].append(other_info)
        else:
            phased_info['phase2'].append(term)
    return phased_info['phase1'] + phased_info['phase2']


def write_outfile(to_write, filename, pretty=False):
    """terms is a list of dicts
        write to file by default as a json list or if pretty
        then same with indents and newlines
    """
    with open(filename, 'w') as outfile:
        if pretty:
            json.dump(to_write, outfile, indent=4)
        else:
            json.dump(to_write, outfile)

def filter_ontologies(ontologies):
    for i, o in enumerate(ontologies):
        if o['ontology_name'].startswith('4DN') or o['ontology_name'].startswith('CGAP'):
            ontologies.pop(i)


def parse_args(args):
    parser = argparse.ArgumentParser(  # noqa - PyCharm wrongly thinks the formatter_class is specified wrong here.
        description="Process specified Ontologies and create OntologyTerm inserts for updates",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--ontology',
                        default='all',
                        help="Prefix of ontology to process - eg. UBERON, OBI, EFO; \
                        default will process all the ontologies in db"
                             " or can specify a single ontology (with --simple if desired)")
    parser.add_argument('--simple',
                        default=False,
                        action='store_true',
                        help="Default false - WARNING can only be used if processing a single ontology!!! \
                        - will process only terms that share the prefix ontology"
                             " and skip terms imported from other ontologies")
    parser.add_argument('--owlfile',
                        default=None,
                        help="Path to local owl file to use instead of downloading - can only be used \
                        to process a single ontology")
    parser.add_argument('--outfile',
                        help="the optional path and file to write output default is src/encoded/ontology_term.json ")
    parser.add_argument('--pretty',
                        default=False,
                        action='store_true',
                        help="Default False - set True if you want json format easy to read, hard to parse")
    parser.add_argument('--full',
                        default=False,
                        action='store_true',
                        help="Default False - set True to generate full file to load"
                             " - do not filter out existing unchanged terms")
    parser.add_argument('--phase',
                        default=False,
                        action='store_true',
                        help="Default False - set True to phase the result into posts of only required fields \
                                and then patches of all else")
    parser.add_argument('--env',
                        default='data',
                        help="The environment to use i.e. data, webdev, mastertest.\
                        Default is 'data')")
    parser.add_argument('--key',
                        default=None,
                        help="An access key dictionary including key, secret and server.\
                        \"{'key': 'ABCDEF', 'secret': 'supersecret', 'server': 'https://data.4dnucleome.org'}\" ")
    parser.add_argument('--keyfile',
                        default='{}/keypairs.json'.format(Path.home()),
                        help="A file where access keys are stored.")
    parser.add_argument('--keyname',
                        default='default',
                        help="The name of the key to use in the keyfile.")
    parser.add_argument('--app-name', help="Pyramid app name in configfile - needed to load terms directly")
    parser.add_argument('--config-uri', help="path to configfile - needed to load terms directly")
    parser.add_argument('--local-key', help='Local access key ID if using local env.')
    parser.add_argument('--local-secret', help='Local access key secret if using local env.')

    return parser.parse_args(args)


def owl_runner(value):
    print('Processing: ', value[0]['ontology_name'])
    return download_and_process_owl(*value)


def main():
    """ Downloads latest Ontology OWL files for Ontologies in the database
        and Updates Terms by generating json inserts
    """
    args = parse_args(sys.argv[1:])
    postfile = args.outfile
    if not postfile:
        postfile = 'ontology_term.json'
    if '/' not in postfile:  # assume just a filename given
        postfile = pkg_resources.resource_filename('encoded', postfile)

    print('Writing to %s' % postfile)

    # fourfront connection
    if args.keyname:
        try:
            with open(args.keyfile, 'r') as keyfile:
                keys = json.load(keyfile)
            key = str(keys[args.keyname])
        except Exception:
            print("Keypairs file '{}' not found or can't be read".format(args.keyfile))
            sys.exit()
    else:
        key = args.key
    connection = connect2server(args.env, key, args)
    print("Pre-processing")
    all_ontologies = get_ontologies(connection, 'all')
    filter_ontologies(all_ontologies)
    ontologies = get_ontologies(connection, args.ontology)
    if len(ontologies) > 1 and args.simple:
        print("INVALID USAGE - simple can only be used while processing a single ontology")
        sys.exit(1)
    if len(ontologies) > 1 and args.owlfile:
        print("INVALID USAGE - path to local owlfile can only be used while processing a single ontology")
        sys.exit(1)
    filter_ontologies(ontologies)
    print('HAVE ONTOLOGY INFO')
    slim_terms = get_slim_terms(connection)
    print('HAVE SLIM TERMS')
    db_terms = get_existing_ontology_terms(connection, ontologies=all_ontologies)
    print('HAVE DB TERMS')
    terms = {}
    deprecated = []
    new_versions = []
    for ontology in ontologies:
        print('Processing: ', ontology['ontology_name'])
        if ontology.get('download_url', None) is not None:
            # get all the terms for an ontology
            terms, v, deprecated = download_and_process_owl(
                    ontology, terms, deprecated, simple=args.simple, owlfile=args.owlfile)
            if not v and ontology.get('ontology_name').upper() == 'UBERON':
                try:
                    result = requests.get('https://api.github.com/repos/obophenotype/uberon/git/refs/tags')
                    v = result.json()[-1].get('ref').split('/v')[-1]
                except Exception:
                    print('Unable to fetch Uberon version')
            if v and v != ontology.get('current_ontology_version', ''):
                prev = []
                if ontology.get('current_ontology_version'):
                    if not ontology.get('ontology_versions'):
                        prev = [ontology['current_ontology_version']]
                    else:
                        prev = [ontology['current_ontology_version']] + ontology['ontology_versions']
                ontology['current_ontology_version'] = v
                ontology['ontology_versions'] = prev
                new_versions.append(ontology)

    # at this point we've processed the rdf of all the ontologies
    if terms:
        print("Post-processing")
        terms = add_slim_terms(terms, slim_terms)
        print("SLIM TERMS ADDED")
        # doing this after adding slims in case an ontology is not in sync with one it imports
        # will preserve slimming but remove obsolete terms and parents in next step
        terms = remove_obsoletes_and_unnamed(terms, deprecated, db_terms)
        terms = set_definition(terms, ontologies)
        print("OBS GONE and DEF SET")
        filter_unchanged = True
        if args.full:
            filter_unchanged = False
        print("FINDING TERMS TO UPDATE")
        updates, post_ids = id_post_and_patch(terms, db_terms, ontologies, filter_unchanged, ontarg=args.ontology,
                                              simple=args.simple, connection=connection)
        print("DONE FINDING UPDATES")

        pretty = False
        phasing = False
        if args.pretty:
            pretty = True
        if args.phase:
            phasing = True
        out_dict = {}
        out_dict.setdefault('ontology', [])
        for o in new_versions:
            out_dict['ontology'].append({k: o[k] for k in ['uuid', 'current_ontology_version', 'ontology_versions'] if k in o})
        if phasing:
            print("PHASING TERM INFO")
            phased_terms = order_terms_by_phasing(post_ids, updates)
            out_dict['ontology_term'] = phased_terms
        else:
            print("NOT PHASING")
            out_dict['ontology_term'] = updates
        print(out_dict.keys())
        print("WRITING OUTPUT")
        write_outfile(out_dict, postfile, pretty)

        obsoletes = [term for term in updates if term.get('status') == 'obsolete']
        if obsoletes:
            print("CHECKING OBSOLETES FOR LINKS")
            problems = []
            for obsolete in obsoletes:
                result = get_metadata(obsolete['uuid'] + '/@@links', connection)
                if result.get('uuids_linking_to'):
                    for item in result['uuids_linking_to']:
                        if 'parents' not in item.get('field', ''):
                            problems.append([obsolete['uuid'], item['uuid'], item['display_title']])
            if problems:
                print('WARNING: the following items are connected to an ontology_term listed for obsolescence')
                print('')
                print('term uuid\t\t\t\titem uuid\t\t\t\titem display title')
                for problem in problems:
                    print('\t'.join(problem))
            else:
                print("NO LINKED TERMS FOUND TO BE UPDATED")


if __name__ == '__main__':
    main()
