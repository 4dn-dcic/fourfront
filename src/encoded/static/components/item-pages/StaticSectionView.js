'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DefaultItemView from './DefaultItemView';
import { BasicStaticSectionBody } from '@hms-dbmi-bgm/shared-portal-components/src/components/static-pages/BasicStaticSectionBody';
import { HomePageCarouselSlide } from './../static-pages/components/HomePageCarousel';


export default class StaticSectionView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(StaticSectionViewPreview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}

const StaticSectionViewPreview = React.memo(function StaticSectionViewPreview({ context }){

    if (context.section_type === "Home Page Slide"){
        const slideContainerStyle = {
            'boxSizing' : 'border-box',
            'width' : 386,
            'margin' : '0 auto'
        };
        return ( // Dummy wrapper for slide
            <div className="homepage-carousel-wrapper">
                <div className="slider-slide" style={slideContainerStyle}>
                    <HomePageCarouselSlide {...context} />
                </div>
            </div>
        );
    }

    return (
        <div className="mt-18 static-section-entry">
            <BasicStaticSectionBody {..._.pick(context, 'content', 'filetype')} />
        </div>
    );
});
StaticSectionViewPreview.getTabObject = function({ context, windowWidth }){
    return {
        'tab' : <span><i className="icon icon-image icon-fw"/> Preview</span>,
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
