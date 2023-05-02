"""
Exception definitions for ingestion
"""

from pyramid.httpexceptions import HTTPBadRequest, HTTPServerError


class SubmissionFailure(HTTPServerError):
    pass


class UndefinedIngestionProcessorType(Exception):

    def __init__(self, processor_type):
        self.ingestion_type_name = processor_type
        super().__init__("No ingestion processor type %r is defined." % processor_type)


class MissingParameter(HTTPBadRequest):

    def __init__(self, parameter_name):
        self.parameter_name = parameter_name
        super().__init__(detail="Missing parameter: %s" % parameter_name)


class BadParameter(HTTPBadRequest):

    def __init__(self, parameter_name, parameter_value, extra_detail=None):
        self.parameter_name = parameter_name
        self.parameter_value = parameter_value
        self.extra_detail = extra_detail
        suffix = " " + extra_detail if extra_detail else ""
        super().__init__(detail="The value of the %s parameter, %r, is invalid.%s"
                                % (parameter_name, parameter_value, suffix))


class UnspecifiedFormParameter(HTTPBadRequest):

    def __init__(self, parameter_name):
        self.parameter_name = parameter_name
        super().__init__(detail="A form parameter was not filled out: %s" % parameter_name)
