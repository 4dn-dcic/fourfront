'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DefaultItemView from './DefaultItemView';
import { console, layout } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { PedigreeJSLibContainer } from './../../libs/pedigreejs';


export default class IndividualView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(PedigreeTabView.getTabObject(this.props));
        return this.getCommonTabs().concat(initTabs);
    }

}


export const PedigreeTabView = React.memo(function PedigreeTabView({ context, schemas, windowWidth, windowHeight }){
    const width = layout.gridContainerWidth(windowWidth);
    const height = Math.max(Math.floor(windowHeight / 2), 600);
    return (
        <div>
            <PedigreeJSLibContainer width={width} height={height} />
        </div>
    );
});

PedigreeTabView.getTabObject = function(props){
    return {
        'tab' : <span><i className="icon icon-sitemap fas icon-fw"/> Pedigree</span>,
        'key' : 'document-info',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    <span>Pedigree</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <PedigreeTabView {...props} />
            </div>
        )
    };
};

