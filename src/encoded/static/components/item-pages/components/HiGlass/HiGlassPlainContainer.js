'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { isServerSide, ajax, console, fileUtil } from './../../../util';
import { requestAnimationFrame } from './../../../viz/utilities';
import { HiGlassLocalStorage } from './HiGlassLocalStorage';


let HiGlassComponent = null; // Loaded after componentDidMount as not supported server-side.


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

    static propTypes = {
        'viewConfig' : PropTypes.object.isRequired,
        'isValidating' : PropTypes.bool,
        'height' : PropTypes.number,
        'groupID' : PropTypes.string
    };

    static defaultProps = {
        'options' : { 'bounded' : true },
        'isValidating' : false,
        'disabled' : false,
        'height' : 400,
        'viewConfig' : null,
        'groupID' : null
    };

    constructor(props){
        super(props);
        this.initializeStorage = this.initializeStorage.bind(this);
        this.instanceContainerRefFunction = this.instanceContainerRefFunction.bind(this);
        this.getPrimaryViewID = this.getPrimaryViewID.bind(this);
        this.bindHiGlassEventHandlers = this.bindHiGlassEventHandlers.bind(this);
        this.updateCurrentDomainsInStorage = _.debounce(this.updateCurrentDomainsInStorage.bind(this), 200);

        this.initializeStorage(props); // Req'd before this.storagePrefix can be referenced.

        this.state = {
            'mounted' : false,
            'hasRuntimeError' : false,
            'viewConfig' : props.viewConfig
        };
    }


    initializeStorage(props = this.props){
        this.storagePrefix = props.groupID ? HiGlassLocalStorage.DEFAULT_PREFIX + props.groupID + '_' : HiGlassLocalStorage.DEFAULT_PREFIX; // Cache it
        this.storage = new HiGlassLocalStorage(this.storagePrefix);
    }

    componentDidMount(){
        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).
            if (!HiGlassComponent) {
                window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility
                // Would ideally load non-compiled app, but requires CSS webpack loaders (see HiGlass webpack.config.js).
                //HiGlassComponent = require('higlass/app/scripts/hglib').HiGlassComponent;
                HiGlassComponent = require('higlass/dist/hglib').HiGlassComponent;
            }
            this.setState({ 'mounted' : true });
        }, 500);
    }

    componentDidCatch(){
        this.setState({ 'hasRuntimeError' : true });
    }

    componentWillReceiveProps(nextProps){
        var nextState = {};

        if (nextProps.groupID !== this.props.groupID) {
            this.initializeStorage(nextProps); // Doesn't update own HiGlassComponent (or its viewConfig), but starts saving location to new groupID instance. May change depending on requirements.
        }

        if (nextProps.height !== this.props.height || nextProps.viewConfig !== this.props.viewConfig){
            nextState.viewConfig = nextProps.viewConfig;
        }

        if (_.keys(nextState).length > 0){
            this.setState(nextState);
        }
    }

    componentDidUpdate(pastProps, pastState){
        var hiGlassComponentExists = !!(this.refs.hiGlassComponent);
        if (!this.hiGlassComponentExists && hiGlassComponentExists){
            this.bindHiGlassEventHandlers();
            console.info('Binding event handlers to HiGlassComponent.');
            // Check if we have same initialDomains as props, which indicates it came not from storage, so then zoom out to extents.
            /*
            var viewConfig = this.state.viewConfig;
            if (viewConfig && Array.isArray(viewConfig.views)){
                _.forEach(viewConfig.views, (v) => {
                    if (
                        (v.initialXDomain && v.initialXDomain === DEFAULT_GEN_VIEW_CONFIG_OPTIONS.initialDomains.x) &&
                        (v.initialYDomain && v.initialYDomain === DEFAULT_GEN_VIEW_CONFIG_OPTIONS.initialDomains.y)
                    ) {
                        console.info('Zooming view w/ uid ' + v.uid + ' to extents');
                        this.refs.hiGlassComponent.api.zoomToDataExtent(v.uid);
                    }
                });
            }
            */
        }
        this.hiGlassComponentExists = hiGlassComponentExists;
    }

    /**
     * Fade in div element containing HiGlassComponent after HiGlass initiates & loads in first tile etc. (about 500ms).
     * For prettiness only.
     */
    instanceContainerRefFunction(element){
        if (element){ // Fade this in. After HiGlass initiates & loads in first tile etc. (about 500ms). For prettiness only.
            setTimeout(function(){
                requestAnimationFrame(function(){
                    element.style.transition = null; // Use transition as defined in stylesheet
                    element.style.opacity = 1;
                });
            }, 500);
        }
    }

    getPrimaryViewID(){
        if (!this.state.viewConfig || !Array.isArray(this.state.viewConfig.views) || this.state.viewConfig.views.length === 0){
            return null;
        }
        return _.uniq(_.pluck(this.state.viewConfig.views, 'uid'))[0];
    }

    updateCurrentDomainsInStorage(){
        if (this.storage && this.refs.hiGlassComponent){
            var hiGlassComponent = this.refs.hiGlassComponent;
            var viewID = this.getPrimaryViewID();
            var hiGlassDomains = hiGlassComponent.api.getLocation(viewID);
            if (hiGlassDomains && Array.isArray(hiGlassDomains.xDomain) && Array.isArray(hiGlassDomains.yDomain) && hiGlassDomains.xDomain.length === 2 && hiGlassDomains.yDomain.length === 2){
                var newDomainsToSave = { 'x' : hiGlassDomains.xDomain, 'y' : hiGlassDomains.yDomain };
                if (!HiGlassPlainContainer.does2DTrackExist(this.state.viewConfig)){ // If we only have 1D tracks, don't update Y position.
                    var existingDomains = this.storage.getDomains();
                    if (existingDomains){
                        newDomainsToSave.y = existingDomains.y;
                    }
                }
                this.storage.saveDomains(newDomainsToSave);
            }
        }
    }

    /**
     * Binds functions to HiGlass events.
     *
     * - this.updateCurrentDomainsInStorage is bound to 'location' change event.
     * - TODO: onDrag/Drop stuff.
     */
    bindHiGlassEventHandlers(){
        if (this.state.viewConfig && this.refs.hiGlassComponent){
            var hiGlassComponent = this.refs.hiGlassComponent,
                viewID = this.getPrimaryViewID();
            hiGlassComponent.api.on('location', this.updateCurrentDomainsInStorage, viewID);
        } else {
            console.warn('No HiGlass instance available.');
        }
    }


    render(){
        var { disabled, isValidating, tilesetUid, height, width, options, style, className } = this.props;
        let hiGlassInstance = null;
        const mounted = (this.state && this.state.mounted) || false;
        if (isValidating || !mounted){
            var placeholderStyle = (typeof height === 'number' && height >= 140) ? { 'paddingTop' : (height / 2) - 70 } : null;
            hiGlassInstance = (
                <div className="col-sm-12 text-center mt-4" style={placeholderStyle}>
                    <h3>
                        <i className="icon icon-lg icon-television"/>
                    </h3>
                    Initializing
                </div>
            );
        } else if (disabled) {
            hiGlassInstance = (
                <div className="col-sm-12 text-center mt-4">
                    <h4 className="text-400">Not Available</h4>
                </div>
            );
        } else if (this.state.hasRuntimeError) {
            hiGlassInstance = (
                <div className="col-sm-12 text-center mt-4">
                    <h4 className="text-400">Runtime Error</h4>
                </div>
            );
        } else {
            hiGlassInstance = (
                <div className="higlass-instance" style={{ 'transition' : 'none', 'height' : height, 'width' : width || null }} ref={this.instanceContainerRefFunction}>
                    <HiGlassComponent options={options} viewConfig={this.state.viewConfig} width={width} ref="hiGlassComponent" />
                </div>
            );
        }

        console.log('VIEWCONFIG', this.state.viewConfig);

        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className={"higlass-view-container" + (className ? ' ' + className : '')} style={style}>
                <link type="text/css" rel="stylesheet" href="https://unpkg.com/higlass@1.2.5/dist/hglib.css" crossOrigin="true" />
                {/*<script src="https://unpkg.com/higlass@0.10.19/dist/scripts/hglib.js"/>*/}
                <div className="higlass-wrapper row" children={hiGlassInstance} />
            </div>
        );
    }


}