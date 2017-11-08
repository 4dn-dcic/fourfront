"""The type file for the collection Individual (Encode Donor)."""
from snovault import (
    abstract_collection,
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
from .base import (
    Item
    # paths_filtered_by_status,
)


@abstract_collection(
    name='microscope-settings',
    properties={
        'title': "Microscope Settings",
        'description': 'Collection of Metadata for microscope settings.',
    })
class MicroscopeSetting(Item):
    """the base class for microscope settings collection."""
    base_types = ['MicroscopeSetting'] + Item.base_types
    schema = load_schema('encoded:schemas/microscope_setting.json')
    embedded_list = []


@collection(
    name='microscope-settings-a1',
    properties={
        'title': "Microscope Settings Tier A1",
        'description': 'Collection of Metadata for microscope settings of Tier A1 microscopy files.',
    })
class MicroscopeSettingA1(MicroscopeSetting):
    """the sub class of microscope settings for tier A1 files."""
    item_type = 'microscope_setting_a1'
    schema = load_schema('encoded:schemas/microscope_setting_a1.json')
    embedded_list = MicroscopeSetting.embedded_list


@collection(
    name='microscope-settings-a2',
    properties={
        'title': "Microscope Settings Tier A2",
        'description': 'Collection of Metadata for microscope settings of Tier A2 microscopy files.',
    })
class MicroscopeSettingA2(MicroscopeSetting):
    """the sub class of microscope settings for tier A2 files."""
    item_type = 'microscope_setting_a2'
    schema = load_schema('encoded:schemas/microscope_setting_a2.json')
    embedded_list = MicroscopeSetting.embedded_list


@collection(
    name='microscope-settings-d1',
    properties={
        'title': "Microscope Settings Tier D1",
        'description': 'Collection of Metadata for microscope settings of Tier D1 microscopy files.',
    })
class MicroscopeSettingD1(MicroscopeSetting):
    """the sub class of microscope settings for tier D1 files."""
    item_type = 'microscope_setting_d1'
    schema = load_schema('encoded:schemas/microscope_setting_d1.json')
    embedded_list = MicroscopeSetting.embedded_list


@collection(
    name='microscope-settings-d2',
    properties={
        'title': "Microscope Settings Tier D2",
        'description': 'Collection of Metadata for microscope settings of Tier D2 microscopy files.',
    })
class MicroscopeSettingD2(MicroscopeSetting):
    """the sub class of microscope settings for tier D2 files."""
    item_type = 'microscope_setting_d2'
    schema = load_schema('encoded:schemas/microscope_setting_d2.json')
    embedded_list = MicroscopeSetting.embedded_list
