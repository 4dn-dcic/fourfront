'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var expFuncs = require('../experiments-table').ExperimentsTable.funcs;
var { ChartBreadcrumbs, util } = require('./common');
var { console, isServerSide } = require('../objectutils');


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
         * @param {Object|Object[]} experiment_sets - Data graph containing structure of experiment_sets as returned by server (or experiments as returned by FacetList.siftExperiments).
         * @param {boolean} [experimentsInsteadOfSets=false] - Whether we have array of experiments instead of experiment sets.
         * @return {Object} - Root node of tree hierarchy.
         */
        transformDataForChart : function(experiment_sets, experimentsInsteadOfSets = false){

            // Correct if we passed in a context instead of experiment_sets.
            if (
                !Array.isArray(experiment_sets) &&
                experiment_sets &&
                typeof experiment_sets === 'object' &&
                Array.isArray(experiment_sets['@graph'])
            ) experiment_sets = experiment_sets['@graph'];

            // ToDo: Make configurable (e.g. pass in array of objects of depths/fields/description-accessor-func/etc.)

            // We create children OBJECT on each layer to gather children by w.e. field needed, where the unique field value is key.
            // Then recursively convert to array for use by chart.

            // First child (depth == 1) should be organism. ('root' node will have depth == 0)
            var rootNode = {
                'name' : 'root',
                'children' : {},
                'experiments' : 0,
                'fields' : [ 
                    /* ToDo: make getDataFromExperiment programmatically fill these fields rather than be hardcoded. */
                    'experiments_in_set.biosample.biosource.individual.organism.name',
                    'experiments_in_set.biosample.biosource.biosource_type',
                    'experiments_in_set.biosample.biosource_summary',
                    'experiments_in_set.experiment_summary',
                    'experiments_in_set.accession',
                    'experiments_in_set.files.accession'
                ]
            };

            // Cache each file accession into here, check if has been added to a parentNode before, and if so, adjust color to
            // indicate is a duplicate.
            var files = {}; 

            // Ideally (for readability) would looping over each experiment & grab property of each instead of biosource 
            // (biosource is metadata property on experiment)
            // but experiment.biosample.biosource is an array so might miss some.


            function getDataFromExperiment(exp){

                function updateBiosource(biosource){
                    // Biosource Organism
                    if (
                        biosource.individual.organism.name &&
                        typeof rootNode.children[biosource.individual.organism.name] === 'undefined'
                    ){
                        var name = biosource.individual.organism.name;
                        name = name.charAt(0).toUpperCase() + name.slice(1);
                        //name += " (" + biosource.individual.organism.scientific_name + ")";

                        rootNode.children[biosource.individual.organism.name] = {
                            'name' : name + " (" + biosource.individual.organism.scientific_name + ")",
                            'children' : {},
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
                        attachBiosourceTypeTo.children[biosource.biosource_type] = {
                            'name' : biosource.biosource_type,
                            'children' : {}, // We don't show experiment_sets here because there may be multiple biosamples per expset. 
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
                            .reduce(organismNamesEncountered, function(counts, orgName){
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
                                    'field' : 'experiments_in_set.files.accession'
                                };
                            }),
                        'experiments': 1
                    }
                } else {
                    console.error("Check experiment hierarchy code for chart.");
                }
            }

            // Loop over every experiment we have that was returned from /browse/ endpoint.
            for (var h = 0; h < experiment_sets.length; h++){
                if (experimentsInsteadOfSets){
                    rootNode.experiments++;
                    getDataFromExperiment(experiment_sets[h]);
                } else {
                    for (var i = 0; i < experiment_sets[h].experiments_in_set.length; i++){
                        rootNode.experiments++;
                        getDataFromExperiment(experiment_sets[h].experiments_in_set[i]);
                    }
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

            childrenObjectsToArrays(rootNode);
            return rootNode;
        }
    },

    getDefaultProps : function(){
        return {
            'data' : null,
            'width' : 750,
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
            }
        };
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
        //var percentage = (100 * d.value / this.totalSize).toPrecision(3);
        //var percentageString = percentage + "%";
        //if (percentage < 0.1) {
        //    percentageString = "< 0.1%";
        //}
        var expCount = d.data.experiments || d.experiments || null;

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
                return (sequenceArray.indexOf(node) >= 0);
            })
            .classed("hover", true);

        if (this.props.breadcrumbs !== false) this.updateBreadcrumbs(sequenceArray);
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
        return {
            width  : this.refs.container.offsetWidth  || this.refs.container.clientWidth  || this.props.width,
            height : this.refs.container.offsetHeight || this.refs.container.clientHeight || this.props.height
        };
    },

    visualization: function(){

        console.log("Rendering Sunburst Chart");

        var _this = this; // So can use w/o needing to .apply internal functions.

        if (_this.props.data === null && !_this.props.fallbackToSampleData){
            // Nothing to visualize, maybe add loading indicator or something.
            console.info("Nothing to visualize for Sunburst chart.");
            return;
        }

        // Dimensions of sunburst.
        var containerDimensions = _this.containerDimensions();
        _this.width = containerDimensions.width;
        var height = _this.props.height; //containerDimensions.height;
        var radius = Math.min(_this.width, height) / 2;

        _this.vis = d3.select("#" + _this.props.id + "-chart").append("svg:svg")
            .style("width", _this.width)
            .style("height", height)
            .append("svg:g")
            .attr("id", _this.props.id + "-container")
            .classed("group-container", true)
            .attr("transform", "translate(" + _this.width / 2 + "," + height / 2 + ")");


        // This partition object/function is pretty much the magic behind the starburst layout.
        // It creates all the points/sizes (x0, x1, y0, y1) needed for a partitioned layout.
        // Then these are used by 'arc' transform below to draw/put into the SVG.

        var partition = d3.partition()
            .size([2 * Math.PI, radius * radius * 1.1667]);
            //.value(function(d) { return d.size; });

        var arc = d3.arc()
            .startAngle(function(d) { return d.x0; })
            .endAngle(function(d) { return d.x1; })
            .innerRadius(function(d) {
                //if (d.data.field === 'experiments_in_set.files.accession') return Math.sqrt(d.y0) - ((Math.sqrt(d.y1) - Math.sqrt(d.y0)) / 2);
                if (d.data.field === 'experiments_in_set.files.accession') {
                    //console.log('file', d);
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

        if (_this.props.data === null && _this.props.fallbackToSampleData){
            // Use d3.text and d3.csv.parseRows so that we do not need to have a header
            // row, and can receive the csv as an array of arrays.
            d3.text("/static/data/test-data-for-chart-visit-sequences.csv", function(text) {
                var csv = d3.csvParseRows(text);
                var json = buildHierarchy(csv);
                createVisualization(json);
            });
        } else if (Array.isArray(_this.props.data)) {
            var json = buildHierarchy(_this.props.data);
            createVisualization(json);
        } else if (_this.props.data !== null) {
            createVisualization(_this.props.data);
        } else {
            throw new Error('Nothing to visualize.');
        }

        // Main function to draw and set up the visualization, once we have the data.
        function createVisualization(json) {

            // Basic setup of page elements.
            //drawLegend();
            //d3.select("#" + _this.props.id + "-togglelegend").on("click", toggleLegend);

            // Bounding circle underneath the sunburst, to make it easier to detect
            // when the mouse leaves the parent g.
            _this.vis.append("svg:circle")
                .attr("r", radius)
                .classed('bounding-circle', true)
                .style("opacity", 0);

            _this.root = d3.hierarchy(json)
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

            partition(_this.root); // THE MAGIC (takes care of creating coordinates for our visualzation)

            // For efficiency, filter nodes to keep only those large enough to see.
            var nodes = _this.root.descendants().filter(function(d){
                return (Math.abs(d.x1-d.x0) > 0.01); // 0.005 radians = 0.29 degrees 
            });

            var path = _this.vis.data([json])
                .selectAll("path")
                .data(nodes)
                .enter().append("svg:path")
                .attr("display", function(d) { return d.depth ? null : "none"; })
                .attr("d", arc)
                .attr("fill-rule", "evenodd")
                .style("fill", _this.props.colorForNode)
                .on("mouseover", _this.throttledMouseOverHandler)
                .filter(function(d){
                    return typeof d.data.field === 'string' && typeof d.data.term === 'string';
                })
                .classed('clickable', true)
                .on('click', _this.props.handleClick);

            // Add the mouseleave handler to the bounding circle.
            d3.select("#" + _this.props.id + "-container").on("mouseleave", _this.mouseleave);

            // Get total size of the tree = value of root node from partition.
            _this.totalSize = path.node().__data__.value;

            setTimeout(function(){
                console.log('RootNode', _this.getRootNode());
                _this.refs.experimentsCount.innerHTML = _this.getRootNode().data.experiments;
                _this.refs.experimentsCount.className = _this.refs.experimentsCount.className.replace(' invisible',' half-visible');
                _this.refs.explanation.className = _this.refs.explanation.className.replace(' invisible','');
            }, 500);
        };

        /*
        function drawLegend() {

            // Dimensions of legend item: width, height, spacing, radius of rounded rect.
            var li = {
                w: 75, h: 30, s: 3, r: 3
            };

            var legend = d3.select("#" + _this.props.id + "-legend").append("svg:svg")
                .attr("width", li.w)
                .attr("height", d3.keys(_this.props.colors).length * (li.h + li.s));

            var g = legend.selectAll("g")
                .data(d3.entries(_this.props.colors))
                .enter().append("svg:g")
                .attr("transform", function(d, i) {
                        return "translate(0," + i * (li.h + li.s) + ")";
                    });

            g.append("svg:rect")
                .attr("rx", li.r)
                .attr("ry", li.r)
                .attr("width", li.w)
                .attr("height", li.h)
                .style("fill", function(d) { return d.value; });

            g.append("svg:text")
                .attr("x", li.w / 2)
                .attr("y", li.h / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .text(function(d) { return d.key; });
        }

        function toggleLegend() {
            var legend = d3.select("#" + _this.props.id + "-legend");
            if (legend.style("visibility") == "hidden") {
                legend.style("visibility", "");
            } else {
                legend.style("visibility", "hidden");
            }
        }
        */

        // Take a 2-column CSV and transform it into a hierarchical structure suitable
        // for a partition layout. The first column is a sequence of step names, from
        // root to leaf, separated by hyphens. The second column is a count of how 
        // often that sequence occurred.
        function buildHierarchy(csv) {
            var root = {"name": "root", "children": []};
            for (var i = 0; i < csv.length; i++) {
                var sequence = csv[i][0];
                var size = +csv[i][1];
                if (isNaN(size)) { // e.g. if this is a header row
                    continue;
                }
                var parts = sequence.split("-");
                var currentNode = root;
                for (var j = 0; j < parts.length; j++) {
                    var children = currentNode["children"];
                    var nodeName = parts[j];
                    var childNode;
                    if (j + 1 < parts.length) {
                        // Not yet at the end of the sequence; move down the tree.
                        var foundChild = false;
                        for (var k = 0; k < children.length; k++) {
                            if (children[k]["name"] == nodeName) {
                                childNode = children[k];
                                foundChild = true;
                                break;
                            }
                        }
                    // If we don't already have a child node for this branch, create it.
                        if (!foundChild) {
                            childNode = {"name": nodeName, "children": []};
                            children.push(childNode);
                        }
                        currentNode = childNode;
                    } else {
                        // Reached the end of the sequence; create a leaf node.
                        childNode = {"name": nodeName, "size": size};
                        children.push(childNode);
                    }
                }
            }
            return root;
        };
    },

    componentDidMount : function(){
        console.log("Mounted Sunburst chart");
        
        /**
         * Manage own state for this component so don't need to re-render and re-initialize chart each time.
         */

        this.totalSize = 0; // Will be sum of leaf values (same val as root node), used for getting percentages.
        this.vis = null; // Entrypoint to chart
        this.root = null; // Root node.
        this.width = null;

        this.throttledMouseOverHandler = _.throttle(this.mouseoverHandle, 50);
        this.visualization(); // D3 initialization

        //if (!isServerSide() && typeof window !== 'undefined'){
        //    this.debouncedResizeHandler = _.debounce(this.reset, 300);
        //    window.addEventListener('resize', this.debouncedResizeHandler);
        //}
        setTimeout(this.adjustExplanationPosition, 0); // Center text in center of chart
    },

    getRootNode : function(){ return this.root || this.props.data || null; },

    reset : function(){

        var func = function(){
            d3.select(this.refs.container).selectAll('svg').remove();
            this.visualization(); // D3 initialization
            setTimeout(this.adjustExplanationPosition, 0); // Center text in center of chart
        }.bind(this);

        if (window.requestAnimationFrame){
            window.requestAnimationFrame(func);
        } else {
            func();
        }
        
    },

    shouldComponentUpdate : function(nextProps, nextState){
        if (
            nextProps.data &&
            nextProps.data !== this.props.data &&
            !SunBurst.isDataEqual(nextProps.data, this.props.data)
        ){
            return true;
        }

        if (nextProps.height !== this.props.height) {
            return true;
        }

        return false;
    },

    componentDidUpdate : function(pastProps){

        console.info("Sunburst chart updated");

        if (!SunBurst.isDataEqual(pastProps.data, this.props.data)) {
            this.reset();
            return;
        }
        
        // Size of chart (or container) has changed. If has shrunk, transition size + position down before redrawing chart.
        if (this.props.height > pastProps.height) {
            this.reset();
        } else {
            var newWidth = this.containerDimensions().width;
            //var s = Math.max((this.props.height / pastProps.height), (newWidth / this.width));
            var s = Math.min(this.props.height, newWidth) / Math.min(pastProps.height, this.width); // Circle's radius is based off smaller dimension (w or h).
            this.refs.explanation.className += ' invisible'; 
            this.refs.chart.style.transform = util.style.scale3d(s) + ' ' + util.style.translate3d((newWidth - this.width) / 2, (this.props.height - pastProps.height) / 2, 0);
            setTimeout(()=>{
                this.refs.chart.style.transition = 'none';
                this.refs.chart.style.transform = '';
                this.reset();
                setTimeout(() => { 
                    this.refs.chart.style.transition = '';
                    this.refs.explanation.className = this.refs.explanation.className.replace(' invisible','');
                }, 50);
            }, 750);
        }
    },

    breadcrumbs : function(){
        return util.mixin.getBreadcrumbs.apply(this);
    },

    descriptionElement : function(){
        return util.mixin.getDescriptionElement.apply(this);
    },

    adjustExplanationPosition : function(){
        var height = this.refs.explanation.offsetHeight || this.refs.explanation.clientHeight || 45;
        var width = this.refs.explanation.offsetWidth || this.refs.explanation.clientWidth || 140;
        _.extend(this.refs.explanation.style, {
            'marginTop' : '-' + (height / 2) + 'px',
            'marginLeft' : '-' + (width / 2) + 'px'
        });
    },

    componentWillUnmount : function(){
        //if (!isServerSide() && typeof window !== 'undefined'){
        //    window.removeEventListener('resize', this.debouncedResizeHandler);
        //    delete this.debouncedResizeHandler;
        //}
        delete this.throttledMouseOverHandler;
        delete this.width;
        delete this.totalSize;
        delete this.root;
        delete this.vis;
    },

    renderSideBar : function(){
        return (
            <div id="sidebar">
                <input type="checkbox" id={this.props.id + "togglelegend"} /> Legend<br/>
                <div className="legend" id={this.props.id + "legend"} style={{ visibility: 'hidden' }}></div>
            </div>
        );
    },

    render : function(){
        
        function breadcrumbs(){
            if (this.props.breadcrumbs !== true) return null;
            return <ChartBreadcrumbs parentId={this.props.id} ref="breadcrumbs" />;
        }
        function description(){
            if (this.props.descriptionElement !== true) return null;
            return <div id={this.props.id + "-description"} className="description" ref="description"></div>;
        }
        
        return (
            <div
                className={"chart-container chart-container-sunburst" + (this.props.data === null && !this.props.fallbackToSampleData ? ' no-data' : '')}
                id={this.props.id}
                ref="container"
                key={this.props.id + '-chart-container'}
            >
                { breadcrumbs.call(this) }
                <div id={this.props.id + "-chart"} className="chart chart-sunburst" ref="chart" style={{ 'height' : this.props.height }}>
                    <div id={this.props.id + "-explanation"} ref="explanation" className="explanation invisible">
                        <div id={this.props.id + "-experiments-count"} className="experiments-count half-visible" ref="experimentsCount">&nbsp;</div>
                        { description.call(this) }
                    </div>
                </div>
            </div>
                
        );
    }

});

module.exports = SunBurst;