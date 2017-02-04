'use strict';

var React = require('react');
var globals = require('./../globals');
var Collapse = require('react-bootstrap').Collapse;
var Table = require('./../collection').Table;
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
var { AuditIndicators, AuditDetail, AuditMixin } = require('./../audit');
var { console, object, DateUtility } = require('./../util');
var { FlexibleDescriptionBox } = require('./../experiment-common');
var FormattedInfoBlock = require('./../formatted-info-block');



var ItemHeader = {

    TopRow : React.createClass({
        parsedStatus : function(){
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
        viewJSONButton : function(){
            if (!this.props.href) return null;

            var urlParts = url.parse(this.props.href, true);
            urlParts.search = '?' + querystring.stringify(_.extend(urlParts.query, { 'format' : 'json' }));
            return (
                <div className="expset-indicator right view-ajax-button">
                    <a href={url.format(urlParts)} target="_parent">
                        View JSON
                    </a>
                </div>
            );
        },
        wrapChildren : function(){
            if (!this.props.children) return null;
            return React.Children.map(this.props.children, (child,i) =>
                <div
                    className="expset-indicator expset-type right"
                    title={this.props.title || null}
                    key={i}
                >
                    { child }
                </div>
            );
        },
        render : function(){
            return (
                <div className="row clearfix top-row">
                    <h3 className="col-sm-6 item-label-title">
                        { /* PLACEHOLDER / TEMP-EMPTY */ }
                    </h3>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra text-capitalize item-header-indicators clearfix">
                        { this.viewJSONButton() }
                        { this.wrapChildren() }
                        { this.parsedStatus() }
                    </h5>
                </div>
            );
        }
    }),

    MiddleRow : React.createClass({
        render : function(){
            return (
                <FlexibleDescriptionBox
                    description={ this.props.context.description || <em>No description provided.</em> }
                    className="item-page-heading experiment-heading"
                    textClassName="text-large"
                    fitTo="grid"
                    dimensions={{
                        paddingWidth : 32,
                        paddingHeight : 22,
                        buttonWidth : 30,
                        initialHeight : 45
                    }}
                />
            );
        }
    }),

    BottomRow : React.createClass({
        parsedCreationDate: function(){
            if (!('date_created' in this.props.context)) return <span><i></i></span>;
            return (
                <span>
                    <i className="icon sbt-calendar"></i>&nbsp; Added{' '}
                    <DateUtility.LocalizedTime timestamp={this.props.context.date_created} formatType='date-time-md' dateTimeSeparator=" at " />
                </span>
            );
        },
        render : function(){
            return (
                <div className="row clearfix bottom-row">
                    <div className="col-sm-6 item-label-extra set-type-indicators">{ this.props.children }</div>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra" title="Date Added - UTC/GMT">{ this.parsedCreationDate() }</h5>
                </div>
            );
        }
    }),

    Wrapper : React.createClass({
        adjustChildren : function(){
            if (!this.props.context) return this.props.children;
            return React.Children.map(this.props.children, (child)=>{
                if (typeof child.props.context !== 'undefined' && typeof child.props.href === 'string') return child;
                else {
                    return React.cloneElement(child, { context : this.props.context, href : this.props.href }, child.props.children);
                }
            });
        },
        render : function(){
            return (
                <div className={"item-view-header " + (this.props.className || '')}>{ this.adjustChildren() }</div>
            );
        }
    }),

};

var PartialList = React.createClass({

    statics : {
        Row : React.createClass({

            getDefaultProps : function(){
                return {
                    'colSm' : 12,
                    'colMd' : 4,
                    'colLg' : 4,
                    'className' : ''
                };
            },

            render : function(){
                var valSm = 12 - this.props.colSm;
                var valMd = 12 - this.props.colMd;
                var valLg = 12 - this.props.colLg;
                if (valSm < 3) valSm = 12;
                if (valMd < 3) valMd = 12;
                if (valLg < 3) valLg = 12;
                return (
                    <div className={"row list-item " + this.props.className}>
                        <div className={"item-label col-sm-"+ this.props.colSm +" col-md-"+ this.props.colMd +" col-lg-"+ this.props.colLg}>
                            { this.props.label || this.props.title || "Label" }
                        </div>
                        <div className={"item-value col-sm-"+ valSm +" col-md-"+ valMd +" col-lg-"+ valLg}>
                            { this.props.value || this.props.val || this.props.children || "Value" }
                        </div>
                    </div>
                );
            }
        })
    }, 

    getDefaultProps : function(){
        return {
            'className' : null,
            'containerClassName' : null,
            'containerType' : 'div',
            'persistent' : [],
            'collapsible' : [],
            'open' : null
        };
    },

    getInitialState : function(){
        if (this.props.open === null) return { 'open' : false };
        else return null;
    },

    render : function(){

        return (
            <div className={this.props.className}>

                { React.createElement(this.props.containerType, { 'className' : this.props.containerClassName }, this.props.persistent || this.props.children) }

                { this.props.collapsible.length > 0 ?
                <Collapse in={this.props.open === null ? this.state.open : this.props.open}>
                    <div>
                        { this.props.collapsible }
                    </div>
                </Collapse>
                : null }
            </div>
        );  

    }

});



var Detail = React.createClass({

    statics: {
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
            if(Array.isArray(item)) {
                return (
                    <ul>
                        { item.map(function(it, i){ return <li key={i}>{ Detail.formValue(schemas, it, keyPrefix, depth + 1) }</li>; }) }
                    </ul>
                );
            } else if (typeof item === 'object') {
                return (
                    <ItemView.SubIPanel
                        schemas={schemas}
                        content={item}
                        key={item['@id'] || item.name || (keyPrefix.length > 0 ? keyPrefix + '-' : '') + depth + '-' }
                    />
                );
            } else {
                if (typeof item === 'string' && item.charAt(0) === '/') {
                    return <a key={item} href={item}>{item}</a>;
                } else {
                    return item;
                }
            }
        },
    },

    propTypes : {
        schemas : React.PropTypes.object.isRequired,
        context : React.PropTypes.object.isRequired,
    },

    getDefaultProps : function(){
        return {
            'excludedKeys' : [
                '@context', 'actions', 'audit' /* audit currently not embedded (empty obj) */,
                'aliases', 'dbxrefs', 'date_created', 'lab', 'award', 'description', 'status', // Visible elsewhere on page
            ],
            'persistentKeys' : [
                '@id', 
                // Experiment
                'biosample', 'digestion_enzyme', 'digestion_temperature',
                'digestion_time', 'experiment_sets', 'experiment_summary',
                'filesets', 'ligation_temperature', 'ligation_time', 'ligation_volume',
                'protocol', 'tagging_method',
                'biosource','biosource_summary',    // Biosample
                'awards', 'address1', 'address2', 'city', 'country', 'institute_name', 'state',     // Lab
                'end_date', 'project', 'uri'        // Award
            ],
            'open' : null
        };
    },

    shouldComponentUpdate : function(nextProps){
        if (this.props.context !== nextProps.context) return true;
        if (this.props.schemas !== nextProps.schemas) return true;
        if (this.props.open !== nextProps.open) return true;
        return false;
    },

    render : function(){
        var context = this.props.context;
        var sortKeys = _.difference(_.keys(context).sort(), this.props.excludedKeys.sort());
        var tips = object.tipsFromSchema(this.props.schemas, context);

        return (
            <PartialList
                persistent={_.intersection(sortKeys, this.props.persistentKeys.sort()).map((key,i) =>
                    <PartialList.Row key={key} label={Detail.formKey(tips,key)}>{ Detail.formValue(this.props.schemas,context[key], key) }</PartialList.Row>
                )}
                collapsible={ _.difference(sortKeys, this.props.persistentKeys.sort()).map((key,i) =>
                    <PartialList.Row key={key} label={Detail.formKey(tips,key)}>{ Detail.formValue(this.props.schemas,context[key], key) }</PartialList.Row>
                )}
                open={this.props.open}
            />
        );
    }
});



