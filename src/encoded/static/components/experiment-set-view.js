var React = require('react');
var globals = require('./globals');
var Panel = require('react-bootstrap').Panel;
var SubIPanel = require('./item').SubIPanel; 
var DescriptorField = require('./item').DescriptorField; 
var tipsFromSchema = require('./item').tipsFromSchema; 
var ExperimentsTable = require('./experiments-table').ExperimentsTable;
var getFileDetailContainer = require('./experiments-table').getFileDetailContainer;

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
        context : React.PropTypes.object
        // Potential ToDo - custom validation for w/e key/vals the page needs.
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
    fileDetailContainer : null,

    componentWillMount : function(){
        if (!this.tips) {
            this.tips = tipsFromSchema(this.props.schemas, this.props.context);
        }
        if (!this.fileDetailContainer) {
            this.fileDetailContainer = getFileDetailContainer(this.props.context.experiments_in_set);
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
        //    throw new Error(propertyName + " " + propertyID + " not found in ExperimentSet " + this.props.context.accession + " experiments.");
            var newStateAddition = {};
            newStateAddition['details_' + propertyName] = null;
            this.setState(newStateAddition);
            
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
                    if (xmlhttp.status == 200) {
                        newStateAddition = {};
                        newStateAddition['details_' + propertyName] = JSON.parse(xmlhttp.responseText);
                        this.setState(newStateAddition);
                        // Low priority ToDo: 
                        // Replace this success block w/ optional callback function parameter and remove reliance
                        // on 'this' var so can export function from component to use on other pages if needed.
                    } else if (xmlhttp.status == 400) {
                        console.error('There was an error 400');
                    } else {
                        console.error('something else other than 200 was returned');
                    }
                }
            }.bind(this);

            xmlhttp.open("GET", propertyID + '?format=json', true);
            xmlhttp.send();
        }

        return propertyInfo;

    },

    render: function() {
        
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container experiment-set-page');

        return (
            <div className={itemClass}>
                <h1 className="page-title">Experiment Set</h1>

                <ExperimentSetHeader {...this.props} />
                
                <ExperimentSetInfoBlock 
                    labInfo={ this.state.details_lab }
                    awardInfo={ this.state.details_award }
                    {...this.props} 
                />

                <div className="exp-table-container">
                    <ExperimentsTable 
                        columnHeaders={[ 
                            null, 
                            'Experiment Accession', 
                            'Biosample Accession',
                            'File Accession', 
                            'File Type',
                            'File Info'
                        ]}
                        fileDetailContainer={this.fileDetailContainer}
                        parentController={this}
                    />
                </div>

                <br/><br/>
                <p>Existing Print-out:</p>

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
                                
                                <dd>{ formValue(this.props.schemas, this.props.context[ikey]) }</dd>
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
                <i className="icon sbt-calendar"></i> { ExperimentSetView.parseDateTime(this.props.context.date_created) }
            </span>
        );
    },

    parsedStatus(){
        if (!('status' in this.props.context)) return null;
        var iconClass = null;
        switch (this.props.context.status){

            case 'in review by lab':
            case 'in review by project':
                iconClass = 'icon ss-stopwatch';
                break;

        }
        return <span><i className={iconClass}></i> { this.props.context.status }</span>;
    },

    parsedExperimentSetType(){
        if (!('experimentset_type' in this.props.context)) return null;
        return (
            <div className="experiment-set-type-indicator" data-set-type={ this.props.context.experimentset_type }>
                { this.props.context.experimentset_type }
            </div>
        );
    },

    render: function() {
        var title = globals.listing_titles.lookup(this.props.context)({context: this.props.context});
        return (
            <div className="exp-set-header-area">

                <div className="row clearfix top-row">
                    <h3 className="col-sm-6 item-label-title">
                        { /* PLACEHOLDER / TEMP-EMPTY */ }
                    </h3>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra text-capitalize" title="Status">
                        { this.parsedStatus() }
                    </h5>
                </div>

                <div className="item-page-heading experiment-heading">
                    <h4><small>Accession</small>&nbsp; { title }</h4>
                </div>

                <div className="row clearfix bottom-row">
                    <div className="col-sm-6 item-label-extra set-type-indicators">{ this.parsedExperimentSetType() }</div>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra" title="Date Created">{ this.parsedCreationDate() }</h5>
                </div>

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

    formattedLabInfoBlock : function(){
        if (!this.props.labInfo) return null;
        var labInfo = this.props.labInfo;
        return (
            <div className="col-sm-6 col-sm-float-right">
                <div className="info-panel lab">

                    <div className="row">
                        <div className="col-xs-2 icon-container">
                            <i className="ss-measuringcup icon"></i>
                        </div>
                        <div className="col-xs-10">
                            <h5>
                                <a href={ labInfo['@id'] || '#' }>{ labInfo.title }</a>
                            </h5>
                            <div className="more-details address">
                                { 
                                    labInfo.city + 
                                    (labInfo.state ? ', ' + labInfo.state : '') + 
                                    (labInfo.postal_code ? ' ' + labInfo.postal_code : '' ) +
                                    (labInfo.country ? ', ' + labInfo.country : '')
                                }
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        );
    },

    formattedAwardInfoBlock : function(){
        if (!this.props.awardInfo) return null;
        var awardInfo = this.props.awardInfo;
        return (
            <div className="col-sm-6 col-sm-float-right">
                <div className="info-panel award">
                
                    <div className="row">
                        <div className="col-xs-2 icon-container">
                            <i className="ss-tag icon"></i>
                        </div>
                        <div className="col-xs-10">
                            <h5>
                                <a href={ awardInfo['@id'] || '#' }>{ awardInfo.title }</a>
                            </h5>
                            <div className="more-details project">
                                { awardInfo.project }
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    },

    render : function(){
        var labInfo = this.formattedLabInfoBlock(),
            awardInfo = this.formattedAwardInfoBlock(),
            descriptionBlock = this.formattedDescriptionBlock();

        return (
            <div className="row info-area">
                { descriptionBlock }
                <div className={"col-sm-8 " + (descriptionBlock ? '' : 'col-sm-offset-4' ) }>
                    <div className="row">
                        
                        { labInfo }
                        { awardInfo }

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

var formValue = function (schemas, item) {
    var toReturn = [];
    if(Array.isArray(item)) {
        for (var i=0; i < item.length; i++){
            toReturn.push(formValue(schemas, item[i]));
        }
    }else if (typeof item === 'object') {
        //console.log(item);
        toReturn.push(<SubIPanel schemas={schemas} content={item}/>);
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
