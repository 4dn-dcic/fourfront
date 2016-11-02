var React = require('react');
var globals = require('./globals');
var Panel = require('react-bootstrap').Panel;
var { ExperimentsTable, getFileDetailContainer } = require('./experiments-table');
var _ = require('underscore');
var { SubIPanel, DescriptorField, tipsFromSchema } = require('./item');
var { FacetList, siftExperiments } = require('./facetlist');
var { ajaxLoad, textContentWidth, gridContainerWidth, isServerSide, parseDateTime, console } = require('./objectutils');

/**
 * Entire ExperimentSet page view.
 */

var ExperimentSetView = module.exports.ExperimentSetView = React.createClass({

    propTypes : {
        schemas : React.PropTypes.object,
        context : React.PropTypes.object,
        expSetFilters : React.PropTypes.object,     // Set via app.js <ContentView...>
        expIncompleteFacets : React.PropTypes.array,
        // facets = initially blank, but stored here to be shared between ExperimentsTable & FacetList; MUTABLE
        facets : React.PropTypes.array
    },

    contextTypes: {
        location_href: React.PropTypes.string
    },

    getDefaultProps : function(){
        return {
            facets : null // MUTABLE ARRAY
        };
    },

    getInitialState : function(){
        return {
            selectedFiles: new Set(),
            checked : true,
            details_award : null,
            details_lab : null
        };
    },

    tips : null, // Value assumed immutable so not in state.

    // Mutable but not in state, e.g. cached output values that may rely on other state.
    fileDetailContainer : null,
    counts : {
        visibleExperiments : null,
        visibleFiles : null,
        totalExperiments : null,
        totalFiles : null
    },

    componentWillMount : function(){
        if (!this.tips) {
            this.tips = tipsFromSchema(this.props.schemas, this.props.context);
        }

        this.updateFileDetailAndCachedCounts(true); // Sets this.counts and this.fileDetailContainer -- in lieu of having ExperimentsTable handle it.
        this.setLinkedDetails(false);
    },

    componentDidMount : function(){
        this.setLinkedDetails(true);
    },

    componentWillReceiveProps: function(nextProps) {
        
        // Make sure state is updated upon filtering
        if(this.props.expSetFilters !== nextProps.expSetFilters){
            this.setState({
                selectedFiles: new Set()
            });
            this.updateFileDetailAndCachedCounts(false);
        } else if (this.props.context.experiments_in_set !== nextProps.context.experiments_in_set){
            this.updateFileDetailAndCachedCounts(true);
        }

        /* For debugging
        if (!isServerSide()){
            window.table = this.refs.experimentsTable;
            window.view = this;
        }
        */

    },

    /** Same functionality as exists in ExperimentsTable */
    updateFileDetailAndCachedCounts : function(updateTotals = false){

        // Set fileDetailContainer
        var passExperiments = null, ignoredFilters = null, experimentArray = this.props.context.experiments_in_set;

        if (!passExperiments && this.props.expSetFilters) {
            if (this.props.facets && this.props.facets.length > 0) {
                ignoredFilters = FacetList.findIgnoredFilters(this.props.facets, this.props.expSetFilters);
            }
            passExperiments = siftExperiments(experimentArray, this.props.expSetFilters, ignoredFilters);
        }
        
        this.fileDetailContainer = getFileDetailContainer(experimentArray, passExperiments);

        var visibleCounts = ExperimentsTable.visibleExperimentsCount(this.fileDetailContainer);
        this.counts.visibleExperiments = visibleCounts.experiments;
        this.counts.visibleFiles = visibleCounts.files;
        if (updateTotals && experimentArray && Array.isArray(experimentArray)){
            var totalCounts = ExperimentsTable.totalExperimentsCount(experimentArray);
            if (totalCounts){
                this.counts.totalExperiments = totalCounts.experiments;
                this.counts.totalFiles = totalCounts.files;
            }
        }
    },

    /**
     * Get data for nested properties - Award and Lab. Save to state or use state object in callback.
     * 
     * @param {boolean} [fallbackToAjax] - Whether to revert to AJAX to fetch info if not in provided ExpSet object.
     * @param {function} [callback] - A function ran after execution, before any AJAX fetching, which takes ones parameter - an object representing resulting state change. Used in place of setState if have more state to apply.
     * @param {Object} [newState] - State object to use. Defaults to empty object.
     */
    setLinkedDetails : function(fallbackToAjax = false, callback = null, newState = {}){
        if (!this.state.details_lab) {
            var labDetails = this.getLinkedPropertyDetailsFromExperiments('lab', fallbackToAjax);
            if (labDetails !== null){
                newState.details_lab = labDetails;
            }
        }
        if (!this.state.details_award) {
            var awardDetails = this.getLinkedPropertyDetailsFromExperiments('award', fallbackToAjax);
            if (awardDetails !== null){
                newState.details_award = awardDetails;
            }
        }
        if (typeof callback == 'function') { 
            callback(newState);
        } else if (Object.keys(newState).length > 0) {
            this.setState(newState);
        } 
    },

    /**
     * Using similar approach(es) as browse.js to grab property details from experiments_in_set.
     * Grabs property detail object from sub-experiment(s) rather than embedding in own JSON output
     * to keep size of ExperimentSets down as can't remove (for example) experiments_in_set.lab
     * from encoded/types/experiment.py > ExperimentSet as it'd affect Browse page
     * experiment filtering & view.
     * 
     * @param {string} propertyName - Name of property/key in schema for which to get details.
     * @param {boolean} allowAjaxFallback - Whether to start an AJAX request to fetch details if they are not in experiment(s).
     * @return {Object} Details for the property/key supplied, or null if not available or not matched. 
     */
    getLinkedPropertyDetailsFromExperiments : function(propertyName, allowAjaxFallback = false){

        if (!this.props.context[propertyName]) return null;

        // If we have property already embedded as object, lets use it.
        if (typeof this.props.context[propertyName] == 'object') return this.props.context[propertyName];


        // Else, grab from experiment(s) and make sure it is a match.
        var experiments = this.props.context.experiments_in_set,
            propertyID = null,
            propertyInfo = null;

        if (typeof this.props.context[propertyName] == 'string') { 
            propertyID = this.props.context[propertyName]; 
        }

        for (var i = 0; i < experiments.length; i++){

            // If we have property ID from ExperimentSet, just grab first property info with matching ID.
            if (propertyID && propertyID == experiments[i][propertyName]['@id']) {
                propertyInfo = experiments[i][propertyName];
                break;
            } else if (!propertyID){
                // Fallback : set property from first experiment if no ID in expset.
                // Then confirm all other experiments match first experiment's ID.
                if (i == 0) {
                    propertyInfo = experiments[i][propertyName]; 
                    continue;
                } else if (experiments[i][propertyName]['@id'] == propertyInfo['@id']) {
                    continue; // Good.
                } else {
                    //throw new Error(propertyName + " IDs in experiments of ExperimentSet " + this.props.context.accession + " do not all match.");
                    return null;
                }
            }

        }

        // Uh-oh! ExperimentSet award exists but doesn't match that of any experiments'.
        // Perhaps fallback to using AJAX. Lol.
        if (typeof window != 'undefined' && propertyID && !propertyInfo && allowAjaxFallback) {
            // throw new Error(propertyName + " " + propertyID + " not found in ExperimentSet " + this.props.context.accession + " experiments.");
            FormattedInfoBlock.ajaxPropertyDetails.call(this, propertyID, propertyName);
        } else {
            return propertyInfo;
        }

    },

    render: function() {

        var title = globals.listing_titles.lookup(this.props.context)({context: this.props.context});
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container experiment-set-page');

        console.log('render ExperimentSet view');

        return (
            <div className={itemClass}>

                <h1 className="page-title">Experiment Set <span className="subtitle prominent">{ title }</span></h1>

                <ExperimentSetHeader {...this.props} />

                <div className="row">
                
                    <div className="col-sm-5 col-md-4 col-lg-3">
                        <FacetList
                            urlPath={this.props.context['@id']}
                            experimentSetListJSON={this.props.context.experiments_in_set}
                            orientation="vertical"
                            expSetFilters={this.props.expSetFilters}
                            facets={ this.props.facets }
                            experimentsOrSets="experiments"
                            expIncompleteFacets={ this.props.expIncompleteFacets }
                        />
                    </div>

                    <div className="col-sm-7 col-md-8 col-lg-9">

                        <ExperimentSetInfoArea 
                            labInfo={ this.state.details_lab }
                            awardInfo={ this.state.details_award }
                            {...this.props} 
                        />

                        <div className="exp-table-container">
                            <h3>
                                <span>Experiments</span>
                                <span className="exp-number small right">
                                    <span className="hidden-xs">Showing </span>
                                    { this.counts.visibleExperiments } of { this.counts.totalExperiments }
                                    <span className="hidden-xs"> Experiments</span>
                                </span>
                            </h3>
                            <ExperimentsTable 
                                ref="experimentsTable"
                                columnHeaders={[ 
                                    null, 
                                    'Experiment Accession', 
                                    'Biosample Accession',
                                    'File Accession', 
                                    'File Type',
                                    'File Info'
                                ]}
                                parentController={this}
                                fileDetailContainer={this.fileDetailContainer}
                                keepCounts={false}
                            />
                        </div>

                    </div>

                </div>

                {/*
                <br/><br/><br /><br /><hr />
                <h6>Existing Print-out (temporary):</h6>
                
                <Panel className="data-display panel-body-with-header">
                    <dl className="key-value">
                        {Object.keys(this.props.context).sort().map((ikey, idx) =>
                            <div key={ikey} data-test="term-name">

                                <DescriptorField 
                                    field={ikey} 
                                    description={
                                        this.tips[ikey] && this.tips[ikey].description ? 
                                            this.tips[ikey].description : ''
                                    } 
                                />
                                
                                <dd>{ formValue(this.props.schemas, this.props.context[ikey], ikey, 0) }</dd>
                            </div>
                        )}
                    </dl>
                </Panel>
                */}

            </div>
        );
    }

});

