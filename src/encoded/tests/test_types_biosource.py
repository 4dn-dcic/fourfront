import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def other_mod(testapp, lab, award):
    data = {
        "lab": lab['@id'],
        "award": award['@id'],
        "modification_type": "Stable Transfection",
        "description": "second modification"
    }
    return testapp.post_json('/modification', data).json['@graph'][0]


@pytest.fixture
def GM12878_mod_biosource(testapp, lab, award, gm12878_oterm, basic_modification):
    item = {
        "accession": "4DNSROOOAAC1",
        "biosource_type": "primary cell line",
        "cell_line": gm12878_oterm['@id'],
        'award': award['@id'],
        'lab': lab['@id'],
        'modifications': [basic_modification['@id']]
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def GM12878_twomod_biosource(testapp, lab, award, gm12878_oterm, basic_modification, other_mod):
    item = {
        "accession": "4DNSROOOAAC2",
        "biosource_type": "primary cell line",
        "cell_line": gm12878_oterm['@id'],
        'award': award['@id'],
        'lab': lab['@id'],
        'modifications': [basic_modification['@id'], other_mod['@id']]
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def cell_lines(GM12878_biosource, F123_biosource, GM12878_mod_biosource, GM12878_twomod_biosource):
    return [F123_biosource, GM12878_biosource, GM12878_mod_biosource, GM12878_twomod_biosource]


@pytest.fixture
def whole_biosource(testapp, human_individual, lab, award):
    item = {
        "biosource_type": "multicellular organism",
        "individual": human_individual['@id'],
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def biosources(cell_lines, lung_biosource, whole_biosource):
    bs = cell_lines
    bs.extend([lung_biosource, whole_biosource])
    return bs


@pytest.fixture
def human_biosource_data(testapp, lab, award, human_individual):
    return {
        'award': award['@id'],
        'lab': lab['@id'],
        'individual': human_individual['@id']
    }


@pytest.fixture
def mouse_SC_biosrc(testapp, human_biosource_data, mouse_individual):
    mouse_SC_biosrc_data = human_biosource_data.copy()
    mouse_SC_biosrc_data['biosource_type'] = 'stem cell derived cell line'
    mouse_SC_biosrc_data['individual'] = mouse_individual['@id']
    return testapp.post_json('/biosource', mouse_SC_biosrc_data).json['@graph'][0]


@pytest.fixture
def primary_cell_biosource(testapp, human_biosource_data):
    pc_biosrc_data = human_biosource_data.copy()
    pc_biosrc_data['biosource_type'] = 'primary cell'
    return testapp.post_json('/biosource', pc_biosrc_data).json['@graph'][0]


@pytest.fixture
def hum_SC_biosrc(testapp, human_biosource_data):
    hum_SC_biosrc_data = human_biosource_data.copy()
    hum_SC_biosrc_data['biosource_type'] = 'stem cell derived cell line'
    return testapp.post_json('/biosource', hum_SC_biosrc_data).json['@graph'][0]


@pytest.fixture
def thous_genomes_biosources(testapp, human_biosource_data, thousandgen_oterms, b_lymphocyte_oterm):
    bsources = []
    human_biosource_data['tissue'] = b_lymphocyte_oterm['@id']
    human_biosource_data['biosource_type'] = 'immortalized cell line'
    for ot in thousandgen_oterms:
        bs_data = human_biosource_data.copy()
        bs_data['cell_line'] = ot['@id']
        bsources.append(testapp.post_json('/biosource', bs_data).json['@graph'][0])
    return bsources


def test_calculated_biosource_category_multicellular(lung_biosource, whole_biosource):
    assert 'Multicellular Tissue' in lung_biosource.get('biosource_category')
    assert 'Multicellular Tissue' in whole_biosource.get('biosource_category')


def test_calculated_biosource_category_primary_cell(primary_cell_biosource):
    assert 'Primary Cells' in primary_cell_biosource.get('biosource_category')


def test_calculated_biosource_category_1000_gen(thous_genomes_biosources, GM12878_biosource):
    assert 'GM12878' in GM12878_biosource.get('biosource_category')
    thous_genomes_biosources.append(GM12878_biosource)
    for bs in thous_genomes_biosources:
        assert '1000 genomes/Hap Map' in bs.get('biosource_category')


def test_calculated_biosource_category_tiers(cell_lines):
    bs1 = cell_lines.pop(0)
    assert 'Tier 2' in bs1.get('biosource_category')
    for bs in cell_lines:
        assert 'GM12878' in bs.get('biosource_category')


def test_calculated_biosource_category_stem_cells(mouse_SC_biosrc, hum_SC_biosrc):
    assert 'Human stem cell' in hum_SC_biosrc.get('biosource_category')
    assert 'Mouse stem cell' not in hum_SC_biosrc.get('biosource_category')
    assert 'Mouse stem cell' in mouse_SC_biosrc.get('biosource_category')
    assert 'Human stem cell' not in mouse_SC_biosrc.get('biosource_category')


def test_calculated_biosource_name(testapp, biosources, mod_w_change_and_target):
    for biosource in biosources:
        biotype = biosource['biosource_type']
        name = biosource['biosource_name']
        if biotype == 'immortalized cell line':
            assert name == 'GM12878'
        elif biotype == 'stem cell':
            assert name == 'F123-CASTx129'
        elif biotype == 'primary cell line' and biosource['accession'] == "4DNSROOOAAC1":
            # import pdb; pdb.set_trace()
            # used not real type here to test modification addition to name
            assert name == 'GM12878 with Crispr'
            res = testapp.patch_json(biosource['@id'], {'modifications': [mod_w_change_and_target['@id']]})
            assert res.json['@graph'][0]['biosource_name'] == 'GM12878 with RAD21 deletion'
        elif biotype == 'primary cell line' and biosource['accession'] == "4DNSROOOAAC2":
            assert name == 'GM12878 with Crispr, Stable Transfection'
        elif biotype == 'tissue':
            assert name == 'lung'
        elif biotype == 'multicellular organism':
            assert name == 'whole human'


def test_validate_biosource_tissue_no_tissue(testapp, award, lab, gm12878_oterm):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'immortalized cell line',
                 'cell_line': 'GM12878'}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')


def test_validate_biosource_tissue_invalid(testapp, award, lab, lung_oterm, ontology):
    testapp.patch_json(lung_oterm['@id'], {'source_ontologies': [ontology['@id']]}, status=200)
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'tissue',
                 'tissue': lung_oterm['@id']}
    res = testapp.post_json('/biosource', biosource, status=422)
    errors = res.json['errors']
    assert 'not found in UBERON' in errors[0]['description']


def test_validate_biosource_tissue_valid_atid(testapp, award, lab, lung_oterm):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'tissue',
                 'tissue': lung_oterm['@id']}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')


