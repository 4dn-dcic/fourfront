Care and Feeding of rev links
============================

Rev links are actually a pretty cool think.  Any time you have one object link-to another object, through a calculated or schema based property, a rev link allows you to easily create the reverse direction link on the object that was being linkedto.  Here is a simple example.

if ExperiementSet has property 'experimenets_in_set' which is a list of linkTos that link to an Experiement object.  Then the Experiment Object can have a rev link defined as such:

```
    rev = {
        'experiment_sets': ('ExperimentSet', 'experiments_in_set'),
    }
```

defining the above in types/experiements.py as a memeber of the Experiment class will cause fourfront to automatically generate a keep up to date a property of expereiment called:

```
rev['experiment_sets']
```

which is a list of UUID's for all the experiement_set objects that linkTo this particular experiement.  Once you have that rev_link in place you generally want to expose the data as a calculated_property (or use it in another function somewhere).  To expose it as a calculated property you can define the following in the Experiment class:

```
@calculated_property(schema={
"title": "Experiment Sets",
"description": "Experiment Sets to which this experiment belongs.",
"type": "array",
"items": {
    "title": "Experiment Set",
    "type": ["string", "object"],
    "linkFrom": "ExperimentSet.experiments_in_set"
}
})
def experiment_sets(self, request, experiment_sets):
   paths = paths_filtered_by_status(request, experiment_sets)
   return paths
'''

Notice a few things:

1.  The schema uses a 'linkFrom' item, this is a special parameter to be used with rev-links and the value should be the object.property used to define the associated rev_link above.
2.  Also note the type needs to be an array with both "string" and "object" in it.  Thats just how it is.  So be sure to do that too.
3.  Finally in the function, the third option should be a parameter with the name of the rev_link that will be passed into the function.  Note the value of the rev link will either be the empty list '[]' or a list of UUIDs.
4. calling paths_filtered_by_status should always been done, as that will filtered out "deleted" and "revoked" objects.
5.  You can also embed this property in 'embedded' if you want the full object embeded.

 rev-link sub-objects
 --------------------

 sub-objects can also be rev-linked.  Considered Workflow_run schema:

 ```
        "input_files": {
            "title": "Input files",
            "description": "The files used as initial input for the workflow.",
            "type": "array",
            "items": {
                "title": "Input file mapping",
                "description": "Info on file used as input and mapping to CWL argument for the workflow.",
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "workflow_argument_name": {
                        "title": "Workflow argument name",
                        "description": "the name of the argument of the workflow that corresponds to the input file",
                        "type": "string"
                    },
                    "value": {
                        "title": "Input file",
                        "description": "a specified input file",
                        "type": "string",
                        "linkTo": "File"
                    }
                }
            }
        },
```

if we wanted to form a rev-link from the outputfile back to the workflow run, define the rev_link as follows:

```
    rev = {
        'workflow_run_inputs': ('WorkflowRun', 'input_files.value'),
        }
```

with a coresponding calculated property that looks like:

```
    @calculated_property(schema={
        "title": "Input of Workflow Runs",
        "description": "All workflow runs that this file serves as an input to",
        "type": "array",
        "items": {
            "title": "Input of Workflow Run",
            "type": "string",
            "linkTo": "WorkflowRun"
        }
    })
    def workflow_run_inputs(self, request):
        return self.rev_link_atids(request, "workflow_run_inputs")
```

Note self.rev_link_atids which is a function defined in the Item class that will automatically get the atids of all rev links filtered by status.  This is helpful for accessing rev_links when you are not useing the 'linkFrom' schema option.

