const WorkflowRunDataBlob = {
    "lab": {
    	"link_id": "~labs~4dn-dcic-lab~",
    	"display_title": "4DN DCIC, HMS",
    	"@id": "/labs/4dn-dcic-lab/",
    	"uuid": "828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
    	"principals_allowed": {
    	    "view": [
    		"system.Everyone"
    	    ],
    	    "edit": [
    		"group.admin",
    		"submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
    	    ],
    	    "audit": [
    		"system.Everyone"
    	    ]
    	}
    },
    "award": {
    	"uuid": "b0b9c607-f8b4-4f02-93f4-9895b461334b",
    	"@id": "/awards/1U01CA200059-01/",
    	"link_id": "~awards~1U01CA200059-01~",
    	"project": "4DN",
    	"display_title": "4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
	       "principals_allowed": {
	    "view": [
		"system.Everyone"
	    ],
	    "edit": [
		"group.admin"
	    ],
	    "audit": [
		"system.Everyone"
	    ]
	}
    },
    "title": "Some md5 workflow run on an extra file",
    "status": "in review by lab",
    "workflow": {
	"display_title": "Hi-C Post-alignment Processing - 4DNWFB6ILERA",
	"@id": "/workflows/023bfb3e-9a8b-42b9-a9d4-216079526f68/",
	"link_id": "~workflows~023bfb3e-9a8b-42b9-a9d4-216079526f68~",
	"workflow_type": "Hi-C data analysis",
	"title": "Hi-C Post-alignment Processing",
	"uuid": "023bfb3e-9a8b-42b9-a9d4-216079526f68",
	"steps": [
	    {
		"name": "pairsam-parse-sort",
		"meta": {
		    "software_used": [
			{
			    "@id": "/softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
			    "title": "pairsamtools_eccd21",
			    "name": "pairsamtools",
			    "display_title": "pairsamtools_eccd21",
			    "source_url": "https://github.com/mirnylab/pairsamtools",
			    "uuid": "58ed98d7-10d8-4c51-8166-4a813c62ef8c",
			    "link_id": "~softwares~58ed98d7-10d8-4c51-8166-4a813c62ef8c~",
			    "principals_allowed": {
				"view": [
				    "award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
				    "group.admin",
				    "group.read-only-admin",
				    "lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
				    "remoteuser.EMBED",
				    "remoteuser.INDEXER"
				],
				"edit": [
				    "group.admin",
				    "submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    ]
		}
	    },
	    {
		"name": "pairsam-merge",
		"meta": {
		    "software_used": [
			{
			    "@id": "/softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
			    "title": "pairsamtools_eccd21",
			    "name": "pairsamtools",
			    "display_title": "pairsamtools_eccd21",
			    "source_url": "https://github.com/mirnylab/pairsamtools",
			    "uuid": "58ed98d7-10d8-4c51-8166-4a813c62ef8c",
			    "link_id": "~softwares~58ed98d7-10d8-4c51-8166-4a813c62ef8c~",
			    "principals_allowed": {
				"view": [
				    "award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
				    "group.admin",
				    "group.read-only-admin",
				    "lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
				    "remoteuser.EMBED",
				    "remoteuser.INDEXER"
				],
				"edit": [
				    "group.admin",
				    "submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    ]
		}
	    },
	    {
		"name": "pairsam-markasdup",
		"meta": {
		    "software_used": [
			{
			    "@id": "/softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
			    "title": "pairsamtools_eccd21",
			    "name": "pairsamtools",
			    "display_title": "pairsamtools_eccd21",
			    "source_url": "https://github.com/mirnylab/pairsamtools",
			    "uuid": "58ed98d7-10d8-4c51-8166-4a813c62ef8c",
			    "link_id": "~softwares~58ed98d7-10d8-4c51-8166-4a813c62ef8c~",
			    "principals_allowed": {
				"view": [
				    "award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
				    "group.admin",
				    "group.read-only-admin",
				    "lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
				    "remoteuser.EMBED",
				    "remoteuser.INDEXER"
				],
				"edit": [
				    "group.admin",
				    "submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    ]
		}
	    },
	    {
		"name": "pairsam-filter",
		"meta": {
		    "software_used": [
			{
			    "@id": "/softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
			    "title": "pairsamtools_eccd21",
			    "name": "pairsamtools",
			    "display_title": "pairsamtools_eccd21",
			    "source_url": "https://github.com/mirnylab/pairsamtools",
			    "uuid": "58ed98d7-10d8-4c51-8166-4a813c62ef8c",
			    "link_id": "~softwares~58ed98d7-10d8-4c51-8166-4a813c62ef8c~",
			    "principals_allowed": {
				"view": [
				    "award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
				    "group.admin",
				    "group.read-only-admin",
				    "lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
				    "remoteuser.EMBED",
				    "remoteuser.INDEXER"
				],
				"edit": [
				    "group.admin",
				    "submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    ]
		}
	    }
	],
	"principals_allowed": {
	    "view": [
		"system.Everyone"
	    ],
	    "edit": [
		"group.admin"
	    ],
	    "audit": [
		"system.Everyone"
	    ]
	}
    },
    "run_status": "complete",
    "input_files": [
    	{
    	    "value": {
    		"@id": "/files-processed/4DNFIFYGNO9R/",
    		"link_id": "~files-processed~4DNFIFYGNO9R~",
    		"display_title": "4DNFIFYGNO9R.bam",
    		"status": "released",
    		"uuid": "b4002377-49e5-4c33-afab-9ec90d65faf3",
    		"accession": "4DNFIFYGNO9R",
    		"file_format": {
    		    "uuid": "d13d06cf-218e-4f61-aaf0-91f226248b3c",
    		    "@id": "/file-formats/bam/",
    		    "link_id": "~file-formats~bam~",
    		    "display_title": "bam",
    		    "principals_allowed": {
    			"view": [
    			    "system.Everyone"
    			],
    			"edit": [
    			    "group.admin"
    			],
    			"audit": [
    			    "system.Everyone"
    			]
    		    }
    		},
    		"@type": [
    		    "FileProcessed",
    		    "File",
    		    "Item"
    		],
    		"filename": "_6_out_pair1.bam",
    		"principals_allowed": {
    		    "view": [
    			"system.Everyone"
    		    ],
    		    "edit": [
    			"group.admin"
    		    ],
    		    "audit": [
    			"system.Everyone"
    		    ]
    		}
    	    },
    	    "ordinal": 1,
    	    "workflow_argument_name": "input_bams"
    	},
    	{
    	    "value": {
    		"@id": "/files-reference/4DNFI823LSII/",
    		"link_id": "~files-reference~4DNFI823LSII~",
    		"display_title": "4DNFI823LSII.chrom.sizes",
    		"status": "uploaded",
    		"uuid": "4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
    		"accession": "4DNFI823LSII",
    		"file_format": {
    		    "uuid": "d13d06cf-218e-4f61-55f0-93f226248b2c",
    		    "@id": "/file-formats/chromsizes/",
    		    "link_id": "~file-formats~chromsizes~",
    		    "display_title": "chromsizes",
    		    "principals_allowed": {
    			"view": [
    			    "system.Everyone"
    			],
    			"edit": [
    			    "group.admin"
    			],
    			"audit": [
    			    "system.Everyone"
    			]
    		    }
    		},
    		"@type": [
    		    "FileReference",
    		    "File",
    		    "Item"
    		],
    		"filename": "hg38.mainonly.chrom.sizes",
    		"principals_allowed": {
    		    "view": [
    			"award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
    			"group.admin",
    			"group.read-only-admin",
    			"lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
    			"remoteuser.EMBED",
    			"remoteuser.INDEXER"
    		    ],
    		    "edit": [
    			"group.admin",
    			"submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
    		    ],
    		    "audit": [
    			"system.Everyone"
    		    ]
    		}
    	    },
    	    "ordinal": 1,
    	    "workflow_argument_name": "chromsize"
    	}
    ],
    "date_created": "2018-10-05T14:33:35.942475+00:00",
    "output_files": [
        {
            "type":"Output processed file",
            "value":{
                "link_id":"~files-processed~4DNFIFYGNO9R~",
                "@id":"/files-processed/4DNFIFYGNO9R/",
                "display_title":"4DNFIFYGNO9R.bam",
                "@type":[
                    "FileProcessed",
                    "File",
                    "Item"
                ],
                "file_format":"bam",
                "accession":"4DNFIFYGNO9R",
                "uuid":"b4002377-49e5-4c33-afab-9ec90d65faf3",
                "principals_allowed":{
                    "view":[
                        "award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
                        "group.admin",
                        "group.read-only-admin",
                        "lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                        "remoteuser.EMBED",
                        "remoteuser.INDEXER"
                    ],
                    "edit":[
                        "group.admin",
                        "submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
                    ],
                    "audit":[
                        "system.Everyone"
                    ]
                }
            },
            "format":"bam",
            "status":"COMPLETED",
            "export_id":"B9H2LpQuS5O4P61FlSUYQSfdurJbjRhM",
            "extension":".bam",
            "upload_key":"b4002377-49e5-4c33-afab-9ec90d65faf3/4DNFIFYGNO9R.bam",
            "workflow_argument_name": "annotated_bam"
        },
    	{
    	    "type": "Output processed file",
            "value":{
                "link_id":"~files-processed~4DNFIFYGNO9R~",
                "@id":"/files-processed/4DNFIFYGNO9R/",
                "display_title":"4DNFIFYGNO9R.bam",
                "@type":[
                    "FileProcessed",
                    "File",
                    "Item"
                ],
                "file_format":"bam",
                "accession":"4DNFIFYGNO9R",
                "uuid":"b4002377-49e5-4c33-afab-9ec90d65faf3",
                "principals_allowed":{
                    "view":[
                        "award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
                        "group.admin",
                        "group.read-only-admin",
                        "lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                        "remoteuser.EMBED",
                        "remoteuser.INDEXER"
                    ],
                    "edit":[
                        "group.admin",
                        "submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
                    ],
                    "audit":[
                        "system.Everyone"
                    ]
                }
            },
            "format":"bam",
            "status":"COMPLETED",
            "export_id":"B9H2LpQuS5O4P61FlSUYQSfdurJbjRhM",
            "extension":".bam",
            "upload_key":"b4002377-49e5-4c33-afab-9ec90d65faf3/4DNFIFYGNO9R.bam",
    	    "workflow_argument_name": "filtered_pairs"
    	}
    ],
    "submitted_by": {
    	"uuid": "9866662f-4eb6-3a4b-7cdf-3ab267226988",
    	"link_id": "~users~9866662f-4eb6-3a4b-7cdf-3ab267226988~",
    	"@id": "/users/9866662f-4eb6-3a4b-7cdf-3ab267226988/",
    	"display_title": "Chad Serrant",
    	"principals_allowed": {
    	    "view": [
    		"group.admin",
    		"group.read-only-admin",
    		"remoteuser.EMBED",
    		"remoteuser.INDEXER",
    		"userid.9866662f-4eb6-3a4b-7cdf-3ab267226988"
    	    ],
    	    "edit": [
    		"group.admin",
    		"userid.9866662f-4eb6-3a4b-7cdf-3ab267226988"
    	    ],
    	    "audit": [
    		"system.Everyone"
    	    ]
    	}
    },
    "last_modified": {
	"modified_by": {
	    "link_id": "~users~9866662f-4eb6-3a4b-7cdf-3ab267226988~",
	    "display_title": "Chad Serrant",
	    "@id": "/users/9866662f-4eb6-3a4b-7cdf-3ab267226988/",
	    "uuid": "9866662f-4eb6-3a4b-7cdf-3ab267226988",
	    "principals_allowed": {
		"view": [
		    "group.admin",
		    "group.read-only-admin",
		    "remoteuser.EMBED",
		    "remoteuser.INDEXER",
		    "userid.9866662f-4eb6-3a4b-7cdf-3ab267226988"
		],
		"edit": [
		    "group.admin",
		    "userid.9866662f-4eb6-3a4b-7cdf-3ab267226988"
		],
		"audit": [
		    "system.Everyone"
		]
	    }
	},
	"date_modified": "2018-10-05T14:33:35.962603+00:00"
    },
    "metadata_only": true,
    "schema_version": "2",
    "@id": "/workflow-runs-awsem/383f73b0-7a7f-4d99-a86d-2cb91095b473/",
    "@type": [
	"WorkflowRunAwsem",
	"WorkflowRun",
	"Item"
    ],
    "uuid": "383f73b0-7a7f-4d99-a86d-2cb91095b473",
    "external_references": [ ],
    "display_title": "Some md5 workflow run on an extra file",
    "link_id": "~workflow-runs-awsem~383f73b0-7a7f-4d99-a86d-2cb91095b473~",
    "principals_allowed": {
	"view": [
	    "award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
	    "group.admin",
	    "group.read-only-admin",
	    "lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
	    "remoteuser.EMBED",
	    "remoteuser.INDEXER"
	],
	"edit": [
	    "group.admin",
	    "submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
	],
	"audit": [
	    "system.Everyone"
	]
    },
    "@context": "/terms/",
    "actions": [
	{
	    "name": "create",
	    "title": "Create",
	    "profile": "/profiles/WorkflowRunAwsem.json",
	    "href": "/workflow-runs-awsem/383f73b0-7a7f-4d99-a86d-2cb91095b473/#!create"
	},
	{
	    "name": "edit",
	    "title": "Edit",
	    "profile": "/profiles/WorkflowRunAwsem.json",
	    "href": "/workflow-runs-awsem/383f73b0-7a7f-4d99-a86d-2cb91095b473/#!edit"
	}
    ],
    "audit": {
	"INTERNAL_ACTION": [
	    {
		"category": "mismatched status",
		"detail": "released /workflows/023bfb3e-9a8b-42b9-a9d4-216079526f68/ has in review by lab subobject /softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
		"level": 30,
		"level_name": "INTERNAL_ACTION",
		"path": "/workflows/023bfb3e-9a8b-42b9-a9d4-216079526f68/",
		"name": "audit_item_status"
	    }
	]
    },
    "steps": [
	{
	    "meta": {
		"description": "Parsing and sorting bam file",
		"software_used": [
		    {
			"link_id": "~softwares~58ed98d7-10d8-4c51-8166-4a813c62ef8c~",
			"name": "pairsamtools",
			"uuid": "58ed98d7-10d8-4c51-8166-4a813c62ef8c",
			"source_url": "https://github.com/mirnylab/pairsamtools",
			"title": "pairsamtools_eccd21",
			"@id": "/softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
			"display_title": "pairsamtools_eccd21",
			"principals_allowed": {
			    "view": [
				"award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
				"group.admin",
				"group.read-only-admin",
				"lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
				"remoteuser.EMBED",
				"remoteuser.INDEXER"
			    ],
			    "edit": [
				"group.admin",
				"submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
			    ],
			    "audit": [
				"system.Everyone"
			    ]
			}
		    }
		],
		"analysis_step_types": [
		    "annotation",
		    "sorting"
		]
	    },
	    "name": "pairsam-parse-sort",
	    "inputs": [
		{
		    "meta": {
			"type": "data file",
			"global": true,
			"cardinality": "array",
			"file_format": {
			    "@id": "/file-formats/bam/",
			    "link_id": "~file-formats~bam~",
			    "uuid": "d13d06cf-218e-4f61-aaf0-91f226248b3c",
			    "display_title": "bam",
			    "principals_allowed": {
				"view": [
				    "system.Everyone"
				],
				"edit": [
				    "group.admin"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    },
		    "name": "bam",
		    "source": [
			{
			    "name": "input_bams"
			}
		    ],
		    "run_data": {
			"file": [
			    "b4002377-49e5-4c33-afab-9ec90d65faf3"
			],
			"type": "input",
			"meta": [
			    {
				"ordinal": 1
			    }
			]
		    }
		},
		{
		    "meta": {
			"type": "reference file",
			"global": true,
			"cardinality": "single",
			"file_format": {
			    "@id": "/file-formats/chromsizes/",
			    "link_id": "~file-formats~chromsizes~",
			    "uuid": "d13d06cf-218e-4f61-55f0-93f226248b2c",
			    "display_title": "chromsizes",
			    "principals_allowed": {
				"view": [
				    "system.Everyone"
				],
				"edit": [
				    "group.admin"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    },
		    "name": "chromsize",
		    "source": [
			{
			    "name": "chromsize"
			}
		    ],
		    "run_data": {
			"file": [
			    "4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
			],
			"type": "input",
			"meta": [
			    {
				"ordinal": 1
			    }
			]
		    }
		},
		{
		    "meta": {
			"type": "parameter",
			"global": true,
			"cardinality": "single"
		    },
		    "name": "Threads",
		    "source": [
			{
			    "name": "nthreads_parse_sort"
			}
		    ]
		}
	    ],
	    "outputs": [
		{
		    "meta": {
			"type": "data file",
			"global": false,
			"cardinality": "single",
			"file_format": "d13d06cf-218e-5f61-aaf0-91f226248b2c"
		    },
		    "name": "sorted_pairsam",
		    "target": [
			{
			    "name": "input_pairsams",
			    "step": "pairsam-merge"
			}
		    ]
		}
	    ]
	},
	{
	    "meta": {
		"description": "Merging pairsam files",
		"software_used": [
		    {
			"link_id": "~softwares~58ed98d7-10d8-4c51-8166-4a813c62ef8c~",
			"name": "pairsamtools",
			"uuid": "58ed98d7-10d8-4c51-8166-4a813c62ef8c",
			"source_url": "https://github.com/mirnylab/pairsamtools",
			"title": "pairsamtools_eccd21",
			"@id": "/softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
			"display_title": "pairsamtools_eccd21",
			"principals_allowed": {
			    "view": [
				"award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
				"group.admin",
				"group.read-only-admin",
				"lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
				"remoteuser.EMBED",
				"remoteuser.INDEXER"
			    ],
			    "edit": [
				"group.admin",
				"submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
			    ],
			    "audit": [
				"system.Everyone"
			    ]
			}
		    }
		],
		"analysis_step_types": [
		    "merging"
		]
	    },
	    "name": "pairsam-merge",
	    "inputs": [
		{
		    "meta": {
			"type": "data file",
			"global": false,
			"cardinality": "single",
			"file_format": {
			    "@id": "/file-formats/pairsam/",
			    "link_id": "~file-formats~pairsam~",
			    "uuid": "d13d06cf-218e-5f61-aaf0-91f226248b2c",
			    "display_title": "pairsam",
			    "principals_allowed": {
				"view": [
				    "system.Everyone"
				],
				"edit": [
				    "group.admin"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    },
		    "name": "input_pairsams",
		    "source": [
			{
			    "name": "sorted_pairsam",
			    "step": "pairsam-parse-sort"
			}
		    ]
		},
		{
		    "meta": {
			"type": "parameter",
			"global": true,
			"cardinality": "single"
		    },
		    "name": "nThreads",
		    "source": [
			{
			    "name": "nthreads_merge"
			}
		    ]
		}
	    ],
	    "outputs": [
		{
		    "meta": {
			"type": "data file",
			"global": false,
			"cardinality": "single",
			"file_format": "d13d06cf-218e-5f61-aaf0-91f226248b2c"
		    },
		    "name": "merged_pairsam",
		    "target": [
			{
			    "name": "input_pairsam",
			    "step": "pairsam-markasdup"
			}
		    ]
		}
	    ]
	},
	{
	    "meta": {
		"description": "Marking duplicates to pairsam file",
		"software_used": [
		    {
			"link_id": "~softwares~58ed98d7-10d8-4c51-8166-4a813c62ef8c~",
			"name": "pairsamtools",
			"uuid": "58ed98d7-10d8-4c51-8166-4a813c62ef8c",
			"source_url": "https://github.com/mirnylab/pairsamtools",
			"title": "pairsamtools_eccd21",
			"@id": "/softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
			"display_title": "pairsamtools_eccd21",
			"principals_allowed": {
			    "view": [
				"award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
				"group.admin",
				"group.read-only-admin",
				"lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
				"remoteuser.EMBED",
				"remoteuser.INDEXER"
			    ],
			    "edit": [
				"group.admin",
				"submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
			    ],
			    "audit": [
				"system.Everyone"
			    ]
			}
		    }
		],
		"analysis_step_types": [
		    "filter"
		]
	    },
	    "name": "pairsam-markasdup",
	    "inputs": [
		{
		    "meta": {
			"type": "data file",
			"global": false,
			"cardinality": "single",
			"file_format": {
			    "@id": "/file-formats/pairsam/",
			    "link_id": "~file-formats~pairsam~",
			    "uuid": "d13d06cf-218e-5f61-aaf0-91f226248b2c",
			    "display_title": "pairsam",
			    "principals_allowed": {
				"view": [
				    "system.Everyone"
				],
				"edit": [
				    "group.admin"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    },
		    "name": "input_pairsam",
		    "source": [
			{
			    "name": "merged_pairsam",
			    "step": "pairsam-merge"
			}
		    ]
		}
	    ],
	    "outputs": [
		{
		    "meta": {
			"type": "data file",
			"global": false,
			"cardinality": "single",
			"file_format": "d13d06cf-218e-5f61-aaf0-91f226248b2c"
		    },
		    "name": "dupmarked_pairsam",
		    "target": [
			{
			    "name": "input_pairsam",
			    "step": "pairsam-filter"
			}
		    ]
		}
	    ]
	},
	{
	    "meta": {
		"description": "Filtering duplicate and invalid reads",
		"software_used": [
		    {
			"link_id": "~softwares~58ed98d7-10d8-4c51-8166-4a813c62ef8c~",
			"name": "pairsamtools",
			"uuid": "58ed98d7-10d8-4c51-8166-4a813c62ef8c",
			"source_url": "https://github.com/mirnylab/pairsamtools",
			"title": "pairsamtools_eccd21",
			"@id": "/softwares/58ed98d7-10d8-4c51-8166-4a813c62ef8c/",
			"display_title": "pairsamtools_eccd21",
			"principals_allowed": {
			    "view": [
				"award.b0b9c607-f8b4-4f02-93f4-9895b461334b",
				"group.admin",
				"group.read-only-admin",
				"lab.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
				"remoteuser.EMBED",
				"remoteuser.INDEXER"
			    ],
			    "edit": [
				"group.admin",
				"submits_for.828cd4fe-ebb0-4b36-a94a-d2e3a36cc989"
			    ],
			    "audit": [
				"system.Everyone"
			    ]
			}
		    }
		],
		"analysis_step_types": [
		    "filter",
		    "file format conversion"
		]
	    },
	    "name": "pairsam-filter",
	    "inputs": [
		{
		    "meta": {
			"type": "data file",
			"global": false,
			"cardinality": "single",
			"file_format": {
			    "@id": "/file-formats/pairsam/",
			    "link_id": "~file-formats~pairsam~",
			    "uuid": "d13d06cf-218e-5f61-aaf0-91f226248b2c",
			    "display_title": "pairsam",
			    "principals_allowed": {
				"view": [
				    "system.Everyone"
				],
				"edit": [
				    "group.admin"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    },
		    "name": "input_pairsam",
		    "source": [
			{
			    "name": "dupmarked_pairsam",
			    "step": "pairsam-markasdup"
			}
		    ]
		},
		{
		    "meta": {
			"type": "reference file",
			"global": true,
			"cardinality": "single",
			"file_format": {
			    "@id": "/file-formats/chromsizes/",
			    "link_id": "~file-formats~chromsizes~",
			    "uuid": "d13d06cf-218e-4f61-55f0-93f226248b2c",
			    "display_title": "chromsizes",
			    "principals_allowed": {
				"view": [
				    "system.Everyone"
				],
				"edit": [
				    "group.admin"
				],
				"audit": [
				    "system.Everyone"
				]
			    }
			}
		    },
		    "name": "chromsize",
		    "source": [
			{
			    "name": "chromsize"
			}
		    ],
		    "run_data": {
			"file": [
			    "4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
			],
			"type": "input",
			"meta": [
			    {
				"ordinal": 1
			    }
			]
		    }
		}
	    ],
	    "outputs": [
    		{
    		    "meta": {
    			"type": "data file",
    			"global": true,
    			"cardinality": "single",
    			"file_format": "d13d06cf-218e-4f61-aaf0-91f226248b3c"
    		    },
    		    "name": "lossless_bamfile",
    		    "target": [
    			{
    			    "name": "annotated_bam"
    			}
    		    ]
    		},
    		{
    		    "meta": {
    			"type": "data file",
    			"global": true,
    			"cardinality": "single",
    			"file_format": "d13d06cf-218e-4f61-aaf0-91f226248b2c"
    		    },
    		    "name": "filtered_pairs",
    		    "target": [
    			{
    			    "name": "filtered_pairs"
    			}
    		    ]
    		}
	    ]
	}
    ]
};

export default WorkflowRunDataBlob;
