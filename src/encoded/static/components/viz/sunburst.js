'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');

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

        // Taken from http://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
        stringToColor : function(str) {
            var hash = 0;
            for (var i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            var colour = '#';
            for (var i = 0; i < 3; i++) {
                var value = (hash >> (i * 8)) & 0xFF;
                colour += ('00' + value.toString(16)).substr(-2);
            }
            return colour;
        }
    },

    getDefaultProps : function(){
        return {
            width : 750,
            height : 600,
            id : "main",
            data : null,
            breadcrumbDims : {
                // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
                w: 250, h: 30, s: 3, t: 10
            },
            colors : {
                "home": "#5687d1",
                "product": "#7b615c",
                "search": "#de783b",
                "account": "#6ab975",
                "other": "#a173d1",
                "end": "#bbbbbb"
            }
        };
    },

    // Fade all but the current sequence, and show it in the breadcrumb trail.
    mouseover : function(d){

        var percentage = (100 * d.value / this.totalSize).toPrecision(3);
        var percentageString = percentage + "%";
        if (percentage < 0.1) {
            percentageString = "< 0.1%";
        }

        this.refs.percentage.innerHTML = percentageString;
        this.refs.explanation.style.visibility = "";
        if (d.data.description) {
            this.refs.description.innerHTML = d.data.description;
        } else {
            this.refs.description.innerHTML = '';
        }

        var sequenceArray = SunBurst.getAncestors(d);
        this.updateBreadcrumbs(sequenceArray, percentageString);

        // Fade all the segments.
        this.vis.selectAll("path").style("opacity", 0.3);

        // Then highlight only those that are an ancestor of the current segment.
        this.vis.selectAll("path")
            .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
            })
            .style("opacity", 1);
    },

    // Restore everything to full opacity when moving off the visualization.
    mouseleave : function(d) {

        var _this = this;

        // Hide the breadcrumb trail
        d3.select(this.refs.sequence).select("#" + _this.props.id + "-trail").style("visibility", "hidden");

        // Deactivate all segments during transition.
        _this.vis.selectAll("path").on("mouseover", null);

        // Transition each segment to full opacity and then reactivate it.
        _this.vis.selectAll("path")
            .transition()
            .duration(1000)
            .style("opacity", 1)
            //.filter(function(d){ return  })
            .each(function(path) {
                d3.select(this).on("mouseover", _this.mouseover);
            });

        _this.refs.explanation.style.visibility = "hidden";            
    },

    // Update the breadcrumb trail to show the current sequence and percentage.
    updateBreadcrumbs : function(nodeArray, percentageString) {
        var b = this.props.breadcrumbDims;

        // Data join; key function combines name and depth (= position in sequence).
        var g = d3.select(this.refs.sequence).select("#" + this.props.id + "-trail")
            .selectAll("g")
            .data(nodeArray, function(d) { return d.data.name + d.depth; });

        // Add breadcrumb and label for entering nodes.
        var entering = g.enter()
            .append("svg:g")
            .attr("transform", function(d) { return "translate(" + (d.depth - 1) * (b.w + b.s) + ",0)"; });

        entering.append("svg:polygon")
            .attr("points", this.breadcrumbPoints)
            .style("fill", (d) => {
                if (typeof this.props.colors[d.data.name] !== 'undefined') return this.props.colors[d.data.name];
                else return SunBurst.stringToColor(d.data.name);
            });

        entering.append("svg:text")
            .attr("x", (b.w + b.t) / 2)
            .attr("y", (b.h / 2) - 1)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(function(d) { return d.data.name; });

        // Remove exiting nodes.
        g.exit().remove();

        // Set position for entering and updating nodes.
        g.attr("transform", function(d, i) {
            return "translate(" + (d.depth - 1) * (b.w + b.s) + ", 0)";
        });

        // Now move and update the percentage at the end.
        d3.select(this.refs.sequence).select("#" + this.props.id + "-trail").select("#" + this.props.id + "-endlabel")
            .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
            .attr("y", b.h / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(percentageString);

        // Make the breadcrumb trail visible, if it's hidden.
        d3.select(this.refs.sequence).select("#" + this.props.id + "-trail")
            .style("visibility", "");

    },

    // Generate a string that describes the points of a breadcrumb polygon.
    breadcrumbPoints : function(d, i) {
        var b = this.props.breadcrumbDims;
        var points = [];
        points.push("0,0");
        points.push(b.w + ",0");
        points.push(b.w + b.t + "," + (b.h / 2));
        points.push(b.w + "," + b.h);
        points.push("0," + b.h);
        if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
            points.push(b.t + "," + (b.h / 2));
        }
        return points.join(" ");
    },


    visualization: function(){

        var _this = this; // So can use w/o needing to .apply internal functions.

        // Dimensions of sunburst.
        var containerDimensions = this.containerDimensions();
        var width = containerDimensions.width || _this.props.width;
        var height = containerDimensions.height || _this.props.height;
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

        if (this.props.data === null){
            // Use d3.text and d3.csv.parseRows so that we do not need to have a header
            // row, and can receive the csv as an array of arrays.
            d3.text("/static/data/test-data-for-chart-visit-sequences.csv", function(text) {
                var csv = d3.csvParseRows(text);
                var json = buildHierarchy(csv);
                console.log(_.clone(json));
                createVisualization(json);
            });
        } else if (Array.isArray(this.props.data)) {
            var json = buildHierarchy(this.props.data);
            createVisualization(json);
        } else {
            createVisualization(this.props.data);
        }

        // Main function to draw and set up the visualization, once we have the data.
        function createVisualization(json) {

            // Basic setup of page elements.
            initializeBreadcrumbTrail();
            drawLegend();
            d3.select("#" + _this.props.id + "-togglelegend").on("click", toggleLegend);

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
                return (Math.abs(d.x1-d.x0) > 0.005); // 0.005 radians = 0.29 degrees 
            });

            var path = _this.vis.data([json])
                .selectAll("path")
                .data(nodes)
                .enter().append("svg:path")
                .attr("display", function(d) { return d.depth ? null : "none"; })
                .attr("d", arc)
                .attr("fill-rule", "evenodd")
                .style("fill", function(d) {
                    if (typeof _this.props.colors[d.data.name] !== 'undefined') return _this.props.colors[d.data.name];
                    else return SunBurst.stringToColor(d.data.name);
                 })
                .style("opacity", 1)
                .on("mouseover", _this.mouseover);

            // Add the mouseleave handler to the bounding circle.
            d3.select("#" + _this.props.id + "-container").on("mouseleave", _this.mouseleave);

            // Get total size of the tree = value of root node from partition.
            _this.totalSize = path.node().__data__.value;
        };

        function initializeBreadcrumbTrail() {
            // Add the svg area.
            var trail = d3.select(_this.refs.sequence).append("svg:svg")
                .attr("width", width)
                .attr("height", 50)
                .attr("id", _this.props.id + "-trail");
            // Add the label at the end, for the percentage.
            trail.append("svg:text")
                .attr("id", _this.props.id + "-endlabel")
                .style("fill", "#000");
        }

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
         * Comment from D3 example : Total size of all segments; we set this later, after loading the data.
         */
        this.totalSize = 0; // Will be sum of leaf values (same val as root node), used for getting percentages.
        this.vis = null; // Entrypoint to chart
        this.visualization(); // D3 initialization
        this.adjustExplanationPosition(); // Center text in center of chart
    },

    componentDidUpdate : function(){
        d3.select(this.refs.container).selectAll('svg').remove();
        this.visualization(); // D3 initialization
        this.adjustExplanationPosition(); // Center text in center of chart
    },

    containerDimensions : function(){
        return {
            width : this.refs.container.offsetWidth || this.refs.container.clientWidth,
            height : this.refs.container.offsetHeight || this.refs.container.clientHeight
        };
    },

    adjustExplanationPosition : function(){
        var height = this.refs.explanation.offsetHeight || this.refs.explanation.clientHeight;
        var width = this.refs.explanation.offsetWidth || this.refs.explanation.clientWidth;
        console.log(width, height);
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
            <div className="chart-container chart-container-sunburst" id={this.props.id} ref="container">
                <div id={this.props.id + "-sequence"} className="sequence" ref="sequence"></div>
                <div id={this.props.id + "-chart"} className="chart chart-sunburst">
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