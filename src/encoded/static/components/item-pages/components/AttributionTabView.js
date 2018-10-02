'use strict';

import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { FormattedInfoBlock, FormattedInfoWrapper, WrappedCollapsibleList } from './FormattedInfoBlock';
import { Publications } from './Publications';
import { object } from './../../util';
import { ItemFooterRow } from './ItemFooterRow';




export function generateAddressString(lab){
    return (
        (lab.city ? lab.city + ', ' : '') +
        (lab.state ? lab.state : '') +
        (lab.postal_code ? ' ' + lab.postal_code : '' ) +
        (lab.country ? ', ' + lab.country : '')
    );
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
export function generateContactPersonListItem(contactPerson, idx){
    var decodedEmail        = typeof atob === 'function' && contactPerson.contact_email && atob(contactPerson.contact_email),
        decodedEmailParts   = decodedEmail && decodedEmail.split('@'),
        onClick             = (decodedEmail && function(e){
            if (typeof window.location.assign !== 'function') return false;
            window.location.assign('mailto:' + decodedEmail);
            return false;
        }) || null,
        dataTip             = (decodedEmailParts && (
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
        <li className="contact-person" key={contactPerson.contact_email || idx}>
            <div className="inline-block clickable" data-html data-tip={dataTip} onClick={onClick}>
                <i className="icon icon-fw icon-envelope-o" />
                &nbsp;&nbsp;
                { contactPerson.display_title }
            </div>
        </li>
    );
}




export class AttributionTabView extends React.PureComponent {

    static getTabObject(context){
        return {
            tab : <span><i className="icon icon-users icon-fw"/> Attribution</span>,
            key : "attribution",
            disabled : (!context.lab && !context.award && !context.submitted_by),
            content : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Attribution</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider mb-1"/>
                    <AttributionTabView context={context} />
                </div>
            )
        };
    }

    render(){
        var { context } = this.props,
            { produced_in_pub, publications_of_set, lab, award, submitted_by } = context,
            awardExists         = award && typeof award !== 'string', // At one point we hard properties that if not embedded were returned as strings (@id) which could be AJAXed.
            submittedByExists   = submitted_by && typeof submitted_by !== 'string' && !submitted_by.error;

        return (
            <div className="info-area">

                { produced_in_pub || (Array.isArray(publications_of_set) && publications_of_set.length > 0) ?
                    <div>
                        <Publications context={context} />
                        <hr className="mt-1 mb-2"/>
                    </div>
                : null }

                <div className="row">

                    <div className={"col-xs-12 col-md-" + (submittedByExists ? '7' : '12')}>
                        <LabsSection context={context} />
                        { awardExists ? FormattedInfoBlock.Award(award) : null }
                    </div>

                    { submittedByExists ?
                        <div className="col-xs-12 col-md-5">
                            { FormattedInfoBlock.User(submitted_by) }
                        </div>
                    : null }

                    
                </div>

                <ItemFooterRow context={context} schemas={this.props.schemas} />
            </div>
        );
    }

}

class LabsSection extends React.PureComponent {

    static defaultProps = {
        'className' : null
    }

    constructor(props){
        super(props);
        this.contributingLabRenderFxn = this.contributingLabRenderFxn.bind(this);
        this.state = { 'mounted' : false };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true }, ReactTooltip.rebuild);
    }

    contributingLabRenderFxn(lab, idx, all){
        var isMounted       = this.state.mounted,
            atId            = object.itemUtil.atId(lab),
            contactPersons  = isMounted && Array.isArray(lab.correspondence) && _.filter(lab.correspondence, function(contact_person){
                return contact_person.display_title && object.itemUtil.atId(contact_person) && contact_person.contact_email;
            });

        return (
            <div className="lab" key={atId || idx}>
                <h5>
                    <a className="text-500" href={atId}>{ lab.display_title }</a>
                </h5>
                { contactPersons && contactPersons.length > 0 ?
                    <ul className="mt-02">{ _.map(contactPersons, generateContactPersonListItem) }</ul>
                : null }
            </div>
        );
    }

    render(){
        var { context, className } = this.props,
            isMounted           = this.state.mounted,
            primaryLab          = (typeof context.lab !== 'string' && context.lab) || null,
            contributingLabs    = ((Array.isArray(context.contributing_labs) && context.contributing_labs.length > 0) && context.contributing_labs) || null;

        if (!primaryLab && !contributingLabs) return null;
        return (
            <div className={className}>
                { primaryLab ? FormattedInfoBlock.Lab(primaryLab, true, true, isMounted) : null }
                { contributingLabs ?
                    <WrappedCollapsibleList wrapperElement="div" items={contributingLabs} singularTitle="Contributing Lab"
                        iconClass='user-plus' itemRenderFxn={this.contributingLabRenderFxn} />
                : null }
                { primaryLab && contributingLabs ? <hr className="mt-1 mb-2"/> : null }
            </div>
        );

    }
}
