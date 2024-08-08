'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { Carousel, useCarousel } from 'nuka-carousel';

function Arrows() {
    const { currentPage, totalPages, wrapMode, goBack, goForward } = useCarousel();

    const allowWrap = wrapMode === 'wrap';
    const enablePrevNavButton = allowWrap || currentPage > 0;
    const enableNextNavButton = allowWrap || currentPage < totalPages - 1;

    return (
        <div>
            {enablePrevNavButton && (
                <div className="slider-control slider-control-centerleft" onClick={goBack}>
                    <i className="icon icon-fw fas icon-angle-left icon-3x" />
                </div>
            )}
            {enableNextNavButton && (
                <div className="slider-control slider-control-centerright" onClick={goForward}>
                    <i className="icon icon-fw fas icon-angle-right icon-3x" />
                </div>
            )}
            <div className="slider-control-bottomleft">
                Slide <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong>
            </div>
        </div>
    );
}

/** @see https://www.npmjs.com/package/nuka-carousel for documentation of all props/options allowed */
const defaultCarouselOptions = {
    'autoplay': false,
    'autoplayInterval': 5000,
    'slidesToShow': 1,
    'easing': 'easeLinear', // Removed, controlled by native browser settings.
    'transitionMode': 'scroll',
    'showArrows': true,
    'showDots': true,
    'arrows': <Arrows />,
    'swiping': true, // Enable swiping (formerly dragging)
};

export class BasicCarousel extends React.PureComponent {

    static defaultProps = {
        'slides': [
            {
                'img': '/static/img/Metadata_structure_slides/Slide01.png',
                'alt': 'Slide 1 alt text',
                'width': 720,
                'height': 540
            },
            {
                'img': '/static/img/Metadata_structure_slides/Slide02.png',
                'alt': 'Slide 2 alt text',
                'width': 720,
                'height': 540
            },
            {
                'img': '/static/img/Metadata_structure_slides/Slide03.png',
                'alt': 'Slide 3 alt text',
                'width': 720,
                'height': 540
            }
        ],
        'showSlideCount': true,
        'carouselOptions' : defaultCarouselOptions
    };

    static propTypes = {
        'slides': PropTypes.arrayOf(PropTypes.shape({
            // Required:
            'img' : PropTypes.string.isRequired,
            // Optional, overrides slideHeight and slideWidth (if set) per slide
            'alt' : PropTypes.string,
            'width' : PropTypes.number,
            'height' : PropTypes.number
        })).isRequired,
        'showSlideCount': PropTypes.bool,
        'autoplay': PropTypes.bool,
        'slideHeight': PropTypes.number,
        'slideWidth': PropTypes.number,
        /** @see https://www.npmjs.com/package/nuka-carousel for documentation of all props/options allowed */
        'carouselOptions': PropTypes.shape({
            autoplay: PropTypes.bool,
            autoplayInterval: PropTypes.number,
            slidesToShow: PropTypes.number,
            easing: PropTypes.string, // Even though it's removed, we keep the type definition for consistency
            transitionMode: PropTypes.string,
            showArrows: PropTypes.bool,
            showDots: PropTypes.bool,
            arrows: PropTypes.element,
            swiping: PropTypes.bool
        })
    };

    static refFunc(elem) {
        setTimeout(() => {
            if (!elem) return;
            elem.style.opacity = 1;
        }, 10);
    }

    static allSlidesHaveDimensions(slides = []){
        const slidesLen = slides.length;
        for (var i = 0; i < slidesLen; i++){
            // When const/let are used inside a for loop in ES6+,
            // new function/closure is created.
            const { width = null, height = null } = slides[i];
            if (typeof width !== "number" || typeof height !== "number"){
                return false;
            }
        }
        return true;
    }

    constructor(props){
        super(props);
        this.memoized = {
            allSlidesHaveDimensions: memoize(BasicCarousel.allSlidesHaveDimensions)
        };
    }

    render() {
        const {
            slides = [],
            carouselOptions,
            slideHeight: commonSlideHeight = null,
            slideWidth: commonSlideWidth = null,
            autoplay = null
        } = this.props;

        const carouselProps = _.extend(
            defaultCarouselOptions,
            carouselOptions
        );

        if (typeof autoplay === "boolean") {
            carouselProps.autoplay = autoplay;
        }

        return (
            <div className="basic-carousel-wrapper" ref={BasicCarousel.refFunc} style={{ opacity: '0' }}>
                <Carousel {...carouselProps}>
                    {
                        slides.map(function ({ img: src, alt, width, height }, index) {
                            const style = {
                                "width": width || commonSlideWidth || undefined,
                                "height": height || commonSlideHeight || undefined
                            };
                            return (
                                <div className="text-center" key={index} style={{ minWidth: '100%' }}>
                                    <img {...{ src, alt, style }} />
                                </div>
                            );
                        })
                    }
                </Carousel>
            </div>
        );
    }
}