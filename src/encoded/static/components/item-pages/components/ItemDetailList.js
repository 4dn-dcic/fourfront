'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Collapse, Button } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import { console, object, Schemas } from './../../util';
import { PartialList } from './PartialList';
import { FilesInSetTable } from './FilesInSetTable';
import { getTitleStringFromContext } from './../item';
import JSONTree from 'react-json-tree';


export class TooltipInfoIconContainer extends React.Component {
    render(){
        var { elementType, title, tooltip } = this.props;
        return React.createElement(elementType || 'div', {
            'className' : "tooltip-info-container"
        }, (
            <span>{ title }&nbsp;{ typeof tooltip === 'string' ?
                <i data-tip={tooltip} className="icon icon-info-circle"/>
            : null }</span>
        ));
    }
}


/**
 * Contains and toggles visibility/mounting of a Subview.
 *
 * @class SubItem
 * @extends {React.Component}
 */
class SubItem extends React.Component {

    constructor(props){
        super(props);
        this.handleToggle = this.handleToggle.bind(this);
        this.toggleLink = this.toggleLink.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            isOpen : false
        };
    }

    /**
     * Handler for rendered title element. Toggles visiblity of Subview.
     *
     * @param {MouseEvent} e - Mouse click event. Its preventDefault() method is called.
     * @returns {Object} 'isOpen' : false
     */
    handleToggle (e) {
        e.preventDefault();
        this.setState({
            isOpen: !this.state.isOpen,
        });
    }

    /**
     * Renders title for the Subview.
     *
     * @param {string} title - Title of panel, e.g. display_title of object for which SubIPanel is being used.
     * @param {boolean} isOpen - Whether state.isOpen is true or not. Used for if plus or minus icon.
     * @returns {Element} <span> element.
     */
    toggleLink(title = this.props.title, isOpen = this.state.isOpen){
        var iconType = isOpen ? 'icon-minus' : 'icon-plus';
        if (typeof title !== 'string' || title.toLowerCase() === 'no title found'){
            title = isOpen ? "Collapse" : "Expand";
        }
        return (
            <span className="subitem-toggle">
                <span className="link" onClick={this.handleToggle}>
                    <i style={{'color':'black', 'paddingRight': 10, 'paddingLeft' : 5}} className={"icon " + iconType}/>
                    { title }
                </span>
            </span>
        );
    }

    render() {
        var schemas = this.props.schemas;
        var content = this.props.content;
        var title = this.props.title;
        var popLink = this.props.popLink;
        var keyTitleDescriptionMap = this.props.keyTitleDescriptionMap;
        return (
            <span>
                { this.toggleLink(title, this.state.isOpen) }
                { this.state.isOpen ?
                    <SubItemView schemas={schemas} content={content} popLink={popLink} title={title} keyTitleDescriptionMap={keyTitleDescriptionMap} />
                : null }
            </span>
        );
    }
}



/**
 * Renders a panel <div> element containing a list.
 *
 * @memberof module:item-pages/components.ItemDetailList.Detail
 */
class SubItemView extends React.Component {

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render(){
        var schemas = this.props.schemas;
        var item = this.props.content;
        var popLink = this.props.popLink;
        var keyTitleDescriptionMap = this.props.keyTitleDescriptionMap || {};

        return (
            <div className="sub-panel data-display panel-body-with-header">
                <div className="key-value sub-descriptions">
                    <Detail
                        context={item}
                        schemas={schemas}
                        popLink={popLink}
                        alwaysCollapsibleKeys={[]}
                        excludedKeys={this.props.excludedKeys ||
                            _.without(Detail.defaultProps.excludedKeys,
                            // Remove
                                '@id', 'audit', 'lab', 'award', 'description'
                            ).concat([
                            // Add
                                'link_id', 'schema_version'
                            ])
                        }

                        keyTitleDescriptionMap={_.extend({}, keyTitleDescriptionMap, {
                            // Extend schema properties
                            '@id' : {
                                'title' : 'Link',
                                'description' : 'Link to Item'
                            }
                        })}
                        />
                </div>
            </div>
        );
    }
}


/**
 * The list of properties contained within ItemDetailList.
 * Isolated to allow use without existing in ItemDetailList parent.
 *
 * @class Detail
 * @type {Component}
 */
export class Detail extends React.Component {

    /**
     * Formats the correct display for each metadata field.
     *
     * @memberof module:item-pages/components.ItemDetailList.Detail
     * @static
     * @param {Object} tips - Mapping of field property names (1 level deep) to schema properties.
     * @param {Object} key - Key to use to get 'description' for tooltip from the 'tips' param.
     * @returns {Element} <div> element with a tooltip and info-circle icon.
     */
    static formKey(tips, key){
        var tooltip = null;
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

        return <TooltipInfoIconContainer title={title || key} tooltip={tooltip} />;
    }

