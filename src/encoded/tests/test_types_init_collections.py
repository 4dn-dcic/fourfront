import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


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


@pytest.fixture
def targets(target_w_desc, target_w_region, target_w_genes):
    return {'target_w_desc': target_w_desc,
            'target_w_region': target_w_region,
            'target_w_genes': target_w_genes
            }


def test_calculated_target_summaries(testapp, targets):
    for name in targets:
        summary = targets[name]['target_summary']
        if name == 'target_w_genes':
            assert summary == 'Gene:eeny,meeny'
        if name == 'target_w_regions' in targets:
            assert summary == 'GRCh38:X:1-3'
        if name == 'target_w_desc':
            assert summary == 'no target'


@pytest.fixture
def protocol_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'protocol_type': 'Experimental protocol',
        'description': 'Test Protocol'
    }


@pytest.fixture
def protocol_w_attach(testapp, protocol_data, attachment):
    protocol_data['attachment'] = attachment
    return testapp.post_json('/protocol', protocol_data).json['@graph'][0]


def test_protocol_display_title_w_attachment(testapp, protocol_w_attach):
    assert protocol_w_attach['display_title'] == 'red-dot.png'


def test_protocol_display_title_wo_attachment(testapp, protocol_data):
    from datetime import datetime
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert protocol['display_title'] == 'Experimental protocol from ' + str(datetime.now())[:10]


def test_protocol_other_display_title_wo_attachment(testapp, protocol_data):
    from datetime import datetime
    protocol_data['protocol_type'] = 'Other'
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert protocol['display_title'] == 'Protocol from ' + str(datetime.now())[:10]


@pytest.fixture
def vendor_data(lab, award):
    return {"title": "WorTHington Biochemical", 'lab': lab['@id'], 'award': award['@id']}


def test_vendor_update_name_no_caps(testapp, vendor_data):
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "worthington-biochemical"


def test_vendor_update_name_no_punctuation_or_space(testapp, vendor_data):
    vendor_data['title'] = "Eeny, = Meeny!  # -miny?"
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "eeny-meeny-miny"


def test_vendor_name_updates_on_patch(testapp, vendor_data):
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "worthington-biochemical"
    res = testapp.patch_json(res.json['@graph'][0]['@id'], {'title': 'WaHoo'}, status=200)
    assert res.json['@graph'][0]['name'] == "wahoo"


@pytest.fixture
def badge_data(lab, award):
    return {"title": "Test BaDGe Title", 'lab': lab['@id'], 'award': award['@id']}


def test_badge_update_name_no_caps(testapp, badge_data):
    res = testapp.post_json('/badge', badge_data, status=201)
    assert res.json['@graph'][0]['badge_name'] == "test-badge-title"


def test_badge_update_name_no_punctuation_or_space(testapp, badge_data):
    badge_data['title'] = "Test, = Badge!  # -title?"
    res = testapp.post_json('/badge', badge_data, status=201)
    assert res.json['@graph'][0]['badge_name'] == "test-badge-title"


def test_badge_name_updates_on_patch(testapp, badge_data):
    res1 = testapp.post_json('/badge', badge_data, status=201)
    res2 = testapp.patch_json(res1.json['@graph'][0]['@id'], {'title': 'WaHoo'}, status=200)
    assert res2.json['@graph'][0]['badge_name'] == "wahoo"


@pytest.fixture
def vendor_data_alias(lab, award):
    return {"title": "Wrong Alias Biochemical",
            'lab': lab['@id'],
            'award': award['@id'],
            'aliases': ['my_lab:this_is_correct_one',
                        'my_lab:this/is_wrong',
                        'my_lab:this\is_wrong_too']}


def test_vendor_alias_wrong_format(testapp, vendor_data_alias):
    res = testapp.post_json('/vendor', vendor_data_alias, status=422)
    response = res.json
    print(res.json)
    assert response['status'] == 'error'
    assert response['code'] == 422
    problematic_aliases = 0
    for an_error in response['errors']:
        if an_error['name'][0] == 'aliases':
            problematic_aliases += 1
    assert problematic_aliases == 2
