'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Carousel from 'nuka-carousel';



export class SlideCarousel extends React.PureComponent {

    static defaultProps = {
        'fileLocation' : "/static/img/Metadata_structure_slides/",
        'carouselProps' : {
            'cellSpacing' : 20,
            'speed' : 700,
            'cellAlign' : 'center',
            'slideWidth' : 1,
            'slideHeight' : '540px',
            'dragging' : false,
            'easing' : 'easeLinear',
            'transitionMode' : 'fade',
            'renderBottomCenterControls' : null
        }
    };

    render(){
        var { fileLocation, carouselProps } = this.props,
            style   = { 'width' : 720, 'height' : 540 },
            slides = [
                "Slide01.png", "Slide02.png", "Slide03.png", "Slide04.png",
                "Slide05.png", "Slide06.png", "Slide07.png", "Slide08.png",
                "Slide09.png", "Slide10.png", "Slide11.png", "Slide12.png",
                "Slide13.png", "Slide14.png", "Slide15.png", "Slide16.png"
            ];

        return (
            <Carousel {...carouselProps}>
                {
                    _.map(slides, function(filename){
                        var src = fileLocation + filename;
                        return (
                            <div className="text-center" key={filename}>
                                <img {...{ src, style }} alt={filename} />
                            </div>
                        );
                    })
                }
            </Carousel>
        );

    }

}
