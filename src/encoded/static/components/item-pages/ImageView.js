'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';



export default class ImageView extends DefaultItemView {

    getTabViewContents() {
        const initTabs = [];
        initTabs.push(ImageViewOverview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}

const ImageViewOverview = React.memo(function ImageViewOverview({ context, schemas }) {
    const tips = object.tipsFromSchema(schemas, context);
    const result = context;

    let thumbnailSrc = typeof result.thumbnail === 'string' && result.thumbnail;

    if (thumbnailSrc) {
        thumbnailSrc = thumbnailSrc.replace(/\/100\/(\?[ctz]=[\d]+)?$/g, "/360/$1");
    }
    return (

        <div className="container">
            <div className="row overview-blocks">
                <img className="embedded-item-image" src={thumbnailSrc === null ? thumbnailSrc : result.attachment.href} width="300" alt="OMERO Thumbnail" />
                <ItemFileAttachment context={result} tips={tips} wrapInColumn includeTitle />
            </div>

            <div className="row overview-blocks">
                <OverViewBodyItem {...{ result, tips }} property="url" fallbackTitle="External Link" wrapInColumn="col-md-6" titleRenderFxn={OverViewBodyItem.titleRenderPresets.url_string} hideIfNoValue />
            </div>
        </div>
    );
});
ImageViewOverview.getTabObject = function ({ context, schemas }) {
    return {
        'tab': <span><i className="icon icon-file-alt fas icon-fw" /> Overview</span>,
        'key': 'protocol-info',
        //'disabled' : !Array.isArray(context.experiments),
        'content': (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    <span>Overview</span>
                </h3>
                <hr className="tab-section-title-horiz-divider" />
                <ImageViewOverview context={context} schemas={schemas} />
            </div>
        )
    };
};


