'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import moment from 'moment';
import { Modal, ButtonGroup, Checkbox, Button } from 'react-bootstrap';
import { expFxn, Schemas, DateUtility, ajax, JWT, typedefs } from './../../../util';
import { windowHref } from './../../../globals';
import * as vizUtil from './../../../viz/utilities';
import { wrapInAboveTablePanel } from './wrapInAboveTablePanel';

var { Item } = typedefs;


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

/**
* Upon clicking the button, reveal a modal popup giving users more download instructions.
*/
export class SelectedFilesDownloadButton extends React.PureComponent {

    /**
     * @type {Object}
     * @constant
     * @property {string} [gridState="lg"] - This should be passed in from parent `AboveTableControls` after mount. Default is set for server-side render + initial hydration.
     */
    static defaultProps = {
        'gridState' : 'lg'
    };

    /**
     * @constant
     * @ignore
     */
    static propTypes = {
        'gridState' : PropTypes.string.isRequired
    };

    constructor(props){
        super(props);
        this.handleClickRevealModal = _.throttle(this.handleClickRevealModal.bind(this), 1000);
        this.handleHideModal = this.handleHideModal.bind(this);
        this.handleClickDisclaimer = this.handleClickDisclaimer.bind(this);
        this.renderModal = this.renderModal.bind(this);
        this.findUnpublishedFiles = this.findUnpublishedFiles.bind(this);
        this.state = {
            'modalOpen' : false,
            'showDisclaimer' : false,
            'showDownloadMetadata' : false,
            'showDisclaimerButton' : false,
        };
    }

    /**
    * Hide the modal window and its subwindows.
    */
    handleHideModal(evt){
        evt.stopPropagation();
        this.setState({
            'modalOpen' : false,
            'showDisclaimer' : false,
            'showDownloadMetadata' : false,
            'showDisclaimerButton' : false,
        });
    }

    renderModalCodeSnippet(meta_download_filename, isSignedIn){
        return (
            <pre className="mb-15">
                cut -f 1 <b>{ meta_download_filename }</b> | tail -n +3 | grep -v ^# | xargs -n 1 curl -O -L
                { isSignedIn ? <code style={{ 'opacity' : 0.5 }}> --user <em>{'<access_key_id>:<access_key_secret>'}</em></code> : null }
            </pre>
        );
    }

    /**
    * The user wants to reveal the modal.
    * This function renders out a React-Bootstrap Modal component.
    *
    * @returns {JSX.Element} A modal instance.
    */
    handleClickRevealModal(){
        if (this.findUnpublishedFiles()) { // Determine if any of the targeted files need the disclaimer
            // If they need the disclaimer
            // Reveal the disclaimer widget
            // Hide the download metadata widget
            this.setState({
                'modalOpen': true,
                'showDisclaimer' : true,
                'showDisclaimerButton' : true,
                'showDownloadMetadata' : false,
            });
        }
        else {
            // Hide the disclaimer widget
            // Show the download metadata widget
            this.setState({
                'modalOpen': true,
                'showDisclaimer' : false,
                'showDisclaimerButton' : false,
                'showDownloadMetadata' : true,
            });
        }
    }

    /**
    * User clicks on the acknowledgement button.
    */
    handleClickDisclaimer(evt){
        evt.stopPropagation();
        // Update the state:
        // - Hide the Disclaimer button
        // - Show the Download Metadata widget
        this.setState({
            'modalOpen': true,
            'showDisclaimer' : true,
            'showDisclaimerButton' : false,
            'showDownloadMetadata' : true,
        });
    }

