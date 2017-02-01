import os
import sys
import argparse
import json
from rdflib.collection import Collection
from encoded.commands.owltools import (
# from owltools import (
    Namespace,
    Owler,
    splitNameFromNamespace,
    isBlankNode,
    subClassOf,
    SomeValuesFrom,
    IntersectionOf,
    OnProperty
)
from Submit4DN.wranglertools.fdnDCIC import (
    FDN_Key,
    FDN_Connection,
    get_FDN
)


EPILOG = __doc__

EFO = Namespace("http://www.ebi.ac.uk/efo/")
EFO_SYN = EFO['alternative_term']
EFO_DEF = EFO['definition']
PART_OF = "http://purl.obolibrary.org/obo/BFO_0000050"
DEVELOPS_FROM = "http://purl.obolibrary.org/obo/RO_0002202"
HUMAN_TAXON = "http://purl.obolibrary.org/obo/NCBITaxon_9606"
HAS_PART = "http://purl.obolibrary.org/obo/BFO_0000051"
ACHIEVES_PLANNED_OBJECTIVE = "http://purl.obolibrary.org/obo/OBI_0000417"

# A goal is to get rid of these hard-coded slim terms by querying
# the database for terms and having the slim terms tagged as such
developental_slims = {
    'UBERON:0000926': 'mesoderm',
    'UBERON:0000924': 'ectoderm',
    'UBERON:0000925': 'endoderm'
}

system_slims = {
    'UBERON:0000383': 'musculature of body',
    'UBERON:0000949': 'endocrine system',
    'UBERON:0000990': 'reproductive system',
    'UBERON:0001004': 'respiratory system',
    'UBERON:0001007': 'digestive system',
    'UBERON:0001008': 'excretory system',
    'UBERON:0001009': 'circulatory system',
    'UBERON:0001434': 'skeletal system',
    'UBERON:0002405': 'immune system',
    'UBERON:0002416': 'integumental system',
    'UBERON:0001032': 'sensory system',
    'UBERON:0001017': 'central nervous system',
    'UBERON:0000010': 'peripheral nervous system'
}

organ_slims = {
    'UBERON:0002369': 'adrenal gland',
    'UBERON:0002110': 'gallbladder',
    'UBERON:0002106': 'spleen',
    'UBERON:0001173': 'billary tree',
    'UBERON:0001043': 'esophagus',
    'UBERON:0000004': 'nose',
    'UBERON:0000056': 'ureter',
    'UBERON:0000057': 'urethra',
    'UBERON:0000059': 'large intestine',
    'UBERON:0000165': 'mouth',
    'UBERON:0000945': 'stomach',
    'UBERON:0000948': 'heart',
    'UBERON:0000955': 'brain',
    'UBERON:0000970': 'eye',
    'UBERON:0000991': 'gonad',
    'UBERON:0001043': 'esophagus',
    'UBERON:0001255': 'urinary bladder',
    'UBERON:0001264': 'pancreas',
    'UBERON:0001474': 'bone element',
    'UBERON:0002003': 'peripheral nerve',
    'UBERON:0002048': 'lung',
    'UBERON:0002097': 'skin of body',
    'UBERON:0002107': 'liver',
    'UBERON:0000059': 'large intestine',
    'UBERON:0002108': 'small intestine',
    'UBERON:0002113': 'kidney',
    'UBERON:0002240': 'spinal cord',
    'UBERON:0002367': 'prostate gland',
    'UBERON:0002370': 'thymus',
    'UBERON:0003126': 'trachea',
    'UBERON:0001723': 'tongue',
    'UBERON:0001737': 'larynx',
    'UBERON:0006562': 'pharynx',
    'UBERON:0001103': 'diaphragm',
    'UBERON:0002185': 'bronchus',
    'UBERON:0000029': 'lymph node',
    'UBERON:0002391': 'lymph',
    'UBERON:0010133': 'neuroendocrine gland',
    'UBERON:0001132': 'parathyroid gland',
    'UBERON:0002046': 'thyroid gland',
    'UBERON:0001981': 'blood vessel',
    'UBERON:0001473': 'lymphatic vessel',
    'UBERON:0000178': 'blood',
    'UBERON:0002268': 'olfactory organ',
    'UBERON:0007844': 'cartilage element',
    'UBERON:0001690': 'ear',
    'UBERON:0001987': 'placenta',
    'UBERON:0001911': 'mammary gland',
    'UBERON:0001630': 'muscle organ',
    'UBERON:0000007': 'pituitary gland',
    'UBERON:0002370': 'thymus',
    'UBERON:0000478': 'extraembryonic structure'
}

