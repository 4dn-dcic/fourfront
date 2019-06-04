'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Collapse, Popover, OverlayTrigger } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import { console, object } from'./../../util';


export function groupByMultiple(objList, propertiesList){

    var maxDepth = (propertiesList || []).length - 1;

    return (function doGroup(list, depth){
        var groupedLists = _.groupBy(list, propertiesList[depth]);
        if (depth < maxDepth){
            _.keys(groupedLists).forEach(function(k){
                groupedLists[k] = doGroup(groupedLists[k], depth + 1);
            });
        }
        return groupedLists;
    })(objList, 0);

}

/**
 * Taken from https://stackoverflow.com/questions/15298912/javascript-generating-combinations-from-n-arrays-with-m-elements
  */
export function cartesian() {
    var r = [], arg = arguments, max = arg.length-1;
    function helper(arr, i) {
        for (var j=0, l=arg[i].length; j<l; j++) {
            var a = arr.slice(0); // clone arr
            a.push(arg[i][j]);
            if (i==max)
                r.push(a);
            else
                helper(a, i+1);
        }
    }
    helper([], 0);
    return r;
}

export function extendListObjectsWithIndex(objList){
    return _.map(objList || [], function(o, idx){
        return _.extend({ 'index' : idx }, o);
    });
}

export function sumPropertyFromList(objList, property){
    function getCount(num){
        try {
            var n = parseInt(num);
            if (isNaN(n)) return 0;
            return n;
        } catch (e){
            return 0;
        }
    }

    if (Array.isArray(objList)) {
        return _.reduce(objList, function(m,v){
            return m + getCount(object.getNestedProperty(v, property));
        }, 0);
    } else {
        throw new Error('Not an array');
    }
}



export class StackedBlockVisual extends React.PureComponent {

    static defaultProps = {
        'groupingProperties' : ['grant_type', 'center_name',  'lab_name'],
        'columnGrouping' : null,
        'blockHeight' : 28,
        'blockVerticalSpacing' : 2,
        'blockHorizontalSpacing' : 2,
        'duplicateHeaders' : true,
        'collapseToMatrix' : false,
        // @param data may be either Array (if multiple grouped into 1) or object.
        'showGroupingPropertyTitles' : false,
        'checkCollapsibility' : false,
        'blockClassName' : function(data){

            var isMultipleClass = 'single-set';

            if (Array.isArray(data)) {
                if (data.length > 1) {
                    isMultipleClass = 'multiple-sets';
                } else {
                    isMultipleClass = 'single-set';
                }
            }

            return isMultipleClass;
        },
        'blockTooltipContents' : function(data, groupingTitle, groupingPropertyTitle, props){


            var tip = null;

            if (Array.isArray(data) && data.length === 1) data = data[0];

            if (props.title){
                tip = '<h5 style="min-width: 300px;">';
                tip += props.title;
                tip += '</h5>';
            } else if (groupingPropertyTitle){
                tip = '<h5>';
                tip += '<span class="text-300">' + groupingPropertyTitle + (groupingTitle ? ':' : '') + '</span>';
                if (groupingTitle) tip += ' ' + groupingTitle;
                tip += '</h5>';
            } else {
                // Single planned exp set
                tip = '';
            }

            if (!Array.isArray(data)){
                if (tip && tip.length > 0){
                    tip += '<hr class="mb-1 mt-1"/>';
                } else {
                    tip = '';
                }
                tip += '<div style="min-width: 300px;">';
                tip += StackedBlockVisual.writeTipPropertiesFromJSONObject(_.omit(data, 'index'), props);
                tip += '</div>';
            } else {
                if (tip && tip.length > 0){
                    tip += '<hr class="mb-1 mt-1"/>';
                } else {
                    tip = '';
                }

                tip += '<h5 class="text-500 mb-05">' + data.length + ' Sets</h5>';
            }

            return tip;
        },
        'blockRenderedContents' : function(data, groupingTitle, groupingPropertyTitle){
            var count = 0;
            if (Array.isArray(data)) {
                count = data.length;
            } else if (data) {
                count = 1;
            }
            if (count > 100){
                return <span style={{ 'fontSize' : '0.95rem', 'position' : 'relative', 'top' : -1 }}>{ count }</span>;
            }
            return <span>{ count }</span>;

        },
        'groupValue' : function(data, groupingTitle, groupingPropertyTitle){
            return StackedBlockVisual.Row.flattenChildBlocks(data).length;
        }
    };

