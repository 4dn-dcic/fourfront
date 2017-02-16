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
            'height': 120,
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

    update : function(state, callback){
        if (!this.refs || !this.refs.body){
            console.warn("Unable to update MosaicDetailCursor, no cursor body component present yet.");
            return null;
        }
        return this.refs.body.update(state, callback);
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
                children={<MosaicDetailCursor.Body ref="body" />}
            />
        );
    },

    statics : {
        Body : React.createClass({

            getInitialState : function(){
                return {
                    'title' : 'Title',

                };
            },

            shouldComponentUpdate : function(nextProps, nextState){
                if (!_.isEqual(this.state, nextState)) return true;
                return false;
            },

            update : function(state = {}, cb = null){
                return this.setState(state, cb);
            },

            render : function(){
                return (
                    <div className="mosaic-cursor-body">
                        <h3 className="details-title">{ this.state.title || this.props.title }</h3>
                        <div className="details row">
                            <div className="col-sm-5">
                                Description
                            </div>
                            <div className="col-sm-7">
                                Chart
                            </div>
                        </div>
                    </div>
                );
            }

        })
    }

});