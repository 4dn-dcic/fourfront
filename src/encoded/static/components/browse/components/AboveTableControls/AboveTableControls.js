'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { Button, Collapse, Popover } from 'react-bootstrap';
import { SearchResultTable } from './../SearchResultTable';
import { CustomColumnSelector } from './../CustomColumnController';
import { ChartDataController } from './../../../viz/chart-data-controller';
import { wrapInAboveTablePanel } from './wrapInAboveTablePanel';
import { SelectedFilesControls, SelectedFilesFilterByContent } from './SelectedFilesControls';




/**
 * This component must be fed props from CustomColumnController (for columns UI), SelectedFilesController (for selected files read-out).
 * Some may need to be transformed to exclude certain non-user-controlled columns (e.g. @type) and such.
 */
export class AboveTableControls extends React.PureComponent {

    /** Removes filters from fileTypeFilters if newly selected files don't have filtered-in fileType. */
    static filterFileTypeFilters = memoize(function(fileTypeFilters, selectedFiles){
        const existingFileTypeFiltersObject = _.object(_.map(fileTypeFilters, function(filtr){
            return [filtr, true];
        }));
        const fileTypeBucketsNew = SelectedFilesFilterByContent.filesToFileTypeBuckets(selectedFiles);
        let currFilter;
        for (var i = 0; i < fileTypeFilters.length ; i++){
            currFilter = fileTypeFilters[i];
            if (typeof fileTypeBucketsNew[currFilter] === 'undefined'){
                delete existingFileTypeFiltersObject[currFilter];
            }
        }
        return _.keys(existingFileTypeFiltersObject);
    });

    static defaultProps = {
        'showSelectedFileCount' : false,
        'showTotalResults'      : false,
        'includeProcessedFiles' : true
    };

    static getDerivedStateFromProps(props, state){
        const { selectedFiles, selectedFilesUniqueCount } = props;
        const newState = {
            'fileTypeFilters' : AboveTableControls.filterFileTypeFilters(state.fileTypeFilters, selectedFiles)
        };
        // Close FileType filter panel if no selected files.
        if (state.open === 'filterFilesBy' && (selectedFilesUniqueCount === 0 || _.keys(selectedFiles).length === 0)){
            newState.open = newState.reallyOpen = false;
        }
        return newState;
    }

    constructor(props){
        super(props);
        this.handleOpenToggle = _.throttle(this.handleOpenToggle.bind(this), 350);
        this.handleClose = this.handleOpenToggle.bind(this, false);
        this.handleOpenFileTypeFiltersPanel = this.handleOpenToggle.bind(this, 'filterFilesBy');
        this.handleOpenColumnsSelectionPanel = this.handleOpenToggle.bind(this, 'customColumns');
        this.renderPanel = this.renderPanel.bind(this);
        this.renderOverlay = this.renderOverlay.bind(this);
        this.setFileTypeFilters = this.setFileTypeFilters.bind(this);

        /**
         * @property {boolean} state.open - Whether panel is open.
         * @property {boolean} state.reallyOpen - Extra check for if open, will remain true until 'closing' transition is complete.
         * @property {string[]} state.fileTypeFilters - List of file_type_detailed strings that we filter selected files down to.
         */
        this.state = {
            'open' : false,
            'reallyOpen' : false,
            'fileTypeFilters' : []
        };
    }

    componentDidUpdate(prevProps, prevState){
        const { isFullscreen, parentForceUpdate } = this.props;
        const { open } = this.state;
        if (open && prevState.open !== open){
            ReactTooltip.rebuild();
        }
        if (prevProps.isFullscreen !== isFullscreen && typeof parentForceUpdate === 'function'){
            setTimeout(parentForceUpdate, 100);
        }
    }

    setFileTypeFilters(fileTypeFilters){
        this.setState({ fileTypeFilters });
    }

    handleOpenToggle(value){
        if (this.timeout){
            clearTimeout(this.timeout);
            delete this.timeout;
        }
        this.setState(function({ open }){
            const nextState = {};
            if (typeof value === 'string' && open === value){
                nextState.open = false;
            } else {
                nextState.open = value;
            }
            if (nextState.open){
                nextState.reallyOpen = nextState.open;
            }
            return nextState;
        }, ()=>{
            const { open, reallyOpen } = this.state;
            setTimeout(ReactTooltip.rebuild, 100);
            if (!open && reallyOpen){
                this.timeout = setTimeout(()=>{
                    this.setState({ 'reallyOpen' : false });
                }, 400);
            }
        });
    }