    static minColumnWidth(props){
        return (props.blockHeight + (props.blockHorizontalSpacing * 2)) + 1;
    }

    static writeTipPropertiesFromJSONObject(d, props){
        var out = '';

        _.forEach(_.keys(d), function(property){
            var val = d[property];
            if (!val) return;

            var boldIt = (
                (props.groupingProperties && props.groupingProperties.indexOf(property) > -1) ||
                (props.columnGrouping && props.columnGrouping === property)
            );

            out += '<div class="row">';

            out += '<div class="col-xs-6">';
            out += '<div class="text-500 text-ellipsis-container text-right">' + ((props.titleMap && props.titleMap[property]) || property) + (val ? ':' : '') + '</div>';
            out += '</div>';

            if (val){
                out += '<div class="col-xs-6">';
                out += ' ';
                if (boldIt) out += '<b>';
                out += val;
                if (boldIt) out += '</b>';
                out += '</div>';
            }

            out += '</div>';
        });

        return out;
    }

    static generatePopoverRowsFromJSON(d, props){
        var out = [];

        _.forEach(_.keys(d), function(property){
            var val = d[property];
            if (!val) return;

            var boldIt = (
                (props.groupingProperties && props.groupingProperties.indexOf(property) > -1) ||
                (props.columnGrouping && props.columnGrouping === property)
            );

            if (typeof val === 'object'){
                if (object.isAnItem(val)) {
                    val = object.itemUtil.generateLink(val, true, property);
                } else if (val.props && val.type) {
                    // Do nothing.
                } else {
                    val = <code>{ JSON.stringify(val) }</code>;
                }
            }

            var rowElem = (
                <div className="row popover-entry mb-07" key={property}>
                    <div className="col-xs-5 col-md-4">
                        <div className="text-500 text-ellipsis-continer text-right">
                            { ((props.titleMap && props.titleMap[property]) || property) + (val ? ':' : '') }
                        </div>
                    </div>
                    <div className={"col-xs-7 col-md-8" + (boldIt ? ' text-600' : '')}>{ val }</div>
                </div>
            );

            out.push(rowElem);
        });

        return out;
    }

