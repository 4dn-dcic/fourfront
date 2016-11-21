import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def cell_lines(GM12878_biosource, F123_biosource):
    return [GM12878_biosource, F123_biosource]


@pytest.fixture
def biosources(cell_lines, lung_biosource, whole_biosource):
    bs = cell_lines
    bs.extend([lung_biosource, whole_biosource])
    return bs


def test_biosource_update_termids(cell_lines):
    acc2termid = {'4DNSR000AAQ1': 'EFO_0002784', '4DNSR000AAQ2': None}
    for cell in cell_lines:
        if cell['accession'] in acc2termid:
            if acc2termid[cell['accession']] is not None:
                assert cell['cell_line_termid'] == acc2termid[cell['accession']]
            else:
                assert 'cell_line_termid' not in cell


def test_calculated_biosource_name(biosources):
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
