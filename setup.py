import os
import sys
from setuptools import setup, find_packages

# variables used in buildout
here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.rst')).read()
CHANGES = open(os.path.join(here, 'CHANGES.rst')).read()

requires = [
    'snovault',
    'Submit4DN',
    'Pillow',
    'PyBrowserID',
    'SQLAlchemy>=1.0.0b1',
    'WSGIProxy2',
    'WebTest',
    'boto',
    'botocore==1.5.71',
    'jmespath',
    'boto3',
    'elasticsearch>=5.0.0,<6.0.0',
    'elasticsearch_dsl>=5.0.0,<6.0.0',
    'lucenequery',
    'future',
    'humanfriendly',
    'jsonschema_serialize_fork',
    'loremipsum',
    'netaddr',
    'bcrypt',
    'cryptacular',
    'passlib',
    'psutil',
    'pyramid',
    'pyramid_localroles',
    'pyramid_multiauth',
    'pyramid_tm',
    'python-magic',
    'pytz',
    'rdflib',
    'rdflib-jsonld',
    'rfc3987',
    'setuptools',
    'simplejson',
    'strict_rfc3339',
    'subprocess_middleware',
    'xlrd',
    'zope.sqlalchemy',
    'pyJWT',
    # add it here for some command line tools
    'pytest>=2.4.0',
]

if sys.version_info.major == 2:
    requires.extend([
        'backports.functools_lru_cache',
        'subprocess32',
    ])

tests_require = [
    'pytest-bdd',
    'pytest-mock',
    'pytest-splinter',
    'pytest_exact_fixtures',
    'pytest-xdist',
    'pytest-cov',
    'attrs',
]

setup(
    name='encoded',
    version='0.1',
    description='Metadata database for ENCODE',
    long_description=README + '\n\n' + CHANGES,
    packages=find_packages('src'),
    package_dir={'': 'src'},
    include_package_data=True,
    zip_safe=False,
    author='Laurence Rowe',
    author_email='lrowe@stanford.edu',
    url='http://encode-dcc.org',
    license='MIT',
    install_requires=requires,
    tests_require=tests_require,
    extras_require={
        'test': tests_require,
    },
    entry_points='''
        [console_scripts]
        batchupgrade = snovault.batchupgrade:main
        create-mapping = snovault.elasticsearch.create_mapping:main
        dev-servers = snovault.dev_servers:main
        es-index-listener = snovault.elasticsearch.es_index_listener:main

        add-date-created = encoded.commands.add_date_created:main
        check-rendering = encoded.commands.check_rendering:main
        deploy = encoded.commands.deploy:main
        extract_test_data = encoded.commands.extract_test_data:main
        es-index-data = encoded.commands.es_index_data:main
        generate-ontology = encoded.commands.generate_ontology:main
        load-ontology = encoded.commands.load_ontology_terms:main
        import-data = encoded.commands.import_data:main
        jsonld-rdf = encoded.commands.jsonld_rdf:main
        migrate-files-aws = encoded.commands.migrate_files_aws:main
        profile = encoded.commands.profile:main
        spreadsheet-to-json = encoded.commands.spreadsheet_to_json:main
        migrate-attachments-aws = encoded.commands.migrate_attachments_aws:main
        migrate-dataset-type = encoded.commands.migrate_dataset_type:main
        load-data = encoded.commands.load_data:main
        dropdb = encoded.commands.dropdb:main
        verify-item = encoded.commands.verify_item:main

        [paste.app_factory]
        main = encoded:main

        [paste.composite_factory]
        indexer = snovault.elasticsearch.es_index_listener:composite

        [paste.filter_app_factory]
        memlimit = encoded.memlimit:filter_app
        ''',
)
