'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Collapse, Button } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import { console, object, Schemas } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { PartialList } from './PartialList';
import { FilesInSetTable } from './FilesInSetTable';
import JSONTree from 'react-json-tree';


/**
 * Contains and toggles visibility/mounting of a Subview.
 *
 * @class SubItem
 * @extends {React.Component}
 */
class SubItem extends React.Component {

    constructor(props){
        super(props);
        this.toggleLink = this.toggleLink.bind(this);
        this.render = this.render.bind(this);
        if (typeof props.onToggle !== 'function'){
            this.onToggle = this.handleToggleFallback.bind(this);
        } else {
            this.onToggle = this.props.onToggle;
        }
        this.state = {
            isOpen : false
        };

    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    /**
     * Handler for rendered title element. Toggles visiblity of Subview.
     *
     * @param {React.SyntheticEvent} e - Mouse click event. Its preventDefault() method is called.
     * @returns {Object} 'isOpen' : false
     */
    handleToggleFallback (e) {
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
    toggleLink(title = this.props.title, isOpen = (this.props.isOpen || this.state.isOpen)){
        var iconType = isOpen ? 'icon-minus' : 'icon-plus';
        if (typeof title !== 'string' || title.toLowerCase() === 'no title found'){
            title = isOpen ? "Collapse" : "Expand";
        }
        return (
            <span className="subitem-toggle">
                <span className="link" onClick={this.onToggle}>
                    <i style={{'color':'black', 'paddingRight': 10, 'paddingLeft' : 5}} className={"icon " + iconType}/>
                    { title }
                </span>
            </span>
        );
    }

    /**
     * @returns {JSX.Element} React Span element containing expandable link, and maybe open panel below it.
     */
    render() {
        return (
            <span>
                { this.toggleLink(this.props.title, this.props.isOpen || this.state.isOpen) }
                { this.state.isOpen ? <SubItemListView {...this.props} isOpen /> : <div/> }
            </span>
        );
    }
}

class SubItemListView extends React.Component {

    static shouldRenderTable(content){
        var itemKeys = _.keys(content);
        var itemKeysLength = itemKeys.length;
        if (itemKeysLength > 6) {
            return false;
        }
        for (var i = 0; i < itemKeysLength; i++){
            if ( typeof content[itemKeys[i]] !== 'string' && typeof content[itemKeys[i]] !== 'number' ) return false;
        }
    }

    render(){
        if (!this.props.isOpen) return null;
        var schemas = this.props.schemas;
        var item = this.props.content;
        var popLink = this.props.popLink;
        var columnDefinitions = this.props.columnDefinitions || {};
        var props = {
            'context' : item,
            'schemas' : schemas,
            'popLink' : popLink,
            'alwaysCollapsibleKeys' : [],
            'excludedKeys' : (this.props.excludedKeys || _.without(Detail.defaultProps.excludedKeys,
                // Remove
                    'audit', 'lab', 'award', 'description', 'link_id'
                ).concat([
                // Add
                    'schema_version', 'uuid'
                ])
            ),
            'columnDefinitions' : columnDefinitions,
            'showJSONButton' : false
        };
        return (
            <div className="sub-panel data-display panel-body-with-header">
                <div className="key-value sub-descriptions">
                    { React.createElement(typeof item.display_title === 'string' ? ItemDetailList : Detail, props) }
                </div>
            </div>
        );
    }
}

/**
 *  Messiness.
 *
 * @class SubItemTable
 * @extends {React.Component}
 */
class SubItemTable extends React.Component {

    /**
     * This code could look better.
     * Essentially, checks each property in first object of param 'list' and if no values fail a rough validation wherein there must be no too-deeply nested objects or lists, returns true.
     *
     * @param {Object[]} list - List of objects
     * @returns {boolean} True if a table would be good for showing these items.
     */
    static shouldUseTable(list){
        if (!Array.isArray(list)) return false;
        if (list.length < 1) return false;

        var firstRowItem = list[0];

        if (!firstRowItem) return false;
        if (typeof firstRowItem === 'string') return false;
        if (typeof firstRowItem === 'number') return false;

        var objectWithAllItemKeys = _.reduce(list, function(m, v){
            var v2 = _.clone(v);
            var valKeys = _.keys(v2);
            // Exclude empty arrays from copied-from object, add them into memo property instead of overwrite.
            for (var i = 0; i < valKeys.length; i++){
                if (Array.isArray(v2[valKeys[i]])){
                    m[valKeys[i]] = (m[valKeys[i]] || []).concat(v2[valKeys[i]]);
                    delete v2[valKeys[i]];
                } else if (v2[valKeys[i]] && typeof v2[valKeys[i]] === 'object'){
                    m[valKeys[i]] = _.extend(m[valKeys[i]] || {}, v2[valKeys[i]]);
                    delete v2[valKeys[i]];
                }
            }
            return _.extend(m, v2);
        }, {});

        var schemaForType;

        if (object.isAnItem(objectWithAllItemKeys)){
            if (!Array.isArray(objectWithAllItemKeys['@type'])){
                return false; // No @type so we can't get 'columns' from schemas.
            } else {
                schemaForType = Schemas.getSchemaForItemType(objectWithAllItemKeys['@type'][0]);
                if (!schemaForType || !schemaForType.columns) return false; // No columns on this Item type's schema. Skip.
            }
        }

        var rootKeys = _.keys(objectWithAllItemKeys);
        var embeddedKeys, i, j, k, embeddedListItem, embeddedListItemKeys;


        for (i = 0; i < rootKeys.length; i++){

            if (Array.isArray(objectWithAllItemKeys[rootKeys[i]])) {

                var listObjects = _.filter(objectWithAllItemKeys[rootKeys[i]], function(v){
                    if (!v || (v && typeof v === 'object')) return true;
                    return false;
                });
                if (listObjects.length === 0) continue; // List of strings or values only. Continue.
                var listNotItems = _.filter(listObjects, function(v){ return !object.isAnItem(v); });
                if (listNotItems.length === 0) continue; // List of Items that can be rendered as links. Continue.

                // Else, we have list of Objects. Assert that each sub-object has only strings, numbers, or Item (object with link), or list of such -- no other sub-objects.
                for (k = 0; k < listNotItems.length; k++){
                    embeddedListItem = listNotItems[k];
                    embeddedListItemKeys = _.keys(embeddedListItem);

                    for (j = 0; j < embeddedListItemKeys.length; j++){
                        if (typeof embeddedListItem[embeddedListItemKeys[j]] === 'string' || typeof embeddedListItem[embeddedListItemKeys[j]] === 'number'){
                            continue;
                        }
                        if (object.isAnItem(embeddedListItem[embeddedListItemKeys[j]])){
                            continue;
                        }
                        if (
                            Array.isArray(embeddedListItem[embeddedListItemKeys[j]]) &&
                            _.filter(embeddedListItem[embeddedListItemKeys[j]], function(v){
                                if (typeof v === 'string' || typeof v === 'number') return false;
                                return true;
                            }).length === 0
                        ){
                            continue;
                        }
                        return false;
                    }
                }
            }

            if (!Array.isArray(objectWithAllItemKeys[rootKeys[i]]) && objectWithAllItemKeys[rootKeys[i]] && typeof objectWithAllItemKeys[rootKeys[i]] === 'object') {
                // Embedded object 1 level deep. Will flatten upwards if passes checks:
                // example: (sub-object) {..., 'stringProp' : 'stringVal', 'meta' : {'argument_name' : 'x', 'argument_type' : 'y'}, ...} ===> (columns) 'stringProp', 'meta.argument_name', 'meta.argument_type'
                if (object.isAnItem(objectWithAllItemKeys[rootKeys[i]])){
                    // This embedded object is an.... ITEM! Skip rest of checks for this property, we're ok with just drawing link to Item.
                    continue;
                }
                embeddedKeys = _.keys(objectWithAllItemKeys[rootKeys[i]]);

                if (embeddedKeys.length > 5) return false; // 5 properties to flatten up feels like a good limit. Lets render objects with more than that as lists or own table (not flattened up to another 1).
                // Run some checks against the embedded object's properties. Ensure all nested lists contain plain strings or numbers, as will flatten to simple comma-delimited list.
                for (j = 0; j < embeddedKeys.length; j++){

                    if (typeof objectWithAllItemKeys[ rootKeys[i] ][ embeddedKeys[j] ] === 'string' || typeof objectWithAllItemKeys[ rootKeys[i] ][ embeddedKeys[j] ] === 'number') continue;
                    // Ensure if property on embedded object's is an array, that is a simple array of strings or numbers - no objects. Will be converted to comma-delimited list.
                    if ( Array.isArray(  objectWithAllItemKeys[ rootKeys[i] ][ embeddedKeys[j] ]  ) ){
                        if (
                            objectWithAllItemKeys[rootKeys[i]][embeddedKeys[j]].length < 4 &&
                            _.filter(objectWithAllItemKeys[rootKeys[i]][embeddedKeys[j]], function(v){
                                if (typeof v === 'string' || typeof v === 'number') { return false; }
                                else if (v && typeof v === 'object' && _.keys(v).length < 2) { return false; }
                                else { return true; }
                            }).length === 0
                            //(typeof objectWithAllItemKeys[rootKeys[i]][embeddedKeys[j]][0] === 'string' || typeof objectWithAllItemKeys[rootKeys[i]][embeddedKeys[j]][0] === 'number')
                        ) {
                            continue;
                        } else {
                            return false;
                        }
                    }

                    // Ensure that if is not an array, it is a simple string or number (not another embedded object).
                    if (
                        !Array.isArray(objectWithAllItemKeys[rootKeys[i]][embeddedKeys[j]]) &&
                        objectWithAllItemKeys[rootKeys[i]][embeddedKeys[j]] &&
                        typeof objectWithAllItemKeys[rootKeys[i]][embeddedKeys[j]] === 'object'
                    ) { // Embedded object 2 levels deep. No thx we don't want any 'meta.argument_mapping.argument_type' -length column names. Unless it's an Item for which we can just render link for.
                        if ( object.isAnItem(objectWithAllItemKeys[rootKeys[i]][embeddedKeys[j]]) ) continue;
                        return false;
                    }
                }
            }
        }

        return true;
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.state = { mounted : false };
    }

    componentDidMount(){
        vizUtil.requestAnimationFrame(()=>{
            this.setState({ mounted : true });
        });
    }

    getColumnKeys(){
        var objectWithAllItemKeys = _.reduce(this.props.items, function(m, v){
            return _.extend(m, v);
        }, {});
        //var schemas = this.props.schemas || Schemas.get();
        //var tips = schemas ? object.tipsFromSchema(schemas, context) : {};
        //if (typeof this.props.keyTitleDescriptionMap === 'object' && this.props.keyTitleDescriptionMap){
        //    _.extend(tips, this.props.keyTitleDescriptionMap);
        //}
        // Property columns to push to front (common across all objects)
        var rootKeys = _.keys(objectWithAllItemKeys);

        var columnKeys = [];

        // Use schema columns
        if (typeof objectWithAllItemKeys.display_title === 'string' && Array.isArray(objectWithAllItemKeys['@type'])){

            var columnKeysFromSchema = _.keys(Schemas.getSchemaForItemType(Schemas.getItemType(objectWithAllItemKeys)).columns);

            columnKeys = rootKeys.filter(function(k){
                if (k === 'display_title' || k === 'link_id' || k === 'accession') return true;
                if (columnKeysFromSchema.indexOf(k) > -1) return true;
                return false;
            }).map(function(k){
                return { 'key' : k };
            });

        } else {
            // Gather, flatten up from Object.
            for (var i = 0; i < rootKeys.length; i++){
                if (typeof objectWithAllItemKeys[rootKeys[i]] === 'string' || typeof objectWithAllItemKeys[rootKeys[i]] === 'number' || Array.isArray(objectWithAllItemKeys[rootKeys[i]])) {
                    if (  Array.isArray(objectWithAllItemKeys[rootKeys[i]]) && objectWithAllItemKeys[rootKeys[i]][0] && typeof objectWithAllItemKeys[rootKeys[i]][0] === 'object' && typeof objectWithAllItemKeys[rootKeys[i]][0].display_title !== 'string' ) {
                        columnKeys.push({
                            'key' : rootKeys[i],
                            'childKeys' : _.keys(
                                _.reduce(this.props.items, function(m1,v1){
                                    return _.extend(
                                        m1,
                                        _.reduce(v1[rootKeys[i]], function(m2,v2) {
                                            return _.extend(m2, v2);
                                        }, {})
                                    );
                                }, {})
                            )
                        });
                    } else {
                        columnKeys.push({ 'key' : rootKeys[i] });
                    }
                } else if (objectWithAllItemKeys[rootKeys[i]] && typeof objectWithAllItemKeys[rootKeys[i]] === 'object'){
                    var itemAtID = typeof objectWithAllItemKeys[rootKeys[i]].display_title === 'string' && object.atIdFromObject(objectWithAllItemKeys[rootKeys[i]]);
                    if (itemAtID) {
                        columnKeys.push({ 'key' : rootKeys[i] }); // Keep single key if is an Item, we'll make it into a link.
                    } else { // Flatten up, otherwise.
                        columnKeys = columnKeys.concat(
                            _.keys(objectWithAllItemKeys[rootKeys[i]]).map(function(embeddedKey){
                                return { 'key' : rootKeys[i] + '.' + embeddedKey };
                            })
                        );
                    }
                }
            }

        }

        return columnKeys.filter((k)=>{
            if (this.props.columnDefinitions){
                if (this.props.columnDefinitions[k.key]){
                    if (typeof this.props.columnDefinitions[k.key].hide === 'boolean' && this.props.columnDefinitions[k.key].hide) return false;
                    if (typeof this.props.columnDefinitions[k.key].hide === 'function'){
                        return !(this.props.columnDefinitions[k.key].hide(objectWithAllItemKeys));
                    }
                }
            }
            return true;
        }).sort(function(a,b){
            if (['title', 'display_title', 'accession'].indexOf(a.key) > -1) return -5;
            if (['title', 'display_title', 'accession'].indexOf(b.key) > -1) return 5;
            if (['name', 'workflow_argument_name'].indexOf(a.key) > -1) return -4;
            if (['name', 'workflow_argument_name'].indexOf(b.key) > -1) return 4;
            if (['step', 'step_argument_name'].indexOf(a.key) > -1) return -3;
            if (['step', 'step_argument_name'].indexOf(b.key) > -1) return 3;
            if (['value'].indexOf(a.key) > -1) return -2;
            if (['value'].indexOf(b.key) > -1) return 2;
            return 0;
        }).sort(function(a,b){
            // Push columns with child/embedded object lists to the end.
            if (Array.isArray(a.childKeys)) return 1;
            if (Array.isArray(b.childKeys)) return -1;
            return 0;
        });
    }

    render(){
        var columnKeys = this.getColumnKeys();

        // If is an Item, grab properties for it.
        var tipsFromSchema = null;
        if (this.props.items[0] && this.props.items[0].display_title){
            tipsFromSchema = object.tipsFromSchema(Schemas.get(), this.props.items[0]);
            columnKeys = columnKeys.filter(function(k){
                if (['@id'].indexOf(k) > -1) return false;
                return true;
            });
        }

        var subListKeyWidths = this.subListKeyWidths;
        if (!subListKeyWidths){
            subListKeyWidths = this.subListKeyWidths = !this.state.mounted || !this.subListKeyRefs ? null : (function(refObj){
                var keys = _.keys(refObj);
                var widthObj = {};
                for (var i = 0; i < keys.length; i++){
                    widthObj[keys[i]] = _.object(_.pairs(refObj[keys[i]]).map(function(refSet){
                        //var colKey = refSet[1].getAttribute('data-key');
                        var colRows = Array.from(document.getElementsByClassName('child-column-' + keys[i] + '.' + refSet[0]));
                        var maxWidth = Math.max(
                            _.reduce(colRows, function(m,v){ return Math.max(m,v.offsetWidth); }, 0),
                            refSet[1].offsetWidth + 10
                        );
                        return [ refSet[0], maxWidth /*refSet[1].offsetWidth*/ ];
                    }));
                }
                return widthObj;
            })(this.subListKeyRefs);
        }

        var rowData = _.map(
            this.props.items,
            (item)=>{
                return _.map(columnKeys, (colKeyContainer, colKeyIndex)=>{
                    var colKey = colKeyContainer.key;
                    var value = object.getNestedProperty(item, colKey);
                    if (!value) return { 'value' : '-', 'key' : colKey };
                    if (typeof this.props.columnDefinitions[this.props.parentKey + '.' + colKey] !== 'undefined'){
                        if (typeof this.props.columnDefinitions[this.props.parentKey + '.' + colKey].render === 'function'){
                            return {
                                'value' : this.props.columnDefinitions[this.props.parentKey + '.' + colKey].render(value, item, colKeyIndex, this.props.items),
                                'colKey' : colKey
                            };
                        }
                    }
                    if (Array.isArray(value)){
                        if (typeof value[0] === 'string') return { 'value' : value.map(function(v){ return Schemas.Term.toName(colKey, v); }).join(', '), 'key' : colKey };
                        if (value[0] && typeof value[0] === 'object' && Array.isArray(colKeyContainer.childKeys)){ // Embedded list of objects.
                            var allKeys = colKeyContainer.childKeys; //_.keys(  _.reduce(value, function(m,v){ return _.extend(m,v); }, {})   );
                            return {
                                'value' : value.map((embeddedRow, i)=>{
                                    return (
                                        <div style={{ whiteSpace: "nowrap" }} className="text-left child-list-row" key={colKey + '--row-' + i}>
                                            <div className="inline-block child-list-row-number">{ i + 1 }.</div>
                                            { allKeys.map((k, j)=>{
                                                var renderedSubVal;// = Schemas.Term.toName(k, embeddedRow[k]);
                                                if (typeof this.props.columnDefinitions[this.props.parentKey + '.' + colKey + '.' + k] !== 'undefined'){
                                                    if (typeof this.props.columnDefinitions[this.props.parentKey + '.' + colKey + '.' + k].render === 'function'){
                                                        renderedSubVal = this.props.columnDefinitions[this.props.parentKey + '.' + colKey + '.' + k].render(embeddedRow[k], embeddedRow, colKeyIndex, value);
                                                    }
                                                }
                                                if (!renderedSubVal) {
                                                    renderedSubVal = object.itemUtil.isAnItem(embeddedRow[k]) ?
                                                        <a href={object.itemUtil.atId(embeddedRow[k])}>{ object.itemUtil.getTitleStringFromContext(embeddedRow[k]) }</a>
                                                        :
                                                        Schemas.Term.toName(k, embeddedRow[k]);
                                                }
                                                return (
                                                    <div
                                                        key={colKey + '.' + k + '--row-' + i}
                                                        className={"inline-block child-column-" + colKey + '.' + k}
                                                        style={{ width : !subListKeyWidths ? null : ((subListKeyWidths[colKey] || {})[k] || null) }}
                                                    >
                                                        { renderedSubVal }
                                                    </div>
                                                );
                                            }) }
                                        </div>
                                    );
                                }),
                                'className' : 'child-list-row-container',
                                'key' : colKey
                            };
                        }
                    }
                    if (object.isAnItem(value)) {
                        return { 'value' : <a href={object.atIdFromObject(value)}>{ value.display_title }</a>, 'key' : colKey };
                    }
                    if (typeof value === 'string' && value.length < 25) {
                        return { 'value' : Schemas.Term.toName(colKey, value), 'className' : 'no-word-break', 'key' : colKey };
                    }
                    return { 'value' : Schemas.Term.toName(colKey, value), 'key' : colKey };
                });
            }
        );

        // Get property of parent key which has items.properties : { ..these_keys.. }
        var parentKeySchemaProperty = Schemas.Field.getSchemaProperty(
            this.props.parentKey, Schemas.get(), this.props.atType
        );

        var keyTitleDescriptionMap = _.extend(
            {},
            // We have list of sub-embedded Items or sub-embedded objects which have separate 'get properties from schema' funcs (== tipsFromSchema || parentKeySchemaProperty).
            Schemas.flattenSchemaPropertyToColumnDefinition(tipsFromSchema || parentKeySchemaProperty),
            this.props.columnDefinitions
        );

        var subListKeyRefs = this.subListKeyRefs = {};

        return (
            <div className="detail-embedded-table-container">
                <table className="detail-embedded-table">
                    <thead>
                        <tr>{
                            [<th key="rowNumber" style={{ minWidth: 36, maxWidth : 36, width: 36 }}>#</th>].concat(columnKeys.map((colKeyContainer, colIndex)=>{
                                //var tips = object.tipsFromSchema(Schemas.get(), context) || {};
                                var colKey = colKeyContainer.key;

                                var title = (
                                    (keyTitleDescriptionMap[this.props.parentKey + '.' + colKey] && keyTitleDescriptionMap[this.props.parentKey + '.' + colKey].title) ||
                                    (keyTitleDescriptionMap[colKey] && keyTitleDescriptionMap[colKey].title) ||
                                    colKey
                                );

                                var tooltip = (
                                    (keyTitleDescriptionMap[this.props.parentKey + '.' + colKey] && keyTitleDescriptionMap[this.props.parentKey + '.' + colKey].description) ||
                                    (keyTitleDescriptionMap[colKey] && keyTitleDescriptionMap[colKey].description) ||
                                    null
                                );

                                var hasChildren = Array.isArray(colKeyContainer.childKeys) && colKeyContainer.childKeys.length > 0;

                                return (
                                    <th key={"header-for-" + colKey} className={hasChildren ? 'has-children' : null}>
                                        <object.TooltipInfoIconContainer title={title} tooltip={tooltip}/>
                                        {
                                            hasChildren ? (()=>{
                                                //var subKeyTitleDescriptionMap = (((this.props.keyTitleDescriptionMap || {})[this.props.parentKey] || {}).items || {}).properties || {};
                                                //var subKeyTitleDescriptionMap = keyTitleDescriptionMap[this.props.parentKey + '.' + colKey] || keyTitleDescriptionMap[colKey] || {};
                                                var subKeyTitleDescriptionMap = (( (keyTitleDescriptionMap[this.props.parentKey + '.' + colKey] || keyTitleDescriptionMap[colKey]) || {}).items || {}).properties || {};
                                                subListKeyRefs[colKey] = {};
                                                return (
                                                    <div style={{ whiteSpace: "nowrap" }} className="sub-list-keys-header">{
                                                        [<div key="sub-header-rowNumber" className="inline-block child-list-row-number">&nbsp;</div>].concat(colKeyContainer.childKeys.map((ck)=>{
                                                            return (
                                                                <div key={"sub-header-for-" + colKey + '.' + ck} className="inline-block" data-key={colKey + '.' + ck} ref={function(r){
                                                                    if (r) subListKeyRefs[colKey][ck] = r;
                                                                }} style={{ 'width' : !subListKeyWidths ? null : ((subListKeyWidths[colKey] || {})[ck] || null) }}>
                                                                    <object.TooltipInfoIconContainer
                                                                        title={(keyTitleDescriptionMap[this.props.parentKey + '.' + colKey + '.' + ck] || subKeyTitleDescriptionMap[ck] || {}).title || ck}
                                                                        tooltip={(keyTitleDescriptionMap[this.props.parentKey + '.' + colKey + '.' + ck] || subKeyTitleDescriptionMap[ck] || {}).description || null}
                                                                    />
                                                                </div>
                                                            );
                                                        }))
                                                    }</div>
                                                );
                                            })()
                                            :
                                            null
                                        }
                                    </th>
                                );
                            }))
                        }</tr>
                    </thead>
                    <tbody>{
                        rowData.map(function(row,i){

                            function jsonify(val, key){
                                var newVal;
                                try {
                                    newVal = JSON.stringify(val);
                                    if (_.keys(val).length > 1){
                                        console.error("ERROR: Value for table cell is not a string, number, or JSX element.\nKey: " + key + '; Value: ' + newVal);
                                    }
                                    newVal = <code>{ newVal.length <= 25 ? newVal : newVal.slice(0,25) + '...' }</code>;
                                } catch (e){
                                    console.error(e, val);
                                    newVal = <em>{'{obj}'}</em>;
                                }
                                return newVal;
                            }

                            return (
                                <tr key={"row-" + i}>{
                                    [<td key="rowNumber">{ i + 1 }.</td>].concat(row.map(function(colVal, j){
                                        var val = colVal.value;
                                        if ((colVal.key === 'link_id' || colVal.key === '@id') && val.slice(0,1) === '/') {
                                            val = <a href={val}>{ val }</a>;
                                        }
                                        if (val && typeof val === 'object' && !React.isValidElement(val) && !Array.isArray(val)) {
                                            val = jsonify(val, columnKeys[j].key);
                                        }
                                        if (Array.isArray(val) && val.length > 0 && !React.isValidElement(val[0])){
                                            val = _.map(val, jsonify);
                                        }
                                        return (
                                            <td key={("column-for-" + columnKeys[j].key)} className={colVal.className || null}>
                                                { val }
                                            </td>
                                        );
                                    }))
                                }</tr>
                            );
                        })
                    }</tbody>
                </table>
            </div>
        );
    }

}


