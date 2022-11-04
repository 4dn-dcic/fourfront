'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { console, object, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

import { ExperimentSetsTableTabView } from './components/tables/ExperimentSetTables';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';


export default class LabView extends DefaultItemView {

    getTabViewContents(){
        const { context : { display_title } } = this.props;
        const initTabs = [];
        const width = this.getTabViewWidth();

        initTabs.push(LabViewOverview.getTabObject(this.props, width));

        const expSetTableProps = {
            ...this.props,
            width,
            'searchHref' : (
                "/browse/?type=ExperimentSet&lab.display_title=" + encodeURIComponent(display_title)
            )
        };

        initTabs.push(ExperimentSetsTableTabView.getTabObject(expSetTableProps));

        return initTabs.concat(_.filter(this.getCommonTabs(), function(tabObj){
            if (tabObj.key === 'attribution') return false;
            return true;
        }));
    }

}


class LabViewOverview extends React.PureComponent {

    static getTabObject({ context, schemas, windowWidth }, width){
        return {
            'tab' : <span><i className="icon icon-file-alt fas icon-fw"/> Overview</span>,
            'key' : 'overview',
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <LabViewOverview {...{ context, schemas, width, windowWidth }} />
                </div>
            )
        };
    }

    render(){
        const propsToPass = _.pick(this.props, 'context', 'schemas', 'width', 'windowWidth');
        return (
            <div>
                <OverViewBody {...propsToPass} />
                <DetailsViewBody {...propsToPass} />
            </div>
        );

    }

}


const OverViewBody = React.memo(function OverViewBody(props) {
    const { context, schemas } = props;
    const tips = object.tipsFromSchema(schemas, context);
    const commonProps = {
        'result' : context, tips,
        'wrapInColumn' : true,
        //'listItemElement' : 'div',
        //'listWrapperElement' : 'div',
        //'singleItemClassName' : 'block'
    };

    return (
        <div className="row">
            <div className="col-12">
                <div className="row overview-blocks">
                    <OverViewBodyItem {...commonProps} property="pi" fallbackTitle="P.I." titleRenderFxn={OverViewBodyItem.titleRenderPresets.contact_person} />
                    <OverViewBodyItem {...commonProps} property="correspondence" fallbackTitle="Correspondence" titleRenderFxn={OverViewBodyItem.titleRenderPresets.contact_person} />
                    <OverViewBodyItem {...commonProps} property="institute_name" fallbackTitle="Institute" />
                </div>
                <div className="row overview-blocks">
                    <OverViewBodyItem {...commonProps} property="country" fallbackTitle="Country" />
                    <OverViewBodyItem {...commonProps} property="state" fallbackTitle="State" />
                    <OverViewBodyItem {...commonProps} property="city" fallbackTitle="City" />
                </div>
            </div>
        </div>
    );
});

const DetailsViewBody = React.memo(function DetailsViewBody(props) {
    const { context, schemas } = props;
    const tips = object.tipsFromSchema(schemas, context);
    const commonProps = {
        'result' : context, tips,
        'wrapInColumn' : true,
        //'listItemElement' : 'div',
        //'listWrapperElement' : 'div',
        //'singleItemClassName' : 'block'
    };

    return (
        <div className="mt-3">
            <h3 className="tab-section-title">
                <span>Details</span>
            </h3>
            <hr className="tab-section-title-horiz-divider" />
            <div className="row overview-blocks">
                <OverViewBodyItem {...commonProps} property="awards" listItemElement="div" listWrapperElement="div" singleItemClassName="block" fallbackTitle="Awards" />
            </div>
        </div>
    );
});
