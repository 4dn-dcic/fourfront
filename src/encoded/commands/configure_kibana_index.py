import argparse
import logging
import structlog
from dcicutils.es_utils import create_es_client

log = structlog.getLogger(__name__)
EPILOG = __doc__


def main():
    """
    Simple command to adjust settings on the Kibana index in ES, so that
    searches against all indices do not create issues due to default config
    """
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.INFO)

    parser = argparse.ArgumentParser(
        description="Configure Kibana Index", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--es-endpoint', help='Elasticsearch endpoint, including port')
    parser.add_argument('--env', help='Use the Elasticsearch associated with this EB environment')
    args = parser.parse_args()

    # require either --es-endpoit or --env (not both)
    if not args.es_endpoint or args.env:
        log.error('configure_kibana_index: must provide either --es-endpoint'
                  'or --env to this command! You gave neither.')
        return
    elif args.es_endpoint and args.env:
        log.error('configure_kibana_index: must provide either --es-endpoint'
                  'or --env to this command! You gave both.')
        return
    elif args.es_endpoint:
        use_es = args.es_endpoint
    elif args.env:
        use_es = get_health_page(ff_env=args.env)['elasticsearch']

    # create client and ensure kibana index exists
    client = create_es_client(use_es, use_aws_auth=True)
    if not client.indices.exists(index='.kibana'):
        log.error('configure_kibana_index: .kibana index does not exist for'
                  'endpoints %s' % use_es)
        return
    kibana_settings = {'max_result_window': 100000}
    client.indices.put_settings(index='.kibana', body=kibana_settings)
    log.info('configure_kibana_index: successfully changed settings %s'
             % list(kibana_settings.keys()))


if __name__ == "__main__":
    main()
