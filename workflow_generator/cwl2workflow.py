import uuid as u
import json


class Workflow (object):
    def __init__(self, uuid=None, steps=None, arguments=None):
        if uuid:
            self.uuid = uuid
        else:
            self.uuid = str(u.uuid4())

        self.steps = steps
        self.arguments = arguments

        self.lab = "4dn-dcic-lab"
        self.award = "1U01CA200059-01"


    def as_dict(self):
        return rdict(self)


    def create_from_cwl(self, cwl):
        '''
        create from a Cwl object
        '''
        self.steps = [Step().create_from_cwlstep(_, cwl) for _ in cwl.steps]
        self.arguments = [Argument().create_from_cwlinput(_) for _ in cwl.inputs]
        self.arguments.extend([Argument().create_from_cwloutput(_) for _ in cwl.outputs])
        if cwl.fdn_meta:
            self.data_types = cwl.fdn_meta.data_types
            self.category = cwl.fdn_meta.category
            self.workflow_type = cwl.fdn_meta.workflow_type
            self.description = cwl.fdn_meta.description
        return self


class Step (object):
    def __init__(self, name=None, meta=None, inputs=None, outputs=None):
        self.name = name
        self.meta = meta
        self.inputs = inputs
        self.outputs = outputs


    def as_dict(self):
        return rdict(self)


    def create_from_cwlstep(self, cwlstep, cwl):
        '''
        cwlstep: a CwlStep object (a single step element)
        cwl: a Cwl object (for inputs, outputs, sourcetarget_list)
        '''
        self.name = cwlstep.name
        self.inputs = [StepInput().create_from_cwlstepinput(_, cwl) for _ in cwlstep.inputs]
        self.outputs = [StepOutput().create_from_cwlstepoutput(self.name, _, cwl) for _ in cwlstep.outputs]
        if cwlstep.fdn_step_meta:
            self.meta = cwlstep.fdn_step_meta.as_dict()
        return self


class Argument (object):
    def __init__(self, workflow_argument_name=None,
                 argument_type=None,  # "Input file", "parameter", "Output processed file",
                                      # "Output QC file" or "Output report file"
                 argument_format=None):
        self.workflow_argument_name = workflow_argument_name
        self.argument_type = argument_type
        if argument_format:
            self.argument_format = argument_format


    def as_dict(self):
        return rdict(self)


    def create_from_cwloutput(self, cwl_output):
        '''
        convert from a CwlOutput object
        '''
        self.workflow_argument_name = cwl_output.name
        if cwl_output.fdn_format:
            self.format = cwl_output.fdn_format
        if cwl_output.fdn_output_type:
            self.argument_type = "Output " + cwl_output.fdn_output_type + "file"
        return self


    def create_from_cwlinput(self, cwl_input):
        '''
        convert from a CwlInput object
        '''
        self.workflow_argument_name = cwl_input.name
        if cwl_input.isFile:
            self.argument_type = "Input file"
        else:
            self.argument_type = "parameter"
        if cwl_input.fdn_format:
            self.format = cwl_input.fdn_format
        return self


class StepInput (object):
    def __init__(self, name=None, argument_cardinality="1",
                 argument_type="Input file",  # "Input file" or "parameter"
                 argument_format=None,
                 source_name=None,
                 source_type=None,  # "Workflow Input File", "Workflow Parameter" or "Output file"
                 source_step=None):

        self.name = name

        self.meta = { "argument_cardinality": argument_cardinality,
                      "argument_type": argument_type }
        if argument_format:
            self.meta.append({"argument_format": argument_format})

        if source_name or source_type:
            self.source = [{ "name": source_name,
                             "type": source_type }]
            if source_step:
                self.source[0].append({"step": source_step})


    def as_dict(self):
        return rdict(self)


    def create_from_cwlstepinput(self, cwl_stepinput, cwl):
        '''
        convert from a CwlStepInput object
        cwl_stepinput: a CwlStepInput object (a single step input element)
        cwl: a Cwl object (for inputs, outputs, sourcetarget_list)
        '''
        # add name
        self.name = cwl_stepinput.arg_name

        # add source
        if cwl_stepinput.source:
            if cwl_stepinput.source_step:
                self.source = [{ "name": cwl_stepinput.source_arg,
                                 "type": "Output file",
                                 "step": cwl_stepinput.source_step }]
            else:
                self.source = [{ "name": cwl_stepinput.source_arg,
                                 "type": "Workflow Input file" }]

        # add format
        self.add_fdn_format_from_cwl(cwl.inputs)

        return self


    def add_fdn_format_from_cwl(self, cwl_inputs):
        '''
        add fdn_format info for the step inputs that source to global input
        assumes self.source has already been filled in.
        '''
        is_workflow_input = False
        for tg in self.source:
            if tg.get('type') == "Workflow Input File":
                is_workflow_input = True
                workflow_arg_name = tg.get('name')
                break

        if is_workflow_input:
            for op in cwl_inputs:
                if op.name == workflow_arg_name:
                    self.meta['argument_format'] = op.fdn_format
                    break


