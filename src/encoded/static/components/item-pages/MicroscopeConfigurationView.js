'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';
import DropdownButton from 'react-bootstrap/esm/DropdownButton';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import Dropdown from 'react-bootstrap/esm/Dropdown';
import Collapse from 'react-bootstrap/esm/Collapse';
import ReactTooltip from 'react-tooltip';

import { JWT, console, object, layout, ajax, navigate, logger } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Alerts';
import { FacetList } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/FacetList';

import { MicroMetaPlainContainer, MicroMetaLoadingIndicator } from './components/MicroMeta/MicroMetaPlainContainer';
import { Wrapper as ItemHeaderWrapper, TopRow, MiddleRow, BottomRow } from './components/ItemHeader';
import DefaultItemView from './DefaultItemView';
import { CollapsibleItemViewButtonToolbar } from './components/CollapsibleItemViewButtonToolbar';
import { ConfirmModal } from './HiGlassViewConfigView';
import { onLoginNavItemClick } from './../navigation/components/LoginNavItem';
import { matchSettings, menu_order } from 'micro-meta-app-react/es/constants';


export default class MicroscopeConfigurationView extends DefaultItemView {

    itemHeader() {
        const itemActionsDescriptions = {
            'edit': 'Edit the properties of this Item.',
        };

        return (
            <ItemHeaderWrapper {..._.pick(this.props, 'context', 'href', 'schemas', 'windowWidth')}>
                <TopRow itemActionsDescriptions={itemActionsDescriptions} typeInfoVisible={false} />
                <MiddleRow isInlineEditable={false} className="micro-meta-item-page-heading" />
                <BottomRow />
            </ItemHeaderWrapper>
        );
    }

    constructor(props){
        super(props);
        this.mcRef = React.createRef();
    }

    getTabViewContents(){
        const initTabs = [];
        const width = this.getTabViewWidth();
        const tabProps = _.extend({ ref: this.mcRef }, this.props);
        initTabs.push(MicroMetaTabView.getTabObject(tabProps, width));
        initTabs.push(MicroMetaSummaryTabView.getTabObject(tabProps, width));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}

const MicroMetaTabViewFRef = React.forwardRef((props, ref) => <MicroMetaTabView {...props} forwardRef={ref} />);
export class MicroMetaTabView extends React.PureComponent {

