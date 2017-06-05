'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import Draggable from 'react-draggable';
import { Collapse, Fade } from 'react-bootstrap';
import { getTitleStringFromContext } from './../../item-pages/item';
import { Detail } from './../../item-pages/components';
import { isServerSide, Filters, navigate, object, layout, Schemas } from './../../util';

/** Defaults used for columnDefinitions for columns which are returned from back-end */
export const defaultSearchResultTableColumnWidthMap = {'lg' : 200, 'md' : 180, 'sm' : 150};

export function defaultColumnBlockRenderFxn(result, columnDefinition, props){
    var value = object.getNestedProperty(result, columnDefinition.field);
    if (!value) value = null;
    if (Array.isArray(value)){
        value = _.uniq(value).join(', ');
    }
    return value;
}

/**
 * Determine the typical column width, given current browser width. Defaults to large width if server-side.
 * @param {Object} [widthMap] - Map of integer sizes to use at 'lg', 'md', or 'sm' sizes.
 * @param {boolean} [mounted=true] - Whether component calling this function is mounted. If false, uses 'lg' to align with server-side render.
 * @returns {string|number} - Width for div column block to be used at current screen/browser size.
 */
export function searchResultTableColumnWidth(widthMap = defaultSearchResultTableColumnWidthMap, mounted=true){
    var responsiveGridSize;
    if (!mounted || isServerSide()) responsiveGridSize = 'lg';
    else responsiveGridSize = layout.responsiveGridState();
    
    if (responsiveGridSize === 'xs') return '100%'; // Mobile, stacking
    return widthMap[responsiveGridSize || 'lg'] || 250;
}

export const defaultItemColumns = { // In format as would be returned from back-end.
    'display_title' : "Title",
    'lab.display_title' : "Lab"
};

/** List of non-changing column definitions to always be present. */
export const constantSearchResultColumns = [
    {
        'title' : 'Title',
        'field' : 'display_title',
        'widthMap' : {'lg' : 250, 'md' : 200, 'sm' : 180},
        'render' : function(result, columnDefinition, props){
            var title = getTitleStringFromContext(result);
            var link = object.atIdFromObject(result);
            if (link){
                title = <a href={link || '#'}>{ title }</a>;
            }

            return (
                <span>
                    <div className="inline-block toggle-detail-button-container">
                        <button className="toggle-detail-button" onClick={props.toggleDetailOpen}>
                            <i className={"icon icon-fw icon-" + (props.detailOpen ? 'minus' : 'plus') }/>
                        </button>
                    </div>
                    <div className="title-block text-ellipsis-container">{ title }</div>
                </span>
            );
        }
    },
    {
        'title' : 'Type',
        'field' : '@type',
        //'widthMap' : {'lg' : 180, 'md' : 150, 'sm' : 100},
        'render' : function(result, columnDefinition, props){
            if (!Array.isArray(result['@type'])) return <em>N/A</em>;
            return Schemas.getItemTypeTitle(result);
        }
    },
    {
        'title' : 'Lab',
        'field' : 'lab',
        'render' : function(result, columnDefinition, props){
            var labItem = defaultColumnBlockRenderFxn(result, columnDefinition, props);
            if (!labItem) return null;
            var labLink = <a href={object.atIdFromObject(labItem)}>{ labItem.display_title }</a>;

            if (!result.submitted_by || !result.submitted_by.display_title){
                return labLink;
            }
            return (
                <span>
                    <i
                        className="icon icon-fw icon-user-o user-icon"
                        data-tip={'<small>Submitted by</small> ' + result.submitted_by.display_title}
                        data-html
                    />
                    { labLink }
                </span>
            );
        }
    }
];

/**
 * Convert a map of field:title to list of column definitions, setting defaults.
 * 
 * @param {Object.<string>} [columns={}] Map of field names to field/column titles, as returned from back-end.
 * @returns {Object[]} List of objects containing keys 'title', 'field', 'widthMap', and 'render'.
 */
export function columnsToColumnDefinitions(columns = {}){
    let newColDefs = _.pairs(columns).map(function(p){
        return {
            'title' : p[1],
            'field' : p[0]
        };
    }).filter(function(ncd){
        if (_.findWhere(constantSearchResultColumns, { 'field' : ncd.field })) return false;
        return true;
    });

    return constantSearchResultColumns.concat(newColDefs).map(function(cd){
        if (!cd.widthMap) cd.widthMap = defaultSearchResultTableColumnWidthMap;
        if (!cd.render) cd.render = defaultColumnBlockRenderFxn;
        return cd;
    });

}


