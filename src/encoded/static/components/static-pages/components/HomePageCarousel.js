'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button } from 'react-bootstrap';
import Carousel from 'nuka-carousel';
import { ajax } from './../../util';
import { BasicStaticSectionBody } from './BasicStaticSectionBody';


export class HomePageCarousel extends React.PureComponent {

    static defaultProps = {
        'settings' : {
            'autoplay' : true,
            'slidesToShow' : 3,
            'wrapAround' : true,
            'slidesToScroll' : 1,
            'pauseOnHover' : true,
            //'renderCenterLeftControls' : null,
            //'renderCenterRightControls' : null,
            'renderCenterLeftControls' : function({ previousSlide }){
                return <i className="icon icon-fw icon-angle-left" onClick={previousSlide} />;
            },
            'renderCenterRightControls' : function({ nextSlide }){
                return <i className="icon icon-fw icon-angle-right" onClick={nextSlide} />;
            },
            'renderBottomCenterControls' : null,
            'autoGenerateStyleTag' : false,
            'dragging' : false,
            'cellAlign' : 'center',
            'cellSpacing' : 20,
            //'cellPadding' : '0px 10px'
        }
    };

    constructor(props){
        super(props);
        this.refFunc = this.refFunc.bind(this);
        this.state = {
            'sections'  : null,
            'loading'   : true,
            'error'     : false
        };
    }

    componentDidMount(){
        this.searchForSlides();
    }

    searchForSlides(){

        var fallback = () => {
            this.setState({ 'loading' : false, 'error' : true });
        };

        ajax.load('/search/?type=StaticSection&submitted_by.uuid=986b362f-4eb6-4a9c-8173-3ab267307e3a&section_type=Home+Page+Slide&sort=name', (resp)=>{
            if (resp && Array.isArray(resp['@graph']) && resp['@graph'].length > 0){
                this.setState({
                    'sections' : resp['@graph'],
                    'loading' : false
                });
            }
        }, 'GET', fallback);
    }

    renderSlide(section, idx){
        var link    = (section && section.options && section.options.link) || null,
            title   = (!section.title ? null :
                <div className="title-container">
                    <h4 className="text-500">{ section.title }</h4>
                    { section.description ?
                        <p>{ section.description }</p>
                    : null }
                </div>
            ),
            inner = (
                <React.Fragment>
                    <div className="inner">
                        <BasicStaticSectionBody {..._.pick(section, 'filetype', 'options', 'content')} />
                    </div>
                    { title }
                </React.Fragment>
            );

        if (link){
            return <a className="homepage-carousel-slide is-link" key={idx} children={inner} href={link} />;
        }

        return <div className="homepage-carousel-slide" key={idx} children={inner} />;
    }

    refFunc(elem){
        setTimeout(function(){
            if (!elem) return;
            elem.style.opacity = 1;
        }, 0);
    }

    render(){

        var { loading, error, sections } = this.state;

        if (loading){
            return (
                <div className="mb-3 mt-3 text-center pt-2 pb-2" key="placeholder">
                    <h4 style={{ 'opacity' : 0.5 }}>
                        <i className="icon icon-spin icon-circle-o-notch"/>
                    </h4>
                </div>
            );
        }

        if (error || sections.length < 6){ // = not enough results
            return null;
        }

        return (
            <div className="homepage-carousel-container mb-3 mt-3" ref={this.refFunc} style={{ 'opacity' : 0 }} key="carousel">
                <Carousel {...this.props.settings} children={_.map(sections, this.renderSlide)} />
            </div>
        );

    }

}



