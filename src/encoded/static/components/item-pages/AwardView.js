'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { console, object, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

import DefaultItemView from './DefaultItemView';
import { Wrapper as ItemHeaderWrapper, TopRow, MiddleRow, BottomRow } from './components/ItemHeader';


export default class AwardView extends DefaultItemView {

    itemHeader(){
        const { context, href, schemas, windoWidth } = this.props;
        return (
            <ItemHeaderWrapper {...{ context, href, schemas, windoWidth }}>
                <TopRow typeInfo={this.typeInfo()} />
                <MiddleRow descriptionExpanded />
                <BottomRow />
            </ItemHeaderWrapper>
        );
    }

    getTabViewContents(){
        const initTabs = [];

        return initTabs.concat(_.filter(this.getCommonTabs(), function(tabObj){
            if (tabObj.key === 'attribution') return false;
            return true;
        }));
    }

}