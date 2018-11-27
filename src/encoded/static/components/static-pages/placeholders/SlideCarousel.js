'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button } from 'react-bootstrap';
import Slider from 'react-slick';


export class SlickCarousel extends React.PureComponent {

    static defaultProps = {
        'settings' : {
            'dots'          : true,
            'infinite'      : true,
            'speed'         : 500,
            'slidesToShow'  : 1,
            'slidesToScroll': 1
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


export class SlideCarousel extends React.PureComponent {

    static defaultProps = {
        'fileLocation' : "/static/img/Metadata_structure_slides/"
    };

    constructor(props){
        super(props);
        this.renderChildImage = this.renderChildImage.bind(this);
    }

    renderChildImage(filename){
        var { fileLocation } = this.props,
            slideName   = fileLocation + filename,
            image       = <img width={720} height={540} alt={filename} src={slideName}/>;

        return (
            <div className="slide-img-container text-center">
                { image }
            </div>
        );
    }

    render(){

        var slides = [
            "Slide01.png", "Slide02.png", "Slide03.png", "Slide04.png",
            "Slide05.png", "Slide06.png", "Slide07.png", "Slide08.png",
            "Slide09.png", "Slide10.png", "Slide11.png", "Slide12.png",
            "Slide13.png", "Slide14.png", "Slide15.png", "Slide16.png"
        ];

        return (
            <SlickCarousel children={_.map(slides, this.renderChildImage)} />
        );
    }

}


export class SlideCarousel2 extends React.Component {

    constructor(props){
        super(props);
        this.handleForward = this.handleForward.bind(this);
        this.handleBackward = this.handleBackward.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            index: 0,
            slideTitles: [
                "Slide01.png", "Slide02.png", "Slide03.png", "Slide04.png",
                "Slide05.png", "Slide06.png", "Slide07.png", "Slide08.png",
                "Slide09.png", "Slide10.png", "Slide11.png", "Slide12.png",
                "Slide13.png", "Slide14.png", "Slide15.png", "Slide16.png"
            ]
        };
    }

    handleForward(){
        var nextIdx;
        if (this.state.index + 1 < this.state.slideTitles.length) {
            nextIdx = this.state.index + 1;
        }else{
            nextIdx = this.state.index;
        }
        this.setState({
            index: nextIdx
        });
    }

    handleBackward(){
        var nextIdx;
        if (this.state.index - 1 >= 0) {
            nextIdx = this.state.index - 1;
        }else{
            nextIdx = this.state.index;
        }
        this.setState({
            index: nextIdx
        });
    }

    render() {
        var slideName = "/static/img/Metadata_structure_slides/" + this.state.slideTitles[this.state.index];
        var slide = <img width={720} height={540} alt="720x540" src={slideName}></img>;
        return(
            <div className="slide-display">
                <div className="slide-controls">
                    <Button disabled={this.state.index == 0} bsSize="xsmall" onClick={this.handleBackward}>Previous</Button>
                    <Button disabled={this.state.index == this.state.slideTitles.length-1} bsSize="xsmall" onClick={this.handleForward}>Next</Button>
                </div>
                {slide}
            </div>
        );
    }

}
