'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import moment from 'moment';
import { MenuItem, Modal, DropdownButton, ButtonToolbar, ButtonGroup, Table, Checkbox, Button, Panel, Collapse, Popover, OverlayTrigger } from 'react-bootstrap';
import { isServerSide, Filters, expFxn, navigate, object, layout, Schemas, DateUtility, ajax } from './../../util';
import { windowHref } from './../../globals';
import * as vizUtil from './../../viz/utilities';
import { SearchResultTable } from './SearchResultTable';
import { CustomColumnSelector } from './CustomColumnController';
import { ChartDataController } from './../../viz/chart-data-controller';




export function wrapInAboveTablePanel(inner, title, className, closeButtonClickHandler){
    var closeButton = null;
    if (typeof closeButtonClickHandler === 'function'){
        closeButton = (
            <a className="close-button" onClick={closeButtonClickHandler}>
                <i className="icon icon-fw icon-angle-up"/>
            </a>
        );
    }
    return (
        <div className={"search-result-config-panel" + (className ? ' ' + className : '')}>
            <div className="inner">
                <h5 className="panel-title">{ title }{ closeButton }</h5>
                { inner }
            </div>
        </div>
    );
}


class SelectedFilesOverview extends React.Component {

    render(){
        var selectedFilesCount = _.keys(this.props.selectedFiles).length;
        
        return (
            <div className="pull-left box">
                <span className="text-500">{ selectedFilesCount }</span> / { this.props.totalFilesCount } files selected.
            </div>
        );
    }
}


class SelectedFilesDownloadButton extends React.Component {

    static encodePlainText(text){
        return 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    }

    static generateListOfURIsFromFiles(files, hostPrefix = ''){
        return _.pluck(files, 'href').map(function(downloadPath){ return hostPrefix + downloadPath; });
    }

    constructor(props){
        super(props);
        this.handleClick = _.throttle(this.handleClick.bind(this), 1000);
        this.renderModal = this.renderModal.bind(this);
        this.state = {
            'modalOpen' : false,
            'urls' : null
        };
    }

    getAccessionTripleObjects(){
        return _.map(
            _.keys(this.props.subSelectedFiles || this.props.selectedFiles),
            function(accessionTripleString){
                var accessions = accessionTripleString.split('~');
                return {
                    'accession' : accessions[0],
                    'experiments_in_set.accession' : accessions[1],
                    'experiments_in_set.files.accession' : accessions[2]
                };
            }
        );
    }

    handleClick(e){
        var urlParts = url.parse(windowHref(this.props.href));
        var urlsString = SelectedFilesDownloadButton.generateListOfURIsFromFiles(
            _.pluck(_.sortBy(_.pairs(this.props.subSelectedFiles || this.props.selectedFiles), function(pair){
                var accessions = pair[0].split('~');
            }), 1),
            urlParts.protocol + '//' + urlParts.host
        ).join('\n');
        this.setState({ 'modalOpen' : true, 'urls' : urlsString });
    }

    renderModal(countSelectedFiles){
        if (!this.state.modalOpen) return null;
        var textAreaStyle = {
            'minWidth' : '100%',
            'minHeight' : 400,
            'fontFamily' : 'monospace'
        };
        var meta_download_filename = 'metadata_' + DateUtility.display(moment().utc(), 'date-time-file', '-', false) + '.tsv';
        return (
            <Modal show={true} onHide={()=>{ this.setState({ 'modalOpen' : false }); }}>
                <Modal.Header closeButton>
                    <Modal.Title>Download { countSelectedFiles } Files</Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    <p>Please press the "Download" button below to save the metadata TSV file containing download URLs and other information for the selected files to your hard-drive.</p>

                    <p>Once you have saved the metadata TSV, you will be able to download the files on any machine or server with the following cURL command:</p>

                    <pre>cut -f 1 <b>{ meta_download_filename }</b> | tail -n +2 | xargs -n 1 curl -O -L</pre>

                    <p><small><strong>N.B.:</strong> Files which do not have a status of "released" cannot be downloaded via cURL and must be downloaded directly through the website.</small></p>

                    <form method="POST" action="/metadata/type=ExperimentSet&sort=accession/metadata.tsv">
                        <input type="hidden" name="accession_triples" value={JSON.stringify(this.getAccessionTripleObjects())} />
                        <input type="hidden" name="download_file_name" value={JSON.stringify(meta_download_filename)} />
                        <Button type="submit" name="Download" bsStyle="primary" data-tip="Details for each individual file in the 'files.txt' download list below.">
                            <i className="icon icon-fw icon-file-text"/>&nbsp; Download metadata for files
                        </Button>
                        {' '}
                        
                    </form>

                </Modal.Body>
            </Modal>
        );
    }

