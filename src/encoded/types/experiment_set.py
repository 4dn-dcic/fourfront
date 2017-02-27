"""Collection for ExperimentSet and ExperimentSetReplicate."""

from pyramid.threadlocal import get_current_request

from snovault import (
    calculated_property,
    collection,
    load_schema,
    AfterModified,
    BeforeModified
)
from snovault.calculated import calculate_properties

from .base import (
    Item,
    add_default_embeds
)

import datetime


def is_newer_than(d1, d2):
    '''Takes 2 strings in format YYYY-MM-DD and tries to convert to date
        and if successful returns True if first string is more recent than
        second string, otherwise returns False
    '''
    try:
        date1 = datetime.datetime.strptime(d1, '%Y-%m-%d').date()
        date2 = datetime.datetime.strptime(d2, '%Y-%m-%d').date()
        if date1 > date2:
            return True
    except:
        pass
    return False


def invalidate_linked_items(item, field, updates=None):
    '''Invalidates the linkTo item(s) in the given field of an item
        which will trigger re-indexing the linked items
        a dictionary of field value pairs to update for the linked item(s)
        can be provided that will be applied prior to invalidation -
        beware that each update will be applied to every linked item in the field
    '''
    request = get_current_request()
    registry = item.registry
    properties = item.properties
    if field in properties:
        links = properties[field]
        if hasattr(links, 'lower'):
            # if string turn into list
            links = [links]
        for link in links:
            linked_item = item.collection.get(link)
            registry.notify(BeforeModified(linked_item, request))
            # update item info if provided
            if updates is not None:
                for f, val in updates.items():
                    linked_item.properties[f] = val
                    linked_item.update(linked_item.properties)
            registry.notify(AfterModified(linked_item, request))


@collection(
    name='experiment-sets',
    unique_key='accession',
    properties={
        'title': 'Experiment Sets',
        'description': 'Listing Experiment Sets',
    })
class ExperimentSet(Item):
    """The experiment set class."""

    item_type = 'experiment_set'
    base_types = ['ExperimentSet'] + Item.base_types
    schema = load_schema('encoded:schemas/experiment_set.json')
    name_key = "accession"
    embedded = ["award",
                "lab",
                "produced_in_pub",
                "publications",
                "experiments_in_set",
                "experiments_in_set.protocol",
                "experiments_in_set.protocol_variation",
                "experiments_in_set.lab",
                "experiments_in_set.award",
                "experiments_in_set.biosample",
                "experiments_in_set.biosample.biosource",
                "experiments_in_set.biosample.modifications",
                "experiments_in_set.biosample.treatments",
                "experiments_in_set.biosample.biosource.individual.organism",
                "experiments_in_set.files",
                "experiments_in_set.files.related_files.relationship_type",
                "experiments_in_set.files.related_files.file.uuid",
                "experiments_in_set.filesets",
                "experiments_in_set.filesets.files_in_set",
                "experiments_in_set.filesets.files_in_set.related_files.relationship_type",
                "experiments_in_set.filesets.files_in_set.related_files.file.uuid",
                "experiments_in_set.digestion_enzyme"]
    embedded = add_default_embeds(embedded, schema)

    def _update(self, properties, sheets=None):
        self.calc_props_schema = {}
        if self.registry and self.registry['calculated_properties']:
            for calc_props_key, calc_props_val in self.registry['calculated_properties'].props_for(self).items():
                if calc_props_val.schema:
                    self.calc_props_schema[calc_props_key] = calc_props_val.schema
        self.embedded = add_default_embeds(self.embedded, self.calc_props_schema)
        super(ExperimentSet, self)._update(properties, sheets)
        if 'experiments_in_set' in properties:
            invalidate_linked_items(self, 'experiments_in_set')

    @calculated_property(schema={
        "title": "Produced in Publication",
        "description": "The Publication in which this Experiment Set was produced.",
        "type": "string",
        "linkTo": "Publication"
    })
    def produced_in_pub(self, request):
        pub_coll = list(self.registry['collections']['Publication'])
        ppub = None
        newest = None
        for uuid in pub_coll:
            pub = self.collection.get(uuid)
            if pub.properties.get('exp_sets_prod_in_pub'):
                for eset in pub.properties['exp_sets_prod_in_pub']:
                    if str(eset) == str(self.uuid):
                        pubdate = pub.properties['date_published']
                        if not newest or is_newer_than(pubdate, newest):
                            newest = pubdate
                            ppub = str(uuid)
        if ppub is not None:
            ppub = '/publication/' + ppub
        return ppub

    @calculated_property(schema={
        "title": "Publications",
        "description": "Publications associated with this Experiment Set.",
        "type": "array",
        "items": {
            "title": "Publication",
            "type": "string",
            "linkTo": "Publication"
        }
    })
    def publications_of_set(self, request):
        pub_coll = list(self.registry['collections']['Publication'])
        pubs = []
        for uuid in pub_coll:
            expsets = []
            pub = self.collection.get(uuid)
            if pub.properties.get('exp_sets_prod_in_pub'):
                expsets.extend(pub.properties['exp_sets_prod_in_pub'])
            if pub.properties.get('exp_sets_used_in_pub'):
                expsets.extend(pub.properties['exp_sets_used_in_pub'])
            for expset in expsets:
                if str(expset) == str(self.uuid):
                    pubs.append('/publication/' + str(uuid))
        return list(set(pubs))


@collection(
    name='experiment-set-replicates',
    unique_key='accession',
    properties={
        'title': 'Replicate Experiment Sets',
        'description': 'Experiment set covering biological and technical experiments',
    })
class ExperimentSetReplicate(ExperimentSet):
    """The experiment set class for replicate experiments."""

    item_type = 'experiment_set_replicate'
    schema = load_schema('encoded:schemas/experiment_set_replicate.json')
    name_key = "accession"
    embedded = ExperimentSet.embedded + [
        "replicate_exps",
        "replicate_exps.replicate_exp.accession",
        "replicate_exps.replicate_exp.uuid"
    ]
    embedded = add_default_embeds(embedded, schema)

    def _update(self, properties, sheets=None):
        self.calc_props_schema = {}
        if self.registry and self.registry['calculated_properties']:
            for calc_props_key, calc_props_val in self.registry['calculated_properties'].props_for(self).items():
                if calc_props_val.schema:
                    self.calc_props_schema[calc_props_key] = calc_props_val.schema
        self.embedded = add_default_embeds(self.embedded, self.calc_props_schema)
        all_experiments = [exp['replicate_exp'] for exp in properties['replicate_exps']]
        properties['experiments_in_set'] = all_experiments
        super(ExperimentSetReplicate, self)._update(properties, sheets)