    renderOverlay(){
        return (
            <Popover title="Configure Visible Columns" id="toggle-visible-columns" className="toggle-visible-columns-selector">
                <CustomColumnSelector {..._.pick(this.props, 'hiddenColumns', 'addHiddenColumn', 'removeHiddenColumn', 'columnDefinitions')} />
            </Popover>
        );
    }

    renderPanel(){
        const { selectedFiles } = this.props;
        const { open, reallyOpen, fileTypeFilters } = this.state;
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
                            {..._.pick(this.props, 'selectedFilesUniqueCount', 'includeFileSets', 'includeProcessedFiles')}
                            selectedFiles={selectedFiles} closeButtonClickHandler={this.handleClose}
                            currentFileTypeFilters={fileTypeFilters} setFileTypeFilters={this.setFileTypeFilters} />
                    </div>
                </Collapse>
            );
        }
        return null;
    }

    /**
     * @todo
     * Perhaps split up into (functional?) components similarly as RightButtonsSection.
     * Move logic into render method (?).
     */
    leftSection(){
        const { showSelectedFileCount, selectedFiles, context, currentAction, showTotalResults } = this.props;
        const { fileTypeFilters, open } = this.state;
        const filteredSelectedFiles = SelectedFilesControls.filterSelectedFilesByFileTypeFilters(selectedFiles, fileTypeFilters);

        // Case if on BrowseView, where we have selectedFiles, but not on SearchView
        // TODO: Modularize/split?
        if (showSelectedFileCount && selectedFiles){
            return (
                <ChartDataController.Provider id="selected_files_section">
                    <SelectedFilesControls
                        {..._.pick(this.props, 'href', 'selectedFiles', 'selectFile', 'unselectFile', 'selectedFilesUniqueCount', 'resetSelectedFiles',
                            'includeFileSets', 'includeProcessedFiles')}
                        subSelectedFiles={filteredSelectedFiles} onFilterFilesByClick={this.handleOpenFileTypeFiltersPanel}
                        currentFileTypeFilters={fileTypeFilters} setFileTypeFilters={this.setFileTypeFilters} currentOpenPanel={open} />
                </ChartDataController.Provider>
            );
        }


        // FOR NOW, we'll stick 'add' button here. -- IF NO SELECTED FILES CONTROLS
        let addButton = null;
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
        let total = null;
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

    render(){
        const { open } = this.state;
        return (
            <div className="above-results-table-row">
                <div className="clearfix">
                    { this.leftSection() }
                    <RightButtonsSection {..._.pick(this.props, 'isFullscreen', 'windowWidth', 'toggleFullScreen')} open={open} onColumnsBtnClick={this.handleOpenColumnsSelectionPanel} />
                </div>
                { this.renderPanel() }
            </div>
        );
    }
}

class RightButtonsSection extends React.PureComponent {

    constructor(props){
        super(props);
        this.handleLayoutToggle = _.throttle(this.handleLayoutToggle.bind(this), 350);
    }

    handleLayoutToggle(){
        const { windowWidth, isFullscreen, toggleFullScreen } = this.props;
        if (!SearchResultTable.isDesktopClientside(windowWidth)) return null;
        if (typeof toggleFullScreen !== 'function'){
            console.error('No toggleFullscreen function passed in.');
            return null;
        }
        setTimeout(toggleFullScreen, 0, !isFullscreen);
    }

    render(){
        const { open, isFullscreen, onColumnsBtnClick } = this.props;
        return (
            <div className="pull-right right-buttons">
                <Button key="toggle-visible-columns" data-tip="Configure visible columns" data-event-off="click"
                    active={open === 'customColumns'} onClick={onColumnsBtnClick}>
                    <i className="icon icon-fw icon-table" />
                    <i className="icon icon-fw icon-angle-down ml-03"/>
                </Button>
                <Button bsStyle="info" key="toggle-expand-layout" className={"expand-layout-button" + (!isFullscreen ? '' : ' expanded')}
                    onClick={this.handleLayoutToggle} data-tip={(!isFullscreen ? 'Expand' : 'Collapse') + " table width"}>
                    <i className={"icon icon-fw icon-" + (!isFullscreen ? 'expand' : 'compress')}></i>
                </Button>
            </div>
        );
    }
}

