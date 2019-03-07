from encoded.commands.run_upgrader_on_inserts import get_inserts
workflow_inserts = list(get_inserts('inserts', 'workflow'))
software_inserts = list(get_inserts('inserts', 'software'))
fileformat_inserts = list(get_inserts('inserts', 'file_format'))


def check_wf_links(workflow_inserts, software_inserts, fileformat_inserts):
    # get all sf inserts uuid
    all_sf = []
    for sf in software_inserts:
        all_sf.append(sf['uuid'])
    
    # get all file format inserts uuid and format name
    all_ff = []
    for ff in fileformat_inserts:
        if 'uuid' in ff:
            all_ff.append(ff['uuid'])
        if 'file_format' in ff:
            all_ff.append(ff['file_format'])
    
    # check workflow inserts
    for wf in workflow_inserts:
        # compare software
        for st in wf.get('steps', []):
            if 'software_used' in st.get('meta', {}):
                for sf in st['meta']['software_used']:
                    assert parse_software_uuid(sf) in all_sf
                    # if parse_software_uuid(sf) not in all_sf:
                    #     print(parse_software_uuid(sf))
        # compare file format
        # file format in arguments
        for arg in wf.get('arguments', []):
            if 'argument_format' in arg:
                assert arg['argument_format'] in all_ff
                # if arg['argument_format'] not in all_ff:
                #     print(arg['argument_format'])
        # file format in step input/output
        for st in wf.get('steps', []):
            for ip in st.get('inputs', []):
                if 'file_format' in ip.get('meta', {}):
                    assert ip['meta']['file_format'] in all_ff
                    # if ip['meta']['file_format'] not in all_ff:
                    #     print(ip['meta']['file_format'])
            for op in st.get('outputs', []):
                if 'file_format' in op.get('meta', {}):
                    assert op['meta']['file_format'] in all_ff
                    # if op['meta']['file_format'] not in all_ff:
                    #     print(op['meta']['file_format'])
                
def parse_software_uuid(s):
    """parses '/software/lalala/' or '/software/lalala' into 'lalala'
    if input is already 'lalala', returns 'lalala' as well.
    if something else, returns None
    """
    ss = s.split('/')
    if len(ss) == 4 or len(ss) == 3:
        return(ss[2])
    elif len(ss) == 1:
        return(ss)
    else:
        return(None)

