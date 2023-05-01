import re
from rdflib import ConjunctiveGraph, exceptions, Namespace
from rdflib import RDFS, RDF, BNode, URIRef


OWLNS = Namespace("http://www.w3.org/2002/07/owl#")
OBO_OWL = Namespace("http://www.geneontology.org/formats/oboInOwl#")
OBO = Namespace("http://purl.obolibrary.org/obo/")

Ontology = OWLNS["Ontology"]
Restriction = OWLNS["Restriction"]
Class = OWLNS["Class"]
Thing = OWLNS["Thing"]
OnProperty = OWLNS["onProperty"]
subClassOf = RDFS.subClassOf
SomeValuesFrom = OWLNS["someValuesFrom"]
IntersectionOf = OWLNS["intersectionOf"]
Deprecated = OWLNS["deprecated"]

DEFAULT_LANGUAGE = "en"


def convert2URIRef(astring):
    '''converts a string to a URIRef type'''
    try:
        astring = URIRef(astring)
    except Exception:
        pass
    return astring


def isURIRef(uri):
    return isinstance(uri, URIRef)


def inferNamespacePrefix(aUri):
    stringa = aUri.__str__()
    try:
        prefix = stringa.replace("#", "").split("/")[-1]
    except Exception:
        prefix = ""
    return prefix


def splitNameFromNamespace(aUri):
    name = ''
    stringa = aUri.__str__()
    try:
        ns = stringa.split("#")[0]
        name = stringa.split("#")[1]
    except Exception:
        ns = stringa.rsplit("/", 1)[0]
        if '/' in stringa:
            name = stringa.rsplit("/", 1)[1]
    return (name, ns)


def sortUriListByName(uri_list):

    def get_last_bit(uri_string):
        try:
            x = uri_string.split("#")[1]
        except Exception:
            x = uri_string.split("/")[-1]
        return x

    try:
        return sorted(uri_list, key=lambda x: get_last_bit(x.__str__()))
    except Exception:
        # TODO: do more testing.. maybe use a unicode-safe method instead of __str__
        print("Error in <sortUriListByName>: possibly a UnicodeEncodeError")
        return uri_list


def isBlankNode(aClass):
    ''' Checks for an RDF blank node '''
    if type(aClass) == BNode:
        return True
    else:
        return False


def removeDuplicates(seq, idfun=None):
    '''general utility function for removing duplicate members from a sequence
        a function can be passed in that can specify an id to use for comparison
        (required for un-hashable members), otherwise members are compared directly
    '''
    if seq:
        if idfun is None:
            def idfun(x):
                return x
        seen = {}
        result = []
        for item in seq:
            marker = idfun(item)
            if marker in seen:
                continue
            seen[marker] = 1
            result.append(item)
        return result
    else:
        return []


def getObjectLiteralsOfType(class_, data, terms):
    '''Given a class identifier, rdfGraph and predicate URIRefs
        Returns the list of unique object literals
    '''
    objects = {}
    for term in terms:
        obj = []
        for o in data.rdfGraph.objects(class_, term):
            obj += [o]
        obj = [str(s) for s in obj]
        objects.update(dict(zip(obj, [1] * len(obj))))
    return list(objects.keys())


