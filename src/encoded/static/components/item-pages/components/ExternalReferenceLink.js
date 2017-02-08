'use strict';

var React = require('react');
var _ = require('underscore');
var { ajax, console, isServerSide } = require('./../../util');

var ExternalReferenceLink = module.exports = React.createClass({

    propTypes : {
        schemas : React.PropTypes.object,
    },

    generateLink : function(){
        var refParts, refPrefix, refID = null;
        if (typeof this.props.children === 'string'){
            refParts = this.props.children.split(':');
            refPrefix = refParts[0];
            refID = refParts[1];
        } /* TODO: else if (isReactComponent) { refParts = ... } */

        if (!refID) return this.props.children; // Cancel out, no ref prefix.


    },
    
    render : function(){
        console.log(this.props.children);
        if (!this.props.schemas) return <span className="external-reference">{ this.props.children }</span>;

        return (
            null
        );
    }

});