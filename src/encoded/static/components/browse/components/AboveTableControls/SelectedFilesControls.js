'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import moment from 'moment';
import { Modal, ButtonGroup, Checkbox, Button } from 'react-bootstrap';
import { expFxn, Schemas, DateUtility, ajax, JWT } from './../../../util';
import { windowHref } from './../../../globals';
import * as vizUtil from './../../../viz/utilities';
import { wrapInAboveTablePanel } from './wrapInAboveTablePanel';



export class SelectedFilesOverview extends React.Component {

    render(){
        var selectedFilesCount = _.keys(this.props.selectedFiles).length;

        return (
            <div className="pull-left box">
                <span className="text-500">{ selectedFilesCount }</span> / { this.props.totalFilesCount } files selected.
            </div>
        );
    }
}


export class SelectedFilesDownloadButton extends React.Component {

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

    getAccessionTripleArrays(){
        return _.map(
            _.keys(this.props.subSelectedFiles || this.props.selectedFiles),
            function(accessionTripleString){
                var accessions = accessionTripleString.split('~');
                return [accessions[0] || 'NONE', accessions[1] || 'NONE', accessions[2] || 'NONE'];
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

    renderModalCodeSnippet(meta_download_filename, isSignedIn){
        return (
            <pre className="mb-15">
                cut -f 1 <b>{ meta_download_filename }</b> | tail -n +3 | grep -v ^# | grep -v ^$ | xargs -n 1 curl -O -L
                { isSignedIn ? <code style={{ 'opacity' : 0.5 }}> --user <em>{'<access_key_id>:<access_key_secret>'}</em></code> : null }
            </pre>
        );
    }

    renderModal(countSelectedFiles){
        if (!this.state.modalOpen) return null;
        var textAreaStyle = {
            'minWidth' : '100%',
            'minHeight' : 400,
            'fontFamily' : 'monospace'
        };

        var meta_download_filename = 'metadata_' + DateUtility.display(moment().utc(), 'date-time-file', '-', false) + '.tsv';

        var userInfo = JWT.getUserInfo();
        var isSignedIn = !!(userInfo && userInfo.details && userInfo.details.email && userInfo.id_token);
        var profileHref = (isSignedIn && userInfo.user_actions && _.findWhere(userInfo.user_actions, { 'id' : 'profile' }).href) || '/me';

        return (
            <Modal show={true} className="batch-files-download-modal" onHide={()=>{ this.setState({ 'modalOpen' : false }); }} bsSize="large">
                <Modal.Header closeButton>
                    <Modal.Title><span className="text-400">Download <span className="text-600">{ countSelectedFiles }</span> Files</span></Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    <p>Please press the "Download" button below to save the metadata TSV file which contains download URLs and other information for the selected files.</p>

                    <p>Once you have saved the metadata TSV, you may download the files on any machine or server with the following cURL command:</p>

                    { this.renderModalCodeSnippet(meta_download_filename, isSignedIn) }

                    <h4 className="mt-2 mb-07 text-500">Notes</h4>
                    <ul className="mb-25">
                        { isSignedIn ?
                            <li className="mb-05">
                                To download files which are not yet released, please include an <b>access key</b> in your cURL command which you can configure in <a href={profileHref} target="_blank">your profile</a>.
                                <br/>Use this access key in place of <em>{'<access_key_id>:<access_key_secret>'}</em>, above.
                            </li>
                        : null }
                        <li className="mb-05">
                            {isSignedIn ? 'If you do not provide an access key, files' : 'Files'} which do not have a status of "released" cannot be downloaded via cURL and must be downloaded directly through the website.
                        </li>
                    </ul>

                    <form method="POST" action="/metadata/type=ExperimentSet&sort=accession/metadata.tsv">
                        <input type="hidden" name="accession_triples" value={JSON.stringify(this.getAccessionTripleArrays())} />
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

export class SelectAllFilesButton extends React.Component {

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    }

    static fieldsToRequest = [
        'experiments_in_set.files.accession',
        'experiments_in_set.files.file_type_detailed',
        'experiments_in_set.files.paired_end',
        'experiments_in_set.files.uuid',
        'experiments_in_set.files.related_files.file.accession',
        'experiments_in_set.processed_files.accession',
        'experiments_in_set.processed_files.file_type_detailed',
        'processed_files.accession',
        'processed_files.file_type_detailed',
        'accession',
        'experiments_in_set.accession'
    ];

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
        if (typeof this.props.selectFile !== 'function' || typeof this.props.resetSelectedFiles !== 'function'){
            throw new Error("No 'selectFiles' or 'resetSelectedFiles' function prop passed to SelectedFilesController.");
        }

        this.setState({ 'selecting' : true }, () => vizUtil.requestAnimationFrame(()=>{
            if (!isAllSelected){
                var currentHrefParts = url.parse(this.props.href, true);
                var currentHrefQuery = _.extend({}, currentHrefParts.query);
                currentHrefQuery.field = SelectAllFilesButton.fieldsToRequest;
                currentHrefQuery.limit = 'all';
                var reqHref = currentHrefParts.pathname + '?' + queryString.stringify(currentHrefQuery);
                ajax.load(reqHref, (resp)=>{
                    var allFiles = _.reduce(resp['@graph'] || [], (m,v) => m.concat(expFxn.allFilesFromExperimentSet(v, this.props.includeProcessedFiles)), []);
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
                    var filesToSelect = _.zip(expFxn.filesToAccessionTriples(allFiles, true), allFiles);
                    this.props.selectFile(filesToSelect);
                    this.setState({ 'selecting' : false });
                });
            } else {
                this.props.resetSelectedFiles();
                this.setState({ 'selecting' : false });
            }
        }));
    }

    buttonContent(isAllSelected){
        if (typeof isAllSelected === 'undefined') isAllSelected = this.isAllSelected();
        return (
            <span>
                <i className={"icon icon-fw icon-" + (this.state.selecting ? 'circle-o-notch icon-spin' : (isAllSelected ? 'square-o' : 'check-square-o'))}/> <span className="text-400">{ isAllSelected ? 'Deselect' : 'Select' }</span> <span className="text-600">All</span>
            </span>
        );
    }

    render(){
        var isAllSelected = this.isAllSelected();
        return (
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <Button id="select-all-files-button" disabled={this.state.selecting} bsStyle="secondary" onClick={this.handleSelect.bind(this, isAllSelected)} children={this.buttonContent(isAllSelected)} />
                </ButtonGroup>
            </div>
        );
    }
}

export class SelectedFilesFilterByContent extends React.Component {

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
            <Checkbox key={fileType} checked={selected} onChange={clickHandler ? clickHandler.bind(clickHandler, fileType) : null} className="text-ellipsis-container">
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
            <div className="row" children={_.map(this.renderFileFormatButtonsSelected(), function(jsxButton, i){
                return <div className="col-sm-6 col-lg-3 file-type-checkbox" key={jsxButton.key || i}>{ jsxButton }</div>;
            })}/>,
            <span><i className="icon icon-fw icon-filter"/> Filter Selection by File Type</span>,
            'file-type-selector-panel',
            this.props.closeButtonClickHandler
        );
    }

}

export class SelectedFilesFilterByButton extends React.Component {

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
            <Button id="selected-files-file-type-filter-button" key="filter-selected-files-by" bsStyle="secondary" disabled={isDisabled} onClick={this.props.onFilterFilesByClick} active={this.props.currentOpenPanel === 'filterFilesBy'}>
                <i className="icon icon-filter icon-fw" style={{ opacity : currentFiltersLength > 0 ? 1 : 0.5 }}/> { currentFiltersLength > 0 ? <span className="text-500">{ currentFiltersLength } </span> : 'All ' }<span className="text-400">File Type{ currentFiltersLength === 1 ? '' : 's' }</span>&nbsp;&nbsp;<i className="icon icon-angle-down icon-fw"/>
            </Button>
        );
    }
}

export class SelectedFilesControls extends React.Component {

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
        var barPlotData = (this.props.barplot_data_filtered || this.props.barplot_data_unfiltered);
        var totalFilesCount = (barPlotData && barPlotData.total && barPlotData.total.files) || 0;

        // TODO:
        // var subSelectedFiles = SelectedFilesControls.filterSelectedFilesByFileTypeFilters(this.props.selectedFiles, this.state.fileTypeFilters);

        return (
            <div>
                <SelectAllFilesButton
                    href={this.props.href}
                    totalFilesCount={totalFilesCount}
                    selectedFiles={this.props.selectedFiles}
                    selectFile={this.props.selectFile}
                    unselectFile={this.props.unselectFile}
                    resetSelectedFiles={this.props.resetSelectedFiles}
                    includeProcessedFiles={this.props.includeProcessedFiles}
                />

                <div className="pull-left box selection-buttons">
                    <ButtonGroup>
                        <SelectedFilesFilterByButton
                            //files={allFiles}
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
