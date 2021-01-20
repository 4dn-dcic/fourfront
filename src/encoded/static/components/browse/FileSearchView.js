'use strict';

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/Checkbox';
import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/SearchView';
import { DisplayTitleColumnWrapper, DisplayTitleColumnDefault } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/table-commons';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { SelectedFilesController } from './../browse/components/SelectedFilesController';
import { navigate, Schemas } from './../util';
import { columnExtensionMap as colExtensionMap4DN } from './columnExtensionMap';
import { transformedFacets } from './SearchView';
import { AboveBrowseViewTableControls } from './components/above-table-controls/AboveBrowseViewTableControls';
import { fileToAccessionTriple } from './../util/experiments-transforms';



export default function FileSearchView (props){
    const { href, context } = props;
    return (
        <div className="search-page-container container" id="content">
            <SelectedFilesController {...{ href, context }}>
                <FileTableWithSelectedFilesCheckboxes {...props} />
            </SelectedFilesController>
        </div>
    );
}


function FileTableWithSelectedFilesCheckboxes(props){
    const {
        // Common high-level props from Redux, or App.js, or App.js > BodyElement:
        context, href, schemas, navigate: propNavigate,
        windowHeight, windowWidth, registerWindowOnScrollHandler,
        toggleFullScreen, isFullscreen, session,
        selectedFiles, selectFile, unselectFile, resetSelectedFiles, selectedFilesUniqueCount,
        columnExtensionMap,
        currentAction
    } = props;
    const { total = 0 } = context;

    const columnExtensionMapWithSelectedFilesCheckboxes = useMemo(function(){

        if (typeof selectedFiles === 'undefined'){
            // We don't need to add checkbox(es) for file selection.
            return columnExtensionMap;
        }

        // Add Checkboxes
        return _.extend({}, columnExtensionMap, {
            // We extend the display_title of global constant colExtensionMap4DN, not the columnExtensionMap,
            // incase the prop version's render fxn is different than what we expect.
            'display_title' : _.extend({}, colExtensionMap4DN.display_title, {
                'widthMap' : { 'lg' : 210, 'md' : 210, 'sm' : 200 },
                'render': (file, parentProps) => {
                    const { rowNumber, detailOpen, toggleDetailOpen } = parentProps;
                    return (
                        <DisplayTitleColumnWrapper {...{ href, context, rowNumber, detailOpen, toggleDetailOpen }} result={file}>
                            <FileSearchViewCheckBox key="checkbox" {...{ file, selectedFiles, selectFile, unselectFile }} />
                            <DisplayTitleColumnDefault />
                        </DisplayTitleColumnWrapper>
                    );
                }
            })
        });

    }, [columnExtensionMap, selectedFiles, selectFile, unselectFile]);


    const facets = useMemo(function(){
        return transformedFacets(href, context, currentAction, session, schemas);
    }, [ context, currentAction, session, schemas ]);


    const aboveTableControlsProps = { // Some more generic props get passed in by SPC > ControlsAndResults.js
        href, session, toggleFullScreen, isFullscreen,
        selectedFiles, selectFile, unselectFile, resetSelectedFiles, selectedFilesUniqueCount
    };

    const aboveTableComponent = <AboveBrowseViewTableControls {...aboveTableControlsProps} showSelectedFileCount />;
    const aboveFacetListComponent = <AboveFacetList {...{ context, currentAction }} />;

    const passProps = {
        href, context, facets,
        session, schemas,
        windowHeight, windowWidth, registerWindowOnScrollHandler,
        aboveTableComponent, aboveFacetListComponent,
        columnExtensionMap: columnExtensionMapWithSelectedFilesCheckboxes,
        navigate: propNavigate,
        toggleFullScreen, isFullscreen, // todo: remove maybe, pass only to AboveTableControls
        // selectedFiles, selectFile, unselectFile, resetSelectedFiles, // todo: remove and pass only to AboveTableControls, detailPane, and colExtensionMap
        totalExpected: total // todo: remove, deprecated
    };

    return <CommonSearchView {...passProps} termTransformFxn={Schemas.Term.toName} />;
}
FileTableWithSelectedFilesCheckboxes.propTypes = {
    // Props' type validation based on contents of this.props during render.
    'href'                      : PropTypes.string.isRequired,
    'columnExtensionMap'        : PropTypes.object.isRequired,
    'context'                   : PropTypes.shape({
        'columns'                   : PropTypes.objectOf(PropTypes.object).isRequired,
        'total'                     : PropTypes.number.isRequired
    }).isRequired,
    'facets'                    : PropTypes.arrayOf(PropTypes.shape({
        'title'                     : PropTypes.string.isRequired
    })),
    'schemas'                   : PropTypes.object,
    'browseBaseState'           : PropTypes.string.isRequired,
    'selectFile'                : PropTypes.func,
    'unselectFile'              : PropTypes.func,
    'selectedFiles'             : PropTypes.objectOf(PropTypes.object),
};
FileTableWithSelectedFilesCheckboxes.defaultProps = {
    'navigate'  : navigate,
    'columnExtensionMap' : colExtensionMap4DN
};

function AboveFacetList({ context, currentAction }){
    const { total = 0, actions = [] } = context;
    let totalResults = null;
    if (total > 0) {
        totalResults = (
            <div>
                <span id="results-count" className="text-500">
                    { total }
                </span> Results
            </div>
        );
    }

    let addButton = null;
    if (!currentAction) {
        const addAction = _.findWhere(actions, { 'name': 'add' });
        if (addAction && typeof addAction.href === 'string') {
            addButton = (
                <a className="btn btn-primary btn-xs ml-1" href={addAction.href} data-skiprequest="true">
                    <i className="icon icon-fw icon-plus fas mr-03 fas" />Create New&nbsp;
                </a>
            );
        }
    }

    return (
        <div className="above-results-table-row text-truncate d-flex align-items-center justify-content-end">
            { totalResults }
            { addButton }
        </div>
    );
}


class FileSearchViewCheckBox extends React.PureComponent {

    static filesToObjectKeyedByAccessionTriples(file, isSelected) {
        const allFileAccessionTriples = fileToAccessionTriple(file, false, true);
        if (isSelected) {
            return (_.zip([allFileAccessionTriples], [file]));
        }
        else { return allFileAccessionTriples; }
    }

    constructor(props) {
        super(props);
        this.onChange = this.onChange.bind(this);
        this.memoized = {
            filesToObjectKeyedByAccessionTriples: memoize(FileSearchViewCheckBox.filesToObjectKeyedByAccessionTriples),
        };
    }

    onChange(e) {
        const { file, selectFile, unselectFile } = this.props;
        const isChecked = e.target.checked;
        if (isChecked) {
            const allFilesKeyedByTriples = this.memoized.filesToObjectKeyedByAccessionTriples(file, true);
            selectFile(allFilesKeyedByTriples);
        }
        else {
            const unselectFilesKeyedByTriples = this.memoized.filesToObjectKeyedByAccessionTriples(file, false);
            unselectFile(unselectFilesKeyedByTriples);
        }
    }

    render() {
        const { file, selectedFiles } = this.props;
        const accessionTriple = ['NONE', 'NONE', file.accession].join('~');
        return <Checkbox checked={!!(selectedFiles[accessionTriple])} onChange={this.onChange} className="expset-checkbox" />;
    }
}
