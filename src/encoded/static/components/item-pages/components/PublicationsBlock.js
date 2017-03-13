'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
var { Button } = require('react-bootstrap');
var { console, DateUtility, object } = require('./../../util');
var { FlexibleDescriptionBox } = require('./../../experiment-common');
var PartialList = require('./PartialList');


var PublicationsBlock = module.exports = React.createClass({

    statics : {

        Publication : React.createClass({
            render: function(){
                var atId = this.props.atId || object.atIdFromObject(this.props);
                return (
                    <li className="publication" key={atId}>
                        <a className="text-500" href={atId}>{ this.props.display_title || this.props.title }</a>
                    </li>
                );
            }
        })

    },

    getDefaultProps : function(){
        return {
            'persistentCount' : 2,
            'publications' : []
        };
    },

    getInitialState : function(){
        if (this.props.publications.length < 4) return null;
        return {
            'open' : false
        };
    },

    publicationListItems : function(publications = this.props.publications){

        /**
         *  Maps an array of publications to PublicationsBlock.Publication React elements.
         * 
         * @static
         * @private
         * @param {any} pubs - Array of publication objects containing at least link_id and display_title.
         * @returns {Element[]} List of React <li> elements wrapped.
         */
        function pubsToElements(pubs){
            return pubs.map(function(pub, i){
                return <PublicationsBlock.Publication {...pub} key={pub.link_id || i} />;
            });
        }


        if (publications.length <= this.props.persistentCount){
            return <ul>{ pubsToElements(publications) }</ul>;
        } else {
            // Only show first 3, then a 'more' button.

            return (
                <PartialList
                    persistent={pubsToElements(publications.slice(0, this.props.persistentCount))}
                    collapsible={pubsToElements(publications.slice(this.props.persistentCount)) }
                    containerType="ul"
                    open={this.state && this.state.open}
                />
            );
        }
        return null;
    },

    render : function(){
        var publications = this.props.publications;
        /* Uncomment this to test w/ longer list (none in test inserts)
        publications = [
            { 'link_id' : '~something~here~1', 'display_title' : "Sample Publicstion One which involces this experiment set and other things" },
            { 'link_id' : '~something~here~2', 'display_title' : "Something else wich references this set and has data and many words" },
            { 'link_id' : '~something~here~3', 'display_title' : "Hello 1123" },
            { 'link_id' : '~something~here~4', 'display_title' : "Hello 11234 sdfsfd asfsdf asfgsdg sdfsdg sadfsdg sdgdsg" },
            { 'link_id' : '~something~here~5', 'display_title' : "Hello 112345" },
            { 'link_id' : '~something~here~6', 'display_title' : "Hello 1123456 123456" }
        ];
        */

        if (!Array.isArray(publications) || publications.length < 1){
            return null;
        }

        var isSingleItem = publications.length === 1;

        return (
            <div className={"publications-block" + (isSingleItem ? ' single-item' : '')}>
                <h6 className="publication-label">Publication{ isSingleItem ? '' : 's' }</h6>
                <div className="row">
                    <div className="icon-container col-xs-2 col-lg-1">
                        <i className="icon icon-book" />
                    </div>
                    <div className="col-xs-10 col-lg-11">
                        { this.publicationListItems(publications) }
                        { publications.length > this.props.persistentCount ?
                            <Button bsStyle="default" bsSize="small" onClick={()=>{
                                this.setState({ open : !(this.state && this.state.open) });
                            }}>{ this.state && this.state.open ? "Collapse" : "See " + (publications.length - this.props.persistentCount) + " More" }</Button>
                        : null }
                    </div>
                </div>
            </div>
        );
    }

});