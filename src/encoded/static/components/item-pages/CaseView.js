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
    const width = layout.gridContainerWidth(windowWidth);
    const height = null;// Math.max(Math.floor(windowHeight / 2), 600);
    return (
        <div className="overflow-hidden">
            <h3 className="tab-section-title">
                <span>Pedigree</span>
            </h3>
            <hr className="tab-section-title-horiz-divider"/>
            <PedigreeViz {...{ width, height }} overlaysContainer={innerOverlaysContainer} />
        </div>
    );
});

PedigreeTabView.getTabObject = function(props){
    return {
        'tab' : <span><i className="icon icon-sitemap fas icon-fw"/> Pedigree</span>,
        'key' : 'pedigree',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : <PedigreeTabView {...props} />
    };
};
