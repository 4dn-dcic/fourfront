Reverse links
============================

Reverse (rev) links are actually a pretty cool thing.  Any time you have one object link to another object, through a calculated or schema based property, a rev link allows you to easily create the reverse direction link on the object that was being linked to. In addition, rev links take the status of the item that we are reverse linking into account -- we do not want to create rev links to items that have a status of 'deleted', for example. In ENCODE, rev links were represented by linkFrom connections. We have changed that to only use linkTo.

Here is a simple example for the experiment item type (src/types/experiment.py):

Experiment sets have a linkTo experiments through the array `experiments_in_set` field. To make a rev link back from the experiment to the experiment sets, we must define the rev link and then create a calculated property that populates the linkTo.

For the first part, we define the `rev` property on the Experiment object. It is a dictionary that is keyed by the rev link name and has a value of `(<item type to rev link>, <field to rev link>)`. It would be defined as such:

```
    rev = {
        'experiment_sets': ('ExperimentSet', 'experiments_in_set'),
    }
```

You can read this is as: we want to create a reverse link to ExperimentSet using the `experiments_in_set` field. Next, we will define a calculated property on the Experiment that will call this `rev` and create a list of actual linkTos.

```
@calculated_property(schema={
    "title": "Experiment Sets",
    "description": "Experiment Sets to which this experiment belongs.",
    "type": "array",
    "exclude_from": ["submit4dn", "FFedit-create"],
    "items": {
        "title": "Experiment Set",
        "type": ["string", "object"],
        "linkTo": "ExperimentSet"
    }
})
def experiment_sets(self, request):
    return self.rev_link_atids(request, "experiment_sets")
```

That's pretty much it! Now you have an automatic rev link that will be created on your experiment back to your experiment set. To embed values from the experiment set, you can add them to your `embedded_list` like any other object. For example, to embed the accession of the experiment set, you would add:

```
embedded_list += [
    'experiment_sets.accession'
]
```

There are a couple things going on behind the scenes that we should be aware of. Both are defined on the base Item class (src/types/base.py). First, we have a method called `rev_link_atids` on Item that MUST be called within your calculated property creating the rev links. It is actually responsible for generating the rev links from snovault and turning them from uuids to @ids. The code for the method is below (you should not need to change it)

```
<a method for Item class>

def rev_link_atids(self, request, rev_name):
    """
    Returns the list of reverse linked items given a defined reverse link,
    which should be formatted like:
    rev = {
        '<reverse field name>': ('<reverse item class>', '<reverse field to find>'),
    }

    """
    conn = request.registry[CONNECTION]
    return [request.resource_path(conn[uuid]) for uuid in
            self.get_filtered_rev_links(request, rev_name)]
```

Lastly, there is an attribute on Item called `filtered_rev_statuses`. It has a tuple value and serves to filter out all of the items of the given statuses from your rev links. This is crucial to the rev links working -- we do not want to rev link to items with 'deleted' or 'replaced' statuses. This attribute may be overloaded on any item type to provide more fine-grained filtering. In base.py, it is:

```
filtered_rev_statuses = ('deleted', 'replaced')
```

In snovault, check out src/snovault/resources.py for the underlying `get_filtered_rev_links` and `get_rev_links` functions that provide the foundation for `rev_link_atids`.
