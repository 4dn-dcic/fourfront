'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Collapse, Button } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import { console, object, Schemas, typedefs } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { PartialList } from './PartialList';
import { FilesInSetTable } from './FilesInSetTable';
import JSONTree from 'react-json-tree';

var { Item } = typedefs;



/**
 * This file/component is kind of a mess.
 *
 * @module
 * @todo
 * For any major-ish future work, we should replace this with an
 * off-the-shelf NPM JSON-LD renderer (if any) and just wrap it with
 * our own simple 'prop-feeder' component.
 */


/**
 * Contains and toggles visibility/mounting of a Subview. Renders title for the Subview.
 */
class SubItemTitle extends React.Component {

    static propTypes = {
        'onToggle' : PropTypes.func,
        'isOpen' : PropTypes.bool,
        'title' : PropTypes.string,
        'content' : PropTypes.object
    };

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    componentDidUpdate(pastProps){
        if (!pastProps.isOpen && this.props.isOpen){
            ReactTooltip.rebuild();
        }
    }

    /**
     * @returns {JSX.Element} React Span element containing expandable link, and maybe open panel below it.
     */
    render() {
        var { isOpen, title, onToggle, countProperties, content } = this.props;
        var iconType = isOpen ? 'icon-minus' : 'icon-plus';
        var subtitle = null;
        if (typeof title !== 'string' || title.toLowerCase() === 'no title found'){
            title = isOpen ? "Collapse" : "Expand";
        }
        if (content && _.any([content.title, content.display_title, content.name], function(p){ return typeof p === 'string'; })) {
            subtitle = (
                <span className="text-600">
                    {
                        typeof content.title === 'string' ? content.title :
                            typeof content.display_title === 'string' ? content.display_title : content.name
                    }
                </span>
            );
        }
        return (
            <span className="subitem-toggle">
                <span className="link" onClick={onToggle}>
                    <i style={{'color':'black', 'paddingRight': 10, 'paddingLeft' : 5}} className={"icon " + iconType}/>
                    { title } { subtitle } { countProperties && !isOpen ? <span>({ countProperties })</span> : null }
                </span>
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
        var item = this.props.content;
        var props = {
            'context' : item,
            'schemas' : this.props.schemas,
            'popLink' : this.props.popLink,
            'alwaysCollapsibleKeys' : [],
            'excludedKeys' : (this.props.excludedKeys || _.without(Detail.defaultProps.excludedKeys,
                // Remove
                    'audit', 'lab', 'award', 'description'
                ).concat([
                // Add
                    'schema_version', 'uuid'
                ])
            ),
            'columnDefinitions' : this.props.columnDefinitions || {},
            'showJSONButton' : false,
            'hideButtons': true

        };
        return (
            <div className="sub-panel data-display panel-body-with-header">
                <div className="key-value sub-descriptions">
                    { React.createElement((typeof item.display_title === 'string' ? ItemDetailList : Detail), props) }
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
        var schemaForType;

        if (_.any(list, function(x){ return typeof x === 'undefined'; })) return false;
        if (!_.all(list, function(x){ return typeof x === 'object' && x; })) return false;
        if (_.any(list, function(x){
            if (!Array.isArray(x['@type'])){
                return true; // No @type so we can't get 'columns' from schemas.
            } else {
                schemaForType = Schemas.getSchemaForItemType(x['@type'][0]);
                if (!schemaForType || !schemaForType.columns) return true; // No columns on this Item type's schema. Skip.
            }
        })) return false;

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
        this.state = { 'mounted' : false };
    }

    componentDidMount(){
        vizUtil.requestAnimationFrame(()=>{
            this.setState({ 'mounted' : true });
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
                if (k === 'display_title' || k === '@id' || k === 'accession') return true;
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
                if (k === '@id') return false;
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
                        if (_.all(value, function(v){ return typeof v === 'string'; })) return { 'value' : value.map(function(v){ return Schemas.Term.toName(colKey, v); }).join(', '), 'key' : colKey };
                        if (_.any(value, function(v){ return typeof v === 'object' && v; }) && Array.isArray(colKeyContainer.childKeys)){ // Embedded list of objects.
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
                                                if (!renderedSubVal && embeddedRow[k] && typeof embeddedRow[k] === 'object' && !object.isAnItem(embeddedRow[k])){
                                                    renderedSubVal = <code>{ JSON.stringify(embeddedRow[k]) }</code>;
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
                                        if (typeof val === 'boolean'){
                                            val = <code>{ val ? 'True' : 'False' }</code>;
                                        }
                                        if (colVal.key === '@id' && val.slice(0,1) === '/') {
                                            val = <a href={val}>{ val }</a>;
                                        }
                                        if (typeof val === 'string' && val.length > 50){
                                            val = val.slice(0,50) + '...';
                                        }
                                        if (val && typeof val === 'object' && !React.isValidElement(val) && !Array.isArray(val)) {
                                            val = jsonify(val, columnKeys[j].key);
                                        }
                                        if (Array.isArray(val) && val.length > 0 && !_.all(val, React.isValidElement) ){
                                            val = _.map(val, function(v,i){ return jsonify(v, columnKeys[j].key + ':' + i); });
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


class DetailRow extends React.PureComponent {

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
     * @returns {void}
     */
    handleToggle(e){
        e.preventDefault();
        this.setState(function({ isOpen }){
            return { 'isOpen' : !isOpen };
        });
    }

    render(){
        var { label, labelNumber, item, popLink, itemType, columnDefinitions, className, schemas } = this.props;
        var value = Detail.formValue(item, popLink, this.props['data-key'], itemType, columnDefinitions);
        if (labelNumber) {
            label = (
                <span>
                    <span className={"label-number right inline-block" + (this.state.isOpen ? ' active' : '')}><span className="number-icon text-200">#</span> { this.props.labelNumber }</span>
                    { label }
                </span>
            );
        }

        if (value.type === SubItemTitle) {
            // What we have here is an embedded object of some sort. Lets override its 'isOpen' & 'onToggle' functions.
            value = React.cloneElement(value, { 'onToggle' : this.handleToggle, 'isOpen' : this.state.isOpen });

            return (
                <div>
                    <PartialList.Row label={label} children={value} className={(className || '') + (this.state.isOpen ? ' open' : '')} />
                    <SubItemListView
                        popLink={popLink} content={item} schemas={schemas} isOpen={this.state.isOpen}
                        columnDefinitions={value.props.columnDefinitions || this.props.columnDefinitions} // Recursively pass these down
                    />
                </div>
            );
        }

        if (value.type === "ol" && value.props.children[0] && value.props.children[0].type === "li" &&
            value.props.children[0].props.children && value.props.children[0].props.children.type === SubItemTitle) {
            // What we have here is a list of embedded objects. Render them out recursively and adjust some styles.
            return (
                <div className="array-group" data-length={item.length}>
                { React.Children.map(value.props.children, (c, i)=>
                    <DetailRow
                        {...this.props} label={i === 0 ? label : <span className="dim-duplicate">{ label }</span>} labelNumber={i + 1} item={item[i]}
                        className={("array-group-row item-index-" + i) + (i === item.length - 1 ? ' last-item' : '') + (i === 0 ? ' first-item' : '')} />
                ) }
                </div>
            );
        }
        // Default / Pass-Thru
        return <PartialList.Row label={label} children={value} className={(className || '') + (this.state.isOpen ? ' open' : '')} />;
    }

}


/**
 * The list of properties contained within ItemDetailList.
 * Isolated to allow use without existing in ItemDetailList parent.
 *
 * @class Detail
 * @type {Component}
 */
export class Detail extends React.PureComponent {

    /**
     * Formats the correct display for each metadata field.
     *
     * @param {Object} tips - Mapping of field property names (1 level deep) to schema properties.
     * @param {string} key - Key to use to get 'description' for tooltip from the 'tips' param.
     * @param {boolean} [includeTooltip=false] - If false, skips adding tooltip to output JSX.
     * @returns {JSX.Element} <div> element with a tooltip and info-circle icon.
     */
    static formKey(tips, key, includeTooltip = true){
        var tooltip = null, title = null;
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
    * @param {Item} item - JSON of an Item.
    * @param {boolean} [popLink=false] - Whether to open child links in new window.
    * @param {string} keyPrefix - Not sure. Key to use to get value with?
    * @param {string} atType - Current type of Item.
    * @param {ColumnDefinition[]} columnDefinitions - List of column definitions to use for SubItemTable.
    * @param {number} depth - Current recursive depth.
    * @returns {JSX.Element}
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
            var linkElement = object.itemUtil.generateLink(item, true, 'display_title', { 'target' : (popLink ? '_blank' : null) }, true);

            // if the following is true, we have an embedded Item. Link to it.
            if (linkElement){
                return linkElement;
            } else { // it must be an embedded sub-object (not Item)
                var releventProperties = _.object(
                    _.map(_.filter(_.pairs(columnDefinitions), function(c){ return c[0].indexOf(keyPrefix + '.') === 0; }), function(c){ c[0] = c[0].replace(keyPrefix + '.', ''); return c; })
                );
                return (
                    <SubItemTitle
                        schemas={schemas}
                        content={item}
                        key={keyPrefix}
                        countProperties={_.keys(item).length}
                        popLink={popLink}
                        columnDefinitions={releventProperties}
                    />
                );
            }
        } else if (typeof item === 'string'){

            if (keyPrefix === '@id'){
                return <a key={item} href={item} target={popLink ? "_blank" : null}>{item}</a>;
            }

            if(item.charAt(0) === '/' && item.indexOf('@@download') > -1){
                // This is a download link. Format appropriately
                var split_item = item.split('/');
                var attach_title = decodeURIComponent(split_item[split_item.length-1]);
                return <a key={item} href={item} target="_blank" download rel="noreferrer noopener">{ attach_title || item }</a>;
            } else if (item.charAt(0) === '/') {
                if (popLink) return <a key={item} href={item} target="_blank" rel="noreferrer noopener">{ item }</a>;
                else return <a key={item} href={item}>{ item }</a>;
            } else if (item.slice(0,4) === 'http') {
                // Is a URL. Check if we should render it as a link/uri.
                var schemaProperty = Schemas.Field.getSchemaProperty(keyPrefix, schemas, atType);
                if (
                    schemaProperty &&
                    typeof schemaProperty.format === 'string' &&
                    ['uri','url'].indexOf(schemaProperty.format.toLowerCase()) > -1
                ) return <a key={item} href={item} target="_blank" rel="noreferrer noopener">{ item }</a>;
            } else {
                return <span>{ Schemas.Term.toName(keyPrefix, item) }</span>;
            }
        } else if (typeof item === 'number'){
            return <span>{ Schemas.Term.toName(keyPrefix, item) }</span>;
        } else if (typeof item === 'boolean'){
            return <span style={{ 'textTransform' : 'capitalize' }}>{ (item + '') }</span>;
        }
        return(<span>{ item }</span>); // Fallback
    }

    static SubItemTitle = SubItemTitle;

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'columnDefinitions' : PropTypes.object
    };

    static defaultColumnDefinitions = {
        '@id' : {
            'title' : 'Link',
            'description' : 'Link to Item'
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
    };

    static defaultProps = {
        'excludedKeys' : [
            '@context', 'actions', 'audit', 'principals_allowed',
            // Visible elsewhere on page
            'lab', 'award', 'description',
            '@id', 'display_title'
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
            // Experiment Type
            'experiment_category', 'assay_classification', 'assay_subclassification',
            'assay_subclass_short', 'sop', 'reference_pubs', 'raw_file_types',
            'controlled_term', 'other_protocols', 'other_tags',
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
        ],
        'alwaysCollapsibleKeys' : [
            '@type', 'accession', 'schema_version', 'uuid', 'replicate_exps', 'dbxrefs', 'status', 'external_references', 'date_created'
        ],
        'open' : null
    };

    static columnDefinitions = memoize(function(context, schemas, columnDefinitions){
        var colDefsFromSchema = Schemas.flattenSchemaPropertyToColumnDefinition(schemas ? object.tipsFromSchema(schemas, context) : {});
        return _.extend(colDefsFromSchema, columnDefinitions || Detail.defaultColumnDefinitions || {}); // { <property> : { 'title' : ..., 'description' : ... } }
    });

    static generatedKeysLists = memoize(function(context, excludedKeys, stickyKeys, alwaysCollapsibleKeys){
        const sortKeys = _.difference(_.keys(context).sort(), excludedKeys.sort());

        // Sort applicable persistent keys by original persistent keys sort order.
        const stickyKeysObj = _.object(
            _.intersection(sortKeys, stickyKeys.slice(0).sort()).map(function(key){
                return [key, true];
            })
        );
        var orderedStickyKeys = [];
        stickyKeys.forEach(function (key) {
            if (stickyKeysObj[key] === true) orderedStickyKeys.push(key);
        });

        var extraKeys = _.difference(sortKeys, stickyKeys.slice(0).sort());
        var collapsibleKeys = _.intersection(extraKeys.sort(), alwaysCollapsibleKeys.slice(0).sort());
        extraKeys = _.difference(extraKeys, collapsibleKeys);

        return {
            'persistentKeys' : orderedStickyKeys.concat(extraKeys),
            'collapsibleKeys' : collapsibleKeys
        };
    });

    constructor(props){
        super(props);
        this.renderDetailRow = this.renderDetailRow.bind(this);
    }

    renderDetailRow(key, idx){
        const { context, popLink, schemas, columnDefinitions } = this.props;
        const colDefs = Detail.columnDefinitions(context, schemas || Schemas.get(), columnDefinitions);

        return (
            <DetailRow key={key} label={Detail.formKey(colDefs, key)} item={context[key]} popLink={popLink}
                data-key={key} itemType={context['@type'] && context['@type'][0]} columnDefinitions={colDefs}/>
        );
    }

    render(){
        const { context, excludedKeys, stickyKeys, alwaysCollapsibleKeys, open } = this.props;
        const { persistentKeys, collapsibleKeys } = Detail.generatedKeysLists(context, excludedKeys, stickyKeys, alwaysCollapsibleKeys);
        return <PartialList persistent={_.map(persistentKeys, this.renderDetailRow)} collapsible={ _.map(collapsibleKeys, this.renderDetailRow)} open={open} />;
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

    static getTabObject(props){
        return {
            tab : <span><i className="icon icon-list icon-fw"/> Details</span>,
            key : 'details',
            content : (
                <div>
                    <h3 className="tab-section-title">
                        <span>Details</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider mb-05"/>
                    <ItemDetailList {...props} />
                </div>
            )
        };
    }

    static defaultProps = {
        'showJSONButton' : true,
        'hideButtons': false,
        'columnDefinitions' : Detail.defaultColumnDefinitions
    }

    constructor(props){
        super(props);
        this.handleToggleJSON = this.handleToggleJSON.bind(this);
        this.handleToggleCollapsed = this.handleToggleCollapsed.bind(this);
        this.seeMoreButton = this.seeMoreButton.bind(this);
        this.toggleJSONButton = this.toggleJSONButton.bind(this);
        this.state = {
            'collapsed' : true,
            'showingJSON' : false
        };
    }

    handleToggleJSON(){
        this.setState(function({ showingJSON }){
            return { "showingJSON" : !showingJSON };
        });
    }

    handleToggleCollapsed(){
        this.setState(function({ collapsed }){
            return { "collapsed" : !collapsed };
        });
    }

    seeMoreButton(){
        if (typeof this.props.collapsed === 'boolean') return null;
        return (
            <button type="button" className="item-page-detail-toggle-button btn btn-default btn-block" onClick={this.handleToggleCollapsed}>
                { this.state.collapsed ? "See advanced information" : "Hide" }
            </button>
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
            <button type="button" className="btn btn-block btn-default" onClick={this.handleToggleJSON}>
                { this.state.showingJSON ?
                    <span><i className="icon icon-fw icon-list"/> View as List</span>
                    :
                    <span><i className="icon icon-fw icon-code"/> View as JSON</span>
                }
            </button>
        );
    }

    buttonsRow(){
        const { hideButtons, showJSONButton } = this.props;
        if (hideButtons) return null;
        if (!showJSONButton){
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
        const { keyTitleDescriptionMap, columnDefinitions, minHeight, context, schemas, popLink, excludedKeys, stickyKeys } = this.props;
        var collapsed;
        if (typeof this.props.collapsed === 'boolean') collapsed = this.props.collapsed;
        else collapsed = this.state.collapsed;

        const colDefs = _.extend({}, keyTitleDescriptionMap || {}, columnDefinitions || {});

        return (
            <div className="item-page-detail" style={typeof minHeight === 'number' ? { minHeight } : null}>
                { !this.state.showingJSON ?
                    <div className="overflow-hidden">
                        <Detail context={context} schemas={schemas} popLink={popLink}
                            open={!collapsed} columnDefinitions={colDefs}
                            excludedKeys={excludedKeys || Detail.defaultProps.excludedKeys}
                            stickyKeys={stickyKeys || Detail.defaultProps.stickyKeys} />
                        { this.buttonsRow() }
                    </div>
                    :
                    <div className="overflow-hidden">
                        <div className="json-tree-wrapper">
                            <JSONTree data={context} />
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
