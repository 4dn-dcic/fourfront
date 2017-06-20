module.exports = {
    "uuid":"3c4a1844-7341-4d22-938f-a31f5b3837b5",
    "actions":[
        {
            "href":"/experiment-set-replicates/4DNESH4MYRID/#!edit-json",
            "title":"Edit JSON",
            "name":"edit-json",
            "profile":"/profiles/ExperimentSetReplicate.json"
        },
        {
            "href":"/experiment-set-replicates/4DNESH4MYRID/#!edit",
            "title":"Edit",
            "name":"edit",
            "profile":"/profiles/ExperimentSetReplicate.json"
        }
    ],
    "replicate_exps":[
        {
            "bio_rep_no":1.0,
            "replicate_exp":{
                "uuid":"8b5aa2d1-0911-4d78-8675-21686cd545e3",
                "accession":"4DNEXL6MFLSD"
            },
            "tec_rep_no":1.0
        },
        {
            "bio_rep_no":1.0,
            "replicate_exp":{
                "uuid":"2bfdcd18-bf14-4296-8fd6-514b94a830b3",
                "accession":"4DNEXTBYNI67"
            },
            "tec_rep_no":2.0
        },
        {
            "bio_rep_no":1.0,
            "replicate_exp":{
                "uuid":"10f06fc3-c0b4-4d1a-a539-a739c8f819a9",
                "accession":"4DNEX9L8XZ38"
            },
            "tec_rep_no":3.0
        },
        {
            "bio_rep_no":1.0,
            "replicate_exp":{
                "uuid":"8f182fa4-c240-4bee-a257-75893aba7aac",
                "accession":"4DNEXU2MKTIQ"
            },
            "tec_rep_no":4.0
        },
        {
            "bio_rep_no":1.0,
            "replicate_exp":{
                "uuid":"f99b1911-48ba-4c1e-b627-581cb80bc751",
                "accession":"4DNEXMH4CPDZ"
            },
            "tec_rep_no":5.0
        },
        {
            "bio_rep_no":2.0,
            "replicate_exp":{
                "uuid":"8692e5a0-dbad-4534-b978-03ad7ae15a95",
                "accession":"4DNEXYZ7NL1X"
            },
            "tec_rep_no":1.0
        },
        {
            "bio_rep_no":2.0,
            "replicate_exp":{
                "uuid":"a4b7dcd1-9100-41c8-b0cb-08aff0a51175",
                "accession":"4DNEXWLYHUZX"
            },
            "tec_rep_no":2.0
        }
    ],
    "award":{
        "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
        "@type":[
            "Award",
            "Item"
        ],
        "project":"4DN",
        "name":"1U01CA200059-01",
        "end_date":"2020-08-31",
        "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
        "start_date":"2015-09-07",
        "status":"current",
        "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
        "schema_version":"1",
        "@id":"/awards/1U01CA200059-01/",
        "date_created":"2017-01-24T14:17:59.010394+00:00"
    },
    "@type":[
        "ExperimentSetReplicate",
        "Item"
    ],
    "date_created":"2017-01-24T14:37:02.337939+00:00",
    "lab":{
        "phone2":"000-000-0000",
        "uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
        "postal_code":"02115",
        "@type":[
            "Lab",
            "Item"
        ],
        "institute_label":"HMS",
        "fax":"000-000-0000",
        "address2":"10 Schattuck Street",
        "address1":"Biomedical Bioinfomatics",
        "state":"MA",
        "title":"4DN DCIC Lab, HMS",
        "city":"Boston",
        "schema_version":"1",
        "name":"4dn-dcic-lab",
        "institute_name":"Harvard Medical School",
        "date_created":"2017-01-24T14:17:59.145844+00:00",
        "phone1":"000-000-0000",
        "@id":"/labs/4dn-dcic-lab/",
        "country":"USA",
        "status":"current"
    },
    "aliases":[
        "dciclab:rao_rep12"
    ],
    "experiments_in_set":[
        {
            "sop_mapping":{
                "has_sop":"Yes"
            },
            "dbxrefs":[
                "SRA:SRX764985",
                "GEO:GSM1551599"
            ],
            "biosample":{
                "uuid":"81e8f6d5-1021-4e9c-994a-23873e387d5e",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "accession":"4DNBSVPGP9W4",
                "aliases":[
                    "dcic:IMR90human_p1"
                ],
                "biosource":[
                    {
                        "uuid":"7d188d79-edac-4230-8d56-df71db107d81",
                        "cell_line":"IMR-90",
                        "individual":{
                            "organism":{
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "taxon_id":"9606",
                                "schema_version":"1",
                                "status":"released",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "scientific_name":"Homo sapiens",
                                "date_created":"2017-01-24T14:17:59.412529+00:00",
                                "@id":"/organisms/human/",
                                "name":"human"
                            }
                        },
                        "biosource_name":"IMR-90",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "tissue":"lung",
                        "cell_line_termid":"EFO_0001196",
                        "aliases":[
                            "dcic:IMR90"
                        ],
                        "accession":"4DNSRHTPADGK",
                        "schema_version":"1",
                        "status":"released",
                        "description":"IMR-90 (CCL-186)",
                        "biosource_type":"immortalized cell line",
                        "url":"https://www.atcc.org/Products/All/CCL-186.aspx",
                        "date_created":"2017-01-24T14:31:55.686109+00:00",
                        "@id":"/biosources/4DNSRHTPADGK/"
                    }
                ],
                "schema_version":"1",
                "status":"released",
                "modifications_summary_short":"None",
                "modifications_summary":"None",
                "biosource_summary":"IMR-90",
                "date_created":"2017-01-24T14:32:08.445192+00:00",
                "@id":"/biosamples/4DNBSVPGP9W4/",
                "treatments_summary":"None"
            },
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "experiment_type":"in situ Hi-C",
            "lab":{
                "phone2":"000-000-0000",
                "uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                "postal_code":"02115",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "institute_label":"HMS",
                "fax":"000-000-0000",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "state":"MA",
                "title":"4DN DCIC Lab, HMS",
                "city":"Boston",
                "schema_version":"1",
                "name":"4dn-dcic-lab",
                "institute_name":"Harvard Medical School",
                "date_created":"2017-01-24T14:17:59.145844+00:00",
                "phone1":"000-000-0000",
                "@id":"/labs/4dn-dcic-lab/",
                "country":"USA",
                "status":"current"
            },
            "ligation_volume":1.2,
            "schema_version":"1",
            "digestion_time":120.0,
            "ligation_time":240.0,
            "date_created":"2017-01-24T14:35:20.991710+00:00",
            "experiment_summary":"in situ Hi-C on IMR-90 with MboI",
            "uuid":"8b5aa2d1-0911-4d78-8675-21686cd545e3",
            "crosslinking_temperature":25.0,
            "protocol":{
                "uuid":"681d8b5b-7877-4c4a-aab4-796e65658b2d",
                "aliases":[
                    "dcic:Pro_insituhic"
                ],
                "schema_version":"1",
                "status":"released",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "date_created":"2017-01-24T14:31:50.559597+00:00",
                "@id":"/protocols/681d8b5b-7877-4c4a-aab4-796e65658b2d/"
            },
            "award":{
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "@type":[
                    "Award",
                    "Item"
                ],
                "project":"4DN",
                "name":"1U01CA200059-01",
                "end_date":"2020-08-31",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "start_date":"2015-09-07",
                "status":"current",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "schema_version":"1",
                "@id":"/awards/1U01CA200059-01/",
                "date_created":"2017-01-24T14:17:59.010394+00:00"
            },
            "digestion_enzyme":{
                "uuid":"37750c1c-fce5-4ec5-baa7-ce7858f898ae",
                "catalog_number":"R0147",
                "url":"https://www.neb.com/products/r0147-mboi",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "@id":"/enzymes/MboI/",
                "name":"MboI",
                "recognition_sequence":"GATC",
                "schema_version":"1",
                "status":"in review by lab",
                "site_length":4,
                "cut_position":0,
                "date_created":"2017-01-24T14:18:05.746379+00:00"
            },
            "@id":"/experiments-hi-c/4DNEXL6MFLSD/",
            "crosslinking_time":10.0,
            "ligation_temperature":25.0,
            "tagging_method":"bio-dATP",
            "aliases":[
                "erezlab:hic050"
            ],
            "crosslinking_method":"1% Formaldehyde",
            "digestion_temperature":37.0,
            "fragment_size_selection_method":"SPRI beads",
            "accession":"4DNEXL6MFLSD",
            "files":[
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"8e39bf85-02e2-4cbf-8352-55ca1ab402c7",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC050_SRR1658672_1"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFI4HKT2OG/",
                    "paired_end":"1",
                    "dbxrefs":[
                        "SRA:SRR1658672"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"dbd37686-1427-4ed0-ba74-bf2ba9367554"
                            }
                        }
                    ],
                    "title":"4DNFI4HKT2OG",
                    "accession":"4DNFI4HKT2OG",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:09.187068+00:00"
                },
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"dbd37686-1427-4ed0-ba74-bf2ba9367554",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC050_SRR1658672_2"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFI397I6JO/",
                    "paired_end":"2",
                    "dbxrefs":[
                        "SRA:SRR1658672"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"8e39bf85-02e2-4cbf-8352-55ca1ab402c7"
                            }
                        }
                    ],
                    "title":"4DNFI397I6JO",
                    "accession":"4DNFI397I6JO",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:09.331281+00:00"
                }
            ],
            "fragmentation_method":"sonication",
            "status":"released"
        },
        {
            "sop_mapping":{
                "has_sop":"Yes"
            },
            "dbxrefs":[
                "SRA:SRX764986",
                "GEO:GSM1551600"
            ],
            "biosample":{
                "uuid":"81e8f6d5-1021-4e9c-994a-23873e387d5e",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "accession":"4DNBSVPGP9W4",
                "aliases":[
                    "dcic:IMR90human_p1"
                ],
                "biosource":[
                    {
                        "uuid":"7d188d79-edac-4230-8d56-df71db107d81",
                        "cell_line":"IMR-90",
                        "individual":{
                            "organism":{
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "taxon_id":"9606",
                                "schema_version":"1",
                                "status":"released",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "scientific_name":"Homo sapiens",
                                "date_created":"2017-01-24T14:17:59.412529+00:00",
                                "@id":"/organisms/human/",
                                "name":"human"
                            }
                        },
                        "biosource_name":"IMR-90",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "tissue":"lung",
                        "cell_line_termid":"EFO_0001196",
                        "aliases":[
                            "dcic:IMR90"
                        ],
                        "accession":"4DNSRHTPADGK",
                        "schema_version":"1",
                        "status":"released",
                        "description":"IMR-90 (CCL-186)",
                        "biosource_type":"immortalized cell line",
                        "url":"https://www.atcc.org/Products/All/CCL-186.aspx",
                        "date_created":"2017-01-24T14:31:55.686109+00:00",
                        "@id":"/biosources/4DNSRHTPADGK/"
                    }
                ],
                "schema_version":"1",
                "status":"released",
                "modifications_summary_short":"None",
                "modifications_summary":"None",
                "biosource_summary":"IMR-90",
                "date_created":"2017-01-24T14:32:08.445192+00:00",
                "@id":"/biosamples/4DNBSVPGP9W4/",
                "treatments_summary":"None"
            },
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "experiment_type":"in situ Hi-C",
            "lab":{
                "phone2":"000-000-0000",
                "uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                "postal_code":"02115",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "institute_label":"HMS",
                "fax":"000-000-0000",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "state":"MA",
                "title":"4DN DCIC Lab, HMS",
                "city":"Boston",
                "schema_version":"1",
                "name":"4dn-dcic-lab",
                "institute_name":"Harvard Medical School",
                "date_created":"2017-01-24T14:17:59.145844+00:00",
                "phone1":"000-000-0000",
                "@id":"/labs/4dn-dcic-lab/",
                "country":"USA",
                "status":"current"
            },
            "ligation_volume":1.2,
            "schema_version":"1",
            "digestion_time":120.0,
            "ligation_time":240.0,
            "date_created":"2017-01-24T14:35:21.467677+00:00",
            "experiment_summary":"in situ Hi-C on IMR-90 with MboI",
            "uuid":"2bfdcd18-bf14-4296-8fd6-514b94a830b3",
            "crosslinking_temperature":25.0,
            "protocol":{
                "uuid":"681d8b5b-7877-4c4a-aab4-796e65658b2d",
                "aliases":[
                    "dcic:Pro_insituhic"
                ],
                "schema_version":"1",
                "status":"released",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "date_created":"2017-01-24T14:31:50.559597+00:00",
                "@id":"/protocols/681d8b5b-7877-4c4a-aab4-796e65658b2d/"
            },
            "award":{
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "@type":[
                    "Award",
                    "Item"
                ],
                "project":"4DN",
                "name":"1U01CA200059-01",
                "end_date":"2020-08-31",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "start_date":"2015-09-07",
                "status":"current",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "schema_version":"1",
                "@id":"/awards/1U01CA200059-01/",
                "date_created":"2017-01-24T14:17:59.010394+00:00"
            },
            "digestion_enzyme":{
                "uuid":"37750c1c-fce5-4ec5-baa7-ce7858f898ae",
                "catalog_number":"R0147",
                "url":"https://www.neb.com/products/r0147-mboi",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "@id":"/enzymes/MboI/",
                "name":"MboI",
                "recognition_sequence":"GATC",
                "schema_version":"1",
                "status":"in review by lab",
                "site_length":4,
                "cut_position":0,
                "date_created":"2017-01-24T14:18:05.746379+00:00"
            },
            "@id":"/experiments-hi-c/4DNEXTBYNI67/",
            "crosslinking_time":10.0,
            "ligation_temperature":25.0,
            "tagging_method":"bio-dATP",
            "aliases":[
                "erezlab:hic051"
            ],
            "crosslinking_method":"1% Formaldehyde",
            "digestion_temperature":37.0,
            "fragment_size_selection_method":"SPRI beads",
            "accession":"4DNEXTBYNI67",
            "files":[
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"177a19b9-5801-4523-a1bf-c0f174a72864",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC051_SRR1658673_1"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIW6GQC2H/",
                    "paired_end":"1",
                    "dbxrefs":[
                        "SRA:SRR1658673"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"53eea9be-7b36-42d5-baba-8b138b73ba8d"
                            }
                        }
                    ],
                    "title":"4DNFIW6GQC2H",
                    "accession":"4DNFIW6GQC2H",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:09.546257+00:00"
                },
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"53eea9be-7b36-42d5-baba-8b138b73ba8d",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC051_SRR1658673_2"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIYJESQV8/",
                    "paired_end":"2",
                    "dbxrefs":[
                        "SRA:SRR1658673"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"177a19b9-5801-4523-a1bf-c0f174a72864"
                            }
                        }
                    ],
                    "title":"4DNFIYJESQV8",
                    "accession":"4DNFIYJESQV8",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:09.833727+00:00"
                }
            ],
            "fragmentation_method":"sonication",
            "status":"released"
        },
        {
            "sop_mapping":{
                "has_sop":"Yes"
            },
            "dbxrefs":[
                "SRA:SRX764987",
                "GEO:GSM1551601"
            ],
            "biosample":{
                "uuid":"81e8f6d5-1021-4e9c-994a-23873e387d5e",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "accession":"4DNBSVPGP9W4",
                "aliases":[
                    "dcic:IMR90human_p1"
                ],
                "biosource":[
                    {
                        "uuid":"7d188d79-edac-4230-8d56-df71db107d81",
                        "cell_line":"IMR-90",
                        "individual":{
                            "organism":{
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "taxon_id":"9606",
                                "schema_version":"1",
                                "status":"released",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "scientific_name":"Homo sapiens",
                                "date_created":"2017-01-24T14:17:59.412529+00:00",
                                "@id":"/organisms/human/",
                                "name":"human"
                            }
                        },
                        "biosource_name":"IMR-90",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "tissue":"lung",
                        "cell_line_termid":"EFO_0001196",
                        "aliases":[
                            "dcic:IMR90"
                        ],
                        "accession":"4DNSRHTPADGK",
                        "schema_version":"1",
                        "status":"released",
                        "description":"IMR-90 (CCL-186)",
                        "biosource_type":"immortalized cell line",
                        "url":"https://www.atcc.org/Products/All/CCL-186.aspx",
                        "date_created":"2017-01-24T14:31:55.686109+00:00",
                        "@id":"/biosources/4DNSRHTPADGK/"
                    }
                ],
                "schema_version":"1",
                "status":"released",
                "modifications_summary_short":"None",
                "modifications_summary":"None",
                "biosource_summary":"IMR-90",
                "date_created":"2017-01-24T14:32:08.445192+00:00",
                "@id":"/biosamples/4DNBSVPGP9W4/",
                "treatments_summary":"None"
            },
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "experiment_type":"in situ Hi-C",
            "lab":{
                "phone2":"000-000-0000",
                "uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                "postal_code":"02115",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "institute_label":"HMS",
                "fax":"000-000-0000",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "state":"MA",
                "title":"4DN DCIC Lab, HMS",
                "city":"Boston",
                "schema_version":"1",
                "name":"4dn-dcic-lab",
                "institute_name":"Harvard Medical School",
                "date_created":"2017-01-24T14:17:59.145844+00:00",
                "phone1":"000-000-0000",
                "@id":"/labs/4dn-dcic-lab/",
                "country":"USA",
                "status":"current"
            },
            "ligation_volume":1.2,
            "schema_version":"1",
            "digestion_time":120.0,
            "ligation_time":240.0,
            "date_created":"2017-01-24T14:35:22.057487+00:00",
            "experiment_summary":"in situ Hi-C on IMR-90 with MboI",
            "uuid":"10f06fc3-c0b4-4d1a-a539-a739c8f819a9",
            "crosslinking_temperature":25.0,
            "protocol":{
                "uuid":"681d8b5b-7877-4c4a-aab4-796e65658b2d",
                "aliases":[
                    "dcic:Pro_insituhic"
                ],
                "schema_version":"1",
                "status":"released",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "date_created":"2017-01-24T14:31:50.559597+00:00",
                "@id":"/protocols/681d8b5b-7877-4c4a-aab4-796e65658b2d/"
            },
            "award":{
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "@type":[
                    "Award",
                    "Item"
                ],
                "project":"4DN",
                "name":"1U01CA200059-01",
                "end_date":"2020-08-31",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "start_date":"2015-09-07",
                "status":"current",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "schema_version":"1",
                "@id":"/awards/1U01CA200059-01/",
                "date_created":"2017-01-24T14:17:59.010394+00:00"
            },
            "digestion_enzyme":{
                "uuid":"37750c1c-fce5-4ec5-baa7-ce7858f898ae",
                "catalog_number":"R0147",
                "url":"https://www.neb.com/products/r0147-mboi",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "@id":"/enzymes/MboI/",
                "name":"MboI",
                "recognition_sequence":"GATC",
                "schema_version":"1",
                "status":"in review by lab",
                "site_length":4,
                "cut_position":0,
                "date_created":"2017-01-24T14:18:05.746379+00:00"
            },
            "@id":"/experiments-hi-c/4DNEX9L8XZ38/",
            "crosslinking_time":10.0,
            "ligation_temperature":25.0,
            "tagging_method":"bio-dATP",
            "aliases":[
                "erezlab:hic052"
            ],
            "crosslinking_method":"1% Formaldehyde",
            "digestion_temperature":37.0,
            "fragment_size_selection_method":"SPRI beads",
            "accession":"4DNEX9L8XZ38",
            "files":[
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"30b99b06-3134-41e4-b326-bf922e2d178a",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC052_SRR1658674_1"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIX7DX8L7/",
                    "paired_end":"1",
                    "dbxrefs":[
                        "SRA:SRR1658674"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"c315f5ae-62d4-4413-8606-9cd5556c2341"
                            }
                        }
                    ],
                    "title":"4DNFIX7DX8L7",
                    "accession":"4DNFIX7DX8L7",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:09.972904+00:00"
                },
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"c315f5ae-62d4-4413-8606-9cd5556c2341",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC052_SRR1658674_2"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIAIZUF8R/",
                    "paired_end":"2",
                    "dbxrefs":[
                        "SRA:SRR1658674"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"30b99b06-3134-41e4-b326-bf922e2d178a"
                            }
                        }
                    ],
                    "title":"4DNFIAIZUF8R",
                    "accession":"4DNFIAIZUF8R",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:10.301742+00:00"
                }
            ],
            "fragmentation_method":"sonication",
            "status":"released"
        },
        {
            "sop_mapping":{
                "has_sop":"Yes"
            },
            "dbxrefs":[
                "SRA:SRX764988",
                "GEO:GSM1551602"
            ],
            "biosample":{
                "uuid":"81e8f6d5-1021-4e9c-994a-23873e387d5e",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "accession":"4DNBSVPGP9W4",
                "aliases":[
                    "dcic:IMR90human_p1"
                ],
                "biosource":[
                    {
                        "uuid":"7d188d79-edac-4230-8d56-df71db107d81",
                        "cell_line":"IMR-90",
                        "individual":{
                            "organism":{
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "taxon_id":"9606",
                                "schema_version":"1",
                                "status":"released",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "scientific_name":"Homo sapiens",
                                "date_created":"2017-01-24T14:17:59.412529+00:00",
                                "@id":"/organisms/human/",
                                "name":"human"
                            }
                        },
                        "biosource_name":"IMR-90",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "tissue":"lung",
                        "cell_line_termid":"EFO_0001196",
                        "aliases":[
                            "dcic:IMR90"
                        ],
                        "accession":"4DNSRHTPADGK",
                        "schema_version":"1",
                        "status":"released",
                        "description":"IMR-90 (CCL-186)",
                        "biosource_type":"immortalized cell line",
                        "url":"https://www.atcc.org/Products/All/CCL-186.aspx",
                        "date_created":"2017-01-24T14:31:55.686109+00:00",
                        "@id":"/biosources/4DNSRHTPADGK/"
                    }
                ],
                "schema_version":"1",
                "status":"released",
                "modifications_summary_short":"None",
                "modifications_summary":"None",
                "biosource_summary":"IMR-90",
                "date_created":"2017-01-24T14:32:08.445192+00:00",
                "@id":"/biosamples/4DNBSVPGP9W4/",
                "treatments_summary":"None"
            },
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "experiment_type":"in situ Hi-C",
            "lab":{
                "phone2":"000-000-0000",
                "uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                "postal_code":"02115",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "institute_label":"HMS",
                "fax":"000-000-0000",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "state":"MA",
                "title":"4DN DCIC Lab, HMS",
                "city":"Boston",
                "schema_version":"1",
                "name":"4dn-dcic-lab",
                "institute_name":"Harvard Medical School",
                "date_created":"2017-01-24T14:17:59.145844+00:00",
                "phone1":"000-000-0000",
                "@id":"/labs/4dn-dcic-lab/",
                "country":"USA",
                "status":"current"
            },
            "ligation_volume":1.2,
            "schema_version":"1",
            "digestion_time":120.0,
            "ligation_time":240.0,
            "date_created":"2017-01-24T14:35:22.591707+00:00",
            "experiment_summary":"in situ Hi-C on IMR-90 with MboI",
            "uuid":"8f182fa4-c240-4bee-a257-75893aba7aac",
            "crosslinking_temperature":25.0,
            "protocol":{
                "uuid":"681d8b5b-7877-4c4a-aab4-796e65658b2d",
                "aliases":[
                    "dcic:Pro_insituhic"
                ],
                "schema_version":"1",
                "status":"released",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "date_created":"2017-01-24T14:31:50.559597+00:00",
                "@id":"/protocols/681d8b5b-7877-4c4a-aab4-796e65658b2d/"
            },
            "award":{
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "@type":[
                    "Award",
                    "Item"
                ],
                "project":"4DN",
                "name":"1U01CA200059-01",
                "end_date":"2020-08-31",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "start_date":"2015-09-07",
                "status":"current",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "schema_version":"1",
                "@id":"/awards/1U01CA200059-01/",
                "date_created":"2017-01-24T14:17:59.010394+00:00"
            },
            "digestion_enzyme":{
                "uuid":"37750c1c-fce5-4ec5-baa7-ce7858f898ae",
                "catalog_number":"R0147",
                "url":"https://www.neb.com/products/r0147-mboi",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "@id":"/enzymes/MboI/",
                "name":"MboI",
                "recognition_sequence":"GATC",
                "schema_version":"1",
                "status":"in review by lab",
                "site_length":4,
                "cut_position":0,
                "date_created":"2017-01-24T14:18:05.746379+00:00"
            },
            "@id":"/experiments-hi-c/4DNEXU2MKTIQ/",
            "crosslinking_time":10.0,
            "ligation_temperature":25.0,
            "tagging_method":"bio-dATP",
            "aliases":[
                "erezlab:hic053"
            ],
            "crosslinking_method":"1% Formaldehyde",
            "digestion_temperature":37.0,
            "fragment_size_selection_method":"SPRI beads",
            "accession":"4DNEXU2MKTIQ",
            "files":[
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"f08bbdca-247b-4c75-b3bf-a9ba2ac8c1e1",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC053_SRR1658675_1"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFI3CR1FRH/",
                    "paired_end":"1",
                    "dbxrefs":[
                        "SRA:SRR1658675"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"202fc668-bb49-4b1c-8d96-f9e0ab6677bc"
                            }
                        }
                    ],
                    "title":"4DNFI3CR1FRH",
                    "accession":"4DNFI3CR1FRH",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:10.561135+00:00"
                },
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"202fc668-bb49-4b1c-8d96-f9e0ab6677bc",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC053_SRR1658675_2"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIT2RPDDV/",
                    "paired_end":"2",
                    "dbxrefs":[
                        "SRA:SRR1658675"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"f08bbdca-247b-4c75-b3bf-a9ba2ac8c1e1"
                            }
                        }
                    ],
                    "title":"4DNFIT2RPDDV",
                    "accession":"4DNFIT2RPDDV",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:10.716428+00:00"
                }
            ],
            "fragmentation_method":"sonication",
            "status":"released"
        },
        {
            "sop_mapping":{
                "has_sop":"Yes"
            },
            "dbxrefs":[
                "SRA:SRX764989",
                "GEO:GSM1551603"
            ],
            "biosample":{
                "uuid":"81e8f6d5-1021-4e9c-994a-23873e387d5e",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "accession":"4DNBSVPGP9W4",
                "aliases":[
                    "dcic:IMR90human_p1"
                ],
                "biosource":[
                    {
                        "uuid":"7d188d79-edac-4230-8d56-df71db107d81",
                        "cell_line":"IMR-90",
                        "individual":{
                            "organism":{
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "taxon_id":"9606",
                                "schema_version":"1",
                                "status":"released",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "scientific_name":"Homo sapiens",
                                "date_created":"2017-01-24T14:17:59.412529+00:00",
                                "@id":"/organisms/human/",
                                "name":"human"
                            }
                        },
                        "biosource_name":"IMR-90",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "tissue":"lung",
                        "cell_line_termid":"EFO_0001196",
                        "aliases":[
                            "dcic:IMR90"
                        ],
                        "accession":"4DNSRHTPADGK",
                        "schema_version":"1",
                        "status":"released",
                        "description":"IMR-90 (CCL-186)",
                        "biosource_type":"immortalized cell line",
                        "url":"https://www.atcc.org/Products/All/CCL-186.aspx",
                        "date_created":"2017-01-24T14:31:55.686109+00:00",
                        "@id":"/biosources/4DNSRHTPADGK/"
                    }
                ],
                "schema_version":"1",
                "status":"released",
                "modifications_summary_short":"None",
                "modifications_summary":"None",
                "biosource_summary":"IMR-90",
                "date_created":"2017-01-24T14:32:08.445192+00:00",
                "@id":"/biosamples/4DNBSVPGP9W4/",
                "treatments_summary":"None"
            },
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "experiment_type":"in situ Hi-C",
            "lab":{
                "phone2":"000-000-0000",
                "uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                "postal_code":"02115",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "institute_label":"HMS",
                "fax":"000-000-0000",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "state":"MA",
                "title":"4DN DCIC Lab, HMS",
                "city":"Boston",
                "schema_version":"1",
                "name":"4dn-dcic-lab",
                "institute_name":"Harvard Medical School",
                "date_created":"2017-01-24T14:17:59.145844+00:00",
                "phone1":"000-000-0000",
                "@id":"/labs/4dn-dcic-lab/",
                "country":"USA",
                "status":"current"
            },
            "ligation_volume":1.2,
            "schema_version":"1",
            "digestion_time":120.0,
            "ligation_time":240.0,
            "date_created":"2017-01-24T14:35:23.216919+00:00",
            "experiment_summary":"in situ Hi-C on IMR-90 with MboI",
            "uuid":"f99b1911-48ba-4c1e-b627-581cb80bc751",
            "crosslinking_temperature":25.0,
            "protocol":{
                "uuid":"681d8b5b-7877-4c4a-aab4-796e65658b2d",
                "aliases":[
                    "dcic:Pro_insituhic"
                ],
                "schema_version":"1",
                "status":"released",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "date_created":"2017-01-24T14:31:50.559597+00:00",
                "@id":"/protocols/681d8b5b-7877-4c4a-aab4-796e65658b2d/"
            },
            "award":{
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "@type":[
                    "Award",
                    "Item"
                ],
                "project":"4DN",
                "name":"1U01CA200059-01",
                "end_date":"2020-08-31",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "start_date":"2015-09-07",
                "status":"current",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "schema_version":"1",
                "@id":"/awards/1U01CA200059-01/",
                "date_created":"2017-01-24T14:17:59.010394+00:00"
            },
            "digestion_enzyme":{
                "uuid":"37750c1c-fce5-4ec5-baa7-ce7858f898ae",
                "catalog_number":"R0147",
                "url":"https://www.neb.com/products/r0147-mboi",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "@id":"/enzymes/MboI/",
                "name":"MboI",
                "recognition_sequence":"GATC",
                "schema_version":"1",
                "status":"in review by lab",
                "site_length":4,
                "cut_position":0,
                "date_created":"2017-01-24T14:18:05.746379+00:00"
            },
            "@id":"/experiments-hi-c/4DNEXMH4CPDZ/",
            "crosslinking_time":10.0,
            "ligation_temperature":25.0,
            "tagging_method":"bio-dATP",
            "aliases":[
                "erezlab:hic054"
            ],
            "crosslinking_method":"1% Formaldehyde",
            "digestion_temperature":37.0,
            "fragment_size_selection_method":"SPRI beads",
            "accession":"4DNEXMH4CPDZ",
            "files":[
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"210a7047-37cc-406d-8246-62fbe3400fc3",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC054_SRR1658676_1"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIWB6WXPG/",
                    "paired_end":"1",
                    "dbxrefs":[
                        "SRA:SRR1658676"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"bb4fc880-3af2-43b9-ad79-766d2b176592"
                            }
                        }
                    ],
                    "title":"4DNFIWB6WXPG",
                    "accession":"4DNFIWB6WXPG",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:10.930872+00:00"
                },
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"bb4fc880-3af2-43b9-ad79-766d2b176592",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC054_SRR1658676_2"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFICQYVEU8/",
                    "paired_end":"2",
                    "dbxrefs":[
                        "SRA:SRR1658676"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"210a7047-37cc-406d-8246-62fbe3400fc3"
                            }
                        }
                    ],
                    "title":"4DNFICQYVEU8",
                    "accession":"4DNFICQYVEU8",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:11.122357+00:00"
                }
            ],
            "fragmentation_method":"sonication",
            "status":"released"
        },
        {
            "sop_mapping":{
                "has_sop":"Yes"
            },
            "dbxrefs":[
                "SRA:SRX764990",
                "GEO:GSM1551604"
            ],
            "biosample":{
                "uuid":"1b775c01-1c01-4149-8868-1e0e8e63d69d",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "accession":"4DNBSR9ZPSI5",
                "aliases":[
                    "dcic:IMR90human_p2"
                ],
                "biosource":[
                    {
                        "uuid":"7d188d79-edac-4230-8d56-df71db107d81",
                        "cell_line":"IMR-90",
                        "individual":{
                            "organism":{
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "taxon_id":"9606",
                                "schema_version":"1",
                                "status":"released",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "scientific_name":"Homo sapiens",
                                "date_created":"2017-01-24T14:17:59.412529+00:00",
                                "@id":"/organisms/human/",
                                "name":"human"
                            }
                        },
                        "biosource_name":"IMR-90",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "tissue":"lung",
                        "cell_line_termid":"EFO_0001196",
                        "aliases":[
                            "dcic:IMR90"
                        ],
                        "accession":"4DNSRHTPADGK",
                        "schema_version":"1",
                        "status":"released",
                        "description":"IMR-90 (CCL-186)",
                        "biosource_type":"immortalized cell line",
                        "url":"https://www.atcc.org/Products/All/CCL-186.aspx",
                        "date_created":"2017-01-24T14:31:55.686109+00:00",
                        "@id":"/biosources/4DNSRHTPADGK/"
                    }
                ],
                "schema_version":"1",
                "status":"released",
                "modifications_summary_short":"None",
                "modifications_summary":"None",
                "biosource_summary":"IMR-90",
                "date_created":"2017-01-24T14:32:08.846002+00:00",
                "@id":"/biosamples/4DNBSR9ZPSI5/",
                "treatments_summary":"None"
            },
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "experiment_type":"in situ Hi-C",
            "lab":{
                "phone2":"000-000-0000",
                "uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                "postal_code":"02115",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "institute_label":"HMS",
                "fax":"000-000-0000",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "state":"MA",
                "title":"4DN DCIC Lab, HMS",
                "city":"Boston",
                "schema_version":"1",
                "name":"4dn-dcic-lab",
                "institute_name":"Harvard Medical School",
                "date_created":"2017-01-24T14:17:59.145844+00:00",
                "phone1":"000-000-0000",
                "@id":"/labs/4dn-dcic-lab/",
                "country":"USA",
                "status":"current"
            },
            "ligation_volume":1.2,
            "schema_version":"1",
            "digestion_time":120.0,
            "ligation_time":240.0,
            "date_created":"2017-01-24T14:35:23.982173+00:00",
            "experiment_summary":"in situ Hi-C on IMR-90 with MboI",
            "uuid":"8692e5a0-dbad-4534-b978-03ad7ae15a95",
            "crosslinking_temperature":25.0,
            "protocol":{
                "uuid":"681d8b5b-7877-4c4a-aab4-796e65658b2d",
                "aliases":[
                    "dcic:Pro_insituhic"
                ],
                "schema_version":"1",
                "status":"released",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "date_created":"2017-01-24T14:31:50.559597+00:00",
                "@id":"/protocols/681d8b5b-7877-4c4a-aab4-796e65658b2d/"
            },
            "award":{
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "@type":[
                    "Award",
                    "Item"
                ],
                "project":"4DN",
                "name":"1U01CA200059-01",
                "end_date":"2020-08-31",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "start_date":"2015-09-07",
                "status":"current",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "schema_version":"1",
                "@id":"/awards/1U01CA200059-01/",
                "date_created":"2017-01-24T14:17:59.010394+00:00"
            },
            "digestion_enzyme":{
                "uuid":"37750c1c-fce5-4ec5-baa7-ce7858f898ae",
                "catalog_number":"R0147",
                "url":"https://www.neb.com/products/r0147-mboi",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "@id":"/enzymes/MboI/",
                "name":"MboI",
                "recognition_sequence":"GATC",
                "schema_version":"1",
                "status":"in review by lab",
                "site_length":4,
                "cut_position":0,
                "date_created":"2017-01-24T14:18:05.746379+00:00"
            },
            "@id":"/experiments-hi-c/4DNEXYZ7NL1X/",
            "crosslinking_time":10.0,
            "ligation_temperature":25.0,
            "tagging_method":"bio-dATP",
            "aliases":[
                "erezlab:hic055"
            ],
            "crosslinking_method":"1% Formaldehyde",
            "digestion_temperature":37.0,
            "fragment_size_selection_method":"SPRI beads",
            "accession":"4DNEXYZ7NL1X",
            "files":[
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"28ec2ef7-6d30-4a4d-8424-caa09c529898",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC055_SRR1658677_1"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIHI4TVBE/",
                    "paired_end":"1",
                    "dbxrefs":[
                        "SRA:SRR1658677"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"182247e1-aa03-4614-ab15-21d215891295"
                            }
                        }
                    ],
                    "title":"4DNFIHI4TVBE",
                    "accession":"4DNFIHI4TVBE",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:11.414843+00:00"
                },
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"182247e1-aa03-4614-ab15-21d215891295",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC055_SRR1658677_2"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIBPIIH4C/",
                    "paired_end":"2",
                    "dbxrefs":[
                        "SRA:SRR1658677"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"28ec2ef7-6d30-4a4d-8424-caa09c529898"
                            }
                        }
                    ],
                    "title":"4DNFIBPIIH4C",
                    "accession":"4DNFIBPIIH4C",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:11.711611+00:00"
                }
            ],
            "fragmentation_method":"sonication",
            "status":"released"
        },
        {
            "sop_mapping":{
                "has_sop":"Yes"
            },
            "dbxrefs":[
                "SRA:SRX764991",
                "GEO:GSM1551605"
            ],
            "biosample":{
                "uuid":"1b775c01-1c01-4149-8868-1e0e8e63d69d",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "accession":"4DNBSR9ZPSI5",
                "aliases":[
                    "dcic:IMR90human_p2"
                ],
                "biosource":[
                    {
                        "uuid":"7d188d79-edac-4230-8d56-df71db107d81",
                        "cell_line":"IMR-90",
                        "individual":{
                            "organism":{
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "taxon_id":"9606",
                                "schema_version":"1",
                                "status":"released",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "scientific_name":"Homo sapiens",
                                "date_created":"2017-01-24T14:17:59.412529+00:00",
                                "@id":"/organisms/human/",
                                "name":"human"
                            }
                        },
                        "biosource_name":"IMR-90",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "tissue":"lung",
                        "cell_line_termid":"EFO_0001196",
                        "aliases":[
                            "dcic:IMR90"
                        ],
                        "accession":"4DNSRHTPADGK",
                        "schema_version":"1",
                        "status":"released",
                        "description":"IMR-90 (CCL-186)",
                        "biosource_type":"immortalized cell line",
                        "url":"https://www.atcc.org/Products/All/CCL-186.aspx",
                        "date_created":"2017-01-24T14:31:55.686109+00:00",
                        "@id":"/biosources/4DNSRHTPADGK/"
                    }
                ],
                "schema_version":"1",
                "status":"released",
                "modifications_summary_short":"None",
                "modifications_summary":"None",
                "biosource_summary":"IMR-90",
                "date_created":"2017-01-24T14:32:08.846002+00:00",
                "@id":"/biosamples/4DNBSR9ZPSI5/",
                "treatments_summary":"None"
            },
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "experiment_type":"in situ Hi-C",
            "lab":{
                "phone2":"000-000-0000",
                "uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989",
                "postal_code":"02115",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "institute_label":"HMS",
                "fax":"000-000-0000",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "state":"MA",
                "title":"4DN DCIC Lab, HMS",
                "city":"Boston",
                "schema_version":"1",
                "name":"4dn-dcic-lab",
                "institute_name":"Harvard Medical School",
                "date_created":"2017-01-24T14:17:59.145844+00:00",
                "phone1":"000-000-0000",
                "@id":"/labs/4dn-dcic-lab/",
                "country":"USA",
                "status":"current"
            },
            "ligation_volume":1.2,
            "schema_version":"1",
            "digestion_time":120.0,
            "ligation_time":240.0,
            "date_created":"2017-01-24T14:35:24.601380+00:00",
            "experiment_summary":"in situ Hi-C on IMR-90 with MboI",
            "uuid":"a4b7dcd1-9100-41c8-b0cb-08aff0a51175",
            "crosslinking_temperature":25.0,
            "protocol":{
                "uuid":"681d8b5b-7877-4c4a-aab4-796e65658b2d",
                "aliases":[
                    "dcic:Pro_insituhic"
                ],
                "schema_version":"1",
                "status":"released",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "date_created":"2017-01-24T14:31:50.559597+00:00",
                "@id":"/protocols/681d8b5b-7877-4c4a-aab4-796e65658b2d/"
            },
            "award":{
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "@type":[
                    "Award",
                    "Item"
                ],
                "project":"4DN",
                "name":"1U01CA200059-01",
                "end_date":"2020-08-31",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "start_date":"2015-09-07",
                "status":"current",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "schema_version":"1",
                "@id":"/awards/1U01CA200059-01/",
                "date_created":"2017-01-24T14:17:59.010394+00:00"
            },
            "digestion_enzyme":{
                "uuid":"37750c1c-fce5-4ec5-baa7-ce7858f898ae",
                "catalog_number":"R0147",
                "url":"https://www.neb.com/products/r0147-mboi",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "@id":"/enzymes/MboI/",
                "name":"MboI",
                "recognition_sequence":"GATC",
                "schema_version":"1",
                "status":"in review by lab",
                "site_length":4,
                "cut_position":0,
                "date_created":"2017-01-24T14:18:05.746379+00:00"
            },
            "@id":"/experiments-hi-c/4DNEXWLYHUZX/",
            "crosslinking_time":10.0,
            "ligation_temperature":25.0,
            "tagging_method":"bio-dATP",
            "aliases":[
                "erezlab:hic056"
            ],
            "crosslinking_method":"1% Formaldehyde",
            "digestion_temperature":37.0,
            "fragment_size_selection_method":"SPRI beads",
            "accession":"4DNEXWLYHUZX",
            "files":[
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"43a6d196-396d-466c-aab7-f54e05b9bb5a",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC056_SRR1658678_1"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIA6D63FT/",
                    "paired_end":"1",
                    "dbxrefs":[
                        "SRA:SRR1658678"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"a0fd6b54-152d-445e-ad88-3cbf40a1c6ef"
                            }
                        }
                    ],
                    "title":"4DNFIA6D63FT",
                    "accession":"4DNFIA6D63FT",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:11.922059+00:00"
                },
                {
                    "instrument":"Illumina HiSeq 2500",
                    "uuid":"a0fd6b54-152d-445e-ad88-3cbf40a1c6ef",
                    "file_type":"fastq",
                    "aliases":[
                        "dcic:HIC056_SRR1658678_2"
                    ],
                    "file_classification":"raw file",
                    "@id":"/files-fastq/4DNFIDFWAQTK/",
                    "paired_end":"2",
                    "dbxrefs":[
                        "SRA:SRR1658678"
                    ],
                    "related_files":[
                        {
                            "relationship_type":"paired with",
                            "file":{
                                "uuid":"43a6d196-396d-466c-aab7-f54e05b9bb5a"
                            }
                        }
                    ],
                    "title":"4DNFIDFWAQTK",
                    "accession":"4DNFIDFWAQTK",
                    "schema_version":"1",
                    "status":"uploading",
                    "@type":[
                        "FileFastq",
                        "File",
                        "Item"
                    ],
                    "file_format":"fastq",
                    "date_created":"2017-01-24T14:33:12.087886+00:00"
                }
            ],
            "fragmentation_method":"sonication",
            "status":"released"
        }
    ],
    "experimentset_type":"replicate",
    "description":"in situ Hi-C on IMR90 with MboI and bio-dATP",
    "@id":"/experiment-set-replicates/4DNESH4MYRID/",
    "audit":{
        "INTERNAL_ACTION":[
            {
                "path":"/experiments-hi-c/4DNEXU2MKTIQ/",
                "detail":"released /experiments-hi-c/4DNEXU2MKTIQ/ has in review by lab subobject /sop-maps/ExperimentHiC_insituHi-C_1/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXU2MKTIQ/",
                "detail":"released /experiments-hi-c/4DNEXU2MKTIQ/ has in review by lab subobject /enzymes/MboI/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXU2MKTIQ/",
                "detail":"released /experiments-hi-c/4DNEXU2MKTIQ/ has uploading subobject /files-fastq/4DNFIT2RPDDV/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXU2MKTIQ/",
                "detail":"released /experiments-hi-c/4DNEXU2MKTIQ/ has uploading subobject /files-fastq/4DNFI3CR1FRH/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXYZ7NL1X/",
                "detail":"released /experiments-hi-c/4DNEXYZ7NL1X/ has in review by lab subobject /sop-maps/ExperimentHiC_insituHi-C_1/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXYZ7NL1X/",
                "detail":"released /experiments-hi-c/4DNEXYZ7NL1X/ has in review by lab subobject /enzymes/MboI/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXYZ7NL1X/",
                "detail":"released /experiments-hi-c/4DNEXYZ7NL1X/ has uploading subobject /files-fastq/4DNFIBPIIH4C/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXYZ7NL1X/",
                "detail":"released /experiments-hi-c/4DNEXYZ7NL1X/ has uploading subobject /files-fastq/4DNFIHI4TVBE/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXMH4CPDZ/",
                "detail":"released /experiments-hi-c/4DNEXMH4CPDZ/ has in review by lab subobject /sop-maps/ExperimentHiC_insituHi-C_1/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXMH4CPDZ/",
                "detail":"released /experiments-hi-c/4DNEXMH4CPDZ/ has in review by lab subobject /enzymes/MboI/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXMH4CPDZ/",
                "detail":"released /experiments-hi-c/4DNEXMH4CPDZ/ has uploading subobject /files-fastq/4DNFICQYVEU8/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXMH4CPDZ/",
                "detail":"released /experiments-hi-c/4DNEXMH4CPDZ/ has uploading subobject /files-fastq/4DNFIWB6WXPG/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXTBYNI67/",
                "detail":"released /experiments-hi-c/4DNEXTBYNI67/ has uploading subobject /files-fastq/4DNFIYJESQV8/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXTBYNI67/",
                "detail":"released /experiments-hi-c/4DNEXTBYNI67/ has in review by lab subobject /sop-maps/ExperimentHiC_insituHi-C_1/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXTBYNI67/",
                "detail":"released /experiments-hi-c/4DNEXTBYNI67/ has in review by lab subobject /enzymes/MboI/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXTBYNI67/",
                "detail":"released /experiments-hi-c/4DNEXTBYNI67/ has uploading subobject /files-fastq/4DNFIW6GQC2H/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXWLYHUZX/",
                "detail":"released /experiments-hi-c/4DNEXWLYHUZX/ has uploading subobject /files-fastq/4DNFIA6D63FT/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXWLYHUZX/",
                "detail":"released /experiments-hi-c/4DNEXWLYHUZX/ has in review by lab subobject /sop-maps/ExperimentHiC_insituHi-C_1/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXWLYHUZX/",
                "detail":"released /experiments-hi-c/4DNEXWLYHUZX/ has in review by lab subobject /enzymes/MboI/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXWLYHUZX/",
                "detail":"released /experiments-hi-c/4DNEXWLYHUZX/ has uploading subobject /files-fastq/4DNFIDFWAQTK/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEX9L8XZ38/",
                "detail":"released /experiments-hi-c/4DNEX9L8XZ38/ has uploading subobject /files-fastq/4DNFIX7DX8L7/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEX9L8XZ38/",
                "detail":"released /experiments-hi-c/4DNEX9L8XZ38/ has uploading subobject /files-fastq/4DNFIAIZUF8R/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEX9L8XZ38/",
                "detail":"released /experiments-hi-c/4DNEX9L8XZ38/ has in review by lab subobject /sop-maps/ExperimentHiC_insituHi-C_1/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEX9L8XZ38/",
                "detail":"released /experiments-hi-c/4DNEX9L8XZ38/ has in review by lab subobject /enzymes/MboI/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXL6MFLSD/",
                "detail":"released /experiments-hi-c/4DNEXL6MFLSD/ has uploading subobject /files-fastq/4DNFI397I6JO/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXL6MFLSD/",
                "detail":"released /experiments-hi-c/4DNEXL6MFLSD/ has in review by lab subobject /sop-maps/ExperimentHiC_insituHi-C_1/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXL6MFLSD/",
                "detail":"released /experiments-hi-c/4DNEXL6MFLSD/ has in review by lab subobject /enzymes/MboI/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            },
            {
                "path":"/experiments-hi-c/4DNEXL6MFLSD/",
                "detail":"released /experiments-hi-c/4DNEXL6MFLSD/ has uploading subobject /files-fastq/4DNFI4HKT2OG/",
                "category":"mismatched status",
                "level":30,
                "level_name":"INTERNAL_ACTION",
                "name":"audit_item_status"
            }
        ]
    },
    "schema_version":"1",
    "accession":"4DNESH4MYRID",
    "@context":"/terms/",
    "status":"released"
};