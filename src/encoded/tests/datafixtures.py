import pytest


@pytest.fixture
def lab(testapp):
    item = {
        'name': 'encode-lab',
        'title': 'ENCODE lab',
        'status': 'current'
    }
    return testapp.post_json('/lab', item).json['@graph'][0]


@pytest.fixture
def remc_lab(testapp):
    item = {
        'name': 'remc-lab',
        'title': 'REMC lab',
        'status': 'current'
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
def wrangler(testapp):
    item = {
        'first_name': 'Wrangler',
        'last_name': 'Admin',
        'email': 'wrangler@example.org',
        'groups': ['admin'],
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
def lab_viewer(testapp, lab, award):
    item = {
        'first_name': 'ENCODE',
        'last_name': 'lab viewer',
        'email': 'encode_viewer@example.org',
        'lab': lab['name'],
        'status': 'current',
        'viewing_groups': [award['viewing_group']]
    }
    # User @@object view has keys omitted.
    res = testapp.post_json('/user', item)
    return testapp.get(res.location).json


@pytest.fixture
def remc_submitter(testapp, remc_lab, remc_award):
    item = {
        'first_name': 'REMC',
        'last_name': 'Submitter',
        'email': 'remc_submitter@example.org',
        'submits_for': [remc_lab['@id']],
        'viewing_groups': [remc_award['viewing_group']],
        'status': 'current'
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
def viewing_group_member(testapp, award):
    item = {
        'first_name': 'Viewing',
        'last_name': 'Group',
        'email': 'viewing_group_member@example.org',
        'viewing_groups': [award['viewing_group']],
        'status': 'current'
    }
    # User @@object view has keys omitted.
    res = testapp.post_json('/user', item)
    return testapp.get(res.location).json


@pytest.fixture
def award(testapp):
    item = {
        'name': 'encode3-award',
        'description': 'ENCODE test award',
        'viewing_group': '4DN',
    }
    return testapp.post_json('/award', item).json['@graph'][0]


@pytest.fixture
def remc_award(testapp):
    item = {
        'name': 'remc-award',
        'description': 'REMC test award',
        'viewing_group': 'Not 4DN',
    }
    return testapp.post_json('/award', item).json['@graph'][0]


@pytest.fixture
def encode2_award(testapp):
    item = {
        # upgrade/shared.py ENCODE2_AWARDS
        'uuid': '1a4d6443-8e29-4b4a-99dd-f93e72d42418',
        'name': 'encode2-award',
        'rfa': 'ENCODE2',
        'project': 'ENCODE',
        'viewing_group': 'ENCODE',
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
        'status': 'current'
    }
    return testapp.post_json('/vendor', item).json['@graph'][0]


@pytest.fixture
def human_biosource(testapp, human_individual, worthington_biochemical):
    item = {
        "description": "GM06990 cells",
        "biosource_type": "immortalized cell line",
        "individual": human_individual['@id'],
        "cell_line": "GM06990",
        "biosource_vendor": worthington_biochemical['@id'],
        "status": "current"
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def human(testapp):
    item = {
        'uuid': '7745b647-ff15-4ff3-9ced-b897d4e2983c',
        'name': 'human',
        'scientific_name': 'Homo sapiens',
        'taxon_id': '9606',
    }
    return testapp.post_json('/organism', item).json['@graph'][0]


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
def experiment(testapp, lab, award, human_biosample):
    item = {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'micro-C'
    }
    return testapp.post_json('/experiment_hic', item).json['@graph'][0]


@pytest.fixture
def experiment_project_review(testapp, lab, award, human_biosample):
    item = {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'micro-C',
        'status': 'in review by project'
    }
    return testapp.post_json('/experiment_hic', item).json['@graph'][0]


@pytest.fixture
def base_experiment(testapp, lab, award, human_biosample):
    item = {
        'award': award['uuid'],
        'lab': lab['uuid'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'micro-C',
        'status': 'in review by lab'
    }
    return testapp.post_json('/experiment_hic', item, status=201).json['@graph'][0]


@pytest.fixture
def file(testapp, lab, award, experiment):
    item = {
        'experiments': [experiment['@id'], ],
        'file_format': 'fastq',
        'md5sum': 'd41d8cd98f00b204e9800998ecf8427e',
        'lab': lab['@id'],
        'award': award['@id'],
        'status': 'uploaded',  # avoid s3 upload codepath
    }
    return testapp.post_json('/file_fastq', item).json['@graph'][0]


@pytest.fixture
def file_fastq(testapp, lab, award, experiment):
    item = {
        'experiments': [experiment['@id'], ],
        'file_format': 'fastq',
        'md5sum': 'd41d8cd9f00b204e9800998ecf8427e',
        'lab': lab['@id'],
        'award': award['@id'],
        'status': 'uploaded',  # avoid s3 upload codepath
    }
    return testapp.post_json('/file_fastq', item).json['@graph'][0]


@pytest.fixture
def file_fasta(testapp, lab, award, experiment):
    item = {
        'experiments': [experiment['@id'], ],
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
def rnai(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'rnai_sequence': 'TATATGGGGAA',
        'rnai_type': 'shRNA',
    }
    return testapp.post_json('/treatment_rnai', item).json['@graph'][0]


@pytest.fixture
def construct(testapp):
    item = {
        'name': 'Awesome_Construct',
        'construct_type': 'tagging construct',
        'tags': 'eGFP, C-terminal',
    }
    return testapp.post_json('/construct', item).json['@graph'][0]


@pytest.fixture
def publication(testapp, lab, award):
    item = {
        'uuid': '8312fc0c-b241-4cb2-9b01-1438910550ad',
        'title': "Test publication",
        'award': award['@id'],
        'lab': lab['@id'],
        'identifiers': ["doi:10.1214/11-AOAS466"],
    }
    return testapp.post_json('/publication', item).json['@graph'][0]


@pytest.fixture
def software(testapp):
    # TODO: ASK_ANDY do we want software_type to be an array?
    item = {
        "name": "FastQC",
        "software_type": ["indexer", ],
        "version": "1.0",
    }
    return testapp.post_json('/software', item).json['@graph'][0]


@pytest.fixture
def analysis_step(testapp, software):
    item = {
        'name': 'fastqc',
        "software_used": software['@id'],
        "version": 1
    }
    return testapp.post_json('/analysis_step', item).json['@graph'][0]


@pytest.fixture
def task(testapp, analysis_step):
    item = {
        'analysis_step': analysis_step['@id'],
        'job_status': 'finished',
    }
    return testapp.post_json('/task', item).json['@graph'][0]


@pytest.fixture
def document(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'document_type': 'growth protocol',
    }
    return testapp.post_json('/document', item).json['@graph'][0]


@pytest.fixture
def human_biosample(testapp, human_biosource):
    item = {
        "description": "GM06990 prepared for Hi-C",
        "biosource": [human_biosource['@id'], ],
        # "biosample_protocols": ["131106bc-8535-4448-903e-854af460b212"],
        # "modifications": ["431106bc-8535-4448-903e-854af460b254"],
        # "treatments": ["686b362f-4eb6-4a9c-8173-3ab267307e3b"]
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


@pytest.fixture
def workflow_mapping(testapp, workflow_bam):
    item = {
        "name": "test mapping",
        "workflow_name": "test workflow name",
        "workflow": workflow_bam['@id'],
        "data_input_type": "experiment",
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


@pytest.fixture
def biosample_1(testapp, human_biosource):
    item = {
        'description': "GM06990 prepared for Hi-C",
        'biosource': [human_biosource['@id'], ],
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


@pytest.fixture
def biosample_2(testapp, human_biosource):
    item = {
        'description': "GM06990 prepared for Hi-C",
        'biosource': [human_biosource['@id'], ],
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


@pytest.fixture
def donor_1(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/individual_human', item, status=201).json['@graph'][0]


@pytest.fixture
def donor_2(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/individual_human', item, status=201).json['@graph'][0]


@pytest.fixture
def analysis_step_bam(testapp, software):
    item = {
        'name': 'bamqc',
        'software_used': analysis_step['@id'],
        "version": "1.0"
    }
    return testapp.post_json('/analysis_step', item).json['@graph'][0]


@pytest.fixture
def task_bam(testapp, analysis_step_bam):
    item = {
        'analysis_step': analysis_step_bam['@id'],
        'status': 'finished',
        'aliases': ['modern:chip-seq-bwa-alignment-step-run-v-1-virtual']
    }
    return testapp.post_json('/task', item).json['@graph'][0]


@pytest.fixture
def workflow_bam(testapp, lab, award, analysis_step_bam):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'name': "Histone ChIP-seq",
        'analysis_steps': [analysis_step_bam['@id']]
    }
    return testapp.post_json('/workflow', item).json['@graph'][0]


@pytest.fixture
def encode_lab(testapp):
    item = {
        'name': 'encode-processing-pipeline',
        'title': 'ENCODE Processing Pipeline',
        'status': 'current'
        }
    return testapp.post_json('/lab', item, status=201).json['@graph'][0]
