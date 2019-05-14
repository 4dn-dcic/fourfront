import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def histone_target(testapp, lab, award):
    item = {'targeted_proteins': ['H2B1C_HUMAN'], 'award': award['@id'], 'lab': lab['@id']}
    return testapp.post_json('/target', item).json['@graph'][0]


@pytest.fixture
def img_path_blank(testapp, lab, award):
    item = {'award': award['@id'], 'lab': lab['@id']}
    return testapp.post_json('/imaging_path', item).json['@graph'][0]


def test_imgpath_displaytitle_target_probe(testapp, img_path_blank, prot_bio_feature):
    res = testapp.patch_json(img_path_blank['@id'], {'target': [prot_bio_feature['@id']],
                                                     'labeled_probe': 'secondary antibody'}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by secondary antibody'


def test_imgpath_displaytitle(testapp, img_path_blank, prot_bio_feature):
    assert img_path_blank['display_title'] == 'not enough information'
    res = testapp.patch_json(img_path_blank['@id'], {'target': [prot_bio_feature['@id']],
                                                     'labels': ['GFP', 'RFP']}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by GFP,RFP'
    res = testapp.patch_json(img_path_blank['@id'], {'labeled_probe': 'secondary antibody'}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by GFP,RFP-labeled secondary antibody'
    res = testapp.patch_json(img_path_blank['@id'], {'other_probes': ['primary Ab 1', 'primary Ab 2']}).json['@graph'][0]
    assert res['display_title'] == 'RAD21 protein targeted by GFP,RFP-labeled secondary antibody (with primary Ab 1, primary Ab 2)'
