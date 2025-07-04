=========
fourfront
=========

----------
Change Log
----------


8.8.1
=====

* Added new suggessted enums for ExperimentType:assay_subclassification, ExperimentType:assay_subclass_short, biosource:override_organism_name and ImagingPath:labels


8.8.0
=====
`PR 1924: add s3 uri to drs reponse <https://github.com/4dn-dcic/fourfront/pull/1924>`_

* add s3 uri to drs response


8.7.0
=======
`PR 1928: update lockfile and postgres version <https://github.com/4dn-dcic/fourfront/pull/1928>`_

* Update lockfile to latest versions of dependencies
* Update postgres version to 15.5 in Dockerfile and docker-compose.yml  


8.6.4
=======
`PR 1926: update footer text <https://github.com/4dn-dcic/fourfront/pull/1926>`_

* Update text in footer


8.6.3
=====

* fix suggested_enum typo


8.6.2
=====

* and add one more suggested_enum that I forgot


8.6.1
=====

`PR 1922: QC Suggested enum updates <https://github.com/4dn-dcic/fourfront/pull/1922>`_

* added file_type suggested_enums
* reorg file_type suggested_enums (alphabetize and move some to ignored)
* added imaging_path/labels suggested_enum
  

8.6.0
=====

`PR 1895: DRS updates <https://github.com/4dn-dcic/fourfront/pull/1895>`_

* Merged in master (2024-10-09)
* Update DRS API to return JSON always
* Update DRS download URLs to return direct downloads to Open Data where applicable

  
8.5.1
=====

`PR 1921: QC report links updates <https://github.com/4dn-dcic/fourfront/pull/1921>`_

* Bug fix: Hide QC HTML Report Links of WFR node details upon removal of bulk html reports already generated


8.5.0
=====

`PR 1920: npm security updates + statistics page improvements <https://github.com/4dn-dcic/fourfront/pull/1920>`_

* Critical npm package updates for security vulnerabilities
* New usage statistics table shows daily counts in tabular form
* New TrackingItem viewer triggered by usage statistics table cell click (admin-only)
* New Y-Axis scaling for usage statistics
* Enhanced table-full-size toggles for usage statistics
* New histogram interval options for submission statistics
* Chart section header styles updated
* Hide QC HTML Report Links upon removal of bulk html reports already generated


8.4.6
=====

`PR 1919: Add suggested enum value to file_type <https://github.com/4dn-dcic/fourfront/pull/1919>`_

* Add 'coverage' as a suggested_enum value for processed file file_type


8.4.5
=====

`PR 1917: Add tests to verify the presence and non-empty content of <pre> elements <https://github.com/4dn-dcic/fourfront/pull/1917>`_

* Update: Added tests to verify the presence and non-empty content of `<pre>` elements inside static section


8.4.4
=====

`Enable React Tooltip for Disabled Buttons <https://github.com/4dn-dcic/fourfront/pull/1916>`_

* Resolved an issue where **React Tooltip** was not displayed for `button` elements with the `disabled` attribute.
* Updated CSS for disabled buttons:
    - `cursor` is now set to `default`.
    - `pointer-events` is now set to `auto`.
* Tooltips are now consistently visible for disabled buttons.


8.4.3
=====

`Update treatment item display title <https://github.com/4dn-dcic/fourfront/pull/1915>`_

* Add 'override_treatment_title' property to Treatment items
* Tweak the display_title calcprop to:
  - use the override_treatment_title prop if present
  - for biological treatments with constructs but no biological agent use construct names in treatment display_title
* added tests


8.4.2
=====

`Fix bar chart's x-axis dropdown width issue <https://github.com/4dn-dcic/fourfront/pull/1914>`_

* Bug fix: The x-axis dropdown of the bar chart displayed on the home page and browse view is not correctly rendered on small and mid-size screens


8.4.1
=====

* New enum added "ATTO 550" for imaging_path/labels


8.4.0
=====

* Upgrade: Bootstrap v5
* Upgrade: React-Bootstrap v2
* Upgrade: FontAwesome v6


