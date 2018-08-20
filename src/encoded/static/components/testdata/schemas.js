module.exports = {
    "AnalysisStepRun": {
        "description": "Schema for reporting the specific calculation of an analysis_step",
        "id": "/profiles/analysis_step_run.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "analysis_step_version",
            "status"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "2",
                "title": "Schema Version",
                "type": "string"
            },
            "analysis_step_version": {
                "linkTo": "AnalysisStepVersion",
                "type": "string",
                "title": "Analysis Step Version",
                "description": "Reference to template step in pipeline"
            },
            "dx_applet_details": {
                "items": {
                    "title": "DNA Nexus applet detail",
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "dx_job_id": {
                            "title": "DNA Nexus job id",
                            "description": "Identifier in the DNA Nexus system",
                            "type": "string"
                        },
                        "dx_app_json": {
                            "title": "DNA Nexus applet json",
                            "description": "dxapp JSON for the applet (wrapper code) corresponding to the step",
                            "type": "object",
                            "properties": {},
                            "additionalProperties": true
                        },
                        "parameters": {
                            "title": "Input Parameters",
                            "description": "The input parameters used for this run (could be extracted from dx_job)",
                            "type": "object",
                            "properties": {},
                            "additionalProperties": true
                        },
                        "started_running": {
                            "title": "Start time",
                            "description": "When the analysis step was started",
                            "type": "string",
                            "format": "date-time"
                        },
                        "stopped_running": {
                            "title": "Finish time",
                            "description": "When the analysis step ended",
                            "type": "string",
                            "format": "date-time"
                        },
                        "dx_status": {
                            "title": "Status",
                            "type": "string",
                            "default": "waiting",
                            "enum": [
                                "waiting",
                                "running",
                                "finished",
                                "error"
                            ]
                        }
                    }
                },
                "type": "array",
                "title": "DNA Nexus applet details",
                "description": "Metadata capture from DNA Nexus applets"
            },
            "status": {
                "enum": [
                    "waiting",
                    "running",
                    "finished",
                    "error",
                    "virtual"
                ],
                "default": "waiting",
                "title": "Status",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "TALEN": {
        "title": "TALEN construct",
        "description": "Schema for submitting a TALEN construct.",
        "id": "/profiles/talen.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "name",
            "lab",
            "award",
            "source",
            "talen_platform",
            "RVD_sequence",
            "vector_backbone_name",
            "target_sequence",
            "target_genomic_coordinates"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases",
            "name"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/product_id"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The originating lab or vendor.",
                "linkTo": "Source"
            },
            "product_id": {
                "description": "The product identifier provided by the originating lab or vendor.",
                "title": "Product ID",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "2",
                "title": "Schema Version",
                "type": "string"
            },
            "name": {
                "uniqueKey": true,
                "type": "string",
                "title": "Construct name",
                "default": "",
                "description": "The name of the TALEN construct."
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "title": "Field mapping index type",
                    "description": "Defines one of three types of indexing available",
                    "type": "string",
                    "default": "analyzed",
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ]
                },
                "type": "string",
                "title": "Description",
                "default": "",
                "description": "A plain text description of the TALEN construct."
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the construct."
            },
            "vector_backbone_name": {
                "type": "string",
                "title": "Backbone name",
                "description": "The cloning vector used to make the construct. E.g. PEGFP (delGFP-TAL2-truncNLS)"
            },
            "RVD_sequence": {
                "type": "string",
                "title": "RVD sequence",
                "pattern": "^([ARNDCQEGHILKMFPSTWYV]{2})($|(,\\1))*",
                "description": "The repeat variable diresidue sequence. E.g. NI,NG,NI,HD,NG,NN,NG,NG,NN,HD,NI,NI,NI,NI,NM,HD,HD,NG"
            },
            "target_sequence": {
                "pattern": "^[ACTG]+$",
                "title": "Target sequence",
                "descrition": "The target genome sequence recognized by the TALE domain.",
                "type": "string"
            },
            "talen_platform": {
                "type": "string",
                "title": "TALEN platform",
                "description": "The TALEN platform used to make the construct. E.g. Golden Gate"
            },
            "target_genomic_coordinates": {
                "properties": {
                    "assembly": {
                        "title": "Genome assembly",
                        "description": "The GRC genome assembly to which the target coordinates relate.  E.g. GRCh38",
                        "type": "string",
                        "pattern": "^((GRCh\\d{2})|(GRCm\\d{2}))$"
                    },
                    "chromosome": {
                        "title": "Chromosome",
                        "description": "The number (or letter) designation for the target chromosome. E.g. 1, 21, or X",
                        "type": "string",
                        "pattern": "^(\\d{1,2}|[XYM])$"
                    },
                    "start": {
                        "title": "Start",
                        "description": "The starting coordinate.",
                        "type": "integer"
                    },
                    "end": {
                        "title": "End",
                        "description": "The ending coordinate (possibly equal to the starting coordinate for one base.)",
                        "type": "integer"
                    }
                },
                "type": "object",
                "title": "Target genomic coordinates",
                "additionalProperties": false,
                "description": "Genomic coordinates where the TALEN cuts."
            },
            "pairings": {
                "items": {
                    "description": "Properties arising from each pairing.",
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "paired_with": {
                            "title": "Paired with",
                            "description": "Other member of the TALEN pair",
                            "comment": "See identifyingProperties in talen.json for valid identifiers",
                            "type": "string",
                            "linkTo": "TALEN"
                        },
                        "edit_type": {
                            "title": "Edit type",
                            "description": "The type of genomic modification for this pair.  E.g. insertion, deletion, edit",
                            "type": "string",
                            "enum": [
                                "insertion",
                                "deletion",
                                "edit"
                            ]
                        },
                        "edited_genomic_coordinates": {
                            "title": "Edited genomic coordinates",
                            "description": "Genomic coordinate range modified by this pair.",
                            "type": "object",
                            "additionalProperties": false,
                            "properties": {
                                "assembly": {
                                    "title": "Genome assembly",
                                    "description": "The GRC genome assembly to which the target coordinates relate.  E.g. GRCh38",
                                    "type": "string",
                                    "pattern": "^((GRCh\\d{2})|(GRCm\\d{2}))$"
                                },
                                "chromosome": {
                                    "title": "Chromosome",
                                    "description": "The number (or letter) designation for the target chromosome. E.g. 1, 21, or X",
                                    "type": "string",
                                    "pattern": "^(\\d{1,2}|[XY])$"
                                },
                                "start": {
                                    "title": "Start",
                                    "description": "The starting coordinate.",
                                    "type": "integer"
                                },
                                "end": {
                                    "title": "End",
                                    "description": "The ending coordinate (possibly equal to the starting coordinate for one base.)",
                                    "type": "integer"
                                }
                            }
                        },
                        "new_sequence": {
                            "title": "New sequence",
                            "description": "For edits or inserts, the new or inserted sequence",
                            "type": "string",
                            "pattern": "^[ACTG]+$"
                        }
                    }
                },
                "type": "array",
                "title": "TALEN pairings",
                "default": [],
                "description": "A list of possible pairings with other TALENs."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "characterizations": {
                "items": {
                    "linkTo": "ConstructCharacterization",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Characterizations",
                "type": "array"
            }
        },
        "facets": {
            "talen_platform": {
                "title": "TALEN platform",
                "type": "string"
            },
            "status": {
                "title": "TALEN status",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            }
        },
        "columns": {
            "name": {
                "title": "Construct name",
                "description": "The name of the TALEN construct."
            },
            "description": {
                "title": "Description",
                "description": "A plain text description of the TALEN construct."
            },
            "talen_platform": {
                "title": "TALEN platform",
                "description": "The TALEN platform used to make the construct. E.g. Golden Gate"
            },
            "target_genomic_coordinates": {
                "title": "Genome assembly",
                "description": "The GRC genome assembly to which the target coordinates relate.  E.g. GRCh38"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "PublicationData": {
        "title": "Publication data",
        "description": "Schema for submitting metadata for publication data.",
        "id": "/profiles/publication_data.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "references"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "file_set.json#/properties"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_files": {
                "items": {
                    "linkTo": "File",
                    "comment": "See file.json for available identifiers.",
                    "title": "Data file",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional data files",
                "description": "List of data files to be associated with the dataset."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "biosample_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term id",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "biosample_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term name",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "biosample_type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample type",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            }
        },
        "facets": {
            "assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Publication data status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "files.replicate.experiment.target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "biosample_type": {
                "title": "Biosample type",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "files.replicate.experiment.target.label": {
                "title": "Target",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Species",
                "type": "array"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "assay_term_name": 1,
            "biosample_term_name": 1,
            "biosample_type": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "files.replicate.experiment.target.aliases": 1,
            "files.replicate.experiment.target.gene_name": 1,
            "files.replicate.experiment.target.label": 1,
            "files.replicate.experiment.target.dbxref": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Construct": {
        "title": "DNA construct",
        "description": "Schema for submitting an expression or targeting vector stably or transiently transfected.",
        "id": "/profiles/construct.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "construct_type",
            "target",
            "lab",
            "award",
            "source"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/product_id"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "dependencies": {
            "construct_type": {
                "oneOf": [
                    {
                        "required": [
                            "tags"
                        ],
                        "properties": {
                            "construct_type": {
                                "enum": [
                                    "fusion protein"
                                ]
                            },
                            "tags": {
                                "minItems": 1
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "construct_type": {
                                    "enum": [
                                        "fusion protein"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The originating lab or vendor.",
                "linkTo": "Source"
            },
            "product_id": {
                "description": "The product identifier provided by the originating lab or vendor.",
                "title": "Product ID",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "3",
                "title": "Schema Version",
                "type": "string"
            },
            "construct_type": {
                "enum": [
                    "fusion protein"
                ],
                "type": "string",
                "title": "Type",
                "description": "The type of sequence expressed from the construct."
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "title": "Field mapping index type",
                    "description": "Defines one of three types of indexing available",
                    "type": "string",
                    "default": "analyzed",
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ]
                },
                "type": "string",
                "title": "Description",
                "default": "",
                "description": "A plain text description of the construct. May include backbone name, description of the insert or purpose of the construct."
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the construct."
            },
            "target": {
                "linkTo": "Target",
                "type": "string",
                "comment": "See target.json for available identifiers.",
                "title": "Target",
                "description": "The name of the gene whose expression or product is modified by the construct."
            },
            "tags": {
                "items": {
                    "title": "Protein tag",
                    "description": "Recombinant tag in the construct.",
                    "comment": "Submit tag name and tag location.",
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                        "name",
                        "location"
                    ],
                    "properties": {
                        "name": {
                            "type": "string",
                            "enum": [
                                "eGFP",
                                "V5",
                                "HA",
                                "ER",
                                "3xFLAG",
                                "DsRed",
                                "TRE",
                                "T2A",
                                "YFP",
                                "FLAG",
                                "mCherry"
                            ]
                        },
                        "location": {
                            "type": "string",
                            "enum": [
                                "N-terminal",
                                "C-terminal",
                                "internal",
                                "other",
                                "unknown"
                            ]
                        }
                    }
                },
                "type": "array",
                "title": "Protein tags",
                "description": "Recombinant tags in the construct."
            },
            "vector_backbone_name": {
                "type": "string",
                "title": "Backbone name",
                "description": "The name of the vector backbone used for the construct."
            },
            "genomic_integration_site": {
                "properties": {
                    "assembly": {
                        "title": "Genome assembly",
                        "description": "The genome assembly to which the target coordinates relate. e.g. GRCh38 or dm6",
                        "type": "string",
                        "pattern": "^((GRCh\\d{2})|(GRCm\\d{2})|(WBcel\\d{3})|(ce\\d{2})|(dm\\d{1}))$"
                    },
                    "chromosome": {
                        "title": "Chromosome",
                        "description": "The number (or letter) designation for the target chromosome. e.g. 1, 2L, or X",
                        "type": "string",
                        "pattern": "^(\\d{1,2}[RL]?|[XYMU]|I|II|III|IV|V|)$"
                    },
                    "start": {
                        "title": "Start",
                        "description": "The starting coordinate.",
                        "type": "integer"
                    },
                    "end": {
                        "title": "End",
                        "description": "The ending coordinate (possibly equal to the starting coordinate for one base.)",
                        "type": "integer"
                    }
                },
                "type": "object",
                "title": "Integration site",
                "additionalProperties": false,
                "description": "Genomic coordinates where construct is integrated, if known."
            },
            "insert_sequence": {
                "type": "string",
                "title": "Insert Sequence",
                "pattern": "^[ACTG]+$",
                "description": "DNA sequence inserted into the vector backbone."
            },
            "insert_genome_coordinates": {
                "properties": {
                    "assembly": {
                        "title": "Genome assembly",
                        "description": "The genome assembly to which the target coordinates relate. e.g. GRCh38",
                        "type": "string",
                        "pattern": "^((GRCh\\d{2})|(GRCm\\d{2})|(WBcel\\d{3})|(ce\\d{2})|(dm\\d{1}))$"
                    },
                    "chromosome": {
                        "title": "Chromosome",
                        "description": "The number (or letter) designation for the target chromosome. e.g. 1, 2L, or X",
                        "type": "string",
                        "pattern": "^(\\d{1,2}[RL]?|[XYMU]|I|II|III|IV|V|)$"
                    },
                    "start": {
                        "title": "Start",
                        "description": "The starting coordinate.",
                        "type": "integer"
                    },
                    "end": {
                        "title": "End",
                        "description": "The ending coordinate (possibly equal to the starting coordinate for one base.)",
                        "type": "integer"
                    }
                },
                "type": "object",
                "title": "Insert genome coordinates",
                "additionalProperties": false,
                "description": "Genomic coordinates of the insert. e.g. GRCh38 or dm6."
            },
            "promoter_used": {
                "linkTo": "Target",
                "type": "string",
                "comment": "See target.json for available identifiers.",
                "title": "Promoter used in construct",
                "description": "The name of the gene that the promoter regulates natively."
            },
            "promoter_genome_coordinates": {
                "properties": {
                    "assembly": {
                        "title": "Genome assembly",
                        "description": "The GRC genome assembly to which the target coordinates relate. e.g. GRCh38",
                        "type": "string",
                        "pattern": "^((GRCh\\d{2})|(GRCm\\d{2})|(WBcel\\d{3})|(ce\\d{2})|(dm\\d{1}))$"
                    },
                    "chromosome": {
                        "title": "Chromosome",
                        "description": "The number (or letter) designation for the target chromosome. e.g. 1, 2L, or X",
                        "type": "string",
                        "pattern": "^(\\d{1,2}[RL]?|[XYMU]|I|II|III|IV|V|)$"
                    },
                    "start": {
                        "title": "Start",
                        "description": "The starting coordinate.",
                        "type": "integer"
                    },
                    "end": {
                        "title": "End",
                        "description": "The ending coordinate (possibly equal to the starting coordinate for one base.)",
                        "type": "integer"
                    }
                },
                "type": "object",
                "title": "Promoter genome coordinates",
                "additionalProperties": false,
                "description": "Genomic coordinates of the promoter. Use NCBI assembly version:chromosome number:nucleotide range (e.g. WBcel235:III:1433720-1434340)."
            },
            "promoter_position_relative_to_target": {
                "type": "string",
                "comment": "Distance in bp upstream of target gene TSS in the construct",
                "title": "Promoter position relative to target",
                "pattern": "^-[0-9]+$",
                "description": "Relative distance of promoter sequence in the construct upstream of the target gene TSS."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "characterizations": {
                "items": {
                    "linkTo": "ConstructCharacterization",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Characterizations",
                "type": "array"
            }
        },
        "boost_values": {
            "target.gene_name": 1,
            "target.label": 1,
            "target.aliases": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Lab": {
        "title": "Lab",
        "id": "/profiles/lab.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "name",
            "title"
        ],
        "identifyingProperties": [
            "uuid",
            "title",
            "name"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/shared_status"
            }
        ],
        "properties": {
            "status": {
                "enum": [
                    "current",
                    "deleted",
                    "replaced",
                    "disabled"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "3",
                "title": "Schema Version",
                "type": "string"
            },
            "name": {
                "uniqueKey": "lab:name",
                "type": "string",
                "title": "Name",
                "pattern": "^[a-z0-9\\-]+$",
                "description": "A short unique name for the lab, current convention is lower cased and hyphen delimited of PI's first and last name (e.g. john-doe)."
            },
            "title": {
                "uniqueKey": "lab:name",
                "type": "string",
                "title": "Title",
                "description": "A unique name for affiliation identification, current convention is comma separated PI's first & last name and institute label. (e.g. John Doe, UNI)."
            },
            "pi": {
                "linkTo": "User",
                "type": "string",
                "comment": "See user.json for available identifiers.",
                "title": "P.I.",
                "description": "Principle Investigator of the lab."
            },
            "awards": {
                "items": {
                    "title": "Grant",
                    "description": "A grant associated with the lab.",
                    "comment": "See award.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Award"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Grants",
                "description": "Grants associated with the lab.",
                "type": "array"
            },
            "institute_label": {
                "type": "string",
                "title": "Institute label",
                "default": "",
                "description": "An abbreviation for the institute the lab is associated with."
            },
            "institute_name": {
                "type": "string",
                "title": "Institute",
                "default": "",
                "description": "The name for the institute the lab is associated with."
            },
            "address1": {
                "default": "",
                "title": "Address line 1",
                "type": "string"
            },
            "address2": {
                "title": "Address line 2",
                "type": "string"
            },
            "city": {
                "default": "",
                "title": "City",
                "type": "string"
            },
            "state": {
                "default": "",
                "title": "State/Province/Region",
                "type": "string"
            },
            "country": {
                "default": "",
                "title": "Country",
                "type": "string"
            },
            "postal_code": {
                "format": "postal-code",
                "default": "",
                "title": "ZIP/Postal code",
                "type": "string"
            },
            "fax": {
                "format": "phone",
                "type": "string",
                "title": "Fax number",
                "default": "",
                "description": "A fax number for the lab (with country code)."
            },
            "phone1": {
                "format": "phone",
                "type": "string",
                "title": "Primary phone number",
                "default": "",
                "description": "The lab's primary phone number (with country code)."
            },
            "phone2": {
                "format": "phone",
                "type": "string",
                "title": "Alternate phone number",
                "default": "",
                "description": "The lab's alternative phone number (with country code)."
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the lab."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "pi": 1,
            "name": 1,
            "awards.title": 1,
            "institute_name": 1,
            "institute_label": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Organism": {
        "title": "Organism",
        "id": "/profiles/organism.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "name",
            "taxon_id"
        ],
        "identifyingProperties": [
            "uuid",
            "name",
            "taxon_id",
            "scientific_name"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/shared_status"
            }
        ],
        "properties": {
            "status": {
                "enum": [
                    "current",
                    "deleted",
                    "replaced",
                    "disabled"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "2",
                "title": "Schema Version",
                "type": "string"
            },
            "name": {
                "uniqueKey": true,
                "type": "string",
                "title": "Common name",
                "pattern": "^[a-z0-9\\-]+$",
                "description": "A short unique name for the organism (e.g. 'mouse' or 'human')."
            },
            "scientific_name": {
                "type": "string",
                "title": "Binomial name",
                "default": "",
                "description": "The genus species for the organism (e.g. 'Mus musculus')."
            },
            "taxon_id": {
                "type": "string",
                "title": "Taxon ID",
                "pattern": "^[0-9]+$",
                "description": "The NCBI taxon ID for the organism (e.g. 10090)."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "name": 1,
            "scientific_name": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Publication": {
        "title": "Publication",
        "description": "Schema for a publication page.",
        "id": "/profiles/publication.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "title",
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "title"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/attribution"
            }
        ],
        "properties": {
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "3",
                "title": "Schema Version",
                "type": "string"
            },
            "title": {
                "type": "string",
                "uniqueKey": true,
                "title": "Title",
                "description": "Title of the publication or communication."
            },
            "abstract": {
                "type": "string",
                "title": "Abstract",
                "rdfs:subPropertyOf": "dc:abstract",
                "description": "Abstract of the publication or communication."
            },
            "authors": {
                "title": "Authors",
                "type": "string"
            },
            "date_published": {
                "title": "Date published",
                "type": "string"
            },
            "date_revised": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "title": "Date revised",
                "type": "string"
            },
            "issue": {
                "type": "string",
                "title": "Issue",
                "description": "The issue of the publication."
            },
            "page": {
                "type": "string",
                "title": "Page",
                "description": "Pagination of the reference"
            },
            "volume": {
                "type": "string",
                "title": "Volume",
                "description": "The volume of the publication."
            },
            "journal": {
                "type": "string",
                "title": "Journal",
                "description": "The journal of the publication."
            },
            "status": {
                "enum": [
                    "planned",
                    "in preparation",
                    "submitted",
                    "in revision",
                    "in press",
                    "published",
                    "deleted",
                    "replaced"
                ],
                "default": "in preparation",
                "title": "Status",
                "type": "string"
            },
            "identifiers": {
                "items": {
                    "title": "Identifier",
                    "description": "An identifier that references data found in the object.",
                    "type": "string",
                    "uniqueKey": "publication:identifier",
                    "pattern": "^(PMID:[0-9]+|doi:10\\.[0-9]{4}[\\d\\s\\S\\:\\.\\/]+|PMCID:PMC[0-9]+|[0-9]{4}\\.[0-9]{4})$"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Identifiers",
                "description": "The identifiers that reference data found in the object."
            },
            "datasets": {
                "items": {
                    "title": "Datasets",
                    "description": "A datasets referred to by the publication.",
                    "comment": "See dataset.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Dataset"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Dataset",
                "description": "The datasets referred to by the publication."
            },
            "supplementary_data": {
                "items": {
                    "title": "Supplementary data details",
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "url": {
                            "title": "URL",
                            "description": "External resources with additional information or supplemental files associated with the publication.",
                            "type": "string",
                            "format": "uri"
                        },
                        "file_format": {
                            "title": "File format",
                            "description": "Description of the file format of files downloaded from the URL.",
                            "type": "string",
                            "enum": [
                                "BED",
                                "TSV",
                                "GTF",
                                "VCF",
                                "text",
                                "other format"
                            ]
                        },
                        "supplementary_data_type": {
                            "title": "Supplementary data type",
                            "description": "The type of supplementary data reader should expect.",
                            "type": "string",
                            "enum": [
                                "peak calls",
                                "enhancer annotations",
                                "RNA annotations",
                                "promoter regions",
                                "HMM regions",
                                "HOT regions",
                                "website",
                                "motifs",
                                "genomic annotations",
                                "connectivity"
                            ]
                        },
                        "data_summary": {
                            "title": "Method summary",
                            "description": "An explanation how the methods or results presented in the publication advance the understanding of how regions on the genome interact with each other.",
                            "type": "string"
                        }
                    }
                },
                "type": "array",
                "title": "Supplementary_data",
                "default": [],
                "description": "Description of data found in the publication."
            },
            "categories": {
                "items": {
                    "title": "Category",
                    "type": "string",
                    "enum": [
                        "human disease",
                        "basic biology",
                        "software tool",
                        "database",
                        "integrative analysis",
                        "technology development",
                        "data standard",
                        "key publication",
                        "pilot phase publication",
                        "model organism biology",
                        "tutorial",
                        "genomic annotations",
                        "production"
                    ]
                },
                "uniqueItems": true,
                "title": "Categories",
                "type": "array"
            },
            "published_by": {
                "items": {
                    "title": "Published by",
                    "type": "string",
                    "enum": [
                        "ENCODE",
                        "mouseENCODE",
                        "modENCODE",
                        "Roadmap",
                        "community"
                    ]
                },
                "uniqueItems": true,
                "default": [
                    "ENCODE"
                ],
                "title": "Published by",
                "type": "array"
            },
            "data_used": {
                "title": "Data used",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "publication_year": {
                "calculatedProperty": true,
                "title": "Publication year",
                "type": "string"
            }
        },
        "facets": {
            "status": {
                "title": "Publication status"
            },
            "categories": {
                "title": "Category"
            },
            "supplementary_data.supplementary_data_type": {
                "title": "Available supplemental data"
            },
            "publication_year": {
                "title": "Publication year"
            },
            "journal": {
                "title": "Journal"
            },
            "published_by": {
                "title": "Published by"
            }
        },
        "columns": {
            "title": {
                "title": "Title"
            },
            "date_published": {
                "title": "Publication date"
            },
            "authors": {
                "title": "Authors"
            },
            "status": {
                "title": "Publication status"
            },
            "journal": {
                "title": "Journal"
            },
            "volume": {
                "title": "Volume"
            },
            "issue": {
                "title": "Issue"
            },
            "page": {
                "title": "Page"
            },
            "data_used": {
                "title": "Data used"
            },
            "abstract": {
                "title": "Abstract"
            },
            "supplementary_data.supplementary_data_type": {
                "title": "Available data"
            },
            "supplementary_data.file_format": {
                "title": "File format"
            },
            "supplementary_data.url": {
                "title": "URL"
            },
            "supplementary_data.data_summary": {
                "title": "Data summary"
            },
            "identifiers": {
                "title": "identifiers"
            }
        },
        "boost_values": {
            "title": 1,
            "authors": 1,
            "identifiers": 1,
            "abstract": 1
        },
        "sort_by": {
            "publication_year": {
                "ignore_unmapped": true,
                "order": "desc",
                "missing": "_last"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Project": {
        "title": "Project",
        "description": "Schema for submitting metadata for a project.",
        "id": "/profiles/project.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "file_set.json#/properties"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_files": {
                "items": {
                    "linkTo": "File",
                    "comment": "See file.json for available identifiers.",
                    "title": "Data file",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional data files",
                "description": "List of data files to be associated with the dataset."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "project_type": {
                "enum": [
                    "evaluation",
                    "validation"
                ],
                "type": "string",
                "title": "Type",
                "description": "The category that best describes the project."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "biosample_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term id",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "biosample_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term name",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "biosample_type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample type",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            }
        },
        "facets": {
            "project_type": {
                "title": "Project type",
                "type": "string"
            },
            "assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Project status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "files.replicate.experiment.target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "biosample_type": {
                "title": "Biosample type",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "files.analysis_step_version.analysis_step.pipelines.title": {
                "title": "Pipeline",
                "type": "string"
            },
            "files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "files.replicate.experiment.target.label": {
                "title": "Target",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Species",
                "type": "array"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "assay_term_name": 1,
            "biosample_term_name": 1,
            "biosample_type": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "files.replicate.experiment.target.aliases": 1,
            "files.replicate.experiment.target.gene_name": 1,
            "files.replicate.experiment.target.label": 1,
            "files.replicate.experiment.target.dbxref": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "project_type": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "HumanDonor": {
        "title": "Human donor",
        "description": "Schema for submitting a human donor.",
        "id": "/profiles/human_donor.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "organism"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "donor.json#/properties"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/accessioned_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "dependencies": {
            "age_units": {
                "required": [
                    "age"
                ],
                "not": {
                    "properties": {
                        "age": {
                            "enum": [
                                "unknown"
                            ]
                        }
                    }
                }
            },
            "age": {
                "oneOf": [
                    {
                        "properties": {
                            "age": {
                                "enum": [
                                    "unknown"
                                ]
                            }
                        }
                    },
                    {
                        "required": [
                            "age_units"
                        ],
                        "properties": {
                            "age_units": {
                                "enum": [
                                    "year"
                                ]
                            },
                            "age": {
                                "pattern": "^(([1-8]?\\d)|(90 or above))$"
                            }
                        }
                    },
                    {
                        "required": [
                            "age_units"
                        ],
                        "properties": {
                            "age_units": {
                                "enum": [
                                    "day",
                                    "week",
                                    "month"
                                ]
                            },
                            "age": {
                                "pattern": "^(\\d+(\\.[1-9])?(\\-\\d+(\\.[1-9])?)?)$"
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released",
                    "revoked",
                    "preliminary",
                    "proposed"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "DO",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "url": {
                "format": "uri",
                "description": "An external resource with additional information about the donor.",
                "title": "URL",
                "type": "string"
            },
            "organism": {
                "comment": "Do not submit, value is assigned by the object.",
                "linkEnum": [
                    "7745b647-ff15-4ff3-9ced-b897d4e2983c"
                ],
                "linkTo": "Organism",
                "description": "Organism of the donor.",
                "title": "Organism",
                "default": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "6",
                "hidden comment": "Bump the default in the subclasses."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "ethnicity": {
                "title": "Ethnicity",
                "type": "string"
            },
            "age": {
                "type": "string",
                "title": "Donor age",
                "pattern": "^((\\d+(\\.[1-9])?(\\-\\d+(\\.[1-9])?)?)|(unknown)|([1-8]?\\d)|(90 or above))$",
                "description": " The age or age range of the donor when biological material was sampled."
            },
            "age_units": {
                "enum": [
                    "day",
                    "week",
                    "month",
                    "year"
                ],
                "title": "Donor age units",
                "type": "string"
            },
            "health_status": {
                "title": "Donor health status",
                "type": "string"
            },
            "life_stage": {
                "enum": [
                    "fetal",
                    "newborn",
                    "child",
                    "adult",
                    "unknown",
                    "embryonic",
                    "postnatal"
                ],
                "title": "Life stage",
                "type": "string"
            },
            "sex": {
                "enum": [
                    "male",
                    "female",
                    "unknown",
                    "mixed"
                ],
                "default": "unknown",
                "title": "Sex",
                "type": "string"
            },
            "parents": {
                "items": {
                    "title": "Parent",
                    "description": "A donor ID of a biological parent, if known.",
                    "comment": "For human biosamples, see human_donor.json for available identifiers. For mouse biosamples, see mouse_donor.json for available identifiers.",
                    "type": "string",
                    "linkTo": "HumanDonor"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Parents",
                "description": "Donor IDs of biological parents, if known.",
                "type": "array"
            },
            "children": {
                "items": {
                    "title": "Child",
                    "description": "A donor that genetic material was supplied to.",
                    "comment": "For human biosamples, see human_donor.json for available identifiers. For mouse biosamples, see mouse_donor.json for available identifiers.",
                    "type": "string",
                    "linkTo": "HumanDonor"
                },
                "XXXnote": "Can be removed since we have parents.",
                "uniqueItems": true,
                "default": [],
                "title": "Children",
                "description": "Donors that genetic material was supplied to.",
                "type": "array"
            },
            "siblings": {
                "items": {
                    "title": "Sibling",
                    "description": "A donors that has at least one parent in common.",
                    "comment": "For human biosamples, see human_donor.json for available identifiers. For mouse biosamples, see mouse_donor.json for available identifiers.",
                    "type": "string",
                    "linkTo": "HumanDonor"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Siblings",
                "description": "Donors that have at least one parent in common.",
                "type": "array"
            },
            "fraternal_twin": {
                "linkTo": "HumanDonor",
                "comment": "For human biosamples, see human_donor.json for available identifiers. For mouse biosamples, see mouse_donor.json for available identifiers.",
                "title": "Fraternal twin",
                "type": "string"
            },
            "identical_twin": {
                "linkTo": "HumanDonor",
                "type": "string",
                "comment": "For human biosamples, see human_donor.json for available identifiers. For mouse biosamples, see mouse_donor.json for available identifiers.",
                "title": "Identical twin",
                "description": "A donor that have identical genetic material."
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^((PGP:hu[\\S\\s\\d]+)|(GTEx:[a-zA-Z0-9\\-_]+)|(GEO:SAMN\\d+))$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "characterizations": {
                "items": {
                    "linkFrom": "DonorCharacterization.characterizes",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Characterizations",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Document": {
        "title": "Document",
        "description": "Schema for submitting a document file.",
        "id": "/profiles/document.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "document_type",
            "lab",
            "award"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/attachment"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "facets": {
            "lab.title": {
                "title": "Lab"
            },
            "status": {
                "title": "Status"
            },
            "document_type": {
                "title": "Document type"
            }
        },
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "enum": [
                            "application/msword",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "application/pdf",
                            "application/zip",
                            "text/plain",
                            "text/tab-separated-values",
                            "image/jpeg",
                            "image/tiff",
                            "image/gif",
                            "text/html",
                            "image/png",
                            "image/svs",
                            "text/autosql"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "Document file metadata",
                "type": "object"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "5",
                "title": "Schema Version",
                "type": "string"
            },
            "document_type": {
                "enum": [
                    "growth protocol",
                    "extraction protocol",
                    "certificate of analysis",
                    "data QA",
                    "differentiation protocol",
                    "dedifferentiation protocol",
                    "data sheet",
                    "treatment protocol",
                    "general protocol",
                    "excision protocol",
                    "transfection protocol",
                    "construct image",
                    "cell isolation protocol",
                    "iPS reprogramming protocol",
                    "standards document",
                    "strain generation protocol",
                    "spike-in concentrations",
                    "pipeline protocol",
                    "file format specification",
                    "high resolution pathology slide image",
                    "other"
                ],
                "type": "string",
                "title": "Type",
                "description": "The category that best describes the document."
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "title": "Field mapping index type",
                    "description": "Defines one of three types of indexing available",
                    "type": "string",
                    "default": "analyzed",
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ]
                },
                "type": "string",
                "title": "Description",
                "default": "",
                "description": "A plain text description of the document."
            },
            "urls": {
                "items": {
                    "title": "URL",
                    "description": "An external resource with additional information to the document.",
                    "type": "string",
                    "format": "uri"
                },
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "default": [],
                "title": "URLs",
                "description": "External resources with additional information to the document.",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "description": 1,
            "document_type": 1,
            "award.title": 1,
            "award.pi": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "ReplicationTimingSeries": {
        "title": "Replication timing series",
        "description": "Schema for submitting metadata for a replication timing series.",
        "id": "/profiles/replication_timing_series.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "series.json#/properties"
            },
            {
                "$ref": "mixins.json#/submitter_comment"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "submitter_comment": {
                "description": "Additional information specified by the submitter to be displayed as a comment on the portal.",
                "title": "Submitter comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_datasets": {
                "items": {
                    "linkTo": "Experiment",
                    "comment": "See dataset.json for available identifiers.",
                    "title": "Dataset",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional datasets",
                "description": "List of datasets to be associated with the series."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "target": {
                "items": {
                    "linkTo": "Target",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Target",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "biosample_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term id",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "treatment_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Treatment term name",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "biosample_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term name",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "biosample_type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample type",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            },
            "revoked_datasets": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked datasets",
                "type": "array"
            }
        },
        "facets": {
            "related_datasets.assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Series status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "biosample_type": {
                "title": "Biosample type",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Biosample treatment",
                "type": "string"
            },
            "related_datasets.files.analysis_step_version.analysis_step.pipelines.title": {
                "title": "Pipeline",
                "type": "string"
            },
            "related_datasets.files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "related_datsets.files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "related_datasets.files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "related_datasets.replicates.library.size_range": {
                "title": "Library insert size (nt)",
                "type": "string"
            },
            "related_datasets.replicates.library.nucleic_acid_term_name": {
                "title": "Library made from",
                "type": "string"
            },
            "related_datasets.replicates.library.depleted_in_term_name": {
                "title": "Library depleted in",
                "type": "string"
            },
            "related_datasets.replicates.library.treatments.treatment_term_name": {
                "title": "Library treatment",
                "type": "array"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "related_datasets.assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "related_datasets.target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Description",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism scientific name",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.replicates.antibody.accession": {
                "title": "Linked Antibody",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.organism.scientific_name": {
                "title": "Species",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.age_display": {
                "title": "Age display",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Treatment",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_id": {
                "title": "Term ID",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration": {
                "title": "Concentration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration_units": {
                "title": "Concentration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.duration": {
                "title": "Duration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.duration_units": {
                "title": "Duration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.synchronization": {
                "title": "Synchronization",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time": {
                "title": "Post-synchronization time",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time_units": {
                "title": "Post-synchronization time units",
                "type": "string"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "related_datasets.assay_term_name": 1,
            "related_datasets.assay_term_id": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "related_datasets.biosample_term_id": 1,
            "related_datasets.biosample_term_name": 1,
            "related_datasets.biosample_type": 1,
            "related_datasets.organ_slims": 1,
            "related_datasets.developmental_slims": 1,
            "related_datasets.assay_synonyms": 1,
            "related_datasets.biosample_synonyms": 1,
            "files.accession": 1,
            "files.alternate_accessions": 1,
            "files.file_format": 1,
            "files.output_type": 1,
            "files.md5sum": 1,
            "related_datasets.replicates.library.accession": 1,
            "related_datasets.replicates.library.alternate_accessions": 1,
            "related_datasets.replicates.library.aliases": 1,
            "related_datasets.replicates.library.biosample.accession": 1,
            "related_datasets.replicates.library.biosample.alternate_accessions": 1,
            "related_datasets.replicates.library.biosample.aliases": 1,
            "related_datasets.replicates.library.biosample.subcellular_fraction_term_name": 1,
            "related_datasets.replicates.library.biosample.donor.accession": 1,
            "related_datasets.replicates.library.biosample.donor.alternate_accessions": 1,
            "related_datasets.replicates.antibody.accession": 1,
            "related_datasets.replicates.antibody.alternate_accessions": 1,
            "related_datasets.replicates.antibody.lot_id": 1,
            "related_datasets.replicates.antibody.lot_id_alias": 1,
            "related_datasets.replicates.antibody.clonality": 1,
            "related_datasets.replicates.antibody.isotype": 1,
            "related_datasets.replicates.antibody.purifications": 1,
            "related_datasets.replicates.antibody.product_id": 1,
            "related_datasets.replicates.antibody.aliases": 1,
            "related_datasets.replicates.antibody.dbxrefs": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "related_datasets.possible_controls.accession": 1,
            "related_datasets.possible_controls.alternate_accessions": 1,
            "target.aliases": 1,
            "target.gene_name": 1,
            "target.label": 1,
            "target.dbxref": 1,
            "target.organism.name": 1,
            "target.organism.scientific_name": 1,
            "references.title": 1,
            "related_datasets.replicates.library.biosample.rnais.product_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "BigwigcorrelateQualityMetric": {
        "description": "Schema for reporting the 'bigWigCorrelate' output as a quality metric",
        "id": "/profiles/bigwigcorrelate_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "Pearson's correlation": {
                "description": "Pearson's correlation",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "SoftwareVersion": {
        "title": "Software version",
        "description": "Schema for submitting version of software.",
        "id": "/profiles/software_version.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "software"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/submitted"
            }
        ],
        "properties": {
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "2",
                "title": "Schema Version",
                "type": "string"
            },
            "software": {
                "linkTo": "Software",
                "type": "string",
                "comment": "See software.json for available identifiers.",
                "title": "Software",
                "description": "Unique name of the software package."
            },
            "version": {
                "type": "string",
                "comment": "The version string when version option is used on the software.",
                "title": "Version",
                "description": "The version of a particular software."
            },
            "download_checksum": {
                "type": "string",
                "format": "hex",
                "comment": "Prefer SHA-1 of commit id if available, otherwise use md5sum of downloaded software,",
                "title": "Download checksum",
                "description": "The checksum of the particular version of software used."
            },
            "downloaded_url": {
                "format": "uri",
                "type": "string",
                "title": "Download URL",
                "description": "An external resource to track version for the software downloaded."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Award": {
        "title": "Grant",
        "id": "/profiles/award.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "required": [
            "name",
            "project",
            "rfa"
        ],
        "identifyingProperties": [
            "uuid",
            "name",
            "title"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/shared_status"
            }
        ],
        "type": "object",
        "properties": {
            "status": {
                "enum": [
                    "current",
                    "deleted",
                    "replaced",
                    "disabled"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "2",
                "title": "Schema Version",
                "type": "string"
            },
            "title": {
                "type": "string",
                "title": "Name",
                "rdfs:subPropertyOf": "dc:title",
                "description": "The grant name from the NIH database, if applicable."
            },
            "name": {
                "uniqueKey": true,
                "type": "string",
                "title": "Number",
                "pattern": "^[A-Za-z0-9\\-]+$",
                "description": "The official grant number from the NIH database, if applicable"
            },
            "description": {
                "title": "Description",
                "rdfs:subPropertyOf": "dc:description",
                "type": "string"
            },
            "start_date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "comment": "Date can be submitted as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Start date",
                "type": "string"
            },
            "end_date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "comment": "Date can be submitted as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "End date",
                "type": "string"
            },
            "url": {
                "format": "uri",
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "description": "An external resource with additional information about the grant.",
                "title": "URL",
                "type": "string"
            },
            "pi": {
                "linkTo": "User",
                "type": "string",
                "comment": "See user.json for available identifiers.",
                "title": "P.I.",
                "description": "Principle Investigator of the grant."
            },
            "rfa": {
                "enum": [
                    "ENCODE",
                    "ENCODE2",
                    "ENCODE2-Mouse",
                    "ENCODE3",
                    "GGR",
                    "Roadmap",
                    "modENCODE",
                    "modERN"
                ],
                "type": "string",
                "title": "Phase",
                "description": "The name of the bioproject phase."
            },
            "project": {
                "enum": [
                    "ENCODE",
                    "GGR",
                    "Roadmap",
                    "modENCODE",
                    "modERN"
                ],
                "type": "string",
                "title": "BioProject",
                "description": "The collection of biological data related to a single initiative, originating from a consortium."
            },
            "viewing_group": {
                "enum": [
                    "ENCODE",
                    "GGR",
                    "REMC"
                ],
                "type": "string",
                "title": "View access group",
                "description": "The group that determines which set of data the user has permission to view."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "name": 1,
            "title": 1,
            "project": 1,
            "pi.title": 1
        },
        "changelog": "/profiles/changelogs/award.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "Library": {
        "title": "Library",
        "description": "Schema for submitting a molecular library.",
        "id": "/profiles/library.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "nucleic_acid_term_id"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/accessioned_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/product_id"
            },
            {
                "$ref": "mixins.json#/lot_id"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "facets": {
            "status": {
                "title": "Library status"
            }
        },
        "dependencies": {
            "nucleic_acid_term_id": [
                "nucleic_acid_term_name"
            ],
            "nucleic_acid_term_name": [
                "nucleic_acid_term_id"
            ],
            "nucleic_acid_starting_quantity_units": [
                "nucleic_acid_starting_quantity"
            ],
            "nucleic_acid_starting_quantity": [
                "nucleic_acid_starting_quantity_units"
            ],
            "depleted_in_term_name": [
                "depleted_in_term_id"
            ],
            "depleted_in_term_id": [
                "depleted_in_term_name"
            ],
            "product_id": [
                "source"
            ],
            "lot_id": [
                "source",
                "product_id"
            ]
        },
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "lot_id": {
                "description": "The lot identifier provided by the vendor, for nucleic acids or proteins purchased directly from a vendor (e.g. total RNA).",
                "title": "Lot ID",
                "type": "string"
            },
            "product_id": {
                "description": "The product identifier provided by the vendor, for nucleic acids or proteins purchased directly from a vendor (e.g. total RNA).",
                "title": "Product ID",
                "type": "string"
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The vendor, for nucleic acids or proteins purchased directly from a vendor (e.g. total RNA).",
                "linkTo": "Source"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released",
                    "revoked"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "LB",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "5",
                "title": "Schema Version",
                "type": "string"
            },
            "spikeins_used": {
                "items": {
                    "title": "A spike-ins dataset.",
                    "description": "A specific spike-ins type dataset",
                    "comment": "See dataset.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Reference"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Spike-ins datasets used",
                "description": "The datasets containing the fasta and the concentrations of the library spike-ins.",
                "type": "array"
            },
            "biosample": {
                "linkTo": "Biosample",
                "type": "string",
                "comment": "See biosample.json for available identifiers.",
                "title": "Biosample",
                "description": "The biosample that nucleic acid was isolated from to generate the library."
            },
            "nucleic_acid_term_name": {
                "enum": [
                    "DNA",
                    "RNA",
                    "polyadenylated mRNA",
                    "miRNA",
                    "protein"
                ],
                "type": "string",
                "title": "Molecule term",
                "description": "SO (Sequence Ontology) term best matching the molecule isolated to generate the library (e.g. 'RNA' for a total RNA library, even if that library is subsequently reverse transcribed for DNA sequencing.)"
            },
            "nucleic_acid_term_id": {
                "enum": [
                    "SO:0000352",
                    "SO:0000356",
                    "SO:0000871",
                    "SO:0000276",
                    "SO:0000104"
                ],
                "comment": "Based on the choice in nucleic_acid_term_name use the following guide: DNA - SO:0000352, RNA - SO:0000356,  polyadenylated mRNA - SO:0000871, miRNA - SO:0000276 or protein - SO:0000104",
                "@type": "@id",
                "description": "SO (Sequence Ontology) identifier best matching the nucleic acid isolated to generate the library",
                "title": "Molecule ID",
                "type": "string"
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^GEO:GSM\\d+$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "nucleic_acid_starting_quantity": {
                "type": "string",
                "title": "Nucleic acid starting quantity",
                "pattern": "[0-9]+",
                "description": "The starting amount of nucleic acid before selection and purification."
            },
            "nucleic_acid_starting_quantity_units": {
                "enum": [
                    "cells",
                    "cell-equivalent",
                    "µg",
                    "ng",
                    "pg",
                    "mg"
                ],
                "type": "string",
                "title": "Nucleic acid starting quantity units",
                "description": "The units used for starting amount of nucleic acid."
            },
            "extraction_method": {
                "XXXenum": [
                    "miRNeasy Mini kit (QIAGEN cat#:217004)",
                    "Trizol (LifeTech cat#: 15596-018)",
                    "Ambion mirVana",
                    "Qiagen #74204",
                    "QIAGEN DNeasy Blood & Tissue Kit",
                    "see document",
                    "n/a"
                ],
                "type": "string",
                "title": "Extraction method",
                "format": "semi-controlled",
                "description": "A short description or reference of the nucleic acid extraction protocol used in library preparation, if applicable."
            },
            "fragmentation_method": {
                "enum": [
                    "chemical (generic)",
                    "chemical (DNaseI)",
                    "chemical (RNase III)",
                    "chemical (HindIII/DpnII restriction)",
                    "chemical (Tn5 transposase)",
                    "chemical (micrococcal nuclease)",
                    "chemical (Illumina TruSeq)",
                    "chemical (Nextera tagmentation)",
                    "shearing (generic)",
                    "shearing (Covaris generic)",
                    "shearing (Covaris S2)",
                    "sonication (generic)",
                    "sonication (Bioruptor generic)",
                    "sonication (Bioruptor Pico)",
                    "sonication (Bioruptor Plus)",
                    "sonication (Bioruptor Twin)",
                    "sonication (generic microtip)",
                    "sonication (Branson Sonifier 450)",
                    "shearing (Covaris LE Series)",
                    "see document",
                    "none",
                    "n/a"
                ],
                "type": "string",
                "title": "Fragmentation method",
                "description": "A short description or reference of the nucleic acid fragmentation protocol used in library preparation, if applicable."
            },
            "fragmentation_date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "type": "string",
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Fragmentation date",
                "description": "The date that the nucleic acid was fragmented."
            },
            "library_size_selection_method": {
                "XXXenum": [
                    "gel",
                    "see document",
                    "SPRI beads"
                ],
                "type": "string",
                "title": "Size selection method",
                "format": "semi-controlled",
                "description": "A short description or reference of the size selection protocol used in library preparation, if applicable."
            },
            "lysis_method": {
                "XXXenum": [
                    "miRNeasy Mini kit (QIAGEN cat#:217004)",
                    "Trizol (LifeTech cat#: 15596-018)",
                    "Ambion mirVana",
                    "Qiagen #74204",
                    "QIAGEN DNeasy Blood & Tissue Kit",
                    "see document",
                    "n/a"
                ],
                "type": "string",
                "title": "Lysis method",
                "format": "semi-controlled",
                "description": "A short description or reference of the cell lysis protocol used in library preparation, if applicable"
            },
            "crosslinking_method": {
                "enum": [
                    "formaldehyde",
                    "ultraviolet irradiation"
                ],
                "type": "string",
                "title": "Crosslinking method",
                "description": "A short description or reference of the crosslinking protocol used in library preparation, if applicable."
            },
            "size_range": {
                "type": "string",
                "title": "Size range",
                "pattern": "(^[0-9]+-[0-9]+$|^[<>][0-9]+$)",
                "description": "The measured size range of the purified nucleic acid, in bp."
            },
            "strand_specificity": {
                "type": "boolean",
                "title": "Strand specificity",
                "default": false,
                "description": "The preparation of the library using a strand-specific protocol."
            },
            "treatments": {
                "items": {
                    "title": "Treatment",
                    "comment": "See treatment.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Treatment"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Treatments",
                "type": "array"
            },
            "depleted_in_term_name": {
                "items": {
                    "type": "string",
                    "enum": [
                        "rRNA",
                        "polyadenylated mRNA",
                        "capped mRNA"
                    ]
                },
                "description": "SO (Sequence Ontology) term best matching the nucleic acid that was diminished from the library.",
                "title": "Depleted in term",
                "default": [],
                "type": "array"
            },
            "depleted_in_term_id": {
                "items": {
                    "type": "string",
                    "enum": [
                        "SO:0000252",
                        "SO:0000871",
                        "SO:0000862"
                    ]
                },
                "comment": "Based on the choice in depleted_in_term_name use the following guide: rRNA - SO:0000252,  polyadenylated mRNA - SO:0000871 or capped mRNA - SO:0000862",
                "@type": "@id",
                "type": "array",
                "title": "Depleted in ID",
                "default": [],
                "description": "SO (Sequence Ontology) identifier best matching the nucleic acid that was diminished from the library."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession"
            },
            "award": {
                "title": "Award"
            },
            "lab": {
                "title": "Lab"
            },
            "biosample.biosample_term_name": {
                "title": "Biosample"
            },
            "biosample.organism.name": {
                "title": "Species"
            },
            "nucleic_acid_term_name": {
                "title": "Nucleic Acid Term Name"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "aliases": 1,
            "biosample.accession": 1,
            "biosample.alternate_accessions": 1,
            "biosample.aliases": 1,
            "biosample.donor.accession": 1,
            "biosample.donor.organism.name": 1
        },
        "changelog": "/profiles/changelogs/library.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "User": {
        "title": "User",
        "id": "/profiles/user.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "email",
            "first_name",
            "last_name"
        ],
        "identifyingProperties": [
            "uuid",
            "email"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/shared_status"
            }
        ],
        "properties": {
            "status": {
                "enum": [
                    "current",
                    "deleted",
                    "replaced",
                    "disabled"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "3",
                "title": "Schema Version",
                "type": "string"
            },
            "email": {
                "format": "email",
                "uniqueKey": true,
                "title": "Email",
                "type": "string"
            },
            "first_name": {
                "type": "string",
                "title": "First name",
                "description": "The user's first (given) name."
            },
            "last_name": {
                "type": "string",
                "title": "Last name",
                "description": "The user's last (family) name."
            },
            "lab": {
                "permission": "import-items",
                "comment": "See lab.json for available identifiers.",
                "linkTo": "Lab",
                "description": "Lab user is primarily associated with.",
                "title": "Affiliation",
                "type": "string"
            },
            "submits_for": {
                "items": {
                    "description": "A lab user is authorized to submit for.",
                    "comment": "See lab.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Lab"
                },
                "permission": "import-items",
                "uniqueItems": true,
                "default": [],
                "title": "Submits for",
                "description": "Labs user is authorized to submit data for.",
                "type": "array"
            },
            "groups": {
                "items": {
                    "type": "string"
                },
                "permission": "import-items",
                "uniqueItems": true,
                "default": [],
                "title": "Groups",
                "description": "Additional access control groups",
                "type": "array"
            },
            "viewing_groups": {
                "items": {
                    "type": "string",
                    "enum": [
                        "ENCODE",
                        "GGR",
                        "REMC"
                    ]
                },
                "permission": "import-items",
                "uniqueItems": true,
                "description": "The group that determines which set of data the user has permission to view.",
                "title": "View access group",
                "type": "array"
            },
            "job_title": {
                "title": "Job title",
                "type": "string"
            },
            "phone1": {
                "format": "phone",
                "type": "string",
                "title": "Primary phone number",
                "description": "The user's primary phone number (with country code)."
            },
            "phone2": {
                "format": "phone",
                "type": "string",
                "title": "Alternate phone number",
                "description": "The user's secondary phone number (with country code)."
            },
            "fax": {
                "format": "phone",
                "type": "string",
                "title": "Fax number",
                "description": "A FAX number for the user (with country code)."
            },
            "skype": {
                "title": "Skype ID",
                "type": "string"
            },
            "google": {
                "title": "Google ID",
                "type": "string"
            },
            "timezone": {
                "enum": [
                    "Africa/Abidjan",
                    "Africa/Accra",
                    "Africa/Addis_Ababa",
                    "Africa/Algiers",
                    "Africa/Asmara",
                    "Africa/Bamako",
                    "Africa/Bangui",
                    "Africa/Banjul",
                    "Africa/Bissau",
                    "Africa/Blantyre",
                    "Africa/Brazzaville",
                    "Africa/Bujumbura",
                    "Africa/Cairo",
                    "Africa/Casablanca",
                    "Africa/Ceuta",
                    "Africa/Conakry",
                    "Africa/Dakar",
                    "Africa/Dar_es_Salaam",
                    "Africa/Djibouti",
                    "Africa/Douala",
                    "Africa/El_Aaiun",
                    "Africa/Freetown",
                    "Africa/Gaborone",
                    "Africa/Harare",
                    "Africa/Johannesburg",
                    "Africa/Juba",
                    "Africa/Kampala",
                    "Africa/Khartoum",
                    "Africa/Kigali",
                    "Africa/Kinshasa",
                    "Africa/Lagos",
                    "Africa/Libreville",
                    "Africa/Lome",
                    "Africa/Luanda",
                    "Africa/Lubumbashi",
                    "Africa/Lusaka",
                    "Africa/Malabo",
                    "Africa/Maputo",
                    "Africa/Maseru",
                    "Africa/Mbabane",
                    "Africa/Mogadishu",
                    "Africa/Monrovia",
                    "Africa/Nairobi",
                    "Africa/Ndjamena",
                    "Africa/Niamey",
                    "Africa/Nouakchott",
                    "Africa/Ouagadougou",
                    "Africa/Porto-Novo",
                    "Africa/Sao_Tome",
                    "Africa/Tripoli",
                    "Africa/Tunis",
                    "Africa/Windhoek",
                    "America/Adak",
                    "America/Anchorage",
                    "America/Anguilla",
                    "America/Antigua",
                    "America/Araguaina",
                    "America/Argentina/Buenos_Aires",
                    "America/Argentina/Catamarca",
                    "America/Argentina/Cordoba",
                    "America/Argentina/Jujuy",
                    "America/Argentina/La_Rioja",
                    "America/Argentina/Mendoza",
                    "America/Argentina/Rio_Gallegos",
                    "America/Argentina/Salta",
                    "America/Argentina/San_Juan",
                    "America/Argentina/San_Luis",
                    "America/Argentina/Tucuman",
                    "America/Argentina/Ushuaia",
                    "America/Aruba",
                    "America/Asuncion",
                    "America/Atikokan",
                    "America/Bahia",
                    "America/Bahia_Banderas",
                    "America/Barbados",
                    "America/Belem",
                    "America/Belize",
                    "America/Blanc-Sablon",
                    "America/Boa_Vista",
                    "America/Bogota",
                    "America/Boise",
                    "America/Cambridge_Bay",
                    "America/Campo_Grande",
                    "America/Cancun",
                    "America/Caracas",
                    "America/Cayenne",
                    "America/Cayman",
                    "America/Chicago",
                    "America/Chihuahua",
                    "America/Costa_Rica",
                    "America/Creston",
                    "America/Cuiaba",
                    "America/Curacao",
                    "America/Danmarkshavn",
                    "America/Dawson",
                    "America/Dawson_Creek",
                    "America/Denver",
                    "America/Detroit",
                    "America/Dominica",
                    "America/Edmonton",
                    "America/Eirunepe",
                    "America/El_Salvador",
                    "America/Fortaleza",
                    "America/Glace_Bay",
                    "America/Godthab",
                    "America/Goose_Bay",
                    "America/Grand_Turk",
                    "America/Grenada",
                    "America/Guadeloupe",
                    "America/Guatemala",
                    "America/Guayaquil",
                    "America/Guyana",
                    "America/Halifax",
                    "America/Havana",
                    "America/Hermosillo",
                    "America/Indiana/Indianapolis",
                    "America/Indiana/Knox",
                    "America/Indiana/Marengo",
                    "America/Indiana/Petersburg",
                    "America/Indiana/Tell_City",
                    "America/Indiana/Vevay",
                    "America/Indiana/Vincennes",
                    "America/Indiana/Winamac",
                    "America/Inuvik",
                    "America/Iqaluit",
                    "America/Jamaica",
                    "America/Juneau",
                    "America/Kentucky/Louisville",
                    "America/Kentucky/Monticello",
                    "America/Kralendijk",
                    "America/La_Paz",
                    "America/Lima",
                    "America/Los_Angeles",
                    "America/Lower_Princes",
                    "America/Maceio",
                    "America/Managua",
                    "America/Manaus",
                    "America/Marigot",
                    "America/Martinique",
                    "America/Matamoros",
                    "America/Mazatlan",
                    "America/Menominee",
                    "America/Merida",
                    "America/Metlakatla",
                    "America/Mexico_City",
                    "America/Miquelon",
                    "America/Moncton",
                    "America/Monterrey",
                    "America/Montevideo",
                    "America/Montreal",
                    "America/Montserrat",
                    "America/Nassau",
                    "America/New_York",
                    "America/Nipigon",
                    "America/Nome",
                    "America/Noronha",
                    "America/North_Dakota/Beulah",
                    "America/North_Dakota/Center",
                    "America/North_Dakota/New_Salem",
                    "America/Ojinaga",
                    "America/Panama",
                    "America/Pangnirtung",
                    "America/Paramaribo",
                    "America/Phoenix",
                    "America/Port-au-Prince",
                    "America/Port_of_Spain",
                    "America/Porto_Velho",
                    "America/Puerto_Rico",
                    "America/Rainy_River",
                    "America/Rankin_Inlet",
                    "America/Recife",
                    "America/Regina",
                    "America/Resolute",
                    "America/Rio_Branco",
                    "America/Santa_Isabel",
                    "America/Santarem",
                    "America/Santiago",
                    "America/Santo_Domingo",
                    "America/Sao_Paulo",
                    "America/Scoresbysund",
                    "America/Shiprock",
                    "America/Sitka",
                    "America/St_Barthelemy",
                    "America/St_Johns",
                    "America/St_Kitts",
                    "America/St_Lucia",
                    "America/St_Thomas",
                    "America/St_Vincent",
                    "America/Swift_Current",
                    "America/Tegucigalpa",
                    "America/Thule",
                    "America/Thunder_Bay",
                    "America/Tijuana",
                    "America/Toronto",
                    "America/Tortola",
                    "America/Vancouver",
                    "America/Whitehorse",
                    "America/Winnipeg",
                    "America/Yakutat",
                    "America/Yellowknife",
                    "Antarctica/Casey",
                    "Antarctica/Davis",
                    "Antarctica/DumontDUrville",
                    "Antarctica/Macquarie",
                    "Antarctica/Mawson",
                    "Antarctica/McMurdo",
                    "Antarctica/Palmer",
                    "Antarctica/Rothera",
                    "Antarctica/South_Pole",
                    "Antarctica/Syowa",
                    "Antarctica/Vostok",
                    "Arctic/Longyearbyen",
                    "Asia/Aden",
                    "Asia/Almaty",
                    "Asia/Amman",
                    "Asia/Anadyr",
                    "Asia/Aqtau",
                    "Asia/Aqtobe",
                    "Asia/Ashgabat",
                    "Asia/Baghdad",
                    "Asia/Bahrain",
                    "Asia/Baku",
                    "Asia/Bangkok",
                    "Asia/Beirut",
                    "Asia/Bishkek",
                    "Asia/Brunei",
                    "Asia/Choibalsan",
                    "Asia/Chongqing",
                    "Asia/Colombo",
                    "Asia/Damascus",
                    "Asia/Dhaka",
                    "Asia/Dili",
                    "Asia/Dubai",
                    "Asia/Dushanbe",
                    "Asia/Gaza",
                    "Asia/Harbin",
                    "Asia/Hebron",
                    "Asia/Ho_Chi_Minh",
                    "Asia/Hong_Kong",
                    "Asia/Hovd",
                    "Asia/Irkutsk",
                    "Asia/Jakarta",
                    "Asia/Jayapura",
                    "Asia/Jerusalem",
                    "Asia/Kabul",
                    "Asia/Kamchatka",
                    "Asia/Karachi",
                    "Asia/Kashgar",
                    "Asia/Kathmandu",
                    "Asia/Khandyga",
                    "Asia/Kolkata",
                    "Asia/Krasnoyarsk",
                    "Asia/Kuala_Lumpur",
                    "Asia/Kuching",
                    "Asia/Kuwait",
                    "Asia/Macau",
                    "Asia/Magadan",
                    "Asia/Makassar",
                    "Asia/Manila",
                    "Asia/Muscat",
                    "Asia/Nicosia",
                    "Asia/Novokuznetsk",
                    "Asia/Novosibirsk",
                    "Asia/Omsk",
                    "Asia/Oral",
                    "Asia/Phnom_Penh",
                    "Asia/Pontianak",
                    "Asia/Pyongyang",
                    "Asia/Qatar",
                    "Asia/Qyzylorda",
                    "Asia/Rangoon",
                    "Asia/Riyadh",
                    "Asia/Sakhalin",
                    "Asia/Samarkand",
                    "Asia/Seoul",
                    "Asia/Shanghai",
                    "Asia/Singapore",
                    "Asia/Taipei",
                    "Asia/Tashkent",
                    "Asia/Tbilisi",
                    "Asia/Tehran",
                    "Asia/Thimphu",
                    "Asia/Tokyo",
                    "Asia/Ulaanbaatar",
                    "Asia/Urumqi",
                    "Asia/Ust-Nera",
                    "Asia/Vientiane",
                    "Asia/Vladivostok",
                    "Asia/Yakutsk",
                    "Asia/Yekaterinburg",
                    "Asia/Yerevan",
                    "Atlantic/Azores",
                    "Atlantic/Bermuda",
                    "Atlantic/Canary",
                    "Atlantic/Cape_Verde",
                    "Atlantic/Faroe",
                    "Atlantic/Madeira",
                    "Atlantic/Reykjavik",
                    "Atlantic/South_Georgia",
                    "Atlantic/St_Helena",
                    "Atlantic/Stanley",
                    "Australia/Adelaide",
                    "Australia/Brisbane",
                    "Australia/Broken_Hill",
                    "Australia/Currie",
                    "Australia/Darwin",
                    "Australia/Eucla",
                    "Australia/Hobart",
                    "Australia/Lindeman",
                    "Australia/Lord_Howe",
                    "Australia/Melbourne",
                    "Australia/Perth",
                    "Australia/Sydney",
                    "Canada/Atlantic",
                    "Canada/Central",
                    "Canada/Eastern",
                    "Canada/Mountain",
                    "Canada/Newfoundland",
                    "Canada/Pacific",
                    "Europe/Amsterdam",
                    "Europe/Andorra",
                    "Europe/Athens",
                    "Europe/Belgrade",
                    "Europe/Berlin",
                    "Europe/Bratislava",
                    "Europe/Brussels",
                    "Europe/Bucharest",
                    "Europe/Budapest",
                    "Europe/Busingen",
                    "Europe/Chisinau",
                    "Europe/Copenhagen",
                    "Europe/Dublin",
                    "Europe/Gibraltar",
                    "Europe/Guernsey",
                    "Europe/Helsinki",
                    "Europe/Isle_of_Man",
                    "Europe/Istanbul",
                    "Europe/Jersey",
                    "Europe/Kaliningrad",
                    "Europe/Kiev",
                    "Europe/Lisbon",
                    "Europe/Ljubljana",
                    "Europe/London",
                    "Europe/Luxembourg",
                    "Europe/Madrid",
                    "Europe/Malta",
                    "Europe/Mariehamn",
                    "Europe/Minsk",
                    "Europe/Monaco",
                    "Europe/Moscow",
                    "Europe/Oslo",
                    "Europe/Paris",
                    "Europe/Podgorica",
                    "Europe/Prague",
                    "Europe/Riga",
                    "Europe/Rome",
                    "Europe/Samara",
                    "Europe/San_Marino",
                    "Europe/Sarajevo",
                    "Europe/Simferopol",
                    "Europe/Skopje",
                    "Europe/Sofia",
                    "Europe/Stockholm",
                    "Europe/Tallinn",
                    "Europe/Tirane",
                    "Europe/Uzhgorod",
                    "Europe/Vaduz",
                    "Europe/Vatican",
                    "Europe/Vienna",
                    "Europe/Vilnius",
                    "Europe/Volgograd",
                    "Europe/Warsaw",
                    "Europe/Zagreb",
                    "Europe/Zaporozhye",
                    "Europe/Zurich",
                    "GMT",
                    "Indian/Antananarivo",
                    "Indian/Chagos",
                    "Indian/Christmas",
                    "Indian/Cocos",
                    "Indian/Comoro",
                    "Indian/Kerguelen",
                    "Indian/Mahe",
                    "Indian/Maldives",
                    "Indian/Mauritius",
                    "Indian/Mayotte",
                    "Indian/Reunion",
                    "Pacific/Apia",
                    "Pacific/Auckland",
                    "Pacific/Chatham",
                    "Pacific/Chuuk",
                    "Pacific/Easter",
                    "Pacific/Efate",
                    "Pacific/Enderbury",
                    "Pacific/Fakaofo",
                    "Pacific/Fiji",
                    "Pacific/Funafuti",
                    "Pacific/Galapagos",
                    "Pacific/Gambier",
                    "Pacific/Guadalcanal",
                    "Pacific/Guam",
                    "Pacific/Honolulu",
                    "Pacific/Johnston",
                    "Pacific/Kiritimati",
                    "Pacific/Kosrae",
                    "Pacific/Kwajalein",
                    "Pacific/Majuro",
                    "Pacific/Marquesas",
                    "Pacific/Midway",
                    "Pacific/Nauru",
                    "Pacific/Niue",
                    "Pacific/Norfolk",
                    "Pacific/Noumea",
                    "Pacific/Pago_Pago",
                    "Pacific/Palau",
                    "Pacific/Pitcairn",
                    "Pacific/Pohnpei",
                    "Pacific/Port_Moresby",
                    "Pacific/Rarotonga",
                    "Pacific/Saipan",
                    "Pacific/Tahiti",
                    "Pacific/Tarawa",
                    "Pacific/Tongatapu",
                    "Pacific/Wake",
                    "Pacific/Wallis",
                    "US/Alaska",
                    "US/Arizona",
                    "US/Central",
                    "US/Eastern",
                    "US/Hawaii",
                    "US/Mountain",
                    "US/Pacific",
                    "UTC"
                ],
                "type": "string",
                "title": "Timezone",
                "default": "US/Pacific",
                "description": "The timezone the user is associated with."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "title": {
                "calculatedProperty": true,
                "title": "Title",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "title": 1,
            "lab": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "ReferenceEpigenome": {
        "title": "Reference epigenome",
        "description": "Schema for submitting metadata for a IHEC-defined reference epigenome.",
        "id": "/profiles/reference_epigenome.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "series.json#/properties"
            },
            {
                "$ref": "mixins.json#/submitter_comment"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "submitter_comment": {
                "description": "Additional information specified by the submitter to be displayed as a comment on the portal.",
                "title": "Submitter comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_datasets": {
                "items": {
                    "linkTo": "Experiment",
                    "comment": "See dataset.json for available identifiers.",
                    "title": "Dataset",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional datasets",
                "description": "List of datasets to be associated with the series."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "target": {
                "items": {
                    "linkTo": "Target",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Target",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "biosample_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term id",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "treatment_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Treatment term name",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "biosample_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term name",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "biosample_type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample type",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            },
            "revoked_datasets": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked datasets",
                "type": "array"
            }
        },
        "facets": {
            "related_datasets.assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Series status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "biosample_type": {
                "title": "Biosample type",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Biosample treatment",
                "type": "string"
            },
            "related_datasets.files.analysis_step_version.analysis_step.pipelines.title": {
                "title": "Pipeline",
                "type": "string"
            },
            "related_datasets.files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "related_datsets.files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "related_datasets.files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "related_datasets.replicates.library.size_range": {
                "title": "Library insert size (nt)",
                "type": "string"
            },
            "related_datasets.replicates.library.nucleic_acid_term_name": {
                "title": "Library made from",
                "type": "string"
            },
            "related_datasets.replicates.library.depleted_in_term_name": {
                "title": "Library depleted in",
                "type": "string"
            },
            "related_datasets.replicates.library.treatments.treatment_term_name": {
                "title": "Library treatment",
                "type": "array"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Biosample term",
                "type": "string"
            },
            "related_datasets.assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "related_datasets.target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.replicates.antibody.accession": {
                "title": "Linked Antibody",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.organism.scientific_name": {
                "title": "Species",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.age_display": {
                "title": "Age display",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Treatment",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_id": {
                "title": "Term ID",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration": {
                "title": "Concentration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration_units": {
                "title": "Concentration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.duration": {
                "title": "Duration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.duration_units": {
                "title": "Duration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.synchronization": {
                "title": "Synchronization",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time": {
                "title": "Post-synchronization time",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time_units": {
                "title": "Post-synchronization time units",
                "type": "string"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "related_datasets.assay_term_name": 1,
            "related_datasets.assay_term_id": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "related_datasets.biosample_term_id": 1,
            "related_datasets.biosample_term_name": 1,
            "related_datasets.biosample_type": 1,
            "related_datasets.organ_slims": 1,
            "related_datasets.developmental_slims": 1,
            "related_datasets.assay_synonyms": 1,
            "related_datasets.biosample_synonyms": 1,
            "files.accession": 1,
            "files.alternate_accessions": 1,
            "files.file_format": 1,
            "files.output_type": 1,
            "files.md5sum": 1,
            "related_datasets.replicates.library.accession": 1,
            "related_datasets.replicates.library.alternate_accessions": 1,
            "related_datasets.replicates.library.aliases": 1,
            "related_datasets.replicates.library.biosample.accession": 1,
            "related_datasets.replicates.library.biosample.alternate_accessions": 1,
            "related_datasets.replicates.library.biosample.aliases": 1,
            "related_datasets.replicates.library.biosample.subcellular_fraction_term_name": 1,
            "related_datasets.replicates.library.biosample.donor.accession": 1,
            "related_datasets.replicates.library.biosample.donor.alternate_accessions": 1,
            "related_datasets.replicates.antibody.accession": 1,
            "related_datasets.replicates.antibody.alternate_accessions": 1,
            "related_datasets.replicates.antibody.lot_id": 1,
            "related_datasets.replicates.antibody.lot_id_alias": 1,
            "related_datasets.replicates.antibody.clonality": 1,
            "related_datasets.replicates.antibody.isotype": 1,
            "related_datasets.replicates.antibody.purifications": 1,
            "related_datasets.replicates.antibody.product_id": 1,
            "related_datasets.replicates.antibody.aliases": 1,
            "related_datasets.replicates.antibody.dbxrefs": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "related_datasets.possible_controls.accession": 1,
            "related_datasets.possible_controls.alternate_accessions": 1,
            "target.aliases": 1,
            "target.gene_name": 1,
            "target.label": 1,
            "target.dbxref": 1,
            "target.organism.name": 1,
            "target.organism.scientific_name": 1,
            "references.title": 1,
            "related_datasets.replicates.library.biosample.rnais.product_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Reference": {
        "title": "Reference",
        "description": "Schema for submitting metadata for a reference set.",
        "id": "/profiles/reference.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "file_set.json#/properties"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_files": {
                "items": {
                    "linkTo": "File",
                    "comment": "See file.json for available identifiers.",
                    "title": "Data file",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional data files",
                "description": "List of data files to be associated with the dataset."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "reference_type": {
                "enum": [
                    "index",
                    "spike-in",
                    "mappability",
                    "genome"
                ],
                "type": "string",
                "title": "Type",
                "description": "The category that best describes the reference set."
            },
            "organism": {
                "linkTo": "Organism",
                "comment": "See organism.json for available identifiers.",
                "title": "Organism",
                "type": "string"
            },
            "software_used": {
                "items": {
                    "title": "Software used",
                    "description": "Version of software used to derived the reference file set.",
                    "type": "string",
                    "comment": "See software_version.json for available identifiers.",
                    "linkTo": "SoftwareVersion"
                },
                "type": "array",
                "title": "Software used",
                "description": "A list of software used to derive the reference file set."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            }
        },
        "facets": {
            "reference_type": {
                "title": "Reference type",
                "type": "string"
            },
            "status": {
                "title": "Reference file set status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "software_used.software.name": {
                "title": "Software used",
                "type": "array"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "software_used.software.name": {
                "title": "Software used",
                "type": "array"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "software_used.software.name": 1,
            "reference_type": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Pipeline": {
        "title": "Pipeline",
        "description": "Schema for submitting a series of analysis for a given data type.",
        "id": "/profiles/pipeline.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "title",
            "lab",
            "award"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases",
            "accession"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/assay"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "PL",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "4",
                "title": "Schema Version",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "replaced",
                    "deleted",
                    "archived",
                    "active"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "title": {
                "type": "string",
                "title": "Title",
                "description": "The preferred viewable name of the pipeline."
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "title": "Field mapping index type",
                    "description": "Defines one of three types of indexing available",
                    "type": "string",
                    "default": "analyzed",
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ]
                },
                "permission": "import_items",
                "default": "",
                "title": "Description",
                "description": "A place to provide a curated discription of the pipeline.  Only wranglers can post",
                "type": "string"
            },
            "analysis_steps": {
                "items": {
                    "title": "Analysis step",
                    "description": "A particular computational analysis step used by the pipeline.",
                    "comment": "See analysis_step.json for a list of available identifiers.",
                    "type": "string",
                    "linkTo": "AnalysisStep"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Analysis steps",
                "description": "The particular computational analysis steps used by the pipeline."
            },
            "source_url": {
                "format": "uri",
                "type": "string",
                "title": "Source URL",
                "description": "An external resource to the code base."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "facets": {
            "assay_term_name": {
                "title": "Assay"
            },
            "status": {
                "title": "Pipeline status"
            },
            "title": {
                "title": "Pipeline groups"
            },
            "analysis_steps.software_versions.software.title": {
                "title": "Software"
            },
            "lab.title": {
                "title": "Developed by"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession"
            },
            "title": {
                "title": "Pipeline"
            },
            "assay_term_name": {
                "title": "Assay type"
            },
            "version": {
                "title": "Version"
            },
            "status": {
                "title": "Status"
            },
            "analysis_steps.software_versions.version": {
                "title": "Software"
            },
            "analysis_steps.software_versions.downloaded_url": {
                "title": "Download URL"
            },
            "analysis_steps.software_versions.download_checksum": {
                "title": "Download checksum"
            },
            "analysis_steps.software_versions.software.title": {
                "title": "Software"
            },
            "analysis_steps.software_versions.software.@id": {
                "title": "ID"
            },
            "analysis_steps.software_versions.software.references.published_by": {
                "title": "Created by"
            }
        },
        "boost_values": {
            "uuid": 1,
            "accession": 1,
            "aliases": 1,
            "analysis_steps.current_version.software_versions.software.title": 1,
            "analysis_steps.current_version.software_versions.software.name": 1,
            "analysis_steps.current_version.software_versions.software.purpose": 1,
            "analysis_steps.current_version.software_versions.software.used_by": 1,
            "analysis_steps.current_version.software_versions.software.references.title": 1,
            "assay_term_name": 1,
            "assay_term_id": 1,
            "title": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Software": {
        "title": "Software",
        "description": "Schema for submitting analysis software.",
        "id": "/profiles/software.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "name",
            "description",
            "title",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid",
            "alias",
            "title",
            "name"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/attribution"
            }
        ],
        "properties": {
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "3",
                "title": "Schema Version",
                "type": "string"
            },
            "software_type": {
                "items": {
                    "title": "Type",
                    "type": "string",
                    "enum": [
                        "aligner",
                        "quality metric",
                        "peak caller",
                        "filtering",
                        "file format conversion",
                        "database",
                        "variant annotation",
                        "genome segmentation",
                        "qualification",
                        "transcript identification",
                        "transcriptome assembly",
                        "other"
                    ]
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Types",
                "description": "The classification of the software"
            },
            "name": {
                "uniqueKey": "software:name",
                "type": "string",
                "title": "Name",
                "pattern": "^[a-z0-9\\-\\_]+",
                "description": "Unique name of the software package, lower cased version of title."
            },
            "title": {
                "type": "string",
                "title": "Title",
                "description": "The preferred viewable name of the software."
            },
            "bug_tracker_url": {
                "format": "uri",
                "type": "string",
                "title": "Bug tracker URL",
                "description": "An external resource to track bugs for the software."
            },
            "source_url": {
                "format": "uri",
                "type": "string",
                "title": "Source URL",
                "description": "An external resource to the code base."
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the software."
            },
            "purpose": {
                "items": {
                    "title": "Purpose",
                    "type": "string",
                    "enum": [
                        "ChIP-seq",
                        "DNase-seq",
                        "RNA-seq",
                        "data QC",
                        "integrative analysis",
                        "variant analysis",
                        "community resource"
                    ]
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Purpose in project",
                "description": "The purpose that the software was used for in the project."
            },
            "used_by": {
                "items": {
                    "title": "Used by",
                    "type": "string",
                    "enum": [
                        "modERN",
                        "ENCODE",
                        "mouseENCODE",
                        "modENCODE",
                        "community"
                    ]
                },
                "uniqueItems": true,
                "title": "Used by project",
                "type": "array"
            },
            "description": {
                "type": "string",
                "title": "Description",
                "description": "A plain text description of the software."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "versions": {
                "items": {
                    "linkTo": "SoftwareVersion",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Versions",
                "type": "array"
            }
        },
        "facets": {
            "software_type": {
                "title": "Software type"
            },
            "purpose": {
                "title": "Purpose in project"
            },
            "references.published_by": {
                "title": "Created by"
            }
        },
        "columns": {
            "title": {
                "title": "Title"
            },
            "name": {
                "title": "Name"
            },
            "status": {
                "title": "Publication status"
            },
            "url": {
                "title": "URL"
            },
            "description": {
                "title": "Description"
            },
            "source_url": {
                "title": "Source URL"
            },
            "references": {
                "title": "references"
            },
            "used_by": {
                "title": "Use by project"
            },
            "software_type": {
                "title": "The classification of the software"
            },
            "purpose": {
                "title": "Purpose in project"
            }
        },
        "boost_values": {
            "title": 1,
            "name": 1,
            "purpose": 1,
            "used_by": 1,
            "software_type": 1,
            "references.title": 1,
            "references.identifiers": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "ChipSeqFilterQualityMetric": {
        "description": "Schema for reporting ChIP library complexity and cross-correlation quality metrics",
        "id": "/profiles/chipseq_filter_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "NSC": {
                "description": "Normalized strand cross-correlation = FRAGLEN_CC / MIN_CC. Ratio of strand cross-correlation at estimated fragment length to the minimum cross-correlation over all shifts.",
                "type": "number"
            },
            "RSC": {
                "description": "Relative cross correlation coefficient. Ratio of strand cross-correlation at fragment length  and at read length",
                "type": "number"
            },
            "PBC1": {
                "description": "PCR Bottlenecking coefficient 1 = M1/M_DISTINCT where M1: number of genomic locations where exactly one read maps uniquely, M_DISTINCT: number of distinct genomic locations to which some read maps uniquely",
                "type": "number"
            },
            "PBC2": {
                "pattern": "^Infinity$",
                "description": "PCR Bottlenecking coefficient 2 (indicates library complexity) = M1/M2 where M1: number of genomic locations where only one read maps uniquely and M2: number of genomic locations where 2 reads map uniquely",
                "minimum": 0,
                "type": [
                    "number",
                    "string"
                ]
            },
            "fragment length": {
                "description": "Fragment length/strandshift. This is the estimated fragment length/strand shift for each dataset as estimated by strand cross-correlation analysis",
                "type": "number"
            },
            "NRF": {
                "description": "Non redundant fraction (indicates library complexity).  Number of distinct unique mapping reads (i.e. after removing duplicates) / Total number of reads",
                "type": "number"
            },
            "cross_correlation_plot": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "application/pdf"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "Cross-correlation plot",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/chipseq_filter_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "Image": {
        "title": "Image",
        "description": "Schema for images embedded in portal pages",
        "id": "/profiles/image.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "attachment"
        ],
        "identifyingProperties": [
            "uuid"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/attachment"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/standard_status"
            }
        ],
        "properties": {
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "released",
                "title": "Status",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "enum": [
                            "image/png",
                            "image/jpeg",
                            "image/gif"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "Document file metadata",
                "type": "object"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "1",
                "title": "Schema Version",
                "type": "string"
            },
            "caption": {
                "title": "Caption",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "caption": 2
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "TestingLinkTarget": {
        "properties": {
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "status": {
                "type": "string"
            },
            "reverse": {
                "items": {
                    "linkFrom": "TestingLinkSource.target",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Sources",
                "type": "array"
            },
            "uuid": {
                "type": "string"
            },
            "name": {
                "uniqueKey": true,
                "type": "string"
            }
        },
        "@type": [
            "JSONSchema"
        ],
        "additionalProperties": false,
        "type": "object"
    },
    "EdwcomparepeaksQualityMetric": {
        "description": "Schema for reporting the 'edwComparePeaks' output as a quality metric",
        "id": "/profiles/edwcomparepeaks_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "aBaseCount": {
                "description": "Base count of first file",
                "type": "number"
            },
            "bBaseCount": {
                "description": "Base count of second file",
                "type": "number"
            },
            "intersectionSize": {
                "description": "Size of intersection",
                "type": "number"
            },
            "iuRatio": {
                "description": "Intersection to Union Ratio",
                "type": "number"
            },
            "unionSize": {
                "description": "Size of Union",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Page": {
        "title": "Page",
        "description": "Schema for a portal page.",
        "id": "/profiles/page.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "name",
            "title"
        ],
        "identifyingProperties": [
            "uuid",
            "name"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/attribution"
            }
        ],
        "properties": {
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "1",
                "title": "Schema Version",
                "type": "string"
            },
            "parent": {
                "validators": [
                    "isNotCollectionDefaultPage"
                ],
                "linkTo": "Page",
                "title": "Parent Page",
                "type": [
                    "string",
                    "null"
                ]
            },
            "name": {
                "type": "string",
                "title": "URL Name",
                "pattern": "^[a-z0-9_-]+$",
                "description": "The name shown in this page's URL."
            },
            "title": {
                "type": "string",
                "title": "Title",
                "description": "The name shown in the browser's title bar and tabs."
            },
            "layout": {
                "properties": {
                    "rows": {
                        "type": "array",
                        "items": {}
                    },
                    "blocks": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "body": {
                                    "type": "string",
                                    "elasticsearch_mapping_index_type": {
                                        "title": "Field mapping index type",
                                        "description": "Defines one of three types of indexing available",
                                        "type": "string",
                                        "default": "analyzed",
                                        "enum": [
                                            "analyzed",
                                            "not_analyzed",
                                            "no"
                                        ]
                                    }
                                },
                                "image": {
                                    "type": "string",
                                    "linkTo": "Image"
                                },
                                "item": {
                                    "type": "string",
                                    "linkTo": "Item"
                                }
                            }
                        }
                    }
                },
                "formInput": "layout",
                "description": "Hierarchical description of the page layout.",
                "title": "Page Layout",
                "default": {
                    "rows": [
                        {
                            "cols": [
                                {
                                    "blocks": [
                                        "#block1"
                                    ]
                                }
                            ]
                        }
                    ],
                    "blocks": [
                        {
                            "@id": "#block1",
                            "@type": "richtextblock",
                            "body": "<p></p>"
                        }
                    ]
                },
                "type": "object"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "canonical_uri": {
                "calculatedProperty": true,
                "title": "Canonical URI",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "columns": {
            "@id": {
                "title": "Path"
            },
            "title": {
                "title": "Title"
            },
            "date_created": {
                "title": "Created"
            },
            "status": {
                "title": "Status"
            }
        },
        "boost_values": {
            "name": 2,
            "title": 2,
            "layout.blocks.body": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "RNAiCharacterization": {
        "title": "RNAi vector characterization",
        "description": "Schema for submitting RNAi vector characterization data.",
        "id": "/profiles/rnai_characterization.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "characterizes",
            "attachment"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attachment"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "characterization.json#/properties"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "description": "The current state of the characterization.",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "comment": {
                "description": "Additional information pertaining to the characterization that the submitter wishes to disclose.",
                "title": "Comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "4",
                "hidden comment": "Bump the default in the subclasses."
            },
            "caption": {
                "type": "string",
                "title": "Caption",
                "description": "A plain text description about the characterization. Characterizations for antibodies should include brief methods, expected MW, cell line(s), labels and justification for acceptance, if necessary",
                "default": "",
                "formInput": "textarea"
            },
            "date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Date",
                "description": "The date that the characterization was run on.",
                "type": "string"
            },
            "characterizes": {
                "comment": "See rnai.json for available identifiers.",
                "description": "The specific entity for which the characterization applies.",
                "title": "RNAi characterized",
                "linkTo": "RNAi",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "enum": [
                            "application/msword",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "application/pdf",
                            "application/zip",
                            "text/plain",
                            "text/tab-separated-values",
                            "image/jpeg",
                            "image/tiff",
                            "image/gif",
                            "text/html",
                            "image/png",
                            "image/svs",
                            "text/autosql"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "Document file metadata",
                "type": "object"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "characterization_method": {
                "enum": [
                    "knockdown or knockout",
                    "qPCR analysis"
                ],
                "type": "string",
                "title": "Method",
                "description": "Experimental method of the characterization."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "MadQualityMetric": {
        "description": "Schema for reporting Replicate Concordance Metric using Mean Absolute Deviation (MAD)",
        "id": "/profiles/mad_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "image/png"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "2",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "SD of log ratios": {
                "description": "Standard Deviation of replicate log ratios from quantification",
                "type": "number"
            },
            "Pearson correlation": {
                "description": "Pearson correlation coefficient of replicates from quantification",
                "type": "number"
            },
            "Spearman correlation": {
                "description": "Spearman correlation coefficient of replicates from quantification",
                "type": "number"
            },
            "MAD of log ratios": {
                "description": "Mean-Average-Deviation (MAD) of replicate log ratios from quantification",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/mad_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "EdwbamstatsQualityMetric": {
        "description": "Schema for reporting 'edwBamStats' output as a quality metric",
        "id": "/profiles/edwbamstats_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "alignedBy": {
                "description": "edwBamStats: alignedBy",
                "type": "string"
            },
            "isPaired": {
                "description": "edwBamStats: isPaired",
                "type": "number"
            },
            "isSortedByTarget": {
                "description": "edwBamStats: isSortedByTarget",
                "type": "number"
            },
            "mappedCount": {
                "description": "edwBamStats: mappedCount",
                "type": "number"
            },
            "readBaseCount": {
                "description": "edwBamStats: readBaseCount",
                "type": "number"
            },
            "readCount": {
                "description": "edwBamStats: readCount",
                "type": "number"
            },
            "readSizeMax": {
                "description": "edwBamStats: readSizeMax",
                "type": "number"
            },
            "readSizeMean": {
                "description": "edwBamStats: readSizeMean",
                "type": "number"
            },
            "readSizeMin": {
                "description": "edwBamStats: readSizeMin",
                "type": "number"
            },
            "readSizeStd": {
                "description": "edwBamStats: readSizeStd",
                "type": "number"
            },
            "targetBaseCount": {
                "description": "edwBamStats: targetBaseCount",
                "type": "number"
            },
            "targetSeqCount": {
                "description": "edwBamStats: targetSeqCount",
                "type": "number"
            },
            "u4mReadCount": {
                "description": "edwBamStats: u4mReadCount",
                "type": "number"
            },
            "u4mUniquePos": {
                "description": "edwBamStats: u4mUniquePos",
                "type": "number"
            },
            "u4mUniqueRatio": {
                "description": "edwBamStats: u4mUniqueRatio",
                "type": "number"
            },
            "uniqueMappedCount": {
                "description": "edwBamStats: uniqueMappedCount",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "AntibodyApproval": {
        "title": "Antibody lot review",
        "description": "Schema for submitting antibody lot review for application in immunoprecipitation assays.",
        "id": "/profiles/antibody_approval.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "antibody",
            "status",
            "target"
        ],
        "identifyingProperties": [
            "uuid"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "3",
                "title": "Schema Version",
                "type": "string"
            },
            "antibody": {
                "linkTo": "AntibodyLot",
                "comment": "See antibody_lot.json for available identifiers.",
                "title": "Antibody",
                "type": "string"
            },
            "target": {
                "linkTo": "Target",
                "type": "string",
                "comment": "See target.json for available identifiers.",
                "title": "Target",
                "description": "The name of the gene whose expression or product is the intended goal of the antibody."
            },
            "characterizations": {
                "items": {
                    "title": "Characterization",
                    "description": "An antibody characterization under review.",
                    "comment": "See antibody_characterization.json for available identifiers.",
                    "type": "string",
                    "linkTo": "AntibodyCharacterization"
                },
                "type": "array",
                "title": "Characterizations",
                "default": [],
                "description": "Antibody characterizations under review."
            },
            "status": {
                "enum": [
                    "awaiting lab characterization",
                    "pending dcc review",
                    "eligible for new data",
                    "not eligible for new data",
                    "not pursued",
                    "deleted"
                ],
                "comment": "Do not submit, the value is assigned by server. The status is updated by the DCC.",
                "default": "awaiting lab characterization",
                "title": "Status",
                "description": "The current state of the antibody characterizations.",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "AntibodyLot": {
        "title": "Antibody lot",
        "description": "Schema for submitting an antibody lot (not including target or characterization information).",
        "id": "/profiles/antibody_lot.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "product_id",
            "source",
            "lot_id",
            "host_organism",
            "targets"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/accessioned_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/product_id"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "product_id": {
                "description": "The product identifier provided by the originating lab or vendor.",
                "title": "Product ID",
                "type": "string"
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The originating lab or vendor.",
                "linkTo": "Source"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released",
                    "revoked"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "AB",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "5",
                "title": "Schema Version",
                "type": "string"
            },
            "lot_id": {
                "type": "string",
                "default": "unknown",
                "title": "Lot ID",
                "description": "The lot identifier provided by the originating lab or vendor."
            },
            "lot_id_alias": {
                "items": {
                    "title": "Lot ID Alias",
                    "description": "The lot identifier for this lot deemed to be exactly the same by the vendor. ",
                    "type": "string"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Lot ID aliases",
                "description": "The lot identifiers for this lot deemed to be exactly the same by the vendor.",
                "type": "array"
            },
            "antigen_description": {
                "type": "string",
                "title": "Antigen description",
                "default": "",
                "description": "The plain text description of the antigen used in raising the antibody (e.g. amino acid residue locations of the antigen)."
            },
            "antigen_sequence": {
                "type": "string",
                "title": "Antigen sequence",
                "description": "The amino acid sequence of the antigen."
            },
            "clonality": {
                "enum": [
                    "polyclonal",
                    "monoclonal"
                ],
                "type": "string",
                "title": "Antibody clonality",
                "description": "The diversification of the immune cell lineage to make the antibody."
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^(UCSC-ENCODE-cv:\\S+)$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "host_organism": {
                "linkTo": "Organism",
                "type": "string",
                "comment": "See organism.json for available identifiers.",
                "title": "Host",
                "description": "The organism the antibody was grown in."
            },
            "isotype": {
                "enum": [
                    "IgA1",
                    "IgA2",
                    "IgD",
                    "IgG",
                    "IgGκ",
                    "IgG1",
                    "IgG1κ",
                    "IgG1λ",
                    "IgG2",
                    "IgG2κ",
                    "IgG2λ",
                    "IgG2a",
                    "IgG2aκ",
                    "IgG2aλ",
                    "IgG2b",
                    "IgG2bκ",
                    "IgG2bλ",
                    "IgG3",
                    "IgG3κ",
                    "IgG4",
                    "IgA",
                    "IgM",
                    "IgMκ",
                    "IgE",
                    "serum"
                ],
                "type": "string",
                "title": "Isotype",
                "description": "The class of antibody ( e.g. IgA, IgD, IgE, IgG or IgM)"
            },
            "purifications": {
                "items": {
                    "title": "Purification method",
                    "description": "A purification protocol used to isolate the antibody.",
                    "comment": "IMAC refers to Immobilized Metal Chelate Chromatography and IEC refers to Ion Exchange Chromatography",
                    "type": "string",
                    "enum": [
                        "Protein A/G",
                        "affinity",
                        "Protein A",
                        "Protein G",
                        "crude",
                        "other",
                        "IEC",
                        "IMAC",
                        "tissue culture supernatant",
                        "antiserum",
                        "IgG fraction"
                    ]
                },
                "uniqueItems": true,
                "default": [],
                "title": "Purification methods",
                "description": "The purification protocols used to isolate the antibody.",
                "type": "array"
            },
            "targets": {
                "items": {
                    "description": "The name of the gene whose expression or product is the intended goal of the antibody.",
                    "comment": "See target.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Target"
                },
                "uniqueItems": true,
                "title": "Targets",
                "type": "array"
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the antibody."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "title": {
                "calculatedProperty": true,
                "title": "Title",
                "type": "string"
            },
            "characterizations": {
                "items": {
                    "linkFrom": "AntibodyCharacterization.characterizes",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Characterizations",
                "type": "array"
            },
            "lot_reviews": {
                "items": {
                    "properties": {
                        "biosample_term_name": {
                            "type": "string",
                            "title": "Ontology term",
                            "description": "Ontology term describing biosample."
                        },
                        "organisms": {
                            "items": {
                                "linkTo": "Organism",
                                "comment": "See organism.json for available identifiers.",
                                "type": "string"
                            },
                            "title": "Organism",
                            "type": "array"
                        },
                        "biosample_term_id": {
                            "type": "string",
                            "comment": "NTR is a new term request identifier provided by the DCC.",
                            "title": "Ontology ID",
                            "pattern": "^(UBERON|EFO|CL|NTR|FBbt|WBbt):[0-9]{2,8}$",
                            "description": "Ontology identifier describing biosample."
                        },
                        "status": {
                            "enum": [
                                "awaiting lab characterization",
                                "pending dcc review",
                                "eligible for new data",
                                "not eligible for new data",
                                "not pursued"
                            ],
                            "comment": "Do not submit, the value is assigned by server. The status is updated by the DCC.",
                            "default": "awaiting lab characterization",
                            "title": "Status",
                            "description": "The current state of the antibody characterizations.",
                            "type": "string"
                        },
                        "targets": {
                            "items": {
                                "linkTo": "Target",
                                "type": "string",
                                "comment": "See target.json for available identifiers.",
                                "description": "The name of the gene whose expression or product is the intended goal of the antibody."
                            },
                            "title": "Targets",
                            "type": "array"
                        }
                    },
                    "additionalProperties": false,
                    "title": "Antibody lot review",
                    "type": "object"
                },
                "description": "Review outcome of an antibody lot in each characterized cell type submitted for review.",
                "title": "Antibody lot reviews",
                "calculatedProperty": true,
                "type": "array"
            }
        },
        "facets": {
            "lot_reviews.status": {
                "title": "Eligibility status"
            },
            "targets.organism.scientific_name": {
                "title": "Target Organism"
            },
            "targets.investigated_as": {
                "title": "Target of antibody"
            },
            "characterizations.characterization_method": {
                "title": "Characterization method"
            },
            "source.title": {
                "title": "Source"
            },
            "clonality": {
                "title": "Clonality"
            },
            "host_organism.name": {
                "title": "Host organism"
            },
            "characterizations.lab.title": {
                "title": "Lab"
            },
            "award.project": {
                "title": "Project"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession"
            },
            "lot_reviews.biosample_term_name": {
                "title": "Ontology term"
            },
            "lot_reviews.status": {
                "title": "Status"
            },
            "lot_reviews.organisms.@id": {
                "title": "Organism ID"
            },
            "lot_reviews.organisms.scientific_name": {
                "title": "Organism scientific name"
            },
            "lot_reviews.targets.name": {
                "title": "Target name"
            },
            "lot_reviews.targets.label": {
                "title": "Target label"
            },
            "lot_reviews.targets.organism.@id": {
                "title": "Target organism ID"
            },
            "lot_reviews.targets.organism.scientific_name": {
                "title": "Target organism scientific name"
            },
            "source.title": {
                "title": "Source"
            },
            "product_id": {
                "title": "Product ID"
            },
            "lot_id": {
                "title": "Lot ID"
            },
            "host_organism.name": {
                "title": "Host organism"
            },
            "status": {
                "title": "Status"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "lot_id": 1,
            "lot_id_alias": 1,
            "clonality": 1,
            "isotype": 1,
            "purifications": 1,
            "product_id": 1,
            "aliases": 1,
            "dbxrefs": 1,
            "source.title": 1,
            "host_organism.name": 1,
            "host_organism.scientific_name": 1,
            "host_organism.taxon_id": 1,
            "targets.gene_name": 1,
            "targets.label": 1,
            "targets.dbxref": 1,
            "targets.aliases": 1,
            "targets.organism.name": 1,
            "targets.organism.scientific_name": 1,
            "targets.organism.taxon_id": 1,
            "characterizations.primary_characterization_method": 1,
            "characterizations.secondary_characterization_method": 1,
            "characterizations.award.title": 1,
            "characterizations.award.project": 1,
            "characterizations.submitted_by.email": 1,
            "characterizations.submitted_by.first_name": 1,
            "characterizations.submitted_by.last_name": 1,
            "characterizations.lab.institute_name": 1,
            "characterizations.lab.institute_label": 1,
            "characterizations.lab.title": 1,
            "characterizations.target.gene_name": 1,
            "characterizations.target.label": 1,
            "characterizations.target.dbxref": 1,
            "characterizations.target.aliases": 1,
            "characterizations.target.organism.name": 1,
            "characterizations.target.organism.scientific_name": 1,
            "characterizations.target.organism.taxon_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "BismarkQualityMetric": {
        "description": "Schema for reporting the specific calculation of an quality metrics",
        "id": "/profiles/bismark_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/assay"
            },
            {
                "$ref": "mixins.json#/aliases"
            }
        ],
        "properties": {
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "4",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "Sequences analysed in total": {
                "description": "Total number of reads analysed by Bismark for WGBS",
                "type": "number"
            },
            "lambda Sequences analysed in total": {
                "description": "Total number of reads analysed by Bismark for WGBS vs. lambda phage genome",
                "type": "number"
            },
            "Mapping efficiency": {
                "description": "Bismark mapping efficiency for WGBS vs. reference genome",
                "type": "string"
            },
            "lambda Mapping efficiency": {
                "description": "Bismark mapping efficiency for WGBS vs. lambda phage genome",
                "type": "string"
            },
            "lambda C methylated in CpG context": {
                "description": "Bismark mapping efficiency for WGBS vs. lambda phage genome",
                "type": "string"
            },
            "lambda C methylated in CHG context": {
                "description": "Bismark mapping efficiency for WGBS vs. lambda phage genome",
                "type": "string"
            },
            "lambda C methylated in CHH context": {
                "description": "Bismark mapping efficiency for WGBS vs. lambda phage genome",
                "type": "string"
            },
            "C methylated in CHH context": {
                "description": "Bismark mapping efficiency for WGBS vs. reference genome",
                "type": "string"
            },
            "C methylated in CHG context": {
                "description": "Bismark mapping efficiency for WGBS vs. reference genome",
                "type": "string"
            },
            "C methylated in CpG context": {
                "description": "Bismark mapping efficiency for WGBS vs. reference genome",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/bismark_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "PhantompeaktoolsSppQualityMetric": {
        "description": "Schema for reporting the 'phantumpeakqualtools run_spp.R' output as a quality metric",
        "id": "/profiles/phantompeaktools_spp_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "ChIP data read length": {
                "description": "SPP: ChIP data read length",
                "type": "number"
            },
            "FDR threshold": {
                "description": "SPP: FDR threshold",
                "type": "number"
            },
            "Minimum cross-correlation shift": {
                "description": "SPP: Minimum cross-correlation shift",
                "type": "number"
            },
            "Minimum cross-correlation value": {
                "description": "SOO: Minimum cross-correlation value",
                "type": "number"
            },
            "Normalized Strand cross-correlation coefficient (NSC)": {
                "description": "SPP: Normalized Strand cross-correlation coefficient (NSC)",
                "type": "number"
            },
            "Phantom Peak Quality Tag": {
                "description": "SPP: Phantom Peak Quality Tag",
                "type": "number"
            },
            "Phantom peak Correlation": {
                "description": "SPP: Phantom peak Correlation",
                "type": "number"
            },
            "Phantom peak location": {
                "description": "SPP: Phantom peak location",
                "type": "number"
            },
            "Relative Strand cross-correlation Coefficient (RSC)": {
                "description": "SPP: Relative Strand cross-correlation Coefficient (RSC)",
                "type": "number"
            },
            "Top 3 cross-correlation values": {
                "items": {
                    "description": "",
                    "type": "number"
                },
                "type": "array",
                "default": [],
                "description": "SPP: Top 3 cross-correlation values"
            },
            "Top 3 estimates for fragment length": {
                "items": {
                    "description": "",
                    "type": "number"
                },
                "type": "array",
                "default": [],
                "description": "SPP: Top 3 estimates for fragment length"
            },
            "Window half size": {
                "description": "SPP: Window half size",
                "type": "number"
            },
            "exclusion(max)": {
                "description": "SPP: exclusion(max)",
                "type": "number"
            },
            "exclusion(min)": {
                "description": "SPP: exclusion(min)",
                "type": "number"
            },
            "strandshift(max)": {
                "description": "SPP: strandshift(max)",
                "type": "number"
            },
            "strandshift(min)": {
                "description": "SPP: strandshift(min)",
                "type": "number"
            },
            "strandshift(step)": {
                "description": "SPP: strandshift(step)",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "TestingServerDefault": {
        "properties": {
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "accessionType": "AB",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "user": {
                "serverDefault": "userid",
                "type": "string",
                "linkTo": "User"
            },
            "now": {
                "serverDefault": "now",
                "format": "date-time",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ],
        "type": "object"
    },
    "TreatmentConcentrationSeries": {
        "title": "Treatment concentration series",
        "description": "Schema for submitting metadata for a treatment concentration series.",
        "id": "/profiles/treatment_concentration_series.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "series.json#/properties"
            },
            {
                "$ref": "mixins.json#/submitter_comment"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "submitter_comment": {
                "description": "Additional information specified by the submitter to be displayed as a comment on the portal.",
                "title": "Submitter comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_datasets": {
                "items": {
                    "linkTo": "Experiment",
                    "comment": "See dataset.json for available identifiers.",
                    "title": "Dataset",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional datasets",
                "description": "List of datasets to be associated with the series."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "target": {
                "items": {
                    "linkTo": "Target",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Target",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "biosample_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term id",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "treatment_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Treatment term name",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "biosample_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term name",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "biosample_type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample type",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            },
            "revoked_datasets": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked datasets",
                "type": "array"
            }
        },
        "facets": {
            "assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Series status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "string"
            },
            "treatment_term_name": {
                "title": "Biosample treatment",
                "type": "string"
            },
            "related_datasets.files.analysis_step_version.analysis_step.pipelines.title": {
                "title": "Pipeline",
                "type": "string"
            },
            "related_datasets.files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "related_datsets.files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "related_datasets.files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "related_datasets.replicates.library.size_range": {
                "title": "Library insert size (nt)",
                "type": "string"
            },
            "related_datasets.replicates.library.nucleic_acid_term_name": {
                "title": "Library made from",
                "type": "string"
            },
            "related_datasets.replicates.library.depleted_in_term_name": {
                "title": "Library depleted in",
                "type": "string"
            },
            "related_datasets.replicates.library.treatments.treatment_term_name": {
                "title": "Library treatment",
                "type": "array"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Biosample term name",
                "type": "string"
            },
            "related_datasets.assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "related_datasets.target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.replicates.antibody.accession": {
                "title": "Linked Antibody",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.organism.scientific_name": {
                "title": "Species",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.age_display": {
                "title": "Age display",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Treatment",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_id": {
                "title": "Term ID",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration": {
                "title": "Concentration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration_units": {
                "title": "Concentration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.duration": {
                "title": "Duration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.duration_units": {
                "title": "Duration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.synchronization": {
                "title": "Synchronization",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time": {
                "title": "Post-synchronization time",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time_units": {
                "title": "Post-synchronization time units",
                "type": "string"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "related_datasets.assay_term_name": 1,
            "related_datasets.assay_term_id": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "related_datasets.biosample_term_id": 1,
            "related_datasets.biosample_term_name": 1,
            "related_datasets.biosample_type": 1,
            "related_datasets.organ_slims": 1,
            "related_datasets.developmental_slims": 1,
            "related_datasets.assay_synonyms": 1,
            "related_datasets.biosample_synonyms": 1,
            "files.accession": 1,
            "files.alternate_accessions": 1,
            "files.file_format": 1,
            "files.output_type": 1,
            "files.md5sum": 1,
            "related_datasets.replicates.library.accession": 1,
            "related_datasets.replicates.library.alternate_accessions": 1,
            "related_datasets.replicates.library.aliases": 1,
            "related_datasets.replicates.library.biosample.accession": 1,
            "related_datasets.replicates.library.biosample.alternate_accessions": 1,
            "related_datasets.replicates.library.biosample.aliases": 1,
            "related_datasets.replicates.library.biosample.subcellular_fraction_term_name": 1,
            "related_datasets.replicates.library.biosample.donor.accession": 1,
            "related_datasets.replicates.library.biosample.donor.alternate_accessions": 1,
            "related_datasets.replicates.antibody.accession": 1,
            "related_datasets.replicates.antibody.alternate_accessions": 1,
            "related_datasets.replicates.antibody.lot_id": 1,
            "related_datasets.replicates.antibody.lot_id_alias": 1,
            "related_datasets.replicates.antibody.clonality": 1,
            "related_datasets.replicates.antibody.isotype": 1,
            "related_datasets.replicates.antibody.purifications": 1,
            "related_datasets.replicates.antibody.product_id": 1,
            "related_datasets.replicates.antibody.aliases": 1,
            "related_datasets.replicates.antibody.dbxrefs": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "related_datasets.possible_controls.accession": 1,
            "related_datasets.possible_controls.alternate_accessions": 1,
            "target.aliases": 1,
            "target.gene_name": 1,
            "target.label": 1,
            "target.dbxref": 1,
            "target.organism.name": 1,
            "target.organism.scientific_name": 1,
            "references.title": 1,
            "related_datasets.replicates.library.biosample.rnais.product_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "SamtoolsStatsQualityMetric": {
        "description": "Schema for reporting 'samtools --stats' summary as a quality metric",
        "id": "/profiles/samtools_stats_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "1st fragments": {
                "description": "samtools --stats: 1st fragments",
                "type": "number"
            },
            "average length": {
                "description": "samtools --stats: average length",
                "type": "number"
            },
            "average quality": {
                "description": "samtools --stats: average quality",
                "type": "number"
            },
            "bases duplicated": {
                "description": "samtools --stats: bases duplicated",
                "type": "number"
            },
            "bases mapped": {
                "description": "samtools --stats: bases mapped",
                "type": "number"
            },
            "bases mapped (cigar)": {
                "description": "samtools --stats: bases mapped (cigar)",
                "type": "number"
            },
            "bases trimmed": {
                "description": "samtools --stats: bases trimmed",
                "type": "number"
            },
            "error rate": {
                "description": "samtools --stats: error rate",
                "type": "number"
            },
            "filtered sequences": {
                "description": "samtools --stats: filtered sequences",
                "type": "number"
            },
            "insert size average": {
                "description": "samtools --stats: insert size - average",
                "type": "number"
            },
            "insert size standard deviation": {
                "description": "samtools --stats: insert size - standard deviation",
                "type": "number"
            },
            "inward oriented pairs": {
                "description": "samtools --stats: inward oriented pairs",
                "type": "number"
            },
            "is sorted": {
                "description": "samtools --stats: is sorted",
                "type": "number"
            },
            "last fragments": {
                "description": "samtools --stats: last fragments",
                "type": "number"
            },
            "maximum length": {
                "description": "samtools --stats: maximum length",
                "type": "number"
            },
            "mismatches": {
                "description": "samtools --stats: mismatches",
                "type": "number"
            },
            "non-primary alignments": {
                "description": "samtools --stats: non-primary alignments",
                "type": "number"
            },
            "outward oriented pairs": {
                "description": "samtools --stats: outward oriented pairs",
                "type": "number"
            },
            "pairs on different chromosomes": {
                "description": "samtools --stats: pairs on different chromosomes",
                "type": "number"
            },
            "pairs with other orientation": {
                "description": "samtools --stats: pairs with other orientation",
                "type": "number"
            },
            "raw total sequences": {
                "description": "samtools --stats: raw total sequences",
                "type": "number"
            },
            "reads MQ0": {
                "description": "samtools --stats: reads MQ0",
                "type": "number"
            },
            "reads QC failed": {
                "description": "samtools --stats: reads QC failed",
                "type": "number"
            },
            "reads duplicated": {
                "description": "samtools --stats: reads duplicated",
                "type": "number"
            },
            "reads mapped": {
                "description": "samtools --stats: reads mapped",
                "type": "number"
            },
            "reads mapped and paired": {
                "description": "samtools --stats: reads mapped and paired",
                "type": "number"
            },
            "reads paired": {
                "description": "samtools --stats: reads paired",
                "type": "number"
            },
            "reads properly paired": {
                "description": "samtools --stats: reads properly paired",
                "type": "number"
            },
            "reads unmapped": {
                "description": "samtools --stats: reads unmapped",
                "type": "number"
            },
            "sequences": {
                "description": "samtools --stats: sequences",
                "type": "number"
            },
            "total length": {
                "description": "samtools --stats: total length",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/samtools_stats_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "AnalysisStep": {
        "title": "Analysis step",
        "description": "Schema for submitting a computational analysis steps as a subobject of pipeline that transforms input files to output files.",
        "id": "/profiles/analysis_step.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "name",
            "title",
            "analysis_step_types",
            "input_file_types"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid",
            "aliases",
            "name"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "4",
                "title": "Schema Version",
                "type": "string"
            },
            "name": {
                "comment": "Unique for each parent analysis_step, using a naming system where the pipeline, software used, the purpose and the version of the step is described: rampage-grit-peak-calling-step-v-1",
                "pattern": "^[a-z0-9\\-\\_]+$",
                "uniqueKey": true,
                "description": "Unique name of the analysis step",
                "title": "Name",
                "type": "string"
            },
            "title": {
                "type": "string",
                "title": "Title",
                "description": "The preferred viewable name of the analysis step, likely the same as the name."
            },
            "analysis_step_types": {
                "items": {
                    "title": "Type",
                    "type": "string",
                    "enum": [
                        "pooling",
                        "depth normalization",
                        "signal normalization",
                        "genome indexing",
                        "genome segmentation",
                        "fastq concatenation",
                        "filtering",
                        "file format conversion",
                        "QA calculation",
                        "peak calling",
                        "IDR",
                        "alignment",
                        "replicate concordance",
                        "signal generation",
                        "quantification",
                        "transcript identification",
                        "open chromatin region identification",
                        "transcriptome assembly",
                        "variant annotation",
                        "read trimming",
                        "interaction calling"
                    ]
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Types",
                "description": "The classification of the software"
            },
            "input_file_types": {
                "items": {
                    "title": "Input file type",
                    "description": "A file type used as input for the analysis.",
                    "type": "string",
                    "enum": [
                        "idat green channel",
                        "idat red channel",
                        "reads",
                        "raw data",
                        "intensity values",
                        "reporter code counts",
                        "alignments",
                        "unfiltered alignments",
                        "transcriptome alignments",
                        "minus strand signal of all reads",
                        "plus strand signal of all reads",
                        "signal of all reads",
                        "normalized signal of all reads",
                        "raw minus strand signal",
                        "raw plus strand signal",
                        "raw signal",
                        "raw normalized signal",
                        "read-depth normalized signal",
                        "control normalized signal",
                        "minus strand signal of unique reads",
                        "plus strand signal of unique reads",
                        "signal of unique reads",
                        "microRNA quantifications",
                        "exon quantifications",
                        "gene quantifications",
                        "transcript quantifications",
                        "library fraction",
                        "methylation state at CpG",
                        "methylation state at CHG",
                        "methylation state at CHH",
                        "enrichment",
                        "replication timing profile",
                        "hotspots",
                        "long range chromatin interactions",
                        "peaks",
                        "RNA-binding protein associated mRNAs",
                        "splice junctions",
                        "transcription start sites",
                        "predicted enhancers",
                        "predicted forebrain enhancers",
                        "predicted heart enhancers",
                        "predicted wholebrain enhancers",
                        "candidate regulatory elements",
                        "genome reference",
                        "genome index",
                        "female genome reference",
                        "female genome index",
                        "male genome reference",
                        "male genome index",
                        "spike-in sequence",
                        "reference genes",
                        "reference variants",
                        "variant calls",
                        "blacklisted regions",
                        "predicted transcription start sites",
                        "optimal idr thresholded peaks",
                        "conservative idr thresholded peaks",
                        "signal p-value",
                        "fold change over control",
                        "replicated peaks",
                        "bed"
                    ]
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Input file types",
                "description": "The file types used as input for the analysis."
            },
            "output_file_types": {
                "items": {
                    "title": "Output file type",
                    "description": "A file type generated as output for the analysis.",
                    "type": "string",
                    "enum": [
                        "idat green channel",
                        "idat red channel",
                        "reads",
                        "intensity values",
                        "reporter code counts",
                        "unfiltered alignments",
                        "alignments",
                        "transcriptome alignments",
                        "minus strand signal of all reads",
                        "plus strand signal of all reads",
                        "signal of all reads",
                        "normalized signal of all reads",
                        "raw minus strand signal",
                        "raw plus strand signal",
                        "raw signal",
                        "raw normalized signal",
                        "read-depth normalized signal",
                        "control normalized signal",
                        "minus strand signal of unique reads",
                        "plus strand signal of unique reads",
                        "signal of unique reads",
                        "exon quantifications",
                        "gene quantifications",
                        "transcript quantifications",
                        "microRNA quantifications",
                        "library fraction",
                        "methylation state at CpG",
                        "methylation state at CHG",
                        "methylation state at CHH",
                        "enrichment",
                        "replication timing profile",
                        "hotspots",
                        "long range chromatin interactions",
                        "open chromatin regions",
                        "peaks",
                        "RNA-binding protein associated mRNAs",
                        "splice junctions",
                        "transcription start sites",
                        "predicted enhancers",
                        "predicted forebrain enhancers",
                        "predicted heart enhancers",
                        "predicted wholebrain enhancers",
                        "candidate regulatory elements",
                        "genome reference",
                        "genome index",
                        "female genome reference",
                        "female genome index",
                        "male genome reference",
                        "male genome index",
                        "spike-in sequence",
                        "reference genes",
                        "reference variants",
                        "variant calls",
                        "blacklisted regions",
                        "predicted transcription start sites",
                        "optimal idr thresholded peaks",
                        "conservative idr thresholded peaks",
                        "signal p-value",
                        "fold change over control",
                        "replicated peaks",
                        "bigBed"
                    ]
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Output file types",
                "description": "The file types generated as output for the analysis."
            },
            "qa_stats_generated": {
                "items": {
                    "title": "QA statistic",
                    "description": "A QA statistic generated by the analysis.",
                    "type": "string"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "QA statistics",
                "description": "The QA statistics generated by the analysis."
            },
            "parents": {
                "items": {
                    "description": "A precusor step.",
                    "comment": "See analysis_step.json for available identifiers.",
                    "type": "string",
                    "linkTo": "AnalysisStep"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Parents",
                "description": "The precursor steps."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "pipelines": {
                "items": {
                    "linkTo": "Pipeline",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Pipelines",
                "type": "array"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "versions": {
                "items": {
                    "linkTo": "AnalysisStepVersion",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Versions",
                "type": "array"
            },
            "current_version": {
                "type": "string",
                "title": "Current version",
                "calculatedProperty": true,
                "linkTo": "AnalysisStepVersion"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Biosample": {
        "title": "Biosample",
        "description": "Schema for submitting a biosample.",
        "id": "/profiles/biosample.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "biosample_type",
            "source",
            "organism",
            "biosample_term_id"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/biosample_classification"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/accessioned_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/product_id"
            },
            {
                "$ref": "mixins.json#/lot_id"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/submitter_comment"
            }
        ],
        "dependencies": {
            "transfection_method": [
                "transfection_type"
            ],
            "depleted_in_term_name": [
                "depleted_in_term_id"
            ],
            "post_synchronization_time_units": [
                "post_synchronization_time"
            ],
            "post_synchronization_time": [
                "post_synchronization_time_units"
            ],
            "depleted_in_term_id": {
                "required": [
                    "depleted_in_term_name"
                ],
                "properties": {
                    "biosample_type": {
                        "enum": [
                            "whole organisms",
                            "tissue"
                        ]
                    }
                }
            },
            "biosample_type": {
                "not": {
                    "properties": {
                        "biosample_type": {
                            "enum": [
                                "whole organisms"
                            ]
                        },
                        "organism": {
                            "linkTo": "Organism",
                            "linkEnum": [
                                "7745b647-ff15-4ff3-9ced-b897d4e2983c"
                            ]
                        }
                    }
                }
            },
            "fly_life_stage": {
                "properties": {
                    "organism": {
                        "linkTo": "Organism",
                        "linkEnum": [
                            "ab546d43-8e2a-4567-8db7-a217e6d6eea0",
                            "5be68469-94ba-4d60-b361-dde8958399ca",
                            "74144f1f-f3a6-42b9-abfd-186a1ca93198",
                            "c3cc08b7-7814-4cae-a363-a16b76883e3f",
                            "d1072fd2-8374-4f9b-85ce-8bc2c61de122",
                            "b9ce90a4-b791-40e9-9b4d-ffb1c6a5aa2b",
                            "0bdd955a-57f0-4e4b-b93d-6dd1df9b766c"
                        ]
                    }
                }
            },
            "fly_synchronization_stage": {
                "properties": {
                    "organism": {
                        "linkTo": "Organism",
                        "linkEnum": [
                            "ab546d43-8e2a-4567-8db7-a217e6d6eea0",
                            "5be68469-94ba-4d60-b361-dde8958399ca",
                            "74144f1f-f3a6-42b9-abfd-186a1ca93198",
                            "c3cc08b7-7814-4cae-a363-a16b76883e3f",
                            "d1072fd2-8374-4f9b-85ce-8bc2c61de122",
                            "b9ce90a4-b791-40e9-9b4d-ffb1c6a5aa2b",
                            "0bdd955a-57f0-4e4b-b93d-6dd1df9b766c"
                        ]
                    }
                }
            },
            "worm_synchronization_stage": {
                "properties": {
                    "organism": {
                        "linkTo": "Organism",
                        "linkEnum": [
                            "2732dfd9-4fe6-4fd2-9d88-61b7c58cbe20",
                            "e3ec4c1b-a203-4fe7-a013-96c2d45ab242",
                            "69efae2b-4df5-4957-81da-346f1b93cb98",
                            "a7e711b9-534c-44a3-a782-2a15af620739",
                            "451f9e49-685d-40d5-ad89-760b2512262a"
                        ]
                    }
                }
            },
            "worm_life_stage": {
                "properties": {
                    "organism": {
                        "linkTo": "Organism",
                        "linkEnum": [
                            "2732dfd9-4fe6-4fd2-9d88-61b7c58cbe20",
                            "e3ec4c1b-a203-4fe7-a013-96c2d45ab242",
                            "69efae2b-4df5-4957-81da-346f1b93cb98",
                            "a7e711b9-534c-44a3-a782-2a15af620739",
                            "451f9e49-685d-40d5-ad89-760b2512262a"
                        ]
                    }
                }
            },
            "mouse_life_stage": {
                "properties": {
                    "organism": {
                        "linkTo": "Organism",
                        "linkEnum": [
                            "3413218c-3d86-498b-a0a2-9a406638e786"
                        ]
                    }
                }
            }
        },
        "properties": {
            "submitter_comment": {
                "description": "Additional information specified by the submitter to be displayed as a comment on the portal.",
                "title": "Submitter comment",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The originating lab or vendor.",
                "linkTo": "Source"
            },
            "lot_id": {
                "description": "The lot identifier provided by the originating lab or vendor.",
                "title": "Lot ID",
                "type": "string"
            },
            "product_id": {
                "description": "The product identifier provided by the originating lab or vendor.",
                "title": "Product ID",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released",
                    "revoked",
                    "preliminary",
                    "proposed"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "biosample_term_name": {
                "description": "Ontology term describing biosample.",
                "title": "Ontology term",
                "type": "string"
            },
            "biosample_term_id": {
                "comment": "NTR is a new term request identifier provided by the DCC.",
                "@type": "@id",
                "pattern": "^(UBERON|EFO|CL|NTR|FBbt|WBbt):[0-9]{2,8}$",
                "type": "string",
                "title": "Ontology ID",
                "description": "Ontology identifier describing biosample."
            },
            "biosample_type": {
                "enum": [
                    "primary cell",
                    "immortalized cell line",
                    "tissue",
                    "in vitro differentiated cells",
                    "induced pluripotent stem cell line",
                    "whole organisms",
                    "stem cell"
                ],
                "description": "The categorization of the biosample.",
                "title": "Biosample type",
                "type": "string"
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "BS",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "12",
                "title": "Schema Version",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "title": "Field mapping index type",
                    "description": "Defines one of three types of indexing available",
                    "type": "string",
                    "default": "analyzed",
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ]
                },
                "type": "string",
                "title": "Description",
                "default": "",
                "description": "A plain text description of the biosample. Do not include experiment details, constructs or treatments."
            },
            "constructs": {
                "items": {
                    "title": "DNA Constructs",
                    "description": "An expression or targeting vector stably or transiently transfected (not RNAi).",
                    "comment": "See contstruct.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Construct"
                },
                "uniqueItems": true,
                "default": [],
                "title": "DNA constructs",
                "description": "Expression or targeting vectors stably or transiently transfected (not RNAi or TALEN).",
                "type": "array"
            },
            "rnais": {
                "items": {
                    "title": "RNAi Vector",
                    "description": "RNAi vector stably or transiently transfected.",
                    "comment": "See rnai.json for available identifiers.",
                    "type": "string",
                    "linkTo": "RNAi"
                },
                "uniqueItems": true,
                "default": [],
                "title": "RNAi vectors",
                "description": "RNAi vectors stably or transiently transfected.",
                "type": "array"
            },
            "talens": {
                "items": {
                    "title": "TALEN",
                    "description": "TALEN used to modify the biosample",
                    "comment": "See talen.json for valid identifiers.",
                    "type": "string",
                    "linkTo": "TALEN"
                },
                "uniqueItems": true,
                "default": [],
                "title": "TALEN constructs",
                "description": "TALEN constructs used to modify the biosample",
                "type": "array"
            },
            "treatments": {
                "items": {
                    "title": "Treatment",
                    "comment": "See treatment.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Treatment"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Treatments",
                "type": "array"
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^((UCSC-ENCODE-cv:[\\S\\s\\d\\-\\(\\)\\+]+)|(GTEx:[a-zA-Z0-9\\-_]+)|(GEO:SAMN\\d+)|(Cellosaurus:CVCL_\\w{4}))$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "protocol_documents": {
                "items": {
                    "title": "Protocol document",
                    "description": "A document that describes the biosample preparation.",
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Document"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Protocol documents",
                "description": "Documents that describe the biosample preparation.",
                "type": "array"
            },
            "donor": {
                "linkTo": "Donor",
                "comment": "For human biosamples, see human_donor.json for available identifiers. For mouse biosamples, see mouse_donor.json for available identifiers.",
                "title": "Donor",
                "type": "string"
            },
            "organism": {
                "linkTo": "Organism",
                "comment": "See organism.json for available identifiers.",
                "title": "Organism",
                "type": "string"
            },
            "passage_number": {
                "type": "integer",
                "title": "Passage number",
                "description": "In calculating passage number, include passages from the source."
            },
            "depleted_in_term_name": {
                "items": {
                    "type": "string",
                    "enum": [
                        "head",
                        "limb",
                        "salivary gland",
                        "male accessory sex gland",
                        "testis",
                        "female gonad",
                        "digestive system",
                        "arthropod fat body",
                        "antenna",
                        "adult maxillary segment",
                        "female reproductive system",
                        "male reproductive system"
                    ]
                },
                "description": "UBERON (Uber Anatomy Ontology) term best matching the tissue(s)/body part(s) that were removed from the biosample.",
                "title": "Depleted in term",
                "type": "array"
            },
            "depleted_in_term_id": {
                "items": {
                    "type": "string",
                    "enum": [
                        "UBERON:0000033",
                        "UBERON:0002101",
                        "UBERON:0001044",
                        "UBERON:0010147",
                        "UBERON:0000473",
                        "UBERON:0000992",
                        "UBERON:0001007",
                        "UBERON:0003917",
                        "UBERON:0000972",
                        "FBbt:00003016",
                        "UBERON:0000474",
                        "UBERON:0000079"
                    ]
                },
                "comment": "Based on the choice in depleted_in_term_name use the following guide: head - UBERON:0000033, limb - UBERON:0002101, salivary gland - UBERON:0001044 , male accessory sex gland - UBERON:0010147, testis - UBERON:0000473, female gonad - UBERON:0000992, digestive system - UBERON:0001007, arthropod fat body - UBERON:0003917, antenna - UBERON:0000972, adult maxillary segmant - FBbt:00003016",
                "@type": "@id",
                "description": "UBERON (Uber Anatomy Ontology) identifier best matching the tissue(s)/body part(s) that were removed from the biosample.",
                "title": "Depleted in ID",
                "type": "array"
            },
            "model_organism_mating_status": {
                "enum": [
                    "mated",
                    "virgin",
                    "sterile",
                    "mixed"
                ],
                "type": "string",
                "title": "Mating status",
                "description": "The mating status of the animal."
            },
            "derived_from": {
                "linkTo": "Biosample",
                "type": "string",
                "comment": "See biosample.json for available identifiers.",
                "title": "Derived from",
                "description": "A biosample that the sample derives from via a construct or treatment."
            },
            "pooled_from": {
                "items": {
                    "description": "A biosample from which an aliquot was taken to form the biosample.",
                    "comment": "See biosample.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Biosample"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Pooled from",
                "description": "The biosamples from which aliquots were pooled to form the biosample.",
                "type": "array"
            },
            "part_of": {
                "linkTo": "Biosample",
                "type": "string",
                "comment": "See biosamples.json for available identifiers.",
                "title": "Separated from",
                "description": "A biosample from which a discrete component was taken. That component is this biosample."
            },
            "note": {
                "type": "string",
                "title": "Note",
                "description": "Additional information pertaining to the biosample."
            },
            "subcellular_fraction_term_name": {
                "enum": [
                    "nucleus",
                    "cytosol",
                    "chromatin",
                    "membrane",
                    "mitochondria",
                    "nuclear matrix",
                    "nucleolus",
                    "nucleoplasm",
                    "polysome",
                    "insoluble cytoplasmic fraction"
                ],
                "type": "string",
                "title": "Subcellular fraction name",
                "description": "The GO (Gene Ontology) term name for cellular component that constitutes the biosample."
            },
            "subcellular_fraction_term_id": {
                "enum": [
                    "GO:0005634",
                    "GO:0005829",
                    "GO:0000785",
                    "GO:0016020",
                    "GO:0005739",
                    "GO:0016363",
                    "GO:0005730",
                    "GO:0005654",
                    "GO:0005844",
                    "NTR:0002594"
                ],
                "comment": "Based on the choice in subcellular_fraction_term_name use the following guide: nucleus - GO:0005634, cytosol - GO:0005829, chromatin - GO:0000785, membrane - GO:0016020, mitochondria - GO:0005739, nuclear matrix - GO:0016363, nucleolus - GO:0005730, nucleoplasm - GO:0005654, polysome - GO:0005844.",
                "@type": "@id",
                "description": "The GO (Gene Ontology) identifier for cellular component that constitutes the biosample.",
                "title": "Subcellular fraction ID",
                "type": "string"
            },
            "phase": {
                "enum": [
                    "G1",
                    "G1b",
                    "G2",
                    "S1",
                    "S2",
                    "S3",
                    "S4"
                ],
                "title": "Cell-cycle phase",
                "type": "string"
            },
            "transfection_type": {
                "enum": [
                    "stable",
                    "transient"
                ],
                "type": "string",
                "title": "Transfection type",
                "description": "The persistence of the transfection construct."
            },
            "transfection_method": {
                "enum": [
                    "electroporation",
                    "transduction",
                    "chemical"
                ],
                "type": "string",
                "title": "Transfection method",
                "description": "How the transfection was performed on the biosample to introduce the contruct or RNAi."
            },
            "culture_harvest_date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "type": "string",
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM.",
                "title": "Culture harvest date",
                "description": "For cultured samples, the date the biosample was taken."
            },
            "culture_start_date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "type": "string",
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD ((TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Culture start date",
                "description": "For cultured samples, the date the culture was started. For cell lines, the date this particular growth was started, not the date the line was established."
            },
            "date_obtained": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "type": "string",
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Date obtained",
                "description": "For tissue samples, the date the biosample was taken."
            },
            "starting_amount": {
                "comment": "The pattern is only enforced when the value supplied is a string.",
                "pattern": "^unknown$",
                "description": "The initial quantity of cells or tissue obtained.",
                "title": "Starting amount",
                "minimum": 0,
                "type": [
                    "number",
                    "string"
                ]
            },
            "starting_amount_units": {
                "enum": [
                    "g",
                    "mg",
                    "cells/ml",
                    "cells",
                    "whole embryos",
                    "items",
                    "μg",
                    "whole animals"
                ],
                "title": "Starting amount units",
                "type": "string"
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the biosample."
            },
            "model_organism_sex": {
                "enum": [
                    "male",
                    "female",
                    "unknown",
                    "mixed",
                    "hermaphrodite"
                ],
                "comment": "model_organism_sex is not valid for a human biosample.",
                "title": "Model organism sex",
                "type": "string"
            },
            "mouse_life_stage": {
                "enum": [
                    "adult",
                    "unknown",
                    "embryonic",
                    "postnatal"
                ],
                "comment": "mouse_life_stage is not valid for a human biosample.",
                "title": "Mouse life stage",
                "type": "string"
            },
            "fly_life_stage": {
                "enum": [
                    "embryonic",
                    "larva",
                    "first instar larva",
                    "second instar larva",
                    "third instar larva",
                    "wandering third instar larva",
                    "prepupa",
                    "pupa",
                    "adult"
                ],
                "comment": "fly_life_stage is not valid for a human biosample.",
                "title": "Fly life stage",
                "type": "string"
            },
            "fly_synchronization_stage": {
                "enum": [
                    "fertilization",
                    "egg laying",
                    "first larval molt",
                    "second larval molt",
                    "puff stage: PS (1-2), dark blue gut",
                    "puff stage: PS (3-6), light blue gut",
                    "puff stage: PS (7-9), clear gut",
                    "white prepupa",
                    "eclosion"
                ],
                "comment": "Stage at which flies were synchronized. Use in conjunction with time and time units post-synchronization.",
                "title": "Fly synchronization stage",
                "type": "string"
            },
            "post_synchronization_time": {
                "comment": "Use in conjunction with fly_sychronization_stage or worm_synchronization_stage to specify time elapsed post-synchronization.",
                "title": "Post-synchronization time",
                "pattern": "^(\\d+(\\.[1-9])?(\\-\\d+(\\.[1-9])?)?)|(unknown)$",
                "type": "string"
            },
            "post_synchronization_time_units": {
                "enum": [
                    "minute",
                    "hour",
                    "day",
                    "week",
                    "month",
                    "stage"
                ],
                "comment": "Use in conjunction with post_synchronization_time to specify time elapsed post-synchronization.",
                "title": "Post-synchronization time units",
                "type": "string"
            },
            "worm_life_stage": {
                "enum": [
                    "early embryonic",
                    "midembryonic",
                    "late embryonic",
                    "mixed stage (embryonic)",
                    "mixed stage (late embryonic and L1 larva)",
                    "L1 larva",
                    "L2 larva",
                    "L2d larva",
                    "L3 larva",
                    "L4 larva",
                    "dauer",
                    "L4/young adult",
                    "young adult",
                    "adult"
                ],
                "comment": "worm_life_stage is not valid for a human biosample.",
                "title": "Worm life stage",
                "type": "string"
            },
            "worm_synchronization_stage": {
                "enum": [
                    "fertilization",
                    "egg laying",
                    "egg bleaching",
                    "4 cell",
                    "L1 larva starved after bleaching",
                    "dauer exit"
                ],
                "comment": "Stage at which worms were synchronized. Use in conjunction with time and time units post-synchronization.",
                "title": "Worm synchronization stage",
                "type": "string"
            },
            "model_organism_age": {
                "comment": "model_organism_age is not valid for a human biosample.",
                "type": "string",
                "title": "Model organism donor age",
                "pattern": "^((\\d+(\\.\\d+)?(\\-\\d+(\\.\\d+)?)?)|(unknown))$",
                "description": " The age or age range of the model donor organism when biological material was sampled."
            },
            "model_organism_age_units": {
                "enum": [
                    "minute",
                    "hour",
                    "day",
                    "week",
                    "month",
                    "year",
                    "stage"
                ],
                "comment": "model_organism_age_units are not valid for a human biosample.",
                "title": "Model organism donor age units",
                "type": "string"
            },
            "model_organism_health_status": {
                "comment": "model_organism_halth_status is not valid for a human biosample.",
                "title": "Model organism donor health status",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "age": {
                "calculatedProperty": true,
                "title": "Age",
                "type": "string"
            },
            "characterizations": {
                "items": {
                    "linkFrom": "BiosampleCharacterization.characterizes",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Characterizations",
                "type": "array"
            },
            "health_status": {
                "calculatedProperty": true,
                "title": "Health status",
                "type": "string"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "model_organism_donor_constructs": {
                "items": {
                    "linkTo": "Construct",
                    "type": "string",
                    "comment": "See contstruct.json for available identifiers.",
                    "title": "DNA Constructs",
                    "description": "An expression or targeting vector stably or transiently transfected (not RNAi) into a donor organism."
                },
                "description": "Expression or targeting vectors stably or transiently transfected (not RNAi) into a donor organism.",
                "title": "DNA constructs",
                "calculatedProperty": true,
                "type": "array"
            },
            "age_units": {
                "calculatedProperty": true,
                "title": "Age units",
                "type": "string"
            },
            "age_display": {
                "calculatedProperty": true,
                "title": "Age",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "life_stage": {
                "calculatedProperty": true,
                "title": "Life stage",
                "type": "string"
            },
            "sex": {
                "calculatedProperty": true,
                "title": "Sex",
                "type": "string"
            },
            "parent_of": {
                "items": {
                    "linkFrom": "Biosample.part_of",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Child biosamples",
                "type": "array"
            },
            "summary": {
                "calculatedProperty": true,
                "title": "Summary",
                "type": "string"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "synchronization": {
                "calculatedProperty": true,
                "title": "Synchronization",
                "type": "string"
            }
        },
        "facets": {
            "organism.scientific_name": {
                "title": "Organism"
            },
            "status": {
                "title": "Biosample status"
            },
            "biosample_type": {
                "title": "Biosample type"
            },
            "organ_slims": {
                "title": "Organ"
            },
            "sex": {
                "title": "Sex"
            },
            "life_stage": {
                "title": "Life stage"
            },
            "subcellular_fraction_term_name": {
                "title": "Subcellular fraction"
            },
            "phase": {
                "title": "Cell cycle phase"
            },
            "treatments.treatment_term_name": {
                "title": "Biosample treatment"
            },
            "transfection_type": {
                "title": "Transfection type"
            },
            "transfection_method": {
                "title": "Transfection method"
            },
            "source.title": {
                "title": "Source"
            },
            "lab.title": {
                "title": "Lab"
            },
            "award.project": {
                "title": "Project"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession"
            },
            "description": {
                "title": "Description"
            },
            "age": {
                "title": "Age"
            },
            "age_units": {
                "title": "Age Units"
            },
            "biosample_term_name": {
                "title": "Term"
            },
            "biosample_type": {
                "title": "Type"
            },
            "synchronization": {
                "title": "Synchronization"
            },
            "post_synchronization_time": {
                "title": "Post-synchronization time"
            },
            "post_synchronization_time_units": {
                "title": "Post-synchronization time units"
            },
            "organism.scientific_name": {
                "title": "Species"
            },
            "source.title": {
                "title": "Source"
            },
            "lab.title": {
                "title": "Submitter"
            },
            "life_stage": {
                "title": "Life stage"
            },
            "status": {
                "title": "Status"
            },
            "rnais.target.label": {
                "title": "RNAi target"
            },
            "treatments.treatment_term_name": {
                "title": "Treatment"
            },
            "constructs.target.label": {
                "title": "Construct"
            },
            "culture_harvest_date": {
                "title": "Culture harvest date"
            },
            "date_obtained": {
                "title": "Date obtained"
            },
            "model_organism_donor_constructs.target.label": {
                "title": "Constructs"
            },
            "donor.mutated_gene.label": {
                "title": "Mutated gene"
            },
            "treatments.length": {
                "title": "Treatments length"
            },
            "constructs.length": {
                "title": "Constructs"
            },
            "summary": {
                "title": "Summary"
            }
        },
        "boost_values": {
            "accession": 1,
            "aliases": 1,
            "alternate_accessions": 1,
            "biosample_term_id": 1,
            "biosample_term_name": 1,
            "organ_slims": 1,
            "developmental_slims": 1,
            "biosample_synonyms": 1,
            "dbxrefs": 1,
            "subcellular_fraction_term_name": 1,
            "phase": 2,
            "life_stage": 1,
            "synchronization": 1,
            "health_status": 1,
            "donor.accession": 1,
            "donor.alternate_accessions": 1,
            "donor.organism.name": 1,
            "donor.organism.scientific_name": 1,
            "donor.organism.taxon_id": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "source.title": 1,
            "treatments.treatment_type": 1,
            "treatments.treatment_term_id": 1,
            "treatments.treatment_term_name": 1,
            "treatments.dbxrefs": 1,
            "treatments.aliases": 1,
            "constructs.construct_type": 1,
            "constructs.vector_backbone_name": 1,
            "constructs.target.gene_name": 1,
            "constructs.target.label": 1,
            "constructs.target.dbxref": 1,
            "constructs.target.aliases": 1,
            "derived_from.accession": 1,
            "derived_from.alternate_accessions": 1,
            "derived_from.biosample_term_id": 1,
            "derived_from.biosample_term_name": 1,
            "pooled_from.accession": 1,
            "pooled_from.alternate_accessions": 1,
            "pooled_from.biosample_term_id": 1,
            "pooled_from.biosample_term_name": 1,
            "characterizations.characterization_method": 1,
            "rnais.rnai_type": 1,
            "rnais.vector_backbone_name": 1,
            "rnais.target.organism.name": 1,
            "rnais.target.organism.scientific_name": 1,
            "rnais.target.organism.taxon_id": 1,
            "rnais.source.title": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "references.title": 1,
            "rnais.product_id": 1,
            "rnais.target.label": 1,
            "rnais.target.aliases": 1,
            "award.pi.title": 1,
            "notes": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "TreatmentTimeSeries": {
        "title": "Treatment time series",
        "description": "Schema for submitting metadata for a treatment time series.",
        "id": "/profiles/treatment_time_series.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "series.json#/properties"
            },
            {
                "$ref": "mixins.json#/submitter_comment"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "submitter_comment": {
                "description": "Additional information specified by the submitter to be displayed as a comment on the portal.",
                "title": "Submitter comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_datasets": {
                "items": {
                    "linkTo": "Experiment",
                    "comment": "See dataset.json for available identifiers.",
                    "title": "Dataset",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional datasets",
                "description": "List of datasets to be associated with the series."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "target": {
                "items": {
                    "linkTo": "Target",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Target",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "biosample_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term id",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "treatment_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Treatment term name",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "biosample_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term name",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "biosample_type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample type",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            },
            "revoked_datasets": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked datasets",
                "type": "array"
            }
        },
        "facets": {
            "assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Series status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "biosample_type": {
                "title": "Biosample type",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "string"
            },
            "treatment_term_name": {
                "title": "Biosample treatment",
                "type": "string"
            },
            "related_datasets.files.analysis_step_version.analysis_step.pipelines.title": {
                "title": "Pipeline",
                "type": "string"
            },
            "related_datasets.files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "related_datsets.files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "related_datasets.files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "related_datasets.replicates.library.size_range": {
                "title": "Library insert size (nt)",
                "type": "string"
            },
            "related_datasets.replicates.library.nucleic_acid_term_name": {
                "title": "Library made from",
                "type": "string"
            },
            "related_datasets.replicates.library.depleted_in_term_name": {
                "title": "Library depleted in",
                "type": "string"
            },
            "related_datasets.replicates.library.treatments.treatment_term_name": {
                "title": "Library treatment",
                "type": "array"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism scientific name",
                "type": "string"
            },
            "related_datasets.target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Biosample term name",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.replicates.antibody.accession": {
                "title": "Linked Antibody",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.organism.scientific_name": {
                "title": "Species",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.age_display": {
                "title": "Age display",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Treatment",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_id": {
                "title": "Term ID",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration": {
                "title": "Concentration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration_units": {
                "title": "Concentration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.duration": {
                "title": "Duration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.duration_units": {
                "title": "Duration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.synchronization": {
                "title": "Synchronization",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time": {
                "title": "Post-synchronization time",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time_units": {
                "title": "Post-synchronization time units",
                "type": "string"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "related_datasets.assay_term_name": 1,
            "related_datasets.assay_term_id": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "related_datasets.biosample_term_id": 1,
            "related_datasets.biosample_term_name": 1,
            "related_datasets.biosample_type": 1,
            "related_datasets.organ_slims": 1,
            "related_datasets.developmental_slims": 1,
            "related_datasets.assay_synonyms": 1,
            "related_datasets.biosample_synonyms": 1,
            "files.accession": 1,
            "files.alternate_accessions": 1,
            "files.file_format": 1,
            "files.output_type": 1,
            "files.md5sum": 1,
            "related_datasets.replicates.library.accession": 1,
            "related_datasets.replicates.library.alternate_accessions": 1,
            "related_datasets.replicates.library.aliases": 1,
            "related_datasets.replicates.library.biosample.accession": 1,
            "related_datasets.replicates.library.biosample.alternate_accessions": 1,
            "related_datasets.replicates.library.biosample.aliases": 1,
            "related_datasets.replicates.library.biosample.subcellular_fraction_term_name": 1,
            "related_datasets.replicates.library.biosample.donor.accession": 1,
            "related_datasets.replicates.library.biosample.donor.alternate_accessions": 1,
            "related_datasets.replicates.antibody.accession": 1,
            "related_datasets.replicates.antibody.alternate_accessions": 1,
            "related_datasets.replicates.antibody.lot_id": 1,
            "related_datasets.replicates.antibody.lot_id_alias": 1,
            "related_datasets.replicates.antibody.clonality": 1,
            "related_datasets.replicates.antibody.isotype": 1,
            "related_datasets.replicates.antibody.purifications": 1,
            "related_datasets.replicates.antibody.product_id": 1,
            "related_datasets.replicates.antibody.aliases": 1,
            "related_datasets.replicates.antibody.dbxrefs": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "related_datasets.possible_controls.accession": 1,
            "related_datasets.possible_controls.alternate_accessions": 1,
            "target.aliases": 1,
            "target.gene_name": 1,
            "target.label": 1,
            "target.dbxref": 1,
            "target.organism.name": 1,
            "target.organism.scientific_name": 1,
            "references.title": 1,
            "related_datasets.replicates.library.biosample.rnais.product_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "File": {
        "title": "Data file",
        "description": "Schema for submitting metadata for a data file.",
        "id": "/profiles/file.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "dataset",
            "file_format",
            "md5sum",
            "output_type",
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/accessioned_status"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "facets": {
            "status": {
                "title": "File status"
            },
            "output_category": {
                "title": "Data category"
            },
            "output_type": {
                "title": "Data type"
            },
            "file_format": {
                "title": "File format"
            },
            "file_format_type": {
                "title": "Specific file format type"
            },
            "lab.title": {
                "title": "Lab"
            }
        },
        "dependencies": {
            "external_accession": {
                "not": {
                    "required": [
                        "accession"
                    ]
                }
            },
            "paired_end": {
                "oneOf": [
                    {
                        "required": [
                            "paired_with"
                        ],
                        "properties": {
                            "paired_end": {
                                "enum": [
                                    "2"
                                ]
                            }
                        }
                    },
                    {
                        "properties": {
                            "paired_end": {
                                "enum": [
                                    "1"
                                ]
                            }
                        }
                    }
                ]
            },
            "paired_with": {
                "required": [
                    "paired_end"
                ],
                "properties": {
                    "file_format": {
                        "enum": [
                            "fastq",
                            "csfasta",
                            "csqual"
                        ]
                    },
                    "paired_end": {
                        "enum": [
                            "2"
                        ]
                    }
                }
            },
            "file_format": {
                "oneOf": [
                    {
                        "required": [
                            "replicate"
                        ],
                        "properties": {
                            "file_format": {
                                "enum": [
                                    "fastq"
                                ]
                            }
                        }
                    },
                    {
                        "required": [
                            "file_format_type"
                        ],
                        "properties": {
                            "file_format": {
                                "enum": [
                                    "gff",
                                    "bed",
                                    "bigBed"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "file_format": {
                                    "enum": [
                                        "fastq",
                                        "gff",
                                        "bed",
                                        "bigBed"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "status": {
                "enum": [
                    "uploading",
                    "uploaded",
                    "upload failed",
                    "format check failed",
                    "in progress",
                    "deleted",
                    "replaced",
                    "revoked",
                    "archived",
                    "released"
                ],
                "default": "uploading",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "FF",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "7",
                "title": "Schema Version",
                "type": "string"
            },
            "external_accession": {
                "uniqueKey": "accession",
                "permission": "import_items",
                "comment": "Only admins are allowed to set or update this value.",
                "title": "External accession",
                "type": "string"
            },
            "file_format": {
                "oneOf": [
                    {
                        "enum": [
                            "bam",
                            "bed",
                            "bigBed",
                            "bigWig",
                            "fasta",
                            "fastq",
                            "gff",
                            "gtf",
                            "hdf5",
                            "idat",
                            "rcc",
                            "CEL",
                            "tsv",
                            "csv",
                            "sam",
                            "tar",
                            "tagAlign",
                            "vcf",
                            "wig",
                            "bedpe"
                        ]
                    },
                    {
                        "comment": "Historical file formats, not valid for new submissions.",
                        "permission": "import_items",
                        "enum": [
                            "2bit",
                            "csfasta",
                            "csqual"
                        ]
                    }
                ],
                "title": "File format",
                "type": "string"
            },
            "file_format_type": {
                "oneOf": [
                    {
                        "enum": [
                            "bed3",
                            "bed3+",
                            "bed6",
                            "bed6+",
                            "bed9",
                            "bed9+",
                            "bed12",
                            "bedGraph",
                            "bedLogR",
                            "bedMethyl",
                            "broadPeak",
                            "enhancerAssay",
                            "gappedPeak",
                            "gff2",
                            "gff3",
                            "narrowPeak",
                            "candidate enhancer predictions",
                            "enhancer predictions",
                            "tss_peak",
                            "idr_peak"
                        ]
                    },
                    {
                        "comment": "Historical file formats, not valid for new submissions.",
                        "permission": "import_items",
                        "enum": [
                            "unknown",
                            "bedRnaElements",
                            "peptideMapping",
                            "modPepMap",
                            "pepMap",
                            "shortFrags",
                            "bedExonScore",
                            "openChromCombinedPeaks",
                            "mango"
                        ]
                    }
                ],
                "type": "string",
                "title": "Specific file format type",
                "description": "Files of type bed and gff require further specification"
            },
            "restricted": {
                "type": "boolean",
                "title": "Restricted file",
                "description": "A flag to indicate whether this file is subject to restricted access"
            },
            "md5sum": {
                "type": "string",
                "format": "hex",
                "comment": "This can vary for files of same content gzipped at different times",
                "title": "MD5sum",
                "description": "The md5sum of the file being transferred."
            },
            "content_md5sum": {
                "type": "string",
                "format": "hex",
                "comment": "This is only relavant for gzipped files.",
                "title": "Content MD5sum",
                "description": "The MD5sum of the uncompressed file."
            },
            "file_size": {
                "comment": "File size is specified in bytes",
                "title": "File size",
                "type": "integer"
            },
            "platform": {
                "linkTo": "Platform",
                "type": "string",
                "comment": "See platform.json for available identifiers.",
                "title": "Platform",
                "description": "The measurement device used to collect data."
            },
            "read_length": {
                "type": "integer",
                "title": "Read length",
                "description": "For high-throughput sequencing, the number of contiguous nucleotides determined by sequencing."
            },
            "flowcell_details": {
                "items": {
                    "title": "Flowcell details",
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "machine": {
                            "title": "Machine Name",
                            "description": "The lab specific name of the machine used.",
                            "type": "string"
                        },
                        "flowcell": {
                            "title": "Flowcell ID",
                            "type": "string"
                        },
                        "lane": {
                            "title": "Lane",
                            "type": "string"
                        },
                        "barcode": {
                            "title": "Barcode",
                            "type": "string"
                        },
                        "barcode_in_read": {
                            "title": "Barcode in read",
                            "description": "The read the barcode is located on.",
                            "type": "string",
                            "enum": [
                                "1",
                                "2"
                            ]
                        },
                        "barcode_position": {
                            "title": "Barcode position",
                            "description": "The 1-based start position of the barcode in 5->3 orientation.",
                            "type": "integer"
                        },
                        "chunk": {
                            "title": "Chunk",
                            "description": "The file chunk label as assigned by Illumina software when splitting up a fastq into specified chunk sizes.",
                            "comment": "This label is used to re-assemble the chunks into the original file in the correct order.",
                            "type": "string"
                        }
                    }
                },
                "type": "array",
                "title": "Flowcells",
                "default": [],
                "description": "For high-throughput sequencing, the flowcells used for the sequencing of the replicate."
            },
            "output_type": {
                "oneOf": [
                    {
                        "enum": [
                            "idat green channel",
                            "idat red channel",
                            "reads",
                            "intensity values",
                            "reporter code counts",
                            "alignments",
                            "unfiltered alignments",
                            "transcriptome alignments",
                            "minus strand signal of all reads",
                            "plus strand signal of all reads",
                            "signal of all reads",
                            "normalized signal of all reads",
                            "raw minus strand signal",
                            "raw plus strand signal",
                            "raw signal",
                            "raw normalized signal",
                            "read-depth normalized signal",
                            "control normalized signal",
                            "minus strand signal of unique reads",
                            "plus strand signal of unique reads",
                            "signal of unique reads",
                            "signal p-value",
                            "fold change over control",
                            "exon quantifications",
                            "gene quantifications",
                            "microRNA quantifications",
                            "transcript quantifications",
                            "library fraction",
                            "methylation state at CpG",
                            "methylation state at CHG",
                            "methylation state at CHH",
                            "enrichment",
                            "replication timing profile",
                            "variant calls",
                            "hotspots",
                            "long range chromatin interactions",
                            "chromatin interactions",
                            "topologically associated domains",
                            "genome compartments",
                            "open chromatin regions",
                            "DHS peaks",
                            "peaks",
                            "replicated peaks",
                            "RNA-binding protein associated mRNAs",
                            "splice junctions",
                            "transcription start sites",
                            "predicted enhancers",
                            "candidate enhancers",
                            "candidate promoters",
                            "predicted forebrain enhancers",
                            "predicted heart enhancers",
                            "predicted whole brain enhancers",
                            "candidate regulatory elements",
                            "genome reference",
                            "tRNA reference",
                            "miRNA reference",
                            "snRNA reference",
                            "rRNA reference",
                            "TSS reference",
                            "reference variants",
                            "genome index",
                            "female genome reference",
                            "female genome index",
                            "male genome reference",
                            "male genome index",
                            "spike-in sequence",
                            "optimal idr thresholded peaks",
                            "conservative idr thresholded peaks",
                            "enhancer validation",
                            "semi-automated genome annotation"
                        ]
                    },
                    {
                        "comment": "Historical output types, not valid for new submissions.",
                        "permission": "import_items",
                        "enum": [
                            "rejected reads",
                            "raw data",
                            "spike-in alignments",
                            "signal",
                            "minus strand signal",
                            "plus strand signal",
                            "summed densities signal",
                            "percentage normalized signal",
                            "base overlap signal",
                            "wavelet-smoothed signal",
                            "filtered modified peptide quantification",
                            "unfiltered modified peptide quantification",
                            "filtered peptide quantification",
                            "unfiltered peptide quantification",
                            "clusters",
                            "contigs",
                            "copy number variation",
                            "transcribed fragments",
                            "filtered transcribed fragments",
                            "valleys",
                            "sequence alignability",
                            "sequence uniqueness",
                            "blacklisted regions",
                            "primer sequence",
                            "reference",
                            "predicted transcription start sites",
                            "minus strand transcription start sites",
                            "plus strand transcription start sites",
                            "distal peaks",
                            "proximal peaks",
                            "validation",
                            "HMM predicted chromatin state"
                        ]
                    }
                ],
                "type": "string",
                "title": "Output type",
                "description": "A description of the file's purpose or contents."
            },
            "run_type": {
                "enum": [
                    "single-ended",
                    "paired-ended",
                    "unknown"
                ],
                "type": "string",
                "title": "Run type for sequencing files",
                "description": "Indicates if file is part of a single or paired run"
            },
            "paired_end": {
                "enum": [
                    "1",
                    "2"
                ],
                "type": "string",
                "title": "Paired End Identifier",
                "description": "Which pair the file belongs to (if paired end library)"
            },
            "derived_from": {
                "items": {
                    "comment": "See file.json for a list of available identifiers.",
                    "type": "string",
                    "linkTo": "File"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Derived from",
                "description": "The files participating as inputs into software to produce this output file."
            },
            "controlled_by": {
                "items": {
                    "comment": "See file.json for a list of available identifiers.",
                    "type": "string",
                    "linkTo": "File"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Controlled by",
                "description": "The files that control this file. "
            },
            "supercedes": {
                "items": {
                    "comment": "See file.json for a list of available identifiers.",
                    "type": "string",
                    "linkTo": "File"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Supercedes",
                "description": "The files that this file replaces."
            },
            "paired_with": {
                "linkTo": "File",
                "type": "string",
                "comment": "See file.json for a list of available identifiers.",
                "title": "File pairing",
                "description": "The file that corresponds with this file."
            },
            "dataset": {
                "linkTo": [
                    "Experiment",
                    "Dataset",
                    "Reference",
                    "Annotation",
                    "PublicationData",
                    "UcscBrowserComposite"
                ],
                "type": "string",
                "comment": "For experiments, see experiment.json for available identifiers. For datasets, see dataset.json for available identifiers.",
                "title": "Dataset",
                "description": "The experiment or dataset the file belongs to."
            },
            "replicate": {
                "linkTo": "Replicate",
                "type": "string",
                "comment": "See replicate.json for available identifiers.",
                "title": "Replicate",
                "description": "The experimental replicate designation for the file."
            },
            "assembly": {
                "enum": [
                    "mm9",
                    "mm10",
                    "mm10-minimal",
                    "hg19",
                    "GRCh38",
                    "GRCh38-minimal",
                    "ce10",
                    "ce11",
                    "dm3",
                    "dm6",
                    "J02459.1"
                ],
                "type": "string",
                "comment": "Applies to mapped files (e.g. BAM, BED and BigWig).",
                "title": "Mapping assembly",
                "description": "Genome assembly that files were mapped to."
            },
            "genome_annotation": {
                "enum": [
                    "None",
                    "M2",
                    "M3",
                    "M4",
                    "M7",
                    "V3c",
                    "V7",
                    "V10",
                    "V19",
                    "V22",
                    "V24",
                    "ENSEMBL V65",
                    "miRBase V21",
                    "WS235",
                    "WS245"
                ],
                "type": "string",
                "comment": "Applies to files created using annotations.",
                "title": "Genome annotation",
                "description": "Genome annotation that file was generated with."
            },
            "submitted_file_name": {
                "type": "string",
                "title": "Original file name",
                "description": "The local file name used at time of submission."
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^\\S+:\\S+"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "step_run": {
                "linkTo": "AnalysisStepRun",
                "type": "string",
                "comment": "For steps, see analysis_step_run.json (and analysis_step.json) - may be virtual",
                "title": "Analysis step run",
                "description": "The run instance of the step the file was generated from."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "analysis_step_version": {
                "type": "string",
                "title": "Analysis Step Version",
                "calculatedProperty": true,
                "linkTo": "AnalysisStepVersion"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "upload_credentials": {
                "calculatedProperty": true,
                "type": "object"
            },
            "href": {
                "calculatedProperty": true,
                "title": "Download URL",
                "type": "string"
            },
            "title": {
                "calculatedProperty": true,
                "title": "Title",
                "type": "string"
            },
            "quality_metrics": {
                "items": {
                    "linkFrom": "QualityMetric.quality_metric_of",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "QC Metric",
                "type": "array"
            },
            "read_length_units": {
                "enum": [
                    "nt"
                ],
                "calculatedProperty": true,
                "title": "Read length units",
                "type": "string"
            },
            "file_type": {
                "calculatedProperty": true,
                "title": "File type",
                "type": "string"
            },
            "biological_replicates": {
                "items": {
                    "type": "integer",
                    "title": "Biological replicate number",
                    "description": "The identifying number of each relevant biological replicate"
                },
                "calculatedProperty": true,
                "title": "Biological replicates",
                "type": "array"
            },
            "output_category": {
                "enum": [
                    "raw data",
                    "alignment",
                    "signal",
                    "annotation",
                    "quantification",
                    "reference"
                ],
                "calculatedProperty": true,
                "title": "Output category",
                "type": "string"
            }
        },
        "columns": {
            "title": {
                "title": "Title"
            },
            "accession": {
                "title": "Accession"
            },
            "assembly": {
                "title": "Mapping assembly"
            },
            "dataset": {
                "title": "Dataset"
            },
            "biological_replicates": {
                "title": "Biological replicates"
            },
            "file_format": {
                "title": "File Format"
            },
            "file_type": {
                "title": "File type"
            },
            "file_size": {
                "title": "File size"
            },
            "href": {
                "title": "Download URL"
            },
            "derived_from": {
                "title": "Derived from"
            },
            "genome_annotation": {
                "title": "Genome annotation"
            },
            "replicate.library.accession": {
                "title": "Library"
            },
            "paired_end": {
                "title": "Paired End Identifier"
            },
            "run_type": {
                "title": "Run type for sequencing files"
            },
            "read_length": {
                "title": "Read length"
            },
            "read_length_units": {
                "title": "Read length units"
            },
            "md5sum": {
                "title": "MD5 Sum"
            },
            "output_category": {
                "title": "Data category"
            },
            "output_type": {
                "title": "Data type"
            },
            "quality_metrics": {
                "title": "QC Metric"
            },
            "lab": {
                "title": "Lab"
            },
            "step_run": {
                "title": "Analysis step run"
            },
            "date_created": {
                "title": "Date added"
            },
            "analysis_step_version": {
                "title": "Analysis Step Version"
            },
            "status": {
                "title": "File status"
            }
        },
        "output_type_output_category": {
            "idat green channel": "raw data",
            "idat red channel": "raw data",
            "intensity values": "raw data",
            "reads": "raw data",
            "rejected reads": "raw data",
            "raw data": "raw data",
            "reporter code counts": "raw data",
            "alignments": "alignment",
            "unfiltered alignments": "alignment",
            "transcriptome alignments": "alignment",
            "spike-in alignments": "alignment",
            "minus strand signal of all reads": "signal",
            "plus strand signal of all reads": "signal",
            "signal of all reads": "signal",
            "normalized signal of all reads": "signal",
            "raw minus strand signal": "signal",
            "raw plus strand signal": "signal",
            "raw signal": "signal",
            "raw normalized signal": "signal",
            "read-depth normalized signal": "signal",
            "control normalized signal": "signal",
            "minus strand signal of unique reads": "signal",
            "plus strand signal of unique reads": "signal",
            "signal of unique reads": "signal",
            "signal p-value": "signal",
            "fold change over control": "signal",
            "minus strand signal": "signal",
            "plus strand signal": "signal",
            "signal": "signal",
            "base overlap signal": "signal",
            "percentage normalized signal": "signal",
            "summed densities signal": "signal",
            "wavelet-smoothed signal": "signal",
            "enrichment": "quantification",
            "library fraction": "quantification",
            "exon quantifications": "quantification",
            "gene quantifications": "quantification",
            "microRNA quantifications": "quantification",
            "transcript quantifications": "quantification",
            "methylation state at CpG": "quantification",
            "methylation state at CHG": "quantification",
            "methylation state at CHH": "quantification",
            "filtered modified peptide quantification": "quantification",
            "unfiltered modified peptide quantification": "quantification",
            "filtered peptide quantification": "quantification",
            "unfiltered peptide quantification": "quantification",
            "replication timing profile": "quantification",
            "hotspots": "annotation",
            "long range chromatin interactions": "annotation",
            "chromatin interactions": "annotation",
            "topologically associated domains": "annotation",
            "genome compartments": "annotation",
            "open chromatin regions": "annotation",
            "DHS peaks": "annotation",
            "peaks": "annotation",
            "replicated peaks": "annotation",
            "RNA-binding protein associated mRNAs": "annotation",
            "splice junctions": "annotation",
            "copy number variation": "annotation",
            "clusters": "annotation",
            "contigs": "annotation",
            "transcribed fragments": "annotation",
            "filtered transcribed fragments": "annotation",
            "valleys": "annotation",
            "sequence alignability": "annotation",
            "sequence uniqueness": "annotation",
            "blacklisted regions": "annotation",
            "distal peaks": "annotation",
            "proximal peaks": "annotation",
            "optimal idr thresholded peaks": "annotation",
            "conservative idr thresholded peaks": "annotation",
            "predicted forebrain enhancers": "annotation",
            "predicted heart enhancers": "annotation",
            "predicted whole brain enhancers": "annotation",
            "predicted enhancers": "annotation",
            "candidate enhancers": "annotation",
            "candidate promoters": "annotation",
            "predicted transcription start sites": "annotation",
            "transcription start sites": "annotation",
            "candidate regulatory elements": "annotation",
            "variant calls": "annotation",
            "genome index": "reference",
            "tRNA reference": "reference",
            "miRNA reference": "reference",
            "snRNA reference": "reference",
            "rRNA reference": "reference",
            "TSS reference": "reference",
            "reference variants": "reference",
            "genome reference": "reference",
            "female genome reference": "reference",
            "female genome index": "reference",
            "male genome reference": "reference",
            "male genome index": "reference",
            "primer sequence": "reference",
            "spike-in sequence": "reference",
            "reference": "reference",
            "enhancer validation": "validation",
            "validation": "validation",
            "HMM predicted chromatin state": "annotation",
            "semi-automated genome annotation": "annotation"
        },
        "file_format_file_extension": {
            "2bit": ".2bit",
            "CEL": ".cel.gz",
            "bam": ".bam",
            "bed": ".bed.gz",
            "bigBed": ".bigBed",
            "bigWig": ".bigWig",
            "csfasta": ".csfasta.gz",
            "csqual": ".csqual.gz",
            "fasta": ".fasta.gz",
            "fastq": ".fastq.gz",
            "gff": ".gff.gz",
            "gtf": ".gtf.gz",
            "hdf5": ".h5",
            "idat": ".idat",
            "rcc": ".rcc",
            "tagAlign": ".tagAlign.gz",
            "tar": ".tar.gz",
            "tsv": ".tsv",
            "csv": ".csv",
            "vcf": ".vcf.gz",
            "wig": ".wig.gz",
            "sam": ".sam.gz"
        },
        "changelog": "/profiles/changelogs/file.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "TestingKey": {
        "properties": {
            "accession": {
                "uniqueKey": "testing_accession",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "name": {
                "uniqueKey": true,
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ],
        "type": "object"
    },
    "TestingDownload": {
        "properties": {
            "attachment": {
                "attachment": true,
                "properties": {
                    "type": {
                        "enum": [
                            "image/png"
                        ],
                        "type": "string"
                    }
                },
                "type": "object"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "attachment2": {
                "attachment": true,
                "properties": {
                    "type": {
                        "enum": [
                            "image/png"
                        ],
                        "type": "string"
                    }
                },
                "type": "object"
            }
        },
        "@type": [
            "JSONSchema"
        ],
        "type": "object"
    },
    "PbcQualityMetric": {
        "description": "Schema for reporting the 'PCR bottleneck coefficient' (PBC) quality metric",
        "id": "/profiles/pbc_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "locations": {
                "description": "locations",
                "type": "number"
            },
            "locations per read": {
                "description": "locations per read",
                "type": "number"
            },
            "mapped by 1 read": {
                "description": "mapped by 1 read",
                "type": "number"
            },
            "mapped by 2 reads": {
                "description": "mapped by 2 reads",
                "type": "number"
            },
            "proportion of 1 read locations": {
                "description": "proportion of 1 read locations",
                "type": "number"
            },
            "ratio: 1 read over 2 read locations": {
                "description": "ratio: 1 read over 2 read locations",
                "type": "number"
            },
            "reads": {
                "description": "reads",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Platform": {
        "title": "Platform",
        "description": "Schema for submitting a measurement device.",
        "id": "/profiles/platform.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "term_id"
        ],
        "identifyingProperties": [
            "uuid",
            "term_name",
            "aliases",
            "term_id"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/shared_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "current",
                    "deleted",
                    "replaced",
                    "disabled"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "4",
                "title": "Schema Version",
                "type": "string"
            },
            "term_id": {
                "comment": "NTR is a new term request identifier provided by the DCC.",
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "uniqueKey": "platform:term_id",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the measurement device.",
                "title": "Platform ID",
                "type": "string"
            },
            "term_name": {
                "uniqueKey": "platform:term_id",
                "type": "string",
                "title": "Platform name",
                "default": "",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the measurement device."
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^(GEO:GPL\\d+|UCSC-ENCODE-cv:\\S+)$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the measurement device."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "title": {
                "calculatedProperty": true,
                "title": "Title",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "term_id": 1,
            "term_name": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "UcscBrowserComposite": {
        "title": "UCSC browser composite",
        "description": "Schema for submitting metadata for a composite as defined by the UCSC Genome Browser.",
        "id": "/profiles/ucsc_browser_composite.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "file_set.json#/properties"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_files": {
                "items": {
                    "linkTo": "File",
                    "comment": "See file.json for available identifiers.",
                    "title": "Data file",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional data files",
                "description": "List of data files to be associated with the dataset."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            }
        },
        "facets": {
            "assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Composite status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "files.replicate.experiment.target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "files.replicate.experiment.target.label": {
                "title": "Target",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Species",
                "type": "array"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "assay_term_name": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "files.replicate.experiment.target.aliases": 1,
            "files.replicate.experiment.target.gene_name": 1,
            "files.replicate.experiment.target.label": 1,
            "files.replicate.experiment.target.dbxref": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "MouseDonor": {
        "title": "Mouse donor",
        "description": "Schema for submitting a mouse donor.",
        "id": "/profiles/mouse_donor.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "organism"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "donor.json#/properties"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/accessioned_status"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "mixins.json#/strains"
            }
        ],
        "properties": {
            "strain_name": {
                "description": "The specific strain designation of a non-human donor.",
                "title": "Strain name",
                "type": "string"
            },
            "strain_background": {
                "description": "The specific parent strain designation of a non-human donor.",
                "title": "Strain background",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The originating lab or vendor.",
                "linkTo": "Source"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released",
                    "revoked",
                    "preliminary",
                    "proposed"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "DO",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "url": {
                "format": "uri",
                "description": "An external resource with additional information about the donor.",
                "title": "URL",
                "type": "string"
            },
            "organism": {
                "comment": "Do not submit, value is assigned by the object.",
                "linkEnum": [
                    "3413218c-3d86-498b-a0a2-9a406638e786"
                ],
                "linkTo": "Organism",
                "description": "Organism of the donor.",
                "title": "Organism",
                "default": "3413218c-3d86-498b-a0a2-9a406638e786",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "6",
                "hidden comment": "Bump the default in the subclasses."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "littermates": {
                "items": {
                    "title": "Littermate",
                    "description": "A donor member of the same litter.",
                    "comment": "See mouse_donor.json for available identifiers.",
                    "type": "string",
                    "linkTo": "MouseDonor"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Littermates",
                "description": "Donors comprising the same litter.",
                "type": "array"
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^(GEO:SAMN\\d+)$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "characterizations": {
                "items": {
                    "linkFrom": "DonorCharacterization.characterizes",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Characterizations",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Replicate": {
        "title": "Replicate",
        "description": "Schema for submitting an experimental replicate.",
        "id": "/profiles/replicate.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "experiment",
            "biological_replicate_number",
            "technical_replicate_number"
        ],
        "approvalRequired": [
            "library"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "dependencies": {
            "rbns_protein_concentration": [
                "rbns_protein_concentration_units"
            ],
            "rbns_protein_concentration_units": [
                "rbns_protein_concentration"
            ]
        },
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "released",
                    "preliminary",
                    "proposed"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "6",
                "title": "Schema Version",
                "type": "string"
            },
            "antibody": {
                "linkTo": "AntibodyLot",
                "type": "string",
                "comment": "See antibody_lot.json for available identifiers.",
                "title": "Antibody",
                "description": "For Immunoprecipitation assays, the antibody used."
            },
            "biological_replicate_number": {
                "type": "integer",
                "title": "Biological replicate",
                "default": 1,
                "description": "Data collection under the same methods using a different biological source, measuring the variability in the biological source."
            },
            "technical_replicate_number": {
                "type": "integer",
                "title": "Technical replicate",
                "default": 1,
                "description": "Data collection under the same methods using the same biological source, measuring the variability in the method."
            },
            "experiment": {
                "linkTo": "Experiment",
                "type": "string",
                "comment": "See experiment.json for available identifiers.",
                "title": "Experiment",
                "description": "The experiment the replicate belongs to."
            },
            "library": {
                "linkTo": "Library",
                "type": "string",
                "comment": "See library.json for available identifiers.",
                "title": "Library",
                "description": "The nucleic acid library used in this replicate."
            },
            "rbns_protein_concentration": {
                "type": "integer",
                "comment": "Only for use with RBNS replicates.",
                "title": "RBNS protein concentration",
                "description": "For use only with RNA Bind-n-Seq replicates to indicate the protein concentration."
            },
            "rbns_protein_concentration_units": {
                "enum": [
                    "nM",
                    "pM"
                ],
                "comment": "The unit for the dependant rbns_protein_concentration.",
                "title": "RBNS protein concentration units",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "experiment.accession": 1,
            "experiment.alternate_accessions": 1,
            "aliases": 1,
            "library.biosample.accession": 1,
            "library.biosample.alternate_accessions": 1,
            "library.biosample.aliases": 1,
            "library.biosample.subcellular_fraction_term_name": 1,
            "library.biosample.donor.accession": 1,
            "library.biosample.donor.alternate_accessions": 1,
            "library.biosample.donor.organism.name": 1,
            "antibody.accession": 1,
            "antibody.alternate_accessions": 1,
            "antibody.lot_id": 1,
            "antibody.lot_id_alias": 1,
            "antibody.product_id": 1,
            "antibody.aliases": 1
        },
        "changelog": "/profiles/changelogs/replicate.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "TestingDependencies": {
        "dependencies": {
            "dep1": [
                "dep2"
            ],
            "dep2": [
                "dep1"
            ]
        },
        "properties": {
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "dep1": {
                "type": "string"
            },
            "dep2": {
                "enum": [
                    "dep2"
                ],
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ],
        "type": "object"
    },
    "SamtoolsFlagstatsQualityMetric": {
        "description": "Schema for reporting 'samtools --flagstats' quality metric",
        "id": "/profiles/samtools_flagstats_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "processing_stage": {
                "enum": [
                    "unfiltered",
                    "filtered"
                ],
                "description": "The degree of post-mapping processing to which the statistics apply",
                "type": "string"
            },
            "diff_chroms": {
                "description": "flagstats: mate mapped different chr (mapQ>=5)",
                "type": "number"
            },
            "diff_chroms_qc_failed": {
                "description": "flagstats: mate mapped different chr (mapQ>=5) - qc failed",
                "type": "number"
            },
            "duplicates": {
                "description": "flagstats: duplicates",
                "type": "number"
            },
            "duplicates_qc_failed": {
                "description": "flagstats: duplicates - qc failed",
                "type": "number"
            },
            "mapped": {
                "description": "flagstats: mapped",
                "type": "number"
            },
            "mapped_pct": {
                "description": "flagstats: mapped - percent",
                "type": "string"
            },
            "mapped_qc_failed": {
                "description": "flagstats: mapped - qc failed",
                "type": "number"
            },
            "paired": {
                "description": "flagstats: paired",
                "type": "number"
            },
            "paired_properly": {
                "description": "flagstats: properly paired",
                "type": "number"
            },
            "paired_properly_pct": {
                "description": "flagstats: properly paired - percent",
                "type": "string"
            },
            "paired_properly_qc_failed": {
                "description": "flagstats: properly paired - qc failed",
                "type": "number"
            },
            "paired_qc_failed": {
                "description": "flagstats: paired - qc failed",
                "type": "number"
            },
            "read1": {
                "description": "flagstats: read1",
                "type": "number"
            },
            "read1_qc_failed": {
                "description": "flagstats: read1 - qc failed",
                "type": "number"
            },
            "read2": {
                "description": "flagstats: read2",
                "type": "number"
            },
            "read2_qc_failed": {
                "description": "flagstats: read2 - qc failed",
                "type": "number"
            },
            "singletons": {
                "description": "flagstats: singletons",
                "type": "number"
            },
            "singletons_pct": {
                "description": "flagstats: singletons - percent",
                "type": "string"
            },
            "singletons_qc_failed": {
                "description": "flagstats: singletons - qc failed",
                "type": "number"
            },
            "total": {
                "description": "flagstats: total",
                "type": "number"
            },
            "total_qc_failed": {
                "description": "flagstats: total - qc failed",
                "type": "number"
            },
            "with_itself": {
                "description": "flagstats: with itself and mate mapped",
                "type": "number"
            },
            "with_itself_qc_failed": {
                "description": "flagstats: with itself and mate mapped - qc failed",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/samtools_flagstats_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "TestingPostPutPatch": {
        "type": "object",
        "properties": {
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "simple2": {
                "default": "simple2 default",
                "type": "string"
            },
            "simple1": {
                "default": "simple1 default",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "uuid": {
                "requestMethod": "POST",
                "format": "uuid",
                "description": "",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "protected": {
                "permission": "import_items",
                "default": "protected default",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "1",
                "type": "string"
            },
            "protected_link": {
                "permission": "import_items",
                "linkTo": "TestingLinkTarget",
                "type": "string"
            },
            "required": {
                "type": "string"
            }
        },
        "@type": [
            "JSONSchema"
        ],
        "required": [
            "required"
        ]
    },
    "DnasePeakQualityMetric": {
        "description": "Schema for reporting hotspot and peak counts as a quality metric",
        "id": "/profiles/dnase_peak_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "hotspot count": {
                "description": "hotspot count",
                "type": "number"
            },
            "peak count": {
                "description": "peak count",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "AntibodyCharacterization": {
        "title": "Antibody characterization",
        "description": "Schema for submitting antibody characterization data.",
        "id": "/profiles/antibody_characterization.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "characterizes",
            "target",
            "attachment"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attachment"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "characterization.json#/properties"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "dependencies": {
            "characterization_reviews": [
                "primary_characterization_method"
            ],
            "primary_characterization_method": {
                "oneOf": [
                    {
                        "required": [
                            "characterization_reviews"
                        ],
                        "properties": {
                            "characterization_reviews": {
                                "minItems": 1
                            },
                            "status": {
                                "enum": [
                                    "pending dcc review",
                                    "compliant",
                                    "not compliant",
                                    "exempt from standards"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "pending dcc review",
                                        "compliant",
                                        "not compliant",
                                        "exempt from standards"
                                    ]
                                }
                            }
                        }
                    }
                ]
            },
            "attachment": {
                "oneOf": [
                    {
                        "required": [
                            "primary_characterization_method"
                        ]
                    },
                    {
                        "required": [
                            "secondary_characterization_method"
                        ]
                    }
                ]
            },
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "reviewed_by"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "not reviewed"
                                ]
                            }
                        }
                    },
                    {
                        "required": [
                            "reviewed_by",
                            "documents"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "compliant",
                                    "not compliant"
                                ]
                            }
                        }
                    },
                    {
                        "required": [
                            "comment",
                            "notes",
                            "reviewed_by",
                            "documents"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "exempt from standards"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "compliant",
                                        "not compliant",
                                        "not reviewed",
                                        "exempt from standards"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "comment": {
                "description": "Additional information pertaining to the characterization that the submitter wishes to disclose.",
                "title": "Comment",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "pending dcc review",
                    "compliant",
                    "not compliant",
                    "not reviewed",
                    "not submitted for review by lab",
                    "exempt from standards",
                    "deleted"
                ],
                "comment": "Submit a status of 'pending dcc review' to indicate that DCC should begin reviewing characterization. Submit a status of 'not submitted for review by lab'  to indicate that DCC should not review the characterization.'",
                "default": "in progress",
                "title": "Approval status",
                "description": "The current state of the characterization.",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "7",
                "hidden comment": "Bump the default in the subclasses."
            },
            "caption": {
                "type": "string",
                "title": "Caption",
                "description": "A plain text description about the characterization. Characterizations for antibodies should include brief methods, expected MW, cell line(s), labels and justification for acceptance, if necessary",
                "default": "",
                "formInput": "textarea"
            },
            "date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Date",
                "description": "The date that the characterization was run on.",
                "type": "string"
            },
            "characterizes": {
                "comment": "See antibody_lot.json for available identifiers.",
                "description": "The specific entity for which the characterization applies.",
                "title": "Antibody characterized",
                "linkTo": "AntibodyLot",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "enum": [
                            "application/msword",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "application/pdf",
                            "application/zip",
                            "text/plain",
                            "text/tab-separated-values",
                            "image/jpeg",
                            "image/tiff",
                            "image/gif",
                            "text/html",
                            "image/png",
                            "image/svs",
                            "text/autosql"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "Document file metadata",
                "type": "object"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "reviewed_by": {
                "permission": "import_items",
                "comment": "Only admins are allowed to set or update this value.",
                "linkEnum": [
                    "98fb23d3-0d79-4c3d-981d-01539e6589f1",
                    "81a6cc12-2847-4e2e-8f2c-f566699eb29e",
                    "4c23ec32-c7c8-4ac0-affb-04befcc881d4",
                    "ce2bde01-07ec-4b8a-b179-554ef95b71dd",
                    "20ce8cd4-c407-453c-b0f3-7e45e5b7e493",
                    "6800d05f-7213-48b1-9ad8-254c73c5b83f",
                    "ff7b77e7-bb55-4307-b665-814c9f1e65fb",
                    "eb26c7d8-cdb4-4370-8c6b-204b441ef987",
                    "9851ccbc-2df9-4529-a4f3-90edee981fc0",
                    "85978cd9-131e-48e2-a389-f752ab05b0a6",
                    "2eb068c5-b7a6-48ec-aca2-c439e4dabb08"
                ],
                "linkTo": "User",
                "type": "string",
                "title": "Reviewed by",
                "description": "Person (from DCC or antibody review panel) who reviewed the antibody characterizations associated with this antibody lot and determined the lot status"
            },
            "characterization_reviews": {
                "type": "array",
                "comment": "Do not submit status, it is assigned by DCC when reviewing the characterization.",
                "title": "Primary characterization lane reviews",
                "items": {
                    "title": "Primary characterization lane review",
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                        "organism",
                        "lane",
                        "biosample_term_id",
                        "biosample_term_name",
                        "biosample_type"
                    ],
                    "properties": {
                        "organism": {
                            "title": "Organism",
                            "comment": "See organism.json for available identifiers.",
                            "type": "string",
                            "linkTo": "Organism"
                        },
                        "lane": {
                            "title": "Lane",
                            "type": "integer"
                        },
                        "lane_status": {
                            "title": "Characterization status",
                            "description": "The current state of the characterization for a particular cell type.",
                            "type": "string",
                            "permission": "import_items",
                            "default": "pending dcc review",
                            "enum": [
                                "pending dcc review",
                                "compliant",
                                "not compliant",
                                "exempt from standards"
                            ]
                        },
                        "biosample_term_id": {
                            "title": "Ontology ID",
                            "description": "Ontology identifier describing biosample.",
                            "comment": "NTR is a new term request identifier provided by the DCC.",
                            "type": "string",
                            "pattern": "^(UBERON|EFO|CL|NTR|FBbt|WBbt):[0-9]{2,8}$"
                        },
                        "biosample_term_name": {
                            "title": "Ontology term",
                            "description": "Ontology term describing biosample.",
                            "type": "string"
                        },
                        "biosample_type": {
                            "title": "Biosample type",
                            "description": "The categorization of the biosample.",
                            "type": "string",
                            "enum": [
                                "primary cell",
                                "immortalized cell line",
                                "tissue",
                                "in vitro differentiated cells",
                                "induced pluripotent stem cell line",
                                "whole organisms",
                                "stem cell"
                            ]
                        }
                    }
                },
                "description": "Characterization details reviewed by each cell type for immunoblot and immunoprecipitation primary characterizations only."
            },
            "target": {
                "linkTo": "Target",
                "type": "string",
                "comment": "See target.json for available identifiers.",
                "title": "Target",
                "description": "The name of the gene whose expression or product is the intended goal of the antibody."
            },
            "primary_characterization_method": {
                "enum": [
                    "immunoblot",
                    "immunoprecipitation",
                    "immunofluorescence"
                ],
                "type": "string",
                "title": "Primary method",
                "description": "Primary experimental method of the characterization, as defined in the standards document."
            },
            "secondary_characterization_method": {
                "enum": [
                    "knockdown or knockout",
                    "immunoprecipitation followed by mass spectrometry",
                    "ChIP-seq comparison",
                    "motif enrichment",
                    "dot blot assay",
                    "peptide array assay",
                    "peptide ELISA assay",
                    "peptide competition assay",
                    "overexpression analysis"
                ],
                "type": "string",
                "title": "Secondary method",
                "description": "Secondary experimental method of the characterization, as defined in the standards document."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "characterization_method": {
                "calculatedProperty": true,
                "title": "Characterization method",
                "type": "string"
            }
        },
        "facets": {
            "status": {
                "title": "Characterization status"
            },
            "target.organism.scientific_name": {
                "title": "Target Organism"
            },
            "characterization_method": {
                "title": "Characterization method"
            },
            "lab.title": {
                "title": "Lab"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "OrganismDevelopmentSeries": {
        "title": "Organism development series",
        "description": "Schema for submitting metadata for an organism development series.",
        "id": "/profiles/organism_development_series.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "series.json#/properties"
            },
            {
                "$ref": "mixins.json#/submitter_comment"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "submitter_comment": {
                "description": "Additional information specified by the submitter to be displayed as a comment on the portal.",
                "title": "Submitter comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_datasets": {
                "items": {
                    "linkTo": "Experiment",
                    "comment": "See dataset.json for available identifiers.",
                    "title": "Dataset",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional datasets",
                "description": "List of datasets to be associated with the series."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "target": {
                "items": {
                    "linkTo": "Target",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Target",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "biosample_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term id",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "treatment_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Treatment term name",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "biosample_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term name",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "biosample_type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample type",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            },
            "revoked_datasets": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked datasets",
                "type": "array"
            }
        },
        "facets": {
            "related_datasets.assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Series status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "biosample_type": {
                "title": "Biosample type",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Biosample treatment",
                "type": "string"
            },
            "related_datasets.files.analysis_step_version.analysis_step.pipelines.title": {
                "title": "Pipeline",
                "type": "string"
            },
            "related_datasets.files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "related_datsets.files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "related_datasets.files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "related_datasets.replicates.library.size_range": {
                "title": "Library insert size (nt)",
                "type": "string"
            },
            "related_datasets.replicates.library.nucleic_acid_term_name": {
                "title": "Library made from",
                "type": "string"
            },
            "related_datasets.replicates.library.depleted_in_term_name": {
                "title": "Library depleted in",
                "type": "string"
            },
            "related_datasets.replicates.library.treatments.treatment_term_name": {
                "title": "Library treatment",
                "type": "array"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "related_datasets.assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "related_datasets.target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Biosample term name",
                "type": "string"
            },
            "target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.replicates.antibody.accession": {
                "title": "Linked Antibody",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.organism.scientific_name": {
                "title": "Species",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.age_display": {
                "title": "Age display",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Treatment",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_id": {
                "title": "Term ID",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration": {
                "title": "Concentration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration_units": {
                "title": "Concentration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.duration": {
                "title": "Duration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.duration_units": {
                "title": "Duration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.synchronization": {
                "title": "Synchronization",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time": {
                "title": "Post-synchronization time",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time_units": {
                "title": "Post-synchronization time units",
                "type": "string"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "related_datasets.assay_term_name": 1,
            "related_datasets.assay_term_id": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "related_datasets.biosample_term_id": 1,
            "related_datasets.biosample_term_name": 1,
            "related_datasets.biosample_type": 1,
            "related_datasets.organ_slims": 1,
            "related_datasets.developmental_slims": 1,
            "related_datasets.assay_synonyms": 1,
            "related_datasets.biosample_synonyms": 1,
            "files.accession": 1,
            "files.alternate_accessions": 1,
            "files.file_format": 1,
            "files.output_type": 1,
            "files.md5sum": 1,
            "related_datasets.replicates.library.accession": 1,
            "related_datasets.replicates.library.alternate_accessions": 1,
            "related_datasets.replicates.library.aliases": 1,
            "related_datasets.replicates.library.biosample.accession": 1,
            "related_datasets.replicates.library.biosample.alternate_accessions": 1,
            "related_datasets.replicates.library.biosample.aliases": 1,
            "related_datasets.replicates.library.biosample.subcellular_fraction_term_name": 1,
            "related_datasets.replicates.library.biosample.donor.accession": 1,
            "related_datasets.replicates.library.biosample.donor.alternate_accessions": 1,
            "related_datasets.replicates.antibody.accession": 1,
            "related_datasets.replicates.antibody.alternate_accessions": 1,
            "related_datasets.replicates.antibody.lot_id": 1,
            "related_datasets.replicates.antibody.lot_id_alias": 1,
            "related_datasets.replicates.antibody.clonality": 1,
            "related_datasets.replicates.antibody.isotype": 1,
            "related_datasets.replicates.antibody.purifications": 1,
            "related_datasets.replicates.antibody.product_id": 1,
            "related_datasets.replicates.antibody.aliases": 1,
            "related_datasets.replicates.antibody.dbxrefs": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "related_datasets.possible_controls.accession": 1,
            "related_datasets.possible_controls.alternate_accessions": 1,
            "target.aliases": 1,
            "target.gene_name": 1,
            "target.label": 1,
            "target.dbxref": 1,
            "target.organism.name": 1,
            "target.organism.scientific_name": 1,
            "references.title": 1,
            "related_datasets.replicates.library.biosample.rnais.product_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "IDRQualityMetric": {
        "description": "Schema for reporting the 'Irreproducible Discovery Rate' (IDR) statistics",
        "id": "/profiles/idr_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "2",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "Np": {
                "description": "Number of peaks from pooled pseudoreplicates",
                "type": "number"
            },
            "Nt": {
                "description": "Number of peaks from true replicates",
                "type": "number"
            },
            "N1": {
                "description": "Number of peaks from replicate 1 self-pseudoreplicates",
                "type": "number"
            },
            "N2": {
                "description": "Number of peaks from replicate 2 self-pseudoreplicates",
                "type": "number"
            },
            "IDR_cutoff": {
                "description": "IDR cutoff threshold for this experiment",
                "type": "number"
            },
            "self_consistency_ratio": {
                "description": "IDR self-consistency ratio for this experiment",
                "type": "number"
            },
            "rescue_ratio": {
                "description": "IDR rescue ratio for this experiment",
                "type": "number"
            },
            "reproducibility_test": {
                "enum": [
                    "pass",
                    "borderline",
                    "fail"
                ],
                "description": "IDR reproducibility test result for this experiment",
                "type": "string"
            },
            "N_optimal": {
                "description": "Number of peaks in the IDR optimal set",
                "type": "number"
            },
            "N_conservative": {
                "description": "Number of peaks in the IDR conservative set",
                "type": "number"
            },
            "IDR_plot_true": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "image/png"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "IDR dispersion plot for true replicates",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "IDR_plot_rep1_pr": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "image/png"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "IDR dispersion plot for replicate 1 pseudo-replicates",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "IDR_plot_rep2_pr": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "image/png"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "IDR dispersion plot for replicate 2 pseudo-replicates",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "IDR_plot_pool_pr": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "image/png"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "IDR dispersion plot for pool pseudo-replicates",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "IDR_parameters_true": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "text/plain"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "IDR run parameters for true replicates",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "IDR_parameters_rep1_pr": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "text/plain"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "IDR run parameters for replicate 1 pseudo-replicates",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "IDR_parameters_rep2_pr": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "text/plain"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "IDR run parameters for replicate 2 pseudo-replicates",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "IDR_parameters_pool_pr": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "text/plain"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    }
                },
                "formInput": "file",
                "additionalProperties": false,
                "attachment": true,
                "description": "IDR run parameters for pool pseudo-replicates",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/idr_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "BiosampleCharacterization": {
        "title": "Biosample characterization",
        "description": "Schema for submitting biosample characterization data",
        "id": "/profiles/biosample_characterization.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "characterizes",
            "attachment"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/attachment"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "characterization.json#/properties"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "description": "The current state of the characterization.",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "comment": {
                "description": "Additional information pertaining to the characterization that the submitter wishes to disclose.",
                "title": "Comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "6",
                "hidden comment": "Bump the default in the subclasses."
            },
            "caption": {
                "type": "string",
                "title": "Caption",
                "description": "A plain text description about the characterization. Characterizations for antibodies should include brief methods, expected MW, cell line(s), labels and justification for acceptance, if necessary",
                "default": "",
                "formInput": "textarea"
            },
            "date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Date",
                "description": "The date that the characterization was run on.",
                "type": "string"
            },
            "characterizes": {
                "comment": "See biosample.json for available identifiers.",
                "description": "The specific entity for which the characterization applies.",
                "title": "Biosample characterized",
                "linkTo": "Biosample",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "enum": [
                            "application/msword",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "application/pdf",
                            "application/zip",
                            "text/plain",
                            "text/tab-separated-values",
                            "image/jpeg",
                            "image/tiff",
                            "image/gif",
                            "text/html",
                            "image/png",
                            "image/svs",
                            "text/autosql"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "Document file metadata",
                "type": "object"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "characterization_method": {
                "enum": [
                    "immunoblot",
                    "immunoprecipitation",
                    "immunoprecipitation followed by mass spectrometry",
                    "immunofluorescence",
                    "FACs analysis",
                    "PCR",
                    "Sanger sequencing"
                ],
                "type": "string",
                "title": "Method",
                "description": "Experimental method of the characterization."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "HotspotQualityMetric": {
        "description": "Schema for reporting hotspot 'spot.out' as a quality metric",
        "id": "/profiles/hotspot_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "SPOT": {
                "description": "SPOT",
                "type": "number"
            },
            "hotspot tags": {
                "description": "Count of read tags in hotspots",
                "type": "number"
            },
            "total tags": {
                "description": "Count of all read tags",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "CpgCorrelationQualityMetric": {
        "description": "Schema for reporting the 'CpG Correlation' output as a quality metric",
        "id": "/profiles/cpg_correlation_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "2",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "CpG pairs": {
                "description": "CpG pairs",
                "type": "number"
            },
            "CpG pairs with atleast 10 reads each": {
                "description": "CpG pairs with atleast 10 reads each",
                "type": "number"
            },
            "Pearson Correlation Coefficient": {
                "description": "Pearson's correlation of CpG pairs with at least 10 reads each",
                "minimum": -1,
                "maximum": 1,
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/cpg_correlation_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "StarQualityMetric": {
        "description": "Schema for reporting the STAR 'Log.Final.out' quality metric",
        "id": "/profiles/star_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "% of reads mapped to multiple loci": {
                "type": "string",
                "description": "STAR % of reads mapped to multiple loci"
            },
            "% of reads mapped to too many loci": {
                "type": "string",
                "description": "STAR % of reads mapped to too many loci"
            },
            "% of reads unmapped: other": {
                "type": "string",
                "description": "STAR % of reads unmapped: other"
            },
            "% of reads unmapped: too many mismatches": {
                "type": "string",
                "description": "STAR % of reads unmapped: too many mismatches"
            },
            "% of reads unmapped: too short": {
                "type": "string",
                "description": "STAR % of reads unmapped: too short"
            },
            "Average input read length": {
                "type": "number",
                "description": "STAR Average input read length"
            },
            "Average mapped length": {
                "type": "number",
                "description": "STAR Average mapped length"
            },
            "Deletion average length": {
                "type": "number",
                "description": "STAR Deletion average length"
            },
            "Deletion rate per base": {
                "type": "string",
                "description": "STAR Deletion rate per base"
            },
            "Insertion average length": {
                "type": "number",
                "description": "STAR Insertion average length"
            },
            "Insertion rate per base": {
                "type": "string",
                "description": "STAR Insertion rate per base"
            },
            "Mapping speed, Million of reads per hour": {
                "type": "number",
                "description": "STAR Mapping speed, Million of reads per hour"
            },
            "Mismatch rate per base, %": {
                "type": "string",
                "description": "STAR Mismatch rate per base, %"
            },
            "Number of input reads": {
                "type": "number",
                "description": "STAR Number of input reads"
            },
            "Number of reads mapped to multiple loci": {
                "type": "number",
                "description": "STAR Number of reads mapped to multiple loci"
            },
            "Number of reads mapped to too many loci": {
                "type": "number",
                "description": "STAR Number of reads mapped to too many loci"
            },
            "Number of splices: AT/AC": {
                "type": "number",
                "description": "STAR Number of splices: AT/AC"
            },
            "Number of splices: Annotated (sjdb)": {
                "type": "number",
                "description": "STAR Number of splices: Annotated (sjdb)"
            },
            "Number of splices: GC/AG": {
                "type": "number",
                "description": "STAR Number of splices: GC/AG"
            },
            "Number of splices: GT/AG": {
                "type": "number",
                "description": "STAR Number of splices: GT/AG"
            },
            "Number of splices: Non-canonical": {
                "type": "number",
                "description": "STAR Number of splices: Non-canonical"
            },
            "Number of splices: Total": {
                "type": "number",
                "description": "STAR Number of splices: Total"
            },
            "Uniquely mapped reads %": {
                "type": "string",
                "description": "STAR Uniquely mapped reads %"
            },
            "Uniquely mapped reads number": {
                "type": "number",
                "description": "STAR Uniquely mapped reads number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/star_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "AnalysisStepVersion": {
        "title": "Analysis step version",
        "description": "A compatible version of an analysis step.",
        "id": "/profiles/analysis_step.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "software_versions",
            "analysis_step"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "2",
                "title": "Schema Version",
                "type": "string"
            },
            "version": {
                "type": "integer",
                "title": "Version",
                "default": 1,
                "description": "The version of the analysis step"
            },
            "analysis_step": {
                "linkTo": "AnalysisStep",
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to template step in pipeline"
            },
            "software_versions": {
                "items": {
                    "comment": "See software_version.json for a list of available identifiers.",
                    "type": "string",
                    "linkTo": "SoftwareVersion"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Software version",
                "description": "The software version used in the analysis."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "GenericQualityMetric": {
        "description": "Schema for reporting generic quality metric",
        "id": "/profiles/generic_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "name",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            }
        ],
        "properties": {
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "application/msword",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "application/pdf",
                            "application/zip",
                            "text/plain",
                            "text/tab-separated-values",
                            "image/jpeg",
                            "image/tiff",
                            "image/gif",
                            "text/html",
                            "image/png",
                            "image/svs",
                            "text/autosql"
                        ],
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "name": {
                "type": "string",
                "description": "The name of the quality metric"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/generic_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "Experiment": {
        "title": "Experiment",
        "description": "Schema for submitting metadata for an assay with 1 or more replicates.",
        "comment": "An experiment is a special case of dataset. It includes assay metadata, replicate information and data files.",
        "id": "/profiles/experiment.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "approvalRequired": [
            "assay_term_id",
            "biosample_term_id",
            "biosample_type"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "mixins.json#/biosample_classification"
            },
            {
                "$ref": "mixins.json#/assay"
            },
            {
                "$ref": "mixins.json#/submitter_comment"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "submitter_comment": {
                "description": "Additional information specified by the submitter to be displayed as a comment on the portal.",
                "title": "Submitter comment",
                "type": "string"
            },
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "biosample_term_name": {
                "description": "Ontology term describing biosample.",
                "title": "Ontology term",
                "type": "string"
            },
            "biosample_term_id": {
                "comment": "NTR is a new term request identifier provided by the DCC.",
                "@type": "@id",
                "pattern": "^(UBERON|EFO|CL|NTR|FBbt|WBbt):[0-9]{2,8}$",
                "type": "string",
                "title": "Ontology ID",
                "description": "Ontology identifier describing biosample."
            },
            "biosample_type": {
                "enum": [
                    "primary cell",
                    "immortalized cell line",
                    "tissue",
                    "in vitro differentiated cells",
                    "induced pluripotent stem cell line",
                    "whole organisms",
                    "stem cell"
                ],
                "description": "The categorization of the biosample.",
                "title": "Biosample type",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Protocols or other documents that describe the assay or the results (not data files)."
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^(UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+|GEO:(GSM|GSE)\\d+)$"
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "target": {
                "linkTo": "Target",
                "type": "string",
                "comment": "See target.json for available identifiers.",
                "title": "Target",
                "description": "For assays, such as ChIP-seq or RIP-seq, the name of the gene whose expression or product is under investigation for the experiment."
            },
            "possible_controls": {
                "items": {
                    "title": "Control",
                    "description": "An experiment that contains files that can serve as a scientific control for this experiment.",
                    "comment": "See experiment.json for a list of available identifiers. Exact pairing of data files with their controls is done using file relationships.",
                    "type": "string",
                    "linkTo": "Experiment"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Controls",
                "description": "Experiments that contain files that can serve as scientific controls for this experiment.",
                "type": "array"
            },
            "related_files": {
                "items": {
                    "title": "Data file",
                    "comment": "See file.json for available identifiers.",
                    "type": "string",
                    "linkTo": "File"
                },
                "permission": "import_items",
                "default": [],
                "title": "Additional data files",
                "description": "To be removed in a future release after data cleanup.",
                "type": "array"
            },
            "internal_status": {
                "enum": [
                    "unreviewed",
                    "no available pipeline",
                    "unrunnable",
                    "pipeline ready",
                    "processing",
                    "pipeline completed",
                    "requires lab review",
                    "release ready"
                ],
                "permission": "import_items",
                "comment": "unreviewed:wrangler has not evaluated, unrunable:experiment requires more metadata to run, pipeline ready:experiment is ready for the pipeline, processing:pipeline is running, pipeline completed: pipeline has run through completion, requires lab review:there are QC concerns about this data, release ready:DCC feels that this is ready for release",
                "type": "string",
                "default": "unreviewed",
                "title": "Status",
                "description": "The status of an experiment in the DCC process."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "replicates": {
                "items": {
                    "linkFrom": "Replicate.experiment",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Replicates",
                "type": "array"
            },
            "objective_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay objective",
                "type": "array"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "assay_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay type",
                "type": "array"
            },
            "type_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay type",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "category_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay category",
                "type": "array"
            },
            "replication_type": {
                "description": "Calculated field that indicates the replication model",
                "title": "Replication type",
                "calculatedProperty": true,
                "type": "string"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "related_series": {
                "items": {
                    "linkFrom": "Series.related_datasets",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Related series",
                "type": "array"
            },
            "assay_title": {
                "calculatedProperty": true,
                "title": "Assay title",
                "type": "string"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            }
        },
        "facets": {
            "assay_slims": {
                "title": "Assay category",
                "type": "array"
            },
            "assay_title": {
                "title": "Assay"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            },
            "status": {
                "title": "Experiment status"
            },
            "assembly": {
                "title": "Genome assembly (visualization)"
            },
            "replicates.library.biosample.donor.organism.scientific_name": {
                "title": "Organism"
            },
            "target.investigated_as": {
                "title": "Target of assay"
            },
            "replicates.library.biosample.biosample_type": {
                "title": "Biosample type"
            },
            "organ_slims": {
                "title": "Organ"
            },
            "replicates.library.biosample.life_stage": {
                "title": "Life stage"
            },
            "replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Biosample treatment"
            },
            "files.analysis_step_version.analysis_step.pipelines.title": {
                "title": "Pipeline"
            },
            "files.file_type": {
                "title": "Available data"
            },
            "files.run_type": {
                "title": "Run type"
            },
            "files.read_length": {
                "title": "Read length (nt)"
            },
            "replicates.library.size_range": {
                "title": "Library insert size (nt)"
            },
            "replicates.library.nucleic_acid_term_name": {
                "title": "Library made from"
            },
            "replicates.library.depleted_in_term_name": {
                "title": "Library depleted in"
            },
            "replicates.library.treatments.treatment_term_name": {
                "title": "Library treatment"
            },
            "month_released": {
                "title": "Date released"
            },
            "lab.title": {
                "title": "Lab"
            },
            "replication_type": {
                "title": "Replication type"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession"
            },
            "assay_term_name": {
                "title": "Assay Type"
            },
            "assay_title": {
                "title": "Assay Nickname"
            },
            "target.label": {
                "title": "Target"
            },
            "biosample_term_name": {
                "title": "Biosample"
            },
            "description": {
                "title": "Description"
            },
            "lab.title": {
                "title": "Lab"
            },
            "award.project": {
                "title": "Project"
            },
            "status": {
                "title": "Status"
            },
            "replicates.antibody.accession": {
                "title": "Linked Antibody"
            },
            "replicates.library.biosample.organism.scientific_name": {
                "title": "Species"
            },
            "replicates.library.biosample.life_stage": {
                "title": "Life stage"
            },
            "replicates.library.biosample.age": {
                "title": "Age"
            },
            "replicates.library.biosample.age_units": {
                "title": "Age Units"
            },
            "replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Treatment"
            },
            "replicates.library.biosample.treatments.treatment_term_id": {
                "title": "Term ID"
            },
            "replicates.library.biosample.treatments.concentration": {
                "title": "Concentration"
            },
            "replicates.library.biosample.treatments.concentration_units": {
                "title": "Concentration units"
            },
            "replicates.library.biosample.treatments.duration": {
                "title": "Duration"
            },
            "replicates.library.biosample.treatments.duration_units": {
                "title": "Duration units"
            },
            "replicates.library.biosample.synchronization": {
                "title": "Synchronization"
            },
            "replicates.library.biosample.post_synchronization_time": {
                "title": "Post-synchronization time"
            },
            "replicates.library.biosample.post_synchronization_time_units": {
                "title": "Post-synchronization time units"
            },
            "replicates.length": {
                "title": "Replicates"
            },
            "files.length": {
                "title": "Files"
            },
            "encode2_dbxrefs": {
                "title": "Dbxrefs"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "assay_term_name": 1,
            "assay_term_id": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "biosample_term_id": 1,
            "biosample_term_name": 1,
            "biosample_type": 1,
            "organ_slims": 1,
            "developmental_slims": 1,
            "category_slims": 1,
            "objective_slims": 1,
            "type_slims": 1,
            "assay_synonyms": 1,
            "biosample_synonyms": 1,
            "files.accession": 1,
            "files.alternate_accessions": 1,
            "files.file_format": 1,
            "files.output_type": 1,
            "files.md5sum": 1,
            "replicates.library.accession": 1,
            "replicates.library.alternate_accessions": 1,
            "replicates.library.aliases": 1,
            "replicates.library.biosample.accession": 1,
            "replicates.library.biosample.alternate_accessions": 1,
            "replicates.library.biosample.aliases": 1,
            "replicates.library.biosample.subcellular_fraction_term_name": 1,
            "replicates.library.biosample.donor.accession": 1,
            "replicates.library.biosample.donor.alternate_accessions": 1,
            "replicates.antibody.accession": 1,
            "replicates.antibody.alternate_accessions": 1,
            "replicates.antibody.lot_id": 1,
            "replicates.antibody.lot_id_alias": 1,
            "replicates.antibody.clonality": 1,
            "replicates.antibody.isotype": 1,
            "replicates.antibody.purifications": 1,
            "replicates.antibody.product_id": 1,
            "replicates.antibody.aliases": 1,
            "replicates.antibody.dbxrefs": 1,
            "replicates.library.biosample.phase": 2,
            "replicates.library.biosample.donor.organism.name": 1,
            "replicates.library.biosample.donor.organism.scientific_name": 1,
            "replicates.library.biosample.donor.organism.taxon_id": 1,
            "replicates.library.nucleic_acid_term_name": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "possible_controls.accession": 1,
            "possible_controls.alternate_accessions": 1,
            "target.aliases": 1,
            "target.gene_name": 1,
            "target.label": 1,
            "target.dbxref": 1,
            "target.organism.name": 1,
            "target.organism.scientific_name": 1,
            "references.title": 1,
            "replicates.library.biosample.rnais.product_id": 1,
            "notes": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "WormDonor": {
        "title": "Worm donor",
        "description": "Schema for submitting a worm donor.",
        "id": "/profiles/worm_donor.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "organism"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "donor.json#/properties"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/accessioned_status"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/strains"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "mixins.json#/genomic_alterations"
            }
        ],
        "properties": {
            "mutated_gene": {
                "comment": "See target.json for available identifiers.",
                "type": "string",
                "title": "Mutated gene",
                "description": "The gene that was altered/disrupted resulting in a loss of function.",
                "linkTo": "Target"
            },
            "genotype": {
                "description": "The genotype of the strain according to accepted nomenclature conventions: http://www.wormbase.org/about/userguide/nomenclature#k89607hgcf24ea13jbid5--10.",
                "title": "Strain genotype",
                "type": "string"
            },
            "constructs": {
                "items": {
                    "linkTo": "Construct",
                    "type": "string",
                    "comment": "See contstruct.json for available identifiers.",
                    "title": "DNA Constructs",
                    "description": "An expression or targeting vector stably or transiently transfected (not RNAi)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "DNA constructs",
                "description": "Expression or targeting vectors stably or transiently transfected (not RNAi)."
            },
            "mutagen": {
                "enum": [
                    "bombardment",
                    "gamma radiation",
                    "X-ray radiation",
                    "UV radiation",
                    "PTT",
                    "transposon",
                    "TMP/UV",
                    "unknown",
                    "none"
                ],
                "description": "The mutagen used to create the strain, if applicable",
                "title": "Mutagen",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "strain_name": {
                "description": "The specific strain designation of a non-human donor.",
                "title": "Strain name",
                "type": "string"
            },
            "strain_background": {
                "description": "The specific parent strain designation of a non-human donor.",
                "title": "Strain background",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The originating lab or vendor.",
                "linkTo": "Source"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released",
                    "revoked",
                    "preliminary",
                    "proposed"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "DO",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "url": {
                "format": "uri",
                "description": "An external resource with additional information about the donor.",
                "title": "URL",
                "type": "string"
            },
            "organism": {
                "comment": "Do not submit, value is assigned by the object.",
                "linkEnum": [
                    "2732dfd9-4fe6-4fd2-9d88-61b7c58cbe20",
                    "e3ec4c1b-a203-4fe7-a013-96c2d45ab242",
                    "69efae2b-4df5-4957-81da-346f1b93cb98",
                    "a7e711b9-534c-44a3-a782-2a15af620739",
                    "451f9e49-685d-40d5-ad89-760b2512262a"
                ],
                "linkTo": "Organism",
                "description": "Organism of the donor.",
                "title": "Organism",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "num_times_outcrossed": {
                "type": "string",
                "title": "Number of times outcrossed",
                "pattern": "^x(\\d+?)|unknown|new\\s+line$",
                "description": "The number of out/backcrossed when constructing the strain"
            },
            "outcrossed_strain": {
                "linkTo": "WormDonor",
                "type": "string",
                "comment": "For worm strains, see worm_donor.json for available identifiers.",
                "title": "Outcrossed strain background",
                "description": "The strain used for backcrossing."
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^((cgc:.+)|(GEO:SAMN\\d+))$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "characterizations": {
                "items": {
                    "linkFrom": "DonorCharacterization.characterizes",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Characterizations",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Source": {
        "title": "Source",
        "description": "Schema for submitting an originating lab or vendor.",
        "id": "/profiles/source.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "name",
            "title"
        ],
        "identifyingProperties": [
            "uuid",
            "name"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/shared_status"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/aliases"
            }
        ],
        "properties": {
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "status": {
                "enum": [
                    "current",
                    "deleted",
                    "replaced",
                    "disabled"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "3",
                "title": "Schema Version",
                "type": "string"
            },
            "description": {
                "type": "string",
                "title": "Description",
                "default": "",
                "description": "A plain text description of the source."
            },
            "title": {
                "type": "string",
                "title": "Name",
                "description": "The complete name of the originating lab or vendor. "
            },
            "name": {
                "uniqueKey": true,
                "comment": "Do not submit, value is auto generated from the title as lower cased and hyphen delimited.",
                "pattern": "^[a-z0-9\\-]+$",
                "type": "string"
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the source."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "boost_values": {
            "name": 1,
            "title": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Annotation": {
        "title": "Annotation",
        "description": "Schema for submitting metadata for an annotation set.",
        "id": "/profiles/annotation.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "mixins.json#/biosample_classification"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "file_set.json#/properties"
            }
        ],
        "dependencies": {
            "relevant_timepoint": [
                "relevant_timepoint_units"
            ],
            "relevant_timepoint_units": [
                "relevant_timepoint"
            ],
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "8",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_files": {
                "items": {
                    "linkTo": "File",
                    "comment": "See file.json for available identifiers.",
                    "title": "Data file",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional data files",
                "description": "List of data files to be associated with the dataset."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "biosample_term_name": {
                "description": "Ontology term describing biosample.",
                "title": "Ontology term",
                "type": "string"
            },
            "biosample_term_id": {
                "comment": "NTR is a new term request identifier provided by the DCC.",
                "@type": "@id",
                "pattern": "^(UBERON|EFO|CL|NTR|FBbt|WBbt):[0-9]{2,8}$",
                "type": "string",
                "title": "Ontology ID",
                "description": "Ontology identifier describing biosample."
            },
            "biosample_type": {
                "enum": [
                    "primary cell",
                    "immortalized cell line",
                    "tissue",
                    "in vitro differentiated cells",
                    "induced pluripotent stem cell line",
                    "whole organisms",
                    "stem cell"
                ],
                "description": "The categorization of the biosample.",
                "title": "Biosample type",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "annotation_type": {
                "enum": [
                    "binding sites",
                    "candidate enhancers",
                    "candidate promoters",
                    "enhancer prediction",
                    "DNase master peaks",
                    "transcription factor motifs",
                    "SAGA",
                    "validated enhancers",
                    "overlap",
                    "segmentation",
                    "encyclopedia"
                ],
                "type": "string",
                "title": "Type",
                "description": "The category that best describes the annotation set."
            },
            "encyclopedia_version": {
                "type": "string",
                "comment": "The model should be something like version 1.0",
                "title": "ENCODE encyclopedia version",
                "description": " The version of the ENCODE encyclopeida to which this annotation belongs."
            },
            "organism": {
                "linkTo": "Organism",
                "comment": "See organism.json for available identifiers.",
                "title": "Organism",
                "type": "string"
            },
            "relevant_timepoint": {
                "type": "string",
                "title": "Relevant timepoint",
                "pattern": "^((\\d+(\\.\\d+)?(\\-\\d+(\\.\\d+)?)?)|(unknown))$",
                "description": " The timepoint for which the annotation is relevant."
            },
            "relevant_timepoint_units": {
                "enum": [
                    "minute",
                    "hour",
                    "day",
                    "week",
                    "month",
                    "year",
                    "stage"
                ],
                "title": "Relevant timepoint unit",
                "type": "string"
            },
            "relevant_life_stage": {
                "enum": [
                    "adult",
                    "unknown",
                    "embryonic",
                    "postnatal",
                    "larva",
                    "first instar larva",
                    "second instar larva",
                    "third instar larva",
                    "wandering third instar larva",
                    "prepupa",
                    "pupa",
                    "early embryonic",
                    "midembryonic",
                    "late embryonic",
                    "mixed stage (embryonic)",
                    "mixed stage (late embryonic and L1 larva)",
                    "L1 larva",
                    "L2 larva",
                    "L2d larva",
                    "L3 larva",
                    "L4 larva",
                    "dauer",
                    "L4/young adult",
                    "young adult"
                ],
                "type": "string",
                "comment": "Note that some of the options are organism-specific so choose carefully.",
                "title": "life stage",
                "description": "The life_stage for which the annotation is relevant."
            },
            "targets": {
                "items": {
                    "title": "Targets",
                    "description": "For predictions of particular features (e.g. distribution of a histone mark), specify the predicted feature(s).",
                    "comment": "See contstruct.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Target"
                },
                "comment": "See target.json for available identifiers.",
                "uniqueItems": true,
                "description": "For predictions of particular features (e.g. distribution of a histone mark), specify the predicted feature(s).",
                "title": "Targets",
                "default": [],
                "type": "array"
            },
            "software_used": {
                "items": {
                    "title": "Software used",
                    "description": "Version of software used to derived the annotation calls.",
                    "type": "string",
                    "comment": "See software_version.json for available identifiers.",
                    "linkTo": "SoftwareVersion"
                },
                "uniqueItems": true,
                "type": "array",
                "title": "Software used",
                "description": "A list of software used to derive the annotation calls."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            }
        },
        "facets": {
            "annotation_type": {
                "title": "Annotation type",
                "type": "string"
            },
            "files.replicate.experiment.assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "File set status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "targets.investigated_as": {
                "title": "Target(s) of assay",
                "type": "array"
            },
            "targets.label": {
                "title": "Target(s) of assay",
                "type": "array"
            },
            "biosample_type": {
                "title": "Biosample type",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "relevant_life_stage": {
                "title": "Life stage",
                "type": "string"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "software_used.software.name": {
                "title": "Software used",
                "type": "array"
            },
            "encyclopedia_version": {
                "title": "Encyclopedia version",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "files.replicate.experiment.assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "targets.label": {
                "title": "Target",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Species",
                "type": "array"
            },
            "relevant_life_stage": {
                "title": "Life stage",
                "type": "array"
            },
            "relevant_timepoint": {
                "title": "Age",
                "type": "array"
            },
            "relevant_timepoint_units": {
                "title": "Age Units",
                "type": "array"
            },
            "software_used.software.name": {
                "title": "Software used",
                "type": "array"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "files.replicate.experiment.assay_term_name": 1,
            "biosample_term_id": 1,
            "biosample_term_name": 1,
            "biosample_type": 1,
            "organ_slims": 1,
            "developmental_slims": 1,
            "biosample_synonyms": 1,
            "relevant_life_stage": 1,
            "relevant_timepoint": 1,
            "software_used.software.name": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "targets.aliases": 1,
            "targets.gene_name": 1,
            "targets.label": 1,
            "targets.dbxref": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "annotation_type": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Treatment": {
        "title": "Treatment",
        "id": "/profiles/treatment.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "treatment_term_name",
            "treatment_type"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/shared_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/treatment_classification"
            }
        ],
        "dependencies": {
            "temperature": [
                "temperature_units"
            ],
            "temperature_units": [
                "temperature"
            ]
        },
        "properties": {
            "treatment_term_name": {
                "description": "Ontology term describing a component in the treatment.",
                "title": "Term name",
                "type": "string"
            },
            "treatment_term_id": {
                "@type": "@id",
                "pattern": "^(CHEBI:[0-9]{1,7})|(UniprotKB:P[0-9]{5})|(Taxon:[0-9]{2,7})|(NTR:[0-9]{2,8})$",
                "title": "Term ID",
                "description": "Ontology identifier describing a component in the treatment.",
                "type": "string"
            },
            "treatment_type": {
                "enum": [
                    "protein",
                    "chemical",
                    "exposure",
                    "infection",
                    "antibody"
                ],
                "default": "chemical",
                "title": "Type",
                "description": "The classification of the treatment.",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "current",
                    "deleted",
                    "replaced",
                    "disabled"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "4",
                "title": "Schema Version",
                "type": "string"
            },
            "lab": {
                "linkTo": "Lab",
                "type": "string",
                "comment": "See lab.json for list of available identifiers.",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "protocols": {
                "items": {
                    "title": "Protocol document",
                    "description": "A document that describes the treatment protocol.",
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "linkTo": "Document"
                },
                "uniqueItems": true,
                "default": [],
                "title": "Protocol documents",
                "description": "Documents that describe the treatment protocol.",
                "type": "array"
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^(UCSC-ENCODE-cv:[\\S\\s\\d\\-\\(\\)\\+]+)$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "concentration": {
                "title": "Concentration",
                "type": "number"
            },
            "concentration_units": {
                "enum": [
                    "pM",
                    "nM",
                    "μM",
                    "μg/mL",
                    "mM",
                    "mg/mL",
                    "ng/mL",
                    "M",
                    "percent",
                    "units",
                    "U/mL"
                ],
                "title": "Concentration units",
                "type": "string"
            },
            "duration": {
                "title": "Duration",
                "type": "number"
            },
            "duration_units": {
                "enum": [
                    "second",
                    "minute",
                    "hour",
                    "day"
                ],
                "title": "Duration units",
                "type": "string"
            },
            "temperature": {
                "title": "Temperature",
                "type": "number"
            },
            "temperature_units": {
                "enum": [
                    "Celsius",
                    "Fahrenheit",
                    "Kelvin"
                ],
                "title": "Temperature units",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "FastqcQualityMetric": {
        "description": "Schema for reporting the specific calculation of an quality metrics",
        "id": "/profiles/fastqc_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            },
            {
                "$ref": "mixins.json#/attribution"
            }
        ],
        "properties": {
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "text/html"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "Total Sequences": {
                "description": "FastQC Summary metric",
                "type": "number"
            },
            "Sequences flagged as poor quality": {
                "description": "FastQC Summary metric",
                "type": "number"
            },
            "Sequence length": {
                "description": "FastQC Summary metric",
                "type": "number"
            },
            "%GC": {
                "description": "FastQC Summary metric",
                "type": "number"
            },
            "Per base sequence quality": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Per base sequence content": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Basic Statistics": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Kmer Content": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Sequence Duplication Levels": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Sequence Length Distribution": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Overrepresented sequences": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Per sequence GC content": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Adapter Content": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Per tile sequence quality": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Per base N content": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "Per sequence quality scores": {
                "enum": [
                    "PASS",
                    "FAIL",
                    "WARN"
                ],
                "description": "FastQC metric",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/fastqc_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "DonorCharacterization": {
        "title": "Donor characterization",
        "description": "Schema for submitting model organism donor (strain) characterization data",
        "id": "/profiles/donor_characterization.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "characterizes",
            "attachment"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/attachment"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "characterization.json#/properties"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "description": "The current state of the characterization.",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "comment": {
                "description": "Additional information pertaining to the characterization that the submitter wishes to disclose.",
                "title": "Comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "6",
                "hidden comment": "Bump the default in the subclasses."
            },
            "caption": {
                "type": "string",
                "title": "Caption",
                "description": "A plain text description about the characterization. Characterizations for antibodies should include brief methods, expected MW, cell line(s), labels and justification for acceptance, if necessary",
                "default": "",
                "formInput": "textarea"
            },
            "date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Date",
                "description": "The date that the characterization was run on.",
                "type": "string"
            },
            "characterizes": {
                "comment": "See donor.json for available identifiers.",
                "description": "The specific entity for which the characterization applies.",
                "title": "Model organism donor (strain) characterized",
                "linkTo": "Donor",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "enum": [
                            "application/msword",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "application/pdf",
                            "application/zip",
                            "text/plain",
                            "text/tab-separated-values",
                            "image/jpeg",
                            "image/tiff",
                            "image/gif",
                            "text/html",
                            "image/png",
                            "image/svs",
                            "text/autosql"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "Document file metadata",
                "type": "object"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "characterization_method": {
                "enum": [
                    "immunoblot",
                    "immunofluorescence"
                ],
                "type": "string",
                "title": "Method",
                "description": "Experimental method of the characterization."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "AccessKey": {
        "title": "Admin access key",
        "id": "/profiles/access_key_admin.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "required": [],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            }
        ],
        "type": "object",
        "properties": {
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "2",
                "title": "Schema Version",
                "type": "string"
            },
            "status": {
                "enum": [
                    "current",
                    "deleted"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "user": {
                "linkTo": "User",
                "permission": "import_items",
                "comment": "Only admins are allowed to set this value.",
                "title": "User",
                "type": "string"
            },
            "description": {
                "default": "",
                "title": "Description",
                "type": "string"
            },
            "access_key_id": {
                "uniqueKey": true,
                "permission": "import_items",
                "comment": "Only admins are allowed to set this value.",
                "title": "Access key ID",
                "type": "string"
            },
            "secret_access_key_hash": {
                "permission": "import_items",
                "comment": "Only admins are allowed to set this value.",
                "title": "Secret access key Hash",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "FlyDonor": {
        "title": "Fly donor",
        "description": "Schema for submitting a fly donor.",
        "id": "/profiles/fly_donor.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "organism"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "donor.json#/properties"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/accessioned_status"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/strains"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "mixins.json#/genomic_alterations"
            }
        ],
        "properties": {
            "mutated_gene": {
                "comment": "See target.json for available identifiers.",
                "type": "string",
                "title": "Mutated gene",
                "description": "The gene that was altered/disrupted resulting in a loss of function.",
                "linkTo": "Target"
            },
            "genotype": {
                "description": "The genotype of the strain according to accepted nomenclature conventions: http://flybase.org/static_pages/docs/nomenclature/nomenclature3.html",
                "title": "Strain genotype",
                "type": "string"
            },
            "constructs": {
                "items": {
                    "linkTo": "Construct",
                    "type": "string",
                    "comment": "See contstruct.json for available identifiers.",
                    "title": "DNA Constructs",
                    "description": "An expression or targeting vector stably or transiently transfected (not RNAi)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "DNA constructs",
                "description": "Expression or targeting vectors stably or transiently transfected (not RNAi)."
            },
            "mutagen": {
                "enum": [
                    "bombardment",
                    "gamma radiation",
                    "X-ray radiation",
                    "UV radiation",
                    "PTT",
                    "transposon",
                    "TMP/UV",
                    "unknown",
                    "none"
                ],
                "description": "The mutagen used to create the strain, if applicable",
                "title": "Mutagen",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "strain_name": {
                "description": "The specific strain designation of a non-human donor.",
                "title": "Strain name",
                "type": "string"
            },
            "strain_background": {
                "description": "The specific parent strain designation of a non-human donor.",
                "title": "Strain background",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The originating lab or vendor.",
                "linkTo": "Source"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released",
                    "revoked",
                    "preliminary",
                    "proposed"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "DO",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "url": {
                "format": "uri",
                "description": "An external resource with additional information about the donor.",
                "title": "URL",
                "type": "string"
            },
            "organism": {
                "comment": "Do not submit, value is assigned by the object.",
                "linkEnum": [
                    "ab546d43-8e2a-4567-8db7-a217e6d6eea0",
                    "5be68469-94ba-4d60-b361-dde8958399ca",
                    "74144f1f-f3a6-42b9-abfd-186a1ca93198",
                    "c3cc08b7-7814-4cae-a363-a16b76883e3f",
                    "d1072fd2-8374-4f9b-85ce-8bc2c61de122",
                    "b9ce90a4-b791-40e9-9b4d-ffb1c6a5aa2b",
                    "0bdd955a-57f0-4e4b-b93d-6dd1df9b766c"
                ],
                "linkTo": "Organism",
                "description": "Organism of the donor.",
                "title": "Organism",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "dbxrefs": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource.",
                    "type": "string",
                    "pattern": "^(((bloomington|dssc):.+)|(GEO:SAMN\\d+))$"
                },
                "default": [],
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "uniqueItems": true,
                "description": "Unique identifiers from external resources.",
                "title": "External identifiers",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "characterizations": {
                "items": {
                    "linkFrom": "DonorCharacterization.characterizes",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Characterizations",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "RNAi": {
        "title": "RNAi vector",
        "description": "Schema for submitting an RNAi stably or transiently transfected.",
        "id": "/profiles/rnai.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "rnai_type",
            "target",
            "lab",
            "award"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/product_id"
            },
            {
                "$ref": "mixins.json#/source"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "source": {
                "comment": "See source.json for available identifiers.",
                "type": "string",
                "title": "Source",
                "description": "The originating lab or vendor.",
                "linkTo": "Source"
            },
            "product_id": {
                "description": "The product identifier provided by the originating lab or vendor.",
                "title": "Product ID",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "3",
                "title": "Schema Version",
                "type": "string"
            },
            "rnai_type": {
                "enum": [
                    "shRNA",
                    "siRNA"
                ],
                "type": "string",
                "title": "Class",
                "description": "The classification of the interfering RNA (e.g. shRNA or siRNA)."
            },
            "url": {
                "format": "uri",
                "type": "string",
                "title": "URL",
                "description": "An external resource with additional information about the RNAi construct."
            },
            "target": {
                "linkTo": "Target",
                "type": "string",
                "comment": "See target.json for available identifiers.",
                "title": "Target",
                "description": "The name of the gene whose expression or product is modified by the RNAi construct."
            },
            "vector_backbone_name": {
                "type": "string",
                "title": "Backbone name",
                "description": "The name of the vector backbone used for the construct."
            },
            "rnai_sequence": {
                "type": "string",
                "title": "RNAi sequence",
                "description": "Sequence of the inhibitory RNA."
            },
            "rnai_target_sequence": {
                "type": "string",
                "title": "Target sequence",
                "description": "Genomic sequence targeted by the RNA."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "characterizations": {
                "items": {
                    "linkTo": "RNAiCharacterization",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Characterizations",
                "type": "array"
            }
        },
        "boost_values": {
            "target.label": 1,
            "target.aliases": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "MatchedSet": {
        "title": "Matched Set",
        "description": "Schema for submitting metadata for a matched set - a collection of experiments with matching properties except for donor.",
        "id": "/profiles/matched_set.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab"
        ],
        "identifyingProperties": [
            "uuid",
            "accession",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/accession"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/references"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/documents"
            },
            {
                "$ref": "dataset.json#/properties"
            },
            {
                "$ref": "series.json#/properties"
            },
            {
                "$ref": "mixins.json#/submitter_comment"
            }
        ],
        "dependencies": {
            "status": {
                "oneOf": [
                    {
                        "required": [
                            "date_released"
                        ],
                        "properties": {
                            "status": {
                                "enum": [
                                    "released",
                                    "revoked"
                                ]
                            }
                        }
                    },
                    {
                        "not": {
                            "properties": {
                                "status": {
                                    "enum": [
                                        "released",
                                        "revoked"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        "properties": {
            "submitter_comment": {
                "description": "Additional information specified by the submitter to be displayed as a comment on the portal.",
                "title": "Submitter comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "7",
                "hidden comment": "Bump the default in the subclasses."
            },
            "related_datasets": {
                "items": {
                    "linkTo": "Experiment",
                    "comment": "See dataset.json for available identifiers.",
                    "title": "Dataset",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Additional datasets",
                "description": "List of datasets to be associated with the series."
            },
            "accession": {
                "serverDefault": "accession",
                "format": "accession",
                "comment": "Only admins are allowed to set or update this value.",
                "accessionType": "SR",
                "type": "string",
                "title": "Accession",
                "permission": "import_items",
                "description": "A unique identifier to be used to reference the object."
            },
            "dbxrefs": {
                "items": {
                    "type": "string",
                    "title": "External identifier",
                    "pattern": "^((UCSC-GB-mm9|UCSC-GB-hg19):\\S+|GEO:(GSM|GSE)\\d+|UCSC-ENCODE-mm9:wgEncodeEM\\d+|UCSC-ENCODE-hg19:wgEncodeEH\\d+)$",
                    "description": "A unique identifier from external resource."
                },
                "@type": "@id",
                "rdfs:subPropertyOf": "rdfs:seeAlso",
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources."
            },
            "status": {
                "enum": [
                    "proposed",
                    "started",
                    "in progress",
                    "submitted",
                    "ready for review",
                    "deleted",
                    "released",
                    "revoked",
                    "archived",
                    "replaced",
                    "in review",
                    "release ready",
                    "verified",
                    "preliminary"
                ],
                "default": "proposed",
                "title": "Status",
                "type": "string"
            },
            "date_released": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "permission": "import_items",
                "comment": "Do not submit, value is assigned whe the object is releaesd.",
                "title": "Date released",
                "type": "string"
            },
            "description": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "default": "",
                "title": "Description",
                "description": "A plain text description of the dataset.",
                "type": "string"
            },
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "references": {
                "items": {
                    "linkTo": "Publication",
                    "type": "string",
                    "title": "Reference",
                    "description": "A publication that provide smore information about the object."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "References",
                "description": "The publications that provide more information about the object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "alternate_accessions": {
                "items": {
                    "type": "string",
                    "format": "accession",
                    "comment": "Only admins are allowed to set or update this value.",
                    "title": "Alternate Accession",
                    "description": "An accession previously assigned to an object that has been merged with this object."
                },
                "permission": "import_items",
                "type": "array",
                "default": [],
                "title": "Alternate accessions",
                "description": "Accessions previously assigned to objects that have been merged with this object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "target": {
                "items": {
                    "linkTo": "Target",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Target",
                "type": "array"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "contributing_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Contributing files",
                "type": "array"
            },
            "system_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "System slims",
                "type": "array"
            },
            "hub": {
                "calculatedProperty": true,
                "title": "Hub",
                "type": "string"
            },
            "revoked_files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked files",
                "type": "array"
            },
            "assembly": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assembly",
                "type": "array"
            },
            "files": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Files",
                "type": "array"
            },
            "assay_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term name",
                "type": "array"
            },
            "biosample_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample synonyms",
                "type": "array"
            },
            "month_released": {
                "calculatedProperty": true,
                "title": "Month released",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "biosample_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term id",
                "type": "array"
            },
            "organ_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organ slims",
                "type": "array"
            },
            "treatment_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Treatment term name",
                "type": "array"
            },
            "assay_synonyms": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay synonyms",
                "type": "array"
            },
            "organism": {
                "items": {
                    "linkTo": "Organism",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Organism",
                "type": "array"
            },
            "biosample_term_name": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample term name",
                "type": "array"
            },
            "original_files": {
                "items": {
                    "linkFrom": "File.dataset",
                    "type": [
                        "string",
                        "object"
                    ]
                },
                "title": "Original files",
                "type": "array"
            },
            "biosample_type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Biosample type",
                "type": "array"
            },
            "developmental_slims": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Developmental slims",
                "type": "array"
            },
            "assay_term_id": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Assay term id",
                "type": "array"
            },
            "revoked_datasets": {
                "items": {
                    "linkTo": "File",
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Revoked datasets",
                "type": "array"
            }
        },
        "facets": {
            "assay_term_name": {
                "title": "Assay",
                "type": "string"
            },
            "status": {
                "title": "Series status",
                "type": "string"
            },
            "assembly": {
                "title": "Genome assembly (visualization)",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism",
                "type": "string"
            },
            "target.investigated_as": {
                "title": "Target of assay",
                "type": "string"
            },
            "biosample_type": {
                "title": "Biosample type",
                "type": "string"
            },
            "organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "biosample_term_name": {
                "title": "Biosample term name",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.organ_slims": {
                "title": "Organ",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Biosample treatment",
                "type": "string"
            },
            "related_datasets.files.analysis_step_version.analysis_step.pipelines.title": {
                "title": "Pipeline",
                "type": "string"
            },
            "related_datasets.files.file_type": {
                "title": "Available data",
                "type": "string"
            },
            "related_datsets.files.run_type": {
                "title": "Run type",
                "type": "string"
            },
            "related_datasets.files.read_length": {
                "title": "Read length",
                "type": "string"
            },
            "related_datasets.replicates.library.size_range": {
                "title": "Library insert size (nt)",
                "type": "string"
            },
            "related_datasets.replicates.library.nucleic_acid_term_name": {
                "title": "Library made from",
                "type": "string"
            },
            "related_datasets.replicates.library.depleted_in_term_name": {
                "title": "Library depleted in",
                "type": "string"
            },
            "related_datasets.replicates.library.treatments.treatment_term_name": {
                "title": "Library treatment",
                "type": "array"
            },
            "month_released": {
                "title": "Date released",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "award.rfa": {
                "title": "RFA"
            }
        },
        "columns": {
            "accession": {
                "title": "Accession",
                "type": "string"
            },
            "assay_term_name": {
                "title": "Assay Type",
                "type": "string"
            },
            "related_datasets.target.label": {
                "title": "Target",
                "type": "string"
            },
            "biosample_term_name": {
                "title": "Biosample",
                "type": "string"
            },
            "organism.scientific_name": {
                "title": "Organism scientific name",
                "type": "string"
            },
            "description": {
                "title": "Description",
                "type": "string"
            },
            "lab.title": {
                "title": "Lab",
                "type": "string"
            },
            "award.project": {
                "title": "Project",
                "type": "string"
            },
            "status": {
                "title": "Status",
                "type": "string"
            },
            "target.label": {
                "title": "Target",
                "type": "string"
            },
            "related_datasets.replicates.antibody.accession": {
                "title": "Linked Antibody",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.organism.scientific_name": {
                "title": "Species",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.life_stage": {
                "title": "Life stage",
                "type": "array"
            },
            "related_datasets.replicates.library.biosample.age_display": {
                "title": "Age display",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_name": {
                "title": "Treatment",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.treatment_term_id": {
                "title": "Term ID",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration": {
                "title": "Concentration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.concentration_units": {
                "title": "Concentration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.treatments.duration": {
                "title": "Duration",
                "type": "number"
            },
            "related_datasets.replicates.library.biosample.treatments.duration_units": {
                "title": "Duration units",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.synchronization": {
                "title": "Synchronization",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time": {
                "title": "Post-synchronization time",
                "type": "string"
            },
            "related_datasets.replicates.library.biosample.post_synchronization_time_units": {
                "title": "Post-synchronization time units",
                "type": "string"
            },
            "related_datasets.length": {
                "title": "Datasets",
                "type": "array"
            },
            "files.length": {
                "title": "Files",
                "type": "array"
            },
            "encode2_dbxrefs": {
                "title": "Dbxrefs",
                "type": "array"
            }
        },
        "boost_values": {
            "accession": 1,
            "alternate_accessions": 1,
            "related_datasets.assay_term_name": 1,
            "related_datasets.assay_term_id": 1,
            "dbxrefs": 1,
            "aliases": 1,
            "related_datasets.biosample_term_id": 1,
            "related_datasets.biosample_term_name": 1,
            "related_datasets.biosample_type": 1,
            "related_datasets.organ_slims": 1,
            "related_datasets.developmental_slims": 1,
            "related_datasets.assay_synonyms": 1,
            "related_datasets.biosample_synonyms": 1,
            "files.accession": 1,
            "files.alternate_accessions": 1,
            "files.file_format": 1,
            "files.output_type": 1,
            "files.md5sum": 1,
            "related_datasets.replicates.library.accession": 1,
            "related_datasets.replicates.library.alternate_accessions": 1,
            "related_datasets.replicates.library.aliases": 1,
            "related_datasets.replicates.library.biosample.accession": 1,
            "related_datasets.replicates.library.biosample.alternate_accessions": 1,
            "related_datasets.replicates.library.biosample.aliases": 1,
            "related_datasets.replicates.library.biosample.subcellular_fraction_term_name": 1,
            "related_datasets.replicates.library.biosample.donor.accession": 1,
            "related_datasets.replicates.library.biosample.donor.alternate_accessions": 1,
            "related_datasets.replicates.antibody.accession": 1,
            "related_datasets.replicates.antibody.alternate_accessions": 1,
            "related_datasets.replicates.antibody.lot_id": 1,
            "related_datasets.replicates.antibody.lot_id_alias": 1,
            "related_datasets.replicates.antibody.clonality": 1,
            "related_datasets.replicates.antibody.isotype": 1,
            "related_datasets.replicates.antibody.purifications": 1,
            "related_datasets.replicates.antibody.product_id": 1,
            "related_datasets.replicates.antibody.aliases": 1,
            "related_datasets.replicates.antibody.dbxrefs": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1,
            "award.title": 1,
            "award.project": 1,
            "submitted_by.email": 1,
            "submitted_by.first_name": 1,
            "submitted_by.last_name": 1,
            "lab.institute_name": 1,
            "lab.institute_label": 1,
            "lab.title": 1,
            "related_datasets.possible_controls.accession": 1,
            "related_datasets.possible_controls.alternate_accessions": 1,
            "target.aliases": 1,
            "target.gene_name": 1,
            "target.label": 1,
            "target.dbxref": 1,
            "target.organism.name": 1,
            "target.organism.scientific_name": 1,
            "references.title": 1,
            "related_datasets.replicates.library.biosample.rnais.product_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "Encode2ChipSeqQualityMetric": {
        "description": "Schema for reporting the specific calculation of an quality metrics",
        "id": "/profiles/encode2_chipseq_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "type": {
                        "enum": [
                            "text/plain"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "NSC": {
                "description": "",
                "type": "number"
            },
            "RSC": {
                "description": "",
                "type": "number"
            },
            "SPOT": {
                "description": "",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "IdrSummaryQualityMetric": {
        "description": "Schema for reporting the 'Irreproducible Discovery Rate' (IDR) summary quality metric",
        "id": "/profiles/idr_summary_quality_metric.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "step_run",
            "quality_metric_of",
            "award",
            "lab"
        ],
        "additionalProperties": false,
        "identifyingProperties": [
            "uuid"
        ],
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "quality_metric.json#/properties"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/assay"
            }
        ],
        "properties": {
            "assay_term_id": {
                "@type": "@id",
                "pattern": "^(OBI|NTR):[0-9]{7}$",
                "title": "Assay ID",
                "description": "OBI (Ontology for Biomedical Investigations) ontology identifier for the assay.",
                "type": "string"
            },
            "assay_term_name": {
                "default": "",
                "title": "Assay name",
                "description": "OBI (Ontology for Biomedical Investigations) ontology term for the assay.",
                "type": "string"
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "title": "MIME type",
                        "type": "string",
                        "enum": [
                            "image/png"
                        ]
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "type": "string",
                        "title": "MD5sum"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "QC metric document metadata",
                "type": "object"
            },
            "quality_metric_of": {
                "items": {
                    "linkTo": "File",
                    "type": "string",
                    "comment": "See file.json for a list of available identifiers.",
                    "title": "File",
                    "description": "A particular file associated with this quality metric."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Files",
                "description": "One or more files that this metric either applies to or is calculated from."
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "3",
                "hidden comment": "Bump the default in the subclasses."
            },
            "step_run": {
                "type": "string",
                "title": "Analysis Step",
                "description": "Reference to analysis step run in pipeline",
                "linkTo": "AnalysisStepRun"
            },
            "Final parameter values (mu, sigma, rho, and mix)": {
                "items": {
                    "description": "",
                    "type": "number"
                },
                "type": "array",
                "default": [],
                "description": "IDR: Final parameter values (mu, sigma, rho, and mix)"
            },
            "IDR cutoff": {
                "description": "IDR: IDR cutoff",
                "type": "number"
            },
            "Initial parameter values (mu, sigma, rho, and mix)": {
                "items": {
                    "description": "",
                    "type": "number"
                },
                "type": "array",
                "default": [],
                "description": "IDR: Initial parameter values (mu, sigma, rho, and mix)"
            },
            "Number of peaks passing IDR cutoff": {
                "description": "IDR: Number of peaks passing IDR cutoff",
                "type": "number"
            },
            "Number of reported peaks": {
                "description": "IDR: Number of reported peaks",
                "type": "number"
            },
            "Percent peaks passing IDR cutoff": {
                "description": "IDR: Percent peaks passing IDR cutoff",
                "type": "number"
            },
            "Percent reported peaks": {
                "description": "IDR: Percent reported peaks",
                "type": "number"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "changelog": "/profiles/changelogs/idr_summary_quality_metric.md",
        "@type": [
            "JSONSchema"
        ]
    },
    "ConstructCharacterization": {
        "title": "DNA construct characterization",
        "description": "Schema for submitting DNA construct characterization data.",
        "id": "/profiles/construct_characterization.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "award",
            "lab",
            "characterizes",
            "attachment"
        ],
        "identifyingProperties": [
            "uuid",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/attachment"
            },
            {
                "$ref": "mixins.json#/attribution"
            },
            {
                "$ref": "mixins.json#/submitted"
            },
            {
                "$ref": "characterization.json#/properties"
            },
            {
                "$ref": "mixins.json#/notes"
            },
            {
                "$ref": "mixins.json#/standard_status"
            },
            {
                "$ref": "mixins.json#/documents"
            }
        ],
        "properties": {
            "documents": {
                "items": {
                    "comment": "See document.json for available identifiers.",
                    "type": "string",
                    "title": "Document",
                    "linkTo": "Document",
                    "description": "A document that provides additional information (not data file)."
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Documents",
                "description": "Documents that provide additional information (not data file)."
            },
            "status": {
                "enum": [
                    "in progress",
                    "deleted",
                    "replaced",
                    "released"
                ],
                "default": "in progress",
                "title": "Status",
                "description": "The current state of the characterization.",
                "type": "string"
            },
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "comment": {
                "description": "Additional information pertaining to the characterization that the submitter wishes to disclose.",
                "title": "Comment",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "type": "string",
                "title": "Schema Version",
                "default": "5",
                "hidden comment": "Bump the default in the subclasses."
            },
            "caption": {
                "type": "string",
                "title": "Caption",
                "description": "A plain text description about the characterization. Characterizations for antibodies should include brief methods, expected MW, cell line(s), labels and justification for acceptance, if necessary",
                "default": "",
                "formInput": "textarea"
            },
            "date": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "comment": "Date can be submitted in as YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSTZD (TZD is the time zone designator; use Z to express time in UTC or for time expressed in local time add a time zone offset from UTC +HH:MM or -HH:MM).",
                "title": "Date",
                "description": "The date that the characterization was run on.",
                "type": "string"
            },
            "characterizes": {
                "comment": "See contstruct.json for available identifiers.",
                "description": "The specific entity for which the characterization applies.",
                "title": "Construct characterized",
                "linkTo": "Construct",
                "type": "string"
            },
            "date_created": {
                "anyOf": [
                    {
                        "format": "date-time"
                    },
                    {
                        "format": "date"
                    }
                ],
                "serverDefault": "now",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The date the object is created.",
                "rdfs:subPropertyOf": "dc:created",
                "title": "Date created",
                "type": "string"
            },
            "submitted_by": {
                "serverDefault": "userid",
                "permission": "import_items",
                "comment": "Do not submit, value is assigned by the server. The user that created the object.",
                "rdfs:subPropertyOf": "dc:creator",
                "linkTo": "User",
                "title": "Submitted by",
                "type": "string"
            },
            "lab": {
                "comment": "See lab.json for list of available identifiers.",
                "linkTo": "Lab",
                "linkSubmitsFor": true,
                "type": "string",
                "title": "Lab",
                "description": "Lab associated with the submission."
            },
            "award": {
                "comment": "See award.json for list of available identifiers.",
                "type": "string",
                "title": "Grant",
                "description": "Grant associated with the submission.",
                "linkTo": "Award"
            },
            "attachment": {
                "properties": {
                    "download": {
                        "title": "File Name",
                        "type": "string"
                    },
                    "md5sum": {
                        "format": "md5sum",
                        "title": "MD5sum",
                        "type": "string"
                    },
                    "height": {
                        "title": "Image height",
                        "type": "integer"
                    },
                    "href": {
                        "comment": "Internal webapp URL for document file",
                        "type": "string"
                    },
                    "type": {
                        "enum": [
                            "application/msword",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "application/pdf",
                            "application/zip",
                            "text/plain",
                            "text/tab-separated-values",
                            "image/jpeg",
                            "image/tiff",
                            "image/gif",
                            "text/html",
                            "image/png",
                            "image/svs",
                            "text/autosql"
                        ],
                        "title": "MIME type",
                        "type": "string"
                    },
                    "width": {
                        "title": "Image width",
                        "type": "integer"
                    },
                    "size": {
                        "title": "File size",
                        "type": "integer"
                    }
                },
                "additionalProperties": false,
                "attachment": true,
                "formInput": "file",
                "title": "Document file metadata",
                "type": "object"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "characterization_method": {
                "enum": [
                    "immunoblot",
                    "PCR analysis"
                ],
                "type": "string",
                "title": "Method",
                "description": "Experimental method of the characterization."
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            }
        },
        "@type": [
            "JSONSchema"
        ]
    },
    "TestingLinkSource": {
        "required": [
            "target"
        ],
        "properties": {
            "target": {
                "linkTo": "TestingLinkTarget",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "status": {
                "type": "string"
            },
            "uuid": {
                "type": "string"
            },
            "name": {
                "type": "string"
            }
        },
        "@type": [
            "JSONSchema"
        ],
        "additionalProperties": false,
        "type": "object"
    },
    "Target": {
        "title": "Target",
        "description": "Schema for submitting a target gene.",
        "id": "/profiles/target.json",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": [
            "organism",
            "label",
            "investigated_as"
        ],
        "identifyingProperties": [
            "uuid",
            "label-organism.name",
            "aliases"
        ],
        "additionalProperties": false,
        "mixinProperties": [
            {
                "$ref": "mixins.json#/schema_version"
            },
            {
                "$ref": "mixins.json#/uuid"
            },
            {
                "$ref": "mixins.json#/aliases"
            },
            {
                "$ref": "mixins.json#/notes"
            }
        ],
        "properties": {
            "notes": {
                "elasticsearch_mapping_index_type": {
                    "enum": [
                        "analyzed",
                        "not_analyzed",
                        "no"
                    ],
                    "type": "string",
                    "title": "Field mapping index type",
                    "default": "analyzed",
                    "description": "Defines one of three types of indexing available"
                },
                "permission": "import_items",
                "description": "DCC internal notes.",
                "title": "Notes",
                "type": "string"
            },
            "aliases": {
                "items": {
                    "comment": "Current convention is colon separated lab name and lab identifier. (e.g. john-doe:42).",
                    "pattern": "^\\S+:\\S+",
                    "uniqueKey": "alias",
                    "description": "A lab specific identifier to reference an object.",
                    "title": "Lab alias",
                    "type": "string"
                },
                "type": "array",
                "uniqueItems": true,
                "default": [],
                "title": "Lab aliases",
                "description": "Lab specific identifiers to reference an object."
            },
            "uuid": {
                "serverDefault": "uuid4",
                "requestMethod": "POST",
                "format": "uuid",
                "title": "UUID",
                "permission": "import_items",
                "type": "string"
            },
            "schema_version": {
                "requestMethod": [],
                "comment": "Do not submit, value is assigned by the server. The version of the JSON schema that the server uses to validate the object. Schema version indicates generation of schema used to save version to to enable upgrade steps to work. Individual schemas should set the default.",
                "pattern": "^\\d+(\\.\\d+)*$",
                "default": "4",
                "title": "Schema Version",
                "type": "string"
            },
            "dbxref": {
                "items": {
                    "title": "External identifier",
                    "description": "A unique identifier from external resource (e.g. HGNC, GeneID, UniProtKB or ENSEMBL).",
                    "comment": "Submit as database name:target name (e.g. HGNC:HMFN0395, GeneID:22809)",
                    "type": "string"
                },
                "uniqueItems": true,
                "default": [],
                "title": "External identifiers",
                "description": "Unique identifiers from external resources (e.g. HGNC, GeneID, UniProtKB or ENSEMBL).",
                "type": "array"
            },
            "organism": {
                "linkTo": "Organism",
                "type": "string",
                "comment": "See organism.json for available identifiers.",
                "title": "Organism",
                "description": "Organism bearing the target."
            },
            "gene_name": {
                "type": "string",
                "format": "gene_name",
                "comment": "Submit only the identifier (e.g. HMFN0395 or 22809).",
                "title": "Gene name",
                "description": "HGNC or MGI identifier for the target."
            },
            "label": {
                "type": "string",
                "format": "target_label",
                "comment": "Submit the common name of the gene with modification (e.g. H3K4me3, eGFP-E2F1, or POLR2AphosphoS2).",
                "title": "Common name with modification",
                "description": "Common name for the target including post-translational modifications, if any."
            },
            "investigated_as": {
                "items": {
                    "title": "Target project investigation context",
                    "description": "The context(s) the target was investigated in",
                    "type": "string",
                    "enum": [
                        "histone modification",
                        "broad histone mark",
                        "narrow histone mark",
                        "transcription factor",
                        "RNA binding protein",
                        "chromatin remodeller",
                        "histone",
                        "control",
                        "tag",
                        "recombinant protein",
                        "nucleotide modification",
                        "other post-translational modification",
                        "other context"
                    ]
                },
                "uniqueItems": true,
                "type": "array"
            },
            "status": {
                "enum": [
                    "proposed",
                    "current",
                    "deleted",
                    "replaced"
                ],
                "default": "current",
                "title": "Status",
                "type": "string"
            },
            "@id": {
                "calculatedProperty": true,
                "title": "ID",
                "type": "string"
            },
            "title": {
                "calculatedProperty": true,
                "title": "Title",
                "type": "string"
            },
            "@type": {
                "items": {
                    "type": "string"
                },
                "calculatedProperty": true,
                "title": "Type",
                "type": "array"
            },
            "name": {
                "calculatedProperty": true,
                "title": "Name",
                "type": "string"
            }
        },
        "facets": {
            "organism.scientific_name": {
                "title": "Organism"
            },
            "investigated_as": {
                "title": "Target of assay"
            }
        },
        "columns": {
            "label": {
                "title": "Target"
            },
            "organism.scientific_name": {
                "title": "Species"
            },
            "dbxref": {
                "title": "External resources"
            },
            "gene_name": {
                "title": "Gene name"
            }
        },
        "boost_values": {
            "gene_name": 1,
            "label": 1,
            "dbxref": 1,
            "aliases": 1,
            "organism.name": 1,
            "organism.scientific_name": 1,
            "organism.taxon_id": 1
        },
        "@type": [
            "JSONSchema"
        ]
    }
};
