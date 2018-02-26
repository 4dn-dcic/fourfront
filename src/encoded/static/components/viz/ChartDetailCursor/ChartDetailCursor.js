'use strict';

import React from 'react';
import _ from 'underscore';
import * as d3 from 'd3';
import * as vizUtil from './../utilities';
import { barplot_color_cycler } from './../ColorCycler';
import { expFxn, Schemas, console, object, isServerSide } from './../../util';
import CursorComponent from './CursorComponent';
import { Button } from 'react-bootstrap';

/**
 * @ignore
 * @private
 */
var updateFxns    = { 'default' : null },
    resetFxns     = { 'default' : null },
    getStateFxns  = { 'default' : null },
    setCoordsFxns = { 'default' : null };

/**
 * A plain JS object which contains at least 'title' and 'function' properties.
 * These become transformed into buttons.
 * 
 * @typedef {Object} Action
 * @property {string} title - Title or text of the button to be shown.
 * @property {function} function - A function to be called when the button is pressed.
 * @property {string} bsStyle - Bootstrap color style to use for button. Optional.
 */


class Body extends React.Component {

    constructor(props){
        super(props);
        this.getCurrentCounts = this.getCurrentCounts.bind(this);
        this.renderActions = this.renderActions.bind(this);
        this.renderDetailSection = this.renderDetailSection.bind(this);
        this.primaryCount = this.primaryCount.bind(this);
        this.primaryCountLabel = this.primaryCountLabel.bind(this);
        this.render = this.render.bind(this);
    }

    getCurrentCounts(nodes = this.props.path){
        if (nodes.length < 1) return null;
        return ChartDetailCursor.getCounts(nodes[nodes.length - 1]);
    }

    /**
     * Under development.
     * 
     * @private
     * @instance
     * @returns {JSX.Element} React DIV element with .row class.
     */
    renderActions(){
        if (!this.props.sticky) return null;
        if (!Array.isArray(this.props.actions) || !this.props.actions.length === 0) return null;

        var colWidth = 12 / Math.min(4, this.props.actions.length);

        var actions = this.props.actions.map((action, i, a)=>{
            var title = typeof action.title === 'function' ? action.title(this.props) : action.title;
            var disabled = typeof action.disabled === 'function' ? action.disabled(this.props) : action.disabled;
            return (
                <div className={"button-container col-xs-" + colWidth} key={title || i}>
                    <Button
                        bsSize="small"
                        bsStyle={action.bsStyle || 'primary'}
                        onClick={action.function.bind(action.function, this.props)}
                        className={a.length < 2 ? "btn-block" : null}
                        disabled={disabled || false}
                    >{ title }</Button>
                </div>
            );
        });
        return (
            <div className="actions buttons-container">{ actions }</div>
        );
    }

    /**
     * Renders out a row containing 2 counts out of [Exp Sets, Exps, Files], minus whatever is the primary count.
     * 
     * @param {Object} props - Props of this component.
     * @returns {JSX.Element} - A DIV React element with a 'row' className.
     */
    renderDetailSection(props = this.props){
        if (props.path.length === 0) return null;
        var currentCounts = this.getCurrentCounts(props.path);
        if (!currentCounts) return null;
        var countsToShow = _.omit(currentCounts, this.props.primaryCount, 'experiments_active');

        countsToShow = _.pairs(countsToShow).map(function(countPair, i){

            var colSize = countPair[0] === 'experiment_sets' ?
                6 : countPair[0] === 'experiments' ?
                    6 : countPair[0] === 'files' ? 4 : 2;
            var name = null;
            if (countPair[0] === 'experiment_sets') name = "Exp Sets";
            if (countPair[0] === 'experiments')     name = "Experiments";
            if (countPair[0] === 'files')           name = "Files";

            return (
                <div key={countPair[0] || i} className={"text-right col-xs-" + colSize}>
                    { countPair[1] }<small> { name }</small>
                </div>
            );
        });
        
        return (
            <div className='row'>
                { this.props.primaryCount !== 'files' ? <div className="col-xs-2"></div> : null }
                { countsToShow }
            </div>
        );
    }

