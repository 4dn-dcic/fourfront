=========
fourfront
=========

----------
Change Log
----------


4.5.9
=====

`PR 1715: Add CHANGELOG.rst and update docutils (C4-888) <https://github.com/4dn-dcic/fourfront/pull/1715>`_

* Add a CHANGELOG.rst
* Also, unrelated, take a newer version of docutils (0.16 instead of 0.12)
  to get rid of a deprecation warning in testing. (`C4-888 <https://hms-dbmi.atlassian.net/browse/C4-888>`_).


4.5.8
=====

`PR 1713: Cypress 10_file_counts Update <https://github.com/4dn-dcic/fourfront/pull/1713>`_

* Address `Trello ticket <https://trello.com/c/xffcEfR5>`_ "Incorrect matching of warning and warnings in 10_file count cypress test warning tab".


4.5.7
=====

`PR 1705: Chart And Tooltip Updates <https://github.com/4dn-dcic/fourfront/pull/1705>`_

* Address `Trello ticket "React Tooltip updates" <https://trello.com/c/1QQ3QPZd>`_.
* Address `Trello ticket "Chart Updates in BrowseView" <https://trello.com/c/GhxYmNPE>`_


4.5.6
=====

`PR 1710: Twitter Feeds <https://github.com/4dn-dcic/fourfront/pull/1710>`_

* Address Trello ticket "Twitter feeds load all tweets and overflows its border.
  The homepage seems to be stretched out." Rearrange ``autoHeight`` management in
  ``TwitterTimelineEmbed.js``.


4.5.5
=====

`PR 1711: Update snovault to take mime type fix <https://github.com/4dn-dcic/fourfront/pull/1711>`_

* Take new version of ``dcicutils`` (4.1.0 -> 4.4.0)
* Take new version of ``dcicsnovault`` (6.0.3 -> 6.0.4),
  hopefully fixing some MIME type issues in the process
  due to the ``dcicsnovault`` upgrade, which includes changes from
  `snovault PR #225. <https://github.com/4dn-dcic/snovault/pull/225/files#diff-c37c65b10046b2cbd78eb0728eee44969b094e3cc92b7b1548f6b6904862d678>`_.


4.5.4
======

`PR 1699: auth0_config End Point <https://github.com/4dn-dcic/fourfront/pull/1699>`_

* A change to navigation componentry for `NotLoggedInAlert` per `Trello ticket <https://trello.com/c/VHOkoitc>`_.


4.5.3
=====

`PR 1682: Health Page Updates <https://github.com/4dn-dcic/fourfront/pull/1682>`_

* Add ``micro_meta_version`` and ``vitessce_version``
* Note version incompatibilities between dependent and installed versions.


4.5.2
=====

`PR 1708 Add David to master inserts <https://github.com/4dn-dcic/fourfront/pull/1708/files>`_

* Add User record for David Michaels to master inserts.


4.5.1
=====

`PR 1707: Repair local deploys <https://github.com/4dn-dcic/fourfront/pull/1707>`_

* Disabled ``mpindexer``, which is not used in production and does not respect ini file settings.
* Disabled ``repoze.debug`` egg pipeline
* Pass ``GLOBAL_ENV_BUCKET`` to docker local
* Document setting ``GLOBAL_ENV_BUCKET`` in ``docker-local.rst``
* Update documentation so ReadTheDocs links to Docker documentation.


4.5.0
=====

`PR 1706: Syntax makeover for clear-db-es-contents <https://github.com/4dn-dcic/fourfront/pull/1706>`_

* Port some argument changes to ``clear-db-es-contents`` from ``cgap-portal``.
* Create a ``.flake8`` file.


4.4.18
======

`PR 1687: July Security Update <https://github.com/4dn-dcic/fourfront/pull/1687>`_

* Brings in invalidation scope fixes, updates tests as needed
* Updates libraries wherever possible
* Enables ``EnvUtils``, repairing various mirroring interactions


4.4.17
======

`PR 1704: add EdU biofeature mod <https://github.com/4dn-dcic/fourfront/pull/1704>`_

* Add ``EdU`` to the possible ``mod_type`` values (modification type) in ``feature_mods``.


4.4.16
======

`PR 1701: New Cypress Test for QC Tables and QC Item Page <https://github.com/4dn-dcic/fourfront/pull/1701>`_

* In post-deploy Cypress tests, address `Trello ticket <https://trello.com/c/gAzhsn8V>`_ by
  adding a test that visits quality metric tables and checks whether columns are valid
  and in proper order (as it is in Quality Metric Item page).


4.4.15
======

`PR 1698: TOC Navigation Updates <https://github.com/4dn-dcic/fourfront/pull/1698>`_

* Address `Trello ticket <https://trello.com/c/UpUn9vfm>`_.


4.4.14
======

`PR 1696: uuid + d3 Upgrade <https://github.com/4dn-dcic/fourfront/pull/1696>`_

* In ``package.lock``:

  * Upgrade ``d3`` from 6.7 to 7.5.
  * Add ``uuid``.


4.4.13
======

`PR 1695: Bug Fix - Rst Support in Static Content <https://github.com/4dn-dcic/fourfront/pull/1695>`_

* Add rst support in static content


Older Versions
==============

A record of older changes can be found
`in GitHub <https://github.com/4dn-dcic/fourfront/pulls?q=is%3Apr+is%3Aclosed>`_.
To find the specific version numbers, see the ``version`` value in
the ``poetry.app`` section of ``pyproject.toml`` for the corresponding change, as in::

   [poetry.app]
   # Note: Various modules refer to this system as "encoded", not "fourfront".
   name = "encoded"
   version = "100.200.300"
   ...etc.

This would correspond with ``fourfront 100.200.300``.
