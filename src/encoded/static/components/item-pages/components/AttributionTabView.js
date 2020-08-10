'use strict';

import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemFooterRow, ExternalReferenceLink } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/ItemFooterRow';
import { StackedBlockTable, StackedBlock, StackedBlockList, StackedBlockName, StackedBlockNameLabel } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/StackedBlockTable';
import { FormattedInfoBlock, WrappedCollapsibleList } from './FormattedInfoBlock';
import { Publications } from './Publications';
import { FileEntryBlock } from '../../browse/components/FileEntryBlock';
import { expFxn, Schemas } from './../../util';
import { experimentsFromExperimentSet } from '../../util/experiments-transforms';



// TODO memoized component
export function generateAddressString(lab) {
    const { city, state, postal_code, country } = lab;
    const address = [];
    if (city) { address.push(city); }
    if (state || postal_code) { address.push(((state || '') + ' ' + (postal_code || '')).trim()); }
    if (country) { address.push(country); }

    return address.join(', ');
}

/**
 * Generate a list element for a contact person.
 * We base64-encode emails for security against scrapers;
 * instead of providing a mailto: link, we make the email
 * visible only when email icon is hovered over.
 *
 * @param {Object} contactPerson - Faux Item representation of User.
 * @param {string} contactPerson.display_title - Name of User
 * @param {string} contactPerson.contact_email - Base64-encoded email of User.
 * @param {number} [idx] - Index of person in correspondence list.
 * @returns {JSX.Element} A `li` JSX element.
 */
export const ContactPersonListItem = React.memo(function ContactPersonListItem({ contactPerson }){
    const { contact_email = null, display_title = "Unknown Person" } = contactPerson;
    const decodedEmail = (typeof atob === 'function' && contact_email && atob(contact_email)) || null;
    const decodedEmailParts = decodedEmail && decodedEmail.split('@');
    const onClick = (decodedEmail && function(e){
        if (typeof window.location.assign !== 'function') return false;
        window.location.assign('mailto:' + decodedEmail);
        return false;
    }) || null;
    const dataTip = (decodedEmailParts && (
        '<span class="text-300">Click to send e-mail message to</span><br/>' +
        '<div class="text-center">' +
            '<span class="text-500">' +
                decodedEmailParts[0] +
            '</span> <span class="text-400 small">(at)</span> <span class="text-500">' +
                decodedEmailParts[1] +
            '</span>' +
        '</div>'
    )) || null;

    return (
        <li className="contact-person">
            <div className="inline-block clickable" data-html data-tip={dataTip} onClick={onClick}>
                <i className="icon icon-fw icon-envelope far" />
                &nbsp;&nbsp;
                { display_title }
            </div>
        </li>
    );
});

/**
 * External references table to display all external_references of
 * experiment set/experiment.
 *
 * If context['@type'] is ExperimentSet, collects
 * 1. direct external_references of the experiment set
 * 2. processed_files' external_references of the experiment set
 * then iterates through experiments_in_set and collects each experiment's
 * 3. direct external_references
 * 4. raw and processed files' external_references.
 *
 * If context['@type'] is Experiment, collects
 * 1. direct external_references of the experiment
 * 2. raw and processed files' external_references of the experiment.
 */