assay_slims = {
    # Note shortened synonyms are provided
    'OBI:0000634': 'DNA methylation',  # 'DNA methylation profiling'
    'OBI:0000424': 'Transcription',  # 'transcription profiling'
    'OBI:0001398': 'DNA binding',  # "protein and DNA interaction"
    'OBI:0001854': 'RNA binding',  # "protein and RNA interaction"
    'OBI:0001917': '3D chromatin structure',  # 'chromosome conformation identification objective'
    'OBI:0000870': 'DNA accessibility',  # 'single-nucleotide-resolution nucleic acid structure mapping assay'
    'OBI:0001916': 'Replication timing',
    'OBI:0000435': 'Genotyping',
    'OBI:0000615': 'Proteomics',
}

slim_shims = {
    # this allows us to manually assign term X to slim Y while waiting for ontology updates
    'assay': {
        # DNA accessibility
        'OBI:0001924': 'DNA accessibility',  # 'OBI:0000870' / MNase-seq
        'OBI:0002039': 'DNA accessibility',  # 'OBI:0000870', / ATAC-seq
        'OBI:0001853': 'DNA accessibility',  # 'OBI:0000870', / DNase-seq
        'OBI:0001859': 'DNA accessibility',  # 'OBI:0000870', / OBI:0000424  / FAIRE-seq
        'OBI:0002042': '3D chromatin structure',  # 'OBI:0000870' (Hi-C)
        'OBI:0001848': '3D chromatin structure',  # ChIA-PET / OBI:000870
        'OBI:0001923': 'Proteomics',  # OBI:0000615': 'MS-MS'
        'OBI:0001849': 'Genotyping',  # OBI:0000435 (DNA-PET)
        'OBI:0002044': 'RNA binding',  # OBI:0001854 (RNA-Bind-N-Seq)
    }

}

preferred_name = {
    "OBI:0000626": "WGS",
    "OBI:0001247": "genotyping HTS",
    "OBI:0001332": "DNAme array",
    "OBI:0001335": "microRNA counts",
    "OBI:0001463": "RNA microarray",
    "OBI:0001863": "WGBS",
    "OBI:0001923": "MS-MS",
    "OBI:0001271": "RNA-seq",
    "OBI:0000716": "ChIP-seq",
    "OBI:0001853": "DNase-seq",
    "OBI:0001920": "Repli-seq",
    "OBI:0001864": "RAMPAGE",
    "OBI:0001393": "genotyping array",
    "OBI:0002042": "Hi-C",
}

category_slims = {
    'OBI:0000634': 'DNA methylation profiling',
    'OBI:0000424': 'transcription profiling',
    'OBI:0000435': 'genotyping',
    'OBI:0000615': 'proteomics',
    'OBI:0001916': 'replication',
    'OBI:0001398': "protein and DNA interaction",
    'OBI:0001854': "protein and RNA interaction"
}

objective_slims = {
    'OBI:0000218': 'cellular feature identification objective',
    'OBI:0001691': 'cellular structure feature identification objective',
    'OBI:0001916': 'DNA replication identification objective',
    'OBI:0001917': 'chromosome conformation identification objective',
    'OBI:0001234': 'epigenetic modification identification objective',
    'OBI:0001331': 'transcription profiling identification objective',
    'OBI:0001690': 'molecular function identification objective',
    'OBI:0000268': 'organism feature identification objective',
    'OBI:0001623': 'organism identification objective',
    'OBI:0001398': 'protein and DNA interaction identification objective',
    'OBI:0001854': 'protein and RNA interaction identification objective'
}

type_slims = {
    'OBI:0001700': 'immunoprecipitation assay',
    'OBI:0000424': 'transcription profiling assay',
    'OBI:0000634': 'DNA methylation profiling assay',
    'OBI:0000435': 'genotyping assay'
}

