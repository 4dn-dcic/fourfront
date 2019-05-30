'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import moment from 'moment';
import { Modal, Button } from 'react-bootstrap';
import { Schemas, DateUtility, ajax, JWT, typedefs } from './../../../util';


// eslint-disable-next-line no-unused-vars
const { Item } = typedefs;


/**
 * BrowseView allows to filter down by filetype so we receive a selectedFiles and a subSelectedFiles.
 * This may likely change in future.
 */
export const BrowseViewSelectedFilesDownloadButton = React.memo(function BrowseViewSelectedFilesDownloadButton(props){
    const { selectedFiles, subSelectedFiles, selectedFilesUniqueCount } = props;
    const selectedFilesCountIncludingDuplicates = _.keys(selectedFiles).length;
    const subSelectedFilesCount = _.keys(subSelectedFiles).length;
    const disabled = selectedFilesUniqueCount === 0;
    const countDuplicates = selectedFilesCountIncludingDuplicates - selectedFilesUniqueCount;

    let countToShow = selectedFilesUniqueCount;
    let tooltip = (
        "Download metadata TSV sheet containing download URIs for " +
        selectedFilesUniqueCount + " files" +
        (countDuplicates ? " ( + " + countDuplicates + " duplicate" + (countDuplicates > 1 ? 's' : '') + ")." : '')
    );

    if (subSelectedFilesCount && subSelectedFilesCount !== selectedFilesCountIncludingDuplicates){
        countToShow = subSelectedFilesCount;
        tooltip = subSelectedFilesCount + " selected files filtered in out of " + selectedFilesCountIncludingDuplicates + " total" + (countDuplicates? " including " + countDuplicates + " duplicates)." : '');
    }

    return (
        <SelectedFilesDownloadButton countToShow={countToShow} selectedFiles={subSelectedFiles || selectedFiles} filenamePrefix="metadata_"
            id="browse-view-download-files-btn" data-tip={tooltip} disabled={disabled} className={disabled ? 'btn-secondary' : 'btn-primary'}>
            <i className="icon icon-download icon-fw shift-down-1 mr-07"/>
            <span className="hidden-xs hidden-sm">Download </span>
            <span className="count-to-download-integer">{ countToShow }</span>
            <span className="hidden-xs hidden-sm text-400"> Selected Files</span>
        </SelectedFilesDownloadButton>
    );
});



/**
 * Upon clicking the button, reveal a modal popup giving users more download instructions.
 */
export class SelectedFilesDownloadButton extends React.PureComponent {

    static totalSelectedFilesCount = memoize(function(selectedFiles){ return _.keys(selectedFiles || {}).length; });

    static propTypes = {
        'windowWidth' : PropTypes.number.isRequired,
        'id' : PropTypes.string,
        'selectedFiles' : PropTypes.object.isRequired,
        'filenamePrefix' : PropTypes.string.isRequired
    };

    static defaultProps = {
        'id' : null,
        'filenamePrefix' : "metadata_",
        'children' : "Download",
        'className' : 'btn-primary'
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
        const { selectedFiles, filenamePrefix, children, disabled, countToShow } = this.props;
        const { modalOpen } = this.state;
        const btnProps = _.omit(this.props, 'filenamePrefix', 'selectedFiles', 'windowWidth', 'children', 'countToShow', 'disabled');
        const isDisabled = disabled || SelectedFilesDownloadButton.totalSelectedFilesCount(selectedFiles) === 0;
        return (
            <React.Fragment>
                <Button {...btnProps} disabled={isDisabled} onClick={this.showModal}>
                    { children }
                </Button>
                { modalOpen ?
                    <SelectedFilesDownloadModal {...{ selectedFiles, filenamePrefix, countToShow }} onHide={this.hideModal}/>
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
        const { onHide, filenamePrefix, selectedFiles, countToShow } = this.props;
        const { disclaimerAccepted } = this.state;

        const suggestedFilename = filenamePrefix + DateUtility.display(moment().utc(), 'date-time-file', '-', false) + '.tsv';
        const userInfo = JWT.getUserInfo();
        const isSignedIn = !!(userInfo && userInfo.details && userInfo.details.email && userInfo.id_token);
        const profileHref = (isSignedIn && userInfo.user_actions && _.findWhere(userInfo.user_actions, { 'id' : 'profile' }).href) || '/me';
        const countSelectedFiles = countToShow || SelectedFilesDownloadButton.totalSelectedFilesCount(selectedFiles);
        const foundUnpublishedFiles = SelectedFilesDownloadModal.findUnpublishedFiles(selectedFiles);

        return (
            <Modal show className="batch-files-download-modal" onHide={onHide} bsSize="large">

                <Modal.Header closeButton>
                    <Modal.Title>
                        <span className="text-400">Download <span className="text-600">{ countSelectedFiles }</span> Files</span>
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
                        <Button bsStyle="info" onClick={this.handleAcceptDisclaimer}>
                            <i className="icon icon-fw icon-check mr-05"/>
                            I have read and understand the notes.
                        </Button>
                        :
                        <SelectedFilesDownloadStartButton {...{ selectedFiles, suggestedFilename }} />
                    }

                    <Button type="reset" onClick={onHide} className="ml-05">Cancel</Button>

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
            <Button type="submit" name="Download" bsStyle="primary" data-tip="Details for each individual selected file delivered via a TSV spreadsheet.">
                <i className="icon icon-fw icon-file-text"/>&nbsp; Download metadata for files
            </Button>
        </form>
    );
});
