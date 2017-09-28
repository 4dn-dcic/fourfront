from snovault import (
    upgrade_step,
)
from encoded.schema_formats import is_uuid

@upgrade_step('workflow', '1', '2')
def workflow_1_2(value, system):
    '''Remove workflow_steps and arguments.argument_mapping, replace with steps property.'''

    if value.get('steps') is not None:
        # This is probably an insert with correct data already, let's skip.
        print('\n\nWorkflow ' + (value.get('title', 'unknown')) + ' already has "steps".')
        return value

    workflow_steps = value.get('workflow_steps')
    arguments = value.get('arguments')

    if arguments is None:
        print('\n\nWorkflow ' + (value.get('title', 'unknown')) + ' has no "arguments".')
        return

    if workflow_steps is None:
        print('\n\nWorkflow ' + (value.get('title', 'unknown')) + ' has no "workflow_steps".')
        return

    item_instance = system.get('context')
    system_collection = None
    if hasattr(item_instance, 'collection'):
        system_collection = system.get('context').collection

    def getStepDict(stepContainer):
        '''
        This function is needed to convert an AnalysisStep UUID to a basic dictionary representation of the AnalysisStep, by grabbing it from the database.
        Alternatively, request.embed(uuid, '@embedded') could work in lieu of self.collection.get(<uuid>), if can access it while embedding.

        :param stepContainer: A dictionary containing 'step' - a UUID of an AnalysisStep, and 'step_name', a name for the step used within workflow (overrides AnalysisStep.properties.name).
        '''
        uuid = stepContainer['step']
        resultStepProperties = ['software_used', 'analysis_step_types'] # props to leave in
        step = system_collection.get(str(uuid))
        stepDict = {
            'inputs' : step.properties.get('inputs', []), # Probably doesn't exist. We'll fill later.
            'outputs' : step.properties.get('outputs', []),
            'name' : step.properties.get('name') or step.properties.get('display_title'),
            'meta' : {}
        }
        stepDict['meta'].update(step.properties)
        stepKeys = list(stepDict['meta'].keys())
        for key in stepKeys:
            if key not in resultStepProperties:
                del stepDict['meta'][key]

        # Use 'step_name' as provided in Workflow's 'workflow_steps', to override AnalysisStep 'name', in case step is renamed in Workflow.
        # Is unlikely, but possible, to differ from AnalysisStep own name.
        stepDict['name'] = stepContainer.get('step_name', stepDict.get('name'))
        if stepDict['meta'].get('software_used') is not None:
            stepDict['meta']['software_used'] = '/software/' + stepDict['meta']['software_used'] + '/' # Convert to '@id' form so is picked up for embedding.
        #stepDict['meta']['@id'] = step.jsonld_id(request)
        return stepDict

    def mergeIOForStep(outputArgs, argType = "output"):
        '''
        IMPORTANT:
        Each 'argument' item has up to two argument_mappings in current Workflows data structure, though there could be many more mappings than that, so in practice there are
        multiple 'argument' items for the same argument node. To handle this, we distribute arguments->argument_mappings among steps first, as inputs with sources or outputs with targets,
        then in this function, combine them when step & step_argument_name are equal.

        :param outputArgs: 'input' or 'output' items of a 'constructed' analysis_step item.
        :param argType: Whether we are merging/combining inputs or outputs.
        '''
        argTargetsPropertyName = 'target' if argType == 'output' else 'source' # Inputs have a 'source', outputs have a 'target'.
        seen_argument_names = {}
        resultArgs = []
        for arg in outputArgs:
            argName = arg.get('name')
            if argName:
                priorArgument = seen_argument_names.get(argName)
                if priorArgument and len(arg[argTargetsPropertyName]) > 0:
                    for currentTarget in arg[argTargetsPropertyName]:
                        foundExisting = False
                        for existingTarget in priorArgument[argTargetsPropertyName]:
                            if (
                                existingTarget['name'] == currentTarget['name']
                                and existingTarget.get('step','a') == currentTarget.get('step','b')
                            ):
                                existingTarget.update(currentTarget)
                                foundExisting = True
                        if not foundExisting:
                            priorArgument[argTargetsPropertyName].append(currentTarget)
                else:
                    resultArgs.append(arg)
                    seen_argument_names[argName] = arg
        return resultArgs


    def buildIOFromMapping(currentArgument, currentArgumentMap, currentMapIndex, argumentType):
        '''
        Given an argument_mapping item & its index (currentArgumentMap, currentMapIndex),
        its parent argument (currentArgument), and type of node to create ("input" or "output"; argumentType),
        generates an input or output object for a step with "source" or "target" properties which reference the previous or next step, including if is a 'global' "Workflow Input/Output File".

        :param currentArgument: Dictionary item from 'arguments' property list. Should have an 'argument_mapping' list with a maximum of 2 entries and/or 'workflow_argument_name' (if global input/output).
        :param currentArgumentMap: Dictionary item from 'arguments' item's 'argument_mapping' list.
        :param currentMapIndex: Index of currentArgumentMap within its parent 'arguments'->'argument_mapping' list.
        :param argumentType: "input" or "output", to know what form of node is being created.
        :returns: Dictionary representing an I/O node of a step, containing a list for "source" or "target" which directs to where I/O node came from or is going to next.
        '''

        # Input nodes have a 'source', output nodes have a 'target'
        argTargetsPropertyName = 'target' if argumentType == 'output' else 'source'

        io = {
            "name" : currentArgument.get("workflow_argument_name",
                currentArgumentMap.get('step_argument_name')
            ),
            argTargetsPropertyName : []     # To become list of "source" or "target" steps.
        }

        mapping = currentArgument['argument_mapping'] # siblings, inclusive, of 'currentArgumentMap'

        doesOppositeIOMappingExist = len([
            mp for mp in mapping if (
                mp.get('step_argument_type').lower() == ('input' if argumentType == 'output' else 'output') + ' file' or
                mp.get('step_argument_type').lower() == ('input' if argumentType == 'output' else 'output') + ' file or parameter'
            )
        ]) > 0

        # Confirmed Assumption : If a "workflow_argument_name" is present on argument, then it is a "global" "workflow output" or "workflow input" argument.
        # So, we create/add an explicit source or target item to node to indicate this.
        # 'doesOppositeIOMappingExist' check may not be necessary, operates on optimization assumption (comment in next if statement)
        #  -- if doesOppositeIOMappingExist is **true** and workflow_argument_name is not None, we could throw an Exception.
        if currentArgument.get("workflow_argument_name") is not None and not doesOppositeIOMappingExist:
            argTargetsProperty = { "name" : currentArgument["workflow_argument_name"] }
            if currentArgumentMap['step_argument_type'] == 'parameter':
                argTargetsProperty["type"] = "Workflow Parameter"
            else:
                argTargetsProperty["type"] = "Workflow " + argumentType.capitalize() + " File"
            io[argTargetsPropertyName].append(argTargetsProperty)
        if len(mapping) > 1:
            # Optimization. There is at most two mappings in argument_mapping. Use other 1 (not mapping of current step) to build "source" or "target" of where argument came from or is going to.
            otherIndex = 0
            if currentMapIndex == 0:
                otherIndex = 1
            other_arg_type = mapping[otherIndex].get("step_argument_type")
            io[argTargetsPropertyName].append({
                "name" : mapping[otherIndex]["step_argument_name"],
                "step" : mapping[otherIndex]["workflow_step"],
                "type" : other_arg_type
            })

        # Dump anything else defined on current arguments[] property item into 'meta' property of our input or output node.
        # Info such as "cardinality", "argument_format" may be available from here.
        io["meta"] = { k:v for (k,v) in currentArgument.items() if k not in ["argument_mapping", "workflow_argument_name"] }
        return io






    steps = map(getStepDict, workflow_steps)

    resultSteps = []

    # Distribute arguments into steps' "inputs" and "outputs" arrays.
    # Transform 'argument_mapping' to be 'source' or 'target' of the 'input' or 'output' argument, re: context of step it is attached to (the other mapping). @see def buildIONodeFromMapping.
    # Then combine them for each step where step_argument_name & step are equal. @see def mergeIOForStep.
    for step in steps:
        step['inputs'] = []
        step['outputs'] = []

        for arg in arguments:
            mapping = arg.get('argument_mapping')
            if mapping is None:
                continue
            for mappingIndex, mappedArg in enumerate(mapping):
                mappedArgStepName = mappedArg.get('workflow_step')
                if mappedArgStepName == step['name'] or (is_uuid(mappedArgStepName) and mappedArgStepName == step['uuid']):
                    step_argument_type = mappedArg.get('step_argument_type','').lower()
                    # Deprecated, but some older Workflows might be using UUID for mappedArg.workflow_step instead of step_name.
                    if is_uuid(mappedArgStepName):
                        mappedArg['workflow_step'] = step['name']
                    if   ( step_argument_type == 'input file'  or step_argument_type == 'input file or parameter' or step_argument_type == 'parameter' ):
                        step["inputs"].append(buildIOFromMapping(arg, mappedArg, mappingIndex, 'input'))
                    elif ( step_argument_type == 'output file' or step_argument_type == 'output file or parameter' ):
                        step["outputs"].append(buildIOFromMapping(arg, mappedArg, mappingIndex, 'output'))
        step['outputs'] = mergeIOForStep(step['outputs'], 'output')
        step['inputs']  = mergeIOForStep( step['inputs'], 'input' )
        resultSteps.append(step)

    value['steps'] = resultSteps
    del value['workflow_steps']

    filtered_arguments = []
    for arg in arguments:
        if arg.get('argument_mapping') is not None:
            del arg['argument_mapping']
        if len(arg.keys()) != 0:
            filtered_arguments.append(arg)
    
    value['arguments'] = filtered_arguments
    return value