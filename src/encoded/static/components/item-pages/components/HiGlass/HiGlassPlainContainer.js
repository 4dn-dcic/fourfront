'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ajax, console } from './../../../util';
import { requestAnimationFrame } from './../../../viz/utilities';


let HiGlassComponent = null; // Loaded after componentDidMount as not supported server-side.

export function HiGlassLoadingIndicator(props) {
    return (
        <React.Fragment>
            <h3>
                <i className={"icon icon-lg icon-" + (props.icon || "television")}/>
            </h3>
            { props.title || "Initializing" }
        </React.Fragment>
    );
}

export class HiGlassPlainContainer extends React.PureComponent {

    static does2DTrackExist(viewConfig){

        var found = false;

        _.forEach(viewConfig.views || [], function(view){
            if (found) return;
            _.forEach((view.tracks && view.tracks.center) || [], function(centerTrack){
                if (found) return;
                if (centerTrack.position === 'center') {
                    found = true;
                }
            });
        });

        return found;
    }

    static getPrimaryViewID(viewConfig){
        if (!viewConfig || !Array.isArray(viewConfig.views) || viewConfig.views.length === 0){
            return null;
        }
        return _.uniq(_.pluck(viewConfig.views, 'uid'))[0];
    }

    static correctTrackDimensions(hiGlassComponent){
        requestAnimationFrame(()=>{
            _.forEach(hiGlassComponent.tiledPlots, (tp) => tp && tp.measureSize());
        });
    }

    static propTypes = {
        'viewConfig' : PropTypes.object.isRequired,
        'isValidating' : PropTypes.bool,
        'height' : PropTypes.number,
        'mountDelay' : PropTypes.number.isRequired
    };

    static defaultProps = {
        'options' : { 'bounded' : true },
        'isValidating' : false,
        'disabled' : false,
        'height' : 500,
        'viewConfig' : null,
        'mountDelay' : 500,
        'placeholder' : <HiGlassLoadingIndicator/>,
    };

    constructor(props){
        super(props);
        this.instanceContainerRefFunction = this.instanceContainerRefFunction.bind(this);
        this.correctTrackDimensions = this.correctTrackDimensions.bind(this);
        this.getHiGlassComponent = this.getHiGlassComponent.bind(this);

        this.state = {
            'mounted' : false,
            'mountCount' : 0,
            'hasRuntimeError' : false
        };

        this.hgcRef = React.createRef();
    }

    componentDidMount(){

        const finish = () => {
            this.setState(function(currState){
                return { 'mounted' : true, 'mountCount' : currState.mountCount + 1 };
            }, () => {
                setTimeout(this.correctTrackDimensions, 500);
            });
        };

        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).
            if (!HiGlassComponent) {
                window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility polyfill

                // Load in HiGlass libraries as separate JS file due to large size.
                // @see https://webpack.js.org/api/module-methods/#requireensure
                require.ensure(['higlass/dist/hglib'], (require) => {
                    const hglib = require('higlass/dist/hglib');
                    HiGlassComponent = hglib.HiGlassComponent;
                    finish();
                }, "higlass-utils-bundle");

                // Alternative, newer version of above -- currently the 'magic comments' are
                // not being picked up (?) though so the above is used to set name of JS file.
                //import(
                //    /* webpackChunkName: "higlass-bundle" */
                //    'higlass/dist/hglib'
                //).then((hglib) =>{
                //    HiGlassComponent = hglib.HiGlassComponent;
                //    finish();
                //});

            } else {
                finish();
            }

        }, this.props.mountDelay || 500);

    }

    correctTrackDimensions(){
        var hgc = this.getHiGlassComponent();
        if (hgc){
            HiGlassPlainContainer.correctTrackDimensions(hgc);
        } else {
            console.error('NO HGC');
        }
    }

    componentWillUnmount(){
        this.setState({ 'mounted' : false });
    }

    componentDidCatch(){
        this.setState({ 'hasRuntimeError' : true });
    }

    /**
     * Fade in div element containing HiGlassComponent after HiGlass initiates & loads in first tile etc. (about 500ms).
     * For prettiness only.
     */
    instanceContainerRefFunction(element){
        if (element){
            setTimeout(function(){
                requestAnimationFrame(function(){
                    element.style.transition = null; // Use transition as defined in stylesheet
                    element.style.opacity = 1;
                });
            }, 500);
        }
    }

    getHiGlassComponent(){
        return (this && this.hgcRef && this.hgcRef.current) || null;
    }

    /**
     * This returns the viewconfig currently stored in PlainContainer _state_.
     * We should adjust this to instead return `JSON.parse(hgc.api.exportViewConfigAsString())`,
     * most likely, to be of any use because HiGlassComponent keeps its own representation of the
     * viewConfig.
     *
     * @todo Change to the above once needed. Don't rely on until then.
     */
    getCurrentViewConfig(){
        var hgc = this.getHiGlassComponent();
        return (hgc && hgc.state.viewConfig) || null;
    }

    render(){
        var { disabled, isValidating, tilesetUid, height, width, options, style,
            className, viewConfig, placeholder
            } = this.props,
            hiGlassInstance = null,
            mounted         = (this.state && this.state.mounted) || false,
            outerKey        = "mount-number-" + this.state.mountCount;

        if (isValidating || !mounted){
            var placeholderStyle = {};
            if (typeof height === 'number' && height >= 140){
                placeholderStyle.height = height;
                placeholderStyle.paddingTop = (height / 2) - 40;
            }
            hiGlassInstance = <div className="text-center" style={placeholderStyle} key={outerKey}>{ placeholder }</div>;
        } else if (disabled) {
            hiGlassInstance = (
                <div className="text-center" key={outerKey} style={placeholderStyle}>
                    <h4 className="text-400">Not Available</h4>
                </div>
            );
        } else if (this.state.hasRuntimeError) {
            hiGlassInstance = (
                <div className="text-center" key={outerKey} style={placeholderStyle}>
                    <h4 className="text-400">Runtime Error</h4>
                </div>
            );
        } else {
            hiGlassInstance = (
                <div key={outerKey} className="higlass-instance" style={{ 'transition' : 'none', 'height' : height, 'width' : width || null }} ref={this.instanceContainerRefFunction}>
                    <HiGlassComponent {...{ options, viewConfig, width, height }} ref={this.hgcRef} />
                </div>
            );
        }

        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className={"higlass-view-container" + (className ? ' ' + className : '')} style={style}>
                <link type="text/css" rel="stylesheet" href="https://unpkg.com/higlass@1.2.8/dist/hglib.css" crossOrigin="true" />
                {/*<script src="https://unpkg.com/higlass@0.10.19/dist/scripts/hglib.js"/>*/}
                <div className="higlass-wrapper row">{ hiGlassInstance }</div>
            </div>
        );
    }

}
