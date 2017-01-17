'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var expFuncs = require('../experiments-table').ExperimentsTable.funcs;
var { ChartBreadcrumbs, util } = require('./common');
var { console, isServerSide, getNestedProperty } = require('../objectutils');
var { highlightTerm, unhighlightTerms } = require('../facetlist');


/**
 * Based on Sunburst D3 Example @ http://bl.ocks.org/kerryrodden/7090426
 * This chart contains NO STATE object, because it is drawn and rendered after mount.
 * Maybe we could output an <svg> in the render function, but this might make using certain features of D3 difficult.
 * We re-render chart (via shouldComponentUpdate(), reset()) only when data has changed, or needs to be redrawn due to dimension change.
 */

var SunBurst = React.createClass({

    statics : {
        /**
         * Given a node in a partition layout, return an array of all of its ancestor
         * nodes, highest first, but excluding the root.
         * 
         * @param {Node} node - Current node.
         */
        getAncestors : function(node) {
            var path = [];
            var current = node;
            while (current.parent) {
                path.unshift(current);
                current = current.parent;
            }
            return path;
        },

        isDataEqual(data1, data2){
            var equal = true;

            function checkChildrenLengthRecursive(node1, node2, depth = 0){
                if (Array.isArray(node1.children) && !Array.isArray(node2.children)) equal = false;
                if (!Array.isArray(node1.children) && Array.isArray(node2.children)) equal = false;
                if (!equal) return;
                if (node1.children.length !== node2.children.length) equal = false;
                if (node1.name !== node2.name) equal = false;
                if (!equal) return;
                if (depth > 3) return;
                _.zip(node1.children, node2.children).forEach(function(nodeSet){
                    checkChildrenLengthRecursive(nodeSet[0], nodeSet[1], depth + 1);
                });
            }
            checkChildrenLengthRecursive(data1,data2);
            return equal;
        },

        findNode : function(rootNode, searchFunc, maxDepth = 4, curDepth = 0){
            if (curDepth > maxDepth) return;
            var n = _.find(rootNode.children, searchFunc);
            if (typeof n !== 'undefined') return n;
            if (!Array.isArray(rootNode.children)) return;
            for (var i = 0; i < rootNode.children.length; i++){
                n = this.findNode(rootNode.children[i], searchFunc, maxDepth, curDepth + 1);
                if (typeof n !== 'undefined') return n;
                else continue;
            }
            return; // undefined
        },

        /**
         * Transforms list of experiments or experiment sets to a tree hierarchy for visualization by any tree-like charts.
         * Can pass in a valid context (i.e. as returned from server endpoint) which has a '@graph' property containing experiment sets, 
         * an array of experiment sets, or an array of experiments (array of experiments will become deprecated w/ GraphQL edits).
         *  
         * @param {Object[]} experiment_sets - Data graph containing structure of experiment_sets as returned by server (or experiments as returned by FacetList.siftExperiments).
         * @param {Object[]} [fields] - List of data defining hierarchial fields for chart, ordered outward. Use either functions or strings for (certain) data values.
         * @param {boolean} [experimentsInsteadOfSets=false] - Whether we have array of experiments instead of experiment sets.
         * @return {Object} - Root node of tree hierarchy.
         */
        transformDataForChart : function(
            experiment_sets,
            fields = [
                { 
                    field : 'experiments_in_set.biosample.biosource.individual.organism.name',
                    description : "Primary Organism",
                    name : function(val, id){
                        return val.charAt(0).toUpperCase() + val.slice(1);
                    }
                },
                { field : 'experiments_in_set.biosample.biosource.biosource_type', description : "Biosource Type" },
                { field : 'experiments_in_set.biosample.biosource_summary', description: "Biosample" },
                { field : 'experiments_in_set.experiment_summary', description: "Experiment Summary" },
                {
                    field : 'experiments_in_set.accession',
                    description: "Experiment Accession",
                    fallbackSize : 1,
                    isFacet : false,
                    children : function(val, id, exps, exp){
                        return expFuncs.allFilesFromExperiment(exp).map(function(f,i,a){
                            return {
                                'name' : f.accession,
                                'size' : 1,
                                'description' : 'File ' + f.accession,
                                'color' : '#ccc',
                                'id' : id + '-' + f.accession,
                                'field' : 'experiments_in_set.files.accession'
                            };
                        });
                    }
                }
            ],
            experimentsInsteadOfSets = true
        ){

            // Correct if we passed in a context instead of experiment_sets.
            if (
                !Array.isArray(experiment_sets) &&
                experiment_sets &&
                typeof experiment_sets === 'object' &&
                Array.isArray(experiment_sets['@graph'])
            ) experiment_sets = experiment_sets['@graph'];

            // Father experiments to loop over every experiment we have that was returned from /browse/ endpoint.
            var experiments = experimentsInsteadOfSets ? experiment_sets : expFuncs.listAllExperimentsFromExperimentSets(experiment_sets);
            
            // We create children OBJECT on each layer to gather children by w.e. field needed, where the unique field value is key.
            // Then recursively convert to array for use by chart.

            // First child (depth == 1) should be organism. ('root' node will have depth == 0)
            var rootNode = {
                'name' : 'root',
                'children' : {},
                'experiments' : 0,
                'id' : 'root',
                'fields' : _.pluck(fields, 'field')
            };

            // Ideally (for readability) would looping over each experiment & grab property of each instead of biosource 
            // (biosource is metadata property on experiment)
            // but experiment.biosample.biosource is an array so might miss some.

            function getDataFromExperiment(exp){

                function attachNode(field, fieldIndex, attachToNode){
                    var fieldValue = getNestedProperty(exp, field.field.replace('experiments_in_set.', ''));
                    
                    if (fieldValue){
                        currentID += '-' + fieldValue;
                    } else {
                        console.error("Couldn't get value for " + field.field + ' from:', exp);
                    }

                    function genNode(){
                        var callbackArgs = [fieldValue, currentID, experiments, exp];
                        var node = {
                            'id' : currentID,
                            'name' : (typeof field.name === 'function' ? field.name.apply(field.name, callbackArgs) : fieldValue),
                            'experiments' : 1,
                            'term' : fieldValue,
                            'field' : field.field,
                            'children' : (typeof field.children === 'function' ? field.children.apply(field.children, callbackArgs) : {})
                        };

                        if (field.isFacet === false) node.noClick = true;
                        if (typeof field.description === 'string') node.description = field.description;
                        if (typeof field.description === 'function') node.description = field.description.apply(field.description, callbackArgs);
                        if (typeof field.fallbackSize === 'number') node.fallbackSize = field.fallbackSize;

                        return node;
                    }

                    if (Array.isArray(attachToNode.children)) return null; // Can't attach, children already set as array.

                    if (Array.isArray(fieldValue)){
                        if (fieldValue.length === 1){
                            fieldValue = fieldValue[0];
                        } else {
                            // Needs to be tested
                            console.log('FV1',fieldValue);
                            fieldValue = _(fieldValue).chain()
                                .reduce(function(counts, orgName){
                                    counts[orgName] = (counts[orgName] || 0) + 1;
                                    return counts;
                                }, {})
                                .pairs()
                                .sortBy(1)
                                .value()[0];
                            console.log('FV2',fieldValue);
                        }
                    }

                    if (typeof attachToNode.children[fieldValue] === 'undefined'){
                        attachToNode.children[fieldValue] = genNode();
                    } else {
                        attachToNode.children[fieldValue].experiments++;
                    }

                    return attachToNode.children[fieldValue];
                }

                var currentID = rootNode.id; // 'root'
                var currentNode = rootNode;

                fields.forEach(function(f,i,a){
                    currentNode = attachNode(f, i, currentNode);
                });

                rootNode.experiments++;
            }


            function getDataFromExperimentDeprecated(exp){

                var currentID = 'root';

                function updateBiosource(biosource){
                    // Biosource Organism
                    if (
                        biosource.individual.organism.name &&
                        typeof rootNode.children[biosource.individual.organism.name] === 'undefined'
                    ){
                        var name = biosource.individual.organism.name;
                        name = name.charAt(0).toUpperCase() + name.slice(1);
                        //name += " (" + biosource.individual.organism.scientific_name + ")";
                        currentID += '-' + biosource.individual.organism.name;
                        rootNode.children[biosource.individual.organism.name] = {
                            'name' : name + " (" + biosource.individual.organism.scientific_name + ")",
                            'children' : {},
                            'id' : currentID,
                            "description" : "Primary Organism: " + name,
                            'field' : 'experiments_in_set.biosample.biosource.individual.organism.name',
                            'term' : biosource.individual.organism.name,
                            'experiments' : 1
                        };
                    } else if (rootNode.children[biosource.individual.organism.name]){
                        rootNode.children[biosource.individual.organism.name].experiments++;
                    }

                    var attachBiosourceTypeTo = rootNode.children[biosource.individual.organism.name];

                    // Biosource Type
                    if (
                        biosource.biosource_type &&
                        typeof attachBiosourceTypeTo.children[biosource.biosource_type] === 'undefined'
                    ){
                        currentID += '-' + biosource.biosource_type;
                        attachBiosourceTypeTo.children[biosource.biosource_type] = {
                            'name' : biosource.biosource_type,
                            'children' : {}, // We don't show experiment_sets here because there may be multiple biosamples per expset.
                            'id' : currentID,
                            'description' : "Biosource Type: " + biosource.biosource_type,
                            'field' : 'experiments_in_set.biosample.biosource.biosource_type',
                            'term' : biosource.biosource_type,
                            'experiments' : 1
                        }
                    } else if (attachBiosourceTypeTo.children[biosource.biosource_type]){
                        attachBiosourceTypeTo.children[biosource.biosource_type].experiments++;
                    }

                    return biosource.individual.organism.name;
                }

                // A biosample can have multiple biosources in theory, so to avoid having an experiment show up multiple times,
                // e.g. per organism that is relevant, we choose ONE organism that is best applicable to this experiment.
                var organismName = null;

                // Biosource Organism name; is an array of usually 1 but sometimes multiple biosources, so make sure to include all.
                if (Array.isArray(exp.biosample.biosource)) {
                    var organismNamesEncountered = [];
                    for (var i = 0; i < exp.biosample.biosource.length; i++) {
                        organismNamesEncountered.push(updateBiosource(exp.biosample.biosource[i]));
                    }
                    if (organismNamesEncountered.length === 1) organismName = organismNamesEncountered[0]; // Easy
                    else { // Figure out most commonly-used organism for biosample, attach subsequent data to that.
                        organismName = _(organismNamesEncountered).chain()
                            .reduce(function(counts, orgName){
                                counts[orgName] = (counts[orgName] || 0) + 1;
                                return counts;
                            }, {})
                            .pairs()
                            .sortBy(1)
                            .value()[0];
                        console.log(organismName, organismNamesEncountered); // ToDo test this
                    }
                } else if (exp.biosample.biosource) {
                    organismName = updateBiosource(exp.biosample.biosource);
                }

                // Biosource type

                var biosourceUsed = _.find(exp.biosample.biosource, function(n){
                    return n.individual.organism.name === organismName;
                });
                
                var attachBioSummaryTo = rootNode.children[organismName].children[biosourceUsed.biosource_type];

                // Biosample biosource_summary (group experiment descriptions by)
                if (
                    exp.biosample.biosource_summary &&
                    typeof attachBioSummaryTo.children[exp.biosample.biosource_summary] === 'undefined'
                ){
                    var description;
                    if (typeof exp.biosample.modifications_summary_short !== 'undefined' && exp.biosample.modifications_summary_short !== 'None'){
                        description = exp.biosample.modification_summary_short;
                    } else if (biosourceUsed.biosource_name === exp.biosample.biosource_summary){
                        description = biosourceUsed.description;
                    //} else if (typeof exp.biosample.description === 'string'){
                    //    description = exp.biosample.description;
                    } else if (exp.biosample.biosource_summary) {
                        description = exp.biosample.biosource_summary;
                    }
                    attachBioSummaryTo.children[exp.biosample.biosource_summary] = {
                        'name' : exp.biosample.biosource_summary,
                        'children' : {}, // We don't show experiment_sets here because there may be multiple biosamples per expset.
                        'id' : 'root-' + biosourceUsed.individual.organism.name + '-' + biosourceUsed.biosource_type + '-' + exp.biosample.biosource_summary,
                        'description' : "Biosample: " + description,
                        'field' : 'experiments_in_set.biosample.biosource_summary',
                        'term' : exp.biosample.biosource_summary,
                        'experiments' : 1
                    }
                } else if (attachBioSummaryTo.children[exp.biosample.biosource_summary]){
                    attachBioSummaryTo.children[exp.biosample.biosource_summary].experiments++;
                }

                // Experiment Description (group experiments by)
                var attachExpSummaryTo = attachBioSummaryTo.children[exp.biosample.biosource_summary];

                if (
                    exp.biosample.biosource_summary &&
                    exp.experiment_summary &&
                    typeof attachExpSummaryTo.children[exp.experiment_summary] === 'undefined'
                ){
                    attachExpSummaryTo.children[exp.experiment_summary] = {
                        'name' : exp.experiment_summary,
                        'description' : 'Experiment Type: ' + exp.experiment_summary,
                        'id' : 'root-' + biosourceUsed.individual.organism.name + '-' + biosourceUsed.biosource_type + '-' + exp.biosample.biosource_summary + '-' + exp.experiment_summary,
                        'children' : {},
                        'field' : 'experiments_in_set.experiment_summary',
                        'term' : exp.experiment_summary,
                        'experiments' : 1
                    }
                } else if (
                    exp.biosample.biosource_summary &&
                    !exp.experiment_summary &&
                    typeof attachExpSummaryTo.children.other === 'undefined'
                ){
                    console.error("Experiment " + exp.accession + " missing experiment_summary.");
                    attachExpSummaryTo.children.other = {
                        'name' : 'Other',
                        'description' : 'Experiment Type: Other',
                        'id' : 'root-' + biosourceUsed.individual.organism.name + '-' + biosourceUsed.biosource_type + '-' + exp.biosample.biosource_summary + '-other',
                        'children' : {},
                        'field' : 'experiments_in_set.experiment_summary',
                        'term' : exp.experiment_summary,
                        'experiments' : 1
                    }
                } else if (attachExpSummaryTo.children[exp.experiment_summary]){
                    attachExpSummaryTo.children[exp.experiment_summary].experiments++;
                } else if (attachExpSummaryTo.children.other){
                    attachExpSummaryTo.children.other.experiments++;
                }

                var attachExpTo;
                if (exp.experiment_summary){
                    attachExpTo = attachExpSummaryTo.children[exp.experiment_summary];
                } else {
                    attachExpTo = attachExpSummaryTo.children.other;
                }

                // Experiments & Files
                if (
                    exp.accession &&
                    exp.biosample.biosource_summary &&
                    typeof attachExpTo.children[exp.accession] === 'undefined'
                ){
                    var allFilesFromExperiment = expFuncs.allFilesFromExperiment(exp);
                    attachExpTo.children[exp.accession] = {
                        'name' : exp.accession,
                        'fallbackSize' : 1,
                        'id' : 'root-' + biosourceUsed.individual.organism.name + '-' + biosourceUsed.biosource_type + '-' + exp.biosample.biosource_summary + '-' + (exp.experiment_summary || 'other') + '-' + exp.accession,
                        'field' : 'experiments_in_set.accession',
                        'description' : 'Experiment with ' + allFilesFromExperiment.length + ' files',
                        'children' : allFilesFromExperiment.map(function(f){
                                var color = "#ccc";
                                if (typeof files[f.accession] !== 'undefined'){
                                    files[f.accession] = true; // value doesn't really matter.
                                } else {
                                    color = '#ddd';
                                }
                                return {
                                    'name' : f.accession,
                                    'size' : 1,
                                    'description' : 'File ' + f.accession,
                                    'color' : color,
                                    'id' : 'root-' + biosourceUsed.individual.organism.name + '-' + biosourceUsed.biosource_type + '-' + exp.biosample.biosource_summary + '-' + (exp.experiment_summary || 'other') + '-' + exp.accession + '-' + f.accession,
                                    'field' : 'experiments_in_set.files.accession'
                                };
                            }),
                        'experiments': 1
                    }
                } else {
                    console.error("Check experiment hierarchy code for chart.");
                }
            }

            function childrenObjectsToArrays(node){
                if (Array.isArray(node.children)) return; // Already set elsewhere.
                if (typeof node.children === 'object' && node.children && Object.keys(node.children).length > 0){
                    // Convert children object to array.
                    node.children = _.values(node.children);
                }
                // If no children, we're done.
                if (typeof node.children === 'undefined' || !Array.isArray(node.children) || node.children.length === 0){
                    return;
                }
                // Repeat for each child node in children array.
                node.children.forEach(childrenObjectsToArrays);
            }

            experiments.forEach(getDataFromExperiment);
            childrenObjectsToArrays(rootNode);
            return rootNode;
        },

        sortAndSizeTreeDataD3 : function(data){
            return d3.hierarchy(data)
                .sum(function(d){
                    // Generates a value property for each node which governs sizing created for block in partition(root)
                    if (typeof d.size === 'number') return d.size;
                    if (
                        typeof d.fallbackSize === 'number' &&
                        (!Array.isArray(d.children) || d.children.length === 0)
                    ) return d.fallbackSize;
                    return 0;
                })
                .sort(function(a,b){
                    var dif = b.value - a.value;
                    if (dif !== 0) return dif;
                    else {
                        if (a.data.name < b.data.name) return -1;
                        else if (a.data.name > b.data.name) return 1;
                    }
                });
        },


    },

    getDefaultProps : function(){
        return {
            'data' : null,
            'width' : 100, // Used only as fallback pre-mount.
            'height' : 600,
            'id' : 'main',
            'breadcrumbs' : true, // true (show built-in), false (don't show), function (returns ChartBreadcrumbs instance), or instance of ChartBreadcrumbs.
            'descriptionElement' : true, // same as above, but for a <div> element to hold description.
            'fallbackToSampleData' : false, // Perhaps for tests.
            'handleClick' : function(e){
                console.log('Default Click Handler, clicked on:', e.target);
            },
            'colorForNode' : function(node){ // Fallback color determinator. Pass in correct func from FacetCharts.
                return 'red';
            },
            'debug' : false
        };
    },

    getInitialState : function(){
        return { 'mounted' : false, 'transitioning' : false };
    },

    resetActiveExperimentsCount : function(){
        var exps = this.getRootNode().data.experiments;
        if (typeof exps === 'number'){
            this.refs.experimentsCount.innerHTML = exps;
            if (this.refs.experimentsCount.className.indexOf('half-visible') === -1) this.refs.experimentsCount.className += ' half-visible';
        } else {
            this.refs.experimentsCount.innerHTML = '&nbsp;';
            if (this.refs.experimentsCount.className.indexOf('invisible') === -1) this.refs.experimentsCount.className += ' invisible';
        }
    },

    /* We create a throttled version of this function in componentDidMount for performance */
    mouseoverHandle : function(d){
        if (typeof d.target !== 'undefined'){
            // We have a click event from element rather than D3.
            d = d.target.__data__; // Same as: d = d3.select(d.target).datum(); (d3.select(...).node().__data__ performed internally by D3).
        }

        var expCount = (d.data || d).experiments || null;

        // .appendChild used to be faster than .innerHTML but seems
        // innerHTML is better now (?) https://jsperf.com/appendchild-vs-documentfragment-vs-innerhtml/24

        if (expCount !== null){
            this.refs.experimentsCount.innerHTML = expCount;
            if (this.refs.experimentsCount.className.indexOf('invisible') !== -1) {
                this.refs.experimentsCount.className = this.refs.experimentsCount.className.replace(' invisible','');
            }
            if (this.refs.experimentsCount.className.indexOf('half-visible') !== -1) {
                this.refs.experimentsCount.className = this.refs.experimentsCount.className.replace(' half-visible','');
            }
        } else {
            this.resetActiveExperimentsCount();
        }

        if (d.data.description && this.descriptionElement() !== null) {
            this.descriptionElement().innerHTML = d.data.description;
        } else {
            this.descriptionElement().innerHTML = '';
        }

        if (this.refs.explanation.className.indexOf('invisible') !== -1) {
            this.refs.explanation.className = this.refs.explanation.className.replace(' invisible','');
        }

        var sequenceArray = SunBurst.getAncestors(d);

        // Fade all the segments.
        // Then highlight only those that are an ancestor of the current segment.
        this.vis.selectAll("path")
            .classed("hover", false)
            .filter(function(node){
                return _.find(sequenceArray, function(sNode){ return sNode.data.id === node.data.id; }) || false;
            })
            .classed("hover", true);

        if (this.props.breadcrumbs !== false) this.updateBreadcrumbs(sequenceArray);
        if (d.data.field && d.data.term) highlightTerm(d.data.field, d.data.term, this.props.colorForNode(d));
    },

    // Restore everything to full opacity when moving off the visualization.
    mouseleave : function(d) {

        var _this = this;
        setTimeout(function(){ // Wait 50ms (duration of mouseenter throttle) so delayed handler doesn't cancel this mouseleave transition.
            // Hide the breadcrumb trail
            if (_this.props.breadcrumbs !== false) _this.updateBreadcrumbs([], '0%'); //_this.breadcrumbs().setState({ 'visible' : false });

            // Transition each segment to full opacity and then reactivate it.
            _this.vis.selectAll("path").classed('hover', false);

            _this.resetActiveExperimentsCount();

            // Erase description (important if contained outside explanation element)
            if (_this.descriptionElement()){
                _this.descriptionElement().innerHTML = '';
            }
        }, 50);
    },

    updateBreadcrumbs : function(nodeArray){
        this.breadcrumbs().setState({ 
            nodes : nodeArray.map((n)=>{
                n.color = this.props.colorForNode(n);
                return n;
            })
        });
    },

    containerDimensions : function(){
        var container = this.refs.container || null;
        if (!container){
            return { width: this.props.width, height : this.props.height };
        }
        return {
            width  : container.offsetWidth  || container.clientWidth  || this.props.width,
            height : container.offsetHeight || container.clientHeight || this.props.height
        };
    },

    updateWidthAndRadius(){
        this.width = 100;
        if (this.refs.container && typeof this.refs.container.offsetWidth === 'number'){
            this.width = this.refs.container.offsetWidth;
        } else {
            this.width = this.props.width;
        }
        this.radius = Math.min(this.width, this.props.height) / 2;
        this.partition = d3.partition().size([2 * Math.PI, this.radius * this.radius * 1.1667]);
    },

    visualizationSetup : function(){
        this.totalSize = 0; // Will be sum of leaf values (same val as root node), used for getting percentages.
        this.root = null; // Root node.

        // This partition object/function is pretty much the magic behind the starburst layout.
        // It creates all the points/sizes (x0, x1, y0, y1) needed for a partitioned layout.
        // Then these are used by 'arc' transform below to draw/put into the SVG.
        this.partition = d3.partition().size([2 * Math.PI, this.radius * this.radius * 1.1667]);
        this.arc = d3.arc()
            .startAngle(function(d) { return d.x0; })
            .endAngle(function(d) { return d.x1; })
            .innerRadius(function(d) {
                //if (d.data.field === 'experiments_in_set.files.accession') return Math.sqrt(d.y0) - ((Math.sqrt(d.y1) - Math.sqrt(d.y0)) / 2);
                if (d.data.field === 'experiments_in_set.files.accession') {
                    return (
                        Math.sqrt(d.y0) - ((Math.sqrt(d.y1) - Math.sqrt(d.y0)) / 2)
                    )
                };
                return Math.sqrt(d.y0);
            })
            .outerRadius(function(d) {
                //if (d.depth && d.depth > 3) return d.y1 * 0.5;
                if (d.data.field === 'experiments_in_set.accession') return Math.sqrt(d.y1) - ((Math.sqrt(d.y1) - Math.sqrt(d.y0)) / 2);
                if (d.data.field === 'experiments_in_set.files.accession') return Math.sqrt(d.y0);
                //return d.y1;
                return Math.sqrt(d.y1);
            });
    },

    componentWillMount : function(){
        this.updateWidthAndRadius(); // For init pre-mount render.
        this.visualizationSetup();
        this.throttledMouseOverHandler = _.throttle(this.mouseoverHandle, 50); // Improve performance
    },

    componentDidMount : function(){
        if (this.props.debug) console.log("Mounted Sunburst chart");
        /**
         * Manage own state for this component (ex. mounted state) so don't need to re-render and re-initialize chart each time.
         */

        if (!this.state.mounted){
            this.updateWidthAndRadius();
            this.justMounted = true;
            this.setState({ 'mounted' : true });
            if (this.refs.explanation) this.refs.explanation.className = this.refs.explanation.className.replace(' invisible','');
            return;
        }
    },

    getRootNode : function(){ return this.root || this.props.data || null; },

    /** 
     * Determine if should change state.transitioning to true and/or perform manual transitions. Use from lifecycle methods.
     * 
     * @param {Object} nextProps - Most recent props received (can be nextProps or this.props, depending on lifecycle method used).
     * @param {Object} nextProps.data - Hierarchial data as returned by @see SunBurst.transformDataForChart.
     * @param {Object} pastProps - Previous props which we have (can be pastProps or this.props, depending on lifecycle method used).
     * @param {Object} pastProps.data - Hierarchial data as returned by @see SunBurst.transformDataForChart.
     */
    shouldPerformManualTransitions : function(nextProps, pastProps){
        return !!(
            (
                nextProps.data &&
                nextProps.data !== pastProps.data &&
                !SunBurst.isDataEqual(nextProps.data, pastProps.data)
            )
        );
    },

    componentWillReceiveProps : function(nextProps){
        if (this.shouldPerformManualTransitions(nextProps, this.props)){
            this.setState({ 'transitioning' : true });
        }
    },

    shouldComponentUpdate : function(nextProps, nextState){
        if (this.state.transitioning !== nextState.transitioning){
            return true;
        } else if (nextState.mounted !== this.state.mounted){
            return true;
        } else if (this.shouldPerformManualTransitions(nextProps, this.props)){
            return true;
        } else if (nextProps.height !== this.props.height) {
            if (nextProps.height < this.props.height){
                this.scaleChart(nextProps, this.props); // Defer update so we can scale chart down (visual effect)
                return false;
            }
            return true;
        }
        // Default - don't update for most changes (performance, keep chart if new but outdated/invalid data, etc.)
        return true;
    },

    componentDidUpdate : function(pastProps, pastState){

        if (this.props.debug) console.info("Sunburst chart updated");

        if (this.shouldPerformManualTransitions(this.props, pastProps)){
            // state.transitioning = false was set in componentWillReceiveProps.
            if (this.existingNodes && _.keys(this.existingNodes).length > 0){ // We might not have any existing paths to transition.
                this.transitionPathsD3ThenEndTransitionState(); // Animate here, then end transition state.
            } else {
                if (this.props.debug) console.info("No paths to perform transitions on.");
                this.setState({ 'transitioning' : false }, util.mixin.cancelPreventClicks.bind(this));
           }
        } else {
            util.mixin.cancelPreventClicks.call(this);
        }

        if (this.state.mounted === true){
            this.justMounted = false; // unset (execs after render)
        }

        this.adjustExplanationPosition();
    },

    transitionPathsD3ThenEndTransitionState : function(duration = 750){
        if (this.props.debug) console.info("Starting D3 transition on SunBurst.");

        var existingToTransition2 = this.vis.selectAll('path').filter(function(d){
            return d.depth < 5;
        });

        // Since 'on end' callback is called many times (multiple paths transition), defer until called for each.
        var transitionCompleteCallback = _.after(existingToTransition2.nodes().length, ()=>{
            if (this.props.debug) console.info('Finished D3 transition on SunBurst.');
            this.setState({ transitioning : false }, util.mixin.cancelPreventClicks.bind(this));
        });

        existingToTransition2
            .transition()
            .duration(duration)
            .attrTween('d', this.arcTween)
            .on('end', transitionCompleteCallback);
    },

    arcTween : function(a){
        var coordInterpolation = d3.interpolate({
            x0: a.x0_past,
            x1: a.x1_past
        }, a);
        return (time) => {
            var b = coordInterpolation(time);
            //console.log('TWEENB', b, a);
            //a.x0_past = b.x0;
            //a.x1_past = b.x1;
            return this.arc(b);
        };
    },

    /** 
     * This is a visual trick (more or less), meant to be run only when props.height has decreased to scale down chart before updating.
     * This is separate functionality/design from shouldPerformManualTransitions/state.transition/render-adjustments. 
     * 
     * @param {Object} nextProps - Most recent props received (can be nextProps or this.props, depending on lifecycle method used).
     * @param {number} nextProps.height - Height value (we determine own width value).
     * @param {Object} pastProps - Previous props which we have (can be pastProps or this.props, depending on lifecycle method used).
     * @param {number} pastProps.height - Height value (we determine own width value).
     */
    scaleChart : function(nextProps, pastProps){
        if (this.props.debug) console.info('Scaling SunBurst Chart');
        var newWidth =  this.refs.container ? this.refs.container.offsetWidth : this.width;
        //this.updateWidthAndRadius();
        var s = Math.min(nextProps.height, newWidth) / Math.min(pastProps.height, this.width); // Circle's radius is based off smaller dimension (w or h).
        
        util.requestAnimationFrame(() => {
            this.refs.explanation.className += ' invisible';
            this.refs.chart.style.height = nextProps.height + 'px';
            this.refs.chart.style.transform = util.style.scale3d(s) + ' ' + util.style.translate3d((newWidth - this.width) / 2, (nextProps.height - pastProps.height) / 2, 0);
            
            setTimeout(()=>{
                util.requestAnimationFrame(() => {
                    this.refs.chart.style.transition = 'none'; // No transition before next update of transform style prop
                    this.refs.chart.style.transform = 'none';
                    console.info("Ending scale transition on SunBurst.");
                    //this.setState({ 'transitioning' : false }, ()=>{
                        this.forceUpdate();
                        setTimeout(()=>{
                            this.refs.chart.style.transition = '';
                        }, 50);
                    //});
                });
            }, 750);
        });
    },

    /** Get refs to breadcrumb and description components, whether they created by own component or passed in as props. */
    breadcrumbs : function(){ return util.mixin.getBreadcrumbs.call(this); },
    descriptionElement : function(){ return util.mixin.getDescriptionElement.call(this); },

    adjustExplanationPosition : function(){
        var height = this.refs.explanation.offsetHeight || this.refs.explanation.clientHeight || 45;
        var width = this.refs.explanation.offsetWidth || this.refs.explanation.clientWidth || 140;
        _.extend(this.refs.explanation.style, {
            'marginTop' : '-' + (height / 2) + 'px',
            'marginLeft' : '-' + (width / 2) + 'px'
        });
        setTimeout(()=>{
            this.refs.experimentsCount.innerHTML = this.getRootNode().data.experiments;
            this.refs.experimentsCount.className = this.refs.experimentsCount.className.replace(' invisible',' half-visible');
            this.refs.explanation.className = this.refs.explanation.className.replace(' invisible','');
        }, 500);
    },

    componentWillUnmount : function(){
        // Clean up our stuff, just in case.
        delete this.throttledMouseOverHandler;
        delete this.arc;
        delete this.partition;
        delete this.width;
        delete this.height;
        delete this.radius;
        delete this.totalSize;
        delete this.existingNodes;
        delete this.root;
        delete this.vis;
    },

    /** 
     * Generates React Path components for chart which themselves render out a React SVG path element with proper 'd' attribute.
     * 
     * @param {Object} [data=this.props.data] - Hierarchial data as returned by SunBurst.transformDataForChart and passed in through props.
     * @return {Object[]} Array of React Path components to include in and output out of render method.
     * @see SunBurst.Path
     * @see SunBurst.transformDataForChart
     */
    generatePaths : function(data = this.props.data){

        this.root = SunBurst.sortAndSizeTreeDataD3(data);
        this.partition(this.root);
        var _this = this;

        // For efficiency, filter nodes to keep only those large enough to see.
        var nodes = _this.root.descendants().filter(function(d){
            return (Math.abs(d.x1-d.x0) > 0.01); // 0.005 radians = 0.29 degrees 
        }).sort(function(a,b){
            return a.data.name < b.data.name ? -1 : 1;
        }).sort(function(a,b){
            return a.depth - b.depth;
        });

        var pastExistingNodes = _.clone(_this.existingNodes);

        if (this.state.transitioning || this.justMounted) {
            _this.existingNodes = {};
        }
        
        function genPath(node, nodeIndex, allNodes, removing = false){
            var existing = !!(pastExistingNodes && pastExistingNodes[node.data.id]);

            var hasTerm = typeof node.data.field === 'string' && typeof node.data.term === 'string';
            var className = (hasTerm && node.data.noClick !== true ? "clickable" : "static");
            
            if (!removing && (_this.state.transitioning || _this.justMounted)) _this.existingNodes[node.data.id] = node;
            
            return (
                <path
                    style={{
                        opacity : node.depth && node.depth > 0 ? null : 0,
                        fill    : _this.props.colorForNode(node),
                        zIndex: existing ? 2 : 1
                    }}
                    ref={(r)=>{
                        if (r && _this.state.transitioning){
                            if (!existing) {
                                d3.select(r).datum(_.extend(node, {
                                    x0_past: node.x0 + ((node.x1 - node.x0) / 2),
                                    x1_past: node.x0 + ((node.x1 - node.x0) / 2)
                                }));
                            } else if (removing) {
                                d3.select(r).datum(_.extend(node, {
                                    x0_past: node.x0,
                                    x1_past: node.x1,
                                    x0: node.x0 + ((node.x1 - node.x0) / 2),
                                    x1: node.x0 + ((node.x1 - node.x0) / 2)
                                }));
                            } else if (existing){ // also 'removing'
                                d3.select(r).datum(_.extend(node, {
                                    x0_past: pastExistingNodes[node.data.id].x0,
                                    x1_past: pastExistingNodes[node.data.id].x1
                                }));
                            } else {
                                d3.select(r).datum(node);
                            }
                        } else {
                            d3.select(r).datum(node);
                        }
                    }}
                    d={_this.arc(node)}
                    fillRule="evenodd"
                    className={className + (removing ? ' removing' : (!existing ? ' adding' : ''))}
                    onMouseOver={node.depth ? (e)=>{ e.persist(); _this.throttledMouseOverHandler(e); } : null }
                    onMouseEnter={ node.depth === 0 ? _this.mouseleave : null }
                    onMouseLeave={node.depth ? function(e){ unhighlightTerms(e.target.__data__.data.field); } : null}
                    onClick={hasTerm && !node.data.noClick ? _this.props.handleClick : null}
                    key={node.data.id}
                    data-key={node.data.id}
                />
            );
        }
        
        //return nodes.map(genPath);

        ///* ToDo: 'Removing' nodes transition
        var pathComponents = nodes.map(genPath);
        var pathComponentsToRemove = _.map(
            _.filter(
                _.values(pastExistingNodes),
                function(n){ return typeof _this.existingNodes[n.data.id] === 'undefined'; }
            ),
            function(n,i,a){
                return genPath(n,i,a,true);
            }
        )

        return pathComponentsToRemove.concat(pathComponents);
        //*/
    },

    render : function(){
        
        // Generate breadcrumb/description elements IF their prop vals are true.
        function breadcrumbs(){
            if (this.props.breadcrumbs !== true) return null;
            return <ChartBreadcrumbs parentId={this.props.id} ref="breadcrumbs" />;
        }

        function description(){
            if (this.props.descriptionElement !== true) return null;
            return <div id={this.props.id + "-description"} className="description" ref="description"></div>;
        }

        function renderSVG(){
            return (
                <svg key={this.props.id + "-svg"} style={{'width' : this.width, 'height' : this.props.height }} ref="svgElem">
                    <g
                        key={this.props.id + "-svg-group"} 
                        className="group-container"
                        ref={(r) => { this.vis = d3.select(r); }}
                        transform={"translate(" + (this.width / 2) + "," + (this.props.height / 2) + ")"}
                        onMouseLeave={this.mouseleave}
                    >
                        <circle r={this.radius} className="bounding-circle" key={this.props.id +"-bounding-circle"} />
                        { this.state.mounted ? this.generatePaths() : null }
                    </g>
                </svg>
            );
        }

        this.updateWidthAndRadius();
        this.visualizationSetup();

        // Wrapping stuff
        return (
            <div
                className={"chart-container chart-container-sunburst" + (this.props.data === null && !this.props.fallbackToSampleData ? ' no-data' : '')}
                id={this.props.id}
                ref="container"
                key={this.props.id + '-chart-container'}
                style={{
                    transform : 'none'
                }}
            >
                { breadcrumbs.call(this) }
                <div id={this.props.id + "-chart"} className="chart chart-sunburst" ref="chart" style={{
                    'height' : this.props.height,
                    'transform' : ''
                }} key={this.props.id + "-chart"}>
                    <div id={this.props.id + "-explanation"} ref="explanation" className="explanation invisible">
                        <div id={this.props.id + "-experiments-count"} className="experiments-count half-visible" ref="experimentsCount">
                            { this.root ? this.root.data.experiments : <span>&nbsp;</span> }
                        </div>
                        { description.call(this) }
                    </div>
                    { renderSVG.call(this) }
                </div>
            </div>
                
        );
    }

});

module.exports = SunBurst;