    static getTabObject(props, width) {
        const { ref } = props;

        return {
            'tab' : <span><i className="icon icon-microscope fas icon-fw"/> MicroMeta</span>,
            'key' : 'micrometa',
            'content' : <MicroMetaTabViewFRef {...props} width={width} />
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
        this.handleLoginModalConfirm = this.handleLoginModalConfirm.bind(this);
        this.onSaveMicroscope = this.onSaveMicroscope.bind(this);
        this.getMicroscopyMetadataToolComponent = this.getMicroscopyMetadataToolComponent.bind(this);
        this.generateNewTitle = this.generateNewTitle.bind(this);

        const { forwardRef } = props;

        this.state = {
            'saveLoading'           : false,
            'cloneLoading'          : false,
            'releaseLoading'        : false,
            'modal'                 : null
        };

        this.microMetaToolRef = forwardRef;//React.createRef();

        //force the page display in full screen
        // const { toggleFullScreen } = props;
        // setTimeout(toggleFullScreen, 0, true);
    }

    getMicroscopyMetadataToolComponent(){
        return (this.microMetaToolRef && this.microMetaToolRef.current && this.microMetaToolRef.current.getMicroMetaAppComponent()) || null;
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
        if (!mtc || !mtc.api){
            logger.error('Could not get API.');
            throw new Error('Could not get API.');
        }
        const microscopeStr = mtc.api.exportMicroscopeConfString();
        const microscope = microscopeStr && JSON.parse(microscopeStr);

        if (!microscope){
            logger.error('Could not get current configuration.');
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
        if (!mtc || !mtc.api){
            logger.error('Could not get API.');
            throw new Error('Could not get API.');
        }
        const microscopeStr = mtc.api.exportMicroscopeConfString();
        const microscope = microscopeStr && JSON.parse(microscopeStr);

        if (!microscope) {
            logger.error('Could not get current configuration.');
            throw new Error('Could not get current configuration.');
        }

        const microConfTitle = this.generateNewTitle();
        const microConfDesc = context.description;

        microscope.Name = microConfTitle;
        microscope.ID = ''; //remove old microscope's ID to be re-set in backend

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
                    () => {
                        // Error callback
                        Alerts.queue({
                            'title': "Failed to save configuration.",
                            'message': "Sorry, can you try to save again?",
                            'style': 'danger'
                        });
                        this.setState({ 'cloneLoading': false });
                    },
                    JSON.stringify(payload)
                );
            }
        );
    }
    /**
     * Generate a new title and description based on the current display.
     */
    generateNewTitle(){
        const { context } = this.props;

        const userDetails = JWT.getUserDetails();
        let userFirstName = "Unknown";

        if (userDetails && typeof userDetails.first_name === 'string' && userDetails.first_name.length > 0) userFirstName = userDetails.first_name;

        const microConfTitleAppendStr = " - " + userFirstName + "'s copy";
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

        return microConfTitle;
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
        const confTitle = context.title || context.display_title;

        // If the view config has already been released, just copy the URL to the clipboard and return.
        if (context.status === statusToSet) {
            return;
        }

        if (!this.havePermissionToEdit()) {
            logger.error('No edit permissions.');
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

        const btnProps = {
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
                {/* <StatusMenuItem eventKey="released to lab" context={context}>Visible by Lab</StatusMenuItem> */}
                <StatusMenuItem eventKey="draft" context={context}>Private</StatusMenuItem>
                <Dropdown.Divider />
                <StatusMenuItem eventKey="deleted" context={context}>Delete</StatusMenuItem>
            </DropdownButton>
        );
    }

    /** @todo make into functional component or move to this components render method */
    saveButton(){
        const { saveLoading } = this.state;
        const tooltip = "Save the current view shown below to this display";

        const editPermission = this.havePermissionToEdit();

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

    handleLoginModalConfirm() {
        this.setState(function () {
            return { 'modal': null };
        }, onLoginNavItemClick);
    }

    /** @todo make into functional component or move to this components render method */
    fullscreenButton(){
        const { isFullscreen, toggleFullScreen } = this.props;
        if(typeof isFullscreen === 'boolean' && typeof toggleFullScreen === 'function'){
            return (
                <button type="button" className="btn btn-outline-dark" onClick={this.handleFullscreenToggle} data-tip={!isFullscreen ? 'Expand to full screen' : null}>
                    <i className={"icon icon-fw fas icon-" + (!isFullscreen ? 'expand' : 'compress')}/>{!isFullscreen ? ' Full Screen' : ' Exit Full Screen'}
                </button>
            );
        }
        return null;
    }

    onSaveMicroscope(microscope, complete) {
        const { href, context, session } = this.props;
        const { modal } = this.state;

        if (!this.havePermissionToEdit()) {
            logger.error('No edit permissions.');
            // I guess would also get caught in ajax error callback.
            // throw new Error('No edit permissions.');
            if (!session) {
                this.setState({
                    'modal': (
                        <ConfirmModal handleConfirm={this.handleLoginModalConfirm} handleCancel={this.handleModalCancel}
                            confirmButtonText="Login" modalTitle="Login Required">
                            Log in or create an account to save this configuration.
                        </ConfirmModal>
                    )
                });
            } else {
                this.setState({
                    'modal': (
                        <ConfirmModal handleCancel={this.handleModalCancel}
                            cancelButtonText="Close" confirmButtonVisible={false} modalTitle="Permission Denied">
                            Access was denied to save this configuration.
                        </ConfirmModal>
                    )
                });
            }

            return;
        }

        //determine save or save as clicked
        //todo: It would be better if this information provided from micrometa api
        const mtc = this.getMicroscopyMetadataToolComponent();
        if (!mtc || !mtc.api) {
            throw new Error('Could not get API.');
        }
        const microscopeStr = mtc.api.exportMicroscopeConfString();
        const microscopeOrig = microscopeStr && JSON.parse(microscopeStr);

        //save as
        if (microscopeOrig.ID !== microscope.ID) {
            const microConfTitle = this.generateNewTitle();
            const microConfDesc = context.description;

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
                        () => {
                            // Error callback
                            Alerts.queue({
                                'title': "Failed to save configuration.",
                                'message': "Sorry, can you try to save again?",
                                'style': 'danger'
                            });
                            this.setState({ 'cloneLoading': false });
                        },
                        JSON.stringify(payload)
                    );
                }
            );
            if (complete) {
                complete(microscope.Name);
            }

            console.log('SAVE AS CLICKED: microscope.ID:', microscope.ID, ', microscopeOrig.ID:', microscopeOrig.ID);

            return;
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
            'description': microscope.Description || '',
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
        const { isFullscreen, context, windowWidth, windowHeight } = this.props;
        const { modal } = this.state;

        const width = isFullscreen ? windowWidth - 40 : layout.gridContainerWidth(windowWidth);
        const height = isFullscreen ? Math.max(800, windowHeight - 120) : Math.max(800, windowHeight / 2);

        return (
            <div className={"tabview-container-fullscreen-capable" + (isFullscreen ? ' full-screen-view' : ' overflow-hidden')}>
                <h3 className="tab-section-title">
                    <span>4DN MicroMeta</span>
                    <CollapsibleItemViewButtonToolbar windowWidth={windowWidth}
                        constantButtons={this.fullscreenButton()} collapseButtonTitle={this.collapseButtonTitle}>
                        {/* {this.saveButton()}
                        {this.cloneButton()}
                        {this.statusChangeButton()} */}
                    </CollapsibleItemViewButtonToolbar>
                </h3>
                {/* <hr className="tab-section-title-horiz-divider" /> */}
                <div className="microscope-tab-view-contents">
                    <div className="micrometa-container-container" style={{ height }}>
                        <MicroMetaPlainContainer {..._.omit(this.props, 'context', 'microscope')}
                            {...{ width, height, onSaveMicroscope: this.onSaveMicroscope, microscopeConfig: context.microscope }}
                            ref={this.microMetaToolRef} zoomVisible={false} />
                    </div>
                </div>
                {modal}
            </div>
        );
    }

}

