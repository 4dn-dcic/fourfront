import pytest
import re

from pkg_resources import resource_listdir
from snovault import COLLECTIONS, TYPES
from snovault.schema_utils import load_schema
from snovault.util import crawl_schema


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]

SCHEMA_FILES = [
    f for f in resource_listdir('encoded', 'schemas')
    if f.endswith('.json')
]


@pytest.fixture(scope='module')
def master_mixins():
    mixins = load_schema('encoded:schemas/mixins.json')
    mixin_keys = [
        'schema_version',
        'uuid',
        'accession',
        'aliases',
        'status',
        'submitted',
        'release_dates',
        'modified',
        'references',
        'attribution',
        'notes',
        'documents',
        'attachment',
        'dbxrefs',
        'library',
        'antibody_info',
        'spikein_info',
        'sop_mapping',
        'tags',
        'badges',
        'facets_common'
    ]
    for key in mixin_keys:
        assert(mixins[key])


def camel_case(name):
    return ''.join(x for x in name.title() if not x == '_')


def pluralize(name):
    name = name.replace('_', '-')
    # deal with a few special cases explicitly
    specials = ['experiment', 'file', 'individual', 'treatment',
                'quality-metric', 'summary-statistic', 'workflow-run',
                'microscope-setting']
    for sp in specials:
        if name.startswith(sp) and re.search('-(set|flag|format|type)', name) is None:
            return name.replace(sp, sp + 's')
        elif name.startswith(sp) and re.search('setting', name):
            return name.replace(sp, sp + 's')
    # otherwise just add 's'
    return name + 's'


@pytest.mark.parametrize('schema', SCHEMA_FILES)
def test_load_schema(schema, master_mixins, registry):

    abstract = [
        'microscope_setting.json',
        'experiment.json',
        'file.json',
        'individual.json',
        'quality_metric.json',
        'treatment.json',
        'workflow_run.json',
        'user_content.json'
    ]

    loaded_schema = load_schema('encoded:schemas/%s' % schema)
    assert(loaded_schema)

    typename = schema.replace('.json', '')
    collection_names = [camel_case(typename), pluralize(typename)]

    # check the mixin properties for each schema
    if not schema == ('mixins.json'):
        verify_mixins(loaded_schema, master_mixins)

    if schema not in ['namespaces.json', 'mixins.json']:
        # check that schema.id is same as /profiles/schema
        idtag = loaded_schema['$id']
        idtag = idtag.replace('/profiles/', '')
        # special case for access_key.json
        if schema == 'access_key.json':
            idtag = idtag.replace('_admin', '')
        assert schema == idtag

        # check for pluralized and camel cased in collection_names
        val = None
        for name in collection_names:
            assert name in registry[COLLECTIONS]
            if val is not None:
                assert registry[COLLECTIONS][name] == val
            else:
                val = registry[COLLECTIONS][name]

        if schema not in abstract:
            # check schema w/o json extension is in registry[TYPES]
            assert typename in registry[TYPES].by_item_type
            assert typename in registry[COLLECTIONS]
            assert registry[COLLECTIONS][typename] == val

            shared_properties = [
                'uuid',
                'schema_version',
                'aliases',
                'lab',
                'award',
                'date_created',
                'submitted_by',
                'last_modified',
                'status'
            ]
            no_alias_or_attribution = [
                'user.json', 'award.json', 'lab.json', 'organism.json',
                'ontology.json', 'ontology_term.json', 'page.json',
                'static_section.json', 'badge.json', 'tracking_item.json',
                'file_format.json', 'experiment_type.json', 'higlass_view_config.json',
                'microscope_configuration.json', 'image_setting.json'
            ]
            for prop in shared_properties:
                if schema == 'experiment.json':
                    # currently experiment is abstract and has no mixin properties
                    continue
                if schema == 'access_key.json' and prop not in ['uuid', 'schema_version']:
                    continue
                if schema in no_alias_or_attribution and prop in ['aliases', 'lab', 'award']:
                    continue
                verify_property(loaded_schema, prop)


def verify_property(loaded_schema, property):
    assert(loaded_schema['properties'][property])


def verify_mixins(loaded_schema, master_mixins):
    '''
    test to ensure that we didn't accidently overwrite mixins somehow
    '''
    for mixin in loaded_schema.get('mixinProperties', []):
        # get the mixin name from {'$ref':'mixins.json#/schema_version'}
        mixin_file_name, mixin_name = mixin['$ref'].split('/')
        if mixin_file_name != "mixins.json":
            # skip any mixins not in main mixins.json
            continue
        mixin_schema = master_mixins[mixin_name]

        # each field in the mixin should be present in the parent schema with same properties
        for mixin_field_name, mixin_field in mixin_schema.items():
            schema_field = loaded_schema['properties'][mixin_field_name]
            for key in mixin_field.keys():
                assert mixin_field[key] == schema_field[key]


def test_linkTo_saves_uuid(root, submitter, lab):
    item = root['users'][submitter['uuid']]
    assert item.properties['submits_for'] == [lab['uuid']]


def test_mixinProperties():
    schema = load_schema('snovault:schemas/access_key.json')
    assert schema['properties']['uuid']['type'] == 'string'


def test_dependencies(testapp):
    collection_url = '/testing-dependencies/'
    testapp.post_json(collection_url, {'dep1': 'dep1', 'dep2': 'dep2'}, status=201)
    testapp.post_json(collection_url, {'dep1': 'dep1'}, status=422)
    testapp.post_json(collection_url, {'dep2': 'dep2'}, status=422)
    testapp.post_json(collection_url, {'dep1': 'dep1', 'dep2': 'disallowed'}, status=422)


def test_changelogs(testapp, registry):
    for typeinfo in registry[TYPES].by_item_type.values():
        changelog = typeinfo.schema.get('changelog')
        if changelog is not None:
            res = testapp.get(changelog)
            assert res.status_int == 200, changelog
            assert res.content_type == 'text/markdown'


def test_fourfront_crawl_schemas(testapp, registry):
    schema = load_schema('encoded:schemas/experiment_hi_c.json')
    field_path = 'files.extra_files.file_size'
    field_schema = crawl_schema(registry[TYPES], field_path, schema)
    assert isinstance(field_schema, dict)
    assert field_schema['title'] == 'File Size'


def test_schema_version_present_on_items(app):
    """Test a valid schema version is present on all non-test item
    types.
    Expecting positive integer values for non-abstract items, and empty
    string for all abstract items.
    """
    all_types = app.registry.get(TYPES).by_item_type
    for type_name, item_type in all_types.items():
        if type_name.startswith("testing"):
            continue
        schema_version = item_type.schema_version
        if item_type.is_abstract:
            assert schema_version == ""
        else:
            assert schema_version, f'failed for {item_type.name}'
            assert int(schema_version) >= 1
