'use strict';

import React from 'react';
import _ from 'underscore';
import { Button } from 'react-bootstrap';
import { console, object, Schemas, fileUtil, DateUtility } from './../util';
import { FormattedInfoBlock } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';
import { ItemFileAttachment } from './ProtocolView';



export default class DocumentView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [];
        var context = this.props.context;

        initTabs.push(DocumentViewOverview.getTabObject(context, this.props.schemas));

        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


class DocumentViewOverview extends React.Component {

    /**
     * Get overview tab object for tabpane.
     *
     * @param {Object} context - Current Document Item being shown.
     * @param {Object} schemas - Schemas passed down from app.state.schemas (or Schemas.get()).
     */
    static getTabObject(context, schemas){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'document-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <DocumentViewOverview context={context} schemas={schemas} />
                </div>
            )
        };
    }

    render(){
        var { context, schemas } = this.props,
            tips = object.tipsFromSchema(schemas || Schemas.get(), context);

        return (
            <div>
                <div className="row overview-blocks">
                    <ItemFileAttachment context={context} tips={tips} wrapInColumn="col-xs-12 col-md-6" includeTitle btnSize="lg" itemType="Document" />
                </div>
            </div>
        );

    }

}
