'use strict';

var React = require('react');
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
var _ = require('underscore');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { expFxn, Filters, console, Schemas, object, isServerSide } = require('./../util');
var { CursorComponent, RotatedLabel } = require('./components');

// Share one instance between all charts because D3 selector acts on common class/elem names.
var mouseleaveTimeout = null;

/**
 * Based on Sunburst D3 Example @ http://bl.ocks.org/kerryrodden/7090426
 * This chart contains NO STATE object, because it is drawn and rendered after mount.
 * Maybe we could output an <svg> in the render function, but this might make using certain features of D3 difficult.
 * We re-render chart (via shouldComponentUpdate(), reset()) only when data has changed, or needs to be redrawn due to dimension change.
 */

var MosaicChart = createReactClass({

    statics : {
        /**
         * Given a node in a partition layout, return an array of all of its ancestor
         * nodes, highest first, but excluding the root.
         * 
         * @param {Node} node - Current node.
         * @returns {Array} An array of parent & (grand-*)parent nodes, ordered.
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

        /** 
         * Get all nodes from root node (or other parent node) which have matching depth.
         * @param {Object} rootNode
         * @param {number} depth
         * @param {function} [filter] - Optional object whose keys/vals to filter resulting nodes by.
         * @returns {Array} List of all (grand-)child nodes with matching depth and filter, if filter is set.
         */
        getAllNodesAtDepth : function(rootNode, depth = 1, filter = null){
            return _.reduce(rootNode.children, function(m, childNode){
                if (childNode.depth === depth) {
                    if (typeof filter === 'function'){
                        if (filter(childNode)) m.push(childNode);
                    } else {
                        m.push(childNode);
                    }
                } else if ((childNode.depth < depth) && Array.isArray(childNode.children)){
                    m = m.concat(MosaicChart.getAllNodesAtDepth(childNode, depth, filter));
                }
                return m;
            },[]);
        },

        isDataEqual(data1, data2){
            var equal = true;

            function checkChildrenLengthRecursive(node1, node2, depth = 0){
                if ((node1 && !node2) || (!node1 && node2)) equal = false;
                //if (typeof node1.active === 'number' && typeof node2.active !== 'number') equal = false;
                //if (typeof node1.active !== 'number' && typeof node2.active === 'number') equal = false;
                if (node1.active !== node2.active) equal = false;
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
         * @param {Object[]} experiments - Data graph containing structure of experiment_sets as returned by server (or experiments as returned by FacetList.siftExperiments).
         * @param {Object[]|Object} [filteredExperiments] - Extra array or object (keyed by exp accession) of experiments which have been filtered.
         * @param {Object[]} [fields] - List of data defining hierarchial fields for chart, ordered outward. Use either functions or strings for (certain) data values.
         * @return {Object} - Root node of tree hierarchy.
         */
        transformDataForChart : function(
            experiments,
            filteredExperiments = null,
            fields = [],
            maxFieldDepthIndex = null
        ){

            // Correct experiments obj to '@graph' if we passed in a context instead of experiment_sets (and then gather all experiments from it).
            if (
                !Array.isArray(experiments) &&
                experiments &&
                typeof experiments === 'object' &&
                Array.isArray(experiments['@graph'])
            ) experiments = experiments['@graph'];

            // Gather experiments to loop over every experiment we have that was returned from /browse/ endpoint, if we have experiment_sets.
            if (Array.isArray(experiments) && Array.isArray(experiments[0].experiments_in_set)){
                experiments = expFxn.listAllExperimentsFromExperimentSets(experiments);
            }

            // Change filteredExperiments into object keyed by accession for easier/faster lookups.
            if (Array.isArray(filteredExperiments)) filteredExperiments = expFxn.convertToObjectKeyedByAccession(filteredExperiments, false);
            
            // We create children OBJECT on each layer to gather children by w.e. field needed, where the unique field value is key.
            // Then recursively convert to array for use by chart.

            // First child (depth == 1) should be organism. ('root' node will have depth == 0)
            var rootNode = {
                'name'        : 'root',
                'children'    : {},
                'experiments' : 0,
                'id'          : 'root',
                'fields'      : _.pluck(fields, 'field'),
                'active'      : 0,
                'files'       : 0,
                'activeFiles' : 0
            };

            var duplicateExpSetCounts = {}; // Keep track of duplicates and set on expset nodes.

            // Ideally (for readability) would looping over each experiment & grab property of each instead of biosource 
            // (biosource is metadata property on experiment)
            // but experiment.biosample.biosource is an array so might miss some.

            function getDataFromExperiment(exp){

                function attachNode(fieldIndex, attachToNode, currID){
                    if (fieldIndex >= fields.length) return true;
                    var field = fields[fieldIndex];
                    var fieldValue = object.getNestedProperty(exp, (field.aggregatefield || field.field).replace('experiments_in_set.', ''), true);
                    
                    if (!fieldValue){
                        console.warn("Couldn't get value for " + (field.aggregateField || field.field) + ' from:', exp);
                        fieldValue = "None";
                    }

                    function genNode(term = fieldValue){
                        
                        var callbackArgs = [term, currID, experiments, filteredExperiments, exp, attachToNode];

                        var node = {
                            'id'          : currID,
                            'name'        : typeof field.name === 'function' ? field.name.apply(field.name, callbackArgs) : term,
                            'experiments' : 0,
                            'active'      : 0,
                            'files'       : 0,
                            'activeFiles' : 0,
                            'term'        : term,
                            'field'       : field.field,
                            'children'    : typeof field.children === 'function' ? field.children.apply(field.children, callbackArgs) : {}
                        };


                        // Conditional properties

                        if (field.isFacet === false || field.clickable === false) node.noClick = true;

                        if      (typeof field.title === 'string')   node.title = field.title;
                        else if (typeof field.title === 'function') node.title = field.title.apply(field.title, callbackArgs);
                        else if (typeof field.title === 'undefined')node.title = Schemas.Field.toName(field.field);
                        
                        if      (typeof field.fallbackSize === 'number')   node.fallbackSize = field.fallbackSize;
                        else if (typeof field.fallbackSize === 'function') node.fallbackSize = field.fallbackSize.apply(field.fallbackSize, callbackArgs);
                        
                        if      (typeof field.description === 'string')   node.description = field.description;
                        else if (typeof field.description === 'function') node.description = field.description.apply(field.description, callbackArgs);

                        if      (typeof field.size === 'number')   node.size = field.size;
                        else if (typeof field.size === 'function') node.size = field.size.apply(field.size, callbackArgs);

                        if      (typeof field.aggregateField === 'string')   node.aggregateField = field.aggregateField;

                        if      (typeof field.color === 'string')   node.color = field.color;
                        else if (typeof field.color === 'function') node.color = field.color.apply(field.color, callbackArgs);

                        return node;
                    }

                    function attachOrUpdateNode(term){
                        currID += '~' + term;
                        if (typeof attachToNode.children[term] === 'undefined'){
                            attachToNode.children[term] = genNode(term);
                        }
                        
                        //var filesCount = expFxn.fileCount(exp);
                        attachToNode.children[term].experiments++;
                        attachToNode.children[term].files += expFxn.fileCount(exp);

                        if (filteredExperiments && filteredExperiments[exp.accession]){ 
                            attachToNode.children[term].active++;
                            //attachToNode.children[term].activeFiles += filesCount;
                        }

                        if (field.field === 'accession') {
                            if (typeof duplicateExpSetCounts[term] === 'undefined'){
                                duplicateExpSetCounts[term] = { setCount : 0, expCount : 0 };
                            }
                            duplicateExpSetCounts[term].setCount++;
                            duplicateExpSetCounts[term].expCount++;
                            attachToNode.children[term].experiment_sets = 1;
                        } else { 
                            addExpSetsToNode(attachToNode.children[term]);
                        }

                        // Recurse & repeat for subsequent fields (child node(s)), currID should have been modified by genNode().
                        return attachNode(fieldIndex + 1, attachToNode.children[term], currID);
                    }

                    if (Array.isArray(attachToNode.children)) return null; // Can't attach, children already set as array.

                    if (Array.isArray(fieldValue)){
                        if (fieldValue.length === 1){
                            return attachOrUpdateNode(fieldValue[0]);
                        } else if (field.field === 'accession') {
                            return fieldValue.map(function(fv){ return attachOrUpdateNode(fv); });
                        } else {
                            // Needs to be tested
                            //console.log('FV1',fieldValue);
                            fieldValue = _(fieldValue).chain()
                                .reduce(function(counts, orgName){
                                    counts[orgName] = (counts[orgName] || 0) + 1;
                                    return counts;
                                }, {})
                                .pairs()
                                .sortBy(function(fieldValPair){ return -fieldValPair[1]; })
                                .value()[0][0]; // [['human', 2], ...] -- grab first item from first array ('human')
                            //console.log('FV2',fieldValue);
                            return attachOrUpdateNode(fieldValue);
                        }
                    }

                    return attachOrUpdateNode(fieldValue, currID);
                }

                function addExpSetsToNode(node){
                    if (Array.isArray(exp.experiment_sets)){
                        var setIDs = null;
                        if (typeof exp.experiment_sets[0] === 'string') setIDs = exp.experiment_sets;
                        else if (exp.experiment_sets[0] && exp.experiment_sets[0]['@id']) setIDs = _.pluck(exp.experiment_sets, '@id');
                        if (!setIDs) return node;
                        if (!node.experiment_sets) node.experiment_sets = new Set();
                        for (var i = 0; i < setIDs.length; i++){
                            // Set obj ensures entries are unique. We convert the Set sizes to counts later.
                            node.experiment_sets.add(setIDs[i]);
                        }
                    }
                    return node;
                }

                var currentID = rootNode.id; // 'root' -- built into root~in-situ Hi-C~human~ ...etc and set at each field level

                // Recursively attach nodes, using either best match in case of encountering 'array-ified' property (greatest occurence)
                // Or split (in case of expsets)
                attachNode(0, rootNode, currentID);

                rootNode.experiments++;
                if (filteredExperiments && filteredExperiments[exp.accession]) { 
                    rootNode.active++;
                    rootNode.files += expFxn.fileCount(exp);
                    addExpSetsToNode(rootNode);
                } else if (!filteredExperiments){
                    addExpSetsToNode(rootNode);
                    rootNode.files += expFxn.fileCount(exp);
                }
                //addExpSetsToNode(rootNode);
            }

            function gatherChildrenSize(node){
                if (
                    !node.children || 
                    (typeof node.children !== 'object' && !Array.isArray(node.children)) ||
                    (typeof node.children === 'object' && _.keys(node.children).length === 0) ||
                    (Array.isArray(node.children) && node.children.length === 0)
                ){
                    if (node.fallbackSize) return node.fallbackSize;
                    return 0;
                }
                return _.reduce(node.children, function(count, childNode){
                    if (typeof childNode.size === 'number'){
                        return count + childNode.size;
                    } else {
                        return count + gatherChildrenSize(childNode);
                    }
                }, 0);
            }

            function childrenObjectsToArrays(node, depth = -1){ // Start at -1 so depth is same as field index (account for root node).
                
                if (typeof maxFieldDepthIndex === 'number' && depth >= maxFieldDepthIndex){
                    // We don't chart past this node's depth.
                    if (typeof node.size !== 'number') node.size = gatherChildrenSize(node);
                    delete node.children;
                    return;
                }
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
                for (var i=0; i < node.children.length; i++){
                    childrenObjectsToArrays(node.children[i], depth + 1);
                }
            }

            function experimentSetSetsToCounts(node){
                if (node.field === 'accession'){
                    node.duplicates = duplicateExpSetCounts[node.term].setCount;
                    node.total_experiments = duplicateExpSetCounts[node.term].expCount;
                } 
                if (node.experiment_sets instanceof Set) {
                    node.experiment_sets = node.experiment_sets.size;
                }
                // Recurse
                if (Array.isArray(node.children))           node.children.map(experimentSetSetsToCounts);
            }

            experiments.forEach(getDataFromExperiment);
            childrenObjectsToArrays(rootNode);
            experimentSetSetsToCounts(rootNode);
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
                    // Positions of paths under parent
                    //var dif = b.value - a.value;
                    //if (a.depth < 3) console.log('AB', a, b);
                    var dif;
                    if (typeof a.data.experiments === 'number' && typeof b.data.experiments === 'number'){
                        dif = a.data.experiments - b.data.experiments;
                        if (dif !== 0) return dif; // Ascending
                    } else if (Array.isArray(a.children) && Array.isArray(b.children)){
                        dif = a.children.length - b.children.length;
                        if (dif !== 0) return dif; // Ascending
                    }
                    if (a.data.name < b.data.name) return -1;
                    else if (a.data.name > b.data.name) return 1;
                });
        },

        /**
         * Get default style options for chart. Should suffice most of the time.
         * 
         * @returns {Object} Object of style/dimension properties & values.
         */
        getDefaultStyleOpts : function(){
            return {
                'gap' : 5,
                'maxBarWidth' : 60,
                'labelRotation' : 30,
                'maxLabelWidth' : null,
                'labelWidth' : 200,
                'offset' : {
                    'top' : 0,//18,
                    'bottom' : 50,
                    'left' : 0,
                    'right' : 0
                }
            };
        }

    },

    getDefaultProps : function(){
        return {
            'data' : null,
            'experiments' : null,
            'filteredExperiments' : null,
            'width' : null,
            'height' : 600,
            'fields' : null,
            'maxFieldDepthIndex' : null, // If set, will not display fields past this index, though will still calculate values for it.
            'id' : 'main',
            'fallbackToSampleData' : false, // Perhaps for tests.
            'handleClick' : function(e){
                console.log('Default Click Handler, clicked on:', e.target);
            },
            'styleOptions' : null, // @see MosaicChart.getDefaultStyleOpts for possible options.
            'doManualTransitions' : false,
            'debug' : false
        };
    },

    getInitialState : function(){
        return { 'mounted' : false, 'transitioning' : false };
    },

    styleOptions : function(){ return vizUtil.extendStyleOptions(this.props.styleOptions, MosaicChart.getDefaultStyleOpts()); },

    resetActiveExperimentsCount : function(){
        var rootNode = this.getRootNode();
        if (typeof this.props.updateStats === 'function'){
            this.props.updateStats({
                'experiments' : rootNode.data.active || rootNode.data.experiments || 0,
                'experiment_sets' : rootNode.data.experiment_sets || 0,
                'files' : rootNode.data.activeFiles || rootNode.data.files || 0
            });
        }
    },

    onPathMouseOver : function(e){
        if (!e || !e.target || !e.target.__data__) {
            // No D3 data attached to event target.
            this.mouseleave(e);
            return null;
        }
        if (mouseleaveTimeout){
            clearTimeout(mouseleaveTimeout);
            mouseleaveTimeout = null;
        }
        this.mouseoverHandle(e.target.__data__);
    },

    /* We create a throttled version of this function in componentDidMount for performance */
    /**
     * @param {Object} d - Node datum with depth, etc.
     */
    mouseoverHandle : _.throttle(function(d, target=true){
        if (!target) return false;
        var ancestorsArray = MosaicChart.getAncestors(d);
        /*
        var siblingArray = MosaicChart.getAllNodesAtDepth(
            this.root,
            d.depth,
            function(n){ return n.data.term === d.data.term; }//.bind(this)
        );
        */
        var currentNodeCounts = {
            experiments : d.data.active || d.data.experiments || 0,
            experiment_sets : d.data.experiment_sets || 0,
            files : d.data.activeFiles || d.data.files || 0
        };

        /*
        var totalCounts = _.reduce(
            siblingArray, (m, n) => {
                if (n.data.active || !this.root.data.active) {
                    m.experiments += n.data.active || n.data.experiments || 0;
                    m.experiment_sets += n.data.experiment_sets || 0;
                    m.files += n.data.activeFiles || n.data.files || 0;
                    return m;
                } else return m;
            }, {
                experiments : 0,
                experiment_sets : 0,
                files : 0
            }
        );
        */

        // .appendChild used to be faster than .innerHTML but seems
        // innerHTML is better now (?) https://jsperf.com/appendchild-vs-documentfragment-vs-innerhtml/24
        if (currentNodeCounts.experiments){
            //if (typeof this.props.updateStats === 'function'){
            //    this.props.updateStats(currentNodeCounts);
            //}

            /*
            if (this.refs && this.refs.detailCursor && typeof this.refs.detailCursor.update === 'function'){
                this.refs.detailCursor.update({
                    term : d.data.term,
                    title : d.data.name
                })
            }
            */
        }

        if (typeof this.props.updatePopover === 'function'){
            this.props.updatePopover({
                term : d.data.term,
                title : d.data.name,
                field : d.data.field,
                filteredOut : (this.root && this.root.data.active && !d.data.active) || false,
                color : vizUtil.colorForNode(d),
                path : ancestorsArray.map(function(n){
                    return n.data;
                })
            });
        }

        //console.log(ancestorsArray);

        vizUtil.requestAnimationFrame(()=>{

            if (d.data.field && d.data.term) vizUtil.highlightTerm(d.data.field, d.data.term, vizUtil.colorForNode(d));

            // Fade all the segments.
            // Then highlight only those that are an ancestor of the current segment.

            var initSelection = d3.selectAll("svg.sunburst-svg-chart path")
                .classed("hover", false);
            
            var ancestorSelection = initSelection
                .filter(function(node){
                    return _.find(ancestorsArray, function(sNode){ return sNode.data.id === node.data.id; }) || false;
                })
                .classed("hover", true);

            //var siblingSelection = initSelection
            //    .filter(function(node){
            //        return _.find(siblingArray, function(sNode){ return sNode.data.id === node.data.id; }) || false;
            //    })
            //    .classed("hover", true);

            d3.selectAll("svg.sunburst-svg-chart > g").classed('hover',
                ancestorSelection && Array.isArray(ancestorSelection._groups) && ancestorSelection._groups[0].length > 0
            );
            

        });

        //this.updateBreadcrumbs(ancestorsArray);
    }, 50),

    // Restore everything to full opacity when moving off the visualization.
    mouseleave : function(e) {
        if (e) {
            //e.persist();
            // Cancel if left to go onto another path.
            if (e && e.relatedTarget && e.relatedTarget.__data__ 
                && e.relatedTarget.__data__.data && e.relatedTarget.__data__ .data.id
            ) return null;
        }
        if (mouseleaveTimeout){
            return null;
        }
        var _this = this;
        mouseleaveTimeout = setTimeout(function(){ // Wait 50ms (duration of mouseenter throttle) so delayed handler doesn't cancel this mouseleave transition.
            vizUtil.requestAnimationFrame(function(){
                // Hide the breadcrumb trail
                //_this.updateBreadcrumbs([], '0%');

                // Transition each segment to full opacity and then reactivate it.
                d3.selectAll("svg.sunburst-svg-chart path, svg.sunburst-svg-chart > g").classed('hover', false);
                //_this.vis.selectAll("path").classed('hover', false);

                vizUtil.unhighlightTerms();

                //_this.resetActiveExperimentsCount();

                if (typeof _this.props.updatePopover === 'function'){
                    _this.props.updatePopover({
                        term : null,
                        title : null,
                        field : null,
                        color : null,
                        path : []
                    });
                }

                mouseleaveTimeout = null;

            });
        }, 150);
    },

    updateBreadcrumbs : function(nodeArray){
        if (typeof this.props.updateBreadcrumbsHoverNodes !== 'function') return null;
        this.props.updateBreadcrumbsHoverNodes(
            nodeArray.map((n)=>{
                n.color = vizUtil.colorForNode(n);
                return n;
            })
        );
    },

    /**
     * Get height of chart, accounting for style/dimension offsets from parent container.
     * 
     * @param {number} [baseHeight=props.height] - Original height, defaults to props.height. 
     * @return {number} visible chart height, corrected for any offsets
     */
    height : function(baseHeight = this.props.height){
        var styleOpts = this.styleOptions();
        return baseHeight - styleOpts.offset.bottom - styleOpts.offset.top;
    },

    /**
     * Get width of chart, accounting for style/dimension offsets from parent container.
     * 
     * @param {number} [baseWidth=this.baseWidth()] - Original width, defaults to props.width or refs.container.offsetWidth.
     * @return {number} visible chart width, corrected for any offsets.
     */
    width : function(baseWidth = this.baseWidth()){
        var styleOpts = this.styleOptions();
        return baseWidth - styleOpts.offset.left - styleOpts.offset.right;
    },

    /**
     * Provides fallback to props.width, using refs.container.offsetWidth if set.
     * 
     * @return {number} analogous to and fallback for props.width, if none set.
     */
    baseWidth : function(){
        if (this.props.width) return this.props.width;
        return (this.refs && this.refs.container && this.refs.container.offsetWidth) || null;
    },

    chartLevelsCount : function(props = this.props){
        var numNodeLevelsShown = props.maxFieldDepthIndex ? Math.min(props.maxFieldDepthIndex, props.fields.length - 1) + 1 : props.fields.length;
        return (
            numNodeLevelsShown + 
            (
                1 + // For root node
                (!props.maxFieldDepthIndex && typeof props.fields[props.fields.length - 1].children !== 'undefined' ? 1 : 0) // We have another leaf node layer defined in last field.
            )
        );
    },

    chartLayersWidth : function(props = this.props){
        return (
            this.singleChartLayerWidth(props) * this.chartLevelsCount(props)
        );
    },

    singleChartLayerWidth : function(props = this.props){
        var dim = this.height(props.height); // Swap to height or width depending on if aligning vertically (= width) or horizontally (= height)
        return dim / (this.chartLevelsCount(props) - 1);
    },

    visualizationSetup : function(){
        this.totalSize = 0; // Will be sum of leaf values (same val as root node), used for getting percentages.
        this.root = null; // Root node.

        // This partition object/function is pretty much the magic behind the starburst layout.
        // It creates all the points/sizes (x0, x1, y0, y1) needed for a partitioned layout.
        // Then these are used by 'arc' transform below to draw/put into the SVG.
        this.partition = d3.partition().size([
            //this.height(), // Use height for X coords & vice-versa -- and then flip back in this.generateRectPath.
            this.width(),
            this.chartLayersWidth()
        ]);
        return;
        /*
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
            */
    },

    generateRectPath : function(node){
        var path = d3.path();

        var args = [            // // ROTATE D3 PARTITION
            node.x0,            // X
            node.y0,            // Y
            node.x1 - node.x0,  // Width
            node.y1 - node.y0   // Height
        ];
        if (node.data.field === 'accession'){
            //console.log(node.data.term, node.data.active, node.data.experiments, node.data.total_experiments, node.data.duplicates);
            // If ExpSet w/ only some experiments matching filters, decrease width relatively.
            if ((node.data.active || node.data.experiments) < node.data.total_experiments){
                args[2] = args[2] * ((node.data.active || node.data.experiments) / node.data.total_experiments);
            }
        }
        path.rect.apply(path, args);
        return path;
    },

    componentDidMount : function(){
        if (this.props.debug) console.log("Mounted MosaicChart");
        /**
         * Manage own state for this component (ex. mounted state) so don't need to re-render and re-initialize chart each time.
         */

        if (!this.state.mounted){
            this.justMounted = true;
            this.setState({ 'mounted' : true });
            return;
        }
    },

    getRootNode : function(){ return this.root || null; },

    /** 
     * Determine if should change state.transitioning to true and/or perform manual transitions. Use from lifecycle methods.
     * 
     * @param {Object} nextProps - Most recent props received (can be nextProps or this.props, depending on lifecycle method used).
     * @param {Object} nextProps.data - Hierarchial data as returned by @see MosaicChart.transformDataForChart.
     * @param {Object} pastProps - Previous props which we have (can be pastProps or this.props, depending on lifecycle method used).
     * @param {Object} pastProps.data - Hierarchial data as returned by @see MosaicChart.transformDataForChart.
     */
    shouldPerformManualTransitions : function(nextProps, pastProps){
        return !!(
            nextProps.doManualTransitions && (
                (
                    nextProps.experiment_sets &&
                    nextProps.experiment_sets !== pastProps.experiment_sets &&
                    !_.isEqual(nextProps.experiment_sets, pastProps.experiment_sets)
                ) || (
                    nextProps.filtered_experiment_sets !== pastProps.filtered_experiment_sets &&
                    !_.isEqual(nextProps.filtered_experiment_sets, pastProps.filtered_experiment_sets)
                )
            )
        );
    },
    ///*
    componentWillReceiveProps : function(nextProps){
        // Stop current transitions or things will throw errors and break (D3 unable to find element it was transitioning)
        if (this.state.transitioning){
            this.getPathsToManuallyTransition().interrupt();
        }
        if (this.shouldPerformManualTransitions(nextProps, this.props)){
            console.log("MosaicChart WILL PERFORM MANUAL TRANSITIONS.");
            this.setState({ 'transitioning' : true });
        }
    },
    //*/

    shouldComponentUpdate : function(nextProps, nextState){
        if (this.state.transitioning !== nextState.transitioning){
            return true;
        } else if (nextState.mounted !== this.state.mounted){
            return true;
        } else if (this.shouldPerformManualTransitions(nextProps, this.props)){
            return true;
        } else if (nextProps.height !== this.props.height) {
            //if (nextProps.height < this.props.height){
            //    this.scaleChart(nextProps, this.props); // Defer update so we can scale chart down (visual effect)
            //    return false;
            //}
            //return true;
        }
        // Default - don't update for most changes (performance, keep chart if new but outdated/invalid data, etc.)
        return true;
    },

    componentDidUpdate : function(pastProps, pastState){

        if (this.props.debug) console.info("MosaicChart updated");

        if (this.justMounted){
            this.justMounted = false; // unset (execs after render)
        }
        ///*
        if (this.shouldPerformManualTransitions(this.props, pastProps)){
            // state.transitioning = false was set in componentWillReceiveProps.
            if (this.existingNodes && _.keys(this.existingNodes).length > 0){ // We might not have any existing paths to transition.
                this.transitionPathsD3ThenEndTransitionState(); // Animate here, then end transition state.
            } else {
                if (this.props.debug) console.info("No paths to perform transitions on.");
                this.setState({ 'transitioning' : false });
            }
        }
        //*/

        this.updateExplanation();
    },

    getPathsToManuallyTransition: function(){
        return d3.selectAll("svg.sunburst-svg-chart path").filter((d) => {
            return d.depth < 6 && (this.existingNodes && this.existingNodes[d.data.id]);
        });
    },

    transitionPathsD3ThenEndTransitionState : function(duration = 750){
        if (this.props.debug) console.info("Starting D3 transition on MosaicChart.");

        var existingToTransition = this.getPathsToManuallyTransition();

        // Since 'on end' callback is called many times (multiple paths transition), defer until called for each.
        var transitionCompleteCallback = _.after(existingToTransition.nodes().length, ()=>{
            if (this.props.debug) console.info('Finished D3 transition on MosaicChart.');
            this.setState({ transitioning : false });
        });

        existingToTransition
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
            return this.generateRectPath(b);
            //return b;//this.arc(b);
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
        if (this.props.debug) console.info('Scaling MosaicChart');
        //var oldWidth = pastProps.width || this.lastWidth;
        //var newWidth = this.width();
        var oldWidth = this.width(pastProps.width);
        var newWidth = this.width(nextProps.width);

        //var s = Math.min(nextProps.height, newWidth) / Math.min(pastProps.height, oldWidth); // Circle's radius is based off smaller dimension (w or h).

        vizUtil.requestAnimationFrame(() => {
            this.refs.chart.style.height = nextProps.height + 'px';
            this.refs.chart.style.transform = (
                vizUtil.style.scale3d(newWidth / oldWidth, this.height(nextProps.height) / this.height(pastProps.height)) + ' ' + 
                vizUtil.style.translate3d((newWidth - oldWidth) / 2, (nextProps.height - pastProps.height) / 2, 0)
            );
            
            setTimeout(()=>{
                vizUtil.requestAnimationFrame(() => {
                    this.refs.chart.style.transition = 'none'; // No transition before next update of transform style prop
                    this.refs.chart.style.transform = 'none';
                    console.info("Ending scale transition on MosaicChart.");
                    this.forceUpdate();
                    setTimeout(()=>{
                        this.refs.chart.style.transition = '';
                    }, 50);
                });
            }, 775);
        });
    },

    updateExplanation : function(){
        setTimeout(()=>{
            vizUtil.requestAnimationFrame(()=>{
                var rootNode = this.getRootNode();
                this.resetActiveExperimentsCount();
            });
        }, 500);
    },

    componentWillUnmount : function(){
        // Clean up our stuff, just in case.
        delete this.arc;
        delete this.partition;
        delete this.lastWidth;
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
     * @return {Object[]} Array of React Path components to include in and output out of render method.
     * @see MosaicChart.Path
     * @see MosaicChart.transformDataForChart
     */
    generatePaths : function(){

        //console.log('EXPS', this.props.experiments.slice(10));

        this.root = MosaicChart.sortAndSizeTreeDataD3(
            MosaicChart.transformDataForChart(
                expFxn.listAllExperimentsFromExperimentSets(this.props.experiment_sets),
                this.props.filtered_experiment_sets ? expFxn.listAllExperimentsFromExperimentSets(this.props.filtered_experiment_sets) : null,
                this.props.fields,
                this.props.maxFieldDepthIndex
            )
        );

        this.partition(this.root);
        var _this = this;

        // For efficiency, filter nodes to keep only those large enough to see and those active given filters.
        var nodes = _this.root.descendants().filter(function(d){ 
            //if (_this.root.data.active > 0 && d.data.active === 0) return false;
            if (typeof _this.props.maxFieldDepthIndex === 'number'){
                if (d.depth > _this.props.maxFieldDepthIndex + 1){ // +1 as we have root node in addition to nodes derived from fields prop.
                    return false;
                }
            }
            return (Math.abs(d.x1-d.x0) > 1);
            //return (Math.abs(d.x1-d.x0) > 0.01); // 0.005 radians = 0.29 degrees 
        }).sort(function(a,b){
            return a.data.name < b.data.name ? -1 : 1;
        }).sort(function(a,b){
            return a.depth - b.depth;
        });

        var pastExistingNodes = _.clone(_this.existingNodes);

        if (this.state.transitioning || this.justMounted) {
            _this.existingNodes = {};
        }

        var applicableFields = null;
        if (_this.props.expSetFilters){
            applicableFields = _.intersection(
                _.keys(_this.props.expSetFilters).sort(),
                _.pluck(_this.props.fields, 'field').sort()
            );
        }
        
        function genPath(node, nodeIndex, allNodes, removing = false){
            var existing = !!(pastExistingNodes && pastExistingNodes[node.data.id]);

            var hasTerm = typeof node.data.field === 'string' && typeof node.data.term === 'string';
            var clickable = hasTerm && node.data.noClick !== true;
            var applicableFields, isSetAsFilter;

            isSetAsFilter = (
                hasTerm &&
                applicableFields &&
                applicableFields.length > 0 &&
                _this.props.expSetFilters[node.data.field] instanceof Set &&
                _this.props.expSetFilters[node.data.field].has(node.data.term)
            );
            var className = "no-highlight" + (
                (node.depth === 0) ? ' root-node' : ''
            ) + (
                clickable ? " clickable" : " static"
            ) + (_this.root.data.active > 0 ?
                (node.data.active === 0 ? ' filtered-out' : '') +
                (isSetAsFilter ? ' term-is-set' : (hasTerm && applicableFields && applicableFields.length > 0 ? ' term-is-not-set' : ''))
                : ' '
            ) + (
                removing ? ' removing' : (!existing ? ' adding' : '')
            );
            
            if (!removing && (_this.state.transitioning || _this.justMounted)) _this.existingNodes[node.data.id] = node;

            return (
                <path
                    style={{
                        fill    : vizUtil.colorForNode(node),
                        zIndex: existing ? 3 : ( removing ? 1 : 2 ),
                        stroke : '#fff'
                    }}
                    ref={(r)=>{
                        if (r && _this.state.transitioning){
                            if (!existing) {
                                d3.select(r).datum(_.extend({}, node, {
                                    x0_past: node.x0 + ((node.x1 - node.x0) / 2),
                                    x1_past: node.x0 + ((node.x1 - node.x0) / 2)
                                }));
                            } else if (removing) {
                                d3.select(r).datum(_.extend({}, node, {
                                    x0_past: node.x0,
                                    x1_past: node.x1,
                                    x0: node.x0 + ((node.x1 - node.x0) / 2),
                                    x1: node.x0 + ((node.x1 - node.x0) / 2)
                                }));
                            } else if (existing){
                                d3.select(r).datum(_.extend({}, node, {
                                    x0_past: pastExistingNodes[node.data.id].x0,
                                    x1_past: pastExistingNodes[node.data.id].x1
                                }));
                            } else {
                                d3.select(r).datum(_.extend({}, node));
                            }
                        } else {
                            d3.select(r).datum(_.extend({}, node));
                        }

                        //if (node.depth < 3) console.log('PATH',node);
                    }}
                    d={_this.generateRectPath(node)}
                    data-term={node.data.term}
                    fillRule="evenodd"
                    className={className}
                    onMouseOver={node.depth > 0 ? _this.onPathMouseOver : null }
                    onMouseEnter={ node.depth === 0 ? _this.mouseleave : null }
                    onMouseLeave={/*node.depth > 0 ? function(e){ vizUtil.unhighlightTerms(e.target.__data__.data.field); } :*/ null}
                    onClick={/*clickable ? (e) => _this.props.handleClick(e.target.__data__) : */null}
                    key={node.data.id}
                    data-key={node.data.id}
                />
            );
        }
        
        //return nodes.map(genPath);

        function sortByID(a,b){
            if (a.key && b.key){
                a = a.key; 
                b = b.key;
            } else if (a.data.id && b.data.id){
                a = a.data.id;
                b = b.data.id;
            }
            var aParts = a.split('~');
            var bParts = b.split('~');
            if (aParts.length !== bParts.length) return aParts.length - bParts.length;
            return a < b ? -1 : 1;
        }

        return _.values(_.groupBy(nodes, 'depth')).map(function(fieldNodes,i){
            return (
                <g data-field={fieldNodes[0].data.field} className="field no-highlight" key={fieldNodes[0].data.field || fieldNodes[0].depth || i}>
                    { fieldNodes.map(genPath).sort(sortByID) }
                </g>
            );
        });

        //return nodes.map(genPath).sort(sortByID);

        /* ToDo: 'Removing' nodes transition
        var pathComponents = nodes.map(genPath);
        var pathComponentsToRemove = _.filter(
            _.values(pastExistingNodes), 
            function(n){ return typeof _this.existingNodes[n.data.id] === 'undefined'; }
        )
        .map(function(n,i,a){
            return genPath(n,i,a, true);
        });

        return pathComponentsToRemove.concat(pathComponents).sort(sortByID);
        */
    },

    render : function(){

        var styleOpts = this.styleOptions();
        this.visualizationSetup();
        var paths = this.state.mounted ? this.generatePaths() : null;
        var barWidth = this.singleChartLayerWidth();

        function renderSVG(){
            
            var yOffset = (this.root && this.root.y1) || 0;
            var svgWidth = this.width();
            var svgHeight = this.height();

            /*
            <ZoomCursor
                    onMouseLeave={this.mouseleave}
                    width={svgWidth}
                    height={svgHeight}
                    offsetX={styleOpts.offset.left}
                    offsetY={styleOpts.offset.top}
                    isChildSVG={true}
                    zoomClassName="chart-sunburst chart-zoombox"
                    visibilityMargin={{
                        top : 5,
                        bottom : 5,
                        left : 5,
                        right : 5//- (svgWidth / (this.props.maxFieldDepthIndex + 1))
                    }}
                >
                */

            return (
                <svg
                    key={this.props.id + "-svg"}
                    className="sunburst-svg-chart"
                    data-width={this.width()}
                    style={{
                        'width'  : svgWidth,
                        'height' : svgHeight
                    }}
                    ref="svgElem"
                    onMouseLeave={this.mouseleave}
                >
                    <g
                        key={this.props.id + "-svg-group"} 
                        className="group-container"
                        ref={(r) => { this.vis = d3.select(r); }}
                        transform={
                            "translate(0," + (-yOffset) + ")"
                        }
                        onMouseLeave={null /*this.mouseleave*/}
                    >
                        { paths }
                    </g>
                </svg>
            );
            /* </ZoomCursor> */
        }

        function renderYAxisTop(){
            
            if (!this.root || !this.props.expSetFilters) return null;
            var nodes = this.root.descendants();
            var depths = _.range(1, this.root.height);
            var startPoints = _.range(0, this.width(), this.singleChartLayerWidth());
            var icons = startPoints.map((p,i)=>{
                var active = false;
                var n = nodes.filter((d)=>{
                    return d.depth === i + 1 && this.props.expSetFilters[d.data.field] && this.props.expSetFilters[d.data.field].has(d.data.term);
                });
                if (n.length > 0) active = true;
                return (
                    <div className={"top-label " + (active ? 'active' : '')} style={{ 'width': barWidth, 'left' : p }} onClick={active ? ()=>{
                        Filters.unsetAllTermsForField(n[0].data.field, this.props.expSetFilters, true, this.props.href);
                    } : null} key={'col-' + i}>
                        <i className="icon icon-times"/>
                    </div>
                );
            });
            return (
                <div 
                    className="y-axis-top"
                    style={{ 
                        width : this.width(),
                        height : Math.max(styleOpts.offset.top - 5, 0),
                        lineHeight : Math.max(styleOpts.offset.top - 5, 0) + 'px',
                        marginBottom : 5
                    }}
                >
                    { icons }
                </div>
            );
        }

        function renderYAxisBottom(){
            if (!paths) return null;

            // Exclude first item (root node)
            var labels = paths.slice(1).map((pathGroup, i) => {
                return {
                    name : Schemas.Field.toName(pathGroup.key, this.props.schemas),
                    field : pathGroup.key,
                    x : i * barWidth
                };
            });

            return (
                <div className="y-axis-bottom" style={{ 
                    left : styleOpts.offset.left, 
                    right : styleOpts.offset.right,
                    height : Math.max(styleOpts.offset.bottom - 5, 0),
                    bottom : Math.min(styleOpts.offset.bottom - 5, 0),
                    opacity : this.props.schemas ? 1 : 0
                }}>
                    <RotatedLabel.Axis
                        labels={labels}
                        labelClassName="y-axis-label no-highlight-color"
                        y={5}
                        extraHeight={0}
                        placementWidth={barWidth}
                        placementHeight={styleOpts.offset.bottom}
                        angle={styleOpts.labelRotation}
                        maxLabelWidth={styleOpts.maxLabelWidth || 1000}
                        isMounted={this.state.mounted}
                    />
                </div>
            );
        }

        // Wrapping stuff
        return (
            <div
                className={
                    "chart-container chart-container-sunburst" + 
                    (this.props.experiment_sets === null && !this.props.fallbackToSampleData ? ' no-data' : '') +
                    (this.props.fetching ? ' fetching' : '')
                }
                id={this.props.id}
                ref="container"
                key={this.props.id + '-chart-container'}
                style={{
                    transform : 'none',
                }}
            >
                <div id={this.props.id + "-chart"} className="chart chart-sunburst" ref="chart" style={{
                    'height' : this.props.height,
                    'transform' : ''
                }} key={this.props.id + "-chart"}>
                    { styleOpts.offset.top >= 15 ? renderYAxisTop.call(this) : null }
                    { renderSVG.call(this) }
                    { styleOpts.offset.bottom >= 15 ? renderYAxisBottom.call(this) : null }
                </div>
            </div>
                
        );
    }

});

module.exports = MosaicChart;