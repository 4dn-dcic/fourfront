'use strict';

import React from 'react';
import JsxParser from 'react-jsx-parser';
import memoize from 'memoize-one';
import _ from 'underscore';

import { SlideCarousel } from './SlideCarousel';
import { PageCarousel } from './PageCarousel';
import { JointAnalysisMatrix } from './JointAnalysisMatrix';

import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

export { SlideCarousel, PageCarousel, JointAnalysisMatrix };


/**
 * Any placeholder(s) used in a StaticSection _must_ get imported here
 * and be available here.
 */
const placeholders = { SlideCarousel, JointAnalysisMatrix, PageCarousel };

export const replaceString = memoize(function(placeholderString, props){

    var parsedJSXContent = (
        <JsxParser bindings={props} jsx={placeholderString} components={placeholders} key="placeholder-replacement" renderInWrapper={false} />
    );

    if (parsedJSXContent){
        return parsedJSXContent;
    } else {
        return placeholderString;
    }
}, function([nextPlaceHolderString, nextProps], [pastPlaceHolderString, pastProps]){
    if (nextPlaceHolderString !== pastPlaceHolderString) return false;
    var keys = _.keys(nextProps), keysLen = keys.length, i, k;
    for (i = 0; i < keysLen; i++){
        k = keys[i];
        if (nextProps[k] !== pastProps[k]) return false;
    }
    return true;
});
