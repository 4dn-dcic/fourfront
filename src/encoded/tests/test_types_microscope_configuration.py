import pytest
from ..schema_formats import is_uuid

pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]

@pytest.fixture
def tier1_microscope_configuration(testapp):
    item = {
        'uuid': 'e700e61c-9da5-465f-9b4f-189852897df5',
        'microscope': {
            'Tier': 1,
            'ValidationTier': 1,
            'Name': 'Test Mic. Conf.'
        }
    }
    return testapp.post_json('/microscope-configurations', item).json['@graph'][0]

def test_get_tier1_microscope(testapp, tier1_microscope_configuration):
    assert tier1_microscope_configuration['microscope']['Tier'] == 1
    assert tier1_microscope_configuration['microscope']['ValidationTier'] == 1
    assert is_uuid(tier1_microscope_configuration['microscope']['ID'])


def test_tier1_microscope_display_title(testapp, tier1_microscope_configuration):
    assert tier1_microscope_configuration['display_title'] == 'Test Mic. Conf.'
    tier1_microscope_configuration['microscope']['Name'] = 'Test Mic. Conf. Updated'
    res = testapp.patch_json(tier1_microscope_configuration['@id'], {
                             'microscope': tier1_microscope_configuration['microscope']}, status=200)
    assert res.json['@graph'][0].get(
        'display_title') == 'Test Mic. Conf. Updated'
