import argparse
import logging
import structlog

from pyramid.paster import get_app
from snovault import DBSESSION
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from .. import configure_dbsession


log = structlog.getLogger(__name__)


EPILOG = __doc__

def main():
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)

    parser = argparse.ArgumentParser(
        description='Simulated behavior', epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--foo', action='store_true', default=False,
                        help='If set, foo will be true. Otherwise foo will be false.')
    args = parser.parse_args()

    print("Simulated behavior. foo=%s" % args.foo)



if __name__ == '__main__':
    main()
