'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DefaultItemView from './DefaultItemView';


export default class IndividualView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(PedigreeTabView.getTabObject(this.props));
        return this.getCommonTabs().concat(initTabs);
    }

}

export const PedigreeTabView = React.memo(function PedigreeTabView({ context, schemas }){
    return (
        <div>
            <h4>TODO</h4>
        </div>
    );
});
PedigreeTabView.getTabObject = function({ context, schemas }){
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
                <PedigreeTabView context={context} schemas={schemas} />
            </div>
        )
    };
};

