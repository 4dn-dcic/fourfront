=========
fourfront
=========

----------
Change Log
----------


4.6.0
=====

Changes made by this PR:

* Renames ``development.ini`` to ``development.ini.template``, parameterizing ``env.name``.
* Renames ``test.ini`` to ``test.ini.template``, parameterizing ``env.name``.
* Adds new script ``prepare-local-dev``.
* Adjusts ``Makefile`` to run the ``prepare-local-dev`` script in target ``build-after-poetry``.
* Renames ``commands/prepare_docker.py`` to ``commands/prepare_template.py``
  so that the two commands ``prepare-docker`` and ``prepare-local-dev`` can live in the same file.
  They do similar things.
* There is no change to docker setup, since that already does ``make build``.
* There is no change to GA workflows, since they already do ``make build``.

**Special Notes for Developers**

This change should **not** affect production builds or GA. You should report problems if you see them.

This change might affect developers who are doing local testing
(e.g., ``make test`` or a call to ``pytest``) that would use ``test.ini``
or who are doing local deploys (e.g., ``make deploy1``) that would use ``development.ini``.

Prior to this change, ``development.ini`` and ``test.ini`` were in source control.
This PR chagnes this so that what's in source control is ``development.ini.template`` and ``test.ini.template``.
There is a command introduced, ``prepare-local-dev`` that you can run to create a ``development.ini``
and ``test.ini``. Once the file exists, the ``prepare-local-dev`` command will not touch it,
so you can do other edits as well without concern that they will get checked in.
The primary change that this command does is to make a local environment of ``fourfront-devlocal-<yourusername>``
or ``fourfront-test-<yourusername>`` so that testing and debugging that you do locally will be in an environment
that does not collide with other users. To use a different name, though, just edit the resulting file,
which is no longer in source control.


4.5.15
======

* Restore the version of scripts/fix-dist-info from v4.5.11 (undoing change made in v4.5.12).


4.5.14
======

`PR 1716: embed crosslinking_method in expset <https://github.com/4dn-dcic/fourfront/pull/1716>`_

* Embed experiments_in_set.crosslinking_method in ExpSet.
* Add crosslinking_method column in Experiment.
* Also, unrelated, updated documentation for docker-local deployment.


4.5.13
======

* Pin ``poetry`` version in ``Makefile`` to ``1.1.15``
* Pin ``wheel`` in ``pyproject.toml`` to ``0.37.1``
* Update ``poetry.lock`` for changes to ``flake8`` and ``wheel``.
  (The ``flake8`` update is because we needed to pick up a newer
  version, not because we needed to change ``pyproject.toml``.)


4.5.12
======

* Correct some classifiers in ``pyproject.toml``
* Update ``fix-dist-info`` script to be consistent with ``cgap-portal``


4.5.11
======

* Fix a syntax anomaly in ``pyproject.toml``.


4.5.10
======

`PR 1715: Add CHANGELOG.rst and update docutils (C4-888) <https://github.com/4dn-dcic/fourfront/pull/1715>`_

**NOTE:** This PR has a syntax error and won't load.

* Add a CHANGELOG.rst
* Also, unrelated, take a newer version of docutils (0.16 instead of 0.12)
  to get rid of a deprecation warning in testing. (`C4-888 <https://hms-dbmi.atlassian.net/browse/C4-888>`_).


4.5.9
=====

`PR 1714: Twitter Iframe Updates for Cypress 00_home_page <https://github.com/4dn-dcic/fourfront/pull/1714>`_

* Address `Trello ticket <https://trello.com/c/IOgmbGSB>`_
  "Cypress test updates for the new MicroMeta app release".


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
