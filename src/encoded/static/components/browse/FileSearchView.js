'use strict';

import React, { useMemo } from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';
import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/Checkbox';
import { ColumnCombiner } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/table-commons';
import { CustomColumnController } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/CustomColumnController';
import { SortController } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/SortController';
import { SearchResultDetailPane } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/SearchResultDetailPane';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { SelectedFilesController } from './../browse/components/SelectedFilesController';
import { Schemas } from './../util';
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
        let createNewVisible = false;
        if (context && Array.isArray(context.actions) && !currentAction) {
            const addAction = _.findWhere(context.actions, { 'name': 'add' });
            if (addAction && typeof addAction.href === 'string') {
                createNewVisible = true;
            }
        }
        return (
            <div className="container" id="content">
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
                'render': (file, columnDefinition, paneProps, width) => {
                    const origTitleBlock = colExtensionMap4DN.display_title.render(file, columnDefinition, paneProps, width);
                    const newChildren = origTitleBlock.props.children.slice(0);
                    newChildren[2] = newChildren[1];
                    newChildren[2] = React.cloneElement(newChildren[2], { 'className': newChildren[2].props.className + ' mono-text' });
                    newChildren[1] = <FileSearchViewCheckBox key="checkbox" {...{ file, selectedFiles, selectFile, unselectFile }} />;
                    return React.cloneElement(origTitleBlock, { 'children': newChildren });
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
                <CustomColumnController>
                    <SortController>
                        <ControlsAndResults {...bodyViewProps} />
                    </SortController>
                </CustomColumnController>
            </ColumnCombiner>
        </WindowNavigationController>
    );
}

class ControlsAndResults extends React.PureComponent {
    static defaultProps = {
        'href' : '/search/',
    };

    constructor(props){
        super(props);
        this.onClearFiltersClick = this.onClearFiltersClick.bind(this);
        this.forceUpdateOnSelf = this.forceUpdateOnSelf.bind(this);
        this.renderSearchDetailPane = this.renderSearchDetailPane.bind(this);

        this.searchResultTableRef = React.createRef();
    }

    forceUpdateOnSelf(){
        const searchResultTable = this.searchResultTableRef.current;
        const dimsContainer = searchResultTable && searchResultTable.getDimensionContainer();
        return dimsContainer && dimsContainer.resetWidths();
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
            hiddenColumns, addHiddenColumn, removeHiddenColumn,
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
            results, href, context, sortBy, sortColumn, sortReverse, windowWidth, columnDefinitions,
            selectedFiles, registerWindowOnScrollHandler, hiddenColumns,
        };

        return (
            <div className="row">
                {facets && facets.length > 0 ?
                    <div className={"col-md-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3')}>
                        <FacetList {...facetListProps} className="with-header-bg" itemTypeForSchemas="ExperimentSetReplicate"
                            termTransformFxn={Schemas.Term.toName} onClearFilters={this.onClearFiltersClick} separateSingleTermFacets />
                    </div>
                    : null}
                <div className={"expset-result-table-fix col-md-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9')}>
                    <AboveBrowseViewTableControls {...aboveTableControlsProps} parentForceUpdate={this.forceUpdateOnSelf} showSelectedFileCount />
                    <SearchResultTable {...tableProps} ref={this.searchResultTableRef} termTransformFxn={Schemas.Term.toName} renderDetailPane={this.renderSearchDetailPane} />
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
        const checked = selectedFiles[accessionTriple] ? 'checked' : undefined;
        return <Checkbox {...{ checked }} onChange={this.onChange} className="expset-checkbox" />;
    }
}