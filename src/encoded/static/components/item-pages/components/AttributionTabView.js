'use strict';

import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { FormattedInfoBlock, FormattedInfoWrapper, WrappedCollapsibleList } from './FormattedInfoBlock';
import { Publications } from './Publications';
import { object } from './../../util';
import { ItemFooterRow } from './ItemFooterRow';



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

    render(){
        var { context, className } = this.props,
            primaryLab = (typeof context.lab !== 'string' && context.lab) || null,
            contributingLabs = ((Array.isArray(context.contributing_labs) && context.contributing_labs.length > 0) && context.contributing_labs) || null;

        if (!primaryLab && !contributingLabs) return null;
        return (
            <div className={className}>
                { primaryLab ? FormattedInfoBlock.Lab(primaryLab) : null }
                { contributingLabs ? <WrappedCollapsibleList items={contributingLabs} singularTitle="Contributing Lab" itemClassName="publication" iconClass='user-plus' /> : null }
                { primaryLab && contributingLabs ? <hr className="mt-1 mb-2"/> : null }
            </div>
        );

    }
}
