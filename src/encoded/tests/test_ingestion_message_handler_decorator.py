import pytest
import re
from snovault.ingestion.ingestion_message import IngestionMessage
from snovault.ingestion.ingestion_listener_base import IngestionListenerBase
from snovault.ingestion.ingestion_message_handler_decorator import (
    call_ingestion_message_handler,
    ingestion_message_handler,
    clear_ingestion_message_handlers_for_testing,
)


class IngestionListener(IngestionListenerBase):
    pass  # dummy


SOME_UUID = "some-uuid-xyzzy"
INGESTION_LISTENER = IngestionListener()
INGESTION_TYPE_VCF = "vcf"
INGESTION_TYPE_NOVCF = "novcf"
INGESTION_TYPE_OTHER = "other"


def isolate_ingestion_message_handler_decorator_test(f):
    def wrapper():
        clear_ingestion_message_handlers_for_testing()
        f()
        clear_ingestion_message_handlers_for_testing()
    return wrapper


def create_raw_message(ingestion_type: str) -> dict:
    return {"Body": f"{{\"uuid\":\"{SOME_UUID}\", \"ingestion_type\":\"{ingestion_type}\"}}"}


@isolate_ingestion_message_handler_decorator_test
def test_error_decorator_arguments():

    with pytest.raises(Exception):
        @ingestion_message_handler(123)  # wrong decorator arg type
        def bad_a(message, listener):
            pass

    with pytest.raises(Exception):
        @ingestion_message_handler("vcf", 123)  # too many decorator args
        def bad_b(message, listener):
            pass

    with pytest.raises(Exception):
        @ingestion_message_handler(xyzzy="vcf")  # unknown named decorator kwarg
        def bad_c(message, listener):
            pass

    with pytest.raises(Exception):
        @ingestion_message_handler("vcf", ingestion_type="vcf")  # too many decorator args
        def bad_d(message, listener):
            pass


@isolate_ingestion_message_handler_decorator_test
def test_error_decorated_function_signature():

    with pytest.raises(Exception):
        @ingestion_message_handler
        def bad_a():  # not enough args
            pass

    with pytest.raises(Exception):
        @ingestion_message_handler
        def bad_b(message):  # not enough args
            pass

    with pytest.raises(Exception):
        @ingestion_message_handler
        def bad_c(message, listener, extraneous_arg):  # too many args
            pass

    with pytest.raises(Exception):
        @ingestion_message_handler
        def bad_d(message: IngestionMessage, listener: str):  # wrong type arg
            pass

    with pytest.raises(Exception):
        @ingestion_message_handler
        def bad_e(message: str, listener):  # wrong type arg
            pass

    with pytest.raises(Exception):
        @ingestion_message_handler
        def bad_f(message: str, listener: str):  # wrong type args
            pass


@isolate_ingestion_message_handler_decorator_test
def test_error_duplicate_default_handlers_one():

    with pytest.raises(Exception):

        @ingestion_message_handler
        def a(message, listener):
            pass

        @ingestion_message_handler  # same as above (i.e. default)
        def duplicate_a(message, listener):
            pass


@isolate_ingestion_message_handler_decorator_test
def test_error_duplicate_default_handlers_two():

    with pytest.raises(Exception):

        @ingestion_message_handler(ingestion_type="default")
        def a(message, listener):
            pass

        @ingestion_message_handler  # same as above (i.e. default)
        def duplicate_a(message, listener):
            pass


@isolate_ingestion_message_handler_decorator_test
def test_error_duplicate_typed_handlers():

    with pytest.raises(Exception):

        @ingestion_message_handler("some-message-type")
        def a(message, listener):
            pass

        @ingestion_message_handler("some-message-type")  # same as above
        def duplicate_a(message, listener):
            pass


