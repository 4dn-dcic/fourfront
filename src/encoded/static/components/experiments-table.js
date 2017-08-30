'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Collapse } from 'react-bootstrap';
import _ from 'underscore';
import { FacetList } from './browse/components';
import { expFxn, Filters, console, isServerSide, analytics, object } from './util';



/**
 * Label to show at top left of Name block.
 * 
 * @private
 * @memberof StackedBlockName
 * @class Label
 * @extends {React.Component}
 */
class StackedBlockNameLabel extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.copyAccessionButton = this.copyAccessionButton.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    copyAccessionButton(){
        if (!this.props.accession) return null;
        if (!this.state.mounted || isServerSide() || !document || !document.createElement || !document.execCommand) return null;

        function copy(){
            var textArea = document.createElement('textarea');
            textArea.style.top = '-100px';
            textArea.style.left = '-100px';
            textArea.style.position = 'absolute';
            textArea.style.width = '5px';
            textArea.style.height = '5px';
            textArea.style.padding = 0;
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';

            // Avoid flash of white box if rendered for any reason.
            textArea.style.background = 'transparent';
            textArea.value = this.props.accession;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                var successful = document.execCommand('copy');
                var msg = successful ? 'successful' : 'unsuccessful';
                console.log('Copying text command was ' + msg);
                this.flashEffect();
                analytics.event('ExperimentsTable', 'Copy', {
                    'eventLabel' : 'Accession',
                    'name' : this.props.accession
                });
            } catch (err) {
                console.error('Oops, unable to copy');
                analytics.event('ExperimentsTable', 'ERROR', {
                    'eventLabel' : 'Unable to copy accession',
                    'name' : this.props.accession
                });
            }
        }

        return (
            <i className="icon icon-fw icon-copy" title="Copy to clipboard" onClick={copy.bind(this)} />
        );
    }

    flashEffect(){
        if (!this.refs || !this.refs.subtitle) return null;
        this.refs.subtitle.style.transform = 'scale3d(1.2, 1.2, 1.2) translate3d(10%, 0, 0)';
        setTimeout(()=>{
            this.refs.subtitle.style.transform = '';
        }, 100);
    }

    render(){

        var { title, subtitle, accession, inline, className } = this.props;

        function titleElement(){
            return React.createElement(
                inline ? 'span' : 'div',
                { className : "label-title" },
                title
            );
        }

        function subtitleElement(){
            if (!accession && !subtitle) return null;
            return React.createElement(
                inline ? 'span' : 'div',
                {
                    className : "ext" + (accession ? ' is-accession' : ''),
                    ref : 'subtitle'
                },
                <span>
                    { accession || subtitle } { this.copyAccessionButton() }
                </span>
            );
        }

        var fullClassName = "label-ext-info";
        if (typeof className === 'string') fullClassName += ' ' + className;
        if (subtitle !== null) fullClassName += ' has-subtitle';

        return (
            <div className={fullClassName} ref="labelContainerElement">
                { titleElement() }
                { subtitleElement.call(this) }
            </div>
        );
    }

}

/**
 * Name element to be put inside of StackedBlocks as the first child.
 *
 * @class StackedBlockList
 * @extends {React.Component}
 */
class StackedBlockName extends React.Component {

    static Label = StackedBlockNameLabel
    
    static propTypes = {
        columnClass : PropTypes.string,
        colWidthStyles : PropTypes.object,
        label : PropTypes.shape({
            title : PropTypes.node,
            subtitle : PropTypes.node,
            subtitleVisible : PropTypes.bool
        }),
        visible : PropTypes.bool
    }

    static defaultProps = {
        visible : true
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getColumnWidthStyle = this.getColumnWidthStyle.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
    }

    getColumnWidthStyle(){
        if (this.props.colWidthStyles && typeof this.props.colWidthStyles[this.props.columnClass] !== 'undefined'){
            return this.props.colWidthStyles[this.props.columnClass];
        }

        if (
            this.props.expTable &&
            this.props.expTable.state &&
            Array.isArray(this.props.expTable.state.columnWidths)
        ){
            console.log('2nd IF STATE');
            var colWidthIndex = _.findIndex(this.props.expTable.columnHeaders(), { 'columnClass' : this.props.columnClass });
            if (colWidthIndex > -1) return { 'width' : this.props.expTable.state.columnWidths[colWidthIndex] };
        }

        return null;
    }

    adjustedChildren(){
        if (React.Children.count(this.props.children) > 1) return this.props.children;
        return React.Children.map(this.props.children, function(c){
            if (c && c.props && typeof c.props.className === 'string' && c.props.className.indexOf('name-title') === -1){
                return React.cloneElement(c, { className : c.props.className + ' name-title' }, c.props.children);
            }
            return c;
        });
    }

    render(){
        if (!this.props.visible) return null;
        var style = null;
        var colWidthStyle = this.getColumnWidthStyle();
        if (colWidthStyle){
            if (this.props.colStyle) style = _.extend(_.clone(colWidthStyle), this.props.colStyle);
            else style = _.clone(colWidthStyle);
        }
        if (this.props.relativePosition){
            if (style) style.position = 'relative';
            else style = { 'position' : 'relative' };
        }
        return (
            <div className={"name col-" + this.props.columnClass} style={style}>
                { this.props.label ?
                    <StackedBlockName.Label {..._.extend({}, this.props.label, {
                        inline : false,
                        className : this.props.label.subtitleVisible === true ? 'subtitle-visible' : null
                    })} />
                    : null }
                { this.adjustedChildren() }
            </div>
        );
    }

}

/**
 * Button to toggle collapse/visible of longer StacedkBlockLists. Used in StackedBlockLists.
 * 
 * @private
 * @memberof StackedBlockList
 * @class StackedBlockListViewMoreButton
 * @extends {React.Component}
 */
