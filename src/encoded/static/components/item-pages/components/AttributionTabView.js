'use strict';

import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemFooterRow } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/ItemFooterRow';
import { StackedBlockTable, StackedBlock, StackedBlockList, StackedBlockName, StackedBlockNameLabel } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/StackedBlockTable';
import { FormattedInfoBlock, WrappedCollapsibleList } from './FormattedInfoBlock';
import { Publications } from './Publications';
import { FileEntryBlock } from '../../browse/components/FileEntryBlock';



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
 * expSetId, expId, fileId, externalRefs
 * @param {Object} context
 */
function combineExternalReferencesWithTitle(context) {
    const externalRefs = [];
    //add experiment set
    if (context.external_references.length > 0) {
        externalRefs.push(_.reduce(
            context.external_references,
            function (memo, extRef, idx) {
                memo['extRef' + (idx + 1)] = extRef;
                return memo;
            },
            { 'expId': null, 'fileId': null })
        );
    }
    //experiment set's processed files
    if (context.processed_files && context.processed_files.length > 0) {
        _.each(context.processed_files, function (file) {
            if (file.external_references && file.external_references.length > 0) {
                externalRefs.push(_.reduce(
                    file.external_references,
                    function (memo, extRef, idx) {
                        memo['extRef' + (idx + 1)] = extRef;
                        return memo;
                    },
                    { 'expId': { 'title': 'Multiple Experiments', 'url': null }, 'fileId': { '@id': file['@id'],  'title': file.display_title, 'url': file['@id'] } })
                );
            }
        });
    }
    //add experiment
    _.each(context.experiments_in_set, function (exp) {
        if (exp.external_references.length > 0) {
            externalRefs.push(_.reduce(
                exp.external_references,
                function (memo, extRef, idx) {
                    memo['extRef' + (idx + 1)] = extRef;
                    return memo;
                },
                { 'expId': { 'title': exp.display_title, 'url': exp['@id'], accession: exp.accession }, 'fileId': null })
            );
        }
        //experiment's processed files
        if (exp.processed_files && exp.processed_files.length > 0) {
            _.each(exp.processed_files, function (file) {
                if (file.external_references.length > 0) {
                    externalRefs.push(_.reduce(
                        file.external_references,
                        function (memo, extRef, idx) {
                            memo['extRef' + (idx + 1)] = extRef;
                            return memo;
                        },
                        { 'expId': { 'title': exp.display_title, 'url': exp['@id'], accession: exp.accession }, 'fileId': { '@id': file['@id'], 'title': file.display_title, 'url': file['@id'] } })
                    );
                }
            });
        }
        //experiment's raw files
        if (exp.files && exp.files.length > 0) {
            _.each(exp.files, function (file) {
                if (file.external_references.length > 0) {
                    externalRefs.push(_.reduce(
                        file.external_references,
                        function (memo, extRef, idx) {
                            memo['extRef' + (idx + 1)] = extRef;
                            return memo;
                        },
                        { 'expId': { 'title': exp.display_title, 'url': exp['@id'], accession: exp.accession }, 'fileId': { '@id': file['@id'], 'title': file.display_title, 'url': file['@id'] } })
                    );
                }
            });
        }
    });
    console.log('xxx externalRefs:', externalRefs);

    const columnHeaders = [
        { columnClass: 'experiment-set', title: 'Experiment Set', initialWidth: 200, className: 'text-left', field: "expSetId.title" },
        { columnClass: 'experiment', title: 'Experiment', initialWidth: 200, className: 'text-left', field: "expId.title" },
        { columnClass: 'file', title: 'File', initialWidth: 200, field: "fileId.title" },
        { columnClass: 'file-detail', title: 'External Reference #1', initialWidth: 200, field: "extRef1.ref" },
        { columnClass: 'file-detail', title: 'External Reference #2', initialWidth: 200, field: "extRef2.ref" },
    ];

    const extRefsGroupByExp = _.groupBy(externalRefs, function (item) { return (item.expId && item.expId.title) || '-'; });

    const blocks = _.map(extRefsGroupByExp, function (item, idx) {
        const fileBlocks = _.map(item, function (ref) {
            const fileObj = _.extend(_.pick(ref, function (value, key, object) { return key.startsWith('extRef'); }), ref.fileId || { 'accession': '-', '@id': '-' });
            return (<FileEntryBlock file={fileObj}></FileEntryBlock>);
        });
        return (
            <StackedBlock columnClass="experiment" hideNameOnHover={false} key={"exp-" + idx}
                label={<StackedBlockNameLabel title="Experiment" subtitle={'zzz'} accession={(item[0].expId && item[0].expId.accession) || '-'} subtitleVisible />}>
                <StackedBlockName relativePosition={true}>
                    <a href={(item[0].expId && item[0].expId.url) || '#'} className="name-title">{(item[0].expId && item[0].expId.accession) || '-'}</a>
                </StackedBlockName>
                <StackedBlockList className="experiments" title="Files">
                    {fileBlocks}
                </StackedBlockList>
            </StackedBlock>
        );
    });

    return (
        <React.Fragment>
            <hr className="mb-08 mt-1" />
            <div className="row">
                <div className="col">
                    <h4 className="text-300">External References</h4>
                    <div className="stacked-block-table-outer-container overflow-auto">
                        <StackedBlockTable columnHeaders={columnHeaders} className="expset-external-references" fadeIn>
                            <StackedBlockList className="sets" collapseLongLists={false}>
                                <StackedBlock columnClass="experiment-set" hideNameOnHover={false} key="expset"
                                    label={<StackedBlockNameLabel title="Experiment Set" subtitle={'zzz'} accession={context.accession} subtitleVisible />}>
                                    <StackedBlockName relativePosition={true}>
                                        <a href={context['@id']} className="name-title">{context.accession}</a>
                                    </StackedBlockName>
                                    <StackedBlockList className="experiments" title="Experiments" collapseLongLists={false}>
                                        {blocks}
                                    </StackedBlockList>
                                </StackedBlock>
                            </StackedBlockList>
                        </StackedBlockTable>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}

export const AttributionTabView = React.memo(function AttributionTabView({ context, schemas }){
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

            <ItemFooterRow {...{ context, schemas }} />

            {combineExternalReferencesWithTitle(context)}
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
