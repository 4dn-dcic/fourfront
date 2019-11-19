'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Carousel from 'nuka-carousel';

/** @see https://www.npmjs.com/package/nuka-carousel for documentation of all props/options allowed */
const defaultCarouselOptions = {
    'initialSlideHeight' : 540,
    'initialSlideWidth' : 720,
    'autoplay': false,
    'autoplayInterval': 5000,
    'cellSpacing': 20,
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
        'slides': PropTypes.array.isRequired,
        'showSlideCount': PropTypes.bool.isRequired,
        'autoPlay': PropTypes.bool.isRequired,
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
        const { slides, showSlideCount, carouselOptions } = this.props;
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

        //style
        //const style = { 'width': slideWidth, 'height': slideHeight };
        const style = {};

        return (
            <div className="basic-carousel-wrapper" ref={BasicCarousel.refFunc} style={{ opacity: '0' }}>
                <Carousel {...carouselProps}>
                    {
                        _.map(slides, function (slide, index) {
                            return (
                                <div className="text-center" key={'slide-' + index}>
                                    <img {...{ src: slide.img, style, alt: slide.alt }} />
                                </div>
                            );
                        })
                    }
                </Carousel>
            </div>);
    }
}