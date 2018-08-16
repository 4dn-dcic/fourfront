import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def workflow_2(software, award, lab):
    return{
        "schema_version": '2',
        "award": award['@id'],
        "lab": lab['@id'],
        "title": "some workflow",
        "name": "some workflow",
        "workflow_type": "Other",
        "steps": [{ "meta": { "software_used" : software['@id'] } }]
    }


def test_workflow_convert_software_used_to_list_2(
        app, workflow_2, software):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('workflow', workflow_2, current_version='2', target_version='3')
    assert value['schema_version'] == '3'
    assert value['steps'][0]['meta']['software_used'] == [software['@id']]

@pytest.fixture
def workflow_3(software, award, lab):
    return {
        "arguments": [
            {
                "argument_format": "chromsizes",
                "argument_type": "Input file",
                "workflow_argument_name": "chrsizes"
            },
            {
                "argument_format": "pairs",
                "argument_type": "Input file",
                "workflow_argument_name": "input_pairs"
            },
            {
                "argument_format": "pairs",
                "argument_type": "Input file",
                "workflow_argument_name": "input_pairs_index"
            },
            {
                "argument_type": "parameter",
                "workflow_argument_name": "ncores"
            },
            {
                "argument_type": "parameter",
                "workflow_argument_name": "binsize"
            },
            {
                "argument_type": "parameter",
                "workflow_argument_name": "min_res"
            },
            {
                "argument_type": "parameter",
                "workflow_argument_name": "normalization_type"
            },
            {
                "argument_format": "pairs_px2",
                "argument_type": "Output processed file",
                "workflow_argument_name": "output_pairs_index"
            },
            {
                "argument_format": "pairs",
                "argument_type": "Output processed file",
                "workflow_argument_name": "output_pairs"
            },
            {
                "argument_format": "cool",
                "argument_type": "Output processed file",
                "workflow_argument_name": "out_cool"
            },
            {
                "argument_format": "hic",
                "argument_type": "Output processed file",
                "workflow_argument_name": "output_hic"
            },
            {
                "argument_format": "mcool",
                "argument_type": "Output processed file",
                "workflow_argument_name": "out_mcool"
            }
        ],
        "category": "merging + matrix generation",
        "data_types": [
            "Hi-C"
        ],
        "description": "Hi-C processing part B revision 15",
        "award": award['@id'],
        "lab": lab['@id'],
        "name": "hi-c-processing-partb/15",
        "schema_version" : "3",
        "steps": [
            {
                "inputs": [
                    {
                        "meta": {
                            "argument_format": "pairs",
                            "argument_type": "Input file"
                        },
                        "name": "input_pairs",
                        "source": [
                            {
                                "name": "input_pairs"
                            }
                        ]
                    },
                    {
                        "meta": {
                            "argument_type": "Input file"
                        },
                        "name": "input_pairs_index",
                        "source": [
                            {
                                "name": "input_pairs_index"
                            }
                        ]
                    }
                ],
                "meta": {
                    "analysis_step_types": [
                        "file merging"
                    ],
                    "software_used": [
                        "/software/02d636b9-d82d-4da9-950c-2ca994a23547/"
                    ]
                },
                "name": "merge_pairs",
                "outputs": [
                    {
                        "meta": {
                            "argument_format": "pairs_px2",
                            "argument_type": "Output processed file"
                        },
                        "name": "output_pairs_index",
                        "target": [
                            {
                                "name": "output_pairs_index"
                            },
                            {
                                "name": "pairs_index",
                                "step": "cooler"
                            }
                        ]
                    },
                    {
                        "meta": {
                            "argument_format": "pairs",
                            "argument_type": "Output processed file"
                        },
                        "name": "output_pairs",
                        "target": [
                            {
                                "name": "output_pairs"
                            },
                            {
                                "name": "input_pairs",
                                "step": "pairs2hic"
                            },
                            {
                                "name": "pairs",
                                "step": "cooler"
                            }
                        ]
                    }
                ]
            },
            {
                "inputs": [
                    {
                        "meta": {
                            "argument_type": "parameter"
                        },
                        "name": "ncores",
                        "source": [
                            {
                                "name": "ncores"
                            }
                        ]
                    },
                    {
                        "meta": {
                            "argument_type": "parameter"
                        },
                        "name": "binsize",
                        "source": [
                            {
                                "name": "binsize"
                            }
                        ]
                    },
                    {
                        "meta": {},
                        "name": "pairs_index",
                        "source": [
                            {
                                "name": "output_pairs_index",
                                "step": "merge_pairs"
                            }
                        ]
                    },
                    {
                        "meta": {},
                        "name": "pairs",
                        "source": [
                            {
                                "name": "output_pairs",
                                "step": "merge_pairs"
                            }
                        ]
                    }
                ],
                "meta": {
                    "analysis_step_types": [
                        "aggregation"
                    ],
                    "software_used": [
                        "/software/02d636b9-d8dd-4da9-950c-2ca994b23555/"
                    ]
                },
                "name": "cooler",
                "outputs": [
                    {
                        "meta": {
                            "argument_format": "cool",
                            "argument_type": "Output processed file"
                        },
                        "name": "out_cool",
                        "target": [
                            {
                                "name": "out_cool"
                            }
                        ]
                    }
                ]
            },
            {
                "inputs": [
                    {
                        "meta": {
                            "argument_format": "chromsizes",
                            "argument_type": "Input file"
                        },
                        "name": "chrsizes",
                        "source": [
                            {
                                "name": "chrsizes"
                            }
                        ]
                    },
                    {
                        "meta": {
                            "argument_type": "parameter"
                        },
                        "name": "min_res",
                        "source": [
                            {
                                "name": "min_res"
                            }
                        ]
                    },
                    {
                        "meta": {},
                        "name": "input_pairs",
                        "source": [
                            {
                                "name": "output_pairs",
                                "step": "merge_pairs"
                            }
                        ]
                    }
                ],
                "meta": {
                    "analysis_step_types": [
                        "aggregation",
                        "normalization"
                    ],
                    "software_used": [
                        "/software/02d636b9-d8dd-4da9-950c-2ca994b23576/"
                    ]
                },
                "name": "pairs2hic",
                "outputs": [
                    {
                        "meta": {
                            "argument_format": "hic",
                            "argument_type": "Output processed file"
                        },
                        "name": "output_hic",
                        "target": [
                            {
                                "name": "output_hic"
                            },
                            {
                                "name": "input_hic",
                                "step": "hic2mcool"
                            }
                        ]
                    }
                ]
            },
            {
                "inputs": [
                    {
                        "meta": {
                            "argument_type": "parameter"
                        },
                        "name": "normalization_type",
                        "source": [
                            {
                                "name": "normalization_type"
                            }
                        ]
                    },
                    {
                        "meta": {},
                        "name": "input_hic",
                        "source": [
                            {
                                "name": "output_hic",
                                "step": "pairs2hic"
                            }
                        ]
                    }
                ],
                "meta": {
                    "analysis_step_types": [
                        "file format conversion"
                    ],
                    "software_used": [
                        "/software/02d636b9-d8dd-4da9-950c-2ca994b23555/"
                    ]
                },
                "name": "hic2mcool",
                "outputs": [
                    {
                        "meta": {
                            "argument_format": "mcool",
                            "argument_type": "Output processed file"
                        },
                        "name": "out_mcool",
                        "target": [
                            {
                                "name": "out_mcool"
                            }
                        ]
                    }
                ]
            }
        ],
        "title": "Hi-C processing part B revision 15",
        "workflow_type": "Hi-C data analysis"
    }

