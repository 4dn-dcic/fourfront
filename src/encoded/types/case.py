from snovault import (
    calculated_property,
    collection,
    load_schema,
    CONNECTION,
    COLLECTIONS,
    display_title_schema
)
from .base import (
    Item,
    get_item_if_you_can
)
from pyramid.httpexceptions import HTTPUnprocessableEntity
from pyramid.view import view_config
from datetime import datetime
import structlog


log = structlog.getLogger(__name__)


@collection(
    name='cases',
    unique_key='accession',
    properties={
        'title': 'Cases',
        'description': 'Listing of Cases',
    })
class Case(Item):
    item_type = 'case'
    name_key = 'accession'
    schema = load_schema('encoded:schemas/case.json')
    embedded_list = [
        "families.members.sex",
        "families.members.father",
        "families.members.mother",
        "families.members.status",
        "families.members.accession",
        "families.members.is_deceased"
    ]

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, title):
        return title


@view_config(name='process-pedigree', context=Case, request_method='PATCH',
             permission='edit')
def process_pedigree(context, request):
    """
    Endpoint to handle creation of a family of individuals provided a pedigree
    file. Uses a webtest TestApp to handle POSTing and PATCHing items.
    The request.json contains attachment information and file content.

    Currently, only handles XML input formatted from the Proband app.
    This endpoint takes the following options, provided through request params:
    - config_uri: should be 'development.ini' for dev, else 'production.ini'

    Response dict contains the newly created family, as well as the up-to-date
    Case properties.

    Args:
        request (Request): the current request. Attachment data should be
            given in the request JSON.

    Returns:
        dict: reponse, including 'status', and 'case' and 'family' on success

    Raises:
        HTTPUnprocessableEntity: on an error. Extra information may be logged
    """
    import mimetypes
    from pyramid.paster import get_app
    from webtest import TestApp
    from base64 import b64encode
    from defusedxml.ElementTree import fromstring

    case = str(context.uuid)  # used in logging

    # verify that attachment data in request.json has type and href
    if not {'download', 'type', 'href'} <= set(request.json.keys()):
        raise HTTPUnprocessableEntity('Case %s: Request JSON must include following'
                                      ' keys: download, type, href. Found: %s'
                                      % (case, request.json.keys()))
    # verification on the attachment. Currently only handle .pbxml
    # pbxml uploads don't get `type` attribute from <input> element
    if request.json['type'] != '' or not request.json['download'].endswith('.pbxml'):
        raise HTTPUnprocessableEntity('Case %s: Bad pedigree file upload. Use .pbxml'
                                      ' file. Found: %s (file type), %s (file name)'
                                      % (case, request.json['type'], request.json['download']))

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

    # parse XML and create family by two rounds of POSTing/PATCHing individuals
    response = {'title': 'Pedigree Processing'}
    refs = {}
    try:
        xml_data = etree_to_dict(fromstring(request.json['href']), refs, 'managedObjectID')
    except Exception as exc:
        response['status'] = 'failure'
        response['detail'] = 'Error parsing pedigree XML: %s' % str(exc)
        return response

    case_props = context.upgrade_properties()
    extra_attrs = {'project': case_props['project'],
                   'institution': case_props['institution']}

    family = create_family_proband(testapp, xml_data, refs, 'managedObjectID',
                                   case, extra_attrs)
    response['family'] = family
    family_uuids = {'members': [mem['uuid'] for mem in family['members']],
                    'proband': family['proband']['uuid'] if family.get('proband') else None}

    # create Document for input file
    # pbxml files are not handled by default. Do some mimetype processing
    mimetypes.add_type('application/proband+xml', '.pbxml')
    use_type = 'application/proband+xml'
    data_href = 'data:%s;base64,%s' % (use_type, b64encode(request.json['href'].encode()).decode('ascii'))
    attach = {'attachment': {'download': request.json['download'],
                             'type': use_type, 'href': data_href}}
    attach.update(extra_attrs)
    try:
        attach_res = testapp.post_json('/Document', attach)
        assert attach_res.status_code == 201
    except Exception as exc:
        log.error('Failure to POST Document in process-pedigree! Exception: %s' % exc)
        error_msg = ('Case %s: Error encountered on POST in process-pedigree.'
                     ' Check logs. These items were already created: %s'
                     % (case, family_uuids['members']))
        raise HTTPUnprocessableEntity(error_msg)
    attach_uuid = attach_res.json['@graph'][0]['uuid']
    family['original_pedigree'] = attach_res.json['@graph'][0]
    family_uuids['original_pedigree'] = attach_uuid

    # PATCH the Case with new family
    case_families = case_props.get('families', []) + [family_uuids]
    case_patch = {'families': case_families}
    try:
        case_res = testapp.patch_json('/' + case, case_patch)
        assert case_res.status_code == 200
    except Exception as exc:
        log.error('Failure to PATCH Case %s in process-pedigree with '
                  'data %s! Exception: %s' % (case, case_patch, exc))
        error_msg = ('Case %s: Error encountered on PATCH in process-pedigree.'
                     ' Check logs. These items were already created: %s'
                     % (case, family_uuids['members'] + [attach_uuid]))
        raise HTTPUnprocessableEntity(error_msg)

    response['case'] = case_res.json['@graph'][0]
    response['status'] = 'success'
    return response


