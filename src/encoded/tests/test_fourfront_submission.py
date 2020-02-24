import pytest


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]

# test that  the right fields are in place for metadata submission on FF.
# specifically, a valid submits_for lab and valid award
def test_user_with_submitter(testapp, submitter):
    assert len(submitter['submits_for']) > 0
    lab = submitter['submits_for'][0]['@id']
    lab_res = testapp.get(lab, status=200)
    assert len(lab_res.json['awards']) > 0
    award = lab_res.json['awards'][0]['@id']
    testapp.get(award, status=200)
