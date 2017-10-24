import os
import sys
import subprocess
import hashlib
import argparse


def tag(name):
    subprocess.check_output(['git', 'tag', name, '-m', 'version created for staging deploy'])
    subprocess.check_output(['git', 'push', 'origin-travis', name])


def merge(source, merge_to):
    res1 = subprocess.check_output(['git', 'status']).decode('utf-8').strip()

    print("status on master is" + res1)
    subprocess.check_output(
        ['git', 'checkout', merge_to])

    subprocess.check_output(['git', 'stash'])
    res = subprocess.check_output(['git', 'status']).decode('utf-8').strip()
    print("status on prod is " + res)

    res2 = subprocess.check_output(
        ['git', 'merge', source, '-m', 'merged']).decode('utf-8').strip()
    print(res2)
    subprocess.check_output(
        ['git', 'push', 'origin-travis', merge_to]).decode('utf-8').strip()
    subprocess.check_output(['git', 'stash', 'pop'])


def get_git_version():
    version = os.environ.get("TRAVIS_COMMIT","")[:7]
    if not version:
        version = subprocess.check_output(
            ['git', '-C', os.path.dirname(__file__), 'describe']).decode('utf-8').strip()
        version = version[:7]
        diff = subprocess.check_output(
            ['git', '-C', os.path.dirname(__file__), 'diff', '--no-ext-diff'])
        if diff:
            version += '-patch' + hashlib.sha1(diff).hexdigest()[:7]
    return "v-" + version


def update_version(version, branch):
    filename = 'buildout.cfg'
    regex = 's/encoded_version.*/encoded_version = %s/' % (version)

    print("updated buildout.cfg with version", version)
    subprocess.check_output(
        ['sed', '-i', regex, filename])
    commit_with_previous_msg(filename, branch)


def commit_with_previous_msg(filename, branch):
    print("adding file to git")
    subprocess.check_output(
        ['git', 'add', filename])

    msg = parse(previous_git_commit())

    print("git commit -m " + msg)
    subprocess.check_output(
        ['git', 'commit', '-m', 'version bump + ' + msg])

    subprocess.check_output(
        ['git', 'push', 'origin-travis', branch])


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

    return "%s - %s" % (author, msg)


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
    deploy_to = os.environ.get("tibanna_deploy")

    if not args.prod:
        try:
            if deploy_to == 'fourfront-staging':
                ver = get_git_version()
                # checkout correct branch
                subprocess.check_output(
                    ['git', 'checkout', branch])
                update_version(ver, branch)
                if merge_to:
                    merge(branch, merge_to)
                    tag(ver)
        except Exception as e:
            # this can all go wrong if somebody pushes during the build
            # or what not, in which case we just won't update the tag / merge
            raise(e)
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
