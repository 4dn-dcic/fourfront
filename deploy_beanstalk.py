import os
import sys
import subprocess
import hashlib

def get_git_version():
    version = subprocess.check_output(
        ['git', '-C', os.path.dirname(__file__), 'describe']).decode('utf-8').strip()
    diff = subprocess.check_output(
        ['git', '-C', os.path.dirname(__file__), 'diff', '--no-ext-diff'])
    if diff:
        version += '-patch' + hashlib.sha1(diff).hexdigest()[:7]
    return version

def update_version_in_ebextension(version):
    filename = '.ebextensions/01_packages.config'
    regex = 's/ENCODED_VERSION.*/ENCODED_VERSION\" : \"%s\"/' % (version)

    print("updated ebextensions with version", version)
    subprocess.check_output(
        ['sed', '-i', '', regex, filename])
    print("adding file to git")
    subprocess.check_output(
        ['git', 'add', filename])
    print("git commit")
    subprocess.check_output(
        ['git', 'commit', '-m', 'version bump'])

def deploy():
    '''
    run eb deploy and show the output
    '''
    print("start deployment to elastic beanstalk")

    p = subprocess.Popen(['eb', 'deploy'], stderr=subprocess.PIPE)
    while True:
        out = p.stderr.read(1)
        out = out.decode('utf-8')
        if out == '' and p.poll() != None:
            break
        if out != '':
            sys.stdout.write(out)
            sys.stdout.flush()

if __name__ == "__main__":
    ver = get_git_version()
    update_version_in_ebextension(ver)
    deploy()
