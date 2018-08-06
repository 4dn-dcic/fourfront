import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def some_genomic_region(testapp, lab, award):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'genome_assembly': 'GRCh38',
            'chromosome': '1',
            'start_coordinate': 17,
            'end_coordinate': 544}
    return testapp.post_json('/genomic_region', item).json['@graph'][0]


@pytest.fixture
def vague_genomic_region(testapp, lab, award):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'genome_assembly': 'GRCm38',
            'chromosome': '5',
            'start_location': 'beginning',
            'end_location': 'centromere'}
    return testapp.post_json('/genomic_region', item).json['@graph'][0]


@pytest.fixture
def genomic_target(testapp, lab, award, some_genomic_region):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'targeted_genome_regions': [some_genomic_region['@id']]}
    return testapp.post_json('/target', item).json['@graph'][0]


@pytest.fixture
def protein_complex_target(testapp, lab, award):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'targeted_proteins': ['SubunitA', 'SubunitX']}
    return testapp.post_json('/target', item).json['@graph'][0]


@pytest.fixture
def multi_target(testapp, lab, award):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'targeted_genes': ['GeneA1'],
            'targeted_structure': 'Nuclear pore complex'}
    return testapp.post_json('/target', item).json['@graph'][0]


def test_target_summary_genomic(testapp, genomic_target, some_genomic_region, vague_genomic_region):
    assert genomic_target['target_summary'] == 'GRCh38:1:17-544'
    assert genomic_target['display_title'] == 'GRCh38:1:17-544'
    res = testapp.patch_json(genomic_target['@id'],
                             {'targeted_genome_regions': [some_genomic_region['@id'], vague_genomic_region['@id']]})
    assert res.json['@graph'][0]['target_summary'] == 'GRCh38:1:17-544,GRCm38:5'
    assert res.json['@graph'][0]['display_title'] == 'GRCh38:1:17-544,GRCm38:5'


def test_target_summary_proteins(testapp, protein_complex_target):
    assert protein_complex_target['target_summary'] == 'Protein:SubunitA,SubunitX'
    assert protein_complex_target['display_title'] == 'Protein:SubunitA,SubunitX'


def test_target_summary_multiple(testapp, multi_target):
    assert multi_target['target_summary'] == 'Gene:GeneA1 & Nuclear pore complex'
    assert multi_target['display_title'] == 'Gene:GeneA1 & Nuclear pore complex'
    res = testapp.patch_json(multi_target['@id'], {'targeted_rnas': ['lncRNA']})
    assert res.json['@graph'][0]['target_summary'] == 'Gene:GeneA1 & RNA:lncRNA & Nuclear pore complex'
    assert res.json['@graph'][0]['display_title'] == 'Gene:GeneA1 & RNA:lncRNA & Nuclear pore complex'


def test_target_type(testapp, genomic_target, protein_complex_target, multi_target):
    assert genomic_target['target_type'] == ['Genomic Region']
    assert protein_complex_target['target_type'] == ['Protein']
    assert multi_target['target_type'] == ['Gene', 'Structure']
