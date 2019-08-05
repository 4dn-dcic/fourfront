from pyramid.settings import asbool
from pyramid.view import view_config
from defusedxml.ElementTree import fromstring
from datetime import datetime


def includeme(config):
    config.add_route('process-pedigree', '/process-pedigree')
    config.scan(__name__)


# in form: <proband field>: <cgap field>
PROBAND_MAPPING = {
    'person': {
        'item_type': 'Individual',
        'fields': {
            'sex': {
                'item_field': 'sex'
            },
            'deceased': {
                'item_field': 'life_status',
                'condition': lambda v: 'alive' if v['deceased'] == '0' else 'deceased'
            },
            # TODO: fix. This is NOT right, need timestamp from XML
            'age': {
                'item_field': 'birth_year',
                'condition': lambda v: datetime.utcnow().year - int(v['age']) if v['ageUnits'] == 'Y' else 9999
            },
            'mother': {},
            'father': {}
        }
    }
}


def etree_to_dict(ele, ref_field='', ref_container=None):
    """
    Helper function to recursively parse ElementTree (XML) to Python objects.
    Follows the following rules:
    - Creates a dictionary for the element if it has children or attributes
    - If multiple children share the same tag, they will be a list
    - If only one child uses a tag, it will not be a list
    - If an element is a dict, text will be added as a key named the same
    - If an element has no children or attributes, text will be returned as
        as string. If no text, return None

    Additionally, if a ref_list is provided, will add elements with a
    `managedObjectID` value

    Args:
        ele (defusedxml.Element): root Element in the ElementTree
        ref_field (str): if provided, add elements containing this reference
            field to `ref_container`. Default is empty string (i.e. not used)
        ref_container (dict): keep referenced items found in tree. Keyed
            by element tag. Must also set `ref_field` to work. Default None

    Returns:
        dict: representation of the XML
    """
    ret = None
    # represent the element with a dict if there are children or attributes
    children = ele.getchildren()
    if children or ele.attrib:
        ret = {}
        for child in children:
            if child.tag in ret:
                # make into a list
                if not isinstance(ret[child.tag], list):
                    ret[child.tag] = [ret[child.tag]]
                ret[child.tag].append(etree_to_dict(child, ref_field, ref_container))
            else:
                ret[child.tag] = etree_to_dict(child, ref_field, ref_container)
        ret.update(('@' + k, v) for k, v in ele.attrib.items())

        # handle reference storage
        if ref_field and ref_container is not None and ref_field in ret:
            if ele.tag not in ref_container:
                ref_container[ele.tag] = {}
            ref_container[ele.tag][ret[ref_field]] = ret

    # text is either added to the dictionary or used as terminal element
    if ele.text:
        if ret:
            ret['text'] = ele.text
        else:
            return ele.text
    return ret


# @view_config(route_name='process-pedigree', request_method='POST', permission="add")
@view_config(route_name='process-pedigree', request_method='POST')
def process_pedigree(request):
    """
    TODO: verify permission

    On Case: ...
        "families": {
            "title": "Families",
            "type": "array",
            "uniqueItems": true,
            "items" : {
                "title": "Family",
                "type": "object",
                "properties": {
                    "members": {
                        "title" : "Members",
                        "description": "Family members",
                        "type" : "array",
                        "items": {
                            "title": "Member",
                            "type": "string",
                            "linkTo": "Individual"
                        }
                    },
                    "proband": {
                        "title" : "Member",
                        "description": "Proband member of the family",
                        "type" : "string",
                        "linkTo" : "Individual"
                    },
                    "original_pedigree": {
                        "title" : "Original Pedigree File",
                        "description": "The original pedigree file used for this family",
                        "type" : "string",
                        "linkTo": "Document"
                    }
                }
            }
        }

    Example usage:
    headers = {'Content-Type': 'application/xml'}
    with open(<filepath>, 'rb') as f:
        requests.post('http://localhost:8000/process-pedigree', data=f, headers=headers)
    """
    response = {'title': 'Pedigree Processing', 'family': {}}
    dry_run = asbool(request.params.get('dry_run', False))
    filename = request.params.get('filename', None)
    # `fromstring` creates an Element tree and returns root Element
    refs = {}
    xml_data = etree_to_dict(fromstring(request.body), 'managedObjectID', refs)
    import json
    import pdb; pdb.set_trace()
    jres = json.dumps(xml_data)
    return response
