'use strict';

import React from 'react';

/**
 * Used in Component module:item-pages/components.ItemFooterRow to display an external reference link.
 *
 * @class ExternalReferenceLink
 * @type {Component}
 * @prop {Component[]|Element[]|string[]} children - Inner contents or title of link.
 * @prop {string} uri - The href for the link.
 */
export class ExternalReferenceLink extends React.Component{
    
    render(){
        if ( // < 8 because that's minimum we need for a URL (e.g. 'http://' is first 7 chars)
            !this.props.uri || (typeof this.props.uri === 'string' && this.props.uri.length < 8)
        ) return <span className="external-reference">{ this.props.children }</span>;

        return (
            <a href={this.props.uri} target="_blank" className="external-reference">{ this.props.children }</a> 
        );
    }

}
