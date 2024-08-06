'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Carousel, useCarousel } from 'nuka-carousel';


function Arrows() {
    const { currentPage, totalPages, wrapMode, goBack, goForward } = useCarousel();

    const allowWrap = wrapMode === 'wrap';
    const enablePrevNavButton = allowWrap || currentPage > 0;
    const enableNextNavButton = allowWrap || currentPage < totalPages - 1;

    return (
        <div>
            <button className={`slider-control slider-control-centerleft ${!enablePrevNavButton ? 'slider-control-disabled' : ''}`} onClick={goBack} disabled={!enablePrevNavButton}>Prev</button>
            <button className={`slider-control slider-control-centerright ${!enableNextNavButton ? 'slider-control-disabled' : ''}`} onClick={goForward} disabled={!enableNextNavButton}>Next</button>
        </div>
    );
};

export class SlideCarousel extends React.PureComponent {

    static defaultProps = {
        'fileLocation' : "/static/img/Metadata_structure_slides/",
        'carouselProps' : {
            'slideWidth': '100%',
            'slideHeight' : '540px',
            'swiping': true,
            'transitionMode': 'fade',
            'showDots': false,
            'showArrows': true,
            'slidesToShow': 1,
            'arrows': <Arrows />
        }
    };

    render(){
        const { fileLocation, carouselProps } = this.props;
        const style = { 'height': 'auto', 'maxWidth': '100%' };
        const slides = [
            "Slide01.png", "Slide02.png", "Slide03.png", "Slide04.png",
            "Slide05.png", "Slide06.png", "Slide07.png", "Slide08.png",
            "Slide09.png", "Slide10.png", "Slide11.png", "Slide12.png",
            "Slide13.png", "Slide14.png", "Slide15.png", "Slide16.png"
        ];

        return (
            <div className="slide-carousel-wrapper">
                <Carousel {...carouselProps}>
                    {
                        _.map(slides, function(filename){
                            var src = fileLocation + filename;
                            return (
                                <div className="text-center" style={{ minWidth: '100%' }}>
                                    <img {...{ src, style }} alt={filename} />
                                </div>
                            );
                        })
                    }
                </Carousel>
            </div>
        );

    }

}
