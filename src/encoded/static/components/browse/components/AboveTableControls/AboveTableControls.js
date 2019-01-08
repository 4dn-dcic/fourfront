'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { Button, Collapse, Popover, OverlayTrigger } from 'react-bootstrap';
import { isServerSide, layout } from './../../../util';
import * as vizUtil from './../../../viz/utilities';
import { SearchResultTable } from './../SearchResultTable';
import { CustomColumnSelector } from './../CustomColumnController';
import { ChartDataController } from './../../../viz/chart-data-controller';
import { wrapInAboveTablePanel } from './wrapInAboveTablePanel';
import { SelectedFilesControls, SelectedFilesFilterByContent } from './SelectedFilesControls';




/**
 * This component must be fed props from CustomColumnController (for columns UI), SelectedFilesController (for selected files read-out).
 * Some may need to be transformed to exclude certain non-user-controlled columns (e.g. @type) and such.
 */
export class AboveTableControls extends React.Component {

    static defaultProps = {
        'showSelectedFileCount' : false,
        'showTotalResults'      : false,
        'includeProcessedFiles' : true
    }

    constructor(props){
        super(props);
        this.handleOpenToggle = _.throttle(this.handleOpenToggle.bind(this), 350);
        this.handleClose = this.handleOpenToggle.bind(this, false);
        this.handleLayoutToggle = _.throttle(this.handleLayoutToggle.bind(this), 350);
        this.renderPanel = this.renderPanel.bind(this);
        this.renderOverlay = this.renderOverlay.bind(this);
        this.rightButtons = this.rightButtons.bind(this);
        this.setFileTypeFilters = this.setFileTypeFilters.bind(this);

        /**
         * @constant
         * @private
         * @type {Object}
         * @property {boolean} state.open - Whether panel is open.
         * @property {boolean} state.reallyOpen - Extra check for if open, will remain true until 'closing' transition is complete.
         * @property {string} state.layout - One of "normal" or "wide". If wide, then DOM is adjusted so that table is full width. Eventually will move this functionality out of here and into BodyElement in App js.
         * @property {string[]} state.fileTypeFilters - List of file_type_detailed strings that we filter selected files down to.
         * @property {string} state.gridState - Set and cached from layout.responsiveGridState. Set to 'lg' initially to render server-side at full width until mount since is most common case for users.
         */
        this.state = {
            'open' : false,
            'reallyOpen' : false,
            'layout' : 'normal',
            'fileTypeFilters' : [],
            'gridState' : 'lg'
        };
    }

    componentDidMount(){
        this.setState({ 'gridState' : layout.responsiveGridState(this.props.windowWidth || null) });
    }

    componentWillReceiveProps(nextProps){
        var newState = {};

        // Remove from fileTypeFilters if no newly selected files don't have filtered-in fileType.
        var fileTypeFilters     = this.state.fileTypeFilters,
            fileTypeBucketsNew  = SelectedFilesFilterByContent.filesToFileTypeBuckets(nextProps.selectedFiles),
            newTypes            = _.keys(fileTypeBucketsNew),
            typesToRemove       = [];

        for (var i = 0; i < fileTypeFilters.length ; i++){
            if (newTypes.indexOf(fileTypeFilters[i]) === -1){
                typesToRemove.push(fileTypeFilters[i]);
            }
        }
        if (typesToRemove.length > 0){
            newState.fileTypeFilters = _.difference(fileTypeFilters, typesToRemove);
        }

        // Set open=false if currently is 'filterFilesBy' && no selected files.

        if (this.state.open === 'filterFilesBy' && _.keys(nextProps.selectedFiles).length === 0){
            newState.open = false;
        }

        // If windowWidth or windowHeight has changed, update own layout style state if we're on 'full screen'-ish view -
        if (this.state.layout === 'wide' && typeof nextProps.windowWidth === 'number' && nextProps.windowWidth !== this.props.windowWidth){
            if (nextProps.windowWidth < 1200){
                newState.layout = 'normal';
            }
        }

        if (nextProps.windowWidth && nextProps.windowWidth !== this.props.windowWidth){
            newState.gridState = layout.responsiveGridState(nextProps.windowWidth);
        }

        if (_.keys(newState).length > 0){
            this.setState(newState);
        }
    }

    componentDidUpdate(prevProps, prevState){
        if (this.state.open || prevState.open !== this.state.open){
            ReactTooltip.rebuild();
        }
        if (prevProps.isFullscreen !== this.props.isFullscreen && typeof this.props.parentForceUpdate === 'function'){
            setTimeout(this.props.parentForceUpdate, 100);
        }
    }

    setFileTypeFilters(filters){
        this.setState({ 'fileTypeFilters' : filters });
    }

    handleOpenToggle(value){
        if (this.timeout){
            clearTimeout(this.timeout);
            delete this.timeout;
        }
        if (typeof value === 'string' && this.state.open === value) value = false;
        var state = { 'open' : value };
        if (state.open){
            state.reallyOpen = state.open;
            setTimeout(ReactTooltip.rebuild, 100);
        } else {
            this.timeout = setTimeout(()=>{
                this.setState({ 'reallyOpen' : false });
            }, 400);
        }
        this.setState(state);
    }

    handleLayoutToggle(){
        var { windowWidth, isFullscreen, toggleFullScreen } = this.props;
        if (!SearchResultTable.isDesktopClientside(windowWidth)) return null;
        if (typeof toggleFullScreen !== 'function'){
            console.error('No toggleFullscreen function passed in.');
            return null;
        }
        setTimeout(toggleFullScreen, 0, !isFullscreen);
    }

