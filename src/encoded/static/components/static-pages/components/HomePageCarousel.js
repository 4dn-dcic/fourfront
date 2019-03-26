'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Carousel from 'nuka-carousel';
import { ajax, layout } from './../../util';
import { BasicStaticSectionBody } from './BasicStaticSectionBody';


export class HomePageCarousel extends React.PureComponent {

    static defaultProps = {
        'settings' : {
            //'autoplay' : true,
            'slidesToShow' : 3,
            //'wrapAround' : true,
            'slidesToScroll' : 1,
            'pauseOnHover' : true,
            //'renderCenterLeftControls' : null,
            //'renderCenterRightControls' : null,
            'renderCenterLeftControls' : function({ previousSlide, currentSlide }){
                if (currentSlide === 0) return null;
                return <i className="icon icon-fw icon-angle-left" onClick={previousSlide} />;
            },
            'renderCenterRightControls' : function(sliderProps){
                var { nextSlide, currentSlide, slideCount, slidesToShow } = sliderProps;
                if (currentSlide >= slideCount - slidesToShow) return null;
                return <i className="icon icon-fw icon-angle-right" onClick={nextSlide} />;
            },
            'renderBottomCenterControls' : null,
            'autoGenerateStyleTag' : false,
            'dragging' : false,
            //'cellSpacing' : 20,
            //'cellPadding' : '0px 10px'
        }
    };

    static refFunc(elem){
        setTimeout(()=>{
            if (!elem) return;
            elem.style.opacity = 1;
        }, 10);
    }

    renderSlide(section, idx){
        var link    = (section && section.options && section.options.link) || null,
            image   = (section && section.options && section.options.image) || null,
            title   = (!section.title ? null :
                <div className="title-container">
                    <h4 className="mt-0">{ section.title }</h4>
                    { section.description ?
                        <p>{ section.description }</p>
                    : null }
                </div>
            ),
            inner = (
                <React.Fragment>
                    <div className="inner-container">
                        <div className="bg-image" style={image ? { 'backgroundImage' : 'url(' + image + ')' } : null} />
                        { title }
                    </div>
                    { section.body ?
                        <div className="inner-body">
                            <BasicStaticSectionBody {..._.pick(section, 'filetype', 'content')} />
                        </div>
                    : null }
                </React.Fragment>
            );

        if (link){
            return <a className="homepage-carousel-slide is-link" key={idx} children={inner} href={link} />;
        }

        return <div className="homepage-carousel-slide" key={idx} children={inner} />;
    }

    render(){

        var { settings, windowWidth, context } = this.props,
            sections = context && context.carousel;

        if (!sections || !Array.isArray(sections) || sections.length === 0){
            return null;
        }

        // Do some responsive stuff
        var gridState = layout.responsiveGridState(windowWidth);

        if (gridState === 'sm' || sections.length === 2){
            settings = _.extend({}, settings, {
                'slidesToShow' : 2
            });
        } else if (gridState === 'xs' || sections.length === 1){
            settings = _.extend({}, settings, {
                'slidesToShow' : 1
            });
        }


        return (
            <div className="homepage-carousel-wrapper" ref={HomePageCarousel.refFunc} style={{ 'opacity' : 0 }} key="carousel">
                <div className="container">
                    <div className="row">
                        <Carousel {...settings} children={_.map(sections, this.renderSlide)} />
                    </div>
                </div>
            </div>
        );

    }

}



