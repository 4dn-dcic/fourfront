'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import Carousel from 'nuka-carousel';

/** @see https://www.npmjs.com/package/nuka-carousel for documentation of all props/options allowed */
const defaultCarouselOptions = {
    // Populated from props.slideHeight & props.slideWidth:
    //'initialSlideHeight' : 540,
    //'initialSlideWidth' : 720,
    'autoplay': false,
    'autoplayInterval': 5000,
    'cellSpacing': 20,
    'cellAlign': "center",
    // Set if no image slide dimensions are supplied.
    //'heightMode' : "max",
    'slidesToShow': 1,
    'slidesToScroll': 1,
    'slideIndex': 0,
    'speed': 700,
    'dragging': true,
    'easing': 'easeLinear',
    'transitionMode': 'scroll'
};

export class BasicCarousel extends React.PureComponent {

    static defaultProps = {
        'slides': [
            {
                'img': '/static/img/Metadata_structure_slides/Slide01.png',
                'alt': 'Slide 1 alt text'
            },
            {
                'img': '/static/img/Metadata_structure_slides/Slide02.png',
                'alt': 'Slide 2 alt text'
            },
            {
                'img': '/static/img/Metadata_structure_slides/Slide03.png',
                'alt': 'Slide 3 alt text'
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
        'carouselOptions' : PropTypes.shape({
            'autoplay' : PropTypes.bool,
            'autoplayInterval' : PropTypes.number,
            'autoplayReverse' : PropTypes.bool,
            'cellAlign' : PropTypes.oneOf(['left', 'center', 'right']),
            'cellSpacing' : PropTypes.number,
            'dragging' : PropTypes.bool,
            'easing' : PropTypes.string,
            'edgeEasing' : PropTypes.string,
            'heightMode' : PropTypes.oneOf(['first', 'current', 'max']),
            'slidesToShow' : PropTypes.number,
            'slidesToScroll' : PropTypes.number,
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
        this.renderCenterLeftControls = this.renderCenterLeftControls.bind(this);
        this.renderCenterRightControls = this.renderCenterRightControls.bind(this);
        this.renderBottomLeftControls = this.renderBottomLeftControls.bind(this);
        this.memoized = {
            allSlidesHaveDimensions : memoize(BasicCarousel.allSlidesHaveDimensions)
        };
    }

    renderCenterLeftControls(sliderProps){
        const { previousSlide, currentSlide } = sliderProps;
        if (currentSlide === 0) return null;
        return <i className="icon icon-fw fas icon-angle-left icon-3x" onClick={previousSlide} />;
    }

    renderCenterRightControls(sliderProps){
        const { nextSlide, currentSlide, slideCount, slidesToShow } = sliderProps;
        if (currentSlide >= slideCount - slidesToShow) return null;
        return <i className="icon icon-fw fas icon-angle-right icon-3x" onClick={nextSlide} />;
    }

    renderBottomLeftControls({ currentSlide, slideCount }){
        return <div>Slide <strong>{currentSlide + 1}</strong> of <strong>{slideCount}</strong></div>;
    }

    render() {
        const {
            slides = [],
            showSlideCount,
            carouselOptions,
            slideHeight: commonSlideHeight = null,
            slideWidth: commonSlideWidth = null,
            autoplay = null
        } = this.props;

        const carouselProps = _.extend(
            {
                renderCenterLeftControls: this.renderCenterLeftControls,
                renderCenterRightControls: this.renderCenterRightControls
            },
            defaultCarouselOptions,
            carouselOptions
        );

        if (showSlideCount === true) {
            carouselProps.renderBottomLeftControls = this.renderBottomLeftControls;
        }

        if (typeof autoplay === "boolean") {
            carouselProps.autoplay = autoplay;
        }

        if (typeof commonSlideHeight === "number" && typeof commonSlideWidth === "number") {
            // I forgot if Nuka Carousel can automatically resize itself without presence of commonSlideHeight/slideWidth, but think so.
            // If we set the below values, then will see multiple slides at once (e.g. current one, + slices of previous/next)
            // SEE: https://gyazo.com/35f4efc58d428bc18a335bbe3f1228e7
            // carouselProps.slideHeight = commonSlideHeight + "px"; // Nuka Carousel requires "px" appended and treats floats as percentages, unlike React elements.
            // carouselProps.slideWidth = commonSlideWidth + "px";

            // Instead we set initialSlideWidth and initialSlideHeight which keeps the 1 current slide visible and others hidden.
            // Nuka Carousel I believe might then resize slides if needed (?) idk. Or atleast stretch slide containers to be
            // 100% width of parent container or something.
            carouselProps.initialSlideHeight = commonSlideHeight;
            carouselProps.initialSlideWidth = commonSlideWidth;
        } else if (!this.memoized.allSlidesHaveDimensions(slides)){
            // No dimensions set anywhere, set heightMode: max to try to calculate.
            // (unless set already)
            carouselProps.heightMode = carouselProps.heightMode || "max";
        }

        return (
            <div className="basic-carousel-wrapper" ref={BasicCarousel.refFunc} style={{ opacity: '0' }}>
                <Carousel {...carouselProps}>
                    {
                        slides.map(function({ img: src, alt, width, height }, index) {
                            const style = {
                                "width": width || commonSlideWidth || undefined,
                                "height": height || commonSlideHeight || undefined
                            };
                            return (
                                <div className="text-center" key={index}>
                                    <img {...{ src, alt, style }} />
                                </div>
                            );
                        })
                    }
                </Carousel>
            </div>);
    }
}