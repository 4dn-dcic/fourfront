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
        var context = this.props.context;
        var { produced_in_pub, publications_of_set, lab, award, submitted_by } = context;
        return (
            <div className="row info-area">
                <div className="col-sm-12">
                    <div className="row">

                        { produced_in_pub || (Array.isArray(publications_of_set) && publications_of_set.length > 0) ?
                            <div className="col-sm-12 col-md-12 col-sm-float-right">
                                <Publications context={context} />
                                <hr className="mt-1 mb-2"/>
                            </div>
                        : null }

                        <LabsSection context={context}/>

                        { award && typeof award !== 'string' ?
                            <div className="col-sm-12 col-md-12 col-sm-float-right">
                                { FormattedInfoBlock.Award(award) }
                            </div>
                        : null }

                        { submitted_by && typeof submitted_by !== 'string' ?
                            <div className="col-sm-12 col-md-12 col-sm-float-right">
                                { FormattedInfoBlock.User(submitted_by) }
                            </div>
                        : null }

                    </div>

                </div>
                <div className="col-sm-12">
                    <ItemFooterRow context={context} schemas={this.props.schemas} />
                </div>
            </div>
        );
    }

}

class LabsSection extends React.Component {
    render(){
        var context = this.props.context;
        var primary_lab_exists = context.lab && typeof context.lab !== 'string';
        var contributing_labs_exist = (Array.isArray(context.contributing_labs) && context.contributing_labs.length > 0);
        if (!primary_lab_exists && !contributing_labs_exist) return null;
        return (
            <div className="col-sm-12 col-md-12 col-sm-float-right">
                { primary_lab_exists ? FormattedInfoBlock.Lab(context.lab) : null }
                { contributing_labs_exist ? <WrappedCollapsibleList items={context.contributing_labs} singularTitle="Contributing Lab" itemClassName="publication" iconClass='user-plus' /> : null }
                { primary_lab_exists && contributing_labs_exist ? <hr className="mt-1 mb-2"/> : null }
            </div>
        );
    }
}