def test_validate_biosource_tissue_valid_uuid(testapp, award, lab, lung_oterm):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'tissue',
                 'tissue': lung_oterm['uuid']}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')


def test_validate_biosource_tissue_on_valid_patch(testapp, award, lab, lung_oterm):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'tissue',
                 'tissue': lung_oterm['uuid']}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')
    new_oterm = {'term_name': 'finger',
                 'term_id': 'UBERON:0000009',
                 'source_ontologies': lung_oterm['source_ontologies']}
    ot = testapp.post_json('/ontology_term', new_oterm, status=201)
    pid = '/' + res.json['@graph'][0].get('uuid')
    res2 = testapp.patch_json(pid, {'tissue': ot.json['@graph'][0]['uuid']})
    assert not res2.json.get('errors')


def test_validate_biosource_tissue_on_invalid_patch(testapp, award, lab, lung_oterm, ontology):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'tissue',
                 'tissue': lung_oterm['uuid']}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')
    new_oterm = {'term_name': 'finger',
                 'term_id': 'UBERON:0000009',
                 'source_ontologies': [ontology['uuid']]}
    ot = testapp.post_json('/ontology_term', new_oterm, status=201)
    pid = '/' + res.json['@graph'][0].get('uuid')
    res2 = testapp.patch_json(pid, {'tissue': ot.json['@graph'][0]['uuid']}, status=422)
    errors = res2.json['errors']
    assert 'not found in UBERON' in errors[0]['description']


def test_validate_biosource_cell_line_no_cell_line(testapp, award, lab):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'tissue'
                 }
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')


def test_validate_biosource_cell_line_invalid_ont(testapp, award, lab, gm12878_oterm, lung_oterm):
    testapp.patch_json(gm12878_oterm['@id'], {'slim_terms': [lung_oterm['@id']]}, status=200)
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'immortalized cell line',
                 'cell_line': gm12878_oterm['@id']}
    res = testapp.post_json('/biosource', biosource, status=422)
    errors = res.json['errors']
    assert errors[0]['name'] == 'Biosource: invalid cell_line term'
    assert 'not a known valid cell line' in errors[0]['description']


def test_validate_biosource_cell_line_valid_atid(testapp, award, lab, gm12878_oterm):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'immortalized cell line',
                 'cell_line': gm12878_oterm['@id']}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')


def test_validate_biosource_cell_line_valid_uuid(testapp, award, lab, gm12878_oterm):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'immortalized cell line',
                 'cell_line': gm12878_oterm['uuid']}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')


def test_validate_biosource_cell_line_on_valid_patch(testapp, award, lab, gm12878_oterm):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'immortalized cell line',
                 'cell_line': gm12878_oterm['uuid']}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')
    new_oterm = {'term_name': 'bigcell',
                 'term_id': 'test:1',
                 'source_ontologies': gm12878_oterm['source_ontologies'],
                 'slim_terms': gm12878_oterm['slim_terms']}
    ot = testapp.post_json('/ontology_term', new_oterm, status=201)
    pid = '/' + res.json['@graph'][0].get('uuid')
    res2 = testapp.patch_json(pid, {'cell_line': ot.json['@graph'][0]['uuid']})
    assert not res2.json.get('errors')


def test_validate_biosource_cell_line_on_invalid_patch(testapp, award, lab, gm12878_oterm):
    biosource = {'award': award['@id'],
                 'lab': lab['@id'],
                 'biosource_type': 'immortalized cell line',
                 'cell_line': gm12878_oterm['uuid']}
    res = testapp.post_json('/biosource', biosource, status=201)
    assert not res.json.get('errors')
    new_oterm = {'term_name': 'bigcell',
                 'term_id': 'test:1',
                 'source_ontologies': gm12878_oterm['source_ontologies']}
    ot = testapp.post_json('/ontology_term', new_oterm, status=201)
    pid = '/' + res.json['@graph'][0].get('uuid')
    res2 = testapp.patch_json(pid, {'cell_line': ot.json['@graph'][0]['uuid']}, status=422)
    errors = res2.json['errors']
    assert errors[0]['name'] == 'Biosource: invalid cell_line term'
    assert 'not a known valid cell line' in errors[0]['description']
