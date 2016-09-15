import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


def remote_user_testapp(app, remote_user):
    from webtest import TestApp
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': str(remote_user),
    }
    return TestApp(app, environ)


@pytest.fixture
def revoked_user(testapp, lab, award):
    item = {
        'first_name': 'ENCODE',
        'last_name': 'Submitter',
        'email': 'no_login_submitter@example.org',
        'submits_for': [lab['@id']],
        'status': 'revoked',
    }
    # User @@object view has keys omitted.
    res = testapp.post_json('/user', item)
    return testapp.get(res.location).json


@pytest.fixture
def other_lab(testapp):
    item = {
        'title': 'Other lab',
        'name': 'other-lab',
    }
    return testapp.post_json('/lab', item, status=201).json['@graph'][0]


@pytest.fixture
def step_run(testapp, lab, award):
    software = {
        'name': 'do-thing',
        'description': 'It does the thing',
        'title': 'THING_DOER',
        'version': '1.0',
        'software_type':"normalizer",
        'award': award['@id'],
        'lab': lab['@id']
    }
    sw = testapp.post_json('/software', software, status=201).json['@graph'][0]

    analysis_step = {
        'name': 'do-thing-step',
        'version': 1,
        'software_used': sw['@id']
    }
    return testapp.post_json('/analysis-steps', analysis_step, status=201).json['@graph'][0]



@pytest.fixture
def wrangler_testapp(wrangler, app, external_tx, zsa_savepoints):
    return remote_user_testapp(app, wrangler['uuid'])

@pytest.fixture
def remc_member_testapp(remc_submitter, app, external_tx, zsa_savepoints):
    return remote_user_testapp(app, remc_submitter['uuid'])

@pytest.fixture
def submitter_testapp(submitter, app, external_tx, zsa_savepoints):
    return remote_user_testapp(app, submitter['uuid'])


@pytest.fixture
def lab_viewer_testapp(lab_viewer, app, external_tx, zsa_savepoints):
    return remote_user_testapp(app, lab_viewer['uuid'])

@pytest.fixture
def viewing_group_member_testapp(viewing_group_member, app, external_tx, zsa_savepoints):
    return remote_user_testapp(app, viewing_group_member['uuid'])


@pytest.fixture
def indexer_testapp(app, external_tx, zsa_savepoints):
    return remote_user_testapp(app, 'INDEXER')


def test_wrangler_post_non_lab_collection(wrangler_testapp):
    item = {
        'name': 'human',
        'scientific_name': 'Homo sapiens',
        'taxon_id': '9606',
    }
    return wrangler_testapp.post_json('/organism', item, status=201)


def test_submitter_cant_post_non_lab_collection(submitter_testapp):
    item = {
        'name': 'human',
        'scientific_name': 'Homo sapiens',
        'taxon_id': '9606',
    }
    return submitter_testapp.post_json('/organism', item, status=403)


def test_submitter_post_update_experiment(submitter_testapp, lab, award):
    experiment = {'lab': lab['@id'], 'award': award['@id'], 'experiment_type':'micro-C'}
    res = submitter_testapp.post_json('/experiments-hic', experiment, status=201)
    location = res.location
    res = submitter_testapp.get(location + '@@testing-allowed?permission=edit', status=200)
    assert res.json['has_permission'] is True
    assert 'submits_for.%s' % lab['uuid'] in res.json['principals_allowed_by_permission']
    submitter_testapp.patch_json(location, {'description': 'My experiment'}, status=200)


def test_submitter_cant_post_other_lab(submitter_testapp, other_lab, award):
    experiment = {'lab': other_lab['@id'], 'award': award['@id'], 'experiment_type':'micro-C'}
    res = submitter_testapp.post_json('/experiments-hic', experiment, status=422)
    assert "not in user submits_for" in res.json['errors'][0]['description']


def test_wrangler_post_other_lab(wrangler_testapp, other_lab, award):
    experiment = {'lab': other_lab['@id'], 'award': award['@id'], 'experiment_type':'micro-C'}
    wrangler_testapp.post_json('/experiments-hic', experiment, status=201)


def test_submitter_view_experiement(submitter_testapp, submitter, lab, award):
    experiment = {'lab': lab['@id'], 'award': award['@id'], 
                  'experiment_type':'micro-C',
                  'status':'in review'}
    res = submitter_testapp.post_json('/experiments-hic', experiment, status=201)
    submitter_testapp.get(res.json['@graph'][0]['@id'], status=200) 



def test_user_view_details_admin(submitter, access_key, testapp):
    res = testapp.get(submitter['@id'])
    assert 'email' in res.json
    assert 'access_keys' in res.json
    assert 'access_key_id' in res.json['access_keys'][0]


