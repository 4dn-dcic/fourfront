'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button, Collapse } from 'react-bootstrap';
import * as globals from './../globals';
import Alerts from './../alerts';
import { JWT, console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility } from './../util';
import { FormattedInfoBlock, HiGlassPlainContainer, ItemDetailList } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';
import JSONTree from 'react-json-tree';

export default class HiGlassViewConfigView extends DefaultItemView {

    getTabViewContents(){

        var initTabs    = [],
            context     = this.props.context,
            windowWidth = this.props.windowWidth,
            width       = (!isServerSide() && layout.gridContainerWidth(windowWidth));

        //initTabs.push(BiosampleViewOverview.getTabObject(this.props, width));
        //initTabs.push(ExpSetsUsedIn.getTabObject(this.props, width));

        // return initTabs.concat(this.getCommonTabs()); // We don't want attribution or detail view for this Item... for now.

        initTabs.push(HiGlassViewConfigTabView.getTabObject(this.props, width));

        initTabs.push(ItemDetailList.getTabObject(context, this.props.schemas));

        return initTabs;
    }

}

globals.content_views.register(HiGlassViewConfigView, 'HiglassViewConfig');



export class HiGlassViewConfigTabView extends React.PureComponent {

    static getTabObject(props, width, viewConfig=null){
        viewConfig = viewConfig || props.viewsConfig || (props.context && props.context.viewconfig);
        return {
            'tab' : <span><i className="icon icon-fw icon-television"/> HiGlass Browser</span>,
            'key' : 'higlass',
            'disabled' : false,
            'content' : <HiGlassViewConfigTabView {...props} width={width} viewConfig={viewConfig} />
        };
    }

    static defaultProps = {
        'isValidating' : false,
        'disabled' : false,
        'height' : 600
    };

    constructor(props){
        super(props);
        this.fullscreenButton = this.fullscreenButton.bind(this);
        this.saveButtons = this.saveButtons.bind(this);
        this.getHiGlassComponent = this.getHiGlassComponent.bind(this);
        this.havePermissionToEdit = this.havePermissionToEdit.bind(this);
        this.handleSave = _.throttle(this.handleSave.bind(this), 3000);
        this.handleSaveAs = this.handleSaveAs.bind(this);
        this.handleShare = this.handleShare.bind(this);

        this.state = {
            'viewConfig' : props.viewConfig, // TODO: Maybe remove, because apparently it gets modified in-place by HiGlassComponent.
            'originalViewConfig' : null, //object.deepClone(props.viewConfig)
            'saveLoading' : false,
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.viewConfig !== this.props.viewConfig){
            this.setState({
                'originalViewConfig' : null //object.deepClone(nextProps.viewConfig)
            });
        }
    }

    componentDidUpdate(pastProps, pastState){
        if (this.props.isFullscreen !== pastProps.isFullscreen){
            // TODO: Trigger re-draw of HiGlassComponent somehow
        }
        if (this.state.originalViewConfig === null && pastState.originalViewConfig){
            var hgc = this.getHiGlassComponent();
            if (hgc){
                this.setState({
                    'originalViewConfigString' : hgc.api.exportAsViewConfString()
                });
            }
        }
    }

    componentDidMount(){
        // Hacky... we need to wait for HGC to load up and resize itself and such...
        var initOriginalViewConfState = () => {
            var hgc = this.getHiGlassComponent();
            if (hgc){
                setTimeout(()=>{
                    this.setState({
                        'originalViewConfigString' : hgc.api.exportAsViewConfString()
                    });
                }, 2000);
            } else {
                setTimeout(initOriginalViewConfState, 200);
            }
        };

        initOriginalViewConfState();
    }

    havePermissionToEdit(){
        return !!(_.findWhere(this.props.context.actions || [], { 'name' : 'edit' }));
    }

