from dcicutils.project_utils import C4ProjectRegistry
from snovault.project_defs import SnovaultProject
from .authentication import FourfrontProjectAuthentication
from .authorization import FourfrontProjectAuthorization
from .project_env import APPLICATION_NAME, APPLICATION_PYPROJECT_NAME


class FourfrontProjectIngestion:
    def ingestion_submission_schema_file(self):
        return "encoded:schemas/ingestion_submission.json"


@C4ProjectRegistry.register(APPLICATION_PYPROJECT_NAME)
class FourfrontProject(FourfrontProjectAuthentication,
                       FourfrontProjectAuthorization,
                       FourfrontProjectIngestion,
                       SnovaultProject):
    NAMES = {'NAME': APPLICATION_NAME, 'PYPI_NAME': APPLICATION_PYPROJECT_NAME}
    ACCESSION_PREFIX = "4DN"

    # TODO maybe ...
    # LOGIN_POLICY_CLASS = SnovaultNamespacedAuthenticationPolicy

    # TODO maybe ...
    # def __init__(self):
    #     self.login_policy = self.LOGIN_POLICY_CLASS(app_project=self)