8.3.0
=======
* 2024-10-11/dmichaels
* Updated dcicutils version (8.16.1) for vulnerabilities.


8.2.0
=====

* Node 18 to 20 upgrade including GitHub actions


8.1.5
=====

* New enum "ATTO 550" in imaging_path labels.


8.1.4
=====

* Bug fix to correct disease_name test inserts used in local deploy


8.1.3
=====

* Added disease_name property to experiment set schema.


8.1.2
=====

* New value "fragments" added in ignored_enum for processed file schema.


8.1.1
=====

* Bug fix to handle non-array children in static content TOC


8.1.0
=====

* 2024-09-03/dmichaels
  - Update snovault 11.22.0 for fix for running locally; oddity
    with subprocess.Popen in elasticsearch_fixture; see snovault PR-304.


8.0.0
=====

* Upgrade: React v17 to v18
* Upgrade: Redux v4 to v5 (there are breaking changes in store and dispatchers. SPC is updated to support both new and legacy usage)
* Upgrade: HiGlass (React 18-compatible)
* Upgrade: Vitessce (React 18-compatible)
* Upgrade: MicroMeta App
* Upgrade: auth0-Lock v11 to v12
* Upgrade: gulp.js v4 to v5
* Upgrade: react-workflow-viz (animation updates to eliminate findDOMNode errors)
* Fix: User Content updates to fix markdown, jsx, and HTML static section rendering
* Feature: Improve ExperimentSetDetailPane's raw/processed/supplementary file panels
* Feature: Display react-workflow-viz version in /health
* Upgrade: SlideCarousel and BasicCarousel updates upon nuka carousel's breaking changes


7.10.1
=====

* Bug fix to revert schema version of workflow.json back to 7


7.10.0
=====

* Add cumulative sum and date range options for submission statistics
* Add cumulative sum and 60 days options for usage statistics
* Update statistics page style and improve mobile UI
* Add supplementary files table into /browse details
* Add raw/processed/supplementary file download options into `Select All` button


7.9.0
=====

* Added 'override_track_title' to file schema
* Updated track_and_facet calcprop to use the new property if present
* Added test cases


7.8.0
=====

* Added 'tags' mixing to workflow schema
* Added 'max_runtime' property to workflow schema
* Added 'current pipeline' and 'accepted_pipelines' to experiment_type for the names
  of completed pipelines used by foursight


7.7.0
=====

* Updates related to Python 3.12.


7.6.0
=====

`Add routes page  <https://github.com/4dn-dcic/fourfront/pull/1898>`_

* Add routes page to list all endpoints
* updated lock file


7.5.8
=====

`Add ignored enum  <https://github.com/4dn-dcic/fourfront/pull/1897>`_

* Add value to ignored_enum for file_type
>>>>>>> master


7.5.7
=====

`Fix command to pull inserts <https://github.com/4dn-dcic/fourfront/pull/1894>`_

* Update snovault and use its updated command to pull inserts
* Delete nonfunctional command in this repo


7.5.6
=====

`fix cypress 03d  <https://github.com/4dn-dcic/fourfront/pull/1893>`_

* fixes cypress 03d's failing "Select All" step
* adds OPF coun into Chart's files agg


7.5.5
=====

* bug fix - button "Select All" not turns into "Deselect All" in /browse after QuickInfoBar updates in 7.5.0


7.5.4
=====

* bug fix - analytics impression count calculation fails for the lists having 200+ items


7.5.3
=====

`calcprop update  <https://github.com/4dn-dcic/fourfront/pull/1890>`_

* Updated experiment_categorizer calcprop for ExperimentMic to deal with many targets in imaging paths


7.5.2
=====

* adds two new props to object.CopyWrapper to allow/prevent sending analytics data into GA4


7.5.1
=====

* grab ExpSet accession from source_experiment_sets instead of experiment_sets for FileView's metadata.tsv generation


7.5.0
=====

* changes QuickInfoBar experiment and file links from /browse to /search
* adds OPF to File counts


