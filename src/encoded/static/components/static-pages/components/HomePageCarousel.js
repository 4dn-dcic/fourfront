'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Carousel from 'nuka-carousel';
import { console, ajax, layout, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BasicStaticSectionBody } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/BasicStaticSectionBody';
import { replaceString as placeholderReplacementFxn } from './../placeholders';



export const HomePageCarouselSlide = React.memo(function HomePageCarouselSlide(props){
    const { options, content, title, description, filetype } = props;
    const link        = (options && options.link) || null;
    const image       = (options && options.image) || null;
    const showTitle   = (!title ? null : (
        <div className="title-container">
            <h4 className="mt-0">{ title }</h4>
            { description ? <p>{ description }</p> : null }
        </div>
    ));
    const inner = (
        <React.Fragment>
            <div className="inner-container">
                <div className="bg-image" style={image ? { 'backgroundImage' : 'url(' + image + ')' } : null} />
                { showTitle }
            </div>
            { content ?
                <div className="inner-body">
                    <BasicStaticSectionBody {...{ filetype, content, placeholderReplacementFxn }} />
                </div>
                : null }
        </React.Fragment>
    );

    if (link){
        const isExternalLink = link.slice(0, 4) === 'http';
        return (
            <a className="homepage-carousel-slide is-link" href={link} target={isExternalLink ? '_blank' : null} rel={isExternalLink ? 'noopener noreferrer' : null}>
                { inner }
            </a>
        );
    }

    return <div className="homepage-carousel-slide">{ inner }</div>;
});


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
                return <i className="icon icon-fw fas icon-angle-left icon-2x" onClick={previousSlide} />;
            },
            'renderCenterRightControls' : function(sliderProps){
                var { nextSlide, currentSlide, slideCount, slidesToShow } = sliderProps;
                if (currentSlide >= slideCount - slidesToShow) return null;
                return <i className="icon icon-fw fas icon-angle-right icon-2x" onClick={nextSlide} />;
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

    render(){
        const { settings: propSettings, windowWidth, context } = this.props;
        const sections = context && context.carousel;
        const settings = _.clone(propSettings);

        if (!sections || !Array.isArray(sections) || sections.length === 0){
            return null;
        }

        // Do some responsive stuff
        const gridState = layout.responsiveGridState(windowWidth);

        if (gridState === 'sm' || gridState === 'md' || sections.length === 2){
            settings.slidesToShow = 2;
        } else if (gridState === 'xs' || sections.length === 1){
            settings.slidesToShow = 1;
        }


        return (
            <div className="homepage-carousel-wrapper carousel-background-frame" ref={HomePageCarousel.refFunc} style={{ 'opacity' : 0 }} key="carousel">
                <div className="container">
                    <div className="row">
                        <Carousel {...settings}>
                            { sections.map(function(s){ return <HomePageCarouselSlide {...s} key={object.itemUtil.atId(s) || idx} />; }) }
                        </Carousel>
                    </div>
                </div>
            </div>
        );

    }

}


