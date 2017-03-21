'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { expFxn, Filters, console, object, isServerSide } = require('./../util');
var { highlightTerm, unhighlightTerms } = require('./../facetlist');
var { CursorComponent } = require('./components');

/**
 * @ignore
 * @private
 */
var updateFxns = {
    'default' : null
};

/**
 * @module {Component} viz/ChartDetailCursor
 */
var ChartDetailCursor = module.exports = React.createClass({

    getDefaultProps : function(){
        return {
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
            'height': 30,
            'horizontalAlign' : 'auto',
            'horizontalOffset' : 15,
            'verticalAlign' : 'top',
            'verticalOffset' : 10,
            'debugStyle' : false,
            'id' : 'default'
        };
    },

    getCursorOffset : function(){
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
    },

    getInitialState : function(){
        return {
            'title' : 'Title',
            'term' : 'Title',
            'field' : 'Field',
            'filteredOut' : false,
            'path' : [
                {
                    'field' : "Test.Field.Name",
                    'term' : "OOH A TERM"
                }
            ],
            'mounted' : false
        };
    },

    componentDidMount : function(){
        console.log('Mounted MouseDetailCursor');
        // Alias this.update so we can call it statically.
        updateFxns[this.props.id] = this.update;
        this.setState({'mounted' : true});
    },

    componentWillUnmount : function(){
        // Cleanup.
        updateFxns[this.props.id] = null;
        if (this.props.id !== 'default') delete updateFxns[this.props.id];
    },

    /**
     * Call this function to update component state with the new "path" and other properties, if applicable.
     * 
     * @instance
     * @public
     * @param {Object} state - New state to set. Should contain a 'path' property.
     * @param {function} [cb] - Optional callback function. Takes updated state as argument.
     * @returns {undefined} Nothing
     */
    update : function(state = {}, cb = null){
        if (state.field) state.field = Filters.Field.toName(state.field);
        else if (Array.isArray(state.path) && state.path.length > 0 && state.path[state.path.length - 1].field){
            state.field = Filters.Field.toName(state.path[state.path.length - 1].field);
        }
        if (this.props.debugStyle && state.path && state.path.length === 0) return null;
        return this.setState(state, cb);
    },

    render : function(){
        var containDims = {};
        if (!this.props.containingElement){
            if (this.props.hideWhenNoContainingElement) return null;
            containDims = this.props.cursorContainmentDimensions;
            if (this.state.mounted && !isServerSide()){
                containDims = {
                    containingWidth : window.innerWidth,
                    containingWidth : window.innerHeight,
                    offsetTop : 80,
                    offsetLeft : 0
                };
            }
        }

        var isVisible = Array.isArray(this.state.path) && this.state.path.length > 0;

        if (!isVisible){
            return null;
        }
        
        return (
            <CursorComponent
                {...containDims}
                containingElement={this.props.containingElement}
                width={this.props.width}
                height={this.props.height}
                cursorOffset={this.getCursorOffset()}
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
            >
                <ChartDetailCursor.Body
                    path={this.state.path}
                    title={this.state.title}
                    term={this.state.term}
                    field={this.state.field}
                    filteredOut={this.state.filteredOut}
                />
            </CursorComponent>
        );
    },

    statics : {

        getCounts : function(d){
            return {
                experiments : d.experiments || 0,
                experiments_active : d.active || 0,
                experiment_sets : d.experiment_sets || 0,
                files : d.activeFiles || d.files || 0
            };
        },

        /**
         * A static alias of the ChartDetailCursor instance's this.update() method.
         * 
         * @param {Object} state - State to update ChartDetailCursor with.
         * @param {string} [id] - ID of ChartDetailCursor to update, if there are multiple mounted. Defaults to 'default'.
         * @param {function} [cb] - Optional callback function.
         */
        update : function(state, id = "default", cb = null){
            if (typeof updateFxns[id] === 'function'){
                return updateFxns[id](state, cb);
            } else {
                throw new Error("No ChartDetailCursor with ID '" + id + "' is currently mounted.");
            }
        },

        Body : React.createClass({

            statics : {

                Crumbs : React.createClass({

                    header : function(isEmpty = false){
                        return (
                            <div className="crumb-header row">
                                <div className="field col-sm-5">
                                    Looking at
                                </div>
                                <div className="name col-sm-2">
                                    
                                </div>
                                { isEmpty ? null :
                                <div className="count col-sm-5 text-right">
                                    # Sets
                                </div>
                                }
                            </div>
                        );
                    },

                    render : function(){
                        var offsetPerDescendent = 10;
                        var isEmpty = this.props.path.length < 2;
                        if (isEmpty) return null;

                        //var maxSkewOffset = (this.props.path.length - 2) * offsetPerCrumb;
                        
                        return (
                            <div className={'detail-crumbs' + (isEmpty ? ' no-children' : '')}>
                                {/* this.header(isEmpty) */}
                                {
                                    this.props.path.slice(0,-1).map(function(n, i){
                                        return (
                                            <div
                                                data-depth={i}
                                                className={"crumb row" + (i===0 ? ' first' : '')}
                                                key={i}
                                            >
                                                <div className="field col-sm-5" style={ i === 0 ? null : { paddingLeft : 10 + offsetPerDescendent }}>
                                                    { Filters.Field.toName(n.field) }
                                                </div>
                                                <div className="name col-sm-5">
                                                    { n.name || n.term }
                                                </div>
                                                <div className="count col-sm-2 pull-right text-right">
                                                    { n.experiment_sets }
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        );
                    }

                })

            },

            getCurrentCounts : function(nodes = this.props.path){
                if (nodes.length < 1) return null;
                return ChartDetailCursor.getCounts(nodes[nodes.length - 1]);
            },

            renderDetailSection : function(props = this.props){
                if (props.path.length === 0) return null;
                var currentCounts = this.getCurrentCounts(props.path);
                if (!currentCounts) return null;
                return (
                    <div className='row'>
                        <div className="col-sm-2"></div>
                        <div className="col-sm-6 text-right">
                            { currentCounts.experiments }<small> Experiments</small>
                        </div>

                        <div className="col-sm-4 text-right">
                            { currentCounts.files }<small> Files</small>
                        </div>
                    </div>
                );
            },

            render : function(){
                if (Array.isArray(this.props.path) && this.props.path.length === 0){
                    return null;
                }
                var leafNode = this.props.path[this.props.path.length - 1];
                return (
                    <div className="mosaic-cursor-body">
                        <ChartDetailCursor.Body.Crumbs path={this.props.path} />
                        <h6 className="field-title">
                            <small className="pull-right sets-label">Exp Sets</small>
                            { 
                                this.props.path.length > 1 ?
                                <small className="descendent-prefix"> &gt; </small> : null
                            }{ this.props.field || leafNode.field }
                            {/* this.props.filteredOut ?
                                <small className="filtered-out-label"> (filtered out)</small>
                            : null */}
                        </h6>
                        <h3 className="details-title">
                            <i
                                className="term-color-indicator icon icon-circle"
                                style={{ color : leafNode.color || vizUtil.colorForNode(leafNode) }}
                            />
                            <div className="pull-right count">
                                { leafNode.experiment_sets }
                            </div>
                            <span>{ leafNode.name || leafNode.title || leafNode.term || this.props.title }</span>
                            
                        </h3>
                        <div className="details row">
                            <div className="col-sm-12">
                                { this.renderDetailSection() }
                            </div>
                        </div>
                    </div>
                );
            }

        })
    }

});