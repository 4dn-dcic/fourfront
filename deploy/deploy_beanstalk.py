import os
import sys
import subprocess
import hashlib
import argparse


def tag(name):
    subprocess.check_output(['git', 'tag', name, '-m', 'version created for staging deploy'])
    subprocess.check_output(['git', 'push', 'origin-travis', name])


def merge(source, merge_to):
    subprocess.check_output(
        ['git', 'checkout', merge_to]).decode('utf-8').strip()
    res = subprocess.check_output(
        ['git', 'pull']).decode('utf-8').strip()
    print(res)
    res2 = subprocess.check_output(
        ['git', 'merge', source, '-m', 'merged']).decode('utf-8').strip()
    print(res2)
    subprocess.check_output(
        ['git', 'push', 'origin-travis', merge_to]).decode('utf-8').strip()


def get_git_version():
    if (os.environ.get("TRAVIS_BRANCH") == "production"):
        version = "1.0.0"  # Change this with new version
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
    commit_with_previous_msg(filename)


def commit_with_previous_msg(filename):
    print("adding file to git")
    subprocess.check_output(
        ['git', 'add', filename])

    msg = parse(previous_git_commit())

    print("git commit -m " + msg)
    subprocess.check_output(
        ['git', 'commit', '-m', 'version bump + ' + msg])

def previous_git_commit():
    return subprocess.check_output(
        ['git', 'log', '-1']
    ).decode('utf-8').strip()

def parse(commit):
    author, msg = "", ""
    # parse up some commit lines
    commit_lines = commit.split('\n')
    author = commit_lines[1].split(":")[1].strip()
    msg = " ".join(l.strip() for l in commit_lines[3:] if l)

    return  "%s - %s" % (author, msg)


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
    branch = os.environ.get("TRAVIS_BRANCH")
    merge_to = os.environ.get("tibanna_merge")

    if not args.prod:
        print("not production")
        ver = get_git_version()
        # checkout correct branch
        subprocess.check_output(
            ['git', 'config', "--replace-all", "remote.origin.fetch",
             "'+refs/heads/*:refs/remotes/origin/*'])
        subprocess.check_output(['git', 'fetch', '--no-tags', '--depth', '200'])
        subprocess.check_output(
            ['git', 'checkout', branch])
        update_version(ver)
        if merge_to:
            merge(branch, merge_to)
            tag(ver)
        deploy()
    if args.prod:
        print("args production")
        # only deploy if commint message has tibanna-deploy in it
        msg = os.environ.get("TRAVIS_COMMIT_MESSAGE", "")
        print("commit message", msg)
        if not msg:
            print("I don't have a message")
        if "tibanna-deploy" in msg:
            deploy()
        elif os.environ.get("tibanna_deploy", False):
            print("Deploying to environment %s" % os.environ.get("tibanna-deploy"))
            deploy()
        else:
            print("not deploying you didn't say the magic words...")
