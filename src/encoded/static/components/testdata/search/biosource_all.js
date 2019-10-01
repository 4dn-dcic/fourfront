module.exports = {
  "@context": "/terms/",
  "@id": "/search/?type=Biosource&format=json",
  "@type": [
    "Search"
  ],
  "title": "Search",
  "filters": [
    {
      "field": "type",
      "term": "Biosource",
      "remove": "/search/?format=json"
    }
  ],
  "facets": [
    {
      "field": "type",
      "title": "Data Type",
      "terms": [
        {
          "key": "Biosource",
          "doc_count": 19
        },
        {
          "key": "Item",
          "doc_count": 19
        },
        {
          "key": "AccessKey",
          "doc_count": 0
        },
        {
          "key": "AnalysisStep",
          "doc_count": 0
        },
        {
          "key": "Award",
          "doc_count": 0
        },
        {
          "key": "Biosample",
          "doc_count": 0
        },
        {
          "key": "BiosampleCellCulture",
          "doc_count": 0
        },
        {
          "key": "Construct",
          "doc_count": 0
        },
        {
          "key": "Document",
          "doc_count": 0
        },
        {
          "key": "Enzyme",
          "doc_count": 0
        },
        {
          "key": "Experiment",
          "doc_count": 0
        },
        {
          "key": "ExperimentCaptureC",
          "doc_count": 0
        },
        {
          "key": "ExperimentHiC",
          "doc_count": 0
        },
        {
          "key": "ExperimentRepliseq",
          "doc_count": 0
        },
        {
          "key": "ExperimentSet",
          "doc_count": 0
        },
        {
          "key": "ExperimentSetReplicate",
          "doc_count": 0
        },
        {
          "key": "File",
          "doc_count": 0
        },
        {
          "key": "FileFasta",
          "doc_count": 0
        },
        {
          "key": "FileFastq",
          "doc_count": 0
        },
        {
          "key": "FileProcessed",
          "doc_count": 0
        },
        {
          "key": "FileReference",
          "doc_count": 0
        },
        {
          "key": "FileSet",
          "doc_count": 0
        },
        {
          "key": "GenomicRegion",
          "doc_count": 0
        },
        {
          "key": "Individual",
          "doc_count": 0
        },
        {
          "key": "IndividualHuman",
          "doc_count": 0
        },
        {
          "key": "IndividualMouse",
          "doc_count": 0
        },
        {
          "key": "Lab",
          "doc_count": 0
        },
        {
          "key": "Modification",
          "doc_count": 0
        },
        {
          "key": "Ontology",
          "doc_count": 0
        },
        {
          "key": "OntologyTerm",
          "doc_count": 0
        },
        {
          "key": "Organism",
          "doc_count": 0
        },
        {
          "key": "Protocol",
          "doc_count": 0
        },
        {
          "key": "Publication",
          "doc_count": 0
        },
        {
          "key": "PublicationTracking",
          "doc_count": 0
        },
        {
          "key": "QualityMetric",
          "doc_count": 0
        },
        {
          "key": "QualityMetricBamqc",
          "doc_count": 0
        },
        {
          "key": "QualityMetricFastqc",
          "doc_count": 0
        },
        {
          "key": "QualityMetricPairsqc",
          "doc_count": 0
        },
        {
          "key": "Software",
          "doc_count": 0
        },
        {
          "key": "SopMap",
          "doc_count": 0
        },
        {
          "key": "Target",
          "doc_count": 0
        },
        {
          "key": "Treatment",
          "doc_count": 0
        },
        {
          "key": "TreatmentAgent",
          "doc_count": 0
        },
        {
          "key": "TreatmentRnai",
          "doc_count": 0
        },
        {
          "key": "User",
          "doc_count": 0
        },
        {
          "key": "Vendor",
          "doc_count": 0
        },
        {
          "key": "Workflow",
          "doc_count": 0
        },
        {
          "key": "WorkflowMapping",
          "doc_count": 0
        },
        {
          "key": "WorkflowRunSbg",
          "doc_count": 0
        }
      ],
      "total": 19
    },
    {
      "field": "biosource_type",
      "title": "Biosource type",
      "terms": [
        {
          "key": "immortalized cell line",
          "doc_count": 9
        },
        {
          "key": "primary cell",
          "doc_count": 3
        },
        {
          "key": "stem cell",
          "doc_count": 3
        },
        {
          "key": "in vitro differentiated cells",
          "doc_count": 1
        },
        {
          "key": "induced pluripotent stem cell line",
          "doc_count": 1
        },
        {
          "key": "tissue",
          "doc_count": 1
        },
        {
          "key": "whole organisms",
          "doc_count": 1
        }
      ],
      "total": 19
    },
    {
      "field": "biosource_name",
      "title": "Biosource",
      "terms": [
        {
          "key": "GM12878",
          "doc_count": 3
        },
        {
          "key": "H1-hESC",
          "doc_count": 2
        },
        {
          "key": "192627",
          "doc_count": 1
        },
        {
          "key": "CC-2517",
          "doc_count": 1
        },
        {
          "key": "CC-2551",
          "doc_count": 1
        },
        {
          "key": "CH12-LX",
          "doc_count": 1
        },
        {
          "key": "HeLa-S3",
          "doc_count": 1
        },
        {
          "key": "IMR-90",
          "doc_count": 1
        },
        {
          "key": "K562",
          "doc_count": 1
        },
        {
          "key": "KBM-7",
          "doc_count": 1
        },
        {
          "key": "U2OS",
          "doc_count": 1
        },
        {
          "key": "brain",
          "doc_count": 1
        },
        {
          "key": "in vitro differentiated cells",
          "doc_count": 1
        },
        {
          "key": "induced pluripotent stem cell line",
          "doc_count": 1
        },
        {
          "key": "stem cell",
          "doc_count": 1
        },
        {
          "key": "whole human",
          "doc_count": 1
        }
      ],
      "total": 19
    },
    {
      "field": "individual.organism.name",
      "title": "Organism",
      "terms": [
        {
          "key": "human",
          "doc_count": 17
        },
        {
          "key": "mouse",
          "doc_count": 2
        }
      ],
      "total": 19
    },
    {
      "field": "audit.ERROR.category",
      "title": "Audit category: ERROR",
      "terms": [
        {
          "key": "inconsistent replicate data",
          "doc_count": 0
        }
      ],
      "total": 19
    },
    {
      "field": "audit.WARNING.category",
      "title": "Audit category: WARNING",
      "terms": [
        {
          "key": "missing replicate",
          "doc_count": 0
        }
      ],
      "total": 19
    },
    {
      "field": "audit.INTERNAL_ACTION.category",
      "title": "Audit category: DCC ACTION",
      "terms": [
        {
          "key": "mismatched status",
          "doc_count": 1
        },
        {
          "key": "validation error",
          "doc_count": 0
        }
      ],
      "total": 19
    }
  ],
  "@graph": [
    {
      "aliases": [
        "dcic:IMR90"
      ],
      "individual": {
        "aliases": [
          "dcic:IMR90human"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T21:27:30.975072+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNINQQSTI31",
        "uuid": "9c661c36-1599-44f1-b070-05ca23171cb9",
        "schema_version": "1",
        "age_units": "week",
        "life_stage": "fetal",
        "health_status": "normal",
        "@id": "/individuals-human/4DNINQQSTI31/",
        "age": 16,
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:32.748166+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0001196",
      "description": "IMR-90 (CCL-186)",
      "tissue": "lung",
      "accession": "4DNSRTNFLA8T",
      "uuid": "12579548-60fe-427e-8a71-ee2a38af49d1",
      "url": "https://www.atcc.org/Products/All/CCL-186.aspx",
      "schema_version": "1",
      "cell_line": "IMR-90",
      "biosource_type": "immortalized cell line",
      "biosource_name": "IMR-90",
      "@id": "/biosources/4DNSRTNFLA8T/",
      "status": "in review by lab"
    },
    {
      "individual": {
        "aliases": [
          "dcic:trial"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.591939+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "mouse",
          "taxon_id": "10090",
          "scientific_name": "Mus musculus",
          "@id": "/organisms/mouse/",
          "uuid": "3413218c-3d86-498b-a0a2-9a406638e786",
          "status": "released"
        },
        "date_created": "2017-02-08T16:54:01.089015+00:00",
        "@type": [
          "IndividualMouse",
          "Individual",
          "Item"
        ],
        "sex": "male",
        "accession": "4DNINXTNX163",
        "uuid": "3cfe2618-368f-45a0-9aa9-a5277f1a56a9",
        "schema_version": "1",
        "age_units": "month",
        "mouse_strain": "Full GFP Glow",
        "mouse_life_stage": "pup",
        "@id": "/individuals-mouse/4DNINXTNX163/",
        "age": 2,
        "status": "released"
      },
      "date_created": "2017-02-08T17:41:11.378584+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0003042",
      "description": "test H1 cells test H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cellstest H1 cells",
      "accession": "4DNSRJH79OO4",
      "uuid": "d806b065-5f40-486c-8c38-4dce47a0feaf",
      "schema_version": "1",
      "cell_line": "H1-hESC",
      "biosource_type": "stem cell",
      "biosource_name": "H1-hESC",
      "@id": "/biosources/4DNSRJH79OO4/",
      "status": "in review by lab"
    },
    {
      "aliases": [
        "dcic:K562"
      ],
      "individual": {
        "aliases": [
          "dcic:K562human"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "date_created": "2017-02-08T21:27:30.921656+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNINK5ZQTKG",
        "uuid": "df09ac92-9108-44d7-8ac0-b6f17eb71af7",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "chronic myelogenous leukemia",
        "@id": "/individuals-human/4DNINK5ZQTKG/",
        "age": 53,
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:32.689183+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0002067",
      "description": "K562 (CCL-243)",
      "tissue": "bone marrow",
      "accession": "4DNSRETAEXFK",
      "uuid": "68369274-0f87-4930-b6b1-d60bae1c352f",
      "url": "https://www.atcc.org/products/all/CCL-243.aspx",
      "schema_version": "1",
      "cell_line": "K562",
      "biosource_type": "immortalized cell line",
      "biosource_name": "K562",
      "@id": "/biosources/4DNSRETAEXFK/",
      "status": "in review by lab"
    },
    {
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.165411+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0003042",
      "description": "test edit field",
      "accession": "4DNSRZE29XEQ",
      "uuid": "331111bc-8535-4448-903e-854ab460b254",
      "schema_version": "1",
      "cell_line": "H1-hESC",
      "biosource_type": "stem cell",
      "biosource_name": "H1-hESC",
      "@id": "/biosources/4DNSRZE29XEQ/",
      "status": "in review by lab"
    },
    {
      "aliases": [
        "dcic:CH12LX"
      ],
      "individual": {
        "schema_version": "1",
        "aliases": [
          "dcic:CH12LXmouse"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.591939+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "mouse",
          "taxon_id": "10090",
          "scientific_name": "Mus musculus",
          "@id": "/organisms/mouse/",
          "uuid": "3413218c-3d86-498b-a0a2-9a406638e786",
          "status": "released"
        },
        "date_created": "2017-02-08T21:27:30.762676+00:00",
        "@type": [
          "IndividualMouse",
          "Individual",
          "Item"
        ],
        "sex": "unknown",
        "mouse_strain": "B10.H-2aH-4bp/Wts",
        "accession": "4DNIN73SJGRH",
        "@id": "/individuals-mouse/4DNIN73SJGRH/",
        "uuid": "14e60388-39a0-4d7e-8aee-3a1224c94e28",
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:32.865869+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO:0005233",
      "description": "CH12-LX",
      "accession": "4DNSRKVQ4PTL",
      "uuid": "97e1914b-b051-4716-9dd3-3ea4b9bd6a1e",
      "url": "https://genome.ucsc.edu/ENCODE/protocols/cell/mouse/CH12_Weissman_protocol.pdf",
      "schema_version": "1",
      "cell_line": "CH12-LX",
      "biosource_type": "immortalized cell line",
      "biosource_name": "CH12-LX",
      "@id": "/biosources/4DNSRKVQ4PTL/",
      "status": "in review by lab"
    },
    {
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.139285+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0002784",
      "description": "test GM12878 cells",
      "accession": "4DNSROBKZ4E3",
      "uuid": "331111bc-8535-4448-903e-854af460a254",
      "schema_version": "1",
      "cell_line": "GM12878",
      "biosource_type": "immortalized cell line",
      "biosource_name": "GM12878",
      "@id": "/biosources/4DNSROBKZ4E3/",
      "status": "in review by lab"
    },
    {
      "aliases": [
        "dcic:gm12878"
      ],
      "individual": {
        "schema_version": "1",
        "aliases": [
          "dcic:GM12878human"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T21:27:30.872949+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNINCYOR756",
        "@id": "/individuals-human/4DNINCYOR756/",
        "uuid": "3f1157ac-787f-4da2-a7fb-861c9dfaacf7",
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:32.633624+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0002784",
      "description": "Homo sapiens GM12878 immortalized cell line",
      "tissue": "blood",
      "accession": "4DNSRGBQ4JCV",
      "uuid": "b9981e87-998c-4110-af45-cb2336ed8ef4",
      "url": "https://catalog.coriell.org/0/Sections/Search/Sample_Detail.aspx?Ref=GM12878&Product=CC",
      "schema_version": "1",
      "cell_line": "GM12878",
      "biosource_type": "immortalized cell line",
      "biosource_name": "GM12878",
      "@id": "/biosources/4DNSRGBQ4JCV/",
      "status": "in review by lab"
    },
    {
      "aliases": [
        "dcic:CC2551"
      ],
      "individual": {
        "schema_version": "1",
        "aliases": [
          "dcic:CC2551human"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "date_created": "2017-02-08T21:27:31.037732+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNINXA14M5J",
        "@id": "/individuals-human/4DNINXA14M5J/",
        "uuid": "118abace-861a-453c-b2c1-aa918659888d",
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:32.805393+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "description": "CC-2551",
      "tissue": "breast",
      "accession": "4DNSR93T67SJ",
      "uuid": "0031c30e-8509-4094-9fdd-7a9337e4781f",
      "url": "http://www.lonza.com/products-services/bio-research/primary-cells/human-cells-and-media/mammary-epithelial-cells-and-media/hmec-human-mammary-epithelial-cells.aspx",
      "schema_version": "1",
      "cell_line": "CC-2551",
      "biosource_type": "primary cell",
      "biosource_name": "CC-2551",
      "@id": "/biosources/4DNSR93T67SJ/",
      "status": "in review by lab"
    },
    {
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.190655+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0002869",
      "description": "test modified cells",
      "accession": "4DNSR7SPFN6S",
      "uuid": "331111bc-8535-2248-903e-854af460b254",
      "schema_version": "1",
      "cell_line": "U2OS",
      "biosource_type": "immortalized cell line",
      "biosource_name": "U2OS",
      "@id": "/biosources/4DNSR7SPFN6S/",
      "status": "in review by lab"
    },
    {
      "schema_version": "1",
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.312241+00:00",
      "biosource_type": "stem cell",
      "@type": [
        "Biosource",
        "Item"
      ],
      "description": "GM12878 cells",
      "biosource_name": "stem cell",
      "accession": "4DNSR2S4HI5W",
      "@id": "/biosources/4DNSR2S4HI5W/",
      "uuid": "331111bc-8535-4448-903e-854af460bab5",
      "status": "in review by lab"
    },
    {
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.116109+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0002784",
      "description": "other GM12878 cells",
      "accession": "4DNSROAMXVPX",
      "uuid": "331111bc-8535-4448-903e-854af460b254",
      "schema_version": "1",
      "cell_line": "GM12878",
      "biosource_type": "immortalized cell line",
      "biosource_name": "GM12878",
      "@id": "/biosources/4DNSROAMXVPX/",
      "status": "in review by lab"
    },
    {
      "aliases": [
        "dcic:HeLaS3"
      ],
      "individual": {
        "aliases": [
          "dcic:HeLaS3human"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Black",
        "date_created": "2017-02-08T21:27:31.255556+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNINSJV3UPW",
        "uuid": "57449428-95ad-466f-96b2-944850d90ee9",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "adenocarcinoma",
        "@id": "/individuals-human/4DNINSJV3UPW/",
        "age": 31,
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:33.142084+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO:0002791",
      "description": "HeLa-S3 (CCL-2.2)",
      "tissue": "cervix",
      "accession": "4DNSR75H64ZO",
      "uuid": "9460ed96-2bf5-4ed1-9e22-025025b03ecb",
      "url": "https://www.atcc.org/Products/All/CCL-2.2.aspx",
      "schema_version": "1",
      "cell_line": "HeLa-S3",
      "biosource_type": "immortalized cell line",
      "biosource_name": "HeLa-S3",
      "@id": "/biosources/4DNSR75H64ZO/",
      "status": "in review by lab"
    },
    {
      "schema_version": "1",
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.287979+00:00",
      "biosource_type": "induced pluripotent stem cell line",
      "@type": [
        "Biosource",
        "Item"
      ],
      "description": "GM12878",
      "biosource_name": "induced pluripotent stem cell line",
      "accession": "4DNSRQDFDDNA",
      "@id": "/biosources/4DNSRQDFDDNA/",
      "uuid": "331111bc-8535-4448-903e-854af460b89f",
      "status": "in review by lab"
    },
    {
      "aliases": [
        "dcic:192627"
      ],
      "individual": {
        "schema_version": "1",
        "aliases": [
          "dcic:192627human"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "date_created": "2017-02-08T21:27:31.136249+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "unknown",
        "accession": "4DNINSU5SZWC",
        "@id": "/individuals-human/4DNINSU5SZWC/",
        "uuid": "ed0dc085-e568-4d34-8f58-a11738ea669c",
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:33.009813+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "description": "192627 Adult Normal Human Epidermal Keratinocytes",
      "accession": "4DNSRF9UJTIL",
      "uuid": "d4493e02-12be-478b-92a1-1fbe2fe7da6b",
      "url": "http://www.lonza.com/products-services/bio-research/primary-cells/human-cells-and-media/keratinocytes-and-media/adult-and-neonatal-keratinocytes.aspx",
      "schema_version": "1",
      "cell_line": "192627",
      "biosource_type": "primary cell",
      "biosource_name": "192627",
      "@id": "/biosources/4DNSRF9UJTIL/",
      "status": "in review by lab"
    },
    {
      "schema_version": "1",
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.265760+00:00",
      "biosource_type": "tissue",
      "@type": [
        "Biosource",
        "Item"
      ],
      "description": "brain tissue",
      "tissue": "brain",
      "biosource_name": "brain",
      "accession": "4DNSRVCW6KRG",
      "@id": "/biosources/4DNSRVCW6KRG/",
      "uuid": "111116bc-8535-4448-903e-854af460b254",
      "status": "in review by lab"
    },
    {
      "aliases": [
        "dcic:KBM7"
      ],
      "individual": {
        "schema_version": "1",
        "aliases": [
          "dcic:KBM7human"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "date_created": "2017-02-08T21:27:31.087888+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "unknown",
        "accession": "4DNINV2F1FI2",
        "@id": "/individuals-human/4DNINV2F1FI2/",
        "uuid": "39130ae8-392b-44eb-b337-e84054defb71",
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:32.940886+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO_0005903",
      "description": "KBM-7 ",
      "accession": "4DNSRENQUKOT",
      "uuid": "1e9d8ce2-9615-4abf-84ec-35a579b030c0",
      "schema_version": "1",
      "cell_line": "KBM-7",
      "biosource_type": "immortalized cell line",
      "biosource_name": "KBM-7",
      "@id": "/biosources/4DNSRENQUKOT/",
      "status": "in review by lab"
    },
    {
      "schema_version": "1",
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.243879+00:00",
      "biosource_type": "in vitro differentiated cells",
      "@type": [
        "Biosource",
        "Item"
      ],
      "description": "Some cells",
      "biosource_name": "in vitro differentiated cells",
      "accession": "4DNSRB46RLYB",
      "@id": "/biosources/4DNSRB46RLYB/",
      "uuid": "331111bc-8535-4448-903e-854af460b666",
      "status": "in review by lab"
    },
    {
      "schema_version": "1",
      "individual": {
        "aliases": [
          "encode:donor_of_GM12878",
          "encode:donor of GM12878"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "ethnicity": "Caucasian",
        "date_created": "2017-02-08T16:54:01.068010+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "female",
        "accession": "4DNIN000AAQ1",
        "uuid": "44d24e3f-bc5b-469a-8500-7ebd728f8ed5",
        "url": "http://ccr.coriell.org/Sections/BrowseCatalog/FamilyTypeSubDetail.aspx?PgId=402&fam=1463&coll=GM",
        "schema_version": "1",
        "age_units": "year",
        "life_stage": "adult",
        "health_status": "unknown",
        "@id": "/individuals-human/4DNIN000AAQ1/",
        "age": 53,
        "status": "released"
      },
      "date_created": "2017-02-08T16:54:01.214144+00:00",
      "biosource_type": "whole organisms",
      "@type": [
        "Biosource",
        "Item"
      ],
      "description": "whole flies",
      "biosource_name": "whole human",
      "accession": "4DNSR1XIB9YZ",
      "@id": "/biosources/4DNSR1XIB9YZ/",
      "uuid": "331111bc-8535-4448-903e-854af46abcd4",
      "status": "in review by lab"
    },
    {
      "aliases": [
        "dcic:CC2517"
      ],
      "individual": {
        "schema_version": "1",
        "aliases": [
          "dcic:CC2517human"
        ],
        "organism": {
          "schema_version": "1",
          "date_created": "2017-02-08T16:53:55.578672+00:00",
          "@type": [
            "Organism",
            "Item"
          ],
          "name": "human",
          "taxon_id": "9606",
          "scientific_name": "Homo sapiens",
          "@id": "/organisms/human/",
          "uuid": "7745b647-ff15-4ff3-9ced-b897d4e2983c",
          "status": "released"
        },
        "date_created": "2017-02-08T21:27:31.188413+00:00",
        "@type": [
          "IndividualHuman",
          "Individual",
          "Item"
        ],
        "sex": "unknown",
        "accession": "4DNINO3V47BG",
        "@id": "/individuals-human/4DNINO3V47BG/",
        "uuid": "8180fbb4-3bd3-41f7-879a-5b2bb681f421",
        "status": "in review by lab"
      },
      "date_created": "2017-02-08T21:27:33.080808+00:00",
      "@type": [
        "Biosource",
        "Item"
      ],
      "cell_line_termid": "EFO:0002795",
      "description": "CC-2517 Human Umbilical Vein Endothelial Cells",
      "accession": "4DNSRZ9D2EAO",
      "uuid": "08953f5a-0eec-4280-be7c-0c530eebf46e",
      "url": "http://www.lonza.com/products-services/bio-research/primary-cells/human-cells-and-media/endothelial-cells-and-media/huvec-human-umbilical-vein-endothelial-cells.aspx",
      "schema_version": "1",
      "cell_line": "CC-2517",
      "biosource_type": "primary cell",
      "biosource_name": "CC-2517",
      "@id": "/biosources/4DNSRZ9D2EAO/",
      "status": "in review by lab"
    }
  ],
  "notification": "Success",
  "sort": {

  },
  "clear_filters": "/search/?type=Biosource",
  "total": 19
};
