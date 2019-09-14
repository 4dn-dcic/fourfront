'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

import DefaultItemView from './DefaultItemView';
import { PedigreeTabViewBody, parseFamilyIntoDataset } from './CaseView';


export default class IndividualView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(PedigreeTabView.getTabObject(this.props));
        return this.getCommonTabs().concat(initTabs);
    }

}

// TODO: Create endpoint to trace family of individual?
export const PedigreeTabView = React.memo(function PedigreeTabView(props){
    const { context, innerOverlaysContainer, windowWidth, windowHeight } = props;
    const family = [ context ];
    if (context.father){
        family.push(context.father);
    }
    if (context.mother){
        family.push(context.mother);
    }
    const dataset = parseFamilyIntoDataset({ members: family, proband: context });
    return (
        <div>
            <h3 className="tab-section-title container-wide">
                <span>Pedigree</span>
            </h3>
            <hr className="tab-section-title-horiz-divider"/>
            <PedigreeTabViewBody {...{ innerOverlaysContainer, windowWidth, windowHeight }} />
        </div>
    );
});

PedigreeTabView.getTabObject = function(props){
    const { context: { father, mother, children = [] } } = props;
    return {
        'tab' : (
            <React.Fragment>
                <i className="icon icon-sitemap fas icon-fw"/>
                <span>Pedigree</span>
            </React.Fragment>
        ),
        'key' : 'pedigree',
        'disabled' : (!father || !mother) && children.length === 0,
        'content' : <PedigreeTabView {...props} />
    };
};

