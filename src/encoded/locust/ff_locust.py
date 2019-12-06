import json
import random
from requests.auth import HTTPBasicAuth
from locust import HttpLocust, TaskSet, task, between

# IMPORTANT:
# To best make use of this you'll want to pass in some authentication
# To do this, create the file 'config.json'. Navigate to the portal and
# create an access key to be used via basic auth. Set 'username' and 'password'
# in config.json to your ID and secret


def load_auth():
    """ loads access key from config.json """
    with open('config.json', 'r') as f:
        raw = json.load(f)
        return raw['username'], raw['password']


class FFUserBehavior(TaskSet):
    """
    Locust class for FF. Tasks and behavior for unauthenticated users
    interacting with the portal for the purposes of performance testing
    task deco tells locust that it is task to be run.

    We are running ratios:
        4x for home page (all locust start here, by default does browse search)
        1x for help page
        1x for analysis page
        1x for counts page
        1x for user search (authenticated search)
    """
    username, password = load_auth()

    def _get(self, url):
        """ Wrapper for self.client.get that adds auth to request

        Args:
            url: endpoint to hit
        """
        self.client.get(url, auth=HTTPBasicAuth(self.username, self.password))

    def on_start(self):
        """ on_start is called upon locust spawn """
        self.index()  # get main page on start

    def on_exit(self):
        """ on_exit is called when the locust finishes its task """
        pass  # nothing too relevant to do

    def index(self):
        """ command to get main page """
        self._get('/')

    @task(1)
    def user_guide_page(self):
        """ gets a user page """
        self._get('/help/user-guide/data-organization')

    @task(1)
    def analysis_page(self):
        """ gets an analysis page """
        self._get('/resources/analysis/cwl-docker')

    @task(1)
    def counts(self):
        """ gets the counts page """
        self._get('/counts')

    @task(1)
    def browse_users(self):
        """ does a user search """
        self._get('/search/?type=user')


class Locust(HttpLocust):
    """ test_set defines what the tasks are to be executed by the locust
        host is where to test
        wait_time is how long to wait between requests (5-15 seconds)

        CMD LINE: locust -f ff_locust.py --no-web -c 100 -r 100 --run-time 1m --print-stats
            -f: points to locustfile (this file)
            -c: number of clients
            -r: hatch rate (spawn n clients per second)
            --run-time: how long to run
            --print-stats: prints stats to stdout
    """
    task_set = FFUserBehavior
    host = 'http://mastertest.4dnucleome.org'  # change this to point to different env
    wait_time = between(5, 15)  # this seems to best stress the machine without bringing it to a halt
