"""
common.py - tools common to various parts of ingestion
"""

from .exceptions import MissingParameter, BadParameter
from ..util import CONTENT_TYPE_SPECIAL_CASES


def metadata_bundles_bucket(registry):
    return registry.settings.get('metadata_bundles_bucket')


# ==================================================


def register_path_content_type(*, path, content_type):
    """
    Registers that endpoints that begin with the specified path use the indicated content_type.

    This is part of an inelegant workaround for an issue in renderers.py that maybe we can make go away in the future.
    See the 'implementation note' in ingestion/common.py for more details.
    """
    exceptions = CONTENT_TYPE_SPECIAL_CASES.get(content_type, None)
    if exceptions is None:
        CONTENT_TYPE_SPECIAL_CASES[content_type] = exceptions = []
    if path not in exceptions:
        exceptions.append(path)


def content_type_allowed(request):
    """
    Returns True if the current request allows the requested content type.

    This is part of an inelegant workaround for an issue in renderers.py that maybe we can make go away in the future.
    See the 'implementation note' in ingestion/common.py for more details.
    """
    if request.content_type == "application/json":
        # For better or worse, we always allow this.
        return True

    exceptions = CONTENT_TYPE_SPECIAL_CASES.get(request.content_type)

    if exceptions:
        for text in exceptions:
            if text in request.path:
                return True

    return False

# ==================================================


_NO_DEFAULT = object()


def get_parameter(parameter_block, parameter_name, as_type=None, default=_NO_DEFAULT, update=False):
    """
    Returns the value of a given parameter from a dictionary of parameter values.

    If the parameter is not in the dictionary, the default will be returned if one is given.
    If the parameter is not present but there is no default, an error of type MissingParameter will be raised.

    Args:
        parameter_block (dict): a dictionary whose keys are parameter names and whose values are parameter values
        parameter_name (str): the name of a parameter
        as_type: if supplied, a type coercion to perform on the result
        default (object): a default value to be used if the parameter_name is not present.
        update (bool): if as_type is applied, whether to update the parameter_block
    """

    if isinstance(parameter_block, dict):
        if parameter_name in parameter_block:
            parameter_value = parameter_block[parameter_name]
            result = parameter_value
            if as_type:
                if isinstance(as_type, type) and isinstance(result, as_type):
                    return result
                elif as_type is bool:
                    lower_value = str(result).lower()
                    if lower_value == "true":
                        result = True
                    elif lower_value in ("false", "none", "null", ""):
                        result = False
                    else:
                        raise BadParameter(parameter_name=parameter_name, parameter_value=parameter_value,
                                           extra_detail=("Expected a string representing a boolean, such as"
                                                         " 'true' for True, or 'false' or the empty string for False."))
                else:
                    result = as_type(result)
        elif default is _NO_DEFAULT:
            raise MissingParameter(parameter_name=parameter_name)
        else:
            result = default

        if update:
            parameter_block[parameter_name] = result

        return result

    else:
        raise TypeError("Expected parameter_block to be a dict: %s", parameter_block)


class IngestionError:
    """
    Holds info on an error that occurred in ingestion. Right now this consists of the
    offending request body and the VCF row it occurred on.

    This class doesn't really do much except specify the structure. It must align with that of FileProcessed
    (reproduced as of 12/2/2020 below):

        "file_ingestion_error": {
            "title": "Ingestion Error Report",
            "description": "This field is set when an error occurred in ingestion with all errors encountered",
            "type": "array",
            "items": {
                "title": "Ingestion Error",
                "type": "object",
                "properties": {
                    "body": {
                        "type": "string",
                        "index": false  # the intention is not to index this in the future
                    },
                    "row": {
                        "type": "integer"
                    }
                }
            }
        }

    """

    def __init__(self, body, row):
        self.body = body
        self.row = row

    def to_dict(self):
        return {
            'body': str(self.body),
            'row': self.row
        }


class IngestionReport:
    """
    A "virtual" item on file_processed that contains detailed information on the ingestion run.
    Not creating an item for this is a design decision. The output of this process is more for
    debugging and not for auditing, so it does not merit an item at this time.
    """
    MAX_ERRORS = 100  # tune this to get more errors, 100 is a lot though and probably more than needed

    def __init__(self):
        self.grand_total = 0
        self.errors = []

    def brief_summary(self):
        return ('INGESTION REPORT: There were %s total variants detected, of which %s were successful'
                'and %s failed. Check ProcessedFile for full error output.' % (self.grand_total,
                                                                              self.total_successful(),
                                                                              self.total_errors()))

    def total_successful(self):
        return self.grand_total - len(self.errors)

    def total_errors(self):
        return len(self.errors)

    def get_errors(self, limit=True):
        """ Returns a limited number of errors, where limit can be True (self.MAX_ERRORS), False (no limit),
            or an integer. """
        if limit is True:
            limit = self.MAX_ERRORS
        elif limit is False:
            limit = None
        return self.errors[:limit]

    def mark_success(self):
        """ Marks the current row number as successful, which in this case just involves incrementing the total """
        self.grand_total += 1

    def mark_failure(self, *, body, row):
        """ Marks the current row as failed, creating an IngestionError holding the response body and row. """
        self.grand_total += 1
        self.errors.append(IngestionError(body, row).to_dict())
