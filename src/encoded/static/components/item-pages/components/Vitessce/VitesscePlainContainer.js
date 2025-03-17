//'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, object, ajax, isServerSide, logger } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { requestAnimationFrame } from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';
import { PackageLockLoader } from './../../../util/package-lock-loader';


/**
 * Functional component to display loading indicator.
 *
 * @param {{ icon: string, title: JSX.Element|string }} props Props passed into this Component.
 */
export function VitessceLoadingIndicator(props) {
    const { icon, title } = props;
    return (
        <React.Fragment>
            <h3>
                <i className={"icon icon-lg icon-" + (icon || "tv fas")}/>
            </h3>
            { title || "Initializing" }
        </React.Fragment>
    );
}

let vitessceDependencies = null;

export class VitesscePlainContainer extends React.PureComponent {

    static propTypes = {
        'config' : PropTypes.object.isRequired,
        'isValidating' : PropTypes.bool,
        'height' : PropTypes.number,
        'mountDelay' : PropTypes.number.isRequired,
        'onConfigUpdated': PropTypes.func
    };

    static defaultProps = {
        'isValidating' : false,
        'disabled' : false,
        'height' : 500,
        'config' : null,
        'mountDelay' : 500,
        'placeholder' : <VitessceLoadingIndicator/>
    };

    constructor(props){
        super(props);
        this.getVitessceComponent = this.getVitessceComponent.bind(this);

        this.state = {
            'mounted' : false,
            'mountCount' : 0,
            'hasRuntimeError' : false,
            'vitessceInitialized' : false
        };

        this.vcRef = React.createRef();
    }

    componentDidMount(){
        const { mountDelay, onConfigUpdated } = this.props;
        const finish = () => {
            this.setState(function(currState){
                return {
                    'mounted' : true,
                    'mountCount' : currState.mountCount + 1
                };
            }, () => {

                setTimeout(()=>{
                    this.setState({ "vitessceInitialized": true }, ()=>{
                        if (onConfigUpdated && typeof onConfigUpdated === 'function') {
                            const vc = this.getVitessceComponent();
                            if (vc) {
                                // vc.api.on("viewConfig", onViewConfigUpdated);
                            }
                        }
                    });
                }, 500);

            });
        };

        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).

            if (!vitessceDependencies) {
                window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility polyfill

                // Load in Vitessce libraries as separate JS file due to large size.
                import(
                    /* webpackChunkName: "vitessce-dependencies" */
                    'vitessce-dependencies'
                ).then((loadedDeps) =>{
                    vitessceDependencies = loadedDeps;

                    finish();
                });

            } else {
                finish();
            }

        }, mountDelay || 500);

    }

    componentWillUnmount(){
        this.setState({ 'mounted' : false });
    }

    componentDidCatch(){
        this.setState({ 'hasRuntimeError' : true });
    }

    getVitessceComponent(){
        return (this && this.vcRef && this.vcRef.current) || null;
    }

    render(){
        const { config, height, theme, ...passProps } = this.props;
        return (
            <PackageLockLoader>
                <VitesscePlainContainerBody {...passProps} {...{ config, height, theme }} {...this.state} ref={this.vcRef} />
            </PackageLockLoader>
        );
    }
}


const VitesscePlainContainerBody = React.forwardRef(function VitesscePlainContainerBody(props, ref){
    const { config, theme, hasRuntimeError, disabled, isValidating, mounted, vitessceInitialized, width, height, mountCount, placeholder, style, className, packageLockJson } = props;
    const outerKey = "mount-number-" + mountCount;
    const { packages: { 'node_modules/vitessce' : { version: vitessceVersionUsed = null } = {} } = {} } = packageLockJson || {};
    const { Vitessce } = vitessceDependencies || {};

    let vitessceInstance = null;
    const placeholderStyle = { width: width || null };
    if (isValidating || !mounted){
        if (typeof height === 'number' && height >= 140){
            placeholderStyle.height = height;
            placeholderStyle.paddingTop = (height / 2) - 40;
        }
        vitessceInstance = <div className="text-center" style={placeholderStyle} key={outerKey}>{ placeholder }</div>;
    } else if (disabled) {
        vitessceInstance = (
            <div className="text-center" key={outerKey} style={placeholderStyle}>
                <h4 className="text-400">Not Available</h4>
            </div>
        );
    } else if (hasRuntimeError) {
        vitessceInstance = (
            <div className="text-center" key={outerKey} style={placeholderStyle}>
                <h4 className="text-400">Runtime Error</h4>
            </div>
        );
    } else {
        /**
         * Fade in div element containing Vitessce component after Vitessce initiates & loads in first tile etc. (about 500ms).
         * For prettiness only.
         */
        const instanceContainerRefFunction = function(element){
            if (!element) return;
            setTimeout(function(){
                requestAnimationFrame(function(){
                    element.style.transition = null; // Use transition as defined in stylesheet
                    element.style.opacity = 1;
                });
            }, 500);
        };
        // TODO: REMOVE onConfigChange before merging into master
        vitessceInstance = (
            <div key={outerKey} className="vitessce-instance" style={{ 'transition' : 'none', 'height' : height, 'width' : width || null }} ref={instanceContainerRefFunction}>
                <Vitessce {...{ config, theme, width, height, ref }} onConfigChange={console.log} />
            </div>
        );
    }

    /**
     * TODO: Some state + UI functions to make vitessce view full screen.
     * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
     */
    return (
        <div className={"vitessce-view-container" + (className ? ' ' + className : '')} style={style}>
            <div className="vitessce-wrapper">{ vitessceInstance }</div>
        </div>
    );

});
