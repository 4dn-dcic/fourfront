'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';

import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/SearchView';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { columnExtensionMap } from './columnExtensionMap';
import { Schemas } from './../util';

import { transformedFacets } from './SearchView';

export default class PublicationSearchView extends React.PureComponent {

    constructor(props){
        super(props);
        this.memoized = {
            transformedFacets: memoize(transformedFacets)
        };
    }

    render(){
        const { isFullscreen, href, context, currentAction, session, schemas } = this.props;
        const facets = this.memoized.transformedFacets(href, context, currentAction, session, schemas);
        const tableColumnClassName = "expset-result-table-fix col-12" + (facets.length > 0 ? " col-sm-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9') : "");
        const facetColumnClassName = "col-12 col-sm-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3');
        return (
            <div className="container" id="content">
                <CommonSearchView {...this.props} {...{ columnExtensionMap, tableColumnClassName, facetColumnClassName, facets }}
                    termTransformFxn={Schemas.Term.toName} separateSingleTermFacets rowHeight={150} />
            </div>
        );
    }
}

