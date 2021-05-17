'use strict';

import React from 'react';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView from './DefaultItemView';



export default class ImageView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(ImageViewOverview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


const ImageViewOverview = React.memo(function ImageViewOverview({ context, schemas }){
    const tips = object.tipsFromSchema(schemas, context);
    const { microscopy_file = {} } = context;

    let thumbnailSrc = typeof microscopy_file.thumbnail === 'string' && microscopy_file.thumbnail;
    let thumbnailLink = null;

    if (thumbnailSrc) {
        thumbnailSrc = thumbnailSrc.replace(/\/100\/(\?[ctz]=[\d]+)?$/g, "/360/$1");
        thumbnailLink = (
            <img className="embedded-item-image image-wrapper d-inline-block img-thumbnail" src={thumbnailSrc} alt="OMERO Thumbnail" />
        );
    }
    return (
        <div>
            <div className="row overview-blocks">
                {thumbnailLink ? <div className="col-md-4">{thumbnailLink}</div> : null}
                <ItemFileAttachment context={context} tips={tips} wrapInColumn={"col-12 col-md-6"} includeTitle btnSize="lg" itemType="Image" />
            </div>
        </div>
    );
});
ImageViewOverview.getTabObject = function({ context, schemas }){
    return {
        'tab' : <span><i className="icon far icon-file-alt icon-fw"/> Overview</span>,
        'key' : 'image-info',
        'content' : (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    <span>Overview</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <ImageViewOverview context={context} schemas={schemas} />
            </div>
        )
    };
};
