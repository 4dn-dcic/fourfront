import React from 'react';
import * as d3 from 'd3';
import _ from 'underscore';



// Manual polyfill for NPM tests, @see https://github.com/facebook/create-react-app/issues/1064
if (!require.ensure) {
    console.error("No require.ensure present - \nFine if within an NPM test, error if in browser/webpack context.");
    require.ensure = (deps, cb) => cb(require);
}

export const currentInstanceIDs = {};

export class PedigreeJSLibContainer extends React.PureComponent {

    static defaultProps = {
        "dataset" : [
            /*
            { "name": "m11", "sex": "M", "top_level": true },
            { "name": "f11", "display_name": "Jane",  "sex": "F", "status": 1, "top_level": true, "breast_cancer_diagnosis_age":67, "ovarian_cancer_diagnosis_age":63 },
            { "name": "m12", "sex": "M", "top_level": true },
            { "name": "f12", "sex": "F", "top_level": true, "breast_cancer_diagnosis_age":55 },
            { "name": "m21", "sex": "M", "mother": "f11", "father": "m11", "age": 56 },
            { "name": "f21", "sex": "F", "mother": "f12", "father": "m12", "breast_cancer_diagnosis_age":55, "breast_cancer2_diagnosis_age": 60, "ovarian_cancer_diagnosis_age":58, "age": 63 },
            { "name": "ch1", "display_name": "Ana", "sex": "F", "mother": "f21", "father": "m21", "proband": true, "age": 25 },
            */
            { id: 2, name: "m11", sex: "M", "top_level": true, age: 65 /* mother: "Josephina", father: "Joseph" */ },
            { id: 3, name: "f11", sex: "F","top_level": true, "ovarian_cancer_diagnosis_age":63, age : 56 },

            {
                id: 1,
                name: "ch1",
                proband: true,
                father: "m11",
                mother: "f11",
                sex: "M",
                age: 30
            },
            /*
            { id: 4, name: "George", sex: "M", father: "Joe", mother: "Mary" },
            { id: 5, name: "Patricia", sex: "F", father: "Patrick", mother: "Mary" },
            { id: 6, name: "Patrick", sex: "M", father: "Phillip", mother: "Phillipina" },
            { id: 7, name: "Phillip", sex: "M", top_level: true },
            { id: 8, name: "Phillipina", sex: "F", top_level: true },
            { id: 9, name: "Josephina", sex: "F", top_level: true },
            { id: 10, name: "Joseph", sex: "M", top_level: true },
            { id: 11, name: "Max", sex: "M" },
            { id: 12, name: "William", sex: "M", father: "Max", mother: "Patricia" },
            */
            //{ id: 13, name: "Rutherford", sex: "M", father: "Joseph", mother: "Patricia" },
            //{ id: 14, name: "Sally", gender: "F", parents: [12, 9] },
            //{ id: 15, name: "Sally2", sex: "F" },
            //{ id: 16, name: "Silly", sex: "M", mother: "Sally2", father: "William" },
        ],
        "diseases" : [
            { 'type': 'breast_cancer', 'colour': '#F68F35' },
            { 'type': 'breast_cancer2', 'colour': 'pink' },
            { 'type': 'ovarian_cancer', 'colour': '#4DAA4D' },
            { 'type': 'pancreatic_cancer', 'colour': '#4289BA' },
            { 'type': 'prostate_cancer', 'colour': '#D5494A' }
        ]
    };

    constructor(props){
        super(props);
        this.onChange = this.onChange.bind(this);
        const currentInstanceIDKeys = _.keys(currentInstanceIDs);
        let keyToUse = 0; // Will get converted to str when accessing objects values.
        for (keyToUse = 0; keyToUse <= currentInstanceIDKeys.length; keyToUse++){
            if (typeof currentInstanceIDs[keyToUse] === 'undefined'){
                break;
            }
        }
        this.id = keyToUse;
        this.currentInstanceWindowStore = null; // Populated in componentDidMount

        this.state = {
            // We will keep _copies_ of in-PedigreeJS state/store in here to help inform rendering of custom elements.
            // To be updated in onChange handler.
            store : null,
            // Set to true upon first call of pedcache.add. Means window.ptree is available and whatnot for future lifecycle
            // React component methods.
            initialized : false
        };

        this.targetDivRef = React.createRef();
    }