class Owler(object):

    """ Class that includes methods for building an RDF graph from an OWL ontology
        and retrieving information from it """

    def __init__(self, uri, language=""):
        if uri == "https://www.ebi.ac.uk/efo/efo.owl":
            #
            # TODO: Do this some other way (mapping table or something)!
            # Note that even just via curl (in US east) can take up
            # to 15+ minutes download https://www.ebi.ac.uk/efo/efo.owl (!)
            # Downloading from here is MUCH faster: https://github.com/EBISPOT/efo/releases/download/current/efo.owl
            # See: https://www.ebi.ac.uk/efo/
            # 
            uri = "https://github.com/EBISPOT/efo/releases/download/current/efo.owl"
        super(Owler, self).__init__()
        self.rdfGraph = ConjunctiveGraph()
        try:
            self.rdfGraph.parse(uri, format="application/rdf+xml")
        except Exception:
            try:
                self.rdfGraph.parse(uri, format="n3")
            except Exception:
                raise exceptions.Error("Could not parse the file! Is it a valid RDF/OWL ontology?")
        finally:
            self.baseURI = self.__get_OntologyURI() or uri
            self.version = self.__get_OntologyVersion()
            self.allclasses = self.__getAllClasses(includeDomainRange=True, includeImplicit=True, removeBlankNodes=False, excludeRDF_OWL=False)

    def __get_OntologyURI(self, return_as_string=True):
        test = [x for x, y, z in self.rdfGraph.triples((None, RDF.type, Ontology))]
        if test:
            if return_as_string:
                return str(test[0])
            else:
                return test[0]
        else:
            return None

    def __get_OntologyVersion(self, return_as_string=True):
        vinfo = [z for x, y, z in self.rdfGraph.triples((None, OWLNS["versionInfo"], None))]
        if vinfo:
            if return_as_string:
                return str(vinfo[0])
            else:
                return vinfo[0]
        uris = [z for x, y, z in self.rdfGraph.triples((None, OWLNS["versionIRI"], None))]
        if uris:
            try:
                v = uris[0].split('/')
                if 'releases' in v:
                    v = v[v.index('releases') + 1]
                else:
                    match = re.search('(20)?([0-9]{2})-[0-9]{2}-(20)?[0-9]{2}', uris[0])
                    if match:
                        v = match.group()
                    else:
                        v = uris[0]
                if return_as_string:
                    return str(v)
                else:
                    return v
            except Exception:
                return None
        return None

    def __getAllClasses(self, classPredicate="", includeDomainRange=False, includeImplicit=False, removeBlankNodes=True, addOWLThing=True, excludeRDF_OWL=True):

        rdfGraph = self.rdfGraph
        exit = {}

        def addIfYouCan(x, mydict):
            if excludeRDF_OWL:
                if x.startswith('http://www.w3.org/2002/07/owl#') or  \
                   x.startswith("http://www.w3.org/1999/02/22-rdf-syntax-ns#") or \
                   x.startswith("http://www.w3.org/2000/01/rdf-schema#"):
                    return mydict
            if x not in mydict:
                mydict[x] = None
            return mydict

        if addOWLThing:
            exit = addIfYouCan(Thing, exit)

        if classPredicate == "rdfs" or classPredicate == "":
            for s in rdfGraph.subjects(RDF.type, RDFS.Class):
                exit = addIfYouCan(s, exit)

        if classPredicate == "owl" or classPredicate == "":
            for s in rdfGraph.subjects(RDF.type, Class):
                exit = addIfYouCan(s, exit)

        if includeDomainRange:
            for o in rdfGraph.objects(None, RDFS.domain):
                exit = addIfYouCan(o, exit)
            for o in rdfGraph.objects(None, RDFS.range):
                exit = addIfYouCan(o, exit)

        if includeImplicit:
            for s, v, o in rdfGraph.triples((None, RDFS.subClassOf, None)):
                exit = addIfYouCan(s, exit)
                exit = addIfYouCan(o, exit)
            for o in rdfGraph.objects(None, RDF.type):
                exit = addIfYouCan(o, exit)

        # get a list
        exit = exit.keys()
        if removeBlankNodes:
            exit = [x for x in exit if not isBlankNode(x)]
        return sortUriListByName(exit)

    # methods for getting ancestors and descendants of classes: by default, we do not include blank nodes
    def get_classDirectSupers(self, aClass, excludeBnodes=True, sortUriName=False):
        returnlist = []
        for o in self.rdfGraph.objects(aClass, RDFS.subClassOf):
            if not (o == Thing):
                if excludeBnodes:
                    if not isBlankNode(o):
                        returnlist.append(o)
                else:
                    returnlist.append(o)
        if sortUriName:
            return sortUriListByName(removeDuplicates(returnlist))
        else:
            return removeDuplicates(returnlist)
