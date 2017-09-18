// Taken from https://data.4dnucleome.org/experiment-set-replicates/4DNESLLTENG9/ @ 09/18/2017 - 2:27pm EST
export const PARTIALLY_RELEASED_PROCESSED_FILES = [
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"33db8da4-c689-4ae1-a47a-22e8fc39eeb2",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/ddb3d267-0289-48bd-afd2-1505ad8977a6/",
                        "step_name":"pairsam-merge"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"af8908bf-fdcb-40be-8bca-f1a49226bd20",
                "accession":"4DNWF3YV81HS",
                "@id":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                "display_title":"Merging for Hi-C using pairsamtools - 4DNWF3YV81HS"
            },
            "@id":"/workflow-runs-awsem/33db8da4-c689-4ae1-a47a-22e8fc39eeb2/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-15T17:42:18.662548+00:00"
        },
        "name":"pairsam-merge run 2017-09-15 17:42:17.814966",
        "outputs":[
            {
                "target":[
                    {
                        "name":"merged_pairsam",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairsams",
                        "step":"pairsam-markasdup run 2017-09-15 20:28:42.315188",
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairsam",
                        "step":"pairsam-markasdup run 2017-09-15 20:30:47.997521",
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "type":"Input file"
                    }
                ],
                "name":"merged_pairsam",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                            "accession":"4DNFIEDB5C3N",
                            "@id":"/files-processed/4DNFIEDB5C3N/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e/4DNFIEDB5C3N.sam.pairs.gz",
                            "format":"pairsam",
                            "extension":".sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                            "accession":"4DNFIUWMF9A1",
                            "@id":"/files-processed/4DNFIUWMF9A1/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"df45891e-4341-4233-baf2-d296c7e08abe",
                            "accession":"4DNFIYOVMUJU",
                            "@id":"/files-processed/4DNFIYOVMUJU/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"be6daffe-094d-4758-b138-20f0e8080987",
                            "accession":"4DNFI4W2MRIY",
                            "@id":"/files-processed/4DNFI4W2MRIY/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"f3310aa9-d947-40f5-8e65-9cbe24386187",
                            "accession":"4DNFIOKIESM4",
                            "@id":"/files-processed/4DNFIOKIESM4/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        },
                        {
                            "ordinal":2
                        },
                        {
                            "ordinal":3
                        },
                        {
                            "ordinal":4
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsams",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "name":"out_pairsam",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:37.332192",
                        "for_file":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                        "type":"Output file"
                    },
                    {
                        "grouped_by":"workflow",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:42.439084",
                        "for_file":"df45891e-4341-4233-baf2-d296c7e08abe",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group"
                    },
                    {
                        "grouped_by":"workflow",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:47.780382",
                        "for_file":"be6daffe-094d-4758-b138-20f0e8080987",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group"
                    },
                    {
                        "grouped_by":"workflow",
                        "step":"pairsam-parse-sort run 2017-09-14 20:21:10.272849",
                        "for_file":"f3310aa9-d947-40f5-8e65-9cbe24386187",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"e42511cf-a65a-471c-8189-d44bcbf0f6e9",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/7c06be8b-7510-44e0-83ec-72cc32f5d759/",
                        "step_name":"pairsam-markasdup"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"a18978fa-7e78-488f-8e6b-bfb6f63b8861",
                "accession":"4DNWF1Y7DN3H",
                "@id":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                "display_title":"Duplicate Marking for Hi-C using pairsamtools - 4DNWF1Y7DN3H"
            },
            "@id":"/workflow-runs-awsem/e42511cf-a65a-471c-8189-d44bcbf0f6e9/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-15T20:30:48.933917+00:00"
        },
        "name":"pairsam-markasdup run 2017-09-15 20:30:47.997521",
        "outputs":[
            {
                "target":[
                    {
                        "name":"out_markedpairsam",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairsam",
                        "step":"pairsam-filter run 2017-09-16 00:10:42.865657",
                        "for_file":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                        "type":"Input file"
                    }
                ],
                "name":"out_markedpairsam",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                            "accession":"4DNFIQAOXKIE",
                            "@id":"/files-processed/4DNFIQAOXKIE/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"c08b165e-8fc0-46af-8211-d363f7def6dc/4DNFIQAOXKIE.sam.pairs.gz",
                            "format":"pairsam",
                            "extension":".sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                            "accession":"4DNFIEDB5C3N",
                            "@id":"/files-processed/4DNFIEDB5C3N/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsam",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                        "name":"merged_pairsam",
                        "step":"pairsam-merge run 2017-09-15 17:42:17.814966",
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "type":"Output file"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"b2fc0880-62be-460e-b854-d87a58c6665a",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/78708866-f965-4d85-9d01-577a03f51a12/",
                        "step_name":"pairsam-filter"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"3758e00c-2035-43c6-b783-bb92afe57c99",
                "accession":"4DNWF38VH15",
                "@id":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                "display_title":"Filtering for Hi-C using pairsamtools - 4DNWF38VH15"
            },
            "@id":"/workflow-runs-awsem/b2fc0880-62be-460e-b854-d87a58c6665a/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-16T00:10:43.881118+00:00"
        },
        "name":"pairsam-filter run 2017-09-16 00:10:42.865657",
        "outputs":[
            {
                "target":[
                    {
                        "name":"dedup_pairs",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 06:37:00.522517",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 12:43:22.792334",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 12:52:22.610248",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 12:38:05.242959",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 13:03:48.467162",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 17:41:53.342405",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 17:39:35.317009",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 17:43:24.062800",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 18:10:31.828943",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 17:49:11.523410",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 19:00:35.005961",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file"
                    }
                ],
                "name":"dedup_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                            "accession":"4DNFIUYTV61P",
                            "@id":"/files-processed/4DNFIUYTV61P/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"aa3303ce-b7e4-43ce-b4f2-5262252fc383/4DNFIUYTV61P.pairs.gz",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"lossless_bamfile",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"lossless_bamfile",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"267d5500-3b62-42c2-bb5b-aa29e01f1942",
                            "accession":"4DNFIVZL95G8",
                            "@id":"/files-processed/4DNFIVZL95G8/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"alignment",
                            "file_format":"bam"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"267d5500-3b62-42c2-bb5b-aa29e01f1942/4DNFIVZL95G8.bam",
                            "format":"bam",
                            "extension":".bam"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                            "accession":"4DNFIQAOXKIE",
                            "@id":"/files-processed/4DNFIQAOXKIE/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsam",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                        "name":"out_markedpairsam",
                        "step":"pairsam-markasdup run 2017-09-15 20:30:47.997521",
                        "for_file":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "accession":"4DNFI823LSII",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "description":null,
                            "file_type":null,
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_format":"chromsizes"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"chromsize",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"aff1f384-9509-405f-a45e-199ef0197d8a",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/e6843cbd-1de7-41fe-99c4-481c10f21d07/",
                        "step_name":"addfragtopairs"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"ef125750-8df2-418e-a1ee-402285f9dd93",
                "accession":"4DNWZJ2G671",
                "@id":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                "display_title":"Adding restriction fragment information for Hi-C using pairsamtools - 4DNWZJ2G671"
            },
            "@id":"/workflow-runs-awsem/aff1f384-9509-405f-a45e-199ef0197d8a/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-16T19:00:35.851375+00:00"
        },
        "name":"addfragtopairs run 2017-09-16 19:00:35.005961",
        "outputs":[
            {
                "target":[
                    {
                        "name":"out_pairs",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:30:41.169153",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:32:48.239377",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:35:03.320784",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:36:03.758593",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:42:13.332548",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:44:58.848283",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:47:08.099808",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:48:31.758438",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:50:15.598177",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:37:18.798745",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:40:45.920184",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:52:16.518046",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:00:20.262051",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:02:18.046058",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:03:46.298438",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:07:54.385333",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 11:25:43.106767",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:08:37.399176",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:09:34.459070",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:11:03.520632",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:12:29.820949",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:15:31.645764",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 11:26:38.913455",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:10:31.498627",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:13:42.447938",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:14:57.699478",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 11:17:12.251003",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 11:28:31.143029",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:06:06.500899",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:08:22.318537",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"pairs-patch run 2017-09-17 16:18:00.793815",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:22:41.836612",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file"
                    }
                ],
                "name":"out_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                            "accession":"4DNFIN4DMXPR",
                            "@id":"/files-processed/4DNFIN4DMXPR/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[
                                {
                                    "status":"to be uploaded by workflow",
                                    "href":"/7f10fb06-a2bf-4385-9f2b-81c96438b009/@@download/4DNFIN4DMXPR.pairs.gz.px2",
                                    "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                                    "accession":"4DNFIN4DMXPR",
                                    "filename":"4DNFIN4DMXPR",
                                    "file_format":"pairs_px2",
                                    "upload_key":"7f10fb06-a2bf-4385-9f2b-81c96438b009/4DNFIN4DMXPR.pairs.gz.px2"
                                }
                            ],
                            "upload_key":"7f10fb06-a2bf-4385-9f2b-81c96438b009/4DNFIN4DMXPR.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                            "accession":"4DNFIUYTV61P",
                            "@id":"/files-processed/4DNFIUYTV61P/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                        "name":"dedup_pairs",
                        "step":"pairsam-filter run 2017-09-16 00:10:42.865657",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                            "accession":"4DNFI823MBKE",
                            "@id":"/files-reference/4DNFI823MBKE/",
                            "description":null,
                            "file_type":null,
                            "filename":"GRCh38_HindIII_new.txt",
                            "file_format":"juicer_format_restriction_site_file"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"restriction_file",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"restriction_file",
                        "for_file":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/99bb38e0-c7a7-4e22-b452-3934462ce90a/",
                        "step_name":"pairs-patch"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"7e5dcad0-d8da-4286-9253-a779d5310a49",
                "accession":"4DNWZH36VU2",
                "@id":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                "display_title":"Patching pairs file for Hi-C using pairsamtools - 4DNWZH36VU2"
            },
            "@id":"/workflow-runs-awsem/3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-17T16:18:01.690699+00:00"
        },
        "name":"pairs-patch run 2017-09-17 16:18:00.793815",
        "outputs":[
            {
                "target":[
                    {
                        "name":"out_pairs",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:44:47.957985",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:58:36.346739",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:53:38.477317",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Input file"
                    }
                ],
                "name":"out_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                            "accession":"4DNFI1ZLO9D7",
                            "@id":"/files-processed/4DNFI1ZLO9D7/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact list",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[
                                {
                                    "status":"to be uploaded by workflow",
                                    "href":"/817f3faa-0573-45c0-8230-02ec19de6544/@@download/4DNFI1ZLO9D7.pairs.gz.px2",
                                    "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                                    "accession":"4DNFI1ZLO9D7",
                                    "filename":"4DNFI1ZLO9D7",
                                    "file_format":"pairs_px2",
                                    "upload_key":"817f3faa-0573-45c0-8230-02ec19de6544/4DNFI1ZLO9D7.pairs.gz.px2"
                                }
                            ],
                            "upload_key":"817f3faa-0573-45c0-8230-02ec19de6544/4DNFI1ZLO9D7.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                            "accession":"4DNFIN4DMXPR",
                            "@id":"/files-processed/4DNFIN4DMXPR/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                        "name":"out_pairs",
                        "step":"addfragtopairs run 2017-09-16 19:00:35.005961",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Output file"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"bcd80455-3ef8-49a1-b482-03f0f599ec7f",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/ddb3d267-0289-48bd-afd2-1505ad8977a6/",
                        "step_name":"pairsam-merge"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"af8908bf-fdcb-40be-8bca-f1a49226bd20",
                "accession":"4DNWF3YV81HS",
                "@id":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                "display_title":"Merging for Hi-C using pairsamtools - 4DNWF3YV81HS"
            },
            "@id":"/workflow-runs-awsem/bcd80455-3ef8-49a1-b482-03f0f599ec7f/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-15T17:42:12.419282+00:00"
        },
        "name":"pairsam-merge run 2017-09-15 17:42:11.508423",
        "outputs":[
            {
                "target":[
                    {
                        "name":"merged_pairsam",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairsams",
                        "step":"pairsam-markasdup run 2017-09-15 20:28:36.478373",
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairsam",
                        "step":"pairsam-markasdup run 2017-09-15 20:30:41.338993",
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "type":"Input file"
                    }
                ],
                "name":"merged_pairsam",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                            "accession":"4DNFILGKQ9CG",
                            "@id":"/files-processed/4DNFILGKQ9CG/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"56eeded7-770e-4eae-b385-6cd8591f6fd4/4DNFILGKQ9CG.sam.pairs.gz",
                            "format":"pairsam",
                            "extension":".sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                            "accession":"4DNFIXS6FIZF",
                            "@id":"/files-processed/4DNFIXS6FIZF/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"8712ba70-2998-4189-b9f7-fca94560e9c0",
                            "accession":"4DNFIX43F7DZ",
                            "@id":"/files-processed/4DNFIX43F7DZ/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"c47230b6-fd44-4c38-85fd-82417353a1bd",
                            "accession":"4DNFIMHJHSET",
                            "@id":"/files-processed/4DNFIMHJHSET/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"e3dd6672-88d5-406a-ab7e-40f8d5da5575",
                            "accession":"4DNFILG6ZOD8",
                            "@id":"/files-processed/4DNFILG6ZOD8/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        },
                        {
                            "ordinal":2
                        },
                        {
                            "ordinal":3
                        },
                        {
                            "ordinal":4
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsams",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "name":"out_pairsam",
                        "step":"pairsam-parse-sort run 2017-09-14 16:12:22.571926",
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "type":"Output file"
                    },
                    {
                        "grouped_by":"workflow",
                        "step":"pairsam-parse-sort run 2017-09-14 17:53:41.819548",
                        "for_file":"8712ba70-2998-4189-b9f7-fca94560e9c0",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group"
                    },
                    {
                        "grouped_by":"workflow",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:21.378824",
                        "for_file":"c47230b6-fd44-4c38-85fd-82417353a1bd",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group"
                    },
                    {
                        "grouped_by":"workflow",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:30.723991",
                        "for_file":"e3dd6672-88d5-406a-ab7e-40f8d5da5575",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"6afadc89-c382-4d1b-9c1f-49858f811831",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/7c06be8b-7510-44e0-83ec-72cc32f5d759/",
                        "step_name":"pairsam-markasdup"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"a18978fa-7e78-488f-8e6b-bfb6f63b8861",
                "accession":"4DNWF1Y7DN3H",
                "@id":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                "display_title":"Duplicate Marking for Hi-C using pairsamtools - 4DNWF1Y7DN3H"
            },
            "@id":"/workflow-runs-awsem/6afadc89-c382-4d1b-9c1f-49858f811831/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-15T20:30:42.213596+00:00"
        },
        "name":"pairsam-markasdup run 2017-09-15 20:30:41.338993",
        "outputs":[
            {
                "target":[
                    {
                        "name":"out_markedpairsam",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairsam",
                        "step":"pairsam-filter run 2017-09-15 23:18:43.041704",
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairsam",
                        "step":"pairsam-filter run 2017-09-16 00:10:37.256759",
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "type":"Input file"
                    }
                ],
                "name":"out_markedpairsam",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                            "accession":"4DNFIXZW3HLF",
                            "@id":"/files-processed/4DNFIXZW3HLF/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"8740663b-e8da-410d-a9f8-e8fcca793f95/4DNFIXZW3HLF.sam.pairs.gz",
                            "format":"pairsam",
                            "extension":".sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                            "accession":"4DNFILGKQ9CG",
                            "@id":"/files-processed/4DNFILGKQ9CG/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsam",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                        "name":"merged_pairsam",
                        "step":"pairsam-merge run 2017-09-15 17:42:11.508423",
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "type":"Output file"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"f4e711a1-1780-4b64-ae41-caf33fc802c3",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/78708866-f965-4d85-9d01-577a03f51a12/",
                        "step_name":"pairsam-filter"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"3758e00c-2035-43c6-b783-bb92afe57c99",
                "accession":"4DNWF38VH15",
                "@id":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                "display_title":"Filtering for Hi-C using pairsamtools - 4DNWF38VH15"
            },
            "@id":"/workflow-runs-awsem/f4e711a1-1780-4b64-ae41-caf33fc802c3/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-16T00:10:38.139452+00:00"
        },
        "name":"pairsam-filter run 2017-09-16 00:10:37.256759",
        "outputs":[
            {
                "target":[
                    {
                        "name":"dedup_pairs",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 06:36:54.980439",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 12:52:16.188292",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 12:40:05.680786",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 12:43:16.063061",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 13:03:41.936676",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 17:41:47.023163",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 17:40:06.178384",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 17:43:29.363523",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 17:49:15.303843",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 18:10:26.979572",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"addfragtopairs run 2017-09-16 18:59:17.399707",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file"
                    }
                ],
                "name":"dedup_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                            "accession":"4DNFICOBX8XY",
                            "@id":"/files-processed/4DNFICOBX8XY/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"1cb152c4-0e7a-431d-b148-b7e23eabca6e/4DNFICOBX8XY.pairs.gz",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"lossless_bamfile",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"lossless_bamfile",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"3e71a0ae-2f61-490a-adc8-25d30bad1a2c",
                            "accession":"4DNFIBDQQU1B",
                            "@id":"/files-processed/4DNFIBDQQU1B/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"alignment",
                            "file_format":"bam"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"3e71a0ae-2f61-490a-adc8-25d30bad1a2c/4DNFIBDQQU1B.bam",
                            "format":"bam",
                            "extension":".bam"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                            "accession":"4DNFIXZW3HLF",
                            "@id":"/files-processed/4DNFIXZW3HLF/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairsam"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsam",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                        "name":"out_markedpairsam",
                        "step":"pairsam-markasdup run 2017-09-15 20:30:41.338993",
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "accession":"4DNFI823LSII",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "description":null,
                            "file_type":null,
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_format":"chromsizes"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"chromsize",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"7fa7dd02-ee88-43d3-8208-2daa4482e6f3",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/e6843cbd-1de7-41fe-99c4-481c10f21d07/",
                        "step_name":"addfragtopairs"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"ef125750-8df2-418e-a1ee-402285f9dd93",
                "accession":"4DNWZJ2G671",
                "@id":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                "display_title":"Adding restriction fragment information for Hi-C using pairsamtools - 4DNWZJ2G671"
            },
            "@id":"/workflow-runs-awsem/7fa7dd02-ee88-43d3-8208-2daa4482e6f3/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-16T18:59:18.593796+00:00"
        },
        "name":"addfragtopairs run 2017-09-16 18:59:17.399707",
        "outputs":[
            {
                "target":[
                    {
                        "name":"out_pairs",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:30:41.169153",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:32:48.239377",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:35:03.320784",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:36:03.758593",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:42:13.332548",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:44:58.848283",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:47:08.099808",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:48:31.758438",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:50:15.598177",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:37:18.798745",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:40:45.920184",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 21:52:16.518046",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:00:20.262051",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:02:18.046058",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:03:46.298438",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:07:54.385333",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 11:25:43.106767",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"pairs-patch run 2017-09-17 16:17:54.117168",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:08:37.399176",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:09:34.459070",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:11:03.520632",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:12:29.820949",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:15:31.645764",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 11:26:38.913455",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:10:31.498627",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:13:42.447938",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-16 22:14:57.699478",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 11:17:12.251003",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 11:28:31.143029",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:08:15.449719",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:22:34.669395",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:06:00.159619",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file"
                    }
                ],
                "name":"out_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                            "accession":"4DNFI6BIN9DA",
                            "@id":"/files-processed/4DNFI6BIN9DA/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[
                                {
                                    "status":"to be uploaded by workflow",
                                    "href":"/69931af1-44a8-4eeb-bf2a-42a08967b49a/@@download/4DNFI6BIN9DA.pairs.gz.px2",
                                    "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                                    "accession":"4DNFI6BIN9DA",
                                    "filename":"4DNFI6BIN9DA",
                                    "file_format":"pairs_px2",
                                    "upload_key":"69931af1-44a8-4eeb-bf2a-42a08967b49a/4DNFI6BIN9DA.pairs.gz.px2"
                                }
                            ],
                            "upload_key":"69931af1-44a8-4eeb-bf2a-42a08967b49a/4DNFI6BIN9DA.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                            "accession":"4DNFICOBX8XY",
                            "@id":"/files-processed/4DNFICOBX8XY/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                        "name":"dedup_pairs",
                        "step":"pairsam-filter run 2017-09-16 00:10:37.256759",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                            "accession":"4DNFI823MBKE",
                            "@id":"/files-reference/4DNFI823MBKE/",
                            "description":null,
                            "file_type":null,
                            "filename":"GRCh38_HindIII_new.txt",
                            "file_format":"juicer_format_restriction_site_file"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"restriction_file",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"restriction_file",
                        "for_file":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"8705ce63-513c-4910-bead-8772fdefc276",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/99bb38e0-c7a7-4e22-b452-3934462ce90a/",
                        "step_name":"pairs-patch"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"7e5dcad0-d8da-4286-9253-a779d5310a49",
                "accession":"4DNWZH36VU2",
                "@id":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                "display_title":"Patching pairs file for Hi-C using pairsamtools - 4DNWZH36VU2"
            },
            "@id":"/workflow-runs-awsem/8705ce63-513c-4910-bead-8772fdefc276/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-17T16:17:54.973245+00:00"
        },
        "name":"pairs-patch run 2017-09-17 16:17:54.117168",
        "outputs":[
            {
                "target":[
                    {
                        "name":"out_pairs",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:53:31.636138",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:58:36.346739",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 18:44:40.775799",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file"
                    },
                    {
                        "name":"input_pairs",
                        "step":"hi-c-processing-partb run 2017-09-17 19:27:36.797149",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file"
                    }
                ],
                "name":"out_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                            "accession":"4DNFICYJ9FOU",
                            "@id":"/files-processed/4DNFICYJ9FOU/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact list",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[
                                {
                                    "status":"to be uploaded by workflow",
                                    "href":"/a9554821-af87-489d-bba6-f58d4286a2a3/@@download/4DNFICYJ9FOU.pairs.gz.px2",
                                    "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                                    "accession":"4DNFICYJ9FOU",
                                    "filename":"4DNFICYJ9FOU",
                                    "file_format":"pairs_px2",
                                    "upload_key":"a9554821-af87-489d-bba6-f58d4286a2a3/4DNFICYJ9FOU.pairs.gz.px2"
                                }
                            ],
                            "upload_key":"a9554821-af87-489d-bba6-f58d4286a2a3/4DNFICYJ9FOU.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                            "accession":"4DNFI6BIN9DA",
                            "@id":"/files-processed/4DNFI6BIN9DA/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                        "name":"out_pairs",
                        "step":"addfragtopairs run 2017-09-16 18:59:17.399707",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Output file"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"704785bc-2020-44eb-b530-114522601672",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/e4068c7a-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"merge_pairs"
                    },
                    {
                        "step":"/analysis-steps/a9d0e56c-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"pairs2hic"
                    },
                    {
                        "step":"/analysis-steps/302366fb-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"cooler"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"d9e9c966-56d9-47e8-ae21-47f94a1af417",
                "accession":"4DNWFP00U73B",
                "@id":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                "display_title":"Hi-C processing part B revision 44 - 4DNWFP00U73B"
            },
            "@id":"/workflow-runs-awsem/704785bc-2020-44eb-b530-114522601672/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-17T20:04:24.035814+00:00"
        },
        "name":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
        "outputs":[
            {
                "target":[
                    {
                        "name":"output_pairs",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":false
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"4d065df0-0164-4a17-818d-a64d0359cc69",
                            "accession":"4DNFIJHZGGD6",
                            "@id":"/files-processed/4DNFIJHZGGD6/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[
                                {
                                    "status":"to be uploaded by workflow",
                                    "href":"/4d065df0-0164-4a17-818d-a64d0359cc69/@@download/4DNFIJHZGGD6.pairs.gz.px2",
                                    "uuid":"4d065df0-0164-4a17-818d-a64d0359cc69",
                                    "accession":"4DNFIJHZGGD6",
                                    "filename":"4DNFIJHZGGD6",
                                    "file_format":"pairs_px2",
                                    "upload_key":"4d065df0-0164-4a17-818d-a64d0359cc69/4DNFIJHZGGD6.pairs.gz.px2"
                                }
                            ],
                            "upload_key":"4d065df0-0164-4a17-818d-a64d0359cc69/4DNFIJHZGGD6.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"out_cool",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_cool",
                        "step":"hi-c-processing-partc run 2017-09-18 04:18:43.908568",
                        "for_file":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                        "type":"Input file"
                    }
                ],
                "name":"out_cool",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                            "accession":"4DNFI8HILY6S",
                            "@id":"/files-processed/4DNFI8HILY6S/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"cool"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56/4DNFI8HILY6S.cool",
                            "format":"cool",
                            "extension":".cool"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"output_hic",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_hic",
                        "step":"hi-c-processing-partc run 2017-09-18 04:18:43.908568",
                        "for_file":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                        "type":"Input file"
                    }
                ],
                "name":"output_hic",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                            "accession":"4DNFI2ZSVKS3",
                            "@id":"/files-processed/4DNFI2ZSVKS3/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "file_format":"hic"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"63b30fae-880d-4bd0-87b2-7c99262ea4a7/4DNFI2ZSVKS3.hic",
                            "format":"hic",
                            "extension":".hic"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                            "accession":"4DNFICYJ9FOU",
                            "@id":"/files-processed/4DNFICYJ9FOU/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact list",
                            "filename":null,
                            "file_format":"pairs"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                            "accession":"4DNFI1ZLO9D7",
                            "@id":"/files-processed/4DNFI1ZLO9D7/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact list",
                            "filename":null,
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        },
                        {
                            "ordinal":2
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "name":"out_pairs",
                        "step":"pairs-patch run 2017-09-17 16:17:54.117168",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Output file"
                    },
                    {
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "name":"out_pairs",
                        "step":"pairs-patch run 2017-09-17 16:18:00.793815",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "accession":"4DNFI823LSII",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "description":null,
                            "file_type":null,
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_format":"chromsizes"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chrsizes",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"chrsizes",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"44d7db19-f679-4e13-9e63-f6ace5d0d3ab",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/25e911b4-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"cool2mcool"
                    },
                    {
                        "step":"/analysis-steps/53e7b46f-1d3b-4a16-812f-c79456614bda/",
                        "step_name":"extract_mcool_normvector_for_juicebox"
                    },
                    {
                        "step":"/analysis-steps/11775554-5f85-4d0c-93e4-fa9d7f20d47a/",
                        "step_name":"add_hic_normvector_to_mcool"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"c6480905-49e5-4c33-afab-9ec90d65faf3",
                "accession":"4DNWF06BPEF2",
                "@id":"/workflows/c6480905-49e5-4c33-afab-9ec90d65faf3/",
                "display_title":"hi-c-processing-partc/6 - 4DNWF06BPEF2"
            },
            "@id":"/workflow-runs-awsem/44d7db19-f679-4e13-9e63-f6ace5d0d3ab/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-18T04:18:44.781547+00:00"
        },
        "name":"hi-c-processing-partc run 2017-09-18 04:18:43.908568",
        "outputs":[
            {
                "target":[
                    {
                        "name":"output_mcool",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_mcool",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"27284dc8-d38c-483f-b0a1-a13d4f247db9",
                            "accession":"4DNFI4OBPEAV",
                            "@id":"/files-processed/4DNFI4OBPEAV/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "file_format":"mcool"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"27284dc8-d38c-483f-b0a1-a13d4f247db9/4DNFI4OBPEAV.mcool",
                            "format":"mcool",
                            "extension":".mcool"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"output_normvector",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_normvector",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"1a1b2788-28a9-4c5f-bbd7-e419cca21dca",
                            "accession":"4DNFI75V1UJB",
                            "@id":"/files-processed/4DNFI75V1UJB/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"juicebox norm vector",
                            "file_format":"normvector_juicerformat"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"1a1b2788-28a9-4c5f-bbd7-e419cca21dca/4DNFI75V1UJB.normvector.juicerformat.gz",
                            "format":"normvector_juicerformat",
                            "extension":".normvector.juicerformat.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                            "accession":"4DNFI8HILY6S",
                            "@id":"/files-processed/4DNFI8HILY6S/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"cool"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_cool",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                        "name":"out_cool",
                        "step":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
                        "for_file":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                            "accession":"4DNFI2ZSVKS3",
                            "@id":"/files-processed/4DNFI2ZSVKS3/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "filename":null,
                            "file_format":"hic"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_hic",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"input_hic",
                        "for_file":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                        "type":"Workflow Input File"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "accession":"4DNFI823LSII",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "description":null,
                            "file_type":null,
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_format":"chromsizes"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"chromsize",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"adebfa13-9f9d-4b3a-abf8-754b1d74c2f2",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/e4068c7a-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"merge_pairs"
                    },
                    {
                        "step":"/analysis-steps/a9d0e56c-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"pairs2hic"
                    },
                    {
                        "step":"/analysis-steps/302366fb-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"cooler"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"d9e9c966-56d9-47e8-ae21-47f94a1af417",
                "accession":"4DNWFP00U73B",
                "@id":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                "display_title":"Hi-C processing part B revision 44 - 4DNWFP00U73B"
            },
            "@id":"/workflow-runs-awsem/adebfa13-9f9d-4b3a-abf8-754b1d74c2f2/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-17T18:53:39.403185+00:00"
        },
        "name":"hi-c-processing-partb run 2017-09-17 18:53:38.477317",
        "outputs":[
            {
                "target":[
                    {
                        "name":"output_pairs",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":false
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"aeee6285-0250-498f-bfdf-fd48c44728ed",
                            "accession":"4DNFIUJGSOOU",
                            "@id":"/files-processed/4DNFIUJGSOOU/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[
                                {
                                    "status":"to be uploaded by workflow",
                                    "href":"/aeee6285-0250-498f-bfdf-fd48c44728ed/@@download/4DNFIUJGSOOU.pairs.gz.px2",
                                    "uuid":"aeee6285-0250-498f-bfdf-fd48c44728ed",
                                    "accession":"4DNFIUJGSOOU",
                                    "filename":"4DNFIUJGSOOU",
                                    "file_format":"pairs_px2",
                                    "upload_key":"aeee6285-0250-498f-bfdf-fd48c44728ed/4DNFIUJGSOOU.pairs.gz.px2"
                                }
                            ],
                            "upload_key":"aeee6285-0250-498f-bfdf-fd48c44728ed/4DNFIUJGSOOU.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"out_cool",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_cool",
                        "step":"hi-c-processing-partc run 2017-09-17 22:55:01.750747",
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_cool",
                        "step":"hi-c-processing-partc run 2017-09-17 23:03:59.469397",
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_cool",
                        "step":"hi-c-processing-partc run 2017-09-17 23:10:05.939762",
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_cool",
                        "step":"hi-c-processing-partc run 2017-09-17 23:18:52.509294",
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file"
                    },
                    {
                        "name":"input_cool",
                        "step":"hi-c-processing-partc run 2017-09-18 00:08:39.630886",
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file"
                    }
                ],
                "name":"out_cool",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                            "accession":"4DNFIV9E8JGV",
                            "@id":"/files-processed/4DNFIV9E8JGV/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"cool"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a/4DNFIV9E8JGV.cool",
                            "format":"cool",
                            "extension":".cool"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"output_hic",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_hic",
                        "step":"hi-c-processing-partc run 2017-09-17 22:55:01.750747",
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file"
                    },
                    {
                        "name":"input_hic",
                        "step":"hi-c-processing-partc run 2017-09-17 23:03:59.469397",
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file"
                    },
                    {
                        "name":"input_hic",
                        "step":"hi-c-processing-partc run 2017-09-17 23:10:05.939762",
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file"
                    },
                    {
                        "name":"input_hic",
                        "step":"hi-c-processing-partc run 2017-09-17 23:18:52.509294",
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file"
                    },
                    {
                        "name":"input_hic",
                        "step":"hi-c-processing-partc run 2017-09-18 00:08:39.630886",
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file"
                    }
                ],
                "name":"output_hic",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                            "accession":"4DNFI95Q7FEU",
                            "@id":"/files-processed/4DNFI95Q7FEU/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "file_format":"hic"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"66d0d60d-1ee4-4564-b625-7188025b85ea/4DNFI95Q7FEU.hic",
                            "format":"hic",
                            "extension":".hic"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                            "accession":"4DNFI1ZLO9D7",
                            "@id":"/files-processed/4DNFI1ZLO9D7/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "name":"out_pairs",
                        "step":"pairs-patch run 2017-09-17 16:18:00.793815",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "accession":"4DNFI823LSII",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "description":null,
                            "file_type":null,
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_format":"chromsizes"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chrsizes",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"chrsizes",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"e737f3f3-ddd8-40b3-9d80-52ebf1f3d1f3",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/25e911b4-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"cool2mcool"
                    },
                    {
                        "step":"/analysis-steps/53e7b46f-1d3b-4a16-812f-c79456614bda/",
                        "step_name":"extract_mcool_normvector_for_juicebox"
                    },
                    {
                        "step":"/analysis-steps/11775554-5f85-4d0c-93e4-fa9d7f20d47a/",
                        "step_name":"add_hic_normvector_to_mcool"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"c6480905-49e5-4c33-afab-9ec90d65faf3",
                "accession":"4DNWF06BPEF2",
                "@id":"/workflows/c6480905-49e5-4c33-afab-9ec90d65faf3/",
                "display_title":"hi-c-processing-partc/6 - 4DNWF06BPEF2"
            },
            "@id":"/workflow-runs-awsem/e737f3f3-ddd8-40b3-9d80-52ebf1f3d1f3/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-18T00:08:40.558099+00:00"
        },
        "name":"hi-c-processing-partc run 2017-09-18 00:08:39.630886",
        "outputs":[
            {
                "target":[
                    {
                        "name":"output_mcool",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_mcool",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"b414e1ec-797f-4225-abb4-9ad5468c3b7d",
                            "accession":"4DNFIV6HB4VT",
                            "@id":"/files-processed/4DNFIV6HB4VT/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "file_format":"mcool"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"b414e1ec-797f-4225-abb4-9ad5468c3b7d/4DNFIV6HB4VT.mcool",
                            "format":"mcool",
                            "extension":".mcool"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"output_normvector",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_normvector",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"67eb9c0a-c34d-42d5-ba1b-504f5b90c99f",
                            "accession":"4DNFIQ1PICV9",
                            "@id":"/files-processed/4DNFIQ1PICV9/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"juicebox norm vector",
                            "file_format":"normvector_juicerformat"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"67eb9c0a-c34d-42d5-ba1b-504f5b90c99f/4DNFIQ1PICV9.normvector.juicerformat.gz",
                            "format":"normvector_juicerformat",
                            "extension":".normvector.juicerformat.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                            "accession":"4DNFIV9E8JGV",
                            "@id":"/files-processed/4DNFIV9E8JGV/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"cool"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_cool",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                        "name":"out_cool",
                        "step":"hi-c-processing-partb run 2017-09-17 18:53:38.477317",
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                            "accession":"4DNFI95Q7FEU",
                            "@id":"/files-processed/4DNFI95Q7FEU/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "filename":null,
                            "file_format":"hic"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_hic",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"input_hic",
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Workflow Input File"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "accession":"4DNFI823LSII",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "description":null,
                            "file_type":null,
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_format":"chromsizes"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"chromsize",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"a917dc3f-4dcd-4434-af97-ef57fe242e37",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/e4068c7a-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"merge_pairs"
                    },
                    {
                        "step":"/analysis-steps/a9d0e56c-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"pairs2hic"
                    },
                    {
                        "step":"/analysis-steps/302366fb-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"cooler"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"d9e9c966-56d9-47e8-ae21-47f94a1af417",
                "accession":"4DNWFP00U73B",
                "@id":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                "display_title":"Hi-C processing part B revision 44 - 4DNWFP00U73B"
            },
            "@id":"/workflow-runs-awsem/a917dc3f-4dcd-4434-af97-ef57fe242e37/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-17T19:27:37.675275+00:00"
        },
        "name":"hi-c-processing-partb run 2017-09-17 19:27:36.797149",
        "outputs":[
            {
                "target":[
                    {
                        "name":"output_pairs",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_pairs",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":false
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"76bb4d49-f791-4136-b392-e6a01e58b2c2",
                            "accession":"4DNFI7DYQJ7I",
                            "@id":"/files-processed/4DNFI7DYQJ7I/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[
                                {
                                    "status":"to be uploaded by workflow",
                                    "href":"/76bb4d49-f791-4136-b392-e6a01e58b2c2/@@download/4DNFI7DYQJ7I.pairs.gz.px2",
                                    "uuid":"76bb4d49-f791-4136-b392-e6a01e58b2c2",
                                    "accession":"4DNFI7DYQJ7I",
                                    "filename":"4DNFI7DYQJ7I",
                                    "file_format":"pairs_px2",
                                    "upload_key":"76bb4d49-f791-4136-b392-e6a01e58b2c2/4DNFI7DYQJ7I.pairs.gz.px2"
                                }
                            ],
                            "upload_key":"76bb4d49-f791-4136-b392-e6a01e58b2c2/4DNFI7DYQJ7I.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "format":"pairs",
                            "extension":".pairs.gz"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"out_cool",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_cool",
                        "step":"hi-c-processing-partc run 2017-09-17 23:33:53.390847",
                        "for_file":"290ea431-e0d9-408d-be81-a8e585bd4660",
                        "type":"Input file"
                    },
                    {
                        "name":"input_cool",
                        "step":"hi-c-processing-partc run 2017-09-18 00:08:53.081319",
                        "for_file":"290ea431-e0d9-408d-be81-a8e585bd4660",
                        "type":"Input file"
                    }
                ],
                "name":"out_cool",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"290ea431-e0d9-408d-be81-a8e585bd4660",
                            "accession":"4DNFIW8XBC3M",
                            "@id":"/files-processed/4DNFIW8XBC3M/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "file_format":"cool"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"290ea431-e0d9-408d-be81-a8e585bd4660/4DNFIW8XBC3M.cool",
                            "format":"cool",
                            "extension":".cool"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"output_hic",
                        "type":"Workflow Output File"
                    },
                    {
                        "name":"input_hic",
                        "step":"hi-c-processing-partc run 2017-09-17 23:33:53.390847",
                        "for_file":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                        "type":"Input file"
                    },
                    {
                        "name":"input_hic",
                        "step":"hi-c-processing-partc run 2017-09-18 00:08:53.081319",
                        "for_file":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                        "type":"Input file"
                    }
                ],
                "name":"output_hic",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                            "accession":"4DNFI86NV3M3",
                            "@id":"/files-processed/4DNFI86NV3M3/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "file_format":"hic"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"265b3dbe-f1d2-4cae-957f-23f71a2c6638/4DNFI86NV3M3.hic",
                            "format":"hic",
                            "extension":".hic"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                            "accession":"4DNFICYJ9FOU",
                            "@id":"/files-processed/4DNFICYJ9FOU/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"pairs"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "name":"out_pairs",
                        "step":"pairs-patch run 2017-09-17 16:17:54.117168",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "accession":"4DNFI823LSII",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "description":null,
                            "file_type":null,
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_format":"chromsizes"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chrsizes",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"chrsizes",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    },
    {
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"a6b459e4-c9b2-45c3-8912-38af6c59ea3b",
        "meta":{
            "workflow":{
                "workflow_steps":[
                    {
                        "step":"/analysis-steps/25e911b4-49e5-4c33-afab-9ec90d65faf3/",
                        "step_name":"cool2mcool"
                    },
                    {
                        "step":"/analysis-steps/53e7b46f-1d3b-4a16-812f-c79456614bda/",
                        "step_name":"extract_mcool_normvector_for_juicebox"
                    },
                    {
                        "step":"/analysis-steps/11775554-5f85-4d0c-93e4-fa9d7f20d47a/",
                        "step_name":"add_hic_normvector_to_mcool"
                    }
                ],
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "uuid":"c6480905-49e5-4c33-afab-9ec90d65faf3",
                "accession":"4DNWF06BPEF2",
                "@id":"/workflows/c6480905-49e5-4c33-afab-9ec90d65faf3/",
                "display_title":"hi-c-processing-partc/6 - 4DNWF06BPEF2"
            },
            "@id":"/workflow-runs-awsem/a6b459e4-c9b2-45c3-8912-38af6c59ea3b/",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "status":"in review by lab",
            "date_created":"2017-09-18T00:08:53.959871+00:00"
        },
        "name":"hi-c-processing-partc run 2017-09-18 00:08:53.081319",
        "outputs":[
            {
                "target":[
                    {
                        "name":"output_mcool",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_mcool",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"941b4d2b-899d-4f1c-9f6a-c9f6a3401a18",
                            "accession":"4DNFII7498B3",
                            "@id":"/files-processed/4DNFII7498B3/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "file_format":"mcool"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"941b4d2b-899d-4f1c-9f6a-c9f6a3401a18/4DNFII7498B3.mcool",
                            "format":"mcool",
                            "extension":".mcool"
                        }
                    ],
                    "type":"input"
                }
            },
            {
                "target":[
                    {
                        "name":"output_normvector",
                        "type":"Workflow Output File"
                    }
                ],
                "name":"output_normvector",
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "run_data":{
                    "file":[
                        {
                            "uuid":"f108ebb3-8693-491a-88a0-d3e2163d9966",
                            "accession":"4DNFIDWULZXP",
                            "@id":"/files-processed/4DNFIDWULZXP/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"juicebox norm vector",
                            "file_format":"normvector_juicerformat"
                        }
                    ],
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "type":"Output processed file",
                            "upload_key":"f108ebb3-8693-491a-88a0-d3e2163d9966/4DNFIDWULZXP.normvector.juicerformat.gz",
                            "format":"normvector_juicerformat",
                            "extension":".normvector.juicerformat.gz"
                        }
                    ],
                    "type":"input"
                }
            }
        ],
        "inputs":[
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"290ea431-e0d9-408d-be81-a8e585bd4660",
                            "accession":"4DNFIW8XBC3M",
                            "@id":"/files-processed/4DNFIW8XBC3M/",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_type":"intermediate file",
                            "filename":null,
                            "file_format":"cool"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_cool",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "workflow":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                        "name":"out_cool",
                        "step":"hi-c-processing-partb run 2017-09-17 19:27:36.797149",
                        "for_file":"290ea431-e0d9-408d-be81-a8e585bd4660",
                        "type":"Output file"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "uuid":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                            "accession":"4DNFI86NV3M3",
                            "@id":"/files-processed/4DNFI86NV3M3/",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_type":"contact matrix",
                            "filename":null,
                            "file_format":"hic"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_hic",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"input_hic",
                        "for_file":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                        "type":"Workflow Input File"
                    }
                ]
            },
            {
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "accession":"4DNFI823LSII",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "description":null,
                            "file_type":null,
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_format":"chromsizes"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize",
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "name":"chromsize",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File"
                    }
                ]
            }
        ]
    }
];