class StepOutput (object):
    def __init__(self, name=None, argument_cardinality="1", 
                 argument_type="Output processed file",  # "Output processed file", "Output QC file"
                                                         # or "Output report file"
                 argument_format=None,
                 target_name=None,
                 target_type=None,  # "Workflow Output File", "Workflow Parameter" or "Input file"
                 target_step=None):

        self.name = name

        self.meta = { "argument_cardinality": argument_cardinality,
                      "argument_type": argument_type }
        if argument_format:
            self.meta.append({"argument_format": argument_format})

        if target_name or target_type:
            self.target = [{ "name": target_name,
                             "type": target_type }]
            if target_step:
                self.target[0].append({"step": target_step})


    def as_dict(self):
        return rdict(self)


    def create_from_cwlstepoutput(self, parent_stepname, cwl_stepoutput, cwl):
        '''
        convert from CwlStepOutput object
        parent_stepname : name of the step where the step output belongs to
        cwl_stepoutput : a CwlStepOutput object ( a single step output element)
        cwl : a Cwl object
        '''
        self.name = cwl_stepoutput.arg_name
        self.add_target_from_cwloutputs(parent_stepname, cwl.sourcetarget_list)
        self.add_fdn_format_from_cwl(cwl.outputs)
        return self


    def add_target_from_cwloutputs(self, parent_stepname, cwl_sourcetarget_list):
        '''
        add target info from SourceTarget object
        '''
        for st in cwl_sourcetarget_list:
            if st.source_step == parent_stepname and st.source_arg == self.name:
                if not hasattr(self, 'target') or not self.target:
                    self.target = []
                if st.target_step:
                    target_type = "Input file"
                    self.target.append({"name": st.target_arg,
                                        "type": target_type,
                                        "step": st.target_step})
                else:
                    target_type = "Workflow Output File"
                    self.target.append({"name": st.target_arg,
                                        "type": target_type})

    def add_fdn_format_from_cwl(self, cwl_outputs):
        '''
        add fdn_format info for the step outputs that target to global output
        assumes self.target has already been filled in.
        '''
        is_workflow_output = False
        for tg in self.target:
            if tg.get('type') == "Workflow Output File":
                is_workflow_output = True
                workflow_arg_name = tg.get('name')
                break

        if is_workflow_output:
            for op in cwl_outputs:
                if op.name == workflow_arg_name:
                    self.meta['argument_format'] = op.fdn_format
                    break


    def add_fdn_output_type_from_cwl(self, cwl_outputs):
        '''
        add fdn_output_type info for the step outputs that target to global output
        assumes self.target has already been filled in.
        '''
        is_workflow_output = False
        for tg in self.target:
            if tg.get('type') == "Workflow Output File":
                is_workflow_output = True
                workflow_arg_name = tg.get('name')
                break

        if is_workflow_output:
            for op in cwl_outputs:
                if op.name == workflow_arg_name:
                    self.meta['argument_type'] = op.fdn_output_type
                    break

class CwlOutput (object):
    def __init__(self, id=None, source=None, type=None,
                 fdn_format=None, fdn_output_type=None):  # 4dn-specific custom fields
        '''
        take in elements of a cwl's 'outputs' field (dictionary) as kwargs
        '''
        assert(id)

        # id, name
        self.id = id
        self.name = id.strip('#')

        # type (as in cwl), isFile, isArray (parsed)
        self.type = type
        self.isFile = False
        self.isArray = False
        if type:
            if "File" in type:
                self.isFile = True
            else:
                for t in type:
                    if isinstance(t, dict) and 'type' in t and 'items' in t:
                        if t.get('type') == 'array':
                            self.isArray = True
                            if t.get('items') == 'File':
                                self.isFile = True

        # source (as in cwl), source_step, source_arg (parsed)
        if source:
            self.source = source
            self.source_step, self.source_arg = self.source.strip('#').split('.')

        self.fdn_format = fdn_format
        self.fdn_output_type = fdn_output_type


    def get_sourcetarget(self):
        return SourceTarget(self.source_step, self.source_arg, None, self.name)


