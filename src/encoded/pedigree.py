from pyramid.settings import asbool
from pyramid.view import view_config
from defusedxml.ElementTree import fromstring
from datetime import datetime
from .types.base import get_item_if_you_can
from pyramid.httpexceptions import HTTPUnprocessableEntity
import structlog
import transaction


log = structlog.getLogger(__name__)


def includeme(config):
    config.add_route('process-pedigree', '/process-pedigree')
    config.scan(__name__)


# in form: <proband field>: <cgap field>
# fields unused by CGAP use 'corresponds_to': None
# extract @ref values for connected objects in the first round
PROBAND_MAPPING = {
    'Individual': {
        'sex': {
            'corresponds_to': 'sex',
            'value': lambda v: v['sex'].upper()
        },
        'deceased': {
            'corresponds_to': 'is_deceased',
            'value': lambda v: True if v['deceased'] == '1' else False
        },
        # TODO: fix. This is NOT right, need timestamp from XML
        'age': {
            'corresponds_to': 'birth_year',
            'value': lambda v: datetime.utcnow().year - int(v['age']) if v['age'] and v['ageUnits'] == 'Y' else 9999
        },
        'stillBirth': {
            'corresponds_to': 'is_still_birth',
            'value': lambda v: True if v['stillBirth'] == '1' else False
        },
        # TODO: can you have more than one of these fields?
        'explicitlySetBiologicalFather': {
            'corresponds_to': 'father',
            'value': lambda v: v['explicitlySetBiologicalFather']['@ref'] if v['explicitlySetBiologicalFather'] else None,
            'linked': True
        },
        'explicitlySetBiologicalMother': {
            'corresponds_to': 'mother',
            'value': lambda v: v['explicitlySetBiologicalMother']['@ref'] if v['explicitlySetBiologicalMother'] else None,
            'linked': True
        }
    }
}


def etree_to_dict(ele, ref_container=None, ref_field=''):
    """
    Helper function to recursively parse ElementTree (XML) to Python objects.
    Follows the following rules:
    - Creates a dictionary for the element if it has children or attributes
    - If an element has children and no other attributes/text, it will be used
        as a wrapper object and collapsed to contain its children directly
    - If multiple children share the same tag, they will be a list
    - If only one child uses a tag, it will not be a list
    - If an element is a dict, text will be added as a key named the same
    - If an element has no children or attributes, text will be returned as
        as string. If no text, return None

    Additionally, if a ref_container is provided, will add elements with a
    `managedObjectID` value

    Args:
        ele (defusedxml.Element): root Element in the ElementTree
        ref_container (dict): keep referenced items found in tree. Keyed
            by reference value. Must also set `ref_field` to work. Default None
        ref_field (str): if provided, add elements containing this reference
            field to `ref_container`. Default is empty string (i.e. not used)

    Returns:
        dict: representation of the XML
    """
    ret = None

    # represent the element with a dict if there are children or attributes
    children = ele.getchildren()
    if children or ele.attrib:
        ret = {}
        # add child elements and attributes from this element
        for child in children:
            if child.tag in ret:
                # make into a list
                if not isinstance(ret[child.tag], list):
                    ret[child.tag] = [ret[child.tag]]
                ret[child.tag].append(etree_to_dict(child, ref_container, ref_field))
            else:
                ret[child.tag] = etree_to_dict(child, ref_container, ref_field)
        ret.update(('@' + k, v) for k, v in ele.attrib.items())

        # handle reference storage
        if ref_field and ref_container is not None and ref_field in ret:
            ref_container[ret[ref_field]] = ret

    # text is either added to the dictionary or used as terminal element
    if ele.text:
        if ret:
            ret['text'] = ele.text
        else:
            return ele.text

    # if children are the only contents of this level, collapse
    if children and len(ret) == 1:
        return ret[list(ret)[0]]

    return ret


