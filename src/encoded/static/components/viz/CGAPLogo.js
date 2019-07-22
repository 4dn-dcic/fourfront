'use strict';

import React from 'react';
import { NavItem, Navbar } from 'react-bootstrap';
import _ from 'underscore';
import * as d3 from 'd3';


const commonStyle1 = {
    "fill" : "#4579b4",
    "fillOpacity" : 1,
    "stroke" :"#f8f8f8",
    "strokeWidth" : 0.25,
    "stroke-linejoin": "round",
    "stroke-linecap": "butt",
    "stroke-miterlimit": 4,
    "stroke-dasharray" : "none",
    "stroke-dashoffset" : 0,
    "strokeOpacity": 1,
    "paint-order" :"fill markers stroke"
};

const commonStyle2 = _.extend({}, commonStyle1, {
    "fill" : "#73a5de", //"#6793c5",
    //"stroke" :"#4a7eba",
    //"stroke" :"#fff",
});

const commonStyle1Hover = _.extend({}, commonStyle1, {
    "fillOpacity" : 0.7,
    "strokeWidth" : 1,
    "stroke" :"#3f6fa5",
    //"strokeOpacity": 0.7,
});

const commonTransform1 = "none";
const commonTransform1Hover = "scale(1.125, 1.125) translate(-13, -2)";
const commonTransform2 = "none";
const commonTransform2Hover = "scale(1.125, 1.125) translate(0, -2)";

const commonStyle2Hover = _.extend({}, commonStyle2, {
    "fillOpacity" : 0.8,
    "strokeOpacity": 0.8,
});


const svgElemStyle = {
    'verticalAlign' : "top",// 'middle',
    'display' : 'inline-block',
    'height' : '100%',
    'paddingTop' : 5,
    'paddingBottom' : 5,
    'transition' : "padding .3s, transform .3s",
    'maxHeight' : 80
};

const svgElemStyleHover = _.extend({}, svgElemStyle, {
    "paddingTop" : 0,
    "paddingBottom" : 0
});


export class CGAPLogo extends React.PureComponent {

    static defaultProps = {
        'id'                        : "logo_svg",
        'hoverDelayUntilTransform'  : 400
    };

    constructor(props){
        super(props);
        this.setHoverStateOnDoTiming = _.throttle(this.setHoverStateOnDoTiming.bind(this), 1000);
        this.setHoverStateOn    = this.setHoverStateOn.bind(this);
        this.setHoverStateOff   = this.setHoverStateOff.bind(this);

        this.svgRef             = React.createRef();
        this.bgCircleRef        = React.createRef();
        this.fgTextRef          = React.createRef();
        this.fgCircleRef        = React.createRef();

        this.state = { hover : false };
    }

    setHoverStateOn(e){
        this.setState({ 'hover': true }, this.setHoverStateOnDoTiming);
    }

    setHoverStateOnDoTiming(e){
        const { hoverDelayUntilTransform } = this.props;

        // CSS styles controlled via stylesheets
        setTimeout(()=>{
            if (!this.state.hover) return; // No longer hovering. Cancel.
            /*
            d3.select(this.bgCircleRef.current)
                .transition()
                .duration(1000)
                .attr('d', circlePathDefinitionHover);

            d3.select(this.fgTextRef.current)
                .transition()
                .duration(700)
                .attr('transform', textTransformHover);

            d3.select(this.fgCircleRef.current)
                .transition()
                .duration(1200)
                .attr('transform', fgCircleTransformHover);
            */

        }, hoverDelayUntilTransform);

    }

    setHoverStateOff(e){
        const { circlePathDefinitionOrig, textTransformOrig, fgCircleTransformOrig } = this.props;
        this.setState({ 'hover' : false }, ()=>{
            /*
            d3.select(this.bgCircleRef.current)
                .interrupt()
                .transition()
                .duration(1000)
                .attr('d', circlePathDefinitionOrig);

            d3.select(this.fgTextRef.current)
                .interrupt()
                .transition()
                .duration(1200)
                .attr('transform', textTransformOrig);

            d3.select(this.fgCircleRef.current)
                .interrupt()
                .transition()
                .duration(1000)
                .attr('transform', fgCircleTransformOrig);
            */
        });
    }

    renderDefs(){
        return (
            <defs>
                <linearGradient id="cgap_linear_gradient" x1="1" y1="30" x2="59" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#2b5f6f"/>
                    <stop offset="1" stopColor="#9cd6e2"/>
                </linearGradient>
            </defs>
        );
    }

    render(){
        const { id, circlePathDefinitionOrig, textTransformOrig, fgCircleTransformOrig, onClick } = this.props;
        const { hover } = this.state;

        const outerStyle = hover ? svgElemStyleHover : svgElemStyle;
        const style1 = hover ? commonStyle1Hover : commonStyle1;
        const style2 = hover ? commonStyle1Hover : commonStyle2;
        const transform1 = hover ? commonTransform1Hover : commonTransform1;
        const transform2 = hover ? commonTransform2Hover : commonTransform2;

        const containerCls = "img-container" + (hover ? " hover" : "");

        return (
            <div className={containerCls} onClick={onClick} onMouseEnter={this.setHoverStateOn} onMouseLeave={this.setHoverStateOff}>
                <svg id={id} ref={this.svgRef} style={outerStyle} viewBox="0 0 90 90">
                    <g transform="rotate(135,40.692863,29.984096) translate(0, -3)">
                        <path d="m 81.314453,24.175781 3.75,7.5 h 10.796875 l -3.71875,-7.5 z" style={style1} transform={transform1} />
                        <path d="M 61.289062,4.3085938 55.621094,11.865234 84.261719,31.1875 80.705078,24.072266 Z" style={style1} transform={transform1} />
                        <path d="M 0.66992188,4.5 4.3886719,12 h 9.8261721 l -3.75,-7.5 z" style={style1} transform={transform2} />
                        <path d="m 11.253906,4.9628906 3.570313,7.1367184 20.412109,19.773438 5.669922,-7.558594 z" style={style1} transform={transform2} />
                        <path d="M -0.56835938,19.923931 7.1035156,35.173892 H 25.59375 L 17.865234,19.923828 Z" style={style2} transform={transform1} />
                        <path d="m 35.765625,4.1757812 5.625,7.4999998 h 13.748047 l 5.625,-7.4999998 z" style={style2} transform={transform1} />
                        <path d="M 35.230469,4.296875 18.328125,19.728516 26.039062,34.94147 40.958984,11.933594 Z" style={style2} transform={transform1} />
                        <path d="m 41.390625,24.5 -5.625,7.5 h 25 l -5.625,-7.5 z" style={style2} transform={transform2} />
                        <path d="M 70.488281,1.25 55.570312,24.240234 61.300781,31.878906 78.205078,16.443359 Z" style={style2} transform={transform2} />
                        <path d="m 70.921875,1 7.746094,15.25 H 97.109375 L 89.423828,1 Z" style={style2} transform={transform2} />
                    </g>
                </svg>
                <span className="navbar-title">
                    CGAP
                    <i className="icon icon-fw icon-angle-right fas"/>
                </span>
            </div>
        );
    }

}
