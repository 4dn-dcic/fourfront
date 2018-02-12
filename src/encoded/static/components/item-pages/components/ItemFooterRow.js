'use strict';

import React from 'react';
import _ from 'underscore';
import { ExternalReferenceLink } from './ExternalReferenceLink';
import { console } from './../../util';

/**
 * Component for showing Aliases, External References, etc.
 * Shown at bottom of Item pages.
 * 
 * @class ItemFooterRow
 * @type {Component}
 * @prop {Object} context - JSON representation of current Item object. Should be available through Redux store's context.
 * @prop {Object} schemas - JSON representation of sitewide schemas.
 */
export class ItemFooterRow extends React.Component {

    constructor(props){
        super(props);
        this.render                 = this.render.bind(this);
        this.aliases                = this.aliases.bind(this);
        this.alternateAccessions    = this.alternateAccessions.bind(this);
        this.externalReferences     = this.externalReferences.bind(this);
    }

    /**
     * Render list of aliases for this item, wrapped in a <div>.
     * Only show if (a) any aliases exist AND (b) current user has edit access (e.g. submitter, admin).
     *
     * @returns {JSX.Element} Div React element containing aliases list or null.
     */
    aliases(){
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
    }

    alternateAccessions(){
        if (
            !this.props.context
            || !Array.isArray(this.props.context.alternate_accessions)
            || this.props.context.alternate_accessions.length === 0
        ) return null;
        var alternateAccessions = this.props.context.alternate_accessions.length > 0 ? this.props.context.alternate_accessions : [<em>None</em>];
        return (
            <div>
                <h4 className="text-300">Alternate Accessions</h4>
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
    }

    externalReferences(schemas){
        if (
            !this.props.context
            || !Array.isArray(this.props.context.external_references)
            || this.props.context.external_references.length === 0
        ) return null;
        var externalRefs = this.props.context.external_references.length > 0 ? this.props.context.external_references : [<em>None</em>];
        return (
            <div>
                <h4 className="text-300">External References</h4>
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
    }

    render() {
        var { schemas, context } = this.props;

        var externalReferences  = this.externalReferences(schemas || {}),
            aliases             = this.aliases(),
            alternateAccessions = this.alternateAccessions();

        if (!externalReferences && !alternateAccessions) return null;

        return (
            <div className="row">

                <hr className="mb-08 mt-1"/>

                { externalReferences ?
                <div className="col-xs-12 col-md-6">
                    { externalReferences }
                </div>
                : null }

                {/* aliases ?
                <div className="col-xs-12 col-md-4">
                    { aliases }
                </div>
                : null */}

                { alternateAccessions ?
                <div className="col-xs-12 col-md-6">
                    { alternateAccessions }
                </div>
                : null }

            </div>
        );
        

    }
}
