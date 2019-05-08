import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def so_ont(testapp):
    return testapp.post_json('/ontology', {'ontology_name': 'SO'}).json['@graph'][0]


@pytest.fixture
def protein_term(testapp, so_ont):
    gterm = {
        'uuid': '8bea5bde-d860-49f8-b178-35d0dadbd644',
        'term_id': 'SO:0000104', 'term_name': 'polypeptide',
        'preferred_name': 'protein',
        'source_ontology': so_ont['@id']}
    return testapp.post_json('/ontology_term', gterm).json['@graph'][0]


@pytest.fixture
def region_term(testapp, so_ont):
    gterm = {
        'uuid': '6bea5bde-d860-49f8-b178-35d0dadbd644',
        'term_id': 'SO:0000001', 'term_name': 'region',
        'source_ontology': so_ont['@id']}
    return testapp.post_json('/ontology_term', gterm).json['@graph'][0]


@pytest.fixture
def transcript_term(testapp, so_ont):
    gterm = {
        'uuid': '5bea5bde-d860-49f8-b178-35d0dadbd644',
        'term_id': 'SO:0000673', 'term_name': 'transcript',
        'source_ontology': so_ont['@id']}
    return testapp.post_json('/ontology_term', gterm).json['@graph'][0]


@pytest.fixture
def component_term(testapp, so_ont):
    gterm = {
        'uuid': '4bea5bde-d860-49f8-b178-35d0dadbd644',
        'term_id': 'GO:0005575', 'term_name': 'cellular_component',
        'source_ontology': so_ont['@id']}
    return testapp.post_json('/ontology_term', gterm).json['@graph'][0]


@pytest.fixture
def gene_item(testapp, lab, award, human):
    return testapp.post_json('/gene', {'lab': lab['@id'], 'award': award['@id'], 'geneid': '5885'}).json['@graph'][0]


@pytest.fixture
def mouse_gene_item(testapp, lab, award, mouse):
    return testapp.post_json('/gene', {'lab': lab['@id'], 'award': award['@id'], 'geneid': '16825'}).json['@graph'][0]


@pytest.fixture
def armadillo_gene_item(testapp, lab, award):
    return testapp.post_json('/gene', {'lab': lab['@id'], 'award': award['@id'], 'geneid': '101428042'}).json['@graph'][0]


@pytest.fixture
def gene_bio_feature(testapp, lab, award, gene_term, gene_item, human):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'description': 'Test Gene BioFeature',
            'feature_type': gene_term['@id'],
            'organism_name': 'human',
            'relevant_genes': [gene_item['@id']]}
    return testapp.post_json('/bio_feature', item).json['@graph'][0]


@pytest.fixture
def mouse_gene_bio_feature(testapp, lab, award, gene_term, mouse_gene_item, human, mouse):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'description': 'Test Mouse Gene BioFeature',
            'feature_type': gene_term['@id'],
            'organism_name': 'mouse',
            'relevant_genes': [mouse_gene_item['@id']]}
    return testapp.post_json('/bio_feature', item).json['@graph'][0]


@pytest.fixture
def armadillo_gene_bio_feature(testapp, lab, award, gene_term, armadillo_gene_item):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'description': 'Test Mouse Gene BioFeature',
            'feature_type': gene_term['@id'],
            'relevant_genes': [armadillo_gene_item['@id']]}
    return testapp.post_json('/bio_feature', item).json['@graph'][0]


@pytest.fixture
def multi_species_gene_bio_feature(testapp, lab, award, gene_term, gene_item, mouse_gene_item, human, mouse):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'description': 'Test Multi Gene BioFeature',
            'feature_type': gene_term['@id'],
            'organism_name': 'multiple organisms',
            'relevant_genes': [mouse_gene_item['@id'], gene_item['@id']]}
    return testapp.post_json('/bio_feature', item).json['@graph'][0]


@pytest.fixture
def genomic_region_bio_feature(testapp, lab, award, region_term, some_genomic_region, human):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'description': 'Test Region BioFeature',
            'feature_type': region_term['@id'],
            'organism_name': 'human',
            'genome_location': [some_genomic_region['@id']]}
    return testapp.post_json('/bio_feature', item).json['@graph'][0]


def test_bio_feature_display_title_gene(gene_bio_feature, gene_item):
    assert gene_bio_feature.get('display_title') == gene_item.get('display_title') + ' gene'


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


def test_bio_feature_display_title_mouse_gene(
        mouse_gene_bio_feature, mouse_gene_item):
    assert mouse_gene_bio_feature.get('display_title') == mouse_gene_item.get('display_title') + ' mouse gene'


def test_bio_feature_display_title_multi_species_gene(
        multi_species_gene_bio_feature):
    assert multi_species_gene_bio_feature.get('display_title') == 'Ldb1, RAD21 genes multiple organisms'


def test_bio_feature_display_title_unknown_organism_gene(
        armadillo_gene_bio_feature, armadillo_gene_item):
    assert armadillo_gene_bio_feature.get('display_title') == armadillo_gene_item.get('display_title') + ' gene'
