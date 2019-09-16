'use strict';

import React from 'react';
import { layout, console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';


export const FullHeightCalculator = React.memo(function FullHeightCalculator({
    windowWidth,
    windowHeight,
    children,
    propName = "height",
    tabContentHeight = 79,  // tab-section-title (78) + hr (1)
    heightDiff = null,      // optional manual setting
    skipGridStates = ['xs', 'sm'],
    minHeight = 400
}){

    // Hardcoded to avoid trying to measure heights of DOM elems and whatnot.
    // This is duplicated in CSS3 using calc() for more modern browsers. If changing,
    // make sure is changing in both places.

    if (typeof windowHeight !== "number" || isNaN(windowHeight)){
        console.warn("windowHeight is not a number; ok if serverside or not mounted", windowHeight);
        return React.Children.map(children, function(child){
            return React.cloneElement(child, { [propName]: minHeight });
        });
    }

    if (typeof windowWidth === "number" && !isNaN(windowWidth)){
        const rgs = layout.responsiveGridState(windowWidth);
        if (skipGridStates.indexOf(rgs) > -1) {
            return children; // Doesn't need height
        }
    }

    let surroundingComponentsHeight = 0;
    if (typeof heightDiff === 'number') {
        if (isNaN(heightDiff)) throw Error("heightDiff is NaN");
        surroundingComponentsHeight = heightDiff;
    } else {
        // 137 = footer (50) + navbar (41) + item page nav (46)
        surroundingComponentsHeight = 137;
        if (isNaN(tabContentHeight)) throw Error("tabContentHeight is NaN");
        surroundingComponentsHeight += tabContentHeight;
    }

    const height = Math.max(windowHeight - surroundingComponentsHeight, minHeight);

    return React.Children.map(children, function(child){
        return React.cloneElement(child, { [propName]: height });
    });
});

