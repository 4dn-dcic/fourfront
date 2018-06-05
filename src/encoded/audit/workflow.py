from snovault import (
    AuditFailure,
    audit_checker,
)
from collections import defaultdict

@audit_checker(
    'Workflow',
    frame=['steps']
)
def audit_workflow_steps(value, system):
    '''
    Ensure that this Workflow has steps property in the proper form.

    TODO: Make sure that non-global targets & sources have a 'step' defined.
    '''

    steps = value.get('steps')

    if steps is None or len(steps) == 0:
        yield AuditFailure('Missing Steps', 'Workflow "{}" is missing a steps property or has 0 steps.'.format(value['@id']), level='ERROR')
        return

    for step_idx, step in enumerate(steps):
        step_name = step.get('name')
        if step_name is None:
            yield AuditFailure('Missing Step Name', 'Workflow "{}" has a step without a name.'.format(value['@id']), level='ERROR')
            step_name = "UNNAMED STEP at index " + str(step_idx)
        else:
            step_name = '"' + step_name + '" (index ' + str(step_idx) + ')'
        outputs = step.get('outputs')
        inputs = step.get('inputs')
        if outputs is None or len(outputs) == 0:
            yield AuditFailure('Missing Step Outputs', 'Workflow "{}" step {} is missing an outputs property (or it is empty).'.format(value['@id'], step_name), level='ERROR')
        if inputs is None or len(inputs) == 0:
            yield AuditFailure('Missing Step Inputs', 'Workflow {} step {} is missing an inputs property (or it is empty).'.format(value['@id'], step_name), level='ERROR')
        step_meta = step.get('meta', {})
        step_meta_software_used = step_meta.get('software_used', [])
        if len(step_meta_software_used) == 0:
            yield AuditFailure('No meta property', 'Workflow {} step {} has no softwares in its `step.meta.software_used field` (list).'.format(value['@id'], step_name), level='WARNING')

        input_names = set()
        input_source_names = set()
        for input_idx, input in enumerate(inputs):
            input_name = input.get('name')
            if input_name is None:
                yield AuditFailure('Missing name', 'Workflow {} step {} input has no name defined.'.format(value['@id'], step_name), level='ERROR')
                input_name = "UNNAMED at index " + str(input_idx)
            else:
                input_name = '"' + input_name + '" (index ' + str(input_idx) + ')'
            if input_name in input_names:
                yield AuditFailure('Duplicate name', 'Workflow {} step {} has outputs with duplicate name "{}".'.format(value['@id'], step_name, input_name), level='ERROR')
            input_names.add(input_name)
            input_type = input.get('meta', {}).get('type')
            if input_type is None:
                yield AuditFailure('Missing meta property', 'Workflow {} step {} input {} is missing `meta.type` (should be "data file", "reference file", "parameter", etc.).'.format(value['@id'], step_name, input_name), level='WARNING')
            if input_type != 'parameter' and input.get('meta', {}).get('file_format') is None:
                yield AuditFailure('Missing meta property', 'Workflow {} step {} input {} is missing `meta.file_format`.'.format(value['@id'], step_name, input_name), level='WARNING')
            if input.get('source') is None:
                yield AuditFailure('Missing input source', 'Workflow {} step {} input {} is missing `source` (list).'.format(value['@id'], step_name, input_name), level='ERROR')
                continue
            for source_idx, source in enumerate(input['source']):
                if source.get('name') is None:
                    yield AuditFailure('Missing name', 'Workflow {} step {} input {} source with index {} has no name defined.'.format(value['@id'], step_name, input_name, str(source_idx)), level='ERROR')
                    continue
                if source['name'] in input_source_names:
                    yield AuditFailure('Duplicate name', 'Workflow {} step {} input {} has sources with duplicate name "{}".'.format(value['@id'], step_name, input_name, source['name']), level='ERROR')
                input_source_names.add(source['name'])
                if input.get('meta', {}).get('global') == False:
                    if source.get('step') is None:
                        yield AuditFailure('Missing source step', 'Workflow {} step {} non-global input {} source "{}" is missing `step` field/name.'.format(value['@id'], step_name, input_name, source['name']), level='ERROR')

        output_names = set()
        output_target_names = set()
        for output_idx, output in enumerate(outputs):
            output_name = output.get('name')
            if output_name is None:
                yield AuditFailure('Missing name', 'Workflow {} step {} output with list index {} has no name defined.'.format(value['@id'], step_name, str(output_idx)), level='ERROR')
                output_name = "UNNAMED at index " + str(input_idx)
            else:
                output_name = '"' + output_name + '" (index ' + str(output_idx) + ')'
            if output_name in output_names:
                yield AuditFailure('Missing name', 'Workflow {} step {} has inputs with duplicate name "{}".'.format(value['@id'], step_name, output_name), level='ERROR')
            output_names.add(output_name)
            output_type = output.get('meta', {}).get('type')
            if output_type is None:
                yield AuditFailure('Missing meta property', 'Workflow {} step {} output {} is missing `meta.type` (should be "data file", "reference file", "parameter", etc.).'.format(value['@id'], step_name, output_name), level='WARNING')
            if output_type != 'parameter' and output.get('meta', {}).get('file_format') is None:
                yield AuditFailure('Missing meta property', 'Workflow {} step {} output {} is missing `meta.file_format`.'.format(value['@id'], step_name, output_name), level='WARNING')
            if output.get('target') is None:
                yield AuditFailure('Missing output target', 'Workflow {} step {} output {} is missing `target` (list).'.format(value['@id'], step_name, output_name), level='ERROR')
                continue
            for target_idx, target in enumerate(output['target']):
                if target.get('name') is None:
                    yield AuditFailure('Missing name', 'Workflow {} step {} output {} target with index {} has no name defined.'.format(value['@id'], step_name, output_name, str(target_idx)), level='ERROR')
                    continue
                if target['name'] in output_target_names:
                    yield AuditFailure('Duplicate name', 'Workflow {} step {} output {} has targets with duplicate name "{}".'.format(value['@id'], step_name, output_name, target['name']), level='ERROR')
                output_target_names.add(target['name'])
                if output.get('meta', {}).get('global') == False:
                    if target.get('step') is None:
                        yield AuditFailure('Missing target step', 'Workflow {} step {} non-global output {} target "{}" is missing `step` field/name.'.format(value['@id'], step_name, output_name, target['name']), level='ERROR')

    return
