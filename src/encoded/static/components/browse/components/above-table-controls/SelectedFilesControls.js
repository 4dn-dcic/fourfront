'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import memoize from 'memoize-one';
import Dropdown from 'react-bootstrap/esm/Dropdown';
import Button from 'react-bootstrap/esm/Button'; // TODO: Use plain HTML w. bootstrap classNames in place of this.
import ButtonGroup from 'react-bootstrap/esm/ButtonGroup';

import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/Checkbox';
import { console, object, ajax, analytics, memoizedUrlParse, logger } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { requestAnimationFrame as raf } from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';

import { Schemas, typedefs, navigate } from './../../../util';
import { allFilesFromExperimentSet, filesToAccessionTriples, fileToAccessionTriple } from './../../../util/experiments-transforms';
import { BrowseViewSelectedFilesDownloadButton } from './SelectedFilesDownloadButton';
import { uniqueFileCount, uniqueFileCountBySource, SelectedFilesController } from './../SelectedFilesController';

// eslint-disable-next-line no-unused-vars
const { Item } = typedefs;

const SELECT_ALL_LIMIT = 8000;

export class SelectAllFilesButton extends React.PureComponent {

    /** These are fields included when "Select All" button is clicked to AJAX all files in */
    static fieldsToRequest = [
        'accession',
        'produced_in_pub.display_title',
        'lab.display_title',
        'file_type_detailed',

        'processed_files.accession',
        'processed_files.display_title',
        'processed_files.@id',
        'processed_files.@type',
        'processed_files.file_type_detailed',

        'experiments_in_set.accession',

        'experiments_in_set.files.accession',
        'experiments_in_set.files.display_title',
        'experiments_in_set.files.@id',
        'experiments_in_set.files.@type',
        'experiments_in_set.files.file_type_detailed',

        'experiments_in_set.processed_files.accession',
        'experiments_in_set.processed_files.display_title',
        'experiments_in_set.processed_files.@id',
        'experiments_in_set.processed_files.@type',
        'experiments_in_set.processed_files.file_type_detailed',

        'experiments_in_set.other_processed_files.files.accession',
        'experiments_in_set.other_processed_files.files.display_title',
        'experiments_in_set.other_processed_files.files.@id',
        'experiments_in_set.other_processed_files.files.@type',
        'experiments_in_set.other_processed_files.files.file_type_detailed',

        'other_processed_files.files.accession',
        'other_processed_files.files.display_title',
        'other_processed_files.files.@id',
        'other_processed_files.files.@type',
        'other_processed_files.files.file_type_detailed',
    ];

    constructor(props){
        super(props);
        this.isAllSelected = this.isAllSelected.bind(this);
        this.handleSelectAll = this.handleSelectAll.bind(this);
        this.onSelectAllClick = this.onSelectAllClick.bind(this);
        this.state = { 'selecting' : false };
        this.memoized = {
            uniqueFileCount: memoize(uniqueFileCount),
            uniqueFileCountBySource: memoize(uniqueFileCountBySource)
        };
    }

    isEnabled(){
        const { totalFilesCount } = this.props;
        if (!totalFilesCount) return true;
        if (totalFilesCount > SELECT_ALL_LIMIT) return false;
        return true;
    }

    isAllSelected(){
        const { totalFilesCount, selectedFiles } = this.props;
        if (!totalFilesCount) return false;
        // totalFilesCount as returned from bar plot aggs at moment is unique.
        if (totalFilesCount === this.memoized.uniqueFileCount(selectedFiles)){
            return true;
        }
        return false;
    }

