'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button, Collapse, MenuItem, ButtonToolbar, DropdownButton } from 'react-bootstrap';
import * as globals from './../globals';
import Alerts from './../alerts';
import { JWT, console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility, navigate } from './../util';
import { FormattedInfoBlock, HiGlassPlainContainer, ItemDetailList, CollapsibleItemViewButtonToolbar } from './components';
import { LinkToSelector } from './../forms/components';
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
        this.getHiGlassComponent = this.getHiGlassComponent.bind(this);
        this.havePermissionToEdit = this.havePermissionToEdit.bind(this);
        this.handleSave = _.throttle(this.handleSave.bind(this), 3000);
        this.handleClone = _.throttle(this.handleClone.bind(this), 3000, { 'trailing' : false });
        this.handleStatusChangeToRelease = this.handleStatusChange.bind(this, 'released');
        this.handleStatusChange = this.handleStatusChange.bind(this);
        this.addFileToHiglass = this.addFileToHiglass.bind(this);

        /**
         * @property {Object} viewConfig            The viewconf that is fed to HiGlassPlainContainer. (N.B.) HiGlassComponent may edit it in place during UI interactions.
         * @property {string} genome_assembly       Common genome assembly for all files/tracks of this viewconf.
         * @property {Object} originalViewConfig    Not currently used, but might eventually be used to compare against state.viewConfig to inform whether to enable save btn or not.
         * @property {boolean} saveLoading          True if AJAX request is en route to save Item.
         * @property {boolean} cloneLoading         True if AJAX request is en route to clone Item.
         * @property {boolean} releaseLoading       True if AJAX request is en route to change Item status.
         * @property {boolean} addFileLoading          True if AJAX request is en route to add file to `state.viewConfig`.
         */
        this.state = {
            'viewConfig'            : props.viewConfig,
            'genome_assembly'       : (props.context && props.context.genome_assembly) || null,
            'originalViewConfig'    : null, //object.deepClone(props.viewConfig)
            'saveLoading'           : false,
            'cloneLoading'          : false,
            'releaseLoading'        : false,
            'addFileLoading'        : false
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

        // The following is not yet needed; may be re-enabled when can compare originalViewConfig vs state.viewConfig
        //
        // if (this.state.originalViewConfig === null && pastState.originalViewConfig){
        //    var hgc = this.getHiGlassComponent();
        //    if (hgc){
        //        this.setState({
        //            'originalViewConfigString' : hgc.api.exportAsViewConfString()
        //        });
        //    }
        // }
    }
    
    // This is not yet needed; may be re-enabled when can compare originalViewConfig vs state.viewConfig
    // componentDidMount(){
    //     // Hacky... we need to wait for HGC to load up and resize itself and such...
    //     var initOriginalViewConfState = () => {
    //         var hgc = this.getHiGlassComponent();
    //         if (hgc){
    //             setTimeout(()=>{
    //                 this.setState({
    //                     'originalViewConfigString' : hgc.api.exportAsViewConfString()
    //                 });
    //             }, 2000);
    //         } else {
    //             setTimeout(initOriginalViewConfState, 200);
    //         }
    //     };
    //
    //     initOriginalViewConfState();
    // }

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
                        'message' : "This HiGlass Display Item has been updated with the current viewport. This may take a few minutes to take effect.",
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
                // We're updating this object's view conf and the genome assembly.
                JSON.stringify({
                    'viewconfig' : currentViewConf,
                    'genome_assembly' : this.state.genome_assembly,
                })
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
    * Update the current Viewconf to add a new view with the file with the given uuid.
    * @returns {void}
    */
    addFileToHiglass(fileAtID) {
        var { context }         = this.props,
            hgc                 = this.getHiGlassComponent(),
            currentViewConfStr  = hgc && hgc.api.exportAsViewConfString(),
            currentViewConf     = currentViewConfStr && JSON.parse(currentViewConfStr);

        if (!currentViewConf){
            throw new Error('Could not get current view configuration.');
        }


        // Read the url of the higlass viewconfig and store the genome assembly.
        ajax.load(
            this.props.href,
            (resp)=>{
                if(resp.success) {
                    this.setState({ 'genome_assembly' : resp.genome_assembly });
                }
            },
            'GET'
        );

        var payload = {
            'higlass_viewconfig': currentViewConf,
            'genome_assembly': this.state.genome_assembly,
            'files' : [fileAtID]
        };

        // If it failed, show the error in the popup window.
        var fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title' : "Failed to add file.",
                'message' : errResp.errors,
                'style' : 'danger'
            });
            this.setState({ 'addFileLoading' : false });
        };

        // Make an AJAX call to add the file.
        this.setState(
            { addFileLoading : true },
            () => {
                ajax.load(
                    "/add_files_to_higlass_viewconf/",
                    (resp) => {
                        let stateChange = { 'addFileLoading' : false };
                        if (resp.success) {
                            // Update the genome assembly and view config.
                            if (resp.new_genome_assembly) {
                                stateChange["genome_assembly"] = resp.new_genome_assembly;
                            }
                            stateChange["viewConfig"] = resp.new_viewconfig;
                        }

                        this.setState(stateChange, ()=>{
                            // If it failed, return an error message.
                            if (!resp.success) {
                                return fallbackCallback(resp);
                            }

                            // Show alert indicating success
                            Alerts.queue({
                                'title'     : "Added file",
                                'message'   : "Added new file to Higlass display.",
                                'style'     : 'success'
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
            { saveLoading, cloneLoading, releaseLoading } = this.state,
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
            <Button onClick={this.handleClone} disabled={cloneLoading} bsStyle="success" key="clonebtn" data-tip={tooltip}>
                <i className={"icon icon-fw icon-" + (cloneLoading ? 'circle-o-notch icon-spin' : 'clone')}/>&nbsp; Clone
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
        var { isFullscreen, windowWidth, windowHeight, width } = this.props,
            { addFileLoading, genome_assembly } = this.state;

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
                        { this.statusChangeButton() }
                        <AddFileButton onClick={this.addFileToHiglass} loading={addFileLoading} genome_assembly={genome_assembly}/>
                        { this.copyURLButton() }
                    </CollapsibleItemViewButtonToolbar>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="higlass-tab-view-contents">
                    <div className="higlass-container-container" style={isFullscreen ? { 'paddingLeft' : 10, 'paddingRight' : 10 } : null }>
                        <HiGlassPlainContainer {..._.omit(this.props, 'context', 'viewConfig')}
                            width={isFullscreen ? windowWidth : width + 20 }
                            height={isFullscreen ? windowHeight -120 : 500}
                            viewConfig={this.state.viewConfig}
                            ref="higlass" />
                    </div>
                    { !isFullscreen ? this.extNonFullscreen() : null }
                </div>
            </div>
        );
    }
}

/**
 * This Component has a button and a text input and a button.
 * You will type a file uuid into the field and click the button to accept.
 */
class AddFileButton extends React.PureComponent {

    static propTypes = {
        'onClick' : PropTypes.func.isRequired,
        'loading' : PropTypes.bool.isRequired
    };

    constructor(props){
        super(props);
        this.receiveFile            = this.receiveFile.bind(this);
        this.setIsSelecting         = _.throttle(this.toggleIsSelecting.bind(this, true), 3000, { 'trailing' : false });
        this.unsetIsSelecting       = this.toggleIsSelecting.bind(this, false);
        this.toggleIsSelecting      = this.toggleIsSelecting.bind(this);
        this.state = {
            'isSelecting' : false
        };
    }

    toggleIsSelecting(isSelecting){
        this.setState(function(currState){
            if (typeof isSelecting !== 'boolean') isSelecting = !currState.isSelecting;
            if (isSelecting === currState.isSelecting) return null;
            return { isSelecting };
        });
    }

    receiveFile(fileAtID, fileContext) {

        // Is it blank? Do nothing.
        if (!fileAtID) {
            return;
        }

        this.setState({ 'isSelecting' : false }, ()=>{
            // Invoke the object callback function, using the text input.
            this.props.onClick(fileAtID);
        });
    }

    render(){
        var { loading, genome_assembly } = this.props,
            { isSelecting } = this.state,
            tooltip         = "Search for a file and add it to the display.",
            dropMessage     = "Drop a File here.",
            searchURL       = (
                '/search/?type=File&higlass_uid!=No+value'
                + (genome_assembly? '&genome_assembly=' + encodeURIComponent(genome_assembly) : '' )
                + '#!selection'
            );

        return (
            <React.Fragment>
                <Button onClick={this.setIsSelecting} disabled={loading} bsStyle="success" key="addfilebtn" data-tip={tooltip}>
                    <i className={"icon icon-fw icon-" + (loading ? 'circle-o-notch icon-spin' : 'plus')}/>&nbsp; Add
                </Button>
                <LinkToSelector isSelecting={isSelecting} onSelect={this.receiveFile} onCloseChildWindow={this.unsetIsSelecting} dropMessage={dropMessage} searchURL={searchURL} />
            </React.Fragment>
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