    static aggregateObjectFromList(dataList, keysToShow, skipParsingKeys=null){

        if (!keysToShow) keysToShow = _.keys(dataList[0]);

        var moreData = _.reduce(
            dataList,
            function(m, o){
                var i, currKey;
                for (i = 0; i < keysToShow.length; i++){
                    currKey = keysToShow[i];
                    if (typeof o[currKey] === 'number'){
                        if (m[currKey] === null){
                            m[currKey] = 0;
                        }
                        m[currKey] += o[currKey];
                    } else {
                        if (m[currKey] === null){
                            m[currKey] = new Set();
                        }
                        m[currKey].add(o[currKey]);
                    }
                }
                return m;
            },
            _.object(_.zip(keysToShow, [].fill.call({ 'length' : keysToShow.length }, null, 0, keysToShow.length)))
        );

        _.forEach(_.keys(moreData), function(k){
            if (typeof moreData[k] === 'number'){ // Already handled above
                return;
            }
            moreData[k] = _.filter(Array.from(moreData[k]));
            if (moreData[k].length === 0){
                delete moreData[k];
            } else if (moreData[k].length > 1){
                if (skipParsingKeys && skipParsingKeys.indexOf(k) > -1){
                    return;
                }
                var showLength = 5,
                    remainingLength = moreData[k].length - showLength;

                if (_.any(moreData[k], function(md){ return md && typeof md === 'object'; })){
                    if (!_.every(moreData[k], object.itemUtil.isAnItem)) {
                        moreData[k] = <span className="text-600">({ moreData[k].length } <span className="text-400">Objects</span>)</span>;
                        return;
                    }
                    moreData[k] = _.uniq(moreData[k], false, object.itemUtil.atId);
                    if (moreData[k].length === 1) {
                        moreData[k] = moreData[k][0];
                        return;
                    }
                    var itemLinks = _.map(_.filter(moreData[k], function(md){ return md && typeof md === 'object' && md.display_title; }), object.itemUtil.generateLink);
                    if (itemLinks && itemLinks.length > 0) remainingLength = itemLinks.length - showLength;
                    moreData[k] = (
                        <div>
                            <span className="text-600">({ itemLinks.length || moreData[k].length } <span className="text-400">Objects</span>)</span>
                            <ol>
                                { _.map(itemLinks.slice(0,showLength), (v,i)=> <li key={i}>{ v }</li> ) }
                            </ol>
                            { remainingLength > 0 ? <div className="more-items-count"> and { remainingLength } more...</div> : null }
                        </div>
                    );
                    return;
                }

                moreData[k] = (
                    <div>
                        <ol>
                            { _.map(moreData[k].slice(0, showLength), (v,i)=> <li key={i}>{ v }</li> ) }
                        </ol>
                        { remainingLength > 0 ? <div className="more-items-count"> and { remainingLength } more...</div> : null }
                    </div>
                );

            } else {
                moreData[k] = moreData[k][0];
            }
        });

        return moreData;

    }

    constructor(props){
        super(props);
        this.renderContents = this.renderContents.bind(this);

        var state = {
            'mounted' : true
        };

        /*
        var maxCollapsibleDepth = props.groupingProperties.length - 1;
        var unique_open_keys = [];

        _.forEach(props.groupingProperties.slice(0, maxCollapsibleDepth), function(property){
            var values = _.uniq(_.pluck(props.data, property));
            unique_open_keys.push(values);
        });

        var unique_open_keys_full = unique_open_keys[0].slice(0);

        for (var sliceEnd = 2; sliceEnd <= maxCollapsibleDepth; sliceEnd++){
            unique_open_keys_full = unique_open_keys_full.concat(_.map(cartesian.apply(cartesian, unique_open_keys.slice(0, sliceEnd)), function(keySet){
                return keySet.join('~');
            }));
        }

        _.forEach(unique_open_keys_full, function(comboKey){
            if (props && Array.isArray(props.defaultOpenKeys) && props.defaultOpenKeys.indexOf(comboKey) > -1) {
                state['open_' + comboKey] = true;
            } else {
                state['open_' + comboKey] = false;
            }
        });
        */

        this.state = state;
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    componentWillUnmount(){
        this.setState({ 'mounted' : false });
    }

    render(){
        return (
            <div className={"stacked-block-viz-container" + (this.props.duplicateHeaders ? ' with-duplicated-headers' : '')}>
                { this.renderContents() }
            </div>
        );
    }

    renderContents(){
        if (!this.state || !this.state.mounted) return null;
        var { data, titleMap, groupingProperties, columnGrouping } = this.props;

        data = extendListObjectsWithIndex(data);

        var nestedData = groupByMultiple( data, groupingProperties ); // { 'Grant1' : { Lab1: { PI1: [...], PI2: [...] }, Lab2: {} } }
        var columnGroups = null;
        if (typeof columnGrouping === 'string'){
            columnGroups = _.groupBy(data, columnGrouping);
            if (_.keys(columnGroups) < 2) {
                columnGroups = null;
            } else {
                _.keys(columnGroups).forEach(function(k){
                    columnGroups[k] = _.pluck(columnGroups[k], 'index');
                });
            }
        }

        if (!Array.isArray(nestedData) && nestedData) {
            var leftAxisKeys = _.keys(nestedData);
            leftAxisKeys.sort();
            return _.map(leftAxisKeys, (k, idx)=>{
                return <StackedBlockGroupedRow {...this.props} groupedDataIndices={columnGroups} parentState={this.state} data={nestedData[k]} key={k} group={k} depth={0} index={idx} toggleGroupingOpen={this.toggleGroupingOpen} />;
            });
        } else {
            // TODO: Render ... plain blocks w/o left column?
        }

    }

}

export class StackedBlockGroupedRow extends React.PureComponent {

