'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DefaultItemView from './DefaultItemView';
import { PedigreeTabView } from './IndividualView';
import { console } from './../util';



export default class CaseView extends DefaultItemView {

    getTabViewContents(){
        const { context : { proband = null } } = this.props;
        const initTabs = [];
        if (proband){
            initTabs.push(PedigreeTabView.getTabObject(
                _.extend({}, this.props, { 'context' : proband })
            ));
        }
        return this.getCommonTabs().concat(initTabs);
    }

}
