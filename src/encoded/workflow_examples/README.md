## Summary of the directory
* The two files gitar_cwl and sbg.task.detail.json are directly obtained from SBG using scripts `get_cwl_from_SBG.py` and `get_job_detail_SBG.py`, respectively.
* The two json files (file, workflow_run) are created by script `read_sbg_job_detail_create_files.py`, by using sbg.task.detail.json as input. 
* The workflow json file is created by script `read_cwl_create_workflow_insert.py`, by using gitar_cwl as input. (in progress)
* The three schema example json files are copied to tests/data/inserts.

## scripts
```
usage: read_sbg_job_detail_create_files.py [-h]
                                           [--sbg_job_report SBG_JOB_REPORT]
                                           [--bucket_name BUCKET_NAME]
                                           [--file_metadata_json FILE_METADATA_JSON]
                                           [--workflow_run_metadata_json WORKFLOW_RUN_METADATA_JSON]
                                           [--token TOKEN] [--output_only]
                                           [--no_upload] [--no_download]

temporary SBG task detail parser

optional arguments:
  -h, --help            show this help message and exit
  --sbg_job_report SBG_JOB_REPORT
                        your SBG task detail report
  --bucket_name BUCKET_NAME
                        your 4dn bucket name (including directory)
  --file_metadata_json FILE_METADATA_JSON
                        your output json file to which new file objects will
                        be appended
  --workflow_run_metadata_json WORKFLOW_RUN_METADATA_JSON
                        your output json file to which a new workflow run
                        object will be written
  --token TOKEN         your 7Bridges api access token
  --output_only         export inputs too if false
  --no_upload           do not upload but just download and create json
  --no_download         do not download but just create json. if this is true,
                        no_upload must be true.
```

```
usage: read_cwl_create_workflow_insert.py [-h] [-c CWLFILE]
                                          [-w WORKFLOW_METADATA_JSON]

temporary cwl parser that creates a workflow insert

optional arguments:
  -h, --help            show this help message and exit
  -c CWLFILE, --cwlfile CWLFILE
                        input cwlfile
  -w WORKFLOW_METADATA_JSON, --workflow_metadata_json WORKFLOW_METADATA_JSON
                        output workflow metadata json file
```

```
usage: get_job_detail_SBG.py [-h] [--token TOKEN] [--task_id TASK_ID]

optional arguments:
  -h, --help         show this help message and exit
  --token TOKEN      your 7Bridges api access token
  --task_id TASK_ID  your 7Bridges task ID
```

```
usage: get_cwl_from_SBG.py [-h] [--token TOKEN] [--app_id APP_ID]

optional arguments:
  -h, --help       show this help message and exit
  --token TOKEN    your 7Bridges api access token
  --app_id APP_ID  your 7Bridges App ID - "owner/project/appname/revision"
```