    /**
    * Recursively render keys/values included in a provided item.
    * Wraps URLs/paths in link elements. Sub-panels for objects.
    *
    * @memberof module:item-pages/components.ItemDetailList.Detail
    * @static
    * @param {Object} schemas - Object containing schemas for server's JSONized object output.
    * @param {Object|Array|string} item - Item(s) to render recursively.
    */
    static formValue(item, popLink = false, keyPrefix = '', atType = 'ExperimentSet', keyTitleDescriptionMap, depth = 0) {
        var schemas = Schemas.get();
        if (item === null){
            return <span>No Value</span>;
        } else if (Array.isArray(item)) {

            if (keyPrefix === 'files_in_set'){
                return (
                    <FilesInSetTable.Small files={item}/>
                );
            }

            return (
                <ol>
                    {   item.length === 0 ? <li><em>None</em></li>
                        :
                        item.map(function(it, i){
                            return <li key={i}>{ Detail.formValue(it, popLink, keyPrefix, atType, keyTitleDescriptionMap, depth + 1) }</li>;
                        })
                    }
                </ol>
            );
        } else if (typeof item === 'object' && item !== null) {
            var title = getTitleStringFromContext(item);

            // if the following is true, we have an embedded object without significant other data
            if (item.display_title && typeof item.link_id === 'string' && _.keys(item).length < 4){
                var format_id = item.link_id.replace(/~/g, "/");
                if(popLink){
                    return (
                        <a href={format_id} target="_blank">
                            {title}
                        </a>
                    );
                } else {
                    return (
                        <a href={format_id}>
                            { title }
                        </a>
                    );
                }
            } else { // it must be an embedded sub-object (not Item)
                return (
                    <SubItem
                        schemas={schemas}
                        content={item}
                        key={title}
                        title={title}
                        popLink={popLink}
                        keyTitleDescriptionMap={keyTitleDescriptionMap}
                    />
                );
            }
        } else if (typeof item === 'string'){
            if (keyPrefix === '@id'){
                if(popLink){
                    return (
                        <a key={item} href={item} target="_blank">
                            {item}
                        </a>
                    );
                }else{
                    return (
                        <a key={item} href={item}>
                            {item}
                        </a>
                    );
                }
            }
            if(item.indexOf('@@download') > -1/* || item.charAt(0) === '/'*/){
                // this is a download link. Format appropriately
                var split_item = item.split('/');
                var attach_title = decodeURIComponent(split_item[split_item.length-1]);
                return (
                    <a key={item} href={item} target="_blank" download>
                        {attach_title || item}
                    </a>
                );
            } else if (item.charAt(0) === '/') {
                if(popLink){
                    return (
                        <a key={item} href={item} target="_blank">
                            {item}
                        </a>
                    );
                }else{
                    return (
                        <a key={item} href={item}>
                            {item}
                        </a>
                    );
                }
            } else if (item.slice(0,4) === 'http') {
                // Is a URL. Check if we should render it as a link/uri.
                var schemaProperty = Schemas.Field.getSchemaProperty(keyPrefix, schemas, atType);
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
            }
        }
        return(<span>{ item }</span>); // Fallback
    }

