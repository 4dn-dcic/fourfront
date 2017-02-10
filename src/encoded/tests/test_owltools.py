import pytest
pytestmark = pytest.mark.working
from encoded.commands import owltools as ot


@pytest.fixture
def owler(mocker):
    return mocker.patch.object(ot, 'Owler')


def emptygen(*args, **kwargs):
    return
    yield  # necessary to produce generator


def rdfobject_generator(rdfobj_list):
    for rdfobj in rdfobj_list:
        yield rdfobj


@pytest.fixture
def rdf_objects():
    from rdflib import Literal
    rdfobjs = ['testrdfobj1', 'testrdfobj2']
    rdfobjs = [Literal(rdfobj) for rdfobj in rdfobjs]
    return [rdfobject_generator(rdfobjs)]


@pytest.fixture
def rdf_objects_2_1():
    from rdflib import Literal
    rdfobjs = ['testrdfobj1']
    rdfobjs = [Literal(rdfobj) for rdfobj in rdfobjs]
    return [rdfobject_generator(rdfobjs), rdfobject_generator(rdfobjs)]


@pytest.fixture
def rdf_objects_2_3():
    from rdflib import Literal
    rdfobjs = ['testrdfobj1', 'testrdfobj2', 'testrdfobj3']
    rdfobjs = [Literal(rdfobj) for rdfobj in rdfobjs]
    return [rdfobject_generator(rdfobjs[:1]), rdfobject_generator(rdfobjs[1:])]


def test_get_rdfobjects_one_type_two_rdfobjs(mocker, owler, rdf_objects):
    checks = ['testrdfobj1', 'testrdfobj2']
    with mocker.patch('encoded.commands.owltools.Owler.rdfGraph.objects',
                      side_effect=rdf_objects):
        class_ = 'test_class'
        rdfobject_terms = ['1']
        rdfobjects = ot.getObjectLiteralsOfType(class_, owler, rdfobject_terms)
        assert len(rdfobjects) == 2
        for rdfobj in rdfobjects:
            assert rdfobj in checks


def test_get_rdfobjects_two_types_one_rdfobj(mocker, owler, rdf_objects_2_1):
    check = 'testrdfobj1'
    with mocker.patch('encoded.commands.owltools.Owler.rdfGraph.objects',
                      side_effect=rdf_objects_2_1):
        class_ = 'test_class'
        rdfobject_terms = ['1', '2']
        rdfobjects = ot.getObjectLiteralsOfType(class_, owler, rdfobject_terms)
        assert rdfobjects[0] == check


def test_get_rdfobjects_two_types_three_rdfobj(mocker, owler, rdf_objects_2_3):
    checks = ['testrdfobj1', 'testrdfobj2', 'testrdfobj3']
    with mocker.patch('encoded.commands.owltools.Owler.rdfGraph.objects',
                      side_effect=rdf_objects_2_3):
        class_ = 'test_class'
        rdfobject_terms = ['1', '2']
        rdfobjects = ot.getObjectLiteralsOfType(class_, owler, rdfobject_terms)
        assert len(rdfobjects) == 3
        for rdfobj in rdfobjects:
            assert rdfobj in checks


def test_get_rdfobjects_none_there(mocker, owler):
    with mocker.patch('encoded.commands.owltools.Owler.rdfGraph.objects',
                      side_effect=emptygen):
        class_ = 'test_class'
        rdfobject_terms = ['1']
        rdfobjects = ot.getObjectLiteralsOfType(class_, owler, rdfobject_terms)
        assert not rdfobjects