let microMetaDependencies = null;
const MicroMetaSummaryTabViewFRef = React.forwardRef((props, ref) => <MicroMetaSummaryTabView {...props} forwardRef={ref} />);
export class MicroMetaSummaryTabView extends React.PureComponent {
    
    static getTabObject(props, width) {
        const { ref } = props;

        return {
            'tab': <span><i className="icon icon-list-alt fas icon-fw" /> Hardware Summary</span>,
            'key': 'hardware-summary',
            'content': <MicroMetaSummaryTabViewFRef {...props} width={width} />
        };
    }

    static facetsFromMicroscope(microscope) {
        const categoryObj = {};
        _.forEach(microscope.components, function (component) {
            const s = component.Category.split('.');
            const category = s.length > 1 ? s[1] : s[0];

            if (!categoryObj[category]) {
                categoryObj[category] = {};
            }
            const term = component.Schema_ID.substring(0, component.Schema_ID.length - 5);
            if (!categoryObj[category][term]) {
                categoryObj[category][term] = 1;
            } else {
                categoryObj[category][term] += 1;
            }
        });

        const facets = [];
        _.forEach(_.keys(categoryObj).sort(), function (category) {
            const terms = _.sortBy(_.map(categoryObj[category], function (num, key) {
                return { "key": key, "doc_count": num };
            }), function (t) { return -t.doc_count });
            facets.push({
                "field": category,
                "title": category,
                "aggregation_type": "terms",
                "terms": terms
            })
        });

        return facets;
    }

    static defaultLayoutSettings(windowWidth, mounted, matches) {
        let length = 1;
        if (matches) {
            if (Array.isArray(matches)) {
                length = matches.length;
            } else if (typeof matches === 'int' || typeof matches === 'number') {
                length = matches;
            } else {
                throw Error('matches must be either array or numeric');
            }
        }

        const gridState = mounted && layout.responsiveGridState(windowWidth);
        const isMobileSize = gridState && ['xs', 'sm', 'md'].indexOf(gridState) > -1;

        let columClassName = '', tooltipLimit = 20;
        let visibleMatchCount = length;

        if (isMobileSize) {
            columClassName = 'col-8 col-xl-9';
            visibleMatchCount = 1;
        } else if (gridState === 'lg') {
            switch (length) {
                case 1:
                    columClassName = 'col-8 col-lg-8';
                    tooltipLimit = 120;
                    break;
                default:
                    columClassName = 'col-8 col-lg-4';
                    tooltipLimit = 30;
                    visibleMatchCount = 2;
            }
        } else {
            switch (length) {
                case 1:
                    columClassName = 'col-8 col-xl-9';
                    tooltipLimit = 120;
                    break;
                case 2:
                    columClassName = 'col-8 col-xl-4';
                    tooltipLimit = 50;
                    visibleMatchCount = 2;
                    break;
                case 3:
                    columClassName = 'col-8 col-xl-3';
                    break;
                default:
                    columClassName = 'col-8 col-xl-2';
                    visibleMatchCount = 4;
            }
        }

        return { columClassName, tooltipLimit, visibleMatchCount, isMobileSize };
    }

