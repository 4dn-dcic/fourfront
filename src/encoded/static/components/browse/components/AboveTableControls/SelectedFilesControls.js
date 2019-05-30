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
import { wrapInAboveTablePanel } from './wrapInAboveTablePanel';
import { BrowseViewSelectedFilesDownloadButton } from './SelectedFilesDownloadButton';

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
        'processed_files.uuid',

        'experiments_in_set.accession',

        'experiments_in_set.files.accession',
        'experiments_in_set.files.file_type_detailed',
        'experiments_in_set.files.paired_end',
        'experiments_in_set.files.uuid',
        'experiments_in_set.files.related_files.file.accession',

        'experiments_in_set.processed_files.accession',
        'experiments_in_set.processed_files.file_type_detailed',
        'experiments_in_set.processed_files.uuid'
    ];

    constructor(props){
        super(props);
        this.handleSelect = this.handleSelect.bind(this);
        this.state = { 'selecting' : false };
    }

    isEnabled(){
        const { totalFilesCount } = this.props;
        if (!totalFilesCount) return true;
        if (totalFilesCount > 8000) return false;
        return true;
    }

    isAllSelected(){
        const { totalFilesCount, selectedFilesUniqueCount } = this.props;
        if (!totalFilesCount) return false;
        if (totalFilesCount === selectedFilesUniqueCount){
            return true;
        }
        return false;
    }

    handleSelect(evt){
        const { selectFile, resetSelectedFiles, href, includeProcessedFiles } = this.props;
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
                    var allFiles = _.reduce(resp['@graph'] || [], (m,v) => m.concat(allFilesFromExperimentSet(v, includeProcessedFiles)), []);
                    // Some processed files may not have a 'from_experiment' property (redundant check temp), so we put in a dummy one to be able to generate a unique selector.
                    allFiles = _.map(allFiles, function(file){
                        if (typeof file.from_experiment === 'undefined'){
                            return _.extend({}, file, {
                                'from_experiment' : {
                                    'accession' : "NONE",
                                    'from_experiment_set' : file.from_experiment_set
                                }
                            });
                        }
                        return file;
                    });
                    var filesToSelect = _.zip(filesToAccessionTriples(allFiles, true), allFiles);
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
                    <Button id="select-all-files-button" disabled={selecting || (!isAllSelected && !isEnabled)} className="btn-secondary" onClick={this.handleSelect}>
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
    const tip = (
        (selected ? 'Remove ' : 'Include ')
        + filesLength + ' ' + title + ' files' +
        (selected ? ' from ' : ' to ') + 'selection.'
    );

    let title;
    if (typeof fileType === 'undefined' || fileType === 'other' || fileType === 'undefined'){
        title = "Other";
    } else {
        title = Schemas.Term.toName('files.file_type_detailed', fileType);
    }

    return (
        <div className="col-sm-6 col-lg-3 file-type-checkbox" key={fileType} data-tip={tip}>
            <Checkbox key={fileType} checked={selected}
                onChange={onFileTypeClick ? onFileTypeClick.bind(onFileTypeClick, fileType) : null}
                className={"text-ellipsis-container" + (selected ? ' is-active' : '')}>
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

    /**
     * @constant
     * @ignore
     */
    static propTypes = {
        'selectedFiles' : PropTypes.object.isRequired,
        'currentFileTypeFilters' : PropTypes.arrayOf(PropTypes.string).isRequired,
        'setFileTypeFilters' : PropTypes.func.isRequired,
        'closeButtonClickHandler' : PropTypes.func
    };

    /**
     * @constant
     * @ignore
     */
    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    };

    /**
     * @constant
     * @ignore
     */
    constructor(props){
        super(props);
        this.onClick = this.onClick.bind(this);
    }

    renderFileFormatButtonsSelected(){
        const { selectedFiles, currentFileTypeFilters } = this.props;
        if (!selectedFiles) return null;
        return SelectedFilesFilterByContent.renderFileFormatButtonsFromBuckets(
            SelectedFilesFilterByContent.filesToFileTypeBuckets(selectedFiles),
            this.onClick,
            currentFileTypeFilters
        );
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
        return wrapInAboveTablePanel(
            <div className="row" children={this.renderFileFormatButtonsSelected()}/>,
            <span><i className="icon icon-fw icon-filter"/> Filter Selection by File Type</span>,
            'file-type-selector-panel',
            this.props.closeButtonClickHandler
        );
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

    return (
        <div>
            <SelectAllFilesButton {..._.pick(props, 'href', 'selectedFilesUniqueCount', 'selectedFiles', 'selectFile',
                'unselectFile', 'resetSelectedFiles', 'includeProcessedFiles')} totalFilesCount={totalFilesCount} />
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <BrowseViewSelectedFilesDownloadButton {..._.pick(props, 'selectedFiles', 'subSelectedFiles', 'selectedFilesUniqueCount')}
                        totalFilesCount={totalFilesCount} />
                    <SelectedFilesFilterByButton {..._.pick(props, 'setFileTypeFilters', 'currentFileTypeFilters',
                        'selectedFiles', 'selectFile', 'unselectFile', 'resetSelectedFiles', 'onFilterFilesByClick',
                        'currentOpenPanel' )} totalFilesCount={totalFilesCount} />
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