    handleSelectAll(includeRawFiles = true, includeProcessedFiles = true, includeOtherProcessedFiles = true){
        const { selectFile, selectedFiles, resetSelectedFiles, href, context, totalFilesCount } = this.props;
        if (typeof selectFile !== 'function' || typeof resetSelectedFiles !== 'function'){
            logger.error("No 'selectFiles' or 'resetSelectedFiles' function prop passed to SelectedFilesController.");
            throw new Error("No 'selectFiles' or 'resetSelectedFiles' function prop passed to SelectedFilesController.");
        }

        this.setState({ 'selecting' : true }, () => {
            const extData = { item_list_name: analytics.hrefToListName(window && window.location.href) };

            if (!this.isAllSelected()){
                const currentHrefParts = memoizedUrlParse(href);
                const currentHrefQuery = _.extend({}, currentHrefParts.query);
                currentHrefQuery.field = SelectAllFilesButton.fieldsToRequest;
                currentHrefQuery.limit = 'all';
                const reqHref = currentHrefParts.pathname + '?' + queryString.stringify(currentHrefQuery);
                ajax.load(reqHref, (resp)=>{
                    let allExtendedFiles;
                    let filesToSelect;
                    if (extData.item_list_name === 'browse') {
                        allExtendedFiles = _.reduce(resp['@graph'] || [], (m, v) => m.concat(allFilesFromExperimentSet(v, includeRawFiles, includeProcessedFiles, includeOtherProcessedFiles)), []);
                        filesToSelect = _.zip(filesToAccessionTriples(allExtendedFiles, true, true), allExtendedFiles);
                    } else {
                        allExtendedFiles =(resp['@graph'] || []);
                        filesToSelect = _.zip(filesToAccessionTriples(allExtendedFiles, false, true), resp['@graph'] );
                    }
                    selectFile(filesToSelect);
                    this.setState({ 'selecting' : false });

                    //analytics
                    const products = analytics.transformItemsToProducts(allExtendedFiles, extData);
                    const productsLength = Array.isArray(products) ? products.length : allExtendedFiles.length;
                    analytics.event(
                        "add_to_cart",
                        "SelectAllFilesButton",
                        "Select All",
                        function () { console.info(`Adding ${productsLength} items from cart.`); },
                        {
                            items: Array.isArray(products) ? products : null,
                            list_name: extData.item_list_name,
                            value: productsLength,
                            filters: analytics.getStringifiedCurrentFilters((context && context.filters) || null)
                        }
                    );
                });

            } else {
                resetSelectedFiles();
                this.setState({ 'selecting' : false });
            }
        });
    }

    onSelectAllClick(selectType){
        const { resetSelectedFiles } = this.props;
        switch (selectType) {
            case 'clear':
                resetSelectedFiles();
                this.setState({ 'selecting' : false });
                break;
            case 'raw-files':
                this.handleSelectAll(true, false, false);
                break;
            case 'processed-files':
                this.handleSelectAll(false, true, false);
                break;
            case 'supplementary-files':
                this.handleSelectAll(false, false, true);
                break;
            default:
                this.handleSelectAll(true, true, true);
                break;
        }
    }

    render(){
        const { href, selectedFiles, totalRawFilesCount = 0, totalProcessedFilesCount = 0, totalOPFCount = 0 } = this.props;
        const { selecting } = this.state;
        const isAllSelected = this.isAllSelected();
        const anySelected = selectedFiles && Object.keys(selectedFiles).length > 0;
        let isAllRawFilesSelected = isAllSelected, isAllProcessedFilesSelected = isAllSelected, isAllOtherProcessedFilesSelected = isAllSelected;
        // get actual counts when it is necessary, e.g. some files selected but not all
        if (!isAllSelected && anySelected) {
            const countsBySource = this.memoized.uniqueFileCountBySource(selectedFiles);
            isAllRawFilesSelected = totalRawFilesCount > 0 && (countsBySource['raw'] || 0 === totalRawFilesCount);
            isAllProcessedFilesSelected = totalProcessedFilesCount > 0 && (countsBySource['processed'] || 0 === totalProcessedFilesCount);
            isAllOtherProcessedFilesSelected = totalOPFCount > 0 && (countsBySource['supplementary'] || 0 === totalOPFCount);
        }
        const isEnabled = this.isEnabled();
        const disabled = selecting || (!isAllSelected && !isEnabled);
        const iconClassName = (
            "mr-05 icon icon-fw icon-" + (selecting ? 'circle-notch icon-spin fas' : (isAllSelected ? 'square far' : 'check-square far'))
        );
        // const cls = "btn " + (isAllSelected ? "btn-outline-primary" : "btn-primary");
        const hideToggle = !navigate.isBrowseHref(href);

        let tooltip = null;
        if (!isAllSelected && !isEnabled) {
            tooltip = `"Select All" is disabled since the total file count exceeds the upper limit: ${SELECT_ALL_LIMIT}`;
        } else if (!isAllSelected) {
            tooltip = 'Select All Files';
        }

        const options = [
            { label: 'Clear Selection', key: 'clear', iconClassName: 'mr-05 icon icon-fw far icon-times-circle', hidden: !anySelected },
            { label: 'Select All Raw Files', key: 'raw-files', disabled: isAllSelected || isAllRawFilesSelected, hidden: totalRawFilesCount === 0 },
            { label: 'Select All Processed Files', key: 'processed-files', disabled: isAllSelected || isAllProcessedFilesSelected, hidden: totalProcessedFilesCount === 0 },
            { label: 'Select All Supplementary Files', key: 'supplementary-files', disabled: isAllSelected || isAllOtherProcessedFilesSelected, hidden: totalOPFCount === 0 },
        ];

        return (
            <div className="pull-left box selection-buttons">
                <div className="btn-group">
                    <SelectAllSplitButton onClick={this.onSelectAllClick} buttonId="select-all-files-button"
                        {...{ options, isAllSelected, disabled, iconClassName, tooltip, hideToggle }} />
                </div>
            </div>
        );
    }
}