    render(){
        var countSelectedFiles = _.keys(this.props.selectedFiles).length;
        var disabled = countSelectedFiles === 0;
        var countSubSelectedFiles = _.keys(this.props.subSelectedFiles).length;
        if (countSubSelectedFiles && countSubSelectedFiles !== countSelectedFiles){
            countSelectedFiles = countSubSelectedFiles;
        }

        return (
            <Button key="download" onClick={this.handleClick} disabled={disabled} bsStyle={disabled ? "secondary" : "primary"}>
                <i className="icon icon-download icon-fw"/> Download { countSelectedFiles }<span className="text-400"> Selected Files</span>
                { this.renderModal(countSelectedFiles) }
            </Button>
        );
    }
}

class SelectAllFilesButton extends React.Component {

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    }

    constructor(props){
        super(props);
        this.handleSelect = this.handleSelect.bind(this);
        this.state = {
            'selecting' : false
        };
    }

    isAllSelected(){
        if (!this.props.totalFilesCount) return false;
        if (this.props.totalFilesCount === _.keys(this.props.selectedFiles).length){
            return true;
        }
        return false;
    }

    handleSelect(isAllSelected = false){
        if (typeof this.props.selectFile !== 'function'){
            throw new Error("No 'selectFiles' function prop passed to SelectedFilesController.");
        }

        var allFiles = this.props.allFiles.slice(0);
        // Some processed files may not have a 'from_experiment' property (redundant check temp), so we put in a dummy one to be able to generate a unique selector.
        allFiles = _.map(allFiles, function(file){
            if (typeof file.from_experiment === 'undefined'){
                return _.extend({}, file, {
                    'from_experiment' : {
                        'accession' : "NONE",
                        'from_experiment_set' : file.from_experiment_set
                    }
                });
            }
            return file;
        });

        this.setState({ 'selecting' : true }, () => vizUtil.requestAnimationFrame(()=>{
            if (!isAllSelected){
                this.props.selectFile(_.zip(expFxn.filesToAccessionTriples(allFiles, true), allFiles));
            } else {
                this.props.unselectFile(expFxn.filesToAccessionTriples(allFiles, true));
            }
            
            this.setState({ 'selecting' : false });
        }));
    }

    render(){
        var isAllSelected = this.isAllSelected();
        var buttonContent = (
            this.state.selecting ? <i className="icon icon-fw icon-spin icon-circle-o-notch"/> :
            <span><i className={"icon icon-fw icon-" + (isAllSelected ? 'square-o' : 'check-square-o')}/> <span className="text-400">{ isAllSelected ? 'Deselect' : 'Select' }</span> <span className="text-600">All</span></span>
        );
        return (
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <Button bsStyle="secondary" onClick={this.handleSelect.bind(this, isAllSelected)}>
                        { buttonContent }
                    </Button>
                </ButtonGroup>
            </div>
        );
    }
}

class SelectedFilesFilterByContent extends React.Component {

