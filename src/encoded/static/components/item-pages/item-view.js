'use strict';

var React = require('react');
var globals = require('./../globals');
var Collapse = require('react-bootstrap').Collapse;
var _ = require('underscore');
var { ItemHeader, PartialList, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow } = require('./components');
var { AuditIndicators, AuditDetail, AuditMixin } = require('./../audit');
var { console, object, DateUtility, Filters } = require('./../util');
var itemTitle = require('./item').title;

/**
 * This Component renders out the default Item page view for Item objects/contexts which do not have a more specific
 * Item page template associated with them.
 * 
 * @module {Component} item-pages/item-view
 */

/**
 * A list of properties which belong to Item shown by ItemView.
 * Shows 'persistentKeys' fields & values stickied near top of list,
 * 'excludedKeys' never, and 'hiddenKeys' only when "See More Info" button is clicked.
 * 
 * @memberof module:item-pages/item-view
 * @namespace
 * @type {Component}
 */
var Detail = React.createClass({

    statics: {

        /**
         * Formats the correct display for each metadata field.
         * 
         * @memberof module:item-pages/item-view.Detail
         * @static
         * @param {Object} tips - Mapping of field property names (1 level deep) to schema properties.
         * @param {Object} key - Key to use to get 'description' for tooltip from the 'tips' param.
         * @returns {Element} <div> element with a tooltip and info-circle icon.
         */
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

            
            return (
                <div className="tooltip-info-container">
                    <span data-tip={tooltip}>{ title || key } <i className="icon icon-info-circle"/></span>
                </div>
            );

        },

        /**
         * Recursively render keys/values included in a provided item.
         * Wraps URLs/paths in link elements. Sub-panels for objects.
         *
         * @memberof module:item-pages/item-view.Detail
         * @static
         * @param {Object} schemas - Object containing schemas for server's JSONized object output.
         * @param {Object|Array|string} item - Item(s) to render recursively.
         */
        formValue : function (schemas, item, keyPrefix = '', atType = 'ExperimentSet', depth = 0) {
            if(Array.isArray(item)) {

                if (keyPrefix === 'files_in_set'){
                    return (
                        <FilesInSetTable.Small files={item}/>
                    );
                }

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
                    var attach_title = decodeURIComponent(split_item[split_item.length-1]);
                    return (
                        <a key={item} href={item} target="_blank" download>
                            {attach_title}
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

    /** @ignore */
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

    /** @ignore */
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


/** 
 * @alias module:item-pages/item-view
 */
var ItemView = module.exports = React.createClass({

    statics : {


        /**
         * Deprecated.
         * Display the item field with a tooltip showing the field description from
         * schema, if available.
         * 
         * @memberof module:item-pages/item-view
         * @namespace
         * @deprecated
         * @type {Component}
         */
        DescriptorField : React.createClass({

            propTypes: {
                field: React.PropTypes.string.isRequired,
                description: React.PropTypes.string.isRequired
            },
            
            /**
             * @memberof module:item-pages/item-view.DescriptorField
             * @private
             * @instance
             * @returns {Object} State object with 'active' : false.
             */
            getInitialState: function() {
                return {
                    active: false
                };
            },
            /** 
             * An onHover callback for outer <div> element.
             * 
             * @memberof module:item-pages/item-view.DescriptorField
             * @private
             * @instance
             * @param {boolean} b - Sets state.active to this value.
             */
            handleHover: function(b) {
                this.setState({active: b});
            },

            /** @ignore */
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

        /**
         * @memberof module:item-pages/item-view
         * @namespace
         * @type {Component}
         */
        SubIPanel : React.createClass({
            /** 
             * @memberof module:item-pages/item-view.SubIPanel
             * @private
             * @instance
             * @returns {Object} 'isOpen' : false
             */
            getInitialState: function() {
                return {isOpen: false};
            },

            /**
             * Handler for rendered title element. Toggles visiblity of ItemView.Subview.
             * 
             * @memberof module:item-pages/item-view.SubIPanel
             * @private
             * @instance
             * @param {MouseEvent} e - Mouse click event. Its preventDefault() method is called.
             * @returns {Object} 'isOpen' : false
             */
            handleToggle: function (e) {
                e.preventDefault();
                this.setState({
                    isOpen: !this.state.isOpen,
                });
            },

            /**
             * Renders title for the ItemView.Subview.
             * 
             * @memberof module:item-pages/item-view.SubIPanel
             * @private
             * @instance
             * @param {string} title - Title of panel, e.g. display_title of object for which SubIPanel is being used.
             * @param {boolean} isOpen - Whether state.isOpen is true or not. Used for if plus or minus icon. 
             * @returns {Element} <span> element.
             */
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

            /** @ignore */
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

        /**
         * Renders a panel <div> element containing a list.
         * 
         * @memberof module:item-pages/item-view
         * @namespace
         * @type {Component}
         */
        Subview : React.createClass({
            /** @ignore */
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

        /**
         * Renders page title appropriately for a provided props.context.
         * 
         * @memberof module:item-pages/item-view
         * @type {Component}
         */
        Title : React.createClass({
            /** @ignore */
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

    /**
     * @memberof module:item-pages/item-view
     * @private
     * @instance
     * @returns {Object} collapsed : false
     */
    getInitialState : function(){
        return {
            'collapsed' : true
        };
    },

    /** @ignore */
    componentDidMount : function(){
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'lab', this.props.context.lab);
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'award', this.props.context.award);
    },

    /** @ignore */
    topRightHeaderSection : function(){
        var r = [];
        // TODO: EDIT ACTIONS
        return r;
    },

    /** @ignore */
    render: function() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container');

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

                        <h5 className="item-page-detail-toggle-button btn btn-info btn-block" onClick={()=>{
                            this.setState({ collapsed : !this.state.collapsed });
                        }}>{ this.state.collapsed ? "See more information" : "Hide" }</h5>

                    </div>


                    <div className="col-xs-12 col-md-4 item-info-area section">

                        { typeof context.lab !== 'undefined' || typeof context.award !== 'undefined' ?
                        <hr/>
                        : null }

                        { typeof context.submitted_by !== 'undefined' ?
                        <div>
                            { FormattedInfoBlock.User(
                                this.state && typeof this.state.details_submitted_by !== 'undefined' ?
                                this.state.details_submitted_by : context.submitted_by
                            ) }
                        </div>
                        : null }

                        { typeof context.lab !== 'undefined' ? <hr/> : null }
                        { typeof context.lab !== 'undefined' ?
                        <div className>
                            { FormattedInfoBlock.Lab(
                                this.state && typeof this.state.details_lab !== 'undefined' ?
                                this.state.details_lab : context.lab
                            ) }
                        </div>
                        : null }

                        { typeof context.award !== 'undefined' ? <hr/> : null }
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

                <ItemFooterRow context={context} schemas={schemas} />

            </div>
        );
    }
});


globals.panel_views.register(ItemView, 'Item');
