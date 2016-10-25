{
  "class": "Workflow",
  "steps": [
    {
      "id": "#FastQC",
      "run": {
        "id": "4dn-dcic/dev/fastqc-0-11-4/0",
        "temporaryFailCodes": [],
        "sbg:latestRevision": 0,
        "class": "CommandLineTool",
        "description": "FastQC reads a set of sequence files and produces a quality control (QC) report from each one. These reports consist of a number of different modules, each of which will help identify a different type of potential problem in your data.\n\nFastQC is a tool which takes a FastQ file and runs a series of tests on it to generate a comprehensive QC report.  This report will tell you if there is anything unusual about your sequence.  Each test is flagged as a pass, warning, or fail depending on how far it departs from what you would expect from a normal large dataset with no significant biases.  It is important to stress that warnings or even failures do not necessarily mean that there is a problem with your data, only that it is unusual.  It is possible that the biological nature of your sample means that you would expect this particular bias in your results.",
        "stdout": "",
        "sbg:createdBy": "duplexa",
        "sbg:toolkitVersion": "0.11.4",
        "arguments": [
          {
            "prefix": "",
            "valueFrom": "--noextract",
            "separate": true
          },
          {
            "prefix": "--outdir",
            "valueFrom": ".",
            "separate": true
          }
        ],
        "sbg:sbgMaintained": false,
        "sbg:categories": [
          "FASTQ-Processing",
          "Quality-Control",
          "Quantification"
        ],
        "sbg:image_url": null,
        "sbg:validationErrors": [],
        "sbg:copyOf": "admin/sbg-public-data/fastqc-0-11-4/12",
        "sbg:job": {
          "allocatedResources": {
            "cpu": 1,
            "mem": 2048
          },
          "inputs": {
            "quiet": true,
            "threads": 0,
            "input_fastq": {
              "path": "/root/dir/example.fastq"
            }
          }
        },
        "sbg:modifiedBy": "duplexa",
        "sbg:revisionNotes": "Copy of admin/sbg-public-data/fastqc-0-11-4/12",
        "sbg:contributors": [
          "duplexa"
        ],
        "sbg:toolAuthor": "Babraham Institute",
        "sbg:modifiedOn": 1475785113,
        "sbg:toolkit": "FastQC",
        "baseCommand": [
          "fastqc"
        ],
        "sbg:cmdPreview": "fastqc  --noextract --outdir .  /root/dir/example.fastq",
        "hints": [
          {
            "dockerPull": "images.sbgenomics.com/mladenlsbg/fastqc:0.11.4",
            "dockerImageId": "759c4c8fbafd",
            "class": "DockerRequirement"
          },
          {
            "value": {
              "script": "{\tif ($job.inputs.threads)\n{\n  return $job.inputs.threads\n}\n else\n {\n   return 1\n }\n}",
              "engine": "#cwl-js-engine",
              "class": "Expression"
            },
            "class": "sbg:CPURequirement"
          },
          {
            "value": 2048,
            "class": "sbg:MemRequirement"
          }
        ],
        "sbg:license": "GNU General Public License v3.0 only",
        "successCodes": [],
        "sbg:createdOn": 1475785113,
        "stdin": "",
        "requirements": [
          {
            "id": "#cwl-js-engine",
            "requirements": [
              {
                "dockerPull": "rabix/js-engine",
                "class": "DockerRequirement"
              }
            ],
            "class": "ExpressionEngineRequirement"
          }
        ],
        "sbg:revision": 0,
        "sbg:revisionsInfo": [
          {
            "sbg:revisionNotes": "Copy of admin/sbg-public-data/fastqc-0-11-4/12",
            "sbg:modifiedBy": "duplexa",
            "sbg:revision": 0,
            "sbg:modifiedOn": 1475785113
          }
        ],
        "sbg:project": "4dn-dcic/dev",
        "sbg:links": [
          {
            "id": "http://www.bioinformatics.babraham.ac.uk/projects/fastqc/",
            "label": "Homepage"
          },
          {
            "id": "http://www.bioinformatics.babraham.ac.uk/projects/fastqc/fastqc_v0.11.4_source.zip",
            "label": "Source Code"
          },
          {
            "id": "https://wiki.hpcc.msu.edu/display/Bioinfo/FastQC+Tutorial",
            "label": "Wiki"
          },
          {
            "id": "http://www.bioinformatics.babraham.ac.uk/projects/fastqc/fastqc_v0.11.4.zip",
            "label": "Download"
          },
          {
            "id": "",
            "label": "Publication"
          }
        ],
        "sbg:id": "4dn-dcic/dev/fastqc-0-11-4/0",
        "inputs": [
          {
            "type": [
              "null",
              "int"
            ],
            "id": "#threads",
            "description": "Specifies the number of files which can be processed simultaneously.  Each thread will be allocated 250MB of memory so you shouldn't run more threads than your available memory will cope with, and not more than 6 threads on a 32 bit machine.",
            "inputBinding": {
              "prefix": "--threads",
              "valueFrom": {
                "script": "{\tif ($job.inputs.threads)\n\t\t{\n  \t\t\treturn $job.inputs.threads\n\t\t}\n\telse\n \t\t{\n   \t\t\treturn 1\n \t\t}\n}",
                "engine": "#cwl-js-engine",
                "class": "Expression"
              },
              "sbg:cmdInclude": true,
              "separate": true
            },
            "label": "Threads",
            "sbg:altPrefix": "-t"
          },
          {
            "type": [
              "null",
              "boolean"
            ],
            "id": "#quiet",
            "description": "Supress all progress messages on stdout and only report errors.",
            "inputBinding": {
              "prefix": "--quiet",
              "sbg:cmdInclude": true,
              "separate": true
            },
            "label": "Quiet",
            "sbg:altPrefix": "-q"
          },
          {
            "type": [
              "null",
              "boolean"
            ],
            "id": "#nogroup",
            "description": "Disable grouping of bases for reads >50bp. All reports will show data for every base in the read.  WARNING: Using this option will cause fastqc to crash and burn if you use it on really long reads, and your plots may end up a ridiculous size. You have been warned.",
            "inputBinding": {
              "prefix": "--nogroup",
              "sbg:cmdInclude": true,
              "separate": false
            },
            "label": "Nogroup"
          },
          {
            "type": [
              "null",
              "boolean"
            ],
            "id": "#nano",
            "description": "Files come from naopore sequences and are in fast5 format. In this mode you can pass in directories to process and the program will take in all fast5 files within those directories and produce a single output file from the sequences found in all files.",
            "inputBinding": {
              "prefix": "--nano",
              "sbg:cmdInclude": true,
              "separate": false
            },
            "sbg:category": "",
            "label": "Nano"
          },
          {
            "type": [
              "null",
              "File"
            ],
            "id": "#limits_file",
            "description": "Specifies a non-default file which contains a set of criteria which will be used to determine the warn/error limits for the various modules.  This file can also be used to selectively remove some modules from the output all together.  The format needs to mirror the default limits.txt file found in the Configuration folder.",
            "inputBinding": {
              "prefix": "--limits",
              "sbg:cmdInclude": true,
              "separate": true
            },
            "sbg:fileTypes": "TXT",
            "label": "Limits",
            "sbg:altPrefix": "-l",
            "required": false
          },
          {
            "type": [
              "null",
              "int"
            ],
            "id": "#kmers",
            "description": "Specifies the length of Kmer to look for in the Kmer content module. Specified Kmer length must be between 2 and 10. Default length is 7 if not specified.",
            "sbg:toolDefaultValue": "7",
            "sbg:category": "",
            "sbg:altPrefix": "-f",
            "label": "Kmers",
            "inputBinding": {
              "prefix": "--kmers",
              "sbg:cmdInclude": true,
              "separate": true
            }
          },
          {
            "type": [
              "File"
            ],
            "id": "#input_fastq",
            "description": "Input file.",
            "inputBinding": {
              "sbg:cmdInclude": true,
              "separate": true,
              "position": 100
            },
            "sbg:fileTypes": "FASTQ, FQ, FASTQ.GZ, FQ.GZ",
            "label": "Input file",
            "required": true
          },
          {
            "type": [
              "null",
              {
                "type": "enum",
                "symbols": [
                  "bam",
                  "sam",
                  "bam_mapped",
                  "sam_mapped",
                  "fastq"
                ],
                "name": "format"
              }
            ],
            "id": "#format",
            "description": "Bypasses the normal sequence file format detection and forces the program to use the specified format.  Valid formats are BAM, SAM, BAM_mapped, SAM_mapped and FASTQ.",
            "inputBinding": {
              "prefix": "--format",
              "sbg:cmdInclude": true,
              "separate": true
            },
            "sbg:category": "",
            "label": "Format",
            "sbg:altPrefix": "-f"
          },
          {
            "type": [
              "null",
              "File"
            ],
            "id": "#contaminants_file",
            "description": "Specifies a non-default file which contains the list of contaminants to screen overrepresented sequences against. The file must contain sets of named contaminants in the form name[tab]sequence.  Lines prefixed with a hash will be ignored.",
            "inputBinding": {
              "prefix": "--contaminants",
              "sbg:cmdInclude": true,
              "separate": true
            },
            "sbg:fileTypes": "FASTA, FA, TXT",
            "label": "Contaminants",
            "sbg:altPrefix": "-c",
            "required": false
          },
          {
            "type": [
              "null",
              "boolean"
            ],
            "id": "#casava",
            "description": "Files come from raw casava output. Files in the same sample group (differing only by the group number) will be analysed as a set rather than individually. Sequences with the filter flag set in the header will be excluded from the analysis. Files must have the same names given to them by casava (including being gzipped and ending with .gz) otherwise they won't be grouped together correctly.",
            "inputBinding": {
              "prefix": "--casava",
              "sbg:cmdInclude": true,
              "separate": false
            },
            "sbg:category": "",
            "label": "Casava"
          },
          {
            "type": [
              "null",
              "File"
            ],
            "id": "#adapters_file",
            "description": "Specifies a non-default file which contains the list of adapter sequences which will be explicity searched against the library. The file must contain sets of named adapters in the form name[tab]sequence.  Lines prefixed with a hash will be ignored.",
            "inputBinding": {
              "prefix": "--adapters",
              "sbg:cmdInclude": true,
              "separate": true
            },
            "sbg:fileTypes": "FASTA, FA",
            "label": "Adapters",
            "sbg:altPrefix": "-a",
            "required": false
          }
        ],
        "label": "FastQC",
        "outputs": [
          {
            "type": [
              "null",
              "File"
            ],
            "id": "#report_zip",
            "description": "Zip archive of the report.",
            "sbg:fileTypes": "ZIP",
            "outputBinding": {
              "sbg:metadata": {
                "__inherit__": "input_fastq"
              },
              "sbg:inheritMetadataFrom": "#input_fastq",
              "glob": "*_fastqc.zip"
            },
            "label": "Report zip"
          }
        ],
        "x": 518,
        "y": 149
      },
      "inputs": [
        {
          "id": "#FastQC.threads"
        },
        {
          "id": "#FastQC.quiet"
        },
        {
          "id": "#FastQC.nogroup"
        },
        {
          "id": "#FastQC.nano"
        },
        {
          "id": "#FastQC.limits_file",
          "source": [
            "#limits_file"
          ]
        },
        {
          "id": "#FastQC.kmers"
        },
        {
          "id": "#FastQC.input_fastq",
          "source": [
            "#input_fastq"
          ]
        },
        {
          "id": "#FastQC.format"
        },
        {
          "id": "#FastQC.contaminants_file",
          "source": [
            "#contaminants_file"
          ]
        },
        {
          "id": "#FastQC.casava"
        },
        {
          "id": "#FastQC.adapters_file",
          "source": [
            "#adapters_file"
          ]
        }
      ],
      "outputs": [
        {
          "id": "#FastQC.report_zip"
        }
      ],
      "sbg:x": 518,
      "sbg:y": 149
    }
  ],
  "requirements": [],
  "inputs": [
    {
      "type": [
        "null",
        "File"
      ],
      "id": "#limits_file",
      "label": "limits_file",
      "sbg:y": 54,
      "sbg:fileTypes": "TXT",
      "sbg:x": 248
    },
    {
      "type": [
        "File"
      ],
      "id": "#input_fastq",
      "label": "input_fastq",
      "sbg:y": 161,
      "sbg:fileTypes": "FASTQ, FQ, FASTQ.GZ, FQ.GZ",
      "sbg:x": 75
    },
    {
      "type": [
        "null",
        "File"
      ],
      "id": "#contaminants_file",
      "label": "contaminants_file",
      "sbg:y": 237,
      "sbg:fileTypes": "FASTA, FA, TXT",
      "sbg:x": 212
    },
    {
      "type": [
        "null",
        "File"
      ],
      "id": "#adapters_file",
      "label": "adapters_file",
      "sbg:y": 336,
      "sbg:fileTypes": "FASTA, FA",
      "sbg:x": 342
    }
  ],
  "outputs": [
    {
      "type": [
        "null",
        "File"
      ],
      "id": "#report_zip",
      "label": "report_zip",
      "sbg:y": 154,
      "sbg:x": 907,
      "sbg:includeInPorts": true,
      "required": false,
      "source": [
        "#FastQC.report_zip"
      ]
    }
  ],
  "sbg:latestRevision": 1,
  "sbg:contributors": [
    "duplexa"
  ],
  "sbg:canvas_y": 0,
  "sbg:createdBy": "duplexa",
  "sbg:sbgMaintained": false,
  "sbg:canvas_x": 0,
  "sbg:image_url": null,
  "sbg:modifiedOn": 1475785232,
  "sbg:canvas_zoom": 1,
  "sbg:validationErrors": [],
  "sbg:createdOn": 1475785156,
  "sbg:revision": 1,
  "sbg:revisionsInfo": [
    {
      "sbg:revisionNotes": null,
      "sbg:modifiedBy": "duplexa",
      "sbg:modifiedOn": 1475785156,
      "sbg:revision": 0
    },
    {
      "sbg:revisionNotes": null,
      "sbg:modifiedBy": "duplexa",
      "sbg:modifiedOn": 1475785232,
      "sbg:revision": 1
    }
  ],
  "sbg:project": "4dn-dcic/dev",
  "sbg:modifiedBy": "duplexa",
  "sbg:id": "4dn-dcic/dev/fastqc-0-11-4-1/1",
  "id": "4dn-dcic/dev/fastqc-0-11-4-1/1",
  "label": "fastqc-0.11.4",
  "description": "",
  "hints": []
}

