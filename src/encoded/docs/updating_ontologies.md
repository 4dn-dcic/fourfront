Updating ontologies
=========================

This document describes how to update the ontology_terms in fourfront with the latest ontology obtained from the maintainers.

Ontologies used
----------------

* [Uber anatomy ontology (Uberon)]
* [Experimental Factor Ontology (EFO)]
* [Ontology for Biomedical Investigations (OBI)]
* [Sequence Ontology (SO)]

Ontology files that are used are obtained using the value in the download_url field of the Ontology item in the database.

How to update ontology terms
----------------


* The script generate_ontology.py, located in the encoded/commands directory, will generate json to load to run use

	`$ bin/generate-ontology`

	* default is to run on data and generate output for all ontologies in the database
	* `bin/generate-ontology --help` for script options or look at `def parse_args` in script code


* Unless the '--full' option is used 2 files are generated:
	`ontology_patch.json` contains json to patch or update existing terms
	`ontology_post.json` contains json for new ontology terms that don't currently exist in the database

	* --full will generate a full set of terms for the specified ontologies that can be used to load into a 'fresh' database


* To load ontology term updates into fourfront use the script load_ontology_terms.py located in encoded/commands

	`$ bin/load-ontology-terms production.ini --app-name app --post-file 'path/to/post.json' --patch_file 'path/to/patch.json'`

	* `bin/load-ontology-terms --help` or parser setup in script `main` for options

[Uber anatomy ontology (Uberon)]: http://uberon.org/
[Sequence Ontology (SO)]: http://www.sequenceontology.org/
[Experimental Factor Ontology (EFO)]: http://www.ebi.ac.uk/efo
[Ontology for Biomedical Investigations (OBI)]: http://obi-ontology.org/
