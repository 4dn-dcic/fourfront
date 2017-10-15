// Taken from https://data.4dnucleome.org/experiment-set-replicates/4DNESLLTENG9/ @ 10/15/2017
export const PARTIALLY_RELEASED_PROCESSED_FILES = [
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-fastq/4DNFIBFNQAPD/",
                            "display_title":"4DNFIBFNQAPD.fastq.gz",
                            "accession":"4DNFIBFNQAPD",
                            "status":"released",
                            "filename":"SRR927090_1.fastq.gz",
                            "description":null,
                            "file_size":6332984507,
                            "uuid":"803e1a6a-f606-4475-91c6-8ee69d686c99",
                            "file_format":"fastq",
                            "file_type":"reads",
                            "@type":[
                                "FileFastq",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"803e1a6a-f606-4475-91c6-8ee69d686c99",
                        "type":"Workflow Input File",
                        "name":"fastq1"
                    }
                ],
                "name":"fastq1"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-fastq/4DNFI3B5A5F7/",
                            "display_title":"4DNFI3B5A5F7.fastq.gz",
                            "accession":"4DNFI3B5A5F7",
                            "status":"released",
                            "filename":"SRR927090_2.fastq.gz",
                            "description":null,
                            "file_size":6403709616,
                            "uuid":"eb182be7-2ada-4383-ad0b-bf2264c5af5b",
                            "file_format":"fastq",
                            "file_type":"reads",
                            "@type":[
                                "FileFastq",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"eb182be7-2ada-4383-ad0b-bf2264c5af5b",
                        "type":"Workflow Input File",
                        "name":"fastq2"
                    }
                ],
                "name":"fastq2"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFIZQZ39L9/",
                            "display_title":"4DNFIZQZ39L9.bwaIndex.tgz",
                            "accession":"4DNFIZQZ39L9",
                            "status":"released to project",
                            "filename":"hg38.bwaIndex.tgz",
                            "description":null,
                            "file_size":3445308903,
                            "uuid":"1f53df95-4cf3-41cc-971d-81bb16c486dd",
                            "file_format":"bwaIndex",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"1f53df95-4cf3-41cc-971d-81bb16c486dd",
                        "type":"Workflow Input File",
                        "name":"bwa_index"
                    }
                ],
                "name":"bwa_index"
            },
            {
                "run_data":{
                    "value":[
                        "64"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"nThreads"
                    }
                ],
                "name":"nThreads"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/3a302bf0-6943-434c-803d-0b9c777198ec/",
            "display_title":"bwa-mem run 2017-09-13 20:16:24.446879",
            "status":"in review by lab",
            "date_created":"2017-09-13T20:16:25.363841+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/0fbe4db8-0b5f-448e-8b58-3f8c84baabf5/",
                "display_title":"Alignment for Hi-C using bwa-mem - 4DNWFZOGJEI4",
                "accession":"4DNWFZOGJEI4",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_bam"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"bam",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_bam"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d82d-4da9-950c-2ca994a13209/",
                            "analysis_step_types":[
                                "alignment"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_cardinality":"1",
                                    "argument_type":"Input file",
                                    "argument_format":"fastq",
                                    "description":""
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"fastq1"
                                    }
                                ],
                                "name":"fastq1"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1",
                                    "argument_type":"Input file",
                                    "argument_format":"fastq",
                                    "description":""
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"fastq2"
                                    }
                                ],
                                "name":"fastq2"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1",
                                    "argument_type":"Input file",
                                    "argument_format":"bwaIndex",
                                    "description":""
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"bwa_index"
                                    }
                                ],
                                "name":"bwa_index"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"nThreads"
                                    }
                                ],
                                "name":"nThreads"
                            }
                        ],
                        "name":"bwa-mem"
                    }
                ],
                "uuid":"0fbe4db8-0b5f-448e-8b58-3f8c84baabf5",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".bam",
                            "upload_key":"003edd35-ab95-42cd-930a-1c6c73b2ed33/4DNFIYY9N5TP.bam",
                            "format":"bam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIYY9N5TP/",
                            "accession":"4DNFIYY9N5TP",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"003edd35-ab95-42cd-930a-1c6c73b2ed33",
                            "file_format":"bam",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_bam"
                    },
                    {
                        "for_file":"003edd35-ab95-42cd-930a-1c6c73b2ed33",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/7dfc5022-ef1a-4f6c-866c-c1a105846a67/",
                        "name":"bam"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_bam"
            }
        ],
        "name":"/workflow-runs-awsem/3a302bf0-6943-434c-803d-0b9c777198ec/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIYY9N5TP/",
                            "display_title":"4DNFIYY9N5TP.bam",
                            "accession":"4DNFIYY9N5TP",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":18401485141,
                            "uuid":"003edd35-ab95-42cd-930a-1c6c73b2ed33",
                            "file_format":"bam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"003edd35-ab95-42cd-930a-1c6c73b2ed33",
                        "workflow":"/workflows/0fbe4db8-0b5f-448e-8b58-3f8c84baabf5/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/3a302bf0-6943-434c-803d-0b9c777198ec/",
                        "name":"out_bam"
                    }
                ],
                "name":"bam"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chromsize"
                    }
                ],
                "name":"chromsize"
            },
            {
                "run_data":{
                    "value":[
                        "16"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"nThreads"
                    }
                ],
                "name":"nThreads"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/7dfc5022-ef1a-4f6c-866c-c1a105846a67/",
            "display_title":"pairsam-parse-sort run 2017-09-14 17:54:37.332192",
            "status":"in review by lab",
            "date_created":"2017-09-14T17:54:38.285408+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                "display_title":"Parsing and Sorting for Hi-C using pairsamtools - 4DNWF37VHW0F",
                "accession":"4DNWF37VHW0F",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_pairsam"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_pairsam"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c9bf856d-0356-4a8e-8141-2fea6a0ac550/",
                            "analysis_step_types":[
                                "sorting"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"bam",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"bam"
                                    }
                                ],
                                "name":"bam"
                            },
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"chromsizes",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"chromsize"
                                    }
                                ],
                                "name":"chromsize"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"nThreads"
                                    }
                                ],
                                "name":"nThreads"
                            }
                        ],
                        "name":"pairsam-parse-sort"
                    }
                ],
                "uuid":"65586d4b-1e3b-4b31-891e-11f48c816545",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".sam.pairs.gz",
                            "upload_key":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc/4DNFIUWMF9A1.sam.pairs.gz",
                            "format":"pairsam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIUWMF9A1/",
                            "accession":"4DNFIUWMF9A1",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                            "file_format":"pairsam",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairsam"
                    },
                    {
                        "for_file":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/91787af7-7c47-418e-8f6e-a31200b95b7a/",
                        "name":"input_pairsams"
                    },
                    {
                        "for_file":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/33db8da4-c689-4ae1-a47a-22e8fc39eeb2/",
                        "name":"input_pairsams"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_pairsam"
            }
        ],
        "name":"/workflow-runs-awsem/7dfc5022-ef1a-4f6c-866c-c1a105846a67/"
    },
    {
        "inputs":[
            {
                "run_data":{
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
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIUWMF9A1/",
                            "display_title":"4DNFIUWMF9A1.sam.pairs.gz",
                            "accession":"4DNFIUWMF9A1",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":17538271740,
                            "uuid":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        },
                        {
                            "@id":"/files-processed/4DNFIYOVMUJU/",
                            "display_title":"4DNFIYOVMUJU.sam.pairs.gz",
                            "accession":"4DNFIYOVMUJU",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":23858469233,
                            "uuid":"df45891e-4341-4233-baf2-d296c7e08abe",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        },
                        {
                            "@id":"/files-processed/4DNFI4W2MRIY/",
                            "display_title":"4DNFI4W2MRIY.sam.pairs.gz",
                            "accession":"4DNFI4W2MRIY",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":20990013988,
                            "uuid":"be6daffe-094d-4758-b138-20f0e8080987",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        },
                        {
                            "@id":"/files-processed/4DNFIOKIESM4/",
                            "display_title":"4DNFIOKIESM4.sam.pairs.gz",
                            "accession":"4DNFIOKIESM4",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":21137395644,
                            "uuid":"f3310aa9-d947-40f5-8e65-9cbe24386187",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"6ad758a1-a6e3-4c7e-acd9-55a843b7f9bc",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/7dfc5022-ef1a-4f6c-866c-c1a105846a67/",
                        "name":"out_pairsam"
                    },
                    {
                        "for_file":"df45891e-4341-4233-baf2-d296c7e08abe",
                        "grouped_by":"workflow",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group",
                        "step":"/workflow-runs-awsem/2781b17e-134b-4116-a7e6-f03c2b5afaf0/"
                    },
                    {
                        "for_file":"be6daffe-094d-4758-b138-20f0e8080987",
                        "grouped_by":"workflow",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group",
                        "step":"/workflow-runs-awsem/3d74e9b5-7f47-440a-a511-d07ed2d68d2d/"
                    },
                    {
                        "for_file":"f3310aa9-d947-40f5-8e65-9cbe24386187",
                        "grouped_by":"workflow",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group",
                        "step":"/workflow-runs-awsem/750c5aaa-6aba-4e05-80fe-b765854f531f/"
                    }
                ],
                "name":"input_pairsams"
            },
            {
                "run_data":{
                    "value":[
                        "1"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"nThreads"
                    }
                ],
                "name":"nThreads"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/33db8da4-c689-4ae1-a47a-22e8fc39eeb2/",
            "display_title":"pairsam-merge run 2017-09-15 17:42:17.814966",
            "status":"in review by lab",
            "date_created":"2017-09-15T17:42:18.662548+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                "display_title":"Merging for Hi-C using pairsamtools - 4DNWF3YV81HS",
                "accession":"4DNWF3YV81HS",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"merged_pairsam"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "name":"merged_pairsam"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c9bf856d-0356-4a8e-8141-2fea6a0ac550/",
                            "analysis_step_types":[
                                "merging"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairsams"
                                    }
                                ],
                                "name":"input_pairsams"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"nThreads"
                                    }
                                ],
                                "name":"nThreads"
                            }
                        ],
                        "name":"pairsam-merge"
                    }
                ],
                "uuid":"af8908bf-fdcb-40be-8bca-f1a49226bd20",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".sam.pairs.gz",
                            "upload_key":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e/4DNFIEDB5C3N.sam.pairs.gz",
                            "format":"pairsam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIEDB5C3N/",
                            "accession":"4DNFIEDB5C3N",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                            "file_format":"pairsam",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"merged_pairsam"
                    },
                    {
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/c8d4f6df-7dce-4c7f-8e48-ddd61b745842/",
                        "name":"input_pairsams"
                    },
                    {
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/e42511cf-a65a-471c-8189-d44bcbf0f6e9/",
                        "name":"input_pairsam"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"merged_pairsam"
            }
        ],
        "name":"/workflow-runs-awsem/33db8da4-c689-4ae1-a47a-22e8fc39eeb2/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIEDB5C3N/",
                            "display_title":"4DNFIEDB5C3N.sam.pairs.gz",
                            "accession":"4DNFIEDB5C3N",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":78519604603,
                            "uuid":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"dc8c6fdc-b385-41e2-9ec4-b5a6c77f120e",
                        "workflow":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/33db8da4-c689-4ae1-a47a-22e8fc39eeb2/",
                        "name":"merged_pairsam"
                    }
                ],
                "name":"input_pairsam"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/e42511cf-a65a-471c-8189-d44bcbf0f6e9/",
            "display_title":"pairsam-markasdup run 2017-09-15 20:30:47.997521",
            "status":"in review by lab",
            "date_created":"2017-09-15T20:30:48.933917+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                "display_title":"Duplicate Marking for Hi-C using pairsamtools - 4DNWF1Y7DN3H",
                "accession":"4DNWF1Y7DN3H",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_markedpairsam"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_markedpairsam"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c9bf856d-0356-4a8e-8141-2fea6a0ac550/",
                            "analysis_step_types":[
                                "annotating"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairsams"
                                    }
                                ],
                                "name":"input_pairsams"
                            }
                        ],
                        "name":"pairsam-markasdup"
                    }
                ],
                "uuid":"a18978fa-7e78-488f-8e6b-bfb6f63b8861",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".sam.pairs.gz",
                            "upload_key":"c08b165e-8fc0-46af-8211-d363f7def6dc/4DNFIQAOXKIE.sam.pairs.gz",
                            "format":"pairsam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIQAOXKIE/",
                            "accession":"4DNFIQAOXKIE",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                            "file_format":"pairsam",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_markedpairsam"
                    },
                    {
                        "for_file":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/b2fc0880-62be-460e-b854-d87a58c6665a/",
                        "name":"input_pairsam"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_markedpairsam"
            }
        ],
        "name":"/workflow-runs-awsem/e42511cf-a65a-471c-8189-d44bcbf0f6e9/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIQAOXKIE/",
                            "display_title":"4DNFIQAOXKIE.sam.pairs.gz",
                            "accession":"4DNFIQAOXKIE",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":86456693319,
                            "uuid":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"c08b165e-8fc0-46af-8211-d363f7def6dc",
                        "workflow":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/e42511cf-a65a-471c-8189-d44bcbf0f6e9/",
                        "name":"out_markedpairsam"
                    }
                ],
                "name":"input_pairsam"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chromsize"
                    }
                ],
                "name":"chromsize"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/b2fc0880-62be-460e-b854-d87a58c6665a/",
            "display_title":"pairsam-filter run 2017-09-16 00:10:42.865657",
            "status":"released",
            "date_created":"2017-09-16T00:10:43.881118+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                "display_title":"Filtering for Hi-C using pairsamtools - 4DNWF38VH15",
                "accession":"4DNWF38VH15",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"dedup_pairs"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"dedup_pairs"
                            },
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"lossless_bamfile"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"bam",
                                    "argument_cardinality":"1"
                                },
                                "name":"lossless_bamfile"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c9bf856d-0356-4a8e-8141-2fea6a0ac550/",
                            "analysis_step_types":[
                                "filtering"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairsam"
                                    }
                                ],
                                "name":"input_pairsam"
                            },
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"chromsizes",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"chromsize"
                                    }
                                ],
                                "name":"chromsize"
                            }
                        ],
                        "name":"pairsam-filter"
                    }
                ],
                "uuid":"3758e00c-2035-43c6-b783-bb92afe57c99",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".pairs.gz",
                            "upload_key":"aa3303ce-b7e4-43ce-b4f2-5262252fc383/4DNFIUYTV61P.pairs.gz",
                            "format":"pairs",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIUYTV61P/",
                            "accession":"4DNFIUYTV61P",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                            "file_format":"pairs",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"dedup_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/2320c3ab-96da-4ff2-88f8-a4e766f91976/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/dfc8fa60-0009-4755-a264-9020ad498744/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/a76a62ac-efaf-4933-9223-b9562f10e9e6/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/d3300bd7-4e2a-4fed-bfe8-b9d8f9eaa797/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/2108e4dc-aefc-489b-9f3a-ca13ef168fd7/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/3d920fba-16df-4dd6-b491-4d85d994064b/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bf5631c6-2c08-42c2-9c96-4a8bebc7cd09/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bc715277-6109-4724-8095-c37bc770ea35/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8a4f2e8a-12b4-4698-80ce-e5f90e69d34c/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/a15fd8ac-5d46-44be-8208-fa1d41582f29/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/aff1f384-9509-405f-a45e-199ef0197d8a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/2320c3ab-96da-4ff2-88f8-a4e766f91976/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/dfc8fa60-0009-4755-a264-9020ad498744/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/a76a62ac-efaf-4933-9223-b9562f10e9e6/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/d3300bd7-4e2a-4fed-bfe8-b9d8f9eaa797/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/2108e4dc-aefc-489b-9f3a-ca13ef168fd7/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/3d920fba-16df-4dd6-b491-4d85d994064b/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bf5631c6-2c08-42c2-9c96-4a8bebc7cd09/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bc715277-6109-4724-8095-c37bc770ea35/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8a4f2e8a-12b4-4698-80ce-e5f90e69d34c/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/a15fd8ac-5d46-44be-8208-fa1d41582f29/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/aff1f384-9509-405f-a45e-199ef0197d8a/",
                        "name":"input_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"dedup_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".bam",
                            "upload_key":"267d5500-3b62-42c2-bb5b-aa29e01f1942/4DNFIVZL95G8.bam",
                            "format":"bam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIVZL95G8/",
                            "accession":"4DNFIVZL95G8",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"267d5500-3b62-42c2-bb5b-aa29e01f1942",
                            "file_format":"bam",
                            "file_type":"alignment"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"lossless_bamfile"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"lossless_bamfile"
            }
        ],
        "name":"/workflow-runs-awsem/b2fc0880-62be-460e-b854-d87a58c6665a/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIUYTV61P/",
                            "display_title":"4DNFIUYTV61P.pairs.gz",
                            "accession":"4DNFIUYTV61P",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":5802211706,
                            "uuid":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                            "file_format":"pairs",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"aa3303ce-b7e4-43ce-b4f2-5262252fc383",
                        "workflow":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/b2fc0880-62be-460e-b854-d87a58c6665a/",
                        "name":"dedup_pairs"
                    }
                ],
                "name":"input_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823MBKE/",
                            "display_title":"4DNFI823MBKE.txt",
                            "accession":"4DNFI823MBKE",
                            "status":"released to project",
                            "filename":"GRCh38_HindIII_new.txt",
                            "description":null,
                            "file_size":7762970,
                            "uuid":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                            "file_format":"juicer_format_restriction_site_file",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                        "type":"Workflow Input File",
                        "name":"restriction_file"
                    }
                ],
                "name":"restriction_file"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/aff1f384-9509-405f-a45e-199ef0197d8a/",
            "display_title":"addfragtopairs run 2017-09-16 19:00:35.005961",
            "status":"in review by lab",
            "date_created":"2017-09-16T19:00:35.851375+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                "display_title":"Adding restriction fragment information for Hi-C using pairsamtools - 4DNWZJ2G671",
                "accession":"4DNWZJ2G671",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_pairs"
                                    }
                                ],
                                "meta":{
                                    "secondary_file_formats":[
                                        "pairs_px2"
                                    ],
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_pairs"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/e17c3e9c-8882-4478-93da-062c5213341d/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            },
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"juicer_format_restriction_site_file",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"restriction_file"
                                    }
                                ],
                                "name":"restriction_file"
                            }
                        ],
                        "name":"addfragtopairs"
                    }
                ],
                "uuid":"ef125750-8df2-418e-a1ee-402285f9dd93",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "extra_files":[
                                {
                                    "accession":"4DNFIN4DMXPR",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFIN4DMXPR",
                                    "href":"/7f10fb06-a2bf-4385-9f2b-81c96438b009/@@download/4DNFIN4DMXPR.pairs.gz.px2",
                                    "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                                    "upload_key":"7f10fb06-a2bf-4385-9f2b-81c96438b009/4DNFIN4DMXPR.pairs.gz.px2",
                                    "file_format":"pairs_px2"
                                }
                            ],
                            "format":"pairs",
                            "upload_key":"7f10fb06-a2bf-4385-9f2b-81c96438b009/4DNFIN4DMXPR.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ]
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIN4DMXPR/",
                            "accession":"4DNFIN4DMXPR",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                            "file_format":"pairs",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/52c73977-70d1-4261-88e4-597fc718f5c4/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/155d5d48-9599-49bf-8c46-7a8a8e71af55/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/0f7f34f6-acac-4405-8e16-b58b7a96db0a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/9e9d857b-33b1-4dbd-bf81-8ab0af7465c2/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/0eb95228-b00f-44be-9ece-52e4b17470e6/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/c189a54a-dcb2-4868-a9f1-7ddf00be5f17/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/4f289af2-85b8-435d-bd70-5a3cc6197015/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/fb6821c4-7633-47c1-b928-2a1b7e26db7a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/6b3078bd-6237-4576-8f82-a50653e7c244/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bf816946-b6d8-4a7e-9039-7a12646e98e3/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/172417b6-18d6-46d7-8c25-037c2b723a3d/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/aa6804ad-c5a6-44f4-9e1d-cd5a8a68ffef/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/c105db2b-144e-4e56-bae4-b25f5cc91ce1/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/c62d30da-583d-4d74-9cb5-0042f40fd471/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8873afcf-fc20-4624-88ca-979ba7bf4875/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/79846788-bc43-44bb-a5b4-0b67bb325d94/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/241deb01-8b75-425d-8a65-c64935cf9c07/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8a3744b5-a537-4e01-a20e-bc17792afe2d/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/7c7bdae5-1729-42d9-8de7-57130de69230/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/dd42afcf-26dc-46ac-9380-bce878890597/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/478c9c18-b1d7-41a4-8683-6787685a518e/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/9f540d88-6d10-48a4-acd3-1c5ef5787d15/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/5ef3732e-4e39-4e79-838f-c970b26756ac/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/5bf30992-0d65-4ed8-a5a1-633e2dc0ced7/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/6eaf7ec7-89db-46d1-a83b-13fe44d7e56c/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/038d4977-15e5-45f3-a459-f945326e9081/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/617cb7f6-4712-4b02-a6e0-063882c00db4/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8c3d5f42-d29a-410c-a6fb-d3d91be719d1/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/62942e7c-8f67-413f-9456-d4b0f7373925/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/674f0ce6-2389-411a-986b-430864d375ee/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/49eb8b99-9c6c-4c66-9afa-dea8ae928ece/",
                        "name":"input_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_pairs"
            }
        ],
        "name":"/workflow-runs-awsem/aff1f384-9509-405f-a45e-199ef0197d8a/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIN4DMXPR/",
                            "display_title":"4DNFIN4DMXPR.pairs.gz",
                            "accession":"4DNFIN4DMXPR",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":6633179362,
                            "uuid":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                            "file_format":"pairs",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"7f10fb06-a2bf-4385-9f2b-81c96438b009",
                        "workflow":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/aff1f384-9509-405f-a45e-199ef0197d8a/",
                        "name":"out_pairs"
                    }
                ],
                "name":"input_pairs"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb/",
            "display_title":"pairs-patch run 2017-09-17 16:18:00.793815",
            "status":"released",
            "date_created":"2017-09-17T16:18:01.690699+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                "display_title":"Patching pairs file for Hi-C using pairsamtools - 4DNWZH36VU2",
                "accession":"4DNWZH36VU2",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_pairs"
                                    }
                                ],
                                "meta":{
                                    "secondary_file_formats":[
                                        "pairs_px2"
                                    ],
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_pairs"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/e17c3e9c-8882-4478-93da-062c5213341d/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            }
                        ],
                        "name":"pairs-patch"
                    }
                ],
                "uuid":"7e5dcad0-d8da-4286-9253-a779d5310a49",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "extra_files":[
                                {
                                    "accession":"4DNFI1ZLO9D7",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFI1ZLO9D7",
                                    "href":"/817f3faa-0573-45c0-8230-02ec19de6544/@@download/4DNFI1ZLO9D7.pairs.gz.px2",
                                    "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                                    "upload_key":"817f3faa-0573-45c0-8230-02ec19de6544/4DNFI1ZLO9D7.pairs.gz.px2",
                                    "file_format":"pairs_px2"
                                }
                            ],
                            "format":"pairs",
                            "upload_key":"817f3faa-0573-45c0-8230-02ec19de6544/4DNFI1ZLO9D7.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ]
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI1ZLO9D7/",
                            "accession":"4DNFI1ZLO9D7",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                            "file_format":"pairs",
                            "file_type":"contact list"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairs"
                    },
                    {
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/51538ae1-ea89-4ec0-9a2e-6553d75d819f/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/600e4233-963d-4c8a-ae0b-f1abe2c3dfe3/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/704785bc-2020-44eb-b530-114522601672/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/adebfa13-9f9d-4b3a-abf8-754b1d74c2f2/",
                        "name":"input_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_pairs"
            }
        ],
        "name":"/workflow-runs-awsem/3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-fastq/4DNFI5VLWJVD/",
                            "display_title":"4DNFI5VLWJVD.fastq.gz",
                            "accession":"4DNFI5VLWJVD",
                            "status":"released",
                            "filename":"SRR927086_1.fastq.gz",
                            "description":null,
                            "file_size":6907360810,
                            "uuid":"47426c11-65ab-41d2-b90d-13a3da01eead",
                            "file_format":"fastq",
                            "file_type":"reads",
                            "@type":[
                                "FileFastq",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"47426c11-65ab-41d2-b90d-13a3da01eead",
                        "type":"Workflow Input File",
                        "name":"fastq1"
                    }
                ],
                "name":"fastq1"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-fastq/4DNFI9RZ5M46/",
                            "display_title":"4DNFI9RZ5M46.fastq.gz",
                            "accession":"4DNFI9RZ5M46",
                            "status":"released",
                            "filename":"SRR927086_2.fastq.gz",
                            "description":null,
                            "file_size":7000151837,
                            "uuid":"1a3da939-0ab4-4d54-ab1f-86736c31c94c",
                            "file_format":"fastq",
                            "file_type":"reads",
                            "@type":[
                                "FileFastq",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"1a3da939-0ab4-4d54-ab1f-86736c31c94c",
                        "type":"Workflow Input File",
                        "name":"fastq2"
                    }
                ],
                "name":"fastq2"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFIZQZ39L9/",
                            "display_title":"4DNFIZQZ39L9.bwaIndex.tgz",
                            "accession":"4DNFIZQZ39L9",
                            "status":"released to project",
                            "filename":"hg38.bwaIndex.tgz",
                            "description":null,
                            "file_size":3445308903,
                            "uuid":"1f53df95-4cf3-41cc-971d-81bb16c486dd",
                            "file_format":"bwaIndex",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"1f53df95-4cf3-41cc-971d-81bb16c486dd",
                        "type":"Workflow Input File",
                        "name":"bwa_index"
                    }
                ],
                "name":"bwa_index"
            },
            {
                "run_data":{
                    "value":[
                        "64"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"nThreads"
                    }
                ],
                "name":"nThreads"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/084497ed-98d5-4bab-a450-27e881f6d2a2/",
            "display_title":"bwa-mem run 2017-09-13 20:15:35.454827",
            "status":"in review by lab",
            "date_created":"2017-09-13T20:15:36.265107+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/0fbe4db8-0b5f-448e-8b58-3f8c84baabf5/",
                "display_title":"Alignment for Hi-C using bwa-mem - 4DNWFZOGJEI4",
                "accession":"4DNWFZOGJEI4",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_bam"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"bam",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_bam"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d82d-4da9-950c-2ca994a13209/",
                            "analysis_step_types":[
                                "alignment"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_cardinality":"1",
                                    "argument_type":"Input file",
                                    "argument_format":"fastq",
                                    "description":""
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"fastq1"
                                    }
                                ],
                                "name":"fastq1"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1",
                                    "argument_type":"Input file",
                                    "argument_format":"fastq",
                                    "description":""
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"fastq2"
                                    }
                                ],
                                "name":"fastq2"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1",
                                    "argument_type":"Input file",
                                    "argument_format":"bwaIndex",
                                    "description":""
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"bwa_index"
                                    }
                                ],
                                "name":"bwa_index"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"nThreads"
                                    }
                                ],
                                "name":"nThreads"
                            }
                        ],
                        "name":"bwa-mem"
                    }
                ],
                "uuid":"0fbe4db8-0b5f-448e-8b58-3f8c84baabf5",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".bam",
                            "upload_key":"db17d86a-d7b6-489a-9a13-ec93f30a8386/4DNFIKL2V1JD.bam",
                            "format":"bam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIKL2V1JD/",
                            "accession":"4DNFIKL2V1JD",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"db17d86a-d7b6-489a-9a13-ec93f30a8386",
                            "file_format":"bam",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_bam"
                    },
                    {
                        "for_file":"db17d86a-d7b6-489a-9a13-ec93f30a8386",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/ce086d87-7709-4299-9227-7bed68c5419e/",
                        "name":"bam"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_bam"
            }
        ],
        "name":"/workflow-runs-awsem/084497ed-98d5-4bab-a450-27e881f6d2a2/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIKL2V1JD/",
                            "display_title":"4DNFIKL2V1JD.bam",
                            "accession":"4DNFIKL2V1JD",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":20074196942,
                            "uuid":"db17d86a-d7b6-489a-9a13-ec93f30a8386",
                            "file_format":"bam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"db17d86a-d7b6-489a-9a13-ec93f30a8386",
                        "workflow":"/workflows/0fbe4db8-0b5f-448e-8b58-3f8c84baabf5/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/084497ed-98d5-4bab-a450-27e881f6d2a2/",
                        "name":"out_bam"
                    }
                ],
                "name":"bam"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chromsize"
                    }
                ],
                "name":"chromsize"
            },
            {
                "run_data":{
                    "value":[
                        "16"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"nThreads"
                    }
                ],
                "name":"nThreads"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/ce086d87-7709-4299-9227-7bed68c5419e/",
            "display_title":"pairsam-parse-sort run 2017-09-14 16:12:22.571926",
            "status":"in review by lab",
            "date_created":"2017-09-14T16:12:23.635044+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                "display_title":"Parsing and Sorting for Hi-C using pairsamtools - 4DNWF37VHW0F",
                "accession":"4DNWF37VHW0F",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_pairsam"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_pairsam"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c9bf856d-0356-4a8e-8141-2fea6a0ac550/",
                            "analysis_step_types":[
                                "sorting"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"bam",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"bam"
                                    }
                                ],
                                "name":"bam"
                            },
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"chromsizes",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"chromsize"
                                    }
                                ],
                                "name":"chromsize"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"nThreads"
                                    }
                                ],
                                "name":"nThreads"
                            }
                        ],
                        "name":"pairsam-parse-sort"
                    }
                ],
                "uuid":"65586d4b-1e3b-4b31-891e-11f48c816545",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".sam.pairs.gz",
                            "upload_key":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1/4DNFIXS6FIZF.sam.pairs.gz",
                            "format":"pairsam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIXS6FIZF/",
                            "accession":"4DNFIXS6FIZF",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                            "file_format":"pairsam",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairsam"
                    },
                    {
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/5f638eca-d195-4a49-9dbe-21cae48fc2e7/",
                        "name":"input_pairsams"
                    },
                    {
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/00419e17-b0de-4ca1-a404-c3b171bf2d12/",
                        "name":"input_pairsams"
                    },
                    {
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bcd80455-3ef8-49a1-b482-03f0f599ec7f/",
                        "name":"input_pairsams"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_pairsam"
            }
        ],
        "name":"/workflow-runs-awsem/ce086d87-7709-4299-9227-7bed68c5419e/"
    },
    {
        "inputs":[
            {
                "run_data":{
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
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIXS6FIZF/",
                            "display_title":"4DNFIXS6FIZF.sam.pairs.gz",
                            "accession":"4DNFIXS6FIZF",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":19207482985,
                            "uuid":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        },
                        {
                            "@id":"/files-processed/4DNFIX43F7DZ/",
                            "display_title":"4DNFIX43F7DZ.sam.pairs.gz",
                            "accession":"4DNFIX43F7DZ",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":25638894213,
                            "uuid":"8712ba70-2998-4189-b9f7-fca94560e9c0",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        },
                        {
                            "@id":"/files-processed/4DNFIMHJHSET/",
                            "display_title":"4DNFIMHJHSET.sam.pairs.gz",
                            "accession":"4DNFIMHJHSET",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":22224223005,
                            "uuid":"c47230b6-fd44-4c38-85fd-82417353a1bd",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        },
                        {
                            "@id":"/files-processed/4DNFILG6ZOD8/",
                            "display_title":"4DNFILG6ZOD8.sam.pairs.gz",
                            "accession":"4DNFILG6ZOD8",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":21760873516,
                            "uuid":"e3dd6672-88d5-406a-ab7e-40f8d5da5575",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"47885e0b-3ee6-4b1a-bd6e-83b3703e25e1",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/ce086d87-7709-4299-9227-7bed68c5419e/",
                        "name":"out_pairsam"
                    },
                    {
                        "for_file":"8712ba70-2998-4189-b9f7-fca94560e9c0",
                        "grouped_by":"workflow",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group",
                        "step":"/workflow-runs-awsem/34764761-83d3-4e40-89df-8fa9bf59642b/"
                    },
                    {
                        "for_file":"c47230b6-fd44-4c38-85fd-82417353a1bd",
                        "grouped_by":"workflow",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group",
                        "step":"/workflow-runs-awsem/0ff15cdb-6d2b-40bd-9fdc-cdf0fc6d0cda/"
                    },
                    {
                        "for_file":"e3dd6672-88d5-406a-ab7e-40f8d5da5575",
                        "grouped_by":"workflow",
                        "workflow":"/workflows/65586d4b-1e3b-4b31-891e-11f48c816545/",
                        "type":"Input File Group",
                        "step":"/workflow-runs-awsem/b719439f-b57d-47e5-98b4-0a728f123a3a/"
                    }
                ],
                "name":"input_pairsams"
            },
            {
                "run_data":{
                    "value":[
                        "1"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"nThreads"
                    }
                ],
                "name":"nThreads"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/bcd80455-3ef8-49a1-b482-03f0f599ec7f/",
            "display_title":"pairsam-merge run 2017-09-15 17:42:11.508423",
            "status":"in review by lab",
            "date_created":"2017-09-15T17:42:12.419282+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                "display_title":"Merging for Hi-C using pairsamtools - 4DNWF3YV81HS",
                "accession":"4DNWF3YV81HS",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"merged_pairsam"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "name":"merged_pairsam"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c9bf856d-0356-4a8e-8141-2fea6a0ac550/",
                            "analysis_step_types":[
                                "merging"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairsams"
                                    }
                                ],
                                "name":"input_pairsams"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"nThreads"
                                    }
                                ],
                                "name":"nThreads"
                            }
                        ],
                        "name":"pairsam-merge"
                    }
                ],
                "uuid":"af8908bf-fdcb-40be-8bca-f1a49226bd20",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".sam.pairs.gz",
                            "upload_key":"56eeded7-770e-4eae-b385-6cd8591f6fd4/4DNFILGKQ9CG.sam.pairs.gz",
                            "format":"pairsam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFILGKQ9CG/",
                            "accession":"4DNFILGKQ9CG",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                            "file_format":"pairsam",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"merged_pairsam"
                    },
                    {
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/f8e689b7-0aac-4a95-8e22-096ab245b71b/",
                        "name":"input_pairsams"
                    },
                    {
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/6afadc89-c382-4d1b-9c1f-49858f811831/",
                        "name":"input_pairsam"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"merged_pairsam"
            }
        ],
        "name":"/workflow-runs-awsem/bcd80455-3ef8-49a1-b482-03f0f599ec7f/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFILGKQ9CG/",
                            "display_title":"4DNFILGKQ9CG.sam.pairs.gz",
                            "accession":"4DNFILGKQ9CG",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":83471992270,
                            "uuid":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"56eeded7-770e-4eae-b385-6cd8591f6fd4",
                        "workflow":"/workflows/af8908bf-fdcb-40be-8bca-f1a49226bd20/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/bcd80455-3ef8-49a1-b482-03f0f599ec7f/",
                        "name":"merged_pairsam"
                    }
                ],
                "name":"input_pairsam"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/6afadc89-c382-4d1b-9c1f-49858f811831/",
            "display_title":"pairsam-markasdup run 2017-09-15 20:30:41.338993",
            "status":"in review by lab",
            "date_created":"2017-09-15T20:30:42.213596+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                "display_title":"Duplicate Marking for Hi-C using pairsamtools - 4DNWF1Y7DN3H",
                "accession":"4DNWF1Y7DN3H",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_markedpairsam"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_markedpairsam"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c9bf856d-0356-4a8e-8141-2fea6a0ac550/",
                            "analysis_step_types":[
                                "annotating"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairsams"
                                    }
                                ],
                                "name":"input_pairsams"
                            }
                        ],
                        "name":"pairsam-markasdup"
                    }
                ],
                "uuid":"a18978fa-7e78-488f-8e6b-bfb6f63b8861",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".sam.pairs.gz",
                            "upload_key":"8740663b-e8da-410d-a9f8-e8fcca793f95/4DNFIXZW3HLF.sam.pairs.gz",
                            "format":"pairsam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIXZW3HLF/",
                            "accession":"4DNFIXZW3HLF",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                            "file_format":"pairsam",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_markedpairsam"
                    },
                    {
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/ddfc9766-6087-4bd4-8e2d-fe897c0edbdb/",
                        "name":"input_pairsam"
                    },
                    {
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/f4e711a1-1780-4b64-ae41-caf33fc802c3/",
                        "name":"input_pairsam"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_markedpairsam"
            }
        ],
        "name":"/workflow-runs-awsem/6afadc89-c382-4d1b-9c1f-49858f811831/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIXZW3HLF/",
                            "display_title":"4DNFIXZW3HLF.sam.pairs.gz",
                            "accession":"4DNFIXZW3HLF",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":91859125712,
                            "uuid":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                            "file_format":"pairsam",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"8740663b-e8da-410d-a9f8-e8fcca793f95",
                        "workflow":"/workflows/a18978fa-7e78-488f-8e6b-bfb6f63b8861/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/6afadc89-c382-4d1b-9c1f-49858f811831/",
                        "name":"out_markedpairsam"
                    }
                ],
                "name":"input_pairsam"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chromsize"
                    }
                ],
                "name":"chromsize"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/f4e711a1-1780-4b64-ae41-caf33fc802c3/",
            "display_title":"pairsam-filter run 2017-09-16 00:10:37.256759",
            "status":"released",
            "date_created":"2017-09-16T00:10:38.139452+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                "display_title":"Filtering for Hi-C using pairsamtools - 4DNWF38VH15",
                "accession":"4DNWF38VH15",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"dedup_pairs"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"dedup_pairs"
                            },
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"lossless_bamfile"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"bam",
                                    "argument_cardinality":"1"
                                },
                                "name":"lossless_bamfile"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c9bf856d-0356-4a8e-8141-2fea6a0ac550/",
                            "analysis_step_types":[
                                "filtering"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairsam",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairsam"
                                    }
                                ],
                                "name":"input_pairsam"
                            },
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"chromsizes",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"chromsize"
                                    }
                                ],
                                "name":"chromsize"
                            }
                        ],
                        "name":"pairsam-filter"
                    }
                ],
                "uuid":"3758e00c-2035-43c6-b783-bb92afe57c99",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".pairs.gz",
                            "upload_key":"1cb152c4-0e7a-431d-b148-b7e23eabca6e/4DNFICOBX8XY.pairs.gz",
                            "format":"pairs",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFICOBX8XY/",
                            "accession":"4DNFICOBX8XY",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                            "file_format":"pairs",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"dedup_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/cea98881-0cf8-4ddc-9952-891a733839ea/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/4c69c939-9d1f-4b07-bd32-4129c44f5ffd/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/3a4a1374-fe91-4040-b1a6-b5eca2112a70/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bad5fdef-33f5-42a4-af70-1e0757018944/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/6791ee16-d588-424a-a9dc-3165afaefce2/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/d73d5ad5-72de-4bed-8b08-561c7ea46407/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/0feacd3d-1391-4f02-9bc1-3809f9059b1a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/b3c95cf4-f0a1-4dfa-a20b-470c3d74c402/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8ce76421-de38-4228-8849-db2c7209a47c/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/68c91aff-31f2-452c-975e-c7f1ba8c6460/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/7fa7dd02-ee88-43d3-8208-2daa4482e6f3/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/cea98881-0cf8-4ddc-9952-891a733839ea/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/4c69c939-9d1f-4b07-bd32-4129c44f5ffd/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/3a4a1374-fe91-4040-b1a6-b5eca2112a70/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bad5fdef-33f5-42a4-af70-1e0757018944/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/6791ee16-d588-424a-a9dc-3165afaefce2/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/d73d5ad5-72de-4bed-8b08-561c7ea46407/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/0feacd3d-1391-4f02-9bc1-3809f9059b1a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/b3c95cf4-f0a1-4dfa-a20b-470c3d74c402/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8ce76421-de38-4228-8849-db2c7209a47c/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/68c91aff-31f2-452c-975e-c7f1ba8c6460/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/7fa7dd02-ee88-43d3-8208-2daa4482e6f3/",
                        "name":"input_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"dedup_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".bam",
                            "upload_key":"3e71a0ae-2f61-490a-adc8-25d30bad1a2c/4DNFIBDQQU1B.bam",
                            "format":"bam",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIBDQQU1B/",
                            "accession":"4DNFIBDQQU1B",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"3e71a0ae-2f61-490a-adc8-25d30bad1a2c",
                            "file_format":"bam",
                            "file_type":"alignment"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"lossless_bamfile"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"lossless_bamfile"
            }
        ],
        "name":"/workflow-runs-awsem/f4e711a1-1780-4b64-ae41-caf33fc802c3/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFICOBX8XY/",
                            "display_title":"4DNFICOBX8XY.pairs.gz",
                            "accession":"4DNFICOBX8XY",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":6327033069,
                            "uuid":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                            "file_format":"pairs",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"1cb152c4-0e7a-431d-b148-b7e23eabca6e",
                        "workflow":"/workflows/3758e00c-2035-43c6-b783-bb92afe57c99/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/f4e711a1-1780-4b64-ae41-caf33fc802c3/",
                        "name":"dedup_pairs"
                    }
                ],
                "name":"input_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823MBKE/",
                            "display_title":"4DNFI823MBKE.txt",
                            "accession":"4DNFI823MBKE",
                            "status":"released to project",
                            "filename":"GRCh38_HindIII_new.txt",
                            "description":null,
                            "file_size":7762970,
                            "uuid":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                            "file_format":"juicer_format_restriction_site_file",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"595763c6-58d3-4ec4-8f04-3dbb88ed4736",
                        "type":"Workflow Input File",
                        "name":"restriction_file"
                    }
                ],
                "name":"restriction_file"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/7fa7dd02-ee88-43d3-8208-2daa4482e6f3/",
            "display_title":"addfragtopairs run 2017-09-16 18:59:17.399707",
            "status":"in review by lab",
            "date_created":"2017-09-16T18:59:18.593796+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                "display_title":"Adding restriction fragment information for Hi-C using pairsamtools - 4DNWZJ2G671",
                "accession":"4DNWZJ2G671",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_pairs"
                                    }
                                ],
                                "meta":{
                                    "secondary_file_formats":[
                                        "pairs_px2"
                                    ],
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_pairs"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/e17c3e9c-8882-4478-93da-062c5213341d/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            },
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"juicer_format_restriction_site_file",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"restriction_file"
                                    }
                                ],
                                "name":"restriction_file"
                            }
                        ],
                        "name":"addfragtopairs"
                    }
                ],
                "uuid":"ef125750-8df2-418e-a1ee-402285f9dd93",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "extra_files":[
                                {
                                    "accession":"4DNFI6BIN9DA",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFI6BIN9DA",
                                    "href":"/69931af1-44a8-4eeb-bf2a-42a08967b49a/@@download/4DNFI6BIN9DA.pairs.gz.px2",
                                    "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                                    "upload_key":"69931af1-44a8-4eeb-bf2a-42a08967b49a/4DNFI6BIN9DA.pairs.gz.px2",
                                    "file_format":"pairs_px2"
                                }
                            ],
                            "format":"pairs",
                            "upload_key":"69931af1-44a8-4eeb-bf2a-42a08967b49a/4DNFI6BIN9DA.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ]
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI6BIN9DA/",
                            "accession":"4DNFI6BIN9DA",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                            "file_format":"pairs",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/52c73977-70d1-4261-88e4-597fc718f5c4/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/155d5d48-9599-49bf-8c46-7a8a8e71af55/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/0f7f34f6-acac-4405-8e16-b58b7a96db0a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/9e9d857b-33b1-4dbd-bf81-8ab0af7465c2/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/0eb95228-b00f-44be-9ece-52e4b17470e6/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/c189a54a-dcb2-4868-a9f1-7ddf00be5f17/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/4f289af2-85b8-435d-bd70-5a3cc6197015/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/fb6821c4-7633-47c1-b928-2a1b7e26db7a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/6b3078bd-6237-4576-8f82-a50653e7c244/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/bf816946-b6d8-4a7e-9039-7a12646e98e3/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/172417b6-18d6-46d7-8c25-037c2b723a3d/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/aa6804ad-c5a6-44f4-9e1d-cd5a8a68ffef/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/c105db2b-144e-4e56-bae4-b25f5cc91ce1/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/c62d30da-583d-4d74-9cb5-0042f40fd471/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8873afcf-fc20-4624-88ca-979ba7bf4875/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/79846788-bc43-44bb-a5b4-0b67bb325d94/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/241deb01-8b75-425d-8a65-c64935cf9c07/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8705ce63-513c-4910-bead-8772fdefc276/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8a3744b5-a537-4e01-a20e-bc17792afe2d/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/7c7bdae5-1729-42d9-8de7-57130de69230/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/dd42afcf-26dc-46ac-9380-bce878890597/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/478c9c18-b1d7-41a4-8683-6787685a518e/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/9f540d88-6d10-48a4-acd3-1c5ef5787d15/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/5ef3732e-4e39-4e79-838f-c970b26756ac/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/5bf30992-0d65-4ed8-a5a1-633e2dc0ced7/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/6eaf7ec7-89db-46d1-a83b-13fe44d7e56c/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/038d4977-15e5-45f3-a459-f945326e9081/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/617cb7f6-4712-4b02-a6e0-063882c00db4/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/8c3d5f42-d29a-410c-a6fb-d3d91be719d1/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/1109265b-34e0-49da-b785-c3c317b58093/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/41b3b8f7-ec40-4ff2-94e3-7decc28a080a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/59673632-bac5-4cbe-a6ad-df8252c31531/",
                        "name":"input_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_pairs"
            }
        ],
        "name":"/workflow-runs-awsem/7fa7dd02-ee88-43d3-8208-2daa4482e6f3/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI6BIN9DA/",
                            "display_title":"4DNFI6BIN9DA.pairs.gz",
                            "accession":"4DNFI6BIN9DA",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":7231363510,
                            "uuid":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                            "file_format":"pairs",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"69931af1-44a8-4eeb-bf2a-42a08967b49a",
                        "workflow":"/workflows/ef125750-8df2-418e-a1ee-402285f9dd93/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/7fa7dd02-ee88-43d3-8208-2daa4482e6f3/",
                        "name":"out_pairs"
                    }
                ],
                "name":"input_pairs"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/8705ce63-513c-4910-bead-8772fdefc276/",
            "display_title":"pairs-patch run 2017-09-17 16:17:54.117168",
            "status":"released",
            "date_created":"2017-09-17T16:17:54.973245+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                "display_title":"Patching pairs file for Hi-C using pairsamtools - 4DNWZH36VU2",
                "accession":"4DNWZH36VU2",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_pairs"
                                    }
                                ],
                                "meta":{
                                    "secondary_file_formats":[
                                        "pairs_px2"
                                    ],
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_pairs"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/e17c3e9c-8882-4478-93da-062c5213341d/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            }
                        ],
                        "name":"pairs-patch"
                    }
                ],
                "uuid":"7e5dcad0-d8da-4286-9253-a779d5310a49",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "extra_files":[
                                {
                                    "accession":"4DNFICYJ9FOU",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFICYJ9FOU",
                                    "href":"/a9554821-af87-489d-bba6-f58d4286a2a3/@@download/4DNFICYJ9FOU.pairs.gz.px2",
                                    "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                                    "upload_key":"a9554821-af87-489d-bba6-f58d4286a2a3/4DNFICYJ9FOU.pairs.gz.px2",
                                    "file_format":"pairs_px2"
                                }
                            ],
                            "format":"pairs",
                            "upload_key":"a9554821-af87-489d-bba6-f58d4286a2a3/4DNFICYJ9FOU.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ]
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFICYJ9FOU/",
                            "accession":"4DNFICYJ9FOU",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                            "file_format":"pairs",
                            "file_type":"contact list"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_pairs"
                    },
                    {
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/f88d3588-6a40-4639-8f81-8afa780e1331/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/600e4233-963d-4c8a-ae0b-f1abe2c3dfe3/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/704785bc-2020-44eb-b530-114522601672/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/98f9c91e-7e74-4d8e-932b-28faa49f7b6a/",
                        "name":"input_pairs"
                    },
                    {
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/a917dc3f-4dcd-4434-af97-ef57fe242e37/",
                        "name":"input_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_pairs"
            }
        ],
        "name":"/workflow-runs-awsem/8705ce63-513c-4910-bead-8772fdefc276/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        },
                        {
                            "ordinal":2
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFICYJ9FOU/",
                            "display_title":"4DNFICYJ9FOU.pairs.gz",
                            "accession":"4DNFICYJ9FOU",
                            "status":"released",
                            "filename":null,
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_size":7153224651,
                            "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                            "file_format":"pairs",
                            "file_type":"contact list",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        },
                        {
                            "@id":"/files-processed/4DNFI1ZLO9D7/",
                            "display_title":"4DNFI1ZLO9D7.pairs.gz",
                            "accession":"4DNFI1ZLO9D7",
                            "status":"released",
                            "filename":null,
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_size":6561025451,
                            "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                            "file_format":"pairs",
                            "file_type":"contact list",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/8705ce63-513c-4910-bead-8772fdefc276/",
                        "name":"out_pairs"
                    },
                    {
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb/",
                        "name":"out_pairs"
                    }
                ],
                "name":"input_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chrsizes"
                    }
                ],
                "name":"chrsizes"
            },
            {
                "run_data":{
                    "value":[
                        "1"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"ncores"
                    }
                ],
                "name":"ncores"
            },
            {
                "run_data":{
                    "value":[
                        "5000"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"min_res"
                    }
                ],
                "name":"min_res"
            },
            {
                "run_data":{
                    "value":[
                        "5000"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"binsize"
                    }
                ],
                "name":"binsize"
            },
            {
                "run_data":{
                    "value":[
                        "60g"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"maxmem"
                    }
                ],
                "name":"maxmem"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/704785bc-2020-44eb-b530-114522601672/",
            "display_title":"hi-c-processing-partb run 2017-09-17 20:04:23.123639",
            "status":"released",
            "date_created":"2017-09-17T20:04:24.035814+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                "display_title":"Hi-C processing part B revision 44 - 4DNWFP00U73B",
                "accession":"4DNWFP00U73B",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_pairs"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"cooler",
                                        "name":"pairs"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"pairs2hic",
                                        "name":"input_pairs"
                                    }
                                ],
                                "meta":{
                                    "secondary_file_formats":[
                                        "pairs_px2"
                                    ],
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_pairs"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d82d-4da9-950c-2ca994a23547/",
                            "analysis_step_types":[
                                "file merging"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            }
                        ],
                        "name":"merge_pairs"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_hic"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"hic",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_hic"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23576/",
                            "analysis_step_types":[
                                "aggregation",
                                "normalization"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"chromsizes",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"chrsizes"
                                    }
                                ],
                                "name":"chrsizes"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"min_res"
                                    }
                                ],
                                "name":"min_res"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"merge_pairs",
                                        "name":"output_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            }
                        ],
                        "name":"pairs2hic"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_cool"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"cool",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_cool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "aggregation"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"ncores"
                                    }
                                ],
                                "name":"ncores"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"binsize"
                                    }
                                ],
                                "name":"binsize"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"merge_pairs",
                                        "name":"output_pairs"
                                    }
                                ],
                                "name":"pairs"
                            }
                        ],
                        "name":"cooler"
                    }
                ],
                "uuid":"d9e9c966-56d9-47e8-ae21-47f94a1af417",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "extra_files":[
                                {
                                    "accession":"4DNFIJHZGGD6",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFIJHZGGD6",
                                    "href":"/4d065df0-0164-4a17-818d-a64d0359cc69/@@download/4DNFIJHZGGD6.pairs.gz.px2",
                                    "uuid":"4d065df0-0164-4a17-818d-a64d0359cc69",
                                    "upload_key":"4d065df0-0164-4a17-818d-a64d0359cc69/4DNFIJHZGGD6.pairs.gz.px2",
                                    "file_format":"pairs_px2"
                                }
                            ],
                            "format":"pairs",
                            "upload_key":"4d065df0-0164-4a17-818d-a64d0359cc69/4DNFIJHZGGD6.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ]
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIJHZGGD6/",
                            "accession":"4DNFIJHZGGD6",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"4d065df0-0164-4a17-818d-a64d0359cc69",
                            "file_format":"pairs",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":false
                },
                "name":"output_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".cool",
                            "upload_key":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56/4DNFI8HILY6S.cool",
                            "format":"cool",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI8HILY6S/",
                            "accession":"4DNFI8HILY6S",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                            "file_format":"cool",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_cool"
                    },
                    {
                        "for_file":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/44d7db19-f679-4e13-9e63-f6ace5d0d3ab/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/44d7db19-f679-4e13-9e63-f6ace5d0d3ab/",
                        "name":"input_cool"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_cool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".hic",
                            "upload_key":"63b30fae-880d-4bd0-87b2-7c99262ea4a7/4DNFI2ZSVKS3.hic",
                            "format":"hic",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI2ZSVKS3/",
                            "accession":"4DNFI2ZSVKS3",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                            "file_format":"hic",
                            "file_type":"contact matrix"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_hic"
                    },
                    {
                        "for_file":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/44d7db19-f679-4e13-9e63-f6ace5d0d3ab/",
                        "name":"input_hic"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_hic"
            }
        ],
        "name":"/workflow-runs-awsem/704785bc-2020-44eb-b530-114522601672/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI8HILY6S/",
                            "display_title":"4DNFI8HILY6S.cool",
                            "accession":"4DNFI8HILY6S",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":1179838207,
                            "uuid":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                            "file_format":"cool",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"31f99d9d-5991-44c9-b8a3-3e36c6b94d56",
                        "workflow":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/704785bc-2020-44eb-b530-114522601672/",
                        "name":"out_cool"
                    }
                ],
                "name":"input_cool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI2ZSVKS3/",
                            "display_title":"4DNFI2ZSVKS3.hic",
                            "accession":"4DNFI2ZSVKS3",
                            "status":"released",
                            "filename":null,
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_size":3973561535,
                            "uuid":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                            "file_format":"hic",
                            "file_type":"contact matrix",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"63b30fae-880d-4bd0-87b2-7c99262ea4a7",
                        "type":"Workflow Input File",
                        "name":"input_hic"
                    }
                ],
                "name":"input_hic"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chromsize"
                    }
                ],
                "name":"chromsize"
            },
            {
                "run_data":{
                    "value":[
                        "1"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"ncores"
                    }
                ],
                "name":"ncores"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/44d7db19-f679-4e13-9e63-f6ace5d0d3ab/",
            "display_title":"hi-c-processing-partc run 2017-09-18 04:18:43.908568",
            "status":"released",
            "date_created":"2017-09-18T04:18:44.781547+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/c6480905-49e5-4c33-afab-9ec90d65faf3/",
                "display_title":"hi-c-processing-partc/6 - 4DNWF06BPEF2",
                "accession":"4DNWF06BPEF2",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Input file or parameter",
                                        "step":"add_hic_normvector_to_mcool",
                                        "name":"input_mcool"
                                    }
                                ],
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "name":"output_mcool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "aggregation",
                                "normalization",
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"cool",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_cool"
                                    }
                                ],
                                "name":"input_cool"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"ncores"
                                    }
                                ],
                                "name":"ncores"
                            }
                        ],
                        "name":"cool2mcool"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_normvector"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"normvector_juicerformat",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_normvector"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c91a2c9d-079c-4647-9951-da95f2c9baf1/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"add_hic_normvector_to_mcool",
                                        "name":"output_mcool"
                                    }
                                ],
                                "name":"input_mcool"
                            }
                        ],
                        "name":"extract_mcool_normvector_for_juicebox"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_mcool"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"extract_mcool_normvector_for_juicebox",
                                        "name":"input_mcool"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"mcool",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_mcool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"hic",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_hic"
                                    }
                                ],
                                "name":"input_hic"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"cool2mcool",
                                        "name":"output_mcool"
                                    }
                                ],
                                "name":"input_mcool"
                            }
                        ],
                        "name":"add_hic_normvector_to_mcool"
                    }
                ],
                "uuid":"c6480905-49e5-4c33-afab-9ec90d65faf3",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".mcool",
                            "upload_key":"27284dc8-d38c-483f-b0a1-a13d4f247db9/4DNFI4OBPEAV.mcool",
                            "format":"mcool",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI4OBPEAV/",
                            "accession":"4DNFI4OBPEAV",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"27284dc8-d38c-483f-b0a1-a13d4f247db9",
                            "file_format":"mcool",
                            "file_type":"contact matrix"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_mcool"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_mcool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".normvector.juicerformat.gz",
                            "upload_key":"1a1b2788-28a9-4c5f-bbd7-e419cca21dca/4DNFI75V1UJB.normvector.juicerformat.gz",
                            "format":"normvector_juicerformat",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI75V1UJB/",
                            "accession":"4DNFI75V1UJB",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"1a1b2788-28a9-4c5f-bbd7-e419cca21dca",
                            "file_format":"normvector_juicerformat",
                            "file_type":"juicebox norm vector"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_normvector"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_normvector"
            }
        ],
        "name":"/workflow-runs-awsem/44d7db19-f679-4e13-9e63-f6ace5d0d3ab/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI1ZLO9D7/",
                            "accession":"4DNFI1ZLO9D7",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"817f3faa-0573-45c0-8230-02ec19de6544",
                            "file_format":"pairs"
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"817f3faa-0573-45c0-8230-02ec19de6544",
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/3c3eee6a-5e44-40a3-9cb6-c00cb9a9e5cb/",
                        "name":"out_pairs"
                    }
                ],
                "name":"input_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chrsizes"
                    }
                ],
                "name":"chrsizes"
            },
            {
                "run_data":{
                    "value":[
                        "1"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"ncores"
                    }
                ],
                "name":"ncores"
            },
            {
                "run_data":{
                    "value":[
                        "5000"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"min_res"
                    }
                ],
                "name":"min_res"
            },
            {
                "run_data":{
                    "value":[
                        "60g"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"maxmem"
                    }
                ],
                "name":"maxmem"
            },
            {
                "run_data":{
                    "value":[
                        "5000"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"binsize"
                    }
                ],
                "name":"binsize"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/adebfa13-9f9d-4b3a-abf8-754b1d74c2f2/",
            "display_title":"hi-c-processing-partb run 2017-09-17 18:53:38.477317",
            "status":"released",
            "date_created":"2017-09-17T18:53:39.403185+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                "display_title":"Hi-C processing part B revision 44 - 4DNWFP00U73B",
                "accession":"4DNWFP00U73B",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_pairs"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"cooler",
                                        "name":"pairs"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"pairs2hic",
                                        "name":"input_pairs"
                                    }
                                ],
                                "meta":{
                                    "secondary_file_formats":[
                                        "pairs_px2"
                                    ],
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_pairs"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d82d-4da9-950c-2ca994a23547/",
                            "analysis_step_types":[
                                "file merging"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            }
                        ],
                        "name":"merge_pairs"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_hic"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"hic",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_hic"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23576/",
                            "analysis_step_types":[
                                "aggregation",
                                "normalization"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"chromsizes",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"chrsizes"
                                    }
                                ],
                                "name":"chrsizes"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"min_res"
                                    }
                                ],
                                "name":"min_res"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"merge_pairs",
                                        "name":"output_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            }
                        ],
                        "name":"pairs2hic"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_cool"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"cool",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_cool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "aggregation"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"ncores"
                                    }
                                ],
                                "name":"ncores"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"binsize"
                                    }
                                ],
                                "name":"binsize"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"merge_pairs",
                                        "name":"output_pairs"
                                    }
                                ],
                                "name":"pairs"
                            }
                        ],
                        "name":"cooler"
                    }
                ],
                "uuid":"d9e9c966-56d9-47e8-ae21-47f94a1af417",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "extra_files":[
                                {
                                    "accession":"4DNFIUJGSOOU",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFIUJGSOOU",
                                    "href":"/aeee6285-0250-498f-bfdf-fd48c44728ed/@@download/4DNFIUJGSOOU.pairs.gz.px2",
                                    "uuid":"aeee6285-0250-498f-bfdf-fd48c44728ed",
                                    "upload_key":"aeee6285-0250-498f-bfdf-fd48c44728ed/4DNFIUJGSOOU.pairs.gz.px2",
                                    "file_format":"pairs_px2"
                                }
                            ],
                            "format":"pairs",
                            "upload_key":"aeee6285-0250-498f-bfdf-fd48c44728ed/4DNFIUJGSOOU.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ]
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIUJGSOOU/",
                            "accession":"4DNFIUJGSOOU",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"aeee6285-0250-498f-bfdf-fd48c44728ed",
                            "file_format":"pairs",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":false
                },
                "name":"output_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".cool",
                            "upload_key":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a/4DNFIV9E8JGV.cool",
                            "format":"cool",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIV9E8JGV/",
                            "accession":"4DNFIV9E8JGV",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                            "file_format":"cool",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/b0059413-fdd8-4f88-9898-5c041ea56d46/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/84443a4d-adee-413e-9631-9360a6e462ba/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/612cfaeb-080c-44e5-b14d-513f14ffe2a5/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/5d02d0e4-c068-4075-a16b-a29617d03317/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/e737f3f3-ddd8-40b3-9d80-52ebf1f3d1f3/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/b0059413-fdd8-4f88-9898-5c041ea56d46/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/84443a4d-adee-413e-9631-9360a6e462ba/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/612cfaeb-080c-44e5-b14d-513f14ffe2a5/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/5d02d0e4-c068-4075-a16b-a29617d03317/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/e737f3f3-ddd8-40b3-9d80-52ebf1f3d1f3/",
                        "name":"input_cool"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_cool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".hic",
                            "upload_key":"66d0d60d-1ee4-4564-b625-7188025b85ea/4DNFI95Q7FEU.hic",
                            "format":"hic",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI95Q7FEU/",
                            "accession":"4DNFI95Q7FEU",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                            "file_format":"hic",
                            "file_type":"contact matrix"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_hic"
                    },
                    {
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/b0059413-fdd8-4f88-9898-5c041ea56d46/",
                        "name":"input_hic"
                    },
                    {
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/84443a4d-adee-413e-9631-9360a6e462ba/",
                        "name":"input_hic"
                    },
                    {
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/612cfaeb-080c-44e5-b14d-513f14ffe2a5/",
                        "name":"input_hic"
                    },
                    {
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/5d02d0e4-c068-4075-a16b-a29617d03317/",
                        "name":"input_hic"
                    },
                    {
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/e737f3f3-ddd8-40b3-9d80-52ebf1f3d1f3/",
                        "name":"input_hic"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_hic"
            }
        ],
        "name":"/workflow-runs-awsem/adebfa13-9f9d-4b3a-abf8-754b1d74c2f2/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIV9E8JGV/",
                            "display_title":"4DNFIV9E8JGV.cool",
                            "accession":"4DNFIV9E8JGV",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":628327100,
                            "uuid":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                            "file_format":"cool",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"5b1dd671-a8ce-4a5f-aa11-9447cdde164a",
                        "workflow":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/adebfa13-9f9d-4b3a-abf8-754b1d74c2f2/",
                        "name":"out_cool"
                    }
                ],
                "name":"input_cool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI95Q7FEU/",
                            "display_title":"4DNFI95Q7FEU.hic",
                            "accession":"4DNFI95Q7FEU",
                            "status":"released",
                            "filename":null,
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_size":2300381369,
                            "uuid":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                            "file_format":"hic",
                            "file_type":"contact matrix",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"66d0d60d-1ee4-4564-b625-7188025b85ea",
                        "type":"Workflow Input File",
                        "name":"input_hic"
                    }
                ],
                "name":"input_hic"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chromsize"
                    }
                ],
                "name":"chromsize"
            },
            {
                "run_data":{
                    "value":[
                        "1"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"ncores"
                    }
                ],
                "name":"ncores"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/e737f3f3-ddd8-40b3-9d80-52ebf1f3d1f3/",
            "display_title":"hi-c-processing-partc run 2017-09-18 00:08:39.630886",
            "status":"released",
            "date_created":"2017-09-18T00:08:40.558099+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/c6480905-49e5-4c33-afab-9ec90d65faf3/",
                "display_title":"hi-c-processing-partc/6 - 4DNWF06BPEF2",
                "accession":"4DNWF06BPEF2",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Input file or parameter",
                                        "step":"add_hic_normvector_to_mcool",
                                        "name":"input_mcool"
                                    }
                                ],
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "name":"output_mcool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "aggregation",
                                "normalization",
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"cool",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_cool"
                                    }
                                ],
                                "name":"input_cool"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"ncores"
                                    }
                                ],
                                "name":"ncores"
                            }
                        ],
                        "name":"cool2mcool"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_normvector"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"normvector_juicerformat",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_normvector"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c91a2c9d-079c-4647-9951-da95f2c9baf1/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"add_hic_normvector_to_mcool",
                                        "name":"output_mcool"
                                    }
                                ],
                                "name":"input_mcool"
                            }
                        ],
                        "name":"extract_mcool_normvector_for_juicebox"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_mcool"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"extract_mcool_normvector_for_juicebox",
                                        "name":"input_mcool"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"mcool",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_mcool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"hic",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_hic"
                                    }
                                ],
                                "name":"input_hic"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"cool2mcool",
                                        "name":"output_mcool"
                                    }
                                ],
                                "name":"input_mcool"
                            }
                        ],
                        "name":"add_hic_normvector_to_mcool"
                    }
                ],
                "uuid":"c6480905-49e5-4c33-afab-9ec90d65faf3",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".mcool",
                            "upload_key":"b414e1ec-797f-4225-abb4-9ad5468c3b7d/4DNFIV6HB4VT.mcool",
                            "format":"mcool",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIV6HB4VT/",
                            "accession":"4DNFIV6HB4VT",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"b414e1ec-797f-4225-abb4-9ad5468c3b7d",
                            "file_format":"mcool",
                            "file_type":"contact matrix"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_mcool"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_mcool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".normvector.juicerformat.gz",
                            "upload_key":"67eb9c0a-c34d-42d5-ba1b-504f5b90c99f/4DNFIQ1PICV9.normvector.juicerformat.gz",
                            "format":"normvector_juicerformat",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIQ1PICV9/",
                            "accession":"4DNFIQ1PICV9",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"67eb9c0a-c34d-42d5-ba1b-504f5b90c99f",
                            "file_format":"normvector_juicerformat",
                            "file_type":"juicebox norm vector"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_normvector"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_normvector"
            }
        ],
        "name":"/workflow-runs-awsem/e737f3f3-ddd8-40b3-9d80-52ebf1f3d1f3/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFICYJ9FOU/",
                            "accession":"4DNFICYJ9FOU",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"a9554821-af87-489d-bba6-f58d4286a2a3",
                            "file_format":"pairs"
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"a9554821-af87-489d-bba6-f58d4286a2a3",
                        "workflow":"/workflows/7e5dcad0-d8da-4286-9253-a779d5310a49/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/8705ce63-513c-4910-bead-8772fdefc276/",
                        "name":"out_pairs"
                    }
                ],
                "name":"input_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chrsizes"
                    }
                ],
                "name":"chrsizes"
            },
            {
                "run_data":{
                    "value":[
                        "1"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"ncores"
                    }
                ],
                "name":"ncores"
            },
            {
                "run_data":{
                    "value":[
                        "5000"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"min_res"
                    }
                ],
                "name":"min_res"
            },
            {
                "run_data":{
                    "value":[
                        "5000"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"binsize"
                    }
                ],
                "name":"binsize"
            },
            {
                "run_data":{
                    "value":[
                        "60g"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"maxmem"
                    }
                ],
                "name":"maxmem"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/a917dc3f-4dcd-4434-af97-ef57fe242e37/",
            "display_title":"hi-c-processing-partb run 2017-09-17 19:27:36.797149",
            "status":"released",
            "date_created":"2017-09-17T19:27:37.675275+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                "display_title":"Hi-C processing part B revision 44 - 4DNWFP00U73B",
                "accession":"4DNWFP00U73B",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_pairs"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"cooler",
                                        "name":"pairs"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"pairs2hic",
                                        "name":"input_pairs"
                                    }
                                ],
                                "meta":{
                                    "secondary_file_formats":[
                                        "pairs_px2"
                                    ],
                                    "argument_type":"Output processed file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_pairs"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d82d-4da9-950c-2ca994a23547/",
                            "analysis_step_types":[
                                "file merging"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"pairs",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            }
                        ],
                        "name":"merge_pairs"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_hic"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"hic",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_hic"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23576/",
                            "analysis_step_types":[
                                "aggregation",
                                "normalization"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"chromsizes",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"chrsizes"
                                    }
                                ],
                                "name":"chrsizes"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"min_res"
                                    }
                                ],
                                "name":"min_res"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"merge_pairs",
                                        "name":"output_pairs"
                                    }
                                ],
                                "name":"input_pairs"
                            }
                        ],
                        "name":"pairs2hic"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"out_cool"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"cool",
                                    "argument_cardinality":"1"
                                },
                                "name":"out_cool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "aggregation"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"ncores"
                                    }
                                ],
                                "name":"ncores"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"binsize"
                                    }
                                ],
                                "name":"binsize"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"merge_pairs",
                                        "name":"output_pairs"
                                    }
                                ],
                                "name":"pairs"
                            }
                        ],
                        "name":"cooler"
                    }
                ],
                "uuid":"d9e9c966-56d9-47e8-ae21-47f94a1af417",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extension":".pairs.gz",
                            "secondary_file_formats":[
                                "pairs_px2"
                            ],
                            "type":"Output processed file",
                            "extra_files":[
                                {
                                    "accession":"4DNFI7DYQJ7I",
                                    "status":"to be uploaded by workflow",
                                    "filename":"4DNFI7DYQJ7I",
                                    "href":"/76bb4d49-f791-4136-b392-e6a01e58b2c2/@@download/4DNFI7DYQJ7I.pairs.gz.px2",
                                    "uuid":"76bb4d49-f791-4136-b392-e6a01e58b2c2",
                                    "upload_key":"76bb4d49-f791-4136-b392-e6a01e58b2c2/4DNFI7DYQJ7I.pairs.gz.px2",
                                    "file_format":"pairs_px2"
                                }
                            ],
                            "format":"pairs",
                            "upload_key":"76bb4d49-f791-4136-b392-e6a01e58b2c2/4DNFI7DYQJ7I.pairs.gz",
                            "secondary_file_extensions":[
                                ".pairs.gz.px2"
                            ]
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI7DYQJ7I/",
                            "accession":"4DNFI7DYQJ7I",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"76bb4d49-f791-4136-b392-e6a01e58b2c2",
                            "file_format":"pairs",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_pairs"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":false
                },
                "name":"output_pairs"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".cool",
                            "upload_key":"290ea431-e0d9-408d-be81-a8e585bd4660/4DNFIW8XBC3M.cool",
                            "format":"cool",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIW8XBC3M/",
                            "accession":"4DNFIW8XBC3M",
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "uuid":"290ea431-e0d9-408d-be81-a8e585bd4660",
                            "file_format":"cool",
                            "file_type":"intermediate file"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"out_cool"
                    },
                    {
                        "for_file":"290ea431-e0d9-408d-be81-a8e585bd4660",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/050d2a7b-a9ab-4e21-91bb-f75b50af3c75/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"290ea431-e0d9-408d-be81-a8e585bd4660",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/a6b459e4-c9b2-45c3-8912-38af6c59ea3b/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"290ea431-e0d9-408d-be81-a8e585bd4660",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/050d2a7b-a9ab-4e21-91bb-f75b50af3c75/",
                        "name":"input_cool"
                    },
                    {
                        "for_file":"290ea431-e0d9-408d-be81-a8e585bd4660",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/a6b459e4-c9b2-45c3-8912-38af6c59ea3b/",
                        "name":"input_cool"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"out_cool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".hic",
                            "upload_key":"265b3dbe-f1d2-4cae-957f-23f71a2c6638/4DNFI86NV3M3.hic",
                            "format":"hic",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI86NV3M3/",
                            "accession":"4DNFI86NV3M3",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                            "file_format":"hic",
                            "file_type":"contact matrix"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_hic"
                    },
                    {
                        "for_file":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/050d2a7b-a9ab-4e21-91bb-f75b50af3c75/",
                        "name":"input_hic"
                    },
                    {
                        "for_file":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                        "type":"Input file",
                        "step":"/workflow-runs-awsem/a6b459e4-c9b2-45c3-8912-38af6c59ea3b/",
                        "name":"input_hic"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_hic"
            }
        ],
        "name":"/workflow-runs-awsem/a917dc3f-4dcd-4434-af97-ef57fe242e37/"
    },
    {
        "inputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIW8XBC3M/",
                            "display_title":"4DNFIW8XBC3M.cool",
                            "accession":"4DNFIW8XBC3M",
                            "status":"uploaded",
                            "filename":null,
                            "description":"This is an intermediate file in the HiC processing pipeline. NOTE: This file may be removed without notice.",
                            "file_size":681297290,
                            "uuid":"290ea431-e0d9-408d-be81-a8e585bd4660",
                            "file_format":"cool",
                            "file_type":"intermediate file",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"290ea431-e0d9-408d-be81-a8e585bd4660",
                        "workflow":"/workflows/d9e9c966-56d9-47e8-ae21-47f94a1af417/",
                        "type":"Output file",
                        "step":"/workflow-runs-awsem/a917dc3f-4dcd-4434-af97-ef57fe242e37/",
                        "name":"out_cool"
                    }
                ],
                "name":"input_cool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFI86NV3M3/",
                            "display_title":"4DNFI86NV3M3.hic",
                            "accession":"4DNFI86NV3M3",
                            "status":"released",
                            "filename":null,
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "file_size":2463984943,
                            "uuid":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                            "file_format":"hic",
                            "file_type":"contact matrix",
                            "@type":[
                                "FileProcessed",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"265b3dbe-f1d2-4cae-957f-23f71a2c6638",
                        "type":"Workflow Input File",
                        "name":"input_hic"
                    }
                ],
                "name":"input_hic"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "ordinal":1
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-reference/4DNFI823LSII/",
                            "display_title":"4DNFI823LSII.chrom.sizes",
                            "accession":"4DNFI823LSII",
                            "status":"released to project",
                            "filename":"hg38.mainonly.chrom.sizes",
                            "description":null,
                            "file_size":365,
                            "uuid":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                            "file_format":"chromsizes",
                            "file_type":null,
                            "@type":[
                                "FileReference",
                                "File",
                                "Item"
                            ]
                        }
                    ]
                },
                "meta":{
                    "argument_type":"Input File",
                    "in_path":true
                },
                "source":[
                    {
                        "for_file":"4a6d10ee-2edb-4402-a98f-0edb1d58f5e9",
                        "type":"Workflow Input File",
                        "name":"chromsize"
                    }
                ],
                "name":"chromsize"
            },
            {
                "run_data":{
                    "value":[
                        "1"
                    ],
                    "meta":[
                        {

                        }
                    ],
                    "type":"parameter"
                },
                "meta":{
                    "argument_type":"Workflow Parameter",
                    "in_path":true
                },
                "source":[
                    {
                        "type":"Workflow Parameter",
                        "name":"ncores"
                    }
                ],
                "name":"ncores"
            }
        ],
        "meta":{
            "@id":"/workflow-runs-awsem/a6b459e4-c9b2-45c3-8912-38af6c59ea3b/",
            "display_title":"hi-c-processing-partc run 2017-09-18 00:08:53.081319",
            "status":"released",
            "date_created":"2017-09-18T00:08:53.959871+00:00",
            "analysis_step_types":[
                "Hi-C data analysis"
            ],
            "@type":[
                "WorkflowRunAwsem",
                "WorkflowRun",
                "Item"
            ],
            "workflow":{
                "@id":"/workflows/c6480905-49e5-4c33-afab-9ec90d65faf3/",
                "display_title":"hi-c-processing-partc/6 - 4DNWF06BPEF2",
                "accession":"4DNWF06BPEF2",
                "@type":[
                    "Workflow",
                    "Item"
                ],
                "steps":[
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Input file or parameter",
                                        "step":"add_hic_normvector_to_mcool",
                                        "name":"input_mcool"
                                    }
                                ],
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "name":"output_mcool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "aggregation",
                                "normalization",
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"cool",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_cool"
                                    }
                                ],
                                "name":"input_cool"
                            },
                            {
                                "meta":{
                                    "argument_type":"parameter",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Parameter",
                                        "name":"ncores"
                                    }
                                ],
                                "name":"ncores"
                            }
                        ],
                        "name":"cool2mcool"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_normvector"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"normvector_juicerformat",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_normvector"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/c91a2c9d-079c-4647-9951-da95f2c9baf1/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"add_hic_normvector_to_mcool",
                                        "name":"output_mcool"
                                    }
                                ],
                                "name":"input_mcool"
                            }
                        ],
                        "name":"extract_mcool_normvector_for_juicebox"
                    },
                    {
                        "outputs":[
                            {
                                "target":[
                                    {
                                        "type":"Workflow Output File",
                                        "name":"output_mcool"
                                    },
                                    {
                                        "type":"Input file or parameter",
                                        "step":"extract_mcool_normvector_for_juicebox",
                                        "name":"input_mcool"
                                    }
                                ],
                                "meta":{
                                    "argument_type":"Output processed file",
                                    "argument_format":"mcool",
                                    "argument_cardinality":"1"
                                },
                                "name":"output_mcool"
                            }
                        ],
                        "meta":{
                            "software_used":"/softwares/02d636b9-d8dd-4da9-950c-2ca994b23555/",
                            "analysis_step_types":[
                                "file format conversion"
                            ]
                        },
                        "inputs":[
                            {
                                "meta":{
                                    "argument_type":"Input file",
                                    "argument_format":"hic",
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Workflow Input File",
                                        "name":"input_hic"
                                    }
                                ],
                                "name":"input_hic"
                            },
                            {
                                "meta":{
                                    "argument_cardinality":"1"
                                },
                                "source":[
                                    {
                                        "type":"Output file or parameter",
                                        "step":"cool2mcool",
                                        "name":"output_mcool"
                                    }
                                ],
                                "name":"input_mcool"
                            }
                        ],
                        "name":"add_hic_normvector_to_mcool"
                    }
                ],
                "uuid":"c6480905-49e5-4c33-afab-9ec90d65faf3",
                "workflow_type":"Hi-C data analysis"
            },
            "run_status":"complete"
        },
        "outputs":[
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".mcool",
                            "upload_key":"941b4d2b-899d-4f1c-9f6a-c9f6a3401a18/4DNFII7498B3.mcool",
                            "format":"mcool",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFII7498B3/",
                            "accession":"4DNFII7498B3",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"941b4d2b-899d-4f1c-9f6a-c9f6a3401a18",
                            "file_format":"mcool",
                            "file_type":"contact matrix"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_mcool"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_mcool"
            },
            {
                "run_data":{
                    "meta":[
                        {
                            "extra_files":[

                            ],
                            "extension":".normvector.juicerformat.gz",
                            "upload_key":"f108ebb3-8693-491a-88a0-d3e2163d9966/4DNFIDWULZXP.normvector.juicerformat.gz",
                            "format":"normvector_juicerformat",
                            "type":"Output processed file"
                        }
                    ],
                    "type":"input",
                    "file":[
                        {
                            "@id":"/files-processed/4DNFIDWULZXP/",
                            "accession":"4DNFIDWULZXP",
                            "description":"This is an output of the current Hi-C processing pipeline draft. NOTE: The pipeline is under development and the file may be superseded. If you use this file, please check back later to confirm its validity. Report any issues to support@4dnucleome.org.",
                            "uuid":"f108ebb3-8693-491a-88a0-d3e2163d9966",
                            "file_format":"normvector_juicerformat",
                            "file_type":"juicebox norm vector"
                        }
                    ]
                },
                "target":[
                    {
                        "type":"Workflow Output File",
                        "name":"output_normvector"
                    }
                ],
                "meta":{
                    "argument_type":"Output File",
                    "in_path":true
                },
                "name":"output_normvector"
            }
        ],
        "name":"/workflow-runs-awsem/a6b459e4-c9b2-45c3-8912-38af6c59ea3b/"
    }
];