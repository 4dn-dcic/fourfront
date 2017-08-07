
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

    /**
     * @deprecated
     * @returns {string} URL to metadata.csv
     */
    generateMetadataTSVPath(){
        return '/metadata/type=ExperimentSet&sort=accession&' + _.map(_.values(this.props.selectedFiles), function(fileObj){
            var fileSelectionDetails = ((fileObj && fileObj.fileSelectionDetails) || {});
            var fileSelectionDetailsKeys = _.keys(fileSelectionDetails);
            return _.map(fileSelectionDetailsKeys, function(k){
                return k + '=' + fileSelectionDetails[k];
            }).join('&');
        }).join('&') + '/metadata.tsv';
    }

    getAccessionTripleObjects(){
        return _.map(
            _.keys(this.props.selectedFiles),
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
            _.pluck(_.sortBy(_.pairs(this.props.selectedFiles), function(pair){
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
        var files_download_filename = 'files_' + DateUtility.display(moment().utc(), 'date-time-file', '-', false) + '.txt';
        return (
            <Modal show={true} onHide={()=>{ this.setState({ 'modalOpen' : false }); }}>
                <Modal.Header closeButton>
                    <Modal.Title>Download { countSelectedFiles } Files</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Please copy and paste the text below into a cURL command to download these files, or click
                    the "Download" button to save it as a file.</p>

                    <p>If saving as a file, it can be ran from any server, for example with the following cURL command:</p>
                    <pre>{ 'xargs -n 1 curl -O -L < files.txt' }</pre>
                    <form method="POST" action="/metadata/type=ExperimentSet&sort=accession/metadata.tsv">
                        <input type="hidden" name="accession_triples" value={JSON.stringify(this.getAccessionTripleObjects())} />
                        <Button type="submit" name="Download" bsStyle="info" data-tip="Details for each individual file in the 'files.txt' download list below.">
                            <i className="icon icon-fw icon-file-text"/>&nbsp; Download metadata for files
                        </Button>
                        {' '}
                        
                    </form>
                    <hr/>
                    <h5 className="text-500">File URIs</h5>
                    <div>
                        <textarea style={textAreaStyle} value={this.state.urls}/>
                        <Button href={SelectedFilesDownloadButton.encodePlainText(this.state.urls)} bsStyle="primary" onClick={(e)=>{ e.stopPropagation(); }} download={files_download_filename} target="_blank">
                            <i className="icon icon-fw icon-file-text"/>&nbsp; Save/download this list as 'files.txt'
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }

    render(){
        var countSelectedFiles = _.keys(this.props.selectedFiles).length;
        var disabled = countSelectedFiles === 0;
        return (
            <div className="pull-left box">
                <Button key="download" onClick={this.handleClick} disabled={disabled} bsStyle={disabled ? "primary" : "success"}>
                    <i className="icon icon-download icon-fw"/> Download { countSelectedFiles }<span className="text-400"> / { this.props.totalFilesCount } Selected Files</span>
                </Button>
                { this.renderModal(countSelectedFiles) }
            </div>
        );
    }
}

class SelectedFilesSelector extends React.Component {

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    };

    handleSelect(formatType){
        if (typeof this.props.selectFile !== 'function'){
            throw new Error("No 'selectFiles' function prop passed to SelectedFilesController.");
        }
        if (formatType === 'all'){
            //this.props.selectFile();
        }
    }

    render(){
        return (
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <Button key="download" bsStyle="primary">
                        <i className="icon icon-check-square-o icon-fw"/> <span className="text-400">Select</span> <span className="text-600">All</span>
                    </Button>
                </ButtonGroup>
            </div>
        );
    }
}

class SelectedFilesFilterByButton extends React.Component {

    static renderFileFormatButtonsFromBuckets(format_buckets, button_text_prefix = ''){
        return _.sortBy(_.pairs(format_buckets), function(p){ return -p[1].length; }).map(function(pairs){
            var fileTypeDetail = pairs[0],
                files = pairs[1],
                title;

            if (typeof fileTypeDetail === 'undefined' || fileTypeDetail === 'other' || fileTypeDetail === 'undefined'){
                title = "Other";
                console.log(fileTypeDetail, files);
            } else {
                title = Schemas.Term.toName('files.file_type_detailed', fileTypeDetail);
            }
            return (
                <div key={'button-to-select-files-for' + fileTypeDetail}>
                    <Button {...SelectedFilesSelector.fileFormatButtonProps}>{button_text_prefix}{ title } files <small>({ files.length })</small></Button>
                </div>
            );
        });
    }

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    }

    handleSelect(formatType){
        if (typeof this.props.selectFile !== 'function'){
            throw new Error("No 'selectFiles' function prop passed to SelectedFilesController.");
        }
        if (formatType === 'all'){
            //this.props.selectFile();
        }
    }

    renderFileFormatButtonsSelected(){
        if (!this.props.selectedFiles) return null;
        var format_buckets = _.groupBy(
            _.pairs(this.props.selectedFiles).map(function(f){
                f[1].selection_id = f[0];
                return f[1];
            }),
            'file_type_detailed'
        );
        return SelectedFilesFilterByButton.renderFileFormatButtonsFromBuckets(format_buckets);
    }

    renderFileFormatButtons(){
        if (!this.props.files) return null;
        var format_buckets = _.groupBy(this.props.files, 'file_type_detailed');
        return SelectedFilesFilterByButton.renderFileFormatButtonsFromBuckets(format_buckets, 'All ');
    }

    renderOverlay(){
        return (
            <Popover title="Filter Selection By..." id="select-files-type" className="file-format-selection-popover">
                {/* <div><Button {...SelectedFilesSelector.fileFormatButtonProps}>All files ({ this.props.totalFilesCount })</Button></div> */}
                { this.renderFileFormatButtonsSelected() }
            </Popover>
        );
    }

    render(){
        var isDisabled = !this.props.selectedFiles || _.keys(this.props.selectedFiles).length === 0;
        return (
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <OverlayTrigger trigger="click" rootClose overlay={this.renderOverlay()} placement="bottom">
                        <Button key="download2" bsStyle="primary" disabled={isDisabled}>
                            <i className="icon icon-filter icon-fw"/> Filter By&nbsp;&nbsp;<i className="icon icon-angle-down icon-fw"/>
                        </Button>
                    </OverlayTrigger>
                </ButtonGroup>
            </div>
        );
    }
}

class SelectedFilesControls extends React.Component {

    render(){
        var exps = this.props.filteredExperiments || this.props.experiments;
        var totalFilesCount = exps ? expFxn.fileCountFromExperiments(exps, this.props.includeFileSets) : 0;
        var allFiles = [];
        if (exps){
            allFiles =  expFxn.allFilesFromExperiments(exps, this.props.includeFileSets);
        }
        return (
            <div>
                <SelectedFilesSelector
                    files={allFiles}
                    totalFilesCount={totalFilesCount}
                    selectedFiles={this.props.selectedFiles}
                    selectFile={this.props.selectFile}
                    unselectFile={this.props.unselectFile}
                    resetSelectedFiles={this.props.resetSelectedFiles}
                />
                <SelectedFilesFilterByButton
                    files={allFiles}
                    totalFilesCount={totalFilesCount}
                    selectedFiles={this.props.selectedFiles}
                    selectFile={this.props.selectFile}
                    unselectFile={this.props.unselectFile}
                    resetSelectedFiles={this.props.resetSelectedFiles}
                />
                {' '}
                <SelectedFilesDownloadButton {...this.props} totalFilesCount={totalFilesCount} />
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
        'showTotalResults' : false
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
        this.rightButtons = this.rightButtons.bind(this);
        this.state = {
            'open' : false,
            'reallyOpen' : false,
            'layout' : 'normal'
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
            var browsePageContainer = document.getElementsByClassName('browse-page-container')[0];
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
            var browsePageContainer = document.getElementsByClassName('browse-page-container')[0];
            browsePageContainer.style.marginLeft = browsePageContainer.style.marginRight = '';
            setTimeout(this.props.parentForceUpdate, 100);
        });
    }

    handleOpenToggle(value){
        if (this.timeout){
            clearTimeout(this.timeout);
            delete this.timeout;
        }
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

    renderPanel(){
        var { open, reallyOpen } = this.state;
        if (open === 'customColumns' || reallyOpen === 'customColumns') {
            return (
                <Collapse in={!!(open)} transitionAppear>
                    <CustomColumnSelector
                        hiddenColumns={this.props.hiddenColumns}
                        addHiddenColumn={this.props.addHiddenColumn}
                        removeHiddenColumn={this.props.removeHiddenColumn}
                        columnDefinitions={this.props.columnDefinitions}
                        //columnDefinitions={CustomColumnSelector.buildColumnDefinitions(
                        //    browseTableConstantColumnDefinitions,
                        //    this.props.context.columns || {},
                        //    {}, //this.props.columnDefinitionOverrides,
                        //    this.props.constantHiddenColumns
                        //)}
                    />
                </Collapse>
            );
        }
        return null;
    }

    leftSection(){
        if (this.props.showSelectedFileCount && this.props.selectedFiles){
            return (
                <ChartDataController.Provider>
                    <SelectedFilesControls selectedFiles={this.props.selectedFiles} />
                </ChartDataController.Provider>
            );
        }
        if (this.props.showTotalResults) {
            var total;
            if (typeof this.props.showTotalResults === 'number') total = this.props.showTotalResults;
            if (this.props.context && this.props.context.total) total = this.props.context.total;
            if (!total) return null;
            return (
                <div className="pull-left box results-count">
                    <span className="text-500">{ total }</span> Results
                </div>
            );
        }
        return null;
    }

    rightButtons(){
        var { open, layout } = this.state;

        function expandLayoutButton(){
            return (
                <Button key="toggle-expand-layout" className={"expand-layout-button" + (layout === 'normal' ? '' : ' expanded')} onClick={this.handleLayoutToggle} data-tip={(layout === 'normal' ? 'Expand' : 'Collapse') + " table width"}>
                    <i className={"icon icon-fw icon-" + (layout === 'normal' ? 'arrows-alt' : 'crop')}></i>
                </Button>
            );
        }

        return open === false ? (
            <div className="pull-right right-buttons">
                <Button key="toggle-visible-columns" onClick={this.handleOpenToggle.bind(this, (!open && 'customColumns') || false)} data-tip="Configure visible columns" data-event-off="click">
                    <i className="icon icon-eye-slash icon-fw"/> Columns
                </Button>
                { expandLayoutButton.call(this) }
            </div>
        ) : (
            <div className="pull-right right-buttons" data-tip="">

                Close &nbsp;
                
                <Button key="toggle-visible-columns" onClick={this.handleOpenToggle.bind(this, false)}>
                    <i className="icon icon-angle-up icon-fw"></i>
                </Button>
                
            </div>
        );
    }


    render(){

        return (
            <div className="above-results-table-row">
                <div className="clearfix">
                    { this.leftSection() }
                    { this.rightButtons() }
                </div>
                { this.renderPanel() }
            </div>
        );
    }
}