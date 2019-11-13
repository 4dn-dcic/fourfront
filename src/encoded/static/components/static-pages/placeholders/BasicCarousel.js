'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Carousel from 'nuka-carousel';

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
        'slideWidth': 720,
        'slideHeight': 540,
        'showSlideCount': true,
        'autoPlay': false
    };

    static propTypes = {
        'slides': PropTypes.array.isRequired,
        'slideWidth': PropTypes.number.isRequired,
        'slideHeight': PropTypes.number.isRequired,
        'showSlideCount': PropTypes.bool.isRequired,
        'autoPlay': PropTypes.bool.isRequired
    };

    static refFunc(elem) {
        setTimeout(() => {
            if (!elem) return;
            elem.style.opacity = 1;
        }, 10);
    }

    render() {
        const { slides, slideWidth, slideHeight, showSlideCount, autoPlay } = this.props;
        const carouselProps = {
            'slidesToShow': 1,
            'slidesToScroll': 1,
            'slideIndex': 0,
            'cellSpacing': 20,
            'speed': 700,
            //'cellAlign': 'center',
            'dragging': false,
            'easing': 'easeLinear',
            'transitionMode': 'scroll',
            'autoplay': autoPlay,
            'autoplayInterval': 5000,
            'initialSlideHeight': slideHeight,
            'initialSlideWidth': slideWidth,
            'renderCenterLeftControls': function (sliderProps) {
                const { previousSlide, currentSlide } = sliderProps;
                if (currentSlide === 0) return null;
                return <i className="icon icon-fw fas icon-angle-left icon-3x" onClick={previousSlide} />;
            },
            'renderCenterRightControls': function (sliderProps) {
                const { nextSlide, currentSlide, slideCount, slidesToShow } = sliderProps;
                if (currentSlide >= slideCount - slidesToShow) return null;
                return <i className="icon icon-fw fas icon-angle-right icon-3x" onClick={nextSlide} />;
            }
        };

        if (showSlideCount === true) {
            carouselProps.renderBottomLeftControls = function ({ currentSlide, slideCount }) {
                return <div>Slide <strong>{currentSlide + 1}</strong> of <strong>{slideCount}</strong></div>;
            };
        }
        //style
        const style = { 'width': slideWidth, 'height': slideHeight };

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