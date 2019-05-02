'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import memoize from 'memoize-one';
import ReactTooltip from 'react-tooltip';
import moment from 'moment';
import { ButtonGroup, Checkbox, Button } from 'react-bootstrap';
import { Schemas, DateUtility, ajax, JWT, typedefs } from './../../../util';
import { allFilesFromExperimentSet, filesToAccessionTriples } from './../../../util/experiments-transforms';
import * as vizUtil from './../../../viz/utilities';
import { wrapInAboveTablePanel } from './wrapInAboveTablePanel';
import { BrowseViewSelectedFilesDownloadButton } from './SelectedFilesDownloadButton';

var { Item } = typedefs;



export class SelectAllFilesButton extends React.PureComponent {

    static fileFormatButtonProps = {
        'bsStyle' : "primary",
        'bsSize' : 'small'
    }

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
        this.state = {
            'selecting' : false
        };
    }

    isEnabled(){
        if (!this.props.totalFilesCount) return true;
        if (this.props.totalFilesCount > 8000) return false;
        return true;
    }

    isAllSelected(){
        var { totalFilesCount, selectedFiles, selectedFilesUniqueCount } = this.props;
        if (!totalFilesCount) return false;
        if (totalFilesCount === selectedFilesUniqueCount){
            return true;
        }
        return false;
    }

    handleSelect(evt){
        if (typeof this.props.selectFile !== 'function' || typeof this.props.resetSelectedFiles !== 'function'){
            throw new Error("No 'selectFiles' or 'resetSelectedFiles' function prop passed to SelectedFilesController.");
        }

        var isAllSelected = this.isAllSelected();

        this.setState({ 'selecting' : true }, () => vizUtil.requestAnimationFrame(()=>{
            if (!isAllSelected){
                var currentHrefParts = url.parse(this.props.href, true);
                var currentHrefQuery = _.extend({}, currentHrefParts.query);
                currentHrefQuery.field = SelectAllFilesButton.fieldsToRequest;
                currentHrefQuery.limit = 'all';
                var reqHref = currentHrefParts.pathname + '?' + queryString.stringify(currentHrefQuery);
                ajax.load(reqHref, (resp)=>{
                    var allFiles = _.reduce(resp['@graph'] || [], (m,v) => m.concat(allFilesFromExperimentSet(v, this.props.includeProcessedFiles)), []);
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
                    this.props.selectFile(filesToSelect);
                    this.setState({ 'selecting' : false });
                });
            } else {
                this.props.resetSelectedFiles();
                this.setState({ 'selecting' : false });
            }
        }));
    }

    buttonContent(isAllSelected){
        if (typeof isAllSelected === 'undefined') isAllSelected = this.isAllSelected();
        const iconClassName = "mr-05 icon icon-fw shift-down-1 icon-" + (this.state.selecting ? 'circle-o-notch icon-spin' : (isAllSelected ? 'square-o' : 'check-square-o'));
        return (
            <React.Fragment>
                <i className={iconClassName}/>
                <span className="text-400">{ isAllSelected ? 'Deselect' : 'Select' } </span>
                <span className="text-600">All</span>
            </React.Fragment>
        );
    }

    render(){
        var isAllSelected = this.isAllSelected(),
            isEnabled = this.isEnabled(),
            selecting = this.state.selecting;

        return (
            <div className="pull-left box selection-buttons">
                <ButtonGroup>
                    <Button id="select-all-files-button" disabled={selecting || (!isAllSelected && !isEnabled)} className="btn-secondary" onClick={this.handleSelect} children={this.buttonContent(isAllSelected)} />
                </ButtonGroup>
            </div>
        );
    }
}

export class SelectedFilesFilterByContent extends React.PureComponent {

    /**
     * @todo Refactor/remove need to supply renderer function, maybe.
     *
     * @param {Object} format_buckets               File Type Details (keys) + lists of files (values)
     * @param {string} [button_text_prefix='']      Title to pre-pend to buttons.
     * @param {function} clickHandler               Function to handle button click. Accepts fileTypeDetail as first param before MouseEvt.
     * @param {function} renderer                   Function to render checkbox or button to return a JSX element. Should be one of `renderBucketButton` or `renderBucketCheckbox`.
     * @param {string[]|null} fileTypeFilters       List of currently filtered-in filetype, if any.
     * @returns {JSX.Element[]} List of JSX Button elements.
     */
    static renderFileFormatButtonsFromBuckets(format_buckets, button_text_prefix = '', clickHandler, renderer, fileTypeFilters){
        return _.sortBy(_.pairs(format_buckets), function(p){ return -p[1].length; }).map(function(pairs){
            var fileTypeDetail = pairs[0],
                files = pairs[1],
                title;

            if (typeof fileTypeDetail === 'undefined' || fileTypeDetail === 'other' || fileTypeDetail === 'undefined'){
                title = "Other";
            } else {
                title = Schemas.Term.toName('files.file_type_detailed', fileTypeDetail);
            }
            return renderer(fileTypeDetail, title, clickHandler, files, button_text_prefix, fileTypeFilters);
        });
    }

