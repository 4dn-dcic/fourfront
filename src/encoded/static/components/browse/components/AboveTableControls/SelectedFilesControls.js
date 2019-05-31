'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import memoize from 'memoize-one';
import { ButtonGroup, Checkbox, Button } from 'react-bootstrap';
import { Schemas, ajax, typedefs } from './../../../util';
import { allFilesFromExperimentSet, filesToAccessionTriples } from './../../../util/experiments-transforms';
import * as vizUtil from './../../../viz/utilities';
import { BrowseViewSelectedFilesDownloadButton } from './SelectedFilesDownloadButton';
import { uniqueFileCount, SelectedFilesController } from './../SelectedFilesController';

// eslint-disable-next-line no-unused-vars
const { Item } = typedefs;



export class SelectAllFilesButton extends React.PureComponent {

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    };

    /** These are fields included when "Select All" button is clicked to AJAX all files in */
    static fieldsToRequest = [
        'accession',
        'produced_in_pub.display_title',

        'processed_files.accession',
        'processed_files.file_type_detailed',

        'experiments_in_set.accession',

        'experiments_in_set.files.accession',
        'experiments_in_set.files.file_type_detailed',

        'experiments_in_set.processed_files.accession',
        'experiments_in_set.processed_files.file_type_detailed',
    ];

    constructor(props){
        super(props);
        this.handleSelectAll = this.handleSelectAll.bind(this);
        this.state = { 'selecting' : false };
    }

    isEnabled(){
        const { totalFilesCount } = this.props;
        if (!totalFilesCount) return true;
        if (totalFilesCount > 8000) return false;
        return true;
    }

    isAllSelected(){
        const { totalFilesCount, selectedFiles } = this.props;
        if (!totalFilesCount) return false;
        // totalFilesCount as returned from bar plot aggs at moment is unique.
        if (totalFilesCount === uniqueFileCount(selectedFiles)){
            return true;
        }
        return false;
    }

    handleSelectAll(evt){
        const { selectFile, resetSelectedFiles, href } = this.props;
        if (typeof selectFile !== 'function' || typeof resetSelectedFiles !== 'function'){
            throw new Error("No 'selectFiles' or 'resetSelectedFiles' function prop passed to SelectedFilesController.");
        }

        var isAllSelected = this.isAllSelected();

        this.setState({ 'selecting' : true }, () => vizUtil.requestAnimationFrame(()=>{
            if (!isAllSelected){
                var currentHrefParts = url.parse(href, true);
                var currentHrefQuery = _.extend({}, currentHrefParts.query);
                currentHrefQuery.field = SelectAllFilesButton.fieldsToRequest;
                currentHrefQuery.limit = 'all';
                var reqHref = currentHrefParts.pathname + '?' + queryString.stringify(currentHrefQuery);
                ajax.load(reqHref, (resp)=>{
                    const allExtendedFiles = _.reduce(resp['@graph'] || [], (m,v) => m.concat(allFilesFromExperimentSet(v, true)), []);
                    const filesToSelect = _.zip(filesToAccessionTriples(allExtendedFiles, true), allExtendedFiles);
                    selectFile(filesToSelect);
                    this.setState({ 'selecting' : false });
                });
            } else {
                resetSelectedFiles();
                this.setState({ 'selecting' : false });
            }
        }));
    }

    render(){
        const { selecting } = this.state;
        const isAllSelected = this.isAllSelected();
        const isEnabled = this.isEnabled();
        const iconClassName = "mr-05 icon icon-fw shift-down-1 icon-" + (selecting ? 'circle-o-notch icon-spin' : (isAllSelected ? 'square-o' : 'check-square-o'));

        return (
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <Button id="select-all-files-button" disabled={selecting || (!isAllSelected && !isEnabled)} className="btn-secondary" onClick={this.handleSelectAll}>
                        <i className={iconClassName}/>
                        <span className="text-400">{ isAllSelected ? 'Deselect' : 'Select' } </span>
                        <span className="text-600">All</span>
                    </Button>
                </ButtonGroup>
            </div>
        );
    }
}