def test_workflow_upgrade_3_4(
        app, workflow_3, software):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('workflow', workflow_3, current_version='3', target_version='4')
    assert value['schema_version'] == '4'
    assert value['steps'][0]['inputs'][0]['source'][0].get('type') == None
    assert value['steps'][0]['outputs'][0]['target'][0].get('type') == None

    assert value['steps'][0]['inputs'][0]['meta'].get('file_format') == 'pairs'
    assert value['steps'][0]['inputs'][1]['meta'].get('file_format') == 'pairs'
    assert value['steps'][0]['inputs'][0]['meta'].get('cardinality') == 'array' # 'input_pairs' arg of 'merge_pairs' should get this auto-assigned

    assert value['steps'][0]['inputs'][0]['meta'].get('type') == 'data file'
    assert value['steps'][0]['inputs'][1]['meta'].get('type') == 'reference file' # 'input_pairs_index' has 'index' in name ==> 'reference file' upgrade.

    assert value['steps'][0]['inputs'][0]['meta'].get('global') == True
    assert value['steps'][0]['inputs'][1]['meta'].get('global') == True

    assert value['steps'][0]['outputs'][0]['meta'].get('file_format') == 'pairs_px2'
    assert value['steps'][0]['outputs'][1]['meta'].get('file_format') == 'pairs'

    assert value['steps'][0]['outputs'][0]['meta'].get('global') == True
    assert value['steps'][0]['outputs'][1]['meta'].get('global') == True

    assert value['steps'][0]['outputs'][0]['meta'].get('type') == 'data file' # We don't transform outputs to reference files
    assert value['steps'][0]['outputs'][1]['meta'].get('type') == 'data file'


