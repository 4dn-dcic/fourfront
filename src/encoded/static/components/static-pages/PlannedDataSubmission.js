'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object } from'./../util';
import * as plansData from './../testdata/stacked-block-matrix-list';
import { Collapse } from 'react-bootstrap';
import * as store from '../../store';
import * as globals from './../globals';
import StaticPage from './StaticPage';
import * as d3 from 'd3';
import ReactTooltip from 'react-tooltip';



/**************
 * 
 * TODO LATER: 
 * Move these utility functions to (probably) util/object.js, since they are generic transforms of JSON lists of objects and should be re-used if possible (rather than new ones created later).
 * 
 ************/



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


export default class PlannedSubmissionsPage extends React.Component {

    static propTypes = {
        "context" : PropTypes.shape({

        }).isRequired
    }


    /**
     * The render function. Renders homepage contents.
     * @returns {Element} A React <div> element.
     */
    render() {
        var c = this.props.context.content; // Content
        var groupingProperties = ['grant_type', 'center_name',  'lab_name'];
        var columnGrouping = 'experiment_category',
            columnSubGrouping = 'experiment_type';
        var headerColumnsOrder = [
            'Hi-C',
            'ChIA-PET',
            'Capture-Hi-C',
            'single cell omics',
            'other omics',
            'DNA-FISH',
            'SRM',
            'live cell imaging',
            'other imaging',
            'proteomics'
        ];

        

        // Filter out properties from objects which we don't want to be shown in tooltip.
        var keysToInclude = [
            'grant_type','center_name', 'lab_name',
            'experiment_category', 'experiment_type', 'data_type',
            'reference_publication', 'experiments_expected_2017', 'experiments_expected_2020', 'additional_comments', 'in_production_stage_standardized_protocol',
        ];

        var listOfObjectsToVisualize = _.map(plansData.list, function(o){
            return _.pick(o, ...keysToInclude);
        });


        return ( 
            <StaticPage.Wrapper>
                <StackedBlockVisual
                    data={listOfObjectsToVisualize}
                    titleMap={plansData.titleMap}
                    groupingProperties={groupingProperties}
                    columnGrouping={columnGrouping}
                    headerColumnsOrder={headerColumnsOrder}
                    columnSubGrouping={columnSubGrouping}
                    blockTooltipContents={function(data, groupingTitle, groupingPropertyTitle, props){

                        var keysToShow = ['center_name', 'lab_name', 'experiments_expected_2017', 'experiments_expected_2020', 'in_production_stage_standardized_protocol', 'additional_comments'];
                        var filteredData = data;
                        if (!Array.isArray(data)){
                            filteredData = _.pick(data, ...keysToShow);
                        } else {
                            filteredData = _.map(data, function(o){ return _.pick(o, ...keysToShow); });
                        }

                        var tips = StackedBlockVisual.defaultProps.blockTooltipContents(filteredData, groupingTitle, groupingPropertyTitle, props);
                        
                        if (Array.isArray(data) && data.length > 1){

                            var moreData = _.reduce(filteredData, function(m, o){
                                for (var i = 0; i < keysToShow.length; i++){
                                    if (m[keysToShow[i]] === null){
                                        m[keysToShow[i]] = new Set();
                                    }
                                    m[keysToShow[i]].add(o[keysToShow[i]]);
                                }
                                return m;
                            }, _.object(_.zip(keysToShow, [].fill.call({ length : keysToShow.length }, null, 0, keysToShow.length))) );

                            _.forEach(_.keys(moreData), function(k){
                                if (k === 'additional_comments'){
                                    delete moreData[k]; // Don't show when multiple, too long.
                                    return;
                                }
                                moreData[k] = Array.from(moreData[k]);
                                if (moreData[k].length === 0){
                                    delete moreData[k];
                                } else if (moreData[k].length > 1){
                                    moreData[k] = '<span class="text-300">(' + moreData[k].length + ')</span> ' + moreData[k].join(', ');
                                } else {
                                    moreData[k] = moreData[k][0];
                                }
                            });

                            tips += StackedBlockVisual.writeTipPropertiesFromJSONObject(moreData, props);

                        }
                        
                        return tips;

                    }}
                />
            </StaticPage.Wrapper>
        );
    }

}

globals.content_views.register(PlannedSubmissionsPage, 'Planned-submissionsPage');