# Note this also shows the final datastructure for ontology.json
ntr_assays = {
    "NTR:0000612": {
        "assay": ['RNA binding'],
        "category": [],
        "developmental": [],
        "name": "Switchgear",
        "objectives": [],
        "organs": [],
        "preferred_name": "",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0000762": {
        "assay": ['Transcription'],
        "category": [],
        "developmental": [],
        "name": "shRNA knockdown followed by RNA-seq",
        "objectives": [],
        "organs": [],
        "preferred_name": "shRNA RNA-seq",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0000763": {
        "assay": ['Transcription'],
        "category": [],
        "developmental": [],
        "name": "siRNA knockdown followed by RNA-seq",
        "objectives": [],
        "organs": [],
        "preferred_name": "siRNA RNA-seq",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0001684": {
        "assay": ['Transcription'],
        "category": [],
        "developmental": [],
        "name": "5' RLM RACE",
        "objectives": [],
        "organs": [],
        "preferred_name": "",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0002490": {
        "assay": ['DNA methylation'],
        "category": [],
        "developmental": [],
        "name": "TAB-seq",
        "objectives": [],
        "organs": [],
        "preferred_name": "",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0003027": {
        "assay": ['RNA binding'],
        "category": [],
        "developmental": [],
        "name": "eCLIP",
        "objectives": [],
        "organs": [],
        "preferred_name": "",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0001132": {
        "assay": ['RNA binding'],
        "category": [],
        "developmental": [],
        "name": "RNA Bind-N-Seq",
        "objectives": [],
        "organs": [],
        "preferred_name": "RNA Bind-N-Seq",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0003082": {
        "assay": ['Transcription'],
        "category": [],
        "developmental": [],
        "name": "single cell isolation followed by RNA-seq",
        "objectives": [],
        "organs": [],
        "preferred_name": "single cell RNA-seq",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0003508": {
        "assay": ['Genotyping'],
        "category": [],
        "developmental": [],
        "name": "Whole genome shotgun sequencing",
        "objectives": [],
        "organs": [],
        "preferred_name": "WGS",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    },
    "NTR:0003814": {
        "assay": ['Transcription'],
        "category": [],
        "developmental": [],
        "name": "CRISPR genome editing followed by RNA-seq",
        "objectives": [],
        "organs": [],
        "preferred_name": "CRISPR RNA-seq",
        "slims": [],
        "synonyms": [],
        "systems": [],
        "types": []
    }
}
# end slim and NTR terms


def iterativeChildren(nodes, terms, data):
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
            results.append(node)
            if terms[node][data]:
                for child in terms[node][data]:
                    if child not in results:
                        newNodes.append(child)
        nodes = list(set(newNodes))
    return list(set(results))


def getSlims(goid, terms, slimType):
    ''' Get Slims '''

    slims = []
    slimTerms = {}
    if slimType == 'developmental':
        slimTerms = developental_slims
    elif slimType == 'organ':
        slimTerms = organ_slims
    elif slimType == 'system':
        slimTerms = system_slims
    elif slimType == 'assay':
        slimTerms = assay_slims
    elif slimType == 'category':
        slimTerms = category_slims
    elif slimType == 'objective':
        slimTerms = objective_slims
    elif slimType == 'type':
        slimTerms = type_slims
    for slimTerm in slimTerms:
        if slimType == 'developmental':
            if slimTerm in terms[goid]['closure_with_develops_from']:
                slims.append(slimTerms[slimTerm])
        else:
            if slimTerm in terms[goid]['closure']:
                slims.append(slimTerms[slimTerm])

    if slim_shims.get(slimType, {}):
        # Overrides all Ontology based-slims
        shim = slim_shims[slimType].get(goid, '')
        if shim:
            slims = [shim]
    return slims


def getTermStructure():
    return {
        'id': '',
        'name': '',
        'definition': '',
        'preferred_name': '',
        'parents': [],
        'part_of': [],
        'has_part': [],
        'develops_from': [],
        'achieves_planned_objective': [],
        'organs': [],
        'closure': [],
        'slims': [],
        'data': [],
        'closure_with_develops_from': [],
        'data_with_develops_from': [],
        'synonyms': [],
        'category': [],
        'assay': [],
        'types': [],
        'objectives': []
    }


def process_blank_node(class_, data, terms):
    for object_ in data.rdfGraph.objects(class_, subClassOf):
        # direct parents of blank nodes
        if not isBlankNode(object_):
            # we have a resource
            pass


def get_synonyms(class_, data, synonym_terms):
    '''Gets synonyms for the class by querying the rdfGraph in data
        for synonym_term classes (term predicates are rdf.URIRefs)
        and returns the values
    '''
    synonyms = {}
    for term in synonym_terms:
        syn = []
        for o in data.rdfGraph.objects(class_, term):
            syn += [o]
        syn = [str(s) for s in syn]
        synonyms.update(dict(zip(syn, [1] * len(syn))))
    return list(synonyms.keys())


