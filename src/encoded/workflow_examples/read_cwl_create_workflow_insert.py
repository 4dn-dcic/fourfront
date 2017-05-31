#!/usr/bin/python

import json
import sys
import random


def generate_uuid ():
  rand_uuid_start=''
  for i in range(8):
    r=random.choice('abcdef1234567890')
    rand_uuid_start += r
    uuid=rand_uuid_start + "-49e5-4c33-afab-9ec90d65faf3"
  return uuid


# function that parses 'source' field of CWL, which contain information of step and argument names.
# it returns a dictionary with 'step' and 'arg' as key.
# if the source is global, 'step' will be ''.
def parse_source(source_str): 
  source={}
  source_str = source_str.strip('#')

  if '.' in source_str:  ## the format is  #step.ID, so if '.' doesn't exist, that implies this is a global argument.
    ## step argument ##
    source_arr = source_str.split(".")
    source['step'] = source_arr[0]
    source['arg'] = source_arr[1]
  else:
    ## global argument ##
    source['step'] = ''
    source['arg'] = source_str
  return(source)



# given the type field of an element of cwl_dict['inputs'] (e.g. cwl_dict['inputs'][1]['type'], return either 'Input file' or 'parameter'. 
def Is_Input_file_or_parameter ( cwl_param_type ):

  argument_type='parameter'  ## default is parameter unless the following conditions meet

  if isinstance(cwl_param_type,list):
    if 'File' in cwl_param_type:  #  e.g. type=[ 'File','null' ]  (SBG)
      argument_type='Input file'
    elif isinstance(cwl_param_type[0],dict) and cwl_param_type[0]['type']=='array' and cwl_param_type[0]['items']=='File':  # e.g. type=[{'type':'array','items':'File'}] (SBG)
      argument_type='Input file'
  elif cwl_param_type=='File':     # e.g. type='File'
    argument_type='Input file'
  elif isinstance(cwl_param_type,dict) and cwl_param_type['type']=='array' and cwl_param_type['items']=='File':  # e.g. type={'type':'array','items':'File'}
    argument_type='Input file'

  return argument_type



# Add a workflow output argument and map to the step output argument.
# for now we assume that 1. a global output argument has a single source and 2. that it is an output of some step. (I think this is a reasonable assumption)
def map_workflow_output_argument_to_step_argument ( workflow, source, workflow_argument, step, step_argument ):
  workflow['arguments'].append( 
    {'workflow_argument_name': workflow_argument, 
     'argument_type':'Output file', 
     'argument_mapping':[{ 'workflow_step': step,
                           'step_argument_name': step_argument,
                           'step_argument_type':'Output file' 
                        }]
    })  



# Add a step argument and map to the global input source.
# Assumes the global source exists in workflow['arguments']
def map_step_argument_to_workflow_input_argument ( workflow, source, step_id, step_argument ):

  if 'arguments' in workflow:
    argument_index= -1
    for i in range(0,len(workflow['arguments'])):
      e = workflow['arguments'][i]
      if e['workflow_argument_name'] == source['arg']:
        argument_index = i
        global_argument_type = e['argument_type']
    if argument_index == -1:
      sys.exit("Error: corresponding workflow argument doesn't exist: {}".format(source['arg']))
  else:
    sys.exit("Error: workflow argument doesn't exist.")
  
  # fill in the workflow dictionary. The step argument type is assumed to be the same as global argument type (in this case global argument type exists and since it is the source, it is either Input file or parameter.)
  workflow['arguments'][argument_index]['argument_mapping']= \
    [{ 'workflow_step': step_id, # id of the step.
       'step_argument_name': step_argument, # id of an input entry of the step, remove '#step' from #step.ID
       'step_argument_type': global_argument_type
    }]



