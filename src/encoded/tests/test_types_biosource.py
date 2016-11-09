import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def GM12878_biosource(testapp):
    item = {
        "accession": "4DNSR000AAQ1",
        "biosource_type": "immortalized cell line",
        "cell_line": "GM12878",
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def F123_biosource(testapp):
    item = {
        "accession": "4DNSR000AAQ2",
        "biosource_type": "stem cell",
        "cell_line": "F123-CASTx129",
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def lung_biosource(testapp):
    item = {
        "biosource_type": "tissue",
        "tissue": "lung"
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def whole_biosource(testapp, human_individual):
    item = {
        "biosource_type": "whole organisms",
        "individual": human_individual['@id']
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def cell_lines(GM12878_biosource, F123_biosource):
    return [GM12878_biosource, F123_biosource]


@pytest.fixture
def biosources(cell_lines, lung_biosource, whole_biosource):
    bs = cell_lines
    bs.extend([lung_biosource, whole_biosource])
    return bs


def test_biosource_update_termids(testapp, cell_lines):
    acc2termid = {'4DNSR000AAQ1': 'EFO_0002784', '4DNSR000AAQ2': None}
    for cell in cell_lines:
        if cell['accession'] in acc2termid:
            if acc2termid[cell['accession']] is not None:
                assert cell['cell_line_termid'] == acc2termid[cell['accession']]
            else:
                assert 'cell_line_termid' not in cell


def test_biosource_update_cell_line_tier(testapp, biosources):
    acc2tier = {'4DNSR000AAQ1': 'Tier 1', '4DNSR000AAQ2': 'Tier 2'}
    for biosource in biosources:
        acc = biosource.get('accession')
        print(acc)
        if acc in acc2tier:
            print(biosource)
            assert biosource['cell_line_tier'] == acc2tier[acc]
        else:
            assert 'cell_line_tier' not in biosource


def test_calculated_biosource_name(testapp, biosources):
    for biosource in biosources:
        biotype = biosource['biosource_type']
        name = biosource['biosource_name']
        if biotype == 'immortalized cell line':
            assert name == 'GM12878'
        if biotype == 'stem cell':
            assert name == 'F123-CASTx129'
        if biotype == 'tissue':
            assert name == 'lung'
        if biotype == 'whole organisms':
            assert name == 'whole human'
