'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object, Schemas } from './../util';
import DefaultItemView, { OverViewBodyItem, StaticHeadersArea } from './DefaultItemView';
import { Publications, SOPBelowHeaderRow, LinkBelowHeaderRow, WrappedCollapsibleList, ExperimentSetTableTabView } from './components';
import { UserContentBodyList } from './../static-pages/components';


export default class ExperimentTypeView extends DefaultItemView {

    getTabViewContents(){
        const { context, browseBaseState } = this.props;
        const tabs = [];
        const width = this.getTabViewWidth();
        const expSetTableProps = _.extend({}, this.props, {
            'requestHref' : (
                "/search/?type=ExperimentSetReplicate&experimentset_type=replicate&" +
                (browseBaseState === "only_4dn" ? "award.project=4DN&" : "") +
                "experiments_in_set.experiment_type.display_title=" + encodeURIComponent(context.display_title)
            ),
            'title' : function(props, { totalCount }){
                return (totalCount ? totalCount + ' ' : '') + context.display_title + " Experiment Sets";
            }
        });

        tabs.push(ExperimentTypeViewOverview.getTabObject(this.props));

        tabs.push(ExperimentSetTableTabView.getTabObject(expSetTableProps, width));

        return tabs.concat(this.getCommonTabs());
    }

    /**
     * What is to be displayed below Item description and above the TabbedView, if anything. Can return an array or single item.
     *
     * @returns {JSX.Element[]} React elements or components to display between Item header and Item TabbedView.
     */
    itemMidSection(){
        const { context : { reference_pubs = [], sop, reference_protocol = {} } } = this.props;

        const pubsLen = reference_pubs.length || 0;

        let publicationArea;
        if (pubsLen === 1){
            publicationArea = (
                <Publications.PublicationBelowHeaderRow singularTitle="Reference Publication"
                    publication={reference_pubs[0]} outerClassName={null} />
            );
        } else if (pubsLen > 1){
            publicationArea = (
                <WrappedCollapsibleList items={reference_pubs} singularTitle="Reference Publication" itemClassName="publication" />
            );
        }

        const { link : refProtocolUrl, title: refProtocolTitle } = reference_protocol;
        return (
            <div className="mb-2">
                { publicationArea }
                <SOPBelowHeaderRow sop={sop} />
                <LinkBelowHeaderRow url={refProtocolUrl} title={refProtocolTitle} />
                <StaticHeadersArea context={this.props.context} key="static-headers-area" />
            </div>
        );
    }

}


const ExperimentTypeViewOverview = React.memo(function ExperimentTypeViewOverview({ context, schemas }){
    const staticContent = _.pluck(_.filter(context.static_content || [], function(s){
        return s.content && !s.content.error && s.location === 'tab:overview';
    }), 'content');

    return (
        <div>
            <OverViewBody result={context} schemas={schemas} />
            { staticContent.length > 0 ? (
                <div className="mt-2">
                    <hr/>
                    <UserContentBodyList contents={staticContent} />
                </div>
            ) : null }
        </div>
    );
});
ExperimentTypeViewOverview.getTabObject = function({ context, schemas }){
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
};


const OverViewBody = React.memo(function OverViewBody(props){

    const { result, schemas } = props;
    const tips = object.tipsFromSchema(schemas || Schemas.get(), result);
    const commonProps = { result, tips, 'wrapInColumn' : 'col-xs-6 col-md-3' };

    return (
        <div className="row">
            <div className="col-md-12 col-xs-12">
                <div className="row overview-blocks">

                    <OverViewBodyItem {...commonProps} property="experiment_category" fallbackTitle="Experiment Category" />
                    <OverViewBodyItem {...commonProps} property="assay_classification" fallbackTitle="Assay Classification" />
                    <OverViewBodyItem {...commonProps} property="assay_subclassification" fallbackTitle="Experimental Purpose" />
                    <OverViewBodyItem {...commonProps} property="raw_file_types" fallbackTitle="Raw Files Available" />

                </div>
            </div>
        </div>
    );
});
