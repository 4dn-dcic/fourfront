import pytest
pytestmark = pytest.mark.working
from rdflib import RDFS, BNode, URIRef
from encoded.commands import owltools as ot


@pytest.fixture
def owler(mocker):
    return mocker.patch.object(ot, 'Owler')


# def emptygen(*args, **kwargs):
#    return
#    yield  # necessary to produce generator


# def rdfobject_generator(rdfobj_list):
#    for rdfobj in rdfobj_list:
#        yield rdfobj


@pytest.fixture
def rdf_objects():
    from rdflib import Literal
    rdfobjs = ['testrdfobj1', 'testrdfobj2']
    return [Literal(rdfobj) for rdfobj in rdfobjs]


@pytest.fixture
def rdf_objects_2_1():
    from rdflib import Literal
    rdfobjs = ['testrdfobj1']
    return [Literal(rdfobj) for rdfobj in rdfobjs]


@pytest.fixture
def rdf_objects_2_3():
    from rdflib import Literal
    rdfobjs = ['testrdfobj1', 'testrdfobj2', 'testrdfobj3']
    return [Literal(rdfobj) for rdfobj in rdfobjs]


def test_get_rdfobjects_one_type_two_rdfobjs(mocker, owler, rdf_objects):
    checks = ['testrdfobj1', 'testrdfobj2']
    with mocker.patch('encoded.commands.owltools.ConjunctiveGraph') as graph:
        graph.objects.return_value = rdf_objects
        owler = ot.Owler('http://test.com')
        owler.rdfGraph = graph
        class_ = 'test_class'
        rdfobject_terms = ['1']
        rdfobjects = ot.getObjectLiteralsOfType(class_, owler, rdfobject_terms)
        assert len(rdfobjects) == 2
        for rdfobj in rdfobjects:
            assert rdfobj in checks


def test_get_rdfobjects_two_types_one_rdfobj(mocker, owler, rdf_objects_2_1):
    check = 'testrdfobj1'
    with mocker.patch('encoded.commands.owltools.ConjunctiveGraph') as graph:
        graph.objects.return_value = rdf_objects_2_1
        owler = ot.Owler('http://test.com')
        owler.rdfGraph = graph
        class_ = 'test_class'
        rdfobject_terms = ['1', '2']
        rdfobjects = ot.getObjectLiteralsOfType(class_, owler, rdfobject_terms)
        assert rdfobjects[0] == check


def test_get_rdfobjects_two_types_three_rdfobj(mocker, rdf_objects_2_3):
    checks = ['testrdfobj1', 'testrdfobj2', 'testrdfobj3']
    with mocker.patch('encoded.commands.owltools.ConjunctiveGraph') as graph:
        graph.objects.return_value = rdf_objects_2_3
        owler = ot.Owler('http://test.com')
        owler.rdfGraph = graph
        class_ = 'test_class'
        rdfobject_terms = ['1', '2']
        rdfobjects = ot.getObjectLiteralsOfType(class_, owler, rdfobject_terms)
        assert len(rdfobjects) == 3
        for rdfobj in rdfobjects:
            assert rdfobj in checks


def test_get_rdfobjects_none_there(mocker, owler):
    with mocker.patch('encoded.commands.owltools.ConjunctiveGraph') as graph:
        graph.objects.return_value = []
        owler = ot.Owler('http://test.com')
        owler.rdfGraph = graph
        owler = ot.Owler('http://test.com')
        class_ = 'test_class'
        rdfobject_terms = []
        rdfobjects = ot.getObjectLiteralsOfType(class_, owler, rdfobject_terms)
        assert not rdfobjects


def test_convert2URIRef_nostring():
    result = ot.convert2URIRef(None)
    assert result is None


def test_convert2URIRef_string():
    result = ot.convert2URIRef('test_string')
    assert ot.isURIRef(result)
    assert result.toPython() == 'test_string'


@pytest.fixture
def uri_list():
    strings = [
        'testwithoutslashes',
        'test/namespace#name',
        'test/namespace/name'
    ]
    uris = [ot.convert2URIRef(s) for s in strings]
    return strings + uris


def test_splitNameFromNamespace(uri_list):
    for i, uri in enumerate(uri_list):
        name, ns = ot.splitNameFromNamespace(uri)
        if i % 3 == 0:
            assert not name
            assert ns == uri_list[0]
        else:
            assert name == 'name'
            assert ns == 'test/namespace'


@pytest.fixture
def unsorted_uris():
    strings = [
        'test/Z',
        'test/1',
        'test#B',
        'test#a'
    ]
    uris = [ot.convert2URIRef(s) for s in strings]
    return strings + uris


def test_sortUriListByName(unsorted_uris):
    wanted = ['test/1', 'test/1', 'test#B', 'test#B', 'test/Z', 'test/Z', 'test#a', 'test#a']
    sorted_uris = ot.sortUriListByName(unsorted_uris)
    sorted_uris = [s.__str__() for s in sorted_uris]
    assert sorted_uris == wanted


@pytest.fixture
def blank_node():
    return BNode()


def test_isBlankNode_bnode(blank_node):
    assert ot.isBlankNode(blank_node)


def test_isBlankNode_non_bnode(unsorted_uris):
    assert not ot.isBlankNode(unsorted_uris[4])


@pytest.fixture
def dupe_lists():
    return [
        [[1, 2], [1, 3], [1, 4]],
        [['a', 'b', 'c'], ['a', 'a', 'b', 'b', 'b', 'c']],
        [[1, 2, 3], [1, 2, 3, 3, 3, 2, 2, 1]],
        [[None, None]],
        [None]
    ]


def test_removeDuplicates(dupe_lists):
    for i, l in enumerate(dupe_lists):
        if i == 0:
            def id_func(l):
                return l[0]
            result = ot.removeDuplicates(l, id_func)
            assert len(result) == 1
            assert result == [[1, 2]]
        else:
            for sl in l:
                result = ot.removeDuplicates(sl)
                if i == 1:
                    assert result == ['a', 'b', 'c']
                elif i == 2:
                    assert result == [1, 2, 3]
                elif i == 3:
                    assert result == [None]
                else:
                    assert result == []
