from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    paths_filtered_by_status,
)

from urllib.parse import quote_plus
from urllib.parse import urljoin
from itertools import chain
import datetime
from ..search import _ASSEMBLY_MAPPER


def item_is_revoked(request, path):
    return request.embed(path, '@@object').get('status') == 'revoked'


@abstract_collection(
    name='datasets',
    unique_key='accession',
    properties={
        'title': "Datasets",
        'description': 'Listing of all types of dataset.',
    })
class Dataset(Item):
    base_types = ['Dataset'] + Item.base_types
    embedded = []
    name_key = 'accession'
    rev = {
        'original_files': ('File', 'dataset'),
    }

    @calculated_property(schema={
        "title": "Original files",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "File.dataset",
        },
    })
    def original_files(self, request, original_files):
        return paths_filtered_by_status(request, original_files)

    @calculated_property(schema={
        "title": "Contributing files",
        "type": "array",
        "items": {
            "type": "string",
            "linkTo": "File",
        },
    })
    def contributing_files(self, request, original_files, status):
        derived_from = set()
        for path in original_files:
            properties = request.embed(path, '@@object')
            derived_from.update(
                paths_filtered_by_status(request, properties.get('derived_from', []))
            )
        outside_files = list(derived_from.difference(original_files))
        if status in ('release ready', 'released'):
            return paths_filtered_by_status(
                request, outside_files,
                include=('released',),
            )
        else:
            return paths_filtered_by_status(
                request, outside_files,
                exclude=('revoked', 'deleted', 'replaced'),
            )

    @calculated_property(schema={
        "title": "Files",
        "type": "array",
        "items": {
            "type": "string",
            "linkTo": "File",
        },
    })
    def files(self, request, original_files, status):
        if status in ('release ready', 'released'):
            return paths_filtered_by_status(
                request, original_files,
                include=('released',),
            )
        else:
            return paths_filtered_by_status(
                request, original_files,
                exclude=('revoked', 'deleted', 'replaced'),
            )

    @calculated_property(schema={
        "title": "Revoked files",
        "type": "array",
        "items": {
            "type": "string",
            "linkTo": "File",
        },
    })
    def revoked_files(self, request, original_files):
        return [
            path for path in original_files
            if item_is_revoked(request, path)
        ]

    @calculated_property(define=True, schema={
        "title": "Assembly",
        "type": "array",
        "items": {
            "type": "string",
        },
    })
    def assembly(self, request, original_files):
        assembly = []
        for path in original_files:
            properties = request.embed(path, '@@object')
            if properties['file_format'] in ['bigWig', 'bigBed', 'narrowPeak', 'broadPeak', 'bedRnaElements', 'bedMethyl', 'bedLogR'] and \
                    properties['status'] in ['released']:
                if 'assembly' in properties:
                    assembly.append(properties['assembly'])
        return list(set(assembly))

    @calculated_property(condition='assembly', schema={
        "title": "Hub",
        "type": "string",
    })
    def hub(self, request):
        return request.resource_path(self, '@@hub', 'hub.txt')

    @calculated_property(condition='hub', category='page', schema={
        "title": "Visualize at UCSC",
        "type": "string",
    })
    def visualize_ucsc(self, request, hub, assembly):
        hub_url = urljoin(request.resource_url(request.root), hub)
        viz = {}
        for assembly_hub in assembly:
            ucsc_assembly = _ASSEMBLY_MAPPER.get(assembly_hub, assembly_hub)
            ucsc_url = (
                'http://genome.ucsc.edu/cgi-bin/hgTracks'
                '?hubClear='
            ) + quote_plus(hub_url, ':/@') + '&db=' + ucsc_assembly
            viz[assembly_hub] = ucsc_url
        return viz

    @calculated_property(condition='date_released', schema={
        "title": "Month released",
        "type": "string",
    })
    def month_released(self, date_released):
        return datetime.datetime.strptime(date_released, '%Y-%m-%d').strftime('%B, %Y')