    static SubItem = SubItem
    static SubItemView = SubItemView

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'keyTitleDescriptionMap' : PropTypes.object
    }

    static defaultProps = {
        'keyTitleDescriptionMap' : null,
        'excludedKeys' : [
            '@context', 'actions', 'audit',
            // Visible elsewhere on page
            'lab', 'award', 'description',
            '@id', 'link_id', 'display_title'
        ],
        'stickyKeys' : [
            // Experiment Set
            'experimentset_type', 'date_released',
            // Experiment
            'experiment_type', 'experiment_summary', 'experiment_sets', 'files', 'filesets',
            'protocol', 'biosample', 'digestion_enzyme', 'digestion_temperature',
            'digestion_time', 'ligation_temperature', 'ligation_time', 'ligation_volume',
            'tagging_method',
            // Biosample
            'biosource','biosource_summary','biosample_protocols','modifications_summary',
            'treatments_summary',
            // File
            'filename', 'file_type', 'file_format', 'href', 'notes', 'flowcell_details',
            // Lab
            'awards', 'address1', 'address2', 'city', 'country', 'institute_name', 'state',
            // Award
            'end_date', 'project', 'uri',
            // Document
            'attachment',
            // Things to go at bottom consistently
            'aliases',
        ],
        'alwaysCollapsibleKeys' : [
            '@type', 'accession', 'schema_version', 'uuid', 'replicate_exps', 'dbxrefs', 'status', 'external_references', 'date_created'
        ],
        'open' : null
    }

    render(){
        var context = this.props.context;
        var sortKeys = _.difference(_.keys(context).sort(), this.props.excludedKeys.sort());
        var schemas = this.props.schemas || Schemas.get();
        var tips = schemas ? object.tipsFromSchema(schemas, context) : {};
        if (typeof this.props.keyTitleDescriptionMap === 'object' && this.props.keyTitleDescriptionMap){
            _.extend(tips, this.props.keyTitleDescriptionMap);
        }

        // Sort applicable persistent keys by original persistent keys sort order.
        var stickyKeysObj = _.object(
            _.intersection(sortKeys, this.props.stickyKeys.slice(0).sort()).map(function(key){
                return [key, true];
            })
        );
        var orderedStickyKeys = [];
        this.props.stickyKeys.forEach(function (key) {
            if (stickyKeysObj[key] === true) orderedStickyKeys.push(key);
        });

        var extraKeys = _.difference(sortKeys, this.props.stickyKeys.slice(0).sort());
        var collapsibleKeys = _.intersection(extraKeys.sort(), this.props.alwaysCollapsibleKeys.slice(0).sort());
        extraKeys = _.difference(extraKeys, collapsibleKeys);
        var popLink = this.props.popLink || false; // determines whether links should be opened in a new tab
        return (
            <PartialList
                persistent={ orderedStickyKeys.concat(extraKeys).map((key,i) =>
                    <PartialList.Row key={key} label={Detail.formKey(tips,key)}>
                        { Detail.formValue(
                            context[key],
                            popLink,
                            key,
                            context['@type'] && context['@type'][0],
                            tips
                        ) }
                    </PartialList.Row>
                )}
                collapsible={ collapsibleKeys.map((key,i) =>
                    <PartialList.Row key={key} label={Detail.formKey(tips,key)}>
                        { Detail.formValue(
                            context[key],
                            popLink,
                            key,
                            context['@type'] && context['@type'][0],
                            tips
                        ) }
                    </PartialList.Row>
                )}
                open={this.props.open}
            />
        );
    }

}

/**
 * A list of properties which belong to Item shown by ItemView.
 * Shows 'persistentKeys' fields & values stickied near top of list,
 * 'excludedKeys' never, and 'hiddenKeys' only when "See More Info" button is clicked.
 *
 * @class
 * @type {Component}
 */
export class ItemDetailList extends React.Component {

    static Detail = Detail

    static getTabObject(context){
        return {
            tab : <span><i className="icon icon-list-ul icon-fw"/> Details</span>,
            key : 'details',
            content : (
                <div>
                    <h3 className="tab-section-title">
                        <span>Details</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <ItemDetailList context={context} />
                </div>
            )
        };
    }

    constructor(props){
        super(props);
        this.seeMoreButton = this.seeMoreButton.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.toggleJSONButton = this.toggleJSONButton.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'collapsed' : true,
            'showingJSON' : false
        };
    }

    seeMoreButton(){
        if (typeof this.props.collapsed === 'boolean') return null;
        return (
            <button className="item-page-detail-toggle-button btn btn-default btn-block" onClick={()=>{
                this.setState({ collapsed : !this.state.collapsed });
            }}>{ this.state.collapsed ? "See advanced information" : "Hide" }</button>
        );
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    componentDidUpdate(pastProps, pastState){
        if (this.state.showingJSON === false && pastState.showingJSON === true){
            ReactTooltip.rebuild();
        }
    }

    toggleJSONButton(){
        return (
            <button type="button" className="btn btn-block btn-default" onClick={()=>{
                this.setState({ 'showingJSON' : !this.state.showingJSON });
            }}>
                { this.state.showingJSON ?
                    <span><i className="icon icon-fw icon-list"/> View as List</span>
                    :
                    <span><i className="icon icon-fw icon-code"/> View as JSON</span>
                }
            </button>
        );
    }

    render(){
        var collapsed;
        if (typeof this.props.collapsed === 'boolean') collapsed = this.props.collapsed;
        else collapsed = this.state.collapsed;
        return (
            <div className="item-page-detail" style={typeof this.props.minHeight === 'number' ? { minHeight : this.props.minHeight } : null}>
                { !this.state.showingJSON ?
                    <div className="overflow-hidden">
                        <Detail
                            context={this.props.context}
                            schemas={this.props.schemas}
                            open={!collapsed}
                            keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                            excludedKeys={this.props.excludedKeys || Detail.defaultProps.excludedKeys}
                            stickyKeys={this.props.stickyKeys || Detail.defaultProps.stickyKeys}
                        />
                        <div className="row">
                            <div className="col-xs-6">{ this.seeMoreButton() }</div>
                            <div className="col-xs-6">{ this.toggleJSONButton() }</div>
                        </div>
                    </div>
                    :
                    <div className="overflow-hidden">
                        <div className="json-tree-wrapper">
                            <JSONTree data={this.props.context} />
                        </div>
                        <br/>
                        <div className="row">
                            <div className="col-xs-12 col-sm-6 pull-right">{ this.toggleJSONButton() }</div>
                        </div>
                    </div>
                }

            </div>
        );
    }

}