    /**
    * Renders the modal content.
    *
    * @param {array} selectedFiles - Files to display and download.
    */
    renderModal(selectedFiles){
        if (!this.state.modalOpen) return null;

        var suggestedFilename           = 'metadata_' + DateUtility.display(moment().utc(), 'date-time-file', '-', false) + '.tsv',
            userInfo                    = JWT.getUserInfo(),
            isSignedIn                  = !!(userInfo && userInfo.details && userInfo.details.email && userInfo.id_token),
            profileHref                 = (isSignedIn && userInfo.user_actions && _.findWhere(userInfo.user_actions, { 'id' : 'profile' }).href) || '/me',
            countSelectedFiles          = _.keys(selectedFiles).length,
            foundUnpublishedFiles       = this.findUnpublishedFiles();

        return (
            <Modal show className="batch-files-download-modal" onHide={this.handleHideModal} bsSize="large">
                <Modal.Header closeButton>
                    <Modal.Title><span className="text-400">Download <span className="text-600">{ countSelectedFiles }</span> Files</span></Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    <p>Please press the "Download" button below to save the metadata TSV file which contains download URLs and other information for the selected files.</p>

                    <p>Once you have saved the metadata TSV, you may download the files on any machine or server with the following cURL command:</p>

                    { this.renderModalCodeSnippet(suggestedFilename, isSignedIn) }

                    { this.state.showDisclaimer ? <SelectedFilesDownloadDisclaimer {...{ foundUnpublishedFiles, suggestedFilename, userInfo }} showDisclaimerButton={this.state.showDisclaimerButton} onClickHandler={this.handleClickDisclaimer}/> : null }

                    { this.state.showDownloadMetadata ? <SelectedFilesDownloadMetadataButton subSelectedFiles={this.props.subSelectedFiles} onClickHandler={this.handleHideModal} /> : null }
                </Modal.Body>
            </Modal>
        );
    }

    /**
    * Returns an object containing booleans which indicate if the user is trying to download unreleased or unpublished files.
    *
    * @returns {boolean} Whether found any files which lack a `produced_in_pub` in their parent ExperimentSet.
    */
    findUnpublishedFiles(){
        var { selectedFiles } = this.props;

        // Find out if at least 1 is unpublished.
        // The file could be part of an experiment set with a publication
        // Or the file could be part of an experiment which is in an experiment set with a publication
        return _.any(_.values(selectedFiles), function(file){
            var expSetHasPub = (
                (file.from_experiment && file.from_experiment.from_experiment_set && file.from_experiment.from_experiment_set.produced_in_pub)
                || (file.from_experiment_set && file.from_experiment_set.produced_in_pub)
            );
            return !expSetHasPub;
        });
    }

    render(){
        var { selectedFiles, selectedFilesUniqueCount, subSelectedFiles, gridState } = this.props,
            selectedFilesCountIncludingDuplicates   = _.keys(selectedFiles).length,
            subSelectedFilesCount                   = _.keys(subSelectedFiles).length,
            disabled                                = selectedFilesUniqueCount === 0,
            countDuplicates                         = selectedFilesCountIncludingDuplicates - selectedFilesUniqueCount,
            countToShow                             = selectedFilesUniqueCount,
            tip                                     = (
                "Download metadata TSV sheet containing download URIs for " +
                selectedFilesUniqueCount + " files" +
                (countDuplicates ? " ( + " + countDuplicates + " duplicate" + (countDuplicates > 1 ? 's' : '') + ")." : '')
            );

        if (subSelectedFilesCount && subSelectedFilesCount !== selectedFilesCountIncludingDuplicates){
            countToShow = subSelectedFilesCount;
            tip = subSelectedFilesCount + " selected files filtered in out of " + selectedFilesCountIncludingDuplicates + " total" + (countDuplicates? " including " + countDuplicates + " duplicates)." : '');
        }

        var innerBtnTitle  = (
            ['lg', 'md'].indexOf(gridState) > -1 ? (
                <span>Download { countToShow }<span className="text-400"> Selected Files</span></span>
            ) : (
                <span>{ countToShow }</span>
            )
        );

        return (
            <React.Fragment>
                <Button key="download" onClick={this.handleClickRevealModal} disabled={disabled} data-tip={tip} className={disabled ? "btn-secondary" : "btn-primary"}>
                    <i className="icon icon-download icon-fw shift-down-1"/> { innerBtnTitle }
                </Button>
                { this.renderModal(subSelectedFiles) }
            </React.Fragment>
        );
    }
}

