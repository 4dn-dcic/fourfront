"""
Collection for objects related to ingestion submissions.
"""

import boto3
import contextlib
import json
import logging
# import os
# import re
import traceback

from dcicutils.misc_utils import PRINT  # , ignored, check_true, VirtualApp
from snovault import collection, load_schema
# from pyramid.request import Request
# from pyramid.security import Allow, Deny, Everyone
from .base import (
    Item,
    # TODO: Maybe collect all these permission styles into a single file, give them symbolic names,
    #       and permit only the symbolic names to be used in each situation so we can curate a full inventory of modes.
    #       -kmp 26-Jul-2020
    # Ticket C4-332
    # ALLOW_PROJECT_MEMBER_ADD_ACL,
    # ONLY_ADMIN_VIEW_ACL,
)
from ..util import (
    debuglog, beanstalk_env_from_registry, create_empty_s3_file, s3_output_stream,  # subrequest_item_creation,
    make_vapp_for_ingestion,  # vapp_for_email,
)
from ..ingestion.common import metadata_bundles_bucket  # , get_parameter


# ALLOW_SUBMITTER_VIEW_ACL = (
#     # TODO: There is an issue here where we want a logged in user remotely only to view this
#     #       but if we are proxying for them internall we want to be able to view OR edit.
#     #       There is never reason for a user outside the system to update this status. -kmp 26-Jul-2020
#     []  # Special additional permissions might go here.
#     + ALLOW_PROJECT_MEMBER_ADD_ACL  # Is this right? See note above.
#     + ONLY_ADMIN_VIEW_ACL    # Slightly misleading name. Allows admins to edit, too, actually. But only they can view.
# )


