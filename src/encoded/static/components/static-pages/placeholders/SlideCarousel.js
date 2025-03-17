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

    // weird but autocomplete="off" fixes the hydration error: https://github.com/vercel/next.js/discussions/21999#discussioncomment-6315670
    return (
        <div>
            <button type="button" className={`slider-control slider-control-centerleft ${!enablePrevNavButton ? 'slider-control-disabled' : ''}`} onClick={goBack} disabled={!enablePrevNavButton} autoComplete="off">Prev</button>
            <button type="button" className={`slider-control slider-control-centerright ${!enableNextNavButton ? 'slider-control-disabled' : ''}`} onClick={goForward} disabled={!enableNextNavButton} autoComplete="off">Next</button>
        </div>
    );
}

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
                        _.map(slides, function(filename, index){
                            var src = fileLocation + filename;
                            return (
                                <div className="text-center" style={{ minWidth: '100%' }} key={"slide-" + index}>
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
