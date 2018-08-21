import pytest
pytestmark = pytest.mark.working

targets = [
    {'name': 'one', 'uuid': '775795d3-4410-4114-836b-8eeecf1d0c2f'},
    {'name': 'two', 'uuid': 'd6784f5e-48a1-4b40-9b11-c8aefb6e1377'},
]

item = {
    'required': 'required value',
}

simple1 = {
    'required': 'required value',
    'simple1': 'supplied simple1',
}

simple2 = {
    'required': 'required value',
    'simple2': 'supplied simple2',
}

item_with_uuid = [
    {
        'uuid': '0f13ff76-c559-4e70-9497-a6130841df9f',
        'required': 'required value 1',
        'field_no_default': 'test'
    },
    {
        'uuid': '6c3e444b-f290-43c4-bfb9-d20135377770',
        'required': 'required value 2',
    },
]

item_with_link = [
    {
        'required': 'required value 1',
        'protected_link': '775795d3-4410-4114-836b-8eeecf1d0c2f',
    },
    {
        'required': 'required value 2',
        'protected_link': 'd6784f5e-48a1-4b40-9b11-c8aefb6e1377',
    },
]


COLLECTION_URL = '/testing-post-put-patch/'


@pytest.fixture
def link_targets(testapp):
    url = '/testing-link-targets/'
    for item in targets:
        testapp.post_json(url, item, status=201)


@pytest.fixture
def content(testapp):
    res = testapp.post_json(COLLECTION_URL, item_with_uuid[0], status=201)
    return {'@id': res.location}


@pytest.fixture
def content_with_child(testapp):
    parent_res = testapp.post_json('/testing-link-targets/', {}, status=201)
    parent_id = parent_res.json['@graph'][0]['@id']
    child_res = testapp.post_json('/testing-link-sources/', {'target': parent_id})
    child_id = child_res.json['@graph'][0]['@id']
    return {'@id': parent_id, 'child': child_id}


def test_admin_post(testapp):
    testapp.post_json(COLLECTION_URL, item, status=201)
    testapp.post_json(COLLECTION_URL, item_with_uuid[0], status=201)


def test_submitter_post(submitter_testapp):
    testapp = submitter_testapp
    testapp.post_json(COLLECTION_URL, item, status=201)
    res = testapp.post_json(COLLECTION_URL, item_with_uuid[0], status=422)
    assert any(error.get('name') == ['uuid'] for error in res.json['errors'])


def test_admin_put_uuid(content, testapp):
    url = content['@id']
    # so long as the same uuid is supplied, PUTing the uuid is fine
    testapp.put_json(url, item_with_uuid[0], status=200)
    # but the uuid may not be changed on PUT;
    testapp.put_json(url, item_with_uuid[1], status=422)


def test_submitter_put_uuid(content, submitter_testapp):
    testapp = submitter_testapp
    url = content['@id']
    # so long as the same uuid is supplied, PUTing the uuid is fine
    testapp.put_json(url, item_with_uuid[0], status=200)
    # but the uuid may not be changed on PUT;
    testapp.put_json(url, item_with_uuid[1], status=422)


def test_defaults_on_put(content, testapp):
    url = content['@id']
    res = testapp.get(url)
    assert res.json['simple1'] == 'simple1 default'
    assert res.json['simple2'] == 'simple2 default'

    res = testapp.put_json(url, simple1, status=200)
    assert res.json['@graph'][0]['simple1'] == 'supplied simple1'
    assert res.json['@graph'][0]['simple2'] == 'simple2 default'

    res = testapp.put_json(url, simple2, status=200)
    assert res.json['@graph'][0]['simple1'] == 'simple1 default'
    assert res.json['@graph'][0]['simple2'] == 'supplied simple2'


def test_patch(content, testapp):
    url = content['@id']
    res = testapp.get(url)
    assert res.json['simple1'] == 'simple1 default'
    assert res.json['simple2'] == 'simple2 default'

    res = testapp.patch_json(url, {}, status=200)
    assert res.json['@graph'][0]['simple1'] == 'simple1 default'
    assert res.json['@graph'][0]['simple2'] == 'simple2 default'

    res = testapp.patch_json(url, {'simple1': 'supplied simple1'}, status=200)
    assert res.json['@graph'][0]['simple1'] == 'supplied simple1'
    assert res.json['@graph'][0]['simple2'] == 'simple2 default'

    res = testapp.patch_json(url, {'simple2': 'supplied simple2'}, status=200)
    assert res.json['@graph'][0]['simple1'] == 'supplied simple1'
    assert res.json['@graph'][0]['simple2'] == 'supplied simple2'


