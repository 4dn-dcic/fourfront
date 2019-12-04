'use strict';

import React from 'react';
import _ from 'underscore';
import { DropdownButton, DropdownItem, Dropdown } from 'react-bootstrap';

import { JWT, console, object, layout, ajax, navigate } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Alerts';

import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView from './DefaultItemView';
import { CollapsibleItemViewButtonToolbar } from './components/CollapsibleItemViewButtonToolbar';
import { ConfirmModal } from './HiGlassViewConfigView';
import { timingSafeEqual } from 'crypto';


export default class MicroscopeConfigurationView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        const width = this.getTabViewWidth();
        initTabs.push(MicroMetaTabView.getTabObject(this.props, width));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


/**
 * @todo:
 * Make these be instance methods of MicroMetaTabView _or_ some other
 * component(s) & implement logic.
 * It might be useful to split into 2 components - 1 to handle logic &
 * render/clone out props.children with those functions, and
 * 1 to handle the view, but uncertain.
 */

/**
 * Likely won't change much, maybe just to use own `ajax.load`
 * instead of window.fetch. Can probably be kept as a static standalone
 * function for re-usability.
 */
function onLoadSchema(complete) {
    /*
    ajax.load(
        "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/fullSchema.json",
        (res)=>{
            console.log("RES", res);
        },
        "GET",
        null,
        null,
        { },
        ["Content-Type", "Accept", "X-Requested-With"]
    );
    */
    ///*
    window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility polyfill
    window
        .fetch(
            "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/fullSchemaSVG.json"
        )
        .then(function(resp) {
            console.log(resp);
            return resp.text();
        })
        .then(function(respText) {
            var schema = JSON.parse(respText);
            complete(schema);
        });
    // */
}

/** Path to images directory/CDN. Once is published to NPM, will change to unpkg CDN URL. */
const imagesPathSVG = "https://raw.githubusercontent.com/WU-BIMAC/4DNMicroscopyMetadataToolReact/master/public/assets/svg/";
const imagesPathPNG = "https://raw.githubusercontent.com/WU-BIMAC/4DNMicroscopyMetadataToolReact/master/public/assets/png/";

let MicroscopyMetadataTool = null;

export class MicroMetaTabView extends React.PureComponent {

    static getTabObject(props, width) {
        return {
            'tab' : <span><i className="icon icon-microscope fas icon-fw"/> MicroMeta</span>,
            'key' : 'micrometa',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : <MicroMetaTabView {...props} width={width} />
        };
    }

    constructor(props){
        super(props);
        this.fullscreenButton = this.fullscreenButton.bind(this);
        this.saveButton = this.saveButton.bind(this);
        this.cloneButton = this.cloneButton.bind(this);
        this.havePermissionToEdit = this.havePermissionToEdit.bind(this);
        this.handleFullscreenToggle = this.handleFullscreenToggle.bind(this);
        this.handleSave = _.throttle(this.handleSave.bind(this), 3000);
        this.handleClone = _.throttle(this.handleClone.bind(this), 3000);
        this.handleModalCancel = _.throttle(this.handleModalCancel.bind(this), 3000);
        this.handleStatusChange = this.handleStatusChange.bind(this);
        this.onSaveMicroscope = this.onSaveMicroscope.bind(this);
        this.getMicroscopyMetadataToolComponent = this.getMicroscopyMetadataToolComponent.bind(this);
        this.updateContainerOffsets = _.debounce(this.updateContainerOffsets.bind(this), 500);

        this.state = {
            'mounted'               : false,
            'saveLoading'           : false,
            'cloneLoading'          : false,
            'releaseLoading'        : false,
            'addFileLoading'        : false,
            'modal'                 : null,
            'containerOffsetLeft'   : 0,
            'containerOffsetTop'    : 0
        };

        this.microMetaToolRef = React.createRef();
        this.containerElemRef = React.createRef();
    }

    componentDidUpdate(pastProps, pastState){
        const { isFullscreen, windowWidth, windowHeight } = this.props;
        const { mounted } = this.state;
        if (mounted && (isFullscreen !== pastProps.isFullscreen || windowWidth !== pastProps.windowWidth || windowHeight !== pastProps.windowHeight)) {
            setTimeout(this.updateContainerOffsets, 500); // Allow time for browser to repaint
        }
    }

    componentDidMount(){

        const onComplete = () => {
            window.addEventListener("scroll", this.updateContainerOffsets);
            this.updateContainerOffsets();
            this.setState({ mounted: true });
        };

        if (!MicroscopyMetadataTool) {
            setTimeout(()=>{
                // Load in Microscopy Metadata Tool libraries as separate JS file due to large size.
                // @see https://webpack.js.org/api/module-methods/#requireensure
                require.ensure(['4dn-microscopy-metadata-tool'], (require) => {
                    MicroscopyMetadataTool = require('4dn-microscopy-metadata-tool').default;
                    onComplete();
                }, "microscopy-metadata-bundle");
            });
        } else {
            onComplete();
        }
    }

