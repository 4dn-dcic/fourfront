'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var { ChartBreadcrumbs, vizUtil } = require('./common');
var { expFxn, console, object, isServerSide } = require('../util');
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

            // Ideally (for readability) would looping over each experiment & grab property of each instead of biosource 
            // (biosource is metadata property on experiment)
            // but experiment.biosample.biosource is an array so might miss some.

            function getDataFromExperiment(exp){

                function attachNode(field, fieldIndex, attachToNode){
                    var fieldValue = object.getNestedProperty(exp, field.field.replace('experiments_in_set.', ''));
                    
                    if (fieldValue){
                        currentID += '~' + fieldValue;
                    } else {
                        console.error("Couldn't get value for " + field.field + ' from:', exp);
                    }

                    function genNode(){
                        
                        var callbackArgs = [fieldValue, currentID, experiments, filteredExperiments, exp];
                        var node = {
                            'id'          : currentID,
                            'name'        : typeof field.name === 'function' ? field.name.apply(field.name, callbackArgs) : fieldValue,
                            'experiments' : 0,
                            'active'      : 0,
                            'files'       : 0,
                            'activeFiles' : 0,
                            'term'        : fieldValue,
                            'field'       : field.field,
                            'children'    : typeof field.children === 'function' ? field.children.apply(field.children, callbackArgs) : {}
                        };


                        // Conditional properties

                        if (field.isFacet === false) node.noClick = true;

                        if      (typeof field.title === 'string')   node.title = field.title;
                        else if (typeof field.title === 'function') node.title = field.title.apply(field.title, callbackArgs);
                        
                        if      (typeof field.fallbackSize === 'number')   node.fallbackSize = field.fallbackSize;
                        else if (typeof field.fallbackSize === 'function') node.fallbackSize = field.fallbackSize.apply(field.fallbackSize, callbackArgs);
                        
                        if      (typeof field.description === 'string')   node.description = field.description;
                        else if (typeof field.description === 'function') node.description = field.description.apply(field.description, callbackArgs);

                        if      (typeof field.size === 'number')   node.size = field.size;
                        else if (typeof field.size === 'function') node.size = field.size.apply(field.size, callbackArgs);

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
                                .sortBy(function(fieldValPair){ return -fieldValPair[1]; })
                                .value()[0][0]; // [['human', 2], ...] -- grab first item from first array ('human')
                            console.log('FV2',fieldValue);
                        }
                    }

                    if (typeof attachToNode.children[fieldValue] === 'undefined'){
                        attachToNode.children[fieldValue] = genNode();
                    }
                    
                    attachToNode.children[fieldValue].experiments++;
                    var filesCount = expFxn.fileCount(exp);
                    attachToNode.children[fieldValue].files += filesCount;

                    if (filteredExperiments && filteredExperiments[exp.accession]){ 
                        attachToNode.children[fieldValue].active++;
                        attachToNode.children[fieldValue].activeFiles += filesCount;
                    }

                    addExpSetsToNode(attachToNode.children[fieldValue]);

                    return attachToNode.children[fieldValue];
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

                var currentID = rootNode.id; // 'root'
                var currentNode = rootNode;

                fields.forEach(function(f,i,a){
                    currentNode = attachNode(f, i, currentNode);
                });

                rootNode.experiments++;
                rootNode.files += expFxn.fileCount(exp);
                if (filteredExperiments && filteredExperiments[exp.accession]) { 
                    rootNode.active++;
                    rootNode.activeFiles += expFxn.fileCount(exp);
                    addExpSetsToNode(rootNode);
                } else if (!filteredExperiments){
                    addExpSetsToNode(rootNode);
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
                    node.size = gatherChildrenSize(node);
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
                if (node.experiment_sets instanceof Set)    node.experiment_sets = node.experiment_sets.size;
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
                    if (typeof a.data.experiments === 'number' && typeof b.data.experiments === 'number'){
                        var dif = a.data.experiments - b.data.experiments;
                        if (dif !== 0) return dif; // Ascending
                    } else if (Array.isArray(a.children) && Array.isArray(b.children)){
                        var dif = a.children.length - b.children.length;
                        if (dif !== 0) return dif; // Ascending
                    }
                    if (a.data.name < b.data.name) return -1;
                    else if (a.data.name > b.data.name) return 1;
                });
        },

        /** Get default style options for chart. Should suffice most of the time. */
        getDefaultStyleOpts : function(){
            return {
                'gap' : 5,
                'maxBarWidth' : 60,
                'labelRotation' : 'auto',
                'labelWidth' : 200,
                'offset' : {
                    'top' : 0,
                    'bottom' : 50,
                    'left' : 0,
                    'right' : 100
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
            'breadcrumbs' : true, // true (show built-in), false (don't show), function (returns ChartBreadcrumbs instance), or instance of ChartBreadcrumbs.
            'descriptionElement' : true, // same as above, but for a <div> element to hold description.
            'fallbackToSampleData' : false, // Perhaps for tests.
            'handleClick' : function(e){
                console.log('Default Click Handler, clicked on:', e.target);
            },
            'colorForNode' : function(node){ // Fallback color determinator. Pass in correct func from FacetCharts.
                return 'red';
            },
            'styleOptions' : null, // @see SunBurst.getDefaultStyleOpts for possible options.
            'debug' : false
        };
    },

    getInitialState : function(){
        return { 'mounted' : false, 'transitioning' : false };
    },

    styleOptions : function(){ return vizUtil.extendStyleOptions(this.props.styleOptions, SunBurst.getDefaultStyleOpts()); },

    resetActiveExperimentsCount : function(){
        var rootNode = this.getRootNode();
        var exps = rootNode.data.active || rootNode.data.experiments;
        if (typeof exps === 'number'){
            this.refs.countExps.innerHTML = exps;
            this.refs.countExpSets.innerHTML = rootNode.data.experiment_sets || null;
            this.refs.countFiles.innerHTML = rootNode.data.activeFiles || rootNode.data.files || 0;
        } else {
            this.refs.countExps.innerHTML = '&nbsp;';
            this.refs.countExpSets.innerHTML = '&nbsp;';
            this.refs.countFiles.innerHTML = 0;
        }
    },

    /* We create a throttled version of this function in componentDidMount for performance */
    mouseoverHandle : function(d){
        if (typeof d.target !== 'undefined'){
            // We have a click event from element rather than D3.
            d = d.target.__data__; // Same as: d = d3.select(d.target).datum(); (d3.select(...).node().__data__ performed internally by D3).
        }
        var sequenceArray = SunBurst.getAncestors(d);
        d = d.data || d;

        var expCount = d.active || d.experiments || null;
        var expSetCount = d.experiment_sets || null;

        // .appendChild used to be faster than .innerHTML but seems
        // innerHTML is better now (?) https://jsperf.com/appendchild-vs-documentfragment-vs-innerhtml/24

        if (expCount !== null){
            this.refs.countExps.innerHTML = expCount;
            this.refs.countExpSets.innerHTML = expSetCount;
            this.refs.countFiles.innerHTML = d.activeFiles || d.files || 0;
        } else {
            this.resetActiveExperimentsCount();
        }

        if (d.title && this.descriptionElement() !== null) {
            this.descriptionElement().innerHTML = d.title;
        } else {
            this.descriptionElement().innerHTML = '';
        }

        this.getExplanationRefs().forEach(function(eR, i){
            if (eR.className.indexOf('invisible') !== -1) {
                eR.className = eR.className.replace(' invisible','');
            }
        });

        // Fade all the segments.
        // Then highlight only those that are an ancestor of the current segment.
        this.vis.selectAll("path")
            .classed("hover", false)
            .filter(function(node){
                return _.find(sequenceArray, function(sNode){ return sNode.data.id === node.data.id; }) || false;
            })
            .classed("hover", true);

        if (this.props.breadcrumbs !== false) this.updateBreadcrumbs(sequenceArray);
        if (d.field && d.term) highlightTerm(d.field, d.term, this.props.colorForNode(d));
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

    getExplanationRefs : function(){
        return ['Exps', 'ExpSets', 'Files'].map((suffix) => this.refs['explanation' + suffix]);
    },

    getCountsRefs : function(){
        return ['Files', 'Exps', 'ExpSets'].map((suffix) => this.refs['count' + suffix]);
    },

    updateBreadcrumbs : function(nodeArray){
        this.breadcrumbs().setState({ 
            highlighted : nodeArray.map((n)=>{
                n.color = this.props.colorForNode(n);
                return n;
            })
        });
    },

    /** Return height, corrected for any offsets. */
    height : function(baseHeight = this.props.height){
        var styleOpts = this.styleOptions();
        return baseHeight - styleOpts.offset.bottom - styleOpts.offset.top;
    },

    width : function(baseWidth = this.baseWidth()){
        var styleOpts = this.styleOptions();
        return baseWidth - styleOpts.offset.left - styleOpts.offset.right;
    },

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
        console.log('DEPTHS', this.chartLevelsCount(props));
        var levelsCount = this.chartLevelsCount(props);
        var availWidth = this.width(props.width);
        var singleLevelWidth = this.singleChartLayerWidth();
        console.log('WIDTHLAYERS', this.singleChartLayerWidth(props) * this.chartLevelsCount(props));
        return (
            this.singleChartLayerWidth(props) * this.chartLevelsCount(props)
        );
    },

    singleChartLayerWidth : function(props = this.props){
        return this.width(props.width) / (this.chartLevelsCount(props) - 1);
    },

    visualizationSetup : function(){
        this.totalSize = 0; // Will be sum of leaf values (same val as root node), used for getting percentages.
        this.root = null; // Root node.

        // This partition object/function is pretty much the magic behind the starburst layout.
        // It creates all the points/sizes (x0, x1, y0, y1) needed for a partitioned layout.
        // Then these are used by 'arc' transform below to draw/put into the SVG.
        this.partition = d3.partition().size([
            this.height(), // Use height for X coords & vice-versa -- and then flip back in this.generateRectPath.
            this.chartLayersWidth()
        ]);
        return;

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

    generateRectPath : function(node){
        var path = d3.path();
        var args = [
            node.y0,
            node.x0,
            node.y1 - node.y0,
            node.x1 - node.x0
        ];
        path.rect.apply(path, args);
        return path;
    },

    componentWillMount : function(){
        //this.visualizationSetup();
        this.throttledMouseOverHandler = _.throttle(this.mouseoverHandle, 50); // Improve performance
    },

    componentDidMount : function(){
        if (this.props.debug) console.log("Mounted Sunburst chart");
        /**
         * Manage own state for this component (ex. mounted state) so don't need to re-render and re-initialize chart each time.
         */

        if (!this.state.mounted){
            //this.updateWidthAndRadius();
            this.justMounted = true;
            this.setState({ 'mounted' : true });
            this.getExplanationRefs().forEach(function(eR, i){
                if (eR) eR.className = eR.className.replace(' invisible','');
            });
            return;
        }
    },

    getRootNode : function(){ return this.root || null; },

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
                nextProps.experiments &&
                nextProps.experiments !== pastProps.experiments &&
                !_.isEqual(nextProps.experiments, pastProps.experiments)
            ) || (
                nextProps.filteredExperiments !== pastProps.filteredExperiments &&
                !_.isEqual(nextProps.filteredExperiments, pastProps.filteredExperiments)
            )
        );
    },

    componentWillReceiveProps : function(nextProps){
        // Stop current transitions or things will throw errors and break (D3 unable to find element it was transitioning)
        if (this.state.transitioning){
            this.getPathsToManuallyTransition().interrupt();
        }
        if (this.shouldPerformManualTransitions(nextProps, this.props)){
            console.log("SunBurst WILL PERFORM MANUAL TRANSITIONS.");
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

        if (this.justMounted){
            this.justMounted = false; // unset (execs after render)
        }

        if (this.shouldPerformManualTransitions(this.props, pastProps)){
            // state.transitioning = false was set in componentWillReceiveProps.
            if (this.existingNodes && _.keys(this.existingNodes).length > 0){ // We might not have any existing paths to transition.
                this.transitionPathsD3ThenEndTransitionState(); // Animate here, then end transition state.
            } else {
                if (this.props.debug) console.info("No paths to perform transitions on.");
                this.setState({ 'transitioning' : false });
           }
        }

        this.updateExplanation();
    },

    getPathsToManuallyTransition: function(){
        return this.vis.selectAll('path').filter((d) => {
            return d.depth < 6 && (this.existingNodes && this.existingNodes[d.data.id]);
        });
    },

    transitionPathsD3ThenEndTransitionState : function(duration = 750){
        if (this.props.debug) console.info("Starting D3 transition on SunBurst.");

        var existingToTransition = this.getPathsToManuallyTransition();

        // Since 'on end' callback is called many times (multiple paths transition), defer until called for each.
        var transitionCompleteCallback = _.after(existingToTransition.nodes().length, ()=>{
            if (this.props.debug) console.info('Finished D3 transition on SunBurst.');
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
            return b;//this.arc(b);
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
        //var oldWidth = pastProps.width || this.lastWidth;
        //var newWidth = this.width();
        var oldWidth = this.width(pastProps.width);
        var newWidth = this.width(nextProps.width);

        //var s = Math.min(nextProps.height, newWidth) / Math.min(pastProps.height, oldWidth); // Circle's radius is based off smaller dimension (w or h).

        vizUtil.requestAnimationFrame(() => {
            this.getExplanationRefs().forEach(function(eR, i){ eR.className += ' invisible'; });
            this.refs.chart.style.height = nextProps.height + 'px';
            this.refs.chart.style.transform = (
                vizUtil.style.scale3d(newWidth / oldWidth, this.height(nextProps.height) / this.height(pastProps.height)) + ' ' + 
                vizUtil.style.translate3d((newWidth - oldWidth) / 2, (nextProps.height - pastProps.height) / 2, 0)
            );
            
            setTimeout(()=>{
                vizUtil.requestAnimationFrame(() => {
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
            }, 775);
        });
    },

    /** Get refs to breadcrumb and description components, whether they created by own component or passed in as props. */
    breadcrumbs : function(){ return vizUtil.mixin.getBreadcrumbs.call(this); },
    descriptionElement : function(){ return vizUtil.mixin.getDescriptionElement.call(this); },

    updateExplanation : function(){
        setTimeout(()=>{
            vizUtil.requestAnimationFrame(()=>{
                var rootNode = this.getRootNode();
                this.refs.countExps.innerHTML = rootNode.data.active || rootNode.data.experiments;
                this.refs.countExpSets.innerHTML = rootNode.data.experiment_sets;
                this.refs.countFiles.innerHTML = rootNode.data.activeFiles || rootNode.data.files || 0;
                this.getExplanationRefs().forEach(function(eR,i){ eR.className = eR.className.replace(' invisible','') });
            });
        }, 500);
    },

    componentWillUnmount : function(){
        // Clean up our stuff, just in case.
        delete this.throttledMouseOverHandler;
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
     * @see SunBurst.Path
     * @see SunBurst.transformDataForChart
     */
    generatePaths : function(){

        //console.log('EXPS', this.props.experiments.slice(10));

        this.root = SunBurst.sortAndSizeTreeDataD3(
            SunBurst.transformDataForChart(
                this.props.experiments,
                this.props.filteredExperiments,
                this.props.fields,
                this.props.maxFieldDepthIndex
            )
        );

        console.log('ROOTND', this.root);
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
        
        function genPath(node, nodeIndex, allNodes, removing = false){
            var existing = !!(pastExistingNodes && pastExistingNodes[node.data.id]);

            var hasTerm = typeof node.data.field === 'string' && typeof node.data.term === 'string';
            var clickable = hasTerm && node.data.noClick !== true;
            var className = (
                (node.depth === 0) ? 'root-node' : ''
            ) + (
                clickable ? " clickable" : " static"
            ) + (
                (_this.root.data.active > 0 && node.data.active === 0) ? ' filtered-out' : ''
            );
            
            if (!removing && (_this.state.transitioning || _this.justMounted)) _this.existingNodes[node.data.id] = node;
            
            return (
                <path
                    style={{
                        fill    : _this.props.colorForNode(node),
                        zIndex: existing ? 3 : ( removing ? 1 : 2 )
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
                    fillRule="evenodd"
                    className={className + (removing ? ' removing' : (!existing ? ' adding' : ''))}
                    onMouseOver={node.depth > 0 ? (e)=>{ e.persist(); _this.throttledMouseOverHandler(e); } : null }
                    onMouseEnter={ node.depth === 0 ? _this.mouseleave : null }
                    onMouseLeave={node.depth > 0 ? function(e){ unhighlightTerms(e.target.__data__.data.field); } : null}
                    onClick={clickable ? (e) => _this.props.handleClick(e.target.__data__) : null}
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
        };

        ///* ToDo: 'Removing' nodes transition
        var pathComponents = nodes.map(genPath);
        var pathComponentsToRemove = _.filter(
            _.values(pastExistingNodes), 
            function(n){ return typeof _this.existingNodes[n.data.id] === 'undefined'; }
        )
        .map(function(n,i,a){
            return genPath(n,i,a, true);
        });

        return pathComponentsToRemove.concat(pathComponents).sort(sortByID);
        //*/
    },

    render : function(){

        var styleOpts = this.styleOptions();
        
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
            var paths = this.state.mounted ? this.generatePaths() : null;
            var xOffset = (this.root && this.root.y1) || 0;
            return (
                <svg key={this.props.id + "-svg"} data-width={this.width()} style={{'width' : this.baseWidth(), 'height' : this.height() }} ref="svgElem">
                    <g
                        key={this.props.id + "-svg-group"} 
                        className="group-container"
                        ref={(r) => { this.vis = d3.select(r); }}
                        transform={
                            "translate(" + (-xOffset) + ",0)"
                        }
                        onMouseLeave={this.mouseleave}
                    >
                        {/* <circle r={this.radius} className="bounding-circle" key={this.props.id +"-bounding-circle"} /> */}
                        { paths }
                    </g>
                </svg>
            );
        }
        
        function renderHoverExplanation(instanceIDString = '', instanceIndex = 0){
            var styleObj = null;
            var initialExplClassName = "explanation invisible";
            var initialExpCountClassName = "experiments-count half-visible";
            var initialExpCountLabelClassName = "experiments-count-label";
            if (styleOpts.offset.right >= 60){
                styleObj = {
                    width : styleOpts.offset.right - 8,
                    bottom : styleOpts.offset.bottom * (instanceIndex + 1)
                };
                initialExpCountClassName += ' align-to-right';
                initialExpCountLabelClassName += ' align-to-right';
                initialExplClassName += ' align-to-right';
            }

            var labelName = 'Experiments';
            var initialVal = <span>&nbsp;</span>;
            var rootData = (this.root && this.root.data) || this.root || {};
            if (instanceIDString.toLowerCase() === 'exps'){ 
                initialVal = rootData.active || rootData.experiments || initialVal;
            }
            if (instanceIDString.toLowerCase() === 'expsets'){ 
                labelName = 'Exp. Sets';
                initialVal = rootData.experiment_sets || initialVal;
            }
            if (instanceIDString.toLowerCase() === 'files'){ 
                labelName = 'Files';
                initialVal = rootData.activeFiles || rootData.files || 0;
            }

            return (
                <div 
                    id={this.props.id + "-explanation-" + instanceIDString}
                    ref={"explanation" + instanceIDString}
                    key={instanceIDString}
                    className={initialExplClassName}
                    style={styleObj}
                >
                    <div id={this.props.id + "-experiments-count-" + instanceIDString} className={initialExpCountClassName} ref={"count" + instanceIDString}>
                        { initialVal }
                    </div>
                    <div className={initialExpCountLabelClassName}>
                        { labelName }
                    </div>
                    { description.call(this) }
                </div>
            );
        }

        function renderYAxis(){
            return (
                <div 
                    className="y-axis-bottom"
                    style={{ 
                        width : this.baseWidth(),
                        height : styleOpts.offset.bottom - 5
                    }}
                >
                    
                </div>
            );
        }

        this.visualizationSetup();

        // Wrapping stuff
        return (
            <div
                className={"chart-container chart-container-sunburst" + (this.props.experiments === null && !this.props.fallbackToSampleData ? ' no-data' : '')}
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
                    { renderSVG.call(this) }
                    { ['ExpSets', 'Exps', 'Files'].map(renderHoverExplanation.bind(this)) }
                    { renderYAxis.call(this) }
                </div>
            </div>
                
        );
    }

});

module.exports = SunBurst;