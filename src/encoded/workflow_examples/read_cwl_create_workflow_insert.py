#!/usr/bin/python

import json

def parse_source(source_str): 
  source={}
  if '.' in source_str:  ## the format is  #step.ID, so if '.' doesn't exist, that implies this is a global argument.
    source_arr = source_str.split(".")
    source['step'] = source_arr[0].strip('#')
    source['arg'] = source_arr[1]
  else:
    source['step'] = ''
    source['arg'] = source_str.strip('#')
  return(source)


def parse_cwl(cwlfile, workflow_metadata_json):

  # get cwl as a dict
  with open(cwlfile,'r') as f:
    cwl_dict=json.load(f)
  cwl_dict=cwl_dict['raw']  # SBG's cwl is one level down under the 'raw' field.
  

  workflow={ 'arguments':[] }  # this is what we will create.


  ## parsing global input files and parameters (can't map to step arguments yet)
  for x in cwl_dict['inputs']:
    argument_type='parameter'  ## default.
    if isinstance(x['type'],list):
       if 'File' in x['type']:  #  e.g. type=[ 'File','null' ]  (SBG)
           argument_type='Input file'
       elif isinstance(x['type'][0],dict) and x['type'][0]['type']=='array' and x['type'][0]['items']=='File':  # e.g. type=[{'type':'array','items':'File'}] (SBG)
           argument_type='Input file'
    elif x['type']=='File':     # e.g. type='File'
           argument_type='Input file'
    elif isinstance(x['type'],dict) and x['type']['type']=='array' and x['type']['items']=='File':  # e.g. type={'type':'array','items':'File'}
           argument_type='Input file'

    workflow['arguments'].append({'workflow_argument_name':x['id'], 'argument_type':argument_type})


  ## parsing global output files (map to step arguments)
  for x in cwl_dict['outputs']:
    source = parse_source(x['source'][0])
    workflow['arguments'].append( 
       {'workflow_argument_name':x['id'], 
        'argument_type':'Output file', 
        'argument_mapping':[{ 'workflow_step':source['step'],
                              'step_argument_name':source['arg'],
                              'step_argument_type':'Output_file' 
                           }]
       })  ## for now we assume that 1. a global output argument has a single source and 2. that it is an output of some step.


  ## parsing steps (map 1. global output files to step arguments and 2. between arguments between steps that are not globally defined)
  #for x in cwl_dict['steps']:
    #for y in x['inputs']:
      #source = parse_source(y['source'][0])
      #if source.step=='':  ## PROBLEM!!! how do we match b
    #fo.write( json.dumps(x,indent=4)+"\n" )
     
  with open(workflow_metadata_json,'w') as fo:
    fo.write ( json.dumps(workflow,indent=4) + "\n")
    #fo.write ( cwl_dict.keys() + "\n")
    #fo.write ( json.dumps(cwl_dict['outputs'],indent=4) + "\n")
  


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="temporary cwl parser that creates a workflow insert")
    parser.add_argument('-c','--cwlfile', help='input cwlfile')
    parser.add_argument('-w','--workflow_metadata_json', help='output workflow metadata json file')
    args = parser.parse_args()
    parse_cwl(args.cwlfile, args.workflow_metadata_json)


