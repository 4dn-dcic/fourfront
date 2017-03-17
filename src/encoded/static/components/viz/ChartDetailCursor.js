'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { expFxn, Filters, console, object, isServerSide } = require('./../util');
var { highlightTerm, unhighlightTerms } = require('./../facetlist');
var { CursorComponent } = require('./components');

/**
 * @module {Component} viz/ChartDetailCursor
 */

var ChartDetailCursor = module.exports = React.createClass({

    getDefaultProps : function(){
        return {
            'containingElement' : null,
            'hideWhenNoContainingElement' : true,
            // Default/fallback for when no containingElement
            'cursorContainmentDimensions' : {
                offsetLeft : 10,
                offsetTop : 100,
                containingWidth : 300,
                containinHeight : 300
            },
            'width' : 240,
            'height': 30,
            'horizontalAlign' : 'left',
            'horizontalOffset' : 10,
            'verticalAlign' : 'top',
            'verticalOffset' : 10,
            'debugStyle' : false
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
            'path' : [],
        };
    },

    componentDidMount : function(){
        console.log('Mounted MouseDetailCursor');
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
        }

        
        return (
            <CursorComponent
                {...containDims}
                containingElement={this.props.containingElement}
                width={this.props.width}
                height={this.props.height}
                cursorOffset={this.getCursorOffset()}
                className="mosaic-detail-cursor"
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