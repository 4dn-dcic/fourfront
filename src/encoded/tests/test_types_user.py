import pytest
from encoded.types.user import User
pytestmark = [pytest.mark.working, pytest.mark.schema]

@pytest.fixture
def user_w_lab(testapp, lab):
    item = {
        'first_name': 'User',
        'last_name': 'McGee',
        'email': 'user@mcgee.org',
        'status': 'current',
        'lab': lab['@id']
    }
    # User @@object view has keys omitted.
    res = testapp.post_json('/user', item)
    return testapp.get(res.location).json

def test_user_subscriptions(submitter, admin, user_w_lab, lab):
    # submitter has submits_for but no lab
    assert 'submits_for' in submitter
    assert len(submitter['subscriptions']) == 1
    assert submitter['subscriptions'][0]['title'] == 'My submissions'
    # user_w_lab has lab but no submits_for
    assert 'lab' in user_w_lab
    assert len(user_w_lab['subscriptions']) == 1
    assert user_w_lab['subscriptions'][0]['title'] == lab['title']
    # admin has no submits_for and no lab, thus should have no subscriptions
    assert 'lab' not in admin
    assert admin['submits_for'] == []
    assert len(admin['subscriptions']) == 0

def test_subscriptions_dont_duplicate_on_update(registry, lab, user_w_lab):
    # run _update on a new user with already formed subscriptions.
    # Ensure they're not duplicated in the process
    user_data = {
        'first_name': 'User',
        'last_name': 'McUser',
        'email': 'user@mcuser.org',
        'status': 'current',
        'subscriptions': [{'url': '?lab.link_id=~labs~encode-lab~&sort=-date_created', 'title': 'ENCODE lab'}]
    }
    test_user = User.create(registry, None, user_data)
    assert len(test_user.properties['subscriptions']) == 1
    assert test_user.properties['subscriptions'] == user_w_lab['subscriptions']
