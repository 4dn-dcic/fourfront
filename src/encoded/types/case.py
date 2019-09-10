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
from dateutil.relativedelta import relativedelta
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
        "families.members.accession",
        "families.members.father",
        "families.members.mother",
        "families.members.status",
        "families.members.sex",
        "families.members.is_deceased",
        "families.members.is_pregnancy",
        "families.members.is_termination_of_pregnancy",
        "families.members.is_spontaneous_abortion",
        "families.members.is_still_birth",
        "families.members.cause_of_death",
        "families.members.age_at_death",
        "families.members.age_at_death_units",
        "families.members.is_no_children_by_choice",
        "families.members.is_infertile",
        "families.members.cause_of_infertility",
        "families.members.ethnicity",
        "families.members.clinic_notes",
        "families.members.phenotypic_features.phenotypic_feature",
        "families.members.phenotypic_features.onset_age",
        "families.members.phenotypic_features.onset_age_units",
        "families.members.samples.status",
        "families.members.samples.processed_files",
        "families.members.samples.files"
    ]

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, title):
        return title

    @calculated_property(schema={
        "title": "Phenotypic features",
        "description": "Phenotypic features that define the case",
        "type" : "array",
        "items": {
            "title": "Phenotypic feature",
            "type": "string",
            "linkTo": "Phenotype"
        }
    })
    def case_phenotypic_features(self, families=None):
        """
        Calc property that uses `family_phenotypic_features` from each family
        and creates a overall list of phenotypic features shared between
        all families. Returns a list of Phenotypes @id values
        """
        if not families:
            return []
        case_feats = set()
        for fam in families:
            case_feats.update(set(fam.get('family_phenotypic_features', [])))
        return list(case_feats)


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
    # temporary: there seem to be buildout installation problems w defusedxml
    try:
        from defusedxml.ElementTree import fromstring
    except ImportError:
        from xml.etree.ElementTree import fromstring

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
    # TODO: get pedigree timestamp dynamically, maybe from query_params
    # ped_timestamp = request.params.get('timestamp')
    ped_datetime = datetime.utcnow()
    ped_timestamp = ped_datetime.isoformat() + '+00:00'
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

    # add "affected" metadata to refs for easy access
    family_pheno_feats = []
    for meta_key, meta_val in xml_data.get('meta', {}).items():
        if meta_key.startswith('affected'):
            refs[meta_key] = meta_val
            if meta_val.get('id') and meta_val.get('ontology') == 'HPO':
                family_pheno_feats.append(meta_val['id'])

    # extra values that are used when creating the pedigree
    case_props = context.upgrade_properties()
    post_extra = {'project': case_props['project'],
                  'institution': case_props['institution']}
    xml_extra = {'ped_datetime': ped_datetime}

    family = create_family_proband(testapp, xml_data, refs, 'managedObjectID',
                                   case, post_extra, xml_extra)
    family_uuids = {'members': [mem['uuid'] for mem in family['members']],
                    'proband': family['proband']['uuid'] if family.get('proband') else None}

    # create Document for input pedigree file
    # pbxml files are not handled by default. Do some mimetype processing
    mimetypes.add_type('application/proband+xml', '.pbxml')
    use_type = 'application/proband+xml'
    data_href = 'data:%s;base64,%s' % (use_type, b64encode(request.json['href'].encode()).decode('ascii'))
    attach = {'attachment': {'download': request.json['download'],
                             'type': use_type, 'href': data_href}}
    attach.update(post_extra)
    try:
        attach_res = testapp.post_json('/Document', attach)
        assert attach_res.status_code == 201
    except Exception as exc:
        log.error('Failure to POST Document in process-pedigree! Exception: %s' % exc)
        error_msg = ('Case %s: Error encountered on POST in process-pedigree.'
                     ' Check logs. These items were already created: %s'
                     % (case, family_uuids['members']))
        raise HTTPUnprocessableEntity(error_msg)

    # add extra fields to the family object
    attach_uuid = attach_res.json['@graph'][0]['uuid']
    family['original_pedigree'] = attach_res.json['@graph'][0]
    family_uuids['original_pedigree'] = attach_uuid
    family['timestamp'] = family_uuids['timestamp'] = ped_timestamp
    if xml_data.get('meta', {}).get('notes'):
        family['clinic_notes'] = family_uuids['clinic_notes'] = xml_data['meta']['notes']
    ped_src = 'Proband app'
    if xml_data.get('meta', {}).get('version'):
        ped_src += (' ' + xml_data['meta']['version'])
    family['pedigree_source'] = family_uuids['pedigree_source'] = ped_src
    family['family_phenotypic_features'] = []
    family_uuids['family_phenotypic_features'] = []
    for hpo_id in family_pheno_feats:
        try:
            pheno_res = testapp.get('/phenotypes/' + hpo_id, status=200).json
        except Exception as exc:
            error_msg = ('Case %s: Cannot GET family feature %s. Error: %s'
                         % (case, hpo_id, str(exc)))
            log.error(error_msg)
            # HACKY. Skip raising this error if local
            if config_uri == 'production.ini':
                raise HTTPUnprocessableEntity(error_msg)
        else:
            family['family_phenotypic_features'].append(pheno_res)
            family_uuids['family_phenotypic_features'].append(pheno_res['uuid'])

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
    response['family'] = family
    response['status'] = 'success'
    return response


