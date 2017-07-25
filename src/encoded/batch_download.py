from collections import OrderedDict
from pyramid.compat import bytes_
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.view import view_config
from pyramid.response import Response
from snovault import TYPES
from snovault.util import simple_path_ids
from snovault.embed import make_subrequest
from itertools import chain

from urllib.parse import (
    parse_qs,
    urlencode,
)
from .search import iter_search_results
from .search import list_visible_columns_for_schemas

import csv
import io
import json

import logging


log = logging.getLogger(__name__)


def includeme(config):
    config.add_route('batch_download', '/batch_download/{search_params}')
    config.add_route('metadata', '/metadata/{search_params}/{tsv}')
    config.add_route('peak_metadata', '/peak_metadata/{search_params}/{tsv}')
    config.add_route('report_download', '/report.tsv')
    config.scan(__name__)


# includes concatenated properties
_tsv_mapping = OrderedDict([
    ('File Accession', ['experiments_in_set.files.accession']),
    ('File Format', ['experiments_in_set.files.file_type']),
    #('Output type', ['output_type']),
    ('Experiment Title', ['experiments_in_set.display_title']),
    ('Experiment Accession', ['experiments_in_set.accession']),
    ('Experiment Set Accession', ['accession']),
    ('Set Bio Rep No', ['replicate_exps.bio_rep_no']),
    ('Set Tec Rep No', ['replicate_exps.tec_rep_no', 'replicate_exps.replicate_exp.accession']),

    #('Assay', ['assay_term_name']),
    #('Biosample term id', ['biosample_term_id']),
    #('Biosample term name', ['biosample_term_name']),
    ('Biosource', ['experiments_in_set.biosample.biosource_summary']),
    ('Biosource Type', ['experiments_in_set.biosample.biosource.biosource_type']),
    ('Organism', ['experiments_in_set.biosample.biosource.individual.organism.name']),
    ('Digestion Enzyme', ['experiments_in_set.digestion_enzyme.name']),
    ('Related File Relationship', ['experiments_in_set.files.related_files.relationship_type']),
    ('Related File', ['experiments_in_set.files.related_files.file.accession']),
    #('Biosample life stage', ['replicates.library.biosample.life_stage']),
    #('Biosample sex', ['replicates.library.biosample.sex']),
    #('Biosample organism', ['replicates.library.biosample.organism.scientific_name']),
    #('Biosample treatments', ['replicates.library.biosample.treatments.treatment_term_name']),
    #('Biosample subcellular fraction term name', ['replicates.library.biosample.subcellular_fraction_term_name']),
    #('Biosample phase', ['replicates.library.biosample.phase']),
    #('Biosample synchronization stage', ['replicates.library.biosample.fly_synchronization_stage',
    #                                     'replicates.library.biosample.worm_synchronization_stage',
    #                                     'replicates.library.biosample.post_synchronization_time',
    #                                     'replicates.library.biosample.post_synchronization_time_units']),
    #('Experiment target', ['target.name']),
    #('Antibody accession', ['replicates.antibody.accession']),
    #('Library made from', ['replicates.library.nucleic_acid_term_name']),
    #('Library depleted in', ['replicates.library.depleted_in_term_name']),
    #('Library extraction method', ['replicates.library.extraction_method']),
    #('Library lysis method', ['replicates.library.lysis_method']),
    #('Library crosslinking method', ['replicates.library.crosslinking_method']),
    ('Date Created', ['experiments_in_set.files.date_created']),
    #('Project', ['award.project']),
    #('RBNS protein concentration', ['files.replicate.rbns_protein_concentration', 'files.replicate.rbns_protein_concentration_units']),
    #('Library fragmentation method', ['files.replicate.library.fragmentation_method']),
    #('Library size range', ['files.replicate.library.size_range']),
    #('Biosample Age', ['files.replicate.library.biosample.age_display']),
    #('Biological replicate(s)', ['files.biological_replicates']),
    #('Technical replicate', ['files.replicate.technical_replicate_number']),
    #('Read length', ['files.read_length']),
    #('Run type', ['files.run_type']),
    ('Paired end', ['experiments_in_set.files.paired_end']),
    ('Paired with', ['experiments_in_set.files.paired_with']),
    #('Derived from', ['files.derived_from.accession']),
    ('Size', ['experiments_in_set.files.file_size']),
    ('Lab', ['lab.title']),
    ('md5sum', ['experiments_in_set.files.md5sum']),
    ('File download URL', ['experiments_in_set.files.href']),
    #('Assembly', ['files.assembly']),
    #('Platform', ['files.platform.title'])
])


