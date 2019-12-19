import os
import json
import random
from requests.auth import HTTPBasicAuth
from locust import HttpLocust, TaskSet, task, between

# IMPORTANT:
# To best make use of this you'll want to pass in some authentication
# To do this, create the file '<env>.json'. Navigate to the portal and
# create an access key to be used via basic auth. Set 'username' and 'password'
# in <env>.json to your ID and secret
# config.json is provided. Use accordingly if you want to change routes, see 
# locust.rst in docs


def load_locust_auth(loc):
    """ 
    Loads access key from given location 
    Not a static method on FFUserBehavior because it is implicitly
    a static class
    """
    with open(loc, 'r') as f:
        raw = json.load(f)
        return raw['username'], raw['password']


class FFUserBehavior(TaskSet):
    """
    Locust class for FF. Tasks and behavior for unauthenticated users
    interacting with the portal for the purposes of performance testing
    task decorator tells locust that it is task to be run.
    """
    USERNAME, PASSWORD = load_locust_auth(os.environ['LOCUST_KEY'])
    CONFIG = json.load(open(os.environ['LOCUST_CONFIG'], 'r'))
    ROUTES = CONFIG['routes']

    def _get(self, url):
        """ Wrapper for self.client.get that adds auth to request

        Args:
            url: endpoint to hit
        """
        self.client.get(url, auth=HTTPBasicAuth(self.USERNAME, self.PASSWORD))

    @task(1)
    def random_task(self):
        """ get a random task from config """
        url = random.choice(self.ROUTES)
        self._get(url)


class FFLocust(HttpLocust):
    """ test_set defines what the tasks are to be executed by the locust
        host is where to test
        wait_time is how long to wait between requests (5-15 seconds)

        For cmd line args, see main.py
    """
    task_set = FFUserBehavior
    host = FFUserBehavior.CONFIG['envs'][os.environ['LOCUST_ENV']]
    wait_time = between(int(os.environ['LOCUST_LOWER_BOUND']), int(os.environ['LOCUST_UPPER_BOUND']))  
