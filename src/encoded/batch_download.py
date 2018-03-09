from collections import OrderedDict
from pyramid.compat import bytes_
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.view import view_config
from pyramid.response import Response
from snovault import TYPES
from snovault.util import simple_path_ids
from itertools import chain

from urllib.parse import (
    parse_qs,
    urlencode,
)
from .search import (
    iter_search_results,
    list_visible_columns_for_schemas,
    get_iterable_search_results,
    make_search_subreq
)

import csv
import io
import json
from datetime import datetime

import logging


log = logging.getLogger(__name__)


def includeme(config):
    config.add_route('batch_download', '/batch_download/{search_params}')
    config.add_route('metadata', '/metadata/{search_params}/{tsv}')
    config.add_route('peak_metadata', '/peak_metadata/{search_params}/{tsv}')
    config.add_route('report_download', '/report.tsv')
    config.scan(__name__)

EXP_SET = 0
EXP     = 1
FILE    = 2

# includes concatenated properties
TSV_MAPPING = OrderedDict([
    ('File Download URL',           (FILE,      ['href'])),
    ('Experiment Set Accession',    (EXP_SET,   ['accession'])),
    ('Experiment Accession',        (EXP,       ['accession'])),
    ('File Accession',              (FILE,      ['accession'])),

    ('Size',                        (FILE,      ['file_size'])),
    ('md5sum',                      (FILE,      ['md5sum'])),
    ('File Format',                 (FILE,      ['file_format'])),
    ('Experiment Title',            (EXP,       ['display_title'])),
    ('Experiment Type',             (EXP,       ['experiment_type'])),
    ('Bio Rep No',                  (EXP_SET,   ['replicate_exps.bio_rep_no'])),
    ('Tech Rep No',                 (EXP_SET,   ['replicate_exps.tec_rep_no', 'replicate_exps.replicate_exp.accession'])),

    ('Biosource',                   (EXP,       ['biosample.biosource_summary'])),
    ('Biosource Type',              (EXP,       ['biosample.biosource.biosource_type'])),
    ('Organism',                    (EXP,       ['biosample.biosource.individual.organism.name'])),
    ('Digestion Enzyme',            (EXP,       ['digestion_enzyme.name'])),
    ('Related File Relationship',   (FILE,      ['related_files.relationship_type'])),
    ('Related File',                (FILE,      ['related_files.file.accession'])),
    ('Paired end',                  (FILE,      ['paired_end'])),
    ('Lab',                         (EXP_SET,   ['lab.title'])),
    ('Project',                     (EXP_SET,   ['award.project'])),
    ('Set Status',                  (EXP_SET,   ['status'])),
    ('File Status',                 (FILE,      ['status'])),
    #('UUID',                        (FILE,      ['uuid'])),
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
    #('Date Created', ['experiments_in_set.files.date_created']),
    #('Project', ['award.project']),
    #('RBNS protein concentration', ['files.replicate.rbns_protein_concentration', 'files.replicate.rbns_protein_concentration_units']),
    #('Library fragmentation method', ['files.replicate.library.fragmentation_method']),
    #('Library size range', ['files.replicate.library.size_range']),
    #('Biosample Age', ['files.replicate.library.biosample.age_display']),
    #('Biological replicate(s)', ['files.biological_replicates']),
    #('Technical replicate', ['files.replicate.technical_replicate_number']),
    #('Read length', ['files.read_length']),
    #('Run type', ['files.run_type']),
    #('Paired with', ['experiments_in_set.files.paired_with']),
    #('Derived from', ['files.derived_from.accession']),
    #('Assembly', ['files.assembly']),
    #('Platform', ['files.platform.title'])
])

EXTRA_FIELDS = {
    EXP_SET : [],
    EXP     : [],
    FILE    : ['extra_files.href', 'extra_files.file_format', 'extra_files.md5sum']
}


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


class DummyFileInterfaceImplementation(object):
    def __init__(self):
        self._line = None
    def write(self, line):
        self._line = line
    def read(self):
        return self._line


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

# Local flag. TODO: Just perform some request to this endpoint after bin/pserve as part of deploy script.
endpoints_initialized = {
    "metadata" : False
}