    componentWillUnmount(){
        window.removeEventListener("scroll", this.updateContainerOffsets);
    }

    updateContainerOffsets(){
        const containerElem = this.containerElemRef.current;
        if (!containerElem) {
            throw new Error("Couldn't get container elem");
        }
        // Relative to window/viewport, not document.
        const boundingRect = containerElem.getBoundingClientRect();
        this.setState({
            containerOffsetTop: boundingRect.top,
            containerOffsetLeft: boundingRect.left
        });
    }

    getMicroscopyMetadataToolComponent(){
        return (this.microMetaToolRef && this.microMetaToolRef.current && this.microMetaToolRef.current) || null;
    }

    havePermissionToEdit(){
        const { session, context : { actions = [] } } = this.props;
        return !!(session && _.findWhere(actions, { 'name' : 'edit' }));
    }

    /**
      * Update the current microscope configuration for the user, based on the current data.
      * Note that this function is throttled in constructor() to prevent someone clicking it like, 100 times within 3 seconds.
      * @returns {void}
    */
    handleSave(evt) {
        evt.preventDefault();

        const mtc = this.getMicroscopyMetadataToolComponent();
        const microscopeStr = mtc.api.exportMicroscopeConfString();
        const microscope = microscopeStr && JSON.parse(microscopeStr);

        if (!microscope){
            throw new Error('Could not get current configuration.');
        }

        this.onSaveMicroscope(microscope);
    }