    primaryCount(node){
        return (
            <div className={"primary-count count text-400 pull-right count-" + (this.props.primaryCount || "unknown")}>
                { node[this.props.primaryCount] }
            </div>
        );
    }

    primaryCountLabel(){
        var name = null;
        if (this.props.primaryCount === 'experiment_sets') name = "Exp Sets";
        if (this.props.primaryCount === 'experiments') name = "Experiments";
        if (this.props.primaryCount === 'files') name = "Files";
        return (
            <small className="pull-right sets-label">{ name }</small>
        );
    }

    render(){
        if (Array.isArray(this.props.path) && this.props.path.length === 0){
            return null;
        }
        var leafNode = this.props.path[this.props.path.length - 1];
        var leafNodeFieldTitle = Schemas.Field.toName(leafNode.field, this.props.schemas);
        return (
            <div className="mosaic-cursor-body">
                <Crumbs path={this.props.path} schemas={this.props.schemas} />
                <h6 className="field-title">
                    { this.primaryCountLabel() }
                    { 
                        this.props.includeTitleDescendentPrefix && this.props.path.length > 1 ?
                        <small className="descendent-prefix"> &gt; </small> : null
                    }{ leafNodeFieldTitle }
                    {/* this.props.filteredOut ?
                        <small className="filtered-out-label"> (filtered out)</small>
                    : null */}
                </h6>
                <h3 className="details-title">
                    <i
                        className="term-color-indicator icon icon-circle"
                        style={{ color : leafNode.color || barplot_color_cycler.colorForNode(leafNode) }}
                    />
                    { this.primaryCount(leafNode) }
                    <span>{ Schemas.Term.toName(leafNode.field, leafNode.term) }</span>
                    
                </h3>
                <div className="details row">
                    <div className="col-sm-12">
                        { this.renderDetailSection() }
                    </div>
                </div>
                { this.renderActions() }
            </div>
        );
    }
}

class Crumbs extends React.Component {

    header(isEmpty = false){
        return (
            <div className="crumb-header row">
                <div className="field col-xs-5">
                    Looking at
                </div>
                <div className="name col-xs-2">
                    
                </div>
                { isEmpty ? null :
                <div className="count col-xs-5 text-right">
                    # Sets
                </div>
                }
            </div>
        );
    }

