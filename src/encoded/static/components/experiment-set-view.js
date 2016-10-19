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

    getInitialState : function(){
        return {
            selectedFiles: new Set()
        };
    },

    propTypes : {
        schemas : React.PropTypes.object,
        context : React.PropTypes.object
        // Potential ToDo - custom validation for w/e key/vals the page needs.
    },

    tips : null, // Value assumed immutable so not in state.
    fileDetailContainer : null,
    labDetails : null,

    componentWillMount : function(){
        if (!this.tips) {
            this.tips = tipsFromSchema(this.props.schemas, this.props.context);
        }
        if (!this.fileDetailContainer) {
            this.fileDetailContainer = getFileDetailContainer(this.props.context.experiments_in_set);
        }
        if (!this.labDetails) {
            this.labDetails = this.getLabDetails();
        }
    },

    /**
     * Using similar approach(es) as browse.js to grab lab from experiments_in_set.
     * Grabs lab from sub-experiment(s) rather than embedding in own JSON output
     * to keep size of ExperimentSets down as can't remove experiments_in_set.lab
     * from encoded/types/experiment.py > ExperimentSet as it'd affect Browse page
     * experiment filtering & view.
     */
    getLabDetails : function(){
        if (typeof this.props.context.lab == 'object' && this.props.context.lab.city && this.props.context.country){
            // We have lab embedded, lets use it.
            return this.props.context.lab;
        }

        // Else, grab from experiment(s) and make sure it is a match.
        var experiments = this.props.context.experiments_in_set, labID, labInfo = null;
        if (typeof this.props.context.lab == 'string') { 
            labID = this.props.context.lab; 
        }

        for (var i = 0; i < experiments.length; i++){
            if (!labID){
                // Fallback : set lab from first experiments' lab if no lab ID in expset.
                // + Confirm they all match.
                if (i == 0) {
                    labInfo = experiments[i].lab; 
                    continue;
                } else if (experiments[i].lab['@id'] == labInfo['@id']) {
                    continue; // We're ok.
                } else {
                    throw new Error("Lab IDs in experiments of ExperimentSet " + this.props.context.accession + " do not all match.");
                }
            }

            // If we have lab ID from ExperimentSet, just grab first lab info with matching ID.
            if (labID == experiments[i].lab['@id']) {
                labInfo = experiments[i].lab;
                break;
            }
        }

        return labInfo;

    },

    componentWillUpdate : function(nextProps, nextState){
        //console.log(nextState.selectedFiles); // Working
    },

    render: function() {
        
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container experiment-set-page');

        var descriptionBlock = null;
        if (this.props.context.description){
            descriptionBlock = (
                <div className="col-sm-4 description-container">
                    <strong>Description</strong>
                    <p>{ this.props.context.description }</p>
                </div>
            );
        }

        return (
            <div className={itemClass}>
                <h1 className="page-title">Experiment Set</h1>

                <ExperimentSetHeader {...this.props} />
                
                <div className="row info-area">
                    { descriptionBlock }
                    <div className={"col-sm-8 right" + (descriptionBlock ? '' : 'col-sm-offset-4' ) }>
                        <p>Award & Lab info will go here.</p>
                    </div>
                </div>

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
            <i className="icon sbt-calendar"></i> { (new Date(this.props.context.date_created)).toLocaleString(undefined, {
                year : "numeric",
                month : "long",
                day : "numeric",
                hour : "numeric",
                minute : "numeric"
            })}
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
