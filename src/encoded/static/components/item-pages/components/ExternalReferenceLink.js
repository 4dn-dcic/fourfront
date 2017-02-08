'use strict';

var React = require('react');

var ExternalReferenceLink = module.exports = React.createClass({
    
    render : function(){
        if ( // < 8 because that's minimum we need for a URL (e.g. 'http://' is first 7 chars)
            !this.props.uri || (typeof this.props.uri === 'string' && this.props.uri.length < 8)
        ) return <span className="external-reference">{ this.props.children }</span>;

        return (
            <a href={this.props.uri} target="_blank" className="external-reference">{ this.props.children }</a> 
        );
    }

});