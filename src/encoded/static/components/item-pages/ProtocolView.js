'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';



export default class ProtocolView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(ProtocolViewOverview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


const ProtocolViewOverview = React.memo(function ProtocolViewOverview({ context, schemas }){
    const tips = object.tipsFromSchema(schemas, context);
    const result = context;

    return (
        <div className="container">
            <div className="row overview-blocks">
                <OverViewBodyItem {...{ result, tips }} property="protocol_type" fallbackTitle="Protocol Type" wrapInColumn="col-6 col-md-4 mb-3" />
                <OverViewBodyItem {...{ result, tips }} property="protocol_classification" fallbackTitle="Protocol Classification" wrapInColumn />
                <ItemFileAttachment context={result} tips={tips} wrapInColumn includeTitle />
            </div>
            <div className="row overview-blocks">
                <OverViewBodyItem {...{ result, tips }} property="url" fallbackTitle="External Link" wrapInColumn="col-md-6" titleRenderFxn={OverViewBodyItem.titleRenderPresets.url_string} hideIfNoValue />
            </div>
        </div>
    );
});
ProtocolViewOverview.getTabObject = function({ context, schemas }){
    return {
        'tab' : <span><i className="icon icon-file-alt fas icon-fw"/> Overview</span>,
        'key' : 'protocol-info',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    <span>Overview</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <ProtocolViewOverview context={context} schemas={schemas} />
            </div>
        )
    };
};

