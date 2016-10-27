var React = require('react');
var globals = require('./globals');
var Panel = require('react-bootstrap').Panel;
var ExperimentsTable = require('./experiments-table').ExperimentsTable;
var _ = require('underscore');
var { SubIPanel, DescriptorField, tipsFromSchema } = require('./item');
var { FacetList, siftExperiments } = require('./facetlist');
var { ajaxLoad, textContentWidth, gridContainerWidth } = require('./objectutils');

/**
 * Entire ExperimentSet page view.
 */

var ExperimentSetView = module.exports.ExperimentSetView = React.createClass({

    statics : {
        // Migrate somewhere better eventually
        parseDateTime : function(timestamp){
            return (new Date(timestamp)).toLocaleString(undefined, {
                year : "numeric",
                month : "long",
                day : "numeric",
                hour : "numeric",
                minute : "numeric"
            })
        }
    },

    propTypes : {
        schemas : React.PropTypes.object,
        context : React.PropTypes.object,
        expSetFilters : React.PropTypes.object,     // Set via app.js <ContentView...>
        // facets = initially blank, but stored here to be shared between ExperimentsTable & FacetList; MUTABLE
        facets : React.PropTypes.array
    },

    contextTypes: {
        location_href: React.PropTypes.string
    },

    getDefaultProps : function(){
        return {
            facets : [] // MUTABLE ARRAY
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

    componentWillMount : function(){
        if (!this.tips) {
            this.tips = tipsFromSchema(this.props.schemas, this.props.context);
        }

        if (!this.state.details_lab) {
            var labDetails = this.getLinkedPropertyDetailsFromExperiments('lab', true);
            if (labDetails){
                this.setState({
                    details_lab : labDetails
                });
            }
        }
        if (!this.state.details_award) {
            var awardDetails = this.getLinkedPropertyDetailsFromExperiments('award', true);
            if (awardDetails){
                this.setState({
                    details_award : awardDetails
                });
            }
        }
    },

    componentWillReceiveProps: function(nextProps) {
        
        // Make sure state is updated upon filtering
        if(this.props.expSetFilters !== nextProps.expSetFilters){
            this.setState({
                selectedFiles: new Set()
            });
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
        if (propertyID && !propertyInfo && allowAjaxFallback) {
            // throw new Error(propertyName + " " + propertyID + " not found in ExperimentSet " + this.props.context.accession + " experiments.");
            var newStateAddition = {};
            newStateAddition['details_' + propertyName] = null;
            this.setState(newStateAddition);
            
            ajaxLoad(propertyID + '?format=json', function(result){
                newStateAddition = {};
                newStateAddition['details_' + propertyName] = result;
                this.setState(newStateAddition);
                console.log('Obtained details_' + propertyName + ' via AJAX.');
            }.bind(this), 'GET');
            
        }

        return propertyInfo;

    },

    render: function() {

        var title = globals.listing_titles.lookup(this.props.context)({context: this.props.context});
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container experiment-set-page');

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
                        />
                    </div>

                    <div className="col-sm-7 col-md-8 col-lg-9">

                        <ExperimentSetInfoBlock 
                            labInfo={ this.state.details_lab }
                            awardInfo={ this.state.details_award }
                            {...this.props} 
                        />

                        <div className="exp-table-container">
                            <h3>Experiments</h3>
                            <ExperimentsTable 
                                columnHeaders={[ 
                                    null, 
                                    'Experiment Accession', 
                                    'Biosample Accession',
                                    'File Accession', 
                                    'File Type',
                                    'File Info'
                                ]}
                                parentController={this}
                                experimentArray={this.props.context.experiments_in_set}
                                expSetFilters={this.props.expSetFilters /* Req'd to filter results */}
                                facets={this.props.facets /* Req'd to find ignoredFilters */ }
                            />
                        </div>

                    </div>

                </div>

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

            </div>
        );
    }

});

globals.panel_views.register(ExperimentSetView, 'ExperimentSet');


var ExperimentSetHeader = React.createClass({

    parsedCreationDate(){
        if (!('date_created' in this.props.context)) return null;
        return (
            <span>
                <i className="icon sbt-calendar"></i>&nbsp; { ExperimentSetView.parseDateTime(this.props.context.date_created) }
            </span>
        );
    },

    parsedStatus(){
        if (!('status' in this.props.context)) return null;
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
            <div className="expset-indicator expset-status right" data-status={ this.props.context.status.toLowerCase() }>
                { this.props.context.status }
            </div>
        );
    },

    parsedExperimentSetType(){
        if (!('experimentset_type' in this.props.context)) return null;
        return (
            <div className="expset-indicator expset-type right" data-set-type={ this.props.context.experimentset_type }>
                { this.props.context.experimentset_type }
            </div>
        );
    },

    render: function() {
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
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra" title="Date Created">{ this.parsedCreationDate() }</h5>
                </div>

            </div>
        );
    }
});

