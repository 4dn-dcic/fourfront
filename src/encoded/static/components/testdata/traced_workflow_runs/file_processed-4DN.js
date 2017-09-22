export const HISTORY = [
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"bam",
                            "@id":"/files-processed/4DNFIYY9N5TP/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIYY9N5TP",
                            "uuid":"003edd35-ab95-42cd-930a-1c6c73b2ed33"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".bam",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"bam",
                            "upload_key":"003edd35-ab95-42cd-930a-1c6c73b2ed33/4DNFIYY9N5TP.bam"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_bam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:37.332192",
                        "for_file":"003edd35-ab95-42cd-930a-1c6c73b2ed33",
                        "name":"bam"
                    }
                ],
                "name":"out_bam"
            }
        ],
        "name":"bwa-mem run 2017-09-13 20:16:24.446879",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-13T20:16:25.363841+00:00",
            "@id":"/workflow-runs-awsem/3a302bf0-6943-434c-803d-0b9c777198ec/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Alignment for Hi-C using bwa-mem - 4DNWFZOGJEI4",
                "@id":"/workflows/0fbe4db8-0b5f-448e-8b58-3f8c84baabf5/",
                "uuid":"0fbe4db8-0b5f-448e-8b58-3f8c84baabf5",
                "accession":"4DNWFZOGJEI4",
                "workflow_steps":[
                    {
                        "step_name":"bwa-mem",
                        "step":"/analysis-steps/02d636b9-d82d-4da9-950c-2ca994a73514/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"803e1a6a-f606-4475-91c6-8ee69d686c99",
                        "name":"fastq1"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileFastq",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"fastq",
                            "@id":"/files-fastq/4DNFIBFNQAPD/",
                            "filename":"SRR927090_1.fastq.gz",
                            "file_type":"reads",
                            "accession":"4DNFIBFNQAPD",
                            "uuid":"803e1a6a-f606-4475-91c6-8ee69d686c99"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"fastq1"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"eb182be7-2ada-4383-ad0b-bf2264c5af5b",
                        "name":"fastq2"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileFastq",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"fastq",
                            "@id":"/files-fastq/4DNFI3B5A5F7/",
                            "filename":"SRR927090_2.fastq.gz",
                            "file_type":"reads",
                            "accession":"4DNFI3B5A5F7",
                            "uuid":"eb182be7-2ada-4383-ad0b-bf2264c5af5b"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"fastq2"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"1f53df95-4cf3-41cc-971d-81bb16c486dd",
                        "name":"bwa_index"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"bwaIndex",
                            "@id":"/files-reference/4DNFIZQZ39L9/",
                            "filename":"hg38.bwaIndex.tgz",
                            "file_type":null,
                            "accession":"4DNFIZQZ39L9",
                            "uuid":"1f53df95-4cf3-41cc-971d-81bb16c486dd"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"bwa_index"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"3a302bf0-6943-434c-803d-0b9c777198ec"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIUWMF9A1/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIUWMF9A1",
                            "uuid":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".sam.pairs.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"pairsam",
                            "upload_key":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc/4DNFIUWMF9A1.sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairsam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-merge run 2017-09-15 02:11:05.616825",
                        "for_file":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                        "name":"input_pairsams"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-merge run 2017-09-15 17:42:17.814966",
                        "for_file":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                        "name":"input_pairsams"
                    }
                ],
                "name":"out_pairsam"
            }
        ],
        "name":"pairsam-parse-sort run 2017-09-14 17:54:37.332192",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-14T17:54:38.285408+00:00",
            "@id":"/workflow-runs-awsem/7dfc5022-ef1a-4f6c-866c-c1a105846a67/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Parsing and Sorting for Hi-C using pairsamtools - 4DNWF37VHW0F",
                "@id":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                "uuid":"65586d4b-1e3b-4b31-891e-11f48c816545",
                "accession":"4DNWF37VHW0F",
                "workflow_steps":[
                    {
                        "step_name":"pairsam-parse-sort",
                        "step":"/analysis-steps/9a30285a-d224-4ced-bde5-c26ba3af9325/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/0fbe4db8-0b5f-448e-8b58-3f8c84baabf5/",
                        "type":"Output file",
                        "step":"bwa-mem run 2017-09-13 20:16:24.446879",
                        "for_file":"003edd35-ab95-42cd-930a-1c6c73b2ed33",
                        "name":"out_bam"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"bam",
                            "@id":"/files-processed/4DNFIYY9N5TP/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIYY9N5TP",
                            "uuid":"003edd35-ab95-42cd-930a-1c6c73b2ed33"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"bam"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "name":"chromsize"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"chromsizes",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_type":null,
                            "accession":"4DNFI823LSII",
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"7dfc5022-ef1a-4f6c-866c-c1a105846a67"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIEDB5C3N/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIEDB5C3N",
                            "uuid":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".sam.pairs.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"pairsam",
                            "upload_key":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e/4DNFIEDB5C3N.sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"merged_pairsam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-markasdup run 2017-09-15 20:28:42.315188",
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "name":"input_pairsams"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-markasdup run 2017-09-15 20:30:47.997521",
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "name":"input_pairsam"
                    }
                ],
                "name":"merged_pairsam"
            }
        ],
        "name":"pairsam-merge run 2017-09-15 17:42:17.814966",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-15T17:42:18.662548+00:00",
            "@id":"/workflow-runs-awsem/33db8da4-c689-4ae1-a47a-22e8fc39eeb2/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Merging for Hi-C using pairsamtools - 4DNWF3YV81HS",
                "@id":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                "uuid":"af8908bf-fdcb-40be-8bca-f1a49226bd20",
                "accession":"4DNWF3YV81HS",
                "workflow_steps":[
                    {
                        "step_name":"pairsam-merge",
                        "step":"/analysis-steps/ddb3d267-0289-48bd-afd2-1505ad8977a6/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Output file",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:37.332192",
                        "for_file":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                        "name":"out_pairsam"
                    },
                    {
                        "grouped_by":"workflow",
                        "type":"Input File Group",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:42.439084",
                        "for_file":"df45891e-4341-4233-baf2-d296c7e08abe",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/"
                    },
                    {
                        "grouped_by":"workflow",
                        "type":"Input File Group",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:47.780382",
                        "for_file":"be6daffe-094d-4758-b138-20f0e8080987",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/"
                    },
                    {
                        "grouped_by":"workflow",
                        "type":"Input File Group",
                        "step":"pairsam-parse-sort run 2017-09-14 20:21:10.272849",
                        "for_file":"f3310aa9-d947-40f5-8e65-9cbe24386187",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIUWMF9A1/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIUWMF9A1",
                            "uuid":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIYOVMUJU/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIYOVMUJU",
                            "uuid":"df45891e-4341-4233-baf2-d296c7e08abe"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFI4W2MRIY/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFI4W2MRIY",
                            "uuid":"be6daffe-094d-4758-b138-20f0e8080987"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIOKIESM4/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIOKIESM4",
                            "uuid":"f3310aa9-d947-40f5-8e65-9cbe24386187"
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
                "name":"input_pairsams"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"33db8da4-c689-4ae1-a47a-22e8fc39eeb2"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIQAOXKIE/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIQAOXKIE",
                            "uuid":"c08b165e-8fc0-46af-8211-d363f7def6dc"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".sam.pairs.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"pairsam",
                            "upload_key":"c08b165e-8fc0-46af-8211-d363f7def6dc/4DNFIQAOXKIE.sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_markedpairsam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-filter run 2017-09-16 00:10:42.865657",
                        "for_file":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                        "name":"input_pairsam"
                    }
                ],
                "name":"out_markedpairsam"
            }
        ],
        "name":"pairsam-markasdup run 2017-09-15 20:30:47.997521",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-15T20:30:48.933917+00:00",
            "@id":"/workflow-runs-awsem/e42511cf-a65a-471c-8189-d44bcbf0f6e9/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Duplicate Marking for Hi-C using pairsamtools - 4DNWF1Y7DN3H",
                "@id":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                "uuid":"a18978fa-7e78-488f-8e6b-bfb6f63b8861",
                "accession":"4DNWF1Y7DN3H",
                "workflow_steps":[
                    {
                        "step_name":"pairsam-markasdup",
                        "step":"/analysis-steps/7c06be8b-7510-44e0-83ec-72cc32f5d759/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                        "type":"Output file",
                        "step":"pairsam-merge run 2017-09-15 17:42:17.814966",
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "name":"merged_pairsam"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIEDB5C3N/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIEDB5C3N",
                            "uuid":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsam"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"e42511cf-a65a-471c-8189-d44bcbf0f6e9"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFIUYTV61P/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIUYTV61P",
                            "uuid":"aa3303ce-b7e4-43ce-b4f2-5262252fc383"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"pairs",
                            "upload_key":"aa3303ce-b7e4-43ce-b4f2-5262252fc383/4DNFIUYTV61P.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"dedup_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 06:37:00.522517",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 12:43:22.792334",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 12:52:22.610248",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 12:38:05.242959",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 13:03:48.467162",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 17:41:53.342405",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 17:39:35.317009",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 17:43:24.062800",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 18:10:31.828943",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 17:49:11.523410",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 19:00:35.005961",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"input_pairs"
                    }
                ],
                "name":"dedup_pairs"
            },
            {
                "meta":{
                    "in_path":false,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"bam",
                            "@id":"/files-processed/4DNFIVZL95G8/",
                            "file_type":"alignment",
                            "accession":"4DNFIVZL95G8",
                            "uuid":"267d5500-3b62-42c2-bb5b-aa29e01f1942"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".bam",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"bam",
                            "upload_key":"267d5500-3b62-42c2-bb5b-aa29e01f1942/4DNFIVZL95G8.bam"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"lossless_bamfile"
                    }
                ],
                "name":"lossless_bamfile"
            }
        ],
        "name":"pairsam-filter run 2017-09-16 00:10:42.865657",
        "meta":{
            "status":"released",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-16T00:10:43.881118+00:00",
            "@id":"/workflow-runs-awsem/b2fc0880-62be-460e-b854-d87a58c6665a/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Filtering for Hi-C using pairsamtools - 4DNWF38VH15",
                "@id":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                "uuid":"3758e00c-2035-43c6-b783-bb92afe57c99",
                "accession":"4DNWF38VH15",
                "workflow_steps":[
                    {
                        "step_name":"pairsam-filter",
                        "step":"/analysis-steps/78708866-f965-4d85-9d01-577a03f51a12/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                        "type":"Output file",
                        "step":"pairsam-markasdup run 2017-09-15 20:30:47.997521",
                        "for_file":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                        "name":"out_markedpairsam"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIQAOXKIE/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIQAOXKIE",
                            "uuid":"c08b165e-8fc0-46af-8211-d363f7def6dc"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsam"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "name":"chromsize"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"chromsizes",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_type":null,
                            "accession":"4DNFI823LSII",
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"b2fc0880-62be-460e-b854-d87a58c6665a"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFIN4DMXPR/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIN4DMXPR",
                            "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009"
                        }
                    ],
                    "meta":[
                        {
                            "format":"pairs",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "extension":".pairs.gz",
                            "extra_files":[
                                {
                                    "href":"/7f10fb06-a2bf-4385-9f2b-81c96438b009/@@download/4DNFIN4DMXPR.pairs.gz.px2",
                                    "file_format":"pairs_px2",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFIN4DMXPR",
                                    "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                                    "accession":"4DNFIN4DMXPR",
                                    "upload_key":"7f10fb06-a2bf-4385-9f2b-81c96438b009/4DNFIN4DMXPR.pairs.gz.px2"
                                }
                            ],
                            "type":"Output processed file",
                            "upload_key":"7f10fb06-a2bf-4385-9f2b-81c96438b009/4DNFIN4DMXPR.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:30:41.169153",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:32:48.239377",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:35:03.320784",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:36:03.758593",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:42:13.332548",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:44:58.848283",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:47:08.099808",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:48:31.758438",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:50:15.598177",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:37:18.798745",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:40:45.920184",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:52:16.518046",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:00:20.262051",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:02:18.046058",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:03:46.298438",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:07:54.385333",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 11:25:43.106767",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:08:37.399176",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:09:34.459070",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:11:03.520632",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:12:29.820949",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:15:31.645764",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 11:26:38.913455",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:10:31.498627",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:13:42.447938",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:14:57.699478",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 11:17:12.251003",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 11:28:31.143029",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:06:06.500899",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:08:22.318537",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"pairs-patch run 2017-09-17 16:18:00.793815",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:22:41.836612",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"input_pairs"
                    }
                ],
                "name":"out_pairs"
            }
        ],
        "name":"addfragtopairs run 2017-09-16 19:00:35.005961",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-16T19:00:35.851375+00:00",
            "@id":"/workflow-runs-awsem/aff1f384-9509-405f-a45e-199ef0197d8a/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Adding restriction fragment information for Hi-C using pairsamtools - 4DNWZJ2G671",
                "@id":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                "uuid":"ef125750-8df2-418e-a1ee-402285f9dd93",
                "accession":"4DNWZJ2G671",
                "workflow_steps":[
                    {
                        "step_name":"addfragtopairs",
                        "step":"/analysis-steps/e6843cbd-1de7-41fe-99c4-481c10f21d07/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                        "type":"Output file",
                        "step":"pairsam-filter run 2017-09-16 00:10:42.865657",
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "name":"dedup_pairs"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFIUYTV61P/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIUYTV61P",
                            "uuid":"aa3303ce-b7e4-43ce-b4f2-5262252fc383"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                        "name":"restriction_file"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"juicer_format_restriction_site_file",
                            "@id":"/files-reference/4DNFI823MBKE/",
                            "filename":"GRCh38_HindIII_new.txt",
                            "file_type":null,
                            "accession":"4DNFI823MBKE",
                            "uuid":"595763c6-58d3-4ec4-8f04-3dbb88ed4736"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"restriction_file"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"aff1f384-9509-405f-a45e-199ef0197d8a"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFI1ZLO9D7/",
                            "file_type":"contact list",
                            "accession":"4DNFI1ZLO9D7",
                            "uuid":"817f3faa-0573-45c0-8230-02ec19de6544"
                        }
                    ],
                    "meta":[
                        {
                            "format":"pairs",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "extension":".pairs.gz",
                            "extra_files":[
                                {
                                    "href":"/817f3faa-0573-45c0-8230-02ec19de6544/@@download/4DNFI1ZLO9D7.pairs.gz.px2",
                                    "file_format":"pairs_px2",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFI1ZLO9D7",
                                    "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                                    "accession":"4DNFI1ZLO9D7",
                                    "upload_key":"817f3faa-0573-45c0-8230-02ec19de6544/4DNFI1ZLO9D7.pairs.gz.px2"
                                }
                            ],
                            "type":"Output processed file",
                            "upload_key":"817f3faa-0573-45c0-8230-02ec19de6544/4DNFI1ZLO9D7.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:44:47.957985",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:58:36.346739",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:53:38.477317",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "name":"input_pairs"
                    }
                ],
                "name":"out_pairs"
            }
        ],
        "name":"pairs-patch run 2017-09-17 16:18:00.793815",
        "meta":{
            "status":"released",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-17T16:18:01.690699+00:00",
            "@id":"/workflow-runs-awsem/3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Patching pairs file for Hi-C using pairsamtools - 4DNWZH36VU2",
                "@id":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                "uuid":"7e5dcad0-d8da-4286-9253-a779d5310a49",
                "accession":"4DNWZH36VU2",
                "workflow_steps":[
                    {
                        "step_name":"pairs-patch",
                        "step":"/analysis-steps/99bb38e0-c7a7-4e22-b452-3934462ce90a/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                        "type":"Output file",
                        "step":"addfragtopairs run 2017-09-16 19:00:35.005961",
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "name":"out_pairs"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFIN4DMXPR/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIN4DMXPR",
                            "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"bam",
                            "@id":"/files-processed/4DNFIKL2V1JD/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIKL2V1JD",
                            "uuid":"db17d86a-d7b6-489a-9a13-ec93f30a8386"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".bam",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"bam",
                            "upload_key":"db17d86a-d7b6-489a-9a13-ec93f30a8386/4DNFIKL2V1JD.bam"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_bam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-parse-sort run 2017-09-14 16:12:22.571926",
                        "for_file":"db17d86a-d7b6-489a-9a13-ec93f30a8386",
                        "name":"bam"
                    }
                ],
                "name":"out_bam"
            }
        ],
        "name":"bwa-mem run 2017-09-13 20:15:35.454827",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-13T20:15:36.265107+00:00",
            "@id":"/workflow-runs-awsem/084497ed-98d5-4bab-a450-27e881f6d2a2/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Alignment for Hi-C using bwa-mem - 4DNWFZOGJEI4",
                "@id":"/workflows/0fbe4db8-0b5f-448e-8b58-3f8c84baabf5/",
                "uuid":"0fbe4db8-0b5f-448e-8b58-3f8c84baabf5",
                "accession":"4DNWFZOGJEI4",
                "workflow_steps":[
                    {
                        "step_name":"bwa-mem",
                        "step":"/analysis-steps/02d636b9-d82d-4da9-950c-2ca994a73514/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"47426c11-65ab-41d2-b90d-13a3da01eead",
                        "name":"fastq1"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileFastq",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"fastq",
                            "@id":"/files-fastq/4DNFI5VLWJVD/",
                            "filename":"SRR927086_1.fastq.gz",
                            "file_type":"reads",
                            "accession":"4DNFI5VLWJVD",
                            "uuid":"47426c11-65ab-41d2-b90d-13a3da01eead"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"fastq1"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"1a3da939-0ab4-4d54-ab1f-86736c31c94c",
                        "name":"fastq2"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileFastq",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"fastq",
                            "@id":"/files-fastq/4DNFI9RZ5M46/",
                            "filename":"SRR927086_2.fastq.gz",
                            "file_type":"reads",
                            "accession":"4DNFI9RZ5M46",
                            "uuid":"1a3da939-0ab4-4d54-ab1f-86736c31c94c"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"fastq2"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"1f53df95-4cf3-41cc-971d-81bb16c486dd",
                        "name":"bwa_index"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"bwaIndex",
                            "@id":"/files-reference/4DNFIZQZ39L9/",
                            "filename":"hg38.bwaIndex.tgz",
                            "file_type":null,
                            "accession":"4DNFIZQZ39L9",
                            "uuid":"1f53df95-4cf3-41cc-971d-81bb16c486dd"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"bwa_index"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"084497ed-98d5-4bab-a450-27e881f6d2a2"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIXS6FIZF/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIXS6FIZF",
                            "uuid":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".sam.pairs.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"pairsam",
                            "upload_key":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1/4DNFIXS6FIZF.sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairsam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-merge run 2017-09-14 23:51:21.283265",
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "name":"input_pairsams"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-merge run 2017-09-14 23:48:45.734966",
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "name":"input_pairsams"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-merge run 2017-09-15 17:42:11.508423",
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "name":"input_pairsams"
                    }
                ],
                "name":"out_pairsam"
            }
        ],
        "name":"pairsam-parse-sort run 2017-09-14 16:12:22.571926",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-14T16:12:23.635044+00:00",
            "@id":"/workflow-runs-awsem/ce086d87-7709-4299-9227-7bed68c5419e/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Parsing and Sorting for Hi-C using pairsamtools - 4DNWF37VHW0F",
                "@id":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                "uuid":"65586d4b-1e3b-4b31-891e-11f48c816545",
                "accession":"4DNWF37VHW0F",
                "workflow_steps":[
                    {
                        "step_name":"pairsam-parse-sort",
                        "step":"/analysis-steps/9a30285a-d224-4ced-bde5-c26ba3af9325/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/0fbe4db8-0b5f-448e-8b58-3f8c84baabf5/",
                        "type":"Output file",
                        "step":"bwa-mem run 2017-09-13 20:15:35.454827",
                        "for_file":"db17d86a-d7b6-489a-9a13-ec93f30a8386",
                        "name":"out_bam"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"bam",
                            "@id":"/files-processed/4DNFIKL2V1JD/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIKL2V1JD",
                            "uuid":"db17d86a-d7b6-489a-9a13-ec93f30a8386"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"bam"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "name":"chromsize"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"chromsizes",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_type":null,
                            "accession":"4DNFI823LSII",
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"ce086d87-7709-4299-9227-7bed68c5419e"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFILGKQ9CG/",
                            "file_type":"intermediate file",
                            "accession":"4DNFILGKQ9CG",
                            "uuid":"56eeded7-770e-4eae-b385-6cd8591f6fd4"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".sam.pairs.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"pairsam",
                            "upload_key":"56eeded7-770e-4eae-b385-6cd8591f6fd4/4DNFILGKQ9CG.sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"merged_pairsam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-markasdup run 2017-09-15 20:28:36.478373",
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "name":"input_pairsams"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-markasdup run 2017-09-15 20:30:41.338993",
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "name":"input_pairsam"
                    }
                ],
                "name":"merged_pairsam"
            }
        ],
        "name":"pairsam-merge run 2017-09-15 17:42:11.508423",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-15T17:42:12.419282+00:00",
            "@id":"/workflow-runs-awsem/bcd80455-3ef8-49a1-b482-03f0f599ec7f/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Merging for Hi-C using pairsamtools - 4DNWF3YV81HS",
                "@id":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                "uuid":"af8908bf-fdcb-40be-8bca-f1a49226bd20",
                "accession":"4DNWF3YV81HS",
                "workflow_steps":[
                    {
                        "step_name":"pairsam-merge",
                        "step":"/analysis-steps/ddb3d267-0289-48bd-afd2-1505ad8977a6/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Output file",
                        "step":"pairsam-parse-sort run 2017-09-14 16:12:22.571926",
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "name":"out_pairsam"
                    },
                    {
                        "grouped_by":"workflow",
                        "type":"Input File Group",
                        "step":"pairsam-parse-sort run 2017-09-14 17:53:41.819548",
                        "for_file":"8712ba70-2998-4189-b9f7-fca94560e9c0",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/"
                    },
                    {
                        "grouped_by":"workflow",
                        "type":"Input File Group",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:21.378824",
                        "for_file":"c47230b6-fd44-4c38-85fd-82417353a1bd",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/"
                    },
                    {
                        "grouped_by":"workflow",
                        "type":"Input File Group",
                        "step":"pairsam-parse-sort run 2017-09-14 17:54:30.723991",
                        "for_file":"e3dd6672-88d5-406a-ab7e-40f8d5da5575",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIXS6FIZF/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIXS6FIZF",
                            "uuid":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIX43F7DZ/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIX43F7DZ",
                            "uuid":"8712ba70-2998-4189-b9f7-fca94560e9c0"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIMHJHSET/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIMHJHSET",
                            "uuid":"c47230b6-fd44-4c38-85fd-82417353a1bd"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFILG6ZOD8/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFILG6ZOD8",
                            "uuid":"e3dd6672-88d5-406a-ab7e-40f8d5da5575"
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
                "name":"input_pairsams"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"bcd80455-3ef8-49a1-b482-03f0f599ec7f"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIXZW3HLF/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIXZW3HLF",
                            "uuid":"8740663b-e8da-410d-a9f8-e8fcca793f95"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".sam.pairs.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"pairsam",
                            "upload_key":"8740663b-e8da-410d-a9f8-e8fcca793f95/4DNFIXZW3HLF.sam.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_markedpairsam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-filter run 2017-09-15 23:18:43.041704",
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "name":"input_pairsam"
                    },
                    {
                        "type":"Input file",
                        "step":"pairsam-filter run 2017-09-16 00:10:37.256759",
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "name":"input_pairsam"
                    }
                ],
                "name":"out_markedpairsam"
            }
        ],
        "name":"pairsam-markasdup run 2017-09-15 20:30:41.338993",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-15T20:30:42.213596+00:00",
            "@id":"/workflow-runs-awsem/6afadc89-c382-4d1b-9c1f-49858f811831/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Duplicate Marking for Hi-C using pairsamtools - 4DNWF1Y7DN3H",
                "@id":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                "uuid":"a18978fa-7e78-488f-8e6b-bfb6f63b8861",
                "accession":"4DNWF1Y7DN3H",
                "workflow_steps":[
                    {
                        "step_name":"pairsam-markasdup",
                        "step":"/analysis-steps/7c06be8b-7510-44e0-83ec-72cc32f5d759/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                        "type":"Output file",
                        "step":"pairsam-merge run 2017-09-15 17:42:11.508423",
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "name":"merged_pairsam"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFILGKQ9CG/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFILGKQ9CG",
                            "uuid":"56eeded7-770e-4eae-b385-6cd8591f6fd4"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsam"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"6afadc89-c382-4d1b-9c1f-49858f811831"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFICOBX8XY/",
                            "file_type":"intermediate file",
                            "accession":"4DNFICOBX8XY",
                            "uuid":"1cb152c4-0e7a-431d-b148-b7e23eabca6e"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"pairs",
                            "upload_key":"1cb152c4-0e7a-431d-b148-b7e23eabca6e/4DNFICOBX8XY.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"dedup_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 06:36:54.980439",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 12:52:16.188292",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 12:40:05.680786",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 12:43:16.063061",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 13:03:41.936676",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 17:41:47.023163",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 17:40:06.178384",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 17:43:29.363523",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 17:49:15.303843",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 18:10:26.979572",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"addfragtopairs run 2017-09-16 18:59:17.399707",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"input_pairs"
                    }
                ],
                "name":"dedup_pairs"
            },
            {
                "meta":{
                    "in_path":false,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"bam",
                            "@id":"/files-processed/4DNFIBDQQU1B/",
                            "file_type":"alignment",
                            "accession":"4DNFIBDQQU1B",
                            "uuid":"3e71a0ae-2f61-490a-adc8-25d30bad1a2c"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".bam",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"bam",
                            "upload_key":"3e71a0ae-2f61-490a-adc8-25d30bad1a2c/4DNFIBDQQU1B.bam"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"lossless_bamfile"
                    }
                ],
                "name":"lossless_bamfile"
            }
        ],
        "name":"pairsam-filter run 2017-09-16 00:10:37.256759",
        "meta":{
            "status":"released",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-16T00:10:38.139452+00:00",
            "@id":"/workflow-runs-awsem/f4e711a1-1780-4b64-ae41-caf33fc802c3/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Filtering for Hi-C using pairsamtools - 4DNWF38VH15",
                "@id":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                "uuid":"3758e00c-2035-43c6-b783-bb92afe57c99",
                "accession":"4DNWF38VH15",
                "workflow_steps":[
                    {
                        "step_name":"pairsam-filter",
                        "step":"/analysis-steps/78708866-f965-4d85-9d01-577a03f51a12/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                        "type":"Output file",
                        "step":"pairsam-markasdup run 2017-09-15 20:30:41.338993",
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "name":"out_markedpairsam"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairsam",
                            "@id":"/files-processed/4DNFIXZW3HLF/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFIXZW3HLF",
                            "uuid":"8740663b-e8da-410d-a9f8-e8fcca793f95"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairsam"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "name":"chromsize"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"chromsizes",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_type":null,
                            "accession":"4DNFI823LSII",
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"f4e711a1-1780-4b64-ae41-caf33fc802c3"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFI6BIN9DA/",
                            "file_type":"intermediate file",
                            "accession":"4DNFI6BIN9DA",
                            "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a"
                        }
                    ],
                    "meta":[
                        {
                            "format":"pairs",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "extension":".pairs.gz",
                            "extra_files":[
                                {
                                    "href":"/69931af1-44a8-4eeb-bf2a-42a08967b49a/@@download/4DNFI6BIN9DA.pairs.gz.px2",
                                    "file_format":"pairs_px2",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFI6BIN9DA",
                                    "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                                    "accession":"4DNFI6BIN9DA",
                                    "upload_key":"69931af1-44a8-4eeb-bf2a-42a08967b49a/4DNFI6BIN9DA.pairs.gz.px2"
                                }
                            ],
                            "type":"Output processed file",
                            "upload_key":"69931af1-44a8-4eeb-bf2a-42a08967b49a/4DNFI6BIN9DA.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:30:41.169153",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:32:48.239377",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:35:03.320784",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:36:03.758593",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:42:13.332548",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:44:58.848283",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:47:08.099808",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:48:31.758438",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:50:15.598177",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:37:18.798745",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:40:45.920184",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 21:52:16.518046",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:00:20.262051",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:02:18.046058",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:03:46.298438",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:07:54.385333",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 11:25:43.106767",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"pairs-patch run 2017-09-17 16:17:54.117168",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:08:37.399176",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:09:34.459070",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:11:03.520632",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:12:29.820949",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:15:31.645764",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 11:26:38.913455",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:10:31.498627",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:13:42.447938",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-16 22:14:57.699478",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 11:17:12.251003",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 11:28:31.143029",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:08:15.449719",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:22:34.669395",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:06:00.159619",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"input_pairs"
                    }
                ],
                "name":"out_pairs"
            }
        ],
        "name":"addfragtopairs run 2017-09-16 18:59:17.399707",
        "meta":{
            "status":"in review by lab",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-16T18:59:18.593796+00:00",
            "@id":"/workflow-runs-awsem/7fa7dd02-ee88-43d3-8208-2daa4482e6f3/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Adding restriction fragment information for Hi-C using pairsamtools - 4DNWZJ2G671",
                "@id":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                "uuid":"ef125750-8df2-418e-a1ee-402285f9dd93",
                "accession":"4DNWZJ2G671",
                "workflow_steps":[
                    {
                        "step_name":"addfragtopairs",
                        "step":"/analysis-steps/e6843cbd-1de7-41fe-99c4-481c10f21d07/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                        "type":"Output file",
                        "step":"pairsam-filter run 2017-09-16 00:10:37.256759",
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "name":"dedup_pairs"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFICOBX8XY/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFICOBX8XY",
                            "uuid":"1cb152c4-0e7a-431d-b148-b7e23eabca6e"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                        "name":"restriction_file"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"juicer_format_restriction_site_file",
                            "@id":"/files-reference/4DNFI823MBKE/",
                            "filename":"GRCh38_HindIII_new.txt",
                            "file_type":null,
                            "accession":"4DNFI823MBKE",
                            "uuid":"595763c6-58d3-4ec4-8f04-3dbb88ed4736"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"restriction_file"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"7fa7dd02-ee88-43d3-8208-2daa4482e6f3"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFICYJ9FOU/",
                            "file_type":"contact list",
                            "accession":"4DNFICYJ9FOU",
                            "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3"
                        }
                    ],
                    "meta":[
                        {
                            "format":"pairs",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "extension":".pairs.gz",
                            "extra_files":[
                                {
                                    "href":"/a9554821-af87-489d-bba6-f58d4286a2a3/@@download/4DNFICYJ9FOU.pairs.gz.px2",
                                    "file_format":"pairs_px2",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFICYJ9FOU",
                                    "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                                    "accession":"4DNFICYJ9FOU",
                                    "upload_key":"a9554821-af87-489d-bba6-f58d4286a2a3/4DNFICYJ9FOU.pairs.gz.px2"
                                }
                            ],
                            "type":"Output processed file",
                            "upload_key":"a9554821-af87-489d-bba6-f58d4286a2a3/4DNFICYJ9FOU.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:53:31.636138",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:58:36.346739",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 18:44:40.775799",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "name":"input_pairs"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partb run 2017-09-17 19:27:36.797149",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "name":"input_pairs"
                    }
                ],
                "name":"out_pairs"
            }
        ],
        "name":"pairs-patch run 2017-09-17 16:17:54.117168",
        "meta":{
            "status":"released",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-17T16:17:54.973245+00:00",
            "@id":"/workflow-runs-awsem/8705ce63-513c-4910-bead-8772fdefc276/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Patching pairs file for Hi-C using pairsamtools - 4DNWZH36VU2",
                "@id":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                "uuid":"7e5dcad0-d8da-4286-9253-a779d5310a49",
                "accession":"4DNWZH36VU2",
                "workflow_steps":[
                    {
                        "step_name":"pairs-patch",
                        "step":"/analysis-steps/99bb38e0-c7a7-4e22-b452-3934462ce90a/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                        "type":"Output file",
                        "step":"addfragtopairs run 2017-09-16 18:59:17.399707",
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "name":"out_pairs"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFI6BIN9DA/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFI6BIN9DA",
                            "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_pairs"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"8705ce63-513c-4910-bead-8772fdefc276"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":false,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFIJHZGGD6/",
                            "file_type":"intermediate file",
                            "accession":"4DNFIJHZGGD6",
                            "uuid":"4d065df0-0164-4a17-818d-a64d0359cc69"
                        }
                    ],
                    "meta":[
                        {
                            "format":"pairs",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ],
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "extension":".pairs.gz",
                            "extra_files":[
                                {
                                    "href":"/4d065df0-0164-4a17-818d-a64d0359cc69/@@download/4DNFIJHZGGD6.pairs.gz.px2",
                                    "file_format":"pairs_px2",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFIJHZGGD6",
                                    "uuid":"4d065df0-0164-4a17-818d-a64d0359cc69",
                                    "accession":"4DNFIJHZGGD6",
                                    "upload_key":"4d065df0-0164-4a17-818d-a64d0359cc69/4DNFIJHZGGD6.pairs.gz.px2"
                                }
                            ],
                            "type":"Output processed file",
                            "upload_key":"4d065df0-0164-4a17-818d-a64d0359cc69/4DNFIJHZGGD6.pairs.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_pairs"
                    }
                ],
                "name":"output_pairs"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"cool",
                            "@id":"/files-processed/4DNFI8HILY6S/",
                            "file_type":"intermediate file",
                            "accession":"4DNFI8HILY6S",
                            "uuid":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".cool",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"cool",
                            "upload_key":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56/4DNFI8HILY6S.cool"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_cool"
                    },
                    {
                        "type":"Input file",
                        "step":"hi-c-processing-partc run 2017-09-18 04:18:43.908568",
                        "for_file":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                        "name":"input_cool"
                    }
                ],
                "name":"out_cool"
            },
            {
                "meta":{
                    "in_path":false,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"hic",
                            "@id":"/files-processed/4DNFI2ZSVKS3/",
                            "file_type":"contact matrix",
                            "accession":"4DNFI2ZSVKS3",
                            "uuid":"63b30fae-880d-4bd0-87b2-7c99262ea4a7"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".hic",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"hic",
                            "upload_key":"63b30fae-880d-4bd0-87b2-7c99262ea4a7/4DNFI2ZSVKS3.hic"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_hic"
                    }
                ],
                "name":"output_hic"
            }
        ],
        "name":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
        "meta":{
            "status":"released",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-17T20:04:24.035814+00:00",
            "@id":"/workflow-runs-awsem/704785bc-2020-44eb-b530-114522601672/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"Hi-C processing part B revision 44 - 4DNWFP00U73B",
                "@id":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                "uuid":"d9e9c966-56d9-47e8-ae21-47f94a1af417",
                "accession":"4DNWFP00U73B",
                "workflow_steps":[
                    {
                        "step_name":"merge_pairs",
                        "step":"/analysis-steps/e4068c7a-49e5-4c33-afab-9ec90d65faf3/"
                    },
                    {
                        "step_name":"pairs2hic",
                        "step":"/analysis-steps/a9d0e56c-49e5-4c33-afab-9ec90d65faf3/"
                    },
                    {
                        "step_name":"cooler",
                        "step":"/analysis-steps/302366fb-49e5-4c33-afab-9ec90d65faf3/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "type":"Output file",
                        "step":"pairs-patch run 2017-09-17 16:17:54.117168",
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "name":"out_pairs"
                    },
                    {
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "type":"Output file",
                        "step":"pairs-patch run 2017-09-17 16:18:00.793815",
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "name":"out_pairs"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFICYJ9FOU/",
                            "filename":null,
                            "file_type":"contact list",
                            "accession":"4DNFICYJ9FOU",
                            "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3"
                        },
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"pairs",
                            "@id":"/files-processed/4DNFI1ZLO9D7/",
                            "filename":null,
                            "file_type":"contact list",
                            "accession":"4DNFI1ZLO9D7",
                            "uuid":"817f3faa-0573-45c0-8230-02ec19de6544"
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
                "name":"input_pairs"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "name":"chrsizes"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"chromsizes",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_type":null,
                            "accession":"4DNFI823LSII",
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chrsizes"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"704785bc-2020-44eb-b530-114522601672"
    },
    {
        "outputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"mcool",
                            "@id":"/files-processed/4DNFI4OBPEAV/",
                            "file_type":"contact matrix",
                            "accession":"4DNFI4OBPEAV",
                            "uuid":"27284dc8-d38c-483f-b0a1-a13d4f247db9"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".mcool",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"mcool",
                            "upload_key":"27284dc8-d38c-483f-b0a1-a13d4f247db9/4DNFI4OBPEAV.mcool"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_mcool"
                    }
                ],
                "name":"output_mcool"
            },
            {
                "meta":{
                    "in_path":false,
                    "argument_type":"Output File"
                },
                "run_data":{
                    "file":[
                        {
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"normvector_juicerformat",
                            "@id":"/files-processed/4DNFI75V1UJB/",
                            "file_type":"juicebox norm vector",
                            "accession":"4DNFI75V1UJB",
                            "uuid":"1a1b2788-28a9-4c5f-bbd7-e419cca21dca"
                        }
                    ],
                    "meta":[
                        {
                            "extension":".normvector.juicerformat.gz",
                            "type":"Output processed file",
                            "extra_files":[

                            ],
                            "format":"normvector_juicerformat",
                            "upload_key":"1a1b2788-28a9-4c5f-bbd7-e419cca21dca/4DNFI75V1UJB.normvector.juicerformat.gz"
                        }
                    ],
                    "type":"input"
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_normvector"
                    }
                ],
                "name":"output_normvector"
            }
        ],
        "name":"hi-c-processing-partc run 2017-09-18 04:18:43.908568",
        "meta":{
            "status":"released",
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "date_created":"2017-09-18T04:18:44.781547+00:00",
            "@id":"/workflow-runs-awsem/44d7db19-f679-4e13-9e63-f6ace5d0d3ab/",
            "workflow":{
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "workflow_type":"Hi-C data analysis",
                "display_title":"hi-c-processing-partc/6 - 4DNWF06BPEF2",
                "@id":"/workflows/c6480905-49e5-4c33-afab-9ec90d65faf3/",
                "uuid":"c6480905-49e5-4c33-afab-9ec90d65faf3",
                "accession":"4DNWF06BPEF2",
                "workflow_steps":[
                    {
                        "step_name":"cool2mcool",
                        "step":"/analysis-steps/25e911b4-49e5-4c33-afab-9ec90d65faf3/"
                    },
                    {
                        "step_name":"extract_mcool_normvector_for_juicebox",
                        "step":"/analysis-steps/53e7b46f-1d3b-4a16-812f-c79456614bda/"
                    },
                    {
                        "step_name":"add_hic_normvector_to_mcool",
                        "step":"/analysis-steps/11775554-5f85-4d0c-93e4-fa9d7f20d47a/"
                    }
                ]
            }
        },
        "inputs":[
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "workflow":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                        "type":"Output file",
                        "step":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
                        "for_file":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                        "name":"out_cool"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_format":"cool",
                            "@id":"/files-processed/4DNFI8HILY6S/",
                            "filename":null,
                            "file_type":"intermediate file",
                            "accession":"4DNFI8HILY6S",
                            "uuid":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_cool"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                        "name":"input_hic"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ],
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_format":"hic",
                            "@id":"/files-processed/4DNFI2ZSVKS3/",
                            "filename":null,
                            "file_type":"contact matrix",
                            "accession":"4DNFI2ZSVKS3",
                            "uuid":"63b30fae-880d-4bd0-87b2-7c99262ea4a7"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"input_hic"
            },
            {
                "meta":{
                    "in_path":true,
                    "argument_type":"Input File"
                },
                "source":[
                    {
                        "type":"Workflow Input File",
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "name":"chromsize"
                    }
                ],
                "run_data":{
                    "file":[
                        {
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ],
                            "description":null,
                            "file_format":"chromsizes",
                            "@id":"/files-reference/4DNFI823LSII/",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "file_type":null,
                            "accession":"4DNFI823LSII",
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
                        }
                    ],
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input"
                },
                "name":"chromsize"
            }
        ],
        "analysis_step_types":[
            "Hi-C data analysis"
        ],
        "uuid":"44d7db19-f679-4e13-9e63-f6ace5d0d3ab"
    }
];