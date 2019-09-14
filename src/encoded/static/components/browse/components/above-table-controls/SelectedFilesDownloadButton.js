'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import moment from 'moment';
import { Modal, Button } from 'react-bootstrap';

import { console, ajax, JWT, typedefs } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { display as dateTimeDisplay } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/LocalizedTime';
import { uniqueFileCount, fileCountWithDuplicates, uniqueFileCountNonMemoized } from './../SelectedFilesController';


// eslint-disable-next-line no-unused-vars
const { Item } = typedefs;


/**
 * BrowseView allows to filter down by filetype so we receive a selectedFiles and a subSelectedFiles.
 * This may likely change in future.
 */
export const BrowseViewSelectedFilesDownloadButton = React.memo(function BrowseViewSelectedFilesDownloadButton(props){
    const { selectedFiles, subSelectedFiles } = props;
    const selectedFilesUniqueCount = uniqueFileCount(selectedFiles);
    const selectedFilesCountIncludingDuplicates = fileCountWithDuplicates(selectedFiles);
    const subSelectedFilesCountUnique = subSelectedUniqueFileCount(subSelectedFiles);
    const subSelectedFilesCountIncludingDuplicates = subSelectedFileCountWithDuplicates(subSelectedFiles);
    const disabled = selectedFilesUniqueCount === 0;

    let countDuplicates = selectedFilesCountIncludingDuplicates - selectedFilesUniqueCount;
    let countToShow = selectedFilesUniqueCount; // Unique count would align to quick info bar count better.
    let tooltip = (
        "Download metadata TSV sheet containing download URIs for " +
        selectedFilesUniqueCount + " files" +
        (countDuplicates ? " ( + " + countDuplicates + " non-counted duplicate" + (countDuplicates > 1 ? 's' : '') + ")." : '')
    );

    if (subSelectedFilesCountUnique && subSelectedFilesCountUnique !== selectedFilesUniqueCount){
        countDuplicates = subSelectedFilesCountIncludingDuplicates - subSelectedFilesCountUnique;
        countToShow = subSelectedFilesCountUnique;
        tooltip = (
            subSelectedFilesCountUnique + " selected files filtered in out of " +
            selectedFilesUniqueCount + " total" +
            (countDuplicates? " ( + " + countDuplicates + " non-counted duplicate" + (countDuplicates > 1 ? 's' : '') + ")." : '')
        );
    }

    const cls = "btn-primary"; //disabled ? 'btn-outline-primary' : 'btn-primary';

    return (
        <SelectedFilesDownloadButton selectedFiles={subSelectedFiles || selectedFiles} filenamePrefix="metadata_"
            id="browse-view-download-files-btn" data-tip={tooltip} disabled={disabled} className={cls}>
            <i className="icon icon-download fas icon-fw mr-07"/>
            <span className="d-none d-lg-inline">Download </span>
            <span className="count-to-download-integer">{ countToShow }</span>
            <span className="d-none d-md-inline text-400"> Selected Files</span>
        </SelectedFilesDownloadButton>
    );
});

/**
 * Exact same functionality as `fileCountWithDuplicates`, however memoized for
 * usage with `subSelectedFiles` instead of `selectedFiles`.
 */
const subSelectedFileCountWithDuplicates = memoize(function(subSelectedFiles){
    return _.keys(subSelectedFiles).length;
});
const subSelectedUniqueFileCount = memoize(uniqueFileCountNonMemoized);




/**
 * Upon clicking the button, reveal a modal popup giving users more download instructions.
 */
export class SelectedFilesDownloadButton extends React.PureComponent {

    static propTypes = {
        'windowWidth' : PropTypes.number.isRequired,
        'id' : PropTypes.string,
        'selectedFiles' : PropTypes.object.isRequired,
        'filenamePrefix' : PropTypes.string.isRequired,
        'children' : PropTypes.node.isRequired,
        'disabled' : PropTypes.bool
    };

    static defaultProps = {
        'id' : null,
        'filenamePrefix' : "metadata_",
        'children' : "Download",
        'className' : "btn-primary"
    };

    constructor(props){
        super(props);
        _.bindAll(this, 'hideModal', 'showModal');
        this.state = { 'modalOpen' : false };
    }

    hideModal(){
        this.setState({ 'modalOpen' : false });
    }

    showModal(){
        this.setState({ 'modalOpen' : true });
    }

    render(){
        const { selectedFiles, filenamePrefix, children, disabled } = this.props;
        const { modalOpen } = this.state;
        const btnProps = _.omit(this.props, 'filenamePrefix', 'selectedFiles', 'windowWidth', 'children', 'disabled');
        // There might be multiple buttons in a view (e.g. ExperimentSetView)
        // so ideally will calculate `props.disabled` rather than use the memoized
        // fileCountWithDuplicates here
        const isDisabled = typeof disabled === 'boolean' ? disabled : fileCountWithDuplicates(selectedFiles) === 0;
        btnProps.className = "btn " + (modalOpen ? "active " : "") + btnProps.className;
        return (
            <React.Fragment>
                <button type="button" {...btnProps} disabled={isDisabled} onClick={this.showModal}>
                    { children }
                </button>
                { modalOpen ?
                    <SelectedFilesDownloadModal {...{ selectedFiles, filenamePrefix }} onHide={this.hideModal}/>
                    : null }
            </React.Fragment>
        );
    }
}



class SelectedFilesDownloadModal extends React.PureComponent {