var ExperimentSetHeaderBar = React.createClass({

    // ToDo : Separate out stylistic values (padding, border, expand button) as props.

    propTypes : {
        description : React.PropTypes.string.isRequired,
        totalPaddingWidth : React.PropTypes.integer,
        totalPaddingHeight : React.PropTypes.integer,
        expandButtonWidth : React.PropTypes.integer
    },

    getDefaultProps : function(){
        return {
            totalPaddingWidth : 32,
            totalPaddingHeight : 22,
            expandButtonWidth : 30
        };
    },

    getInitialState : function(){
        return {
            descriptionExpanded : false,
            descriptionWillFitOneLine : null,
            descriptionWhiteSpace : 'nowrap'
        }
    },

    descriptionHeight : null, // Use for animating height, if needed.

    checkWillDescriptionFitOneLineAndUpdateHeight : function(){
        
        var containerWidth = gridContainerWidth() - this.props.totalPaddingWidth; // Account for inner padding & border.
        var { textWidth, containerHeight } = textContentWidth(this.props.description, 'p', 'text-large', containerWidth - this.props.expandButtonWidth); // Account for expand button.

        this.descriptionHeight = containerHeight + this.props.totalPaddingHeight; // Account for padding, border.

        if ( textWidth < containerWidth ){ 
            return true;
        }
        return false;
    },

    componentWillMount : function(){
        this.setState({
            descriptionWillFitOneLine : this.checkWillDescriptionFitOneLineAndUpdateHeight()
        });
    },

    componentDidMount : function(){
        window.textBox = this;
        var debouncedStateChange = _.debounce(() => {
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
        }, 300, false);

        window.addEventListener('resize', debouncedStateChange);
    },

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
                height : this.state.descriptionExpanded ? this.descriptionHeight : '45px',
                whiteSpace : this.state.descriptionWhiteSpace
            }}>
                { expandButton }
                <p className="text-large">{ this.props.description }</p>
            </div>
        );
    }

});


var ExperimentSetInfoBlock = React.createClass({

    componentWillMount: function(){
        
    },

    componentWillUpdate : function(nextProps, nextState){

    },

    formattedDescriptionBlock: function(){
        if (!this.props.context.description) return null;
        return (
            <div className="col-sm-4 description-container">
                <p className="text-large">{ this.props.context.description }</p>
            </div>
        );
    },

    formattedInfoBlock : function(
        label,
        iconClass,
        title,
        titleHref,
        detailContent,
        extraContainerClassName = '',
        extraDetailClassName = ''
    ){
        return (
            <div className="col-sm-6 col-sm-float-right">
                <div className={"info-panel " + extraContainerClassName}>
                    <h6 className="info-panel-label">{ label }</h6>
                    <div className="row">
                        <div className="col-xs-2 col-lg-1 icon-container">
                            <i className={"icon " + iconClass}></i>
                        </div>
                        <div className="col-xs-10 col-lg-11">
                            <h5>
                                <a href={ titleHref || '#' } title={title}>{ title }</a>
                            </h5>
                            <div className={"more-details " + extraDetailClassName}>
                                { detailContent }
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    },

    formattedAwardInfoBlock : function(){
        if (!this.props.awardInfo) return null;
        return this.formattedInfoBlock(
            'Award',
            'icon-institution',
            this.props.awardInfo.title,
            this.props.awardInfo['@id'],
            this.props.awardInfo.project,
            'award',
            'project'
        );
    },

    formattedLabInfoBlock : function(){
        if (!this.props.labInfo) return null;
        return this.formattedInfoBlock(
            'Lab',
            'icon-users',
            this.props.labInfo.title,
            this.props.labInfo['@id'],
            (
                (this.props.labInfo.city) + 
                (this.props.labInfo.state ? ', ' + this.props.labInfo.state : '') + 
                (this.props.labInfo.postal_code ? ' ' + this.props.labInfo.postal_code : '' ) +
                (this.props.labInfo.country ? ', ' + this.props.labInfo.country : '')
            ),
            'lab',
            'address'
        );
    },

    render : function(){

        return (
            <div className="row info-area">
                {/* this.formattedDescriptionBlock() */}
                <div className={ "col-sm-12" }>
                    <div className="row">
                        
                        { this.formattedLabInfoBlock() }
                        { this.formattedAwardInfoBlock() }

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
