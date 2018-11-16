'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button, Collapse, MenuItem, ButtonToolbar, DropdownButton } from 'react-bootstrap';
import * as globals from './../globals';
import Alerts from './../alerts';
import { JWT, console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility, navigate } from './../util';
import { FormattedInfoBlock, HiGlassPlainContainer, ItemDetailList, CollapsibleItemViewButtonToolbar } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';
import JSONTree from 'react-json-tree';

export default class HiGlassViewConfigView extends DefaultItemView {

    getTabViewContents(){

        var initTabs    = [],
            windowWidth = this.props.windowWidth,
            width       = (!isServerSide() && layout.gridContainerWidth(windowWidth));


        initTabs.push(HiGlassViewConfigTabView.getTabObject(this.props, width));

        return initTabs.concat(this.getCommonTabs());
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
        this.saveButton = this.saveButton.bind(this);
        this.cloneButton = this.cloneButton.bind(this);
        this.addMcoolButton = this.addMcoolButton.bind(this);
        this.addBigwigButton = this.addBigwigButton.bind(this);
        this.getHiGlassComponent = this.getHiGlassComponent.bind(this);
        this.havePermissionToEdit = this.havePermissionToEdit.bind(this);
        this.handleSave = _.throttle(this.handleSave.bind(this), 3000);
        this.handleClone = _.throttle(this.handleClone.bind(this), 3000, { 'trailing' : false });
        this.handleAddMcool = _.throttle(this.handleAddMcool.bind(this), 3000, { 'trailing' : false });
        this.handleAddBigwig = _.throttle(this.handleAddBigwig.bind(this), 3000, { 'trailing' : false });
        this.handleStatusChangeToRelease = this.handleStatusChange.bind(this, 'released');
        this.handleStatusChange = this.handleStatusChange.bind(this);

        this.state = {
            'viewConfig' : props.viewConfig, // TODO: Maybe remove, because apparently it gets modified in-place by HiGlassComponent.
            'originalViewConfig' : null, //object.deepClone(props.viewConfig)
            'saveLoading' : false,
            'cloneLoading' : false,
            'releaseLoading' : false,
            'mcoolLoading' : false,
            'bigwigLoading' : false,
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
        return !!(this.props.session && _.findWhere(this.props.context.actions || [], { 'name' : 'edit' }));
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
                        'message' : "This HiGlass Display Item has been updated with the current viewport. This may take some minutes to take effect.",
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
    handleClone(evt){
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
            viewConfTitle           = context.display_title + viewConfTitleAppendStr; // Default, used if title does not already have " - [this user]'s copy" substring.

        // Check if our title already has " - user's copy" substring and if so,
        // increment an appended counter instead of re-adding the substring.
        if (context.display_title.indexOf(viewConfTitleAppendStr) > -1){
            var regexCheck      = new RegExp('(' + viewConfTitleAppendStr + ')\\s\\(\\d+\\)'),
                regexMatches    = context.display_title.match(regexCheck);

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
        }

        var fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title' : "Failed to save display.",
                'message' : "Sorry, can you try to save again?",
                'style' : 'danger'
            });
            this.setState({ 'cloneLoading' : false });
        };

        var payload = {
            'title'         : viewConfTitle,
            'description'   : viewConfDesc,
            'viewconfig'    : currentViewConf,
            // We don't include other properties and let them come from schema default values.
            // For example, default status is 'draft', which will be used.
            // Lab and award do not carry over as current user might be from different lab.
        };

