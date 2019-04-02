'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DefaultItemView from './DefaultItemView';
import { console } from './../util';
import { BasicStaticSectionBody } from './../static-pages/components/BasicStaticSectionBody';
import { HomePageCarouselSlide } from './../static-pages/components/HomePageCarousel';


export default class StaticSectionView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [];

        initTabs.push(StaticSectionViewPreview.getTabObject(this.props));

        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution, Audits)
    }

}

class StaticSectionViewPreview extends React.PureComponent {

    static getTabObject(props){
        return {
            'tab' : <span><i className="icon icon-image icon-fw"/> Preview</span>,
            'key' : 'protocol-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        { props.context.title || 'Preview' }
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <StaticSectionViewPreview context={props.context} windowWidth={props.windowWidth} />
                </div>
            )
        };
    }

    render(){
        var { context } = this.props;

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
            <BasicStaticSectionBody {..._.pick(context, 'content', 'filetype')} className="mt-18 static-section-entry" />
        );
    }

}
