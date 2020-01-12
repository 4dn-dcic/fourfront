
UNIT Testing
============

Python : what & where
---------------------


* ``test_schema`` : testing if mixins load from schema, and schema sytanctically correct
* ``test_type_<object>`` : test type sepcific stuff, minux embedding, calculated properties, update, etc..
* ``test_search`` : test effects of embedding and what not on search

JavaScript
----------

Unit tests in JavaScript are performed with `\ **Jest** <https://facebook.github.io/jest/>`_\ , and initialized via ``npm test <testfilenameprefix>`` where testfilenameprefix is the first part (before ``.js``\ ) of the filename located in ``src/encoded/static/components/__tests__``. Run ``npm test`` without arguments to run all tests. Execution of all tests is also automatically triggered in Travis upon committing or pull requesting to the GitHub repository.

Guidelines
^^^^^^^^^^


* Look at current tests to get understanding of how they work.
* Check out the `\ **Jest** API <https://facebook.github.io/jest/docs/api.html>`_.
* Check out the `React **TestUtils** documentation <https://facebook.github.io/react/docs/test-utils.html>`_.
* If you need to test AJAX calls, utilize `\ **Sinon** <http://sinonjs.org>`_ to create a `\ **fake server** <http://sinonjs.org/docs/#fakeServer>`_ inside testing scripts, which will also patch XMLHttpRequest to work within tests. For example, in a ``.../__tests__/`` file, can have something resembling the following: 
  ```javascript
  sinon = require('sinon');
  var server = sinon.fakeServer.create();

// Setup dummy server response(s)
server.respondWith(
    "PATCH",                                      // Method
    context['@id'],                               // Endpoint / URL
    [
        200,                                      // Status code
        { "Content-Type" : "application/json" },  // Headers
        '{ "status" : "success" }'                // Raw data returned
    ]
);

// Body of test
doSomeFunctionsHereWhichSendAJAXCalls();          // Any code with AJAX/XHR calls.
server.respond();                                 // Respond to any AJAX requests currently in queue.
expect(myNewValue).toBe(whatMyNewValueShouldBe);  // Assert state in Jest that may have changed in response to or after AJAX call completion.

doSomeMoreFunctionsWithAJAX();
server.respond();
expect(myOtherNewValue).toBe(whatMyOtherNewValueShouldBe);

server.restore();                                 // When done, restore/unpatch the XMLHttpRequest object.
```