    render(){
        var offsetPerDescendent = 10;
        var isEmpty = this.props.path.length < 2;
        if (isEmpty) return null;
        //var maxSkewOffset = (this.props.path.length - 2) * offsetPerCrumb;
        
        return (
            <div className={'detail-crumbs' + (isEmpty ? ' no-children' : '')}>
                {/* this.header(isEmpty) */}
                {
                    this.props.path.slice(0,-1).map((n, i)=>{
                        return (
                            <div
                                data-depth={i}
                                className={"crumb row" + (i===0 ? ' first' : '')}
                                key={i}
                            >
                                <div className="field col-xs-5" style={ i === 0 ? null : { paddingLeft : 10 + offsetPerDescendent }}>
                                    { Schemas.Field.toName(n.field, Schemas.get()) }
                                </div>
                                <div className="name col-xs-5">
                                    { n.name || Schemas.Term.toName(n.field, n.term) }
                                </div>
                                <div className="count col-xs-2 pull-right text-right">
                                    { n.experiment_sets }
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        );
    }

}


const initialDetailCursorState = {
    'title' : 'Title',
    'term' : 'Title',
    'filteredOut' : false,
    'includeTitleDescendentPrefix' : true,
    'primaryCount' : 'experiment_sets',
    'path' : [
        //{
        //    'field' : "Test.Field.Name",
        //    'term' : "OOH A TERM"
        //}
    ],
    'mounted' : false,
    'sticky' : false,
    'bodyComponent' : Body,
    'actions' : null,
    'xCoordOverride' : null
};


export default class ChartDetailCursor extends React.Component {

    static Body = Body

    static getCounts(d){
        return {
            experiments : d.experiments || 0,
            experiments_active : d.active || 0,
            experiment_sets : d.experiment_sets || 0,
            files : d.activeFiles || d.files || 0
        };
    }

    /**
     * A static alias of the ChartDetailCursor instance's this.update() method.
     * 
     * @public
     * @param {Object} state - State to update ChartDetailCursor with.
     * @param {string} [id] - ID of ChartDetailCursor to update, if there are multiple mounted. Defaults to 'default'.
     * @param {function} [cb] - Optional callback function.
     */
    static update(state, id = "default", cb = null, overrideSticky = false){
        if (typeof updateFxns[id] === 'function'){
            return updateFxns[id](state, cb, overrideSticky);
        } else {
            throw new Error("No ChartDetailCursor with ID '" + id + "' is currently mounted.");
        }
    }

    /**
     * A static alias of the ChartDetailCursor instance's this.reset() method.
     * 
     * @public
     * @param {boolean} [overrideSticky=true] - If false, will cancel out if stickied.
     * @param {string} [id] - ID of ChartDetailCursor to update, if there are multiple mounted. Defaults to 'default'.
     * @param {function} [cb] - Optional callback function.
     */
    static reset(overrideSticky = true, id = "default", cb = null){
        if (typeof resetFxns[id] === 'function'){
            return resetFxns[id](overrideSticky, cb);
        } else {
            throw new Error("No ChartDetailCursor with ID '" + id + "' is currently mounted.");
        }
    }

    static getState(id = 'default'){
        if (typeof getStateFxns[id] === 'function'){
            return getStateFxns[id]();
        } else {
            throw new Error("No ChartDetailCursor with ID '" + id + "' is currently mounted.");
        }
    }

    static setCoords(coords = {x : 0, y : 0}, callback = null, id = 'default'){
        if (typeof setCoordsFxns[id] === 'function'){
            return setCoordsFxns[id](coords, callback);
        } else {
            throw new Error("No ChartDetailCursor with ID '" + id + "' is currently mounted.");
        }
    }

    static isTargetDetailCursor(elem){
        // Get to top-level element before document.body.
        while (elem.parentElement && elem.parentElement.tagName.toLowerCase() !== 'body'){
            elem = elem.parentElement;
        }
        if (elem && elem.classList && elem.classList.contains('cursor-component-root')) return true;
        return false;
    }

    static defaultProps = {
        'containingElement' : null,
        'hideWhenNoContainingElement' : false,
        // Default/fallback for when no containingElement
        'cursorContainmentDimensions' : {
            offsetLeft : 10,
            offsetTop : 100,
            containingWidth : 300,
            containingHeight : 300
        },
        'width' : 240,
        'height': 80,
        'horizontalAlign' : 'auto',
        'horizontalOffset' : 25,
        'verticalAlign' : 'top',
        'verticalOffset' : 10,
        'debugStyle' : false,
        'id' : 'default'
    }

    constructor(props){
        super(props);
        this.getCursorOffset = this.getCursorOffset.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.update = this.update.bind(this);
        this.reset = this.reset.bind(this);
        this.getState = this.getState.bind(this);
        this.setCoords = this.setCoords.bind(this);
        this.render = this.render.bind(this);
        this.state = _.clone(initialDetailCursorState);
    }

    componentDidMount(){
        console.log('Mounted MouseDetailCursor');

        // Alias this.update so we can call it statically.
        updateFxns[this.props.id]    = this.update;
        resetFxns[this.props.id]     = this.reset;
        getStateFxns[this.props.id]  = this.getState;
        setCoordsFxns[this.props.id] = this.setCoords;
        this.setState({'mounted' : true});
    }

    componentWillUnmount(){
        // Cleanup.
        updateFxns[this.props.id]    = null;
        resetFxns[this.props.id]     = null;
        getStateFxns[this.props.id]  = null;
        setCoordsFxns[this.props.id] = null;
        if (this.props.id !== 'default') {
            delete    updateFxns[this.props.id];
            delete     resetFxns[this.props.id];
            delete  getStateFxns[this.props.id];
            delete setCoordsFxns[this.props.id];
        }
    }

    getCursorOffset(){
        var cursorOffset = { x : 0, y : 0 };

        if (this.props.horizontalAlign !== 'center'){
            cursorOffset.x = (this.props.width / 2 + this.props.horizontalOffset);
            if (this.props.horizontalAlign === 'right'){
                cursorOffset.x = -cursorOffset.x;
            }
        }
        if (this.props.verticalAlign !== 'center'){
            cursorOffset.y = (this.props.height / 2 + this.props.verticalOffset);
            if (this.props.verticalAlign === 'bottom'){
                cursorOffset.y = -cursorOffset.y;
            }
        }
        return cursorOffset;
    }

    /**
     * Call this function to update component state with the new "path" and other properties, if applicable.
     * 
     * @public
     * @param {Object} state - New state to set. Should contain a 'path' property.
     * @param {function} [cb] - Optional callback function. Takes updated state as argument.
     * @returns {undefined} Nothing
     */
    update(state = {}, cb = null, overrideSticky = false){
        if (overrideSticky) this.overrideSticky = true; // Unset this on subsequent update.
        if (state.field) state.field = Schemas.Field.toName(state.field, this.props.schemas);
        else if (Array.isArray(state.path) && state.path.length > 0 && state.path[state.path.length - 1].field){
            state.field = Schemas.Field.toName(state.path[state.path.length - 1].field, this.props.schemas);
        }
        if (this.props.debugStyle && state.path && state.path.length === 0) return null;
        return this.setState(state, cb);
    }

    /**
     * Call this function to reset component state. Cancels out if stickied.
     * 
     * @public
     * @param {function} [cb] - Optional callback function. Takes updated state as argument.
     * @returns {boolean} True if reset, false if not.
     */
    reset(overrideSticky = true, cb = null){
        if (this.state.sticky && !overrideSticky) {
            // Cancel out
            return false;
        }
        this.setState(_.omit(initialDetailCursorState, 'mounted'), cb);
        return true;
    }

    getState(){
        return _.clone(this.state);
    }

    setCoords(coords, cb){
        if (!this.refs || !this.refs.cursorComponent) {
            console.error("Cursor component not available.");
            return false;
        }
        this.refs.cursorComponent.setState(coords, cb);
    }

    render(){
        var containDims = {};
        if (!this.props.containingElement){
            if (this.props.hideWhenNoContainingElement) return null;
            containDims = this.props.cursorContainmentDimensions;
            if (this.state.mounted && !isServerSide()){
                containDims = {
                    'containingWidth'   : window.innerWidth,
                    'containingHeight'  : window.innerHeight,
                    'offsetTop'         : 80,
                    'offsetLeft'        : 0
                };
            }
        }

        var isVisible = this.state.sticky || (Array.isArray(this.state.path) && this.state.path.length > 0);

        if (!isVisible) return null;
        else return (
            <CursorComponent
                {...containDims}
                containingElement={this.props.containingElement}
                width={this.props.width}
                height={this.props.height}
                cursorOffset={this.getCursorOffset()}
                xCoordOverride={this.state.xCoordOverride}
                horizontalAlign={this.props.horizontalAlign}
                className="mosaic-detail-cursor"
                isVisible={isVisible}
                visibilityMargin={this.props.visibilityMargin || {
                    left: 0,
                    right: 0,
                    bottom: -50,
                    top: -10
                }}
                debugStyle={this.props.debugStyle}
                ref="cursorComponent"
                sticky={this.state.sticky}
                children={React.createElement(
                    this.state.bodyComponent,
                    _.extend(
                        _.omit(this.props, 'children'),
                        this.state
                    )
                )}
            />
        );
    }

}