#####################################
### Pedigree processing functions ###
#####################################


def descendancy_xml_ref_to_parents(ref_id, refs, case, uuids_by_ref):
    """
    This is a `xml_ref_fxn`, so it must take the correpsonding args in the
    standardized way and return a dictionary that is used to update the
    object to be POSTed/PATCHed.

    Helper function to use specifically with `descendacy` object reference
    in input XML. Uses the string reference id and input dictionary of refs
    to find the object, look up parents based off of gender, and return
    them in a standardized way.

    Args:
        ref_id (str): value for the reference field of the relevant xml obj
        refs: (dict): reference-based parsed XML data
        case (str): identifier of the case
        uuids_by_ref (dict): mapping of Fourfront uuids by xml ref

    Returns:
        dict: results used to update the Fourfront metadata in progress
    """
    result = {'mother': None, 'father': None}
    error_msg = None
    relationship = refs[ref_id]
    parents = relationship.get('members', [])
    if len(parents) != 2:
        error_msg = ('Case %s: Failure to parse two parents from relationship '
                     'ref %s in process-pedigree. Contents: %s'
                     % (case, ref_id, relationship))
    for parent in parents:
        parent_obj = refs[parent['@ref']]
        if parent_obj['sex'].lower() == 'm':
            result['father'] = uuids_by_ref[parent['@ref']]
        elif parent_obj['sex'].lower() == 'f':
            result['mother'] = uuids_by_ref[parent['@ref']]
    if error_msg is None and (not result['mother'] or not result['father']):
        error_msg = ('Case %s: Failure to get valid mother and father from XML'
                     'for relationship ref %s in process-pedigree. Parent refs: %s'
                     % (case, ref_id, parents))
    if error_msg:
        log.error(error_msg)
        raise HTTPUnprocessableEntity(error_msg)
    return result


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


def create_family_proband(testapp, xml_data, refs, ref_field, case, extra=None):
    """
    Proband-specific object creation protocol. We can expand later on

    General process (in development):
    - POST individuals with required fields and attribution (in `extra` input)
    - PATCH non-required fields

    Can be easily extended by adding tuples to `to_convert` dict

    Args:
        testapp (webtest.TestApp): test application for posting/patching
        xml_data (dict): parsed XMl data, probably from `etree_to_dict`
        refs: (dict): reference-based parsed XML data
        ref_field (str): name of reference field from the XML data
        case (str): identifier of the case
        extra (dict): keys/values given in the arg are added to POST

    Returns:
        dict: family created, including members and proband with full context
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
            if extra is not None:
                data.update(extra)
            for xml_key in xml_obj:
                converted = PROBAND_MAPPING[item_type].get(xml_key)
                if converted is None:
                    log.warn('Unknown field %s for %s in process-pedigree!' % (xml_key, item_type))
                    continue
                if round == 'first':
                    if converted.get('linked', False) is True:
                        continue
                    data[converted['corresponds_to']] = converted['value'](xml_obj)
                else:
                    if converted.get('linked', False) is False:
                        continue
                    ref_val = converted['value'](xml_obj)
                    # more complex function based on xml refs needed
                    if 'xml_ref_fxn' in converted and ref_val:
                        result = converted['xml_ref_fxn'](ref_val, refs, case, uuids_by_ref)
                        data.update(result)
                    elif ref_val:
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
        },
        'descendancy': {
            'xml_ref_fxn': descendancy_xml_ref_to_parents,
            'value': lambda v: v['descendancy']['@ref'] if v.get('descendancy') else None,
            'linked': True
        }
    }
}