globals.panel_views.register(ExperimentSetView, 'ExperimentSet');


var ExperimentSetHeader = React.createClass({

    parsedCreationDate(){
        if (!('date_created' in this.props.context)) return <span><i></i></span>;
        return (
            <span>
                <i className="icon sbt-calendar"></i>&nbsp; Added { parseDateTime(this.props.context.date_created) }
            </span>
        );
    },

    parsedStatus(){
        if (!('status' in this.props.context)) return <div></div>;
        /*  Removed icon in lieu of color indicator for status
        var iconClass = null;
        switch (this.props.context.status){

            case 'in review by lab':
            case 'in review by project':
                iconClass = 'icon ss-stopwatch';
                break;

        }
        */

        // Status colors are set via CSS (layout.scss) dependent on data-status attribute
        return (
            <div
                className="expset-indicator expset-status right"
                data-status={ this.props.context.status.toLowerCase() }
                title="Review Status"
            >
                { this.props.context.status }
            </div>
        );
    },

    parsedExperimentSetType(){
        if (!('experimentset_type' in this.props.context)) return <div></div>;
        return (
            <div
                className="expset-indicator expset-type right"
                data-set-type={ this.props.context.experimentset_type }
                title="Experiment Set Type"
            >
                { this.props.context.experimentset_type }
            </div>
        );
    },

    render: function() {
        console.log('render ExperimentSetHeader')
        return (
            <div className="exp-set-header-area">

                <div className="row clearfix top-row">
                    <h3 className="col-sm-6 item-label-title">
                        { /* PLACEHOLDER / TEMP-EMPTY */ }
                    </h3>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra text-capitalize indicators clearfix">
                        { this.parsedExperimentSetType() }
                        { this.parsedStatus() }
                    </h5>
                </div>  

                <ExperimentSetHeaderBar description={ this.props.context.description } />

                <div className="row clearfix bottom-row">
                    <div className="col-sm-6 item-label-extra set-type-indicators">{ /* PLACEHOLDER / TEMP-EMPTY */ }</div>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra" title="Date Added">{ this.parsedCreationDate() }</h5>
                </div>

            </div>
        );
    }
});