    static flattenChildBlocks(groups){
        if (Array.isArray(groups)) return groups;
        return _.reduce(_.pairs(groups), function(m, pair){
            if (Array.isArray(pair[1])) return m.concat(pair[1]);
            else return m.concat(StackedBlockGroupedRow.flattenChildBlocks(pair[1]));
        }, []);
    }

    static sortByArray(array1, arrayToSortBy){

        var o = _.object(
            _.map(array1, function(k){ return [k, true]; })
        );

        var orderedList = [];
        for (var i = 0; i < arrayToSortBy.length; i++){
            if (arrayToSortBy[i] && o[arrayToSortBy[i]]){
                orderedList.push(arrayToSortBy[i]);
                delete o[arrayToSortBy[i]];
            }
        }

        return orderedList.concat( _.keys(o)); // Incl remaining keys.
    }

    static collapsedChildBlocks(data, props){

        var allChildBlocksPerChildGroup = null,
            allChildBlocks = null;

        if (Array.isArray(data)){
            allChildBlocks = data;
        } else {
            allChildBlocks = StackedBlockGroupedRow.flattenChildBlocks(data);
        }

        if (typeof props.columnSubGrouping !== 'string' && !Array.isArray(data)) {
            allChildBlocksPerChildGroup = _.map(_.pairs(data), function(pair){
                return [pair[0], StackedBlockGroupedRow.flattenChildBlocks(pair[1])];
            });
            //console.log('TESTING COLLAPSE', data, allChildBlocksPerChildGroup)
        }

        //console.log('ALLCHILDBLOCKS', data, allChildBlocksPerChildGroup, allChildBlocks, props)

        var commonProps = _.pick(props, 'blockHeight', 'blockHorizontalSpacing', 'blockVerticalSpacing',
                'groupingProperties', 'depth', 'titleMap', 'blockClassName', 'blockRenderedContents',
                'blockTooltipContents', 'groupedDataIndices', 'headerColumnsOrder', 'columnGrouping', 'blockPopover'),
            width = (props.blockHeight + (props.blockHorizontalSpacing * 2)) + 1,
            containerGroupStyle = {
                'width'         : width, // Width for each column
                'minWidth'      : width,
                'minHeight'     : props.blockHeight + props.blockVerticalSpacing,               // Height for each row
                'paddingLeft'   : props.blockHorizontalSpacing,
                'paddingRight'  : props.blockHorizontalSpacing,
                'paddingTop'    : props.blockVerticalSpacing
            },
            inner                   = null,
            groupedDataIndicesPairs = (props.groupedDataIndices && _.pairs(props.groupedDataIndices)) || [],
            blocksByColumnGroup,
            columnKeys;


        if (groupedDataIndicesPairs.length > 0){ // If columns exist, distribute these blocks by column! Otherwise (else statement @ end) we'll probably just stack em left-to-right.

            //console.log('TEsT',allChildBlocksPerChildGroup);

            if (allChildBlocksPerChildGroup){
                // Generate block per each child or child group when nothing else to regroup by.

                blocksByColumnGroup = _.object(_.map(groupedDataIndicesPairs, function(pair){
                    var listOfIndicesForGroup = pair[1];
                    return [
                        pair[0],
                        _.filter(_.map(allChildBlocksPerChildGroup, function(cPair){
                            if (Array.isArray(cPair[1])){
                                var res = _.filter(cPair[1], function(cBlock){ return listOfIndicesForGroup.indexOf(cBlock.index) > -1; });
                                if (res.length > 0) return [cPair[0], res];
                                if (res.length === 0) return null;
                            } else if (listOfIndicesForGroup.indexOf(cPair[1].index) > -1){
                                return [cPair[0], [cPair[1]]];
                            } else return null;
                        }), function(block){ return block !== null; })];
                }));

                //console.log('BLOCKSBYCOLGROUP', blocksByColumnGroup);

                columnKeys = _.keys(blocksByColumnGroup);
                if (Array.isArray(props.headerColumnsOrder)){
                    columnKeys = StackedBlockGroupedRow.sortByArray(columnKeys, props.headerColumnsOrder);
                }

                inner = _.map(columnKeys, function(k){
                    return (
                        <div className="block-container-group" style={containerGroupStyle}
                            key={k} data-group-key={k}
                            children={_.map(blocksByColumnGroup[k], ([ key, blockData ],i) =>
                                <StackedBlock key={key || i} {...commonProps} data={blockData} title={key} />
                            )} />
                    );
                });

            } else {

                blocksByColumnGroup = _.object(_.map(groupedDataIndicesPairs, function([ columnKey, listOfIndicesForGroup ]){
                    return [
                        columnKey,
                        _.filter(_.map(allChildBlocks, function(blockData){
                            if (listOfIndicesForGroup.indexOf(blockData.index) > -1){
                                return blockData;
                            } else {
                                return null;
                            }
                        }), function(block){ return block !== null; })];
                }));

                columnKeys = _.keys(blocksByColumnGroup);
                if (Array.isArray(props.headerColumnsOrder)){
                    columnKeys = StackedBlockGroupedRow.sortByArray(columnKeys, props.headerColumnsOrder);
                }

                inner = _.map(columnKeys, function(k){
                    var blocksForGroup = blocksByColumnGroup[k];

                    //console.log('BFG-1', blocksForGroup);

                    // If we have columnSubGrouping (we should, if we reached this comment, b/c otherwise we do the allChildBlocksPerGroup clause), we group these into smaller blocks/groups.
                    if (typeof props.columnSubGrouping === 'string' && props.depth <= (props.groupingProperties.length - 1)){
                        blocksForGroup = _.pairs(_.groupBy(blocksForGroup, props.columnSubGrouping));
                        if (Array.isArray(props.columnSubGroupingOrder)){
                            var blocksForGroupObj = _.object(blocksForGroup);
                            var blocksForGroupObjKeys = StackedBlockGroupedRow.sortByArray(_.keys(blocksForGroupObj), props.columnSubGroupingOrder);
                            blocksForGroup = _.map(blocksForGroupObjKeys, function(bk){ return [bk, blocksForGroupObj[bk]]; });
                        }
                    }

                    //console.log('BFG-2', blocksForGroup);
                    return (
                        <div className="block-container-group" style={containerGroupStyle}
                            key={k} data-block-count={blocksForGroup.length} data-group-key={k}>
                            { blocksForGroup.map(function(blockData, i){
                                var title = k;
                                var parentGrouping = (props.titleMap && props.titleMap[props.groupingProperties[props.depth - 1]]) || null;
                                var subGrouping = (props.titleMap && props.titleMap[props.columnSubGrouping]) || null;
                                if (Array.isArray(blockData)) {
                                    // We have columnSubGrouping so these are -pairs- of (0) columnSubGrouping val, (1) blocks
                                    title = blockData[0];
                                    blockData = blockData[1];
                                } else if (typeof props.columnSubGrouping === 'string') {
                                    title = object.getNestedProperty(blockData, props.columnSubGrouping);
                                }
                                return <StackedBlock key={title || i} {...commonProps} {...{ title, parentGrouping, subGrouping }} data={blockData} />;
                            }) }
                        </div>
                    );
                });

            }
        } else {
            inner = _.map(allChildBlocks, ([ key, data ]) => <StackedBlock {...commonProps} {...{ key, data }} title={key} />);
        }

        return <div className="blocks-container" style={{ 'minHeight' : containerGroupStyle.minHeight }} children={inner}/>;
    }

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        var initOpen = (Array.isArray(props.defaultDepthsOpen) && props.defaultDepthsOpen[props.depth]) || false;
        this.state = { 'open' : initOpen };
    }

