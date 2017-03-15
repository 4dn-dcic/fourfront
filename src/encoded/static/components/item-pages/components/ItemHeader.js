'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
var { console, DateUtility } = require('./../../util');
var { FlexibleDescriptionBox } = require('./../../experiment-common');

var ItemHeader = module.exports = {

    TopRow : React.createClass({
        parsedStatus : function(){
            if (!('status' in this.props.context)) return <div></div>;
            /*  Removed icon in lieu of color indicator for status
            var iconClass = null;
            switch (this.props.context.status){

                case 'in review by lab':
                case 'in review by project':
                    iconClass = 'icon ss-stopwatch';
                    break;

            }
            */

            // Status colors are set via CSS (layout.scss) dependent on data-status attribute
            return (
                <div
                    className="expset-indicator expset-status right"
                    data-status={ this.props.context.status.toLowerCase() }
                    data-tip="Current Status"
                >
                    { this.props.context.status }
                </div>
            );
        },
        viewJSONButton : function(){
            if (!this.props.href) return null;

            var urlParts = url.parse(this.props.href, true);
            urlParts.search = '?' + querystring.stringify(_.extend(urlParts.query, { 'format' : 'json' }));
            var viewUrl = url.format(urlParts);
            return (
                <div className="expset-indicator right view-ajax-button">
                    <a href={viewUrl} target="_blank" onClick={(e)=>{
                        if (window && window.open){
                            e.preventDefault();
                            window.open(viewUrl, 'window', 'toolbar=no, menubar=no, resizable=yes, status=no, top=10, width=400');
                        }
                    }}>
                        View JSON
                    </a>
                </div>
            );
        },
        itemActions : function(){
            if (!Array.isArray(this.props.context.actions) || this.props.context.actions.length === 0) return null;
            return this.props.context.actions.map(function(action, i){
                return (
                    <div className="expset-indicator right action-button" data-action={action.name || null} key={action.name || i}>
                        <a href={action.href}>{ action.title }</a>
                    </div>
                );
            });
        },
        wrapChildren : function(){
            if (!this.props.children) return null;
            return React.Children.map(this.props.children, (child,i) =>
                <div
                    className="expset-indicator expset-type right"
                    title={this.props.title || null}
                    key={i}
                >
                    { child }
                </div>
            );
        },
        render : function(){
            return (
                <div className="row clearfix top-row">
                    <h3 className="col-sm-6 item-label-title">
                        { /* PLACEHOLDER / TEMP-EMPTY */ }
                    </h3>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra text-capitalize item-header-indicators clearfix">
                        { this.viewJSONButton() }
                        { this.itemActions() }
                        { this.wrapChildren() }
                        { this.parsedStatus() }
                    </h5>
                </div>
            );
        }
    }),

    MiddleRow : React.createClass({
        render : function(){
            var isTextShort = false;
            if (typeof this.props.context.description === 'string' && this.props.context.description.length <= 120){
                isTextShort = true;
            }
            return (
                <FlexibleDescriptionBox
                    description={ this.props.context.description || <em>No description provided.</em> }
                    className="item-page-heading experiment-heading"
                    textClassName={ isTextShort ? "text-larger" : "text-large" }
                    fitTo="grid"
                    dimensions={{
                        paddingWidth : 32,
                        paddingHeight : 22,
                        buttonWidth : 30,
                        initialHeight : 45
                    }}
                />
            );
        }
    }),

    BottomRow : React.createClass({
        parsedCreationDate: function(){
            if (!('date_created' in this.props.context)) return <span><i></i></span>;
            return (
                <span data-tip="Date Created" className="inline-block">
                    <i className="icon sbt-calendar"></i>&nbsp;&nbsp; 
                    <DateUtility.LocalizedTime timestamp={this.props.context.date_created} formatType='date-time-md' dateTimeSeparator=" at " />
                </span>
            );
        },
        render : function(){
            return (
                <div className="row clearfix bottom-row">
                    <div className="col-sm-6 item-label-extra set-type-indicators">{ this.props.children }</div>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra" title="Date Added - UTC/GMT">{ this.parsedCreationDate() }</h5>
                </div>
            );
        }
    }),

    Wrapper : React.createClass({
        adjustChildren : function(){
            if (!this.props.context) return this.props.children;
            return React.Children.map(this.props.children, (child)=>{
                if (typeof child.props.context !== 'undefined' && typeof child.props.href === 'string') return child;
                else {
                    return React.cloneElement(child, { context : this.props.context, href : this.props.href }, child.props.children);
                }
            });
        },
        render : function(){
            return (
                <div className={"item-view-header " + (this.props.className || '')}>{ this.adjustChildren() }</div>
            );
        }
    }),

};