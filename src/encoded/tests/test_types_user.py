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


def test_user_subscriptions(testapp, submitter, admin, user_w_lab, lab, another_lab):
    import copy
    # submitter has submits_for but no lab
    assert 'submits_for' in submitter
    assert len(submitter['subscriptions']) == 1
    assert submitter['subscriptions'][0]['title'] == 'My submissions for ' + lab['title']
    # subscription url contains user and lab uuids
    assert submitter['uuid'] in submitter['subscriptions'][0]['url']
    assert lab['uuid'] in submitter['subscriptions'][0]['url']
    # ensure that submissions are the same after another update
    subscriptions_before_update = copy.copy(submitter['subscriptions'])
    submitter.update()
    assert submitter['subscriptions'] == subscriptions_before_update
    # make sure we can add more labs to submits for
    submits_for_patch = [submitter['submits_for'][0]['@id'], another_lab['@id']]
    res = testapp.patch_json(submitter['@id'], {'submits_for': submits_for_patch})
    assert len(res.json['@graph'][0]['subscriptions']) == 2
    # these are old formats for subscriptions; test that they're gone
    subscription_keys = [sub['title'] for sub in res.json['@graph'][0]['subscriptions']]
    assert 'My lab' not in subscription_keys and 'My submissions' not in subscription_keys

    # user_w_lab has lab but no submits_for
    assert 'lab' in user_w_lab
    assert len(user_w_lab['subscriptions']) == 1
    assert user_w_lab['subscriptions'][0]['title'] == 'All submissions for ' + lab['title']
    # subscription url contains just lab uuid
    assert user_w_lab['uuid'] not in user_w_lab['subscriptions'][0]['url']
    assert lab['uuid'] in user_w_lab['subscriptions'][0]['url']
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
        'subscriptions': [{'url': '?lab.uuid=' + lab['uuid'] + '&sort=-date_created',
                           'title': 'All submissions for ENCODE lab'}]
    }
    test_user = User.create(registry, None, user_data)
    assert len(test_user.properties['subscriptions']) == 1
    assert test_user.properties['subscriptions'] == user_w_lab['subscriptions']
