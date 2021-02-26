import pytest


pytestmark = [pytest.mark.setone, pytest.mark.working]


def test_graph_dot(testapp):
    res = testapp.get('/profiles/graph.dot', status=200)
    assert res.content_type == 'text/vnd.graphviz'
    assert res.text


@pytest.mark.broken_remotely  # Doesn't work on GitHub Actions
def test_graph_svg(testapp):
    res = testapp.get('/profiles/graph.svg', status=200)
    assert res.content_type == 'image/svg+xml'
    assert res.text