def create_family_proband(testapp, xml_data, refs, ref_field, case):
    """
    Proband-specific object creation protocol. We can expand later on

    General process (in development):
    - POST individuals with required fields
    - PATCH non-required fields
    -

    Can be easily extended by adding tuples to `to_convert` dict
    """
    # key family members by uuid
    family_members = {}
    uuids_by_ref = {}
    proband = None
    errors = []
    xml_type = 'people'
    item_type = 'Individual'
    for round in ['first', 'second']:
        for xml_obj in xml_data.get(xml_type, []):
            ref = xml_obj.get(ref_field)
            if not ref:  # element does not have a managed ID
                continue
            data = {}
            for xml_key in xml_obj:
                converted = PROBAND_MAPPING[item_type].get(xml_key)
                if converted is None:
                    log.warn('Unknown field %s for %s in process-pedigree!'
                              % (xml_key, item_type))
                    continue
                if round == 'first':
                    if converted.get('linked', False) is True:
                        continue
                    data[converted['corresponds_to']] = converted['value'](xml_obj)
                else:
                    if converted.get('linked', False) is False:
                        continue
                    ref_val = converted['value'](xml_obj)
                    if ref_val:
                        data[converted['corresponds_to']] = uuids_by_ref[ref_val]
            # POST if first round
            if round == 'first':
                try:
                    # post_res = post_item_snovault(request, item_type, data)
                    post_res = testapp.post_json('/' + item_type, data)
                    assert post_res.status_code == 201
                except Exception as exc:
                    log.error('Failure to POST %s in process-pedigree with '
                              'data %s! Exception: %s' % (item_type, data, exc))
                    error_msg = ('Case %s: Error encountered on POST in process-pedigree.'
                                 ' Check logs. These items were already created: %s'
                                 % (case, list(uuids_by_ref.values())))
                    raise HTTPUnprocessableEntity(error_msg)
                else:
                    idv_props = post_res.json['@graph'][0]
                    uuids_by_ref[ref] = idv_props['uuid']

            # PATCH if second round, with adding uuid to the data
            if round == 'second' and data:
                try:
                    patch_res = testapp.patch_json('/' + uuids_by_ref[ref], data)
                    # patch_res = patch_item_snovault(request, item_type, uuids_by_ref[ref], data)
                    assert patch_res.status_code == 200
                except Exception as exc:
                    log.error('Failure to PATCH %s in process-pedigree with '
                              'data %s! Exception: %s' % (uuids_by_ref[ref], data, exc))
                    error_msg = ('Case %s: Error encountered on PATCH in process-pedigree.'
                                 ' Check logs. These items were already created: %s'
                                 % (case, list(uuids_by_ref.values())))
                    raise HTTPUnprocessableEntity(error_msg)
                else:
                    idv_props = patch_res.json['@graph'][0]

            # update members info on POST or PATCH
            family_members[idv_props['uuid']] = idv_props
            # update proband only on first round (not all items hit in second)
            if round == 'first' and xml_obj.get('proband') == '1':
                if proband and idv_props['uuid'] != proband:
                    log.error('Case %s: Multiple probands found! %s conflicts with %s'
                              % (idv_props['uuid'], proband))
                else:
                    proband = idv_props['uuid']

    # process into family structure
    family = {'members': [v for v in family_members.values()]}
    if proband and proband in family_members:
        family['proband'] = family_members[proband]
    else:
        log.error('Case %s: No proband found for family %s' % family)
    return family



# @view_config(route_name='process-pedigree', request_method='POST', permission="add")
@view_config(route_name='process-pedigree', request_method='POST')
def process_pedigree(request):
    """
    """
    # use a TestApp for POSTing/PATCHing within the request
    from pyramid.paster import get_app
    from webtest import TestApp
    config_uri = request.params.get('config_uri', 'production.ini')
    app = get_app(config_uri, 'app')
    # get user email for TestApp authentication
    email = getattr(request, '_auth0_authenticated', None)
    if not email:
        user_uuid = None
        for principal in request.effective_principals:
            if principal.startswith('userid.'):
                user_uuid = principal[7:]
                break
        if not user_uuid:
            raise HTTPUnprocessableEntity('Case %s: Must provide authentication' % case)
        user_props = get_item_if_you_can(request, user_uuid)
        email = user_props['email']
    environ = {'HTTP_ACCEPT': 'application/json', 'REMOTE_USER': email}
    testapp = TestApp(app, environ)

    response = {'title': 'Pedigree Processing'}
    filename = request.params.get('filename')
    case = request.params.get('case', 'new Case')
    if case != 'new Case':
        try:
            case_res = testapp.get('/%s?frame=object' % case)
            assert case_res.status_code == 200
        except Exception as exc:
            log.error('Failure to GET Case in process-pedigree with '
                      'identifier %s! Exception: %s' % (case, exc))
            error_msg = ('Case %s: Error encountered on GET for case in '
                         'process-pedigree. Check logs.' % case)
            raise HTTPUnprocessableEntity(error_msg)
        else:
            case_props = case_res.json
    else:
        case_props = None

    # parse XML and create family by two rounds of POSTing/PATCHing individuals
    refs = {}
    try:
        xml_data = etree_to_dict(fromstring(request.body), refs, 'managedObjectID')
    except Exception as exc:
        response['status'] = 'failure'
        response['detail'] = 'Error parsing pedigree XML: %s' % str(exc)
        return response

    family = create_family_proband(testapp, xml_data, refs, 'managedObjectID', case)
    response['family'] = family
    family_uuids = {'members': [mem['uuid'] for mem in family['members']],
                    'proband': family['proband']['uuid'] if family.get('proband') else None}

    # POST or PATCH the Case with new family
    if case_props is not None:  # PATCH
        case_families = case_props.get('families', []) + [family_uuids]
        case_patch = {'families': case_families}
        try:
            case_res = testapp.patch_json('/' + case_props['uuid'], case_patch)
            assert case_res.status_code == 200
        except Exception as exc:
            log.error('Failure to PATCH Case %s in process-pedigree with '
                      'data %s! Exception: %s' % (case_props['uuid'], case_patch, exc))
            error_msg = ('Case %s: Error encountered on PATCH in process-pedigree.'
                         ' Check logs. These items were already created: %s'
                         % (case, family_uuids['members']))
            raise HTTPUnprocessableEntity(error_msg)
    else:  # POST
        case_families = [family_uuids]
        case_post = {'title': 'Auto-generated Case', 'families': case_families,
                     'project': '12a92962-8265-4fc0-b2f8-cf14f05db58b',
                     'institution': '828cd4fe-ebb0-4b36-a94a-d2e3a36cc989'}
        try:
            case_res = testapp.post_json('/Case', case_post)
            assert case_res.status_code == 201
        except Exception as exc:
            log.error('Failure to POST Case in process-pedigree with '
                      'data %s! Exception: %s' % (case_post, exc))
            error_msg = ('Case %s: Error encountered on POST in process-pedigree.'
                         ' Check logs. These items were already created: %s'
                         % (case, family_uuids['members']))
            raise HTTPUnprocessableEntity(error_msg)

    response['case'] = case_res.json['@graph'][0]
    response['status'] = 'success'
    return response