def get_file_uuids(result_dict):
    file_uuids = []
    for item in result_dict['@graph']:
        for file in item['files']:
            file_uuids.append(file['uuid'])
    return list(set(file_uuids))

def get_biosample_accessions(file_json, experiment_json):
    for f in experiment_json['files']:
        if file_json['uuid'] == f['uuid']:
            accession = f.get('replicate', {}).get('library', {}).get('biosample', {}).get('accession')
            if accession:
                return accession
    accessions = []
    for replicate in experiment_json.get('replicates', []):
        accession = replicate['library']['biosample']['accession']
        accessions.append(accession)
    return ', '.join(list(set(accessions)))

def get_peak_metadata_links(request):
    if request.matchdict.get('search_params'):
        search_params = request.matchdict['search_params']
    else:
        search_params = request.query_string

    peak_metadata_tsv_link = '{host_url}/peak_metadata/{search_params}/peak_metadata.tsv'.format(
        host_url=request.host_url,
        search_params=search_params
    )
    peak_metadata_json_link = '{host_url}/peak_metadata/{search_params}/peak_metadata.json'.format(
        host_url=request.host_url,
        search_params=search_params
    )
    return [peak_metadata_tsv_link, peak_metadata_json_link]




@view_config(route_name='peak_metadata', request_method='GET')
def peak_metadata(context, request):
    param_list = parse_qs(request.matchdict['search_params'])
    param_list['field'] = []
    header = ['assay_term_name', 'coordinates', 'target.label', 'biosample.accession', 'file.accession', 'experiment.accession']
    param_list['limit'] = ['all']
    path = '/region-search/?{}&{}'.format(urlencode(param_list, True),'referrer=peak_metadata')
    results = request.embed(path, as_user=True)
    uuids_in_results = get_file_uuids(results)
    rows = []
    json_doc = {}
    for row in results['peaks']:
        if row['_id'] in uuids_in_results:
            file_json = request.embed(row['_id'])
            experiment_json = request.embed(file_json['dataset'])
            for hit in row['inner_hits']['positions']['hits']['hits']:
                data_row = []
                coordinates = '{}:{}-{}'.format(hit['_index'], hit['_source']['start'], hit['_source']['end'])
                file_accession = file_json['accession']
                experiment_accession = experiment_json['accession']
                assay_name = experiment_json['assay_term_name']
                target_name = experiment_json.get('target', {}).get('label') # not all experiments have targets
                biosample_accession = get_biosample_accessions(file_json, experiment_json)
                data_row.extend([assay_name, coordinates, target_name, biosample_accession, file_accession, experiment_accession])
                rows.append(data_row)
                if assay_name not in json_doc:
                    json_doc[assay_name] = []
                else:
                    json_doc[assay_name].append({
                        'coordinates': coordinates,
                        'target.name': target_name,
                        'biosample.accession': list(biosample_accession.split(', ')),
                        'file.accession': file_accession,
                        'experiment.accession': experiment_accession
                    })
    if 'peak_metadata.json' in request.url:
        return Response(
            content_type='text/plain',
            body=json.dumps(json_doc),
            content_disposition='attachment;filename="%s"' % 'peak_metadata.json'
        )
    fout = io.StringIO()
    writer = csv.writer(fout, delimiter='\t')
    writer.writerow(header)
    writer.writerows(rows)
    return Response(
        content_type='text/tsv',
        body=fout.getvalue(),
        content_disposition='attachment;filename="%s"' % 'peak_metadata.tsv'
    )


