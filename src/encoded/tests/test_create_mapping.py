import pytest

from dcicutils.deployment_utils import CreateMappingOnDeployManager
from dcicutils.qa_utils import notice_pytest_fixtures
from snovault import COLLECTIONS, TYPES
from snovault.elasticsearch.create_mapping import type_mapping, run as run_create_mapping
from snovault.util import add_default_embeds
from unittest.mock import patch, MagicMock
from .datafixtures import ORDER
from .workbook_fixtures import workbook, app_settings, app
from ..commands import create_mapping_on_deploy
from ..commands.create_mapping_on_deploy import (
    ITEM_INDEX_ORDER,
    _run_create_mapping  # noqa - yeah, it's internal but we want to test it
)
# TODO: We should not be importing *. Even stranger, PyCharm says we don't use anything from there. -kmp 14-Feb-2020
# Experimentally commenting this out. -kmp 28-Jun-2020
# from ..types.experiment import *


pytestmark = [pytest.mark.setone, pytest.mark.working]

# Using workbook inserts - required for test_run_create_mapping_with_upgrader
notice_pytest_fixtures(app_settings, app, workbook)


@pytest.mark.parametrize('item_type', ORDER)
def test_create_mapping(registry, item_type):
    """
    This test does not actually use elasticsearch
    Only tests the mappings generated from schemas
    """
    mapping = type_mapping(registry[TYPES], item_type)
    assert mapping
    type_info = registry[TYPES].by_item_type[item_type]
    schema = type_info.schema
    embeds = add_default_embeds(item_type, registry[TYPES], type_info.embedded_list, schema)
    # assert that all embeds exist in mapping for the given type
    for embed in embeds:
        mapping_pointer = mapping
        split_embed = embed.split('.')
        for idx, split_ in enumerate(split_embed):
            # see if this is last level of embedding- may be a field or object
            if idx == len(split_embed) - 1:
                if 'properties' in mapping_pointer and split_ in mapping_pointer['properties']:
                    final_mapping = mapping_pointer['properties']
                else:
                    final_mapping = mapping_pointer
                if split_ != '*':
                    assert split_ in final_mapping
                else:
                    assert 'properties' in final_mapping or final_mapping.get('type') == 'object'
            else:
                assert split_ in mapping_pointer['properties']
                mapping_pointer = mapping_pointer['properties'][split_]


def test_create_mapping_item_order(registry):
    # make sure every item type name is represented in the item ordering
    for i_type in registry[COLLECTIONS].by_item_type:
        # ignore "testing" types
        if i_type.startswith('testing_'):
            continue
        assert registry[COLLECTIONS][i_type].type_info.name in ITEM_INDEX_ORDER


class MockedCommandArgs:

    def __init__(self, wipe_es=None, skip=None, strict=None, clear_queue=None):
        self.wipe_es = wipe_es
        self.skip = skip
        self.strict = strict
        self.clear_queue = clear_queue


class MockedLog:

    def __init__(self):
        self.log = []

    def info(self, msg):
        self.log.append(('info', msg))

    def error(self, msg):
        self.log.append(('error', msg))


# These next are more extensively tested in dcicutils.
# This is just plausibility checking that we've received things OK.

@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-blue'))
def test_get_deployment_config_staging():
    """ Tests get_deployment_config in the new staging case """
    my_env = create_mapping_on_deploy.get_my_env('ignored-for-mock')
    assert my_env == 'fourfront-blue'
    cfg = CreateMappingOnDeployManager.get_deploy_config(env=my_env, args=MockedCommandArgs(), log=MockedLog())
    assert cfg['ENV_NAME'] == my_env  # sanity
    assert cfg['SKIP'] is False
    assert cfg['WIPE_ES'] is True
    assert cfg['STRICT'] is True


@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-green'))
def test_get_deployment_config_prod():
    """ Tests get_deployment_config in the new production case """
    my_env = create_mapping_on_deploy.get_my_env('ignored-for-mock')
    assert my_env == 'fourfront-green'
    with pytest.raises(RuntimeError):
        CreateMappingOnDeployManager.get_deploy_config(env=my_env, args=MockedCommandArgs(), log=MockedLog())


@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-hotseat'))
def test_get_deployment_config_hotseat():
    """ Tests get_deployment_config in the hotseat case with a new-style ecosystem. """
    my_env = create_mapping_on_deploy.get_my_env('ignored-for-mock')
    assert my_env == 'fourfront-hotseat'
    cfg = CreateMappingOnDeployManager.get_deploy_config(env=my_env, args=MockedCommandArgs(), log=MockedLog())
    assert cfg['ENV_NAME'] == my_env  # sanity
    assert cfg['SKIP'] is True  # The other values (WIPE_ES and STRICT) don't matter if this is set.