def test_patch_new_schema_version(content, root, testapp, monkeypatch):
    collection = root['testing_post_put_patch']
    properties = collection.type_info.schema['properties']

    url = content['@id']
    res = testapp.get(url)
    assert res.json['schema_version'] == '1'

    monkeypatch.setitem(properties['schema_version'], 'default', '2')
    monkeypatch.setattr(collection.type_info, 'schema_version', '2')
    monkeypatch.setitem(properties, 'new_property', {'default': 'new'})
    res = testapp.patch_json(url, {}, status=200)
    assert res.json['@graph'][0]['schema_version'] == '2'
    assert res.json['@graph'][0]['new_property'] == 'new'

def test_admin_put_protected_link(link_targets, testapp):
    res = testapp.post_json(COLLECTION_URL, item_with_link[0], status=201)
    url = res.location

    testapp.put_json(url, item_with_link[0], status=200)
    testapp.put_json(url, item_with_link[1], status=200)


def test_submitter_put_protected_link(link_targets, testapp, submitter_testapp):
    res = testapp.post_json(COLLECTION_URL, item_with_link[0], status=201)
    url = res.location

    submitter_testapp.put_json(url, item_with_link[0], status=200)
    submitter_testapp.put_json(url, item_with_link[1], status=422)


def test_put_object_not_touching_children(content_with_child, testapp):
    """
    The rev_link style of editing children is removed as of FF-1089
    This will still pass
    """
    url = content_with_child['@id']
    res = testapp.put_json(url, {}, status=200)
    assert content_with_child['child'] in res.json['@graph'][0]['reverse']


def test_put_object_editing_child_does_not_work(content_with_child, testapp):
    edit = {
        'reverse': [{
            '@id': content_with_child['child'],
            'status': 'released',
        }]
    }
    testapp.put_json(content_with_child['@id'], edit, status=200)
    res = testapp.get(content_with_child['child'] + '?frame=embedded')
    assert 'status' not in res.json


def test_put_object_adding_child(content_with_child, testapp):
    """
    This works because it simply patches the reverse field, which is
    an array
    """
    edit = {
        'reverse': [
            content_with_child['child'],
            {
                'status': 'released',
            }
        ]
    }
    testapp.put_json(content_with_child['@id'], edit, status=200)
    res = testapp.get(content_with_child['@id'])
    assert len(res.json['reverse']) == 2


def test_post_object_with_child(testapp):
    """
    This functionality has changed, as reverse links are no longer supported
    This will simply post the value below to the 'reverse' field
    """
    edit = {
        'reverse': [{
            'status': 'released',
        }]
    }
    res = testapp.post_json('/testing-link-targets', edit, status=201)
    assert res.json['@graph'][0]['reverse'] == edit['reverse']


def test_retry(testapp):
    res = testapp.post_json('/testing-post-put-patch/', {'required': ''})
    url = res.location
    res = testapp.get(url + '/@@testing-retry?datstore=database')
    assert res.json['attempt'] == 2
    assert not res.json['detached']

def test_post_check_only(testapp, human_data, human):
    '''
    organism should validate fine but not post
    '''
    #if we post this data it will fail with uuid conflict, as calling the human fixture posts it
    testapp.post_json('/organism/', human_data, status=409)

    # so this one won't post, but schema validation is ok,
    # note it doesn't detect primary key
    rest = testapp.post_json('/organism/?check_only=True', human_data).json
    assert rest['status'] == 'success'


def test_put_check_only(testapp, human_data, human):
    '''
    organism should validate fine but not post
    '''
    #if we post this data it will fail with invalid status

    testapp.post_json('/organism/', human_data, status=409)

    # so this one won't post, but schema validation is ok,
    # note it doesn't detect primary key
    rest = testapp.post_json('/organism/?check_only=True', human_data).json
    assert rest['status'] == 'success'

def test_post_check_only_invalid_data(testapp, human_data):
    '''
    note theese test should work on any object
    '''
    human_data['taxon_id'] = 24;
    testapp.post_json('/organism/?check_only=True', human_data, status=422)