@view_config(route_name='metadata', request_method=['GET', 'POST'])
def metadata_tsv(context, request):

    search_params = parse_qs(request.matchdict['search_params'])

    # If conditions are met (equal number of accession per Item type), will be a list with tuples: (ExpSetAccession, ExpAccession, FileAccession)
    accession_triples = None
    filename_to_suggest = None
    if ( # Check if triples are in URL.
        search_params.get('accession') is not None and
        search_params.get('experiments_in_set.accession') is not None and
        search_params.get('experiments_in_set.files.accession') is not None and
        len(search_params['accession']) == len(search_params['experiments_in_set.accession']) == len(search_params['experiments_in_set.files.accession'])
    ):
        accession_triples = list(zip(search_params['accession'], search_params['experiments_in_set.accession'], search_params['experiments_in_set.files.accession']))

    if not accession_triples:
        body = None
        try: # Was submitted as JSON.
            body = request.json_body
        except:
            pass
        if body is None and request.POST.get('accession_triples') is not None: # Was submitted as a POST form JSON variable. Workaround to not being able to download files through AJAX.
            try:
                body = { "accession_triples" : json.loads(request.POST['accession_triples']), "download_file_name" : json.loads(request.POST['download_file_name'] or None) }
            except:
                pass
        if body is not None and body.get('accession_triples'):
            accession_triples = [ (accDict.get('accession', 'NONE'), accDict.get('experiments_in_set.accession', 'NONE'), accDict.get('experiments_in_set.files.accession', 'NONE') ) for accDict in body['accession_triples'] ]
        if body is not None and body.get('download_file_name'):
            filename_to_suggest = body['download_file_name']

    if 'referrer' in search_params:
        search_path = '/{}/'.format(search_params.pop('referrer')[0])
    else:
        search_path = '/search/'
    search_params['field'] = []
    search_params['sort'] = ['accession']
    header = []

    def add_field_to_search_params(itemType, field):
        if itemType == EXP_SET:
            search_params['field'].append(param_field)
        if itemType == EXP:
            search_params['field'].append('experiments_in_set.' + param_field)
        if itemType == FILE:
            search_params['field'].append('experiments_in_set.files.' + param_field)
            search_params['field'].append('experiments_in_set.processed_files.' + param_field)
            search_params['field'].append('processed_files.' + param_field)

    for prop in TSV_MAPPING:
        header.append(prop)
        for param_field in TSV_MAPPING[prop][1]:
            add_field_to_search_params(TSV_MAPPING[prop][0], param_field)
    for itemType in EXTRA_FIELDS:
        for param_field in EXTRA_FIELDS[itemType]:
            add_field_to_search_params(itemType, param_field)

    # Ensure we send accessions to ES to help narrow initial result down.
    # If too many accessions to include in /search/ URL (exceeds 2048 characters, aka accessions for roughly 20 files), we'll fetch search query as-is and then filter/narrow down.
    #if accession_triples and len(accession_triples) < 20:
    #    search_params['accession'] = [ triple[0] for triple in accession_triples ]
    #    search_params['experiments_in_set.accession'] = [ triple[1] for triple in accession_triples ]
    #    search_params['experiments_in_set.files.accession'] = [ triple[2] for triple in accession_triples ]



    file_cache = {} # Exclude URLs of prev-encountered file(s).
    summary = {
        'counts' : {
            'Files Selected for Download' : len(accession_triples) if accession_triples else None,
            'Total Files' : 0,
            'Total Unique Files to Download' : 0,
            'Duplicate Files' : 0,
            'Not Yet Uploaded' : 0,
            'Extra Files' : 0
        }
    }

    if filename_to_suggest is None:
        filename_to_suggest = 'metadata_' + datetime.utcnow().strftime('%Y-%m-%d-%Hh-%Mm') + '.tsv'

    def get_values_for_field(item, field):
        c_value = []
        for value in simple_path_ids(item, field):
            if str(value) not in c_value:
                c_value.append(str(value))
        return list(set(c_value))

    def get_value_for_column(item, col):
        temp = []
        for c in TSV_MAPPING[col][1]:
            c_value = get_values_for_field(item, c)
            if len(temp):
                if len(c_value):
                    temp = [x + ' ' + c_value[0] for x in temp]
            else:
                temp = c_value
        return ', '.join(list(set(temp)))

    def get_correct_rep_no(key, column_vals_dict, experiment_set):
        '''Find which Replicate Exp our File Row Object belongs to, and return its replicate number.'''
        if column_vals_dict is None or key is None or column_vals_dict.get(key) is None:
            return None
        experiment_accession = column_vals_dict.get('Experiment Accession')
        for repl_exp in experiment_set.get('replicate_exps',[]):
            repl_exp_accession = repl_exp.get('replicate_exp', {}).get('accession', None)
            if repl_exp_accession is not None and repl_exp_accession == experiment_accession:
                rep_key = 'bio_rep_no' if key == 'Bio Rep No' else 'tec_rep_no'
                return str(repl_exp.get(rep_key))
        return ''

    def should_file_row_object_be_included(column_vals_dict):
        '''Ensure row's ExpSet, Exp, and File accession are in list of accession triples sent in URL params.'''
        if accession_triples is None:
            return True
        for set_accession, exp_accession, file_accession in accession_triples:
            if (
                (set_accession  == column_vals_dict['Experiment Set Accession'] or set_accession  == 'NONE') and
                (exp_accession  == column_vals_dict['Experiment Accession']     or exp_accession  == 'NONE') and
                (file_accession == column_vals_dict['File Accession']           or file_accession == 'NONE')
            ):
                return True
        return False

    def format_experiment_set(exp_set):
        exp_set_row_vals = {}
        exp_set_cols = [ col for col in header if TSV_MAPPING[col][0] == EXP_SET ]
        for column in exp_set_cols:
            exp_set_row_vals[column] = get_value_for_column(exp_set, column)

        # Flatten map's child result maps up to self.
        return chain(
            chain.from_iterable(
                map(
                    lambda exp: format_experiment(exp, exp_set, exp_set_row_vals),
                    sorted( exp_set.get('experiments_in_set', []), key=lambda d: d.get("accession") )
                )
            ),
            chain.from_iterable(
                map(
                    lambda f: format_file(f, exp_set, dict(exp_set_row_vals, **{ 'Experiment Accession' : 'NONE' }), exp_set, exp_set_row_vals),
                    sorted(exp_set.get('processed_files', []), key=lambda d: d.get("accession") )
                )
            )
        )


    def format_experiment(exp, exp_set, exp_set_row_vals):
        exp_row_vals = {}
        exp_cols = [ col for col in header if TSV_MAPPING[col][0] == EXP ]
        for column in exp_cols:
            exp_row_vals[column] = get_value_for_column(exp, column)

        return chain.from_iterable(
            map(
                lambda f: format_file(f, exp, exp_row_vals, exp_set, exp_set_row_vals),
                sorted(exp.get('files', []), key=lambda d: d.get("accession")) + sorted(exp.get('processed_files', []), key=lambda d: d.get("accession"))
            )
        )


    def format_file(f, exp, exp_row_vals, exp_set, exp_set_row_vals):
        files_returned = []
        f['href'] = request.host_url + f['href']
        f_row_vals = {}
        file_cols = [ col for col in header if TSV_MAPPING[col][0] == FILE ]
        for column in file_cols:
            f_row_vals[column] = get_value_for_column(f, column)

        #print('\n\n\nP1', f_row_vals, '\n', f)

        all_row_vals = dict(exp_set_row_vals, **dict(exp_row_vals, **f_row_vals)) # Combine data from ExpSet, Exp, and File

        # If our File object (all_row_vals) has Replicate Numbers, make sure they are corrected.
        if all_row_vals.get('Bio Rep No') is not None or all_row_vals.get('Tech Rep No') is not None:
            all_row_vals['Tech Rep No'] = get_correct_rep_no('Tech Rep No', all_row_vals, exp_set)
            all_row_vals['Bio Rep No'] = get_correct_rep_no('Bio Rep No', all_row_vals, exp_set)

        # If no EXP properties, likely is processed file from an ExpSet, so show all Exps' values.
        if all_row_vals.get('Experiment Type') is None:
            all_row_vals['Experiment Type'] = ', '.join(get_values_for_field(exp_set, 'experiments_in_set.experiment_type'))
        if all_row_vals.get('Biosource Type') is None:
            all_row_vals['Biosource Type'] = ', '.join(get_values_for_field(exp_set, 'experiments_in_set.biosample.biosource.biosource_type'))
        if all_row_vals.get('Digestion Enzyme') is None:
            all_row_vals['Digestion Enzyme'] = ', '.join(get_values_for_field(exp_set, 'experiments_in_set.digestion_enzyme.name'))

        files_returned.append(all_row_vals)

        # Add secondary files, if any
        if f.get('extra_files') and len(f['extra_files']) > 0:
            for xfile in f['extra_files']:
                xfile_vals = all_row_vals.copy()
                xfile_vals['File Download URL'] = request.host_url + xfile['href'] if xfile.get('href') else None
                xfile_vals['File Format'] = xfile.get('file_format')
                xfile_vals['md5sum'] = xfile.get('md5sum')
                xfile_vals['Related File Relationship'] = 'secondary file for'
                xfile_vals['Related File'] = all_row_vals.get('File Accession')
                files_returned.append(xfile_vals)

        return files_returned

    def post_process_file_row_dict(file_row_dict_tuple):
        idx, file_row_dict = file_row_dict_tuple

        if file_row_dict['Related File Relationship'] == 'secondary file for':
            summary['counts']['Extra Files'] += 1

        if file_cache.get(file_row_dict['File Download URL']) is not None:
            file_row_dict['File Download URL'] = '## Duplicate of row ' + str(file_cache[file_row_dict['File Download URL']] + 3) + ': ' + file_row_dict['File Download URL']
            summary['counts']['Duplicate Files'] += 1
            summary['counts']['Total Files'] += 1
            return file_row_dict

        file_cache[file_row_dict['File Download URL']] = idx

        if file_row_dict['File Status'] in ['uploading', 'to be uploaded', 'upload failed']:
            file_row_dict['File Download URL'] = '## Not Yet Uploaded: ' + file_row_dict['File Download URL']
            summary['counts']['Not Yet Uploaded'] += 1
            summary['counts']['Total Files'] += 1
            return file_row_dict

        summary['counts']['Total Unique Files to Download'] += 1
        summary['counts']['Total Files'] += 1

        return file_row_dict

    def format_graph_of_experiment_sets(graph):
        return map(
            post_process_file_row_dict,
            enumerate(filter(
                should_file_row_object_be_included,
                chain.from_iterable(map(format_experiment_set, graph)) # chain.from_itertable = Flatten own map's child result maps up to self.
            ))
        )

    def generate_summary_lines():
        ret_rows = [
            ['',   '',         ''],
            ['',   'Summary',  ''],
            ['',   '',         ''],
            ['',   'Files Selected for Download:', '', '',            str(summary['counts']['Files Selected for Download'] or 'All'), ''],
            ['',   'Total File Rows:', '', '',            str(summary['counts']['Total Files']), ''],
            ['',   'Unique Downloadable Files:', '', '', str(summary['counts']['Total Unique Files to Download']), '']
        ]

        if summary['counts']['Extra Files'] > 0:
            ret_rows.append(['', '- Added {} extra file{} which {} attached to a primary selected file.'.format(str(summary['counts']['Extra Files']), 's' if summary['counts']['Extra Files'] > 1 else '', 'are' if summary['counts']['Extra Files'] > 1 else 'is'), ''])
        if summary['counts']['Duplicate Files'] > 0:
            ret_rows.append(['', '- Commented out {} duplicate file{}.'.format(str(summary['counts']['Duplicate Files']), 's' if summary['counts']['Duplicate Files'] > 1 else ''), ''])
        if summary['counts']['Not Yet Uploaded'] > 0:
            ret_rows.append(['', '- Commented out {} file{} which are not yet available.'.format(str(summary['counts']['Not Yet Uploaded']), 's' if summary['counts']['Not Yet Uploaded'] > 1 else ''), ''])

        return ret_rows

    def stream_tsv_output(file_row_dictionaries):
        '''
        Generator which converts file-metatada dictionaries into a TSV stream.
        :param file_row_dictionaries: Iterable of dictionaries, each containing TSV_MAPPING keys and values from a file in ExperimentSet.
        '''
        line = DummyFileInterfaceImplementation()
        writer = csv.writer(line, delimiter='\t')

        # Initial 2 lines: Intro, Headers
        writer.writerow([
            'File summary located at bottom of TSV file.', '', '', '', '',
            'Suggested command to download: ', '', '', 'cut -f 1 ./{} | tail -n +3 | grep -v ^# | grep -v ^$ | xargs -n 1 curl -O -L [--user <access_key_id>:<access_key_secret>]'.format(filename_to_suggest)
        ])
        yield line.read().encode('utf-8')
        writer.writerow(header)
        yield line.read().encode('utf-8')

        for file_row_dict in file_row_dictionaries:
            writer.writerow([ file_row_dict.get(column) or 'N/A' for column in header ])
            yield line.read().encode('utf-8')

        for summary_line in generate_summary_lines():
            writer.writerow(summary_line)
            yield line.read().encode('utf-8')


    if not endpoints_initialized['metadata']: # For some reason first result after bootup returns empty, so we do once extra for first request.
        initial_path = '{}?{}'.format(search_path, urlencode(dict(search_params, limit=10), True))
        endpoints_initialized['metadata'] = True
        request.invoke_subrequest(make_search_subreq(request, initial_path), False).json

    return Response(
        content_type='text/tsv',
        app_iter = stream_tsv_output(
            format_graph_of_experiment_sets(
                get_iterable_search_results(request, search_path, search_params)
            )
        ),
        content_disposition='attachment;filename="%s"' % filename_to_suggest
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