# add a step argument and map it to another step argument
# if source step argument doesn't exist in the workflow dictionary yet, create a new entry.
# the function assumes that the source is not a global argument.
def map_step_argument_to_another_step_argument ( workflow, source, step_id, step_argument ):

  if 'arguments' in workflow:
    for i in range(0,len(workflow['arguments'])):
      e= workflow['arguments'][i]
      argument_index=-1
      if 'workflow_argument_mapping' in e:
        for e2 in e['workflow_argument_mapping']:
          if e['workflow_step'] == source.step and e['step_argument_name'] == source.arg: # sourced from a previously entered entry.
            argument_index=i
            workflow['arguments'][argument_index]['argument_mapping']= \
              [{ 'workflow_step': step_id, # id of the step.
                 'step_argument_name': step_argument, # id of an input entry of the step, remove '#step' from #step.ID
                 'step_argument_type': 'Input file or parameter'
              },
              { 'workflow_step': source['step'], # id of the source step.
                 'step_argument_name': source['arg'],
                 'step_argument_type': 'Output file or parameter' # do we pass parameters between steps as well?
              }]
            break # in theory there should be only a single match, so break shoudn't be necessary except for saving time.
      if argument_index == -1: ## corresponding source step argument doesn't exist. It may appear later in cwl.
        # sys.exit("Error: corresponding source step argument doesn't exist.") # don't produce error message. create a new entry.
        workflow['arguments'].append( 
          {'workflow_argument_name': '',
           'argument_type':'', 
           'argument_mapping':[{ 'workflow_step': step_id,
                                 'step_argument_name': step_argument,
                                 'step_argument_type':'Input file or parameter'  # either Input file or parameter. # Is there a way to know this from workflow cwl? I will not decide it for now : any argument that is not globally associated doesn't matter too much in terms of schema.
                              },
                              { 'workflow_step': source['step'],
                                'step_argument_name': source['arg'],
                                'step_argument_type':'Output file or parameter' # do we pass parameters between steps as well?
                              }]
          })  
  else:
    sys.exit("Error: workflow argument doesn't exist.")




# function that takes a cwl file and write a workflow insert json file
def parse_cwl(cwlfile, workflow_metadata_json, workflow_name, workflow_description, workflow_type, cwl_url, uuid):

  # get cwl as a dict
  with open(cwlfile,'r') as f:
    cwl_dict=json.load(f)

  # handle SBG cwl.
  if 'raw' in cwl_dict:
    cwl_dict=cwl_dict['raw']  # 'some' SBG's cwl is one level down under the 'raw' field.
  
  # initialize dictionary to write to output json file
  workflow={ 'arguments':[],  # this is what we will create.
             "workflow_steps": [], # this, too.
             "title": workflow_name,
             "description": workflow_description,
             "workflow_type": workflow_type,
             "cwl_pointer": cwl_url,
             "workflow_diagram": '',
             "uuid": uuid }


  # parsing global input files and parameters and storing to the workflow dictionary (can't map to step arguments yet)
  # argument type is either 'Input file' or 'parameter'.
  for x in cwl_dict['inputs']:
    argument_type = Is_Input_file_or_parameter (x['type'])
    workflow['arguments'].append({'workflow_argument_name':x['id'].strip('#'), 'argument_type':argument_type})

  ## parsing global output files and storing to the workflow dictionary and mapping to step arguments 
  ## (the mapping (source) information is in the same field in cwl since the global output is usually sourced from a step output )
  for x in cwl_dict['outputs']:
    source = parse_source(x['source'][0])
    map_workflow_output_argument_to_step_argument ( workflow, source, x['id'].strip('#'), source['step'], source['arg'] )

  ## parsing steps (map 1. global output files to step arguments and 2. between arguments between steps that are not globally defined)
  ## fill in 'arguments'
  for x in cwl_dict['steps']:
    for y in x['inputs']:
      if 'source' in y:
        source = parse_source(y['source'][0])
  
        ## case 1: global argument is the source
        if source['step']=='': 
          map_step_argument_to_workflow_input_argument( workflow, source, x['id'].strip('#'), parse_source(y['id'])['arg'] )
   
        ## case 2: no global argument (just passing between steps)
        else:
          map_step_argument_to_another_step_argument( workflow, source, x['id'].strip('#'), parse_source(y['id'])['arg'] )
       
        ## case 3 (no global argument, no passing between steps) - we assume this doesn't exist.

  ## parsing steps again
  ## fill in workflow_steps.
  for x in cwl_dict['steps']:
    workflow['workflow_steps'].append( { 'step_name': x['id'].strip('#'), 'step': generate_uuid() } )   ## assuming that uuid for step is generated at this point? Or should we retrieve a corresponding step that already exists?


  with open(workflow_metadata_json,'w') as fo:
    fo.write ( json.dumps(workflow,indent=4) + "\n")
    #fo.write ( cwl_dict.keys() + "\n")
    #fo.write ( json.dumps(cwl_dict['outputs'],indent=4) + "\n")
  


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="temporary cwl parser that creates a workflow insert")
    parser.add_argument('-c','--cwlfile', help='input cwlfile')
    parser.add_argument('-w','--workflow_metadata_json', help='output workflow metadata json file')
    parser.add_argument('-n','--workflow_name', help='output workflow metadata json file')
    parser.add_argument('-d','--workflow_description', help='output workflow metadata json file')
    parser.add_argument('-t','--workflow_type', help='output workflow metadata json file')
    parser.add_argument('-u','--cwl_url', help='output workflow metadata json file')
    args = parser.parse_args()
    uuid= generate_uuid()
    parse_cwl(args.cwlfile, args.workflow_metadata_json, args.workflow_name, args.workflow_description, args.workflow_type, args.cwl_url, uuid )


