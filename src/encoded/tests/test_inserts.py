import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working]
from encoded.commands.run_upgrader_on_inserts import get_inserts


def test_check_wf_links():
    workflow_inserts = list(get_inserts('inserts', 'workflow'))
    software_inserts = list(get_inserts('inserts', 'software'))
    fileformat_inserts = list(get_inserts('master-inserts', 'file_format'))
    check_wf_links(workflow_inserts, software_inserts, fileformat_inserts)


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
                    parsed_sf = parse_software_uuid(sf)
                    if parsed_sf not in all_sf:
                        print('Could not find software %s from workflow %s' % (parsed_sf, wf['uuid']))
                    assert parsed_sf in all_sf
        # compare file format
        # file format in arguments
        for arg in wf.get('arguments', []):
            if 'argument_format' in arg:
                if arg['argument_format'] not in all_ff:
                    print('Could not find file_format %s from workflow %s' % (arg['argument_format'], wf['uuid']))
                assert arg['argument_format'] in all_ff
        # file format in step input/output
        for st in wf.get('steps', []):
            for ip in st.get('inputs', []):
                if 'file_format' in ip.get('meta', {}):
                    if ip['meta']['file_format'] not in all_ff:
                        print('Could not find file_format %s from workflow %s' % (ip['meta']['file_format'], wf['uuid']))
                    assert ip['meta']['file_format'] in all_ff
            for op in st.get('outputs', []):
                if 'file_format' in op.get('meta', {}):
                    if op['meta']['file_format'] not in all_ff:
                        print('Could not find file_format %s from workflow %s' % (op['meta']['file_format'], wf['uuid']))
                    assert op['meta']['file_format'] in all_ff


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
