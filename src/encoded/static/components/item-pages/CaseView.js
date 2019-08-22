'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DefaultItemView from './DefaultItemView';
//import { PedigreeTabView as PedigreeJSTabView } from './IndividualView';
import { console, layout } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { PedigreeViz } from './../viz/PedigreeViz';
import { CollapsibleItemViewButtonToolbar } from './components/CollapsibleItemViewButtonToolbar';



export default class CaseView extends DefaultItemView {

    getTabViewContents(){
        const { context : { proband = null } } = this.props;
        const initTabs = [];
        //if (proband){
        initTabs.push(PedigreeTabView.getTabObject(
            _.extend({}, this.props, { 'context' : proband })
        ));
        //}
        return this.getCommonTabs().concat(initTabs);
    }

}
/*
return (
    <CollapsibleItemViewButtonToolbar constantButtons={this.fullScreenButton()} windowWidth={this.props.windowWidth}>
        { elems }
    </CollapsibleItemViewButtonToolbar>
);
*/

export const PedigreeTabView = React.memo(function PedigreeTabView(props){
    const { context, schemas, windowWidth, windowHeight, innerOverlaysContainer } = props;

    // ONGOING - INCOMPLETE

    // Hardcoded to avoid trying to measure heights of DOM elems and whatnot.
    // This is duplicated in CSS3 using calc() for more modern browsers. If changing,
    // make sure is changing in both places.
    let surroundingComponentsHeight = 216; // 215 = footer (50) + navbar (41) + tab-section-title (78) + hr (1) + item page nav (46)
    const rgs = layout.responsiveGridState(windowWidth);
    if (rgs === 'sm' || rgs === 'xs') {
        // At this breakpoint(s) we have full height navbar, so add 40px.
        surroundingComponentsHeight += 44;
    }
    const height = Math.max(windowHeight - surroundingComponentsHeight, 600);
    return (
        <div className="overflow-hidden">
            <div className="container-wide">
                <h3 className="tab-section-title">
                    <span>Pedigree</span>
                </h3>
            </div>
            <hr className="tab-section-title-horiz-divider"/>
            <PedigreeViz width={windowWidth} overlaysContainer={innerOverlaysContainer} containerStyle={/*{ minHeight: height }*/ null} />
        </div>
    );
});

PedigreeTabView.getTabObject = function(props){
    return {
        'tab' : (
            <React.Fragment>
                <i className="icon icon-sitemap fas icon-fw"/>
                <span>Pedigree</span>
            </React.Fragment>
        ),
        'key' : 'pedigree',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : <PedigreeTabView {...props} />
    };
};