    componentDidMount(){
        // Hacky - exposing fourfront methods & such to be used by non-module PedigreeJS.
        window.fourfront.PedigreeJS = window.fourfront.PedigreeJS || { instances : {} };
        window.fourfront.PedigreeJS.instances[this.id] = {
            count: 0,
            history: [], // Will be keyed by (stringified) number, value is dataset
            x: 0,
            y: 0
        };
        this.currentInstanceWindowStore = window.fourfront.PedigreeJS.instances[this.id];
        require.ensure([
            "jquery",
            "./io",
            "./pedigree_form",
            "./pedigree",
            "./undo_redo_refresh",
            "./widgets"
        ], (require) => {
            const jQuery = require('jquery');

            // We need this available on window object for pedigreejs to work
            window.jQuery = window.$ = jQuery;
            window.d3 = d3;

            $("#pedigreejs-container").append( $( "<script src=\"https://code.jquery.com/ui/1.12.0/jquery-ui.min.js\"></script>" ) );

            // These scripts get loaded and appended to html head.
            // They then expose things like window.ptree and window.pedcache.
            // (Rather than being actual importable modules)
            const pedigreeIO        = require('./io');
            const pedigreeForm      = require('./pedigree_form');
            const pedigreeJSLib     = require('./pedigree');
            const undoRedoRefresh   = require('./undo_redo_refresh');
            const pedigreeWidgets   = require('./widgets');

            const opts = this.createBaseOptions();

            // Init - copied from https://github.com/CCGE-BOADICEA/pedigreejs/blob/master/index.html

            //pedcache.clear(opts);
            window.ptree.build(opts);

            this.setState({
                'store': _.clone(this.currentInstanceWindowStore)
            });

        }, "pedigreejs");
    }

    componentDidUpdate(pastProps){
        const { width, height } = this.props;
        const { initialized, store } = this.state;

        if (!initialized) return;

        if (width !== pastProps.width || height !== pastProps.height){
            const opts = this.createBaseOptions();
            const { history, count } = store;
            const currentDatasetStr = history[count - 1];
            const currentDataset = JSON.parse(currentDatasetStr);
            opts.dataset = currentDataset;
            window.ptree.rebuild(opts);
        }
    }

    componentWillUnmount(){
        delete window.fourfront.PedigreeJS.instances[this.id];
        delete currentInstanceIDs[this.id];
        if (_.keys(currentInstanceIDs).length === 0){
            delete window.d3;
            delete window.jQuery;
            delete window.$;
            delete window.fourfront.PedigreeJS;
        }
    }

    onChange(actionCalled, store){
        const validStateChangeActions = {
            "pedcache.add" : 1,
            "pedcache.next" : 1,
            "pedcache.previous" : 1
        };
        if (validStateChangeActions[actionCalled]){
            this.setState(function({ initialized }){
                const next = { 'store' : _.clone(store) };
                if (!initialized && actionCalled === "pedcache.add") {
                    next.initialized = true;
                }
                return next;
            });
        }
    }

    createBaseOptions(){
        const { height, width, dataset, diseases } = this.props;
        const opts = {
            height, width, diseases,
            'dataset': _.map(dataset, _.clone),
            'targetDiv': this.targetDivRef.current,
            'btn_target': 'pedigree_history',
            // 'nodeclick': pedigree_form.nodeclick,
            'symbol_size': 30,
            'edit': true,
            'zoomIn': .8,
            'zoomOut': 3.,
            'font_size': '0.9rem',
            'DEBUG': false,
            'background' : '#e8edf1',
            'fourfrontInstanceID' : this.id,
            'onChangeCallback': this.onChange
        };
        return opts;
    }

    render(){
        const { store } = this.state;
        const { history = [], count = 0 } = store || {};
        return (
            <div id="pedigreejs-container">
                <link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css" rel="stylesheet" type="text/css" media="all" />
                <link href="https://code.jquery.com/ui/1.12.1/themes/cupertino/jquery-ui.css" rel="stylesheet" type="text/css" media="all" />
                {/* <link rel="stylesheet" href="dist/css/pedigreejs.min.css" /> */}
                <div id="pedigree_history" className="py-2">
                    <div className="btn-group mr-2" role="group" aria-label="First group">
                        <button type="button" className="btn btn-outline-dark" id="pedigree-undo-btn"
                            data-tip="Undo" disabled={count <= 1}>
                            <i className="icon icon-undo fas"/>
                        </button>
                        <button type="button" className="btn btn-outline-dark" id="pedigree-redo-btn"
                            data-tip="Redo" disabled={count === history.length}>
                            <i className="icon icon-redo fas"/>
                        </button>
                        <button type="button" className="btn btn-outline-dark" id="pedigree-fullscreen-btn" data-tip="Go full screen">
                            <i className="icon icon-expand fas"/>
                        </button>
                    </div>
                </div>
                <div id="pedigree" ref={this.targetDivRef} />
                <div id="node_properties" />
            </div>
        );
    }

}