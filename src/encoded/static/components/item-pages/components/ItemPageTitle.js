'use strict';

var React = require('react');
var globals = require('./../../globals');
var { Filters } = require('./../../util');
var _ = require('underscore');
import { getTitleStringFromContext, isDisplayTitleAccession, getBaseItemTypeTitle } from './../item';


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
        var title = getTitleStringFromContext(this.props.context);
        var titleIsAccession = isDisplayTitleAccession(this.props.context, title);
        return (
            <h1 className="page-title">
                { getBaseItemTypeTitle(this.props.context, this.props.schemas) } <span className="subtitle prominent">
                    { !titleIsAccession || this.props.showAccessionTitles ? title : null }
                </span>
            </h1>
        );
    }

}


