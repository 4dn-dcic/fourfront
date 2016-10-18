var React = require('react');
var globals = require('./globals');
var Panel = require('react-bootstrap').Panel;
var SubIPanel = require('./item').SubIPanel; 
var DescriptorField = require('./item').DescriptorField; 
var tipsFromSchema = require('./item').tipsFromSchema; 

/**
 * Entire ExperimentSet page view.
 */

var ExperimentSetView = module.exports.ExperimentSetView = React.createClass({

    render: function() {
        var itemClass = globals.itemClass(this.props.context, 'view-detail panel');
        console.log(this.props);
        var tips = tipsFromSchema(this.props.schemas, this.props.context);

        return (
            <div className="item-page-container">
                <h1 className="page-title">Experiment Set</h1>
                <ExperimentSetHeader {...this.props} />
                
                <div className="exp-table-container">
                    {/* <ExperimentTable .. /> */}
                </div>

                <br/><br/>

                <Panel className="data-display panel-body-with-header">
                    <dl className="key-value">
                        {Object.keys(this.props.context).sort().map((ikey, idx) =>
                            <div key={ikey} data-test="term-name">

                                <DescriptorField field={ikey} description={tips[ikey] && tips[ikey].description ? tips[ikey].description : ''} />
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
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra">{ this.parsedCreationDate() }</h5>
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