@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-mastertest'))
def test_get_deployment_config_mastertest():
    """ Tests get_deployment_config in the hotseat case with a new-style ecosystem. """
    my_env = create_mapping_on_deploy.get_my_env('ignored-for-mock')
    assert my_env == 'fourfront-mastertest'
    cfg = CreateMappingOnDeployManager.get_deploy_config(env=my_env, args=MockedCommandArgs(), log=MockedLog())
    assert cfg['ENV_NAME'] == my_env  # sanity
    assert cfg['SKIP'] is False
    assert cfg['WIPE_ES'] is True
    assert cfg['STRICT'] is False


class Simulation:

    def __init__(self, mocked_app, expect_check_first=False, expect_purge_queue=False, expect_strict=False):
        self.run_has_been_called = False
        self.mocked_app = mocked_app
        self.expect_check_first = expect_check_first
        self.expect_purge_queue = expect_purge_queue
        self.expect_strict = expect_strict

    def __str__(self):
        return ("<{cls} run {called} expecting cf={cf} pq={pq} es={es} {id}>"
                .format(cls=self.__class__.__name__, called="CALLED" if self.run_has_been_called else "UNCALLED",
                        cf=self.expect_check_first, pq=self.expect_purge_queue, es=self.expect_strict, id=id(self)))

    def __repr__(self):
        return self.__str__()

    def mocked_run_create_mapping(self, app, check_first=False, strict=False, purge_queue=False, item_order=None,
                                  **kwargs):
        self.run_has_been_called = True
        assert kwargs == {}, "mocked_run_create_mapping needs adjusting. It doesn't expect these keywords: %s" % kwargs
        assert app == self.mocked_app, "Mocked app was not as expected: %s" % app
        # check_first is (not WIPE_ES)
        assert check_first is self.expect_check_first, "check_first is not False: %s" % check_first
        # purge_queue is whether --clear-queue was in command args
        assert bool(purge_queue) is self.expect_purge_queue, (
                "bool(purge_queue) is not False. purge_queue=%s" % purge_queue)
        # This should be a constant for our purposes
        assert item_order == ITEM_INDEX_ORDER, "item_order was not as expected: %s" % item_order
        # strict is the STRICT argument
        assert strict is self.expect_strict, "strict is not False: %s" % strict


@patch('encoded.commands.create_mapping_on_deploy.log', MockedLog())
@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.run_create_mapping')
def test_run_create_mapping_production(mock_run_create_mapping, app):

    simulation = Simulation(mocked_app=app)  # Expectations don't matter because we're not expecting to get called.
    mocked_log = create_mapping_on_deploy.log
    try:
        mock_run_create_mapping.side_effect = simulation.mocked_run_create_mapping
        _run_create_mapping(app, MockedCommandArgs())
    except SystemExit as e:
        print(e)
        assert e.code == 1
    assert simulation.run_has_been_called is False
    assert mocked_log.log == [
        ('info', 'Environment fourfront-green is currently the production environment.'
                 ' Something is definitely wrong. We never deploy there, we always CNAME swap.'
                 ' This deploy cannot proceed. DeploymentFailure will be raised.'),
        ('error', 'Exception encountered while gathering deployment information or running create_mapping'),
        ('error', 'DeploymentFailure: Tried to run create_mapping_on_deploy on production.'),
    ]


@patch('encoded.commands.create_mapping_on_deploy.log', MockedLog())
@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-blue'))
@patch('encoded.commands.create_mapping_on_deploy.run_create_mapping')
def test_run_create_mapping_staging(mock_run_create_mapping, app):

    simulation = Simulation(mocked_app=app, expect_check_first=False, expect_purge_queue=False, expect_strict=True)
    mocked_log = create_mapping_on_deploy.log
    exit_condition = None
    try:
        mock_run_create_mapping.side_effect = simulation.mocked_run_create_mapping
        _run_create_mapping(app, MockedCommandArgs())
    except SystemExit as e:
        exit_condition = e
        print(exit_condition)
    except Exception as e:
        print("log =", mocked_log.log)
        raise AssertionError("Unexpected error exit (%s): %s" % (e.__class__.__name__, e))
    assert simulation.run_has_been_called is True
    assert mocked_log.log == [
        ('info', 'Environment fourfront-blue is currently the staging environment. Processing mode: STRICT,WIPE_ES'),
        ('info', 'Calling run_create_mapping for env fourfront-blue.')
    ]
    assert exit_condition, "Unexpected non-error exit."
    assert exit_condition.code == 0


