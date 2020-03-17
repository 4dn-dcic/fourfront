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
import { ExperimentSetDetailPane } from './components/ExperimentSetDetailPane';
import { AboveBrowseViewTableControls } from './components/above-table-controls/AboveBrowseViewTableControls';
import { fileToAccessionTriple } from './../util/experiments-transforms';
import { SearchResultTable } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/SearchResultTable';

class FileSearchViewCheckBox extends React.PureComponent {

    static filesToObjectKeyedByAccessionTriples(file) {
        const allFileAccessionTriples = fileToAccessionTriple(file, false, true);
        return (_.zip([allFileAccessionTriples], [file]));
    }

    constructor(props) {
        super(props);
        this.onChange = this.onChange.bind(this);
        this.memoized = {
            filesToObjectKeyedByAccessionTriples: memoize(FileSearchViewCheckBox.filesToObjectKeyedByAccessionTriples)
        };
    }
    onChange(e) {
        const { file,  selectFile, unselectFile } = this.props;
        const allFilesKeyedByTriples = this.memoized.filesToObjectKeyedByAccessionTriples(file);
        const isChecked = e.target.checked;
        if (isChecked) {
            selectFile(allFilesKeyedByTriples);
        }
        else {
            unselectFile(file.accession);
        }
    }

    render() {
        const checked = 0;
        return <Checkbox {...checked} onChange={this.onChange} className="expset-checkbox" />;
    }
}

class ControlsAndResults extends React.PureComponent {
    static defaultProps = {
        'href' : '/search/',
    };

    constructor(props){
        super(props);
        this.onClearFiltersClick = this.onClearFiltersClick.bind(this);
        this.forceUpdateOnSelf = this.forceUpdateOnSelf.bind(this);

        this.searchResultTableRef = React.createRef();

        this.detailPaneFileSectionStateCache = {};

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

    render() {
        const {

            // From Redux store or App.js:
            context, schemas, currentAction, windowWidth, windowHeight, registerWindowOnScrollHandler, session,

            // 4DN-Specific from Redux Store or App.js:
            isFullscreen, toggleFullScreen,

            // From BrowseView higher-order-component (extends facets, removes type facet, etc)
            facets, topLeftChildren, countExternalSets,

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
                    <SearchResultTable {...tableProps} ref={this.searchResultTableRef} termTransformFxn={Schemas.Term.toName} renderDetailPane={SearchResultDetailPane} />
                </div>
            </div>
        );
    }

}
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
    static resetSelectedFilesCheck(nextProps, pastProps){
        if (nextProps.context !== pastProps.context) return true;
        return false;
    }

    /**
     * Calculates how many experiment sets are 'External' and do not have award.project===4DN from browse JSON result.
     *
     * @param {SearchResponse} context - Search result with at least 'facets'.
     * @returns {number} Count of external experiment sets.
     */
    static externalDataSetsCount = memoize(function(context){
        var projectFacetTerms = (
            Array.isArray(context.facets) ? _.uniq(_.flatten(_.pluck(_.filter(context.facets, { 'field' : 'award.project' }), 'terms')), 'key') : []
        );
        return _.reduce(projectFacetTerms, function(sum, projectTermObj){
            if (projectTermObj.key === '4DN') return sum; // continue.
            return sum + projectTermObj.doc_count;
        }, 0);
    });
    handleModalCancel(evt) {
        this.setState({ 'show': null });
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
        context, href,  schemas, navigate: propNavigate,
        windowHeight, windowWidth, registerWindowOnScrollHandler,
        toggleFullScreen, isFullscreen, session,
        facets,
        selectedFiles, selectFile, unselectFile, resetSelectedFiles,
        columnExtensionMap
    } = props;
    const { total = 0, notification = null } = context;

    const countExternalSets = FileSearchView.externalDataSetsCount(context);

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
                'render': (file,files, columnDefinition, paneProps, width) => {
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
        session, schemas, countExternalSets, facets,
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

