# Module containing the definition of the @ingestion_message_handler decorator used
# to globally register ingestion message handler functions for specific ingestion
# message types, or a default message handler to handle any message types for which
# no specific handler was registered. Only a single handler may be registered for
# a specified message type, and only a single default handler may be registered.
# Also defined here is a function (call_ingestion_message_handler) to call the
# appropriate registered handler for a given message.

import inspect
from typing import Union
from dcicutils.misc_utils import ignored, PRINT
from .ingestion_listener_base import IngestionListenerBase
from .ingestion_message import IngestionMessage


# Dictionary (by ingestion type) of globally registered ingestion message handlers.
_ingestion_message_handlers = {}


def ingestion_message_handler(f=None, *decorator_args, **decorator_kwargs):
    """
    Decorator to globally register ingestion message handlers, to be used for example like this:

      @ingestion_message_handler
      def your_ingester_message_handler(message: IngestionMessage, listener: IngestionListener):
          # Handle your message here; return whatever you like;
          # it will be returned in turn by call_ingestion_message_handler.

    Although any function may be annotated with this decorator, at this time and for our purposes
    it is expected to have a signature as show in the example above; this IS enforced to some extent.

    In addition, you can pass an ingestion_type argument to the decorator to LIMIT the call of the
    decorated handler function to messages with an ingestion type which matches the specified string value.
    For example, to define a message handler to be called ONLY for message types which are "vcf":

      @ingestion_message_handler(ingestion_type="vcf")
      def your_ingester_message_handler(message: IngestionMessage, listener: IngestionListener):
          # Handle your message here; return whatever you like;
          # it will be returned in turn by call_ingestion_message_handler.

    Note that ingestion type names are (space-trimmed and) treated as case-insenstive.

    If the ingestion_type is not specified in the decorator, then the registered handler is said
    to be the DEFAULT handler and will handle any message type not covered by any other registered
    handler. There MUST be exactly ONE handler registered able to handle any expected message type,
    otherwise an exception will be thrown (either at handler registration time, i.e. startup; or
    at runtime, i.e. if an incoming message is found not to have an associated handler and there is
    no default handler; this latter bit is handled by the call_ingestion_message_handler function below).
    """
    ignored(decorator_args)
    has_decorator_args = True if not callable(f) or f.__name__ == "<lambda>" else False
    ingestion_type = None

    # Sanity check any decorator arguments; currently just the optional ingestion_type.
    if has_decorator_args:
        if f is not None:
            decorator_args = (f, *decorator_args)
        if len(decorator_args) + len(decorator_kwargs) > 1:
            raise ValueError(f"Invalid @ingestion_message_handler decorator usage (takes at most one argument).")
        if len(decorator_args) == 1:
            ingestion_type = decorator_args[0]
        else:
            ingestion_type = decorator_kwargs.get("ingestion_type", decorator_kwargs.get("type"))
        if not (ingestion_type is None or isinstance(ingestion_type, str)):
            raise ValueError(f"Invalid @ingestion_message_handler decorator usage (argument must be ingestion type string).")
        ingestion_type = ingestion_type.strip().lower()
    # If ingestion_type is not specified or is "default" this we are registering a default handler.
    if ingestion_type == "default":
        ingestion_type = None

    def ingestion_message_handler_wrapper(wrapped_function):

        if ingestion_type in _ingestion_message_handlers:
            raise ValueError(f"Ingestion message handler already defined for "
                             f"ingestion message type: {ingestion_type if ingestion_type else '<default>'}")

        # Sanity check the signature of the decorated ingestion message handler function.
        # It should contain two arguments with either no type annotations or if present
        # then they should be for IngestionMessage and IngestionListenerBase, respectively.
        # Return value annotation is not checked.
        wrapped_function_signature = inspect.signature(wrapped_function)
        if len(wrapped_function_signature.parameters) < 2:
            raise ValueError(f"Too few arguments (need two) "
                             f"for ingestion message handler function: {wrapped_function.__name__}")
        if len(wrapped_function_signature.parameters) > 2:
            raise ValueError(f"Too many arguments (need two) "
                             f"for ingestion message handler function: {wrapped_function.__name__}")
        parameters = iter(wrapped_function_signature.parameters.items())
        first_parameter = next(parameters)
        if first_parameter and len(first_parameter) >= 2:
            first_parameter_annotation = first_parameter[1].annotation
            if not first_parameter_annotation or (first_parameter_annotation.__name__ != "_empty" and
                                                  not issubclass(first_parameter_annotation, IngestionMessage)):
                raise ValueError(f"Wrong first argument type (need unspecified or IngestionMessage) "
                                 f"for ingestion message handler function: {wrapped_function.__name__}")
        second_parameter = next(parameters)
        if second_parameter and len(second_parameter) >= 2:
            second_parameter_annotation = second_parameter[1].annotation
            if not second_parameter_annotation or (second_parameter_annotation.__name__ != "_empty" and
                                                   not issubclass(second_parameter_annotation, IngestionListenerBase)):
                raise ValueError(f"Wrong second argument type (need unspecified or IngestionListenerBase) "
                                 f"for ingestion message handler function: {wrapped_function.__name__}")
        PRINT(f"Registering ingestion message handler: "
              f"{wrapped_function.__name__} (type: {ingestion_type if ingestion_type else '<default>'})")

        def ingestion_message_handler_function(*args, **kwargs):
            """
            This is the function called on each actual ingestion message handler call.
            """
            ignored(kwargs)
            # Check for two arguments of type IngestionMessage and IngestionListenerBase, respectively.
            if len(args) != 2:
                raise ValueError(f"Wrong number of arguments ({len(args)} passed to "
                                 f"ingestion message handler (expecting two): {wrapped_function.__name__}")
            message = args[0]
            listener = args[1]
            if not isinstance(message, IngestionMessage):
                raise ValueError(f"First argument passed to ingestion message handler is "
                                 f"not of type IngestionMessage: {wrapped_function.__name__}")
            if not isinstance(listener, IngestionListenerBase):
                raise ValueError(f"Second argument passed to ingestion message handler is "
                                 f"not of type IngestionListenerBase: {wrapped_function.__name__}")
            # Ensure we should call this handler based on any ingestion_type specified in the decorator.
            # Given the current implementation and intended usage (i.e. handlers be specifically associated
            # with a given message type, and calling via call_ingestion_message_handler) this should check
            # should be unnecessary, though extra check will not hurt; it would only come up if calling a
            # registered message handler directly (i.e. not via call_ingestion_message_handler).
            PRINT(f"Checking message ({message.uuid}) type ({message.type}) for handler: {wrapped_function.__name__}")
            if ingestion_type:
                # Here the decorator specified a NON-default ingestion type for this handler;
                # check and only call this handler (the wrapped function) if the handler
                # ingestion type matches the ingestion message type.
                if not message.is_type(ingestion_type):
                    # Since the ingestion_type specified for the handler decorator does NOT match
                    # the type of the message, then this message is NOT intended to be processed by
                    # this handler, it will NOT be called. Again, as mentioned above, this should
                    # NOT come up if the handler is called via call_ingestion_message_handler.
                    PRINT(f"Message ({message.uuid}) type ({message.type}) "
                          f"NOT intended for handler: {wrapped_function.__name__}")
                    return False
            # Here this handler decorator either had no ingestion_type specifier, or it does
            # and it matches the ingestion message type, indicating this message IS intended
            # to be processed by this handler; we will call it here, returning its value.
            PRINT(f"Calling message ({message.uuid}) type ({message.type}) "
                  f"handler: {wrapped_function.__name__}")
            handler_result = wrapped_function(message, listener)
            PRINT(f"Called message ({message.uuid}) type ({message.type}) "
                  f"handler: {wrapped_function.__name__} -> {handler_result}")
            return handler_result

        # Register this handler for the ingestion type in our global dictionary;
        # already checked above if a handler is already registered for this type.
        _ingestion_message_handlers[ingestion_type] = ingestion_message_handler_function

        return ingestion_message_handler_function

    return ingestion_message_handler_wrapper(f) if not has_decorator_args else ingestion_message_handler_wrapper


