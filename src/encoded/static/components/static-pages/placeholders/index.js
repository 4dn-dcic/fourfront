'use strict';

import React from 'react';

import { SlideCarousel } from './SlideCarousel';
import { JointAnalysisMatrix } from './JointAnalysisMatrix';


const placeholders = { SlideCarousel, JointAnalysisMatrix };


function replaceString(placeholderString, props){
    var regCheck    = /^<(\S+)\/>$/,
        regMatches  = placeholderString.match(regCheck),
        placeholder = regMatches && regMatches.length === 2 && placeholders[regMatches[1]];

    if (placeholder){
        return React.createElement(placeholder, props);
    } else {
        return placeholderString;
    }
}


// Exports
export { SlideCarousel, JointAnalysisMatrix, replaceString };
