'use strict';

var React = require('react');
var globals = require('./../globals');
var Collapse = require('react-bootstrap').Collapse;
var _ = require('underscore');
var { ItemHeader, PartialList, ExternalReferenceLink } = require('./components');
var { AuditIndicators, AuditDetail, AuditMixin } = require('./../audit');
var { console, object, DateUtility, Filters } = require('./../util');
var itemTitle = require('./item').title;
var FormattedInfoBlock = require('./components/FormattedInfoBlock');


var Detail = React.createClass({

    statics: {
        // Formats the correct display for each metadata field
        formKey : function(tips, key){
            var tooltip = '';
            var title = null;
            if (tips[key]){
                var info = tips[key];
                if (info.description){
                    tooltip = info.description;
                }
                if (info.title){
                    title = info.title;
                }
            }

            return(
                <ItemView.DescriptorField field={key} description={tooltip} title={title}/>
            );
        },

        /**
         * Recursively render keys/values included in a provided item.
         * Wraps URLs/paths in link elements. Sub-panels for objects.
         *
         * @param {Object} schemas - Object containing schemas for server's JSONized object output.
         * @param {*|*[]} item - Item(s) to render recursively.
         */
        formValue : function (schemas, item, keyPrefix = '', atType = 'ExperimentSet', depth = 0) {
            if(Array.isArray(item)) {
                return (
                    <ul>
                        {   item.length === 0 ? <li><em>None</em></li>
                            :   item.map(function(it, i){
                                    return <li key={i}>{ Detail.formValue(schemas, it, keyPrefix, atType, depth + 1) }</li>;
                                })
                        }
                    </ul>
                );
            } else if (typeof item === 'object') {
                var title = itemTitle({ 'context' : item});

                // if the following is true, we have an embedded object
                if (item.display_title && item.link_id){
                    var format_id = item.link_id.replace(/~/g, "/")
                    return (
                        <a href={format_id}>
                            { title }
                        </a>
                    );
                } else { // it must be an embedded sub-object (not Item)
                    return (
                        <ItemView.SubIPanel
                            schemas={schemas}
                            content={item}
                            key={title}
                            title={title}
                        />
                    );
                }
            } else if (typeof item === 'string'){
                if (item.charAt(0) === '/') {
                    return (
                        <a key={item} href={item}>
                            {item}
                        </a>
                    );
                } else if (item.slice(0,4) === 'http') {
                    // Is a URL. Check if we should render it as a link/uri.
                    var schemaProperty = Filters.Field.getSchemaProperty(keyPrefix, schemas, atType);
                    if (
                        schemaProperty &&
                        typeof schemaProperty.format === 'string' &&
                        ['uri','url'].indexOf(schemaProperty.format.toLowerCase()) > -1
                    ){
                        return (
                            <a key={item} href={item} target="_blank">
                                {item}
                            </a>
                        );
                    }
                } else if(item.slice(0,10) === '@@download'){
                    // this is a download link. Format appropriately
                    var split_item = item.split('/');
                    return (
                        <a key={item} href={item} target="_blank" download>
                            {split_item[split_item.length-1]}
                        </a>
                    );
                }
            }
            return(<span>{ item }</span>); // Fallback
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
                // Visible elsewhere on page
                'aliases', 'dbxrefs', 'date_created', 'lab', 'award', 'description',
                'status', 'external_references', '@id', 'link_id', 'display_title'
            ],
            'persistentKeys' : [
                // Experiment
                'experiment_type', 'experiment_summary', 'experiment_sets', 'files', 'filesets',
                'protocol', 'biosample', 'digestion_enzyme', 'digestion_temperature',
                'digestion_time', 'ligation_temperature', 'ligation_time', 'ligation_volume',
                'tagging_method',
                // Biosample
                'biosource','biosource_summary','biosample_protocols','modifications_summary',
                'treatments_summary',
                // File
                'file_type', 'file_format', 'filename', 'href', 'notes', 'flowcell_details',
                // Lab
                'awards', 'address1', 'address2', 'city', 'country', 'institute_name', 'state',
                // Award
                'end_date', 'project', 'uri',
                // Document
                'attachment'
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

        // Sort applicable persistent keys by original persistent keys sort order.
        var persistentKeysObj = _.object(
            _.intersection(sortKeys, this.props.persistentKeys.slice(0).sort()).map(function(key){
                return [key, true];
            })
        );
        var orderedPersistentKeys = [];
        this.props.persistentKeys.forEach(function (key) {
            if (persistentKeysObj[key] === true) orderedPersistentKeys.push(key);
        });

        var extraKeys = _.difference(sortKeys, this.props.persistentKeys.slice(0).sort());

        return (
            <PartialList
                persistent={ orderedPersistentKeys.map((key,i) =>
                    <PartialList.Row key={key} label={Detail.formKey(tips,key)}>{ Detail.formValue(this.props.schemas,context[key], key, context['@type'][0]) }</PartialList.Row>
                )}
                collapsible={ extraKeys.map((key,i) =>
                    <PartialList.Row key={key} label={Detail.formKey(tips,key)}>{ Detail.formValue(this.props.schemas,context[key], key, context['@type'][0]) }</PartialList.Row>
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
                var { field, description, title } = this.props;
                var active = this.state.active;
                var header;
                if (!description || description === ""){
                    return  <span data-field={field}>{ title || field }</span>;
                }
                return (
                    <div className="tooltip-trigger"
                        onMouseEnter={this.handleHover.bind(null, true)}
                        onMouseLeave={this.handleHover.bind(null, false)}
                        data-field={field}
                    >
                        <span>{ title || field }</span>
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

            toggleLink : function(title = this.props.title, isOpen = this.state.isOpen){
                var iconType = isOpen ? 'icon-minus' : 'icon-plus';
                return (
                    <span className="subitem-toggle">
                        <a href="#" className="link" onClick={this.handleToggle}>
                            <i style={{'color':'black', 'paddingRight':'10px'}} className={"icon " + iconType}/>
                            { title }
                        </a>
                    </span>
                );
            },

            render: function() {
                var schemas = this.props.schemas;
                var item = this.props.content;
                var title = this.props.title;
                return (
                    <span>
                        { this.toggleLink(title, this.state.isOpen) }
                        { this.state.isOpen ?
                            <ItemView.Subview schemas={schemas} content={item} title={title}/>
                        : null }
                    </span>
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
                return (
                    <div className="sub-panel data-display panel-body-with-header">
                        <div className="key-value sub-descriptions">
                            {sortKeys.map(function(key, idx){
                                return (
                                    <PartialList.Row key={key} label={Detail.formKey(tips,key)}>
                                        { Detail.formValue(schemas, item[key], key) }
                                    </PartialList.Row>
                                );
                            })}
                        </div>
                    </div>
                );
            }
        }),

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
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'lab', this.props.context.lab);
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'award', this.props.context.award);
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
                    { aliases.map(function(alias, i){
                        return (
                            <li key={i}>{ alias }</li>
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
                    { alternateAccessions.map(function(alias, i){
                        return (
                            <li key={i}>{ alias }</li>
                        );
                    }) }
                    </ul>
                </div>
            </div>
        );
    },

    externalReferences : function(schemas){
        if (!this.props.context || !Array.isArray(this.props.context.external_references)) return null;
        var externalRefs = this.props.context.external_references.length > 0 ? this.props.context.external_references : [<em>None</em>];
        return (
            <div>
                <h4 className="text-500">External References</h4>
                <div>
                    <ul>
                    { externalRefs.map(function(extRef, i){
                        return (
                            <li key={i}>
                                { typeof extRef.ref === 'string' ?
                                    <ExternalReferenceLink uri={extRef.uri || null} children={extRef.ref} />
                                    :
                                    extRef
                                }

                            </li>
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

        var externalReferences  = this.externalReferences(schemas),
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

                    <div className="col-xs-12 col-md-8">

                        <hr/>

                        <div className="item-page-detail">
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
                            { FormattedInfoBlock.Lab(
                                this.state && typeof this.state.details_lab !== 'undefined' ?
                                this.state.details_lab : context.lab
                            ) }
                        </div>
                        : null }

                        { typeof context.award !== 'undefined' ?
                        <div className>
                            { FormattedInfoBlock.Award(
                                this.state && typeof this.state.details_award !== 'undefined' ?
                                this.state.details_award : context.award
                            ) }
                        </div>
                        : null }

                    </div>

                </div>

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


            </div>
        );
    }
});


globals.panel_views.register(ItemView, 'Item');