/**
* A disclaimer will appear if the user wants to download unpublished or unreleased files.
*/
export class SelectedFilesDownloadDisclaimer extends React.PureComponent {

    /**
    * This function renders out a div containing information about
    * unreleased and unpublished files.
    *
    * @returns {JSX.Element} A modal instance.
    */
    render(){
        var { foundUnpublishedFiles, suggestedFilename, userInfo, showDisclaimerButton, onClickHandler } = this.props;

        // If all data sets have been released and published, return nothing.
        if (!foundUnpublishedFiles) return null;

        // Find out if the user is signed in, and what their profile href is.
        var isSignedIn = !!(
                userInfo
                && userInfo.details
                && userInfo.details.email
                && userInfo.id_token
            ),
            profileHref = (
                isSignedIn
                && userInfo.user_actions
                && _.findWhere(
                    userInfo.user_actions, { 'id' : 'profile' }).href
            )
            || '/me';

        // Generate the div containing warnings about unpublished and unreleased files.
        return(
            <div id="file_disclaimer_div">
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
                    { foundUnpublishedFiles ?
                        <li>
                            For unpublished data sets, we ask that you please contact the data generating lab to discuss possible coordinated publication.
                            In your manuscript, please cite the 4DN White Paper (<a href="https://doi.org/10.1038/nature23884" target="_blank">doi:10.1038/nature23884</a>), and please acknowledge the 4DN lab which generated the data.
                            Please direct any questions to the <a href="mailto:support@4dnucleome.org">Data Coordination and Integration Center</a>.
                        </li>
                    : null }
                </ul>
                {showDisclaimerButton ? <Button bsStyle="info" onClick={onClickHandler}><i className="icon icon-fw icon-check"></i>&nbsp;I have read and understand the notes.</Button> : null }
            </div>
        );
    }
}

/**
 * Use this button to download the tsv file metadata.
 * Also has a close modal button.
 */
export class SelectedFilesDownloadMetadataButton extends React.PureComponent {

    constructor(props){
        super(props);
        this.getAccessionTripleArrays = this.getAccessionTripleArrays.bind(this);
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

    /**
    * This function renders out a literal form which may be submitted, with 'accession triples'
    * ([ExpSetAccession, ExpAccession, FileAccession]) included in the POSTed form fields which
    * identify the individual files to download.
    *
    * @returns {JSX.Element} A modal instance.
    */
    render(){
        var { subSelectedFiles, onClickHandler } = this.props;
        var suggestedFilename = 'metadata_' + DateUtility.display(moment().utc(), 'date-time-file', '-', false) + '.tsv';

        // Default download button to get file metadata.
        return (
            <form method="POST" action="/metadata/?type=ExperimentSet&sort=accession">
                <input type="hidden" name="accession_triples" value={JSON.stringify(this.getAccessionTripleArrays())} />
                <input type="hidden" name="download_file_name" value={JSON.stringify(suggestedFilename)} />
                <Button type="submit" name="Download" bsStyle="primary" data-tip="Details for each individual selected file delivered via a TSV spreadsheet.">
                    <i className="icon icon-fw icon-file-text"/>&nbsp; Download metadata for files
                </Button>
                {' '}
                <Button type="reset" onClick={onClickHandler}>Close</Button>
            </form>
        );
    }
}

export class SelectAllFilesButton extends React.PureComponent {

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    }

    static fieldsToRequest = [
        'accession',
        'produced_in_pub.display_title',

        'processed_files.accession',
        'processed_files.file_type_detailed',
        'processed_files.uuid',

        'experiments_in_set.accession',

        'experiments_in_set.files.accession',
        'experiments_in_set.files.file_type_detailed',
        'experiments_in_set.files.paired_end',
        'experiments_in_set.files.uuid',
        'experiments_in_set.files.related_files.file.accession',

        'experiments_in_set.processed_files.accession',
        'experiments_in_set.processed_files.file_type_detailed',
        'experiments_in_set.processed_files.uuid'
    ];