    /**
     * @param {Object} format_buckets - File Type Details (keys) + lists of files (values)
     * @param {string} [button_text_prefix=''] - Title to pre-pend to buttons.
     * @param {function} clickHandler - Function to handle button click. Accepts fileTypeDetail as first param before MouseEvt.
     * @returns {JSX.Element[]} List of JSX Button elements.
     */
    static renderFileFormatButtonsFromBuckets(format_buckets, button_text_prefix = '', clickHandler, renderer, fileTypeFilters){
        return _.sortBy(_.pairs(format_buckets), function(p){ return -p[1].length; }).map(function(pairs){
            var fileTypeDetail = pairs[0],
                files = pairs[1],
                title;

            if (typeof fileTypeDetail === 'undefined' || fileTypeDetail === 'other' || fileTypeDetail === 'undefined'){
                title = "Other";
            } else {
                title = Schemas.Term.toName('files.file_type_detailed', fileTypeDetail);
            }
            return renderer(fileTypeDetail, title, clickHandler, files, button_text_prefix, fileTypeFilters);
        });
    }

    static filesToFileTypeBuckets(files){
        return _.groupBy(
            _.pairs(files).map(function(f){
                f[1].selection_id = f[0];
                return f[1];
            }),
            'file_type_detailed'
        );
    }

    static renderBucketButton(fileType, title, clickHandler, files, button_text_prefix = '', fileTypeFilters){
        return (
            <Button
                key={'button-to-select-files-for' + fileType} {...SelectedFilesFilterByContent.fileFormatButtonProps}
                onClick={clickHandler ? clickHandler.bind(clickHandler, fileType) : null}
            >
                {button_text_prefix}{ title } files <small>({ files.length })</small>
            </Button>
        );
    }

    static renderBucketCheckbox(fileType, title, clickHandler, files, button_text_prefix, fileTypeFilters){
        var selected = Array.isArray(fileTypeFilters) && fileTypeFilters.indexOf(fileType) > -1;
        return (
            <Checkbox checked={selected} onChange={clickHandler ? clickHandler.bind(clickHandler, fileType) : null}>
                { button_text_prefix }{ title } <sub>({ files.length })</sub>
            </Checkbox>
        );
    }

    static propTypes = {
        selectedFiles : PropTypes.object.isRequired
    }

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    }

    constructor(props){
        super(props);
        this.onClick = this.onClick.bind(this);
    }

    renderFileFormatButtonsSelected(){
        if (!this.props.selectedFiles) return null;
        return SelectedFilesFilterByContent.renderFileFormatButtonsFromBuckets(
            SelectedFilesFilterByContent.filesToFileTypeBuckets(this.props.selectedFiles),
            '',
            this.onClick,
            SelectedFilesFilterByContent.renderBucketCheckbox,
            this.props.currentFileTypeFilters
        );
    }

    onClick(filterString, evt){
        var fileTypeFilters = this.props.currentFileTypeFilters.slice(0);
        var indexOfNewFilter = fileTypeFilters.indexOf(filterString);
        if (indexOfNewFilter < 0){
            fileTypeFilters.push(filterString);
        } else {
            fileTypeFilters = fileTypeFilters.slice(0, indexOfNewFilter).concat(fileTypeFilters.slice(indexOfNewFilter + 1));
        }
        this.props.setFileTypeFilters(fileTypeFilters);
    }

    

    render(){
        return wrapInAboveTablePanel(
            <div className="row">
            {
                _.map(this.renderFileFormatButtonsSelected(), function(jsxButton, i){
                    return <div className="col-sm-6 col-lg-3 file-type-checkbox">{ jsxButton }</div>;
                })
            }
            </div>,
            <span><i className="icon icon-fw icon-filter"/> Filter Selection by File Type</span>,
            'file-type-selector-panel',
            this.props.closeButtonClickHandler
        );
    }

}

class SelectedFilesFilterByButton extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'filerByPanelOpen' : false
        };
    }

    render(){
        var isDisabled = !this.props.selectedFiles || _.keys(this.props.selectedFiles).length === 0;

        var currentFiltersLength = this.props.currentFileTypeFilters.length;

        return (
            <Button key="filter-selected-files-by" bsStyle="secondary" disabled={isDisabled} onClick={this.props.onFilterFilesByClick} active={this.props.currentOpenPanel === 'filterFilesBy'}>
                <i className="icon icon-filter icon-fw" style={{ opacity : currentFiltersLength > 0 ? 1 : 0.5 }}/> { currentFiltersLength > 0 ? <span className="text-500">{ currentFiltersLength } </span> : 'All ' }<span className="text-400">File Type{ currentFiltersLength === 1 ? '' : 's' }</span>&nbsp;&nbsp;<i className="icon icon-angle-down icon-fw"/>
            </Button>
        );
    }
}

