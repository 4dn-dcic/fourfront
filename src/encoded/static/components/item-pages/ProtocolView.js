'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object, Schemas, fileUtil } from './../util';
import { ItemFileAttachment } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';



export default class ProtocolView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [];

        initTabs.push(ProtocolViewOverview.getTabObject(this.props));

        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


class ProtocolViewOverview extends React.PureComponent {

    /**
     * Get overview tab object for tabpane.
     *
     * @param {{ context: Object, schemas: Object|null }} props - Object containing Protocol Item context/result and schemas.
     */
    static getTabObject(props){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'protocol-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <ProtocolViewOverview context={props.context} schemas={props.schemas} />
                </div>
            )
        };
    }

    render(){
        const { context, schemas } = this.props;
        const tips = object.tipsFromSchema(schemas || Schemas.get(), context);
        const result = context;

        return (
            <div className="container">
                <div className="row overview-blocks">
                    <OverViewBodyItem {...{ result, tips }} property='protocol_type' fallbackTitle="Protocol Type" wrapInColumn="col-xs-6 col-md-4 mb-3" />
                    <OverViewBodyItem {...{ result, tips }} property='protocol_classification' fallbackTitle="Protocol Classification" wrapInColumn />
                    <ItemFileAttachment context={result} tips={tips} wrapInColumn includeTitle />
                </div>
                <div className="row overview-blocks">
                    <OverViewBodyItem {...{ result, tips }} property="url" fallbackTitle="External Link" wrapInColumn="col-md-6" titleRenderFxn={OverViewBodyItem.titleRenderPresets.url_string} hideIfNoValue />
                </div>
            </div>
        );

    }

}
