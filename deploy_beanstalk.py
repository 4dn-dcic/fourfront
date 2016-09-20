import os
import sys
import subprocess
import hashlib
import argparse


def get_git_version():
    if (os.environ.get("TRAVIS_BRANCH") == "production"):
        version = os.environ.get("ENCODED_VERSION", None)
    else:
        version = os.environ.get("TRAVIS_COMMIT")
    if not version:
        version = subprocess.check_output(
            ['git', '-C', os.path.dirname(__file__), 'describe']).decode('utf-8').strip()
        diff = subprocess.check_output(
            ['git', '-C', os.path.dirname(__file__), 'diff', '--no-ext-diff'])
        if diff:
            version += '-patch' + hashlib.sha1(diff).hexdigest()[:7]
    return version


def update_version(version):
    filename = 'buildout.cfg'
    regex = 's/encoded_version.*/encoded_version = %s/' % (version)

    print("updated buildout.cfg with version", version)
    subprocess.check_output(
        ['sed', '-i', regex, filename])

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
    parser = argparse.ArgumentParser(
        description="update version if relevant and deploy"
    )
    parser.add_argument('--prod', action="store_true", help="deploy to prod")
    args = parser.parse_args()

    if not args.prod:
        ver = get_git_version()
        update_version(ver)
    deploy()
