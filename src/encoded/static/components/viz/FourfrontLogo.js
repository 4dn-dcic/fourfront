'use strict';

import React from 'react';
import { NavItem, Navbar } from 'react-bootstrap';
import _ from 'underscore';
import * as d3 from 'd3';

/** Renders out the 4DN Logo SVG as a React element(s) */
export class FourfrontLogo extends React.PureComponent {

    static defaultProps = {
        'id'                        : "fourfront_logo_svg",
        'circlePathDefinitionOrig'  : "m1,30c0,-16.0221 12.9779,-29 29,-29c16.0221,0 29,12.9779 29,29c0,16.0221 -12.9779,29 -29,29c-16.0221,0 -29,-12.9779 -29,-29z",
        'circlePathDefinitionHover' : "m3.33331,34.33326c-2.66663,-17.02208 2.97807,-23.00009 29.99997,-31.33328c27.02188,-8.33321 29.66667,22.31102 16.6669,34.66654c-12.99978,12.35552 -15.64454,20.00017 -28.66669,19.00018c-13.02214,-0.99998 -15.33356,-5.31137 -18.00018,-22.33344z",
        'textTransformOrig'         : "translate(9, 37)",
        'textTransformHover'        : "translate(48, 24) scale(0.2, 0.6)",
        'fgCircleTransformOrig'     : "translate(50, 20) scale(0.35, 0.35) rotate(-135)",
        'fgCircleTransformHover'    : "translate(36, 28) scale(0.7, 0.65) rotate(-135)",
        'hoverDelayUntilTransform'  : 400,
        'title'                     : "Data Portal"
    };

    static svgElemStyle = {
        'verticalAlign' : 'middle',
        'display' : 'inline-block',
        'height' : '100%',
        'paddingBottom' : 10,
        'paddingTop' : 10,
        'transition' : "padding .3s, transform .3s",
        'maxHeight' : 80
    };

    static svgBGCircleStyle = {
        'fill' : "url(#fourfront_linear_gradient)",
        "stroke" : "transparent",
        "strokeWidth" : 1
    };

    static svgTextStyleOut = {
        'transition' : "letter-spacing 1s, opacity .7s, stroke .7s, stroke-width .7s, fill .7s",
        'fontSize' : 23,
        'fill' : '#fff',
        'fontFamily' : '"Mada","Work Sans",Helvetica,Arial,sans-serif',
        'fontWeight' : '600',
        'stroke' : 'transparent',
        'strokeWidth' : 0,
        'strokeLinejoin' : 'round',
        'opacity' : 1,
        'letterSpacing' : 0
    };

    static svgTextStyleIn = {
        'transition' : "letter-spacing 1s .4s linear, opacity .7s .4s, stroke .7s 4s, stroke-width .7s 4s, fill .7s .4s",
        'letterSpacing' : -14,
        'stroke' : 'rgba(0,0,0,0.2)',
        'opacity' : 0,
        'fill' : 'transparent',
        'strokeWidth' : 15
    };

    static svgInnerCircleStyleOut = {
        'transition': "opacity 1.2s",
        'opacity' : 0,
        'fill' : 'transparent',
        'strokeWidth' : 15,
        'stroke' : 'rgba(0,0,0,0.2)',
        'fontSize' : 23,
        'fontFamily' : '"Mada","Work Sans",Helvetica,Arial,sans-serif',
        'fontWeight' : '600',
        'strokeLinejoin' : 'round'
    };

    static svgInnerCircleStyleIn = {
        'transition': "opacity 1.2s .6s",
        'opacity' : 1
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
        const { circlePathDefinitionHover, textTransformHover, fgCircleTransformHover, hoverDelayUntilTransform } = this.props;
        // CSS styles controlled via stylesheets

        setTimeout(()=>{
            const { hover } = this.state;
            if (!hover) return; // No longer hovering. Cancel.
            d3.select(this.bgCircleRef.current)
                .interrupt()
                .transition()
                .duration(1000)
                .attr('d', circlePathDefinitionHover);

            d3.select(this.fgTextRef.current)
                .interrupt()
                .transition()
                .duration(700)
                .attr('transform', textTransformHover);

            d3.select(this.fgCircleRef.current)
                .interrupt()
                .transition()
                .duration(1200)
                .attr('transform', fgCircleTransformHover);

        }, hoverDelayUntilTransform);
    }

    setHoverStateOff(e){
        const { circlePathDefinitionOrig, textTransformOrig, fgCircleTransformOrig } = this.props;
        this.setState({ 'hover' : false }, ()=>{

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
        });
    }

    renderDefs(){
        return (
            <defs>
                <linearGradient id="fourfront_linear_gradient" x1="1" y1="30" x2="59" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#238bae"/>
                    <stop offset="1" stopColor="#8ac640"/>
                </linearGradient>
                <linearGradient id="fourfront_linear_gradient_darker" x1="1" y1="30" x2="59" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#238b8e"/>
                    <stop offset="1" stopColor="#8aa640"/>
                </linearGradient>
            </defs>
        );
    }

    render(){
        const { id, circlePathDefinitionOrig, textTransformOrig, fgCircleTransformOrig, onClick, title } = this.props;
        const { hover } = this.state;

        return (
            <Navbar.Brand>
                <NavItem href="/" onClick={onClick} onMouseEnter={this.setHoverStateOn} onMouseLeave={this.setHoverStateOff}>
                    <span className={"img-container" + (hover ? " is-hovering" : "")}>
                        <svg id={id} ref={this.svgRef} viewBox="0 0 60 60" style={FourfrontLogo.svgElemStyle}>
                            { this.renderDefs() }
                            <path d={circlePathDefinitionOrig} style={FourfrontLogo.svgBGCircleStyle} ref={this.bgCircleRef} />
                            <text transform={textTransformOrig} style={hover ? _.extend({}, FourfrontLogo.svgTextStyleOut, FourfrontLogo.svgTextStyleIn) : FourfrontLogo.svgTextStyleOut} ref={this.fgTextRef}>
                                4DN
                            </text>
                            <text transform={fgCircleTransformOrig} style={hover ? _.extend({}, FourfrontLogo.svgInnerCircleStyleOut, FourfrontLogo.svgInnerCircleStyleIn) : FourfrontLogo.svgInnerCircleStyleOut} ref={this.fgCircleRef}>
                                O
                            </text>
                        </svg>
                    </span>
                    <span className="navbar-title">{ title }</span>
                </NavItem>
            </Navbar.Brand>
        );
    }

}