    /**
        * Create a new microscope configuration for the user, based on the current data.
        * @returns {void}
    */
    handleClone(evt) {
        const { context } = this.props;
        evt.preventDefault();

        const mtc = this.getMicroscopyMetadataToolComponent();
        const microscopeStr = mtc.api.exportMicroscopeConfString();
        const microscope = microscopeStr && JSON.parse(microscopeStr);

        if (!microscope) {
            throw new Error('Could not get current configuration.');
        }

        // Generate a new title and description based on the current display.
        const userDetails = JWT.getUserDetails();
        let userFirstName = "Unknown";

        if (userDetails && typeof userDetails.first_name === 'string' && userDetails.first_name.length > 0) userFirstName = userDetails.first_name;

        const microConfTitleAppendStr = " - " + userFirstName + "'s copy";
        const microConfDesc = context.description;
        let microConfTitle = context.display_title + microConfTitleAppendStr; // Default, used if title does not already have " - [this user]'s copy" substring.

        // Check if our title already has " - user's copy" substring and if so,
        // increment an appended counter instead of re-adding the substring.
        if (context.display_title.indexOf(microConfTitleAppendStr) > -1) {
            const regexCheck = new RegExp('(' + microConfTitleAppendStr + ')\\s\\(\\d+\\)');
            const regexMatches = context.display_title.match(regexCheck);

            if (regexMatches && regexMatches.length === 2) {
                // regexMatches[0] ==> " - user's copy (int)"
                // regexMatches[1] ==> " - user's copy"
                let copyCount = parseInt(
                    regexMatches[0].replace(regexMatches[1], '')
                        .trim()
                        .replace('(', '')
                        .replace(')', '')
                );

                copyCount++;
                microConfTitle = (
                    context.display_title.replace(regexMatches[0], '') // Remove old " - user's copy (int)" substr
                    + microConfTitleAppendStr + ' (' + copyCount + ')'  // Add new count
                );
            } else {
                // Our title already has " - user's copy" substring, but not an " (int)"
                microConfTitle = context.display_title + ' (2)';
            }
        }

        const fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title': "Failed to save configuration.",
                'message': "Sorry, can you try to save again?",
                'style': 'danger'
            });
            this.setState({ 'cloneLoading': false });
        };

        microscope.Name = microConfTitle;

        const payload = {
            'title': microConfTitle,
            'description': microConfDesc,
            'microscope': microscope,
            // We don't include other properties and let them come from schema default values.
            // For example, default status is 'draft', which will be used.
            // Lab and award do not carry over as current user might be from different lab.
        };

        // Try to POST/PUT a new viewconf.
        this.setState(
            { 'cloneLoading': true },
            () => {
                ajax.load(
                    '/microscope-configurations/',
                    (resp) => { // We're likely to get a status code of 201 - Created.
                        this.setState({ 'cloneLoading': false }, () => {
                            const newItemHref = object.itemUtil.atId(resp['@graph'][0]);

                            // Redirect the user to the new Microscope display.
                            navigate(newItemHref, {}, (resp) => {
                                // Show alert on new Item page
                                Alerts.queue({
                                    'title': "Saved " + microConfTitle,
                                    'message': "Saved new display.",
                                    'style': 'success'
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
      * Cancel/hide modal popup
      * @returns {void}
    */
    handleModalCancel() {
        this.setState({ 'modal': null });
    }

    /**
        * Copies current URL to clipbard.
        * Sets the microscope display status to released if it isn't already.
        *
        * @returns {void}
    */
    handleStatusChange(statusToSet = 'released', evt) {
        evt.preventDefault();

        const { context, href } = this.props;
        const mtc = this.getMicroscopyMetadataToolComponent();
        const confTitle = context.title || context.display_title;

        // If the view config has already been released, just copy the URL to the clipboard and return.
        if (context.status === statusToSet) {
            return;
        }

        if (!this.havePermissionToEdit()) {
            throw new Error('No edit permissions.');
        }

        // PATCH `status: released` to current href, then in a callback, copy the URL to the clipboard.
        this.setState(
            { 'releaseLoading': true },
            () => {
                ajax.load(
                    href,
                    (resp) => {
                        // Success! Generate an alert telling the user it's successful
                        this.setState({ 'releaseLoading': false });
                        Alerts.queue({
                            'title': "Updated Status for " + confTitle,
                            'message': (
                                <p className="mb-02">
                                    Changed Display status to <b>{statusToSet}</b>.
                                    It may take some time for this edit to take effect.
                                </p>
                            ),
                            'style': 'info'
                        });
                    },
                    'PATCH',
                    (resp) => {
                        // Error callback
                        this.setState({ 'releaseLoading': false });
                        Alerts.queue({
                            'title': "Failed to release display.",
                            'message': "Sorry, can you try to share again?",
                            'style': 'danger'
                        });
                    },
                    JSON.stringify({
                        'status': statusToSet
                    })
                );
            }
        );
    }

    /** @todo make into functional component */
    statusChangeButton(){
        const { session, context } = this.props;
        const { saveLoading, cloneLoading, releaseLoading } = this.state;
        const editPermission = this.havePermissionToEdit();

        if (!session || !editPermission) return null; // TODO: Remove and implement for anon users. Eventually.

        const btnProps  = {
            'onSelect'      : this.handleStatusChange,
            //'onClick'       : context.status === 'released' ? null : this.handleStatusChangeToRelease,
            'variant'       : context.status === 'released' ? 'outline-dark' : 'info',
            'disabled'      : releaseLoading,
            'key'           : 'statuschangebtn',
            'data-tip'      : "Change the visibility/permissions of this Microscope Configuration",
            'title'         : (
                <React.Fragment>
                    <i className={"icon icon-fw icon-" + (releaseLoading ? 'circle-notch fas icon-spin' : 'id-badge far')}/>&nbsp; Manage
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
                <Dropdown.Divider />
                <StatusMenuItem eventKey="deleted" context={context}>Delete</StatusMenuItem>
            </DropdownButton>
        );
    }

    /** @todo make into functional component or move to this components render method */
    saveButton(){
        const { session, context } = this.props;
        const { saveLoading } = this.state;
        const tooltip = "Save the current view shown below to this display";

        const editPermission  = this.havePermissionToEdit();

        return (
            <button type="button" onClick={this.handleSave} disabled={!editPermission || saveLoading} className="btn btn-success" key="savebtn" data-tip={tooltip}>
                <i className={"icon icon-fw icon-" + (saveLoading ? 'circle-notch icon-spin fas' : 'save fas')}/>&nbsp; Save
            </button>
        );
    }

    /** @todo make into functional component or move to this components render method */
    cloneButton(){
        const { session } = this.props;
        const { cloneLoading } = this.state;
        const tooltip = "Create your own new Microscope Configuration based off of this one";

        return (
            <button type="button" onClick={this.handleClone} disabled={!session || cloneLoading} className="btn btn-success" key="clonebtn" data-tip={tooltip}>
                <i className={"icon icon-fw icon-" + (cloneLoading ? 'circle-notch icon-spin fas' : 'clone far')}/>&nbsp; Clone
            </button>
        );
    }

    /**
     * Is used to call {function} `props.toggleFullScreen` which is passed down from app.js BodyElement.
     */
    handleFullscreenToggle(){
        const { isFullscreen, toggleFullScreen } = this.props;
        setTimeout(toggleFullScreen, 0, !isFullscreen);
    }

    /** @todo make into functional component or move to this components render method */
    fullscreenButton(){
        const { isFullscreen, toggleFullScreen } = this.props;
        if(typeof isFullscreen === 'boolean' && typeof toggleFullScreen === 'function'){
            return (
                <button type="button" className="btn btn-outline-dark" onClick={this.handleFullscreenToggle} data-tip={!isFullscreen ? 'Expand to full screen' : null}>
                    <i className={"icon icon-fw fas icon-" + (!isFullscreen ? 'expand' : 'compress')}/>
                </button>
            );
        }
        return null;
    }

    onSaveMicroscope(microscope, complete) {
        const { href, context } = this.props;
        const { modal } = this.state;

        if (!this.havePermissionToEdit()) {
            // I guess would also get caught in ajax error callback.
            throw new Error('No edit permissions.');
        }

        if (modal == null && context.status && typeof context.status === 'string' &&
            (context.status === 'released' || context.status === 'released to project')) {
            this.setState({
                'modal': (
                    <ConfirmModal handleConfirm={this.handleSave} handleCancel={this.handleModalCancel}
                        confirmButtonText="Save" cancelButtonText="Cancel" modalTitle="Confirm Save">
                        You are overwriting a Microscope Configuration Item that was previously shared with public. Are you sure?
                        <br />Note that you can also clone this display and share the new copy.
                    </ConfirmModal>
                )
            });
            return;
        }

        // We're updating this object's microscope.
        const payload = {
            'title': microscope.Name,
            'microscope': microscope
        };

        this.setState({ 'saveLoading': true, 'modal': null }, () => {
            ajax.load(
                href,
                (resp) => {
                    // Success callback... maybe update state.originalViewConfigString or something...
                    // At this point we're saved maybe just notify user somehow if UI update re: state.saveLoading not enough.
                    Alerts.queue({
                        'title': "Saved " + microscope.Name,
                        'message': "This Microscope Configuration Item has been updated with the current viewport. This may take a few minutes to take effect.",
                        'style': 'success'
                    });
                    this.setState({ 'saveLoading': false });
                },
                'PATCH',
                () => {
                    // Error callback
                    Alerts.queue({
                        'title': "Failed to save display.",
                        'message': "Sorry, can you try to save again?",
                        'style': 'danger'
                    });
                    this.setState({ 'saveLoading': false });
                },
                JSON.stringify(payload)
            );
        });

        if (complete) {
            complete(microscope.Name);
        }
    }

    render(){
        const { schemas, isFullscreen, context, windowWidth, windowHeight } = this.props;
        const { mounted, modal, containerOffsetLeft, containerOffsetTop } = this.state;
        // const tips = object.tipsFromSchema(schemas, context);
        // const result = context;
        const width = isFullscreen ? windowWidth : layout.gridContainerWidth(windowWidth);
        const height = Math.max(700, windowHeight /2);

        if (!mounted){
            return (
                <div className="container text-center">
                    <i className="icon icon-spin icon-circle-notch fas text-larger mt-5"/>
                </div>
            );
        }

        //console.log("TTT", containerOffsetLeft, containerOffsetTop);

        const passProps = {
            width, height,
            containerOffsetLeft,
            containerOffsetTop,
            //onLoadMicroscopes,
            onLoadSchema,
            onSaveMicroscope: this.onSaveMicroscope,
            //visualizeImmediately: true,
            //loadedMicroscopeConfiguration: { ... },
            imagesPathSVG,
            imagesPathPNG,
            scalingFactor: 0.65
        };

        return (
            <div className={"overflow-hidden tabview-container-fullscreen-capable" + (isFullscreen ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>4DN MicroMeta</span>
                    <CollapsibleItemViewButtonToolbar windowWidth={windowWidth}
                        constantButtons={this.fullscreenButton()} collapseButtonTitle={this.collapseButtonTitle}>
                        {this.saveButton()}
                        {this.cloneButton()}
                        {this.statusChangeButton()}
                    </CollapsibleItemViewButtonToolbar>
                </h3>
                <hr className="tab-section-title-horiz-divider" />
                <div className="microscope-tab-view-contents">
                    <div className="micrometa-container" ref={this.containerElemRef} style={{ height : height + 20 }}>
                        <MicroscopyMetadataTool {...passProps} microscope={context.microscope} ref={this.microMetaToolRef} />
                    </div>
                </div>
                {modal}
            </div>
        );
    }

}

function StatusMenuItem(props){
    const { eventKey, context, children } = props;
    const active = context.status === eventKey;
    return (
        <DropdownItem {..._.omit(props, 'context')} active={active}>
            <span className={active ? "text-500" : null}>
                <i className="item-status-indicator-dot" data-status={eventKey} />&nbsp;  { children }
            </span>
        </DropdownItem>
    );
}
