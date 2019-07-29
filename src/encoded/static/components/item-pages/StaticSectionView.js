'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DefaultItemView from './DefaultItemView';
import { BasicStaticSectionBody } from '@hms-dbmi-bgm/shared-portal-components/src/components/static-pages/BasicStaticSectionBody';


export default class StaticSectionView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(StaticSectionViewPreview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}

const StaticSectionViewPreview = React.memo(function StaticSectionViewPreview({ context }){
    return (
        <div className="mt-18 static-section-entry">
            <BasicStaticSectionBody {..._.pick(context, 'content', 'filetype')} />
        </div>
    );
});
StaticSectionViewPreview.getTabObject = function({ context, windowWidth }){
    return {
        'tab' : <span><i className="icon icon-image fas icon-fw"/> Preview</span>,
        'key' : 'preview',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    { context.title || 'Preview' }
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <StaticSectionViewPreview context={context} windowWidth={windowWidth} />
            </div>
        )
    };
};