class SelectedFilesControls extends React.Component {

    static filterSelectedFilesByFileTypeFilters(selectedFiles, fileTypeFilters){
        if (Array.isArray(fileTypeFilters) && fileTypeFilters.length === 0) return selectedFiles;
        return _.object(
            _.filter(
                _.pairs(selectedFiles),
                function(p, i){
                    if (fileTypeFilters.indexOf(p[1].file_type_detailed) > -1) return true;
                    return false;
                }
            )
        );
    }    

    render(){
        //var exps = this.props.filteredExperiments || this.props.experiments;
        var exp_sets = this.props.filtered_experiment_sets || this.props.experiment_sets;
        var totalFilesCount = exp_sets ? _.reduce(exp_sets, (m,v) => expFxn.fileCountFromExperimentSet(v, this.props.includeProcessedFiles, this.props.includeFileSets) + m, 0) : 0;
        var allFiles = [];
        if (exp_sets){
            allFiles = _.reduce(exp_sets, (m,v) => m.concat(expFxn.allFilesFromExperimentSet(v, this.props.includeProcessedFiles)), []);
        }

        // TODO:
        // var subSelectedFiles = SelectedFilesControls.filterSelectedFilesByFileTypeFilters(this.props.selectedFiles, this.state.fileTypeFilters);

        return (
            <div>
                <SelectAllFilesButton
                    allFiles={allFiles}
                    totalFilesCount={totalFilesCount}
                    selectedFiles={this.props.selectedFiles}
                    selectFile={this.props.selectFile}
                    unselectFile={this.props.unselectFile}
                    resetSelectedFiles={this.props.resetSelectedFiles}
                />

                <div className="pull-left box selection-buttons">
                    <ButtonGroup>
                        <SelectedFilesFilterByButton
                            files={allFiles}
                            setFileTypeFilters={this.props.setFileTypeFilters}
                            currentFileTypeFilters={this.props.currentFileTypeFilters}
                            totalFilesCount={totalFilesCount}
                            selectedFiles={this.props.selectedFiles}
                            selectFile={this.props.selectFile}
                            unselectFile={this.props.unselectFile}
                            resetSelectedFiles={this.props.resetSelectedFiles}
                            onFilterFilesByClick={this.props.onFilterFilesByClick}
                            currentOpenPanel={this.props.currentOpenPanel}
                        />
                        <SelectedFilesDownloadButton {...this.props} totalFilesCount={totalFilesCount} />
                    </ButtonGroup>
                </div>
            </div>
        );
    }
}

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
                <Collapse in={!!(open)} transitionAppear>
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
                <Collapse in={!!(open)} transitionAppear>
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
                <ChartDataController.Provider>
                    <SelectedFilesControls
                        selectedFiles={this.props.selectedFiles}
                        subSelectedFiles={selectedFiles}
                        selectFile={this.props.selectFile}
                        unselectFile={this.props.unselectFile}
                        onFilterFilesByClick={this.handleOpenToggle.bind(this, 'filterFilesBy')}
                        currentFileTypeFilters={this.state.fileTypeFilters}
                        setFileTypeFilters={this.setFileTypeFilters}
                        currentOpenPanel={this.state.open}
                        includeFileSets={this.props.includeFileSets}
                        includeProcessedFiles={this.props.includeProcessedFiles}
                    />
                </ChartDataController.Provider>
            );
        }

        
        // FOR NOW, we'll stick 'add' button here. -- IF NO SELECTED FILES CONTROLS
        var addButton = null;
        var context = this.props.context;
        if (context && Array.isArray(context.actions)){
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