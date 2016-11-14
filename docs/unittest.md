UNIT Testing
============

### Python : what & where

- `test_schema` : testing if mixins load from schema, and schema sytanctically correct
- `test_type_<object>` : test type sepcific stuff, minux embedding, calculated properties, update, etc..
- `test_search` : test effects of embedding and what not on search

### JavaScript

Unit tests in JavaScript are performed with jest, and initiated by 'npm test <testfilenameprefix>' where testfilenameprefix is the first part (before `.js`) of the filename located in `src/encoded/static/components/__tests__`. Run `npm test` without arguments to run all tests.