var ItemView = module.exports = React.createClass({

    statics : {

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
                if (!description || description === ""){
                    return <span>{field}</span>;
                }
                return (
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
                    toggleLink = <a href="#" className="item-toggle-link" onClick={this.handleToggle}>{title}</a>
                    toggleRender = <span/>;
                }else{
                    toggleLink = <a href="#" className="item-toggle-link" onClick={this.handleToggle}>Close</a>
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
                        <div className="sub-panel data-display panel-body-with-header">
                            <div className="flexrow">
                                <div className="flexcol-sm-6">
                                    <div className="flexcol-heading experiment-heading">
                                        <h5>{title}</h5>
                                    </div>
                                    <dl className="key-value sub-descriptions">
                                        {sortKeys.map(function(ikey, idx){
                                            return (
                                                <div className="sub-entry" key={ikey} data-test="term-name">
                                                {Detail.formKey(tips,ikey)}
                                                <dd>{Detail.formValue(schemas, item[ikey])}</dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
        }),

        ItemHeader : ItemHeader,
        Detail : Detail,
        Title : React.createClass({
            render : function(){
                var title = globals.listing_titles.lookup(this.props.context)({context: this.props.context});
                return (
                    <h1 className="page-title">
                        {this.props.context['@type'][0]} <span className="subtitle prominent">{ title }</span>
                    </h1>
                );
            }
        })

    },

    getInitialState : function(){
        return {
            'collapsed' : true
        };
    },

    componentDidMount : function(){
        if (typeof this.props.context.lab == 'string' && this.props.context.lab.length > 0){
            FormattedInfoBlock.ajaxPropertyDetails.call(this, this.props.context.lab, 'lab');
        }
        if (typeof this.props.context.award == 'string' && this.props.context.award.length > 0){
            FormattedInfoBlock.ajaxPropertyDetails.call(this, this.props.context.award, 'award');
        }
    },

    topRightHeaderSection : function(){
        var r = [];
        // TODO: EDIT ACTIONS
        return r;
    },

    aliases : function(){
        if (!this.props.context || !Array.isArray(this.props.context.aliases)) return null;
        var aliases = this.props.context.aliases.length > 0 ? this.props.context.aliases : [<em>None</em>];
        return (
            <div>
                <h4 className="text-500">Aliases</h4>
                <div>
                    <ul>
                    { aliases.map(function(alias){
                        return (
                            <li>{ alias }</li>
                        );
                    }) }
                    </ul>
                </div>
            </div>
        );
    },

    alternateAccessions : function(){
        if (!this.props.context || !Array.isArray(this.props.context.alternate_accessions)) return null;
        var alternateAccessions = this.props.context.alternate_accessions.length > 0 ? this.props.context.alternate_accessions : [<em>None</em>];
        return (
            <div>
                <h4 className="text-500">Alternate Accessions</h4>
                <div>
                    <ul>
                    { alternateAccessions.map(function(alias){
                        return (
                            <li>{ alias }</li>
                        );
                    }) }
                    </ul>
                </div>
            </div>
        );
    },

    externalReferences : function(){
        if (!this.props.context || !Array.isArray(this.props.context.dbxrefs)) return null;
        var alternateAccessions = this.props.context.dbxrefs.length > 0 ? this.props.context.dbxrefs : [<em>None</em>];
        return (
            <div>
                <h4 className="text-500">External References</h4>
                <div>
                    <ul>
                    { alternateAccessions.map(function(alias){
                        return (
                            <li>{ alias }</li>
                        );
                    }) }
                    </ul>
                </div>
            </div>
        );
    },

    render: function() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container');

        var externalReferences  = this.externalReferences(),
            aliases             = this.aliases(),
            alternateAccessions = this.alternateAccessions();
        
        return (
            <div className={itemClass}>

                <ItemView.Title context={context} />

                <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href}>
                    <ItemHeader.TopRow>{ this.topRightHeaderSection() || null }</ItemHeader.TopRow>
                    <ItemHeader.MiddleRow />
                    <ItemHeader.BottomRow />
                </ItemHeader.Wrapper>


                <div className="row">

                    { externalReferences ?
                    <div className="col-xs-12 col-md-4">
                        { externalReferences }
                    </div>
                    : null }

                    { aliases ?
                    <div className="col-xs-12 col-md-4">
                        { aliases }
                    </div>
                    : null }

                    { alternateAccessions ?
                    <div className="col-xs-12 col-md-4">
                        { alternateAccessions }
                    </div>
                    : null }

                </div>

                <div className="row">

                    <div className="col-xs-12 col-md-8">

                        <hr/>

                        <div className="item-page-detail panel">
                            <Detail
                                context={context}
                                schemas={schemas}
                                open={!this.state.collapsed}
                            />
                        </div>

                    </div>
                    

                    <div className="col-xs-12 col-md-4 item-info-area section">

                        <hr/>

                        <h5 className="item-page-detail-toggle-button btn btn-default btn-block" onClick={()=>{
                            this.setState({ collapsed : !this.state.collapsed });
                        }}>{ this.state.collapsed ? "See more information" : "Hide" }</h5>

                        { typeof context.lab !== 'undefined' || typeof context.award !== 'undefined' ?
                        <hr/>
                        : null }

                        { typeof context.lab !== 'undefined' ?
                        <div className>
                            { FormattedInfoBlock.Lab(typeof context.lab === 'string' ? this.state.details_lab : context.lab) }
                        </div>
                        : null }

                        { typeof context.award !== 'undefined' ?
                        <div className>
                            { FormattedInfoBlock.Award(typeof context.award === 'string' ? this.state.details_award : context.award) }
                        </div>
                        : null }

                    </div>

                </div>


            </div>
        );
    }
});


globals.panel_views.register(ItemView, 'Item');