def add_slim_to_term(term, slim_terms):
    '''Checks the list of ancestor terms to see if any are slim_terms
        and if so adds the slim_term to the term in slim_term slot

        for now checking both closure and closure_with_develops_from
        but consider having only single 'ancestor' list
    '''
    slimterms2add = {}
    for slimterm in slim_terms:
        if term.get('closure') and slimterm['term_id'] in term['closure']:
            slimterms2add[slimterm['term_id']] = slimterm
        if term.get('closure_with_develops_from') and slimterm['term_id'] in term['closure_with_develops_from']:
            slimterms2add[slimterm['term_id']] = slimterm
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


def get_synonym_terms(connection, ontology_id):
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


def get_synonym_terms_as_uri(connection, ontology_id, as_rdf=True):
    '''Checks an ontology item for ontology_terms that are used
        to designate synonyms in that ontology and returns a list
        of RDF Namespace:name pairs by default or simple URI strings
        if as_rdf=False.
    '''
    terms = get_synonym_terms(connection, ontology_id)
    uris = [syn['term_url'] for syn in terms]
    if as_rdf:
        uris = [convert2namespace(uri) for uri in uris]
    return uris


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
            notification = terms.get('notification')
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
            # place to set up logging
            # print(ontology)
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


def new_main():
    ''' Downloads latest Ontology OWL files for Ontologies in the database
        and Updates Terms by generating json inserts

        VERY MUCH A WORK IN PROGRESS
    '''
    # setup
    args = parse_args(sys.argv[1:])  # to facilitate testing
    connection = connect2server(args.keyfile, args.key)

    ontologies = get_ontologies(connection, args.ontologies)
    slim_terms = get_slim_terms(connection)

    # for testing with local copy of file pass in ontologies EFO
    ontologies[0]['download_url'] = '/Users/andrew/Documents/work/untracked_work_ff/test_families.owl'

    # start iteratively downloading and processing ontologies
    terms = {}
    for ontology in ontologies:
        if ontology['download_url'] is not None:
            print(ontology['download_url'])
            synonym_terms = get_synonym_terms_as_uri(connection, ontology['uuid'])
            for term in synonym_terms:
                print(term)
            data = Owler(ontology['download_url'])
            for class_ in data.allclasses:
                print(class_)
                synonyms = get_synonyms(class_, data, synonym_terms)
                print(synonyms)