class ResultRowColumnBlock extends React.Component {
    render(){
        var { result, columnDefinition, mounted } = this.props;
        var isDesktopClientside = !isServerSide() && layout.responsiveGridState() !== 'xs';
        var blockWidth = (
            (isDesktopClientside && this.props.headerColumnWidths[this.props.columnNumber]) || // See if have a manually set width first (else is 0)
            searchResultTableColumnWidth(columnDefinition.widthMap || defaultSearchResultTableColumnWidthMap, mounted)
        );

        var value = columnDefinition.render(result, columnDefinition, _.omit(this.props, 'columnDefinition', 'result'));
        // Ensure we have a valid React element to render. If not, try to detect if Item object, and generate link.
        // Else, let exception bubble up.
        if (typeof value !== 'string' && !React.isValidElement(value)){
            if (value && typeof value === 'object'){
                if (typeof value.display_title !== 'undefined'){
                    if (typeof value.link_id !== 'undefined' || typeof value['@id'] !== 'undefined'){
                        value = <a href={object.atIdFromObject(value)}>{ value.display_title }</a>;
                    } else {
                        value = value.display_title;
                    }
                }
            } else if (!value) { value = <span className="text-300">-</span>; }
        }
        return (
            <div className="search-result-column-block" style={{ width : blockWidth }} data-field={columnDefinition.field}>
                <div className="inner">{ value }</div>
            </div>
        );
    }
}


// Uses Detail from item-pages/components to provide item summary panel
class ResultDetail extends React.Component{

    static propTypes = {
        'result'    : PropTypes.object.isRequired,
        'popLink'   : PropTypes.bool.isRequired,
        'open'      : PropTypes.bool.isRequired
    }

    constructor(props){
        super(props);
    }

    render(){
        var result = this.props.result;
        return(
            <Collapse in={this.props.open}>
                <div className="result-table-detail">
                    {result.description ?
                        <div className="data-row flexible-description-box result-table-result-heading">
                            {result.description}
                        </div>
                        : null}
                    <div className="item-page-detail">
                        <h4 className="text-300">Details</h4>
                        <Detail context={result} open={false} popLink={this.props.popLink}/>
                    </div>
                </div>
            </Collapse>
        );
    }
}


class ResultRow extends React.Component {

    static fullRowWidth(columnDefinitions, mounted=true, dynamicWidths=null){
        return _.reduce(columnDefinitions, function(fw, colDef, i){
            var w;
            if (typeof colDef === 'number') w = colDef;
            else {
                if (Array.isArray(dynamicWidths) && dynamicWidths[i]) w = dynamicWidths[i];
                else w = searchResultTableColumnWidth(colDef.widthMap, mounted);
            }
            if (typeof w !== 'number') w = 0;
            return fw + w;
        }, 0);
    }

    static propTypes = {
        'result'            : PropTypes.shape({
            '@type'             : PropTypes.arrayOf(PropTypes.string).isRequired,
            '@id'               : PropTypes.string,
            'link_id'           : PropTypes.string,
            'lab'               : PropTypes.object,
            'display_title'     : PropTypes.string.isRequired,
            'status'            : PropTypes.string,
            'date_created'      : PropTypes.string.isRequired
        }).isRequired,
        'rowNumber'         : PropTypes.number.isRequired,
        'mounted'           : PropTypes.bool.isRequired,
        'columnDefinitions'     : PropTypes.arrayOf(PropTypes.shape({
            'title'             : PropTypes.string.isRequired,
            'field'             : PropTypes.string.isRequired,
            'render'            : PropTypes.func.isRequired,
            'widthMap'          : PropTypes.shape({
                'lg'                : PropTypes.number.isRequired,
                'md'                : PropTypes.number.isRequired,
                'sm'                : PropTypes.number.isRequired
            }).isRequired
        })).isRequired,
    }

    constructor(props){
        super(props);
        this.toggleDetailOpen = _.throttle(this.toggleDetailOpen.bind(this), 250);
        this.render = this.render.bind(this);
        this.state = {
            detailOpen : false
        };
    }

    toggleDetailOpen(){
        this.setState({ 'detailOpen' : !this.state.detailOpen });
    }

    render(){
        return (
            <div className={"search-result-row " + (this.state.detailOpen ? 'open' : 'closed')} data-row-number={this.props.rowNumber}>
                <div className="columns clearfix">
                { this.props.columnDefinitions.map((colDef, i) =>
                    <ResultRowColumnBlock
                        columnNumber={i}
                        rowNumber={this.props.rowNumber}
                        key={colDef.field}
                        columnDefinition={colDef}
                        result={this.props.result}
                        toggleDetailOpen={this.toggleDetailOpen}
                        detailOpen={this.state.detailOpen}
                        mounted={this.props.mounted}
                        headerColumnWidths={this.props.headerColumnWidths}
                    />
                ) }
                </div>
                <ResultDetail result={this.props.result} popLink={this.props.popLink} open={this.state.detailOpen} />
            </div>
        );
    }
}


