'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { expFxn, Filters, console, object, isServerSide } = require('./../util');
var { highlightTerm, unhighlightTerms } = require('./../facetlist');
var { CursorComponent } = require('./components');

var MosaicDetailCursor = module.exports = React.createClass({

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
            'height': 150,
            'horizontalAlign' : 'left',
            'horizontalOffset' : 10,
            'verticalAlign' : 'top',
            'verticalOffset' : 10
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

    update : _.debounce(function(state, callback, timesAttempted = 0){
        if (!this.refs || !this.refs.body){
            if (this.props.debug) console.warn("Unable to update MosaicDetailCursor, no cursor body component present yet. Times attempted - ", timesAttempted);
            if (timesAttempted < 3 && state.path && state.path.length > 0){
                setTimeout(this.update, 100, state, callback, timesAttempted + 1);
            }
            return null;
        }
        return this.refs.body.update(state, callback);
    }, 50),

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
            >
                <MosaicDetailCursor.Body ref="body" />
            </CursorComponent>
        );
    },

    statics : {

        getCounts : function(d){
            return {
                experiments : d.active || d.experiments || 0,
                experiments_active : d.active || 0,
                experiment_sets : d.experiment_sets || 0,
                files : d.activeFiles || d.files || 0
            };
        },

        Body : React.createClass({

            getInitialState : function(){
                return {
                    'title' : 'Title',
                    'term' : 'Title',
                    'field' : 'Field',
                    'path' : [
                        { field : "something1", term : "something2" }
                    ],
                    'totalCounts' : {
                        experiments : 0,
                        experiment_sets : 0,
                        files : 0
                    },
                };
            },

            shouldComponentUpdate : function(nextProps, nextState){
                if (!_.isEqual(this.state, nextState)) return true;
                return false;
            },

            update : function(state = {}, cb = null){
                if (state.field) state.field = Filters.Field.toName(state.field);
                //console.log(Filters.Field.nameMap);
                return this.setState(state, cb);
            },

            getCurrentCounts : function(nodes = this.state.path){
                if (nodes.length < 1) return null;
                return MosaicDetailCursor.getCounts(nodes[nodes.length - 1]);
            },

            renderDetailSection : function(state = this.state){
                if (state.path.length === 0) return null;
                var currentCounts = this.getCurrentCounts(this.state.path);
                if (!currentCounts) return null;
                return (
                    <div className='row'>

                        <div className="col-sm-3 count-val">
                            { currentCounts.experiment_sets }
                        </div>
                        <div className="col-sm-9">
                            Experiment Sets
                        </div>

                        <div className="col-sm-3 count-val">
                            { currentCounts.experiments }
                        </div>
                        <div className="col-sm-9">
                            Experiments
                        </div>

                        <div className="col-sm-3 count-val">
                            { currentCounts.files }
                        </div>
                        <div className="col-sm-9">
                            Files
                        </div>
                    </div>
                );
            },

            render : function(){
                if (Array.isArray(this.state.path) && this.state.path.length === 0){
                    return null;
                }
                return (
                    <div className="mosaic-cursor-body">
                        <h6 className="field-title">{ this.state.field }</h6>
                        <h3 className="details-title">{ this.state.title || this.props.title }</h3>
                        <div className="details row">
                            <div className="col-sm-6">
                                { this.renderDetailSection() }
                            </div>
                            <div className="col-sm-6">
                                Chart
                            </div>
                        </div>
                    </div>
                );
            }

        })
    }

});