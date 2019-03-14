'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox, MenuItem, Dropdown, DropdownButton } from 'react-bootstrap';
import { console, object, Schemas } from './../util';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement,
    SimpleFilesTableLoaded, SimpleFilesTable, Publications, Protocols, OverviewHeadingContainer } from './components';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue } from './../browse/components';
import { UserContentBodyList } from './../static-pages/components';


export default class ExperimentTypeView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [],
            width = this.getTabViewWidth();
        var context = this.props.context;

        initTabs.push(ExperimentTypeViewOverview.getTabObject(context, this.props.schemas));

        return initTabs.concat(this.getCommonTabs());
    }


    /**
     * What is to be displayed at top left of page, under title, to the left of accession (if any).
     *
     * @returns {{ title: string|JSX.Element, description: string }} JS Object ascribing what to display.
     */
    typeInfo(){
        return null;
    }


    /**
     * What is to be displayed below Item description and above the TabbedView, if anything. Can return an array or single item.
     *
     * @returns {JSX.Element[]} React elements or components to display between Item header and Item TabbedView.
     */
    itemMidSection(){
        return [
            <Publications.ReferencePubBelowHeaderRow reference_pubs={this.props.context.reference_pubs} />,
            <Protocols.SopBelowHeaderRow sop={this.props.context.sop} />
        ];
    }

}


// /**
//  * This is rendered in middle of ExperimentView, between Item header and TabbedView.
//  * @see ExperimentTypeView.itemMidSection()
//  */
// class OverviewHeading extends React.Component {
//     render(){
//         var { context, schemas } = this.props,
//             tips = object.tipsFromSchema(schemas || Schemas.get(), context), // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
//             commonProps = {
//                 'tips'          : tips,                 // Object containing 'properties' from Schema for Experiment ItemType. Informs the property title (from schema) & tooltip you get when hover over property title. Obtained from schemas.
//                 'result'        : context,              // The Item from which are getting value for 'property'.
//                 'wrapInColumn'  : "col-xs-6 col-md-3"   // Optional. Size of the block. @see http://getbootstrap.com/docs/3.3/examples/grid/.
//             };
//
//         return (
//             <OverviewHeadingContainer>
//                 <OverViewBodyItem {...commonProps} property='sop' fallbackTitle="4DN-Approved SOP" />
//                 <OverViewBodyItem {...commonProps} property='raw_file_types' fallbackTitle="Raw Files Available" fallbackValue="No" />
//                 <OverViewBodyItem {...commonProps} property='reference_pubs' fallbackTitle="Reference Publication" />
//             </OverviewHeadingContainer>
//         );
//     }
// }


// /**
//  * This is rendered in middle of ExperimentView, between Item header and TabbedView.
//  * @see ExperimentTypeView.itemMidSection()
//  */
// class OverviewHeading extends React.Component {
//     render(){
//         if (!this.props.context.sop) return null;
//         return (
//             <div className="row mb-2">
//                 <div className="col-sm-12">
//                     <DetailBlock protocol={this.props.context.sop} singularTitle="Approved SOP" >
//                         <div className="more-details">
//                             <ShortAttribution protocol={this.props.context.sop} />
//                         </div>
//                     </DetailBlock>
//                 </div>
//             </div>
//         );
//     }
// }


class ExperimentTypeViewOverview extends React.Component {

    /**
     * Get overview tab object for tabpane.
     *
     * @param {Object} context - Current ExperimentType Item being shown.
     * @param {Object} schemas - Schemas passed down from app.state.schemas (or Schemas.get()).
     */
    static getTabObject(context, schemas){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'overview',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <ExperimentTypeViewOverview context={context} schemas={schemas} />
                </div>
            )
        };
    }

    render(){
        var { context } = this.props,
            staticContent = _.pluck(_.filter(context.static_content || [], function(s){
                return s.content && !s.content.error && s.location === 'tab:overview';
            }), 'content');

        return (
            <div>
                <OverViewBody result={this.props.context} schemas={this.props.schemas} />
                { staticContent.length > 0 ? (
                    <div className="mt-2">
                        <hr/>
                        <UserContentBodyList contents={staticContent} />
                    </div>
                ) : null }
            </div>
        );

    }

}


class OverViewBody extends React.Component {

    render(){
        var result = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), result);

        return (
            <div className="row">
                <div className="col-md-12 col-xs-12">
                    <div className="row overview-blocks">

                        <OverViewBodyItem {...{ result, tips }} property='experiment_category' fallbackTitle="Experiment Category" wrapInColumn />
                        <OverViewBodyItem {...{ result, tips }} property='assay_classification' fallbackTitle="Assay Classification" wrapInColumn />
                        <OverViewBodyItem {...{ result, tips }} property='assay_subclassification' fallbackTitle="Experimental Purpose" wrapInColumn />
                        <OverViewBodyItem {...{ result, tips }} property='raw_file_types' fallbackTitle="Raw Files Available" wrapInColumn />

                    </div>
                </div>
            </div>
        );
    }
}
