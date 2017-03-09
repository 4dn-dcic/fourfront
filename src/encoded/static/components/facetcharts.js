'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
var d3 = require('d3');
var MosaicChart = require('./viz/MosaicChart');
var BarPlotChart = require('./viz/BarPlotChart');
var ChartDetailCursor = require('./viz/ChartDetailCursor');
var { expFxn, Filters, ajax, console, layout, isServerSide } = require('./util');
var FacetList = require('./facetlist');
var vizUtil = require('./viz/utilities');
var { SVGFilters, FetchingView, Legend } = require('./viz/components');
var ChartDataController = require('./viz/chart-data-controller');


/**
 * @callback showFunc
 * @param {string} path - Path of current page or view, derived from 'href' prop on FacetCharts component.
 * @return {string|boolean} - The type of view to display ('full', 'small') or bool. 
 */

/**
 * Area for displaying Charts rel to browsing.
 * 
 * Props:
 * 
 * @param {(boolean|string|showFunc)} [show] - Type of view to show or whether to display or not; if function supplied, as well as props.href, path is passed as argument. 
 * @param {string} [href='/'] - Current page/view URL, used to filter charts and pass 'path' arg to props.show, if provided.
 */

var FacetCharts = module.exports.FacetCharts = React.createClass({
    
    getDefaultProps : function(){
        return {
            'href' : '/',
            'show' : function(path, search, hash){
                if (typeof hash === 'string' && hash.indexOf('!impersonate-user') > -1) return false;
                if (path === '/' || path === '/home') return 'large';
                if (path.indexOf('/browse/') > -1) return true;
                return false;
            },
            'views' : ['small', 'large'],
            'requestURLBase' : '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all&from=0',
            'colWidthPerScreenSize' : {
                /* Previous, for mosaic: */
                'small' : [
                    //{'xs' : 12, 'sm' : 6,  'md' : 4, 'lg' : 3}, // For old mosaic
                    {'xs' : 12, 'sm' : 9,  'md' : 9, 'lg' : 9},
                    {'xs' : 12, 'sm' : 3, 'md' : 3, 'lg' : 3}
                ],
                'large' : [
                    //{'xs' : 12, 'sm' : 12, 'md' : 4, 'lg' : 3}, // For old mosaic
                    {'xs' : 12, 'sm' : 9, 'md' : 9, 'lg' : 9},
                    {'xs' : 12, 'sm' : 3, 'md' : 3, 'lg' : 3}
                ]
            }
        };
    },

    getInitialState : function(){
        return {
            'mounted'               : false,
            'selectedNodes'         : [],   // expSetFilters, but with nodes (for colors, etc.) for breadcrumbs,
            'fetching'              : false,
            /*
            TODO: Might bring these back here.
            'chartFieldsBarPlot'    : [
                { title : "Biosample", field : "experiments_in_set.biosample.biosource_summary" },
                { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
                { title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
                //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" }
            ],
            'chartFieldsHierarchy'  : [
                //{ 
                //    field : 'experiments_in_set.biosample.biosource.individual.organism.name',
                //    title : "Primary Organism",
                //    name : function(val, id, exps, filteredExps){
                //        return Filters.Term.toName('experiments_in_set.biosample.biosource.individual.organism.name', val);
                //    }
                //},
                //{ title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
                //{ title : "Biosample", field : 'experiments_in_set.biosample.biosource_summary' },
                { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
                {
                    title : "Digestion Enzyme",
                    field : 'experiments_in_set.digestion_enzyme.name',
                    description : function(val, id, exps, filteredExps, exp){
                        return 'Enzyme ' + val;
                    }
                },
                {
                    title : "Experiment Set",
                    aggregatefield : "experiment_sets.accession",
                    field : "accession",
                    isFacet : false,
                    size : 1
                },
                //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" },
                //{
                //    title: "Experiment Accession",
                //    field : 'experiments_in_set.accession',
                //    //size : function(val, id, exps, filteredExps, exp, parentNode){
                //    //    return 1 / (_.findWhere(exp.experiment_sets, { 'accession' : parentNode.term }).experiments_in_set);
                //    //},
                //    color : "#eee",
                //    isFacet : false,
                //}
            ],
            'chartFieldsHierarchyRight'  : [
                { 
                    field : 'experiments_in_set.biosample.biosource.individual.organism.name',
                    title : "Primary Organism",
                    name : function(val, id, exps, filteredExps){
                        return Filters.Term.toName('experiments_in_set.biosample.biosource.individual.organism.name', val);
                    }
                },
                { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
                { title : "Biosample", field : 'experiments_in_set.biosample.biosource_summary' },
                //{ title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
                //{
                //    title : "Digestion Enzyme",
                //    field : 'experiments_in_set.digestion_enzyme.name',
                //    description : function(val, id, exps, filteredExps, exp){
                //        return 'Enzyme ' + val;
                //    }
                //},
                {
                    title : "Experiment Set",
                    aggregatefield : "experiment_sets.accession",
                    field : "accession",
                    isFacet : false,
                    size : 1
                },
                //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" },
                //{
                //    title: "Experiment Accession",
                //    field : 'experiments_in_set.accession',
                //    //size : function(val, id, exps, filteredExps, exp, parentNode){
                //    //    return 1 / (_.findWhere(exp.experiment_sets, { 'accession' : parentNode.term }).experiments_in_set);
                //    //},
                //    color : "#eee",
                //    isFacet : false,
                //}
            ]
            */
        };
    },

    componentDidMount : function(){

        if (!isServerSide() && typeof window !== 'undefined'){
            var _this = this;
            this.debouncedResizeHandler = _.debounce(function(){
                _this.forceUpdate();
            }, 300);
            window.addEventListener('resize', this.debouncedResizeHandler);
        }

        var newState = {
            mounted : true
        };

        if (!ChartDataController.isInitialized()){
            ChartDataController.initialize(
                this.props.requestURLBase,
                this.props.updateStats,
                ()=>{
                    if (this.props.debug) console.log("Mounted FacetCharts after initializing ChartDataController:", ChartDataController.getState());
                    this.setState(newState);
                }
            );
        } else {
            if (this.props.debug) console.log('Mounted FacetCharts');
            this.setState(newState);
        }

    },

    componentWillUnmount : function(){
        if (!isServerSide() && typeof window !== 'undefined'){
            window.removeEventListener('resize', this.debouncedResizeHandler);
            delete this.debouncedResizeHandler;
        }
    },

    shouldComponentUpdate : function(nextProps, nextState){
        if (this.props.debug) console.log('FacetChart next props & state:', nextProps, nextState);

        if (
            this.props.schemas !== nextProps.schemas ||
            !_.isEqual(this.props.schemas, nextProps.schemas) ||
            this.show(nextProps) !== this.show(this.props) ||
            (nextState.mounted !== this.state.mounted)
        ){
            if (this.props.debug) console.log('Will Update FacetCharts');
            return true;
        }
        if (this.props.debug) console.log('Will Not Update FacetCharts');
        return false;
    },

    componentWillReceiveProps : function(nextProps){

        /** 
         * Given list of fields from inner to outer circle of MosaicChart, 
         * check if one is part of selected expSetFilters,
         * and if so, add to sequenceArray for ChartBreadcrumbs. 
         */
        /*
        function updatedBreadcrumbsSequence(){
            var sequence = [];
            if (typeof this.refs.mosaicChart === 'undefined') return sequence;
            
            var chartFields = this.refs.mosaicChart.getRootNode().data.fields;
            var filters = nextProps.expSetFilters;
            var term, node;

            for (var i = 0; i < chartFields.length; i++){
                if (typeof filters[chartFields[i]] !== 'undefined'){
                    if (filters[chartFields[i]].size === 1) {
                        // Grab first node (for colors, name, etc.) with matching term and append to sequence.
                        term = filters[chartFields[i]].values().next().value;
                        node = MosaicChart.findNode(this.refs.mosaicChart.getRootNode(), function(n){
                            return n.data.term && n.data.term === term;
                        });
                        if (typeof node !== 'undefined') {
                            if (typeof node.color === 'undefined'){
                                node = _.extend({ 'color' : this.colorForNode(node) }, node);
                            }
                            sequence.push(node);
                        }
                        else break;
                    } else break;
                } else break;
            }
            return sequence;
        }
        */

        //var newState = {};

        //if (Object.keys(newState).length > 0) this.setState(newState);
        if (!this.show(this.props) && this.show(nextProps) && !isServerSide()) {
            setTimeout(this.forceUpdate.bind(this), 50);
        }
    },

    componentDidUpdate: function(pastProps, pastState){
        console.log('Updated FacetCharts', this.state);
    },
    
    handleVisualNodeClickToUpdateFilters : _.throttle(function(node){

        if (typeof node.target !== 'undefined' && typeof node.target.nodeName === 'string'){
            // We have a click event from element rather than D3.
            node = node.target.__data__; // Same as: node = d3.select(node.target).datum();
        }
        
        if (typeof node.data.field !== 'string' || typeof node.data.term !== 'string'){
            console.error("No field or term on this node.");
            return;
        }

        function getNavUrl(){
            var hrefParts = url.parse(this.props.href);
            var reqParts = url.parse(this.props.requestURLBase, true);
            var query = _.extend({}, reqParts.query, { 'limit' : Filters.getLimit() || 25 });
            return hrefParts.protocol + "//" + hrefParts.host + reqParts.pathname + '?' + querystring.stringify(query);
        }

        function updateExpSetFilters(){

            // if part of tree
            /*
            if (node.parent) {

                // Don't save filters until all filters updated (prevent app re-renders)
                var newFilters = _.clone(this.props.expSetFilters);

                // If not selected, add any ancestor nodes' terms to filters as well.
                if (typeof this.props.expSetFilters[node.data.field] === 'undefined' || !this.props.expSetFilters[node.data.field].has(node.data.term)){
                    var sequenceArray = MosaicChart.getAncestors(node);
                    var i;
                    for (i = 0; i < sequenceArray.length; i++){
                        // Check if clicked on a term that's already set, then unset it to re-set it later down.
                        if (typeof sequenceArray[i].data.field !== 'string' || typeof sequenceArray[i].data.term !== 'string') continue;
                        if (typeof this.props.expSetFilters[sequenceArray[i].data.field] !== 'undefined') {
                            if (this.props.expSetFilters[sequenceArray[i].data.field].has(sequenceArray[i].data.term)) {
                                this.props.expSetFilters[sequenceArray[i].data.field].delete(sequenceArray[i].data.term);
                            }
                        }
                    }
                    for (i = 0; i < sequenceArray.length; i++){
                        if (typeof sequenceArray[i].data.field !== 'string' || typeof sequenceArray[i].data.term !== 'string') continue;
                        newFilters = Filters.changeFilter(
                            sequenceArray[i].data.field,
                            sequenceArray[i].data.term,
                            'sets',
                            newFilters,
                            null,
                            true // Return obj instead of saving.
                        );
                    }
                } else {
                    // Remove node's term from filter, as well as any childrens' filters (recursively), if set.
                    (function removeOwnAndChildrensTermsIfSet(n){
                        if (typeof newFilters[n.data.field] !== 'undefined' && newFilters[n.data.field].has(n.data.term)){
                            newFilters = Filters.changeFilter(n.data.field, n.data.term, 'sets', newFilters, null, true);
                        }
                        if (Array.isArray(n.children) && n.children.length > 0) n.children.forEach(removeOwnAndChildrensTermsIfSet);
                    })(node);
                }

                Filters.saveChangedFilters(newFilters, true, this.props.href);
            } else { */
                // If not a tree, adjust filter re: node's term.
            Filters.changeFilter(node.data.field, node.data.term, 'sets', this.props.expSetFilters, null, false, true, this.props.href);
            //}
        }

        if (this.props.href.indexOf('/browse/') === -1){

            // We're not on browse page, so filters probably wouldn't be useful to set without navigating to there.
            if (typeof this.props.navigate === 'function'){
                this.props.navigate(getNavUrl.call(this), {}, () => setTimeout(()=>{
                    updateExpSetFilters.call(this); // Wait for chart size to transition before updating.
                }, 800));
            }
        } else {
            // Swap filters only (no navigation).
            updateExpSetFilters.call(this);
        }

    }, 500, { trailing : false }), // Prevent more than 1 click per 500ms because it takes a while to grab calculate exps matching filters.

    show : function(props = this.props){
        if (props.show === false) return false;
        if (typeof props.show === 'string' && props.views.indexOf(props.show) > -1) return props.show;
        if (typeof props.show === 'function') {
            var show;
            if (typeof props.href === 'string') {
                var urlParts = url.parse(props.href);
                show = props.show(urlParts.pathname, urlParts.search, urlParts.hash);
            } else {
                show = props.show();
            }
            if (show === false) return false; // If true, continue to use default ('small')
            if (props.views.indexOf(show) > -1) return show;
        }
        return props.views[0]; // Default
    },

    /** We want a square for circular charts, so we determine WIDTH available for first chart (which is circular), and return that as height. */
    width : function(chartNumber = 0, show = null){
        if (!show) show = this.show();
        if (!show) return null;
        if (!this.state.mounted || isServerSide()){
            return 1160 * (this.props.colWidthPerScreenSize[show][chartNumber - 1].lg / 12); // Full width container size (1160) 
        } else {
            return (layout.gridContainerWidth() + 20) * (this.props.colWidthPerScreenSize[show][chartNumber - 1][layout.responsiveGridState()] / 12);
        }
    },

    updatePopover : _.debounce(function(d){
        return (
            this.refs &&
            this.refs.detailCursor &&
            this.refs.detailCursor.update &&
            this.refs.detailCursor.update(d)
        ) || null;
    }, 200),

    render : function(){

        var show = this.show();
        if (!show) return null; // We don't show section at all.

        var colWidthPerScreenSize = this.props.colWidthPerScreenSize;
        function genChartColClassName(chartNumber = 1){
            return Object.keys(colWidthPerScreenSize[show][chartNumber - 1]).map(function(size){
                return 'col-' + size + '-' + colWidthPerScreenSize[show][chartNumber - 1][size];
            }).join(' ');
        }

        var height = show === 'small' ? 300 : 450;

        FacetList.unhighlightTerms();

        if (!this.state.mounted){
            return ( // + 30 == breadcrumbs (26) + breadcrumbs-margin-bottom (10) + description (30)
                <div className={"facet-charts loading " + show} key="facet-charts" style={{ 'height' : height + 30 }}>
                    <i
                        className="icon icon-spin icon-circle-o-notch" 
                        style={{ 'top' : (height / 2 + 10) + 'px' }}
                    ></i>
                </div>
            );
        }

        console.log('SCHEMAS AT RENDER', this.props.schemas);

        var chartDataState = ChartDataController.getState();
        var legendFields = (this.refs && this.refs.barplotChart && this.refs.barplotChart.getLegendData()) || null;

        return (
            <div className={"facet-charts show-" + show} key="facet-charts">
                
                <div className="row facet-chart-row-1" key="facet-chart-row-1">
                    {/*
                    <div className={genChartColClassName(1)} key="facet-chart-row-1-chart-1" style={{ height: height }} ref="mosaicContainer">
                        <div className="row">
                            <div className="col-sm-6" style={{
                                width : (chartDataState.chartFieldsHierarchy.length / (chartDataState.chartFieldsHierarchyRight.length + chartDataState.chartFieldsHierarchy.length)) * 100 + '%'
                            }}>
                                <ChartDataController.Provider id="mosaic1">
                                    <MosaicChart
                                        fields={chartDataState.chartFieldsHierarchy}
                                        maxFieldDepthIndex={chartDataState.chartFieldsHierarchy.length - 1}

                                        height={height}
                                        width={(this.width(0)) * (chartDataState.chartFieldsHierarchy.length / (chartDataState.chartFieldsHierarchyRight.length + chartDataState.chartFieldsHierarchy.length)) - 20}
                                        updateBreadcrumbsHoverNodes={(nodes) => this.refs && this.refs.breadcrumbs && this.refs.breadcrumbs.updateHoverNodes(nodes)}

                                        handleClick={this.handleVisualNodeClickToUpdateFilters}
                                        updateStats={this.props.updateStats}
                                        updatePopover={this.updatePopover}

                                        href={this.props.href}
                                        key="sunburst"
                                        schemas={this.props.schemas}
                                        debug
                                    />
                                </ChartDataController.Provider>
                            </div>
                            <div className="col-sm-6" style={{
                                width : (chartDataState.chartFieldsHierarchyRight.length / (chartDataState.chartFieldsHierarchyRight.length + chartDataState.chartFieldsHierarchy.length)) * 100 + '%'
                            }}>
                                <ChartDataController.Provider id="mosaic2">
                                    <MosaicChart
                                        fields={chartDataState.chartFieldsHierarchyRight}
                                        maxFieldDepthIndex={chartDataState.chartFieldsHierarchyRight.length - 1}

                                        height={height}
                                        width={(this.width(0)) * (chartDataState.chartFieldsHierarchyRight.length / (chartDataState.chartFieldsHierarchyRight.length + chartDataState.chartFieldsHierarchy.length)) - 20 }
                                        updateBreadcrumbsHoverNodes={(nodes) => this.refs && this.refs.breadcrumbs && this.refs.breadcrumbs.updateHoverNodes(nodes)}

                                        handleClick={this.handleVisualNodeClickToUpdateFilters}
                                        updateStats={this.props.updateStats}
                                        updatePopover={this.updatePopover}

                                        href={this.props.href}
                                        key="sunburst"
                                        schemas={this.props.schemas}
                                        debug
                                    />
                                </ChartDataController.Provider>
                            </div>
                        </div>
                        <FetchingView display={this.state.fetching} />
                    </div>
                    */}
                    <div className={genChartColClassName(1)} key="facet-chart-row-1-chart-1" style={{ height: height }}>
                        <ChartDataController.Provider id="barplot1">
                            <BarPlotChart
                                fields={chartDataState.chartFieldsBarPlot}
                                width={this.width(1) - 20} height={height}
                                schemas={this.props.schemas}
                                updatePopover={this.updatePopover}
                                ref="barplotChart"
                                primaryField="experiments_in_set.biosample.biosource_summary"
                                secondaryField={null}

                            />
                        </ChartDataController.Provider>
                        <FetchingView display={this.state.fetching} />
                    </div>
                    <div className={genChartColClassName(2)} key="facet-chart-row-1-chart-2" style={{ height: height }}>
                        <Legend
                            fields={legendFields}
                            schemas={this.props.schemas}
                            width={this.width(2) - 20}
                            title={
                                <div>
                                    <h6 className="text-400 legend-title">
                                        { this.refs && this.refs.barplotChart && typeof this.refs.barplotChart.getTopLevelField === 'function' ?
                                            Filters.Field.toName(this.refs.barplotChart.getTopLevelField(), this.props.schemas)
                                        : null }
                                        <br/><span className="text-300">divided into</span>
                                    </h6>
                                </div>
                            }
                        />
                    </div>
                </div>
                <ChartDetailCursor
                    containingElement={(this.refs && this.refs.mosaicContainer) || null}
                    verticalAlign="center" /* cursor position */
                    visibilityMargin={{ left : -10, right : -10, bottom : -50, top: -18 }}
                    //debugStyle /* -- keep this Component always visible so we can style it */
                    ref="detailCursor"
                />
            </div>
        );
    }

});

