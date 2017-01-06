'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var expFuncs = require('../experiments-table').ExperimentsTable.funcs;
var { ChartBreadcrumbs, util } = require('./common');
var { console } = require('../objectutils');


/** 
 * Based on Sunburst D3 Example @ http://bl.ocks.org/kerryrodden/7090426
 */

var SunBurst = React.createClass({

    statics : {
        /**
         * Given a node in a partition layout, return an array of all of its ancestor
         * nodes, highest first, but excluding the root.
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

        transformDataForChart : function(experiment_sets){
            // ToDo: Make configurable (e.g. pass in array of objects of depths/fields/description-accessor-func/etc.)

            // We create children OBJECT on each layer to gather children by w.e. field needed, where the unique field value is key.
            // Then recursively convert to array for use by chart.

            // First child (depth == 1) should be organism. ('root' node will have depth == 0)
            var rootNode = {
                'name' : 'root',
                'children' : {}
            };

            // Cache each file accession into here, check if has been added to a parentNode before, and if so, adjust color to
            // indicate is a duplicate.
            var files = {}; 

            // Ideally (for readability) would looping over each experiment & grab property of each instead of biosource 
            // (biosource is metadata property on experiment)
            // but experiment.biosample.biosource is an array so might miss some.

            function getDataFromExperiment(exp){

                function updateBiosource(biosource){
                    if (
                        biosource.individual.organism.name &&
                        typeof rootNode.children[biosource.individual.organism.name] === 'undefined'
                    ){
                        var name = biosource.individual.organism.name;
                        name = name.charAt(0).toUpperCase() + name.slice(1);
                        name += " (" + biosource.individual.organism.scientific_name + ")";

                        rootNode.children[biosource.individual.organism.name] = {
                            'name' : name,
                            'children' : {},
                            'field' : 'experiment.biosample.biosource.individual.organism.scientific_name'
                        };
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

                // Biosample biosource_summary (group experiment descriptions by)
                if (
                    exp.biosample.biosource_summary &&
                    typeof rootNode.children[organismName].children[exp.biosample.biosource_summary] === 'undefined'
                ){
                    var description;
                    if (typeof exp.biosample.modifications_summary_short !== 'undefined' && exp.biosample.modifications_summary_short !== 'None'){
                        description = exp.biosample.modification_summary_short;
                    } else if (exp.biosample.biosource_summary) {
                        description = 'Biosample';
                    }
                    rootNode.children[organismName].children[exp.biosample.biosource_summary] = {
                        'name' : exp.biosample.biosource_summary,
                        'children' : {}, // We don't show experiment_sets here because there may be multiple biosamples per expset. 
                        'description' : description,
                        'field' : 'experiment.biosample.biosource_summary'
                    }
                }

                // Experiment Description (group experiments by)
                var attachExpSummaryTo = rootNode.children[organismName].children[exp.biosample.biosource_summary];

                if (
                    exp.biosample.biosource_summary &&
                    exp.experiment_summary &&
                    typeof attachExpSummaryTo.children[exp.experiment_summary] === 'undefined'
                ){
                    attachExpSummaryTo.children[exp.experiment_summary] = {
                        'name' : exp.experiment_summary,
                        //'description' : 'Experiment ' + exp.accession,
                        'children' : {},
                        'field' : 'experiment.experiment_summary'
                    }
                } else if (
                    exp.biosample.biosource_summary &&
                    !exp.experiment_summary &&
                    typeof attachExpSummaryTo.children.other === 'undefined'
                ){
                    console.error("Experiment " + exp.accession + " missing experiment_summary.");
                    attachExpSummaryTo.children.other = {
                        'name' : 'Other',
                        //'description' : 'Experiment ' + exp.accession,
                        'children' : {},
                        'field' : 'experiment.experiment_summary'
                    }
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
                    attachExpTo.children[exp.accession] = {
                        'name' : exp.accession,
                        'fallbackSize' : 1,
                        'field' : 'experiment.accession',
                        'children' : expFuncs.allFilesFromExperiment(exp).map(function(f){
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
                                    'field' : 'experiment.files.accession'
                                };
                            })
                    }
                } else {
                    console.error("Check experiment hierarchy code for chart.");
                }
            }

            // Loop over every experiment we have that was returned from /browse/ endpoint.
            for (var h = 0; h < experiment_sets.length; h++){
                for (var i = 0; i < experiment_sets[h].experiments_in_set.length; i++){
                    getDataFromExperiment(experiment_sets[h].experiments_in_set[i]);
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
            'breadcrumbDims' : {
                // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
                w: 100, h: 30, s: 3, t: 10
            },
            'fallbackToSampleData' : false, // Perhaps for tests.
            'colors' : { // Keys should be all lowercase
                "human (homo sapiens)" : "rgb(218, 112, 6)",
                "mouse (mus musculus)" : "rgb(43, 88, 169)",
                "other": "#a173d1",
                "end": "#bbbbbb"
            }
        };
    },

    /* We create a throttled version of this function in componentDidMount for performance */
    mouseoverHandle : function(d){
        var percentage = (100 * d.value / this.totalSize).toPrecision(3);
        var percentageString = percentage + "%";
        if (percentage < 0.1) {
            percentageString = "< 0.1%";
        }

        // .appendChild used to be faster than .innerHTML but seems
        // innerHTML is better now (?) https://jsperf.com/appendchild-vs-documentfragment-vs-innerhtml/24

        this.refs.percentage.innerHTML = percentageString;

        if (d.data.description) {
            this.refs.description.innerHTML = d.data.description;
        } else {
            this.refs.description.innerHTML = '';
        }

        this.refs.explanation.style.visibility = "";
        
        var sequenceArray = SunBurst.getAncestors(d);

        // Fade all the segments.
        // Then highlight only those that are an ancestor of the current segment.
        this.vis.selectAll("path")
            .interrupt()
            .style("opacity", 0.3)
            .filter(function(node){
                return (sequenceArray.indexOf(node) >= 0);
            })
            .style("opacity", 1);

        this.updateBreadcrumbs(sequenceArray, percentageString);
    },

    // Restore everything to full opacity when moving off the visualization.
    mouseleave : function(d) {

        var _this = this;
        setTimeout(function(){ // Wait 50ms (duration of mouseenter throttle) so delayed handler doesn't cancel this mouseleave transition.
            // Hide the breadcrumb trail
            _this.refs.breadcrumbs.setState({ 'visible' : false });

            // Deactivate all segments during transition.
            _this.vis.selectAll("path").on("mouseover", null);

            // Transition each segment to full opacity and then reactivate it.
            _this.vis.selectAll("path")
                .transition()
                .duration(750)
                .style("opacity", 1)
                //.filter(function(d){ return  })
                .each(function(path) {
                    d3.select(this).on("mouseover", _this.throttledMouseOverHandler);
                });

            _this.refs.explanation.style.visibility = "hidden";            
        }, 50);
    },

    updateBreadcrumbs : function(nodeArray, percentageString){
        this.refs.breadcrumbs.setState({ 
            nodes : nodeArray.map((n)=>{
                n.color = this.colorForNode(n);
                return n;
            }),
            visible : true
        });
    },

    containerDimensions : function(){
        return {
            width  : this.refs.container.offsetWidth  || this.refs.container.clientWidth  || this.props.width,
            height : this.refs.container.offsetHeight || this.refs.container.clientHeight || this.props.height
        };
    },

    colorForNode : function(node){
        if (node.data.color){
            return node.data.color;
        }

        // Normalize name to lower case (as capitalization etc may change in future)
        var nodeName = node.data.name.toLowerCase();

        if (typeof this.props.colors[nodeName] !== 'undefined'){
            return this.props.colors[nodeName];
        } else if (typeof this.colorCache[nodeName] !== 'undefined') {
            return this.colorCache[nodeName]; // Previously calc'd color
        } else if (
            node.data.field === 'experiment.accession' || 
            node.data.field === 'experiment.experiment_summary' ||
            node.data.field === 'experiment.biosample.biosource_summary'
        ){
            // Use a variant of parent node's color
            if (node.parent) {
                var color;
                if (node.data.field === 'experiment.experiment_summary'){
                    color = d3.interpolateRgb(
                        this.colorForNode(node.parent),
                        util.stringToColor(nodeName)
                    )(.4);
                } else if (node.data.field === 'experiment.biosample.biosource_summary'){
                    color = d3.interpolateRgb(
                        this.colorForNode(node.parent),
                        d3.color(util.stringToColor(nodeName)).darker(
                            0.5 + (
                                (2 * (node.parent.children.indexOf(node) + 1)) / node.parent.children.length
                            )
                        )
                    )(.3);
                } else if (node.data.field === 'experiment.accession') {
                    color = d3.color(this.colorForNode(node.parent)).brighter(
                        0.7
                        // uncomment below for sequence 'gradient'. Doesn't work too well if parent colors are close to each other and subsequent parent is slightly lighter.
                        //0.5 + (
                        //    (node.parent.children.indexOf(node) + 1) / (node.parent.children.length * 2)
                        //)
                    );
                }
                this.colorCache[nodeName] = color;
                return color;
            }
        }

        // Fallback
        this.colorCache[nodeName] = util.stringToColor(nodeName);
        return this.colorCache[nodeName];
    },

    visualization: function(){

        var _this = this; // So can use w/o needing to .apply internal functions.

        if (_this.props.data === null && !_this.props.fallbackToSampleData){
            // Nothing to visualize, maybe add loading indicator or something.
            console.info("Nothing to visualize for Sunburst chart.");
            return;
        }

        // Dimensions of sunburst.
        var containerDimensions = this.containerDimensions();
        var width = containerDimensions.width;
        var height = containerDimensions.height;
        var radius = Math.min(width, height) / 2;

        // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
        var b = _this.props.breadcrumbDims;

        _this.vis = d3.select("#" + _this.props.id + "-chart").append("svg:svg")
            .attr("width", width)
            .attr("height", height)
            .append("svg:g")
            .attr("id", _this.props.id + "-container")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");


        // This partition object/function is pretty much the magic behind the starburst layout.
        // It creates all the points/sizes (x0, x1, y0, y1) needed for a partitioned layout.
        // Then these are used by 'arc' transform below to draw/put into the SVG.

        var partition = d3.partition()
            .size([2 * Math.PI, radius * radius]);
            //.value(function(d) { return d.size; });

        var arc = d3.arc()
            .startAngle(function(d) { return d.x0; })
            .endAngle(function(d) { return d.x1; })
            .innerRadius(function(d) { return Math.sqrt(d.y0); })
            .outerRadius(function(d) { return Math.sqrt(d.y1); });

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
                .style("opacity", 0);

            var root = d3.hierarchy(json)
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

            partition(root); // THE MAGIC (takes care of creating coordinates for our visualzation)

            // For efficiency, filter nodes to keep only those large enough to see.
            var nodes = root.descendants().filter(function(d){
                return (Math.abs(d.x1-d.x0) > 0.01); // 0.005 radians = 0.29 degrees 
            });

            var path = _this.vis.data([json])
                .selectAll("path")
                .data(nodes)
                .enter().append("svg:path")
                .attr("display", function(d) { return d.depth ? null : "none"; })
                .attr("d", arc)
                .attr("fill-rule", "evenodd")
                .style("fill", _this.colorForNode)
                .style("opacity", 1)
                .on("mouseover", _this.throttledMouseOverHandler);

            // Add the mouseleave handler to the bounding circle.
            d3.select("#" + _this.props.id + "-container").on("mouseleave", _this.mouseleave);

            // Get total size of the tree = value of root node from partition.
            _this.totalSize = path.node().__data__.value;
        };

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
        /**
         * Manage own state for this component so don't need to re-render and re-initialize chart each time.
         */

        this.totalSize = 0; // Will be sum of leaf values (same val as root node), used for getting percentages.
        this.vis = null; // Entrypoint to chart
        this.colorCache = {}; // Save any calc'd-from-string colors to avoid recomputing each time.

        this.visualization(); // D3 initialization
        this.adjustExplanationPosition(); // Center text in center of chart

        this.throttledMouseOverHandler = _.throttle(this.mouseoverHandle, 50);
    },

    componentDidUpdate : function(){
        d3.select(this.refs.container).selectAll('svg').remove();
        this.visualization(); // D3 initialization
        this.adjustExplanationPosition(); // Center text in center of chart
    },

    adjustExplanationPosition : function(){
        var height = this.refs.explanation.offsetHeight || this.refs.explanation.clientHeight;
        var width = this.refs.explanation.offsetWidth || this.refs.explanation.clientWidth;
        _.extend(this.refs.explanation.style, {
            'marginTop' : '-' + (height / 2) + 'px',
            'marginLeft' : '-' + (width / 2) + 'px'
        });
    },

    componentWillUnmount : function(){
        delete this.totalSize;
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
        return (
            <div
                className={"chart-container chart-container-sunburst" + (this.props.data === null && !this.props.fallbackToSampleData ? ' no-data' : '')}
                id={this.props.id}
                ref="container"
            >
                <ChartBreadcrumbs parentId={this.props.id} ref="breadcrumbs" />
                <div id={this.props.id + "-chart"} className="chart chart-sunburst" ref="chart" style={{ 'minHeight' : this.props.height }}>
                    <div id={this.props.id + "-explanation"} ref="explanation" className="explanation" style={{ visibility: 'hidden' }}>
                        <div id={this.props.id + "-percentage"} className="percentage" ref="percentage">0%</div>
                        <div id={this.props.id + "-description"} className="description" ref="description"></div>
                    </div>
                </div>
            </div>
                
        );
    }

});

module.exports = SunBurst;