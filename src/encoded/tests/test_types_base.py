import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def some_treatment(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'chemical': 'blah',
    }
    return testapp.post_json('/treatment_chemical', item).json['@graph'][0]


@pytest.fixture
def bad_statuses():
    return ['revoked', 'deleted', 'replaced', 'obsolete']


@pytest.fixture
def ok_statuses():
    return ['submission in progress', 'released', 'current', 'released to project', 'in review by lab',
            'planned']


def test_add_bad_status_to_display_title_w_bad_stati(testapp, some_treatment, bad_statuses):
    #import pdb; pdb.set_trace()
    assert some_treatment['display_title'] == 'blah treatment'
    for bstatus in bad_statuses:
        res = testapp.patch_json(
            some_treatment['@id'],
            {'status': bstatus})
        assert res.json['@graph'][0]['display_title'] == bstatus.upper() + ' blah treatment'


def test_add_bad_status_to_display_title_w_ok_stati(testapp, some_treatment, ok_statuses):
    # import pdb; pdb.set_trace()
    assert some_treatment['display_title'] == 'blah treatment'
    for gstatus in ok_statuses:
        #import pdb; pdb.set_trace()
        res = testapp.patch_json(
            some_treatment['@id'],
            {'status': gstatus})
        assert res.json['@graph'][0]['display_title'] == 'blah treatment'