    filteredSelectedFiles(){
        return SelectedFilesControls.filterSelectedFilesByFileTypeFilters(this.props.selectedFiles, this.state.fileTypeFilters);
    }

    renderOverlay(){
        return (
            <Popover title="Configure Visible Columns" id="toggle-visible-columns" className="toggle-visible-columns-selector">
                <CustomColumnSelector {..._.pick(this.props, 'hiddenColumns', 'addHiddenColumn', 'removeHiddenColumn', 'columnDefinitions')} />
            </Popover>
        );
    }

    renderPanel(selectedFiles){
        var { open, reallyOpen } = this.state;
        if (open === 'customColumns' || reallyOpen === 'customColumns') {
            return (
                <Collapse in={!!(open)} appear>
                    { wrapInAboveTablePanel(
                        <CustomColumnSelector {..._.pick(this.props, 'hiddenColumns', 'addHiddenColumn', 'removeHiddenColumn', 'columnDefinitions')} />,
                        <span><i className="icon icon-fw icon-gear"/> Configure Visible Columns</span>,
                        'visible-columns-selector-panel',
                        this.handleClose
                    ) }
                </Collapse>
            );
        } else if (open === 'filterFilesBy' || reallyOpen === 'filterFilesBy') {
            return (
                <Collapse in={!!(open)} appear>
                    <div>
                        <SelectedFilesFilterByContent
                            {..._.pick(this.props, 'selectedFiles', 'selectedFilesUniqueCount', 'includeFileSets', 'includeProcessedFiles')}
                            subSelectedFiles={selectedFiles} closeButtonClickHandler={this.handleClose}
                            currentFileTypeFilters={this.state.fileTypeFilters} setFileTypeFilters={this.setFileTypeFilters} />
                    </div>
                </Collapse>
            );
        }
        return null;
    }

    leftSection(filteredSelectedFiles){
        var { showSelectedFileCount, selectedFiles, context, currentAction, showTotalResults } = this.props;

        // Case if on BrowseView, but not on SearchView
        // TODO: Modularize?
        if (showSelectedFileCount && selectedFiles){
            return (
                <ChartDataController.Provider id="selected_files_section">
                    <SelectedFilesControls
                        {..._.pick(this.props, 'href', 'selectedFiles', 'selectFile', 'unselectFile', 'selectedFilesUniqueCount', 'resetSelectedFiles',
                            'includeFileSets', 'includeProcessedFiles')}
                        subSelectedFiles={filteredSelectedFiles} onFilterFilesByClick={this.handleOpenToggle.bind(this, 'filterFilesBy')} currentFileTypeFilters={this.state.fileTypeFilters}
                        setFileTypeFilters={this.setFileTypeFilters} currentOpenPanel={this.state.open} gridState={this.state.gridState} />
                </ChartDataController.Provider>
            );
        }


        // FOR NOW, we'll stick 'add' button here. -- IF NO SELECTED FILES CONTROLS
        var addButton = null;
        // don't show during submission search "selecting existing"
        if (context && Array.isArray(context.actions) && !currentAction){
            var addAction = _.findWhere(context.actions, { 'name' : 'add' });
            if (addAction && typeof addAction.href === 'string'){
                addButton = (
                    <Button bsStyle="primary" href={addAction.href} bsSize="xs" data-skiprequest="true">
                        <i className="icon icon-fw icon-plus shift-down-1"/>
                        <span>Create</span>
                        &nbsp;
                    </Button>
                );
            }
        }

        // Case if on SearchView
        var total = null;
        if (showTotalResults) {
            if (typeof showTotalResults === 'number')               total = showTotalResults;
            else if (context && typeof context.total === 'number')  total = context.total;
            total = (
                <div style={{ 'verticalAlign' : 'bottom' }} className="inline-block">
                    <span className="text-500">{ total }</span> Results
                </div>
            );
        }

        if (!total && !addButton) return null;
        return (
            <div key="total-count" className="pull-left pt-11 box results-count">
                { total }{ total && addButton ? <React.Fragment>&nbsp;&nbsp;</React.Fragment> : '' }{ addButton }
            </div>
        );
    }

    rightButtons(){
        var { open, gridState } = this.state,
            { isFullscreen } = this.props;

        return (
            <div className="pull-right right-buttons">
                <Button key="toggle-visible-columns" data-tip="Configure visible columns" data-event-off="click" active={this.state.open === 'customColumns'} onClick={this.handleOpenToggle.bind(this, 'customColumns')}>
                    <i className="icon icon-gear icon-fw"/>{['lg', 'md'].indexOf(gridState) > -1 ? <span>Columns</span> : null }<i className="icon icon-fw icon-angle-down"/>
                </Button>
                <Button bsStyle="info" key="toggle-expand-layout" className={"expand-layout-button" + (!isFullscreen ? '' : ' expanded')}
                    onClick={this.handleLayoutToggle} data-tip={(!isFullscreen ? 'Expand' : 'Collapse') + " table width"}>
                    <i className={"icon icon-fw icon-" + (!isFullscreen ? 'expand' : 'compress')}></i>
                </Button>
            </div>
        );
    }


    render(){
        var selectedFiles = this.filteredSelectedFiles();
        return (
            <div className="above-results-table-row">
                <div className="clearfix">
                    { this.leftSection(selectedFiles) }
                    { this.rightButtons() }
                </div>
                { this.renderPanel(selectedFiles) }
            </div>
        );
    }
}