def test_put_check_only(testapp, human_data, human):
    '''
    organism should validate fine but not post
    '''
    # human_data has already been posted, now put with invalid status
    human_data['status'] = 'no a valid status'
    testapp.put_json('/organisms/human/?check_only=True', human_data, status=422)

    # so this one won't post, but schema validation is ok,
    # note it doesn't detect primary key
    human_data['status'] = human['status']
    rest = testapp.put_json('/organisms/human/?check_only=True', human_data).json
    assert rest['status'] == 'success'


def test_patch_check_only(testapp, human_data, human):
    '''
    organism should validate fine but not post
    '''
    # human_data has already been posted, now put with invalid status
    human_data['status'] = 'no a valid status'
    testapp.patch_json('/organisms/human/?check_only=True', human_data, status=422)

    # so this one won't post, but schema validation is ok,
    # note it doesn't detect primary key
    human_data['status'] = human['status']
    rest = testapp.patch_json('/organisms/human/?check_only=True', human_data).json
    assert rest['status'] == 'success'


def test_patch_delete_fields(content, testapp):
    url = content['@id']
    res = testapp.get(url)
    assert res.json['simple1'] == 'simple1 default'
    assert res.json['simple2'] == 'simple2 default'
    assert res.json['field_no_default'] == 'test'

    res = testapp.patch_json(url, {'simple1': 'this is a test'}, status=200)
    assert res.json['@graph'][0]['simple1'] == 'this is a test'

    # delete fields with defaults resets to default, while deleting non default field
    # completely removes them
    res = testapp.patch_json(url + "?delete_fields=simple1,field_no_default", {}, status=200)
    assert 'field_no_default' not in res.json['@graph'][0].keys()
    assert res.json['@graph'][0]['simple1'] == 'simple1 default'


def test_patch_delete_fields_non_string(content, testapp):
    url = content['@id']
    res = testapp.get(url)

    # delete fields with defaults resets to default, while deleting non default field
    # completely removes them
    res = testapp.patch_json(url + "?delete_fields=schema_version", {}, status=200)
    assert res.json['@graph'][0]['schema_version'] == '1'


def test_patch_delete_fields_still_works_with_no_validation(content, testapp):
    url = content['@id']
    res = testapp.get(url)
    assert res.json['simple1'] == 'simple1 default'
    assert res.json['simple2'] == 'simple2 default'
    assert res.json['field_no_default'] == 'test'

    # with validate=false, then defaults are not populated so default fields are also deleted
    res = testapp.patch_json(url + "?delete_fields=simple1,field_no_default&validate=false", {}, status=200)
    assert 'field_no_default' not in res.json['@graph'][0].keys()
    assert 'simple1' not in res.json['@graph'][0].keys()


def test_patch_delete_fields_bad_param(content, testapp):
    url = content['@id']
    res = testapp.get(url)
    assert res.json['simple1'] == 'simple1 default'
    assert res.json['simple2'] == 'simple2 default'
    assert res.json['field_no_default'] == 'test'
    res = testapp.patch_json(url + "?delete_fields=simple1,bad_fieldname", {}, status=422)
    assert res.json['description'] == "Failed validation"
    assert res.json['errors'][0]['description'] == "Additional properties are not allowed ('bad_fieldname' was unexpected)"


def test_patch_delete_fields_import_items_admin(link_targets, testapp):
    res = testapp.post_json(COLLECTION_URL, item_with_link[0], status=201)
    url = res.location
    assert res.json['@graph'][0]['protected_link']
    res = testapp.patch_json(url + "?delete_fields=protected_link", {}, status=200)


def test_patch_delete_fields_import_items_submitter(content, submitter_testapp):
    testapp = submitter_testapp
    url = content['@id']
    res = testapp.get(url)
    assert res.json['protected']
    res = testapp.patch_json(url + "?delete_fields=protected", {}, status=422)


def test_patch_delete_fields_required(content, testapp):
    url = content['@id']
    res = testapp.get(url)

    # with validate=false, then defaults are not populated so default fields are also deleted
    res = testapp.patch_json(url + "?delete_fields=required", {}, status=422)
    assert res.json['description'] == "Failed validation"
    assert res.json['errors'][0]['description'] == "'required' is a required property"