    static findUnpublishedFiles = memoize(function(selectedFiles){
        return _.any(_.values(selectedFiles || {}), function(file){
            return !(
                (file.from_experiment && file.from_experiment.from_experiment_set && file.from_experiment.from_experiment_set.produced_in_pub)
                || (file.from_experiment_set && file.from_experiment_set.produced_in_pub)
            );
        });
    });

    constructor(props){
        super(props);
        this.handleAcceptDisclaimer = this.handleAcceptDisclaimer.bind(this);
        this.state = {
            'disclaimerAccepted' : false
        };
    }

    handleAcceptDisclaimer(){
        this.setState({ 'disclaimerAccepted' : true });
    }

    render(){
        const { onHide, filenamePrefix, selectedFiles } = this.props;
        const { disclaimerAccepted } = this.state;

        const suggestedFilename = filenamePrefix + dateTimeDisplay(moment().utc(), 'date-time-file', '-', false) + '.tsv';
        const userInfo = JWT.getUserInfo();
        const isSignedIn = !!(userInfo && userInfo.details && userInfo.details.email && userInfo.id_token);
        const profileHref = (isSignedIn && userInfo.user_actions && _.findWhere(userInfo.user_actions, { 'id' : 'profile' }).href) || '/me';
        const countSelectedFilesUnique = uniqueFileCount(selectedFiles);
        const foundUnpublishedFiles = SelectedFilesDownloadModal.findUnpublishedFiles(selectedFiles);

        return (
            <Modal show className="batch-files-download-modal" onHide={onHide} bsSize="large">

                <Modal.Header closeButton>
                    <Modal.Title>
                        <span className="text-400">Download <span className="text-600">{ countSelectedFilesUnique }</span> Files</span>
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>

                    <p>Please press the &quot;Download&quot; button below to save the metadata TSV file which contains download URLs and other information for the selected files.</p>
                    <p>Once you have saved the metadata TSV, you may download the files on any machine or server with the following cURL command:</p>
                    <ModalCodeSnippet filename={suggestedFilename} isSignedIn={isSignedIn} />

                    <div className="extra-notes-section">
                        <h4 className="mt-2 mb-07 text-500">Notes</h4>
                        <ul className="mb-25">
                            { isSignedIn ?
                                <li className="mb-05">
                                    To download files which are not yet released, please include an <b>access key</b> in your cURL command which you can configure in <a href={profileHref} target="_blank" rel="noopener noreferrer">your profile</a>.
                                    <br/>Use this access key in place of <em>{'<access_key_id>:<access_key_secret>'}</em>, above.
                                </li>
                                : null }
                            <li className="mb-05">
                                {isSignedIn ? 'If you do not provide an access key, files' : 'Files'} which do not have a status of &quot;released&quot; cannot be downloaded via cURL and must be downloaded directly through the website.
                            </li>
                            { foundUnpublishedFiles ?
                                <li>
                                    For unpublished data sets, we ask that you please contact the data generating lab to discuss possible coordinated publication.
                                    In your manuscript, please cite the 4DN White Paper (<a href="https://doi.org/10.1038/nature23884" target="_blank" rel="noopener noreferrer">doi:10.1038/nature23884</a>), and please acknowledge the 4DN lab which generated the data.
                                    Please direct any questions to the <a href="mailto:support@4dnucleome.org">Data Coordination and Integration Center</a>.
                                </li>
                                : null }
                        </ul>
                    </div>

                    { foundUnpublishedFiles && !disclaimerAccepted?
                        <button type="button" className="btn btn-info" onClick={this.handleAcceptDisclaimer}>
                            <i className="icon icon-fw icon-check mr-05 fas"/>
                            I have read and understand the notes.
                        </button>
                        :
                        <SelectedFilesDownloadStartButton {...{ selectedFiles, suggestedFilename }} />
                    }

                    <button type="reset" onClick={onHide} className="btn btn-outline-dark ml-05">Cancel</button>

                </Modal.Body>
            </Modal>
        );
    }
}

const ModalCodeSnippet = React.memo(function ModalCodeSnippet(props){
    const { filename, isSignedIn } = props;
    return (
        <pre className="mb-15">
            cut -f 1 <b>{ filename }</b> | tail -n +3 | grep -v ^# | xargs -n 1 curl -O -L
            { isSignedIn ? <code style={{ 'opacity' : 0.5 }}> --user <em>{'<access_key_id>:<access_key_secret>'}</em></code> : null }
        </pre>
    );
});


/**
 * Use this button to download the tsv file metadata.
 *
 * Renders out a literal form which may be  (gets caught by App.js and serialized to JSON),
 * with 'accession triples' ([ExpSetAccession, ExpAccession, FileAccession]) included in
 * the POSTed form fields which identify the individual files to download.
 */
const SelectedFilesDownloadStartButton = React.memo(function SelectedFilesDownloadStartButton(props){
    const { suggestedFilename, selectedFiles } = props;
    const accessionTripleArrays = _.map(_.keys(selectedFiles), function(accessionTripleString){
        const accessions = accessionTripleString.split('~');
        return [accessions[0] || 'NONE', accessions[1] || 'NONE', accessions[2] || 'NONE'];
    });

    return (
        <form method="POST" action="/metadata/?type=ExperimentSet&sort=accession" className="inline-block">
            <input type="hidden" name="accession_triples" value={JSON.stringify(accessionTripleArrays)} />
            <input type="hidden" name="download_file_name" value={JSON.stringify(suggestedFilename)} />
            <button type="submit" name="Download" className="btn btn-primary" data-tip="Details for each individual selected file delivered via a TSV spreadsheet.">
                <i className="icon icon-fw icon-file-alt fas"/>&nbsp; Download metadata for files
            </button>
        </form>
    );
});