@pytest.fixture
def workflow_4():
    return {
        'lab': '/labs/encode-lab/',
        'steps': [
            {
                'meta': {
                    'analysis_step_types': ['file merging'],
                    'software_used': ['/software/02d636b9-d82d-4da9-950c-2ca994a23547/']
                },
                'name': 'merge_pairs',
                'outputs': [
                    {
                        'meta': {'cardinality': 'single', 'type': 'data file', 'global': True, 'file_format': 'pairs_px2'},
                        'target': [{'name': 'output_pairs_index'}, {'name': 'pairs_index', 'step': 'cooler'}],
                        'name': 'output_pairs_index'
                    },
                    {
                        'meta': {'cardinality': 'single', 'type': 'data file', 'global': True, 'file_format': 'pairs'},
                        'target': [{'name': 'output_pairs'}, {'name': 'input_pairs', 'step': 'pairs2hic'}, {'name': 'pairs', 'step': 'cooler'}],
                        'name': 'output_pairs'
                    }
                ],
                'inputs': [
                    {
                        'meta': {'cardinality': 'array', 'type': 'data file', 'global': True, 'file_format': 'pairs'},
                        'name': 'input_pairs',
                        'source': [{'name': 'input_pairs'}]
                    },
                    {
                        'meta': {'type': 'reference file', 'global': True, 'file_format': 'pairs', 'cardinality': 'array'},
                        'name': 'input_pairs_index',
                        'source': [{'name': 'input_pairs_index'}]
                    }
                ]
            },
            {
                'meta': {
                    'analysis_step_types': ['aggregation'],
                    'software_used': ['/software/02d636b9-d8dd-4da9-950c-2ca994b23555/']
                },
                'name': 'cooler',
                'outputs': [
                    {
                        'meta': {'cardinality': 'single', 'type': 'data file', 'global': True, 'file_format': 'cool'},
                        'target': [{'name': 'out_cool'}],
                        'name': 'out_cool'
                    }
                ],
                'inputs': [
                    {
                        'meta': {'type': 'parameter', 'global': True, 'cardinality': 'single'},
                        'name': 'ncores',
                        'source': [{'name': 'ncores'}]
                    },
                    {
                        'meta': {'type': 'parameter', 'global': True, 'cardinality': 'single'},
                        'name': 'binsize',
                        'source': [{'name': 'binsize'}]
                    },
                    {
                        'meta': {'type': 'reference file', 'global': False, 'file_format': 'pairs', 'cardinality': 'single'},
                        'name': 'pairs_index',
                        'source': [{'name': 'output_pairs_index', 'step': 'merge_pairs'}]
                    },
                    {
                        'meta': {'type': 'data file', 'global': False, 'file_format': 'pairs', 'cardinality': 'single'},
                        'name': 'pairs',
                        'source': [{'name': 'output_pairs', 'step': 'merge_pairs'}]
                    }
                ]
            },
            {
                'meta': {
                    'analysis_step_types': ['aggregation', 'normalization'],
                    'software_used': ['/software/02d636b9-d8dd-4da9-950c-2ca994b23576/']
                },
                'name': 'pairs2hic',
                'outputs': [
                    {
                        'meta': {'cardinality': 'single', 'type': 'data file', 'global': True, 'file_format': 'hic'},
                        'target': [{'name': 'output_hic'}, {'name': 'input_hic', 'step': 'hic2mcool'}],
                        'name': 'output_hic'
                    }
                ],
                'inputs': [
                    {
                        'meta': {'cardinality': 'single', 'type': 'reference file', 'global': True, 'file_format': 'chromsizes'},
                        'name': 'chrsizes',
                        'source': [{'name': 'chrsizes'}]
                    },
                    {
                        'meta': {'type': 'parameter', 'global': True, 'cardinality': 'single'},
                        'name': 'min_res',
                        'source': [{'name': 'min_res'}]
                    },
                    {
                        'meta': {'type': 'data file', 'global': False, 'file_format': 'pairs', 'cardinality': 'single'},
                        'name': 'input_pairs',
                        'source': [{'name': 'output_pairs', 'step': 'merge_pairs'}]
                    }
                ]
            },
            {
                'meta': {
                    'analysis_step_types': ['file format conversion'],
                    'software_used': ['/software/02d636b9-d8dd-4da9-950c-2ca994b23555/']
                },
                'name': 'hic2mcool',
                'outputs': [
                    {
                        'meta': {'cardinality': 'single', 'type': 'data file', 'global': True, 'file_format': 'mcool'},
                        'target': [{'name': 'out_mcool'}],
                        'name': 'out_mcool'
                    }
                ],
                'inputs': [
                    {
                        'meta': {'type': 'parameter', 'global': True, 'cardinality': 'single'},
                        'name': 'normalization_type',
                        'source': [{'name': 'normalization_type'}]
                    },
                    {
                        'meta': {'type': 'data file', 'global': False, 'cardinality': 'single'},
                        'name': 'input_hic',
                        'source': [{'name': 'output_hic', 'step': 'pairs2hic'}]
                    }
                ]
            }
        ],
        'name': 'hi-c-processing-partb/15',
        'data_types': ['Hi-C'],
        'description': 'Hi-C processing part B revision 15',
        'category': 'merging + matrix generation',
        'schema_version': '4',
        'arguments': [
            {'workflow_argument_name': 'chrsizes', 'argument_format': 'chromsizes', 'argument_type': 'Input file'},
            {'workflow_argument_name': 'input_pairs', 'argument_format': 'pairs', 'argument_type': 'Input file'},
            {'workflow_argument_name': 'input_pairs_index', 'argument_format': 'pairs', 'argument_type': 'Input file'},
            {'workflow_argument_name': 'ncores', 'argument_type': 'parameter'},
            {'workflow_argument_name': 'binsize', 'argument_type': 'parameter'},
            {'workflow_argument_name': 'min_res', 'argument_type': 'parameter'},
            {'workflow_argument_name': 'normalization_type', 'argument_type': 'parameter'},
            {'workflow_argument_name': 'output_pairs_index', 'argument_format': 'pairs_px2', 'argument_type': 'Output processed file'},
            {'workflow_argument_name': 'output_pairs', 'argument_format': 'pairs', 'argument_type': 'Output processed file'},
            {'workflow_argument_name': 'out_cool', 'argument_format': 'cool', 'argument_type': 'Output processed file'},
            {'workflow_argument_name': 'output_hic', 'argument_format': 'hic', 'argument_type': 'Output processed file'},
            {'workflow_argument_name': 'out_mcool', 'argument_format': 'mcool', 'argument_type': 'Output processed file'}
        ],
        'award': '/awards/encode3-award/',
        'workflow_type': 'Hi-C data analysis',
        'title': 'Hi-C processing part B revision 15'
    }


def test_workflow_upgrade_4_5(
        workflow_4, registry, file_formats):
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('workflow', workflow_4, registry=registry,
                             current_version='4', target_version='5')
    format_uuids = [f.get('uuid') for f in file_formats.values()]
    assert value['schema_version'] == '5'
    arguments = value.get('arguments', [])
    for arg in arguments:
        secondary_formats = arg.get('secondary_formats', [])
        for s, sformat in secondary_formats:
            assert sformat in format_uuids
        argument_format = arg.get('argument_format')
        if argument_format:
            assert argument_format in format_uuids
    steps = value.get('steps', [])
    for step in steps:
        inputs = step.get('inputs', [])
        for input in inputs:
            meta = input.get('meta', {})
            fformat = meta.get('file_format')
            if fformat:
                assert fformat in format_uuids