class HeadersRow extends React.Component {

    static propTypes = {
        'columnDefinitions' : ResultRow.propTypes.columnDefinitions,
        'mounted' : PropTypes.bool.isRequired
    }

    constructor(props){
        super(props);
        this.throttledSetHeaderWidths = _.debounce(_.throttle(this.setHeaderWidths.bind(this), 1000), 350);
        this.setHeaderWidths = this.setHeaderWidths.bind(this);
        this.onAdjusterDrag = this.onAdjusterDrag.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            widths : props.headerColumnWidths.slice(0)
        };
    }

    setHeaderWidths(idx, evt, r){
        if (typeof this.props.setHeaderWidths !== 'function') throw new Error('props.setHeaderWidths not a function');
        this.props.setHeaderWidths(this.state.widths.slice(0));
    }

    getWidthFor(idx){
        return (
            this.state.widths[idx] ||
            this.props.headerColumnWidths[idx] ||
            searchResultTableColumnWidth(this.props.columnDefinitions[idx].widthMap, this.props.mounted)
        );
    }

    onAdjusterDrag(idx, evt, r){
        var widths = this.state.widths.slice(0);
        widths[idx] = Math.max( idx > 0 ? 30 : 120, r.x );
        this.setState({ 'widths' : widths }, this.throttledSetHeaderWidths);
    }

    render(){
        return (
            <div className="search-headers-row hidden-xs">
                <div className="columns clearfix">
                {
                    this.props.columnDefinitions.map((colDef, i)=>{
                        var w = this.getWidthFor(i);
                        return (
                            <div
                                data-field={colDef.field}
                                key={colDef.field}
                                className="search-headers-column-block"
                                style={{ width : w }}
                            >
                                <div className="inner">
                                    { colDef.title }
                                </div>
                                <Draggable position={{x:w,y:0}} axis="x" onDrag={this.onAdjusterDrag.bind(this, i)} onStop={this.setHeaderWidths.bind(this, i)}>
                                    <div className="width-adjuster"/>
                                </Draggable>
                            </div>
                        );
                    })
                }
                </div>
            </div>
        );
    }
}

class DimensioningContainer extends React.Component {

    //static headerWidths(columnDefinitions, mounted){
    //    return columnDefinitions.map((cd) => searchResultTableColumnWidth(cd.widthMap, mounted))
    //           .map(function(w){ if (typeof w !== 'number'){ return 0; } else { return w; } });
    //}

    static resetHeaderColumnWidths(length){
        return [].fill(0, 0, length);
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.setHeaderWidths = _.throttle(this.setHeaderWidths.bind(this), 300);
        this.render = this.render.bind(this);
        this.state = {
            'mounted' : false,
            'widths' : DimensioningContainer.resetHeaderColumnWidths(columnsToColumnDefinitions(props.columns).length)
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    setHeaderWidths(widths){
        if (!Array.isArray(widths)) throw new Error('widths is not an array');
        this.setState({ 'widths' : widths });
    }

    render(){
        var columnDefinitions = columnsToColumnDefinitions(this.props.columns);
        var fullRowWidth = ResultRow.fullRowWidth(columnDefinitions, this.state.mounted, this.state.widths);
        var responsiveGridSize = !isServerSide() && this.state.mounted && layout.responsiveGridState();

        return (
            <div className="search-results-container">
                {/*<Fade in={this.state.mounted}>*/}
                <div className="inner-container">
                    <div className="scrollable-container" style={{ minWidth : fullRowWidth + 25 }}>
                        { !responsiveGridSize || responsiveGridSize !== 'xs' ? 
                        <HeadersRow
                            columnDefinitions={columnDefinitions}
                            mounted={this.state.mounted}
                            headerColumnWidths={this.state.widths}
                            setHeaderWidths={this.setHeaderWidths}
                        />
                        : null }
                        { this.props.results.map((r, rowNumber)=>
                            <ResultRow
                                result={r}
                                rowNumber={rowNumber}
                                key={r['@id'] || r.link_id || rowNumber}
                                columnDefinitions={columnDefinitions}
                                rowWidth={fullRowWidth}
                                mounted={this.state.mounted}
                                headerColumnWidths={this.state.widths}
                            />
                        )}
                    </div>
                </div>
                {/*</Fade>*/}
            </div>
        );
    }

}


export class SearchResultTable extends React.Component {

    static propTypes = {
        'results' : PropTypes.arrayOf(ResultRow.propTypes.result).isRequired,
        'columns' : PropTypes.object
    }

    static defaultProps = {
        'columns' : {}
    }

    render(){
        return (
            <layout.WindowResizeUpdateTrigger>
                <DimensioningContainer {...this.props}/>
            </layout.WindowResizeUpdateTrigger>
        );
    }
}