class SubmissionFolio:

    INGESTION_SUBMISSION_URI = '/IngestionSubmission'

    def __init__(self, *, vapp, ingestion_type, submission_id, log=None):
        self.vapp = vapp
        self._admin_vapp = make_vapp_for_ingestion(app=vapp.app)
        self.ingestion_type = ingestion_type
        self.log = log or logging
        self.bs_env = beanstalk_env_from_registry(vapp.app.registry)
        self.bucket = metadata_bundles_bucket(vapp.app.registry)
        self.s3_client = boto3.client('s3')
        self.other_details = {}
        self.outcome = 'unknown'
        self.submission_id = submission_id
        # These next two are initialized later by s3 lookup, and the result is cached here.
        # In particular, the values will be made available in time for the body of 'with folio.processing_context(...)'
        # Setting them to None here makes PyCharm and other code analysis tools happier in knowing
        # that accesses to these instance variables are legit. -kmp 27-Aug-2020
        self.object_name = None
        self.parameters = None
        self.resolution = None
        self.s3_encrypt_key_id = None  # This is overridden based on manifest later

    def __str__(self):
        return "<SubmissionFolio(%s) %s>" % (self.ingestion_type, self.submission_id)

    @classmethod
    def make_submission_uri(cls, submission_id):
        return "/ingestion-submissions/" + submission_id

    @property
    def submission_uri(self):
        return self.make_submission_uri(self.submission_id)

    def patch_item(self, **kwargs):
        res = self._admin_vapp.patch_json(self.submission_uri, kwargs)
        [item] = res.json['@graph']
        debuglog(json.dumps(item))
        return item

    def get_item(self):
        res = self._admin_vapp.get(self.submission_uri)
        [item] = res.json['@graph']
        return item

    def note_additional_datum(self, key, from_dict, from_key=None, default=None):
        self.other_details['additional_data'] = additional_data = (
            self.other_details.get('additional_data', {})
        )
        additional_data[key] = from_dict.get(from_key or key, default)

    @contextlib.contextmanager
    def s3_output(self, key_name, key_type='txt'):
        key = "%s/%s.%s" % (self.submission_id, key_name, key_type)
        self.resolution[key_name] = key
        with s3_output_stream(self.s3_client, bucket=self.bucket, key=key,
                              s3_encrypt_key_id=self.s3_encrypt_key_id) as fp:
            yield fp

    def fail(self):
        self.outcome = 'failure'

    def succeed(self):
        self.outcome = 'success'

    def is_done(self):
        return self.outcome != 'unknown'

    @contextlib.contextmanager
    def processing_context(self):

        self.log.info("Processing {submission_id} as {ingestion_type}."
                      .format(submission_id=self.submission_id, ingestion_type=self.ingestion_type))

        submission_id = self.submission_id
        manifest_key = "%s/manifest.json" % submission_id
        response = self.s3_client.get_object(Bucket=self.bucket, Key=manifest_key)
        manifest = json.load(response['Body'])

        s3_encrypt_key_id = manifest.get("s3_encrypt_key_id")

        self.object_name = object_name = manifest['object_name']
        self.parameters = parameters = manifest['parameters']
        self.s3_encrypt_key_id = manifest['s3_encrypt_key_id']
        email = manifest['email']

        debuglog(submission_id, "object_name:", object_name)
        debuglog(submission_id, "parameters:", parameters)
        debuglog(submission_id, "s3_encrypt_key_id:", s3_encrypt_key_id)

        started_key = "%s/started.txt" % submission_id
        create_empty_s3_file(self.s3_client, bucket=self.bucket, key=started_key, s3_encrypt_key_id=s3_encrypt_key_id)

        # PyCharm thinks this is unused. -kmp 26-Jul-2020
        # data_stream = submission.s3_client.get_object(Bucket=submission.bucket,
        #                                               Key="%s/manifest.json" % submission_id)['Body']

        resolution = {
            "data_key": object_name,
            "manifest_key": manifest_key,
            "started_key": started_key,
        }

        try:

            other_keys = {}
            if email:
                other_keys['submitted_by'] = email

            self.patch_item(submission_id=submission_id,
                            object_name=object_name,
                            parameters=parameters,
                            processing_status={"state": "processing"},
                            **other_keys)

            self.resolution = resolution

            yield resolution

            if not self.is_done():
                self.succeed()

            self.patch_item(processing_status={"state": "done", "outcome": self.outcome, "progress": "complete"},
                            **self.other_details)

        except Exception as e:

            resolution["traceback_key"] = traceback_key = "%s/traceback.txt" % submission_id
            with s3_output_stream(self.s3_client, bucket=self.bucket, key=traceback_key,
                                  s3_encrypt_key_id=s3_encrypt_key_id) as fp:
                traceback.print_exc(file=fp)

            resolution["error_type"] = e.__class__.__name__
            resolution["error_message"] = str(e)

            self.patch_item(
                errors=["%s: %s" % (e.__class__.__name__, e)],
                processing_status={
                    "state": "done",
                    "outcome": "error",
                    "progress": "incomplete"
                }
            )

        with s3_output_stream(self.s3_client,
                              bucket=self.bucket,
                              key="%s/resolution.json" % submission_id,
                              s3_encrypt_key_id=s3_encrypt_key_id) as fp:
            PRINT(json.dumps(resolution, indent=2), file=fp)

    def process_standard_bundle_results(self, bundle_result):

        # Next several files are created only if relevant.

        if bundle_result.get('result'):
            with self.s3_output(key_name='submission.json', key_type='json') as fp:
                print(json.dumps(bundle_result['result'], indent=2), file=fp)
                self.note_additional_datum('result', from_dict=bundle_result, default={})

        if bundle_result.get('post_output'):
            with self.s3_output(key_name='submission_response') as fp:
                self.show_report_lines(bundle_result['post_output'], fp)
                self.note_additional_datum('post_output', from_dict=bundle_result, default=[])

        if bundle_result.get('upload_info'):
            with self.s3_output(key_name='upload_info') as fp:
                print(json.dumps(bundle_result['upload_info'], indent=2), file=fp)
                self.note_additional_datum('upload_info', from_dict=bundle_result, default=[])

    @staticmethod
    def show_report_lines(lines, fp, default="Nothing to report."):
        for line in lines or ([default] if default else []):
            try:
                print(line, file=fp)
            except UnicodeEncodeError:
                ascii_line = line.encode(
                    encoding="ascii", errors="backslashreplace"
                ).decode(encoding="ascii")
                print(ascii_line, file=fp)


@collection(
    name='ingestion-submissions',
    # acl=ALLOW_SUBMITTER_VIEW_ACL,
    unique_key='object_name',
    properties={
        'title': 'Ingestion Submissions',
        'description': 'List of Ingestion Submissions',
    })
class IngestionSubmission(Item):
    """The IngestionSubmission class that holds info on requests to ingest data."""

    item_type = 'ingestion_submission'
    schema = load_schema('encoded:schemas/ingestion_submission.json')
    # embedded_list = [...] + Item.embedded_list
