var React = require('react');
var globals = require('./globals');
var Panel = require('react-bootstrap').Panel;

var ExperimentSetView = module.exports.ExperimentSetView = React.createClass({

    parsedCreationDate(){
        if (!('date_created' in this.props.context)) return null;
        return 'Created ' + (new Date(this.props.context.date_created)).toLocaleString(undefined, {
            year : "numeric",
            month : "long",
            day : "numeric",
            hour : "numeric",
            minute : "numeric"
        });
    },

    parsedStatus(){
        if (!('status' in this.props.context)) return null;
        var iconClass = null;
        switch (this.props.context.status){

            case 'in review by lab':
            case 'in review by project':
                iconClass = 'ss-stopwatch';
                break;
        }
        console.log(iconClass);
        return <span className={iconClass}> { this.props.context.status }</span>;
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
        var itemClass = globals.itemClass(this.props.context, 'view-detail panel');
        var title = globals.listing_titles.lookup(this.props.context)({context: this.props.context});
        var sortKeys = Object.keys(this.props.context).sort();
        //var tips = tipsFromSchema(this.props.schemas, context);

        

        return (
            <div className="container item-page-container">
                <div className="row clearfix">
                    <h3 className="col-sm-6 item-label-title">Experiment Set</h3>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra text-capitalize" title="Publish Status">
                        { this.parsedStatus() }
                    </h5>
                </div>
                <div className="item-page-heading experiment-heading">
                    <h4><small>Accession</small>&nbsp; { title }</h4>
                </div>
                <div className="row clearfix">
                    <div className="col-sm-6 item-label-extra set-type-indicators">{ this.parsedExperimentSetType() }</div>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra">{ this.parsedCreationDate() }</h5>
                </div>
                <Panel className="data-display panel-body-with-header">
                    <dl className="key-value">
                        {sortKeys.map((ikey, idx) =>
                            <div key={ikey} data-test="term-name">
                                <dt>{ ikey }</dt>
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

var formValue = function (schemas, item) {
    var toReturn = [];
    if(Array.isArray(item)) {
        for (var i=0; i < item.length; i++){
            toReturn.push(formValue(schemas, item[i]));
        }
    }else if (typeof item === 'object') {
        //toReturn.push(<SubIPanel schemas={schemas} content={item}/>);
        //toReturn.push(item);
        //console.log(item);
    }else{
        if (typeof item === 'string' && item.charAt(0) === '/') {
            toReturn.push(<a key={item} href={item}>{item}</a>)
        }else{
            toReturn.push(item);
        }
    }
    return(
        <div>{toReturn}</div>
    );
};