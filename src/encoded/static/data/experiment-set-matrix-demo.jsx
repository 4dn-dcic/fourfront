<div key="someRandomKey">
    <h3>Basic Usage</h3>
    <p>
        Use JSX component in body of static section of filetype that has a filetype of jsx. ExperimentSetMatrix can display multiple sections grouped by <code>sectionKeys</code>. Each section has own query URLs and fields.
        For all type of declarations, it is imperative to supply at least the following 2 props, <code>sectionKeys</code> and <code>queries</code> with which a minimal experiment set matrix can be embedded:
    </p>

    <ul>
        <li key="0"><code>{'sectionKeys={["KEY1", "KEY2", ... etc]}'}</code> - required - A section key is required to distinguish each section, even the matrix consists of only a single section. Most of the props (queries, valueChangeMap, fieldChangeMap, groupingProperties, columnGrouping, headerFor, sectionStyle) is an object whose keys are matching the values defined in <code>sectionKeys</code>.</li>
        <li key="1"><code>{'queries={{"KEY1": {"url": "http://...", "url_fields": ["field1", "field2" ... etc]}, "KEY2": {"url": "http://...", "url_fields": ["field a", "field b" ... etc]}}}'}</code> - required - <code>queries</code> is an object whose keys are matching the values defined in <code>sectionKeys</code>. <code>url</code> field defines the query url, whereas <code>url_fields</code> defines the field to be retrieved.</li>
        <li key="2"><code>{'session={session}'}</code> - This should always be <code>{'session={session}'}</code>, it means to use/pass-in in-code variable <code>session</code>, which is a boolean informing whether end-user is logged in, change of which triggers results refresh.</li>
        <li key="3"><code>{'key="anyRandomTextString"'}</code> - This should always be set to any random string value, it tells React to avoid completely initiating a new instance of this component on extraneous changes, e.g. browser window width. This may be excluded if your component is within a parent/root JSX element that has a <code>key</code> prop, such as this static section.</li>
    </ul>
    <h3>Examples</h3>
    <h4>Single-section Matrix</h4>
    <pre className="border rounded px-3 py-2">{"<ExperimentSetMatrix\r\n    key=\"experiment-set-matrix-1\"  // Required to prevent re-instantiation of component upon window resize & similar.\r\n    session={session}      // Required - hooks in 'session' (boolean) from App.\r\n    sectionKeys={[\"4DN\"]}\r\n    queries={{\r\n        \"4DN\": {\r\n            \"url\": \"https://data.4dnucleome.org/browse/?award.center_title=NOFIC+-+Belmont&experiments_in_set.biosample.biosource_summary=K562+%28Tier+2%29&experiments_in_set.biosample.biosource_summary=HCT116+%28Tier+2%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.experiment_type.display_title=TSA-seq&experiments_in_set.experiment_type.display_title=DamID-seq&experiments_in_set.experiment_type.display_title=2-stage+Repli-seq&status=released&status=released+to+project&limit=all\",\r\n            \"url_fields\": [\r\n                    \"experiments_in_set.experiment_type.display_title\", \"experiments_in_set.biosample.biosource_summary\", \"status\", \"lab.display_title\",\r\n                    \"experiments_in_set.experiment_categorizer.value\", \"experiments_in_set.experiment_categorizer.field\", \"experiments_in_set.display_title\",\r\n                    \"experiments_in_set.accession\", \"experiments_in_set.experiment_type.assay_subclass_short\"\r\n            ]\r\n        }\r\n    }}\r\n    valueChangeMap={{\r\n        \"4DN\" : {\r\n            \"state\" : {\r\n                \"released\" : \"Submitted\",\r\n                \"current\" : \"Submitted\",\r\n                \"released to project\" : \"Internal Release\",\r\n                \"pre-release\" : \"Internal Release\",\r\n                \"in review by lab\" : \"In Submission\",\r\n                \"in review by project\" : \"In Submission\",\r\n                \"submission in progress\" : \"In Submission\",\r\n                \"released to lab\" : \"In Submission\",\r\n                \"to be uploaded by workflow\" : \"Planned\",\r\n                \"planned\" : \"Planned\",\r\n                \"archived\" : \"Out of date\",\r\n                \"revoked\" : \"Out of date\",\r\n                \"deleted\" : \"Deleted\"\r\n            }\r\n        }\r\n    }}\r\n    fieldChangeMap={{\r\n        \"4DN\" : {\r\n            \"experiment_category\" : \"experiments_in_set.experiment_type.display_title\",\r\n            \"experiment_type\"     : \"experiments_in_set.experiment_type.display_title\",\r\n            \"cell_type\"           : \"experiments_in_set.biosample.biosource_summary\",\r\n            \"sub_cat\"             : \"experiments_in_set.experiment_categorizer.value\",\r\n            \"sub_cat_title\"       : 'experiments_in_set.experiment_categorizer.field',\r\n            \"lab_name\"            : 'lab.display_title',\r\n            \"short_description\"   : \"experiments_in_set.display_title\",\r\n            \"state\"               : \"status\"\r\n        }\r\n    }}\r\n    groupingProperties={{\r\n        \"4DN\": [\"experiment_type\", \"sub_cat\"]\r\n    }}\r\n    columnGrouping={{\r\n        \"4DN\": \"cell_type\"\r\n    }}\r\n    headerFor={{\r\n        \"4DN\": (\r\n            <React.Fragment>\r\n                <h3 className=\"mt-2 mb-0 text-300\">4DN</h3>\r\n                <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20, 'height': 20, 'position': 'relative', 'zIndex': 10 }}>\r\n                    <a href=\"https://data.4dnucleome.org/browse/?award.center_title=NOFIC+-+Belmont&experiments_in_set.biosample.biosource_summary=K562+%28Tier+2%29&experiments_in_set.biosample.biosource_summary=HCT116+%28Tier+2%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.experiment_type.display_title=TSA-seq&experiments_in_set.experiment_type.display_title=DamID-seq&experiments_in_set.experiment_type.display_title=2-stage+Repli-seq&status=released&status=released+to+project\">Browse all</a> 4DN data-sets\r\n                </h5>\r\n            </React.Fragment>\r\n        )\r\n    }}\r\n    sectionStyle={{\r\n        \"4DN\": {\r\n            \"sectionClassName\": \"col-md-12\",\r\n            \"rowLabelListingProportion\": \"wide-listing\"\r\n        }\r\n    }}\r\n    titleMap={{\r\n        \"_common_name\"              : \" \",\r\n        \"experiment_type\"           : \"Experiment Type\",\r\n        \"data_source\"               : \"Available through\",\r\n        \"lab_name\"                  : \"Lab\",\r\n        \"experiment_category\"       : \"Category\",\r\n        \"state\"                     : \"Submission Status\",\r\n        \"cell_type\"                 : \"Cell Type\",\r\n        \"short_description\"         : \"Description\",\r\n        \"award\"                     : \"Award\",\r\n        \"accession\"                 : \"Accession\",\r\n        \"number_of_experiments\"     : \"# Experiments in Set\",\r\n        \"submitted_by\"              : \"Submitter\",\r\n        \"experimentset_type\"        : \"Set Type\"\r\n    }}\r\n    headerColumnsOrder={[\"H1-hESC\", \"H1-DE\", \"HFFc6\"]}\r\n    columnSubGroupingOrder={[\"Submitted\", \"In Submission\", \"Planned\", \"Not Planned\"]}\r\n    fallbackNameForBlankField=\"None\"\r\n    statePrioritizationForGroups={[\"Submitted\", \"Internal Release\", \"In Submission\", \"Planned\", \"Out of date\", \"Deleted\"]}\r\n/>"}</pre>
    <p>This generates the following display:</p>
    <ExperimentSetMatrix
        key="experiment-set-matrix-1"  // Required to prevent re-instantiation of component upon window resize & similar.
        session={session}      // Required - hooks in 'session' (boolean) from App.
        sectionKeys={["4DN"]}
        queries={{
            "4DN": {
                "url": "https://data.4dnucleome.org/browse/?award.center_title=NOFIC+-+Belmont&experiments_in_set.biosample.biosource_summary=K562+%28Tier+2%29&experiments_in_set.biosample.biosource_summary=HCT116+%28Tier+2%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.experiment_type.display_title=TSA-seq&experiments_in_set.experiment_type.display_title=DamID-seq&experiments_in_set.experiment_type.display_title=2-stage+Repli-seq&status=released&status=released+to+project&limit=all",
                "url_fields": [
                    "experiments_in_set.experiment_type.display_title", "experiments_in_set.biosample.biosource_summary", "status", "lab.display_title",
                    "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field", "experiments_in_set.display_title",
                    "experiments_in_set.accession", "experiments_in_set.experiment_type.assay_subclass_short"
                ]
            }
        }}
        valueChangeMap={{
            "4DN": {
                "state": {
                    "released": "Submitted",
                    "current": "Submitted",
                    "released to project": "Internal Release",
                    "pre-release": "Internal Release",
                    "in review by lab": "In Submission",
                    "in review by project": "In Submission",
                    "submission in progress": "In Submission",
                    "released to lab": "In Submission",
                    "to be uploaded by workflow": "Planned",
                    "planned": "Planned",
                    "archived": "Out of date",
                    "revoked": "Out of date",
                    "deleted": "Deleted"
                }
            }
        }}
        fieldChangeMap={{
            "4DN": {
                "experiment_category": "experiments_in_set.experiment_type.display_title",
                "experiment_type": "experiments_in_set.experiment_type.display_title",
                "cell_type": "experiments_in_set.biosample.biosource_summary",
                "sub_cat": "experiments_in_set.experiment_categorizer.value",
                "sub_cat_title": 'experiments_in_set.experiment_categorizer.field',
                "lab_name": 'lab.display_title',
                "short_description": "experiments_in_set.display_title",
                "state": "status"
            }
        }}
        groupingProperties={{
            "4DN": ["experiment_type", "sub_cat"]
        }}
        columnGrouping={{
            "4DN": "cell_type"
        }}
        headerFor={{
            "4DN": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">4DN</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20, 'height': 20, 'position': 'relative', 'zIndex': 10 }}>
                        <a href="https://data.4dnucleome.org/browse/?award.center_title=NOFIC+-+Belmont&experiments_in_set.biosample.biosource_summary=K562+%28Tier+2%29&experiments_in_set.biosample.biosource_summary=HCT116+%28Tier+2%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.experiment_type.display_title=TSA-seq&experiments_in_set.experiment_type.display_title=DamID-seq&experiments_in_set.experiment_type.display_title=2-stage+Repli-seq&status=released&status=released+to+project">Browse all</a> 4DN data-sets
                    </h5>
                </React.Fragment>
            )
        }}
        sectionStyle={{
            "4DN": {
                "sectionClassName": "col-md-12",
                "rowLabelListingProportion": "wide-listing"
            }
        }}
        titleMap={{
            "_common_name": " ",
            "experiment_type": "Experiment Type",
            "data_source": "Available through",
            "lab_name": "Lab",
            "experiment_category": "Category",
            "state": "Submission Status",
            "cell_type": "Cell Type",
            "short_description": "Description",
            "award": "Award",
            "accession": "Accession",
            "number_of_experiments": "# Experiments in Set",
            "submitted_by": "Submitter",
            "experimentset_type": "Set Type"
        }}
        headerColumnsOrder={["H1-hESC", "H1-DE", "HFFc6"]}
        columnSubGroupingOrder={["Submitted", "In Submission", "Planned", "Not Planned"]}
        fallbackNameForBlankField="None"
        statePrioritizationForGroups={["Submitted", "Internal Release", "In Submission", "Planned", "Out of date", "Deleted"]}
    />
    <h4>Multi-section Matrix<br /><span className="text-400"><em><small>TLDR;</small></em> <code>{"sectionKeys={['KEY1', 'KEY2' ...etc]}"}</code> for multiple sections</span></h4>
    <pre className="border rounded px-3 py-2">{"<ExperimentSetMatrix\r\n    key=\"experiment-set-matrix-2\"  // Required to prevent re-instantiation of component upon window resize & similar.\r\n    session={session}      // Required - hooks in 'session' (boolean) from App.\r\n    sectionKeys={[\"4DN\",\"ENCODE\"]}\r\n    queries={{\r\n        \"4DN\": {\r\n            \"url\": \"https://data.4dnucleome.org/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFF-hTERT&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29+differentiated+to+definitive+endoderm&experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all\",\r\n            \"url_fields\": [\r\n                    \"experiments_in_set.experiment_type.display_title\", \"experiments_in_set.experiment_type.assay_subclass_short\",\r\n                    \"experiments_in_set.experiment_categorizer.value\", \"experiments_in_set.experiment_categorizer.field\",\r\n                    \"experiments_in_set.display_title\",  \"experiments_in_set.accession\", \"status\",\r\n                    \"lab.display_title\",\r\n                    \"experiments_in_set.biosample.biosource_summary\", \"experiments_in_set.biosample.biosource.cell_line.display_title\", \"experiments_in_set.biosample.biosource.cell_line_tier\"\r\n            ]\r\n        },\r\n        \"ENCODE\": {\r\n            \"url\": \"https://www.encodeproject.org/search/?type=Experiment&biosample_summary=H1&biosample_summary=HFFc6&status!=archived&status!=revoked&limit=all\",\r\n            \"url_fields\": [\"assay_slims\", \"biosample_summary\", \"assay_term_name\", \"description\", \"lab\", \"status\"]\r\n        }\r\n    }}\r\n    valueChangeMap={{\r\n        \"4DN\" : {\r\n            \"cell_type\" : {\r\n                \"H1-hESC (Tier 1) differentiated to definitive endoderm\" : \"H1-DE\",\r\n                \"H1-hESC (Tier 1)\" : \"H1-hESC (4DN)\",\r\n                \"H1-hESC\" : \"H1-hESC (other)\",\r\n                \"HFF-hTERT\" : \"HFF-hTERT\",\r\n                \"HFFc6 (Tier 1)\" : \"HFFc6\"\r\n            },\r\n            \"state\" : {\r\n                \"released\" : \"Submitted\",\r\n                \"current\" : \"Submitted\",\r\n                \"released to project\" : \"Internal Release\",\r\n                \"pre-release\" : \"Internal Release\",\r\n                \"in review by lab\" : \"In Submission\",\r\n                \"in review by project\" : \"In Submission\",\r\n                \"submission in progress\" : \"In Submission\",\r\n                \"released to lab\" : \"In Submission\",\r\n                \"to be uploaded by workflow\" : \"Planned\",\r\n                \"planned\" : \"Planned\",\r\n                \"archived\" : \"Out of date\",\r\n                \"revoked\" : \"Out of date\",\r\n                \"deleted\" : \"Deleted\"\r\n            }\r\n        },\r\n        \"ENCODE\" : {\r\n            \"cell_type\" : {\r\n                \"H1\" : \"H1-hESC (other)\"\r\n            },\r\n            \"state\" : {\r\n                \"released\" : \"Submitted\"\r\n            }\r\n        }\r\n    }}\r\n    fieldChangeMap={{\r\n        \"4DN\" : {\r\n            \"experiment_category\" : \"experiments_in_set.experiment_type.assay_subclass_short\",\r\n            \"experiment_type\"     : \"experiments_in_set.experiment_type.display_title\",\r\n            \"cell_type\"           : \"experiments_in_set.biosample.biosource_summary\",\r\n            \"sub_cat\"             : \"experiments_in_set.experiment_categorizer.value\",\r\n            \"sub_cat_title\"       : 'experiments_in_set.experiment_categorizer.field',\r\n            \"lab_name\"            : 'lab.display_title',\r\n            \"biosource_name\"      : \"experiments_in_set.biosample.biosource.cell_line.display_title\",\r\n            \"cell_line_tier\"      : \"experiments_in_set.biosample.biosource.cell_line_tier\",\r\n            \"state\"               : \"status\"\r\n        },\r\n        \"ENCODE\" : {\r\n            \"experiment_category\" : \"assay_slims\",\r\n            \"experiment_type\"     : \"assay_term_name\",\r\n            \"cell_type\"           : \"biosample_summary\",\r\n            \"state\"               : \"status\"\r\n        }\r\n    }}\r\n    groupingProperties={{\r\n        \"4DN\": [\"experiment_category\", \"experiment_type\"],\r\n        \"ENCODE\": [\"experiment_category\", \"experiment_type\"]\r\n    }}\r\n    columnGrouping={{\r\n        \"4DN\": \"cell_type\",\r\n        \"ENCODE\": \"cell_type\"\r\n    }}\r\n    headerFor={{\r\n        \"4DN\": (\r\n            <React.Fragment>\r\n                <h3 className=\"mt-2 mb-0 text-300\">4DN</h3>\r\n                <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20, 'height': 20, 'position': 'relative', 'zIndex': 10 }}>\r\n                    <a href=\"/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFF-hTERT&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29+differentiated+to+definitive+endoderm&experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN\">Browse all</a> 4DN data-sets\r\n                </h5>\r\n            </React.Fragment>\r\n        ),\r\n        \"ENCODE\": null\r\n    }}\r\n    sectionStyle={{\r\n        \"4DN\": {\r\n            \"sectionClassName\": \"col-md-6\",\r\n            \"rowLabelListingProportion\": \"wide-listing\"\r\n        },\r\n        \"ENCODE\": {\r\n            \"sectionClassName\": \"col-md-6\",\r\n            \"rowLabelListingProportion\": \"wide-listing\"\r\n        }\r\n    }}\r\n    titleMap={{\r\n        \"_common_name\"              : \" \",\r\n        \"experiment_type\"           : \"Experiment Type\",\r\n        \"data_source\"               : \"Available through\",\r\n        \"lab_name\"                  : \"Lab\",\r\n        \"experiment_category\"       : \"Category\",\r\n        \"state\"                     : \"Submission Status\",\r\n        \"cell_type\"                 : \"Cell Type\",\r\n        \"short_description\"         : \"Description\",\r\n        \"award\"                     : \"Award\",\r\n        \"accession\"                 : \"Accession\",\r\n        \"number_of_experiments\"     : \"# Experiments in Set\",\r\n        \"submitted_by\"              : \"Submitter\",\r\n        \"experimentset_type\"        : \"Set Type\",\r\n        \"biosource_name\"            : \"Biosource\",\r\n        \"cell_line_tier\"            : \"Cell Line Tier\",\r\n        \"sub_cat_title\"             : \"Enzyme\",\r\n        \"sub_cat\"                   : \"Target\"\r\n    }}\r\n    headerPadding={80}\r\n    headerColumnsOrder={[\"H1-hESC\", \"H1-hESC (4DN)\", \"H1-hESC (other)\", \"H1-DE\", \"HFFc6\", \"HFF-hTERT\"]}\r\n    columnSubGroupingOrder={[\"Submitted\", \"In Submission\", \"Planned\", \"Not Planned\"]}\r\n    fallbackNameForBlankField=\"None\"\r\n    statePrioritizationForGroups={[\"Submitted\", \"Internal Release\", \"In Submission\", \"Planned\", \"Out of date\", \"Deleted\"]}\r\n />"}</pre>
    <p>This generates the following display:</p>
    <ExperimentSetMatrix
        key="experiment-set-matrix-2"  // Required to prevent re-instantiation of component upon window resize & similar.
        session={session}      // Required - hooks in 'session' (boolean) from App.
        sectionKeys={["4DN", "ENCODE"]}
        queries={{
            "4DN": {
                "url": "https://data.4dnucleome.org/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFF-hTERT&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29+differentiated+to+definitive+endoderm&experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all",
                "url_fields": [
                    "experiments_in_set.experiment_type.display_title", "experiments_in_set.experiment_type.assay_subclass_short",
                    "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field",
                    "experiments_in_set.display_title", "experiments_in_set.accession", "status",
                    "lab.display_title",
                    "experiments_in_set.biosample.biosource_summary", "experiments_in_set.biosample.biosource.cell_line.display_title", "experiments_in_set.biosample.biosource.cell_line_tier"
                ]
            },
            "ENCODE": {
                "url": "https://www.encodeproject.org/search/?type=Experiment&biosample_summary=H1&biosample_summary=HFFc6&status!=archived&status!=revoked&limit=all",
                "url_fields": ["assay_slims", "biosample_summary", "assay_term_name", "description", "lab", "status"]
            }
        }}
        valueChangeMap={{
            "4DN": {
                "cell_type": {
                    "H1-hESC (Tier 1) differentiated to definitive endoderm": "H1-DE",
                    "H1-hESC (Tier 1)": "H1-hESC (4DN)",
                    "H1-hESC": "H1-hESC (other)",
                    "HFF-hTERT": "HFF-hTERT",
                    "HFFc6 (Tier 1)": "HFFc6"
                },
                "state": {
                    "released": "Submitted",
                    "current": "Submitted",
                    "released to project": "Internal Release",
                    "pre-release": "Internal Release",
                    "in review by lab": "In Submission",
                    "in review by project": "In Submission",
                    "submission in progress": "In Submission",
                    "released to lab": "In Submission",
                    "to be uploaded by workflow": "Planned",
                    "planned": "Planned",
                    "archived": "Out of date",
                    "revoked": "Out of date",
                    "deleted": "Deleted"
                }
            },
            "ENCODE": {
                "cell_type": {
                    "H1": "H1-hESC (other)"
                },
                "state": {
                    "released": "Submitted"
                }
            }
        }}
        fieldChangeMap={{
            "4DN": {
                "experiment_category": "experiments_in_set.experiment_type.assay_subclass_short",
                "experiment_type": "experiments_in_set.experiment_type.display_title",
                "cell_type": "experiments_in_set.biosample.biosource_summary",
                "sub_cat": "experiments_in_set.experiment_categorizer.value",
                "sub_cat_title": 'experiments_in_set.experiment_categorizer.field',
                "lab_name": 'lab.display_title',
                "biosource_name": "experiments_in_set.biosample.biosource.cell_line.display_title",
                "cell_line_tier": "experiments_in_set.biosample.biosource.cell_line_tier",
                "state": "status"
            },
            "ENCODE": {
                "experiment_category": "assay_slims",
                "experiment_type": "assay_term_name",
                "cell_type": "biosample_summary",
                "state": "status"
            }
        }}
        groupingProperties={{
            "4DN": ["experiment_category", "experiment_type"],
            "ENCODE": ["experiment_category", "experiment_type"]
        }}
        columnGrouping={{
            "4DN": "cell_type",
            "ENCODE": "cell_type"
        }}
        headerFor={{
            "4DN": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">4DN</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20, 'height': 20, 'position': 'relative', 'zIndex': 10 }}>
                        <a href="https://data.4dnucleome.org/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFF-hTERT&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29+differentiated+to+definitive+endoderm&experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN">Browse all</a> 4DN data-sets
                    </h5>
                </React.Fragment>
            ),
            "ENCODE": null
        }}
        sectionStyle={{
            "4DN": {
                "sectionClassName": "col-md-6",
                "rowLabelListingProportion": "wide-listing"
            },
            "ENCODE": {
                "sectionClassName": "col-md-6",
                "rowLabelListingProportion": "wide-listing"
            }
        }}
        titleMap={{
            "_common_name": " ",
            "experiment_type": "Experiment Type",
            "data_source": "Available through",
            "lab_name": "Lab",
            "experiment_category": "Category",
            "state": "Submission Status",
            "cell_type": "Cell Type",
            "short_description": "Description",
            "award": "Award",
            "accession": "Accession",
            "number_of_experiments": "# Experiments in Set",
            "submitted_by": "Submitter",
            "experimentset_type": "Set Type",
            "biosource_name": "Biosource",
            "cell_line_tier": "Cell Line Tier",
            "sub_cat_title": "Enzyme",
            "sub_cat": "Target"
        }}
        headerPadding={80}
        headerColumnsOrder={["H1-hESC", "H1-hESC (4DN)", "H1-hESC (other)", "H1-DE", "HFFc6", "HFF-hTERT"]}
        columnSubGroupingOrder={["Submitted", "In Submission", "Planned", "Not Planned"]}
        fallbackNameForBlankField="None"
        statePrioritizationForGroups={["Submitted", "Internal Release", "In Submission", "Planned", "Out of date", "Deleted"]}
    />
</div>