#####################################
### Pedigree processing functions ###
#####################################


def convert_age_units(age_unit):
    """
    Simple function to convert proband age units to cgap standard

    Args:
        age_unit (str): proband age unit

    Return:
        str: cgap age unit
    """
    convert_dict = {
        "d": "day",
        "w": "week",
        "m": "month",
        "y": "year"
    }
    return convert_dict[age_unit.lower()]


def age_to_birth_year(xml_obj):
    """
    Simple conversion function that takes an individual from the xml and
    converts age to birth year, taking age units into account

    Args:
        xml_obj (dict): xml data for the individual

    Returns:
        int: year of birth
    """
    if xml_obj.get('age') is None or xml_obj.get('ageUnits') is None:
        return None
    delta_kwargs = {convert_age_units(xml_obj['ageUnits']) + 's': int(xml_obj['age'])}
    rel_delta = relativedelta(**delta_kwargs)
    birth_datetime = xml_obj['ped_datetime'] - rel_delta
    return birth_datetime.year


def alive_and_well(xml_obj):
    """
    Simple conversion function that uses 'deceased' and 'aw' fields from the
    xml person object to determine Individual 'life_status'

    Args:
        xml_obj (dict): xml data for the individual

    Returns:
        str: life_status
    """
    if xml_obj['deceased'] == '1':
        return 'deceased'
    elif xml_obj['aw'] == '1':
        return 'alive and well'
    else:
        return 'alive'


def convert_to_list(xml_value):
    """
    An expected list of references is None for zero values, a dict for
    one value, and a list for two or more values. Use this function to
    standardize to a list. If individual items contain an "@ref" field, use
    that in the returned list, otherwise return the whole item

    Args:
        xml_value (dict or list): value to transform to a list

    Returns:
        list: processed list of values from original xml_value
    """
    if not xml_value:
        return []
    elif isinstance(xml_value, dict):
        return [xml_value.get('@ref', xml_value)]

    else:
        return [val.get('@ref', val) for val in xml_value]


