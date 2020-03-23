************
WSGI Scripts
************

These directories contain the WSGI entry points for mod_wsgi.
One is for the production application, the other is for the indexer, distinguished by the single argument.
These are meant to run on Elastic Beanstalk, not on localhost.
Run 'make deploy1' and 'make deploy2' to run fourfront locally.