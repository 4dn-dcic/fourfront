import json
from locust import HttpLocust, TaskSet, task, between

class FFUserBehavior(TaskSet):
    """ 
    Locust class for FF. Tasks and behavior for unauthenticated users
    interacting with the portal for the purposes of performance testing
    task deco tells locust that it is task to be run. 
    
    We are running ratios:
        2x for home page
        1x for browse
        1x for browse by publication
        1x for help page
    """

    def on_start(self):
        """ on_start is called upon locust spawn """
        pass  # login?

    def on_exit(self):
        """ on_exit is called when the locust finishes its task """
        pass  # logout?

    @task(2)
    def index(self):
        """ command to get main page """
        self.client.get("/")

    @task(1)
    def browse(self):
        """ execute most common search """
        self.client.get('/browse/?experimentset_type=replicate&type=ExperimentSetReplicate')

    @task(1)
    def browse_by_publication(self):
        """ execute search by publication """
        self.client.get('/search/?type=Publication&sort=static_content.location&sort=-number_of_experiment_sets')

    @task(1)
    def browse_sequencing_data(self):
        """ execute search with sequencing facet """
        self.client.get('/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&experiments_in_set.experiment_type.experiment_category=Sequencing')

    @task(1)
    def user_guide_page(self):
        """ gets a user page """
        self.client.get('/help/user-guide/data-organization')

    @task(1)
    def analysis_page(self):
        """ gets an analysis page """
        self.client.get('/resources/analysis/cwl-docker')

class Locust(HttpLocust):
    """ test_set defines what the tasks are to be executed by the locust
        host is where to test
        wait_time is how long to wait between requests (5-15 seconds)

        CMD LINE: locust -f ff_locust.py --no-web -c 100 -r 100 --run-time 1m
    """
    task_set = FFUserBehavior
    host = 'http://mastertest.4dnucleome.org'  # change this to point to different env
    wait_time = between(5, 15)  # this seems to best stress the machine without bringing it to a halt