class StackedBlockListViewMoreButton extends React.Component {
    
    static propTypes = {
        collapsibleChildren : PropTypes.array,
        collapsed : PropTypes.bool,
        handleCollapseToggle : PropTypes.func
        // + those from parent .List
    }

    constructor(props){
        super(props);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.render = this.render.bind(this);
    }

    shouldComponentUpdate(nextProps){
        if (this.props.collapsed !== nextProps.collapsed) return true;
        if (this.props.currentlyCollapsing !== nextProps.currentlyCollapsing) return true;
        if (this.props.title !== nextProps.title) return true;
        if (this.props.showMoreExtTitle !== nextProps.showMoreExtTitle) return true;
        return false;
    }

    render(){

        if (this.props.collapsibleChildren.length === 0) return null;

        var collapsedMsg = this.props.collapsed &&
        (this.props.currentlyCollapsing ?
            (this.props.currentlyCollapsing === this.props.parentID ? false : true)
            :
            true
        );

        function collapseTitle(){
            var title;
            if (collapsedMsg){
                title = "Show " + this.props.collapsibleChildren.length + " More";
            } else {
                title = "Show Less";
            }
            if (this.props.title) title += ' ' + this.props.title;

            function extTitle(){
                if (!this.props.showMoreExtTitle || !collapsedMsg) return null;
                return <span className="ext text-400"> { this.props.showMoreExtTitle }</span>;
            }

            return <span>{ title }{ extTitle.call(this) }</span>;
        }

        return (
            <div className="view-more-button" onClick={this.props.handleCollapseToggle}>
                <i className={"icon icon-" + (collapsedMsg ? 'plus': 'minus')}></i>
                &nbsp; { collapseTitle.call(this) }
            </div>
        );
    }
}

/**
 * List which can be put inside a StackedBlock, after a StackedBlockName, and which holds other StackedBlocks.
 * 
 * @memberof StackedBlock
 * @class StackedBlockList
 * @extends {React.Component}
 */
class StackedBlockList extends React.Component {

    static ViewMoreButton = StackedBlockListViewMoreButton

    static propTypes = {
        title : PropTypes.string,
        showMoreExtTitle : PropTypes.string,
        collapseLimit : PropTypes.number,
        collapseShow : PropTypes.number,
        expTable : PropTypes.any
    }

    static defaultProps = {
        collapseLimit : 4,
        collapseShow : 3
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        //this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.handleCollapseToggle = this.handleCollapseToggle.bind(this);
        if (Array.isArray(this.props.children) && this.props.children.length > this.props.collapseLimit){
            this.state = { 'collapsed' : true };
        }
    }
    /*
    shouldComponentUpdate(nextProps, nextState){
        if (this.props.currentlyCollapsing !== nextProps.currentlyCollapsing) return true;
        if (this.props.colWidthStyles !== nextProps.colWidthStyles) return true;
        if (this.state === null) return false;
        if (this.state.collapsed !== nextState.collapsed) return true;
        return false;
    }
    */

    adjustedChildren(){
        return React.Children.map(this.props.children, (c)=>{
            //if (c.type.displayName !== 'StackedBlock') return c; // Only add props to StackedBlocks
            var addedProps = {};
            if (this.props.parentIDList && !c.props.parentIDList){
                addedProps.parentIDList = this.props.parentIDList;
            }
            if (this.props.currentlyCollapsing && !c.props.currentlyCollapsing){
                addedProps.currentlyCollapsing = this.props.currentlyCollapsing;
            }
            if (this.props.expTable && !c.props.expTable){
                addedProps.expTable = this.props.expTable;
            }
            if (this.props.colWidthStyles && !c.props.colWidthStyles){
                addedProps.colWidthStyles = this.props.colWidthStyles;
            }
            if (this.props.experimentSetType && !c.props.experimentSetType){
                addedProps.experimentSetType = this.props.experimentSetType;
            }
            if (Object.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            }
            return c;
        });
    }

    handleCollapseToggle(){
        if (this.props.expTable && this.props.expTable.state && !this.props.expTable.state.collapsing){
            this.props.expTable.setState({
                'collapsing' : this.props.rootList ? 'root' :
                    this.props.parentID || this.props.className || true
            }, ()=>{
                this.setState({ 'collapsed' : !this.state.collapsed });
            });
        } else this.setState({ 'collapsed' : !this.state.collapsed });
    }

    render(){
        var children = this.adjustedChildren();

        var className = "s-block-list " + this.props.className;
        var timeout = 350; // Default
        if (!Array.isArray(children) || children.length <= this.props.collapseLimit) {
            // Don't have enough items for collapsible element, return plain list.
            return <div className={className}>{ children }</div>;
        }

        var collapsibleChildren = children.slice(this.props.collapseShow);
        if (collapsibleChildren.length > 18) {
            className += ' transition-slow';
            timeout = 1000;
        } else if (collapsibleChildren.length > 9) {
            className += ' transition-med';
            timeout = 500;
        }

        var transitionFinish = function(){
            if (this.props.expTable && this.props.expTable.state){
                this.props.expTable.setState({ 'collapsing' : false });
            }
        }.bind(this);

        return (
            <div className={className} data-count-collapsed={collapsibleChildren.length}>
                { children.slice(0, this.props.collapseShow) }
                <Collapse in={!this.state.collapsed} timeout={timeout} onExited={transitionFinish} onEntered={transitionFinish}>
                    <div className="collapsible-s-block-ext">{ collapsibleChildren }</div>
                </Collapse>
                <ExperimentsTable.StackedBlock.List.ViewMoreButton
                    collapsibleChildren={collapsibleChildren}
                    collapsed={this.state.collapsed}
                    handleCollapseToggle={this.handleCollapseToggle}
                    {...this.props}
                />
            </div>
        );
    }

}

