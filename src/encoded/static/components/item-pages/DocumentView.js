'use strict';

import React from 'react';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView from './DefaultItemView';



export default class DocumentView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(DocumentViewOverview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


const DocumentViewOverview = React.memo(function DocumentViewOverview({ context, schemas }){
    const tips = object.tipsFromSchema(schemas, context);
    return (
        <div>
            <div className="row overview-blocks">
                <ItemFileAttachment context={context} tips={tips} wrapInColumn="col-12 col-md-6" includeTitle btnSize="lg" itemType="Document" />
            </div>
        </div>
    );
});
DocumentViewOverview.getTabObject = function({ context, schemas }){
    return {
        'tab' : <span><i className="icon far icon-file-alt icon-fw"/> Overview</span>,
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
};