    childBlocksCollapsed(){
        return StackedBlockGroupedRow.collapsedChildBlocks(this.props.data, this.props);
    }

    toggleOpen(){
        this.setState(function({ open }){
            return { "open" : !open };
        });
    }

    render(){
        var { groupingProperties, depth, titleMap, group, blockHeight, blockVerticalSpacing, blockHorizontalSpacing, data, groupValue,
            groupedDataIndices, index, duplicateHeaders, showGroupingPropertyTitles, checkCollapsibility } = this.props;
        var groupingPropertyTitle = null;
        if (Array.isArray(groupingProperties) && groupingProperties[depth]){
            groupingPropertyTitle = titleMap[groupingProperties[depth]] || groupingProperties[depth];
        }

        var isOpen = this.state.open;
        var className = "grouping depth-" + depth + (isOpen ? ' open' : '') + (duplicateHeaders && depth === 0 ? ' with-duplicated-headers' : '') + (' row-index-' + index) + (!showGroupingPropertyTitles ? ' no-grouping-property-titles' : '');
        var toggleIcon = null;

        var childRowsKeys = !Array.isArray(data) ? _.keys(data).sort() : null;

        var hasIdentifiableChildren = !checkCollapsibility ? true : (depth + 2 >= groupingProperties.length) && childRowsKeys && childRowsKeys.length > 0 && !(childRowsKeys.length === 1 && childRowsKeys[0] === 'No value');

        if (!Array.isArray(data) && data && hasIdentifiableChildren){
            toggleIcon = <i className={"icon icon-fw icon-" + (isOpen ? 'minus' : 'plus')} />;
            className += ' may-collapse';
        } else {
            toggleIcon = <i className={"icon icon-fw"} />;
        }

        var totalCount = null;
        if (depth === 0 && groupValue && typeof groupValue === 'function'){
            totalCount = groupValue(data, group, groupingPropertyTitle);
        }

        var header = null;
        if (depth === 0 && groupedDataIndices && ((isOpen && duplicateHeaders) || index === 0)){
            var minColumnWidth = StackedBlockVisual.minColumnWidth(this.props);
            var headerItemStyle = { 'width' : minColumnWidth, 'minWidth' : minColumnWidth };

            var columnKeys = _.keys(groupedDataIndices);
            if (Array.isArray(this.props.headerColumnsOrder)){
                columnKeys = StackedBlockGroupedRow.sortByArray(columnKeys, this.props.headerColumnsOrder);
            }
            header = (
                <div className="header-for-viz">
                    { columnKeys.map(function(k){
                        return (
                            <div key={k} className="column-group-header" style={headerItemStyle}>
                                <div className="inner">
                                    <span>{ k }</span>
                                </div>
                            </div>
                        );
                    }) }
                </div>
            );
        }

        var blockHeightFull = blockHeight + blockVerticalSpacing,
            rowHeight       = blockHeight + (blockVerticalSpacing * 2) + 1,
            partRowHeight   = parseInt(rowHeight / 3),
            childBlocks     = !isOpen ? this.childBlocksCollapsed() : <div className="open-empty-placeholder" style={{ 'marginTop' : partRowHeight, 'height' : rowHeight - partRowHeight, 'marginLeft' : blockHorizontalSpacing }}/>,
            maxBlocksInRow  = childBlocks && Math.max.apply(Math.max, _.pluck(_.pluck((childBlocks && childBlocks.props && childBlocks.props.children) || [], 'props'), 'data-block-count'));


        return (
            <div className={className} data-max-blocks-vertical={maxBlocksInRow}>
                <div className="row grouping-row">
                    <div className="col col-xs-4 label-section" style={depth === 0 && index === 0 ? { 'paddingTop' : Math.max(0, (isOpen ? 95 : 135) - rowHeight) } : null}>
                        <div className="label-container" style={{ 'minHeight' : rowHeight }}>
                            { groupingPropertyTitle && showGroupingPropertyTitles ?
                                <small className="text-400 mb-0 mt-0">{ groupingPropertyTitle }</small>
                            : null }
                            <h4 className="text-ellipsis-container"
                                data-tip={group && typeof group === 'string' && group.length > 20 ? group : null}
                                onClick={toggleIcon && hasIdentifiableChildren ? this.toggleOpen : null}>
                                { toggleIcon }{ group }
                            </h4>
                        </div>
                        {/* this.childLabels() */}
                    </div>
                    <div className={"col col-xs-8 list-section" + (header ? ' has-header' : '')}>
                        { header }
                        { childBlocks }
                    </div>
                </div>

                { isOpen && toggleIcon && depth > 0 ?
                    <div className="close-button" onClick={this.toggleOpen} children={toggleIcon}/>
                : null }

                <div className="child-blocks">
                    { isOpen && childRowsKeys && _.map(childRowsKeys, (k)=>
                        <StackedBlockGroupedRow {...this.props} data={data[k]} key={k} group={k} depth={depth + 1} />
                    ) }
                </div>

            </div>
        );
    }

}


