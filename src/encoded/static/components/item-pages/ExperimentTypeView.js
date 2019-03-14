'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox, MenuItem, Dropdown, DropdownButton } from 'react-bootstrap';
import { console, object, Schemas } from './../util';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement,
    SimpleFilesTableLoaded, SimpleFilesTable, Publications, OverviewHeadingContainer } from './components';
import { OverViewBodyItem } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue } from './../browse/components';


export default class ExperimentTypeView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [],
            width = this.getTabViewWidth();

        return initTabs.concat(this.getCommonTabs());
    }


    /**
     * What is to be displayed below Item description and above the TabbedView, if anything. Can return an array or single item.
     *
     * @returns {JSX.Element[]} React elements or components to display between Item header and Item TabbedView.
     */
    itemMidSection(){
        return [
            <Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.reference_pubs} />,
            <OverviewHeading context={this.props.context} />
        ];
    }

}


/**
 * This is rendered in middle of ExperimentView, between Item header and TabbedView.
 * @see ExperimentTypeView.itemMidSection()
 */
class OverviewHeading extends React.Component {
    render(){
        var { context, schemas } = this.props,
            tips = object.tipsFromSchema(schemas || Schemas.get(), context), // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
            commonProps = {
                'tips'          : tips,                 // Object containing 'properties' from Schema for Experiment ItemType. Informs the property title (from schema) & tooltip you get when hover over property title. Obtained from schemas.
                'result'        : context,              // The Item from which are getting value for 'property'.
                'wrapInColumn'  : "col-xs-6 col-md-3"   // Optional. Size of the block. @see http://getbootstrap.com/docs/3.3/examples/grid/.
            };

        return (
            <OverviewHeadingContainer>
                <OverViewBodyItem {...commonProps} property='sop' fallbackTitle="4DN-Approved SOP" />
                <OverViewBodyItem {...commonProps} property='raw_files' fallbackTitle="Raw Files Available" fallbackValue="No" />
                <OverViewBodyItem {...commonProps} property='reference_pubs' fallbackTitle="Reference Publication" />
            </OverviewHeadingContainer>
        );
    }
}
