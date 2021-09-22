from collections import OrderedDict
from pyramid.compat import bytes_
from pyramid.httpexceptions import (
    HTTPBadRequest,
    HTTPMovedPermanently
)
from base64 import b64decode
from pyramid.view import view_config
from pyramid.response import Response
from snovault import TYPES
from snovault.util import simple_path_ids, debug_log
from itertools import chain

from urllib.parse import (
    parse_qs,
    urlencode,
)
from .search import (
    iter_search_results,
    build_table_columns,
    get_iterable_search_results,
    make_search_subreq
)

import csv
import io
import json
from datetime import datetime

import structlog


log = structlog.getLogger(__name__)


def includeme(config):
    config.add_route('batch_download', '/batch_download/{search_params}')
    config.add_route('metadata', '/metadata/')
    config.add_route('metadata_redirect', '/metadata/{search_params}/{tsv}')
    config.add_route('peak_metadata', '/peak_metadata/{search_params}/{tsv}')
    config.add_route('report_download', '/report.tsv')
    config.scan(__name__)

EXP_SET     = 0
EXP         = 1
FILE        = 2
FILE_ONLY   = 3

# includes concatenated properties
# tuple structure is (key/title - (field type, [field name], remove duplicates) 
TSV_MAPPING = OrderedDict([
    ('File Download URL',           (FILE,      ['href'], True)),
    ('Experiment Set Accession',    (EXP_SET,   ['accession'], True)),
    ('Experiment Accession',        (EXP,       ['accession'], True)),
    ('Experiment Set Accession ',   (FILE_ONLY, ['experiment_sets.accession'], True)), #do not remove trailing whitespace of the key
    ('Experiment Accession ',       (FILE_ONLY, ['experiments.accession'], True)), #do not remove trailing whitespace of the key
    ('File Accession',              (FILE,      ['accession'], True)),

    ('Size (MB)',                   (FILE,      ['file_size'], True)),
    ('md5sum',                      (FILE,      ['md5sum'], True)),
    ('File Type',                   (FILE,      ['file_type'], True)),
    ('File Format',                 (FILE,      ['file_format.display_title'], True)),
    ('Bio Rep No',                  (EXP_SET,   ['replicate_exps.bio_rep_no'], True)),
    ('Tech Rep No',                 (EXP_SET,   ['replicate_exps.tec_rep_no'], True)),

    ('Biosource Type',              (EXP,       ['biosample.biosource.biosource_type'], True)),
    ('Organism',                    (EXP,       ['biosample.biosource.individual.organism.name'], True)),
    ('Related File Relationship',   (FILE,      ['related_files.relationship_type'], False)),
    ('Related File',                (FILE,      ['related_files.file.accession'], False)),
    ('Paired End',                  (FILE,      ['paired_end'], True)),
    ('Set Status',                  (EXP_SET,   ['status'], True)),
    ('File Status',                 (FILE,      ['status'], True)),
    ('Publication',                 (EXP_SET,   ['produced_in_pub.short_attribution'], True)),
    ('Experiment Type',             (FILE,      ['track_and_facet_info.experiment_type'], True)),
    ('Replicate Info',              (FILE,      ['track_and_facet_info.replicate_info'], True)),
    ('Assay Details',               (FILE,      ['track_and_facet_info.assay_info'], True)),
    ('Biosource',                   (FILE,      ['track_and_facet_info.biosource_name'], True)),
    ('Dataset',                     (FILE,      ['track_and_facet_info.dataset'], True)),
    ('Condition',                   (FILE,      ['track_and_facet_info.condition'], True)),
    ('In Experiment As',            (FILE,      ['track_and_facet_info.experiment_bucket'], True)),
    ('Project',                     (EXP_SET,   ['award.project'], True)),
    ('Generating Lab',              (FILE,      ['track_and_facet_info.lab_name'], True)),
    ('Experimental Lab',            (FILE,      ['track_and_facet_info.experimental_lab'], True)),
    ('Contributing Lab',            (FILE,      ['contributing_labs.display_title'], True)),
    ('Notes',                       (FILE,      ['notes_to_tsv'], True)),
    ('Open Data URL',               (FILE,      ['open_data_url'], True)),



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
    EXP_SET : ['replicate_exps.replicate_exp.accession', 'lab.correspondence.contact_email'],
    EXP     : ['reference_files.accession', 'reference_files.href', 'reference_files.file_format.display_title', 'reference_files.file_type', 'reference_files.md5sum', 'reference_files.file_size', 'reference_files.status', 'reference_files.lab.display_title', 'reference_files.contributing_labs.display_title'],
    FILE    : ['extra_files.href', 'extra_files.file_format', 'extra_files.md5sum', 'extra_files.use_for', 'extra_files.file_size', 'file_classification']
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
@debug_log
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
@debug_log
def metadata_tsv(context, request):
    '''
    Accepts a POST Form request (NOT JSON) with 'accession_triples' (list of 3-item arrays containing ExpSet Accession, Exp Accession, File Accession)
    Run search sub-request and serves any in-accession_triples File from search result as a file row in streamed metadata.tsv file.

    Alternatively, can accept a GET request wherein all files from ExpSets matching search query params are included.
    '''

    search_params = dict(request.GET) # Must use request.GET to get URI query params only (exclude POST params, etc.)

    # If conditions are met (equal number of accession per Item type), will be a list with tuples: (ExpSetAccession, ExpAccession, FileAccession)
    accession_triples = None
    filename_to_suggest = None
    post_body = { "accession_triples" : None, "download_file_name" : None }

    if request.POST.get('accession_triples') is not None: # Was submitted as a POST form JSON variable. Workaround to not being able to download files through AJAX.
        try:
            post_body['accession_triples'] = json.loads(request.POST.get('accession_triples'))
            post_body['download_file_name'] = json.loads(request.POST.get('download_file_name')) # Note: Even though text string is requested, POST req should wrap it in JSON.stringify() else this fails.
        except Exception:
            pass
    if isinstance(post_body['accession_triples'], list) and len(post_body['accession_triples']) > 0:
        if isinstance(post_body['accession_triples'][0], list): # List of arrays
            accession_triples = [ (acc_list[0], acc_list[1], acc_list[2] ) for acc_list in post_body['accession_triples'] ]
        else: # List of dicts { 'accession', 'experiments_in_set.accession', ... } --- DEPRECATED
            accession_triples = [ (acc_dict.get('accession', 'NONE'), acc_dict.get('experiments_in_set.accession', 'NONE'), acc_dict.get('experiments_in_set.files.accession', 'NONE') ) for acc_dict in post_body['accession_triples'] ]
    filename_to_suggest = post_body.get('download_file_name', None)

    if 'referrer' in search_params:
        search_path = '/{}/'.format(search_params.pop('referrer')[0])
    else:
        search_path = '/search/'
    search_params['field'] = []
    search_params['sort'] = ['accession']
    search_params['type'] = search_params.get('type', 'ExperimentSetReplicate')
    header = []

    def add_field_to_search_params(itemType, field):
        if search_params['type'][0:13] == 'ExperimentSet':
            if itemType == EXP_SET:
                search_params['field'].append(param_field)
            elif itemType == EXP:
                search_params['field'].append('experiments_in_set.' + param_field)
            elif itemType == FILE:
                search_params['field'].append('experiments_in_set.files.' + param_field)
                search_params['field'].append('experiments_in_set.processed_files.' + param_field)
                search_params['field'].append('experiments_in_set.other_processed_files.files.' + param_field)
                search_params['field'].append('processed_files.' + param_field)
                search_params['field'].append('other_processed_files.files.' + param_field)
        elif search_params['type'][0:4] == 'File' and search_params['type'][4:7] != 'Set':
            if itemType == EXP_SET:
                search_params['field'].append('experiment_set.' + param_field)
            elif itemType == EXP:
                search_params['field'].append('experiment.' + param_field)
            elif itemType == FILE or itemType == FILE_ONLY:
                search_params['field'].append(param_field)
        else:
            raise HTTPBadRequest("Metadata can only be retrieved currently for Experiment Sets or Files. Received \"" + search_params['type'] + "\"")

    for prop in TSV_MAPPING:
        if search_params['type'][0:4] == 'File' and search_params['type'][4:7] != 'Set':
            if TSV_MAPPING[prop][0] == FILE or TSV_MAPPING[prop][0] == FILE_ONLY:
                header.append(prop)
        elif TSV_MAPPING[prop][0] != FILE_ONLY:
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
            'Files Selected for Download'       : len(accession_triples) if accession_triples else None,
            'Total Files'                       : 0,
            'Total Unique Files to Download'    : 0
        },
        'lists' : {
            'Not Available'     : [],
            'Duplicate Files'   : [],
            'Extra Files'       : [],
            'Reference Files'   : []
        }
    }
    exp_raw_file_cache = {} # experiments that have processed files selected for download (it is used to decide whether to include ref files or not)

    if filename_to_suggest is None:
        filename_to_suggest = 'metadata_' + datetime.utcnow().strftime('%Y-%m-%d-%Hh-%Mm') + '.tsv'

    def get_values_for_field(item, field, remove_duplicates=True):
        c_value = []

        if remove_duplicates:
            for value in simple_path_ids(item, field):
                if str(value) not in c_value:
                    c_value.append(str(value))
            return list(set(c_value))
        else:
            for value in simple_path_ids(item, field):
                c_value.append(str(value))
            return c_value  

    def get_value_for_column(item, col):
        temp = []
        for c in TSV_MAPPING[col][1]:
            c_value = get_values_for_field(item, c, TSV_MAPPING[col][2])
            if len(temp):
                if len(c_value):
                    temp = [x + ' ' + c_value[0] for x in temp]
            else:
                temp = c_value

        if TSV_MAPPING[col][2]:   
            return ', '.join(list(set(temp)))
        else:
            return ', '.join(temp)    

    def get_correct_rep_no(column_name, column_vals_dict, experiment_set):
        '''Find which Replicate Exp our File Row Object belongs to, and return its replicate number.'''

        if column_vals_dict is None or column_name is None:
            return None

        def get_val(find_exp_accession):
            for repl_exp in experiment_set.get('replicate_exps',[]):
                repl_exp_accession = repl_exp.get('replicate_exp', {}).get('accession', None)
                if repl_exp_accession is not None and repl_exp_accession == find_exp_accession:
                    rep_key = 'bio_rep_no' if column_name == 'Bio Rep No' else 'tec_rep_no'
                    return str(repl_exp.get(rep_key))
            return None

        experiment_accession = column_vals_dict.get('Experiment Accession')
        if experiment_accession:
            if ',' not in experiment_accession:
                return get_val(experiment_accession)
            else:
                vals = [ get_val(accession) for accession in experiment_accession.split(', ') if accession is not None and accession != 'NONE' ]
                return ', '.join(filter(None, vals))
        return None

    def should_file_row_object_be_included(column_vals_dict):
        '''Ensure row's ExpSet, Exp, and File accession are in list of accession triples sent in URL params.'''
        if accession_triples is None:
            return True

        for set_accession, exp_accession, file_accession in accession_triples:
            if (
                (('Experiment Set Accession' in column_vals_dict and set_accession  == column_vals_dict['Experiment Set Accession']) or set_accession  == 'NONE') and
                (('Experiment Accession' in column_vals_dict and exp_accession  == column_vals_dict['Experiment Accession']) or exp_accession  == 'NONE') and
                (file_accession == column_vals_dict['File Accession'] or column_vals_dict['Related File Relationship'] == 'reference file for' or file_accession == 'NONE')
            ):
                # if the file is a raw file (actually if classification is not processed file, then we assume it as a raw file),
                # then add the related exp to the exp_raw_file_cache dict. to check 
                # whether to include exp's ref files since we will include ref files if at least one raw file
                # is selected for download.
                if exp_accession and len(column_vals_dict['File Classification']) > 0 and column_vals_dict['File Classification'] != 'processed file':
                    exp_raw_file_cache[exp_accession] = True
                
                # include ref files if at least one raw file of the parent experiment is already selected for downloads, else discard it
                if exp_accession and column_vals_dict['Related File Relationship'] == 'reference file for':
                    if exp_accession not in exp_raw_file_cache:
                        return False
 
                return True
        
        return False

    def flatten_other_processed_files(other_processed_files):
        flat_list = []
        for opf in other_processed_files:
            for f in opf.get('files', []):
                flat_list.append(f)
        return flat_list 

    def format_experiment_set(exp_set):
        '''
        :param exp_set: A dictionary representation of ExperimentSet as received from /search/ results.
        :returns Iterable of dictionaries which represent File item rows, with column headers as keys.
        '''
        exp_set_row_vals = {}
        exp_set_cols = [ col for col in header if TSV_MAPPING[col][0] == EXP_SET ]
        for column in exp_set_cols:
            exp_set_row_vals[column] = get_value_for_column(exp_set, column)

        def sort_files_from_expset_by_replicate_numbers(file_dict):
            try:
                bio_rep_no = int(file_dict['Bio Rep No'])
            except Exception:
                bio_rep_no = 999
            try:
                tec_rep_no = int(file_dict['Tech Rep No'])
            except Exception:
                tec_rep_no = 999
            return bio_rep_no * 100000 + tec_rep_no

        # Flatten map's child result maps up to self.
        return sorted(chain(
            chain.from_iterable(
                map(
                    lambda exp: format_experiment(exp, exp_set, exp_set_row_vals),
                    exp_set.get('experiments_in_set', [])
                )
            ),
            chain.from_iterable(
                map(
                    lambda f: format_file(f, exp_set, dict(exp_set_row_vals, **{ 'Experiment Accession' : 'NONE' }), exp_set, exp_set_row_vals),
                    exp_set.get('processed_files', []) + flatten_other_processed_files(exp_set.get('other_processed_files', []))
                )
            )
        ), key=sort_files_from_expset_by_replicate_numbers)

    def format_experiment(exp, exp_set, exp_set_row_vals):
        '''
        :returns Iterable of dictionaries which represent File item rows, with column headers as keys.
        '''
        exp_row_vals = {}
        exp_cols = [ col for col in header if TSV_MAPPING[col][0] == EXP ]
        for column in exp_cols:
            exp_row_vals[column] = get_value_for_column(exp, column)

        return chain(
            chain.from_iterable(
                map(
                    lambda f: format_file(f, exp, exp_row_vals, exp_set, exp_set_row_vals),
                    sorted(exp.get('files', []), key=lambda d: d.get("accession")) + sorted(exp.get('processed_files', []), key=lambda d: d.get("accession")) + sorted(flatten_other_processed_files(exp.get('other_processed_files', [])), key=lambda d: d.get("accession"))
                )
            ),
            # ref files should be iterated after the end of exp's raw and 
            # processed files iteration since we do decision whether to include the ref. files or not
            chain.from_iterable(
                map(
                    lambda f: format_file(dict(f, **{ 'reference_file_for' : exp.get('accession') }), exp, exp_row_vals, exp_set, exp_set_row_vals),
                    sorted(exp.get('reference_files', []), key=lambda d: d.get("accession"))
                )
            )
        )

    def format_file(f, exp, exp_row_vals, exp_set, exp_set_row_vals):
        '''
        :returns List of dictionaries which represent File item rows, with column headers as keys.
        '''
        files_returned = [] # Function output
        f['href'] = request.host_url + f.get('href', '')
        f_row_vals = {}
        file_cols = [ col for col in header if TSV_MAPPING[col][0] == FILE or TSV_MAPPING[col][0] == FILE_ONLY ]
        for column in file_cols:
            f_row_vals[column] = get_value_for_column(f, column)

        all_row_vals = dict(exp_set_row_vals, **dict(exp_row_vals, **f_row_vals)) # Combine data from ExpSet, Exp, and File
        
        # Some extra fields to decide whether to include exp's reference files or not
        #
        # IMPORTANT: since we add the Supplementary Files download option in Exp Set, users can download reference files directly.
        # So directly downloaded reference files should not be considered as 'reference file for' of an experiment)
        if not any(triple[2] == f.get('accession', '') for triple in accession_triples) and 'reference_file_for' in f:
            all_row_vals['Related File Relationship'] = 'reference file for'
            all_row_vals['Related File'] = 'Experiment - ' + f.get('reference_file_for', '')
        if not all_row_vals.get('File Classification'):
            all_row_vals['File Classification'] = f.get('file_classification', '')

        # If no EXP properties, likely is processed file from an ExpSet, so show all Exps' values.
        exp_col_names = [ k for k,v in TSV_MAPPING.items() if v[0] == EXP ]
        for column in exp_col_names:
            if all_row_vals.get(column) is None or ('Accession' in column and all_row_vals.get(column) == 'NONE'):
                vals = []
                for field in TSV_MAPPING[column][1]:
                    vals.append(', '.join(get_values_for_field(exp_set, 'experiments_in_set.' + field)))
                all_row_vals[column] = ', '.join(vals)

        # Add Bio & Tech Rep Nos re: all_row_vals['Experiment Accession']
        all_row_vals['Tech Rep No'] = get_correct_rep_no('Tech Rep No', all_row_vals, exp_set)
        all_row_vals['Bio Rep No']  = get_correct_rep_no('Bio Rep No',  all_row_vals, exp_set)

        # If we do not have any publication info carried over from ExpSet, list out lab.correspondence instead
        if not all_row_vals.get('Publication'):
            lab_correspondence = exp_set.get('lab', {}).get('correspondence', [])
            if len(lab_correspondence) > 0:
                contact_emails = []
                for contact in lab_correspondence:
                    decoded_email = b64decode(contact['contact_email'].encode('utf-8')).decode('utf-8') if contact.get('contact_email') else None
                    if decoded_email:
                        contact_emails.append(decoded_email)
                all_row_vals['Publication'] = "Correspondence: " + ", ".join(contact_emails)

        # Add file to our return list which is to be bubbled upwards to iterable.
        files_returned.append(all_row_vals)

        # Add attached secondary files, if any; copies most values over from primary file & overrides distinct File Download URL, md5sum, etc.
        if f.get('extra_files') and len(f['extra_files']) > 0:
            for xfile in f['extra_files']:
                if xfile.get('use_for') == 'visualization':
                    continue
                xfile_vals = all_row_vals.copy()
                xfile_vals['File Download URL'] = request.host_url + xfile['href'] if xfile.get('href') else None
                xfile_vals['File Format'] = xfile.get('file_format', {}).get('display_title')
                xfile_vals['md5sum'] = xfile.get('md5sum')
                xfile_vals['Size (MB)'] = xfile.get('file_size')
                xfile_vals['Related File Relationship'] = 'secondary file for'
                xfile_vals['Related File'] = all_row_vals.get('File Accession')
                files_returned.append(xfile_vals)

        return files_returned

    def post_process_file_row_dict(file_row_dict_tuple):
        idx, file_row_dict = file_row_dict_tuple

        if file_row_dict['Related File Relationship'] == 'secondary file for':
            summary['lists']['Extra Files'].append(('Secondary file for ' + file_row_dict.get('Related File', 'unknown file.'), file_row_dict ))
        elif file_row_dict['Related File Relationship'] == 'reference file for':
            summary['lists']['Reference Files'].append(('Reference file for ' + file_row_dict.get('Related File', 'unknown exp.'), file_row_dict ))

        if not file_row_dict['File Type']:
            file_row_dict['File Type'] = 'other'

        if file_row_dict['File Download URL'] is None:
            file_row_dict['File Download URL'] = '### No URL currently available'
            summary['counts']['Total Files'] += 1
            summary['lists']['Not Available'].append(('No URL available', file_row_dict ))
            return file_row_dict

        if file_cache.get(file_row_dict['File Download URL']) is not None:
            row_num_duplicated = file_cache[file_row_dict['File Download URL']] + 3
            file_row_dict['File Download URL'] = '### Duplicate of row ' + str(row_num_duplicated) + ': ' + file_row_dict['File Download URL']
            summary['counts']['Total Files'] += 1
            summary['lists']['Duplicate Files'].append(('Duplicate of row ' + str(row_num_duplicated), file_row_dict ))
            return file_row_dict

        # remove repeating/redundant lab info in Contributing Lab
        if (file_row_dict['Contributing Lab'] is not None and file_row_dict['Contributing Lab'] != '' and
            (file_row_dict['Contributing Lab'] == file_row_dict['Experimental Lab'] or
            file_row_dict['Contributing Lab'] == file_row_dict['Generating Lab'])):
            file_row_dict['Contributing Lab'] = ''
        
        file_cache[file_row_dict['File Download URL']] = idx
        if('Size (MB)' in file_row_dict and file_row_dict['Size (MB)'] != None and file_row_dict['Size (MB)'] != ''):
            file_row_dict['Size (MB)'] = format(
                float(file_row_dict['Size (MB)']) / (1024 * 1024), '.2f')
        if file_row_dict['File Status'] in ['uploading', 'to be uploaded', 'upload failed']:
            file_row_dict['File Download URL'] = '### Not Yet Uploaded: ' + file_row_dict['File Download URL']
            summary['counts']['Total Files'] += 1
            summary['lists']['Not Available'].append(('Not yet uploaded', file_row_dict ))
            return file_row_dict

        if file_row_dict['File Status'] == 'restricted':
            file_row_dict['File Download URL'] = '### Restricted: ' + file_row_dict['File Download URL']
            summary['counts']['Total Files'] += 1
            summary['lists']['Not Available'].append(('Restricted', file_row_dict ))
            return file_row_dict

        summary['counts']['Total Unique Files to Download'] += 1
        summary['counts']['Total Files'] += 1

        return file_row_dict

    def format_filter_resulting_file_row_dicts(file_row_dict_iterable):
        return map(
            post_process_file_row_dict,
            enumerate(filter(should_file_row_object_be_included, file_row_dict_iterable))
        )

    def generate_summary_lines():
        ret_rows = [
            ['###',   '',         ''],
            ['###',   'Summary',  ''],
            ['###',   '',         ''],
            ['###',   'Files Selected for Download:', '', '',            str(summary['counts']['Files Selected for Download'] or 'All'), ''],
            ['###',   'Total File Rows:', '', '',            str(summary['counts']['Total Files']), ''],
            ['###',   'Unique Downloadable Files:', '', '', str(summary['counts']['Total Unique Files to Download']), '']
        ]

        def gen_mini_table(file_tuples):
            for idx, file_tuple in enumerate(file_tuples[0:5]):
                ret_rows.append(['###', '    - Details:' if idx == 0 else '', file_tuple[1]['File Accession'] + '.' + file_tuple[1]['File Format'], file_tuple[0] ])
            if len(file_tuples) > 5:
                ret_rows.append(['###', '', 'and ' + str(len(file_tuples) - 5) + ' more...', ''])

        if len(summary['lists']['Extra Files']) > 0:
            ret_rows.append(['###', '- Added {} extra file{} which {} attached to a primary selected file (e.g. pairs_px2 index file with a pairs file):'.format(str(len(summary['lists']['Extra Files'])), 's' if len(summary['lists']['Extra Files']) > 1 else '', 'are' if len(summary['lists']['Extra Files']) > 1 else 'is'), '', '', '', ''])
            gen_mini_table(summary['lists']['Extra Files'])
        if len(summary['lists']['Reference Files']) > 0:
            ret_rows.append(['###', '- Added {} reference file{} which {} attached to an experiment:'.format(str(len(summary['lists']['Reference Files'])), 's' if len(summary['lists']['Reference Files']) > 1 else '', 'are' if len(summary['lists']['Reference Files']) > 1 else 'is'), '', '', '', ''])
            gen_mini_table(summary['lists']['Reference Files'])
        if len(summary['lists']['Duplicate Files']) > 0:
            ret_rows.append(['###', '- Commented out {} duplicate file{} (e.g. a raw file shared by two experiments):'.format(str(len(summary['lists']['Duplicate Files'])), 's' if len(summary['lists']['Duplicate Files']) > 1 else ''), '', '', '', ''])
            gen_mini_table(summary['lists']['Duplicate Files'])
        if len(summary['lists']['Not Available']) > 0:
            ret_rows.append(['###', '- Commented out {} file{} which are currently not available (i.e. file restricted, or not yet finished uploading):'.format(str(len(summary['lists']['Not Available'])), 's' if len(summary['lists']['Not Available']) > 1 else ''), '', '', '', ''])
            gen_mini_table(summary['lists']['Not Available'])

        # add unauthenticated download is not permitted warning
        ret_rows.append(['###', '', '', '', '', '', ''])
        ret_rows.append(['###', 'IMPORTANT: As of October 15, 2020, you must include an access key in your cURL command for bulk downloads. You can configure the access key in your profile. If you do not already have an account, you can log in with your Google or GitHub credentials.', '', '', '', ''])

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
            '###', 'N.B.: File summary located at bottom of TSV file.', '', '', '', '',
            'Suggested command to download: ', '', '', 'cut -f 1 ./{} | tail -n +3 | grep -v ^# | xargs -n 1 curl -O -L --user <access_key_id>:<access_key_secret>'.format(filename_to_suggest)
        ])
        yield line.read().encode('utf-8')
        writer.writerow([column.strip() for column in header])
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
        request.invoke_subrequest(make_search_subreq(request, initial_path), False)

    # Prep - use dif functions if different type requested.
    if search_params['type'][0:13] == 'ExperimentSet':
        iterable_pipeline = format_filter_resulting_file_row_dicts(
            chain.from_iterable(
                map(
                    format_experiment_set,
                    get_iterable_search_results(request, search_path, search_params)
                )
            )
        )
    elif search_params['type'][0:4] == 'File' and search_params['type'][4:7] != 'Set':
        iterable_pipeline = format_filter_resulting_file_row_dicts(
            chain.from_iterable(
                map(
                    lambda f: format_file(f, {}, {}, {}, {}),
                    get_iterable_search_results(request, search_path, search_params)
                )
            )
        )
    else:
        raise HTTPBadRequest("Metadata can only be retrieved currently for Experiment Sets or Files. Received \"" + search_params['type'] + "\"")

    return Response(
        content_type='text/tsv',
        app_iter = stream_tsv_output(iterable_pipeline),
        content_disposition='attachment;filename="%s"' % filename_to_suggest
    )


@view_config(route_name="metadata_redirect", request_method='GET')
@debug_log
def redirect_new_metadata_route(context, request):
    return HTTPMovedPermanently(
        location='/metadata/?' + request.matchdict['search_params'],
        comment="Redirected to current metadata route."
    )

@view_config(route_name='batch_download', request_method='GET')
@debug_log
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
@debug_log
def report_download(context, request):
    types = request.params.getall('type')
    if len(types) != 1:
        msg = 'Report view requires specifying a single type.'
        raise HTTPBadRequest(explanation=msg)
    the_type = types[0]

    # Make sure we get all results
    request.GET['limit'] = 'all'

    the_schema = [request.registry[TYPES][the_type.schema]]
    columns = build_table_columns(request, the_schema, [the_type])
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
