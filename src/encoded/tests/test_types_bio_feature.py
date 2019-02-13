import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def gene_item(testapp, lab, award):
    return testapp.post_json('/gene', {'lab': lab['@id'], 'award': award['@id'], 'geneid': '5885'}).json['@graph'][0]


def test_bio_feature_display_title_gene(gene_bio_feature):
    ''' gene_bio_feature is in datafixtures '''
    assert gene_bio_feature.get('display_title') == 'RAD21 gene'


def test_bio_feature_display_title_genomic_region(genomic_region_bio_feature):
    assert genomic_region_bio_feature.get('display_title') == 'GRCh38:1:17-544 region'


def test_bio_feature_display_title_genomic_region_w_preferred_label(testapp, genomic_region_bio_feature):
    label = 'awesome region'
    res = testapp.patch_json(genomic_region_bio_feature['@id'], {'preferred_label': label}, status=200)
    assert res.json['@graph'][0].get('display_title') == label


def test_bio_feature_display_title_protein_transcript(
        testapp, gene_item, gene_bio_feature, protein_term, transcript_term):
    ''' gene_bio_feature is in datafixtures '''
    types = [protein_term, transcript_term]
    for t in types:
        res = testapp.patch_json(gene_bio_feature['@id'], {'feature_type': t['@id']}, status=200)
        assert res.json['@graph'][0].get('display_title') == gene_item.get('display_title') + ' ' + t.get('display_title')


def test_bio_feature_display_title_modfied_protein(
        testapp, gene_item, gene_bio_feature, protein_term):
    ''' gene_bio_feature is in datafixtures '''
    res = testapp.patch_json(
        gene_bio_feature['@id'],
        {
            'feature_type': protein_term['@id'],
            'feature_mods': [{
                'mod_type': 'Methylation',
                'mod_position': 'K9'
            }]
        },
        status=200)
    assert res.json['@graph'][0].get('display_title') == 'RAD21 protein with K9 Methylation'


def test_bio_feature_display_title_cellular_component(testapp, component_term, lab, award):
    struct = 'Nuclear pore complex'
    item = {
        'feature_type': component_term['@id'],
        'cellular_structure': struct,
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'test structure'
    }
    res = testapp.post_json('/bio_feature', item, status=201)
    assert res.json['@graph'][0].get('display_title') == struct