const ExternalReferencesStackedTable = React.memo(function ExternalReferencesStackedTable({ context, width }) {
    if (context['@type'].indexOf('ExperimentSet') === -1 && context['@type'].indexOf('Experiment') === -1) {
        throw new Error('Only types of Experiment Set and Experiment are supported');
    }

    const {
        accession, experiments_in_set = [], replicate_exps = [],
    } = context;

    //files iteratee function
    const getCombinedTriplesFromFileFunc = function (files, experiment) {
        const result = [];
        if (files && files.length > 0) {
            _.each(files, function (file) {
                if (file.external_references && file.external_references.length > 0) {
                    result.push({ experiment: experiment, file: file, externalRefs: file.external_references });
                }
            });
        }
        return result;
    };
    //rendering functions
    const renderFileColFunc = function (file, field, detailIndex, fileEntryBlockProps) {
        const { file_type_detailed } = file;
        const fileAtId = object.atIdFromObject(file);
        if (!!fileAtId && fileAtId === '-') {
            return (<span className="title-of-file mono-text name-title" >&nbsp;</span>);
        }

        let fileTitleString;
        if (file.accession) {
            fileTitleString = file.accession;
        }
        if (!fileTitleString && fileAtId) {
            var idParts = _.filter(fileAtId.split('/'));
            if (idParts[1].slice(0, 5) === '4DNFI') {
                fileTitleString = idParts[1];
            }
        }
        if (!fileTitleString) {
            fileTitleString = file.uuid || fileAtId || 'N/A';
        }
        return (
            <React.Fragment>
                <div>{Schemas.Term.toName("file_type_detailed", file_type_detailed, true)}</div>
                <a className="title-of-file mono-text name-title" href={fileAtId}>
                    {fileTitleString}
                </a>
            </React.Fragment>);
    };
    const renderExtRefColFunc = function (file, field, detailIndex, fileEntryBlockProps) {
        if (!file.external_references || !Array.isArray(file.external_references) || file.external_references.length === 0) {
            return <span className="mono-text">-</span>;
        }
        const getExtRefLink = function (externalRef, file) {
            if (externalRef && typeof externalRef.ref === 'string') {
                const innerText = (file.accession !== '-') ? externalRef.ref : (<span className="font-weight-bold">{externalRef.ref}</span>);
                return <ExternalReferenceLink uri={externalRef.uri || null}>{innerText}</ExternalReferenceLink>;
            } else {
                return { externalRef };
            }
        };

        const { external_references } = file;
        const [externalRef] = external_references;
        return (
            external_references.length > 1 ? (
                <ul>
                    {_.map(external_references, function (externalRef, i) {
                        return <li>{getExtRefLink(externalRef, file)}</li>;
                    })}
                </ul>) : (<React.Fragment>{getExtRefLink(externalRef, file)}</React.Fragment>)
        );
    };

    const columnHeaders = [
        { columnClass: 'experiment', title: 'Experiment', initialWidth: 200, className: 'text-left' },
        { columnClass: 'file', title: 'File', initialWidth: 200, render: renderFileColFunc },
        { columnClass: 'file-detail', title: 'External References', initialWidth: 200, render: renderExtRefColFunc },
    ];

    // combined object for experiment - file - external references fields: {experiment, file, externalRefs}
    let combinedTriples = [];
    let experiments = null;

    if (context['@type'].indexOf('ExperimentSet') > -1) {
        //add experiment set's refs
        if (context.external_references && context.external_references.length > 0) {
            combinedTriples.push({ experiment: null, file: null, externalRefs: context.external_references });
        }
        //add experiment set's processed files' refs
        combinedTriples = combinedTriples.concat(getCombinedTriplesFromFileFunc(context.processed_files, null));
        //combine experiment sets w/ bio/tech replicate numbers
        experiments = expFxn.combineWithReplicateNumbers(replicate_exps, experiments_in_set);
        //add Experiment Set column
        columnHeaders.splice(0, 0 , { columnClass: 'experiment-set', title: 'Experiment Set', initialWidth: 200, className: 'text-left' });
    } else {
        experiments = [context];//Currently, we do not add the replicate numbers for type 'Experiment'
    }

    //itereate through the experiments
    _.each(experiments, function (exp) {
        //add experiment's refs
        if (exp.external_references && exp.external_references.length > 0) {
            combinedTriples.push({ experiment: exp, file: null, externalRefs: exp.external_references });
        }
        //add experiment's processed files' refs
        combinedTriples = combinedTriples.concat(getCombinedTriplesFromFileFunc(exp.processed_files, exp));
        //add experiment's raw files' refs
        combinedTriples = combinedTriples.concat(getCombinedTriplesFromFileFunc(exp.files, exp));
    });

    const combinedTriplesGroupByExp = _.groupBy(combinedTriples, function (item) { return (item.experiment && item.experiment.accession) || '-'; });

    const experimentBlocks = _.map(combinedTriplesGroupByExp, function (combinedTriples, idx) {
        const fileBlocks = _.map(combinedTriples, function (combinedTriple) {
            const file = combinedTriple.file || { accession: '-', '@id': '-', external_references: combinedTriple.externalRefs };
            const renderFileLabel = !!combinedTriple.file;
            return (<FileEntryBlock file={file} label={renderFileLabel ? <StackedBlockNameLabel title="File" /> : null}></FileEntryBlock>);
        });
        const [combinedTriple] = combinedTriples;
        const { experiment } = combinedTriple;
        const experimentAtId = object.itemUtil.atId(experiment);
        const text = (experiment && experiment.display_title) || null;
        const replicateNumbersExists = experiment && experiment.bio_rep_no && experiment.tec_rep_no;
        return (
            <StackedBlock columnClass="experiment" hideNameOnHover={false} key={"exp-" + idx}
                label={experimentAtId ? <StackedBlockNameLabel title="Experiment" subtitle={null} accession={(experiment && experiment.accession) || null} subtitleVisible /> : null}>
                <StackedBlockName relativePosition={true} className={experimentAtId ? '' : 'name-empty'}>
                    {replicateNumbersExists ? <div>Bio Rep <b>{experiment.bio_rep_no}</b>, Tec Rep <b>{experiment.tec_rep_no}</b></div> : <div />}
                    {experimentAtId ? (<a href={experimentAtId} className="name-title">{text}</a>) : (text ? (<div className="name-title">{text}</div>) : null)}
                </StackedBlockName>
                <StackedBlockList title="Files" collapseLongLists={false} collapseLimit={50}>
                    {fileBlocks}
                </StackedBlockList>
            </StackedBlock>
        );
    });

    return (
        <div className="stacked-block-table-outer-container overflow-auto">
            <StackedBlockTable columnHeaders={columnHeaders} className="external-references-stacked-table" fadeIn width={width}>
                {context['@type'].indexOf('ExperimentSet') > -1 ? (
                    <StackedBlockList collapseLongLists={false} collapseLimit={50}>
                        <StackedBlock columnClass="experiment-set" hideNameOnHover={false} key="expset"
                            label={<StackedBlockNameLabel title="Experiment Set" subtitle={null} accession={accession} subtitleVisible />}>
                            <StackedBlockName relativePosition={true}>
                                <a href={context['@id']} className="name-title">{accession}</a>
                            </StackedBlockName>
                            <StackedBlockList title="Experiments" collapseLongLists={false} collapseLimit={50}>
                                {experimentBlocks}
                            </StackedBlockList>
                        </StackedBlock>
                    </StackedBlockList>
                ) : (<StackedBlockList collapseLongLists={false} collapseLimit={50}>{experimentBlocks}</StackedBlockList>)}
            </StackedBlockTable>
        </div>
    );
});