    constructor(props){
        super(props);

        this.getMicroscope = this.getMicroscope.bind(this);
        this.onFilter = this.onFilter.bind(this);
        this.toggleExpand = this.toggleExpand.bind(this);
        this.onClickPrevious = this.onClickPrevious.bind(this);
        this.onClickNext = this.onClickNext.bind(this);
        this.prevNextButton = this.prevNextButton.bind(this);
        this.handleMatchSelection = this.handleMatchSelection.bind(this);
        this.memoized = {
            facetsFromMicroscope: memoize(MicroMetaSummaryTabView.facetsFromMicroscope),
            defaultLayoutSettings: memoize(MicroMetaSummaryTabView.defaultLayoutSettings)
        }
        const { forwardRef } = props;

        this.microMetaToolRef = forwardRef;
        this.state = {
            'currentFilters': []
        }
    }

    /**
     * @todo: move dependencies downloading into PackageLockLoader component
     *        for performance and reusability
     */
    componentDidMount(){
        const onComplete = () => {
            this.setState({ mounted: true });
        };

        if (!microMetaDependencies) {
            window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility polyfill

            setTimeout(()=>{
                // Load in Microscopy Metadata Tool libraries as separate JS file due to large size.
                // @see https://webpack.js.org/api/module-methods/#requireensure

                import(
                    /* webpackChunkName: "micrometa-dependencies" */
                    'micrometa-dependencies'
                ).then((loadedDeps) => {
                    const tempMicroMetaDependencies = loadedDeps;
                    window
                        .fetch(
                            "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/versions/v02-01/fullSchema.json"
                        )
                        .then(function (resp) {
                            return resp.text();
                        })
                        .then(function (respText) {
                            tempMicroMetaDependencies.schemas = JSON.parse(respText);
                            microMetaDependencies = tempMicroMetaDependencies;

                            onComplete();
                        });
                });
            });
        } else {
            onComplete();
        }
    }

    componentDidUpdate(prevProps, prevState){
        const { windowWidth } = this.props;
        const { windowWidth: prevWindowWidth } = prevState;
        const { currentFilters, firstVisibleMatchIndex } = this.state;
        const { currentFilters: prevCurrentFilters, firstVisibleMatchIndex: prevFirstVisibleMatchIndex } = prevState;

        let term = null, field = null, prevTerm = null, prevField = null;
        if (currentFilters && currentFilters.length > 0) {
            ({ term, field } = currentFilters[0]);
        }
        if (prevCurrentFilters && prevCurrentFilters.length > 0) {
            ({ term: prevTerm, field: prevField } = prevCurrentFilters[0]);
        }

        if (windowWidth !== prevWindowWidth || field !== prevField ||
            term !== prevTerm || firstVisibleMatchIndex !== prevFirstVisibleMatchIndex) {
            ReactTooltip.rebuild();
        }
    }

    getMicroscope(){
        const { context } = this.props;
        let { microscope } = context || {};

        const mtc = (this.microMetaToolRef && this.microMetaToolRef.current && this.microMetaToolRef.current.getMicroMetaAppComponent()) || null;
        if (!mtc || !mtc.api){
            logger.error('Could not get API.');
            // throw new Error('Could not get API.');
            // return null;
        } else {
            // const microscopeStr = mtc.api.exportMicroscopeConfString();
            // microscope = microscopeStr && JSON.parse(microscopeStr);
        }

        return microscope;
    }

    onFilter(facet, term, callback) {
        const microscope = this.getMicroscope();

        const matches = _.filter(microscope.components, function (component) {
            const t = component.Schema_ID.substring(0, component.Schema_ID.length - 5);
            return term.key === t;
        });

        const { schemas = [] } = microMetaDependencies;

        let foundSchema = null;
        if (schemas && matches.length > 0) {
            foundSchema = _.find(schemas, function(s){
                return s.ID === matches[0].Schema_ID;
            });
        }

        this.setState({
            'currentFilters': [{ field: facet.field, term: term.key, remove: '' }],
            'matches': matches,
            'schema': foundSchema,
            'collapsedSections': {},
            'firstVisibleMatchIndex': 0
        });
    }

