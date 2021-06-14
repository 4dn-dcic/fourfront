<div key="someRandomKey">
    <h3>Basic Usage</h3>
    <p>
        Use a JSX component in the body of a static section that has a filetype of jsx - set the File Type to jsx in the options of the static section. An ExperimentSetMatrix can display multiple sections grouped by <code>sectionKeys</code>. Each section has its own query URLs and fields.
        For any declaration, it is imperative to supply the <strong>required</strong> props listed below which a minimal experiment set matrix can be embedded:
    </p>

    <ul>
        <li key="0"><code>{'key="anyRandomTextString"'}</code> - This should always be set to any random string value, it tells React to avoid completely initiating a new instance of this component on extraneous changes, e.g. browser window width. This may be excluded if your component is within a parent/root JSX element that has a <code>key</code> prop, such as this static section.</li>
        <li key="1"><code>{'session={session}'}</code> - <strong>required</strong> - This should always be <code>{'session={session}'}</code>, it means to use/pass-in in-code variable <code>session</code>, which is a boolean informing whether end-user is logged in, change of which triggers results refresh.</li>
        <li key="2"><code>{'sectionKeys={[KEY1, KEY2, ... etc]}'}</code> - <strong>required</strong> - A section key is required to distinguish each section, even if the matrix consists of only a single section. The value of the key is used to map configuration properties to the correct section.  As shown in the examples, objects are configured (queries, valueChangeMap, fieldChangeMap, groupingProperties, columnGrouping, headerFor, sectionStylel) and keyed by a value in the <code>sectionKeys</code>.</li>
        <li key="3"><code>{'queries={{KEY1: {"url": "/browse/?...", "url_fields": [field1_1, field1_2 ... etc]}, KEY2: {"url": "http://...", "url_fields": [field2_1, field2_2 ... etc]}}}'}</code> - <strong>required</strong> - is an object mapped to a <code>sectionKey</code>. The <code>url</code> field defines the query url, and <code>url_fields</code> specifies the specific fields to be returned from the search result.</li>
        <li key="4"><code>{'valueChangeMap={{KEY1: {field_name1: {actual_value1_1: substitute_value1_1, actual_value1_2: substitute_value1_2 ...}, field_name2: {actual_value2_1: substitute_value2_1, actual_value2_2: substitute_value2_2 ...}}, KEY2: ... }}'}</code> - is an object mapped to a <code>sectionKey</code>. Define substitute values to replace the actual values for a specific field in the section.</li>
        <li key="5"><code>{'fieldChangeMap={{KEY1: {short_name1: field_in_object_dot_notation1, short_name2: field_in_object_dot_notation2 ...}, KEY2: ... }}'}</code> - is an object mapped to a <code>sectionKey</code>. Define abbreviated field names to replace (long) field names in object dot notation.</li>
        <li key="6"><code>{'groupingProperties={{KEY1: [field1_1, field1_2 ...], KEY2:  [field2_1, field2_2 ...] ... etc}}'}</code> - <strong>required</strong> - is an object mapped to a <code>sectionKey</code>. Define one or more fields for grouping the rows.</li>
        <li key="7"><code>{'columnGrouping={{KEY1: field1, KEY2: field2 ... etc}}'}</code> - <strong>required</strong> - is an object mapped to a <code>sectionKey</code>. Define a field for grouping the columns.</li>
        <li key="8"><code>{'headerFor={{KEY1: string or react jsx element, KEY2: ... etc}}'}</code> - is an object mapped to a <code>sectionKey</code>. Define a custom title for the section; string or a custom React JSX element is acceptable.</li>
        <li key="9"><code>{'sectionStyle={{KEY1: {"sectionClassName": class_name, "rowLabelListingProportion": one of "wide-label", "wide-listing", "balanced"}, KEY2: .. etc}}'}</code> - is an object mapped to a <code>sectionKey</code>. The <code>sectionClassName</code> field defines the css class name for the section&apos;s container, and <code>rowLabelListingProportion</code> defines the label to count boxes ratio. (&quot;wide-label&quot;: label to listing ratio is 2:1, &quot;wide-listing&quot;: label to listing ratio is 1:2, &quot;balanced&quot;: label to listing ratio is 1:1)</li>
        <li key="10"><code>{'titleMap={{field_name:field_title, ... etc}}'}</code> - the titles to be displayed instead of the field name in the popover.</li>
        <li key="11"><code>{'headerColumnsOrder={[column1, column2, ...]}'}</code> - the display order of the colsumns by column header.</li>
        <li key="12"><code>{'columnSubGroupingOrder={[state1, state2, ...]}'}</code> - the display order of the count blocks by state.</li>
        <li key="13"><code>{'fallbackNameForBlankField={string}'}</code> - fallback text for null or undefined values.</li>
        <li key="14"><code>{'statePrioritizationForGroups={[state1, state2, etc...]}'}</code> - array of states to be prioritized by custom css styles. (count of non-matching states will be displayed as transparent box.)</li>
        <li key="15"><code>{'additionalData={{KEY1: [{"count": data_count, grouping_field1: value_for_field1_in_groupingProperties, grouping_field2: value_for_field2_in_groupingProperties, column_field: value_for_field_in_columnGrouping, "state": value ...}], KEY2: ... }}'}</code> - is an object mapped to a <code>sectionKey</code>. Additional data is to represent planned data in matrix. Define values for <strong>count, state</strong> and the fields listed in <strong>groupingProperties</strong> and <strong>columnGrouping</strong> and other fields to be displayed in popover.</li>
    </ul>
    <h3>Examples</h3>
    <h4>1. Single-section Matrix</h4>
    <p>A single-section matrix having <code>4DN</code> as section key. Please refer to <strong>Configuration</strong> for more details.</p>
    <ExperimentSetMatrix
        key="experiment-set-matrix-1"  // Required to prevent re-instantiation of component upon window resize & similar.
        session={session}      // Required - hooks in 'session' (boolean) from App.
        sectionKeys={["4DN"]}
        queries={{
            "4DN": {
                "url": "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all",
                "url_fields": [
                    "experiments_in_set.experiment_type.display_title", "status", "lab.display_title",
                    "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field",
                    "experiments_in_set.display_title",
                    "experiments_in_set.accession", "experiments_in_set.experiment_type.assay_classification"
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
                },
                "assay_classification": {
                    "Linear DNA Enrichment": "Linear DNA En.",
                    "Fluorescence Localization": "Fluor. Localization"
                }
            }
        }}
        fieldChangeMap={{
            "4DN": {
                "assay_classification": "experiments_in_set.experiment_type.assay_classification",
                "experiment_type": "experiments_in_set.experiment_type.display_title",
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
            "4DN": "assay_classification"
        }}
        headerFor={{
            "4DN": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">4DN</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20 }}>
                        <a href="/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN">Browse all</a> 4DN data-sets
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
        headerColumnsOrder={["3C via Ligation", "Fluor. Localization", "Linear DNA En."]}
        columnSubGroupingOrder={["Submitted", "In Submission", "Planned", "Not Planned"]}
        fallbackNameForBlankField="None"
        statePrioritizationForGroups={["Submitted", "Internal Release", "In Submission", "Planned", "Out of date", "Deleted"]}
    />
    <a name="example-1"></a>
    <h5>Configuration:</h5>
    <pre className="border rounded px-3 py-2">{"<ExperimentSetMatrix\r\n        key=\"experiment-set-matrix-1\"  // Required to prevent re-instantiation of component upon window resize & similar.\r\n        session={session}      // Required - hooks in 'session' (boolean) from App.\r\n        sectionKeys={[\"4DN\"]}\r\n        queries={{\r\n            \"4DN\": {\r\n                \"url\": \"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all\",\r\n                \"url_fields\": [\r\n                    \"experiments_in_set.experiment_type.display_title\", \"status\", \"lab.display_title\",\r\n                    \"experiments_in_set.experiment_categorizer.value\", \"experiments_in_set.experiment_categorizer.field\",\r\n                    \"experiments_in_set.display_title\",\r\n                    \"experiments_in_set.accession\", \"experiments_in_set.experiment_type.assay_classification\"\r\n                ]\r\n            }\r\n        }}\r\n        valueChangeMap={{\r\n            \"4DN\": {\r\n                \"state\": {\r\n                    \"released\": \"Submitted\",\r\n                    \"current\": \"Submitted\",\r\n                    \"released to project\": \"Internal Release\",\r\n                    \"pre-release\": \"Internal Release\",\r\n                    \"in review by lab\": \"In Submission\",\r\n                    \"in review by project\": \"In Submission\",\r\n                    \"submission in progress\": \"In Submission\",\r\n                    \"released to lab\": \"In Submission\",\r\n                    \"to be uploaded by workflow\": \"Planned\",\r\n                    \"planned\": \"Planned\",\r\n                    \"archived\": \"Out of date\",\r\n                    \"revoked\": \"Out of date\",\r\n                    \"deleted\": \"Deleted\"\r\n                },\r\n                \"assay_classification\": {\r\n                    \"Linear DNA Enrichment\": \"Linear DNA En.\",\r\n                    \"Fluorescence Localization\": \"Fluor. Localization\"\r\n                }\r\n            }\r\n        }}\r\n        fieldChangeMap={{\r\n            \"4DN\": {\r\n                \"assay_classification\": \"experiments_in_set.experiment_type.assay_classification\",\r\n                \"experiment_type\": \"experiments_in_set.experiment_type.display_title\",\r\n                \"sub_cat\": \"experiments_in_set.experiment_categorizer.value\",\r\n                \"sub_cat_title\": 'experiments_in_set.experiment_categorizer.field',\r\n                \"lab_name\": 'lab.display_title',\r\n                \"short_description\": \"experiments_in_set.display_title\",\r\n                \"state\": \"status\"\r\n            }\r\n        }}\r\n        groupingProperties={{\r\n            \"4DN\": [\"experiment_type\", \"sub_cat\"]\r\n        }}\r\n        columnGrouping={{\r\n            \"4DN\": \"assay_classification\"\r\n        }}\r\n        headerFor={{\r\n            \"4DN\": (\r\n                <React.Fragment>\r\n                    <h3 className=\"mt-2 mb-0 text-300\">4DN</h3>\r\n                    <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20 }}>\r\n                        <a href=\"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN\">Browse all</a> 4DN data-sets\r\n                    </h5>\r\n                </React.Fragment>\r\n            )\r\n        }}\r\n        sectionStyle={{\r\n            \"4DN\": {\r\n                \"sectionClassName\": \"col-md-12\",\r\n                \"rowLabelListingProportion\": \"wide-listing\"\r\n            }\r\n        }}\r\n        titleMap={{\r\n            \"_common_name\": \" \",\r\n            \"experiment_type\": \"Experiment Type\",\r\n            \"data_source\": \"Available through\",\r\n            \"lab_name\": \"Lab\",\r\n            \"experiment_category\": \"Category\",\r\n            \"state\": \"Submission Status\",\r\n            \"cell_type\": \"Cell Type\",\r\n            \"short_description\": \"Description\",\r\n            \"award\": \"Award\",\r\n            \"accession\": \"Accession\",\r\n            \"number_of_experiments\": \"# Experiments in Set\",\r\n            \"submitted_by\": \"Submitter\",\r\n            \"experimentset_type\": \"Set Type\"\r\n        }}\r\n        headerColumnsOrder={[\"3C via Ligation\", \"Fluor. Localization\", \"Linear DNA En.\"]}\r\n        columnSubGroupingOrder={[\"Submitted\", \"In Submission\", \"Planned\", \"Not Planned\"]}\r\n        fallbackNameForBlankField=\"None\"\r\n        statePrioritizationForGroups={[\"Submitted\", \"Internal Release\", \"In Submission\", \"Planned\", \"Out of date\", \"Deleted\"]}\r\n    />"}</pre>
    <h4>2. Multi-section Matrix</h4>
    <p>A double section-matrix having <code>4DN</code> and <code>EXT</code> as section keys with respectively. Please refer to <strong>Configuration</strong> for more details.</p>
    <ExperimentSetMatrix
        key="experiment-set-matrix-2"  // Required to prevent re-instantiation of component upon window resize & similar.
        session={session}      // Required - hooks in 'session' (boolean) from App.
        sectionKeys={["4DN", "EXT"]}
        queries={{
            "4DN": {
                "url": "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all",
                "url_fields": [
                    "experiments_in_set.experiment_type.display_title", "status", "lab.display_title",
                    "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field",
                    "experiments_in_set.display_title",
                    "experiments_in_set.accession", "experiments_in_set.experiment_type.assay_classification"
                ]
            },
            "EXT": {
                "url": "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project!=4DN&limit=all",
                "url_fields": [
                    "experiments_in_set.experiment_type.display_title", "status", "lab.display_title",
                    "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field",
                    "experiments_in_set.display_title",
                    "experiments_in_set.accession", "experiments_in_set.experiment_type.assay_classification"
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
                },
                "assay_classification": {
                    "Linear DNA Enrichment": "Linear DNA En.",
                    "Fluorescence Localization": "Fluor. Localization"
                }
            },
            "EXT": {
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
                },
                "assay_classification": {
                    "Linear DNA Enrichment": "Linear DNA En.",
                    "Fluorescence Localization": "Fluor. Localization"
                }
            }
        }}
        fieldChangeMap={{
            "4DN": {
                "assay_classification": "experiments_in_set.experiment_type.assay_classification",
                "experiment_type": "experiments_in_set.experiment_type.display_title",
                "sub_cat": "experiments_in_set.experiment_categorizer.value",
                "sub_cat_title": 'experiments_in_set.experiment_categorizer.field',
                "lab_name": 'lab.display_title',
                "short_description": "experiments_in_set.display_title",
                "state": "status"
            },
            "EXT": {
                "assay_classification": "experiments_in_set.experiment_type.assay_classification",
                "experiment_type": "experiments_in_set.experiment_type.display_title",
                "sub_cat": "experiments_in_set.experiment_categorizer.value",
                "sub_cat_title": 'experiments_in_set.experiment_categorizer.field',
                "lab_name": 'lab.display_title',
                "short_description": "experiments_in_set.display_title",
                "state": "status"
            }
        }}
        groupingProperties={{
            "4DN": ["experiment_type", "sub_cat"],
            "EXT": ["experiment_type", "sub_cat"],
        }}
        columnGrouping={{
            "4DN": "assay_classification",
            "EXT": "assay_classification"
        }}
        headerFor={{
            "4DN": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">4DN</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20 }}>
                        <a href="/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN">Browse all</a> 4DN data-sets
                    </h5>
                </React.Fragment>
            ),
            "EXT": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">External</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20 }}>
                        <a href="/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project!=4DN">Browse all</a> external data-sets
                    </h5>
                </React.Fragment>
            )
        }}
        sectionStyle={{
            "4DN": {
                "sectionClassName": "col-md-6",
                "rowLabelListingProportion": "wide-listing"
            },
            "EXT": {
                "sectionClassName": "col-md-6",
                "rowLabelListingProportion": "wide-label"
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
        headerColumnsOrder={["3C via Ligation", "Fluor. Localization", "Linear DNA En."]}
        columnSubGroupingOrder={["Submitted", "In Submission", "Planned", "Not Planned"]}
        fallbackNameForBlankField="None"
        statePrioritizationForGroups={["Submitted", "Internal Release", "In Submission", "Planned", "Out of date", "Deleted"]}
    />
    <h5>Configuration:</h5>
    <pre className="border rounded px-3 py-2">{"<ExperimentSetMatrix\r\n        key=\"experiment-set-matrix-2\"  // Required to prevent re-instantiation of component upon window resize & similar.\r\n        session={session}      // Required - hooks in 'session' (boolean) from App.\r\n        sectionKeys={[\"4DN\",\"EXT\"]}\r\n        queries={{\r\n            \"4DN\": {\r\n                \"url\": \"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all\",\r\n                \"url_fields\": [\r\n                    \"experiments_in_set.experiment_type.display_title\", \"status\", \"lab.display_title\",\r\n                    \"experiments_in_set.experiment_categorizer.value\", \"experiments_in_set.experiment_categorizer.field\",\r\n                    \"experiments_in_set.display_title\",\r\n                    \"experiments_in_set.accession\", \"experiments_in_set.experiment_type.assay_classification\"\r\n                ]\r\n            },\r\n            \"EXT\": {\r\n                \"url\": \"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project!=4DN&limit=all\",\r\n                \"url_fields\": [\r\n                    \"experiments_in_set.experiment_type.display_title\", \"status\", \"lab.display_title\",\r\n                    \"experiments_in_set.experiment_categorizer.value\", \"experiments_in_set.experiment_categorizer.field\",\r\n                    \"experiments_in_set.display_title\",\r\n                    \"experiments_in_set.accession\", \"experiments_in_set.experiment_type.assay_classification\"\r\n                ]\r\n            }\r\n        }}\r\n        valueChangeMap={{\r\n            \"4DN\": {\r\n                \"state\": {\r\n                    \"released\": \"Submitted\",\r\n                    \"current\": \"Submitted\",\r\n                    \"released to project\": \"Internal Release\",\r\n                    \"pre-release\": \"Internal Release\",\r\n                    \"in review by lab\": \"In Submission\",\r\n                    \"in review by project\": \"In Submission\",\r\n                    \"submission in progress\": \"In Submission\",\r\n                    \"released to lab\": \"In Submission\",\r\n                    \"to be uploaded by workflow\": \"Planned\",\r\n                    \"planned\": \"Planned\",\r\n                    \"archived\": \"Out of date\",\r\n                    \"revoked\": \"Out of date\",\r\n                    \"deleted\": \"Deleted\"\r\n                },\r\n                \"assay_classification\": {\r\n                    \"Linear DNA Enrichment\": \"Linear DNA En.\",\r\n                    \"Fluorescence Localization\": \"Fluor. Localization\"\r\n                }\r\n            },\r\n            \"EXT\": {\r\n                \"state\": {\r\n                    \"released\": \"Submitted\",\r\n                    \"current\": \"Submitted\",\r\n                    \"released to project\": \"Internal Release\",\r\n                    \"pre-release\": \"Internal Release\",\r\n                    \"in review by lab\": \"In Submission\",\r\n                    \"in review by project\": \"In Submission\",\r\n                    \"submission in progress\": \"In Submission\",\r\n                    \"released to lab\": \"In Submission\",\r\n                    \"to be uploaded by workflow\": \"Planned\",\r\n                    \"planned\": \"Planned\",\r\n                    \"archived\": \"Out of date\",\r\n                    \"revoked\": \"Out of date\",\r\n                    \"deleted\": \"Deleted\"\r\n                },\r\n                \"assay_classification\": {\r\n                    \"Linear DNA Enrichment\": \"Linear DNA En.\",\r\n                    \"Fluorescence Localization\": \"Fluor. Localization\"\r\n                }\r\n            }\r\n        }}\r\n        fieldChangeMap={{\r\n            \"4DN\": {\r\n                \"assay_classification\": \"experiments_in_set.experiment_type.assay_classification\",\r\n                \"experiment_type\": \"experiments_in_set.experiment_type.display_title\",\r\n                \"sub_cat\": \"experiments_in_set.experiment_categorizer.value\",\r\n                \"sub_cat_title\": 'experiments_in_set.experiment_categorizer.field',\r\n                \"lab_name\": 'lab.display_title',\r\n                \"short_description\": \"experiments_in_set.display_title\",\r\n                \"state\": \"status\"\r\n            },\r\n            \"EXT\": {\r\n                \"assay_classification\": \"experiments_in_set.experiment_type.assay_classification\",\r\n                \"experiment_type\": \"experiments_in_set.experiment_type.display_title\",\r\n                \"sub_cat\": \"experiments_in_set.experiment_categorizer.value\",\r\n                \"sub_cat_title\": 'experiments_in_set.experiment_categorizer.field',\r\n                \"lab_name\": 'lab.display_title',\r\n                \"short_description\": \"experiments_in_set.display_title\",\r\n                \"state\": \"status\"\r\n            }\r\n        }}\r\n        groupingProperties={{\r\n            \"4DN\": [\"experiment_type\", \"sub_cat\"],\r\n            \"EXT\": [\"experiment_type\", \"sub_cat\"],\r\n        }}\r\n        columnGrouping={{\r\n            \"4DN\": \"assay_classification\",\r\n            \"EXT\": \"assay_classification\"\r\n        }}\r\n        headerFor={{\r\n            \"4DN\": (\r\n                <React.Fragment>\r\n                    <h3 className=\"mt-2 mb-0 text-300\">4DN</h3>\r\n                    <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20 }}>\r\n                        <a href=\"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN\">Browse all</a> 4DN data-sets\r\n                    </h5>\r\n                </React.Fragment>\r\n            ),\r\n            \"EXT\": (\r\n                <React.Fragment>\r\n                    <h3 className=\"mt-2 mb-0 text-300\">External</h3>\r\n                    <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20 }}>\r\n                        <a href=\"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project!=4DN\">Browse all</a> external data-sets\r\n                    </h5>\r\n                </React.Fragment>\r\n            )\r\n        }}\r\n        sectionStyle={{\r\n            \"4DN\": {\r\n                \"sectionClassName\": \"col-md-6\",\r\n                \"rowLabelListingProportion\": \"wide-listing\"\r\n            },\r\n            \"EXT\": {\r\n                \"sectionClassName\": \"col-md-6\",\r\n                \"rowLabelListingProportion\": \"wide-label\"\r\n            }\r\n        }}\r\n        titleMap={{\r\n            \"_common_name\": \" \",\r\n            \"experiment_type\": \"Experiment Type\",\r\n            \"data_source\": \"Available through\",\r\n            \"lab_name\": \"Lab\",\r\n            \"experiment_category\": \"Category\",\r\n            \"state\": \"Submission Status\",\r\n            \"cell_type\": \"Cell Type\",\r\n            \"short_description\": \"Description\",\r\n            \"award\": \"Award\",\r\n            \"accession\": \"Accession\",\r\n            \"number_of_experiments\": \"# Experiments in Set\",\r\n            \"submitted_by\": \"Submitter\",\r\n            \"experimentset_type\": \"Set Type\"\r\n        }}\r\n        headerColumnsOrder={[\"3C via Ligation\", \"Fluor. Localization\", \"Linear DNA En.\"]}\r\n        columnSubGroupingOrder={[\"Submitted\", \"In Submission\", \"Planned\", \"Not Planned\"]}\r\n        fallbackNameForBlankField=\"None\"\r\n        statePrioritizationForGroups={[\"Submitted\", \"Internal Release\", \"In Submission\", \"Planned\", \"Out of date\", \"Deleted\"]}\r\n    />"}</pre>
    <h4>3. Additional Data</h4>
    <p>A double section-matrix having <code>4DN</code> and <code>AD</code> as section keys with respectively. The box with 99 on it comes from the additionalData prop. Please refer to <strong>Configuration</strong> for more details.</p>
    <ExperimentSetMatrix
        key="experiment-set-matrix-3"  // Required to prevent re-instantiation of component upon window resize & similar.
        session={session}      // Required - hooks in 'session' (boolean) from App.
        sectionKeys={["4DN", "AD"]}
        queries={{
            "4DN": {
                "url": "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all",
                "url_fields": [
                    "experiments_in_set.experiment_type.display_title", "status", "lab.display_title",
                    "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field",
                    "experiments_in_set.display_title",
                    "experiments_in_set.accession", "experiments_in_set.experiment_type.assay_classification"
                ]
            },
            "AD": {
                "url": "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all",
                "url_fields": [
                    "experiments_in_set.experiment_type.display_title", "status", "lab.display_title",
                    "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field",
                    "experiments_in_set.display_title",
                    "experiments_in_set.accession", "experiments_in_set.experiment_type.assay_classification"
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
                },
                "assay_classification": {
                    "Linear DNA Enrichment": "Linear DNA En.",
                    "Fluorescence Localization": "Fluor. Localization"
                }
            },
            "AD": {
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
                },
                "assay_classification": {
                    "Linear DNA Enrichment": "Linear DNA En.",
                    "Fluorescence Localization": "Fluor. Localization"
                }
            }
        }}
        fieldChangeMap={{
            "4DN": {
                "assay_classification": "experiments_in_set.experiment_type.assay_classification",
                "experiment_type": "experiments_in_set.experiment_type.display_title",
                "sub_cat": "experiments_in_set.experiment_categorizer.value",
                "sub_cat_title": 'experiments_in_set.experiment_categorizer.field',
                "lab_name": 'lab.display_title',
                "short_description": "experiments_in_set.display_title",
                "state": "status"
            },
            "AD": {
                "assay_classification": "experiments_in_set.experiment_type.assay_classification",
                "experiment_type": "experiments_in_set.experiment_type.display_title",
                "sub_cat": "experiments_in_set.experiment_categorizer.value",
                "sub_cat_title": 'experiments_in_set.experiment_categorizer.field',
                "lab_name": 'lab.display_title',
                "short_description": "experiments_in_set.display_title",
                "state": "status"
            }
        }}
        groupingProperties={{
            "4DN": ["experiment_type", "sub_cat"],
            "AD": ["experiment_type", "sub_cat"],
        }}
        columnGrouping={{
            "4DN": "assay_classification",
            "AD": "assay_classification"
        }}
        headerFor={{
            "4DN": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">4DN</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20 }}>
                        <a href="/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN">Browse all</a> 4DN data-sets
                    </h5>
                </React.Fragment>
            ),
            "AD": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">4DN w/ Additional Data</h3>
                </React.Fragment>
            )
        }}
        sectionStyle={{
            "4DN": {
                "sectionClassName": "col-md-6",
                "rowLabelListingProportion": "wide-listing"
            },
            "AD": {
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
            "experimentset_type": "Set Type"
        }}
        headerColumnsOrder={["3C via Ligation", "Fluor. Localization", "Linear DNA En."]}
        columnSubGroupingOrder={["Submitted", "In Submission", "Planned", "Not Planned"]}
        fallbackNameForBlankField="None"
        statePrioritizationForGroups={["Submitted", "Internal Release", "In Submission", "Planned", "Out of date", "Deleted"]}
        additionalData={{
            "AD": [
                {
                    count: 99,
                    "experiment_type": "Exp. Type - AD",
                    "sub_cat": "Exp. Cat - AD",
                    "assay_classification": "Assay Cl. - AD",
                    "data_source": "4DN - Additional Data",
                    "state": "Submitted",
                    "short_description": "description for additional data"
                }
            ]
        }}
    />
    <h5>Configuration:</h5>
    <pre className="border rounded px-3 py-2">{"<ExperimentSetMatrix\r\n        key=\"experiment-set-matrix-3\"  // Required to prevent re-instantiation of component upon window resize & similar.\r\n        session={session}      // Required - hooks in 'session' (boolean) from App.\r\n        sectionKeys={[\"4DN\",\"AD\"]}\r\n        queries={{\r\n            \"4DN\": {\r\n                \"url\": \"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all\",\r\n                \"url_fields\": [\r\n                    \"experiments_in_set.experiment_type.display_title\", \"status\", \"lab.display_title\",\r\n                    \"experiments_in_set.experiment_categorizer.value\", \"experiments_in_set.experiment_categorizer.field\",\r\n                    \"experiments_in_set.display_title\",\r\n                    \"experiments_in_set.accession\", \"experiments_in_set.experiment_type.assay_classification\"\r\n                ]\r\n            },\r\n            \"AD\": {\r\n                \"url\": \"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all\",\r\n                \"url_fields\": [\r\n                    \"experiments_in_set.experiment_type.display_title\", \"status\", \"lab.display_title\",\r\n                    \"experiments_in_set.experiment_categorizer.value\", \"experiments_in_set.experiment_categorizer.field\",\r\n                    \"experiments_in_set.display_title\",\r\n                    \"experiments_in_set.accession\", \"experiments_in_set.experiment_type.assay_classification\"\r\n                ]\r\n            }\r\n        }}\r\n        valueChangeMap={{\r\n            \"4DN\": {\r\n                \"state\": {\r\n                    \"released\": \"Submitted\",\r\n                    \"current\": \"Submitted\",\r\n                    \"released to project\": \"Internal Release\",\r\n                    \"pre-release\": \"Internal Release\",\r\n                    \"in review by lab\": \"In Submission\",\r\n                    \"in review by project\": \"In Submission\",\r\n                    \"submission in progress\": \"In Submission\",\r\n                    \"released to lab\": \"In Submission\",\r\n                    \"to be uploaded by workflow\": \"Planned\",\r\n                    \"planned\": \"Planned\",\r\n                    \"archived\": \"Out of date\",\r\n                    \"revoked\": \"Out of date\",\r\n                    \"deleted\": \"Deleted\"\r\n                },\r\n                \"assay_classification\": {\r\n                    \"Linear DNA Enrichment\": \"Linear DNA En.\",\r\n                    \"Fluorescence Localization\": \"Fluor. Localization\"\r\n                }\r\n            },\r\n            \"AD\": {\r\n                \"state\": {\r\n                    \"released\": \"Submitted\",\r\n                    \"current\": \"Submitted\",\r\n                    \"released to project\": \"Internal Release\",\r\n                    \"pre-release\": \"Internal Release\",\r\n                    \"in review by lab\": \"In Submission\",\r\n                    \"in review by project\": \"In Submission\",\r\n                    \"submission in progress\": \"In Submission\",\r\n                    \"released to lab\": \"In Submission\",\r\n                    \"to be uploaded by workflow\": \"Planned\",\r\n                    \"planned\": \"Planned\",\r\n                    \"archived\": \"Out of date\",\r\n                    \"revoked\": \"Out of date\",\r\n                    \"deleted\": \"Deleted\"\r\n                },\r\n                \"assay_classification\": {\r\n                    \"Linear DNA Enrichment\": \"Linear DNA En.\",\r\n                    \"Fluorescence Localization\": \"Fluor. Localization\"\r\n                }\r\n            }\r\n        }}\r\n        fieldChangeMap={{\r\n            \"4DN\": {\r\n                \"assay_classification\": \"experiments_in_set.experiment_type.assay_classification\",\r\n                \"experiment_type\": \"experiments_in_set.experiment_type.display_title\",\r\n                \"sub_cat\": \"experiments_in_set.experiment_categorizer.value\",\r\n                \"sub_cat_title\": 'experiments_in_set.experiment_categorizer.field',\r\n                \"lab_name\": 'lab.display_title',\r\n                \"short_description\": \"experiments_in_set.display_title\",\r\n                \"state\": \"status\"\r\n            },\r\n            \"AD\": {\r\n                \"assay_classification\": \"experiments_in_set.experiment_type.assay_classification\",\r\n                \"experiment_type\": \"experiments_in_set.experiment_type.display_title\",\r\n                \"sub_cat\": \"experiments_in_set.experiment_categorizer.value\",\r\n                \"sub_cat_title\": 'experiments_in_set.experiment_categorizer.field',\r\n                \"lab_name\": 'lab.display_title',\r\n                \"short_description\": \"experiments_in_set.display_title\",\r\n                \"state\": \"status\"\r\n            }\r\n        }}\r\n        groupingProperties={{\r\n            \"4DN\": [\"experiment_type\", \"sub_cat\"],\r\n            \"AD\": [\"experiment_type\", \"sub_cat\"],\r\n        }}\r\n        columnGrouping={{\r\n            \"4DN\": \"assay_classification\",\r\n            \"AD\": \"assay_classification\"\r\n        }}\r\n        headerFor={{\r\n            \"4DN\": (\r\n                <React.Fragment>\r\n                    <h3 className=\"mt-2 mb-0 text-300\">4DN</h3>\r\n                    <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20 }}>\r\n                        <a href=\"/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN\">Browse all</a> 4DN data-sets\r\n                    </h5>\r\n                </React.Fragment>\r\n            ),\r\n            \"AD\": (\r\n                <React.Fragment>\r\n                    <h3 className=\"mt-2 mb-0 text-300\">4DN w/ Additional Data</h3>\r\n                </React.Fragment>\r\n            )\r\n        }}\r\n        sectionStyle={{\r\n            \"4DN\": {\r\n                \"sectionClassName\": \"col-md-6\",\r\n                \"rowLabelListingProportion\": \"wide-listing\"\r\n            },\r\n            \"AD\": {\r\n                \"sectionClassName\": \"col-md-6\",\r\n                \"rowLabelListingProportion\": \"wide-listing\"\r\n            }\r\n        }}\r\n        titleMap={{\r\n            \"_common_name\": \" \",\r\n            \"experiment_type\": \"Experiment Type\",\r\n            \"data_source\": \"Available through\",\r\n            \"lab_name\": \"Lab\",\r\n            \"experiment_category\": \"Category\",\r\n            \"state\": \"Submission Status\",\r\n            \"cell_type\": \"Cell Type\",\r\n            \"short_description\": \"Description\",\r\n            \"award\": \"Award\",\r\n            \"accession\": \"Accession\",\r\n            \"number_of_experiments\": \"# Experiments in Set\",\r\n            \"submitted_by\": \"Submitter\",\r\n            \"experimentset_type\": \"Set Type\"\r\n        }}\r\n        headerColumnsOrder={[\"3C via Ligation\", \"Fluor. Localization\", \"Linear DNA En.\"]}\r\n        columnSubGroupingOrder={[\"Submitted\", \"In Submission\", \"Planned\", \"Not Planned\"]}\r\n        fallbackNameForBlankField=\"None\"\r\n        statePrioritizationForGroups={[\"Submitted\", \"Internal Release\", \"In Submission\", \"Planned\", \"Out of date\", \"Deleted\"]}\r\n        additionalData={{\r\n            \"AD\": [\r\n                {\r\n                    count: 99,\r\n                    \"experiment_type\": \"Exp. Type - AD\",\r\n                    \"sub_cat\": \"Exp. Cat - AD\",\r\n                    \"assay_classification\": \"Assay Cl. - AD\",\r\n                    \"data_source\": \"4DN - Additional Data\",\r\n                    \"state\": \"Submitted\",\r\n                    \"short_description\": \"description for additional data\"\r\n                }\r\n            ]\r\n        }}\r\n    />"}</pre>
    <h4>4. External Data Sources</h4>
    <p>A multi section-matrix bound to external data sources and having <code>4DN</code>, <code>ENCODE</code> and <code>ENCODE-IMP</code> as section keys with respectively. Here, both 4DN and Encode&quot;s <code>queries.url</code> properties are full-path instead of the relative path of the previous examples. Please refer to <strong>Configuration</strong> for more details.</p>
    <ExperimentSetMatrix
        key="experiment-set-matrix-4"  // Required to prevent re-instantiation of component upon window resize & similar.
        session={session}              // Required - hooks in 'session' (boolean) from App.
        sectionKeys={["4DN", "ENCODE", "ENCODE-IMP"]}
        queries={{
            "4DN": {
                "url": "https://data.4dnucleome.org/browse/?award.project=4DN&experiments_in_set.biosample.biosample_category=HFF+%28c6+or+hTERT%29&experiments_in_set.biosample.biosample_category=H1-hESC&experiments_in_set.biosample.biosample_category=WTC-11&experiments_in_set.biosample.tissue_organ_info.organ_system%21=mesoderm&experimentset_type=replicate&status%21=archived&type=ExperimentSetReplicate&limit=all",
                "url_fields": [
                    "experiments_in_set.experiment_type.display_title", "experiments_in_set.experiment_type.assay_subclass_short",
                    "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field",
                    "experiments_in_set.display_title", "experiments_in_set.accession", "status",
                    "lab.display_title",
                    "experiments_in_set.biosample.biosource_summary", "experiments_in_set.biosample.biosource.cell_line.display_title",
                    "experiments_in_set.biosample.biosource.cell_line_tier"]
            },
            "ENCODE": {
                "url": "https://www.encodeproject.org/search/?type=Experiment&biosample_ontology.term_name=H1&biosample_ontology.term_name=HFFc6&biosample_ontology.term_name=WTC11&status%21=archived&status%21=revoked&limit=all",
                "url_fields": ["assay_slims", "biosample_summary", "biosample_ontology.term_name", "assay_term_name", "description", "lab", "status"]
            },
            "ENCODE-IMP": {
                "url": "https://www.encodeproject.org/search/?type=Annotation&software_used.software.name=avocado&searchTerm=H1-heSC&biosample_ontology.term_name=H1&annotation_type=imputation&limit=all",
                "url_fields": ["assay_slims", "biosample_ontology", "assay_term_name", "description", "lab", "status"]
            }
        }}
        valueChangeMap={{
            "4DN": {
                "cell_type": {
                    "H1-hESC (Tier 1)": "H1-hESC",
                    "H1-hESC": "H1-hESC",
                    "H1-hESC (Tier 1) differentiated to definitive endoderm": "H1-DE",
                    "H1-hESC differentiated to definitive endoderm": "H1-DE",
                    "HFF-hTERT": "HFF",
                    "HFFc6 (Tier 1)": "HFF",
                    "WTC-11": "WTC-11",
                    "WTC-11 (Tier 1)": "WTC-11",
                    "WTC-11 AAVS1-GFP C6": "WTC-11",
                    "WTC-11 AAVS1-GFP C28": "WTC-11",
                    "WTC-11 with MYL2-EGFP": "WTC-11",
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
                    "H1": "H1-hESC",
                    "HFFc6": "HFF",
                    "WTC11": "WTC-11",
                },
                "state": {
                    "released": "Submitted"
                }
            },
            "ENCODE-IMP": {
                "cell_type": {
                    "H1": "H1-hESC"
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
                "biosource_name": "experiments_in_set.biosample.biosource_summary",
                "cell_line_tier": "experiments_in_set.biosample.biosource.cell_line_tier",
                "state": "status"
            },
            "ENCODE": {
                "experiment_category": "assay_slims",
                "experiment_type": "assay_term_name",
                "cell_type": "biosample_ontology.term_name",
                "lab_name": "lab.title",
                "short_description": "description",
                "state": "status"
            },
            "ENCODE-IMP": {
                "experiment_category": "assay_slims",
                "experiment_type": "assay_term_name",
                "cell_type": "biosample_ontology.term_name",
                "lab_name": "lab.title",
                "short_description": "description",
                "state": "status"
            }
        }}
        groupingProperties={{
            "4DN": ["experiment_category", "experiment_type"],
            "ENCODE": ["experiment_category", "experiment_type"],
            "ENCODE-IMP": ["experiment_type"]
        }}
        columnGrouping={{
            "4DN": "cell_type",
            "ENCODE": "cell_type",
            "ENCODE-IMP": "cell_type"
        }}
        headerFor={{
            "4DN": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">4DN</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20, 'height': 20, 'position': 'relative', 'zIndex': 10 }}>
                        <a href="https://data.4dnucleome.org/browse/?award.project=4DN&experiments_in_set.biosample.biosample_category=HFF+%28c6+or+hTERT%29&experiments_in_set.biosample.biosample_category=H1-hESC&experiments_in_set.biosample.biosample_category=WTC-11&experiments_in_set.biosample.tissue_organ_info.organ_system%21=mesoderm&experimentset_type=replicate&status%21=archived&type=ExperimentSetReplicate">Browse all</a> H1, H1-DE, HFF and WTC-11 data from 4DN
                    </h5>
                </React.Fragment>),
            "ENCODE": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">ENCODE</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20, 'height': 20, 'position': 'relative', 'zIndex': 10 }}>
                        <a href="https://www.encodeproject.org/search/?type=Experiment&biosample_ontology.term_name=H1&biosample_ontology.term_name=HFFc6&biosample_ontology.term_name=WTC11&status%21=archived&status%21=revoked"> Browse all</a> H1, HFF and WTC-11 data from ENCODE
                    </h5>
                </React.Fragment>),
            "ENCODE-IMP": (
                <React.Fragment>
                    <h3 className="mt-2 mb-0 text-300">ENCODE Imputations</h3>
                    <h5 className="mt-0 text-500" style={{ 'marginBottom': -20, 'height': 20, 'position': 'relative', 'zIndex': 10 }}>
                        <a href="https://www.encodeproject.org/search/?type=Annotation&software_used.software.name=avocado&searchTerm=H1-heSC&biosample_ontology.term_name=H1&annotation_type=imputation"> Browse all</a> H1 Imputations from ENCODE
                    </h5>
                </React.Fragment>)
        }}
        sectionStyle={{
            "4DN": {
                "sectionClassName": "col-md-4",
                "rowLabelListingProportion": "balanced"
            },
            "ENCODE": {
                "sectionClassName": "col-md-4",
                "rowLabelListingProportion": "balanced"
            },
            "ENCODE-IMP": {
                "sectionClassName": "col-md-4",
                "rowLabelListingProportion": "balanced"
            }
        }}
        headerColumnsOrder={["H1-hESC", "H1-DE", "HFF", "WTC-11"]}
        columnSubGroupingOrder={["Submitted", "In Submission", "Planned", "Not Planned"]}
        titleMap={{
            "_common_name": " ",
            "sub_cat": "AnyStringHere",
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
        fallbackNameForBlankField="None"
    />
    <h5>Configuration</h5>
    <pre className="border rounded px-3 py-2">{"<ExperimentSetMatrix\r\n        key=\"experiment-set-matrix-4\"  // Required to prevent re-instantiation of component upon window resize & similar.\r\n        session={session}              // Required - hooks in 'session' (boolean) from App.\r\n        sectionKeys={[\"4DN\", \"ENCODE\", \"ENCODE-IMP\"]}\r\n        queries={{\r\n            \"4DN\": {\r\n                \"url\": \"https://data.4dnucleome.org/browse/?award.project=4DN&experiments_in_set.biosample.biosample_category=HFF+%28c6+or+hTERT%29&experiments_in_set.biosample.biosample_category=H1-hESC&experiments_in_set.biosample.biosample_category=WTC-11&experiments_in_set.biosample.tissue_organ_info.organ_system%21=mesoderm&experimentset_type=replicate&status%21=archived&type=ExperimentSetReplicate&limit=all\",\r\n                \"url_fields\": [\r\n                    \"experiments_in_set.experiment_type.display_title\", \"experiments_in_set.experiment_type.assay_subclass_short\",\r\n                    \"experiments_in_set.experiment_categorizer.value\", \"experiments_in_set.experiment_categorizer.field\",\r\n                    \"experiments_in_set.display_title\", \"experiments_in_set.accession\", \"status\",\r\n                    \"lab.display_title\",\r\n                    \"experiments_in_set.biosample.biosource_summary\", \"experiments_in_set.biosample.biosource.cell_line.display_title\",\r\n                    \"experiments_in_set.biosample.biosource.cell_line_tier\"]\r\n            },\r\n            \"ENCODE\": {\r\n                \"url\": \"https://www.encodeproject.org/search/?type=Experiment&biosample_ontology.term_name=H1&biosample_ontology.term_name=HFFc6&biosample_ontology.term_name=WTC11&status%21=archived&status%21=revoked&limit=all\",\r\n                \"url_fields\": [\"assay_slims\", \"biosample_summary\", \"biosample_ontology.term_name\", \"assay_term_name\", \"description\", \"lab\", \"status\"]\r\n            },\r\n            \"ENCODE-IMP\": {\r\n                \"url\": \"https://www.encodeproject.org/search/?type=Annotation&software_used.software.name=avocado&searchTerm=H1-heSC&biosample_ontology.term_name=H1&annotation_type=imputation&limit=all\",\r\n                \"url_fields\": [\"assay_slims\", \"biosample_ontology\", \"assay_term_name\", \"description\", \"lab\", \"status\"]\r\n            }\r\n        }}\r\n        valueChangeMap={{\r\n            \"4DN\": {\r\n                \"cell_type\": {\r\n                    \"H1-hESC (Tier 1)\": \"H1-hESC\",\r\n                    \"H1-hESC\": \"H1-hESC\",\r\n                    \"H1-hESC (Tier 1) differentiated to definitive endoderm\": \"H1-DE\",\r\n                    \"H1-hESC differentiated to definitive endoderm\": \"H1-DE\",\r\n                    \"HFF-hTERT\": \"HFF\",\r\n                    \"HFFc6 (Tier 1)\": \"HFF\",\r\n                    \"WTC-11\": \"WTC-11\",\r\n                    \"WTC-11 (Tier 1)\": \"WTC-11\",\r\n                    \"WTC-11 AAVS1-GFP C6\": \"WTC-11\",\r\n                    \"WTC-11 AAVS1-GFP C28\": \"WTC-11\",\r\n                    \"WTC-11 with MYL2-EGFP\": \"WTC-11\",\r\n                },\r\n                \"state\": {\r\n                    \"released\": \"Submitted\",\r\n                    \"current\": \"Submitted\",\r\n                    \"released to project\": \"Internal Release\",\r\n                    \"pre-release\": \"Internal Release\",\r\n                    \"in review by lab\": \"In Submission\",\r\n                    \"in review by project\": \"In Submission\",\r\n                    \"submission in progress\": \"In Submission\",\r\n                    \"released to lab\": \"In Submission\",\r\n                    \"to be uploaded by workflow\": \"Planned\",\r\n                    \"planned\": \"Planned\",\r\n                    \"archived\": \"Out of date\",\r\n                    \"revoked\": \"Out of date\",\r\n                    \"deleted\": \"Deleted\"\r\n                }\r\n            },\r\n            \"ENCODE\": {\r\n                \"cell_type\": {\r\n                    \"H1\": \"H1-hESC\",\r\n                    \"HFFc6\": \"HFF\",\r\n                    \"WTC11\": \"WTC-11\",\r\n                },\r\n                \"state\": {\r\n                    \"released\": \"Submitted\"\r\n                }\r\n            },\r\n            \"ENCODE-IMP\": {\r\n                \"cell_type\": {\r\n                    \"H1\": \"H1-hESC\"\r\n                },\r\n                \"state\": {\r\n                    \"released\": \"Submitted\"\r\n                }\r\n            }\r\n        }}\r\n        fieldChangeMap={{\r\n            \"4DN\": {\r\n                \"experiment_category\": \"experiments_in_set.experiment_type.assay_subclass_short\",\r\n                \"experiment_type\": \"experiments_in_set.experiment_type.display_title\",\r\n                \"cell_type\": \"experiments_in_set.biosample.biosource_summary\",\r\n                \"sub_cat\": \"experiments_in_set.experiment_categorizer.value\",\r\n                \"sub_cat_title\": 'experiments_in_set.experiment_categorizer.field',\r\n                \"lab_name\": 'lab.display_title',\r\n                \"biosource_name\": \"experiments_in_set.biosample.biosource_summary\",\r\n                \"cell_line_tier\": \"experiments_in_set.biosample.biosource.cell_line_tier\",\r\n                \"state\": \"status\"\r\n            },\r\n            \"ENCODE\": {\r\n                \"experiment_category\": \"assay_slims\",\r\n                \"experiment_type\": \"assay_term_name\",\r\n                \"cell_type\": \"biosample_ontology.term_name\",\r\n                \"lab_name\": \"lab.title\",\r\n                \"short_description\": \"description\",\r\n                \"state\": \"status\"\r\n            },\r\n            \"ENCODE-IMP\": {\r\n                \"experiment_category\": \"assay_slims\",\r\n                \"experiment_type\": \"assay_term_name\",\r\n                \"cell_type\": \"biosample_ontology.term_name\",\r\n                \"lab_name\": \"lab.title\",\r\n                \"short_description\": \"description\",\r\n                \"state\": \"status\"\r\n            }\r\n        }}\r\n        groupingProperties={{\r\n            \"4DN\": [\"experiment_category\", \"experiment_type\"],\r\n            \"ENCODE\": [\"experiment_category\", \"experiment_type\"],\r\n            \"ENCODE-IMP\": [\"experiment_type\"]\r\n        }}\r\n        columnGrouping={{\r\n            \"4DN\": \"cell_type\",\r\n            \"ENCODE\": \"cell_type\",\r\n            \"ENCODE-IMP\": \"cell_type\"\r\n        }}\r\n        headerFor={{\r\n            \"4DN\": (\r\n                <React.Fragment>\r\n                    <h3 className=\"mt-2 mb-0 text-300\">4DN</h3>\r\n                    <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20, 'height': 20, 'position': 'relative', 'zIndex': 10 }}>\r\n                        <a href=\"https://data.4dnucleome.org/browse/?award.project=4DN&experiments_in_set.biosample.biosample_category=HFF+%28c6+or+hTERT%29&experiments_in_set.biosample.biosample_category=H1-hESC&experiments_in_set.biosample.biosample_category=WTC-11&experiments_in_set.biosample.tissue_organ_info.organ_system%21=mesoderm&experimentset_type=replicate&status%21=archived&type=ExperimentSetReplicate\">Browse all</a> H1, H1-DE, HFF and WTC-11 data from 4DN\r\n                    </h5>\r\n                </React.Fragment>),\r\n            \"ENCODE\": (\r\n                <React.Fragment>\r\n                    <h3 className=\"mt-2 mb-0 text-300\">ENCODE</h3>\r\n                    <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20 }}>\r\n                        <a href=\"https://www.encodeproject.org/search/?type=Experiment&biosample_ontology.term_name=H1&biosample_ontology.term_name=HFFc6&biosample_ontology.term_name=WTC11&status%21=archived&status%21=revoked\"> Browse all</a> H1, HFF and WTC-11 data from ENCODE\r\n                    </h5>\r\n                </React.Fragment>),\r\n            \"ENCODE-IMP\": (\r\n                <React.Fragment>\r\n                    <h3 className=\"mt-2 mb-0 text-300\">ENCODE Imputations</h3>\r\n                    <h5 className=\"mt-0 text-500\" style={{ 'marginBottom': -20 }}>\r\n                        <a href=\"https://www.encodeproject.org/search/?type=Annotation&software_used.software.name=avocado&searchTerm=H1-heSC&biosample_ontology.term_name=H1&annotation_type=imputation\"> Browse all</a> H1 Imputations from ENCODE\r\n                    </h5>\r\n                </React.Fragment>)\r\n        }}\r\n        sectionStyle={{\r\n            \"4DN\": {\r\n                \"sectionClassName\": \"col-md-4\",\r\n                \"rowLabelListingProportion\": \"balanced\"\r\n            },\r\n            \"ENCODE\": {\r\n                \"sectionClassName\": \"col-md-4\",\r\n                \"rowLabelListingProportion\": \"balanced\"\r\n            },\r\n            \"ENCODE-IMP\": {\r\n                \"sectionClassName\": \"col-md-4\",\r\n                \"rowLabelListingProportion\": \"balanced\"\r\n            }\r\n        }}\r\n        headerColumnsOrder={[\"H1-hESC\", \"H1-DE\", \"HFF\", \"WTC-11\"]}\r\n        columnSubGroupingOrder={[\"Submitted\", \"In Submission\", \"Planned\", \"Not Planned\"]}\r\n        titleMap={{\r\n            \"_common_name\": \" \",\r\n            \"sub_cat\": \"AnyStringHere\",\r\n            \"experiment_type\": \"Experiment Type\",\r\n            \"data_source\": \"Available through\",\r\n            \"lab_name\": \"Lab\",\r\n            \"experiment_category\": \"Category\",\r\n            \"state\": \"Submission Status\",\r\n            \"cell_type\": \"Cell Type\",\r\n            \"short_description\": \"Description\",\r\n            \"award\": \"Award\",\r\n            \"accession\": \"Accession\",\r\n            \"number_of_experiments\": \"# Experiments in Set\",\r\n               \"submitted_by\": \"Submitter\",\r\n            \"experimentset_type\": \"Set Type\"\r\n        }}\r\n        fallbackNameForBlankField=\"None\"\r\n    />"}</pre>
</div>
