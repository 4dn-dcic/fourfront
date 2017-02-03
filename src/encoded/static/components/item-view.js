'use strict';

var React = require('react');
var globals = require('./globals');
var Panel = require('react-bootstrap').Panel;
var Table = require('./collection').Table;
var { AuditIndicators, AuditDetail, AuditMixin } = require('./audit');
var { console, object } = require('./util');

var ItemView = module.exports = React.createClass({

    statics : {

        // Formats the correct display for each metadata field
        formKey : function(tips, key){
            var tooltip = '';
            if (tips[key]){
                var info = tips[key];
                if(info['description']){
                    tooltip = info['description'];
                }
            }
            return(
                <ItemView.DescriptorField field={key} description={tooltip}/>
            );
        },


        /**
         * Recursively render keys/values included in a provided item.
         * Wraps URLs/paths in link elements. Sub-panels for objects.
         *
         * @param {Object} schemas - Object containing schemas for server's JSONized object output.
         * @param {*|*[]} item - Item(s) to render recursively.
         */
        formValue : function (schemas, item, keyPrefix = '', depth = 0) {
            var toReturn = [];
            if(Array.isArray(item)) {
                for (var i=0; i < item.length; i++){
                    toReturn.push(ItemView.formValue(schemas, item[i], keyPrefix, depth + 1));
                }
            } else if (typeof item === 'object') {
                toReturn.push(
                    <ItemView.SubIPanel
                        schemas={schemas}
                        content={item}
                        key={item['@id'] || item.name || (keyPrefix.length > 0 ? keyPrefix + '-' : '') + depth + '-' + toReturn.length }
                    />
                );
            } else {
                if (typeof item === 'string' && item.charAt(0) === '/') {
                    toReturn.push(<a key={item} href={item}>{item}</a>);
                }else{
                    toReturn.push(item);
                }
            }
            return(
                <div>{toReturn}</div>
            );
        },

        // Display the item field with a tooltip showing the field description from
        // schema, if available
        DescriptorField : React.createClass({
        
            propTypes: {
                field: React.PropTypes.string.isRequired,
                description: React.PropTypes.string.isRequired
            },
            getInitialState: function() {
                return {
                    active: false
                };
            },

            handleHover: function(b) {
                this.setState({active: b});
            },

            render: function() {
                var {field, description} = this.props;
                var active = this.state.active;
                var header;
                if (description === ""){
                    header = <span>{field}</span>;
                }else{
                    header = (
                        <div className="tooltip-trigger"
                            onMouseEnter={this.handleHover.bind(null, true)}
                            onMouseLeave={this.handleHover.bind(null, false)}>
                            <span>{field}</span>
                            <i className="icon icon-info-circle item-icon"/>
                            <div className={'tooltip bottom' + (active ? ' tooltip-open' : '')}>
                                <div className="tooltip-arrow"></div>
                                <div className="tooltip-inner">
                                    <span>{description}</span>
                                </div>
                            </div>
                        </div>
                    );
                }
                return (<dt>{header}</dt>);
            }
        }),

        SubIPanel : React.createClass({
            getInitialState: function() {
                return {isOpen: false};
            },
            handleToggle: function (e) {
            e.preventDefault();
            this.setState({
                isOpen: !this.state.isOpen,
            });
            },
            render: function() {
                var schemas = this.props.schemas;
                var item = this.props.content;
                var title = item.title || item.name || item.accession || item.uuid || item['@id'] || "Open";
                var toggleRender;
                var toggleLink;
                if (!this.state.isOpen) {
                    toggleLink = <a href="" className="item-toggle-link" onClick={this.handleToggle}>{title}</a>
                    toggleRender = <span/>;
                }else{
                    toggleLink = <a href="" className="item-toggle-link" onClick={this.handleToggle}>Close</a>
                    toggleRender = <ItemView.Subview schemas={schemas} content={item} title={title}/>;
                }
                return (
                    <div className="flexrow">
                        <div>
                            {toggleLink}
                        </div>
                        {toggleRender}
                    </div>
                );
            }
        }),

        Subview : React.createClass({
            render: function(){
                var schemas = this.props.schemas;
                var item = this.props.content;
                var title = this.props.title;
                var tips = object.tipsFromSchema(schemas, item);
                var sortKeys = Object.keys(item).sort();
                return(
                    <div className="flexcol-sm-6 subview">
                        <Panel className="sub-panel data-display panel-body-with-header">
                            <div className="flexrow">
                                <div className="flexcol-sm-6">
                                    <div className="flexcol-heading experiment-heading">
                                        <h5>{title}</h5>
                                    </div>
                                    <dl className="key-value sub-descriptions">
                                        {sortKeys.map(function(ikey, idx){
                                            return (
                                                <div className="sub-entry" key={ikey} data-test="term-name">
                                                {ItemView.formKey(tips,ikey)}
                                                <dd>{ItemView.formValue(schemas, item[ikey])}</dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                </div>
                            </div>
                        </Panel>
                    </div>
                );
            }
        })

    },

    render: function() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        //var itemClass = globals.itemClass(context, 'view-detail panel');
        var title = globals.listing_titles.lookup(context)({context: context});
        var sortKeys = Object.keys(context).sort();
        var tips = object.tipsFromSchema(schemas, context);


        return (
            <Panel className="data-display panel-body-with-header">
                <div className="flexcol-heading experiment-heading">
                    <h4>{ title }</h4>
                </div>
                <dl className="key-value">
                    {sortKeys.map((ikey, idx) =>
                        <div key={ikey} data-test="term-name">
                            {ItemView.formKey(tips,ikey)}
                            <dd>{ItemView.formValue(schemas,context[ikey])}</dd>
                        </div>
                    )}
                </dl>
            </Panel>
        );
    }
});


globals.panel_views.register(ItemView, 'Item');