const FileTypeBucketCheckbox = React.memo(function FileTypeBucketCheckbox(props){
    const { fileType, onFileTypeClick, files, fileTypeFilters } = props;
    const selected = Array.isArray(fileTypeFilters) && fileTypeFilters.indexOf(fileType) > -1;
    const filesLength = files.length;
    const cls = "text-truncate" + (selected ? ' is-active' : '');
    function onChange(evt){ onFileTypeClick(fileType); }

    let title;
    if (typeof fileType === 'undefined' || fileType === 'other' || fileType === 'undefined'){
        title = "Other";
    } else {
        title = Schemas.Term.toName('files.file_type_detailed', fileType);
    }

    const tip = (
        (selected ? 'Remove ' : 'Include ')
        + filesLength + ' ' + title + ' files' +
        (selected ? ' from ' : ' to ') + 'selection.'
    );

    return (
        <div className="col-sm-6 col-lg-4 file-type-checkbox" key={fileType} data-tip={tip}>
            <Checkbox key={fileType} checked={selected} onChange={onChange} className={cls}>
                { title } <sub>({ filesLength })</sub>
            </Checkbox>
        </div>
    );
});


export class SelectedFilesFilterByContent extends React.PureComponent {

    /**
     * @param {Object} format_buckets               File Type Details (keys) + lists of files (values)
     * @param {function} onFileTypeClick            Function to handle button click. Accepts fileTypeDetail as first param before MouseEvt.
     * @param {string[]|null} fileTypeFilters       List of currently filtered-in filetype, if any.
     * @returns {JSX.Element[]} List of JSX Button elements.
     */
    static renderFileFormatButtonsFromBuckets(format_buckets, onFileTypeClick, fileTypeFilters){
        return _.map(_.sortBy(_.pairs(format_buckets), function([fileType, filesForType]){ return -filesForType.length; }), function([fileType, files]){
            return <FileTypeBucketCheckbox {...{ fileType, onFileTypeClick, files, fileTypeFilters }} key={fileType} />;
        });
    }

    /**
     * Converts `selectedFiles` structure into groups of `file_type_detailed` property.
     * Also uniqs the files in order to align with download button count & quick info bar.
     *
     * @param {Object.<Item>} selectedFiles - Object of files, keyed by accession triple string.
     * @returns {Object.<Item>} Object of files, keyed by `file_type_detailed` property,
     */
    static filesToFileTypeBuckets = memoize(function(selectedFiles){
        const selectedFilesUniqueList = _.uniq(_.values(selectedFiles), false, 'accession');
        return _.groupBy(selectedFilesUniqueList, 'file_type_detailed');
    });

    static propTypes = {
        'selectedFiles' : PropTypes.object.isRequired,
        'currentFileTypeFilters' : PropTypes.arrayOf(PropTypes.string).isRequired,
        'setFileTypeFilters' : PropTypes.func.isRequired,
        'onClosePanel' : PropTypes.func
    };

    constructor(props){
        super(props);
        this.onClick = this.onClick.bind(this);
    }

    /** Adds `filterString` to filters if not present, else removes it. */
    onClick(filterString, evt){
        const { currentFileTypeFilters, setFileTypeFilters } = this.props;
        const fileTypeFilters = currentFileTypeFilters.slice(0);
        const indexOfNewFilter = fileTypeFilters.indexOf(filterString);
        if (indexOfNewFilter < 0){ // Append
            fileTypeFilters.push(filterString);
        } else { // Remove
            fileTypeFilters.splice(indexOfNewFilter, 1);
        }
        setFileTypeFilters(fileTypeFilters);
    }

    render(){
        const { selectedFiles, currentFileTypeFilters } = this.props;
        if (!selectedFiles) return null;
        const fileTypeButtons = SelectedFilesFilterByContent.renderFileFormatButtonsFromBuckets(
            SelectedFilesFilterByContent.filesToFileTypeBuckets(selectedFiles),
            this.onClick,
            currentFileTypeFilters
        );
        return <div className="row">{ fileTypeButtons }</div>;
    }

}


const SelectedFilesFilterByButton = React.memo(function SelectedFilesFilterByButton(props){
    const { selectedFiles, currentFileTypeFilters, onFilterFilesByClick, active } = props;
    const isDisabled = !selectedFiles || _.keys(selectedFiles).length === 0;
    const currentFiltersLength = currentFileTypeFilters.length;
    const tooltip = "<div class='text-center'>Filter down selected files based on their file type.<br/>(does not affect checkboxes below)</div>";
    const cls = "btn btn-primary" + (active ? " active" : "");

    return (
        <button type="button" id="selected-files-file-type-filter-button" className={cls} onClick={onFilterFilesByClick}
            key="filter-selected-files-by" disabled={isDisabled} active={active.toString()} data-tip={tooltip} data-html>
            <i className="icon icon-filter fas icon-fw mr-05" style={{ opacity : currentFiltersLength > 0 ? 1 : 0.75 }}/>
            {
                currentFiltersLength > 0 ? <span>{ currentFiltersLength } </span> : (
                    <span className="d-none d-lg-inline">All </span>
                )
            }
            <span className="text-400 d-none d-lg-inline mr-05">{ "File Type" + (currentFiltersLength === 1 ? '' : 's') }</span>
            <i className="icon icon-angle-down icon-fw fas"/>
        </button>
    );
});