7.4.2
=====

* Bug fix - LocalizedTime component cannot handle invalid dates and makes UI failing completely


7.4.1
=====

`RST static content updates <https://github.com/4dn-dcic/fourfront/pull/1882>`_

* Adds admonition (currently, only "tip" supported)
* Adds enhanced table features
* Adds "initial_header_level" support
* Adds copy-to-clipboard feature for <pre>


7.4.0
=====

* Cypress GA configuration updated - migrated into Ubuntu 22, actions/checkout@v4, cypress-io/github-action@v6


7.3.4
=====

* added new allowed relationship type to both File and Experiment - 'matched with'


7.3.3
=====

* Cypress v13 upgrade


7.3.2
=====

* Added new ignored_enum "normalized contact intensities" for file_processed.json schema


7.3.1
=====

* Added upgrade/ingestion_submission.py for "new" (as of 5 months ago) restriction
  in ingestion_submission schema that the "errors" array property, if present,
  must have at least one element.
* Added schemas/ingestion_schema.json which simply refers to snovault version (via $merge);
  this is so we can update the schema_version (from 1 to 2), so the above upgrader takes.


7.3.0
=====

* Updates nginx to latest


7.2.2
=====

* Bump dcicsnovault v1.13.0 to fix non-admins AccessKey deleting restriction


7.2.1
=====

`Facets list updates <https://github.com/4dn-dcic/fourfront/pull/1876>`_

* Adds prop (hideHeaderToggle) to make facets list header's included/excluded toggle optional
* Adds support for facet item's hide_from_view property


7.2.0
=====

* Repairs accession validation


7.1.8
=====

* Update Individual Primate schema to link two new organisms (Rhesus monkey and Marmoset)
* Added the the new organisms in master_inserts/organism.json and inserts/individual_primate.json
* fixed a typo in biosource.override_organism enum and added a new value to ignored enum for treatment_agent.concentration_units (ajs)
* also small update to generate_ontology that I had made locally but now pushing (ajs 2024-03-01)


7.1.7
=====

`Sentry updates + new user <https://github.com/4dn-dcic/fourfront/pull/1875>`_

* Cancels the unnecessary logs that have been depleting the Sentry monthly quota
* Adds Onurcan Karatay into master-inserts' users


7.1.6
=====

* New ignored_enum value (cell data) for file_processed.json schema


7.1.5
=====

* Cypress test 10a reimplemented to fix occasional failure in “files having HiGlass display as static content" step


7.1.4
=====

* Update npm packages having critical security flaw reported by dependabot


7.1.3
=====

* Inform Auth0 users about RAS transition
* Bug fix - display excluded data type facet terms


7.1.2
=====

* Repair GA build


7.1.1
=====

* Add opossum to suggested enum to biosource.override_organism to clear foursight check

7.1.0
=====

`PR1860: Adding 4C-seq properties to ExperimentCaptureC<https://github.com/4dn-dcic/fourfront/pull/1860>`_

* Add fields/properties to experiment_capture_c schema to support 4C-seq experiments
* Added an insert using these fields to data/inserts


7.0.1
=====

`Collecting experiment_type for server-side file downloads <https://github.com/4dn-dcic/fourfront/pull/1857>`_

* Fix - even if experiment_type exists in file item, it is not collected in some cases


7.0.0
=====

* Upgrade to Python 3.11.
* Changed pyyaml version to ^6.0.1.
* Removed types/access_key.py and schemas/access_key.json as the ones in snovault are sufficient.
* Added generate-local-access-key script (from snovault) to pyproject.toml;
  orignally created for smaht-portal since early in development no way to
  create an access-key normally using the UI; but generally useful/convenient.


6.4.6
=====

`Cypress performance improvements <https://github.com/4dn-dcic/fourfront/pull/1854>`_

* Cypress wait() to should() conversion


6.4.5
=====

`Bug fix - markdown json content in static sections <https://github.com/4dn-dcic/fourfront/pull/1853>`_

* Json code sections in markdowns static content is not correctly rendered