const FileTypeBucketCheckbox = React.memo(function FileTypeBucketCheckbox(props){
    const { fileType, onFileTypeClick, files, fileTypeFilters } = props;
    const selected = Array.isArray(fileTypeFilters) && fileTypeFilters.indexOf(fileType) > -1;
    const filesLength = files.length;
    const cls = "text-ellipsis-container" + (selected ? ' is-active' : '');
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
     *
     * @param {Object.<Item>} selectedFiles - Object of files, keyed by accession triple string.
     * @returns {Object.<Item>} Object of files, keyed by `file_type_detailed` property,
     */
    static filesToFileTypeBuckets = memoize(function(selectedFiles){
        return _.groupBy(
            _.map(_.pairs(selectedFiles), function([accessionTripleString, file]){
                return _.extend({ 'selection_id' : accessionTripleString }, file);
            }),
            'file_type_detailed'
        );
    });

    static propTypes = {
        'selectedFiles' : PropTypes.object.isRequired,
        'currentFileTypeFilters' : PropTypes.arrayOf(PropTypes.string).isRequired,
        'setFileTypeFilters' : PropTypes.func.isRequired,
        'closeButtonClickHandler' : PropTypes.func
    };

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
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

    const { selectedFiles, currentFileTypeFilters, onFilterFilesByClick, currentOpenPanel } = props;
    const isDisabled = !selectedFiles || _.keys(selectedFiles).length === 0;
    const currentFiltersLength = currentFileTypeFilters.length;
    const tooltip = "<div class='text-center'>Filter down selected files based on their file type.<br/>(does not affect checkboxes below)</div>";

    return (
        <Button id="selected-files-file-type-filter-button" className="btn-secondary" key="filter-selected-files-by" disabled={isDisabled}
            onClick={onFilterFilesByClick} active={currentOpenPanel === 'filterFilesBy'} data-tip={tooltip} data-html>
            <i className="icon icon-filter icon-fw mr-05" style={{ opacity : currentFiltersLength > 0 ? 1 : 0.75 }}/>
            {
                currentFiltersLength > 0 ? <span>{ currentFiltersLength } </span> : (
                    <span className="hidden-xs hidden-sm">All </span>
                )
            }
            <span className="text-400 hidden-xs hidden-sm mr-05">File Type{ currentFiltersLength === 1 ? '' : 's' }</span>
            <i className="icon icon-angle-down icon-fw"/>
        </Button>
    );
});


export const SelectedFilesControls = React.memo(function SelectedFilesControls(props){

    const { barplot_data_filtered, barplot_data_unfiltered } = props;
    const barPlotData = (barplot_data_filtered || barplot_data_unfiltered);
    const totalFilesCount = (barPlotData && barPlotData.total && barPlotData.total.files) || 0;
    const selectedFileProps = SelectedFilesController.pick(props);

    return (
        <div>
            <SelectAllFilesButton {..._.extend(_.pick(props, 'href'), selectedFileProps)} totalFilesCount={totalFilesCount} />
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <BrowseViewSelectedFilesDownloadButton {..._.pick(props, 'selectedFiles', 'subSelectedFiles')} totalFilesCount={totalFilesCount} />
                    <SelectedFilesFilterByButton {..._.extend(_.pick(props, 'setFileTypeFilters', 'currentFileTypeFilters',
                        'onFilterFilesByClick', 'currentOpenPanel' ), selectedFileProps)} totalFilesCount={totalFilesCount} />
                </ButtonGroup>
            </div>
        </div>
    );
});

SelectedFilesControls.filterSelectedFilesByFileTypeFilters = memoize(function(selectedFiles, fileTypeFilters){
    if (Array.isArray(fileTypeFilters) && fileTypeFilters.length === 0){
        return selectedFiles;
    }
    const fileTypeFiltersObject = _.object(_.map(fileTypeFilters, function(fltr){ return [fltr, true]; })); // Faster lookups
    return _.object(_.filter(
        _.pairs(selectedFiles),
        function([fileAccessionTriple, filePartialItem], i){
            if (fileTypeFiltersObject[filePartialItem.file_type_detailed]) return true;
            return false;
        }
    ));
});
