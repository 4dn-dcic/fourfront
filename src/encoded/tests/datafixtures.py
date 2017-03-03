import pytest


@pytest.fixture
def lab(testapp, award):
    item = {
        'name': 'encode-lab',
        'title': 'ENCODE lab',
        'status': 'current',
        'awards':[award['@id']]
    }
    return testapp.post_json('/lab', item).json['@graph'][0]

@pytest.fixture
def admin(testapp):
    item = {
        'first_name': 'Test',
        'last_name': 'Admin',
        'email': 'admin@example.org',
        'groups': ['admin'],
        'status': 'current'
    }
    # User @@object view has keys omitted.
    res = testapp.post_json('/user', item)
    return testapp.get(res.location).json


@pytest.fixture
def submitter(testapp, lab, award):
    item = {
        'first_name': 'ENCODE',
        'last_name': 'Submitter',
        'email': 'encode_submitter@example.org',
        'submits_for': [lab['@id']],
        'viewing_groups': [award['viewing_group']],
        'status': "current"
    }
    # User @@object view has keys omitted.
    res = testapp.post_json('/user', item)
    return testapp.get(res.location).json


@pytest.fixture
def access_key(testapp, submitter):
    description = 'My programmatic key'
    item = {
        'user': submitter['@id'],
        'description': description,
    }
    res = testapp.post_json('/access_key', item)
    result = res.json['@graph'][0].copy()
    result['secret_access_key'] = res.json['secret_access_key']
    return result


@pytest.fixture
def award(testapp):
    item = {
        'name': 'encode3-award',
        'description': 'ENCODE test award',
        'viewing_group': '4DN',
    }
    return testapp.post_json('/award', item).json['@graph'][0]


@pytest.fixture
def human_individual(testapp, award, lab, human):
    item = {
        "accession": "4DNIN000AAQ1",
        "age": 53,
        "age_units": "year",
        'award': award['@id'],
        'lab': lab['@id'],
        'organism': human['@id'],
        "ethnicity": "Caucasian",
        "health_status": "unknown",
        "life_stage": "adult",
        "sex": "female",
        "status": "released",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        # "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5"
    }
    return testapp.post_json('/individual_human', item).json['@graph'][0]


@pytest.fixture
def worthington_biochemical(testapp, award, lab):
    item = {
        "title": "Worthington Biochemical",
        "name": "worthington-biochemical",
        "description": "",
        "url": "http://www.worthington-biochem.com",
        'award': award['@id'],
        'lab': lab['@id'],
        'status': 'current'
    }
    return testapp.post_json('/vendor', item).json['@graph'][0]