    toggleExpand(sectionKey) {
        this.setState(function ({ collapsedSections: existingCollapsedSections }) {
            const collapsedSections = _.extend({}, existingCollapsedSections);
            collapsedSections[sectionKey] = !collapsedSections[sectionKey];

            return { collapsedSections };
        });
    }

    onClickPrevious(e) {
        this.setState(function ({ firstVisibleMatchIndex }) {
            return { 'firstVisibleMatchIndex': firstVisibleMatchIndex - 1 };
        });
    }

    onClickNext(e){
        this.setState(function ({ firstVisibleMatchIndex }) {
            return { 'firstVisibleMatchIndex': firstVisibleMatchIndex + 1 };
        });
    }

    prevNextButton(isNext) {
        return (
            <div className="prev-next-button-container">
                <button type="button" className="toggle-detail-button" onClick={isNext ? this.onClickNext : this.onClickPrevious}>
                    <div className="icon-container" data-tip={'Show ' + (isNext ? 'next component' : 'previous component')}>
                        <i className={"icon icon-fw fas " + (isNext ? 'icon-angle-right' : 'icon-angle-left')} />
                    </div>
                </button>
            </div>
        );
    }

    handleMatchSelection(idx) {
        this.setState({
            'firstVisibleMatchIndex': parseInt(idx)
        });
    }

    render() {
        const { isFullscreen, context, windowWidth, windowHeight, href } = this.props;
        const { mounted, currentFilters, matches, schema, collapsedSections, firstVisibleMatchIndex } = this.state;

        const width = isFullscreen ? windowWidth - 40 : layout.gridContainerWidth(windowWidth);
        const height = isFullscreen ? Math.max(800, windowHeight - 120) : Math.max(800, windowHeight / 2);

        const placeholderStyle = { width: width || null };
        if (typeof height === 'number' && height >= 140) {
            placeholderStyle.height = height;
            placeholderStyle.paddingTop = (height / 2) - 40;
        }

        const microscope = this.getMicroscope();

        if (!microscope || !microMetaDependencies) {
            return <div className="text-center" style={placeholderStyle}><MicroMetaLoadingIndicator /></div>;
        }

        // left side - facets
        const facets = this.memoized.facetsFromMicroscope(microscope);

        // right side - results
        let headerTitle = 'Component Summary Table';
        let tableHeader = null, tableBody = null;
        
        if (matches && matches.length > 0 && schema) {
            
            const { columClassName, tooltipLimit, visibleMatchCount, isMobileSize } = this.memoized.defaultLayoutSettings(windowWidth, mounted, matches.length);

            const visibleMatches = matches.slice(firstVisibleMatchIndex, firstVisibleMatchIndex + visibleMatchCount);

            if (isMobileSize && matches.length > visibleMatchCount) {
                tableHeader = (
                    <div className="row summary-sub-header">
                        <div className="col summary-title-column text-truncate">MetaData</div>
                        <div className={columClassName + " summary-title-column"}>
                            <DropdownButton title={matches[firstVisibleMatchIndex].Name} variant="outline-secondary btn-block text-left"
                                size="md" className="w-100" onSelect={this.handleMatchSelection}>
                                {
                                    _.map(matches, function (match, idx) {
                                        return (
                                            <DropdownItem key={"match-" + idx} eventKey={idx}>
                                                {match.Name || "-"}
                                            </DropdownItem>);
                                    })
                                }
                            </DropdownButton>
                        </div>
                    </div>
                );
            } else {
                const showPrevBtn = matches.length > visibleMatchCount && firstVisibleMatchIndex > 0;
                const showNextBtn = matches.length > visibleMatchCount && (firstVisibleMatchIndex + visibleMatchCount) < matches.length;

                tableHeader = (
                    <div className="row summary-sub-header">
                        <div className="col col-lg-3 col-xl-3 summary-title-column text-truncate">MetaData {showPrevBtn ? this.prevNextButton(false) : null}</div>
                        {_.map(visibleMatches, function (m, index) {
                            return (
                                <div className={columClassName + " summary-title-column text-truncate"}>
                                    {m.Name}
                                </div>
                            );
                        }, this)}
                        {showNextBtn ? <div className="col-lg-1 col-xl-1 summary-title-column text-truncate">{this.prevNextButton(true)}</div> : null}
                    </div>
                );
            }
            
            const schemaPropPairs = _.pairs(schema.properties);          

            tableBody = _.map(_.keys(schema.subCategoriesOrder), function(subCategory){
                const subCategoryProperties = _.filter(schemaPropPairs, function (spp) {
                    const [, propItem] = spp;
                    return propItem && propItem.category === subCategory;
                });
                const sectionProps = {
                    subCategory, subCategoryProperties, matches: visibleMatches, tooltipLimit, columClassName, 
                    collapsed: !!collapsedSections[subCategory]
                };
                return <CollapsibleSubCategory key={subCategory} {...sectionProps} toggleExpand={this.toggleExpand} />
            }, this);

            // update title to include selected term name and count
            if (!isMobileSize && currentFilters && currentFilters.length > 0) {
                const [{ term: filterTerm }] = currentFilters;
                headerTitle += ` - ${filterTerm} (${matches.length})`;
            }
        } else {
            placeholderStyle.width = null;
            placeholderStyle.height = null;
            if (typeof height === 'number' && height >= 400) {
                placeholderStyle.height = height - 200;
                placeholderStyle.paddingTop = ((height - 200) / 2) - 40;
            }
            tableBody = (
                <div className="text-center" style={placeholderStyle}>
                    <MicroMetaLoadingIndicator title="Select a Component to Activate the Summary Table" />
                </div>);
        }

        const facetListProps = {
            context: { "filters": currentFilters },
            title: "Hardware Explorer",
            facets,
            onFilter: this.onFilter,
            useRadioIcon: true,
            persistSelectedTerms: false
        };

        return (
            <div class="overflow-hidden">
                <h3 class="tab-section-title"><span>Hardware Summary</span></h3>
                <hr class="tab-section-title-horiz-divider mb-1" />
                <div className="row overflow-auto">
                    <div className="col-12 col-md-5 col-lg-4 col-xl-3">
                        <FacetList {...facetListProps} />
                    </div>
                    <div className="col-12 col-md-7 col-lg-8 col-xl-9 micro-meta-summary-results">
                        <div className="row summary-header">
                            <div class="col summary-title-column text-truncate">
                                <i class="icon icon-fw icon-microscope fas"></i>&nbsp;<h4 class="summary-title">{headerTitle}</h4>
                            </div>
                        </div>
                        {tableHeader}
                        {tableBody}
                    </div>
                </div>
            </div>
        );
    }
}