@view_config(route_name='metadata', request_method='GET')
def metadata_tsv(context, request):

    param_list = parse_qs(request.matchdict['search_params'])

    accession_triples = None # If conditions are met (equal number of accession per Item type), will be a list with tuples: (ExpSetAccession, ExpAccession, FileAccession)
    if (
        param_list.get('accession') is not None and
        param_list.get('experiments_in_set.accession') is not None and
        param_list.get('experiments_in_set.files.accession') is not None and
        len(param_list['accession']) == len(param_list['experiments_in_set.accession']) == len(param_list['experiments_in_set.files.accession'])
    ):
        accession_triples = list(zip(param_list['accession'], param_list['experiments_in_set.accession'], param_list['experiments_in_set.files.accession']))

    if 'referrer' in param_list:
        search_path = '/{}/'.format(param_list.pop('referrer')[0])
    else:
        search_path = '/search/'
    param_list['field'] = []
    header = []
    for prop in _tsv_mapping:
        header.append(prop)
        param_list['field'] = param_list['field'] + _tsv_mapping[prop]
    param_list['limit'] = ['all']
    path = '{}?{}'.format(search_path, urlencode(param_list, True))
    results = request.invoke_subrequest(make_subrequest(request, path)).json

    def get_value_for_column(item, col, columnKeyStart = 0):
        temp = []
        for c in _tsv_mapping[col]:
            c_value = []
            for value in simple_path_ids(item, c[columnKeyStart:]):
                if str(value) not in c_value:
                    c_value.append(str(value))
            if len(temp):
                if len(c_value):
                    temp = [x + ' ' + c_value[0] for x in temp]
            else:
                temp = c_value
        return ', '.join(list(set(temp)))

    def get_correct_rep_no(key, object, set):
        '''Find which Replicate Exp our File Row Object belongs to, and return its replicate number.'''
        if object is None or key is None or object.get(key) is None:
            return None
        rep_nos = object[key].split(', ')
        experiment_accession = object.get('Experiment Accession')
        file_accession = object.get('File Accession')
        for repl_exp in set.get('replicate_exps'):
            repl_exp_accession = repl_exp.get('replicate_exp', {}).get('accession', None)
            if repl_exp_accession is not None and repl_exp_accession == experiment_accession:
                rep_key = 'bio_rep_no' if key == 'Set Bio Rep No' else 'tec_rep_no'
                return repl_exp.get(rep_key)
        return None

    def should_file_row_object_be_included(object):
        '''Ensure object's ExpSet, Exp, and File accession are in list of accession triples sent in URL params.'''
        if accession_triples is None:
            return True
        for triple in accession_triples:
            if (
                triple[0] == object['Experiment Set Accession'] and
                triple[1] == object['Experiment Accession'] and
                triple[2] == object['File Accession']
            ):
                return True
        return False

    def format_experiment_set(exp_set):
        exp_set_row_vals = {}
        for column in header:
            if not _tsv_mapping[column][0].startswith('experiments_in_set'):
                exp_set_row_vals[column] = get_value_for_column(exp_set, column, 0)
        # Chain to flatten result map up to self.
        return chain.from_iterable(map(lambda exp: format_experiment(exp, exp_set, exp_set_row_vals), exp_set.get('experiments_in_set', []) ))


    def format_experiment(exp, exp_set, exp_set_row_vals):
        exp_row_vals = {}
        for column in header:
            if not _tsv_mapping[column][0].startswith('experiments_in_set.files') and _tsv_mapping[column][0].startswith('experiments_in_set'):
                exp_row_vals[column] = get_value_for_column(exp, column, 19)

        return map(lambda f: format_file(f, exp, exp_row_vals, exp_set, exp_set_row_vals), exp.get('files', []) )


    def format_file(f, exp, exp_row_vals, exp_set, exp_set_row_vals):
        f['href'] = request.host_url + f['href']
        f_row_vals = {}
        for column in header:
            if _tsv_mapping[column][0].startswith('experiments_in_set.files'):
                exp_row_vals[column] = get_value_for_column(f, column, 25)

        all_row_vals = dict(exp_set_row_vals, **exp_row_vals, **f_row_vals) # Combine data from ExpSet, Exp, and File

        # If our File object (all_row_vals) has Replicate Numbers, make sure they are corrected.
        if all_row_vals.get('Set Bio Rep No') is not None or all_row_vals.get('Set Tec Rep No') is not None:
            all_row_vals['Set Tec Rep No'] = get_correct_rep_no('Set Tec Rep No', all_row_vals, exp_set)
            all_row_vals['Set Bio Rep No'] = get_correct_rep_no('Set Bio Rep No', all_row_vals, exp_set)

        return all_row_vals


    data_rows = map(
        # Convert object to list of values in same order defined in tsvMapping & header.
        lambda file_row_object: [ file_row_object[column] for column in header ],
        filter(
            lambda file_row_object: should_file_row_object_be_included(file_row_object),
            # Chain to flatten result map up to self.
            chain.from_iterable(map(format_experiment_set, results['@graph']))
        )
    )

    fout = io.StringIO()
    writer = csv.writer(fout, delimiter='\t')
    writer.writerow(header)
    writer.writerows(data_rows)
    return Response(
        content_type='text/tsv',
        body=fout.getvalue(),
        content_disposition='attachment;filename="%s"' % 'metadata.tsv'
    )