    handleSave(evt){
        // Note that this function is throttled in constructor() to prevent someone clicking it like, 100 times within 3 seconds.
        evt.preventDefault();

        var hgc                 = this.getHiGlassComponent(),
            currentViewConfStr  = hgc && hgc.api.exportAsViewConfString(),
            currentViewConf     = currentViewConfStr && JSON.parse(currentViewConfStr);

        if (!currentViewConf){
            throw new Error('Could not get current view configuration.');
        }

        if (!this.havePermissionToEdit()){
            // I guess would also get caught in ajax error callback.
            throw new Error('No edit permissions.');
        }

        this.setState({ 'saveLoading' : true }, ()=>{
            ajax.load(
                this.props.href,
                (resp)=>{
                    // Success callback... maybe update state.originalViewConfigString or something...
                    // At this point we're saved maybe just notify user somehow if UI update re: state.saveLoading not enough.
                    this.setState({ 'saveLoading' : false });
                },
                'PATCH',
                ()=>{
                    // Error callback
                    Alerts.queue({
                        'title' : "Failed to save display.",
                        'message' : "For some reason",
                        'style' : 'danger'
                    });
                    this.setState({ 'saveLoading' : false });
                },
                // We're only updating this object's view conf.
                JSON.stringify({ 'viewconfig' : currentViewConf })
            );
        });
    }

    /**
    * Create a new higlass viewconfig for the user, based on the current data.
    */
    handleSaveAs(evt){
        evt.preventDefault();

        var hgc                 = this.getHiGlassComponent(),
            currentViewConfStr  = hgc && hgc.api.exportAsViewConfString(),
            currentViewConf     = currentViewConfStr && JSON.parse(currentViewConfStr);

        if (!currentViewConf){
            throw new Error('Could not get current view configuration.');
        }

        // Make sure you are logged in
        if (this.props.session !== true) {
            Alerts.queue({
                'title' : "Please log in.",
                'message' : "Please log in or sign in before saving this display.",
                'style' : 'danger'
            });
        }

        // Generate a new title and description based on the current display.
        var userDetails = JWT.getUserDetails();
        let userFirstName = "unknown";
        if (userDetails && typeof userDetails.first_name === 'string' && userDetails.first_name.length > 0) userFirstName = userDetails.first_name;

        const viewConfTitle = this.props.context.title + "-" + userFirstName + "'s copy";
        const viewConfDesc = this.props.context.description;

        // Try to PUT a new viewconf.
        this.setState(
            { 'saveLoading' : true },
            ()=>{
                ajax.load(
                    '/higlass-view-configs/',
                    ()=>{
                        // Creating a new record doesn't return a status code of 200, so this callback shouldn't trigger.
                        this.setState({ 'saveLoading' : false });
                    },
                    'POST',
                    (resp)=>{
                        // We're likely to get a status code of 201 - Created.
                        if (resp.status === 'success') {
                            Alerts.queue({
                                'title' : "Saved " + viewConfTitle,
                                'message' : "Saved new display.",
                                'style' : 'info'
                            });
                        }
                        else {
                            // Error callback
                            Alerts.queue({
                                'title' : "Failed to save display.",
                                'message' : "Sorry, can you try to save again?",
                                'style' : 'danger'
                            });
                        }
                        // TODO Do we go to the new display or stay on the current one?
                        this.setState({ 'saveLoading' : false });
                    },
                    JSON.stringify({
                        'title' : viewConfTitle,
                        'description' : viewConfDesc,
                        'viewconfig' : currentViewConf
                    })
                );
            }
        );
    }

    /**
     * Copies current URL to clipbard.
     * Releases
     */
    handleShare(evt){
        evt.preventDefault();

        if (this.props.context.status !== 'released' && this.havePermissionToEdit()){
            // TODO - PATCH `status: released` to current href, then in a callback, proceed w/ below copywrapper stuff (prly put it in own method).
        }

        object.CopyWrapper.copyToClipboard(
            this.props.href,
            ()=>{ console.log('Succeeded in copying to clipboard'); /* TODO: Temporarily change/flash button color or something to indicate success */ },
            ()=>{ console.log('Failed to copy to clipboard'); },
        );
    }

    getHiGlassComponent(){
        return (this.refs && this.refs.higlass && this.refs.higlass.refs && this.refs.higlass.refs.hiGlassComponent) || null;
    }