@patch('encoded.commands.create_mapping_on_deploy.log', MockedLog())
@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-hotseat'))
@patch('encoded.commands.create_mapping_on_deploy.run_create_mapping')
def test_run_create_mapping_hotseat(mock_run_create_mapping, app):

    simulation = Simulation(mocked_app=app)  # Expectations don't matter because we're not expecting to get called.
    mocked_log = create_mapping_on_deploy.log
    try:
        mock_run_create_mapping.side_effect = simulation.mocked_run_create_mapping
        _run_create_mapping(app, MockedCommandArgs())
    except SystemExit as e:
        print(e)
        assert e.code == 0
    assert simulation.run_has_been_called is False
    assert mocked_log.log == [
        ('info', 'Environment fourfront-hotseat is a hotseat test environment. Processing mode: SKIP'),
        ('info', 'NOT calling run_create_mapping for env fourfront-hotseat.')
    ]


@patch('encoded.commands.create_mapping_on_deploy.log', MockedLog())
@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-mastertest'))
@patch('encoded.commands.create_mapping_on_deploy.run_create_mapping')
def test_run_create_mapping_mastertest(mock_run_create_mapping, app):

    simulation = Simulation(mocked_app=app, expect_check_first=False, expect_purge_queue=False, expect_strict=False)
    mocked_log = create_mapping_on_deploy.log
    try:
        mock_run_create_mapping.side_effect = simulation.mocked_run_create_mapping
        _run_create_mapping(app, MockedCommandArgs())
    except SystemExit as e:
        print(e)
        assert e.code == 0
    assert simulation.run_has_been_called is True
    assert mocked_log.log == [
        ('info', 'Environment fourfront-mastertest is a non-hotseat test environment. Processing mode: WIPE_ES'),
        ('info', 'Calling run_create_mapping for env fourfront-mastertest.')
    ]


@patch('encoded.commands.create_mapping_on_deploy.log', MockedLog())
@patch('dcicutils.deployment_utils.compute_ff_prd_env', MagicMock(return_value='fourfront-green'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-mastertest'))
@patch('encoded.commands.create_mapping_on_deploy.run_create_mapping')
def test_run_create_mapping_mastertest_with_clear_queue(mock_run_create_mapping, app):

    simulation = Simulation(mocked_app=app, expect_check_first=False, expect_purge_queue=True, expect_strict=False)
    mocked_log = create_mapping_on_deploy.log
    try:
        mock_run_create_mapping.side_effect = simulation.mocked_run_create_mapping
        _run_create_mapping(app, MockedCommandArgs(clear_queue=True))
    except SystemExit as e:
        print(e)
        assert e.code == 0
    assert simulation.run_has_been_called is True
    assert mocked_log.log == [
        ('info', 'Environment fourfront-mastertest is a non-hotseat test environment. Processing mode: WIPE_ES'),
        ('info', 'Calling run_create_mapping for env fourfront-mastertest.')
    ]


@patch("snovault.elasticsearch.indexer_queue.QueueManager.add_uuids")
def test_run_create_mapping_with_upgrader(mock_add_uuids, testapp, workbook):
    """
    Test for catching items in need of upgrading when running
    create_mapping.

    Indexer queue method mocked to check correct calls, so no items
    actually indexed/upgraded.
    """
    app = testapp.app
    type_to_upgrade = "Biosample"

    import pdb; pdb.set_trace()
    search_query = "/search/?type=" + type_to_upgrade + "&frame=object"
    search = testapp.get(search_query, status=200).json["@graph"]
    item_type_uuids = sorted([x["uuid"] for x in search])

    # No schema version change, so nothing needs indexing
    run_create_mapping(app, check_first=True)
    (_, uuids_to_index), _ = mock_add_uuids.call_args
    assert not uuids_to_index

    # Change schema version in registry so all posted items of this type
    # "need" to be upgraded
    registry_schema = app.registry[TYPES][type_to_upgrade].schema
    schema_version_default = registry_schema["properties"]["schema_version"]["default"]
    updated_schema_version = str(int(schema_version_default) + 1)
    registry_schema["properties"]["schema_version"]["default"] = updated_schema_version

    run_create_mapping(app, check_first=True)
    (_, uuids_to_index), _ = mock_add_uuids.call_args
    assert sorted(uuids_to_index) == item_type_uuids

    # Revert item type schema version
    registry_schema["properties"]["schema_version"]["default"] = schema_version_default
