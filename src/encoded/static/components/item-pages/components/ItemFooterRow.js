'use strict';

var React = require('react');
var _ = require('underscore');
var ExternalReferenceLink = require('./ExternalReferenceLink');

/**
 * Produces a Bootstrap row div element with 3 columns containing External References, Aliases, & Alternate Accessions.
 * Use at the bottom of Item pages.
 */
var ItemFooterRow = module.exports = React.createClass({

    /**
     * Render list of aliases for this item, wrapped in a <div>.
     * Only show if (a) any aliases exist AND (b) current user has edit access (e.g. submitter, admin).
     * 
     * @memberof module:item-pages/components.ItemFooterRow
     * @instance
     * @private
     * @returns {Element|null} Div React element containing aliases list or null.
     */
    aliases : function(){
        if (
            !this.props.context
            || !Array.isArray(this.props.context.aliases)
            || this.props.context.aliases.length === 0
        ) return null;
        if (!Array.isArray(this.props.context.actions)) return null;
        if (!_.find(this.props.context.actions, { 'name' : 'edit' })) return null; // No 'Edit' action for this Item.
        
        var aliases = this.props.context.aliases.length > 0 ? this.props.context.aliases : [<em>None</em>];
        return (
            <div>
                <h4 className="text-500">Aliases</h4>
                <div>
                    <ul>
                    { aliases.map(function(alias, i){
                        return (
                            <li key={i}>{ alias }</li>
                        );
                    }) }
                    </ul>
                </div>
            </div>
        );
    },

    alternateAccessions : function(){
        if (
            !this.props.context
            || !Array.isArray(this.props.context.alternate_accessions)
            || this.props.context.alternate_accessions.length === 0
        ) return null;
        var alternateAccessions = this.props.context.alternate_accessions.length > 0 ? this.props.context.alternate_accessions : [<em>None</em>];
        return (
            <div>
                <h4 className="text-500">Alternate Accessions</h4>
                <div>
                    <ul>
                    { alternateAccessions.map(function(alias, i){
                        return (
                            <li key={i}>{ alias }</li>
                        );
                    }) }
                    </ul>
                </div>
            </div>
        );
    },

    externalReferences : function(schemas){
        if (
            !this.props.context
            || !Array.isArray(this.props.context.external_references)
            || this.props.context.external_references.length === 0
        ) return null;
        var externalRefs = this.props.context.external_references.length > 0 ? this.props.context.external_references : [<em>None</em>];
        return (
            <div>
                <h4 className="text-500">External References</h4>
                <div>
                    <ul>
                    { externalRefs.map(function(extRef, i){
                        return (
                            <li key={i}>
                                { typeof extRef.ref === 'string' ?
                                    <ExternalReferenceLink uri={extRef.uri || null} children={extRef.ref} />
                                    :
                                    extRef
                                }

                            </li>
                        );
                    }) }
                    </ul>
                </div>
            </div>
        );
    },

    render: function() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;

        var externalReferences  = this.externalReferences(schemas),
            aliases             = this.aliases(),
            alternateAccessions = this.alternateAccessions();

        
        return (
            <div className="row">

                { externalReferences ?
                <div className="col-xs-12 col-md-4">
                    { externalReferences }
                </div>
                : null }

                { aliases ?
                <div className="col-xs-12 col-md-4">
                    { aliases }
                </div>
                : null }

                { alternateAccessions ?
                <div className="col-xs-12 col-md-4">
                    { alternateAccessions }
                </div>
                : null }

            </div>
        );
        

    }

});