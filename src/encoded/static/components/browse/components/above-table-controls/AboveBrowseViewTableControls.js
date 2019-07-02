'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';
import { AboveTableControlsBase } from '@hms-dbmi-bgm/shared-portal-components/src/components/browse/components/above-table-controls/AboveTableControlsBase';

import { ChartDataController } from './../../../viz/chart-data-controller';
import { SelectedFilesControls, SelectedFilesFilterByContent } from './SelectedFilesControls';
import { fileCountWithDuplicates, SelectedFilesController } from './../SelectedFilesController';




/**
 * This component must be fed props from CustomColumnController (for columns UI), SelectedFilesController (for selected files read-out).
 * Some may need to be transformed to exclude certain non-user-controlled columns (e.g. @type) and such.
 */
export class AboveBrowseViewTableControls extends React.PureComponent {

    /** Removes filters from fileTypeFilters if newly selected files don't have filtered-in fileType. */
    static filterFileTypeFilters = memoize(function(fileTypeFilters, selectedFiles){
        const existingFileTypeFiltersObject = _.object(_.map(fileTypeFilters, function(filtr){
            return [filtr, true];
        }));
        const fileTypeBucketsNew = SelectedFilesFilterByContent.filesToFileTypeBuckets(selectedFiles);
        let currFilter;
        for (var i = 0; i < fileTypeFilters.length ; i++){
            currFilter = fileTypeFilters[i];
            if (typeof fileTypeBucketsNew[currFilter] === 'undefined'){
                delete existingFileTypeFiltersObject[currFilter];
            }
        }
        return _.keys(existingFileTypeFiltersObject);
    });

    static getDerivedStateFromProps(props, state){
        // Keep up to date if unselect files w/ such active filters.
        return {
            'fileTypeFilters' : AboveBrowseViewTableControls.filterFileTypeFilters(
                state.fileTypeFilters,
                props.selectedFiles
            )
        };
    }

    constructor(props){
        super(props);
        this.setFileTypeFilters = this.setFileTypeFilters.bind(this);

        /**
         * @property {string[]} state.fileTypeFilters - List of file_type_detailed strings that we filter selected files down to.
         */
        this.state = {
            // TODO: extract this & logic related to this into a new "FileTypeFilterController" component.
            // This would allow us to hoist this above BrowseView's entire results table and maybe hide or filter down expsets.
            'fileTypeFilters' : []
        };
    }

    setFileTypeFilters(fileTypeFilters){
        this.setState({ fileTypeFilters });
    }

    render(){
        const { selectedFiles } = this.props;
        const { fileTypeFilters } = this.state;
        const filteredSelectedFiles = SelectedFilesControls.filterSelectedFilesByFileTypeFilters(selectedFiles, fileTypeFilters);
        const selectedFileCount = fileCountWithDuplicates(selectedFiles);

        let wrappedLeftSectionControls;
        if (selectedFiles){
            wrappedLeftSectionControls = (
                <ChartDataController.Provider id="selected_files_section">
                    <SelectedFilesControls {..._.extend(_.pick(this.props, 'href', 'includeFileSets'), SelectedFilesController.pick(this.props))}
                        subSelectedFiles={filteredSelectedFiles} onFilterFilesByClick={this.handleOpenFileTypeFiltersPanel}
                        currentFileTypeFilters={fileTypeFilters} setFileTypeFilters={this.setFileTypeFilters} />
                </ChartDataController.Provider>
            );
        }

        const aboveTableControlsProps = _.extend(
            _.pick(this.props, 'isFullscreen', 'windowWidth', 'toggleFullScreen', 'parentForceUpdate'),
            {
                "panelMap" : _.extend(
                    {
                        "filterFilesBy" : {
                            "title" : <React.Fragment><i className="icon icon-fw icon-gear"/> Configure Visible Columns</React.Fragment>,
                            "className" : "file-type-selector-panel",
                            "body" : (
                                <SelectedFilesFilterByContent {..._.pick(this.props, 'includeFileSets', 'selectedFiles')}
                                    currentFileTypeFilters={fileTypeFilters} setFileTypeFilters={this.setFileTypeFilters} />
                            ),
                            "close" : selectedFileCount === 0
                        }
                    },
                    AboveTableControlsBase.getCustomColumnSelectorPanelMapDefinition(this.props)
                )
            }
        );

        return <AboveTableControlsBase {...aboveTableControlsProps}>{ wrappedLeftSectionControls }</AboveTableControlsBase>;
    }
}