class DetailRow extends React.Component {

    constructor(props){
        super(props);
        this.handleToggle = this.handleToggle.bind(this);
        this.render = this.render.bind(this);
        this.state = { 'isOpen' : false };
    }

    /**
     * Handler for rendered title element. Toggles visiblity of Subview.
     *
     * @param {React.SyntheticEvent} e - Mouse click event. Its preventDefault() method is called.
     * @returns {Object} 'isOpen' : false
     */
    handleToggle (e, id = null) {
        e.preventDefault();
        this.setState({
            isOpen: !this.state.isOpen,
        });
    }

    render(){
        var value = Detail.formValue(
            this.props.item,
            this.props.popLink,
            this.props['data-key'],
            this.props.itemType,
            this.props.columnDefinitions
        );
        var label = this.props.label;
        if (this.props.labelNumber) {
            label = (
                <span>
                    <span className={"label-number right inline-block" + (this.state.isOpen ? ' active' : '')}><span className="number-icon text-200">#</span> { this.props.labelNumber }</span>
                    { label }
                </span>
            );
        }

        if (value.type === SubItem) {
            // What we have here is an embedded object of some sort. Lets override its 'isOpen' & 'onToggle' functions.
            value = React.cloneElement(value, { onToggle : this.handleToggle, isOpen : this.state.isOpen });

            return (
                <div>
                    <PartialList.Row label={label} children={value} className={(this.props.className || '') + (this.state.isOpen ? ' open' : '')} />
                    <SubItemListView
                        popLink={this.props.popLink}
                        content={this.props.item}
                        schemas={this.props.schemas}
                        columnDefinitions={this.props.columnDefinitions}
                        isOpen={this.state.isOpen}
                    />
                </div>
            );
        }

        if (value.type === "ol" && value.props.children[0] && value.props.children[0].type === "li" &&
            value.props.children[0].props.children && value.props.children[0].props.children.type === SubItem) {
            // What we have here is a list of embedded objects. Render them out recursively and adjust some styles.
            return (
                <div className="array-group" data-length={this.props.item.length}>
                { React.Children.map(value.props.children, (c, i)=>
                    <DetailRow
                        {...this.props}
                        label={
                            i === 0 ? label : <span className="dim-duplicate">{ label }</span>
                        }
                        labelNumber={i + 1}
                        className={
                            ("array-group-row item-index-" + i) +
                            (i === this.props.item.length - 1 ? ' last-item' : '') +
                            (i === 0 ? ' first-item' : '')
                        }
                        item={this.props.item[i]}
                    />
                ) }
                </div>
            );
        }
        // Default / Pass-Thru
        return <PartialList.Row label={label} children={value} className={(this.props.className || '') + (this.state.isOpen ? ' open' : '')} />;
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
     * @returns {JSX.Element} <div> element with a tooltip and info-circle icon.
     */
    static formKey(tips, key, includeTooltip = true){
        var tooltip = null;
        var title = null;
        if (tips[key]){
            var info = tips[key];
            if (info.title)         title = info.title;
            if (!includeTooltip)    return title;
            if (info.description)   tooltip = info.description;
        }

        return <object.TooltipInfoIconContainer title={title || key} tooltip={tooltip} />;
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
    static formValue(item, popLink = false, keyPrefix = '', atType = 'ExperimentSet', columnDefinitions, depth = 0) {
        var schemas = Schemas.get();
        if (item === null){
            return <span>No Value</span>;
        } else if (Array.isArray(item)) {

            if (keyPrefix === 'files_in_set'){
                return (
                    <FilesInSetTable.Small files={item}/>
                );
            }

            if (SubItemTable.shouldUseTable(item)) {
                return <SubItemTable items={item} popLink={popLink} columnDefinitions={columnDefinitions} parentKey={keyPrefix} atType={atType} />;
            }

            return (
                <ol>
                    {   item.length === 0 ? <li><em>None</em></li>
                        :
                        item.map(function(it, i){
                            return <li key={i}>{ Detail.formValue(it, popLink, keyPrefix, atType, columnDefinitions, depth + 1) }</li>;
                        })
                    }
                </ol>
            );
        } else if (typeof item === 'object' && item !== null) {
            var title = object.itemUtil.getTitleStringFromContext(item);

            // if the following is true, we have an embedded object without significant other data
            if (item.display_title && (typeof item.link_id === 'string' || typeof item['@id'] === 'string') && _.keys(item).length < 4){
                //var format_id = item.link_id.replace(/~/g, "/");
                var link = object.atIdFromObject(item);
                if(popLink){
                    return (
                        <a href={link} target="_blank">
                            {title}
                        </a>
                    );
                } else {
                    return (
                        <a href={link}>
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
                        columnDefinitions={columnDefinitions}
                    />
                );
            }
        } else if (typeof item === 'string'){
            if (keyPrefix === '@id' || keyPrefix === 'link_id'){
                var href = (keyPrefix === 'link_id' ? item.replace(/~/g, "/") : item);
                if(popLink){
                    return (
                        <a key={item} href={href} target="_blank">
                            {href}
                        </a>
                    );
                }else{
                    return (
                        <a key={item} href={href}>
                            {href}
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
            } else {
                return <span>{ Schemas.Term.toName(keyPrefix, item) }</span>;
            }
        } else if (typeof item === 'number'){
            return <span>{ Schemas.Term.toName(keyPrefix, item) }</span>;
        }
        return(<span>{ item }</span>); // Fallback
    }

    static SubItem = SubItem

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'columnDefinitions' : PropTypes.object
    }

    static defaultColumnDefinitions = {
        '@id' : {
            'title' : 'Link',
            'description' : 'Link to Item'
        },
        'link_id' : {
            'title' : 'Link',
            'description' : 'Link to Item',
        },
        'subscriptions.url' : {
            'render' : function(value){
                var fullUrl = '/search/' + value;
                return <a href={fullUrl}>View Results</a>;
            },
            'title' : "Link",
            'description' : "Link to results matching subscription query."
        },
        'subscriptions.title' : {
            'title' : "Subscription",
            'description' : "Title of Subscription"
        },
        'experiment_sets.experimentset_type' : {
            'title' : "Type",
            'description' : "Experiment Set Type"
        },
        'display_title' : {
            'title' : "Title",
            'description' : "Title of Item",
            'hide' : function(valueProbe){
                if (!valueProbe || !valueProbe.display_title) return true;
                if (valueProbe.accession && valueProbe.accession === valueProbe.display_title) return true;
                return false;
            }
        },
        'email' : {
            'title' : "E-Mail",
            'render' : function(value){
                if (typeof value === 'string' && value.indexOf('@') > -1) {
                    return <a href={'mailto:' + value}>{ value }</a>;
                }
                return value;
            }
        }
    }

    static defaultProps = {
        'excludedKeys' : [
            '@context', 'actions', 'audit', 'principals_allowed',
            // Visible elsewhere on page
            'lab', 'award', 'description',
            '@id', 'link_id', 'display_title'
        ],
        'stickyKeys' : [
            'display_title', 'title',
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
            'end_date', 'project', 'uri', 'ID',
            // Document
            'attachment',
            // Things to go at bottom consistently
            'aliases',
            'link_id', // In case is not excluded, should probably be near top (transformed to clickable link)
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

        var colDefsFromSchema = Schemas.flattenSchemaPropertyToColumnDefinition(schemas ? object.tipsFromSchema(schemas, context) : {});
        var columnDefinitions = _.extend(colDefsFromSchema, this.props.columnDefinitions || Detail.defaultColumnDefinitions || {});

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
                    <DetailRow key={key} label={Detail.formKey(columnDefinitions,key)} item={context[key]} popLink={popLink} data-key={key} itemType={context['@type'] && context['@type'][0]} columnDefinitions={columnDefinitions}/>
                )}
                collapsible={ collapsibleKeys.map((key,i) =>
                    <PartialList.Row key={key} label={Detail.formKey(columnDefinitions,key)}>
                        { Detail.formValue(
                            context[key],
                            popLink,
                            key,
                            context['@type'] && context['@type'][0],
                            columnDefinitions
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

    static getTabObject(context, schemas = null){
        return {
            tab : <span><i className="icon icon-list-ul icon-fw"/> Details</span>,
            key : 'details',
            content : (
                <div>
                    <h3 className="tab-section-title">
                        <span>Details</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider mb-05"/>
                    <ItemDetailList context={context} schemas={schemas} />
                </div>
            )
        };
    }

    static defaultProps = {
        'showJSONButton' : true,
        'columnDefinitions' : Detail.defaultColumnDefinitions
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

    buttonsRow(){
        if (!this.props.showJSONButton){
            return (
                <div className="row">
                    <div className="col-xs-12">{ this.seeMoreButton() }</div>
                </div>
            );
        }
        return (
            <div className="row">
                <div className="col-xs-6">{ this.seeMoreButton() }</div>
                <div className="col-xs-6">{ this.toggleJSONButton() }</div>
            </div>
        );
    }

    render(){
        var collapsed;
        if (typeof this.props.collapsed === 'boolean') collapsed = this.props.collapsed;
        else collapsed = this.state.collapsed;

        var columnDefinitions = _.extend({}, this.props.keyTitleDescriptionMap || {}, this.props.columnDefinitions || {});

        return (
            <div className="item-page-detail" style={typeof this.props.minHeight === 'number' ? { minHeight : this.props.minHeight } : null}>
                { !this.state.showingJSON ?
                    <div className="overflow-hidden">
                        <Detail
                            context={this.props.context}
                            schemas={this.props.schemas}
                            popLink={this.props.popLink}
                            open={!collapsed}
                            columnDefinitions={columnDefinitions}
                            excludedKeys={this.props.excludedKeys || Detail.defaultProps.excludedKeys}
                            stickyKeys={this.props.stickyKeys || Detail.defaultProps.stickyKeys}
                        />
                        { this.buttonsRow() }
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