@isolate_ingestion_message_handler_decorator_test
def test_error_undefined_handler():

    with pytest.raises(Exception):

        @ingestion_message_handler("some-message-type")
        def a(message, listener):
            pass

        @ingestion_message_handler("some-other-message-type")
        def duplicate_a(message, listener):
            pass

        ingestion_message = create_raw_message(ingestion_type="some-third-message-type")
        # This should throw exception because no relevant handler found.
        call_ingestion_message_handler(ingestion_message, INGESTION_LISTENER)

    exception_message = (f".*No.*ingestion.*message.*handler.*defined.*"
                         f" ->.*{{'uuid': 'some-uuid-xyzzy', 'ingestion_type': 'some-third-message-type'}}.*")
    with pytest.raises(Exception, match=re.compile(exception_message)):
        call_ingestion_message_handler(ingestion_message, INGESTION_LISTENER)


@isolate_ingestion_message_handler_decorator_test
def test_error_invalid_call_arguments():

    @ingestion_message_handler("some-message-type")
    def a(message, listener):
        pass

    ingestion_message = create_raw_message(ingestion_type="some-message-type")
    with pytest.raises(Exception):
        call_ingestion_message_handler(ingestion_message, "wrong-type-should-be-IngestionListenerBase")

    ingestion_message = create_raw_message(ingestion_type="some-message-type")
    with pytest.raises(Exception):
        call_ingestion_message_handler(ingestion_message, INGESTION_LISTENER, "extra-arg")

    ingestion_message = create_raw_message(ingestion_type="some-message-type")
    with pytest.raises(Exception):
        call_ingestion_message_handler(ingestion_message)  # missing IngestionListenerBase arg

    ingestion_message = create_raw_message(ingestion_type="some-message-type")
    with pytest.raises(Exception):
        call_ingestion_message_handler()  # missing args

    with pytest.raises(Exception):
        a(ingestion_message, INGESTION_LISTENER)  # wrong first arg type (raw dict rather than IngestionMessage)


@isolate_ingestion_message_handler_decorator_test
def test_one():

    handler_calls = None

    @ingestion_message_handler
    def a(message: IngestionMessage, listener: IngestionListener):
        this_function_name = "a"
        result = f"{this_function_name}/{message.type}"
        handler_calls.add(result)
        assert not message.is_type(INGESTION_TYPE_VCF) and not message.is_type(INGESTION_TYPE_NOVCF)
        assert message.uuid == SOME_UUID
        assert listener is INGESTION_LISTENER
        return result

    @ingestion_message_handler(ingestion_type=INGESTION_TYPE_VCF)
    def b(message: IngestionMessage, listener: IngestionListener) -> str:
        this_function_name = "b"
        result = f"{this_function_name}/{message.type}"
        handler_calls.add(result)
        assert message.is_type(INGESTION_TYPE_VCF)
        assert message.uuid == SOME_UUID
        assert listener is INGESTION_LISTENER
        return result

    @ingestion_message_handler(INGESTION_TYPE_NOVCF)
    def c(message, listener):
        this_function_name = "c"
        result = f"{this_function_name}/{message.type}"
        handler_calls.add(result)
        assert message.is_type(INGESTION_TYPE_NOVCF)
        assert message.uuid == SOME_UUID
        assert listener is INGESTION_LISTENER
        return result

    handler_calls = set()
    ingestion_message = create_raw_message(ingestion_type=INGESTION_TYPE_OTHER)
    handler_result = call_ingestion_message_handler(ingestion_message, INGESTION_LISTENER)
    assert handler_result == f"a/{IngestionMessage(ingestion_message).type}"
    assert handler_calls == {handler_result}

    handler_calls = set()
    ingestion_message = create_raw_message(ingestion_type=INGESTION_TYPE_VCF)
    handler_result = call_ingestion_message_handler(ingestion_message, INGESTION_LISTENER)
    assert handler_result == f"b/{IngestionMessage(ingestion_message).type}"
    assert handler_calls == {handler_result}

    handler_calls = set()
    ingestion_message = create_raw_message(ingestion_type=INGESTION_TYPE_NOVCF)
    handler_result = call_ingestion_message_handler(ingestion_message, INGESTION_LISTENER)
    assert handler_result == f"c/{IngestionMessage(ingestion_message).type}"
    assert handler_calls == {handler_result}
