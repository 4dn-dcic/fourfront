'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { requestAnimationFrame } from '@hms-dbmi-bgm/shared-portal-components/src/components/viz/utilities';


/**
 * Helper function to test if an Item is a HiglassViewConfig Item.
 * To be used by Components such as BasicStaticSectionBody to determine
 * what time of view to render.
 */
export function isHiglassViewConfigItem(context){
    if (!context) return false;
    if (Array.isArray(context['@type'])){
        // Ideal case is that @type is present. However it may not be embedded in all cases.
        return context['@type'].indexOf('HiglassViewConfig') > -1;
    }
    // Fallback test in case @type is not present;
    const itemAtId = object.itemUtil.atId(context);
    if (!itemAtId || itemAtId[0] !== '/') return false;
    const pathPartForType = itemAtId.slice(1).split('/', 1)[0];
    return pathPartForType === 'higlass-view-configs';
}


/**
 * Functional component to display loading indicator.
 *
 * @param {{ icon: string, title: JSX.Element|string }} props Props passed into this Component.
 */
export function HiGlassLoadingIndicator(props) {
    const { icon, title } = props;
    return (
        <React.Fragment>
            <h3>
                <i className={"icon icon-lg icon-" + (icon || "television")}/>
            </h3>
            { title || "Initializing" }
        </React.Fragment>
    );
}

/** Loaded upon componentDidMount; HiGlassComponent is not supported server-side. */
let HiGlassComponent = null;

export class HiGlassPlainContainer extends React.PureComponent {

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
        const { mountDelay } = this.props;
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

        }, mountDelay || 500);

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
        const { disabled, isValidating, tilesetUid, height, width, options, style, className, viewConfig, placeholder } = this.props;
        const { mounted, mountCount, hasRuntimeError } = this.state;
        let hiGlassInstance = null;
        const outerKey = "mount-number-" + mountCount;

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
        } else if (hasRuntimeError) {
            hiGlassInstance = (
                <div className="text-center" key={outerKey} style={placeholderStyle}>
                    <h4 className="text-400">Runtime Error</h4>
                </div>
            );
        } else {
            hiGlassInstance = (
                <div key={outerKey} className="higlass-instance" style={{ 'transition' : 'none', height, 'width' : width || null }} ref={this.instanceContainerRefFunction}>
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
                <link type="text/css" rel="stylesheet" href="https://unpkg.com/higlass@1.6.7/dist/hglib.css" crossOrigin="true" />
                {/*<script src="https://unpkg.com/higlass@0.10.19/dist/scripts/hglib.js"/>*/}
                <div className="higlass-wrapper">{ hiGlassInstance }</div>
            </div>
        );
    }

}