    saveButtons(){
        var { session, context } = this.props,
            { saveLoading } = this.state;

        if (!session) return null;

        var editPermission  = this.havePermissionToEdit(),
            sharePermission = (context.status === 'released' || editPermission);

        return (
            <div className="text-right inline-block">
                <div className="inline-block" key="savebtn">
                    <Button onClick={this.handleSave} disabled={!editPermission || saveLoading} bsStyle="success">
                        <i className={"icon icon-fw icon-" + (saveLoading ? 'circle-o-notch icon-spin' : 'save')}/>&nbsp; Save
                    </Button>
                </div>&nbsp;
                <div className="inline-block" key="saveasbtn">
                    <Button onClick={this.handleSaveAs} bsStyle="success">
                        <i className={"icon icon-fw icon-save"}/>&nbsp; Save As...
                    </Button>
                </div>&nbsp;
                <div className="inline-block" key="clonebtn">
                    <Button onClick={this.handleShare} disabled={!sharePermission} bsStyle="info" data-tip={context.status === 'released' ? 'Copy link to clipboard' : 'Release display to public and copy link to clipboard.'}>
                        <i className={"icon icon-fw icon-copy"}/>&nbsp; Share
                    </Button>
                </div>&nbsp;
            </div>
        );
    }

    fullscreenButton(){
        var { isFullscreen, toggleFullScreen } = this.props;
        if( typeof isFullscreen === 'boolean' && typeof toggleFullScreen === 'function'){
            return (
                <div className="inline-block for-state-fullscreenViewEnabled" key="toggle-fullscreen">
                    <Button onClick={toggleFullScreen} data-tip={!isFullscreen ? 'Expand to full screen' : null}>
                        <i className={"icon icon-fw icon-" + (!isFullscreen ? 'arrows-alt' : 'crop')}/>
                    </Button>
                </div>
            );
        }
        return null;
    }

    extNonFullscreen(){
        // TODO: temp add file text input box to go here
        // we can use temp text input box which take @id and then iterate on it later
        // in any case, we'll need logic to AJAX in the file, check its file_type, genome_assembly, higlass_uid, and craftfully extend hgc.api.exportAsViewConfString() with it.
        // Would use/add to HiGlassConfigurator functions.


        return (
            <div className="bottom-panel">

            </div>
        );
    }

    render(){
        var { isFullscreen, windowWidth, windowHeight, width } = this.props;

        /*
        if (hgc){
            var currentViewConfStr = hgc.api.exportAsViewConfString();
            console.log(
                'ViewConf from HiGlassComponent',
                this.state.originalViewConfigString === currentViewConfStr,
                currentViewConfStr,
                '\n\n\n',
                this.state.originalViewConfigString
            );
        }
        */

        return (
            <div className={"overflow-hidden tabview-container-fullscreen-capable" + (isFullscreen ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>HiGlass Browser</span>
                    <div className="inner-panel constant-panel pull-right tabview-title-controls-container">
                        { this.saveButtons() }
                        { this.fullscreenButton() }
                    </div>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="higlass-tab-view-contents">
                    <div className="higlass-container-container" style={isFullscreen ? { 'paddingLeft' : 10, 'paddingRight' : 10 } : null }>
                        <HiGlassPlainContainer {..._.omit(this.props, 'context')}
                            width={isFullscreen ? windowWidth : width + 20 }
                            height={isFullscreen ? windowHeight -120 : 500}
                            ref="higlass" />
                    </div>
                    { !isFullscreen ? this.extNonFullscreen() : null }
                </div>
            </div>
        );
    }
}

/**
 * Dont use. Was testing stuff. Not fun UX. Details tab is nicer.
 *
 * @deprecated
 * @class CollapsibleViewConfOutput
 * @extends {React.PureComponent}
 */
class CollapsibleViewConfOutput extends React.PureComponent {

    constructor(props){
        super(props);
        this.toggle = this.toggle.bind(this);
        this.state = {
            'open' : false
        };
    }

    toggle(e){
        e.preventDefault();
        this.setState(function(currState){
            return { 'open' : !currState.open };
        });
    }

    render(){
        var { viewConfig } = this.props,
            { open } = this.state;

        return (
            <div className="viewconfig-panel">
                <hr/>
                <h4 className="clickable inline-block text-400" onClick={this.toggle}>
                    <i className={"icon icon-fw icon-" + (open ? 'minus' : 'plus' )} />&nbsp;&nbsp;
                    { open ? 'Close' : 'View' } Configuration
                </h4>
                <Collapse in={open}>
                    <pre>{ viewConfig }</pre>
                </Collapse>
            </div>
        );
    }
}
