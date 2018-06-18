'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { Button, Collapse, Popover, OverlayTrigger } from 'react-bootstrap';
import { isServerSide } from './../../../util';
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
        'showTotalResults' : false,
        'includeProcessedFiles' : true
    }

    constructor(props){
        super(props);
        this.componentWillMount = this.componentWillMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.handleWindowResize = _.debounce(this.handleWindowResize.bind(this), 300);
        this.handleOpenToggle = _.throttle(this.handleOpenToggle.bind(this), 350);
        this.handleLayoutToggle = _.throttle(this.handleLayoutToggle.bind(this), 350);
        this.renderPanel = this.renderPanel.bind(this);
        this.renderOverlay = this.renderOverlay.bind(this);
        this.rightButtons = this.rightButtons.bind(this);
        this.setFileTypeFilters = this.setFileTypeFilters.bind(this);
        this.state = {
            'open' : false,
            'reallyOpen' : false,
            'layout' : 'normal',
            'fileTypeFilters' : []
        };
    }

    componentWillMount(){
        if (!isServerSide()){
            window.addEventListener('resize', this.handleWindowResize);
        }
    }

    componentWillUnmount(){
        window.removeEventListener('resize', this.handleWindowResize);
    }

    componentWillReceiveProps(nextProps){
        var newState = {};

        // Remove from fileTypeFilters if no newly selected files don't have filtered-in fileType.

        var fileTypeBucketsNew = SelectedFilesFilterByContent.filesToFileTypeBuckets(nextProps.selectedFiles);
        var newTypes = _.keys(fileTypeBucketsNew);

        var typesToRemove = [];
        for (var i = 0; i < this.state.fileTypeFilters.length ; i++){
            if (newTypes.indexOf(this.state.fileTypeFilters[i]) === -1){
                typesToRemove.push(this.state.fileTypeFilters[i]);
            }
        }
        if (typesToRemove.length > 0){
            newState.fileTypeFilters = _.difference(this.state.fileTypeFilters, typesToRemove);
        }

        // Set open=false if currently is 'filterFilesBy' && no selected files.

        if (this.state.open === 'filterFilesBy' && _.keys(nextProps.selectedFiles).length === 0){
            newState.open = false;
        }

        this.setState(newState);
    }

    componentDidUpdate(prevProps, prevState){
        if (this.state.open || prevState.open !== this.state.open) ReactTooltip.rebuild();
        if (this.state.layout === 'wide' && prevState.layout !== 'wide') {
            this.setWideLayout();
        } else if (this.state.layout !== 'wide' && prevState.layout === 'wide'){
            this.unsetWideLayout();
        }
    }

    handleWindowResize(e){
        if (isServerSide() || !document || !document.body) return null;
        if (this.state.layout === 'wide'){
            if ((document.body.offsetWidth || window.innerWidth) < 1200) {
                this.setState({ 'layout' : 'normal' });
            } else {
                this.setWideLayout();
            }
        }
    }

    setWideLayout(){
        if (isServerSide() || !document || !document.getElementsByClassName || !document.body) return null;
        vizUtil.requestAnimationFrame(()=>{
            var browsePageContainer = document.getElementsByClassName('search-page-container')[0];
            var bodyWidth = document.body.offsetWidth || window.innerWidth;
            if (bodyWidth < 1200) {
                this.handleLayoutToggle(); // Cancel
                throw new Error('Not large enough window width to expand. Aborting.');
            }
            var extraWidth = bodyWidth - 1180;
            browsePageContainer.style.marginLeft = browsePageContainer.style.marginRight = -(extraWidth / 2) + 'px';
            this.lastBodyWidth = bodyWidth;
            setTimeout(this.props.parentForceUpdate, 100);
        });
    }

    unsetWideLayout(){
        if (isServerSide() || !document || !document.getElementsByClassName) return null;
        vizUtil.requestAnimationFrame(()=>{
            var browsePageContainer = document.getElementsByClassName('search-page-container')[0];
            browsePageContainer.style.marginLeft = browsePageContainer.style.marginRight = '';
            setTimeout(this.props.parentForceUpdate, 100);
        });
    }

    setFileTypeFilters(filters){
        this.setState({ 'fileTypeFilters' : filters });
    }

    handleOpenToggle(value){
        console.log('HANDLEOPENTOGGLE', value);
        if (this.timeout){
            clearTimeout(this.timeout);
            delete this.timeout;
        }
        if (typeof value === 'string' && this.state.open === value) value = false;
        var state = { 'open' : value };
        if (state.open){
            state.reallyOpen = state.open;
        } else {
            this.timeout = setTimeout(()=>{
                this.setState({ 'reallyOpen' : false });
            }, 400);
        }
        this.setState(state);
    }

    handleLayoutToggle(){
        if (!SearchResultTable.isDesktopClientside()) return null;
        var state = { };
        if (this.state.layout === 'normal'){
            state.layout = 'wide';
        } else {
            state.layout = 'normal';
        }
        this.setState(state);
    }

    filteredSelectedFiles(){
        return SelectedFilesControls.filterSelectedFilesByFileTypeFilters(this.props.selectedFiles, this.state.fileTypeFilters);
    }

    renderOverlay(){
        return (
            <Popover title="Configure Visible Columns" id="toggle-visible-columns" className="toggle-visible-columns-selector">
                <CustomColumnSelector
                    hiddenColumns={this.props.hiddenColumns}
                    addHiddenColumn={this.props.addHiddenColumn}
                    removeHiddenColumn={this.props.removeHiddenColumn}
                    columnDefinitions={this.props.columnDefinitions}
                />
            </Popover>
        );
    }

    renderPanel(selectedFiles){
        var { open, reallyOpen } = this.state;
        if (open === 'customColumns' || reallyOpen === 'customColumns') {
            return (
                <Collapse in={!!(open)} appear>
                    { wrapInAboveTablePanel(
                        <CustomColumnSelector
                            hiddenColumns={this.props.hiddenColumns}
                            addHiddenColumn={this.props.addHiddenColumn}
                            removeHiddenColumn={this.props.removeHiddenColumn}
                            columnDefinitions={this.props.columnDefinitions}
                        />,
                        <span><i className="icon icon-fw icon-gear"/> Configure Visible Columns</span>,
                        'visible-columns-selector-panel',
                        this.handleOpenToggle.bind(this, false)
                    ) }
                </Collapse>
            );
        } else if (open === 'filterFilesBy' || reallyOpen === 'filterFilesBy') {
            return (
                <Collapse in={!!(open)} appear>
                    <div>
                        <SelectedFilesFilterByContent
                            selectedFiles={this.props.selectedFiles}
                            subSelectedFiles={selectedFiles}
                            currentFileTypeFilters={this.state.fileTypeFilters}
                            setFileTypeFilters={this.setFileTypeFilters}
                            closeButtonClickHandler={this.handleOpenToggle.bind(this, false)}
                            includeFileSets={this.props.includeFileSets}
                            includeProcessedFiles={this.props.includeProcessedFiles}
                        />
                    </div>
                </Collapse>
            );
        }
        return null;
    }

    leftSection(selectedFiles){
        if (this.props.showSelectedFileCount && this.props.selectedFiles){
            return (
                <ChartDataController.Provider id="selected_files_section">
                    <SelectedFilesControls
                        {..._.pick(this.props, 'href', 'selectedFiles', 'selectFile', 'unselectFile', 'resetSelectedFiles', 'includeFileSets', 'includeProcessedFiles')}
                        subSelectedFiles={selectedFiles}
                        onFilterFilesByClick={this.handleOpenToggle.bind(this, 'filterFilesBy')}
                        currentFileTypeFilters={this.state.fileTypeFilters}
                        setFileTypeFilters={this.setFileTypeFilters}
                        currentOpenPanel={this.state.open}
                    />
                </ChartDataController.Provider>
            );
        }


        // FOR NOW, we'll stick 'add' button here. -- IF NO SELECTED FILES CONTROLS
        var addButton = null;
        var context = this.props.context;
        // don't show during submission search "selecting existing"
        if (context && Array.isArray(context.actions) && !this.props.submissionBase){
            var addAction = _.findWhere(context.actions, { 'name' : 'add' });
            if (addAction && typeof addAction.href === 'string'){ // TODO::: WE NEED TO CHANGE THIS HREF!! to /search/?type= format.
                addButton = (
                    <div className="pull-left box create-add-button" style={{'paddingRight' : 10}}>
                        <Button bsStyle="primary" href='#!add'>Create</Button>
                    </div>
                );
            }
        }

        var total = null;
        if (this.props.showTotalResults) {
            if (typeof this.props.showTotalResults === 'number') total = this.props.showTotalResults;
            if (this.props.context && this.props.context.total) total = this.props.context.total;
            total = (
                <div className="pull-left box results-count">
                    <span className="text-500">{ total }</span> Results
                </div>
            );
        }
        return [addButton, total];
    }

    rightButtons(){
        var { open, layout } = this.state;

        function expandLayoutButton(){
            return (
                <Button bsStyle="primary" key="toggle-expand-layout" className={"expand-layout-button" + (layout === 'normal' ? '' : ' expanded')} onClick={this.handleLayoutToggle} data-tip={(layout === 'normal' ? 'Expand' : 'Collapse') + " table width"}>
                    <i className={"icon icon-fw icon-" + (layout === 'normal' ? 'arrows-alt' : 'crop')}></i>
                </Button>
            );
        }

        function configureColumnsButton(){
            return (
                <Button key="toggle-visible-columns" data-tip="Configure visible columns" data-event-off="click" active={this.state.open === 'customColumns'} onClick={this.handleOpenToggle.bind(this, 'customColumns')}>
                    <i className="icon icon-gear icon-fw"/> Columns &nbsp;<i className="icon icon-fw icon-angle-down"/>
                </Button>
            );
        }


        return (
            <div className="pull-right right-buttons">
                { configureColumnsButton.call(this) }
                { expandLayoutButton.call(this) }
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