var ExperimentSetHeaderBar = React.createClass({

    propTypes : {
        description : React.PropTypes.string.isRequired,
        totalPaddingWidth : React.PropTypes.number,
        totalPaddingHeight : React.PropTypes.number,
        initialHeight : React.PropTypes.number,
        expandButtonWidth : React.PropTypes.number
    },

    getDefaultProps : function(){
        return {
            totalPaddingWidth : 32,
            totalPaddingHeight : 22,
            expandButtonWidth : 30,
            initialHeight : 45
        };
    },

    getInitialState : function(){
        return {
            descriptionExpanded : false,
            descriptionWillFitOneLine : true,
            descriptionWhiteSpace : 'nowrap'
        }
    },

    descriptionHeight : null, // Use for animating height, if needed.

    
    checkWillDescriptionFitOneLineAndUpdateHeight : function(){

        if (isServerSide()) return true;
        
        var containerWidth = gridContainerWidth() - this.props.totalPaddingWidth; // Account for inner padding & border.
        
        var tcw = textContentWidth(this.props.description, 'p', 'text-large', containerWidth - this.props.expandButtonWidth); // Account for expand button.

        if (!tcw) {
            return true;
        }

        this.descriptionHeight = tcw.containerHeight + this.props.totalPaddingHeight; // Account for padding, border.

        if ( tcw.textWidth < containerWidth ){ 
            return true;
        }
        return false;

    },
    

    componentDidMount : function(){
        if (typeof window != 'undefined'){
            window.addEventListener('resize', this.debouncedLayoutResizeStateChange);
            window.requestAnimationFrame(()=>{
                this.setState({
                    descriptionWillFitOneLine : this.checkWillDescriptionFitOneLineAndUpdateHeight()
                });
            });
        }
        
    },

    componentWillUnmount: function(){
        if (typeof window != 'undefined'){
            window.removeEventListener('resize', this.debouncedLayoutResizeStateChange);
        }
    },

    debouncedLayoutResizeStateChange : _.debounce(() => {
        // Debounce to prevent from executing more than once every 300ms.
        setTimeout(()=> {
            var oldHeight = this.descriptionHeight;
            var willDescriptionFitAtNewWindowSize = this.checkWillDescriptionFitOneLineAndUpdateHeight();
            if (willDescriptionFitAtNewWindowSize != this.state.descriptionWillFitOneLine){
                this.setState({
                    descriptionWillFitOneLine : willDescriptionFitAtNewWindowSize
                });
            } else if (this.descriptionHeight != oldHeight) {
                this.forceUpdate();
            }
        }, 0);
    }, 300, false),

    handleDescriptionExpandToggle: function (e) {
        e.preventDefault();
        this.setState({
            descriptionWhiteSpace : 'normal',
  		    descriptionExpanded: !this.state.descriptionExpanded
        }, ()=>{
            if (!this.state.descriptionExpanded) {
                // Delay whiteSpace style since can't transition it w/ CSS3
                setTimeout(()=>{
                    this.setState({
                        descriptionWhiteSpace : 'nowrap'
                    })
                }, 350);
            }
        });
    },

    render : function(){
        console.log('render ExperimentSetHeaderBar');
        var expandButton;
        if (!this.state.descriptionWillFitOneLine){
            expandButton = (
                <button type="button" className="description-expand-button right" onClick={this.handleDescriptionExpandToggle}>
                    <i className={"icon icon-" + (this.state.descriptionExpanded ? 'minus' : 'plus' )} />
                </button>
            );
        }
        return (
            <div className="item-page-heading experiment-heading" style={{
                height : this.state.descriptionExpanded ? this.descriptionHeight : this.props.initialHeight + 'px',
                whiteSpace : this.state.descriptionWhiteSpace
            }}>
                { expandButton }
                <p className="text-large">{ this.props.description }</p>
            </div>
        );
    }

});