class FileSet(Dataset):
    item_type = 'file_set'
    base_types = ['FileSet'] + Dataset.base_types
    schema = load_schema('encoded:schemas/file_set.json')
    embedded = Dataset.embedded

    @calculated_property(schema={
        "title": "Contributing files",
        "type": "array",
        "items": {
            "type": "string",
            "linkTo": "File",
        },
    })
    def contributing_files(self, request, original_files, related_files, status):
        files = set(original_files + related_files)
        derived_from = set()
        for path in files:
            properties = request.embed(path, '@@object')
            derived_from.update(
                paths_filtered_by_status(request, properties.get('derived_from', []))
            )
        outside_files = list(derived_from.difference(files))
        if status in ('release ready', 'released'):
            return paths_filtered_by_status(
                request, outside_files,
                include=('released',),
            )
        else:
            return paths_filtered_by_status(
                request, outside_files,
                exclude=('revoked', 'deleted', 'replaced'),
            )

    @calculated_property(define=True, schema={
        "title": "Assembly",
        "type": "array",
        "items": {
            "type": "string",
        },
    })
    def assembly(self, request, original_files, related_files):
        assembly = []
        count = 1
        for path in chain(original_files, related_files):
            # Need to cap this due to the large numbers of files in related_files
            if count < 100:
                properties = request.embed(path, '@@object')
                count = count + 1
                if properties['file_format'] in ['bigWig', 'bigBed', 'narrowPeak', 'broadPeak', 'bedRnaElements', 'bedMethyl', 'bedLogR'] and \
                        properties['status'] in ['released']:
                    if 'assembly' in properties:
                        assembly.append(properties['assembly'])
        return list(set(assembly))


@collection(
    name='publication-data',
    unique_key='accession',
    properties={
        'title': "Publication file set",
        'description': 'A set of files that are described/analyzed in a publication.',
    })
class PublicationData(FileSet):
    item_type = 'publication_data'
    embedded = FileSet.embedded


@collection(
    name='references',
    unique_key='accession',
    properties={
        'title': "Reference file set",
        'description': 'A set of reference files used by ENCODE.',
    })
class Reference(FileSet):
    item_type = 'reference'
    embedded = FileSet.embedded


@collection(
    name='ucsc-browser-composites',
    unique_key='accession',
    properties={
        'title': "UCSC browser composite file set",
        'description': 'A set of files that comprise a composite at the UCSC genome browser.',
    })
class UcscBrowserComposite(FileSet):
    item_type = 'ucsc_browser_composite'
    embedded = FileSet.embedded

    @calculated_property(condition='files', schema={
        "title": "Organism",
        "type": "array",
        "items": {
            "type": 'string',
            "linkTo": "Organism"
        },
    })
    def organism(self, request, files):
        organisms = []
        if files:
            for idx, path in enumerate(files):
                # Need to cap this due to the large numbers of files in related_files
                if idx < 100:
                    f = request.embed(path, '@@object')
                    if 'replicate' in f:
                        rep = request.embed(f['replicate'], '@@object')
                        if 'library' in rep:
                            lib = request.embed(rep['library'], '@@object')
                            if 'biosample' in lib:
                                bio = request.embed(lib['biosample'], '@@object')
                                if 'organism' in bio:
                                    organisms.append(bio['organism'])
            if organisms:
                return paths_filtered_by_status(request, list(set(organisms)))
            else:
                return organisms


@collection(
    name='projects',
    unique_key='accession',
    properties={
        'title': "Project file set",
        'description': 'A set of files that comprise a project.',
    })
class Project(FileSet):
    item_type = 'project'
    embedded = FileSet.embedded


@abstract_collection(
    name='series',
    unique_key='accession',
    properties={
        'title': "Series",
        'description': 'Listing of all types of series datasets.',
    })
class Series(Dataset):
    item_type = 'series'
    base_types = ['Series'] + Dataset.base_types


@collection(
    name='treatment-time-series',
    unique_key='accession',
    properties={
        'title': "Treatment time series",
        'description': 'A series that varies on treatment duration across an applied treatment.',
    })
class TreatmentTimeSeries(Series):
    item_type = 'treatment_time_series'
    embedded = Series.embedded


@collection(
    name='treatment-concentration-series',
    unique_key='accession',
    properties={
        'title': "Treatment concentration series",
        'description': 'A series that varies on treatment concentration across an applied treatment.',
    })
class TreatmentConcentrationSeries(Series):
    item_type = 'treatment_concentration_series'
    embedded = Series.embedded


@collection(
    name='organism-development-series',
    unique_key='accession',
    properties={
        'title': "Organism development series",
        'description': 'A series that varies age/life stage of an organism.',
    })
class OrganismDevelopmentSeries(Series):
    item_type = 'organism_development_series'
    embedded = Series.embedded