class CwlInput (object):
    def __init__(self, id=None, type=None, default=None,
                 fdn_format=None):  # 4dn-specific custom field
        '''
        take in elements of a cwl's 'inputs' field (dictionary) as kwargs
        '''

        # id (as in cwl), name (parsed)
        self.id = id
        if id:
            self.name = id.strip('#')

        # type (as in cwl), isFile, isArray (parsed)
        self.type = type
        self.isFile = False
        self.isArray = False
        if type:
            if "File" in type:
                self.isFile = True
            else:
                for t in type:
                    if isinstance(t, dict) and 'type' in t and 'items' in t:
                        if t.get('type') == 'array':
                            self.isArray = True
                            if t.get('items') == 'File':
                                self.isFile = True

        self.default = default
        self.fdn_format = fdn_format


class CwlStepOutput (object):
    def __init__(self, id=None):
        '''
        take in elements of a cwl's 'steps::outputs' field (dictionary) as kwargs
        '''
        assert(id)

        # id (as in cwl), name, step_name, arg_name (parsed)
        self.id = id
        self.name = id.strip('#')
        self.step_name, self.arg_name = self.name.split('.')


class CwlStepInput (object):
    def __init__(self, id=None, source=None):
        '''
        take in elements of a cwl's 'steps::inputs' field (dictionary) as kwargs
        '''
        assert(id)

        # id (as in cwl), name, step_name, arg_name (parsed)
        self.id = id
        self.name = id.strip('#')
        self.step_name, self.arg_name = self.name.split('.')

        # source (as in cwl), source_step, source_arg (parsed)
        if source:
            self.source = source
            if len(self.source.strip('#').split('.')) == 2:
                self.source_step, self.source_arg = self.source.strip('#').split('.')
            else:
                self.source_arg = self.source.strip('#')
                self.source_step = None
        else:
            self.source = None
            self.source_step = None
            self.source_arg = None


    def get_sourcetarget(self):
        return SourceTarget(self.source_step, self.source_arg, self.step_name, self.arg_name)


class CwlStep (object):
    def __init__(self, id=None, run=None, outputs=None, inputs=None,
                 fdn_step_meta=None):  # 4dn-specific custom tag
        '''
        take in elements of a cwl's 'steps' field (dictionary) as kwargs
        '''
        self.id = id
        if id:
            self.name = id.strip('#')
        self.run = run
        self.outputs = [CwlStepOutput(**_) for _ in outputs]
        self.inputs = [CwlStepInput(**_) for _ in inputs]
        self.fdn_step_meta = CwlFdnStepMeta(**fdn_step_meta)


class Cwl (object):
     def __init__(self, inputs=None, outputs=None, steps=None,
                  cwlVersion=None, requirements=None,
                  fdn_meta=None,  # 4dn-specific custom tag
                  **kwargs):  # kwargs includes field 'class'
        '''
        take in a cwl as kwargs
        '''
        self._class = kwargs.get('class')
        self.cwlVersion = cwlVersion

        assert(self._class) == 'Workflow'
        assert(self.cwlVersion) == 'draft-3'

        self.inputs = [CwlInput(**_) for _ in inputs]
        self.outputs = [CwlOutput(**_) for _ in outputs]
        self.steps = [CwlStep(**_) for _ in steps]
        self.requirements = requirements
        if fdn_meta:
          self.fdn_meta = CwlFdnMeta(**fdn_meta)
        else:
          self.fdn_meta = None

        # list of all SourceTarget objects in CWL
        self.sourcetarget_list = [_.get_sourcetarget() for _ in self.outputs]
        for step in self.steps:
            self.sourcetarget_list.extend([_.get_sourcetarget() for _ in step.inputs])

 
class CwlFdnMeta (object):
    def __init__(self, data_types=None, category=None, workflow_type=None, description=None):
        '''
        take in cwl's 'fdn_meta' field (dictionary) as kwargs
        '''
        self.data_types = data_types
        self.category = category
        self.workflow_type = workflow_type
        self.description = description


class CwlFdnStepMeta (object):
    def __init__(self, software_used=None, description=None, analysis_step_types=None):
        '''
        take in cwl's 'steps::fdn_step_meta' field (dictionary) as kwargs
        '''
        self.software_used = software_used
        self.description = description
        self.analysis_step_types = analysis_step_types


    def as_dict(self):
        return rdict(self)


class SourceTarget (object):
    def __init__(self, source_step=None, source_arg=None, target_step=None, target_arg=None):
        self.source_step = source_step
        self.source_arg = source_arg
        self.target_step = target_step
        self.target_arg = target_arg


    def as_dict(self):
        return rdict(self)


def create_cwl_from_file(file):
    with open(file, 'r') as f:
        cwldict = json.load(f)
    return Cwl(**cwldict)


def rdict(x):
    '''
    recursive conversion to dictionary
    converts objects in list members to dictionary recursively
    '''
    if hasattr(x, '__dict__'):
        d = x.__dict__
        for k, v in d.items():
            if isinstance(v, list):
                d[k] = [rdict(_) for _ in v]
        return d
    else:
        return x