var FormattedInfoBlock = module.exports.FormattedInfoBlock = React.createClass({

    statics : {
        /**
         * Set a parent component's state to have 'details_' + propertyName data fetched via AJAX.
         * Must supply 'this' from parent component, via .call/.apply/.bind(this, args...),
         * AKA use like a mixin.
         */
        ajaxPropertyDetails : function(endpoint, propertyName){
            console.log('Obtaining details_' + propertyName + ' via AJAX.');
            ajaxLoad(endpoint + '?format=json', function(result){
                var newStateAddition = {};
                newStateAddition['details_' + propertyName] = result;
                this.setState(newStateAddition);
                console.log('Obtained details_' + propertyName + ' via AJAX.');
            }.bind(this), 'GET');
        },
    },

    propTypes : {
        label : React.PropTypes.string,
        iconClass : React.PropTypes.string,
        title : React.PropTypes.string,
        titleHref : React.PropTypes.string,
        detailContent : React.PropTypes.any,
        extraContainerClassName : React.PropTypes.string,
        extraDetailClassName : React.PropTypes.string,
        loading : React.PropTypes.bool
    },

    getDefaultProps : function(){
        return {
            label : null,
            title : null,
            titleHref : "#",
            detailContent : null,
            extraContainerClassName : null,
            extraDetailClassName : null,
            loading : false
        };
    },

    getInitialState : function(){
        return {
            transitionDelayElapsed : !this.props.loading
        };
    },

    componentDidUpdate : function(prevProps, prevState){
        if (prevProps.loading === true && this.props.loading === false && !this.state.transitionDelayElapsed){
            setTimeout(()=>{
                this.setState({ transitionDelayElapsed : true });
            }, 100);
        }
    },
    
    render : function(){
        var innerContent;
        if (this.props.loading) {
            innerContent = (
                <div className="row">
                    <div className="col-xs-12 text-center" style={{ color : '#d2d2d2', fontSize : '22px', paddingTop : 3 }}>
                        <i className="icon icon-spin icon-circle-o-notch"></i>
                    </div>
                </div>
            );
        } else {
            innerContent = (
                <div className="row loaded">
                    <div className="col-xs-2 col-lg-1 icon-container">
                        <i className={"icon " + this.props.iconClass}></i>
                    </div>
                    <div className="col-xs-10 col-lg-11">
                        <h5>
                            <a href={ this.props.titleHref } title={this.props.title}>{ this.props.title }</a>
                        </h5>
                        <div className={"more-details " + this.props.extraDetailClassName}>
                            { this.props.detailContent }
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className={"formatted-info-panel " + this.props.extraContainerClassName + (this.props.loading ? ' loading' : ' loaded') + (this.state.transitionDelayElapsed ? ' transitioned' : '') }>
                <h6 className="info-panel-label">{ this.props.label }</h6>
                { innerContent }
            </div>
        );
    }

});


var ExperimentSetInfoArea = React.createClass({

    formattedDescriptionBlock: function(){
        if (!this.props.context.description) return null;
        return (
            <div className="col-sm-4 description-container">
                <p className="text-large">{ this.props.context.description }</p>
            </div>
        );
    },

    formattedAwardInfoBlock : function(){
        return (
            <FormattedInfoBlock
                label="Award"
                iconClass="icon-institution"
                title={this.props.awardInfo ? this.props.awardInfo.title : null }
                titleHref={this.props.awardInfo ? this.props.awardInfo['@id'] : null }
                detailContent={this.props.awardInfo ? this.props.awardInfo.project : null}
                extraContainerClassName="award"
                extraDetailClassName="project"
                loading={!this.props.awardInfo}
            />
        );
    },

    formattedLabInfoBlock : function(){
        return (
            <FormattedInfoBlock
                label="Lab"
                iconClass="icon-users"
                title={this.props.labInfo ? this.props.labInfo.title : null }
                titleHref={this.props.labInfo ? this.props.labInfo['@id'] : null }
                detailContent={ this.props.labInfo ? (
                        (this.props.labInfo.city) + 
                        (this.props.labInfo.state ? ', ' + this.props.labInfo.state : '') + 
                        (this.props.labInfo.postal_code ? ' ' + this.props.labInfo.postal_code : '' ) +
                        (this.props.labInfo.country ? ', ' + this.props.labInfo.country : '')
                    ) : null
                }
                extraContainerClassName="lab"
                extraDetailClassName="address"
                loading={!this.props.labInfo}
            />
        );
    },

    render : function(){

        return (
            <div className="row info-area">
                {/* this.formattedDescriptionBlock() */}
                <div className={ "col-sm-12" }>
                    <div className="row">
                        
                        <div className="col-sm-6 col-sm-float-right">
                            { this.formattedLabInfoBlock() }
                        </div>
                        <div className="col-sm-6 col-sm-float-right">
                            { this.formattedAwardInfoBlock() }
                        </div>

                    </div>

                </div>
            </div>
        );

    }

});


/**
 * Recursively render keys/values included in a provided item.
 * Wraps URLs/paths in link elements. Sub-panels for objects.
 * 
 * @param {Object} schemas - Object containing schemas for server's JSONized object output.
 * @param {*|*[]} item - Item(s) to render recursively.
 */

var formValue = function (schemas, item, keyPrefix = '', depth = 0) {
    var toReturn = [];
    if(Array.isArray(item)) {
        for (var i=0; i < item.length; i++){
            toReturn.push(formValue(schemas, item[i], keyPrefix, depth + 1));
        }
    }else if (typeof item === 'object') {
        toReturn.push(
            <SubIPanel
                schemas={schemas}
                content={item}
                key={item['@id'] || item.name || (keyPrefix.length > 0 ? keyPrefix + '-' : '') + depth + '-' + toReturn.length } 
            />
        );
    }else{
        if (typeof item === 'string' && item.charAt(0) === '/') {
            toReturn.push(<a key={item} href={item}>{item}</a>);
        }else{
            toReturn.push(item);
        }
    }
    return(
        <div>{toReturn}</div>
    );
};
