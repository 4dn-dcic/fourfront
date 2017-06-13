module.exports = {
    "@context" : "/terms/",
    "@graph":[
        {
            "experimentset_type":"biological replicates",
            "display_title" : "4DNES12345",
            "date_created" : "2017-06-12T13:49:18.412318+00:00",
            "@id":"/experiment-sets/431106bc-8535-4448-903e-854af460b260/",
            "description":"Sample experiment set",
            "@type":["ExperimentSet","Item"],
            "experiments_in_set":[
                {
                    "files":[
                        {"lab":"/labs/4dn-dcic-lab/","aliases":[],"file_type":"fastq","filename":"test_file1","filesets":["/file-sets/4DNFS40D5WL1/"],"notes":"sample dcic notes","@type":["FileFastq","File","Item"],"uuid":"46e82a90-49e5-4c33-afab-9ec90d65faf3","accession":"4DNFI067APU1","href":"/file-fastq/4DNFI067APU1/@@download/4DNFI067APU1.fastq.gz","status":"uploaded","submitted_by":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/","schema_version":"1","dbxrefs":[],"experiments":["/experiments-hic/4DNEX067APT1/","/experiments-hic/4DNEX067APU1/","/experiments-hic/4DNEX067APV1/","/experiments-hic/4DNEX067APY1/","/experiments-hic/4DNEX067APZ1/"],"@id":"/file-fastq/4DNFI067APU1/","award":"/awards/1U01CA200059-01/","title":"4DNFI067APU1","alternate_accessions":[],"date_created":"2016-09-29T20:16:07.848483+00:00","flowcell_details":[],"file_format":"fastq"},
                        {"lab":"/labs/4dn-dcic-lab/","aliases":[],"file_type":"fastq","filename":"test_file4","filesets":["/file-sets/4DNFS40D5WL1/"],"notes":"sample dcic notes","@type":["FileFastq","File","Item"],"uuid":"46e82a90-49e5-4c33-afab-9ec90d65fafa","accession":"4DNFI067APU2","href":"/file-fastq/4DNFI067APU2/@@download/4DNFI067APU2.fastq.gz","status":"uploaded","submitted_by":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/","schema_version":"1","dbxrefs":[],"experiments":["/experiments-hic/4DNEX067APT1/","/experiments-hic/4DNEX067APU1/","/experiments-hic/4DNEX067APV1/","/experiments-hic/4DNEX067APY1/","/experiments-hic/4DNEX067APZ1/"],"@id":"/file-fastq/4DNFI067APU2/","award":"/awards/1U01CA200059-01/","title":"4DNFI067APU2","alternate_accessions":[],"date_created":"2016-09-29T20:16:07.934119+00:00","flowcell_details":[],"file_format":"fastq"}
                    ],
                    "biosample":{
                        "aliases":[],
                        "references":[],
                        "lab":"/labs/test-4dn-lab/",
                        "biosource_summary":"GM12878",
                        "uuid":"231111bc-8535-4448-903e-854af460b254",
                        "treatments_summary":"siRNA for Pokemon",
                        "@type":["Biosample","Item"],
                        "treatments":[
                            {
                                "rnai_vendor":"/vendors/worthington-biochemical/",
                                "status":"in review by lab",
                                "url":"https://www.cyclingnews.com",
                                "references":[],
                                "documents":[],
                                "schema_version":"1",
                                "rnai_type":"siRNA",
                                "aliases":["Awesome:Treatment"],
                                "target":"Pokemon",
                                "rnai_constructs":["/constructs/131106bc-8535-4448-903e-854af460b211/"],
                                "date_created":"2016-09-29T20:16:06.701371+00:00",
                                "@type":["TreatmentRnai","Treatment","Item"],
                                "uuid":"686b362f-4eb6-4a9c-8173-3ab267307e3b",
                                "target_sequence":"ATGCATGC",
                                "@id":"/treatments-rnai/686b362f-4eb6-4a9c-8173-3ab267307e3b/",
                                "treatment_type":"siRNA for Pokemon",
                                "description":"RNAi treatment to change the world!"
                            }
                        ],
                        "modifications_summary":"Crispr for PARK2 and FMR1",
                        "accession":"4DNBS1234567",
                        "date_created":"2016-09-29T20:16:06.824628+00:00",
                        "biosource":[{
                            "status":"in review by lab","biosource_vendor":"/vendors/new-england-biolabs/","references":[],"date_created":"2016-09-29T20:16:06.450707+00:00","schema_version":"1","aliases":[],"@id":"/biosources/4DNSRCPMO2T2/","biosource_type":"immortalized cell line","alternate_accessions":[],"description":"GM12878 cells","@type":["Biosource","Item"],"uuid":"331111bc-8535-4448-903e-854af460b254","individual":{"status":"released","url":"http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM","age":53,"lab":"/labs/4dn-dcic-lab/","aliases":["encode:donor_of_GM12878","encode:donor of GM12878"],"@id":"/individuals-human/4DNIN000AAQ1/","sex":"female","organism":{"status":"released","taxon_id":"9606","@type":["Organism","Item"],"schema_version":"1","scientific_name":"Homo sapiens","uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c","@id":"/organisms/human/","name":"human","date_created":"2016-09-29T20:16:06.122310+00:00"},"dbxrefs":[],"award":"/awards/1U01CA200059-01/","health_status":"unknown","alternate_accessions":[],"date_created":"2016-09-29T20:16:06.394410+00:00","documents":[],"uuid":"44d24e3f-bc5b-469a-8500-7ebd728f8ed5","@type":["IndividualHuman","Individual","Item"],"age_units":"year","life_stage":"adult","accession":"4DNIN000AAQ1","ethnicity":"Caucasian"},"biosource_name":"GM12878","cell_line":"GM12878","accession":"4DNSRCPMO2T2"
                        }],
                        "status":"in review by lab",
                        "submitted_by":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3b/",
                        "schema_version":"1",
                        "@id":"/biosamples/4DNBS1234567/",
                        "award":"/awards/Test-4DN/",
                        "modifications":[{
                            "status":"in review by lab","url":"https://www.cyclingnews.com","references":[],"target_of_mod":"/targets/d1115d5e-40aa-43bc-b81c-32c70c9afb55/","schema_version":"1","modification_type":"Crispr","aliases":[],"@id":"/modifications/431106bc-8535-4448-903e-854af460b254/","modification_name":"Crispr for PARK2 and FMR1","constructs":["/constructs/131106bc-8535-4448-903e-854af460b211/"],"description":"Gonna cut your gene!","@type":["Modification","Item"],"uuid":"431106bc-8535-4448-903e-854af460b254","modified_regions":["/genomic_regions/d1115d5e-40aa-43bc-b81c-32c70c9afb01/"],"created_by":"/vendors/thermofisher-scientific/","date_created":"2016-09-29T20:16:06.768630+00:00"
                        }],
                        "alternate_accessions":[],
                        "description":"GM12878 prepared for Hi-C",
                        "biosample_protocols":["/protocols/131106bc-8535-4448-903e-854af460b244/"],
                        "cell_culture_details":"/biosample-cell-culture/131106bc-8535-4448-903e-854af460b212/"
                    },
                    "references":[],
                    "lab":{"status":"in review by lab","pi":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/","country":"USA","fax":"000-000-0000","schema_version":"1","address1":"Biomedical Bioinfomatics","uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989","@id":"/labs/4dn-dcic-lab/","awards":["/awards/1U01CA200059-01/"],"name":"4dn-dcic-lab","phone1":"000-000-0000","title":"4DN DCIC Lab, HMS","state":"MA","@type":["Lab","Item"],"address2":"10 Schattuck Street","institute_label":"HMS","city":"Boston","phone2":"000-000-0000","postal_code":"02115","institute_name":"Harvard Medical School","date_created":"2016-09-29T20:16:06.052088+00:00"},
                    "aliases":["labsample:alias"],
                    "tagging_method":"Biotinylated ATP",
                    "experiment_sets":["/experiment-sets/431106bc-8535-4448-903e-854af460b260/"],
                    "crosslinking_temperature":37,
                    "dbxrefs":["sample ext id"],
                    "experiment_relation":[{"relationship_type":"control for","experiment":"/experiments-hic/4DNEX067APT1/"},{"relationship_type":"control for","experiment":"/experiments-hic/4DNEX067APV1/"},{"relationship_type":"control for","experiment":"/experiments-hic/4DNEX067APY1/"},{"relationship_type":"control for","experiment":"/experiments-hic/4DNEX067APZ1/"},{"relationship_type":"control for","experiment":"/experiments-capture-hic/4DNEX067AWT1/"}],
                    "notes":"sample dcic notes",
                    "@type":["ExperimentHiC","Experiment","Item"],
                    "uuid":"75041e2f-3e43-4388-8bbb-e861f209c444",
                    "fragmentation_method":"chemical",
                    "experiment_type":"dilution Hi-C",
                    "enzyme_lot_number":"123456",
                    "accession":"4DNEX067APU1",
                    "digestion_enzyme":{"cut_position":0,"status":"in review by lab","url":"https://www.neb.com/products/r0147-mboi","@type":["Enzyme","Item"],"schema_version":"1","aliases":[],"@id":"/enzymes/MboI/","recognition_sequence":"GATC","catalog_number":"R0147","documents":[],"uuid":"b5ca085b-3e18-493d-8930-436ec86ea2e3","site_length":4,"enzyme_source":"/vendors/new-england-biolabs/","name":"MboI","date_created":"2016-09-29T20:16:06.604447+00:00"},
                    "protocol":{"uuid":"131106bc-8535-4448-903e-854af460b244","description":"really cool protocol","@type":["Protocol","Protocol","Item"],"schema_version":"1","protocol_documents":["/documents/dcf15d5e-40aa-43bc-b81c-32c70c9afb01/"],"aliases":[],"@id":"/protocols/131106bc-8535-4448-903e-854af460b244/","status":"in review by lab","date_created":"2016-09-29T20:16:06.369499+00:00"},
                    "crosslinking_time":30,
                    "status":"in review by lab",
                    "submitted_by":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                    "digestion_temperature":37,
                    "date_created":"2016-09-29T20:16:08.001865+00:00",
                    "schema_version":"1",
                    "@id":"/experiments-hic/4DNEX067APU1/",
                    "average_fragment_size":100,
                    "award":{"viewing_group":"4DN","uuid":"b0b9c607-f8b4-4f02-93f4-9895b461224b","project":"4DN","description":"A test 4DN award - for testing permissions and access to various items","@type":["Award","Item"],"schema_version":"1","status":"current","title":"4DN TEST","@id":"/awards/Test-4DN/","name":"Test-4DN","date_created":"2016-09-29T20:16:05.997333+00:00"},
                    "ligation_time":30,
                    "alternate_accessions":[],
                    "description":"Test Drive",
                    "documents":["/documents/dcf15d5e-40aa-43bc-b81c-32c70c9afb01/"],
                    "digestion_time":30,
                    "ligation_temperature":37,
                    "experiment_summary":"dilution Hi-C on GM12878 with MboI",
                    "crosslinking_method":"1% Formaldehyde"
                },{
                    "files":[
                        {
                            "lab":"/labs/4dn-dcic-lab/",
                            "aliases":[],
                            "file_type":"fastq",
                            "filename":"test_file1",
                            "filesets":["/file-sets/4DNFS40D5WL1/"],
                            "notes":"sample dcic notes",
                            "@type":["FileFastq","File","Item"],
                            "uuid":"46e82a90-49e5-4c33-afab-9ec90d65faf3",
                            "accession":"4DNFI067APU1",
                            "href":"/file-fastq/4DNFI067APU1/@@download/4DNFI067APU1.fastq.gz",
                            "status":"uploaded",
                            "submitted_by":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                            "schema_version":"1",
                            "dbxrefs":[],
                            "experiments":["/experiments-hic/4DNEX067APT1/","/experiments-hic/4DNEX067APU1/","/experiments-hic/4DNEX067APV1/","/experiments-hic/4DNEX067APY1/","/experiments-hic/4DNEX067APZ1/"],
                            "@id":"/file-fastq/4DNFI067APU1/",
                            "award":"/awards/1U01CA200059-01/",
                            "title":"4DNFI067APU1",
                            "alternate_accessions":[],
                            "date_created":"2016-09-29T20:16:07.848483+00:00",
                            "flowcell_details":[],
                            "file_format":"fastq"
                        },{
                            "lab":"/labs/4dn-dcic-lab/",
                            "aliases":[],
                            "file_type":"fastq",
                            "filename":"test_file4",
                            "filesets":["/file-sets/4DNFS40D5WL1/"],
                            "notes":"sample dcic notes",
                            "@type":["FileFastq","File","Item"],
                            "uuid":"46e82a90-49e5-4c33-afab-9ec90d65fafa",
                            "accession":"4DNFI067APU2",
                            "href":"/file-fastq/4DNFI067APU2/@@download/4DNFI067APU2.fastq.gz",
                            "status":"uploaded",
                            "submitted_by":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                            "schema_version":"1",
                            "dbxrefs":[],
                            "experiments":["/experiments-hic/4DNEX067APT1/","/experiments-hic/4DNEX067APU1/","/experiments-hic/4DNEX067APV1/","/experiments-hic/4DNEX067APY1/","/experiments-hic/4DNEX067APZ1/"],
                            "@id":"/file-fastq/4DNFI067APU2/",
                            "award":"/awards/1U01CA200059-01/",
                            "title":"4DNFI067APU2",
                            "alternate_accessions":[],
                            "date_created":"2016-09-29T20:16:07.934119+00:00",
                            "flowcell_details":[],
                            "file_format":"fastq"
                        }
                    ],
                    "biosample":{"status":"in review by lab","biosource_summary":"whole human","references":[],"biosource":[{"status":"in review by lab","references":[],"date_created":"2016-09-29T20:16:06.477870+00:00","schema_version":"1","aliases":[],"@id":"/biosources/4DNSRGQUY6K6/","biosource_type":"whole organisms","alternate_accessions":[],"description":"whole flies","@type":["Biosource","Item"],"uuid":"331111bc-8535-4448-903e-854af46abcd4","individual":{"status":"released","url":"http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM","age":53,"lab":"/labs/4dn-dcic-lab/","aliases":["encode:donor_of_GM12878","encode:donor of GM12878"],"@id":"/individuals-human/4DNIN000AAQ1/","sex":"female","organism":{"status":"released","taxon_id":"9606","@type":["Organism","Item"],"schema_version":"1","scientific_name":"Homo sapiens","uuid":"7745b647-ff15-4ff3-9ced-b897d4e2983c","@id":"/organisms/human/","name":"human","date_created":"2016-09-29T20:16:06.122310+00:00"},"dbxrefs":[],"award":"/awards/1U01CA200059-01/","health_status":"unknown","alternate_accessions":[],"date_created":"2016-09-29T20:16:06.394410+00:00","documents":[],"uuid":"44d24e3f-bc5b-469a-8500-7ebd728f8ed5","@type":["IndividualHuman","Individual","Item"],"age_units":"year","life_stage":"adult","accession":"4DNIN000AAQ1","ethnicity":"Caucasian"},"biosource_name":"whole human","biosource_vendor":"/vendors/new-england-biolabs/","accession":"4DNSRGQUY6K6"}],"date_created":"2016-09-29T20:16:06.876144+00:00","schema_version":"1","aliases":[],"@id":"/biosamples/4DNBSA1GR7LS/","treatments":[{"duration":24,"references":[],"@type":["TreatmentChemical","Treatment","Item"],"schema_version":"1","aliases":["Drug:Treatment"],"@id":"/treatments-chemical/586b362f-4eb6-4a9c-8173-3ab267307e3b/","status":"in review by lab","duration_units":"hour","concentration":5,"date_created":"2016-09-29T20:16:06.750530+00:00","documents":[],"uuid":"586b362f-4eb6-4a9c-8173-3ab267307e3b","temperature":37,"chemical":"EPO","concentration_units":"units","treatment_type":"EPO","description":"Drug treatment to change performance!"}],"modifications":[{"status":"in review by lab","url":"https://www.cyclingnews.com","references":[],"target_of_mod":"/targets/d1115d5e-40aa-43bc-b81c-32c70c9afb55/","schema_version":"1","modification_type":"Stable Transfection","aliases":[],"@id":"/modifications/431106bc-8535-4448-903e-854af460b265/","modification_name":"Stable Transfection for PARK2 and FMR1","constructs":["/constructs/131106bc-8535-4448-903e-854af460b211/"],"description":"Gonna cut your gene!","@type":["Modification","Item"],"uuid":"431106bc-8535-4448-903e-854af460b265","modified_regions":["/genomic_regions/d1115d5e-40aa-43bc-b81c-32c70c9afb01/","/genomic_regions/d2215d5e-40aa-43bc-b81c-32c70c9afb01/"],"date_created":"2016-09-29T20:16:06.793720+00:00"}],"treatments_summary":"EPO","description":"GM12878 prepared for Hi-C","@type":["Biosample","Item"],"uuid":"231111bc-8535-4448-903e-854af460ba4d","modifications_summary":"Stable Transfection for PARK2 and FMR1","alternate_accessions":[],"biosample_protocols":["/protocols/131106bc-8535-4448-903e-854af460b244/"],"accession":"4DNBSA1GR7LS"},
                    "references":[],
                    "lab":{"status":"in review by lab","pi":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/","country":"USA","fax":"000-000-0000","schema_version":"1","address1":"Biomedical Bioinfomatics","uuid":"828cd4fe-ebb0-4b36-a94a-d2e3a36cc989","@id":"/labs/4dn-dcic-lab/","awards":["/awards/1U01CA200059-01/"],"name":"4dn-dcic-lab","phone1":"000-000-0000","title":"4DN DCIC Lab, HMS","state":"MA","@type":["Lab","Item"],"address2":"10 Schattuck Street","institute_label":"HMS","city":"Boston","phone2":"000-000-0000","postal_code":"02115","institute_name":"Harvard Medical School","date_created":"2016-09-29T20:16:06.052088+00:00"},
                    "aliases":["labsample:alias2"],
                    "tagging_method":"Biotinylated ATP",
                    "experiment_sets":["/experiment-sets/431106bc-8535-4448-903e-854af460b260/"],
                    "crosslinking_temperature":37,
                    "dbxrefs":["sample ext id"],
                    "experiment_relation":[{"relationship_type":"controlled by","experiment":"/experiments-hic/4DNEX067APU1/"}],
                    "notes":"sample dcic notes",
                    "@type":["ExperimentHiC","Experiment","Item"],
                    "uuid":"75041e2f-3e43-4388-8bbb-e861f209c4fb",
                    "fragmentation_method":"chemical",
                    "experiment_type":"dilution Hi-C",
                    "enzyme_lot_number":"123456",
                    "accession":"4DNEX067APT1",
                    "digestion_enzyme":{"status":"in review by lab","url":"http://www.worthington-biochem.com/nfcp/default.html","@type":["Enzyme","Item"],"schema_version":"1","aliases":[],"@id":"/enzymes/MNase/","catalog_number":"LS004798","description":"used for Micro-C","documents":[],"uuid":"0ee36c38-8d5e-4ca9-a528-592d64496e76","enzyme_source":"/vendors/worthington-biochemical/","name":"MNase","date_created":"2016-09-29T20:16:06.627220+00:00"},
                    "protocol":{"uuid":"131106bc-8535-4448-903e-854af460b244","description":"really cool protocol","@type":["Protocol","Protocol","Item"],"schema_version":"1","protocol_documents":["/documents/dcf15d5e-40aa-43bc-b81c-32c70c9afb01/"],"aliases":[],"@id":"/protocols/131106bc-8535-4448-903e-854af460b244/","status":"in review by lab","date_created":"2016-09-29T20:16:06.369499+00:00"},
                    "crosslinking_time":30,
                    "status":"in review by lab",
                    "submitted_by":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/",
                    "digestion_temperature":37,
                    "date_created":"2016-09-29T20:16:08.066191+00:00",
                    "schema_version":"1",
                    "@id":"/experiments-hic/4DNEX067APT1/",
                    "average_fragment_size":100,
                    "award":{"status":"current","project":"External","start_date":"2015-09-07","schema_version":"1","pi":"/users/986b362f-4eb6-4a9c-8173-3ab267307e3a/","@id":"/awards/1U01CA200059-02/","end_date":"2020-08-31","title":"SOME EXTERNAL AWARD","description":"A test external award.","@type":["Award","Item"],"uuid":"b0b9c607-f8b4-4f02-93f4-9895b4613349","name":"1U01CA200059-02","date_created":"2016-09-29T20:16:06.022679+00:00","url":"https://projectreporter.nih.gov/project_info_description.cfm?aid=8987140&icde=30570219"},
                    "ligation_time":30,
                    "alternate_accessions":[],
                    "description":"Test Drive",
                    "documents":["/documents/dcf15d5e-40aa-43bc-b81c-32c70c9afb01/"],
                    "digestion_time":30,
                    "ligation_temperature":37,
                    "experiment_summary":"dilution Hi-C on whole human with MNase",
                    "crosslinking_method":"1% Formaldehyde"
                }
            ]
        }
    ],
    "facets":[
        {
            "title":"Data Type",
            "terms":[
                {"doc_count":1,"key":"ExperimentSet"},
                {"doc_count":0,"key":"AnalysisStep"},
                {"doc_count":0,"key":"Award"},
                {"doc_count":0,"key":"Biosample"},
                {"doc_count":0,"key":"Enzyme"},
                {"doc_count":0,"key":"Experiment"},
                {"doc_count":0,"key":"ExperimentCaptureC"},
                {"doc_count":0,"key":"ExperimentHiC"},
                {"doc_count":0,"key":"Individual"},
                {"doc_count":0,"key":"IndividualHuman"},
                {"doc_count":0,"key":"Modification"},
                {"doc_count":0,"key":"Organism"},
                {"doc_count":0,"key":"Protocol"},
                {"doc_count":0,"key":"Software"},
                {"doc_count":0,"key":"Target"},
                {"doc_count":0,"key":"User"}
            ],
            "field":"type",
            "total":1
        },{
            "title":"Experiment set type",
            "terms":[
                {"doc_count":1,"key":"analysis set"},
                {"doc_count":1,"key":"biological replicates"}
            ],
            "field":"experimentset_type",
            "total":2
        },{
            "title":"Project",
            "terms":[
                {"doc_count":1,"key":"4DN"},
                {"doc_count":1,"key":"External"}
            ],
            "field":"experiments_in_set.award.project",
            "total":1
        },{
            "title":"Biosource type",
            "terms":[
                {"doc_count":1,"key":"immortalized cell line"},
                {"doc_count":1,"key":"whole organisms"}
            ],
            "field":"experiments_in_set.biosample.biosource.biosource_type",
            "total":1
        },{"title":"Biosource","terms":[{"doc_count":1,"key":"GM12878"},{"doc_count":1,"key":"whole human"}],"field":"experiments_in_set.biosample.biosource_summary","total":1},{"title":"Enzyme","terms":[{"doc_count":1,"key":"MNase"},{"doc_count":1,"key":"MboI"}],"field":"experiments_in_set.digestion_enzyme.name","total":1},{"title":"Modifications","terms":[{"doc_count":1,"key":"Crispr for PARK2 and FMR1"},{"doc_count":1,"key":"Stable Transfection for PARK2 and FMR1"}],"field":"experiments_in_set.biosample.modifications_summary","total":1},{"title":"Treatments","terms":[{"doc_count":1,"key":"EPO"},{"doc_count":1,"key":"siRNA for Pokemon"}],"field":"experiments_in_set.biosample.treatments_summary","total":1},{"title":"Audit category: DCC ACTION","terms":[{"doc_count":0,"key":"mismatched status"},{"doc_count":0,"key":"validation error"}],"field":"audit.INTERNAL_ACTION.category","total":1}
    ],
    "@id":"/browse/?type=ExperimentSetReplicate&experimentset_type=replicate",
    "total":1,
    "clear_filters":"/browse/?type=ExperimentSetReplicate",
    "title":"Browse",
    "filters":[
        {"field":"type","term":"ExperimentSet","remove":"/browse/?experimentset_type=biological+replicates"},
        {"field":"experimentset_type","term":"biological replicates","remove":"/browse/?type=ExperimentSetReplicate"}
    ],
    "@type":["Browse"],
    "views":[
        {"title":"View tabular report","icon":"table","href":"/report/?type=ExperimentSetReplicate&experimentset_type=replicate"}
    ],
    "notification":"Success",
    "sort":{"date_created":{"ignore_unmapped":true,"order":"desc"},"label":{"missing":"_last","ignore_unmapped":true,"order":"asc"}},
    "columns":{
        "@id":"ID",
        "experimentset_type":"Experiment set type"
    }
};