class StackedBlock extends React.Component {

    static Name = StackedBlockName

    static List = StackedBlockList

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.childIDList = new Set();
    }

    adjustedChildren(){
        return React.Children.map(this.props.children, (c) => {
            if (c === null) return null;
            var addedProps = {};

            if (!c.props.columnClass && this.props.columnClass) addedProps.columnClass = this.props.columnClass;
            if (!c.props.colWidthStyles && this.props.colWidthStyles) addedProps.colWidthStyles = this.props.colWidthStyles;
            if (!c.props.label && this.props.label) addedProps.label = this.props.label;
            if (!c.props.expTable && this.props.expTable) addedProps.expTable = this.props.expTable;
            if (!c.props.experimentSetType && this.props.experimentSetType) addedProps.experimentSetType = this.props.experimentSetType;
            if (!c.props.currentlyCollapsing && this.props.currentlyCollapsing) addedProps.currentlyCollapsing = this.props.currentlyCollapsing;

            if (c.props.children){
                // Grab & save child s-block ids (one level deep)
                React.Children.forEach(c.props.children, (cc)=>{
                    if (cc.props && typeof cc.props.id === 'string'){
                        this.childIDList.add(cc.props.id);
                    }
                });
            }
            if (this.props.id){
                // Pass down (and include self in) parent s-block ids to child elements.
                if (this.props.parentIDList){
                    addedProps.parentIDList = new Set(this.props.parentIDList);
                } else {
                    addedProps.parentIDList = new Set();
                }
                addedProps.parentIDList.add(this.props.id);
                addedProps.parentID = this.props.id;
            }
            if (Object.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            } else return c;
        });
    }

    render(){
        var className = this.props.columnClass ? this.props.columnClass + ' ' : '';
        className += "s-block";
        if (this.props.hideNameOnHover) className += ' hide-name-on-block-hover';
        if (typeof this.props.stripe !== 'undefined' && this.props.stripe !== null){
            if (this.props.stripe === true || this.props.stripe === 'even') className += ' even';
            else className += ' odd';
        }
        if (this.props.currentlyCollapsing){
            className += ' s-block-list-collapsing collapsing-' + this.props.currentlyCollapsing;
            if (
                this.props.currentlyCollapsing === this.props.id ||
                this.props.currentlyCollapsing === 'root' ||
                ((this.props.parentIDList instanceof Set) && this.props.parentIDList.has(this.props.currentlyCollapsing)) ||
                ((this.childIDList instanceof Set) && this.childIDList.has(this.props.currentlyCollapsing))
            ) className += ' collapsing-child';
        }
        return (
            <div className={className}>
                { this.adjustedChildren() }
            </div>
        );
    }

}


/**
 * To be used within Experiments Set View/Page, or
 * within a collapsible row on the browse page.
 *
 * Shows experiments only, not experiment sets.
 *
 * Allows either table component itself to control state of "selectedFiles"
 * or for a parentController (passed in as a prop) to take over management
 * of "selectedFiles" Set and "checked", for integration with other pages/UI.
 */


export default class ExperimentsTable extends React.Component {

    static StackedBlock = StackedBlock