/**
 * CollapsibleSubCategory renders subcategory and its fields in a collapsible panel.
 * Row header displays the field name, rest of the row cells are for component instances' value for that field.
 */
const CollapsibleSubCategory = React.memo(function CollapsibleSubCategory(props) {
    const { subCategory, matches, subCategoryProperties, tooltipLimit, columClassName, collapsed, toggleExpand } = props;

    const itemRows = _.map(subCategoryProperties, function ([field, item]) {
        let hasValidColumn = false;
        const itemCols = _.map(matches, function (match) {
            if (typeof match[field] === 'undefined' || match[field] === null) {
                return (<div className={columClassName + " summary-item-column"}>&nbsp;</div>);
            }
            hasValidColumn = true;
            const tooltip = typeof match[field] === 'string' && match[field].length >= tooltipLimit ? match[field] : null;
            return (
                <div className={columClassName + " summary-item-column"}>
                    <div className="text-truncate" data-tip={tooltip}>{match[field].toString()}</div>
                </div>);
        });

        return hasValidColumn ? (
            <div className="row summary-item-row">
                <div className="col-4 col-lg-3 col-xl-3 summary-item-row-header">
                    <object.TooltipInfoIconContainer title={field} tooltip={item.description} className="text-truncate" />
                </div>
                {itemCols}
            </div>
        ) : null;
    });

    const hasValidRow = _.any(itemRows, function (iRow) { return !!iRow; });

    return (
        hasValidRow ?
            <div className="summary-section-container">
                <div className="row summary-section-header">
                    <div class="col summary-title-column text-truncate">
                        <i class={"icon icon-fw fas " + (collapsed ? 'icon-plus' : 'icon-minus')} onClick={() => toggleExpand(subCategory)}></i>&nbsp;<h4 class="summary-title">{subCategory}</h4>
                    </div>
                </div>
                <Collapse in={!collapsed}>
                    <div>
                        {itemRows}
                    </div>
                </Collapse>
            </div> : null
    )
});

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
