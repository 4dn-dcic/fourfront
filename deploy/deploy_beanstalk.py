import os
from time import sleep
import sys
import subprocess
import hashlib
import argparse
from datetime import datetime


def tag(name):
    subprocess.check_output(['git', 'tag', name, '-m', 'version created for staging deploy'])
    subprocess.check_output(['git', 'push', 'origin-travis', name])


def merge(source, merge_to):
    res1 = subprocess.check_output(['git', 'status']).decode('utf-8').strip()

    print("status on master is: " + res1)
    subprocess.check_output(['git', 'stash'])

    subprocess.check_output(
        ['git', 'checkout', merge_to])

    res = subprocess.check_output(['git', 'status']).decode('utf-8').strip()
    print("status on prod is: " + res)

    res2 = subprocess.check_output(
        ['git', 'merge', source, '-m', 'merged']).decode('utf-8').strip()
    print(res2)
    subprocess.check_output(
        ['git', 'push', 'origin-travis', merge_to]).decode('utf-8').strip()
    subprocess.check_output(['git', 'stash', 'pop'])


def get_git_version():
    version = os.environ.get("TRAVIS_COMMIT", "")[:7]
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


def deploy(deploy_to=None):
    '''
    run eb deploy and show the output
    '''
    print("start deployment to elastic beanstalk deploy to is %s" % str(deploy_to))

    wait = [20, 40, 60, 120, 120, 120, 120]
    for time in wait:
        try:
            if not deploy_to:
                p = subprocess.Popen(['eb', 'deploy'], stderr=subprocess.STDOUT, stdout=subprocess.PIPE)
            else:
                p = subprocess.Popen(['eb', 'deploy', deploy_to], stderr=subprocess.STDOUT, stdout=subprocess.PIPE)
        except Exception:
            # we often get errors due to timeouts
            sleep(time)
        else:
            break

    time_started = datetime.now()
    print('Started deployment at {}. Waiting 2 minutes & exiting.'.format(time_started.strftime('%H:%M:%S:%f')))
    sleep(120)

    # MAYBE TODO: Setup new thread and listen re: "Deploying new version to instance(s).". Exit if this occurs before 2min.
    #
    #while True:
    #    out = p.stdout.readline()
    #    out = out.decode('utf-8')
    #    curr_time = datetime.now()
    #    if out != '':
    #        sys.stdout.write('[' + curr_time.strftime('%H:%M:%S:%f') + '] ' + out)
    #        sys.stdout.flush()
    #    if ("Deploying new version to instance(s)." in out) or (time_started + timedelta(minutes=2) <= curr_time): # 2 min time limit
    #        print('Killing sub-process & exiting.')
    #        sleep(5)
    #        p.kill()
    #        break
    #    if out == '' and p.poll() is not None:
    #        print('Deploy sub-process complete. Exiting.')
    #        break


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="update version if relevant and deploy"
    )
    args = parser.parse_args()
    branch = os.environ.get("TRAVIS_BRANCH")
    merge_to = os.environ.get("tibanna_merge", "").strip()
    deploy_to = os.environ.get("tibanna_deploy", "").strip()

    try:
        if deploy_to in ['fourfront-staging', 'fourfront-webprod', 'fourfront-webprod2']:
            print("deploy to staging")
            ver = get_git_version()
            # checkout correct branch
            print("checkout master")
            subprocess.check_output(
                ['git', 'checkout', branch])

            print("update version")
            update_version(ver, branch)
            if merge_to:
                print("merge from %s to %s" % (branch, merge_to))
                merge(branch, merge_to)
                print("tag it")
                tag(ver)
    except Exception as e:
        # this can all go wrong if somebody pushes during the build
        # or what not, in which case we just won't update the tag / merge
        print("got the following expection but we will ignore it")
        print(e)
        print("switching back to source branch")
        subprocess.check_output(
            ['git', 'checkout', branch])

    print("now let's deploy")
    deploy(deploy_to)
