'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Filters, console, Schemas } from './../../util';
import _ from 'underscore';
import { title, isDisplayTitleAccession } from './../item';

/**
 * Renders page title appropriately for a provided props.context.
 * 
 * @export
 * @memberof module:item-pages/components
 * @class ItemPageTitle
 * @prop {Object} context - JSON representation of current Item page/view.
 * @prop {Object} schemas - Schemas passed down from App.
 * @prop {boolean} [showAccessionTitles] - If true, will render title if it is the accession. Otherwise, beyond Item type, the title will be hidden.
 */
export class ItemPageTitle extends React.Component {

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'schemas' : PropTypes.oneOfType([
            PropTypes.objectOf(PropTypes.object),
            PropTypes.oneOf([null])
        ]).isRequired
    }

    static defaultProps = {
        'showAccessionTitles' : false,
        'showTitle' : true,
        'showType' : true
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    /**
     * The render function. If the display title is an accession, we do
     * 
     * @instance
     * @returns {Element} An <h1> element with .page-title class.
     */
    render(){
        var itemPageTitle = title(this.props);
        var titleIsAccession = isDisplayTitleAccession(this.props.context, itemPageTitle);

        var itemTypeTitle;
        if (this.props.showType){
            itemTypeTitle = Schemas.getItemTypeTitle(this.props.context, this.props.schemas);
        }

        var subtitle;
        if (this.props.showTitle && itemPageTitle && (!titleIsAccession || this.props.showAccessionTitles)){
            subtitle = (
                <span className="subtitle prominent" style={{ marginLeft : !this.props.showType ? 0 : null }}>
                    { itemPageTitle }
                </span>
            );
        }

        return ((itemTypeTitle || subtitle) && (
            <h1 className="page-title">
                { itemTypeTitle } { subtitle }
            </h1>
        )) || <br/>;
    }

}
