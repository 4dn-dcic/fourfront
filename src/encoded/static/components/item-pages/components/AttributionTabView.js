'use strict';

import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { FormattedInfoBlock, WrappedCollapsibleList } from './FormattedInfoBlock';
import { Publications } from './Publications';
import { ItemFooterRow } from './ItemFooterRow';
import { getTabStaticContent } from './TabbedView';
import { UserContentBodyList } from './../../static-pages/components';


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
 * @returns {JSX.Element} A `li` JSX element (optional - default is true).
 */
export const ContactPersonListItem = React.memo(function ContactPersonListItem({ contactPerson, wrapInListItem = true }){
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

    const clickableItem = (
        <div className="d-inline-block clickable" data-html data-tip={dataTip} onClick={onClick}>
            <i className="icon icon-fw icon-envelope far" />
            &nbsp;&nbsp;
            {display_title}
        </div>
    );

    return (wrapInListItem ? (<li className="contact-person">{clickableItem}</li>) : clickableItem );
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
    const staticContent = getTabStaticContent(context, 'tab:attribution');

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

            { staticContent.length > 0 ?
                <div className="mt-2">
                    <hr />
                    <UserContentBodyList contents={staticContent} />
                </div>
                : null}

            <ItemFooterRow {...{ context, schemas, width }} />
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