export class StackedBlockVisual extends React.Component {

    static defaultProps = {
        'groupingProperties' : ['grant_type', 'center_name',  'lab_name'],
        'columnGrouping' : null,
        'blockHeight' : 35,
        'blockVerticalSpacing' : 5,
        'blockHorizontalSpacing' : 5,
        // @param data may be either Array (if multiple grouped into 1) or object.
        'blockClassName' : function(data){

            // Figure out if we are submitted, planned, or N/A.
            function checkDataObjForProduction(d){
                if (typeof d.in_production_stage_standardized_protocol === 'string'){
                    var checkStr = d.in_production_stage_standardized_protocol.toLowerCase();
                    if (checkStr === 'yes' || checkStr === 'true'){
                        return true;
                    }
                }
                return false;
            }

            var statusClass = '';
            var isMultipleClass = '';

            if (Array.isArray(data)) {
                if (data.length > 1) { 
                    isMultipleClass = 'multiple-sets';
                } else {
                    isMultipleClass = 'single-set';
                }
                if (_.any(data, checkDataObjForProduction)) statusClass = 'production';
            } else if (data && checkDataObjForProduction(data)) {
                isMultipleClass = 'single-set';
                statusClass = 'production';
            }

            return [statusClass, isMultipleClass].join(' ');
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

            var defaultOutput = <span>&nbsp;</span>;
            var experimentsCountExpected = 0;

            function getCount(num){
                try {
                    var n = parseInt(num);
                    if (isNaN(n)) return 0;
                    return n;
                } catch (e){
                    return 0;
                }
            }

            if (Array.isArray(data)) {
                experimentsCountExpected = sumPropertyFromList(data, 'experiments_expected_2017');
            } else if (data) {
                experimentsCountExpected = getCount(data.experiments_expected_2017);
            }

            return experimentsCountExpected || defaultOutput;

        },
        'groupValue' : function(data, groupingTitle, groupingPropertyTitle){
            return sumPropertyFromList(StackedBlockGroupedRow.flattenChildBlocks(data), 'experiments_expected_2017');
        }
    }

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

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        //this.toggleGroupingOpen = this.toggleGroupingOpen.bind(this);
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
            <div className="stacked-block-viz-container" ref="container">
                { this.renderContents(this.refs && this.refs.container && this.refs.container.offsetWidth) }
            </div>
        );
    }

    renderContents(width){
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
            return _.keys(nestedData).map((k, idx)=>{
                return <StackedBlockGroupedRow {...this.props} groupedDataIndices={columnGroups} parentState={this.state} data={nestedData[k]} key={k} group={k} width={width} depth={0} index={idx} toggleGroupingOpen={this.toggleGroupingOpen} />;
            });
        } else {
            // TODO: Render ... plain blocks w/o left column?
        }
        
    }

}

export class StackedBlockGroupedRow extends React.Component {

    static flattenChildBlocks(groups){
        if (Array.isArray(groups)) return groups;
        return _.reduce(_.pairs(groups), function(m, pair){
            if (Array.isArray(pair[1])) return m.concat(pair[1]);
            else return m.concat(StackedBlockGroupedRow.flattenChildBlocks(pair[1]));
        }, []);
    }