def test_users_view_details_self(submitter, access_key, submitter_testapp):
    res = submitter_testapp.get(submitter['@id'])
    assert 'email' in res.json
    assert 'access_keys' in res.json
    assert 'access_key_id' in res.json['access_keys'][0]


def test_users_patch_self(submitter, access_key, submitter_testapp):
    submitter_testapp.patch_json(submitter['@id'], {})


def test_users_post_disallowed(submitter, access_key, submitter_testapp):
    item = {
        'first_name': 'ENCODE',
        'last_name': 'Submitter2',
        'email': 'encode_submitter2@example.org',
    }
    submitter_testapp.post_json('/user', item, status=403)


def test_users_view_basic_authenticated(submitter, authenticated_testapp):
    res = authenticated_testapp.get(submitter['@id'])
    assert 'title' in res.json
    assert 'email' not in res.json
    assert 'access_keys' not in res.json


def test_users_view_basic_anon(submitter, anontestapp):
    res = anontestapp.get(submitter['@id'])
    assert 'title' in res.json
    assert 'email' not in res.json
    assert 'access_keys' not in res.json


def test_users_view_basic_indexer(submitter, indexer_testapp):
    res = indexer_testapp.get(submitter['@id'])
    assert 'title' in res.json
    assert 'email' not in res.json
    assert 'access_keys' not in res.json


def test_viewing_group_member_view(viewing_group_member_testapp, experiment):
    viewing_group_member_testapp.get(experiment['@id'], status=200)


def test_lab_viewer_view(lab_viewer_testapp, experiment):
    lab_viewer_testapp.get(experiment['@id'], status=200)

def test_submitter_patch_lab_disallowed(submitter, other_lab, submitter_testapp):
    res = submitter_testapp.get(submitter['@id'])
    lab = {'lab': other_lab['@id']}
    submitter_testapp.patch_json(res.json['@id'], lab, status=422)  # is that the right status?


def test_wrangler_patch_lab_allowed(submitter, other_lab, wrangler_testapp):
    res = wrangler_testapp.get(submitter['@id'])
    lab = {'lab': other_lab['@id']}
    wrangler_testapp.patch_json(res.json['@id'], lab, status=200)


def test_submitter_patch_submits_for_disallowed(submitter, other_lab, submitter_testapp):
    res = submitter_testapp.get(submitter['@id'])
    submits_for = {'submits_for': res.json['submits_for'] + [other_lab['@id']]}
    submitter_testapp.patch_json(res.json['@id'], submits_for, status=422)


def test_wrangler_patch_submits_for_allowed(submitter, other_lab, wrangler_testapp):
    res = wrangler_testapp.get(submitter['@id'])
    submits_for = {'submits_for': res.json['submits_for'] + [other_lab['@id']]}
    wrangler_testapp.patch_json(res.json['@id'], submits_for, status=200)


def test_submitter_patch_groups_disallowed(submitter, submitter_testapp):
    res = submitter_testapp.get(submitter['@id'])
    groups = {'groups': res.json['groups'] + ['admin']}
    submitter_testapp.patch_json(res.json['@id'], groups, status=422)


def test_wrangler_patch_groups_allowed(submitter, other_lab, wrangler_testapp):
    res = wrangler_testapp.get(submitter['@id'])
    groups = {'groups': res.json['groups'] + ['admin']}
    wrangler_testapp.patch_json(res.json['@id'], groups, status=200)


def test_submitter_patch_viewing_groups_disallowed(submitter, other_lab, submitter_testapp):
    res = submitter_testapp.get(submitter['@id'])
    vgroups = {'viewing_groups': res.json['viewing_groups'] + ['GGR']}
    submitter_testapp.patch_json(res.json['@id'], vgroups, status=422)


def test_wrangler_patch_viewing_groups_allowed(submitter, wrangler_testapp):
    res = wrangler_testapp.get(submitter['@id'])
    vgroups = {'viewing_groups': res.json['viewing_groups'] + ['Not 4DN']}
    wrangler_testapp.patch_json(res.json['@id'], vgroups, status=200)


def test_revoked_user_denied_authenticated(authenticated_testapp, revoked_user):
    authenticated_testapp.get(revoked_user['@id'], status=403)


def test_revoked_user_denied_submitter(submitter_testapp, revoked_user):
    submitter_testapp.get(revoked_user['@id'], status=403)


def test_revoked_user_wrangler(wrangler_testapp, revoked_user):
    wrangler_testapp.get(revoked_user['@id'], status=200)


def test_labs_view_wrangler(wrangler_testapp, other_lab):
    labs = wrangler_testapp.get('/labs/', status=200)
    assert(len(labs.json['@graph']) == 1)


