'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
var d3 = require('d3');
var SunBurstChart = require('./viz/sunburst');
var BarPlotChart = require('./viz/barplot');
var { expFxn, Filters, ajax, console, layout, isServerSide } = require('./util');
var FacetList = require('./facetlist');
var vizUtil = require('./viz/utilities');
var { ChartBreadcrumbs, SVGFilters, FetchingView } = require('./viz/components');

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

        /** Check if data is valid; must be array of experiment_sets w/ minimally-needed properties. */
        isContextDataValid : function(context){
            if (typeof context['@graph'] === 'undefined') return false;

            var experiment_sets = context['@graph'];
            if (!Array.isArray(experiment_sets)) return false;
            if (experiment_sets.length === 0) return true; // Valid but no data.
            
            var expset = experiment_sets[0];
            if (!Array.isArray(expset.experiments_in_set)) return false;
            if (expset.experiments_in_set.length === 0) return true; // Valid but no data.
            
            var exp = expset.experiments_in_set[0];
            if (typeof exp.accession === 'undefined') return false;
            if (typeof exp.experiment_summary === 'undefined') return false;
            if (typeof exp.biosample !== 'object') return false;
            if (typeof exp.biosample.biosource_summary !== 'string') return false;
            if (typeof exp.biosample.biosource === 'undefined') return false;

            var biosource = Array.isArray(exp.biosample.biosource) ? 
                (exp.biosample.biosource.length > 0 ? exp.biosample.biosource[0] : null) : exp.biosample.biosource;

            if (biosource === null) return false;
            if (typeof biosource.individual !== 'object' || !biosource.individual) return false;
            if (typeof biosource.individual.organism !== 'object' || !biosource.individual.organism) return false;
            if (typeof biosource.individual.organism.name !== 'string') return false;
            if (typeof biosource.individual.organism.scientific_name !== 'string') return false;
            return true;
        },

        getExperimentsFromContext : function(context){
            if (!context) return null;
            if (!FacetCharts.isContextDataValid(context)) return null;
            return expFxn.listAllExperimentsFromExperimentSets(context['@graph']);
        },

        /** Not used/necessary, keeping for future if needed. */
        isBrowserMSEdge : function(){
            if (isServerSide()) return false;
            if (document.documentElement.className.indexOf('no-uaEdge') > -1) return false;
            if (document.documentElement.className.indexOf('uaEdge') > -1) return true;
            return true;
        },

        getFieldsRequiredURLQueryPart : function(fields){
            return fields.map(function(fieldToIncludeInResult){
                return '&field=' + fieldToIncludeInResult;
            }).join('');
        },
        
    },
    
    getDefaultProps : function(){
        return {
            'href' : '/',
            'show' : function(path){
                if (path === '/' || path === '/home') return 'large';
                if (path.indexOf('/browse/') > -1) return true;
                return false;
            },
            'context' : null,
            'ajax' : true,
            'views' : ['small', 'large'],
            'requestURLBase' : '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all&from=0',
            'fieldsToFetch' : [ // What fields we need from /browse/... for this chart.
                'accession',
                'experiments_in_set.experiment_summary',
                'experiments_in_set.experiment_type',
                'experiments_in_set.accession',
                //'experiments_in_set.status',
                //'experiments_in_set.files.file_type',
                'experiments_in_set.files.accession',
                'experiments_in_set.filesets.files_in_set.accession',
                //'experiments_in_set.biosample.description',
                //'experiments_in_set.biosample.modifications_summary_short',
                'experiments_in_set.biosample.biosource_summary',
                //'experiments_in_set.biosample.accession',
                //'experiments_in_set.biosample.biosource.description',
                'experiments_in_set.biosample.biosource.biosource_name',
                'experiments_in_set.biosample.biosource.biosource_type',
                'experiments_in_set.biosample.biosource.individual.organism.name',
                'experiments_in_set.biosample.biosource.individual.organism.scientific_name',
                'experiments_in_set.digestion_enzyme.name'
            ],
            'colors' : { // Keys should be all lowercase
                "human (homo sapiens)" : "rgb(218, 112, 6)",
                "human" : "rgb(218, 112, 6)",
                "mouse (mus musculus)" : "rgb(43, 88, 169)",
                "mouse" : "rgb(43, 88, 169)",
                "other": "#a173d1",
                "end": "#bbbbbb"
            },
            colWidthPerScreenSize : {
                'small' : [
                    {'xs' : 12, 'sm' : 6,  'md' : 4, 'lg' : 3},
                    {'xs' : 12, 'sm' : 6,  'md' : 8, 'lg' : 9}
                ],
                'large' : [
                    {'xs' : 12, 'sm' : 12, 'md' : 4, 'lg' : 3},
                    {'xs' : 12, 'sm' : 12, 'md' : 8, 'lg' : 9}
                ]
            }
        };
    },

    getInitialState : function(){
        return {
            'experiments'           : null, //FacetCharts.getExperimentsFromContext(this.props.context),
            'filteredExperiments'   : null,
            'mounted'               : false,
            'selectedNodes'         : [],   // expSetFilters, but with nodes (for colors, etc.) for breadcrumbs,
            'fetching'              : false,
            'chartFieldsBarPlot'    : [
                { title : "Biosample", field : "experiments_in_set.biosample.biosource_summary" },
                { title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
                //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" }
            ],
            'chartFieldsHierarchy'  : [
                { 
                    field : 'experiments_in_set.biosample.biosource.individual.organism.name',
                    title : "Primary Organism",
                    name : function(val, id, exps, filteredExps){
                        return Filters.Term.toName('experiments_in_set.biosample.biosource.individual.organism.name', val);
                    }
                },
                { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
                { title : "Biosample", field : 'experiments_in_set.biosample.biosource_summary' },
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
            ]
        };
    },

    componentDidMount : function(){
        if (this.props.debug) console.log('Mounted FacetCharts');

        if (!isServerSide() && typeof window !== 'undefined'){
            var _this = this;
            this.debouncedResizeHandler = _.debounce(function(){
                _this.forceUpdate();
            }, 300);
            window.addEventListener('resize', this.debouncedResizeHandler);
        }

        if (this.props.ajax && this.state.experiments === null){

            if (this.props.debug) console.log('FacetCharts - fetching all experiments from ' + this.props.requestURLBase);
            this.fetchUnfilteredAndFilteredExperiments(this.props, { 'mounted' : true });

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

    shouldComponentUpdate : function(nextProps, nextState){
        if (this.props.debug) console.log('FacetChart next props & state:', nextProps, nextState);
        if (
            !_.isEqual(this.state, nextState) ||
            !_.isEqual(this.state.experiments, nextState.experiments) ||
            !_.isEqual(this.state.filteredExperiments, nextState.filteredExperiments) ||
            this.props.schemas !== nextProps.schemas ||
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
         * Given list of fields from inner to outer circle of sunburst chart, 
         * check if one is part of selected expSetFilters,
         * and if so, add to sequenceArray for ChartBreadcrumbs. 
         */
        /*
        function updatedBreadcrumbsSequence(){
            var sequence = [];
            if (typeof this.refs.sunburstChart === 'undefined') return sequence;
            
            var chartFields = this.refs.sunburstChart.getRootNode().data.fields;
            var filters = nextProps.expSetFilters;
            var term, node;

            for (var i = 0; i < chartFields.length; i++){
                if (typeof filters[chartFields[i]] !== 'undefined'){
                    if (filters[chartFields[i]].size === 1) {
                        // Grab first node (for colors, name, etc.) with matching term and append to sequence.
                        term = filters[chartFields[i]].values().next().value;
                        node = SunBurstChart.findNode(this.refs.sunburstChart.getRootNode(), function(n){
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

        var newState = {};

        if (
            nextProps.expSetFilters !== this.props.expSetFilters
        ){
            
            // Update experiments
            //if (FacetCharts.isContextDataValid(nextProps.context)){
            //    newState.experiments = FacetCharts.getExperimentsFromContext(nextProps.context);
            //}

            // Update breadcrumbs
            // newState.selectedNodes = updatedBreadcrumbsSequence.call(this);

            // Unset filtered experiments if no filters.
            if (_.keys(nextProps.expSetFilters).length === 0 && Array.isArray(this.state.experiments)){
                newState.filteredExperiments = null;
            } else {
                newState.fetching = true;
            }
            
        }

        if (Object.keys(newState).length > 0) this.setState(newState);
    },

    componentDidUpdate: function(pastProps, pastState){

        if (pastProps.requestURLBase !== this.props.requestURLBase) {
            this.fetchUnfilteredAndFilteredExperiments(this.props, { 'fetching' : false });
        } else if (pastProps.expSetFilters !== this.props.expSetFilters || !_.isEqual(pastProps.expSetFilters, this.props.expSetFilters)){
            if (_.keys(this.props.expSetFilters).length > 0){
                this.fetchAndSetFilteredExperiments(this.props, { 'fetching' : false });
            } else {
                // @see componentWillReceiveProps (set state.filteredExperiments = null)
            }
        }
    },

    fetchUnfilteredAndFilteredExperiments : function(props, extraState = {}){
        var filtersSet = _.keys(this.props.expSetFilters).length > 0;
        var experiments, filteredExperiments = null;

        var cb = _.after(filtersSet ? 2 : 1, function(){
            this.setState(_.extend({ 
                'experiments' : experiments,
                'filteredExperiments' : filteredExperiments
            }, extraState));
        }.bind(this));

        ajax.load(props.requestURLBase + this.getFieldsRequiredURLQueryPart(), (allExpsContext)=>{
            experiments = expFxn.listAllExperimentsFromExperimentSets(allExpsContext['@graph']);
            cb();
        });

        if (filtersSet){
            ajax.load(this.getFilteredContextHref(props) + this.getFieldsRequiredURLQueryPart(), (filteredContext)=>{
                filteredExperiments = expFxn.listAllExperimentsFromExperimentSets(filteredContext['@graph']);
                cb();
            });
        }

    },

    fetchAndSetUnfilteredExperiments : function(props = this.props, extraState = {}){
        ajax.load(props.requestURLBase + this.getFieldsRequiredURLQueryPart(), (allExpsContext)=>{
            this.setState(
                _.extend(extraState, {
                    'experiments' : expFxn.listAllExperimentsFromExperimentSets(allExpsContext['@graph'])
                })
            );
        });
    },

    fetchAndSetFilteredExperiments : function(props = this.props, extraState = {}){
        ajax.load(this.getFilteredContextHref(props) + this.getFieldsRequiredURLQueryPart(), (filteredContext)=>{
            this.setState(
                _.extend(extraState, {
                    'filteredExperiments' : expFxn.listAllExperimentsFromExperimentSets(filteredContext['@graph'])
                })
            );
        });
    },

    getFilteredContextHref : function(props = this.props){ return Filters.filtersToHref(props.filters, props.href, 0, 'all', '/browse/'); },

    getFieldsRequiredURLQueryPart : function(){ return FacetCharts.getFieldsRequiredURLQueryPart(this.props.fieldsToFetch); },

    colorForNode : function(node){ return vizUtil.colorForNode(node, this.props.colors); },

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
                show = props.show(url.parse(props.href).pathname);
            } else {
                show = props.show();
            }
            if (show === false) return false; // If true, continue to use default ('small')
            if (props.views.indexOf(show) > -1) return show;
        }
        return props.views[0]; // Default
    },

    /** We want a square for circular charts, so we determine WIDTH available for first chart (which is circular), and return that as height. */
    width : function(chartIndex = 0, show = null){
        if (!show) show = this.show();
        if (!show) return null;
        if (!this.state.mounted || isServerSide()){
            return 1160 * (this.props.colWidthPerScreenSize[show][chartIndex].lg / 12); // Full width container size (1160) 
        } else {
            return (layout.gridContainerWidth() + 20) * (this.props.colWidthPerScreenSize[show][chartIndex][layout.responsiveGridState()] / 12);
        }
    },

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

        return (
            <div className={"facet-charts show-" + show} key="facet-charts">
                
                <div className="facet-charts-description description" ref="description" key="facet-chart-description"></div>
                <div className="row facet-chart-row-1" key="facet-chart-row-1">
                    <div className={genChartColClassName(1)} key="facet-chart-row-1-chart-1" style={{ height: height }}>
                        <SunBurstChart
                            experiments={this.state.experiments}
                            filteredExperiments={this.state.filteredExperiments}
                            fields={this.state.chartFieldsHierarchy}
                            maxFieldDepthIndex={5}

                            height={height} width={this.width(0) - 20}
                            updateBreadcrumbsHoverNodes={(nodes) => this.refs && this.refs.breadcrumbs && this.refs.breadcrumbs.updateHoverNodes(nodes)}
                            descriptionElement={() => this.refs.description}

                            handleClick={this.handleVisualNodeClickToUpdateFilters}
                            colorForNode={this.colorForNode}
                            updateStats={this.props.updateStats}

                            expSetFilters={this.props.expSetFilters}
                            href={this.props.href}
                            key="sunburst"
                            ref="sunburstChart"
                            debug
                        />
                        <FetchingView display={this.state.fetching} />
                    </div>
                    <div className={genChartColClassName(2)} key="facet-chart-row-1-chart-2" style={{ height: height }}>
                        <BarPlotChart 
                            experiments={this.state.filteredExperiments || this.state.experiments}
                            fields={this.state.chartFieldsBarPlot}
                            width={this.width(1) - 20} height={height}
                            colorForNode={this.colorForNode}
                            schemas={this.props.schemas}
                        />
                        <FetchingView display={this.state.fetching} />
                    </div>
                </div>
            </div>
        );
    }

});