6.4.4
=====

* Added 'fluorophore' as additional ignored_enum label for imaging_path.json schema


6.4.3
=====

`TOC + HealthView + Unpkg updates updates <https://github.com/4dn-dcic/fourfront/pull/1848>`_

* TOC support for Markdown (renewed), HTML and RST
* Healthview updates due to Node v18 (and npm 9+) transition
* Unpkg updates for HiGlass and Vitessce due to Node v18 (and npm 9+) transition


6.4.2
=====

`Usage Statistics updates <https://github.com/4dn-dcic/fourfront/pull/1844>`_

* The graphs listed added to /statistics page: Top 10 Files Downloaded, File Details View, File Impressions, File Search Result Click, Metadata.tsv Downloads, Device Category
* Tracking Item schema updated for new reports generated by GA4 metrics: metadata_tsv_by_country, top_files_downloaded, sessions_by_device_category


6.4.1
=====

`Markdown image links in static sections and pages <https://github.com/4dn-dcic/fourfront/pull/1845>`_

* Bug fix - Markdown formatted static sections with images in hyperlinks are not correctly rendered if embedded in Pages. If the static section is rendered standalone, it works well.


6.4.0
=====

* Implement and enable DRS API on File objects


6.3.0
=====


`Node v18 Upgrade <https://github.com/4dn-dcic/fourfront/pull/1835>`_

* Node in Docker make file and GA workflows migrated from v16 to v18


6.2.2
=====

`GA4 e-commerce + UI updates <https://github.com/4dn-dcic/fourfront/pull/1838>`_

* metadata.tsv and server side downloads events replaced
* tooltip added when Select All button get disabled in browse and file view


6.2.1
=====

`Home page updates <https://github.com/4dn-dcic/fourfront/pull/1837>`_

* Twitter timeline embeds are not working. Until it is available again, we are replacing the section with the 4DN article published on Nature Communications.


6.2.0
=====

* Removes ``jsonschema_serialize_fork``, updating schema format version and validation
* Repairs a bug in user registration


6.1.1
=====

`suggested enums and purge fix <https://github.com/4dn-dcic/fourfront/pull/1833>`_

* add muscle cell values to bcc suggested enums
* Repair user_info resolution bug


6.1.0
=====
* Fix for MIME type ordering in renderers.py (differs between cgap and fourfront).

6.0.1
=====

`GA4 post-migration updates  <https://github.com/4dn-dcic/fourfront/pull/1825>`_

* Bug Fix: a typo prevents begin_checkout GA4 event and it also makes Cypress 03d failing
* New Feature: user_id tracking to track user's cross-session interaction between multiple devices added (this update unlocks various Audience related reports in GA4 property)
* GTM workspaces updated


6.0.0
=====
* Migrate/unify ingestion code (etc) to snovault.


5.4.0
======

`Google Analytics - UA to GA4 migration  <https://github.com/4dn-dcic/fourfront/pull/1819>`_

* UA (Universal Analytics) sunsetted on July 1st, 2023
* UA property and all hit-based functions including enhanced e-commerce plugins are migrated to GA4 property
* Supports Google Tag Manager (GTM)


5.3.15
======

* Repair Nginx PGP key for Docker build


5.3.14
======

`Adding user master inserts  <https://github.com/4dn-dcic/fourfront/pull/>`_

* Added User master inserts for Cesar and Bianca

5.3.13
======

`Another Tweak to generate ontology script  <https://github.com/4dn-dcic/fourfront/pull/1820>`_

* update to generate-ontology script to remove invalid characters in term_id when parsing from URI

5.3.12
======

`Tweak to generate ontology script  <https://github.com/4dn-dcic/fourfront/pull/1818>`_

* update to generate-ontology script to break up search query for all existing ontology terms into querying by ontology to get around the 100K result limit now that there are more than 100K terms in the db.

5.3.11
======

