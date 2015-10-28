from contentbase import (
    calculated_property,
    collection,
    load_schema,
)
from pyramid.security import Authenticated
from .base import (
    Item,
    paths_filtered_by_status,
)


class Donor(Item):
    base_types = ['Donor'] + Item.base_types
    embedded = ['organism']
    name_key = 'accession'
    rev = {
        'characterizations': ('DonorCharacterization', 'characterizes'),
    }

    @calculated_property(schema={
        "title": "Characterizations",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "DonorCharacterization.characterizes",
        },
    })
    def characterizations(self, request, characterizations):
        return paths_filtered_by_status(request, characterizations)


@collection(
    name='mouse-donors',
    acl=[],
    properties={
        'title': 'Mouse donors',
        'description': 'Listing Biosample Donors',
    })
class MouseDonor(Donor):
    item_type = 'mouse_donor'
    schema = load_schema('encoded:schemas/mouse_donor.json')
    embedded = Donor.embedded + ['references']

    def __ac_local_roles__(self):
        # Disallow lab submitter edits
        return {Authenticated: 'role.viewing_group_member'}


@collection(
    name='fly-donors',
    properties={
        'title': 'Fly donors',
        'description': 'Listing Biosample Donors',
    })
class FlyDonor(Donor):
    item_type = 'fly_donor'
    schema = load_schema('encoded:schemas/fly_donor.json')
    embedded = ['organism', 'constructs', 'constructs.target']


@collection(
    name='worm-donors',
    properties={
        'title': 'Worm donors',
        'description': 'Listing Biosample Donors',
    })
class WormDonor(Donor):
    item_type = 'worm_donor'
    schema = load_schema('encoded:schemas/worm_donor.json')
    embedded = ['organism', 'constructs', 'constructs.target']


@collection(
    name='human-donors',
    properties={
        'title': 'Human donors',
        'description': 'Listing Biosample Donors',
    })
class HumanDonor(Donor):
    item_type = 'human_donor'
    schema = load_schema('encoded:schemas/human_donor.json')
    embedded = Donor.embedded + ['references']