def call_ingestion_message_handler(message: Union[IngestionMessage, dict], listener) -> bool:
    """
    Calls the ingestion message handler function globally registered via the
    @ingestion_message_handler decorator which corresponding to the TYPE of the given
    IngestionMessage, passing it the given IngestionMessage and IngestionListenerBase
    as arguments; returns the value returned by the message handler.

    If a message handler has NOT been registered for the given message type AND of NO default
    message handler has been registered, then throws and exception. I.e. a specific message handler
    MUST be defined for each expected message type OR a DEFAULT message handler must be defined
    to handle messages with types which does NOT correspond to any specifically registered handlers.
    """
    if not isinstance(message, IngestionMessage):
        # For convenience, allow passing a message which is NOT of type IngestionMessage, which we
        # will ASSUME in this case is a RAW (dict) message from which we create an IngestionMessage.
        message = IngestionMessage(message)
    # Get the handler for this message type, or the default handler of none specifically found.
    handler = _ingestion_message_handlers.get(message.type, _ingestion_message_handlers.get(None))
    if handler:
        return handler(message, listener)
    else:
        # If NO message handler is registered for the given message type AND if there
        # is NO default message handler registered then we regard this as a (runtime) error.
        raise RuntimeError(f"No ingestion message handler defined for ingestion message type: {message.type}"
                           f" -> Message: {message.body}")


def clear_ingestion_message_handlers_for_testing():
    """
    Clears all globally registered ingestion message handlers.
    This is for TESTING purposes ONLY!
    """
    global _ingestion_message_handlers
    _ingestion_message_handlers = {}
