import requests
from snovault import (
    collection,
    load_schema,
)
# from pyramid.traversal import find_root
from .base import (
    Item
    # paths_filtered_by_status,
)


@collection(
    name='publications',
    unique_key='publication:ID',
    properties={
        'title': 'Publications',
        'description': 'Publication pages',
    })
class Publication(Item):
    """Publication class."""

    item_type = 'publication'
    schema = load_schema('encoded:schemas/publication.json')

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        p_id = properties['ID']
        title = ''
        abstract = ''
        author_list = []
        authors = ''
        # parse if id is from pubmed
        if p_id.startswith('PMID'):
            pubmed_id = p_id[5:]
            www = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={id}&rettype=medline".format(
                   id=pubmed_id)
            r = requests.get(www).text
            full_text = r.replace('\n      ', ' ')
            data_list = [a.split('-', 1) for a in full_text.split('\n') if a != '']
            for key_pb, data_pb in data_list:
                key_pb = key_pb.strip()
                # grab title
                if key_pb == 'TI':
                    title = data_pb.strip()
                # grab the abstract
                if key_pb == 'AB':
                    abstract = data_pb.strip()
                # accumulate authors
                if key_pb == 'AU':
                    author_list.append(data_pb.strip())
                # add consortiums to author list
                if key_pb == 'CN':
                    author_list.append(data_pb.strip())
                authors = ', '.join(author_list)

        elif p_id.startswith('doi'):
            # doi_id = p_id[4:]
            pass
        properties['title'] = title
        properties['abstract'] = abstract
        properties['authors'] = authors
        super(Publication, self)._update(properties, sheets)