export const SelectedFilesControls = React.memo(function SelectedFilesControls(props){
    const {
        href, context, session,
        selectedFiles, subSelectedFiles,
        currentFileTypeFilters,
        setFileTypeFilters,
        barplot_data_filtered,
        barplot_data_unfiltered,
        currentOpenPanel
    } = props;
    const selectedFileProps = SelectedFilesController.pick(props);

    let totalUniqueAllFilesCount = 0, totalUniqueRawFilesCount = 0, totalUniqueProcessedFilesCount = 0, totalUniqueOPFCount = 0;
    if (Array.isArray(context['@type']) && context['@type'].indexOf('FileSearchResults') > -1) {
        totalUniqueAllFilesCount = context.total || 0;
    } else {
        const barPlotData = (barplot_data_filtered || barplot_data_unfiltered);
        // This gets unique file count from ES aggs. In future we might be able to get total including
        // duplicates, in which case should change up logic downstream from this component for e.g. `isAllSelected`
        // in SelectAllFilesButton & similar.
        if (barPlotData && barPlotData.total) {
            totalUniqueAllFilesCount = barPlotData.total.files || 0;
            totalUniqueRawFilesCount = barPlotData.total.files_raw || 0;
            totalUniqueProcessedFilesCount = barPlotData.total.files_processed || 0;
            totalUniqueOPFCount = barPlotData.total.files_opf || 0;
        }
    }

    return (
        // This rendered within a row by AboveTableControlsBase.js
        // TODO maybe refactor some of this stuff to be simpler.
        <div className="col">
            <SelectAllFilesButton {...selectedFileProps} {...{ href, context }} totalFilesCount={totalUniqueAllFilesCount}
                totalRawFilesCount={totalUniqueRawFilesCount} totalProcessedFilesCount={totalUniqueProcessedFilesCount} totalOPFCount={totalUniqueOPFCount} />
            <div className="pull-left box selection-buttons">
                <div className="btn-group">
                    <BrowseViewSelectedFilesDownloadButton {...{ selectedFiles, subSelectedFiles, context, session }} totalFilesCount={totalUniqueAllFilesCount} />
                    <SelectedFilesFilterByButton totalFilesCount={totalUniqueAllFilesCount} onFilterFilesByClick={props.panelToggleFxns.filterFilesBy}
                        active={currentOpenPanel === "filterFilesBy"} // <- must be boolean
                        {...selectedFileProps} {...{ currentFileTypeFilters, setFileTypeFilters, currentOpenPanel }} />
                </div>
            </div>
        </div>
    );
});

const SelectAllSplitButton = React.memo(function SelectAllSplitButton(props){
    const { onClick, buttonId = '', options: propOptions, disabled, isAllSelected, iconClassName, tooltip, hideToggle = false } = props;

    const title = (
        <React.Fragment>
            <i className={iconClassName} />
            <span className="d-none d-md-inline text-400">{isAllSelected ? 'Deselect' : 'Select'} </span>
            <span className="text-600">All</span>
        </React.Fragment>
    );

    const options = _.filter(propOptions, function (opt) { return !opt.hidden; });
    const variant = isAllSelected ? 'outline-primary' : 'primary';

    const handleButtonClick = function () {
        if (typeof onClick === 'function')
            onClick();
    };

    const handleMenuItemClick = function (key) {
        if (typeof onClick === 'function')
            onClick(key);
    };

    return (
        <Dropdown as={ButtonGroup}>
            <Button id={buttonId} variant={variant} data-tip={tooltip} onClick={handleButtonClick} disabled={disabled}>{title}</Button>
            {!hideToggle &&
                <React.Fragment>
                    <Dropdown.Toggle split variant={variant} disabled={disabled} />
                    <Dropdown.Menu>
                        {
                            options.map((item, index) => (
                                <Dropdown.Item key={index} disabled={item.disabled} onClick={() => handleMenuItemClick(item.key)}>
                                    <span className={null}>
                                        <i className={item.iconClassName || iconClassName} />&nbsp;  {item.label}
                                    </span>
                                </Dropdown.Item>
                            ))
                        }
                    </Dropdown.Menu>
                </React.Fragment>
            }
        </Dropdown>
    );
});