    static builtInHeaders(expSetType = 'replicate'){
        switch (expSetType){
            case 'replicate' :
                return [
                    { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample'  },
                    { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment' },
                    { columnClass: 'file-pair',                                 title: 'File Pair',     visibleTitle : <i className="icon icon-download"></i> },
                    { columnClass: 'file',                                      title: 'File'       },
                ];
            default:
                return [
                    { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample'  },
                    { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment' },
                    { columnClass: 'file',                                      title: 'File'       },
                ];
        }

    }

    /* Returns undefined if not set */
    static initialColumnWidths(columnClassName = null, expSetType = 'replicate'){
        if (expSetType === 'replicate'){
            // ToDo put into schemas?
            var widthsByColumnClass = {
                'biosample' : 115,
                'experiment' : 145,
                'file-pair' : 40,
                'file' : 125,
                'file-detail' : 100,
                'default' : 120
            };
            // No columnClassName specified.
            if (columnClassName === null) return widthsByColumnClass;
            // columnClassName specified and set.
            else if (columnClassName !== null && typeof widthsByColumnClass[columnClassName] === 'number'){
                return widthsByColumnClass[columnClassName];
            }
            // columnClassName specified but width not configured.
            else return widthsByColumnClass.default;
        }
    }

    /**
     * Calculate amount of experiments out of provided experiments which match currently-set filters.
     * Use only for front-end faceting, e.g. on Exp-Set View page where all experiments are provided,
     * NOT (eventually) for /browse/ page where faceting results will be controlled by back-end.
     */
    static getPassedExperiments(
        allExperiments,
        filters = null, // aka expSetFilters (available in redux store)
        getIgnoredFiltersMethod = 'single-term',
        facets = null,  // Required if want to get ignored filters by missing facet(s).
        useSet = false  // Return as array instead of set.
    ){
        if (!Array.isArray(allExperiments)){
            // no experiments
            if (useSet) return new Set();
            return [];
        }
        // TODO: If filters === null then filters = store.getState().expSetFilters ?
        if (Array.isArray(allExperiments[0].experiments_in_set)){
            // We got experiment sets, not experiments. Lets fix that (convert to arr of experiments).
            allExperiments = _.flatten(_.map(allExperiments, function(es){ return es.experiments_in_set; }), true);
        }
        if (typeof filters !== 'object' || !filters || Object.keys(filters).length === 0){
            if (useSet) return new Set(allExperiments);
            else return allExperiments;
        }
        var ignoredFilters = null;
        if (getIgnoredFiltersMethod === 'missing-facets') {
            if (Array.isArray(facets) && facets.length > 0) {
                //if (typeof facets[0].restrictions === 'undefined'){
                //    // No restrictions added yet. TODO: Grab & include restrictions object.
                //    facets = FacetList.adjustedFacets(facets);
                //}
                ignoredFilters = Filters.findIgnoredFiltersByMissingFacets(facets, filters);
            }
        } else if (getIgnoredFiltersMethod === 'single-term') {
            // Ignore filters if none in current experiment_set match it so that if coming from
            // another page w/ filters enabled (i.e. browse) and deselect own 'static'/single term, it isn't empty.
            ignoredFilters = Filters.findIgnoredFiltersByStaticTerms(allExperiments, filters);
        }
        if (useSet) return Filters.siftExperimentsClientSide(allExperiments, filters, ignoredFilters); // Set
        else return [...Filters.siftExperimentsClientSide(allExperiments, filters, ignoredFilters)]; // Convert to array
    }
    /*
    static totalExperimentsCount(experimentArray = null){
        if (!experimentArray) return null;
        var experimentsCount = 0;
        var fileSet = new Set();
        var j;
        for (var i = 0; i < experimentArray.length; i++){
            if (experimentArray[i].files && experimentArray[i].files.length > 0){
                experimentsCount++; // Exclude empty experiments
                for (j = 0; j < experimentArray[i].files.length; j++){
                    if (!fileSet.has(experimentArray[i].files[j]['@id'])){
                        fileSet.add(experimentArray[i].files[j]['@id']);
                    }
                }
            } else if (experimentArray[i].filesets && experimentArray[i].filesets.length > 0){
                experimentsCount++;
                for (j = 0; j < experimentArray[i].filesets.length; j++){
                    for (var k = 0; k < experimentArray[i].filesets[j].files_in_set.length; k++){
                        if (!fileSet.has(experimentArray[i].filesets[j].files_in_set[k]['@id'])){
                            fileSet.add(experimentArray[i].filesets[j].files_in_set[k]['@id']);
                        }
                    }
                }
            } else {
                console.error("Couldn't find files for experiment - excluding from total count", experimentArray[i]);
            }
        }
        return {
            'experiments' : experimentsCount,
            'files' : fileSet.size
        };
    }
    */

    static propTypes = {
        columnHeaders               : PropTypes.array,
        experimentArray             : PropTypes.array,
        passExperiments             : PropTypes.instanceOf(Set),
        expSetFilters               : PropTypes.object,
        'selectedFiles'               : PropTypes.object,
        'experimentSetAccession'    : PropTypes.string.isRequired,
        'replicateExpsArray'        : PropTypes.arrayOf(PropTypes.shape({
            'bio_rep_no'                : PropTypes.number.isRequired,
            'tec_rep_no'                : PropTypes.number.isRequired,
            'replicate_exp'             : PropTypes.shape({
                'accession'                 : PropTypes.string,
                'uuid'                      : PropTypes.string,
                'link_id'                   : PropTypes.string
            }).isRequired
        })).isRequired,
        keepCounts              : PropTypes.bool // Whether to run updateCachedCounts and store output in this.counts (get from instance if ref, etc.)
    }

    static defaultProps = {
        keepCounts : false,
        fadeIn : true,
        width: null,
        columnHeaders : [
            { columnClass: 'biosample',     className: 'text-left',     title : 'Biosample'     },
            { columnClass: 'experiment',    className: 'text-left',     title : 'Experiment'    },
            { columnClass: 'file-detail',                               title : 'File Info'     }
        ]
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getColumnWidths = this.getColumnWidths.bind(this);
        //this.updateColumnWidths = this.updateColumnWidths.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.staticColumnHeaders = this.staticColumnHeaders.bind(this);
        this.customColumnHeaders = this.customColumnHeaders.bind(this);
        this.columnHeaders = this.columnHeaders.bind(this);
        this.colWidthStyles = this.colWidthStyles.bind(this);
        this.handleFileCheckboxChange = this.handleFileCheckboxChange.bind(this);
        this.renderExperimentBlock = this.renderExperimentBlock.bind(this);
        this.renderBiosampleStackedBlockOfExperiments = this.renderBiosampleStackedBlockOfExperiments.bind(this);
        this.renderRootStackedBlockListOfBiosamplesWithExperiments = this.renderRootStackedBlockListOfBiosamplesWithExperiments.bind(this);
        this.renderers.replicate = this.renderers.replicate.bind(this);
        this.renderers.default = this.renderers.default.bind(this);


        this.cache = {
            oddExpRow : true
        };
        var initialState = {
            columnWidths : null, // set on componentDidMount via updateColumnWidths
            mounted : false
        };
        this.state = initialState;
    }

    getColumnWidths(columnHeaders = null){
        if (
            typeof this.props.width !== 'number' && (
                !this.refs.header || (this.refs.header && this.refs.header.clientWidth === 0)
            )
        ){
            return ExperimentsTable.initialColumnWidths(null);
        }

        var origColumnWidths;
        if (!this.cache.origColumnWidths){
            origColumnWidths = _.map(columnHeaders || this.columnHeaders(), function(c){
                return ExperimentsTable.initialColumnWidths(c.columnClass);
            });
            this.cache.origColumnWidths = origColumnWidths;
        } else {
            origColumnWidths = this.cache.origColumnWidths;
        }

        var availableWidth = this.props.width || this.refs.header.offsetWidth || 960; // 960 = fallback for tests
        var totalOrigColsWidth = _.reduce(origColumnWidths, function(m,v){ return m + v; }, 0);

        if (totalOrigColsWidth > availableWidth){
            return null;
        }

        var scale = (availableWidth / totalOrigColsWidth) || 1;
        var newColWidths = origColumnWidths.map(function(c){
            return Math.floor(c * scale);
        });

        // Adjust first column by few px to fit perfectly.
        var totalNewColsWidth = _.reduce(newColWidths, function(m,v){ return m + v; }, 0);
        var remainder = availableWidth - totalNewColsWidth;
        newColWidths[0] += Math.floor(remainder - 0.5);

        return newColWidths;
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    componentWillUnmount(){
        delete this.lastColumnHeaders;
        delete this.lastColumnWidths;
        delete this.cache.origColumnWidths;
    }

    /* Built-in headers for props.experimentSetType, extended by any matching title from props.columnHeaders */
    staticColumnHeaders(){
        if (this.cache.staticColumnHeaders) return this.cache.staticColumnHeaders;
        this.cache.staticColumnHeaders = ExperimentsTable.builtInHeaders(this.props.experimentSetType).map((staticCol) => {
            return _.extend(
                _.clone(staticCol),
                _.findWhere(this.props.columnHeaders, { title : staticCol.title }) || {}
            );
        });
        return this.cache.staticColumnHeaders;
    }

    /* Any non built-in (for experimentSetType) headers from props.columnHeaders */
    customColumnHeaders(){
        if (this.cache.customColumnHeaders) return this.cache.customColumnHeaders;
        this.cache.customColumnHeaders = this.props.columnHeaders.filter((col) => {
            return  !_.contains(_.pluck(ExperimentsTable.builtInHeaders(this.props.experimentSetType), 'title'), col.title);
        });
        return this.cache.customColumnHeaders;
    }

    /* Combined top row of headers */
    columnHeaders(){
        return this.staticColumnHeaders().concat(this.customColumnHeaders());
    }

    colWidthStyles(columnWidths = this.state.columnWidths, columnHeaders){
        if (!columnHeaders) columnHeaders = this.columnHeaders();
        var colWidthStyles = {
            'experiment' : null,
            'biosample' : null,
            'file-pair' : null,
            'file' : null,
            'file-detail' : null
        };

        if (Array.isArray(columnWidths)){
            _.keys(colWidthStyles).forEach((cn) => {
                colWidthStyles[cn] = {
                    width : columnWidths[_.findIndex(columnHeaders, { 'columnClass' : cn })]
                };
            });
        }

        return colWidthStyles;
    }

    /**
     * @param {string|string[]} uuid - String or list of strings (File Item UUID)
     * @param {Object|Object[]} fileObj - File Item JSON
     */
    handleFileCheckboxChange(accessionTripleString, fileObj){
        if (!this.props.selectedFiles || !this.props.selectFile || !this.props.unselectFile) return null;

        var willSelect;
        var isMultiples;

        if (Array.isArray(accessionTripleString)){
            isMultiples = true;
            willSelect = (typeof this.props.selectedFiles[accessionTripleString[0]] === 'undefined');
        } else {
            isMultiples = false;
            willSelect = (typeof this.props.selectedFiles[accessionTripleString] === 'undefined');
        }

        if (willSelect){
            if (isMultiples){
                this.props.selectFile(_.zip(accessionTripleString, fileObj));
            } else {
                this.props.selectFile(accessionTripleString, fileObj);
            }
        } else {
            this.props.unselectFile(accessionTripleString);
        }
    }

    renderExperimentBlock(exp,i){
        this.cache.oddExpRow = !this.cache.oddExpRow;
        var columnHeaders = this.columnHeaders();

        var contentsClassName = 'files';
        var contents = [];
        if (Array.isArray(exp.file_pairs)){
            contentsClassName = 'file-pairs';
            contents = contents.concat(exp.file_pairs.map((filePair,j) =>
                <FilePairBlock
                    key={j}
                    selectedFiles={this.props.selectedFiles}
                    files={filePair}
                    columnHeaders={columnHeaders}
                    handleFileCheckboxChange={this.handleFileCheckboxChange}
                    experiment={exp}
                    experimentSetAccession={this.props.experimentSetAccession}
                    label={ exp.file_pairs.length > 1 ?
                        { title : "Pair " + (j + 1) } : { title : "Pair" }
                    }
                />
            ));
        }
        // Add in remaining unpaired files, if any.
        if (Array.isArray(exp.files) && exp.files.length > 0){
            contents.push(
                <StackedBlock
                    key={object.atIdFromObject(exp)}
                    hideNameOnHover={false}
                    columnClass="file-pair"
                >
                    { _.pluck(columnHeaders, 'title').indexOf('File Pair') > -1 ?
                        <StackedBlockName/>
                    : null }
                    <StackedBlockList title="Files" className="files">
                        { exp.files.map((file) =>
                            <FileEntryBlock
                                key={object.atIdFromObject(file)}
                                file={file}
                                columnHeaders={columnHeaders}
                                handleFileCheckboxChange={this.handleFileCheckboxChange}
                                selectedFiles={this.props.selectedFiles}
                                hideNameOnHover={false}
                                experiment={exp}
                                experimentSetAccession={this.props.experimentSetAccession}
                                isSingleItem={exp.files.length + contents.length < 2 ? true : false}
                            />
                        )}
                    </StackedBlockList>
                </StackedBlock>
            );
        }
        if (contents.length === 0){
            /* No Files Exist */
            contents.push(
                <StackedBlock
                    key={object.atIdFromObject(exp)}
                    hideNameOnHover={false}
                    columnClass="file-pair"
                >
                    { _.pluck(columnHeaders, 'title').indexOf('File Pair') > -1 ?
                        <StackedBlockName/>
                    : null }
                    <StackedBlockList title="Files" className="files">
                        <FileEntryBlock
                            file={null}
                            columnHeaders={columnHeaders}
                        />
                    </StackedBlockList>
                </StackedBlock>
            );
        }

        var experimentVisibleName = (
            exp.tec_rep_no ? 'Tech Replicate ' + exp.tec_rep_no :
                exp.experiment_type ? exp.experiment_type : exp.accession
        );

        return (
            <StackedBlock
                key={ object.atIdFromObject(exp) || exp.tec_rep_no || i }
                hideNameOnHover={false}
                columnClass="experiment"
                label={{
                    accession : exp.accession,
                    title : 'Experiment',
                    subtitle : experimentVisibleName,
                    subtitleVisible: true
                }}
                stripe={this.cache.oddExpRow}
                id={(exp.bio_rep_no && exp.tec_rep_no) ? 'exp-' + exp.bio_rep_no + '-' + exp.tec_rep_no : exp.accession || object.atIdFromObject(exp)}
            >
                <StackedBlockName relativePosition={expFxn.fileCount(exp) > 6}>
                    <a href={ object.atIdFromObject(exp) || '#' } className="name-title">{ experimentVisibleName }</a>
                </StackedBlockName>
                <StackedBlockList
                    className={contentsClassName}
                    title={contentsClassName === 'file-pairs' ? 'File Pairs' : 'Files'}
                >
                    { contents }
                </StackedBlockList>
            </StackedBlock>
        );
    }

    renderBiosampleStackedBlockOfExperiments(expsWithBiosample,i){
        this.cache.oddExpRow = false; // Used & toggled by experiment stacked blocks for striping.

        var visibleBiosampleTitle = (
            expsWithBiosample[0].biosample.bio_rep_no ?
                'Bio Replicate ' + expsWithBiosample[0].biosample.bio_rep_no
                :
                expsWithBiosample[0].biosample.biosource_summary
        );

        return (
            <StackedBlock
                columnClass="biosample"
                hideNameOnHover={false}
                key={object.atIdFromObject(expsWithBiosample[0].biosample)}
                id={'bio-' + (expsWithBiosample[0].biosample.bio_rep_no || i + 1)}
                label={{
                    title : 'Biosample',
                    subtitle : visibleBiosampleTitle,
                    subtitleVisible : true,
                    accession : expsWithBiosample[0].biosample.accession
                }}
            >
                <StackedBlockName
                    relativePosition={
                        expsWithBiosample.length > 3 || expFxn.fileCountFromExperiments(expsWithBiosample) > 6
                    }
                >
                    <a href={ object.atIdFromObject(expsWithBiosample[0].biosample) || '#' } className="name-title">
                        { visibleBiosampleTitle }
                    </a>
                </StackedBlockName>
                <StackedBlockList
                    className="experiments"
                    title="Experiments"
                    children={expsWithBiosample.map(this.renderExperimentBlock)}
                    showMoreExtTitle={
                        expsWithBiosample.length > 5 ?
                            'with ' + (
                                _.all(expsWithBiosample.slice(3), function(exp){
                                    return exp.file_pairs !== 'undefined';
                                }) ? /* Do we have filepairs for all exps? */
                                    _.flatten(_.pluck(expsWithBiosample.slice(3), 'file_pairs'), true).length +
                                    ' File Pairs'
                                    :
                                    expFxn.fileCountFromExperiments(expsWithBiosample.slice(3)) + 
                                    ' Files'
                            )
                            :
                            null
                    }
                />

            </StackedBlock>
        );
    }

    /**
     * Here we render nested divs for a 'table' of experiments with shared elements spanning multiple rows,
     * e.g. an experiment block's height is the combined height of its containing file rows, biosample height
     * is combined height of its containing experiment rows (experiments that share that biosample).
     *  ___________________________________________________
     * |                         File   File Detail Columns|
     * |             Experiment ___________________________|
     * |                         File   File Detail Columns|
     * | Biosample  _______________________________________|
     * |                         File   File Detail Columns|
     * |             Experiment ___________________________|
     * |                         File   File Detail Columns|
     * |___________________________________________________|
     *
     * Much of styling/layouting is defined in CSS.
     */
    renderRootStackedBlockListOfBiosamplesWithExperiments(experimentsGroupedByBiosample){
        return (
            <ExperimentsTable.StackedBlock.List
                className="biosamples"
                title="Biosamples"
                children={experimentsGroupedByBiosample.map(this.renderBiosampleStackedBlockOfExperiments)}
                rootList={true}
                expTable={this}
                currentlyCollapsing={this.state.collapsing}
                colWidthStyles={this.colWidthStyles(this.lastColumnWidths || this.getColumnWidths())}
                showMoreExtTitle={
                    experimentsGroupedByBiosample.length > 5 ?
                        'with ' + _.flatten(experimentsGroupedByBiosample.slice(3), true).length + ' Experiments'
                        :
                        null
                }
            />
        );
    }

    renderers = {

        replicate : function(){

            var experimentsGroupedByBiosample = _.compose(
                this.renderRootStackedBlockListOfBiosamplesWithExperiments,
                expFxn.groupExperimentsByBiosampleRepNo,
                expFxn.groupFilesByPairsForEachExperiment,
                expFxn.combineWithReplicateNumbers
            );

            return (
                <div className="body clearfix">
                    { experimentsGroupedByBiosample(this.props.replicateExpsArray, this.props.experimentArray) }
                </div>
            );
        },

        default : function(){
            var experimentsGroupedByBiosample = _.compose(
                this.renderRootStackedBlockListOfBiosamplesWithExperiments,
                expFxn.groupExperimentsByBiosample,
                expFxn.flattenFileSetsToFilesIfNoFilesForEachExperiment
            );

            return (
                <div className="body clearfix">
                    { experimentsGroupedByBiosample(this.props.experimentArray) }
                </div>
            );
        }
    }

    render(){

        // Cache for each render.
        this.lastColumnHeaders = this.columnHeaders();
        this.lastColumnWidths = this.getColumnWidths(this.lastColumnHeaders);

        var renderHeaderItem = function(h, i, arr){
            if (h.visible === false) return null;
            var visibleTitle = typeof h.visibleTitle !== 'undefined' ? h.visibleTitle : h.title;
            var style = null;
            if (Array.isArray(this.lastColumnWidths) && this.lastColumnWidths.length === arr.length){
                style = { 'width' : this.lastColumnWidths[i] };
            }
            return (
                <div className={"heading-block col-" + h.columnClass + (h.className ? ' ' + h.className : '')} key={'header-' + i} style={style} data-column-class={h.columnClass}>
                    { visibleTitle }
                </div>
            );
        }.bind(this);

        return (
            <div className={"expset-experiments" + (this.state.mounted ? ' mounted' : '') + (this.props.fadeIn ? ' fade-in' : '')}>
                {
                    !Array.isArray(this.props.experimentArray) ?
                    <h6 className="text-center text-400"><em>No experiments</em></h6>
                    :
                    <div className="headers expset-headers" ref="header">
                        { this.lastColumnHeaders.map(renderHeaderItem) }
                    </div>
                }

                {   !Array.isArray(this.props.experimentArray) ? null :
                    this.props.experimentSetType && typeof this.renderers[this.props.experimentSetType] === 'function' ?
                        this.renderers[this.props.experimentSetType]() : this.renderers.default()
                }
            </div>
        );
    }

}


class FilePairBlock extends React.Component {

    static accessionTriplesFromProps(props){
        var accessionTriples;
        try {
            accessionTriples = expFxn.filesToAccessionTriples(props.files, true);
        } catch (e){
            accessionTriples = _.map(props.files, (fileObj)=>{
                return [ props.experimentSetAccession || null, (props.experiment || {}).accession || null, fileObj.accession || null ].join('~');
            });
        }
        return accessionTriples;
    }

    static propTypes = {
        selectedFiles : PropTypes.object,
        handleFileCheckboxChange : PropTypes.func,
        files : PropTypes.array
    }

    constructor(props){
        super(props);
        this.isChecked = this.isChecked.bind(this);
        this.renderFileEntryBlock = this.renderFileEntryBlock.bind(this);
        this.renderCheckBox = this.renderCheckBox.bind(this);
        this.render = this.render.bind(this);
    }

    isChecked(accessionTriples){
        if (!accessionTriples){
            accessionTriples = FilePairBlock.accessionTriplesFromProps(this.props);
        }
        if (!Array.isArray(this.props.files) || !this.props.selectedFiles || !this.props.files[0].accession) return null;
        if (this.props.files.length === 0) return false;
        for (var i = 0; i < this.props.files.length; i++){
            if (typeof this.props.selectedFiles[accessionTriples[i]] === 'undefined') return false;
        }
        return true;
    }

    renderFileEntryBlock(file,i){
        return (
            <FileEntryBlock
                key={object.atIdFromObject(file)}
                file={file}
                columnHeaders={ this.props.columnHeaders }
                handleFileCheckboxChange={this.props.handleFileCheckboxChange}
                className={null}
                isSingleItem={this.props.files.length < 2 ? true : false}
                pairParent={this}
                type="paired-end"
                colWidthStyles={this.props.colWidthStyles}
                experiment={this.props.experiment}
                experimentSetAccession={this.props.experimentSetAccession}
            />
        );
    }

    renderCheckBox(){
        var accessionTriples = FilePairBlock.accessionTriplesFromProps(this.props);
        var checked = this.isChecked();
        if (checked === null) return null;

        return (
            <Checkbox
                validationState='warning'
                checked={checked}
                name="file-checkbox"
                id={'checkbox-for-' + accessionTriples.join('_')}
                className='exp-table-checkbox'
                data-select-files={accessionTriples}
                onChange={this.props.handleFileCheckboxChange.bind(
                    this.props.handleFileCheckboxChange,
                    accessionTriples,
                    this.props.files
                )}
            />
        );
    }

    render(){

        function label(){
            if (typeof this.props.label === 'string'){
                return <StackedBlock.Name.Label title="Pair" subtitle={this.props.label} />;
            } else if (typeof this.props.label === 'object' && this.props.label){
                return <StackedBlock.Name.Label {...this.props.label} />;
            } else return null;
        }

        function nameColumn(){
            if (this.props.colVisible === false) return null;
            return (
                <div className="name col-file-pair" style={this.props.colWidthStyles ? _.clone(this.props.colWidthStyles['file-pair']) : null}>
                    { label.call(this) }
                    <span className="name-title">
                        { this.renderCheckBox() }
                        { this.props.name }
                    </span>
                </div>
            );
        }

        return (
            <div className="s-block file-pair">
                { nameColumn.call(this) }
                <div className="files s-block-list">
                    { Array.isArray(this.props.files) ?
                        this.props.files.map(this.renderFileEntryBlock)
                        :
                        <FileEntryBlock
                            file={null}
                            columnHeaders={ this.props.columnHeaders }
                            colWidthStyles={this.props.colWidthStyles}
                            experiment={this.props.experiment}
                            experimentSetAccession={this.props.experimentSetAccession}
                        />
                    }
                </div>
            </div>
        );
    }


}


class FileEntryBlock extends React.Component {

    static accessionTripleFromProps(props){
        var accessionTriple;
        try {
            accessionTriple = expFxn.fileToAccessionTriple(props.file, true);
        } catch (e){
            accessionTriple =  [ props.experimentSetAccession || null, (props.experiment || {}).accession || null, (props.file || {}).accession || null ].join('~');
        }
        return accessionTriple;
    }

    static propTypes = {
        selectedFiles : PropTypes.object,
        handleFileCheckboxChange : PropTypes.func
    }

    constructor(props){
        super(props);
        this.isChecked = this.isChecked.bind(this);
        this.filledFileRow = this.filledFileRow.bind(this);
        this.renderCheckBox = this.renderCheckBox.bind(this);
        this.renderName = this.renderName.bind(this);
        this.render = this.render.bind(this);
    }

    isChecked(){
        if (!this.props.file || !this.props.file.accession || !this.props.selectedFiles) return null;
        var accessionTriple = FileEntryBlock.accessionTripleFromProps(this.props);
        return this.props.selectedFiles[accessionTriple];
    }

    filledFileRow (file = this.props.file){

        var row = [];
        var cols = _.filter(this.props.columnHeaders, (col)=>{
            if (_.pluck(ExperimentsTable.builtInHeaders(this.props.experimentSetType), 'columnClass').indexOf(col.columnClass) > -1) return false;
            return true;
        });
        var baseClassName = (this.props.className || '') + " col-file-detail item";
        var baseStyle = this.props.colWidthStyles ? this.props.colWidthStyles['file-detail'] : null;
        for (var i = 0; i < cols.length; i++){

            var className = baseClassName + ' col-' + cols[i].columnClass + ' detail-col-' + i;
            var title = cols[i].valueTitle || cols[i].title;

            if (!file || !object.atIdFromObject(file)) {
                row.push(<div key={"file-detail-empty-" + i} className={className} style={baseStyle}></div>);
                continue;
            }

            if (title == 'File Type'){
                row.push(<div key="file-type" className={className} style={baseStyle}>{file.file_format}</div>);
                continue;
            }

            if (title == 'File Info'){
                if (typeof file.paired_end !== 'undefined') {
                    row.push(<div key="file-info" className={className} style={baseStyle}>
                        Paired end {file.paired_end}
                    </div>);
                } else if (file.file_format === 'fastq' || file.file_format === 'fasta') {
                    row.push(<div key="file-info" className={className} style={baseStyle}>Unpaired</div>);
                } else {
                    row.push(<div key="file-info" className={className} style={baseStyle}></div>);
                }
                continue;
            }
        }
        return row;
    }

    renderCheckBox(){
        if (!this.props.file) return null; // No file to select.
        if (this.props.pairParent) return null; // Part of pair -- FilePairBlock has own checkbox.

        var accessionTriple = FileEntryBlock.accessionTripleFromProps(this.props);

        var checked = this.isChecked();
        if (checked === null) return null; // No checked state.
        return (
            <Checkbox
                validationState='warning'
                checked={checked}
                name="file-checkbox"
                id={'checkbox-for-' + accessionTriple}
                className='exp-table-checkbox'
                data-select-files={[accessionTriple]}
                onChange={this.props.handleFileCheckboxChange.bind(
                    this.props.handleFileCheckboxChange,
                    accessionTriple,
                    this.props.file
                )}
            />
        );
    }

    renderName(){

        function titleString(){
            if (!this.props.file) return 'No Files';
            return this.props.file.accession || this.props.file.uuid || object.atIdFromObject(this.props.file);
        }

        function title(){
            if (!this.props.file) return <span className="name-title">{ titleString.call(this) }</span>;
            return (
                <a className="name-title mono-text" href={ object.atIdFromObject(this.props.file) || '#' }>
                    { titleString.call(this) }
                </a>
            );
        }

        function label(){
            if (!this.props.file) return null;

            var commonProperties = {
                title : 'File',
                inline : false,
                className : 'col-file',
                subtitle : null
            };

            if (this.props.label) {
                return <StackedBlock.Name.Label {..._.extend(commonProperties, this.props.label)} />;
            } else if (this.props.type === 'sequence-replicate') {
                return <StackedBlock.Name.Label {..._.extend(commonProperties, this.props.label, {
                    subtitle : this.props.sequenceNum ? 'Seq Replicate ' + this.props.sequenceNum : null
                })} />;
            } else if (this.props.type === 'paired-end') {
                return <StackedBlock.Name.Label {...commonProperties} />;
                //return ExperimentsTable.StackedBlock.Name.renderBlockLabel(_.extend({}, commonProperties, {
                //    //subtitle : this.props.file.paired_end ? 'Paired End ' + this.props.file.paired_end : null,
                //}));
            }

            if (Array.isArray(this.props.columnHeaders)) {
                var headerTitles = _.pluck(this.props.columnHeaders, 'title');
                if (
                    (this.props.file.file_type || this.props.file.file_format) &&
                    _.intersection(headerTitles,['File Type', 'File Format']).length === 0
                ){
                    return <StackedBlock.Name.Label {..._.extend(commonProperties, {
                        subtitle : this.props.file.file_type || this.props.file.file_format,
                    })} />;
                }
                if (
                    this.props.file.instrument &&
                    _.intersection(headerTitles,['Instrument', 'File Instrument']).length === 0
                ){
                    return <StackedBlock.Name.Label {..._.extend(commonProperties, {
                        subtitle : this.props.file.instrument
                    })} />;
                }
            }

            return <StackedBlock.Name.Label {...commonProperties} />;
        }

        return (
            <div
                className={"name col-file" + (this.props.file && this.props.file.accession ? ' mono-text' : '')}
                style={this.props.colWidthStyles ? this.props.colWidthStyles.file : null}
            >
                { label.call(this) }
                { this.renderCheckBox() }
                { title.call(this) }
            </div>
        );
    }

    render(){
        var sBlockClassName = "s-block file";
        if (this.props.hideNameOnHover) sBlockClassName += ' hide-name-on-block-hover';
        if (this.props.isSingleItem) sBlockClassName += ' single-item';
        return (
            <div className={sBlockClassName}>
                { this.renderName() }
                { this.filledFileRow() }
            </div>
        );
    }
}
