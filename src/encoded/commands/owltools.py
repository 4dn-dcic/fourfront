from rdflib import ConjunctiveGraph, exceptions, Namespace
from rdflib import RDFS, RDF, BNode
from rdflib.collection import Collection


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

DEFAULT_LANGUAGE = "en"


def inferNamespacePrefix(aUri):
    stringa = aUri.__str__()
    try:
        prefix = stringa.replace("#", "").split("/")[-1]
    except:
        prefix = ""
    return prefix


def splitNameFromNamespace(aUri):
    name = ''
    stringa = aUri.__str__()
    try:
        ns = stringa.split("#")[0]
        name = stringa.split("#")[1]
    except:
        ns = stringa.rsplit("/", 1)[0]
        if '/' in stringa:
            name = stringa.rsplit("/", 1)[1]
        else:
            print('URI=', aUri)
    return (name, ns)


def sortUriListByName(uri_list):

    def get_last_bit(uri_string):
        try:
            x = uri_string.split("#")[1]
        except:
            x = uri_string.split("/")[-1]
        return x

    try:
        return sorted(uri_list, key=lambda x: get_last_bit(x.__str__()))
    except:
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
        super(Owler, self).__init__()
        self.rdfGraph = ConjunctiveGraph()
        try:
            self.rdfGraph.parse(uri, format="application/rdf+xml")
        except:
            try:
                self.rdfGraph.parse(uri, format="n3")
            except:
                raise exceptions.Error("Could not parse the file! Is it a valid RDF/OWL ontology?")
        finally:
            self.baseURI = self.__get_OntologyURI() or uri
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

    def get_classDirectSubs(self, aClass, excludeBnodes=True):
        returnlist = []
        for s, v, o in self.rdfGraph.triples((None, RDFS.subClassOf, aClass)):
            if excludeBnodes:
                if not isBlankNode(s):
                    returnlist.append(s)
            else:
                returnlist.append(s)
        return sortUriListByName(removeDuplicates(returnlist))

    def get_classSiblings(self, aClass, excludeBnodes=True):
        returnlist = []
        for father in self.get_classDirectSupers(aClass, excludeBnodes):
            for child in self.get_classDirectSubs(father, excludeBnodes):
                if child != aClass:
                    returnlist.append(child)

        return sortUriListByName(removeDuplicates(returnlist))

    def entitySynonyms(self, anEntity, language=DEFAULT_LANGUAGE, getall=True):
        if getall:
            temp = []
            # Uberon synonyms
            for o in self.rdfGraph.objects(anEntity, Synonym):
                temp += [o]
            # EFO synonyms
            for o in self.rdfGraph.objects(anEntity, EFO_Synonym):
                temp += [o]
            # OBI synonyms
            for o in self.rdfGraph.objects(anEntity, OBO_Synonym):
                temp += [o]
            return temp
        else:
            for o in self.rdfGraph.objects(anEntity, Synonym):
                if getattr(o, 'language') and getattr(o, 'language') == language:
                    return o
            return ""

    def entityDefinition(self, anEntity, language=DEFAULT_LANGUAGE):
        temp = []
        try:
            for o in self.rdfGraph.objects(anEntity, OBO_Definition):
                temp += [o]
        except:
            try:
                for o in self.rdfGraph.objects(anEntity, EFO_Definition):
                    temp += [o]
            except:
                temp += ['DRAT!']
        return temp

    def classFind(self, name, exact=False):
        temp = []
        if name:
            for x in self.allclasses:
                if exact:
                    if x.__str__().lower() == str(name).lower():
                        return [x]
                else:
                    if x.__str__().lower().find(str(name).lower()) >= 0:
                        temp.append(x)
        return temp

    def get_SubjectInfo(self, subject, predicate=None, obj=None):
        '''
        Returns info on a given subject of a triple - can be constrained
        based on provided predicate and/or object

        Default returns list of tuples of all predicate, object for that subject
        '''
        result = []
        if predicate is None and obj is None:
            for po in self.rdfGraph.predicate_objects(subject):
                result.append(po)
        elif predicate is None:
            for p in self.rdfGraph.predicates(subject=subject, object=obj):
                result.append(p)
        else:
            for o in self.rdfGraph.objects(subject=subject, predicate=predicate):
                result.append(o)
        return result