* Use ``lorem-text`` library instead of ``loremipsum`` for proper license compatibility.
  This affects only the ``extract-text-data`` script, which was used a long time ago
  on a one-off basis to set up the system and isn't actually used at runtime, so the
  impact of this is probably very small. Also, there are no apparent tests of this script,
  but it's not clear there is a good reason to write any at this time. A manual test
  was done in creating this patch to make sure the relevant change is plug-compatible.


5.3.10
=====

`PR Cypress test for statistics page  <https://github.com/4dn-dcic/fourfront/pull/1813>`_

* New 12_statistics test to check submissions and usage tabs loaded correctly


5.3.9
=====

`PR Cypress test for facet terms grouping  <https://github.com/4dn-dcic/fourfront/pull/1810>`_

* Two tests added for selecting/excluding a grouping term and its sub-terms


5.3.8
=====

`PR Facet terms grouping  <https://github.com/4dn-dcic/fourfront/pull/1797>`_

* The update allows for a hierarchical display of terms grouped under a grouping term. It also enables searching and selection by group names and individual terms.
* To use, add the group_by_field property in schema json to define grouping for a facet. The experiment type facet's terms of ExperimentSet are grouped in this PR.


5.3.7
=====

* Bug fix - submission statistics tab in /statistics page throws error


5.3.6
=====

* Bump poetry to 1.4.2 in Makefile and Dockerfile.


5.3.5
=====

`PR Cypress test for not facet  <https://github.com/4dn-dcic/fourfront/pull/1804>`_

* it toggles between included and excluded properties in facets
* it excludes a award.project term and compares the exact Exp Set’s before and after counts
* it removes the excluded item's selection, then includes it, and compares the before and after counts.


5.3.4
=====

`PR Npm Updates Apr-May 2023  <https://github.com/4dn-dcic/fourfront/pull/1803>`_

* jsonwebtoken npm package is replaced with jose
* cypress 10 to 12 migration completed
* new cypress test for not facet feature added
* auth0 client/domain grabbed from /auth0_config in cypress tests (old implementation gets them from env. variables)


5.3.3
=====

* updated suggested_enums for processed files
* updated assay_subclass_short by making a more general FISH at expense of RNA and DNA FISH


5.3.2
=====

`PR Metadata.tsv Improvements  <https://github.com/4dn-dcic/fourfront/pull/1795>`_

* /metadata end-point traverses only filtered files instead of all files in FileSearchView (Browse, ExpSet and Exp. pages remained as is.)


5.3.1
======

* Add QualityMetricChipseqV2 schema and type


5.3.0
=====

Adding ingestion support (from cgap-portal as initial guide):
* Changed ``deploy/docker/production/entrypoint.bash`` to include ``entrypoint_ingester``.
* Added ``deploy/docker/production/entrypoint_ingester.bash``.
* Added ``encoded/submit.py`` (verbatim from cgap-portal).
* Added ``encoded/ingester/ingestion_listener_base.py`` (verbatim from cgap-portal).
* Added ``encoded/ingester/ingestion_message.py`` (verbatim from cgap-portal).
* Added ``encoded/ingester/ingestion_message_handler_decorator.py`` (verbatim from cgap-portal).
* Added ``encoded/ingester/common.py`` (verbatim from cgap-portal).
* Added ``encoded/ingester/exceptions.py`` (verbatim from cgap-portal).
* Added ``encoded/ingester/queue_utils.py`` (verbatim from cgap-portal).
* Added ``encoded/ingester/processors.py`` (from cgap-portal except
  removed ``handle_genelist``, ``handle_variant_update``, ``handle_metadata_bundle``,
  ``handle_simulated_bundle`` ``simulated_processor`` and added ``handle_ontology_update``
  which (the latter) is from the ``fourfront`` ``ff_ingester`` branch).