    /**
     * Converts `selectedFiles` structure into groups of `file_type_detailed` property.
     *
     * @param {Object.<Item>} files - Object of files, keyed by accession triple string.
     * @returns {Object.<Item>} Object of files, keyed by `file_type_detailed` property,
     */
    static filesToFileTypeBuckets(files){
        return _.groupBy(
            _.map(_.pairs(files), function([accessionTripleString, file]){
                return _.extend({ 'selection_id' : accessionTripleString }, file);
            }),
            'file_type_detailed'
        );
    }

    static renderBucketButton(fileType, title, clickHandler, files, button_text_prefix = '', fileTypeFilters){
        return (
            <Button
                key={'button-to-select-files-for' + fileType} {...SelectedFilesFilterByContent.fileFormatButtonProps}
                onClick={clickHandler ? clickHandler.bind(clickHandler, fileType) : null}>
                { button_text_prefix }{ title } files <small>({ files.length })</small>
            </Button>
        );
    }

    static renderBucketCheckbox(fileType, title, clickHandler, files, button_text_prefix, fileTypeFilters){
        var selected = Array.isArray(fileTypeFilters) && fileTypeFilters.indexOf(fileType) > -1,
            filesLength = files.length,
            tip = (
                (selected ? 'Remove ' : 'Include ')
                + filesLength + ' ' + title + ' files' +
                (selected ? ' from ' : ' to ') + 'selection.'
            );
        return (
            <div className="col-sm-6 col-lg-3 file-type-checkbox" key={fileType} data-tip={tip}>
                <Checkbox key={fileType} checked={selected}
                    onChange={clickHandler ? clickHandler.bind(clickHandler, fileType) : null}
                    className={"text-ellipsis-container" + (selected ? ' is-active' : '')}>
                    { button_text_prefix }{ title } <sub>({ filesLength })</sub>
                </Checkbox>
            </div>
        );
    }

    /**
     * @constant
     * @ignore
     */
    static propTypes = {
        selectedFiles : PropTypes.object.isRequired
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
        var { selectedFiles, currentFileTypeFilters } = this.props;
        if (!selectedFiles) return null;
        return SelectedFilesFilterByContent.renderFileFormatButtonsFromBuckets(
            SelectedFilesFilterByContent.filesToFileTypeBuckets(selectedFiles),
            '',
            this.onClick,
            SelectedFilesFilterByContent.renderBucketCheckbox,
            currentFileTypeFilters
        );
    }

    onClick(filterString, evt){
        var fileTypeFilters = this.props.currentFileTypeFilters.slice(0);
        var indexOfNewFilter = fileTypeFilters.indexOf(filterString);
        if (indexOfNewFilter < 0){
            fileTypeFilters.push(filterString);
        } else {
            fileTypeFilters = fileTypeFilters.slice(0, indexOfNewFilter).concat(fileTypeFilters.slice(indexOfNewFilter + 1));
        }
        this.props.setFileTypeFilters(fileTypeFilters);
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


export class SelectedFilesFilterByButton extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'filerByPanelOpen' : false
        };
    }

    render(){
        var { selectedFiles, currentFileTypeFilters, onFilterFilesByClick, currentOpenPanel } = this.props,
            isDisabled              = !selectedFiles || _.keys(selectedFiles).length === 0,
            currentFiltersLength    = currentFileTypeFilters.length,
            tooltip                 = "<div class='text-center'>Filter down selected files based on their file type.<br/>(does not affect checkboxes below)</div>";

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
    }
}

export class SelectedFilesControls extends React.PureComponent {

    static filterSelectedFilesByFileTypeFilters = memoize(function(selectedFiles, fileTypeFilters){
        if (Array.isArray(fileTypeFilters) && fileTypeFilters.length === 0) return selectedFiles;
        return _.object(
            _.filter(
                _.pairs(selectedFiles),
                function(p, i){
                    if (fileTypeFilters.indexOf(p[1].file_type_detailed) > -1) return true;
                    return false;
                }
            )
        );
    });

    render(){
        const { barplot_data_filtered, barplot_data_unfiltered, selectedFiles, subSelectedFiles }  = this.props;
        const barPlotData = (barplot_data_filtered || barplot_data_unfiltered);
        const totalFilesCount = (barPlotData && barPlotData.total && barPlotData.total.files) || 0;

        return (
            <div>
                <SelectAllFilesButton {..._.pick(this.props, 'href', 'selectedFilesUniqueCount', 'selectedFiles', 'selectFile',
                    'unselectFile', 'resetSelectedFiles', 'includeProcessedFiles')} totalFilesCount={totalFilesCount} />
                <div className="pull-left box selection-buttons">
                    <ButtonGroup>
                        <BrowseViewSelectedFilesDownloadButton {..._.pick(this.props, 'selectedFiles', 'subSelectedFiles', 'selectedFilesUniqueCount')}
                            totalFilesCount={totalFilesCount} />
                        <SelectedFilesFilterByButton {..._.pick(this.props, 'setFileTypeFilters', 'currentFileTypeFilters',
                            'selectedFiles', 'selectFile', 'unselectFile', 'resetSelectedFiles', 'onFilterFilesByClick',
                            'currentOpenPanel' )} totalFilesCount={totalFilesCount} />
                    </ButtonGroup>
                </div>
            </div>
        );
    }
}
