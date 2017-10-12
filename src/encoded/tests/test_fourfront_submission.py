import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]

# test that  the right fields are in place for metadata submission on FF.
# specifically, a valid submits_for lab and valid award
def test_user_with_submitter(testapp, submitter):
    assert len(submitter['submits_for']) > 0
    # this code allows you to find lab, whether info is @id or link_id
    if '@id' in submitter['submits_for'][0].keys():
        lab = submitter['submits_for'][0]['@id']
    else:
        lab = submitter['submits_for'][0]['link_id'].replace('~','/')
    lab_res = testapp.get(lab, status=200)
    assert len(lab_res.json['awards']) > 0
    if '@id' in lab_res.json['awards'][0].keys():
        award = lab_res.json['awards'][0]['@id']
    else:
        award = lab_res.json['awards'][0]['link_id'].replace('~','/')
    testapp.get(award, status=200)
