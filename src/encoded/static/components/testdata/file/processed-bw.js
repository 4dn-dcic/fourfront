export const FILE = {
    "experiments":[

    ],
    "produced_from":[
        "van-steensel-lab:HFF_r1_Dam1-5kb.counts.txt.gz"
    ],
    "href":"/files-processed/4DNFIC79QOAT/@@download/4DNFIC79QOAT.bw",
    "lab":{
        "display_title":"Bas van Steensel, NKI",
        "title":"Bas van Steensel, NKI",
        "principals_allowed":{
            "audit":[
                "system.Everyone"
            ],
            "view":[
                "system.Everyone"
            ],
            "edit":[
                "group.admin",
                "submits_for.6343d57a-213e-4ac7-89ec-8b5e74c21bd2"
            ]
        },
        "uuid":"6343d57a-213e-4ac7-89ec-8b5e74c21bd2",
        "@id":"/labs/bas-van-steensel-lab/",
        "link_id":"~labs~bas-van-steensel-lab~"
    },
    "date_created":"2018-04-11T10:33:00.347893+00:00",
    "public_release":"2018-06-12",
    "accession":"4DNFIC79QOAT",
    "description":"5 kb (Read normalized) count track - Dam-only replicate 1",
    "display_title":"4DNFIC79QOAT.bw",
    "link_id":"~files-processed~4DNFIC79QOAT~",
    "audit":{
        "INTERNAL_ACTION":[
            {
                "category":"mismatched status",
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status",
                "detail":"released /workflow-runs-awsem/b8b8a713-ac02-467b-84f2-ffcbb99d4e67/ has in review by lab subobject /workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/",
                "path":"/workflow-runs-awsem/b8b8a713-ac02-467b-84f2-ffcbb99d4e67/",
                "level":30
            },
            {
                "category":"mismatched status",
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status",
                "detail":"released /workflow-runs-awsem/74c77d9c-a5fe-4807-b29d-8a563e567a9e/ has in review by lab subobject /workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/",
                "path":"/workflow-runs-awsem/74c77d9c-a5fe-4807-b29d-8a563e567a9e/",
                "level":30
            },
            {
                "category":"mismatched status",
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status",
                "detail":"released /workflow-runs-awsem/20faa462-f8e3-4a5c-b1dd-15b96692db34/ has in review by lab subobject /workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/",
                "path":"/workflow-runs-awsem/20faa462-f8e3-4a5c-b1dd-15b96692db34/",
                "level":30
            }
        ],
        "WARNING":[
            {
                "category":"No meta property",
                "level_name":"WARNING",
                "name":"audit_workflow_steps",
                "detail":"Workflow /workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/ step \"Provenance Tracking\" (index 0) has no softwares in its `step.meta.software_used field` (list).",
                "path":"/workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/",
                "level":40
            },
            {
                "category":"Missing meta property",
                "level_name":"WARNING",
                "name":"audit_workflow_steps",
                "detail":"Workflow /workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/ step \"Provenance Tracking\" (index 0) input \"inputs\" (index 0) is missing `meta.file_format`.",
                "path":"/workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/",
                "level":40
            },
            {
                "category":"Missing meta property",
                "level_name":"WARNING",
                "name":"audit_workflow_steps",
                "detail":"Workflow /workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/ step \"Provenance Tracking\" (index 0) output \"outputs\" (index 0) is missing `meta.file_format`.",
                "path":"/workflows/bef50397-4d72-4ed1-9c78-100e14e5c47f/",
                "level":40
            }
        ]
    },
    "@context":"/terms/",
    "aliases":[
        "van-steensel-lab:HFF_r1_Dam1-5kb.bw"
    ],
    "workflow_run_outputs":[
        {
            "display_title":"File Provenance Tracking Workflow run on 2018-06-18 16:32:02.997020",
            "output_files":[
                {
                    "workflow_argument_name":"outputs",
                    "value":{
                        "display_title":"4DNFIC79QOAT.bw",
                        "accession":"4DNFIC79QOAT",
                        "file_format":"bw",
                        "principals_allowed":{
                            "audit":[
                                "system.Everyone"
                            ],
                            "view":[
                                "system.Everyone"
                            ],
                            "edit":[
                                "group.admin"
                            ]
                        },
                        "uuid":"45ef37ff-ea65-4b71-bd54-f0a728b464e6",
                        "@id":"/files-processed/4DNFIC79QOAT/",
                        "link_id":"~files-processed~4DNFIC79QOAT~"
                    }
                }
            ],
            "link_id":"~workflow-runs-awsem~20faa462-f8e3-4a5c-b1dd-15b96692db34~",
            "@id":"/workflow-runs-awsem/20faa462-f8e3-4a5c-b1dd-15b96692db34/",
            "principals_allowed":{
                "audit":[
                    "system.Everyone"
                ],
                "view":[
                    "system.Everyone"
                ],
                "edit":[
                    "group.admin"
                ]
            },
            "uuid":"20faa462-f8e3-4a5c-b1dd-15b96692db34",
            "workflow":{
                "error":"no view permissions"
            },
            "input_files":[
                {
                    "workflow_argument_name":"inputs",
                    "value":{
                        "display_title":"4DNFI3O6254D.txt.gz",
                        "@id":"/files-processed/4DNFI3O6254D/",
                        "file_format":"txt",
                        "principals_allowed":{
                            "audit":[
                                "system.Everyone"
                            ],
                            "view":[
                                "system.Everyone"
                            ],
                            "edit":[
                                "group.admin"
                            ]
                        },
                        "filename":"HFF_r1_Dam1-5kb.counts.txt.gz",
                        "accession":"4DNFI3O6254D",
                        "uuid":"b382a8b8-64bc-4ee4-adf5-eb2fac875ed5",
                        "link_id":"~files-processed~4DNFI3O6254D~"
                    }
                }
            ]
        }
    ],
    "file_type_detailed":"counts (bw)",
    "file_classification":"processed file",
    "title":"4DNFIC79QOAT",
    "uuid":"45ef37ff-ea65-4b71-bd54-f0a728b464e6",
    "file_size":4752505,
    "md5sum":"b0721c5af01c3fbea09f7959ff2ad674",
    "experiment_sets":[

    ],
    "external_references":[

    ],
    "status":"released",
    "file_format":"bw",
    "@id":"/files-processed/4DNFIC79QOAT/",
    "upload_key":"45ef37ff-ea65-4b71-bd54-f0a728b464e6/4DNFIC79QOAT.bw",
    "schema_version":"1",
    "@type":[
        "FileProcessed",
        "File",
        "Item"
    ],
    "last_modified":{
        "date_modified":"2018-06-29T18:52:20.894527+00:00",
        "modified_by":{
            "error":"no view permissions"
        }
    },
    "workflow_run_inputs":[

    ],
    "higlass_uid":"eI8zb-LqR6qkxvSh5fXGhQ",
    "principals_allowed":{
        "audit":[
            "system.Everyone"
        ],
        "view":[
            "system.Everyone"
        ],
        "edit":[
            "group.admin"
        ]
    },
    "file_type":"counts",
    "submitted_by":{
        "error":"no view permissions"
    },
    "filename":"HFF_r1_Dam1-5kb.bw",
    "award":{
        "display_title":"COMBINED CYTOLOGICAL, GENOMIC, AND FUNCTIONAL MAPPING OF NUCLEAR GENOME ORGANIZATION",
        "project":"4DN",
        "@id":"/awards/1U54DK107965-01/",
        "principals_allowed":{
            "audit":[
                "system.Everyone"
            ],
            "view":[
                "system.Everyone"
            ],
            "edit":[
                "group.admin"
            ]
        },
        "uuid":"91b694c3-f4d7-4ddd-8278-16f94e15c1c5",
        "link_id":"~awards~1U54DK107965-01~"
    }
};