        // Try to POST/PUT a new viewconf.
        this.setState(
            { 'cloneLoading' : true },
            () => {
                ajax.load(
                    '/higlass-view-configs/',
                    (resp) => { // We're likely to get a status code of 201 - Created.
                        this.setState({ 'cloneLoading' : false }, ()=>{
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
    * Update the current Viewconf to add a new view with a mcool file.
    * @returns {void}
    */
    handleAddMcool(evt){
        evt.preventDefault();

        // Get a sample mcool file to add. Just grab a master insert.
        var file_uuid = "d273d710-6b6d-4e43-a84c-5658a891c034";
        this.handleAddFileToHiglass(file_uuid, "mcool", "mcoolLoading");
    }

    /**
    * Update the current Viewconf to add a new view with a bigwig file.
    * @returns {void}
    */
    handleAddBigwig(evt){
        evt.preventDefault();

        // Get a sample bigwig file to add. Just grab a master insert.
        var file_uuid = "a661a518-efd5-496e-9b76-85ca93493921";
        this.handleAddFileToHiglass(file_uuid, "bigwig", "bigwigLoading");
    }

    /**
    * TODO Add a description
    **/
    handleAddFileToHiglass(file_uuid, file_type, loadingStateName) {
        var { context }         = this.props,
            hgc                 = this.getHiGlassComponent(),
            currentViewConfStr  = hgc && hgc.api.exportAsViewConfString(),
            currentViewConf     = currentViewConfStr && JSON.parse(currentViewConfStr);

        if (!currentViewConf){
            throw new Error('Could not get current view configuration.');
        }

        var payload = {
            'higlass_viewconfig': currentViewConf,
            'files' : file_uuid
        };

        // If it failed, show the error in the popup window.
        var fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title' : "Failed to add "+ file_type +" file.",
                'message' : errResp.errors,
                'style' : 'danger'
            });
            this.setState({ loadingStateName : false });
        };

        // Make an AJAX call to add the mcool file.
        this.setState(
            { loadingStateName : true },
            () => {
                ajax.load(
                    "/add_files_to_higlass_viewconf/",
                    (resp) => {
                        this.setState({ loadingStateName : false }, ()=>{
                            // If it failed, return an error message.
                            if (!resp.success) {
                                return fallbackCallback(resp);
                            }

                            // Update the Higlass display with the new viewconf.
                            hgc.api.setViewConfig(resp.new_viewconfig).then(() => {
                                // Show alert indicating success
                                Alerts.queue({
                                    'title'     : "Added " + file_type + " file",
                                    'message'   : "Added new file.",
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
    *
    * @returns {void}
    */
    handleStatusChange(statusToSet = 'released', evt){
        evt.preventDefault();

        var { context, href }   = this.props,
            hgc                 = this.getHiGlassComponent(),
            viewConfTitle       = context.title || context.display_title;

        // If the view config has already been released, just copy the URL to the clipboard and return.
        if (context.status === statusToSet) {
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
                    href,
                    (resp)=>{
                        // Success! Generate an alert telling the user it's successful
                        this.setState({ 'releaseLoading' : false });
                        Alerts.queue({
                            'title'     : "Updated Status for " + viewConfTitle,
                            'message'   : (
                                <p className="mb-02">
                                    Changed Display status to <b>{ statusToSet }</b>.
                                    It may take some time for this edit to take effect.
                                </p>
                            ),
                            'style'     : 'info'
                        });
                    },
                    'PATCH',
                    (resp)=>{
                        // Error callback
                        this.setState({ 'releaseLoading' : false });
                        Alerts.queue({
                            'title'     : "Failed to release display.",
                            'message'   : "Sorry, can you try to share again?",
                            'style'     : 'danger'
                        });
                    },
                    JSON.stringify({
                        'status' : statusToSet
                    })
                );
            }
        );
    }

    getHiGlassComponent(){
        return (this.refs && this.refs.higlass && this.refs.higlass.refs && this.refs.higlass.refs.hiGlassComponent) || null;
    }

    statusChangeButton(){
        var { session, context } = this.props,
            { saveLoading, cloneLoading, releaseLoading, mcoolLoading, bigwigLoading } = this.state,
            editPermission = this.havePermissionToEdit();

        if (!session || !editPermission) return null; // TODO: Remove and implement for anon users. Eventually.

        var btnProps  = {
            'onSelect'      : this.handleStatusChange,
            //'onClick'       : context.status === 'released' ? null : this.handleStatusChangeToRelease,
            'bsStyle'       : context.status === 'released' ? 'default' : 'info',
            'disabled'      : releaseLoading,
            'key'           : 'statuschangebtn',
            'data-tip'      : "Change the visibility/permissions of this HiGlass Display",
            'title'         : (
                    <React.Fragment>
                        <i className={"icon icon-fw icon-" + (releaseLoading ? 'circle-o-notch icon-spin' : 'id-badge')}/>&nbsp; Manage
                    </React.Fragment>
                ),
            'pullRight'     : true
        };

        return (
            <DropdownButton {...btnProps}>
                <StatusMenuItem eventKey="released" context={context}>Visible by Everyone</StatusMenuItem>
                <StatusMenuItem eventKey="released to project" context={context}>Visible by Network</StatusMenuItem>
                <StatusMenuItem eventKey="released to lab" context={context}>Visible by Lab</StatusMenuItem>
                <StatusMenuItem eventKey="draft" context={context}>Private</StatusMenuItem>
                <MenuItem divider />
                {/* These statuses currently not available.
                <StatusMenuItem active={context.status === "archived to project"} eventKey="archived to project">Archive to Project</StatusMenuItem>
                <StatusMenuItem active={context.status === "archived"} eventKey="archived">Archive to Lab</StatusMenuItem>
                */}
                <StatusMenuItem eventKey="deleted" context={context}>Delete</StatusMenuItem>
            </DropdownButton>
        );
    }

    saveButton(){
        var { session, context } = this.props,
            { saveLoading } = this.state,
            tooltip = "Save the current view shown below to this display";

        if (!session) return null;

        var editPermission  = this.havePermissionToEdit();

        return (
            <Button onClick={this.handleSave} disabled={!editPermission || saveLoading} bsStyle="success" key="savebtn" data-tip={tooltip}>
                <i className={"icon icon-fw icon-" + (saveLoading ? 'circle-o-notch icon-spin' : 'save')}/>&nbsp; Save
            </Button>
        );
    }

    cloneButton(){
        var { session } = this.props,
            { cloneLoading } = this.state,
            tooltip = "Create your own new HiGlass Display based off of this one";

        if (!session) return null;

        return (
            <Button onClick={this.handleClone} disabled={cloneLoading} bsStyle="success" key="saveasbtn" data-tip={tooltip}>
                <i className={"icon icon-fw icon-" + (cloneLoading ? 'circle-o-notch icon-spin' : 'plus')}/>&nbsp; Clone
            </Button>
        );
    }

    addMcoolButton(){
        var { session } = this.props,
            { mcoolLoading } = this.state,
            tooltip = "Click to add a preset mcool file.";

        if (!session) return null;

        return (
            <Button onClick={this.handleAddMcool} disabled={mcoolLoading} bsStyle="success" key="addmcoolbtn" data-tip={tooltip}>
                <i className={"icon icon-fw icon-" + (mcoolLoading ? 'circle-o-notch icon-spin' : 'plus-square')}/>&nbsp; Add mcool file
            </Button>
        );
    }

    addBigwigButton(){
        var { session } = this.props,
            { bigwigLoading } = this.state,
            tooltip = "Click to add a preset bigwig file.";

        if (!session) return null;

        return (
            <Button onClick={this.handleAddBigwig} disabled={bigwigLoading} bsStyle="success" key="addbigwigbtn" data-tip={tooltip}>
                <i className={"icon icon-fw icon-" + (bigwigLoading ? 'circle-o-notch icon-spin' : 'plus-square')}/>&nbsp; Add bigwig file
            </Button>
        );
    }

    copyURLButton(){
        var gridState   = layout.responsiveGridState(this.props.windowWidth),
            isMobile    = gridState !== 'lg',
            valToCopy   = this.props.href;
        return (
            <object.CopyWrapper data-tip="Copy view URL to clipboard to share with others." includeIcon={false} wrapperElement={Button} value={valToCopy}>
                <i className="icon icon-fw icon-copy"/>{ isMobile ?
                    <React.Fragment>
                        &nbsp;&nbsp; Copy URL
                    </React.Fragment>
                : null }
            </object.CopyWrapper>
        );
    }

    fullscreenButton(){
        var { isFullscreen, toggleFullScreen } = this.props;
        if( typeof isFullscreen === 'boolean' && typeof toggleFullScreen === 'function'){
            return (
                <Button onClick={toggleFullScreen} data-tip={!isFullscreen ? 'Expand to full screen' : null}>
                    <i className={"icon icon-fw icon-" + (!isFullscreen ? 'expand' : 'compress')}/>
                </Button>
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

        return (
            <div className={"overflow-hidden tabview-container-fullscreen-capable" + (isFullscreen ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>HiGlass Browser</span>
                    <CollapsibleItemViewButtonToolbar constantButtons={this.fullscreenButton()} collapseButtonTitle={function(isOpen){
                        return (
                            <span>
                                <i className={"icon icon-fw icon-" + (isOpen ? 'angle-up' : 'navicon')}/>&nbsp; Menu
                            </span>
                        );
                    }}>
                        { this.saveButton() }
                        { this.cloneButton() }
                        { this.addMcoolButton() }
                        { this.addBigwigButton() }
                        { this.statusChangeButton() }
                        { this.copyURLButton() }
                    </CollapsibleItemViewButtonToolbar>
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


class StatusMenuItem extends React.PureComponent {
    render(){
        var { eventKey, context, children } = this.props,
            active = context.status === eventKey;

        children = (
            <span className={active ? "text-500" : null}>
                <i className="item-status-indicator-dot" data-status={eventKey} />&nbsp;  { children }
            </span>
        );

        return <MenuItem {..._.omit(this.props, 'context')} active={active} children={children} />;
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
