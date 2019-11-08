'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Carousel from 'nuka-carousel';
import { console, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

export class PageCarousel extends React.PureComponent {

    static defaultProps = {
        'slides': [
            {
                'img': 'https://s3.amazonaws.com/4dn-dcic-public/static-pages/carousel-images/Survey2-4.png',
                'description': 'In less than 60 seconds, you can provide feedback on your data portal experience.',
                'title': 'We are listening!',
                'badge': null,
                'badgeBgColor': null,
                'link': 'https://goo.gl/forms/IQeOkONbeP9QsfzU2'
            },
            {
                'img': 'https://s3.amazonaws.com/4dn-dcic-public/static-pages/carousel-images/jupyterhub_w_border.png',
                'description': 'The new Jupyter Notebook Service for registered users provides immediate access to all 4DN data.',
                'title': '4DN JupyterHub',
                'badge': 'BETA',
                'badgeBgColor': null,
                'link': '/jupyterhub'
            },
            {
                'img': 'https://s3.amazonaws.com/4dn-dcic-public/static-pages/carousel-images/carousel-higlass.png',
                'description': 'Powered by HiGlass.',
                'title': '4DN Visualization Workspace',
                'badge': 'BETA',
                'badgeBgColor': null,
                'link': '/visualization/index'
            },
            {
                'img': 'https://s3.amazonaws.com/4dn-dcic-public/static-pages/carousel-images/heterogeneitypublicationfigures.png',
                'description': 'Finn et. al. utilize high throughput imaging to study heterogeneity in 3D genome structure.',
                'title': 'Data Highlight',
                'badge': null,
                'badgeBgColor': null,
                'link': '/publications/80007b23-7748-4492-9e49-c38400acbe60/'
            }
        ],
        'slidesToShow': 3,
        'slidesToScroll': 1,
        'slideIndex': 0,
        'autoPlay': false,
        'pauseOnHover': true,
        'wrapAround': true,
        'renderCenterLeftControls': function ({ previousSlide, currentSlide }) {
            if (currentSlide === 0) return null;
            return <i className="icon icon-fw fas icon-angle-left icon-2x" onClick={previousSlide} />;
        },
        'renderCenterRightControls': function (sliderProps) {
            var { nextSlide, currentSlide, slideCount, slidesToShow } = sliderProps;
            if (currentSlide >= slideCount - slidesToShow) return null;
            return <i className="icon icon-fw fas icon-angle-right icon-2x" onClick={nextSlide} />;
        },
        'dragging': false,
        'showBackground': false,
        'navControlPosition': 'outside' //possible values are 'outside', 'inside'
    };

    static propTypes = {
        'slides': PropTypes.array.isRequired,
        'slidesToShow': PropTypes.number.isRequired,
        'slidesToScroll': PropTypes.number.isRequired,
        'slideIndex': PropTypes.number.isRequired,
        'autoPlay': PropTypes.bool.isRequired,
        'pauseOnHover': PropTypes.bool.isRequired,
        'renderCenterLeftControls': PropTypes.func.isRequired,
        'renderCenterRightControls': PropTypes.func.isRequired,
        'dragging': PropTypes.bool.isRequired,
        'windowWidth': PropTypes.number,
        'showBackground': PropTypes.bool,
        'navControlPosition': PropTypes.string
    };

    static refFunc(elem) {
        setTimeout(() => {
            if (!elem) return;
            elem.style.opacity = 1;
        }, 10);
    }

    renderSlide(slide) {
        const { img, description, title, badge, badgeBgColor, link } = slide;

        const content = ((title || description) ?
            (
                <div className="title-container">
                    {title ? <h4 className="mt-0">{title}</h4> : null}
                    {description ? <p>{description}</p> : null}
                </div>
            ) : null);
        const badgeStyle = badgeBgColor ? { backgroundColor: badgeBgColor } : null;
        const innerFrame = (
            <React.Fragment>
                <div className="inner-container">
                    <div className="bg-image" style={img ? { 'backgroundImage': 'url(' + img + ')' } : null} />
                    {content}
                </div>
                <div className="inner-body">
                    {badge ?
                        <div className="inner-body">
                            <div className="slide-label" style={badgeStyle}>{badge}</div>
                        </div>
                        : null}
                </div>
            </React.Fragment>
        );

        if (link){
            const isExternalLink = link.slice(0, 4) === 'http';
            return (
                <a className="homepage-carousel-slide is-link" href={link} target={isExternalLink ? '_blank' : null} rel={isExternalLink ? 'noopener noreferrer' : null}>
                    { innerFrame }
                </a>
            );
        }

        return <div className="homepage-carousel-slide">{innerFrame}</div>;
    }

    render() {
        const { slides, showBackground, navControlPosition, windowWidth } = this.props;

        let settings = _.extend({}, _.pick(this.props,
            'slidesToShow',
            'slidesToScroll',
            'slideIndex',
            'autoPlay',
            'pauseOnHover',
            'wrapAround',
            'renderCenterLeftControls',
            'renderCenterRightControls',
            'dragging'));

        //adjustments for responsive display
        const gridState = layout.responsiveGridState(windowWidth || null);
        if (gridState === 'sm' || gridState === 'md' || slides.length === 2) {
            settings = _.extend({}, settings, {
                'slidesToShow': 2
            });
        } else if (gridState === 'xs' || slides.length === 1) {
            settings = _.extend({}, settings, {
                'slidesToShow': 1
            });
        }

        const wrapperClass = "homepage-carousel-wrapper"
            + (!showBackground ? " disable-carousel-background" : "")
            + (navControlPosition === 'inside' ? " carousel-nav-inside" : "");

        return (
            <div className={wrapperClass} ref={PageCarousel.refFunc} style={{ 'opacity': 0 }} key="carousel">
                <div className="container">
                    <div className="row">
                        <Carousel {...settings} children={_.map(slides, this.renderSlide)} />
                    </div>
                </div>
            </div>
        );
    }
}