def descendancy_xml_ref_to_parents(testapp, ref_id, refs, data, case, uuids_by_ref):
    """
    This is a `xml_ref_fxn`, so it must take the correpsonding args in the
    standardized way and return a dictionary that is used to update the
    object to be POSTed/PATCHed.

    Helper function to use specifically with `descendacy` object reference
    in input XML. Uses the string reference id and input dictionary of refs
    to find the object, look up parents based off of gender, and return
    them in a standardized way.

    Args:
        testapp (webtest.TestApp): test application for posting/patching
        ref_id (str): value for the reference field of the relevant xml obj
        refs: (dict): reference-based parsed XML data
        data (dict): metadata to POST/PATCH
        case (str): identifier of the case
        uuids_by_ref (dict): mapping of Fourfront uuids by xml ref

    Returns:
        None
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
    data.update(result)


def annotations_xml_ref_to_clinic_notes(testapp, ref_ids, refs, data, case, uuids_by_ref):
    """
    This is a `xml_ref_fxn`, so it must take the corresponding args in the
    standardized way and update the `data` dictionary, which is used to PATCH
    the Individual item.

    Helper function to use specifically with `annotations` object reference
    in input XML. Uses the string reference id and input dictionary of refs
    to find the annotations used as note .

    Args:
        testapp (webtest.TestApp): test application for posting/patching
        ref_ids (list): value for the reference field of the relevant xml obj
        refs: (dict): reference-based parsed XML data
        data (dict): metadata to POST/PATCH
        case (str): identifier of the case
        uuids_by_ref (dict): mapping of Fourfront uuids by xml ref

    Returns:
        None
    """
    clinic_notes = []
    for annotation_ref in ref_ids:
        annotation_obj = refs[annotation_ref]
        if annotation_obj.get('text'):
            clinic_notes.append(annotation_obj['text'])
    if clinic_notes:
        if data.get('clinic_notes'):
            clinic_notes.insert(0, data['clinic_notes'])
        data['clinic_notes'] = '\n'.join(clinic_notes)


def diagnoses_xml_to_phenotypic_features(testapp, ref_vals, refs, data, case, uuids_by_ref):
    """
    This is a `xml_ref_fxn`, so it must take the corresponding args in the
    standardized way and update the `data` dictionary, which is used to PATCH
    the Individual item.

    Helper function to use specifically with `diagnoses` object values
    in input XML. Uses a list of dict ref_vals and converts to
    `phenotypic_features` or `clinic_notes` in the family metadata.

    Args:
        testapp (webtest.TestApp): test application for posting/patching
        ref_vals (list): list of dict diagnoses values
        refs: (dict): reference-based parsed XML data
        data (dict): metadata to POST/PATCH
        case (str): identifier of the case
        uuids_by_ref (dict): mapping of Fourfront uuids by xml ref

    Returns:
        None
    """
    # need Phenotype, onset_age, and onset_age_units
    pheno_feats = data.get('phenotypic_features', [])
    clinic_notes = []
    for diagnosis in ref_vals:
        found_term = False
        # only use HPO terms for now
        if diagnosis.get('id') and diagnosis.get('ontology') == 'HPO':
            pheno_feat_data = {}
            if diagnosis.get('ageAtDx'):
                pheno_feat_data['onset_age'] = int(diagnosis['ageAtDx'])
            if diagnosis.get('ageAtDx') and diagnosis.get('ageAtDxUnits'):
                pheno_feat_data['onset_age_units'] = convert_age_units(diagnosis['ageAtDxUnits'])
            if diagnosis:
                # look up HPO term. If not found, use a clinical note
                try:
                    pheno_res = testapp.get('/phenotypes/' + diagnosis['id'], status=200).json
                except Exception as exc:
                    log.error('Case %s: Cannot GET term %s. Error: %s'
                              % (case, diagnosis['id'], str(exc)))
                else:
                    found_term = True
                    pheno_feat_data['phenotypic_feature'] = pheno_res['uuid']
                    pheno_feats.append(pheno_feat_data)

        # if we cannot find the term, update the clinical notes
        if diagnosis.get('name') and not found_term:
            dx_note = 'Diagnosis: ' + diagnosis['name']
            if diagnosis.get('ageAtDx') and diagnosis.get('ageAtDxUnits'):
                dx_note += (' at ' + diagnosis['ageAtDx'] + ' ' +
                            convert_age_units(diagnosis['ageAtDxUnits']) + 's')
            if diagnosis['id']:
                dx_note += ' (HPO term %s not found)' % diagnosis['id']
            clinic_notes.append(dx_note)

    if pheno_feats:
        data['phenotypic_features'] = pheno_feats
    if clinic_notes:
        if data.get('clinic_notes'):
            clinic_notes.insert(0, data['clinic_notes'])
        data['clinic_notes'] = '\n'.join(clinic_notes)


def affected_xml_to_phenotypic_features(testapp, ref_vals, refs, data, case, uuids_by_ref):
    """
    This is a `xml_ref_fxn`, so it must take the corresponding args in the
    standardized way and update the `data` dictionary, which is used to PATCH
    the Individual item.

    Helper function to use specifically with `affected` object references
    in input XML. Uses a list of dict ref_vals and converts to
    `phenotypic_features` or `clinic_notes` in the family metadata.

    Args:
        testapp (webtest.TestApp): test application for posting/patching
        ref_vals (list): list of dict affected values (should only have 1 item)
        refs: (dict): reference-based parsed XML data
        data (dict): metadata to POST/PATCH
        case (str): identifier of the case
        uuids_by_ref (dict): mapping of Fourfront uuids by xml ref

    Returns:
        None
    """
    if ref_vals[0]['affected'] != '1':
        return
    found_aff_val = refs[ref_vals[0]['meta']].copy()
    # make sure these are consistently set from the `person` xml data
    found_aff_val.update(ref_vals[0])
    diagnoses_xml_to_phenotypic_features(testapp, [found_aff_val], refs, data,
                                         case, uuids_by_ref)


def cause_of_death_xml_to_phenotype(testapp, ref_vals, refs, data, case, uuids_by_ref):
    """
    This is a `xml_ref_fxn`, so it must take the corresponding args in the
    standardized way and update the `data` dictionary, which is used to PATCH
    the Individual item.

    Helper function to use specifically with `causeOfDeath` object references
    in input XML. Uses a list of dict ref_vals and converts to
    `cause_of_death` or `clinic_notes` in the family metadata.

    Args:
        testapp (webtest.TestApp): test application for posting/patching
        ref_vals (list): list of dict containg cause of death info (should be length 1)
        refs: (dict): reference-based parsed XML data
        data (dict): metadata to POST/PATCH
        case (str): identifier of the case
        uuids_by_ref (dict): mapping of Fourfront uuids by xml ref

    Returns:
        None
    """
    clinic_notes = []
    for xml_obj in ref_vals:
        found_term = False
        # only use HPO terms for now
        if xml_obj.get('causeOfDeathOntologyId') and xml_obj.get('causeOfDeathOntology') == 'HPO':
            # look up HPO term. If not found, use a clinical note
            try:
                pheno_res = testapp.get('/phenotypes/' + xml_obj['causeOfDeathOntologyId'], status=200).json
            except Exception as exc:
                log.error('Case %s: Cannot GET term %s. Error: %s'
                          % (case, xml_obj['causeOfDeathOntologyId'], str(exc)))
            else:
                found_term = True
                data['cause_of_death'] = pheno_res['uuid']

        # if we cannot find the term, update the clinical notes
        if xml_obj.get('causeOfDeath') and not found_term:
            dx_note = 'Cause of death: ' + xml_obj['causeOfDeath']
            if xml_obj['causeOfDeathOntologyId']:
                dx_note += ' (HPO term %s not found)' % xml_obj['causeOfDeathOntologyId']
            clinic_notes.append(dx_note)

    if clinic_notes:
        if data.get('clinic_notes'):
            clinic_notes.insert(0, data['clinic_notes'])
        data['clinic_notes'] = '\n'.join(clinic_notes)


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
            # make into a list if the element is found multiple times
            if child.tag in ret:
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


def create_family_proband(testapp, xml_data, refs, ref_field, case,
                          post_extra=None, xml_extra=None):
    """
    Proband-specific object creation protocol. We can expand later on

    General process (in development):
    - POST individuals with required fields and attribution (`post_extra` kwarg)
    - PATCH non-required fields

    Can be easily extended by adding tuples to `to_convert` dict

    Args:
        testapp (webtest.TestApp): test application for posting/patching
        xml_data (dict): parsed XMl data, probably from `etree_to_dict`
        refs: (dict): reference-based parsed XML data
        ref_field (str): name of reference field from the XML data
        case (str): identifier of the case
        post_extra (dict): keys/values given here are added to POST
        xml_extra (dict): key/values given here are added to each XML object
            processed using the PROBAND_MAPPING

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
            if round == 'first' and post_extra is not None:
                data.update(post_extra)
            if xml_extra is not None:
                xml_obj.update(xml_extra)
            for xml_key in xml_obj:
                converted = PROBAND_MAPPING[item_type].get(xml_key)
                if converted is None:
                    log.info('Unknown field %s for %s in process-pedigree!' % (xml_key, item_type))
                    continue
                # can handle meta multiple fields based off one one xml field
                if not isinstance(converted, list):
                    converted = [converted]
                for converted_dict in converted:
                    if round == 'first':
                        if converted_dict.get('linked', False) is True:
                            continue
                        ref_val = converted_dict['value'](xml_obj)
                        if ref_val is not None:
                            data[converted_dict['corresponds_to']] = ref_val
                    elif round == 'second':
                        if converted_dict.get('linked', False) is False:
                            continue
                        ref_val = converted_dict['value'](xml_obj)
                        # more complex function based on xml refs needed
                        if ref_val is not None and 'xml_ref_fxn' in converted_dict:
                            # will update data in place
                            converted_dict['xml_ref_fxn'](testapp, ref_val, refs, data,
                                                     case, uuids_by_ref)
                        elif ref_val is not None:
                            data[converted_dict['corresponds_to']] = uuids_by_ref[ref_val]

            # POST if first round
            if round == 'first':
                try:
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
            'value': lambda v: v['deceased'] == '1'
        },
        'aw': {
            'corresponds_to': 'life_status',
            'value': lambda v: alive_and_well(v)
        },
        'age': [
            {
                'corresponds_to': 'birth_year',
                'value': lambda v: age_to_birth_year(v)
            },
            {
                'corresponds_to': 'age',
                'value': lambda v: int(v['age']) if v.get('age') is not None else None
            }
        ],
        'ageUnits': {
            'corresponds_to': 'age_units',
            'value': lambda v: convert_age_units(v['ageUnits']) if v.get('ageUnits') else None
        },
        'ageAtDeath': {
            'corresponds_to': 'age_at_death',
            'value': lambda v: int(v['ageAtDeath']) if v.get('ageAtDeath') is not None else None
        },
        'ageAtDeathUnits': {
            'corresponds_to': 'age_at_death_units',
            'value': lambda v: convert_age_units(v['ageAtDeathUnits']) if v.get('ageAtDeathUnits') else None
        },
        'p': {
            'corresponds_to': 'is_pregnancy',
            'value': lambda v: v['p'] == '1'
        },
        'gestAge': {
            'corresponds_to': 'gestational_age',
            'value': lambda v: int(v['gestAge']) if v.get('gestAge') is not None else None
        },
        'sab': {
            'corresponds_to': 'is_spontaneous_abortion',
            'value': lambda v: v['sab'] == '1'
        },
        'top': {
            'corresponds_to': 'is_termination_of_pregnancy',
            'value': lambda v: v['top'] == '1'
        },
        'stillBirth': {
            'corresponds_to': 'is_still_birth',
            'value': lambda v: v['stillBirth'] == '1'
        },
        'noChildrenByChoice': {
            'corresponds_to': 'is_no_children_by_choice',
            'value': lambda v: v['noChildrenByChoice'] == '1'
        },
        'noChildrenInfertility': {
            'corresponds_to': 'is_infertile',
            'value': lambda v: v['noChildrenInfertility'] == '1'
        },
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
        },
        'annotations': {
            'xml_ref_fxn': annotations_xml_ref_to_clinic_notes,
            'value': lambda v: convert_to_list(v['annotations']),
            'linked': True
        },
        'diagnoses': {
            'xml_ref_fxn': diagnoses_xml_to_phenotypic_features,
            'value': lambda v: convert_to_list(v['diagnoses']),
            'linked': True
        },
        'causeOfDeath': {
            'xml_ref_fxn': cause_of_death_xml_to_phenotype,
            'value': lambda v: convert_to_list(v),
            'linked': True
        },
        'affected1': {
            'xml_ref_fxn': affected_xml_to_phenotypic_features,
            'value': lambda v: [{'meta': 'affected1', 'affected': v['affected1'], 'ageAtDx': v['affected1DxAge'], 'ageAtDxUnits': v['affected1DxAgeUnits']}],
            'linked': True
        },
        'affected2': {
            'xml_ref_fxn': affected_xml_to_phenotypic_features,
            'value': lambda v: [{'meta': 'affected2', 'affected': v['affected2'], 'ageAtDx': v['affected2DxAge'], 'ageAtDxUnits': v['affected2DxAgeUnits']}],
            'linked': True
        },
        'affected3': {
            'xml_ref_fxn': affected_xml_to_phenotypic_features,
            'value': lambda v: [{'meta': 'affected3', 'affected': v['affected3'], 'ageAtDx': v['affected3DxAge'], 'ageAtDxUnits': v['affected3DxAgeUnits']}],
            'linked': True
        },
        'affected4': {
            'xml_ref_fxn': affected_xml_to_phenotypic_features,
            'value': lambda v: [{'meta': 'affected4', 'affected': v['affected4'], 'ageAtDx': v['affected4DxAge'], 'ageAtDxUnits': v['affected4DxAgeUnits']}],
            'linked': True
        }
    }
}
