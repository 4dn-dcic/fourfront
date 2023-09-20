//'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, object, ajax, navigate, isServerSide, WindowEventDelegator, logger } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { requestAnimationFrame } from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';
import { PackageLockLoader } from './../../../util/package-lock-loader';


/**
 * Helper function to test if an Item is a MicroscopeConfiguration Item.
 * To be used by Components such as BasicStaticSectionBody to determine
 * what time of view to render.
 */
export function isMicroscopeConfigurationItem(context){
    if (!context) return false;
    if (Array.isArray(context['@type'])){
        // Ideal case is that @type is present. However it may not be embedded in all cases.
        return context['@type'].indexOf('MicroscopeConfiguration') > -1;
    }
    // Fallback test in case @type is not present;
    const itemAtId = object.itemUtil.atId(context);
    if (!itemAtId || itemAtId[0] !== '/') return false;
    const pathPartForType = itemAtId.slice(1).split('/', 1)[0];
    return pathPartForType === 'microscope-configurations';
}


/**
 * Functional component to display loading indicator.
 *
 * @param {{ icon: string, title: JSX.Element|string }} props Props passed into this Component.
 */
export function MicroMetaLoadingIndicator(props) {
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

let microMetaDependencies = null;

export class MicroMetaPlainContainer extends React.PureComponent {

    static propTypes = {
        'isValidating' : PropTypes.bool,
        'height' : PropTypes.number,
        'mountDelay' : PropTypes.number.isRequired,
    };

    static defaultProps = {
        'isValidating' : false,
        'disabled' : false,
        'height' : 500,
        'mountDelay' : 500,
        'placeholder' : <MicroMetaLoadingIndicator/>,
    };

    constructor(props){
        super(props);
        this.getMicroMetaAppComponent = this.getMicroMetaAppComponent.bind(this);
        this.updateContainerOffsets = this.updateContainerOffsets.bind(this);

        this.state = {
            'mounted' : false,
            'mountCount' : 0,
            'hasRuntimeError' : false,
            'microMetaInitialized' : false,
            'containerOffsetLeft': 0,
            'containerOffsetTop': 0
        };

        this.mmRef = React.createRef();
        this.containerElemRef = React.createRef();
    }

    componentDidMount(){
        const { mountDelay } = this.props;
        const finish = () => {
            this.setState(function(currState){
                return {
                    'mounted' : true,
                    'mountCount' : currState.mountCount + 1
                };
            }, () => {

                setTimeout(()=>{
                    this.setState({ "microMetaInitialized": true }, ()=>{
                        WindowEventDelegator.addHandler("scroll", this.updateContainerOffsets);
                        this.updateContainerOffsets();
                    });
                }, 500);

            });
        };

        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).

            if (!microMetaDependencies) {
                window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility polyfill

                // Load in MicroMeta libraries as separate JS file due to large size.
                import(
                    /* webpackChunkName: "micrometa-dependencies" */
                    'micrometa-dependencies'
                ).then((loadedDeps) =>{
                    microMetaDependencies = loadedDeps;
                    finish();
                });

            } else {
                finish();
            }

        }, mountDelay || 500);

    }

    componentWillUnmount(){
        WindowEventDelegator.removeHandler("scroll", this.updateContainerOffsets);
        this.setState({ 'mounted' : false });
    }

    componentDidCatch(){
        this.setState({ 'hasRuntimeError' : true });
    }

    componentDidUpdate(pastProps, pastState){
        const { isFullscreen, windowWidth, windowHeight } = this.props;
        const { mounted } = this.state;
        if (mounted && (isFullscreen !== pastProps.isFullscreen || windowWidth !== pastProps.windowWidth || windowHeight !== pastProps.windowHeight)) {
            setTimeout(this.updateContainerOffsets, 500); // Allow time for browser to repaint
        }
    }

    updateContainerOffsets(){
        const containerElem = this.containerElemRef.current;
        if (!containerElem) {
            logger.error("Couldn't get container elem");
            throw new Error("Couldn't get container elem");
        }
        // Relative to window/viewport, not document.
        const boundingRect = containerElem.getBoundingClientRect();
        this.setState({
            containerOffsetTop: boundingRect.top,
            containerOffsetLeft: boundingRect.left
        });
    }

    getMicroMetaAppComponent(){
        return (this && this.mmRef && this.mmRef.current) || null;
    }

    render(){
        const fRefs = { containerRef: this.containerElemRef, appRef: this.mmRef };
        return (
            <PackageLockLoader>
                <MicroMetaPlainContainerBody {...this.props} {...this.state} ref={fRefs} />
            </PackageLockLoader>
        );
    }
}

/** Path to images directory/CDN. Once is published to NPM, will change to unpkg CDN URL. */
const imagesPathSVG = "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/versions/2-01-1/images/svg/";
const imagesPathPNG = "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/versions/2-01-1/images/png/";

const MicroMetaPlainContainerBody = React.forwardRef((props, ref) => <MMPlainContainerBody {...props} forwardRef={ref} />);
class MMPlainContainerBody extends React.PureComponent {

    constructor(props){
        super(props);
        this.zoomInOutControl = this.zoomInOutControl.bind(this);
        this.handleZoomInOutChange = this.handleZoomInOutChange.bind(this);

        this.state = {
            scalingFactor: 0.7
        };
    }

