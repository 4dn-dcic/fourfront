import urllib3
import io
import gzip
import csv
import logging
from pyramid.view import view_config
from elasticsearch.exceptions import (
    NotFoundError
)
from contentbase import DBSESSION
from contentbase.storage import (
    TransactionRecord,
)
from contentbase.elasticsearch.indexer import all_uuids
from contentbase.elasticsearch.interfaces import (
    ELASTIC_SEARCH,
    SNP_SEARCH_ES,
)
SEARCH_MAX = 99999  # OutOfMemoryError if too high
log = logging.getLogger(__name__)


# hashmap of assays and corresponding file types that are being indexed
_INDEXED_DATA = {
    'ChIP-seq': {
        'output_type': ['optimal idr thresholded peaks'],
    },
    'DNase-seq': {
        'file_type': ['bed narrowPeak']
    },
    'eCLIP': {
        'file_type': ['bed narrowPeak']
    }
}

# Species and references being indexed
_SPECIES = {
    'Homo sapiens': ['hg19']
}


def includeme(config):
    config.add_route('index_file', '/index_file')
    config.scan(__name__)


def tsvreader(file):
    reader = csv.reader(file, delimiter='\t')
    for row in reader:
        yield row


def get_mapping():
    return {
        'hg19': {
            '_all': {
                'enabled': False
            },
            '_source': {
                'enabled': False
            },
            'properties': {
                'uuid': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'positions': {
                    'type': 'nested',
                    'properties': {
                        'start': {
                            'type': 'long'
                        },
                        'end': {
                            'type': 'long'
                        }
                    }
                }
            }
        }
    }


def index_settings():
    return {
        'index': {
            'number_of_shards': 1
        }
    }


def get_assay_term_name(accession, request):
    '''
    Input file accession and returns assay_term_name of the experiment the file
    belongs to
    '''
    context = request.embed(accession)
    if 'assay_term_name' in context:
        return context['assay_term_name']
    return None


def index_peaks(uuid, request):
    """
    Indexes bed files in elasticsearch index
    """
    context = request.embed(uuid)
    if 'File' not in context['@type'] or 'dataset' not in context:
        return

    if 'status' not in context and context['status'] is not 'released':
        return

    assay_term_name = get_assay_term_name(context['dataset'], request)
    if assay_term_name is None:
        return

    flag = False
    for k, v in _INDEXED_DATA.get(assay_term_name, {}).items():
        import pdb; pdb.set_trace()
        if k in context and context[k] in v:
            if 'file_format' in context and context['file_format'] == 'bed':
                flag = True
                break
    if not flag:
        return
    urllib3.disable_warnings()
    es = request.registry.get(SNP_SEARCH_ES, None)
    http = urllib3.PoolManager()
    r = http.request('GET', request.host_url + context['href'])
    comp = io.BytesIO()
    comp.write(r.data)
    comp.seek(0)
    r.release_conn()
    file_data = dict()
    with gzip.open(comp, mode="rt") as file:
        for row in tsvreader(file):
            chrom, start, end = row[0].lower(), int(row[1]), int(row[2])
            if isinstance(start, int) and isinstance(end, int):
                if chrom in file_data:
                    file_data[chrom].append({
                        'start': start + 1,
                        'end': end + 1
                    })
                else:
                    file_data[chrom] = [{'start': start + 1, 'end': end + 1}]
    for key in file_data:
        doc = {
            'uuid': context['uuid'],
            'positions': file_data[key]
        }
        if not es.indices.exists(key):
            es.indices.create(index=key, body=index_settings())
            es.indices.put_mapping(index=key, doc_type='hg19',
                                   body=get_mapping())
        es.index(index=key, doc_type=context['assembly'], body=doc,
                 id=context['uuid'])


@view_config(route_name='index_file', request_method='POST', permission="index")
def index_file(request):
    INDEX = request.registry.settings['contentbase.elasticsearch.index']
    request.datastore = 'database'
    dry_run = request.json.get('dry_run', False)
    recovery = request.json.get('recovery', False)
    es = request.registry[ELASTIC_SEARCH]

    session = request.registry[DBSESSION]()
    connection = session.connection()
    if recovery:
        query = connection.execute(
            "SET TRANSACTION ISOLATION LEVEL READ COMMITTED, READ ONLY;"
            "SELECT txid_snapshot_xmin(txid_current_snapshot()), NULL;"
        )
    else:
        query = connection.execute(
            "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE, READ ONLY, DEFERRABLE;"
            "SELECT txid_snapshot_xmin(txid_current_snapshot()), pg_export_snapshot();"
        )
    result, = query.fetchall()
    xmin, snapshot_id = result  # lowest xid that is still in progress

    first_txn = None
    last_xmin = None
    if 'last_xmin' in request.json:
        last_xmin = request.json['last_xmin']
    else:
        try:
            status = es.get(index=INDEX, doc_type='meta', id='indexing')
        except NotFoundError:
            pass
        else:
            last_xmin = status['_source']['xmin']

    result = {
        'xmin': xmin,
        'last_xmin': last_xmin,
    }
    if last_xmin is None:
        result['types'] = types = request.json.get('types', None)
        invalidated = list(all_uuids(request.root, types))
    else:
        txns = session.query(TransactionRecord).filter(
            TransactionRecord.xid >= last_xmin,
        )

        invalidated = set()
        updated = set()
        renamed = set()
        max_xid = 0
        txn_count = 0
        for txn in txns.all():
            txn_count += 1
            max_xid = max(max_xid, txn.xid)
            if first_txn is None:
                first_txn = txn.timestamp
            else:
                first_txn = min(first_txn, txn.timestamp)
            renamed.update(txn.data.get('renamed', ()))
            updated.update(txn.data.get('updated', ()))

        result['txn_count'] = txn_count
        if txn_count == 0:
            return result

        es.indices.refresh(index=INDEX)
        res = es.search(index=INDEX, size=SEARCH_MAX, body={
            'filter': {
                'or': [
                    {
                        'terms': {
                            'embedded_uuids': updated,
                            '_cache': False,
                        },
                    },
                    {
                        'terms': {
                            'linked_uuids': renamed,
                            '_cache': False,
                        },
                    },
                ],
            },
            '_source': False,
        })
        if res['hits']['total'] > SEARCH_MAX:
            invalidated = list(all_uuids(request.root))
        else:
            referencing = {hit['_id'] for hit in res['hits']['hits']}
            invalidated = referencing | updated
    if not dry_run:
        for uuid in invalidated:
            index_peaks(uuid, request)
    return result