    constructor(props){
        super(props);
        this.handleSelect = this.handleSelect.bind(this);
        this.state = {
            'selecting' : false
        };
    }

    isEnabled(){
        if (!this.props.totalFilesCount) return true;
        if (this.props.totalFilesCount > 8000) return false;
        return true;
    }

    isAllSelected(){
        var { totalFilesCount, selectedFiles, selectedFilesUniqueCount } = this.props;
        if (!totalFilesCount) return false;
        if (totalFilesCount === selectedFilesUniqueCount){
            return true;
        }
        return false;
    }

    handleSelect(evt){
        if (typeof this.props.selectFile !== 'function' || typeof this.props.resetSelectedFiles !== 'function'){
            throw new Error("No 'selectFiles' or 'resetSelectedFiles' function prop passed to SelectedFilesController.");
        }

        var isAllSelected = this.isAllSelected();

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
                <i className={"icon icon-fw shift-down-1 icon-" + (this.state.selecting ? 'circle-o-notch icon-spin' : (isAllSelected ? 'square-o' : 'check-square-o'))}/> <span className="text-400">{ isAllSelected ? 'Deselect' : 'Select' }</span> <span className="text-600">All</span>
            </span>
        );
    }

    render(){
        var isAllSelected = this.isAllSelected(),
            isEnabled = this.isEnabled(),
            selecting = this.state.selecting;

        return (
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <Button id="select-all-files-button" disabled={selecting || (!isAllSelected && !isEnabled)} className="btn-secondary" onClick={this.handleSelect} children={this.buttonContent(isAllSelected)} />
                </ButtonGroup>
            </div>
        );
    }
}

export class SelectedFilesFilterByContent extends React.PureComponent {

    /**
     * @todo Refactor/remove need to supply renderer function, maybe.
     *
     * @param {Object} format_buckets               File Type Details (keys) + lists of files (values)
     * @param {string} [button_text_prefix='']      Title to pre-pend to buttons.
     * @param {function} clickHandler               Function to handle button click. Accepts fileTypeDetail as first param before MouseEvt.
     * @param {function} renderer                   Function to render checkbox or button to return a JSX element. Should be one of `renderBucketButton` or `renderBucketCheckbox`.
     * @param {string[]|null} fileTypeFilters       List of currently filtered-in filetype, if any.
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

    /**
     * Converts `selectedFiles` structure into groups of `file_type_detailed` property.
     *
     * @param {Object.<Item>} files - Object of files, keyed by accession triple string.
     * @returns {Object.<Item>} Object of files, keyed by `file_type_detailed` property,
     */
    static filesToFileTypeBuckets(files){
        return _.groupBy(
            _.map(_.pairs(files), function([accessionTripleString, file]){
                return _.extend({ 'selection_id' : accessionTripleString }, file);
            }),
            'file_type_detailed'
        );
    }

    static renderBucketButton(fileType, title, clickHandler, files, button_text_prefix = '', fileTypeFilters){
        return (
            <Button
                key={'button-to-select-files-for' + fileType} {...SelectedFilesFilterByContent.fileFormatButtonProps}
                onClick={clickHandler ? clickHandler.bind(clickHandler, fileType) : null}>
                { button_text_prefix }{ title } files <small>({ files.length })</small>
            </Button>
        );
    }

