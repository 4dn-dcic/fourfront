'use strict';

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import memoize from 'memoize-one';
import Modal from 'react-bootstrap/esm/Modal';

import { console, ajax, JWT, typedefs, analytics, object, memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { display as dateTimeDisplay } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';
import { uniqueFileCount, fileCountWithDuplicates } from './../SelectedFilesController';
import { onLoginNavItemClick } from './../../../navigation/components/LoginNavItem';

// eslint-disable-next-line no-unused-vars
const { Item } = typedefs;


/**
 * BrowseView allows to filter down by filetype so we receive a selectedFiles and a subSelectedFiles.
 * This may likely change in future.
 */
export const BrowseViewSelectedFilesDownloadButton = React.memo(function BrowseViewSelectedFilesDownloadButton(props){
    const { selectedFiles, subSelectedFiles, context, session } = props;

    const [ selectedFilesUniqueCount, selectedFilesCountIncludingDuplicates ] = useMemo(function(){
        return [ uniqueFileCount(selectedFiles), fileCountWithDuplicates(selectedFiles) ];
    }, [selectedFiles]);

    const [ subSelectedFilesCountUnique, subSelectedFilesCountIncludingDuplicates ] = useMemo(function(){
        return [ uniqueFileCount(subSelectedFiles), fileCountWithDuplicates(subSelectedFiles) ];
    }, [subSelectedFiles]);

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
        <SelectedFilesDownloadButton {...{ context, session, disabled }} selectedFiles={subSelectedFiles || selectedFiles} filenamePrefix="metadata_"
            id="browse-view-download-files-btn" data-tip={tooltip} className={cls}>
            <i className="icon icon-download fas icon-fw mr-07"/>
            <span className="d-none d-lg-inline">Download </span>
            <span className="count-to-download-integer">{ countToShow }</span>
            <span className="d-none d-lg-inline text-400"> Selected Files</span>
        </SelectedFilesDownloadButton>
    );
});

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
        'disabled' : PropTypes.bool,
        'context' : PropTypes.object,
        'session' : PropTypes.bool,
        'analyticsAddFilesToCart' : PropTypes.bool
    };

    static defaultProps = {
        'id' : null,
        'filenamePrefix' : "metadata_",
        'children' : "Download",
        'className' : "btn-primary",
        'analyticsAddFilesToCart': false,
        'action': "/metadata/?type=ExperimentSet&sort=accession"
    };

    constructor(props){
        super(props);
        _.bindAll(this, 'hideModal', 'showModal');
        this.state = { 'modalOpen' : false };
        this.memoized = {
            uniqueFileCount: memoize(uniqueFileCount),
            fileCountWithDuplicates: memoize(fileCountWithDuplicates)
        };
    }

    hideModal(){
        this.setState({ 'modalOpen' : false });
    }

    showModal(){
        this.setState({ 'modalOpen' : true });
    }

    render(){
        const {
            selectedFiles, filenamePrefix, children, disabled,
            windowWidth, context, analyticsAddFilesToCart, action, session,
            ...btnProps
        } = this.props;
        const { modalOpen } = this.state;
        // There might be multiple buttons in a view (e.g. ExperimentSetView)
        // so ideally will calculate `props.disabled` rather than use the memoized
        // fileCountWithDuplicates here
        const fileCountWithDupes = this.memoized.fileCountWithDuplicates(selectedFiles);
        const fileCountUnique = this.memoized.uniqueFileCount(selectedFiles);
        const isDisabled = typeof disabled === 'boolean' ? disabled : fileCountWithDupes === 0;
        btnProps.className = "btn " + (modalOpen ? "active " : "") + btnProps.className;
        return (
            <React.Fragment>
                <button type="button" {...btnProps} disabled={isDisabled} onClick={this.showModal}>
                    { children }
                </button>
                { modalOpen ?
                    <SelectedFilesDownloadModal {...{ selectedFiles, filenamePrefix, context, fileCountUnique, fileCountWithDupes, analyticsAddFilesToCart, action, session }}
                        onHide={this.hideModal}/>
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

    componentDidMount(){
        const { analyticsAddFilesToCart = false, fileCountUnique, selectedFiles = {}, context } = this.props;
        if (!analyticsAddFilesToCart){
            return;
        }

        const fileList = _.keys(selectedFiles).map(function(accessionTripleString){
            return selectedFiles[accessionTripleString];
        });
        //analytics
        const extData = { item_list_name: analytics.hrefToListName(window && window.location.href) };
        const products = analytics.transformItemsToProducts(fileList, extData);
        analytics.event(
            "add_to_cart",
            "SelectedFilesDownloadModal",
            "Mounted",
            function() { console.info(`Will download ${productsLength} items in the cart.`); },
            {
                items: Array.isArray(products) ? products : null,
                list_name: extData.item_list_name,
                value: fileCountUnique || fileList.length || 0,
                filters: analytics.getStringifiedCurrentFilters((context && context.filters) || null)
            }
        );
    }

    handleAcceptDisclaimer(){
        const { context, fileCountUnique } = this.props;
        //analytics
        analytics.event("click_disclaimer", "SelectedFilesDownloadModal", "Accepted Disclaimer", null, {
            filters: analytics.getStringifiedCurrentFilters((context && context.filters) || null),
            value: fileCountUnique
        });

        this.setState({ 'disclaimerAccepted' : true });
    }

    render(){
        const { onHide, filenamePrefix, selectedFiles, fileCountUnique, fileCountWithDupes, context, session } = this.props;
        let { action } = this.props;
        const { disclaimerAccepted } = this.state;

        const suggestedFilename = filenamePrefix + dateTimeDisplay(new Date(), 'date-time-file', '-', false) + '.tsv';
        const userInfo = JWT.getUserInfo();
        const profileHref = (session && userInfo.user_actions && _.findWhere(userInfo.user_actions, { 'id' : 'profile' }).href) || '/me';
        const foundUnpublishedFiles = SelectedFilesDownloadModal.findUnpublishedFiles(selectedFiles);

        if ('search' === analytics.hrefToListName(window && window.location.href)) {
            action = "/metadata/?type=File&sort=accession";
            // workaround for file only search since type=File returns more than 10K results that prevent iterating all after ES7 upgrade
            const parts = _.clone(memoizedUrlParse(window.location.href));
            const modifiedQuery = _.omit(parts.query || {}, ['currentAction', 'type', 'sort', 'limit']);
            const modifiedSearch = queryString.stringify(modifiedQuery);
            action += '&' + modifiedSearch;
        }
        return (
            <Modal show className="batch-files-download-modal" onHide={onHide} bsSize="large">

                <Modal.Header closeButton>
                    <Modal.Title>
                        <span className="text-400">Download <span className="text-600">{ fileCountUnique }</span> Files</span>
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <div className="important-notes-section">
                        <h4 className="mb-07 text-500">Important</h4>
                        <ul>
                            <li className="mb-05">
                                <span className="text-danger">You must include an <b>access key</b> in your cURL command for bulk downloads.</span>
                            </li>
                            <li className="mb-05">You can configure the access key in {session ? <a href={profileHref} target="_blank" rel="noopener noreferrer">your profile</a> : 'your profile'}, then use it in place of <em>{'<access_key_id>:<access_key_secret>'}</em>, below.</li>
                            {!session ?
                                <li>{"If you don't already have an account, you can "}<a onClick={onLoginNavItemClick} href="#loginbtn">log in</a>{" with your Google or GitHub credentials."}</li>
                                : null}
                        </ul>
                    </div>
                    <p>Please press the &quot;Download&quot; button below to save the metadata TSV file which contains download URLs and other information for the selected files.</p>
                    <p>Once you have saved the metadata TSV, you may download the files on any machine or server with the following cURL command:</p>
                    <ModalCodeSnippet filename={suggestedFilename} session={session} />

                    { /*session || */foundUnpublishedFiles ?
                        <div className="extra-notes-section">
                            <h4 className="mt-2 mb-07 text-500">Notes</h4>
                            <ul className="mb-20">
                                {/* { session ?
                                    <li className="mb-05">
                                        To download files which are not yet released, please include an <b>access key</b> in your cURL command which you can configure in <a href={profileHref} target="_blank" rel="noopener noreferrer">your profile</a>.
                                        <br/>
                                        Use this access key in place of <em>{'<access_key_id>:<access_key_secret>'}</em>, above.
                                    </li>
                                    : null } */}
                                {/* <li className="mb-05">
                                {session ? 'If you do not provide an access key, files' : 'Files'} which do not have a status of &quot;released&quot; cannot be downloaded via cURL and must be downloaded directly through the website.
                                </li> */}
                                { foundUnpublishedFiles ?
                                    <li>
                                        For unpublished data sets, we ask that you please contact the data generating lab to discuss possible coordinated publication.
                                        In your manuscript, please cite the 4DN White Paper (<a href="https://doi.org/10.1038/nature23884" target="_blank" rel="noopener noreferrer">doi:10.1038/nature23884</a>), and please acknowledge the 4DN lab which generated the data.
                                        Please direct any questions to the <a href="mailto:support@4dnucleome.org">Data Coordination and Integration Center</a>.
                                    </li>
                                    : null }
                            </ul>
                        </div> : null }

                    { foundUnpublishedFiles && !disclaimerAccepted?
                        <button type="button" className="btn btn-info mr-1 mt-1 btn-block-xs-only" onClick={this.handleAcceptDisclaimer}>
                            <i className="icon icon-fw icon-check fas mr-1"/>
                            I have read and understand the notes.
                        </button>
                        :
                        <SelectedFilesDownloadStartButton {...{ selectedFiles, suggestedFilename, context, action }} />
                    }

                    <button type="reset" onClick={onHide} className="btn btn-outline-dark mt-1 btn-block-xs-only">Cancel</button>

                </Modal.Body>
            </Modal>
        );
    }
}

const ModalCodeSnippet = React.memo(function ModalCodeSnippet(props){
    const { filename, session } = props;
    const htmlValue = (
        <pre className="mb-15 d-md-inline curl-command">
            cut -f 1 <b>{filename}</b> | tail -n +3 | grep -v ^# | xargs -n 1 curl -O -L
            {session ? <code style={{ 'opacity': 0.5 }}> --user <em>{'<access_key_id>:<access_key_secret>'}</em></code> : null}
        </pre>
    );
    const plainValue = `cut -f 1 ${filename} | tail -n +3 | grep -v ^# | xargs -n 1 curl -O -L` + (session ? " --user <access_key_id>:<access_key_secret>" : '');
    return (
        <object.CopyWrapper value={plainValue} className="curl-command-wrapper" data-tip={'Click to copy'}
            wrapperElement="div" iconProps={{ }}>
            {htmlValue}
        </object.CopyWrapper>
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
    const { suggestedFilename, selectedFiles, context, action } = props;
    const { accessionTripleArrays, onClick } = useMemo(function(){
        const filenameAccessions = new Set();
        const accessionTripleArrays = _.map(_.keys(selectedFiles), function(accessionTripleString){
            const [ setAcc = "NONE", expAcc = "NONE", fileAcc ] = accessionTripleString.split('~');
            if (fileAcc){
                filenameAccessions.add(fileAcc);
            }
            return [setAcc, expAcc, fileAcc || "NONE"];
        });

        /**
         * We're going to consider download of metadata.tsv file to be akin to adding something to shopping cart.
         * Something they might download later...
         */
        function onClick(evt){
            setTimeout(function(){
                //analytics
                const fileList = _.keys(selectedFiles).map(function(accessionTripleString){
                    return selectedFiles[accessionTripleString];
                });
                const extData = {
                    item_list_name: analytics.hrefToListName(window && window.location.href)
                };
                const products = analytics.transformItemsToProducts(fileList, extData);
                analytics.event(
                    "begin_checkout",
                    "SelectedFilesDownloadModal",
                    "Download metadata.tsv Button Pressed",
                    function() { console.info(`Will download metadata.tsv having ${productsLength} items in the cart.`); },
                    {
                        items: Array.isArray(products) ? products : null,
                        list_name: extData.item_list_name,
                        value: filenameAccessions.size || 0,
                        filters: analytics.getStringifiedCurrentFilters((context && context.filters) || null)
                    }
                );
            }, 0);
        }

        return { accessionTripleArrays, onClick };
    }, [ selectedFiles, context ]);

    return (
        <form method="POST" action={action} className="d-inline-block d-block-xs-only">
            <input type="hidden" name="accession_triples" value={JSON.stringify(accessionTripleArrays)} />
            <input type="hidden" name="download_file_name" value={JSON.stringify(suggestedFilename)} />
            <button type="submit" name="Download" className="btn btn-primary mt-1 mr-1 btn-block-xs-only" onClick={onClick}
                data-tip="Details for each individual selected file delivered via a TSV spreadsheet.">
                <i className="icon icon-fw icon-file-alt fas mr-1"/>Download metadata for files
            </button>
        </form>
    );
});
