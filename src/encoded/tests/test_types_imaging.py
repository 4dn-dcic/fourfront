import pytest


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def img_path_blank(testapp, lab, award):
    item = {'award': award['@id'], 'lab': lab['@id']}
    return testapp.post_json('/imaging_path', item).json['@graph'][0]


@pytest.fixture
def p_antibody(testapp, lab, award):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'antibody_name': 'RAD21 antibody',
            'antibody_product_no': 'ab12043'}
    return testapp.post_json('/antibody', item).json['@graph'][0]


@pytest.fixture
def s_antibody(testapp, lab, award):
    item = {'award': award['@id'],
            'lab': lab['@id'],
            'antibody_name': 'anti-mouse antibody',
            'antibody_product_no': '9876'}
    return testapp.post_json('/antibody', item).json['@graph'][0]


def test_imgpath_displaytitle_target_probe(testapp, img_path_blank, prot_bio_feature):
    res = testapp.patch_json(img_path_blank['@id'], {'target': [prot_bio_feature['@id']]}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein'
    res = testapp.patch_json(img_path_blank['@id'], {'labeled_probe': 'imaging probe'}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by imaging probe'


def test_imgpath_displaytitle(testapp, img_path_blank, prot_bio_feature):
    assert img_path_blank['display_title'] == 'not enough information'
    res = testapp.patch_json(img_path_blank['@id'], {'target': [prot_bio_feature['@id']],
                                                     'labels': ['GFP', 'RFP']}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by GFP,RFP'
    res = testapp.patch_json(img_path_blank['@id'], {'labeled_probe': 'imaging probe'}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by GFP,RFP-labeled imaging probe'
    res = testapp.patch_json(img_path_blank['@id'], {'other_probes': ['intermediate probe 1', 'other probe 2']}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by intermediate probe 1, other probe 2 (with GFP,RFP-labeled imaging probe)'
    res = testapp.patch_json(img_path_blank['@id'], {'override_display_title': 'Custom title'}).json['@graph'][0]
    assert res['display_title'] == 'Custom title'


def test_imgpath_displaytitle_antibodies(testapp, img_path_blank, prot_bio_feature, p_antibody, s_antibody):
    res = testapp.patch_json(img_path_blank['@id'], {'target': [prot_bio_feature['@id']],
                                                     'primary_antibodies': [p_antibody['@id']],
                                                     'secondary_antibody': s_antibody['@id'],
                                                     'labels': ['AF 647']}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by RAD21 antibody (with AF 647-labeled anti-mouse antibody)'
    res = testapp.patch_json(img_path_blank['@id'], {'other_probes': ['other probe'],
                                                     'labeled_probe': 'imaging probe'}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by other probe, RAD21 antibody (with AF 647-labeled imaging probe, anti-mouse antibody)'


def test_imgpath_displaytitle_labels_only(testapp, img_path_blank):
    res = testapp.patch_json(img_path_blank['@id'], {'labels': ['GFP', 'RFP']}).json['@graph'][0]
    assert res['display_title'] == 'GFP,RFP'


def test_imgpath_displaytitle_labeled_probe_only(testapp, img_path_blank):
    res = testapp.patch_json(img_path_blank['@id'], {'labels': ['GFP'],
                                                     'labeled_probe': 'imaging probe'}).json['@graph'][0]
    assert res['display_title'] == 'GFP-labeled imaging probe'
