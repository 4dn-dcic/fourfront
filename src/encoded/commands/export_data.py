from encoded.commands.import_data import basic_auth
from pyramid import paster
from urllib.parse import urlparse
from multiprocessing.pool import ThreadPool
import requests, logging, json

EPILOG = __doc__

'''
Use this here tool to export something like a collection of Pages to inserts.
This tool be wicked flexible so for best results, make sure to craft a good search query, otherwise you'll crash things if you try to export
something like /search/?type=All&limit=all (seriously, this command does NOT use streaming, it WILL load things into RAM).

Recommended examples:
  - bin/export-data "https://data.4dnucleome.org/search/?type=Page&limit=all" -u ACCESS_KEY_ID -p ACCESS_KEY_SECRET > new_page_inserts_file.json
  - bin/export-data "https://data.4dnucleome.org/search/?type=StaticSection&limit=all" -u ACCESS_KEY_ID -p ACCESS_KEY_SECRET > new_static_section_inserts_file.json

This has not been tested, but theoretically should be able to pipe inserts from export_data to import_data (e.g. transfer data to different server) for __small__ amounts of data (due to lack of streaming).
'''


def run(search_url, username='', password=''):

    url = urlparse(search_url)

    if url.scheme not in ('http', 'https') or '/search/?type=' not in search_url:
        raise Exception('Invalid URL supplied.')

    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.INFO)
    logging.getLogger('wsgi').setLevel(logging.WARNING)
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)

    auth_to_use = (username, password) if username and password else None

    common_headers = {
        'Accept' : "application/json",
        'Content-Type' : "application/json"
    }

    app = paster.get_app('development.ini', 'app')

    search_url_to_request = search_url + '&field=@id'
    logger.info('Fetching Item @IDs via "' + search_url_to_request + '"')
    search_response = requests.get(search_url_to_request, auth=auth_to_use, headers=common_headers)
    search_results = search_response.json().get('@graph', [])
    search_results_len = len(search_results)
    counter = { 'count' : 0 }

    def worker(search_result):
        object_response = requests.get(url.scheme + '://' + url.netloc + search_result['@id'] + '@@object', auth=auth_to_use, headers=common_headers)
        #print(url.scheme + '://' + url.netloc + search_result['@id'] + '@@object')
        item = object_response.json()
        item_collection = app.registry['collections'][ search_result['@id'].split('/')[1] ]
        item_schema_properties = item_collection.type_info.schema['properties']
        item_keys = list(item.keys())
        for item_key in item_keys:
            if item_key not in item_schema_properties or item_schema_properties[item_key].get('calculatedProperty', False) is True:
                del item[item_key]
            elif not item[item_key]:
                del item[item_key]
        counter['count'] += 1
        logger.info('Got insert for ' + search_result['@id'] + ' - ' + str(counter['count']) + ' / ' + str(search_results_len) )
        return item

    pool = ThreadPool(processes=6)
    out_list = pool.map(worker, search_results)
    pool.close()
    pool.join()

    return out_list



def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="Export Data", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--username', '-u', default='',
        help="HTTP username (access_key_id) or import user uuid/email")
    parser.add_argument('--password', '-p', default='',
        help="HTTP password (secret_access_key)")
    parser.add_argument('--app-name', help="Pyramid app name in configfile", default='app')
    parser.add_argument('url',
        help="URL to a search query.")
    args = parser.parse_args()

    logging.basicConfig()

    print(
        json.dumps(
            run(args.url, args.username, args.password),
            indent=4,
            sort_keys=True
        )
    )


if __name__ == '__main__':
    main()