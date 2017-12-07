import uuid
import json
import urllib

class Software(object):

    def __init__(self, uuid=None, name=None, version=None, commit=None, 
                 software_type=None, **kwargs):
        self.uuid = None
        self.name = None
        self.version = None
        self.commit = None
        self.software_type = None
        self.title = None
        self.award = "1U01CA200059-01"
        self.lab = "4dn-dcic-lab"

        self.add(uuid, name, version, commit, software_type)


    def add(self, uuid=None, name=None, version=None, commit=None, 
            software_type=None):

        if uuid:
            self.uuid = uuid
        if name:
            self.name = name
        if version:
            self.version = version
        if commit:
            self.commit = commit
        if software_type:
            self.software_type = software_type
        self.title = None

        if self.name:
            if self.version:
              self.title = self.name + '_' + self.version
            elif self.commit:
              self.title = self.name + '_' + self.commit[:5]
            else:
              self.title = self.name
        if not self.uuid and not uuid:
            self.assign_uuid()


    def as_dict(self):
        return self.__dict__


    def comp_core(self, name, version=None, commit=None):
        '''
        return true if the current object is identical to the name, version and commit provided
        '''
        if self.name != name:
            return False
        if self.version != version:
            return False
        if self.commit != commit:
            return False
        return True


    def comp(self, software):
        '''
        return true if the current object is identical to another software object provided
        '''
        return self.comp_core(software.name, software.version, software.commit)


    def assign_uuid(self):
        '''
        assign random uuid
        '''
        self.uuid = str(uuid.uuid4())


def map_field(field):
    '''
    converts field name in text (e.g. 'SOFTWARE') to field name in class Software (e.g. 'name')
    '''
    field_map = { 'SOFTWARE': 'name',
                  'VERSION': 'version',
                  'COMMIT': 'commit',
                  'TYPE': 'software_type' }
    if field not in field_map:
        print("field{} not in field_map.".format(field))

    return field_map.get(field)


def parser(textfile):
    '''
    returns a list of Software objects parsed from a text file containing fields
    in header lines starting with '##'.
    The software objects are in dictionary.
    '''
    swlist=[]
    startover=False
    with open(textfile, 'r') as f:
        for x in f:
            x = x.strip('\n')
            if not x:
                startover = True
            else:
                if startover:
                    swlist.append(Software())
                startover = False
    
                if x.startswith('##'):
                    field, value = x.split()[1:3]
                    field = field.strip(':')
                    swlist[-1].add(**{map_field(field): value})

    return [_.as_dict() for _ in swlist]


def get_existing(insert_jsonfile):
    '''
    returns a list of Software objects parsed from an insert json file
    The software objects are in dictionary
    '''
    with open(insert_jsonfile, 'r') as f:
        d = json.load(f)
    swlist = [Software(**_) for _ in d]
    return [_.as_dict() for _ in swlist]    


def filter_swlist(sl, sl_exist):
    '''
    filters out from a swlist (sl) elements that exist in sl_exist
    '''
    swlist = [Software(**_) for _ in sl]
    swlist_exist = [Software(**_) for _ in sl_exist]
    sl_new = []
    for sw in swlist:
        remove=False
        for sw2 in swlist_exist:
            if sw.comp(sw2):
                remove=True
        if not remove:
            sl_new.append(sw.as_dict())
    return(sl_new)


def add_software_to_insert(docker_reponame, docker_version, insert_jsonfile):
    '''
    downloads a text file from a docker repo that contains software info and adds them to insert_jsonfile
    '''
    # download downloads.sh file from a docker repo
    docker_downloads_url = 'https://github.com/' + docker_reponame + '/blob/' + docker_version + '/downloads.sh'
    downloaded_file_name = 'downloads.sh'
    urllib.retrieve(docker_downloads_url, downloaded_file_name)

    # get a filtered list of software
    sl1 = parser(downloaded_file_name)
    sl2 = get_existing(insert_jsonfile)
    sl_filtered = filter_swlist(sl1, sl2)

    # overwrite insert_jsonfile
    with open(insert_jsonfile, 'w') as fw:
        json.dump(sl_filtered, fw)


def add_repliseq_software():
    '''
    adds software info from repli-seq pipeline docker v10 to inserts and prod-inserts
    '''
    add_software_to_insert('4dn-dcic/docker-4dn-repliseq', 'v10', 'src/encoded/tests/data/inserts/software.json')
    add_software_to_insert('4dn-dcic/docker-4dn-repliseq', 'v10', 'src/encoded/tests/data/prod-inserts/software.json')
