'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Carousel from 'nuka-carousel';

/** @see https://www.npmjs.com/package/nuka-carousel for documentation of all props/options allowed */
const defaultCarouselOptions = {
    //'initialSlideHeight' : 540,
    //'initialSlideWidth' : 720,
    'autoplay': false,
    'autoplayInterval': 5000,
    'cellSpacing': 20,
    'cellAlign': "center",
    'heightMode' : "max",
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
            'img' : PropTypes.string.isRequired,
            'alt' : PropTypes.string
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

    constructor(props){
        super(props);
        this.renderCenterLeftControls = this.renderCenterLeftControls.bind(this);
        this.renderCenterRightControls = this.renderCenterRightControls.bind(this);
        this.renderBottomLeftControls = this.renderBottomLeftControls.bind(this);
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
            slideHeight = null,
            slideWidth = null,
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

        let commonImageStyle = null;

        if (typeof autoplay === "boolean") {
            carouselProps.autoplay = autoplay;
        }

        if (typeof slideHeight === "number" && typeof slideWidth === "number") {
            // I forgot if Nuka Carousel can automatically resize itself without presence of slideHeight/slideWidth, but think so.
            // If we set the below values, then will see multiple slides at once (e.g. current one, + slices of previous/next)
            // SEE: https://gyazo.com/35f4efc58d428bc18a335bbe3f1228e7
            // carouselProps.slideHeight = slideHeight + "px"; // Nuka Carousel requires "px" appended and treats floats as percentages, unlike React elements.
            // carouselProps.slideWidth = slideWidth + "px";

            // Instead we set initialSlideWidth and initialSlideHeight which keeps the 1 current slide visible and others hidden.
            // Nuka Carousel I believe might then resize slides if needed (?) idk. Or atleast stretch slide containers to be
            // 100% width of parent container or something.
            carouselProps.initialSlideHeight = 720;
            carouselProps.initialSlideWidth = 540;
            commonImageStyle = { // This maybe isn't needed (?)
                height: slideHeight,
                width: slideWidth
            };
        }

        return (
            <div className="basic-carousel-wrapper" ref={BasicCarousel.refFunc} style={{ opacity: '0' }}>
                <Carousel {...carouselProps}>
                    {
                        slides.map(function({ img: src, alt }, index) {
                            return (
                                <div className="text-center" key={index}>
                                    <img {...{ src, alt }} style={commonImageStyle} />
                                </div>
                            );
                        })
                    }
                </Carousel>
            </div>);
    }
}