* Added ``encoded/ingestion_listener.py`` (verbatim from cgap-portal).
* Added ``encoded/types/ingestion.py`` (verbatim from cgap-portal).
* Changed ``encoded/utils.py``:
  * Changed ``print`` to ``PRINT`` throughout. Added ``log``.
  * Changed ``s3_output_stream`` to add arg (and extra kwargs) for ``s3_encrypt_key_id``.
  * Added ``extra_kwargs_for_s3_encrypt_key_id`` function (verbatim from cgap-portal).
  * Added ``SettingsKey`` class (verbatim from cgap-portal).
  * Added ``ExtraArgs`` class (verbatim from cgap-portal).
  * Changed ``create_empty_s3_file`` to add arg (and extra kwargs) for ``s3_encrypt_key_id``.
  * Added ``_app_from_clues`` function (verbatim from cgap-portal).
  * Added ``make_vapp_for_email`` function (verbatim from cgap-portal).
  * Added ``vapp_for_email`` function (verbatim from cgap-portal).
  * Added ``make_vapp_for_ingestion`` function (verbatim from cgap-portal).
  * Added ``vapp_for_ingestion`` function (verbatim from cgap-portal).
  * Added ``make_s3_client`` function (verbatim from cgap-portal except log.info not log.warning).
  * Added ``build_s3_presigned_get_url`` function (verbatim from cgap-portal).
  * Added ``convert_integer_to_comma_string`` function (verbatim from cgap-portal).
* Changed ``encoded/__init__.py`` to include in ``main``
  ``config.include('.ingestion_listener')`` and
  ``config.include('.ingestion.ingestion_message_handler_default')``.
  * Changed ``encoded/appdefs.py`` to include ``IngestionSubmission`` in ``ITEM_INDEX_ORDER``.
* Changed ``pyproject.toml`` to
  add ``ingester = "encoded.ingestion_listener:composite"``
  to ``[paste.composite_factory]`` section
  and ``ingestion-listener = "encoded.ingestion_listener:main"``
  to ``[tool.poetry.scripts]`` section, and added ``generate-ontology``.
* Changed ``Makefile`` to include in ingestion code (from cgap-portal).
* Changed ``encoded/dev_servers.py`` to include in ingestion code (from cgap-portal).
* Added to check for unknown ingestion type for @ingestion_processor decorator in ``encoded/ingestion/processor.py``,
  via ``IngestionSubmission.supports_type`` defined in ``encoded/types/ingestion.py``.
* Added ``encoded/schemas/ingestion_submission.json`` (from cgap-portal but
  deleted ``institution`` and ``project`` from ``required`` list).
* Added ``ontology`` to ``properties.ingestion_type.enum`` list in ``encoded/schemas/ingestion_submission.json``.
* Added ``metadata_bundles_bucket = cgap-unit-testing-metadata-bundles`` to ``development.ini.template``
  and ``deploy/docker/local/docker_development.ini.template``. Actually make that ``metadata-bundles-fourfront-cgaplocal-test``.
* Added ``encoded/tests/test_ingestion_message_handler_decorator.py`` (verbatim from cgap-portal).
* Added ``encoded/tests/test_ingestion_processor.py`` (verbatim from cgap-portal).
* Added ``encoded/ingestion/ingestion_connection.py`` (totally new).
* Updated ``encoded/commands/generate_ontology.py`` (to use new IngestionConnection).
* Updated ``download_url`` in ``encoded/tests/data/master-inserts/ontology.json``
  from ``https://raw.githubusercontent.com/The-Sequence-Ontology/SO-Ontologies/master/so.owl``
  to ``https://raw.githubusercontent.com/The-Sequence-Ontology/SO-Ontologies/master/Ontology_Files/so.owl``.
  and from ``https://www.ebi.ac.uk/efo/efo.owl`` to ``https://github.com/EBISPOT/efo/releases/download/current/efo.owl"``.
* Updated ``groupfinder`` in ``encoded/authorization.py`` to include ``INGESTION`` in ``localname``
* Added ``encoded/schemas/file_other.json`` (totally new).
* Updated ``encoded/types/file.py`` with new ``FileOther`` type.
* Updated ``encoded/schemas/ingestion_submission.py`` to remove ``award`` and ``lab`` from ``required``.

From Andy's branch (upd_ont_gen) on 2023-04-10: Update generate_ontology script to:

* fix a bug that obsoleted a term even if it was linked to more than one Ontology
* change the output json file to use item type names as keys for each section (i.e. ontology and ontology_term)
* optionally allow a local .owl file to be specified as input (instead of remote download from source)
* optionally phase the json (no longer needed for ingest but could be useful for local testing)
* updated some tests

5.2.1
=====

`PR 1796: Test cleanups <https://github.com/4dn-dcic/fourfront/pull/1796>`_

* Removed unused imports from test_file.py
* added mark to integrated tests that use s3 test bucket

5.2.0
=====

`PR 1789: Not facets <https://github.com/4dn-dcic/fourfront/pull/1789>`_

* Add a new folder for storing FontAwesome v6 icons and a couple of icons for not facets
* Update BrowseView code to not duplicate facets for omitted terms
* Some 4DN-specific styling for not facets
* Attach new release of SPC v0.1.63


5.1.7
=====

`PR Npm package upgrades  <https://github.com/4dn-dcic/fourfront/pull/1791>`_

* sass-loader, underscore, and query-string packages upgraded


5.1.6
=====

`PR Static content - open external links in new tab  <https://github.com/4dn-dcic/fourfront/pull/1773>`_

* Convert links in static content: add no tracking, styling, and target="_blank" attributes


5.1.5
======

* Pin auth0-lock in SPC to v11


5.1.4
=====

`PR Vitessce upgrade  <https://github.com/4dn-dcic/fourfront/pull/1792>`_

* upgrade from 1.1.20 to 2.0.3


5.1.3
=====

`PR HiGlass core + multivec lib upgrades  <https://github.com/4dn-dcic/fourfront/pull/1772>`_

* Higlass core + multivec libraries including some dependencies having critical security warnings upgraded
* HiGlass version added to /Health page


5.1.2
======

* Added 'external_submission' mixin to experiment_set_replicate schema to support tracking GEO submission status more fully


5.1.1
======

* Added install of wheel to Makefile.


5.1.0
=====

`PR 1727: Manage development.ini and test.ini outside of source control <https://github.com/4dn-dcic/fourfront/pull/1727>`_

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


5.0.4
=====

`PR Cypress tests fail due to change in search result's total count  <https://github.com/4dn-dcic/fourfront/pull/1777>`_

* Gets search results' exact count from facet terms where type=Item's doc_count is available


5.0.3
=====

* Updates to experiment_type.json file to include cfde term based on the experiment name to obi mapping.


5.0.2
=====

`PR Sentry upgrades  <https://github.com/4dn-dcic/fourfront/pull/1774>`_

* Removes unnecessary log statements
* Upgrades @sentry/react and @sentry/tracing npm packages to 7.35.0


5.0.1
=====

`PR Cypress tests for Vitessce integration  <https://github.com/4dn-dcic/fourfront/pull/1640>`_

* Adds new tests for FileMicroscopy items having vitessce-compatible file
* Checks Vitessce tab is visible
* Checks the Vitessce viewer is loaded correctly and it is able to display image and settings pane


5.0.0
=====

`PR ElasticSearch 7 support <https://github.com/4dn-dcic/fourfront/pull/1732>`_

* Adds support for ES7
* Integrates new SQLAlchemy version
* Repairs broken test segmentation (should reduce test time)
* Add ?skip_indexing parameter
* Adds B-Tree index on max_sid to optimize indexing


4.7.8
=====

`PR selection popup navigation updates <https://github.com/4dn-dcic/fourfront/pull/1766>`_

* Show footer having "back to selection list" button, even if user navigates other pages in popup
* Restore selections when returned to selection page in popup


4.7.7
=====

`PR home page updates - data use guidelines & 4DN help <https://github.com/4dn-dcic/fourfront/pull/1767>`_

* Data Use Guidelines content updated.
* 4DN Data Portal Paper link added under 4DN Help section.


4.7.6
=====

* Deleted 'DAPI' from suggested_enums list from imaging_path schema


4.7.5
=====

`PR jsonwebtoken npm package downgrade <https://github.com/4dn-dcic/fourfront/pull/1763>`_

