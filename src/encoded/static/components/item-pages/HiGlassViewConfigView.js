'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button, Collapse } from 'react-bootstrap';
import * as globals from './../globals';
import Alerts from './../alerts';
import { JWT, console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility, navigate } from './../util';
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
        this.handleSaveAs = _.throttle(this.handleSaveAs.bind(this), 3000, { 'trailing' : false });
        this.handleShare = this.handleShare.bind(this);

        this.state = {
            'viewConfig' : props.viewConfig, // TODO: Maybe remove, because apparently it gets modified in-place by HiGlassComponent.
            'originalViewConfig' : null, //object.deepClone(props.viewConfig)
            'saveLoading' : false,
            'saveAsLoading' : false,
            'releaseLoading' : false
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

    /**
    * Update the current higlass viewconfig for the user, based on the current data.
    * Note that this function is throttled in constructor() to prevent someone clicking it like, 100 times within 3 seconds.
    * @returns {void}
    */
    handleSave(evt){
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
                    Alerts.queue({
                        'title' : "Saved " + this.props.context.title,
                        'message' : "",
                        'style' : 'success'
                    });
                    this.setState({ 'saveLoading' : false });
                },
                'PATCH',
                ()=>{
                    // Error callback
                    Alerts.queue({
                        'title' : "Failed to save display.",
                        'message' : "Sorry, can you try to save again?",
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
    * @returns {void}
    */
    handleSaveAs(evt){
        evt.preventDefault();

        var { context }         = this.props,
            hgc                 = this.getHiGlassComponent(),
            currentViewConfStr  = hgc && hgc.api.exportAsViewConfString(),
            currentViewConf     = currentViewConfStr && JSON.parse(currentViewConfStr);

        if (!currentViewConf){
            throw new Error('Could not get current view configuration.');
        }

        // Generate a new title and description based on the current display.
        var userDetails     = JWT.getUserDetails(),
            userUUID        = (userDetails && userDetails.uuid) || null,
            userFirstName   = "Unknown";

        if (userDetails && typeof userDetails.first_name === 'string' && userDetails.first_name.length > 0) userFirstName = userDetails.first_name;

        var viewConfTitleAppendStr  = " - " + userFirstName + "'s copy",
            viewConfDesc            = context.description,
            viewConfTitle;

        // Check if our title already has " - user's copy" substring and if so, increment counter instead of re-adding.
        if (context.display_title.indexOf(viewConfTitleAppendStr) > -1){
            var regexCheck = new RegExp('(' + viewConfTitleAppendStr + ')\\s\\(\\d+\\)$'),
                regexMatches = context.display_title.match(regexCheck);

            if (regexMatches && regexMatches.length === 2) {
                // regexMatches[0] ==> " - user's copy (int)"
                // regexMatches[1] ==> " - user's copy"
                var copyCount = parseInt(
                        regexMatches[0].replace(regexMatches[1], '')
                            .trim()
                            .replace('(', '')
                            .replace(')', '')
                    );
                
                copyCount++;
                viewConfTitle = (
                    context.display_title.replace(regexMatches[0], '') // Remove old " - user's copy (int)" substr
                    + viewConfTitleAppendStr + ' (' + copyCount + ')'  // Add new count
                );
            } else {
                // Our title already has " - user's copy" substring, but not an " (int)"
                viewConfTitle = context.display_title + ' (2)';
            }

        } else { // Our title does not have " - [this user]'s copy" substring.
            viewConfTitle = context.display_title + viewConfTitleAppendStr;
        }

        var fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title' : "Failed to save display.",
                'message' : "Sorry, can you try to save again?",
                'style' : 'danger'
            });
            this.setState({ 'saveAsLoading' : false });
        };

        var payload = {
            'title'         : viewConfTitle,
            'description'   : viewConfDesc,
            'viewconfig'    : currentViewConf
        };

        // Try to POST/PUT a new viewconf.
        this.setState(
            { 'saveAsLoading' : true },
            () => {
                ajax.load(
                    '/higlass-view-configs/',
                    (resp) => { // We're likely to get a status code of 201 - Created.
                        this.setState({ 'saveLoading' : false }, ()=>{
                            const newItemHref = object.itemUtil.atId(resp['@graph'][0]);
    
                            // Redirect the user to the new Higlass display.
                            navigate(newItemHref, {}, (resp)=>{
                                // Show alert on new Item page
                                Alerts.queue({
                                    'title'     : "Saved " + viewConfTitle,
                                    'message'   : "Saved new display.",
                                    'style'     : 'success'
                                });
                            });
                        });
                    },
                    'POST',
                    fallbackCallback,
                    JSON.stringify(payload)
                );
            }
        );
        
    }


    /**
    * Copies current URL to clipbard.
    * Sets the higlass display status to released if it isn't already.
    * @returns {void}
    */
    handleShare(evt){
        evt.preventDefault();

        var hgc                 = this.getHiGlassComponent(),
            currentViewConfStr  = hgc && hgc.api.exportAsViewConfString(),
            currentViewConf     = currentViewConfStr && JSON.parse(currentViewConfStr);

        if (!currentViewConf){
            throw new Error('Could not get current view configuration.');
        }

        const viewConfTitle = this.props.context.title;
        var copyHrefToClip = function(props, alertTitle) {
            // Alert the user the URL has been copied.
            Alerts.queue({
                'title'     : alertTitle,
                'message'   : "Copied HiGlass URL to clipboard.",
                'style'     : 'info'
            });

            object.CopyWrapper.copyToClipboard(
                props.href,
                ()=>{ },
                ()=>{ },
            );
        };

        // If the view config has already been released, just copy the URL to the clipboard and return.
        if (this.props.context.status === "released") {
            copyHrefToClip(this.props,  "Copied URL for " + viewConfTitle);
            return;
        }

        if (!this.havePermissionToEdit()){
            throw new Error('No edit permissions.');
        }

        // PATCH `status: released` to current href, then in a callback, copy the URL to the clipboard.
        this.setState(
            { 'releaseLoading' : true },
            ()=>{
                ajax.load(
                    this.props.href,
                    (resp)=>{
                        // Success! Generate an alert telling the user it's successful
                        copyHrefToClip(this.props, "Released " + viewConfTitle);
                        this.setState({ 'releaseLoading' : false });
                    },
                    'PATCH',
                    (resp)=>{
                        // Error callback
                        Alerts.queue({
                            'title'     : "Failed to release display.",
                            'message'   : "Sorry, can you try to share again?",
                            'style'     : 'danger'
                        });

                        this.setState({ 'releaseLoading' : false });
                    },
                    JSON.stringify({
                        'viewconfig'    : currentViewConf,
                        'status'        : 'released',
                    })
                );
            }
        );
    }

    getHiGlassComponent(){
        return (this.refs && this.refs.higlass && this.refs.higlass.refs && this.refs.higlass.refs.hiGlassComponent) || null;
    }

    saveButtons(){
        var { session, context } = this.props,
            { saveLoading, saveAsLoading, releaseLoading } = this.state;

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
                    <Button onClick={this.handleSaveAs} disabled={saveAsLoading} bsStyle="success">
                        <i className={"icon icon-fw icon-" + (saveAsLoading ? 'circle-o-notch icon-spin' : 'save')}/>&nbsp; Save As...
                    </Button>
                </div>&nbsp;
                <div className="inline-block" key="clonebtn">
                    <Button onClick={this.handleShare} disabled={!sharePermission || releaseLoading} bsStyle="info" data-tip={context.status === 'released' ? 'Copy link to clipboard' : 'Release display to public and copy link to clipboard.'}>
                        <i className={"icon icon-fw icon-" + (releaseLoading ? 'circle-o-notch icon-spin' : 'share-alt')}/>&nbsp; Share
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
