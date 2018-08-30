import pytest
import copy


@pytest.fixture
def wrangler_testapp(wrangler, app, external_tx, zsa_savepoints):
    return remote_user_testapp(app, wrangler['uuid'])


@pytest.fixture
def submitter_testapp(submitter, app, external_tx, zsa_savepoints):
    return remote_user_testapp(app, submitter['uuid'])


@pytest.fixture
def lab(testapp, award):
    item = {
        'name': 'encode-lab',
        'title': 'ENCODE lab',
        'status': 'current',
        'awards': [award['@id']]
    }
    return testapp.post_json('/lab', item).json['@graph'][0]


@pytest.fixture
def another_lab(testapp, award):
    item = {
        'name': 'another-encode-lab',
        'title': 'Another ENCODE lab',
        'status': 'current',
        'awards': [award['@id']]
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
        'project': '4DN'
    }
    return testapp.post_json('/award', item).json['@graph'][0]


@pytest.fixture
def human_individual(testapp, award, lab, human):
    item = {
        "accession": "4DNINOOOAAQ1",
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
def lung_biosource(testapp, lab, award, lung_oterm):
    item = {
        "biosource_type": "tissue",
        'tissue': lung_oterm['@id'],
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def tissue_biosample(testapp, lung_biosource, lab, award):
    item = {
        'description': "Tissue Biosample",
        'biosource': [lung_biosource['uuid']],
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


@pytest.fixture
def protocol(testapp, lab, award):
    item = {'description': 'A Protocol',
            'protocol_type': 'Experimental protocol',
            'award': award['@id'],
            'lab': lab['@id']
            }
    return testapp.post_json('/protocol', item).json['@graph'][0]


@pytest.fixture
def cell_line_term(testapp, ontology):
    item = {
        "is_slim_for": "cell",
        "namespace": "http://www.ebi.ac.uk/efo",
        "term_id": "EFO:0000322",
        "term_name": "cell line",
        "uuid": "111189bc-8535-4448-903e-854af460a233",
        "source_ontology": ontology['@id'],
        "term_url": "http://www.ebi.ac.uk/efo/EFO_0000322"
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def f123_oterm(testapp, ontology, cell_line_term):
    item = {
        "uuid": "530036bc-8535-4448-903e-854af460b254",
        "term_name": "F123-CASTx129",
        "term_id": "EFO:0000008",
        "source_ontology": ontology['@id'],
        "slim_terms": [cell_line_term['@id']]
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def gm12878_oterm(testapp, ontology, cell_line_term):
    item = {
        "uuid": "530056bc-8535-4448-903e-854af460b111",
        "term_name": "GM12878",
        "term_id": "EFO:0000009",
        "source_ontology": ontology['@id'],
        "slim_terms": [cell_line_term['@id']]
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def F123_biosource(testapp, lab, award, f123_oterm):
    item = {
        "accession": "4DNSROOOAAQ2",
        "biosource_type": "stem cell",
        "cell_line": f123_oterm['@id'],
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def GM12878_biosource(testapp, lab, award, gm12878_oterm):
    item = {
        "accession": "4DNSROOOAAQ1",
        "biosource_type": "immortalized cell line",
        "cell_line": gm12878_oterm['@id'],
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def tier1_biosource(testapp, protocol, lab, award, gm12878_oterm):
    item = {
        'description': 'Tier 1 cell line Biosource',
        'biosource_type': 'immortalized cell line',
        'cell_line': gm12878_oterm['@id'],
        'SOP_cell_line': protocol['@id'],
        'cell_line_tier': 'Tier 1',
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def human_biosource(testapp, human_individual, worthington_biochemical, gm12878_oterm, lab, award):
    item = {
        "description": "GM12878 cells",
        "biosource_type": "immortalized cell line",
        "individual": human_individual['@id'],
        "cell_line": gm12878_oterm['@id'],
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
def experiment_data(lab, award, human_biosample, mboI, experiment_type_hic):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': experiment_type_hic['@id'],
        'digestion_enzyme': mboI['@id'],
        'status': 'in review by lab'
    }


@pytest.fixture
def experiment_type_hic(testapp, lab, award):
    data = {
        'lab': lab['@id'],
        'award': award['@id'],
        'title': 'In situ Hi-C',
        'status': 'released'
    }
    return testapp.post_json('/experiment_type', data).json['@graph'][0]

@pytest.fixture
def experiment_project_release(testapp, lab, award, human_biosample):
    item = {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'micro-C',
        'status': 'released to project'
    }
    return testapp.post_json('/experiment_hi_c', item).json['@graph'][0]


@pytest.fixture
def base_experiment(testapp, experiment_data):
    return testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]


#@pytest.fixture
#def experiment_data(lab, award, human_biosample, mboI):
#    return {
#        'lab': lab['@id'],
#        'award': award['@id'],
#        'biosample': human_biosample['@id'],
#        'experiment_type': 'micro-C',
#        'digestion_enzyme': mboI['@id']
#    }


@pytest.fixture
def experiments(testapp, experiment_data):
    expts = []
    for i in range(4):
        experiment_data['description'] = 'Experiment ' + str(i)
        expts.append(testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0])
    return expts


@pytest.fixture
def rep_set_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'Test replicate set',
    }


@pytest.fixture
def empty_replicate_set(testapp, rep_set_data):
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


@pytest.fixture
def two_experiment_replicate_set(testapp, rep_set_data, experiments):
    rep_set_data['description'] = 'Two one BioRep Experiment Replicate Set'
    rep_set_data['replicate_exps'] = [
        {'replicate_exp': experiments[0]['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 1},
        {'replicate_exp': experiments[1]['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 2}
    ]
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


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
        'target_sequence': 'TATATGGGGAA',
        'rnai_type': 'shRNA',
    }
    return testapp.post_json('/treatment_rnai', item).json['@graph'][0]


@pytest.fixture
def construct(testapp, lab, award):
    item = {
        'name': 'Awesome_Construct',
        'construct_type': 'tagging construct',
        'protein_tags': ['eGFP, C-terminal'],
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
        'lab': lab['@id']
    }
    return testapp.post_json('/document', item).json['@graph'][0]


@pytest.fixture
def workflow_run_sbg(testapp, lab, award, workflow_bam):
    item = {'run_platform': 'SBG',
            'parameters': [],
            'workflow': workflow_bam['@id'],
            'title': u'md5 run 2017-01-20 13:16:11.026176',
            'sbg_import_ids': [u'TBCKPdzfUE9DpvtzO6yb9yoIvO81RaZd'],
            'award': award['@id'],
            'sbg_task_id': '1235',
            'lab': lab['@id'],
            'sbg_mounted_volume_ids': ['4dn_s32gkz1s7x', '4dn_s33xkquabu'],
            'run_status': 'started',
            }
    return testapp.post_json('/workflow_run_sbg', item).json['@graph'][0]


@pytest.fixture
def workflow_run_awsem(testapp, lab, award, workflow_bam):
    item = {'run_platform': 'AWSEM',
            'parameters': [],
            'workflow': workflow_bam['@id'],
            'title': u'md5 run 2017-01-20 13:16:11.026176',
            'award': award['@id'],
            'awsem_job_id': '1235',
            'lab': lab['@id'],
            'run_status': 'started',
            }
    return testapp.post_json('/workflow_run_awsem', item).json['@graph'][0]


@pytest.fixture
def workflow_run_json(testapp, lab, award, workflow_bam):
    return {'run_platform': 'SBG',
            'parameters': [],
            'workflow': workflow_bam['@id'],
            'title': u'md5 run 2017-01-20 13:16:11.026176',
            'sbg_import_ids': [u'TBCKPdzfUE9DpvtzO6yb9yoIvO81RaZd'],
            'award': award['@id'],
            'sbg_task_id': '1235',
            'lab': lab['@id'],
            'sbg_mounted_volume_ids': ['4dn_s32gkz1s7x', '4dn_s33xkquabu'],
            'run_status': 'started',
            }


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


@pytest.fixture
def basic_genomic_region(testapp, lab, award):
    item = {
        "genome_assembly": "GRCh38",
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/genomic_region', item).json['@graph'][0]


@pytest.fixture
def genome_info(lab, award):
    return {
        "genome_assembly": "GRCh38",
        "chromosome": "X",
        "start_coordinate": 1,
        "end_coordinate": 3,
        'award': award['@id'],
        'lab': lab['@id']
    }


@pytest.fixture
def genomic_region_w_chrloc(testapp, genome_info):
    return testapp.post_json('/genomic_region', genome_info).json['@graph'][0]


@pytest.fixture
def genomic_region_2(testapp, genome_info):
    genome_info['chromosome'] = '9'
    genome_info['start_coordinate'] = 50
    genome_info['start_coordinate'] = 300
    return testapp.post_json('/genomic_region', genome_info).json['@graph'][0]


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
        "targeted_genome_regions": [genomic_region_w_chrloc['@id']],
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/target', item).json['@graph'][0]


@pytest.fixture
def another_target_w_region(testapp, genomic_region_2, lab, award):
    item = {
        "targeted_genome_regions": [genomic_region_2['@id']],
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
def mod_basic_info(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'minimal modification',
        'modification_type': 'Crispr',
    }


@pytest.fixture
def basic_modification(testapp, mod_basic_info):
    return testapp.post_json('/modification', mod_basic_info).json['@graph'][0]


@pytest.fixture
def mod_w_genomic_change(testapp, mod_basic_info):
    mod = copy.deepcopy(mod_basic_info)
    mod['description'] = 'mod with genomic change'
    mod['genomic_change'] = "deletion"
    return testapp.post_json('/modification', mod).json['@graph'][0]


@pytest.fixture
def mod_w_target(testapp, mod_basic_info, target_w_genes):
    mod = copy.deepcopy(mod_basic_info)
    mod['description'] = 'mod with target'
    mod['target_of_mod'] = target_w_genes['@id']
    return testapp.post_json('/modification', mod).json['@graph'][0]


@pytest.fixture
def mod_w_change_and_target(testapp, mod_basic_info, target_w_genes):
    mod = copy.deepcopy(mod_basic_info)
    mod['description'] = 'mod with target and genomic change'
    mod['target_of_mod'] = target_w_genes['@id']
    mod['genomic_change'] = "deletion"
    return testapp.post_json('/modification', mod).json['@graph'][0]


@pytest.fixture
def uberon_ont(testapp):
    return testapp.post_json('/ontology', {'ontology_name': 'Uberon'}).json['@graph'][0]


@pytest.fixture
def ontology(testapp):
    data = {
        "uuid": "530006bc-8535-4448-903e-854af460b254",
        "ontology_name": "Experimental Factor Ontology",
        "ontology_url": "http://www.ebi.ac.uk/efo/",
        "download_url": "http://sourceforge.net/p/efo/code/HEAD/tree/trunk/src/efoinowl/InferredEFOOWLview/EFO_inferred.owl?format=raw",
        "namespace_url": "http://www.ebi.ac.uk/efo/",
        "ontology_prefix": "EFO",
        "description": "The description",
        "notes": "The download",
    }
    return testapp.post_json('/ontology', data).json['@graph'][0]


@pytest.fixture
def oterm(uberon_ont):
    return {
        "uuid": "530036bc-8535-4448-903e-854af460b222",
        "preferred_name": "preferred lung name",
        "term_name": "lung",
        "term_id": "UBERON:0002048",
        "term_url": "http://purl.obolibrary.org/obo/UBERON_0002048",
        "source_ontology": uberon_ont['@id']
    }


@pytest.fixture
def lung_oterm(oterm, testapp):
    return testapp.post_json('/ontology_term', oterm).json['@graph'][0]
