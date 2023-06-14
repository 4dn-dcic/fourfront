from snovault.project.access_key import SnovaultProjectAccessKey

class FourfrontProjectAccessKey(SnovaultProjectAccessKey):
    def access_key_has_expiration_date(self):
        return False
