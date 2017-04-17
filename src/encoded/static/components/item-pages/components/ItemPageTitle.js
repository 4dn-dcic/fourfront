'use strict';

var React = require('react');
var globals = require('./../../globals');
var { Filters } = require('./../../util');
var _ = require('underscore');
import { title, isDisplayTitleAccession, getItemTypeTitle } from './../item';

/**
 * Renders page title appropriately for a provided props.context.
 * 
 * @export
 * @memberof module:item-pages/components
 * @class ItemPageTitle
 * @prop {boolean} [showAccessionTitles] - If true, will render title if it is the accession. Otherwise, beyond Item type, the title will be hidden.
 * @prop {Object} context - JSON representation of current Item page/view.
 */
export default class ItemPageTitle extends React.Component {

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
            itemTypeTitle = getItemTypeTitle(this.props.context, this.props.schemas);
        }

        var subtitle;
        if (this.props.showTitle && itemPageTitle && (!titleIsAccession || this.props.showAccessionTitles)){
            subtitle = (
                <span className="subtitle prominent" style={{ marginLeft : !this.props.showType ? 0 : null }}>
                    { itemPageTitle }
                </span>
            );
        }

        console.log(itemTypeTitle, subtitle);

        return ((itemTypeTitle || subtitle) && (
            <h1 className="page-title">
                { itemTypeTitle } { subtitle }
            </h1>
        )) || <br/>;
    }

}

ItemPageTitle.defaultProps = {
    'showAccessionTitles' : false,
    'showTitle' : true,
    'showType' : true
}


