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
            'renderCenterLeftControls' : null,
            'renderCenterRightControls' : null
        }
    };

    constructor(props){
        super(props);
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
        return (
            <div style={{ 'height' : 300, 'backgroundColor' : '#eee' }}>
                <BasicStaticSectionBody {...section} />
            </div>
        );
    }

    render(){

        var { loading, error, sections } = this.state;

        if (loading){
            return (
                <div className="text-center pt-2 pb-2">
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
            <div>
                <h3 className="text-300 mt-3 mb-15">Featured</h3>
                <Carousel {...this.props.settings} children={_.map(sections, this.renderSlide)} />
            </div>
        );

    }

}



