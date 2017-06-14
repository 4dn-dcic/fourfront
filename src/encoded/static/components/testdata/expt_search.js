module.exports = {
    "@context":"/terms/",
    "@id":"/search/?type=ExperimentHiC",
    "@type":[
        "Search"
    ],
    "title":"Search",
    "filters":[
        {
            "field":"type",
            "term":"ExperimentHiC",
            "remove":"/search/?"
        }
    ],
    "facets":[
        {
            "field":"type",
            "title":"Data Type",
            "total":5,
            "terms":[
                {
                    "key":"Experiment",
                    "doc_count":5
                },
                {
                    "key":"ExperimentHiC",
                    "doc_count":5
                },
                {
                    "key":"Item",
                    "doc_count":5
                }
            ]
        },
        {
            "field":"award.project",
            "title":"Project",
            "total":5,
            "terms":[
                {
                    "key":"4DN",
                    "doc_count":5
                }
            ]
        },
        {
            "field":"biosample.biosource.individual.organism.name",
            "title":"Organism",
            "total":5,
            "terms":[
                {
                    "key":"human",
                    "doc_count":5
                }
            ]
        },
        {
            "field":"biosample.biosource.biosource_type",
            "title":"Biosource type",
            "total":5,
            "terms":[
                {
                    "key":"immortalized cell line",
                    "doc_count":5
                }
            ]
        },
        {
            "field":"biosample.biosource_summary",
            "title":"Biosource",
            "total":5,
            "terms":[
                {
                    "key":"GM12878",
                    "doc_count":5
                }
            ]
        },
        {
            "field":"digestion_enzyme.name",
            "title":"Enzyme",
            "total":5,
            "terms":[
                {
                    "key":"DNaseI",
                    "doc_count":3
                },
                {
                    "key":"HindIII",
                    "doc_count":2
                }
            ]
        },
        {
            "field":"biosample.modifications_summary",
            "title":"Modifications",
            "total":5,
            "terms":[
                {
                    "key":"Stable Transfection for PARK2 and FMR1 and Other",
                    "doc_count":3
                },
                {
                    "key":"Stable Transfection for PARK2 and FMR1",
                    "doc_count":2
                }
            ]
        },
        {
            "field":"biosample.treatments_summary",
            "title":"Treatments",
            "total":5,
            "terms":[
                {
                    "key":"siRNA for PARK2 and FMR1 and shRNA for PARK2 and FMR1",
                    "doc_count":3
                },
                {
                    "key":"EPO",
                    "doc_count":2
                }
            ]
        },
        {
            "field":"lab.title",
            "title":"Lab",
            "total":5,
            "terms":[
                {
                    "key":"4DN Testing Lab",
                    "doc_count":5
                }
            ]
        },
        {
            "field":"audit.WARNING.category",
            "title":"Audit category: WARNING",
            "total":5,
            "terms":[
                {
                    "key":"missing data",
                    "doc_count":1
                }
            ]
        }
    ],
    "@graph":[
        {
            "dbxrefs":[
                "sample ext id"
            ],
            "digestion_time":30,
            "notes":"sample dcic notes",
            "aliases":[
                "labsample:alias5"
            ],
            "crosslinking_temperature":37,
            "documents":[
                {
                    "display_title":"photo.jpg",
                    "link_id":"~documents~dcf15d5e-40aa-43bc-b81c-32c70c9afb01~"
                }
            ],
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "display_title":"dilution Hi-C on GM12878 with DNaseI",
            "description":"Test Experiment HiC 5",
            "accession":"4DNEX067APZ1",
            "digestion_temperature":37,
            "lab":{
                "country":"USA",
                "city":"Boston",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "date_created":"2017-04-14T18:01:44.472055+00:00",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "display_title":"4DN Testing Lab",
                "title":"4DN Testing Lab",
                "institute_name":"Harvard Medical School",
                "uuid":"828cd4fe-ebb0-4b22-a94a-d2e3a36cc988",
                "link_id":"~labs~test-4dn-lab~",
                "schema_version":"1",
                "institute_label":"HMS",
                "name":"test-4dn-lab",
                "state":"MA",
                "@id":"/labs/test-4dn-lab/",
                "fax":"000-000-0000",
                "postal_code":"02115",
                "status":"current"
            },
            "uuid":"75041e2f-3e43-4388-8bbb-e861f209c4fd",
            "experiment_type":"dilution Hi-C",
            "link_id":"~experiments-hi-c~4DNEX067APZ1~",
            "schema_version":"1",
            "protocol":{
                "schema_version":"1",
                "attachment":{
                    "download":"test.pdf",
                    "blob_id":"042b7708-906e-4a71-93e2-fe38c252f839",
                    "md5sum":"52ad2545e9d94aa4b906a691778f1775",
                    "href":"@@download/attachment/test.pdf",
                    "type":"application/pdf"
                },
                "date_created":"2017-04-14T18:01:54.116030+00:00",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "display_title":"Protocol from 2017-04-14",
                "description":"Stable transfection protocol",
                "@id":"/protocols/131106bc-8535-4448-903e-854af460b244/",
                "uuid":"131106bc-8535-4448-903e-854af460b244",
                "link_id":"~protocols~131106bc-8535-4448-903e-854af460b244~",
                "status":"in review by lab"
            },
            "award":{
                "end_date":"2020-08-31",
                "date_created":"2017-04-14T18:01:44.357800+00:00",
                "@type":[
                    "Award",
                    "Item"
                ],
                "display_title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "project":"4DN",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "viewing_group":"4DN",
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "link_id":"~awards~1U01CA200059-01~",
                "schema_version":"1",
                "name":"1U01CA200059-01",
                "@id":"/awards/1U01CA200059-01/",
                "status":"current",
                "start_date":"2015-09-07"
            },
            "tagging_method":"Biotinylated ATP",
            "experiment_relation":[
                {
                    "relationship_type":"controlled by"
                }
            ],
            "enzyme_lot_number":"123456",
            "average_fragment_size":100,
            "biosample":{
                "modifications_summary":"Stable Transfection for PARK2 and FMR1 and Other",
                "date_created":"2017-04-14T18:01:55.112275+00:00",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "display_title":"4DNBS1234567",
                "description":"GM12878 prepared for Hi-C",
                "accession":"4DNBS1234567",
                "treatments_summary":"siRNA for PARK2 and FMR1 and shRNA for PARK2 and FMR1",
                "uuid":"231111bc-8535-4448-903e-854af460b254",
                "treatments":[
                    {
                        "rnai_type":"siRNA",
                        "aliases":[
                            "Awesome:Treatment"
                        ],
                        "date_created":"2017-04-14T18:01:54.989044+00:00",
                        "@type":[
                            "TreatmentRnai",
                            "Treatment",
                            "Item"
                        ],
                        "display_title":"TreatmentRnai from 2017-04-14",
                        "description":"RNAi treatment for rS3",
                        "treatment_type":"siRNA for PARK2 and FMR1",
                        "uuid":"686b362f-4eb6-4a9c-8173-3ab267307e3b",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~treatments-rnai~686b362f-4eb6-4a9c-8173-3ab267307e3b~",
                        "schema_version":"1",
                        "target_sequence":"ATGCATGC",
                        "@id":"/treatments-rnai/686b362f-4eb6-4a9c-8173-3ab267307e3b/",
                        "status":"in review by lab"
                    },
                    {
                        "rnai_type":"shRNA",
                        "aliases":[
                            "Awesome:Treatment2"
                        ],
                        "date_created":"2017-04-14T18:01:55.040287+00:00",
                        "@type":[
                            "TreatmentRnai",
                            "Treatment",
                            "Item"
                        ],
                        "display_title":"TreatmentRnai from 2017-04-14",
                        "description":"RNAi treatment for rS5",
                        "treatment_type":"shRNA for PARK2 and FMR1",
                        "uuid":"686b362f-4eb6-4a9c-8173-3ab267307a8d",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~treatments-rnai~686b362f-4eb6-4a9c-8173-3ab267307a8d~",
                        "schema_version":"1",
                        "target_sequence":"ATGCATGC",
                        "@id":"/treatments-rnai/686b362f-4eb6-4a9c-8173-3ab267307a8d/",
                        "status":"in review by lab"
                    }
                ],
                "link_id":"~biosamples~4DNBS1234567~",
                "schema_version":"1",
                "biosource":[
                    {
                        "individual":{
                            "organism":{
                                "schema_version":"1",
                                "date_created":"2017-04-14T18:01:45.721721+00:00",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "display_title":"human",
                                "name":"human",
                                "taxon_id":"9606",
                                "scientific_name":"Homo sapiens",
                                "@id":"/organisms/human/",
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "link_id":"~organisms~human~",
                                "status":"released"
                            },
                            "display_title":"4DNIN000AAQ1",
                            "link_id":"~individuals-human~4DNIN000AAQ1~"
                        },
                        "date_created":"2017-04-14T18:01:54.608627+00:00",
                        "cell_line_tier":"Unclassified",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "display_title":"GM12878",
                        "cell_line_termid":"EFO_0002784",
                        "description":"other GM12878 cells",
                        "accession":"4DNSRDMSZ57H",
                        "uuid":"331111bc-8535-4448-903e-854af460b254",
                        "link_id":"~biosources~4DNSRDMSZ57H~",
                        "schema_version":"1",
                        "cell_line":"GM12878",
                        "biosource_type":"immortalized cell line",
                        "biosource_name":"GM12878",
                        "@id":"/biosources/4DNSRDMSZ57H/",
                        "status":"in review by lab"
                    }
                ],
                "modifications_summary_short":"Stable Transfection for PARK2 and FMR1",
                "@id":"/biosamples/4DNBS1234567/",
                "biosource_summary":"GM12878",
                "status":"in review by lab",
                "modifications":[
                    {
                        "modification_name":"Stable Transfection for PARK2 and FMR1",
                        "date_created":"2017-04-14T18:01:54.063557+00:00",
                        "@type":[
                            "Modification",
                            "Item"
                        ],
                        "display_title":"Stable Transfection for PARK2 and FMR1",
                        "description":"Stable Tranfection of GFP construct",
                        "uuid":"431106bc-8535-4448-903e-854af460b265",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~modifications~431106bc-8535-4448-903e-854af460b265~",
                        "modification_name_short":"Stable Transfection for PARK2 and FMR1",
                        "schema_version":"1",
                        "modification_type":"Stable Transfection",
                        "@id":"/modifications/431106bc-8535-4448-903e-854af460b265/",
                        "status":"in review by lab"
                    },
                    {
                        "modification_name":"Other",
                        "date_created":"2017-04-14T18:01:54.088589+00:00",
                        "@type":[
                            "Modification",
                            "Item"
                        ],
                        "display_title":"Other",
                        "description":"Other type of modification",
                        "uuid":"431106bc-8535-4448-903e-854af460b276",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~modifications~431106bc-8535-4448-903e-854af460b276~",
                        "modification_name_short":"Other",
                        "schema_version":"1",
                        "modification_type":"Other",
                        "@id":"/modifications/431106bc-8535-4448-903e-854af460b276/",
                        "status":"in review by lab"
                    }
                ]
            },
            "@id":"/experiments-hi-c/4DNEX067APZ1/",
            "external_references":[
                {
                    "ref":"sample ext id"
                }
            ],
            "experiment_sets":[
                {
                    "display_title":"4DNESFF4LIDB",
                    "link_id":"~experiment_set~331106bc-8535-4448-903e-854af460b285~"
                },
                {
                    "display_title":"4DNES72TDMGB",
                    "link_id":"~experiment_set_replicate~431106bc-8535-4448-903e-854af460b261~"
                },
                {
                    "display_title":"4DNES3OW8WBJ",
                    "link_id":"~experiment_set~431106bc-8535-4448-903e-854af460b285~"
                }
            ],
            "sop_mapping":{
                "has_sop":"No"
            },
            "date_created":"2017-04-14T18:02:00.553770+00:00",
            "submitted_by":{
                "subscriptions":[
                    {
                        "title":"My submissions",
                        "url":"?submitted_by.link_id=~users~986b362f-4eb6-4a9c-8173-3ab267307e3a~&sort=-date_created"
                    },
                    {
                        "title":"My lab",
                        "url":"?lab.link_id=~labs~4dn-dcic-lab~&sort=-date_created"
                    }
                ],
                "timezone":"US/Pacific",
                "date_created":"2017-04-14T18:01:59.560731+00:00",
                "@type":[
                    "User",
                    "Item"
                ],
                "display_title":"4dn DCIC",
                "groups":[
                    "admin"
                ],
                "last_name":"DCIC",
                "title":"4dn DCIC",
                "uuid":"986b362f-4eb6-4a9c-8173-3ab267307e3a",
                "link_id":"~users~986b362f-4eb6-4a9c-8173-3ab267307e3a~",
                "schema_version":"1",
                "@id":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                "job_title":"Admin",
                "first_name":"4dn",
                "viewing_groups":[
                    "4DN"
                ],
                "email":"4dndcic@gmail.com",
                "status":"current"
            },
            "digestion_enzyme":{
                "aliases":[
                    "dcic:dnaseI_tfs"
                ],
                "date_created":"2017-04-14T18:01:54.836502+00:00",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "display_title":"DNaseI",
                "description":"used for DNase HiC",
                "uuid":"e646edb2-d4d5-405b-aab1-03e4754b0705",
                "url":"https://www.thermofisher.com/order/catalog/product/EN0525",
                "link_id":"~enzymes~DNaseI~",
                "schema_version":"1",
                "catalog_number":"EN052",
                "name":"DNaseI",
                "@id":"/enzymes/DNaseI/",
                "status":"in review by lab"
            },
            "crosslinking_time":30,
            "crosslinking_method":"1% Formaldehyde",
            "experiment_summary":"dilution Hi-C on GM12878 with DNaseI",
            "ligation_time":30,
            "filesets":[
                {
                    "display_title":"4DNFS40D5WL1",
                    "link_id":"~file-sets~4DNFS40D5WL1~"
                }
            ],
            "fragmentation_method":"chemical",
            "status":"in review by lab",
            "ligation_temperature":37
        },
        {
            "dbxrefs":[
                "SRA:SRX764985",
                "GEO:GSM1551599"
            ],
            "digestion_time":30,
            "notes":"sample dcic notes",
            "aliases":[
                "labsample:alias"
            ],
            "crosslinking_temperature":37,
            "documents":[
                {
                    "display_title":"photo.jpg",
                    "link_id":"~documents~dcf15d5e-40aa-43bc-b81c-32c70c9afb01~"
                }
            ],
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "display_title":"dilution Hi-C on GM12878 with DNaseI",
            "description":"Test Experiment HiC",
            "accession":"4DNEX067APU1",
            "digestion_temperature":37,
            "lab":{
                "country":"USA",
                "city":"Boston",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "date_created":"2017-04-14T18:01:44.472055+00:00",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "display_title":"4DN Testing Lab",
                "title":"4DN Testing Lab",
                "institute_name":"Harvard Medical School",
                "uuid":"828cd4fe-ebb0-4b22-a94a-d2e3a36cc988",
                "link_id":"~labs~test-4dn-lab~",
                "schema_version":"1",
                "institute_label":"HMS",
                "name":"test-4dn-lab",
                "state":"MA",
                "@id":"/labs/test-4dn-lab/",
                "fax":"000-000-0000",
                "postal_code":"02115",
                "status":"current"
            },
            "follows_sop":"Yes",
            "uuid":"75041e2f-3e43-4388-8bbb-e861f209c444",
            "experiment_type":"dilution Hi-C",
            "link_id":"~experiments-hi-c~4DNEX067APU1~",
            "schema_version":"1",
            "protocol":{
                "schema_version":"1",
                "attachment":{
                    "download":"test.pdf",
                    "blob_id":"042b7708-906e-4a71-93e2-fe38c252f839",
                    "md5sum":"52ad2545e9d94aa4b906a691778f1775",
                    "href":"@@download/attachment/test.pdf",
                    "type":"application/pdf"
                },
                "date_created":"2017-04-14T18:01:54.116030+00:00",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "display_title":"Protocol from 2017-04-14",
                "description":"Stable transfection protocol",
                "@id":"/protocols/131106bc-8535-4448-903e-854af460b244/",
                "uuid":"131106bc-8535-4448-903e-854af460b244",
                "link_id":"~protocols~131106bc-8535-4448-903e-854af460b244~",
                "status":"in review by lab"
            },
            "award":{
                "date_created":"2017-04-14T18:01:44.398648+00:00",
                "@type":[
                    "Award",
                    "Item"
                ],
                "display_title":"4DN TEST",
                "project":"4DN",
                "description":"A test 4DN award - for testing permissions and access to various items",
                "title":"4DN TEST",
                "viewing_group":"4DN",
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461224b",
                "link_id":"~awards~Test-4DN~",
                "schema_version":"1",
                "name":"Test-4DN",
                "@id":"/awards/Test-4DN/",
                "status":"current"
            },
            "tagging_method":"Biotinylated ATP",
            "experiment_relation":[
                {
                    "relationship_type":"control for"
                },
                {
                    "relationship_type":"control for"
                },
                {
                    "relationship_type":"control for"
                },
                {
                    "relationship_type":"control for"
                },
                {
                    "relationship_type":"control for"
                }
            ],
            "enzyme_lot_number":"123456",
            "average_fragment_size":100,
            "biosample_quantity":2000000,
            "biosample":{
                "modifications_summary":"Stable Transfection for PARK2 and FMR1 and Other",
                "date_created":"2017-04-14T18:01:55.112275+00:00",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "display_title":"4DNBS1234567",
                "description":"GM12878 prepared for Hi-C",
                "accession":"4DNBS1234567",
                "treatments_summary":"siRNA for PARK2 and FMR1 and shRNA for PARK2 and FMR1",
                "uuid":"231111bc-8535-4448-903e-854af460b254",
                "treatments":[
                    {
                        "rnai_type":"siRNA",
                        "aliases":[
                            "Awesome:Treatment"
                        ],
                        "date_created":"2017-04-14T18:01:54.989044+00:00",
                        "@type":[
                            "TreatmentRnai",
                            "Treatment",
                            "Item"
                        ],
                        "display_title":"TreatmentRnai from 2017-04-14",
                        "description":"RNAi treatment for rS3",
                        "treatment_type":"siRNA for PARK2 and FMR1",
                        "uuid":"686b362f-4eb6-4a9c-8173-3ab267307e3b",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~treatments-rnai~686b362f-4eb6-4a9c-8173-3ab267307e3b~",
                        "schema_version":"1",
                        "target_sequence":"ATGCATGC",
                        "@id":"/treatments-rnai/686b362f-4eb6-4a9c-8173-3ab267307e3b/",
                        "status":"in review by lab"
                    },
                    {
                        "rnai_type":"shRNA",
                        "aliases":[
                            "Awesome:Treatment2"
                        ],
                        "date_created":"2017-04-14T18:01:55.040287+00:00",
                        "@type":[
                            "TreatmentRnai",
                            "Treatment",
                            "Item"
                        ],
                        "display_title":"TreatmentRnai from 2017-04-14",
                        "description":"RNAi treatment for rS5",
                        "treatment_type":"shRNA for PARK2 and FMR1",
                        "uuid":"686b362f-4eb6-4a9c-8173-3ab267307a8d",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~treatments-rnai~686b362f-4eb6-4a9c-8173-3ab267307a8d~",
                        "schema_version":"1",
                        "target_sequence":"ATGCATGC",
                        "@id":"/treatments-rnai/686b362f-4eb6-4a9c-8173-3ab267307a8d/",
                        "status":"in review by lab"
                    }
                ],
                "link_id":"~biosamples~4DNBS1234567~",
                "schema_version":"1",
                "biosource":[
                    {
                        "individual":{
                            "organism":{
                                "schema_version":"1",
                                "date_created":"2017-04-14T18:01:45.721721+00:00",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "display_title":"human",
                                "name":"human",
                                "taxon_id":"9606",
                                "scientific_name":"Homo sapiens",
                                "@id":"/organisms/human/",
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "link_id":"~organisms~human~",
                                "status":"released"
                            },
                            "display_title":"4DNIN000AAQ1",
                            "link_id":"~individuals-human~4DNIN000AAQ1~"
                        },
                        "date_created":"2017-04-14T18:01:54.608627+00:00",
                        "cell_line_tier":"Unclassified",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "display_title":"GM12878",
                        "cell_line_termid":"EFO_0002784",
                        "description":"other GM12878 cells",
                        "accession":"4DNSRDMSZ57H",
                        "uuid":"331111bc-8535-4448-903e-854af460b254",
                        "link_id":"~biosources~4DNSRDMSZ57H~",
                        "schema_version":"1",
                        "cell_line":"GM12878",
                        "biosource_type":"immortalized cell line",
                        "biosource_name":"GM12878",
                        "@id":"/biosources/4DNSRDMSZ57H/",
                        "status":"in review by lab"
                    }
                ],
                "modifications_summary_short":"Stable Transfection for PARK2 and FMR1",
                "@id":"/biosamples/4DNBS1234567/",
                "biosource_summary":"GM12878",
                "status":"in review by lab",
                "modifications":[
                    {
                        "modification_name":"Stable Transfection for PARK2 and FMR1",
                        "date_created":"2017-04-14T18:01:54.063557+00:00",
                        "@type":[
                            "Modification",
                            "Item"
                        ],
                        "display_title":"Stable Transfection for PARK2 and FMR1",
                        "description":"Stable Tranfection of GFP construct",
                        "uuid":"431106bc-8535-4448-903e-854af460b265",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~modifications~431106bc-8535-4448-903e-854af460b265~",
                        "modification_name_short":"Stable Transfection for PARK2 and FMR1",
                        "schema_version":"1",
                        "modification_type":"Stable Transfection",
                        "@id":"/modifications/431106bc-8535-4448-903e-854af460b265/",
                        "status":"in review by lab"
                    },
                    {
                        "modification_name":"Other",
                        "date_created":"2017-04-14T18:01:54.088589+00:00",
                        "@type":[
                            "Modification",
                            "Item"
                        ],
                        "display_title":"Other",
                        "description":"Other type of modification",
                        "uuid":"431106bc-8535-4448-903e-854af460b276",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~modifications~431106bc-8535-4448-903e-854af460b276~",
                        "modification_name_short":"Other",
                        "schema_version":"1",
                        "modification_type":"Other",
                        "@id":"/modifications/431106bc-8535-4448-903e-854af460b276/",
                        "status":"in review by lab"
                    }
                ]
            },
            "@id":"/experiments-hi-c/4DNEX067APU1/",
            "external_references":[
                {
                    "ref":"SRA:SRX764985",
                    "uri":"https://www.ncbi.nlm.nih.gov/sra/?term=SRX764985"
                },
                {
                    "ref":"GEO:GSM1551599",
                    "uri":"http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSM1551599"
                }
            ],
            "experiment_sets":[
                {
                    "display_title":"4DNESFF4LIDB",
                    "link_id":"~experiment_set~331106bc-8535-4448-903e-854af460b285~"
                },
                {
                    "display_title":"4DNES72TDMGB",
                    "link_id":"~experiment_set_replicate~431106bc-8535-4448-903e-854af460b261~"
                }
            ],
            "sop_mapping":{
                "has_sop":"No"
            },
            "date_created":"2017-04-14T18:01:57.945230+00:00",
            "submitted_by":{
                "subscriptions":[
                    {
                        "title":"My submissions",
                        "url":"?submitted_by.link_id=~users~986b362f-4eb6-4a9c-8173-3ab267307e3a~&sort=-date_created"
                    },
                    {
                        "title":"My lab",
                        "url":"?lab.link_id=~labs~4dn-dcic-lab~&sort=-date_created"
                    }
                ],
                "timezone":"US/Pacific",
                "date_created":"2017-04-14T18:01:59.560731+00:00",
                "@type":[
                    "User",
                    "Item"
                ],
                "display_title":"4dn DCIC",
                "groups":[
                    "admin"
                ],
                "last_name":"DCIC",
                "title":"4dn DCIC",
                "uuid":"986b362f-4eb6-4a9c-8173-3ab267307e3a",
                "link_id":"~users~986b362f-4eb6-4a9c-8173-3ab267307e3a~",
                "schema_version":"1",
                "@id":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                "job_title":"Admin",
                "first_name":"4dn",
                "viewing_groups":[
                    "4DN"
                ],
                "email":"4dndcic@gmail.com",
                "status":"current"
            },
            "digestion_enzyme":{
                "aliases":[
                    "dcic:dnaseI_tfs"
                ],
                "date_created":"2017-04-14T18:01:54.836502+00:00",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "display_title":"DNaseI",
                "description":"used for DNase HiC",
                "uuid":"e646edb2-d4d5-405b-aab1-03e4754b0705",
                "url":"https://www.thermofisher.com/order/catalog/product/EN0525",
                "link_id":"~enzymes~DNaseI~",
                "schema_version":"1",
                "catalog_number":"EN052",
                "name":"DNaseI",
                "@id":"/enzymes/DNaseI/",
                "status":"in review by lab"
            },
            "biosample_quantity_units":"cells",
            "crosslinking_time":30,
            "crosslinking_method":"1% Formaldehyde",
            "experiment_summary":"dilution Hi-C on GM12878 with DNaseI",
            "ligation_time":30,
            "files":[
                {
                    "display_title":"4DNFI067APU1",
                    "link_id":"~files-fastq~4DNFI067APU1~"
                },
                {
                    "display_title":"4DNFI067APA1",
                    "link_id":"~files-fasta~4DNFI067APA1~"
                }
            ],
            "fragmentation_method":"chemical",
            "status":"in review by lab",
            "ligation_temperature":37
        },
        {
            "digestion_time":30,
            "notes":"dcic notes",
            "aliases":[
                "labsample:alias3"
            ],
            "crosslinking_temperature":37,
            "documents":[
                {
                    "display_title":"photo.jpg",
                    "link_id":"~documents~dcf15d5e-40aa-43bc-b81c-32c70c9afb01~"
                }
            ],
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "display_title":"dilution Hi-C on GM12878 with DNaseI",
            "description":"Test Experiment HiC 3",
            "accession":"4DNEX067APV1",
            "digestion_temperature":37,
            "lab":{
                "country":"USA",
                "city":"Boston",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "date_created":"2017-04-14T18:01:44.472055+00:00",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "display_title":"4DN Testing Lab",
                "title":"4DN Testing Lab",
                "institute_name":"Harvard Medical School",
                "uuid":"828cd4fe-ebb0-4b22-a94a-d2e3a36cc988",
                "link_id":"~labs~test-4dn-lab~",
                "schema_version":"1",
                "institute_label":"HMS",
                "name":"test-4dn-lab",
                "state":"MA",
                "@id":"/labs/test-4dn-lab/",
                "fax":"000-000-0000",
                "postal_code":"02115",
                "status":"current"
            },
            "uuid":"75041e2f-3e43-4388-8bbb-e861f209b3fb",
            "experiment_type":"dilution Hi-C",
            "link_id":"~experiments-hi-c~4DNEX067APV1~",
            "schema_version":"1",
            "protocol":{
                "schema_version":"1",
                "attachment":{
                    "download":"test.pdf",
                    "blob_id":"042b7708-906e-4a71-93e2-fe38c252f839",
                    "md5sum":"52ad2545e9d94aa4b906a691778f1775",
                    "href":"@@download/attachment/test.pdf",
                    "type":"application/pdf"
                },
                "date_created":"2017-04-14T18:01:54.116030+00:00",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "display_title":"Protocol from 2017-04-14",
                "description":"Stable transfection protocol",
                "@id":"/protocols/131106bc-8535-4448-903e-854af460b244/",
                "uuid":"131106bc-8535-4448-903e-854af460b244",
                "link_id":"~protocols~131106bc-8535-4448-903e-854af460b244~",
                "status":"in review by lab"
            },
            "award":{
                "end_date":"2020-08-31",
                "date_created":"2017-04-14T18:01:44.357800+00:00",
                "@type":[
                    "Award",
                    "Item"
                ],
                "display_title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "project":"4DN",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "viewing_group":"4DN",
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "link_id":"~awards~1U01CA200059-01~",
                "schema_version":"1",
                "name":"1U01CA200059-01",
                "@id":"/awards/1U01CA200059-01/",
                "status":"current",
                "start_date":"2015-09-07"
            },
            "experiment_relation":[
                {
                    "relationship_type":"controlled by"
                }
            ],
            "biosample":{
                "modifications_summary":"Stable Transfection for PARK2 and FMR1 and Other",
                "date_created":"2017-04-14T18:01:55.112275+00:00",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "display_title":"4DNBS1234567",
                "description":"GM12878 prepared for Hi-C",
                "accession":"4DNBS1234567",
                "treatments_summary":"siRNA for PARK2 and FMR1 and shRNA for PARK2 and FMR1",
                "uuid":"231111bc-8535-4448-903e-854af460b254",
                "treatments":[
                    {
                        "rnai_type":"siRNA",
                        "aliases":[
                            "Awesome:Treatment"
                        ],
                        "date_created":"2017-04-14T18:01:54.989044+00:00",
                        "@type":[
                            "TreatmentRnai",
                            "Treatment",
                            "Item"
                        ],
                        "display_title":"TreatmentRnai from 2017-04-14",
                        "description":"RNAi treatment for rS3",
                        "treatment_type":"siRNA for PARK2 and FMR1",
                        "uuid":"686b362f-4eb6-4a9c-8173-3ab267307e3b",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~treatments-rnai~686b362f-4eb6-4a9c-8173-3ab267307e3b~",
                        "schema_version":"1",
                        "target_sequence":"ATGCATGC",
                        "@id":"/treatments-rnai/686b362f-4eb6-4a9c-8173-3ab267307e3b/",
                        "status":"in review by lab"
                    },
                    {
                        "rnai_type":"shRNA",
                        "aliases":[
                            "Awesome:Treatment2"
                        ],
                        "date_created":"2017-04-14T18:01:55.040287+00:00",
                        "@type":[
                            "TreatmentRnai",
                            "Treatment",
                            "Item"
                        ],
                        "display_title":"TreatmentRnai from 2017-04-14",
                        "description":"RNAi treatment for rS5",
                        "treatment_type":"shRNA for PARK2 and FMR1",
                        "uuid":"686b362f-4eb6-4a9c-8173-3ab267307a8d",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~treatments-rnai~686b362f-4eb6-4a9c-8173-3ab267307a8d~",
                        "schema_version":"1",
                        "target_sequence":"ATGCATGC",
                        "@id":"/treatments-rnai/686b362f-4eb6-4a9c-8173-3ab267307a8d/",
                        "status":"in review by lab"
                    }
                ],
                "link_id":"~biosamples~4DNBS1234567~",
                "schema_version":"1",
                "biosource":[
                    {
                        "individual":{
                            "organism":{
                                "schema_version":"1",
                                "date_created":"2017-04-14T18:01:45.721721+00:00",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "display_title":"human",
                                "name":"human",
                                "taxon_id":"9606",
                                "scientific_name":"Homo sapiens",
                                "@id":"/organisms/human/",
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "link_id":"~organisms~human~",
                                "status":"released"
                            },
                            "display_title":"4DNIN000AAQ1",
                            "link_id":"~individuals-human~4DNIN000AAQ1~"
                        },
                        "date_created":"2017-04-14T18:01:54.608627+00:00",
                        "cell_line_tier":"Unclassified",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "display_title":"GM12878",
                        "cell_line_termid":"EFO_0002784",
                        "description":"other GM12878 cells",
                        "accession":"4DNSRDMSZ57H",
                        "uuid":"331111bc-8535-4448-903e-854af460b254",
                        "link_id":"~biosources~4DNSRDMSZ57H~",
                        "schema_version":"1",
                        "cell_line":"GM12878",
                        "biosource_type":"immortalized cell line",
                        "biosource_name":"GM12878",
                        "@id":"/biosources/4DNSRDMSZ57H/",
                        "status":"in review by lab"
                    }
                ],
                "modifications_summary_short":"Stable Transfection for PARK2 and FMR1",
                "@id":"/biosamples/4DNBS1234567/",
                "biosource_summary":"GM12878",
                "status":"in review by lab",
                "modifications":[
                    {
                        "modification_name":"Stable Transfection for PARK2 and FMR1",
                        "date_created":"2017-04-14T18:01:54.063557+00:00",
                        "@type":[
                            "Modification",
                            "Item"
                        ],
                        "display_title":"Stable Transfection for PARK2 and FMR1",
                        "description":"Stable Tranfection of GFP construct",
                        "uuid":"431106bc-8535-4448-903e-854af460b265",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~modifications~431106bc-8535-4448-903e-854af460b265~",
                        "modification_name_short":"Stable Transfection for PARK2 and FMR1",
                        "schema_version":"1",
                        "modification_type":"Stable Transfection",
                        "@id":"/modifications/431106bc-8535-4448-903e-854af460b265/",
                        "status":"in review by lab"
                    },
                    {
                        "modification_name":"Other",
                        "date_created":"2017-04-14T18:01:54.088589+00:00",
                        "@type":[
                            "Modification",
                            "Item"
                        ],
                        "display_title":"Other",
                        "description":"Other type of modification",
                        "uuid":"431106bc-8535-4448-903e-854af460b276",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~modifications~431106bc-8535-4448-903e-854af460b276~",
                        "modification_name_short":"Other",
                        "schema_version":"1",
                        "modification_type":"Other",
                        "@id":"/modifications/431106bc-8535-4448-903e-854af460b276/",
                        "status":"in review by lab"
                    }
                ]
            },
            "@id":"/experiments-hi-c/4DNEX067APV1/",
            "experiment_sets":[
                {
                    "display_title":"4DNES72TDMGB",
                    "link_id":"~experiment_set_replicate~431106bc-8535-4448-903e-854af460b261~"
                },
                {
                    "display_title":"4DNES3OW8WBJ",
                    "link_id":"~experiment_set~431106bc-8535-4448-903e-854af460b285~"
                }
            ],
            "sop_mapping":{
                "has_sop":"No"
            },
            "date_created":"2017-04-14T18:02:00.383479+00:00",
            "submitted_by":{
                "subscriptions":[
                    {
                        "title":"My submissions",
                        "url":"?submitted_by.link_id=~users~986b362f-4eb6-4a9c-8173-3ab267307e3b~&sort=-date_created"
                    },
                    {
                        "title":"My lab",
                        "url":"?lab.link_id=~labs~test-4dn-lab~&sort=-date_created"
                    }
                ],
                "timezone":"US/Pacific",
                "date_created":"2017-04-14T18:01:59.684003+00:00",
                "@type":[
                    "User",
                    "Item"
                ],
                "display_title":"Wrangler Wrangler",
                "groups":[
                    "submitter"
                ],
                "last_name":"Wrangler",
                "title":"Wrangler Wrangler",
                "uuid":"986b362f-4eb6-4a9c-8173-3ab267307e3b",
                "link_id":"~users~986b362f-4eb6-4a9c-8173-3ab267307e3b~",
                "schema_version":"1",
                "@id":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3b/",
                "job_title":"wrangler",
                "first_name":"Wrangler",
                "viewing_groups":[
                    "4DN"
                ],
                "email":"wrangler@wrangler.com",
                "status":"current"
            },
            "digestion_enzyme":{
                "aliases":[
                    "dcic:dnaseI_tfs"
                ],
                "date_created":"2017-04-14T18:01:54.836502+00:00",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "display_title":"DNaseI",
                "description":"used for DNase HiC",
                "uuid":"e646edb2-d4d5-405b-aab1-03e4754b0705",
                "url":"https://www.thermofisher.com/order/catalog/product/EN0525",
                "link_id":"~enzymes~DNaseI~",
                "schema_version":"1",
                "catalog_number":"EN052",
                "name":"DNaseI",
                "@id":"/enzymes/DNaseI/",
                "status":"in review by lab"
            },
            "crosslinking_time":30,
            "crosslinking_method":"1% Formaldehyde",
            "experiment_summary":"dilution Hi-C on GM12878 with DNaseI",
            "ligation_time":30,
            "files":[
                {
                    "display_title":"4DNFI067APV1",
                    "link_id":"~files-fastq~4DNFI067APV1~"
                }
            ],
            "fragmentation_method":"chemical",
            "status":"in review by lab",
            "ligation_temperature":37
        },
        {
            "dbxrefs":[
                "SRA:SRX764989",
                "GEO:GSM1551603"
            ],
            "digestion_time":30,
            "notes":"sample dcic notes",
            "aliases":[
                "labsample:alias2"
            ],
            "crosslinking_temperature":37,
            "documents":[
                {
                    "display_title":"photo.jpg",
                    "link_id":"~documents~dcf15d5e-40aa-43bc-b81c-32c70c9afb01~"
                }
            ],
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "display_title":"dilution Hi-C on GM12878 with HindIII",
            "description":"Test Experiment HiC 2",
            "accession":"4DNEX067APT1",
            "digestion_temperature":37,
            "lab":{
                "country":"USA",
                "city":"Boston",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "date_created":"2017-04-14T18:01:44.472055+00:00",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "display_title":"4DN Testing Lab",
                "title":"4DN Testing Lab",
                "institute_name":"Harvard Medical School",
                "uuid":"828cd4fe-ebb0-4b22-a94a-d2e3a36cc988",
                "link_id":"~labs~test-4dn-lab~",
                "schema_version":"1",
                "institute_label":"HMS",
                "name":"test-4dn-lab",
                "state":"MA",
                "@id":"/labs/test-4dn-lab/",
                "fax":"000-000-0000",
                "postal_code":"02115",
                "status":"current"
            },
            "uuid":"75041e2f-3e43-4388-8bbb-e861f209c4fb",
            "experiment_type":"dilution Hi-C",
            "link_id":"~experiments-hi-c~4DNEX067APT1~",
            "schema_version":"1",
            "protocol":{
                "schema_version":"1",
                "attachment":{
                    "download":"test.pdf",
                    "blob_id":"042b7708-906e-4a71-93e2-fe38c252f839",
                    "md5sum":"52ad2545e9d94aa4b906a691778f1775",
                    "href":"@@download/attachment/test.pdf",
                    "type":"application/pdf"
                },
                "date_created":"2017-04-14T18:01:54.116030+00:00",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "display_title":"Protocol from 2017-04-14",
                "description":"Stable transfection protocol",
                "@id":"/protocols/131106bc-8535-4448-903e-854af460b244/",
                "uuid":"131106bc-8535-4448-903e-854af460b244",
                "link_id":"~protocols~131106bc-8535-4448-903e-854af460b244~",
                "status":"in review by lab"
            },
            "award":{
                "date_created":"2017-04-14T18:01:44.398648+00:00",
                "@type":[
                    "Award",
                    "Item"
                ],
                "display_title":"4DN TEST",
                "project":"4DN",
                "description":"A test 4DN award - for testing permissions and access to various items",
                "title":"4DN TEST",
                "viewing_group":"4DN",
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461224b",
                "link_id":"~awards~Test-4DN~",
                "schema_version":"1",
                "name":"Test-4DN",
                "@id":"/awards/Test-4DN/",
                "status":"current"
            },
            "tagging_method":"Biotinylated ATP",
            "experiment_relation":[
                {
                    "relationship_type":"controlled by"
                }
            ],
            "enzyme_lot_number":"123456",
            "average_fragment_size":100,
            "biosample":{
                "modifications_summary":"Stable Transfection for PARK2 and FMR1",
                "date_created":"2017-04-14T18:01:55.225108+00:00",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "display_title":"4DNBS1234678",
                "description":"GM12878 prepared for Hi-C",
                "accession":"4DNBS1234678",
                "treatments_summary":"EPO",
                "uuid":"231111bc-8535-4448-903e-854af460ba4d",
                "treatments":[
                    {
                        "aliases":[
                            "Drug:Treatment"
                        ],
                        "date_created":"2017-04-14T18:01:55.069719+00:00",
                        "@type":[
                            "TreatmentChemical",
                            "Treatment",
                            "Item"
                        ],
                        "display_title":"TreatmentChemical from 2017-04-14",
                        "description":"Drug treatment to change performance",
                        "concentration_units":"units",
                        "treatment_type":"EPO",
                        "concentration":5,
                        "uuid":"586b362f-4eb6-4a9c-8173-3ab267307e3b",
                        "link_id":"~treatments-chemical~586b362f-4eb6-4a9c-8173-3ab267307e3b~",
                        "duration":24,
                        "schema_version":"1",
                        "chemical":"EPO",
                        "duration_units":"hour",
                        "temperature":37,
                        "@id":"/treatments-chemical/586b362f-4eb6-4a9c-8173-3ab267307e3b/",
                        "status":"in review by lab"
                    }
                ],
                "link_id":"~biosamples~4DNBS1234678~",
                "schema_version":"1",
                "biosource":[
                    {
                        "individual":{
                            "organism":{
                                "schema_version":"1",
                                "date_created":"2017-04-14T18:01:45.721721+00:00",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "display_title":"human",
                                "name":"human",
                                "taxon_id":"9606",
                                "scientific_name":"Homo sapiens",
                                "@id":"/organisms/human/",
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "link_id":"~organisms~human~",
                                "status":"released"
                            },
                            "display_title":"4DNIN000AAQ1",
                            "link_id":"~individuals-human~4DNIN000AAQ1~"
                        },
                        "date_created":"2017-04-14T18:01:54.608627+00:00",
                        "cell_line_tier":"Unclassified",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "display_title":"GM12878",
                        "cell_line_termid":"EFO_0002784",
                        "description":"other GM12878 cells",
                        "accession":"4DNSRDMSZ57H",
                        "uuid":"331111bc-8535-4448-903e-854af460b254",
                        "link_id":"~biosources~4DNSRDMSZ57H~",
                        "schema_version":"1",
                        "cell_line":"GM12878",
                        "biosource_type":"immortalized cell line",
                        "biosource_name":"GM12878",
                        "@id":"/biosources/4DNSRDMSZ57H/",
                        "status":"in review by lab"
                    }
                ],
                "modifications_summary_short":"Stable Transfection for PARK2 and FMR1",
                "@id":"/biosamples/4DNBS1234678/",
                "biosource_summary":"GM12878",
                "status":"in review by lab",
                "modifications":[
                    {
                        "modification_name":"Stable Transfection for PARK2 and FMR1",
                        "date_created":"2017-04-14T18:01:54.063557+00:00",
                        "@type":[
                            "Modification",
                            "Item"
                        ],
                        "display_title":"Stable Transfection for PARK2 and FMR1",
                        "description":"Stable Tranfection of GFP construct",
                        "uuid":"431106bc-8535-4448-903e-854af460b265",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~modifications~431106bc-8535-4448-903e-854af460b265~",
                        "modification_name_short":"Stable Transfection for PARK2 and FMR1",
                        "schema_version":"1",
                        "modification_type":"Stable Transfection",
                        "@id":"/modifications/431106bc-8535-4448-903e-854af460b265/",
                        "status":"in review by lab"
                    }
                ]
            },
            "@id":"/experiments-hi-c/4DNEX067APT1/",
            "external_references":[
                {
                    "ref":"SRA:SRX764989",
                    "uri":"https://www.ncbi.nlm.nih.gov/sra/?term=SRX764989"
                },
                {
                    "ref":"GEO:GSM1551603",
                    "uri":"http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSM1551603"
                }
            ],
            "experiment_sets":[
                {
                    "display_title":"4DNESFF4LIDB",
                    "link_id":"~experiment_set~331106bc-8535-4448-903e-854af460b285~"
                },
                {
                    "display_title":"4DNESQ238R2T",
                    "link_id":"~experiment_set_replicate~431106bc-8535-4448-903e-854af460b260~"
                }
            ],
            "sop_mapping":{
                "has_sop":"No"
            },
            "date_created":"2017-04-14T18:02:00.303779+00:00",
            "submitted_by":{
                "subscriptions":[
                    {
                        "title":"My submissions",
                        "url":"?submitted_by.link_id=~users~986b362f-4eb6-4a9c-8173-3ab267307e3a~&sort=-date_created"
                    },
                    {
                        "title":"My lab",
                        "url":"?lab.link_id=~labs~4dn-dcic-lab~&sort=-date_created"
                    }
                ],
                "timezone":"US/Pacific",
                "date_created":"2017-04-14T18:01:59.560731+00:00",
                "@type":[
                    "User",
                    "Item"
                ],
                "display_title":"4dn DCIC",
                "groups":[
                    "admin"
                ],
                "last_name":"DCIC",
                "title":"4dn DCIC",
                "uuid":"986b362f-4eb6-4a9c-8173-3ab267307e3a",
                "link_id":"~users~986b362f-4eb6-4a9c-8173-3ab267307e3a~",
                "schema_version":"1",
                "@id":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                "job_title":"Admin",
                "first_name":"4dn",
                "viewing_groups":[
                    "4DN"
                ],
                "email":"4dndcic@gmail.com",
                "status":"current"
            },
            "digestion_enzyme":{
                "aliases":[
                    "dcic:hindIII_neb"
                ],
                "date_created":"2017-04-14T18:01:54.813913+00:00",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "display_title":"HindIII",
                "site_length":6,
                "uuid":"4d44d12c-b37c-478b-9bc7-d843cba4bb91",
                "url":"https://www.neb.com/products/r0104-hindiii",
                "link_id":"~enzymes~HindIII~",
                "schema_version":"1",
                "cut_position":1,
                "catalog_number":"R0104",
                "name":"HindIII",
                "@id":"/enzymes/HindIII/",
                "recognition_sequence":"AAGCTT",
                "status":"in review by lab"
            },
            "crosslinking_time":30,
            "crosslinking_method":"1% Formaldehyde",
            "experiment_summary":"dilution Hi-C on GM12878 with HindIII",
            "ligation_time":30,
            "files":[
                {
                    "display_title":"4DNFI067APT1",
                    "link_id":"~files-fastq~4DNFI067APT1~"
                }
            ],
            "fragmentation_method":"chemical",
            "status":"in review by lab",
            "ligation_temperature":37
        },
        {
            "dbxrefs":[
                "sample ext id"
            ],
            "digestion_time":30,
            "notes":"sample dcic notes",
            "aliases":[
                "labsample:alias4"
            ],
            "crosslinking_temperature":37,
            "documents":[
                {
                    "display_title":"photo.jpg",
                    "link_id":"~documents~dcf15d5e-40aa-43bc-b81c-32c70c9afb01~"
                }
            ],
            "@type":[
                "ExperimentHiC",
                "Experiment",
                "Item"
            ],
            "display_title":"dilution Hi-C on GM12878 with HindIII",
            "description":"Test Experiment HiC 4",
            "accession":"4DNEX067APY1",
            "digestion_temperature":37,
            "lab":{
                "country":"USA",
                "city":"Boston",
                "address2":"10 Schattuck Street",
                "address1":"Biomedical Bioinfomatics",
                "date_created":"2017-04-14T18:01:44.472055+00:00",
                "@type":[
                    "Lab",
                    "Item"
                ],
                "display_title":"4DN Testing Lab",
                "title":"4DN Testing Lab",
                "institute_name":"Harvard Medical School",
                "uuid":"828cd4fe-ebb0-4b22-a94a-d2e3a36cc988",
                "link_id":"~labs~test-4dn-lab~",
                "schema_version":"1",
                "institute_label":"HMS",
                "name":"test-4dn-lab",
                "state":"MA",
                "@id":"/labs/test-4dn-lab/",
                "fax":"000-000-0000",
                "postal_code":"02115",
                "status":"current"
            },
            "uuid":"75041e2f-3e43-4388-8bbb-e861f209c4fc",
            "experiment_type":"dilution Hi-C",
            "link_id":"~experiments-hi-c~4DNEX067APY1~",
            "schema_version":"1",
            "protocol":{
                "schema_version":"1",
                "attachment":{
                    "download":"test.pdf",
                    "blob_id":"042b7708-906e-4a71-93e2-fe38c252f839",
                    "md5sum":"52ad2545e9d94aa4b906a691778f1775",
                    "href":"@@download/attachment/test.pdf",
                    "type":"application/pdf"
                },
                "date_created":"2017-04-14T18:01:54.116030+00:00",
                "@type":[
                    "Protocol",
                    "Item"
                ],
                "display_title":"Protocol from 2017-04-14",
                "description":"Stable transfection protocol",
                "@id":"/protocols/131106bc-8535-4448-903e-854af460b244/",
                "uuid":"131106bc-8535-4448-903e-854af460b244",
                "link_id":"~protocols~131106bc-8535-4448-903e-854af460b244~",
                "status":"in review by lab"
            },
            "award":{
                "end_date":"2020-08-31",
                "date_created":"2017-04-14T18:01:44.357800+00:00",
                "@type":[
                    "Award",
                    "Item"
                ],
                "display_title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "project":"4DN",
                "description":"The goals of the 4D Nucleome (4DN) Data Coordination and Integration Center (DCIC) are to collect, store, curate, display, and analyze data generated in the 4DN Network. We have assembled a team of investigators with a strong track record in analysis of chromatin interaction data, image processing and three-dimensional data visualization, integrative analysis of genomic and epigenomic data, data portal development, large-scale computing, and development of secure and flexible cloud technologies. In Aim 1, we will develop efficient submission pipelines for data and metadata from 4DN data production groups. We will define data/metadata requirements and quality metrics in conjunction with the production groups and ensure that high-quality, well- annotated data become available to the wider scientific community in a timely manner. In Aim 2, we will develop a user-friendly data portal for the broad scientific community. This portal will provide an easy-to-navigate interface for accessing raw and intermediate data files, allow for programmatic access via APIs, and will incorporate novel analysis and visualization tools developed by DCIC as well as other Network members. For computing and storage scalability and cost-effectiveness, significant efforts will be devoted to development and deployment of cloud-based technology. We will conduct tutorials and workshops to facilitate the use of 4DN data and tools by external investigators. In Aim 3, we will coordinate and assist in conducting integrative analysis of the multiple data types. These efforts will examine key questions in higher-order chromatin organization using both sequence and image data, and the tools and algorithms developed here will be incorporated into the data portal for use by other investigators. These three aims will ensure that the data generated in 4DN will have maximal impact for the scientific community.",
                "title":"4D NUCLEOME NETWORK DATA COORDINATION AND INTEGRATION CENTER",
                "viewing_group":"4DN",
                "uuid":"b0b9c607-f8b4-4f02-93f4-9895b461334b",
                "link_id":"~awards~1U01CA200059-01~",
                "schema_version":"1",
                "name":"1U01CA200059-01",
                "@id":"/awards/1U01CA200059-01/",
                "status":"current",
                "start_date":"2015-09-07"
            },
            "tagging_method":"Biotinylated ATP",
            "experiment_relation":[
                {
                    "relationship_type":"controlled by"
                }
            ],
            "enzyme_lot_number":"123456",
            "average_fragment_size":100,
            "biosample":{
                "modifications_summary":"Stable Transfection for PARK2 and FMR1",
                "date_created":"2017-04-14T18:01:55.225108+00:00",
                "@type":[
                    "Biosample",
                    "Item"
                ],
                "display_title":"4DNBS1234678",
                "description":"GM12878 prepared for Hi-C",
                "accession":"4DNBS1234678",
                "treatments_summary":"EPO",
                "uuid":"231111bc-8535-4448-903e-854af460ba4d",
                "treatments":[
                    {
                        "aliases":[
                            "Drug:Treatment"
                        ],
                        "date_created":"2017-04-14T18:01:55.069719+00:00",
                        "@type":[
                            "TreatmentChemical",
                            "Treatment",
                            "Item"
                        ],
                        "display_title":"TreatmentChemical from 2017-04-14",
                        "description":"Drug treatment to change performance",
                        "concentration_units":"units",
                        "treatment_type":"EPO",
                        "concentration":5,
                        "uuid":"586b362f-4eb6-4a9c-8173-3ab267307e3b",
                        "link_id":"~treatments-chemical~586b362f-4eb6-4a9c-8173-3ab267307e3b~",
                        "duration":24,
                        "schema_version":"1",
                        "chemical":"EPO",
                        "duration_units":"hour",
                        "temperature":37,
                        "@id":"/treatments-chemical/586b362f-4eb6-4a9c-8173-3ab267307e3b/",
                        "status":"in review by lab"
                    }
                ],
                "link_id":"~biosamples~4DNBS1234678~",
                "schema_version":"1",
                "biosource":[
                    {
                        "individual":{
                            "organism":{
                                "schema_version":"1",
                                "date_created":"2017-04-14T18:01:45.721721+00:00",
                                "@type":[
                                    "Organism",
                                    "Item"
                                ],
                                "display_title":"human",
                                "name":"human",
                                "taxon_id":"9606",
                                "scientific_name":"Homo sapiens",
                                "@id":"/organisms/human/",
                                "uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c",
                                "link_id":"~organisms~human~",
                                "status":"released"
                            },
                            "display_title":"4DNIN000AAQ1",
                            "link_id":"~individuals-human~4DNIN000AAQ1~"
                        },
                        "date_created":"2017-04-14T18:01:54.608627+00:00",
                        "cell_line_tier":"Unclassified",
                        "@type":[
                            "Biosource",
                            "Item"
                        ],
                        "display_title":"GM12878",
                        "cell_line_termid":"EFO_0002784",
                        "description":"other GM12878 cells",
                        "accession":"4DNSRDMSZ57H",
                        "uuid":"331111bc-8535-4448-903e-854af460b254",
                        "link_id":"~biosources~4DNSRDMSZ57H~",
                        "schema_version":"1",
                        "cell_line":"GM12878",
                        "biosource_type":"immortalized cell line",
                        "biosource_name":"GM12878",
                        "@id":"/biosources/4DNSRDMSZ57H/",
                        "status":"in review by lab"
                    }
                ],
                "modifications_summary_short":"Stable Transfection for PARK2 and FMR1",
                "@id":"/biosamples/4DNBS1234678/",
                "biosource_summary":"GM12878",
                "status":"in review by lab",
                "modifications":[
                    {
                        "modification_name":"Stable Transfection for PARK2 and FMR1",
                        "date_created":"2017-04-14T18:01:54.063557+00:00",
                        "@type":[
                            "Modification",
                            "Item"
                        ],
                        "display_title":"Stable Transfection for PARK2 and FMR1",
                        "description":"Stable Tranfection of GFP construct",
                        "uuid":"431106bc-8535-4448-903e-854af460b265",
                        "url":"https://www.cyclingnews.com",
                        "link_id":"~modifications~431106bc-8535-4448-903e-854af460b265~",
                        "modification_name_short":"Stable Transfection for PARK2 and FMR1",
                        "schema_version":"1",
                        "modification_type":"Stable Transfection",
                        "@id":"/modifications/431106bc-8535-4448-903e-854af460b265/",
                        "status":"in review by lab"
                    }
                ]
            },
            "@id":"/experiments-hi-c/4DNEX067APY1/",
            "external_references":[
                {
                    "ref":"sample ext id"
                }
            ],
            "experiment_sets":[
                {
                    "display_title":"4DNESQ238R2T",
                    "link_id":"~experiment_set_replicate~431106bc-8535-4448-903e-854af460b260~"
                },
                {
                    "display_title":"4DNES3OW8WBJ",
                    "link_id":"~experiment_set~431106bc-8535-4448-903e-854af460b285~"
                }
            ],
            "sop_mapping":{
                "has_sop":"No"
            },
            "date_created":"2017-04-14T18:02:00.472337+00:00",
            "submitted_by":{
                "subscriptions":[
                    {
                        "title":"My submissions",
                        "url":"?submitted_by.link_id=~users~986b362f-4eb6-4a9c-8173-3ab267307e3a~&sort=-date_created"
                    },
                    {
                        "title":"My lab",
                        "url":"?lab.link_id=~labs~4dn-dcic-lab~&sort=-date_created"
                    }
                ],
                "timezone":"US/Pacific",
                "date_created":"2017-04-14T18:01:59.560731+00:00",
                "@type":[
                    "User",
                    "Item"
                ],
                "display_title":"4dn DCIC",
                "groups":[
                    "admin"
                ],
                "last_name":"DCIC",
                "title":"4dn DCIC",
                "uuid":"986b362f-4eb6-4a9c-8173-3ab267307e3a",
                "link_id":"~users~986b362f-4eb6-4a9c-8173-3ab267307e3a~",
                "schema_version":"1",
                "@id":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                "job_title":"Admin",
                "first_name":"4dn",
                "viewing_groups":[
                    "4DN"
                ],
                "email":"4dndcic@gmail.com",
                "status":"current"
            },
            "digestion_enzyme":{
                "aliases":[
                    "dcic:hindIII_neb"
                ],
                "date_created":"2017-04-14T18:01:54.813913+00:00",
                "@type":[
                    "Enzyme",
                    "Item"
                ],
                "display_title":"HindIII",
                "site_length":6,
                "uuid":"4d44d12c-b37c-478b-9bc7-d843cba4bb91",
                "url":"https://www.neb.com/products/r0104-hindiii",
                "link_id":"~enzymes~HindIII~",
                "schema_version":"1",
                "cut_position":1,
                "catalog_number":"R0104",
                "name":"HindIII",
                "@id":"/enzymes/HindIII/",
                "recognition_sequence":"AAGCTT",
                "status":"in review by lab"
            },
            "crosslinking_time":30,
            "crosslinking_method":"1% Formaldehyde",
            "experiment_summary":"dilution Hi-C on GM12878 with HindIII",
            "ligation_time":30,
            "files":[
                {
                    "display_title":"4DNFI067APY1",
                    "link_id":"~files-fastq~4DNFI067APY1~"
                }
            ],
            "fragmentation_method":"chemical",
            "status":"in review by lab",
            "ligation_temperature":37
        }
    ],
    "notification":"Success",
    "sort":{

    },
    "clear_filters":"/search/?type=ExperimentHiC",
    "total":5
};