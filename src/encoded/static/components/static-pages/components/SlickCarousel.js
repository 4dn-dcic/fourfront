'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Slider from 'react-slick';

export class SlickCarousel extends React.PureComponent {

    static defaultProps = {
        'settings' : {
            'dots'          : true,
            'infinite'      : false,
            'speed'         : 500,
            'slidesToShow'  : 1,
            'slidesToScroll': 1,
            //'centerMode'    : true,
            'lazyLoad'      : true,
            'adaptiveHeight': true,
            'arrows'        : true,
            'centerPadding' : 50
        }
    };

    render(){
        var { settings, children } = this.props;
        return (
            <div className="slider-container">
                <link rel="stylesheet" type="text/css" charset="UTF-8" href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick.min.css" />
                <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick-theme.min.css" />
                <Slider {...settings} children={children} />
            </div>
        );
    }
}