@pytest.fixture
def mboI(testapp, worthington_biochemical, lab, award):
    item = {
        "name": "MboI",
        "enzyme_source": worthington_biochemical['@id'],
        'status': 'current',
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/enzyme', item).json['@graph'][0]


@pytest.fixture
def lung_biosource(testapp, lab, award):
    item = {
        "biosource_type": "tissue",
        "tissue": "lung",
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def tissue_biosample(testapp, lung_biosource, lab, award):
    item = {
        'description': "Tissue Biosample",
        'biosource': [lung_biosource['@id']],
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


@pytest.fixture
def protocol(testapp, lab, award):
    item = {'description': 'A Protocol',
            'award': award['@id'],
            'lab': lab['@id']
            }
    return testapp.post_json('/protocol', item).json['@graph'][0]


@pytest.fixture
def F123_biosource(testapp, lab, award):
    item = {
        "accession": "4DNSR000AAQ2",
        "biosource_type": "stem cell",
        "cell_line": "F123-CASTx129",
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def human_biosource(testapp, human_individual, worthington_biochemical, lab, award):
    item = {
        "description": "GM12878 cells",
        "biosource_type": "immortalized cell line",
        "individual": human_individual['@id'],
        "cell_line": "GM12878",
        "biosource_vendor": worthington_biochemical['@id'],
        "status": "current",
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def human_data():
    return {
            'uuid': '7745b647-ff15-4ff3-9ced-b897d4e2983c',
            'name': 'human',
            'scientific_name': 'Homo sapiens',
            'taxon_id': '9606',
           }


@pytest.fixture
def human(testapp, human_data):
    return testapp.post_json('/organism', human_data).json['@graph'][0]


@pytest.fixture
def mouse(testapp):
    item = {
        'uuid': '3413218c-3d86-498b-a0a2-9a406638e786',
        'name': 'mouse',
        'scientific_name': 'Mus musculus',
        'taxon_id': '10090',
    }
    return testapp.post_json('/organism', item).json['@graph'][0]


@pytest.fixture
def organism(human):
    return human


@pytest.fixture
def experiment_set(testapp, lab, award):
    item = {
        'lab': lab['@id'],
        'award': award['@id'],
        'experimentset_type': 'replicates',
        'status': 'in review by lab'
    }
    return testapp.post_json('/experiment_set', item).json['@graph'][0]


# fixtures for testing calculated experiment_sets property in experiment_set
# and also for _update method of experiment_set_replicate (and experiment_set)
@pytest.fixture
def experiment(testapp, experiment_data):
    return testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]


@pytest.fixture
def experiment_data(lab, award, human_biosample):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'micro-C',
        'status': 'in review by lab'
    }


@pytest.fixture
def experiment_project_review(testapp, lab, award, human_biosample):
    item = {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'micro-C',
        'status': 'in review by project'
    }
    return testapp.post_json('/experiment_hi_c', item).json['@graph'][0]


@pytest.fixture
def base_experiment(testapp, experiment_data):
    return testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]


@pytest.fixture
def file(testapp, lab, award):
    item = {
        'file_format': 'fastq',
        'md5sum': 'd41d8cd98f00b204e9800998ecf8427e',
        'lab': lab['@id'],
        'award': award['@id'],
        'status': 'uploaded',  # avoid s3 upload codepath
    }
    return testapp.post_json('/file_fastq', item).json['@graph'][0]


@pytest.fixture
def file_fastq(testapp, lab, award):
    item = {
        'file_format': 'fastq',
        'md5sum': 'd41d8cd9f00b204e9800998ecf8427e',
        'lab': lab['@id'],
        'award': award['@id'],
        'status': 'uploaded',  # avoid s3 upload codepath
    }
    return testapp.post_json('/file_fastq', item).json['@graph'][0]


@pytest.fixture
def file_fasta(testapp, lab, award):
    item = {
        'file_format': 'fasta',
        'md5sum': 'c41d8cd9f00b204e9800998ecf8427e',
        'lab': lab['@id'],
        'award': award['@id'],
        'status': 'uploaded',  # avoid s3 upload codepath
    }
    return testapp.post_json('/file_fasta', item).json['@graph'][0]


RED_DOT = """data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA
AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO
9TXL0Y4OHwAAAABJRU5ErkJggg=="""


@pytest.fixture
def attachment():
    return {'download': 'red-dot.png', 'href': RED_DOT}


@pytest.fixture
def image(testapp, attachment, lab, award):
    item = {
        'attachment': attachment,
        'caption': 'Test image',
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/image', item).json['@graph'][0]


@pytest.fixture
def rnai(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'rnai_sequence': 'TATATGGGGAA',
        'rnai_type': 'shRNA',
    }
    return testapp.post_json('/treatment_rnai', item).json['@graph'][0]


@pytest.fixture
def construct(testapp, lab, award):
    item = {
        'name': 'Awesome_Construct',
        'construct_type': 'tagging construct',
        'tags': 'eGFP, C-terminal',
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/construct', item).json['@graph'][0]


@pytest.fixture
def publication(testapp, lab, award):
    item = {
        'uuid': '8312fc0c-b241-4cb2-9b01-1438910550ad',
        'award': award['@id'],
        'lab': lab['@id'],
        'ID': "PMID:22955616",
    }
    return testapp.post_json('/publication', item).json['@graph'][0]


@pytest.fixture
def publication_tracking(testapp, lab, award):
    item = {
        'uuid': '8312fc0c-b241-4cb2-9b01-1438910550ac',
        'award': award['@id'],
        'lab': lab['@id'],
        'PMID': "PMID:12345678",
    }
    return testapp.post_json('/publication_tracking', item).json['@graph'][0]


@pytest.fixture
def software(testapp, lab, award):
    # TODO: ASK_ANDY do we want software_type to be an array?
    item = {
        "name": "FastQC",
        "software_type": ["indexer", ],
        "version": "1",
        'lab': lab['@id'],
        'award': award['@id']
    }
    return testapp.post_json('/software', item).json['@graph'][0]


@pytest.fixture
def analysis_step(testapp, software, lab, award):
    item = {
        'name': 'fastqc',
        "software_used": software['@id'],
        "version": "1",
        'lab': lab['@id'],
        'award': award['@id']
    }
    return testapp.post_json('/analysis_step', item).json['@graph'][0]


@pytest.fixture
def document(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'document_type': 'growth protocol',
    }
    return testapp.post_json('/document', item).json['@graph'][0]


@pytest.fixture
def workflow_run_sbg(testapp, lab, award, workflow_bam):
    item = {'run_platform': 'SBG',
            'parameters': [],
            'workflow':  workflow_bam['@id'],
            'title': u'md5 run 2017-01-20 13:16:11.026176',
            'sbg_import_ids': [u'TBCKPdzfUE9DpvtzO6yb9yoIvO81RaZd'],
            'award': award['@id'],
            'sbg_task_id': '1235',
            'lab': lab['@id'],
            'sbg_mounted_volume_ids': ['4dn_s32gkz1s7x','4dn_s33xkquabu'],
            'run_status': 'started',
           }
    return testapp.post_json('/workflow_run_sbg', item).json['@graph'][0]

@pytest.fixture
def human_biosample(testapp, human_biosource, lab, award):
    item = {
        "description": "GM12878 prepared for Hi-C",
        "biosource": [human_biosource['@id'], ],
        "status": "in review by lab",
        'award': award['@id'],
        'lab': lab['@id']
        # "biosample_protocols": ["131106bc-8535-4448-903e-854af460b212"],
        # "modifications": ["431106bc-8535-4448-903e-854af460b254"],
        # "treatments": ["686b362f-4eb6-4a9c-8173-3ab267307e3b"]
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


@pytest.fixture
def software_bam(testapp, lab, award):
    # TODO: ASK_ANDY do we want software_type to be an array?
    item = {
        "name": "Aligner",
        "software_type": ["indexer", ],
        "version": "1",
        'lab': lab['@id'],
        'award': award['@id']
    }
    return testapp.post_json('/software', item).json['@graph'][0]


@pytest.fixture
def workflow_bam(testapp, lab, award):
    item = {
        'title': "test workflow",
        'name': "test_workflow",
        'workflow_type': "Hi-C data analysis",
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/workflow', item).json['@graph'][0]


@pytest.fixture
def workflow_mapping(testapp, workflow_bam, lab, award):
    item = {
        "name": "test mapping",
        "workflow_name": "test workflow name",
        "workflow": workflow_bam['@id'],
        "data_input_type": "experiment",
        'lab': lab['@id'],
        'award': award['@id'],
        "workflow_parameters": [
            {"parameter": "bowtie_index", "value": "some value"}
        ],
        "experiment_parameters": [
            {"parameter": "biosample.biosource.individual.organism", "value": "mouse"}
        ],
        "workflow_parameters": [
            {"parameter": "genome_version", "value": "mm9"}
        ]
    }
    return testapp.post_json('/workflow_mapping', item).json['@graph'][0]
