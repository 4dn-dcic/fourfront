from pyramid.settings import asbool
from pyramid.view import view_config
import json

def includeme(config):
    config.add_route('process-pedigree', '/process-pedigree')
    config.scan(__name__)


@view_config(route_name='process-pedigree', request_method='POST', permission="add")
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
                    "ped_file": {
                        "title" : "Pedigree File",
                        "description": "Ped format file with pedigree information",
                        "type" : "string",
                        "linkTo": "Document"
                    }
                }
            }
        }
    """
    response = {'title': 'Pedigree Processing', 'family': {}, 'individuals': []}
    post_items = asbool(request.params.get('do_post', False))
    # `ped_filename` request param is the name of the pedigree
    # If not supplied, do not add to case information and assume simple JSON
    ped_filename = request.params('ped_filename')
    data = request.json  # pedigree file contents in JSON format
    if not data:
        response['detail'] = 'Must provide json_body in the process-pedigree request'
        response['status'] = 'Failure'
        return response

    if data[0].startswith("BOADICEA import pedigree file format 4.0"):
        ped_format = 'BOADICEA v4'
    elif data[0].startswith("BOADICEA import pedigree file format 2.0"):
        ped_format = 'BOADICEA v2'
    elif ped_filename and ped_filename.endswith('.ped'):
        ped_format = 'PED'
    else:
        ped_format = 'JSON'

    # BOADICEA not implemented currently
    if ped_format.startswith('BOADICEA'):
        response['detail'] = 'Pedigree format %s is not yet supported' % ped_format
        response['status'] = 'Failure'
        return response

    if ped_format == 'PED':
        individuals = process_individuals_ped(data)
    else:
        individuals = process_individuals_json(data)


    # TODO: add Document and link to family. include `ped_filename` somewhere

    return response


def process_individuals_ped(data):
    pass


def process_individuals_json(data):
    pass