@view_config(route_name='batch_download', request_method='GET')
def batch_download(context, request):
    # adding extra params to get required columns
    param_list = parse_qs(request.matchdict['search_params'])
    param_list['field'] = ['files.href', 'files.file_type']
    param_list['limit'] = ['all']
    path = '/search/?%s' % urlencode(param_list, True)
    results = request.embed(path, as_user=True)
    metadata_link = '{host_url}/metadata/{search_params}/metadata.tsv'.format(
        host_url=request.host_url,
        search_params=request.matchdict['search_params']
    )
    files = [metadata_link]
    if 'files.file_type' in param_list:
        for exp in results['@graph']:
            for f in exp['files']:
                if f['file_type'] in param_list['files.file_type']:
                    files.append('{host_url}{href}'.format(
                        host_url=request.host_url,
                        href=f['href']
                    ))
    else:
        for exp in results['@graph']:
            for f in exp['files']:
                files.append('{host_url}{href}'.format(
                    host_url=request.host_url,
                    href=f['href']
                ))
    return Response(
        content_type='text/plain',
        body='\n'.join(files),
        content_disposition='attachment; filename="%s"' % 'files.txt'
    )


def lookup_column_value(value, path):
    nodes = [value]
    names = path.split('.')
    for name in names:
        nextnodes = []
        for node in nodes:
            if name not in node:
                continue
            value = node[name]
            if isinstance(value, list):
                nextnodes.extend(value)
            else:
                nextnodes.append(value)
        nodes = nextnodes
        if not nodes:
            return ''
    # if we ended with an embedded object, show the @id
    if nodes and hasattr(nodes[0], '__contains__') and '@id' in nodes[0]:
        nodes = [node['@id'] for node in nodes]
    seen = set()
    deduped_nodes = [n for n in nodes if not (n in seen or seen.add(n))]
    return u','.join(u'{}'.format(n) for n in deduped_nodes)


def format_row(columns):
    """Format a list of text columns as a tab-separated byte string."""
    return b'\t'.join([bytes_(c, 'utf-8') for c in columns]) + b'\r\n'


@view_config(route_name='report_download', request_method='GET')
def report_download(context, request):
    types = request.params.getall('type')
    if len(types) != 1:
        msg = 'Report view requires specifying a single type.'
        raise HTTPBadRequest(explanation=msg)

    # Make sure we get all results
    request.GET['limit'] = 'all'

    schemas = [request.registry[TYPES][types[0]].schema]
    columns = list_visible_columns_for_schemas(request, schemas)
    header = [column.get('title') or field for field, column in columns.items()]

    def generate_rows():
        yield format_row(header)
        for item in iter_search_results(context, request):
            values = [lookup_column_value(item, path) for path in columns]
            yield format_row(values)

    # Stream response using chunked encoding.
    request.response.content_type = 'text/tsv'
    request.response.content_disposition = 'attachment;filename="%s"' % 'report.tsv'
    request.response.app_iter = generate_rows()
    return request.response
