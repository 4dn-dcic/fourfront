'use strict';

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/Checkbox';
import { ColumnCombiner, DisplayTitleColumnWrapper, DisplayTitleColumnDefault } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/table-commons';
import { CustomColumnController } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/CustomColumnController';
import { SortController } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/SortController';
import { SearchResultDetailPane } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/SearchResultDetailPane';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { SelectedFilesController } from './../browse/components/SelectedFilesController';
import { navigate, Schemas } from './../util';
import { FacetList } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/FacetList';
import { columnExtensionMap as colExtensionMap4DN } from './columnExtensionMap';
import { WindowNavigationController } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/WindowNavigationController';
import { transformedFacets } from './SearchView';
import { AboveBrowseViewTableControls } from './components/above-table-controls/AboveBrowseViewTableControls';
import { fileToAccessionTriple } from './../util/experiments-transforms';
import { SearchResultTable } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/SearchResultTable';

export default class FileSearchView extends React.PureComponent {

    constructor(props) {
        super(props);

        this.memoized = {
            transformedFacets: memoize(transformedFacets)
        };

        this.state = {
            show: false,
            confirmLoading: false
        };
    }

    render() {
        const { isFullscreen, href, context, currentAction, session, schemas } = this.props;
        const facets = this.memoized.transformedFacets(href, context, currentAction, session, schemas);
        
        return (
            <div className="search-page-container container" id="content">
                <SelectedFilesController {...{ href, context }}>
                    <FileTableWithSelectedFilesCheckboxes {...this.props} facets={facets} />
                </SelectedFilesController>
            </div>
        );
    }
}

function FileTableWithSelectedFilesCheckboxes(props){
    const {
        // Common high-level props from Redux, or App.js, or App.js > BodyElement:
        context, href, schemas, navigate: propNavigate,
        windowHeight, windowWidth, registerWindowOnScrollHandler,
        toggleFullScreen, isFullscreen, session,
        facets,
        selectedFiles, selectFile, unselectFile, resetSelectedFiles,
        columnExtensionMap
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
                            <DisplayTitleColumnDefault result={file} />
                        </DisplayTitleColumnWrapper>
                    );
                }
            })
        });

    }, [columnExtensionMap, selectedFiles, selectFile, unselectFile]);

    const bodyViewProps = {
        session, schemas, facets,
        windowHeight, windowWidth, registerWindowOnScrollHandler,
        toggleFullScreen, isFullscreen,
        selectedFiles, selectFile, unselectFile, resetSelectedFiles,
        totalExpected: total
    };
    return (
        <WindowNavigationController {...{ href, context }} navigate={propNavigate}>
            <ColumnCombiner columnExtensionMap={columnExtensionMapWithSelectedFilesCheckboxes}>
                <CustomColumnController {...{ windowWidth }}>
                    <SortController>
                        <ControlsAndResults {...bodyViewProps} />
                    </SortController>
                </CustomColumnController>
            </ColumnCombiner>
        </WindowNavigationController>
    );
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

class ControlsAndResults extends React.PureComponent {
    static defaultProps = {
        'href' : '/search/',
    };

    constructor(props){
        super(props);
        this.onClearFiltersClick = this.onClearFiltersClick.bind(this);
        this.renderSearchDetailPane = this.renderSearchDetailPane.bind(this);
    }

    onClearFiltersClick(evt, callback = null){
        const { onClearFilters } = this.props;
        evt.preventDefault();
        evt.stopPropagation();
        onClearFilters(callback);
    }

    renderSearchDetailPane(result, rowNumber, containerWidth, propsFromTable){
        const { renderDetailPane, windowWidth, schemas } = this.props;
        if (typeof renderDetailPane === "function") {
            return renderDetailPane(result, rowNumber, containerWidth, { ...propsFromTable, schemas, windowWidth });
        }
        return <SearchResultDetailPane {...{ result, rowNumber, containerWidth, schemas, windowWidth }} />;
    }

    render() {
        const {
            // From Redux store or App.js:
            context, schemas, currentAction, windowWidth, windowHeight, registerWindowOnScrollHandler, session,
            // 4DN-Specific from Redux Store or App.js:
            isFullscreen, toggleFullScreen,
            // From FileSearchView higher-order-component (extends facets, removes type facet, etc)
            facets, topLeftChildren,
            // From WindowNavigationController (or similar) (possibly from Redux store re: href)
            href, onFilter, getTermStatus,
            // From CustomColumnController:
            hiddenColumns, addHiddenColumn, removeHiddenColumn, visibleColumnDefinitions,
            setColumnWidths, columnWidths,
            // From ColumnCombiner:
            columnDefinitions,
            // From SortController:
            sortBy, sortColumn, sortReverse,
            // From SelectedFilesController (NOT SelectedItemsController - which is for currentAction=selection|multiselect)
            selectedFiles, selectedFilesUniqueCount, selectFile, unselectFile, resetSelectedFiles
        } = this.props;
        const { filters, '@graph': results } = context; // Initial results; cloned, saved to SearchResultTable state, and appended to upon load-as-scroll.

        const facetListProps = {
            session, schemas, windowWidth, windowHeight, facets,
            filters, getTermStatus, onFilter, href
        };

        const aboveTableControlsProps = {
            context, href, currentAction, windowHeight, windowWidth, toggleFullScreen, isFullscreen,
            columnDefinitions, hiddenColumns, addHiddenColumn, removeHiddenColumn,
            selectedFiles, selectFile, unselectFile, resetSelectedFiles, selectedFilesUniqueCount
        };

        const tableProps = {
            results, href, context, schemas,
            sortBy, sortColumn, sortReverse, windowWidth,
            columnDefinitions, visibleColumnDefinitions,
            selectedFiles, registerWindowOnScrollHandler,
            hiddenColumns, columnWidths, setColumnWidths
        };

        let totalResults = null;
        if (context && typeof context.total !== 'undefined' && context.total > 0) {
            totalResults = (
                <span className="inline-block mt-08">
                    {context.total} Results
                </span>
            )
        } else {
            totalResults = (<span className="inline-block mt-08">&nbsp;</span>)
        }

        let addButton = null;
        if (context && Array.isArray(context.actions) && !currentAction) {
            const addAction = _.findWhere(context.actions, { 'name': 'add' });
            if (addAction && typeof addAction.href === 'string') {
                addButton = (
                    <a className={"btn btn-primary btn-xs ml-1"} href={addAction.href} data-skiprequest="true">
                        <i className="icon icon-fw icon-plus fas mr-03 fas" />Create New&nbsp;
                    </a>);
            }
        }

        return (
            <div className="row search-view-controls-and-results">
                {facets && facets.length > 0 ?
                    <React.Fragment>
                        <div className={"col-md-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3')}>
                            <div className="above-results-table-row text-right text-ellipsis-container">
                                {totalResults}
                                {addButton}
                            </div>
                            <FacetList {...facetListProps} className="with-header-bg" itemTypeForSchemas="ExperimentSetReplicate"
                                termTransformFxn={Schemas.Term.toName} onClearFilters={this.onClearFiltersClick} separateSingleTermFacets />
                        </div>
                    </React.Fragment>
                    : null}
                <div className={"expset-result-table-fix col-md-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9')}>
                    <AboveBrowseViewTableControls {...aboveTableControlsProps} showSelectedFileCount />
                    <SearchResultTable {...tableProps} termTransformFxn={Schemas.Term.toName} renderDetailPane={this.renderSearchDetailPane} />
                </div>
            </div>
        );
    }

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