export class StackedBlock extends React.PureComponent {

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render(){
        var { blockHeight, blockVerticalSpacing, blockHorizontalSpacing, data, title, groupingProperties, parentGrouping, depth, titleMap, blockClassName, blockRenderedContents, blockTooltipContents, blockPopover } = this.props;

        if (!title && data && !Array.isArray(data)){
            title = data[groupingProperties[depth]];
        }

        var groupingPropertyTitle;
        if (Array.isArray(data)){
            groupingPropertyTitle = titleMap[groupingProperties[depth + 1]] || groupingProperties[depth + 1];
        } else {
            groupingPropertyTitle = titleMap[groupingProperties[depth]] || groupingProperties[depth];
        }


        var style = {
            'height' : blockHeight,
            'width' : blockHeight,
            'lineHeight' : blockHeight + 'px',
            'marginBottom' : blockVerticalSpacing
        };

        var blockFxnArguments = [data, title, groupingPropertyTitle, this.props, parentGrouping];

        var className = "stacked-block";
        if (typeof blockClassName === 'function'){
            className += ' ' + blockClassName.apply(blockClassName, blockFxnArguments);
        } else if (typeof blockClassName === 'string'){
            className += ' ' + blockClassName;
        }

        var contents = ( <span>&nbsp;</span> );
        if (typeof blockRenderedContents === 'function'){
            contents = blockRenderedContents.apply(blockRenderedContents, blockFxnArguments);
        }

        var tip = null;
        if (typeof blockTooltipContents === 'function'){
            tip = blockTooltipContents.apply(blockTooltipContents, blockFxnArguments);
        }

        var popover = null;
        if (typeof blockPopover === 'function'){
            popover = blockPopover.apply(blockPopover, blockFxnArguments);
        }

        var blockElem = <div className={className} style={style} data-tip={tip} tabIndex={1} data-place="bottom" data-html>{ contents }</div>;

        if (popover){
            return (
                <OverlayTrigger trigger="click" placement="bottom" overlay={popover} children={blockElem} rootClose />
            );
        }

        return blockElem;
    }

}


StackedBlockVisual.Row = StackedBlockGroupedRow;
