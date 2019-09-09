'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import { console, layout, ajax, object } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';


export const FullHeightCalculator = React.memo(function FullHeightCalculator({ windowWidth, windowHeight, children }){

    // Hardcoded to avoid trying to measure heights of DOM elems and whatnot.
    // This is duplicated in CSS3 using calc() for more modern browsers. If changing,
    // make sure is changing in both places.

    let height = null;
    const surroundingComponentsHeight = 216; // 215 = footer (50) + navbar (41) + tab-section-title (78) + hr (1) + item page nav (46)
    const rgs = layout.responsiveGridState(windowWidth);
    if (rgs === 'md' || rgs === 'lg' || rgs === 'xl') {
        height = Math.max(windowHeight - surroundingComponentsHeight, 600);
    }
    return React.Children.map(children, function(child){
        return React.cloneElement(child, { height });
    });
});
