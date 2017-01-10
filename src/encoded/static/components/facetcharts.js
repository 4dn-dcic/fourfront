'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var SunBurstChart = require('./viz/sunburst');
var { ajaxLoad, gridContainerWidth, responsiveGridState, isServerSide } = require('./objectutils');
var FacetList = require('./facetlist');
var { ChartBreadcrumbs } = require('./viz/common');



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

    statics : {
        /** Check if data is good enough to visualize (has minimum data) */
        isContextDataValid : function(data){
            return SunBurstChart.isDataValid(data);
        }
    },
    
    getDefaultProps : function(){
        return {
            'href' : '/',
            'show' : function(path){
                if (path === '/') return 'large';
                if (path.indexOf('/browse/') > -1) return true;
                return false;
            },
            'data' : null,
            'ajax' : true,
            'views' : ['small', 'large'],
            'requestURLBase' : '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all',
            'fieldsToFetch' : [ // What fields we need from /browse/... for this chart.
                'experiments_in_set.experiment_summary',
                'experiments_in_set.accession',
                'experiments_in_set.status',
                'experiments_in_set.files.file_type',
                'experiments_in_set.files.accession',
                'experiments_in_set.filesets.files_in_set.accession',
                'experiments_in_set.biosample.description',
                'experiments_in_set.biosample.modifications_summary_short',
                'experiments_in_set.biosample.biosource_summary',
                'experiments_in_set.biosample.accession',
                'experiments_in_set.biosample.biosource.description',
                'experiments_in_set.biosample.biosource.biosource_name',
                'experiments_in_set.biosample.biosource.biosource_type',
                'experiments_in_set.biosample.biosource.individual.organism.name',
                'experiments_in_set.biosample.biosource.individual.organism.scientific_name'
            ]
        };
    },

    getInitialState : function(){
        // Eventually will have dataTree, dataBlocks, etc. or other naming convention as needed for different charts.
        return {
            'data' : this.transformData(this.props),
            'mounted' : false,
            'selectedNodes' : [] // expSetFilters, but with nodes (for colors, etc.)
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

        if (this.props.ajax && this.state.data === null){

            var reqUrl = this.props.requestURLBase;
            if (reqUrl.indexOf('&format=json') === -1) {
                if (reqUrl.indexOf('?') === -1){
                    reqUrl += '?format=json';
                } else {
                    reqUrl += '&format=json';
                }
            }
            reqUrl += this.props.fieldsToFetch.map(function(fieldToIncludeInResult){
                return '&field=' + fieldToIncludeInResult;
            }).join('');
            
            ajaxLoad(reqUrl, (res) => {
                this.setState({
                    'data' : this.transformData(
                        _.extend(
                            _.clone(this.props),
                            { 'context' : res } 
                        )
                    ),
                    'mounted' : true
                });
            });

        } else {
            this.setState({ 'mounted' : true });
        }

    },

    componentWillUnmount : function(){
        if (!isServerSide() && typeof window !== 'undefined'){
            window.removeEventListener('resize', this.debouncedResizeHandler);
            delete this.debouncedResizeHandler;
        }
    },

    transformData : function(props, toFormat = 'tree'){
        if (!props.context || !FacetCharts.isContextDataValid(props.context)){
            return null;
        }
        if (props.expSetFilters && Object.keys(props.expSetFilters).length > 0){
            // We have locally-set filters. Filter experiments before transforming. Will become deprecated w/ GraphQL update(s).
            return SunBurstChart.transformDataForChart(
                [...FacetList.siftExperiments(props.context['@graph'], props.expSetFilters)],
                true
            )
        } else {
            return SunBurstChart.transformDataForChart(props.context['@graph']);
        }

    },

    componentWillReceiveProps : function(nextProps){

        function updatedBreadcrumbsSequence(){
            // Remove selected breadcrumb and its descendant crumbs, if no longer selected.
            var sequence = [];
            if (this.state.selectedNodes.length > 0){
                for (var i = 0; i < this.state.selectedNodes.length; i++){
                    if (typeof nextProps.expSetFilters[this.state.selectedNodes[i].data.field] !== 'undefined'){
                        if (nextProps.expSetFilters[this.state.selectedNodes[i].data.field].has(this.state.selectedNodes[i].data.term)){
                            // Good
                            sequence.push(this.state.selectedNodes[i]);
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            return sequence;
        }

        if (
            (
                nextProps.context &&
                nextProps.context !== this.props.context &&
                !_.isEqual(nextProps.context, this.props.context) &&
                FacetCharts.isContextDataValid(nextProps.context)
            ) ||
            nextProps.expSetFilters !== this.props.expSetFilters
        ){
            var newState = {};
            if (FacetCharts.isContextDataValid(nextProps.context)){
                newState.data = this.transformData(nextProps);
            }
            if (nextProps.expSetFilters !== this.props.expSetFilters){
                newState.selectedNodes = updatedBreadcrumbsSequence.call(this);
            }
            if (Object.keys(newState).length > 0) this.setState(newState);
        }

    },

    handleVisualNodeClickToUpdateFilters : function(node){
        
        if (typeof node.data.field !== 'string' || typeof node.data.term !== 'string'){
            console.error("No field or term on this node.");
            return;
        }

        // if part of tree
        if (node.parent) {

            // Don't save filters until all filters updated (prevent app re-renders)
            var newFilters = _.clone(this.props.expSetFilters);

            // If not selected, add any ancestor nodes' terms to filters as well.
            if (typeof this.props.expSetFilters[node.data.field] === 'undefined' || !this.props.expSetFilters[node.data.field].has(node.data.term)){
                var sequenceArray = SunBurstChart.getAncestors(node);
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
                    newFilters = FacetList.changeFilter(sequenceArray[i].data.field, sequenceArray[i].data.term, 'sets', newFilters, null, true);
                }
                this.setState({ 'selectedNodes' : sequenceArray });
            } else {
                // Remove node's term from filter, as well as any childrens' filters (recursively), if set.
                (function removeOwnAndChildrensTermsIfSet(n){
                    if (typeof newFilters[n.data.field] !== 'undefined' && newFilters[n.data.field].has(n.data.term)){
                        newFilters = FacetList.changeFilter(n.data.field, n.data.term, 'sets', newFilters, null, true);
                    }
                    if (Array.isArray(n.children) && n.children.length > 0) n.children.forEach(removeOwnAndChildrensTermsIfSet);
                })(node);
            }

            FacetList.saveChangedFilters(newFilters);
        } else {
            // If not a tree, adjust filter re: node's term.
            FacetList.changeFilter(node.data.field, node.data.term, 'sets', this.props.expSetFilters, null, false);
        }
            
    },

    show : function(){
        if (typeof this.props.show === false) return false;
        if (typeof this.props.show === 'string' && this.props.views.indexOf(this.props.show) > -1) return this.props.show;
        if (typeof this.props.show === 'function') {
            var show;
            if (typeof this.props.href === 'string') {
                show = this.props.show(url.parse(this.props.href).path);
            } else {
                show = this.props.show();
            }
            if (show === false) return false; // If true, continue to use default ('small')
            if (this.props.views.indexOf(show) > -1) return show;
        }
        return this.props.views[0]; // Default
    },

    render : function(){

        var show = this.show();

        if (!show) return null; // We don't show section at all.

        // Height depends on avail width so we have a square area per chart.
        var colWidthPerScreenSize = {
            small : {'xs' : 12, 'sm' : 5,  'md' : 4, 'lg' : 3},
            large : {'xs' : 12, 'sm' : 12, 'md' : 6, 'lg' : 6}
        };

        function genChartColClassName(){
            return Object.keys(colWidthPerScreenSize[show]).map(function(size){
                return 'col-' + size + '-' + colWidthPerScreenSize[show][size];
            }).join(' ');
        }

        var height = 200; // Fallback/default
        if (!this.state.mounted || isServerSide()){
            height = 1160 * (colWidthPerScreenSize[show].lg / 12);
        } else {
            height = (gridContainerWidth() + 20) * (colWidthPerScreenSize[show][responsiveGridState()] / 12);
        }

        if (!this.state.mounted){
            return ( // + 66 == breadcrumbs (26) + breadcrumbs-margin-bottom (10) + description (30)
                <div className={"facet-charts loading " + show} key="facet-charts" style={{ 'height' : height + 66 }}>
                    <i
                        className="icon icon-spin icon-circle-o-notch" 
                        style={{
                            'top' : (height / 2 + 10) + 'px'
                         }}
                    ></i>
                </div>
            );
        }

        return (
            <div className={"facet-charts " + show} key="facet-charts">
                <ChartBreadcrumbs ref="breadcrumbs" selectedNodes={this.state.selectedNodes} key="facet-crumbs" />
                <div className="facet-charts-description description" ref="description" key="facet-chart-description"></div>
                <div className="row" key="facet-chart-row-1">
                    <div className={genChartColClassName()} key="facet-chart-row-1-chart-1">
                        <SunBurstChart
                            data={this.state.data}
                            height={height}
                            fields={this.props.fieldsToFetch}
                            breadcrumbs={() => this.refs.breadcrumbs}
                            descriptionElement={() => this.refs.description}
                            key="sunburst" 
                            handleClick={this.handleVisualNodeClickToUpdateFilters}
                        />
                    </div>
                </div>
            </div>
        );
    }

});