def main():
    ''' Downloads UBERON, EFO and OBI ontologies and create a JSON file '''

    import argparse
    parser = argparse.ArgumentParser(
        description="Get Uberon, EFO and OBI ontologies and generate the JSON file", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--test-url', default=None, help="Test ontology path")
    parser.add_argument('--uberon-url', default=None, help="Uberon version URL")
    parser.add_argument('--efo-url', default=None, help="EFO version URL")
    parser.add_argument('--obi-url', default=None, help="OBI version URL")
    args = parser.parse_args()

    test_url = args.test_url
    uberon_url = args.uberon_url
    efo_url = args.efo_url
    obi_url = args.obi_url
    urls = [test_url, obi_url, uberon_url, efo_url]

    terms = {}
    for url in urls:
        if url is not None:
            data = Owler(url)
            for c in data.allclasses:
                if isBlankNode(c):
                    # print('BNODE=Class: ', c)
                    for o in data.rdfGraph.objects(c, subClassOf):
                        # see if the blank node has direct parents
                        if isBlankNode(o):
                            # print('\tBLANK PARENT')
                            pass
                        else:
                            # if the parent Class is a resource
                            for o1 in data.rdfGraph.objects(c, IntersectionOf):
                                # see if there are any IntersectionOf triples for the blank node
                                # and if so make a collection? using those objects (collection of what?)
                                collection = Collection(data.rdfGraph, o1)
                                col_list = []
                                # i = 0
                                # for coll in collection:
                                    # print('\tCOLLECTION[', i, ']', coll)
                                    # i = i + 1

                                for col in data.rdfGraph.objects(collection[1]):
                                    # getting the objects that are associated with the 2nd member of the collection
                                    # what the heck is that?
                                    # print('\t\tCOLLECTION OBJECT STRING: ', col.__str__())
                                    col_list.append(col.__str__())
                                if HUMAN_TAXON in col_list:
                                    # why are we only doing this for the human taxon?
                                    # adding part_of and develops_from relationships to the terms that are the
                                    # resources in the first item of the collection from each subClassOf the blank node
                                    if PART_OF in col_list:
                                        for subC in data.rdfGraph.objects(c, subClassOf):
                                            term_id = splitNameFromNamespace(collection[0])[0].replace('_', ':')
                                            if term_id not in terms:
                                                terms[term_id] = getTermStructure()
                                            terms[term_id]['part_of'].append(splitNameFromNamespace(subC)[0].replace('_', ':'))
                                elif DEVELOPS_FROM in col_list:
                                    for subC in data.rdfGraph.objects(c, subClassOf):
                                        term_id = splitNameFromNamespace(collection[0])[0].replace('_', ':')
                                        if term_id not in terms:
                                            terms[term_id] = getTermStructure()
                                        terms[term_id]['develops_from'].append(splitNameFromNamespace(subC)[0].replace('_', ':'))
                else:
                    # print('Class: ', c)
                    term_id = splitNameFromNamespace(c)[0].replace('_', ':')
                    if term_id not in terms:
                        terms[term_id] = getTermStructure()
                    terms[term_id]['id'] = term_id

                    try:
                        terms[term_id]['name'] = data.rdfGraph.label(c).__str__()
                    except:
                        terms[term_id]['name'] = ''

                    # terms[term_id]['preferred_name'] = preferred_name.get(term_id, '')
                    # Get all parents
                    for parent in data.get_classDirectSupers(c, excludeBnodes=False):
                        if isBlankNode(parent):
                            for s, v, o in data.rdfGraph.triples((parent, OnProperty, None)):
                                if o.__str__() == PART_OF:
                                    for o1 in data.rdfGraph.objects(parent, SomeValuesFrom):
                                        if not isBlankNode(o1):
                                            terms[term_id]['part_of'].append(splitNameFromNamespace(o1)[0].replace('_', ':'))
                                elif o.__str__() == DEVELOPS_FROM:
                                    for o1 in data.rdfGraph.objects(parent, SomeValuesFrom):
                                        if not isBlankNode(o1):
                                            terms[term_id]['develops_from'].append(splitNameFromNamespace(o1)[0].replace('_', ':'))
                                elif o.__str__() == HAS_PART:
                                    for o1 in data.rdfGraph.objects(parent, SomeValuesFrom):
                                        if not isBlankNode(o1):
                                            terms[term_id]['has_part'].append(splitNameFromNamespace(o1)[0].replace('_', ':'))
                                elif o.__str__() == ACHIEVES_PLANNED_OBJECTIVE:
                                    for o1 in data.rdfGraph.objects(parent, SomeValuesFrom):
                                        if not isBlankNode(o1):
                                            terms[term_id]['achieves_planned_objective'].append(splitNameFromNamespace(o1)[0].replace('_', ':'))
                        else:
                            terms[term_id]['parents'].append(splitNameFromNamespace(parent)[0].replace('_', ':'))

                    # for syn in data.entitySynonyms(c):
                    #    try:
                    #        terms[term_id]['synonyms'].append(syn.__str__())
                    #    except:
                    #        pass

    for term in terms:
        terms[term]['data'] = list(set(terms[term]['parents']) | set(terms[term]['part_of']) | set(terms[term]['achieves_planned_objective']))
        terms[term]['data_with_develops_from'] = list(set(terms[term]['data']) | set(terms[term]['develops_from']))

    for term in terms:
        words = iterativeChildren(terms[term]['data'], terms, 'data')
        for word in words:
            terms[term]['closure'].append(word)

        d = iterativeChildren(terms[term]['data_with_develops_from'], terms, 'data_with_develops_from')
        for dd in d:
            terms[term]['closure_with_develops_from'].append(dd)

        terms[term]['closure'].append(term)
        terms[term]['closure_with_develops_from'].append(term)

        terms[term]['systems'] = getSlims(term, terms, 'system')
        terms[term]['organs'] = getSlims(term, terms, 'organ')
        terms[term]['developmental'] = getSlims(term, terms, 'developmental')
        terms[term]['assay'] = getSlims(term, terms, 'assay')
        terms[term]['category'] = getSlims(term, terms, 'category')
        terms[term]['objectives'] = getSlims(term, terms, 'objective')
        terms[term]['types'] = getSlims(term, terms, 'type')

        # this removes the iterative parent term info
        del terms[term]['closure'], terms[term]['closure_with_develops_from']

    for term in terms:
        del terms[term]['parents'], terms[term]['develops_from']
        del terms[term]['has_part'], terms[term]['achieves_planned_objective']
        del terms[term]['id'], terms[term]['data'], terms[term]['data_with_develops_from']

    # terms.update(ntr_assays)
    with open('test_ontology.json', 'w') as outfile:
        json.dump(terms, outfile)


if __name__ == '__main__':
    new_main()