* jsonwebtoken 9.0.0 has breaking changes that prevents Cypress test's authentication. It is downgraded to a compatible version.


4.7.4
=====

`PR static content location in pages <https://github.com/4dn-dcic/fourfront/pull/1759>`_

* new content_location property is added to the Page item to let customize static content location with respect to child pages


4.7.3
=====

`PR jwtToken cookie <https://github.com/4dn-dcic/fourfront/pull/1758>`_

* jwtToken cookie's SameSite=Strict attribute changed as SameSite=Lax


4.7.2
=====

* Add ``aliases`` to MicroscopeConfiguration items.
* Add neural progenitor cell as tissue enum in BiosampleCellCulture


4.7.1
=====

`PR new home page design <https://github.com/4dn-dcic/fourfront/pull/1733>`_

* redesign of home page including content and look-and-feel
* add /recently_released_datasets endpoint
* add new lab view page
* new unit test for /recently_released_datasets endpoint
* new Cypress tests for home page and lab view


4.7.0
=====

`PR pi_name calc prop <https://github.com/4dn-dcic/fourfront/pull/1746>`_

* add pi_name calculated property to lab and award items
* remove Sarah from contact_persons field for 4DN-DCIC lab in master-inserts


4.6.4
=====

* Bug fix - cannot clear q= if top bar "Within Results" option is selected


4.6.3
=====

* Cypress test updates for the new MicroMeta App features


4.6.1
=====

`PR 1712: MicroMeta app integration <https://github.com/4dn-dcic/fourfront/pull/1712>`_

* New MicroMeta App release


4.5.26
======

* Add suggested enums for BiosampleCellCulture.


4.5.25
======

`PR 1472: imaging paths table edits <https://github.com/4dn-dcic/fourfront/pull/1472>`_

* Imaging paths list is converted to table


4.5.24
======

* SPC is upgraded to 0.1.57.
* Until SPC 0.1.56, Sentry API log almost any incidents and obliterates the quota quickly. 0.1.57 allows tuning the sampling rate. (default is 0.1))


4.5.22
======

`PR 1723: dependabot security updates <https://github.com/4dn-dcic/fourfront/pull/1723>`_

* Miscellaneous vulnerable npm packages - reported by dependabot - are upgraded
* Webpack is upgraded to 5.74 (has breaking changes that prevent building bundle.js, all fixed)
* SPC is upgraded to 0.1.56 that has Sentry.js updates that support tree shaking


4.5.21
======

`PR 1734: add gulsah user insert <https://github.com/4dn-dcic/fourfront/pull/1734>`_

* Added a new user insert for Gulsah (UI dev on Utku's team) in master_inserts/user.json


4.5.20
======

* Add suggested enums for BiosampleCellCulture.


4.5.19
======

* Miscellaneous cosmetics and refactoring to align better with CGAP
  in how the file src/encoded/__init__.py is arranged.
* Pick up ``ENCODED_SENTRY_DSN`` from the GAC (C4-913).
* Adjust log level for ``boto``, ``urllib``, ``elasticsearch``, and ``dcicutils`` to ``WARNING``.


4.5.18
======

* Added a new user insert for Rahi in master_inserts/user.json


4.5.17
======

`PR 1721: Twitter Timeline Feeds API Update - Round 2 <https://github.com/4dn-dcic/fourfront/pull/1721>`_

* In ``react-twitter-embed/TwitterTimelineEmbed.js``, add conditional handling of ``options.height``,
  depending on ``autoHeight``.


4.5.16
======

`PR 1725: Clean NPM Cache in Docker <https://github.com/4dn-dcic/fourfront/pull/1725>`_

* In order to reduce image size, this adds a cache clean during docker build after ``npm ci``.

**Note:** A syntax error in this PR was later corrected by a thug commit that has been tagged ``v4.5.16.1``.


4.5.15
======

`PR 1724: Rewind fix-dist-info <https://github.com/4dn-dcic/fourfront/pull/1724>`_

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