    static  sortByArray(array1, arrayToSortBy){

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

    static collapsedChildBlocks(data, props, widthAvailable){

        var allChildBlocksPerChildGroup = null;
        var allChildBlocks = null;

        if (Array.isArray(data)){
            allChildBlocks = data;
        } else {
            allChildBlocks = StackedBlockGroupedRow.flattenChildBlocks(data);
        }
        
        if (typeof props.columnSubGrouping !== 'string') {
            allChildBlocksPerChildGroup = _.map(_.pairs(data), function(pair){
                return [pair[0], StackedBlockGroupedRow.flattenChildBlocks(pair[1])];
            });
        }
        
        var commonProps = _.pick(props, 'blockHeight', 'blockHorizontalSpacing', 'blockVerticalSpacing',
            'groupingProperties', 'depth', 'titleMap', 'blockClassName', 'blockRenderedContents',
            'blockTooltipContents', 'groupedDataIndices', 'headerColumnsOrder', 'columnGrouping');

        var inner = null;
        var groupedDataIndicesPairs = (props.groupedDataIndices && _.pairs(props.groupedDataIndices)) || [];

        /*if (Array.isArray(data)){
            inner = allChildBlocksPerChildGroup.map(function(pair){
                return (
                    <StackedBlock {...commonProps} data={pair[1]} title={pair[0]} />
                );
            });
        } else */
        if (groupedDataIndicesPairs.length > 1){ // If columns exist, distribute these blocks by column! Otherwise (else statement @ end) we'll probably just stack em left-to-right.

            var blocksByColumnGroup, columnKeys, widthPerColumn = (props.blockHeight + (props.blockHorizontalSpacing * 2)) + 1;

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
                            } else {
                                if (listOfIndicesForGroup.indexOf(cPair[1].index) > -1){
                                    return [cPair[0], [cPair[1]]];
                                } else {
                                    return null;
                                }
                            }
                        }), function(block){ return block !== null; })];
                }));

                columnKeys = _.keys(blocksByColumnGroup);
                if (Array.isArray(props.headerColumnsOrder)){
                    columnKeys = StackedBlockGroupedRow.sortByArray(columnKeys, props.headerColumnsOrder);
                }

                inner = columnKeys.map(function(k){
                    return (
                        <div
                            className="block-container-group"
                            style={{ 
                                width : widthPerColumn,
                                minHeight : props.blockHeight + (props.blockVerticalSpacing),
                                paddingLeft : props.blockHorizontalSpacing,
                                paddingRight : props.blockHorizontalSpacing,
                                paddingTop : props.blockVerticalSpacing
                            }}
                            key={k}
                            data-group-key={k}
                        >
                            { blocksByColumnGroup[k].map((pairs)=> <StackedBlock {...commonProps} data={pairs[1]} title={pairs[0]} /> ) }
                        </div>
                    );
                });
            } else {

                blocksByColumnGroup = _.object(_.map(groupedDataIndicesPairs, function(pair){
                    var listOfIndicesForGroup = pair[1];
                    return [
                        pair[0],
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

                inner = columnKeys.map(function(k){
                    var blocksForGroup = blocksByColumnGroup[k];
                    
                    // If we have columnSubGrouping (we should, if we reached this comment, b/c otherwise we do the allChildBlocksPerGroup clause), we group these into smaller blocks/groups.
                    if (typeof props.columnSubGrouping === 'string' && props.depth < (props.groupingProperties.length - 1)){
                        blocksForGroup = _.pairs(_.groupBy(blocksForGroup, props.columnSubGrouping));
                    }
                    return (
                        <div
                            className="block-container-group"
                            style={{ 
                                width : widthPerColumn,
                                minHeight : props.blockHeight + (props.blockVerticalSpacing),
                                paddingLeft : props.blockHorizontalSpacing,
                                paddingRight : props.blockHorizontalSpacing,
                                paddingTop : props.blockVerticalSpacing
                            }}
                            key={k}
                            data-group-key={k}
                        >
                            { blocksForGroup.map(function(blockData, i){
                                var title = k;
                                if (Array.isArray(blockData)) {
                                    // We have columnSubGrouping so these are -pairs- of (0) columnSubGrouping val, (1) blocks
                                    title = ((props.titleMap && props.titleMap[props.columnSubGrouping] && '<span class="text-300">' + props.titleMap[props.columnSubGrouping] + '<i class="icon icon-fw icon-angle-right"></i></span>') || '') + blockData[0];
                                    blockData = blockData[1];
                                } else if (typeof props.columnSubGrouping === 'string') {
                                    title = ((props.titleMap && props.titleMap[props.columnSubGrouping] && '<span class="text-300">' + props.titleMap[props.columnSubGrouping] + '<i class="icon icon-fw icon-angle-right"></i></span>') || '') + object.getNestedProperty(blockData, props.columnSubGrouping);
                                }
                                return <StackedBlock key={i} {...commonProps} data={blockData} title={title} />;
                            }) }
                        </div>
                    );
                });

            }
        } else {
            inner = allChildBlocks.map((pair)=> <StackedBlock {...commonProps} data={pair[1]} title={pair[0]} /> );
        }


        return (
            <div className="blocks-container" style={{ 'minHeight' : props.blockHeight + props.blockVerticalSpacing }}>
                { inner }
            </div>
        );
    }

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = { 'open' : false };
    }

    childBlocksCollapsed(widthAvailable = null){
        return StackedBlockGroupedRow.collapsedChildBlocks(this.props.data, this.props, widthAvailable);
    }

    toggleOpen(){
        this.setState({ open : !this.state.open });
    }

    render(){
        var { groupingProperties, depth, titleMap, group, blockHeight, blockVerticalSpacing, data, groupValue, groupedDataIndices, index } = this.props;
        var groupingPropertyTitle = null;
        if (Array.isArray(groupingProperties) && groupingProperties[depth]){
            groupingPropertyTitle = titleMap[groupingProperties[depth]] || groupingProperties[depth];
        }

        var isOpen = this.state.open;
        var className = "grouping depth-" + depth + (depth === 0 ? ' mb-1' : '') + (isOpen ? ' open' : '');
        var toggleIcon = null;
        if (!Array.isArray(data)) toggleIcon = <i className={"icon icon-fw icon-" + (isOpen ? 'minus' : 'plus')} />;
        if (toggleIcon){
            className += ' may-collapse';
        }
        
        var totalCount = null;
        if (depth === 0 && groupValue && typeof groupValue === 'function'){
            totalCount = groupValue(data, group, groupingPropertyTitle);
        }

        var widthAvailable = this.props.widthAvailable;
        if (!widthAvailable) {
            widthAvailable = (this.refs.listSection && this.refs.listSection.offsetWidth) || null;
            if (typeof widthAvailable === 'number' && !isNaN(widthAvailable) && widthAvailable) {
                widthAvailable -= 20;
            }
        }


        var header = null;
        if (depth === 0 && groupedDataIndices){
            var minColumnWidth = StackedBlockVisual.minColumnWidth(this.props);
            var headerItemStyle = { 'width' : minColumnWidth };

            var columnKeys = _.keys(groupedDataIndices);
            if (Array.isArray(this.props.headerColumnsOrder)){
                columnKeys = StackedBlockGroupedRow.sortByArray(columnKeys, this.props.headerColumnsOrder);
            }
            header = (
                <div className="header-for-viz">
                    { columnKeys.map(function(k){
                        return (
                            <div className="column-group-header" style={headerItemStyle}>
                                <div className="inner">
                                    <span>{ k }</span>
                                </div>
                            </div>
                        );
                    }) }
                </div>
            );
        }
        

        return (
            <div className={className}>

                <div className="row">
                    <div className="col col-sm-4 label-section" style={{ minHeight : blockHeight + blockVerticalSpacing }}>
                        { groupingPropertyTitle ? <small className="text-400 mb-0 mt-0">{ groupingPropertyTitle }</small> : null }
                        <h4 className="text-500">
                            <span onClick={toggleIcon ? this.toggleOpen : null}>{ toggleIcon } { group }</span>
                        </h4>
                        {/* this.childLabels() */}
                    </div>
                    <div className="col col-sm-8 list-section" ref="listSection">
                        { !isOpen && index === 0 ? header : null }
                        {
                            !isOpen ? this.childBlocksCollapsed(widthAvailable) : header /*<div className="group-value" style={{ lineHeight : blockHeight + 'px' }}>{ totalCount }</div>*/
                        }
                    </div>
                </div>

                { isOpen && toggleIcon && depth > 0 ?
                <div className="close-button" onClick={this.toggleOpen}>
                    { toggleIcon }
                </div>
                : null }

                <div className="child-blocks">
                    { isOpen && !Array.isArray(data) ? _.keys(data).map((k)=> <StackedBlockGroupedRow {...this.props} data={data[k]} key={k} group={k} depth={depth + 1} widthAvailable={widthAvailable} /> ) : null }
                </div>
                
            </div>
        );
    }

}


export class StackedBlock extends React.Component {

    componentDidMount(){
        ReactTooltip.rebuild();

    }

    render(){
        var { blockHeight, blockVerticalSpacing, blockHorizontalSpacing, data, title, groupingProperties, depth, titleMap, blockClassName, blockRenderedContents, blockTooltipContents } = this.props;

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
            "lineHeight" : blockHeight + 'px',
            //'marginRight' : blockHorizontalSpacing,
            'marginBottom' : blockVerticalSpacing
        };

        var blockFxnArguments = [data, title, groupingPropertyTitle, this.props];

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

        return <div className={className} style={style} data-tip={tip} data-place="bottom" data-html>{ contents }</div>;
    }

} 