    zoomInOutControl(){
        const { scalingFactor = 0.5 } = this.state;
        const valueScalingFactor = Math.round(scalingFactor * 100);
        return (
            <div className="micro-meta-zoom">
                <div className="mr-2">Zoom ({valueScalingFactor}%)</div>
                <div style={{ paddingTop: '5px' }}>
                    <input type="range" min="0" max="100" value={valueScalingFactor} onChange={this.handleZoomInOutChange} style={{ cursor: 'pointer' }} />
                </div>
            </div>
        );
    }

    handleZoomInOutChange(e){
        const round = (number, decimalPlaces) => {
            const factorOfTen = Math.pow(10, decimalPlaces);
            return Math.round(number * factorOfTen) / factorOfTen;
        };

        const value = e.target.value;
        const scalingFactor = round(value / 100, 2);
        this.setState({ 'scalingFactor': scalingFactor });
    }

    render() {
        const { microscopeConfig, onSaveMicroscope, hasRuntimeError, zoomVisible: propZoomVisible, disabled, isValidating, mounted, width, height, containerOffsetLeft, containerOffsetTop, mountCount, placeholder, style, className, packageLockJson, forwardRef } = this.props;
        const { containerRef, appRef } = forwardRef;
        const { scalingFactor } = this.state;
        const outerKey = "mount-number-" + mountCount;
        const { packages: { 'node_modules/micro-meta-app-react': { version: microMetaVersionUsed = null } = {} } = {} } = packageLockJson || {};
        const { MicroMetaAppReact } = microMetaDependencies || {};

        const placeholderStyle = { width: width || null };
        if (typeof height === 'number' && height >= 140) {
            placeholderStyle.height = height;
            placeholderStyle.paddingTop = (height / 2) - 40;
        }

        let zoomVisible = false;
        let microMetaInstance = null;
        if (isValidating || !mounted) {
            microMetaInstance = <div className="text-center" style={placeholderStyle} key={outerKey}>{placeholder}</div>;
        } else if (disabled) {
            microMetaInstance = (
                <div className="text-center" key={outerKey} style={placeholderStyle}>
                    <h4 className="text-400">Not Available</h4>
                </div>
            );
        } else if (hasRuntimeError) {
            microMetaInstance = (
                <div className="text-center" key={outerKey} style={placeholderStyle}>
                    <h4 className="text-400">Runtime Error</h4>
                </div>
            );
        } else {
            const passProps = {
                width, height,
                containerOffsetLeft,
                containerOffsetTop,
                onSaveMicroscope,
                imagesPathSVG,
                imagesPathPNG,
                scalingFactor,
                key: "4dn-micrometa-app",
                microscope: microscopeConfig,
                isCreatingNewMicroscope: true,
                isLoadingMicroscope: false,
                isLoadingSettings: false,
                isLoadingImage: false,
                is4DNPortal: true,
                hasImport: true,
                isToolbarHidden: true,
                isDebug: true,
                onReturnToMicroscopeList: function () {
                    navigate('/microscope-configurations/');
                },
                onLoadSchema: function (complete, resolve) {
                    window
                        .fetch(
                            "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/versions/2-01-1/fullSchema.json"
                        )
                        .then(function (resp) {
                            return resp.text();
                        })
                        .then(function (respText) {
                            const schema = JSON.parse(respText);
                            complete(schema, resolve);
                        });
                },
                onLoadDimensions: function (complete, resolve) {
                    window
                        .fetch(
                            "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/versions/2-01-1/dimensions/MicroscopeDimensions.json"
                        )
                        .then(function (resp) {
                            return resp.text();
                        })
                        .then(function (respText) {
                            const dimensions = JSON.parse(respText);
                            complete(dimensions, resolve);
                        });
                },
                onLoadTierList: function (complete, resolve) {
                    window
                        .fetch(
                            "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/versions/2-01-1/tiers/TierList.json"
                        )
                        .then(function (resp) {
                            console.log(resp);
                            return resp.text();
                        })
                        .then(function (respText) {
                            var tierList = JSON.parse(respText);
                            complete(tierList, resolve);
                        });
                },
            };

            /**
             * Fade in div element containing MicroMetaComponent after MicroMeta initiates & loads in first tile etc. (about 500ms).
             * For prettiness only.
             */
            // const instanceContainerRefFunction = function (element) {
            //     if (!element) return;
            //     setTimeout(function () {
            //         requestAnimationFrame(function () {
            //             element.style.transition = null; // Use transition as defined in stylesheet
            //             element.style.opacity = 1;
            //         });
            //     }, 500);
            // };
            microMetaInstance = (
                <div key={outerKey} className="micro-meta-app-instance" style={{ 'transition': 'none', 'height': height, 'width': width || null }} ref={containerRef}>
                    <MicroMetaAppReact {...passProps} ref={appRef} />
                </div>
            );
            zoomVisible = !!propZoomVisible;
        }

        /**
         * TODO: Some state + UI functions to make micro meta app full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className={"micro-meta-app-container" + (className ? ' ' + className : '')} style={style}>
                {/* { microMetaVersionUsed === null ? null : <link type="text/css" rel="stylesheet" href={`https://unpkg.com/higlass@${higlassVersionUsed}/dist/hglib.css`} crossOrigin="true" /> } */}
                <div className="micro-meta-app-wrapper">{microMetaInstance}</div>
                { zoomVisible ? this.zoomInOutControl() : null }
            </div>
        );
    }
}
