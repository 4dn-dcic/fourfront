'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
var d3 = require('d3');
var SunBurstChart = require('./viz/sunburst');
var BarPlotChart = require('./viz/barplot');
var { expFxn, expFilters, ajax, console, layout, isServerSide } = require('./util');
var FacetList = require('./facetlist');
var { ChartBreadcrumbs, util } = require('./viz/common');


var colorCache = {}; // We cache generated colors into here to re-use and speed up.

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

        colorForNode : function(node, predefinedColors){
            var nodeDatum = node.data || node; // So can process on d3-gen'd/wrapped elements as well as plain datums.

            if (nodeDatum.color){
                return nodeDatum.color;
            }

            // Normalize name to lower case (as capitalization etc may change in future)
            var nodeName = nodeDatum.name.toLowerCase();

            if (typeof predefinedColors[nodeName] !== 'undefined'){
                return predefinedColors[nodeName];
            } else if (typeof colorCache[nodeName] !== 'undefined') {
                return colorCache[nodeName]; // Previously calc'd color
            } else if (
                nodeDatum.field === 'experiments_in_set.accession' || 
                nodeDatum.field === 'experiments_in_set.experiment_summary' ||
                nodeDatum.field === 'experiments_in_set.biosample.biosource_summary'
            ){

                //if (node.data.field === 'experiments_in_set.accession'){
                //    return '#bbb';
                //}

                // Use a variant of parent node's color
                if (node.parent) {
                    var color;
                    if (nodeDatum.field === 'experiments_in_set.experiment_summary'){
                        color = d3.interpolateRgb(
                            FacetCharts.colorForNode(node.parent, predefinedColors),
                            util.stringToColor(nodeName)
                        )(.4);
                    } else if (nodeDatum.field === 'experiments_in_set.biosample.biosource_summary'){
                        color = d3.interpolateRgb(
                            FacetCharts.colorForNode(node.parent, predefinedColors),
                            d3.color(util.stringToColor(nodeName)).darker(
                                0.5 + (
                                    (2 * (node.parent.children.indexOf(node) + 1)) / node.parent.children.length
                                )
                            )
                        )(.3);
                    } else if (nodeDatum.field === 'experiments_in_set.accession') {
                        // color = d3.color(this.colorForNode(node.parent)).brighter(0.7);
                        color = d3.interpolateRgb(
                            FacetCharts.colorForNode(node.parent, predefinedColors),
                            d3.color("#ddd")
                        )(.8);
                    }
                    colorCache[nodeName] = color;
                    return color;
                }
            }

            // Fallback
            colorCache[nodeName] = util.stringToColor(nodeName);
            return colorCache[nodeName];
        },
        
    },
    
    getDefaultProps : function(){
        return {
            'href' : '/',
            'show' : function(path){
                if (path === '/') return 'large';
                if (path.indexOf('/browse/') > -1) return true;
                return false;
            },
            'context' : null,
            'ajax' : true,
            'views' : ['small', 'large'],
            'requestURLBase' : '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all&from=0',
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
                    {'xs' : 12, 'sm' : 12, 'md' : 6, 'lg' : 6},
                    {'xs' : 12, 'sm' : 12, 'md' : 6, 'lg' : 6}
                ]
            }
        };
    },

    getInitialState : function(){
        return {
            'experiments' : null, //FacetCharts.getExperimentsFromContext(this.props.context),
            'filteredExperiments' : null,
            'mounted' : false,
            'selectedNodes' : [], // expSetFilters, but with nodes (for colors, etc.) for breadcrumbs
            'chartFieldsHierarchy' : [
                { 
                    field : 'experiments_in_set.biosample.biosource.individual.organism.name',
                    description : "Primary Organism",
                    name : function(val, id, exps, filteredExps){
                        return val.charAt(0).toUpperCase() + val.slice(1);
                    }
                },
                { field : 'experiments_in_set.biosample.biosource.biosource_type', description : "Biosource Type" },
                { field : 'experiments_in_set.biosample.biosource_summary', description: "Biosample" },
                { field : 'experiments_in_set.experiment_summary', description: "Experiment Summary" },
                {
                    field : 'experiments_in_set.accession',
                    description: "Experiment Accession",
                    fallbackSize : function(val, id, exps, filteredExps, exp){
                        return filteredExps && filteredExps[exp.accession] ? 1 : (filteredExps ? 0 : 1);
                    },
                    isFacet : false,
                    children : function(val, id, exps, filteredExps, exp){
                        return expFxn.allFilesFromExperiment(exp).map(function(f,i,a){
                            return {
                                'name' : f.accession,
                                'size' : (!filteredExps || (filteredExps && filteredExps[exp.accession]) ?
                                    1 : 0.25
                                ),
                                'description' : 'File ' + f.accession,
                                'color' : '#ccc',
                                'id' : id + '-' + f.accession,
                                'field' : 'experiments_in_set.files.accession'
                            };
                        });
                    }
                }
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
            var filtersSet = _.keys(this.props.expSetFilters).length > 0;

            ajax.load(
                this.props.requestURLBase + this.getFieldsRequiredURLQueryPart(), 
                (res) => {
                    if (this.props.debug) console.log('FacetCharts - received all exps via AJAX:', res);
                    var newState = {
                        'experiments' : expFxn.listAllExperimentsFromExperimentSets(res['@graph'])
                    };
                    if (!filtersSet) { 
                        newState.filteredExperiments = null;
                        newState.mounted = true; // Else we wait for filteredExps to finish being fetched.
                    }
                    this.setState(newState);
                }
            );

            if (filtersSet) this.fetchAndSetFilteredExperiments(this.props, { 'mounted' : true });

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
            //this.props.href !== nextProps.href ||
            //this.props.expSetFilters !== nextProps.expSetFilters ||
            //this.props.context !== nextProps.context ||
            !_.isEqual(this.state, nextState) ||
            !_.isEqual(this.state.experiments, nextState.experiments) ||
            !_.isEqual(this.state.filteredExperiments, nextState.filteredExperiments) ||
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

        var newState = {};

        if (
            //(
            //    nextProps.context &&
            //    nextProps.context !== this.props.context &&
            //    !_.isEqual(nextProps.context, this.props.context) &&
            //    FacetCharts.isContextDataValid(nextProps.context)
            //) ||
            nextProps.expSetFilters !== this.props.expSetFilters
        ){
            
            // Update experiments
            //if (FacetCharts.isContextDataValid(nextProps.context)){
            //    newState.experiments = FacetCharts.getExperimentsFromContext(nextProps.context);
            //}

            // Update breadcrumbs
            newState.selectedNodes = updatedBreadcrumbsSequence.call(this);

            // Unset filtered experiments if no filters.
            if (_.keys(nextProps.expSetFilters).length === 0 && Array.isArray(this.state.experiments)){
                newState.filteredExperiments = null;
            }
            
        }

        if (Object.keys(newState).length > 0) this.setState(newState);
    },

    componentDidUpdate: function(pastProps, pastState){
        if (pastProps.expSetFilters !== this.props.expSetFilters || !_.isEqual(pastProps.expSetFilters, this.props.expSetFilters)){
            if (_.keys(this.props.expSetFilters).length > 0){
                this.fetchAndSetFilteredExperiments();
            }
        }
    },

    /**
     * Run experiments through this function before passing to a Chart component.
     * It filters experiments if any filters are set (will become deprecated eventually),
     * as well as handles transform to different data structure or format, if needed for chart.
     */
    transformData : function(
        toFormat = null,
        experiments = this.state.experiments,
        filteredExperiments = this.state.filteredExperiments,
        filters = this.props.expSetFilters
    ){

        if (!Array.isArray(experiments)){
            return null;
        }

        // ToDo: replace w/ AJAX (& state)
        // We have locally-set filters. Filter experiments before transforming. Will become deprecated w/ GraphQL update(s).
        //var filteredExps = ( filters && Object.keys(filters).length > 0 ) ?
        //        [...expFilters.siftExperimentsClientSide(experiments, filters)] :
        //        experiments;

        if (toFormat === 'tree') return SunBurstChart.transformDataForChart(
            experiments,
            filteredExperiments,
            this.state.chartFieldsHierarchy
        );
        else {
            return filteredExperiments || experiments;
        }

    },

    colorForNode : function(node){ return FacetCharts.colorForNode(node, this.props.colors); },

    fetchAndSetFilteredExperiments : function(props = this.props, extraState = {}){
        ajax.load(this.getFilteredContextHref(props) + this.getFieldsRequiredURLQueryPart(), (filteredContext)=>{
            this.setState(
                _.extend(extraState, {
                    'filteredExperiments' : expFxn.listAllExperimentsFromExperimentSets(filteredContext['@graph'])
                })
            );
        });
    },

    getFilteredContextHref : function(props = this.props){ return expFilters.filtersToHref(props.filters, props.href, 0, 'all', '/browse/'); },

    getFieldsRequiredURLQueryPart : function(){
        return this.props.fieldsToFetch.map(function(fieldToIncludeInResult){
            return '&field=' + fieldToIncludeInResult;
        }).join('');
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

        function updateExpSetFilters(){
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
                        newFilters = expFilters.changeFilter(
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
                            newFilters = expFilters.changeFilter(n.data.field, n.data.term, 'sets', newFilters, null, true);
                        }
                        if (Array.isArray(n.children) && n.children.length > 0) n.children.forEach(removeOwnAndChildrensTermsIfSet);
                    })(node);
                }

                expFilters.saveChangedFilters(newFilters, true, this.props.href);
            } else {
                // If not a tree, adjust filter re: node's term.
                expFilters.changeFilter(node.data.field, node.data.term, 'sets', this.props.expSetFilters, null, false, true, this.props.href);
            }
        }

        if (this.props.href.indexOf('/browse/') === -1){

            function getNavUrl(){
                var hrefParts = url.parse(this.props.href);
                var reqParts = url.parse(this.props.requestURLBase, true);
                var query = _.extend({}, reqParts.query, { 'limit' : expFilters.getLimit() || 25 });
                return hrefParts.protocol + "//" + hrefParts.host + reqParts.pathname + '?' + querystring.stringify(query);
            }

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
        if (typeof props.show === false) return false;
        if (typeof props.show === 'string' && props.views.indexOf(props.show) > -1) return props.show;
        if (typeof props.show === 'function') {
            var show;
            if (typeof props.href === 'string') {
                show = props.show(url.parse(props.href).path);
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

        var height = show === 'small' ? 360 : this.width();

        FacetList.unhighlightTerms();

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
            <div className={"facet-charts show-" + show} key="facet-charts">
                <ChartBreadcrumbs ref="breadcrumbs" selectedNodes={this.state.selectedNodes} key="facet-crumbs" />
                <div className="facet-charts-description description" ref="description" key="facet-chart-description"></div>
                <div className="row facet-chart-row-1" key="facet-chart-row-1" height={height}>
                    <div className={genChartColClassName(1)} key="facet-chart-row-1-chart-1">
                        <SunBurstChart
                            data={this.transformData('tree')}
                            filteredExperiments={this.state.filteredExperiments}
                            height={height}
                            fields={this.state.chartFieldsHierarchy}
                            breadcrumbs={() => this.refs.breadcrumbs}
                            descriptionElement={() => this.refs.description}
                            handleClick={this.handleVisualNodeClickToUpdateFilters}
                            colorForNode={this.colorForNode}
                            key="sunburst"
                            ref="sunburstChart"
                            debug
                        />
                    </div>
                    <div className={genChartColClassName(2)} key="facet-chart-row-1-chart-2">
                        <BarPlotChart 
                            experiments={this.transformData(null, this.state.filteredExperiments || this.state.experiments)}
                            width={this.width(1) - 20}
                            height={height}
                            colorForNode={this.colorForNode}
                        />
                    </div>
                </div>
            </div>
        );
    }

});

