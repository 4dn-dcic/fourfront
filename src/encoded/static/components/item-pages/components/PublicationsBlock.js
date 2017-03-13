'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
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
                        <a className="text-600" href={atId}>{ this.props.display_title || this.props.title }</a>
                    </li>
                );
            }
        })

    },

    getInitialState : function(){
        if (this.props.publications.length < 4) return null;
        return {
            'open' : false
        };
    },

    publicationListItems : function(){

        function pubsToElements(pubs){
            return pubs.map(function(pub){
                return <PublicationsBlock.Publication {...pub} />;
            });
        }

        if (this.props.publications.length < 4){
            return <ul>{ pubsToElements(this.props.publications) }</ul>;
        } else {
            // Only show first 3, then a 'more' button.

            return (
                <PartialList
                    persistent={pubsToElements(this.props.publications.slice(0,3))}
                    collapsible={pubsToElements(this.props.publications.slice(3)) }
                    containerType="ul"
                />
            );
        }
        return null;
    },

    render : function(){
        if (!Array.isArray(this.props.publications) || this.props.publications.length < 1){
            return null;
        }
        return (
            <div className="publications-block">
                <h6 className="publication-label">Publication{ this.props.publications.length > 1 ? 's' : '' }</h6>
                { this.publicationListItems() }
                { this.props.publications.length >= 4 ?
                    <Button bsStyle="default" bsSize="small" onClick={()=>{
                        this.setState({ open : !this.state.open });
                    }}>{ this.state && this.state.open ? "Collapse" : "See More" }</Button>
                : null }
            </div>
        );
    }

});