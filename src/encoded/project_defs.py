from dcicutils.project_utils import C4ProjectRegistry
from snovault.project_defs import SnovaultProject
from .project_env import APPLICATION_NAME, APPLICATION_PYPROJECT_NAME
from .project.authentication import FourfrontProjectAuthentication
from .project.authorization import FourfrontProjectAuthorization
from .project.ingestion import FourfrontProjectIngestion
from .project.loadxl import FourfrontProjectLoadxl

@C4ProjectRegistry.register(APPLICATION_PYPROJECT_NAME)
class FourfrontProject(FourfrontProjectAuthentication,
                       FourfrontProjectAuthorization,
                       FourfrontProjectIngestion,
                       FourfrontProjectLoadxl,
                       SnovaultProject):
    NAMES = {'NAME': APPLICATION_NAME, 'PYPI_NAME': APPLICATION_PYPROJECT_NAME}
    ACCESSION_PREFIX = "4DN"

    # TODO maybe ...
    # LOGIN_POLICY_CLASS = SnovaultNamespacedAuthenticationPolicy

    # TODO maybe ...
    # def __init__(self):
    #     self.login_policy = self.LOGIN_POLICY_CLASS(app_project=self)