export const AttributionTabView = React.memo(function AttributionTabView({ context, schemas, width }){
    const {
        produced_in_pub = null,
        publications_of_set = [],
        lab,
        award = null,
        submitted_by,
        contributing_labs = []
    } = context;
    // `error` usually present when no view permission.
    const awardExists = (award && !award.error);
    const labsExist = (lab && !lab.error) || contributing_labs.length > 0;
    const submittedByExists = submitted_by && !submitted_by.error;

    return (
        <div className="info-area">

            { produced_in_pub || publications_of_set.length > 0 ?
                <div>
                    <Publications context={context} />
                    <hr className="mt-1 mb-2"/>
                </div>
                : null }

            <div className="row">

                { labsExist ?
                    <div className={"col-12 col-md-" + (submittedByExists ? '7' : '12')}>
                        <LabsSection context={context} />
                        { awardExists ? FormattedInfoBlock.Award(award) : null }
                    </div>
                    : null }

                { submittedByExists ?
                    <div className={"col-12 col-md-" + (labsExist ? '5' : '12')}>
                        { FormattedInfoBlock.User(submitted_by) }
                    </div>
                    : null }

            </div>

            {context['@type'].indexOf('ExperimentSet') > -1 || context['@type'].indexOf('Experiment') > -1 ?
                <React.Fragment>
                    <hr className="mb-08 mt-1" />
                    <div className="row">
                        <div className="col">
                            <h4 className="text-300">External References</h4>
                            <ExternalReferencesStackedTable {...{ context, width }} />
                        </div>
                    </div>
                </React.Fragment> : <ItemFooterRow {...{ context, schemas }} />}
        </div>
    );
});
AttributionTabView.getTabObject = function(props){
    const { context: { lab, award, submitted_by } } = props;
    return {
        tab : <span><i className="icon icon-users fas icon-fw"/> Attribution</span>,
        key : "attribution",
        disabled : (!lab && !award && !submitted_by),
        content : (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    <span>Attribution</span>
                </h3>
                <hr className="tab-section-title-horiz-divider mb-1"/>
                <AttributionTabView {...props} />
            </div>
        )
    };
};

class LabsSection extends React.PureComponent {

    static defaultProps = {
        'className' : null
    };

    constructor(props){
        super(props);
        this.contributingLabRenderFxn = this.contributingLabRenderFxn.bind(this);
        this.state = { 'mounted' : false };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true }, ReactTooltip.rebuild);
    }

    contributingLabRenderFxn(lab, idx, all){
        const { mounted } = this.state;
        const { '@id' : atId, correspondence = [] } = lab;
        let contactPersons = null;
        if (mounted) {
            contactPersons = correspondence.filter(function({ '@id': cpID, display_title, contact_email }){
                return cpID && display_title && contact_email;
            }).map(function(contactPerson, idx){
                return <ContactPersonListItem contactPerson={contactPerson} key={contactPerson['@id'] || idx} />;
            });
        }

        return (
            <div className={"lab" + (all.length === 1 && (!contactPersons || contactPersons.length === 0)  ? ' mt-1' : '')} key={atId || idx}>
                <h5>
                    <a className="text-500" href={atId}>{ lab.display_title }</a>
                </h5>
                { contactPersons && contactPersons.length > 0 ?
                    <ul className="mt-02">{ contactPersons }</ul>
                    : null }
            </div>
        );
    }

    render(){
        const {
            context : {
                lab: primaryLab = null,
                contributing_labs: contributingLabs = []
            },
            className = null
        } = this.props;
        const contribLabLen = contributingLabs.length;
        const { mounted } = this.state;

        if (!primaryLab && contribLabLen === 0) return null;

        return (
            <div className={className}>
                { primaryLab ? FormattedInfoBlock.Lab(primaryLab, true, true, mounted) : null }
                { contribLabLen > 0 ?
                    <WrappedCollapsibleList wrapperElement="div" items={contributingLabs} singularTitle="Contributing Lab"
                        iconClass="user-plus fas" itemRenderFxn={this.contributingLabRenderFxn} />
                    : null }
                { primaryLab && contribLabLen > 0 ? <hr className="mt-1 mb-2"/> : null }
            </div>
        );

    }
}
