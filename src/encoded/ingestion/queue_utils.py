import time
import json
import socket
import boto3
import structlog
import datetime


log = structlog.getLogger(__name__)


class IngestionQueueManager:
    """
    Similar to QueueManager in snovault in that in manages SQS queues, but that code is not generic
    enough to use here, so it is "duplicated" so to speak here. At a later time the functionality of this
    class and QueueManager should be refactored into a "helper" class, but for now this is sufficient
    and is tested independently here.

    We will use a single queue to keep track of File uuids to be indexed. This used to manage only VCFs
    but now the Ingestion functionality is generic and can be extended to arbitrary processing on
    any type.
    """
    QUEUE_NAME_EXTENSION = '-ingestion-queue'  # XXX: breaking change, matches 4dn-cloud-infra resources

    def __init__(self, registry, override_name=None):
        """ Does initial setup for interacting with SQS """
        self.batch_size = 1  # NOTE: this value is important because we don't want to block other jobs
        self.env_name = registry.settings.get('env.name', None)
        if not self.env_name:  # replace with something usable
            backup = socket.gethostname()[:80].replace('.', '-')
            self.env_name = backup if backup else 'cgap-backup'
        kwargs = {
            'region_name': 'us-east-1'
        }
        self.client = boto3.client('sqs', **kwargs)
        self.queue_name = override_name or (self.env_name + self.QUEUE_NAME_EXTENSION)
        self.queue_attrs = {
            self.queue_name: {
                'DelaySeconds': '1',  # messages initially invisible for 1 sec
                'VisibilityTimeout': '10800',  # 3 hours
                'MessageRetentionPeriod': '604800',  # 7 days, in seconds
                'ReceiveMessageWaitTimeSeconds': '5',  # 5 seconds of long polling
            }
        }
        self.queue_url = self._initialize()

    def _initialize(self):
        """ Initializes the actual queue - helper method for init """
        try:
            response = self.client.create_queue(
                QueueName=self.queue_name,
                Attributes=self.queue_attrs[self.queue_name]
            )
            queue_url = response['QueueUrl']
        except self.client.exceptions.QueueNameExists:
            queue_url = self._get_queue_url(self.queue_name)
        except Exception as e:
            log.error('Error while attempting to create queue: %s' % e)
            queue_url = self._get_queue_url(self.queue_name)
        return queue_url

    def _get_queue_url(self, queue_name):
        """
        Simple function that returns url of associated queue name
        """
        try:
            response = self.client.get_queue_url(
                QueueName=queue_name
            )
        except Exception as e:
            log.error('Cannot resolve queue_url: %s' % e)
            response = {}
        return response.get('QueueUrl', None)

    def _chunk_messages(self, msgs):
        """ Chunks messages into self.send_batch_size batches (for efficiency).

        :param msgs: list of messages to be chunked
        """
        for i in range(0, len(msgs), self.batch_size):
            yield msgs[i:i + self.batch_size]

    def _send_messages(self, msgs, retries=3):
        """ Sends msgs to the ingestion queue (with retries for failed messages).

        :param msgs: to be sent
        :param retries: number of times to resend failed messages, decremented on recursion
        :return: list of any failed messages
        """
        failed = []
        for msg_batch in self._chunk_messages(msgs):
            log.info('Trying to chunk messages: %s' % msgs)
            entries = []
            for msg in msg_batch:
                entries.append({
                    'Id': str(int(time.time() * 1000000)),
                    'MessageBody': json.dumps(msg)
                })
            response = self.client.send_message_batch(
                QueueUrl=self.queue_url,
                Entries=entries
            )
            failed_messages = response.get('Failed', [])

            # attempt resend of failed messages
            if failed_messages and retries > 0:
                msgs_to_retry = []
                for failed_message in failed_messages:
                    fail_id = failed_message.get('Id')
                    msgs_to_retry.extend([json.loads(ent['MessageBody']) for ent in entries if ent['Id'] == fail_id])
                    if msgs_to_retry:
                        failed_messages = self._send_messages(msgs_to_retry, retries=retries - 1)
            failed.extend(failed_messages)
        return failed

    def delete_messages(self, messages):
        """
        Called after a message has been successfully received and processed.
        Removes message from the queue.
        Input should be the messages directly from receive messages. At the
        very least, needs a list of messages with 'Id' and 'ReceiptHandle' as this
        metadata is necessary to identify the message in SQS internals.

        NOTE: deletion does NOT have a retry mechanism

        :param messages: messages to be deleted
        :returns: a list with any failed messages
        """
        failed = []
        for batch in self._chunk_messages(messages):
            # need to change message format, since deleting takes slightly
            # different fields what's return from receiving
            for i in range(len(batch)):
                to_delete = {
                    'Id': batch[i]['MessageId'],
                    'ReceiptHandle': batch[i]['ReceiptHandle']
                }
                batch[i] = to_delete
            response = self.client.delete_message_batch(
                QueueUrl=self.queue_url,
                Entries=batch
            )
            failed.extend(response.get('Failed', []))
        return failed

    def add_uuids(self, uuids, ingestion_type='vcf'):
        """ Takes a list of string uuids and adds them to the ingestion queue.
            If ingestion_type is not specified, it defaults to 'vcf'.

            :precondition: uuids are all of type FileProcessed
            :param uuids: uuids to be added to the queue.
            :param ingestion_type: the ingestion type of the uuids (default 'vcf' for legacy reasons)
            :returns: 2-tuple: uuids queued, failed messages (if any)
        """
        curr_time = datetime.datetime.utcnow().isoformat()
        msgs = []
        for uuid in uuids:
            current_msg = {
                'ingestion_type': ingestion_type,
                'uuid': uuid,
                'timestamp': curr_time
            }
            msgs.append(current_msg)
        failed = self._send_messages(msgs)
        return uuids, failed

    def get_counts(self):
        """ Returns number counts of waiting/inflight messages
            * Makes a boto3 API Call to do so *

            :returns: 2 tuple of waiting, inflight messages
        """
        response = self.client.get_queue_attributes(
            QueueUrl=self.queue_url,
            AttributeNames=[
                'ApproximateNumberOfMessages',
                'ApproximateNumberOfMessagesNotVisible'
            ]
        )
        formatted = {
            'waiting': response.get('Attributes', {}).get('ApproximateNumberOfMessages'),
            'inflight': response.get('Attributes', {}).get('ApproximateNumberOfMessagesNotVisible')
        }
        return formatted['waiting'], formatted['inflight']

    def receive_messages(self, batch_size=None):
        """ Returns an array of messages, if any that are waiting

            :param batch_size: an integer number of messages
            :returns: messages received or [] if no messages were ready to be received
        """
        response = self.client.receive_message(
            QueueUrl=self.queue_url,
            MaxNumberOfMessages=self.batch_size if batch_size is None else batch_size
        )
        return response.get('Messages', [])

    def clear_queue(self):
        """ Clears the queue by receiving all messages. BE CAREFUL as this has potential to
            infinite loop under certain conditions. This risk is preferred to using 'purge', which
            has a long timeout. The guarantees this functions provides are minimal at best - it should
            really only be used in testing.
        """
        while True:
            messages = self.receive_messages()
            self.delete_messages(messages)
            if len(messages) == 0:
                break
