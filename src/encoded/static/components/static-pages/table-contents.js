'use strict';

var React = require('react');
var _ = require('underscore');
var globals = require('./../globals');
var StaticPageBase = require('./static-page-base');

var TableOfContents = module.exports = React.createClass({

    statics : {
        TableEntry : React.createClass({

            getDefaultProps : function(){
                return {
                    'title' : 'Table of Content Entry',
                    'link'  : '#sample',
                    'style' : 'normal'
                };
            },

            render : function(){
                var title = this.props.title;
                if (typeof this.props.link === 'string' && this.props.link.length > 0){
                    title = (<a href={this.props.link}>{ title }</a>);
                }
                return (
                    <li className="table-content-entry">
                        { title }
                    </li>
                );
                return (
                    <div className="inner row table-content-entry">
                        <div className="col-xs-6">
                        </div>
                        <div className="col-xs-6">
                        </div>
                    </div>
                );
            }
        })
    },

    getDefaultProps : function(){
        return _.extend(StaticPageBase.getDefaultProps.call(this), {
            'populateAnchors' : true
        });
    },

    render : function(){
        var topEntries = _(this.props.context.content).chain()
            .pairs()
            .map(function(entryPair){
                return _.extend(entryPair[1], { 'link' : entryPair[0] });
            })
            .sortBy('order')
            .map(function(s){
                return (<TableOfContents.TableEntry link={s.link} title={link.title} />);
            })
            .value();
        return (
            <div className="table-of-contents">
                <ol className="inner">
                    
                </ol>
            </div>
        );
    }

});