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


export function generateContactPersonListItem(contactPerson, idx){
    return (
        <div className="contact-person row" key={contactPerson.contact_email || idx}>
            <div className="col-sm-4 text-ellipsis-container">
                &nbsp;&nbsp;&bull;&nbsp; { contactPerson.display_title }
            </div>
            <div className="col-sm-8 text-ellipsis-container">
                <i className="icon icon-fw icon-envelope-o"/>&nbsp;&nbsp;
                <a href={"mailto:" + contactPerson.contact_email}>{ contactPerson.contact_email }</a>
            </div>
        </div>
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
        var context = this.props.context,
            { produced_in_pub, publications_of_set, lab, award, submitted_by } = context,
            awardExists = award && typeof award !== 'string', // At one point we hard properties that if not embedded were returned as strings (@id) which could be AJAXed.
            submittedByExists = submitted_by && typeof submitted_by !== 'string' && !submitted_by.error;

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
    }

    contributingLabRenderFxn(lab, idx, all){
        var atId = object.itemUtil.atId(lab),
            contactPersons = Array.isArray(lab.correspondence) && _.filter(lab.correspondence, function(contact_person){
                return contact_person.display_title && object.itemUtil.atId(contact_person) && contact_person.contact_email;
            });

        return (
            <div className="lab" key={atId || idx}>
                <h5>
                    <a className="text-500" href={atId}>{ lab.display_title }</a>
                </h5>
                { contactPersons && contactPersons.length > 0 ?
                    <div className="mt-02">{ _.map(contactPersons, generateContactPersonListItem) }</div>
                : null }
            </div>
        );
    }

    render(){
        var { context, className } = this.props,
            primaryLab = (typeof context.lab !== 'string' && context.lab) || null,
            contributingLabs = ((Array.isArray(context.contributing_labs) && context.contributing_labs.length > 0) && context.contributing_labs) || null;

        if (!primaryLab && !contributingLabs) return null;
        return (
            <div className={className}>
                { primaryLab ? FormattedInfoBlock.Lab(primaryLab) : null }
                { contributingLabs ?
                    <WrappedCollapsibleList wrapperElement="div" items={contributingLabs} singularTitle="Contributing Lab"
                        iconClass='user-plus' itemRenderFxn={this.contributingLabRenderFxn} />
                : null }
                { primaryLab && contributingLabs ? <hr className="mt-1 mb-2"/> : null }
            </div>
        );

    }
}
