'use strict';

import React from 'react';
import { columnExtensionMap } from './columnExtensionMap';
import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/src/components/browse/SearchView';

/*
export default SearchView = React.memo(function SearchView(props){
    return <CommonSearchView {...props} columnExtensionMap={columnExtensionMap} />;
});
*/
export default class SearchView extends React.PureComponent {
    render(){
        return <CommonSearchView {...this.props} columnExtensionMap={columnExtensionMap} />;
    }
}

