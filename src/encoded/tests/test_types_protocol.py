import datetime
import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


def utc_today_str():
    return datetime.datetime.strftime(datetime.datetime.utcnow(), "%Y-%m-%d")


@pytest.fixture
def protocol_w_attach(testapp, protocol_data, attachment):
    protocol_data['attachment'] = attachment
    return testapp.post_json('/protocol', protocol_data).json['@graph'][0]


def test_protocol_display_title_w_attachment(testapp, protocol_data, attachment):
    res = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert res.get('display_title').startswith('Experimental protocol')
    patched = testapp.patch_json(res['@id'], {'attachment': attachment}).json['@graph'][0]
    assert patched.get('display_title') == 'red-dot.png'


def test_protocol_display_title_w_title(testapp, protocol_data, attachment):
    protocol_data['attachment'] = attachment
    res = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert res.get('display_title') == 'red-dot.png'
    patched = testapp.patch_json(res['@id'], {'title': 'The best method'}).json['@graph'][0]
    assert patched.get('display_title') == 'The best method'


def test_protocol_display_title_wo_attachment(testapp, protocol_data):
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert protocol['display_title'] == 'Experimental protocol from ' + utc_today_str()


def test_protocol_other_display_title_wo_attachment(testapp, protocol_data):
    protocol_data['protocol_type'] = 'Other'
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert protocol['display_title'] == 'Protocol from ' + utc_today_str()


def test_protocol_experiment_type(testapp, protocol_data, exp_types):
    hic_exptype = exp_types.get('hic')
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert 'experiment_type' not in protocol
    testapp.patch_json(hic_exptype['@id'], {'other_protocols': [protocol['@id']]})
    res = testapp.get(protocol['@id'])
    assert res.json.get('experiment_type', {}).get('@id') == hic_exptype['@id']


def test_protocol_experiment_type_sop(testapp, protocol_data, exp_types):
    hic_exptype = exp_types.get('hic')
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert 'experiment_type' not in protocol
    testapp.patch_json(hic_exptype['@id'], {'sop': protocol['@id']})
    res = testapp.get(protocol['@id'])
    assert res.json.get('experiment_type', {}).get('@id') == hic_exptype['@id']


def test_protocol_experiment_type_multiple(testapp, protocol_data, exp_types):
    hic_exptype = exp_types.get('hic')
    dam_exptype = exp_types.get('dam')
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert 'experiment_type' not in protocol
    testapp.patch_json(hic_exptype['@id'], {'sop': protocol['@id']})
    testapp.patch_json(dam_exptype['@id'], {'other_protocols': [protocol['@id']]})
    res = testapp.get(protocol['@id'])
    assert res.json.get('experiment_type', {}).get('@id') == hic_exptype['@id']
