import pytest
# from encoded.types.experiment import Experiment, ExperimentHiC
# pytestmark = pytest.mark.working


@pytest.fixture
def target_w_genes(testapp, lab, award):
    item = {
        "targeted_genes": ["eeny", "meeny"],
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/target', item).json['@graph'][0]


@pytest.fixture
def target_w_region(testapp, genomic_region_w_chrloc, lab, award):
    item = {
        "targeted_region": genomic_region_w_chrloc['@id'],
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/target', item).json['@graph'][0]


@pytest.fixture
def target_w_desc(testapp, lab, award):
    item = {
        "description": "I'm a region",
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/target', item).json['@graph'][0]


@pytest.fixture
def targets(target_w_desc, target_w_region, target_w_genes):
    return {'target_w_desc': target_w_desc,
            'target_w_region': target_w_region,
            'target_w_genes': target_w_genes
            }


@pytest.fixture
def basic_genomic_region(testapp, lab, award):
    item = {
        "genome_assembly": "GRCh38",
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/genomic_region', item).json['@graph'][0]


@pytest.fixture
def genomic_region_w_chrloc(testapp, lab, award):
    item = {
        "genome_assembly": "GRCh38",
        "chromosome": "X",
        "start_coordinate": 1,
        "end_coordinate": 3,
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/genomic_region', item).json['@graph'][0]


@pytest.fixture
def genomic_region_w_onlyendloc(testapp, lab, award):
    item = {
        "genome_assembly": "assembly",
        "end_coordinate": 3,
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/genomic_region', item).json['@graph'][0]


@pytest.fixture
def genomic_regions(genomic_region_w_onlyendloc, genomic_region_w_chrloc, basic_genomic_region, lab, award):
    return {'genomic_region_w_onlyendloc': genomic_region_w_onlyendloc,
            'genomic_region_w_chrloc': genomic_region_w_chrloc,
            'basic_genomic_region': basic_genomic_region,
            'award': award['@id'],
            'lab': lab['@id']
            }