    static renderBucketCheckbox(fileType, title, clickHandler, files, button_text_prefix, fileTypeFilters){
        var selected = Array.isArray(fileTypeFilters) && fileTypeFilters.indexOf(fileType) > -1,
            filesLength = files.length,
            tip = (
                (selected ? 'Remove ' : 'Include ')
                + filesLength + ' ' + title + ' files' +
                (selected ? ' from ' : ' to ') + 'selection.'
            );
        return (
            <div className="col-sm-6 col-lg-3 file-type-checkbox" key={fileType} data-tip={tip}>
                <Checkbox key={fileType} checked={selected}
                    onChange={clickHandler ? clickHandler.bind(clickHandler, fileType) : null}
                    className="text-ellipsis-container">
                    { button_text_prefix }{ title } <sub>({ filesLength })</sub>
                </Checkbox>
            </div>
        );
    }

    /**
     * @constant
     * @ignore
     */
    static propTypes = {
        selectedFiles : PropTypes.object.isRequired
    };

    /**
     * @constant
     * @ignore
     */
    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    };

    /**
     * @constant
     * @ignore
     */
    constructor(props){
        super(props);
        this.onClick = this.onClick.bind(this);
    }

    renderFileFormatButtonsSelected(){
        var { selectedFiles, currentFileTypeFilters } = this.props;
        if (!selectedFiles) return null;
        return SelectedFilesFilterByContent.renderFileFormatButtonsFromBuckets(
            SelectedFilesFilterByContent.filesToFileTypeBuckets(selectedFiles),
            '',
            this.onClick,
            SelectedFilesFilterByContent.renderBucketCheckbox,
            currentFileTypeFilters
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
            <div className="row" children={this.renderFileFormatButtonsSelected()}/>,
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
        var { selectedFiles, currentFileTypeFilters, onFilterFilesByClick, currentOpenPanel, gridState } = this.props,
            isDisabled              = !selectedFiles || _.keys(selectedFiles).length === 0,
            currentFiltersLength    = currentFileTypeFilters.length,
            largerSize              = ['lg', 'md'].indexOf(gridState) > -1;

        return (
            <Button id="selected-files-file-type-filter-button" className="btn-secondary" key="filter-selected-files-by" disabled={isDisabled} onClick={onFilterFilesByClick} active={currentOpenPanel === 'filterFilesBy'}>
                <i className="icon icon-filter icon-fw" style={{ opacity : currentFiltersLength > 0 ? 1 : 0.75 }}/>
                {
                    currentFiltersLength > 0 ? <span>{ currentFiltersLength } </span> : (
                        largerSize ? <span>All </span> : null
                    )
                }
                { largerSize ? <span className="text-400">File Type{ currentFiltersLength === 1 ? '' : 's' }</span> : null }
                <i className="icon icon-angle-down icon-fw"/>
            </Button>
        );
    }
}

export class SelectedFilesControls extends React.PureComponent {

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
        var barPlotData = (this.props.barplot_data_filtered || this.props.barplot_data_unfiltered),
            totalFilesCount = (barPlotData && barPlotData.total && barPlotData.total.files) || 0;

        // TODO:
        // var subSelectedFiles = SelectedFilesControls.filterSelectedFilesByFileTypeFilters(this.props.selectedFiles, this.state.fileTypeFilters);

        return (
            <div>
                <SelectAllFilesButton {..._.pick(this.props, 'href', 'selectedFilesUniqueCount', 'selectedFiles', 'selectFile',
                    'unselectFile', 'resetSelectedFiles', 'includeProcessedFiles', 'gridState')} totalFilesCount={totalFilesCount} />
                <div className="pull-left box selection-buttons">
                    <ButtonGroup>
                        <SelectedFilesFilterByButton {..._.pick(this.props, 'setFileTypeFilters', 'currentFileTypeFilters',
                            'selectedFiles', 'selectFile', 'unselectFile', 'resetSelectedFiles', 'onFilterFilesByClick',
                            'currentOpenPanel', 'gridState' )} totalFilesCount={totalFilesCount} />
                        <SelectedFilesDownloadButton {...this.props} totalFilesCount={totalFilesCount} />
                    </ButtonGroup>
                </div>
            </div>
        );
    }
}
