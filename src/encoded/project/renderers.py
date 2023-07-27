from snovault.project.renderers import SnovaultProjectRenderers
from snovault.mime_types import MIME_TYPE_HTML, MIME_TYPE_JSON, MIME_TYPE_LD_JSON

class FourfrontProjectRenderers(SnovaultProjectRenderers):

    def renderers_mime_types_supported(self):
        return [MIME_TYPE_HTML, MIME_TYPE_JSON, MIME_TYPE_LD_JSON]
