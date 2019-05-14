import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


def test_assay_subclass_short_wo_assay_classification(exp_types):
    hic_type = exp_types.get('hic')
    assert hic_type.get('assay_subclass_short') == 'Unclassified'


def test_assay_subclass_short_w_assay_classification(testapp, exp_types):
    hic_type = exp_types.get('hic')
    res = testapp.patch_json(hic_type['@id'], {'assay_classification': 'DNA-DNA Pairwise Interactions'}).json['@graph'][0]
    assert res.get('assay_subclass_short') == 'Hi-C'


def test_assay_subclass_short_w_assay_subclassification(testapp, exp_types):
    hic_type = exp_types.get('hic')
    res = testapp.patch_json(hic_type['@id'], {'assay_subclassification': 'DNA-DNA Pairwise Interactions of Enriched Regions'}).json['@graph'][0]
    assert res.get('assay_subclass_short') == 'Enrichment Hi-C'


def test_other_protocols_no_protocol(exp_types):
    hic_exptype = exp_types.get('hic')
    assert 'other_protocols' not in hic_exptype


def test_other_protocols_no_sop(testapp, protocol, exp_types):
    hic_exptype = exp_types.get('hic')
    testapp.patch_json(protocol['@id'], {'experiment_type': hic_exptype['@id']})
    res = testapp.get(hic_exptype['@id'])
    assert res.json.get('other_protocols')[0].get('@id') == protocol['@id']


def test_other_protocols_w_sop(testapp, protocol, protocol_data, exp_types):
    hic_exptype = exp_types.get('hic')
    testapp.patch_json(hic_exptype['@id'], {'sop': protocol['@id']})
    protocol_data['description'] = 'Another protocol'
    protocol_data['experiment_type'] = hic_exptype['@id']
    testapp.patch_json(protocol['@id'], {'experiment_type': hic_exptype['@id']})
    protocol2 = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    res = testapp.get(hic_exptype['@id'])
    other_protocols = [p.get('@id') for p in res.json.get('other_protocols')]
    assert protocol['@id'] not in other_protocols
    assert protocol2['@id'] in other_protocols
