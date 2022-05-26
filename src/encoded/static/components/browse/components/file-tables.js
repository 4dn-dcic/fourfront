'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import DropdownButton from 'react-bootstrap/esm/DropdownButton';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';

import { StackedBlockTable, StackedBlock, StackedBlockList, StackedBlockName, StackedBlockNameLabel } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/StackedBlockTable';

import { console, isServerSide, analytics, object, commonFileUtil, navigate, memoizedUrlParse, logger, schemaTransforms, valueTransforms } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

import { FileEntryBlock, FilePairBlock, FileHeaderWithCheckbox, handleFileCheckboxChangeFxn } from './FileEntryBlock';
import { SelectedFilesController } from './SelectedFilesController';
import { expFxn, Schemas, typedefs, fileUtil } from './../../util';




/** @todo: Maybe split out file-tables.js into a directory. Split FileColumnActionsBtn into multiple functional components. */
class FileColumnActionsBtn extends React.PureComponent {

    static hostFromHref = memoize(function(href){
        const hrefParts = (href && memoizedUrlParse(href)) || null;
        const host = hrefParts && (
            (hrefParts.protocol || '') +
            (hrefParts.hostname ? '//' +  hrefParts.hostname + (hrefParts.port ? ':' + hrefParts.port : '') : '')
        );
        return host || null;
    });

    // N.B. This map is replicated in /item-pages/FileView.js - potential todo: import from there or move to fileUtil (util/file.js)
    static epiGenomeAssemblyMapping = {
        'GRCh38' : 'hg38',
        'GRCm38' : 'mm10'
    };

    constructor(props){
        super(props);
        this.isFileHIC = this.isFileHIC.bind(this);
        this.higlassButton = this.higlassButton.bind(this);
        this.juiceboxButton = this.juiceboxButton.bind(this);
        this.epigenomeButton = this.epigenomeButton.bind(this);
    }

    isFileHIC(){
        const file = this.props.file;
        const fileFormat = commonFileUtil.getFileFormatStr(file);
        return (file && file.href && (
            // Needs an href + either it needs a file format of 'hic' OR it has a detailed file type that contains 'hic'
            (fileFormat && fileFormat === 'hic')
            || (file.file_type_detailed && file.file_type_detailed.indexOf('(hic)') > -1)
        ));
    }

    higlassButton(otherBtnsExist = false){
        const { file } = this.props;

        // Need to embed these selectively-ish.. todo later maybe.
        const higlassViewConfSection = _.find(file.static_content || [], function(sc){
            if (sc.location !== 'tab:higlass' || !sc.content) return false;
            if (!Array.isArray(sc.content['@type'])) return false;
            if (sc.content['@type'].indexOf("HiglassViewConfig") > -1){
                return true;
            }
            return false;
        });

        const higlassViewConfAtId = higlassViewConfSection && object.itemUtil.atId(higlassViewConfSection.content);

        if (!higlassViewConfSection) return null;

        function onClick(){
            navigate(higlassViewConfAtId);
        }

        if (otherBtnsExist){
            return (
                <DropdownItem data-tip="Visualize this file using the HiGlass Browser" onClick={onClick} key="higlass">
                    HiGlass
                </DropdownItem>
            );
        } else {
            return (
                <div className="in-stacked-table-button-container" style={{ 'position' : 'relative', 'zIndex' : 2 }}>
                    <button type="button" className="btn btn-xs btn-primary in-stacked-table-button"
                        data-tip="Visualize with HiGlass" onClick={onClick}>
                        <i className="icon icon-fw icon-tv fas"/>
                    </button>
                </div>
            );
        }

    }

    juiceboxButton(){
        const { file } = this.props;
        const { open_data_url } = file || {};

        // open_data_url should exist to render the button
        if (!open_data_url) return null;

        // Juicebox & epigenome browser can only viz HIC files at moment?
        if (!this.isFileHIC()){
            return null;
        }

        function onClick(){
            // If we're server-side, there is access to the global browser window object/API.
            if (isServerSide()) return null;
            var targetLocation = "http://aidenlab.org/juicebox/?hicUrl=" + open_data_url;
            var win = window.open(targetLocation, '_blank');
            win.focus();
        }

        return (
            <DropdownItem data-tip="Visualize this file in TCGA's JuiceBox Browser" onClick={onClick} key="juicebox" className="text-left">
                JuiceBox <i className="icon icon-fw icon-external-link-alt text-smaller fas"/>
            </DropdownItem>
        );

    }

    epigenomeButton(){
        const { file } = this.props;
        const { open_data_url } = file || {};

        const genomeAssembly = file.genome_assembly || null;
        const epiGenomeMapping = (genomeAssembly && FileColumnActionsBtn.epiGenomeAssemblyMapping[genomeAssembly]) || null;

        // If the file lacks a genome assembly or it isn't in the expected mappings, do not show the button.
        if (!epiGenomeMapping || !open_data_url) return null; // Needed for a link to be made

        if (!this.isFileHIC()){ // Juicebox & epigenome browser can only viz HIC files at moment?
            return null;
        }

        function onClick(){
            // If we're server-side, there is access to the global browser window object/API.
            if (isServerSide()) return null;
            var targetLocation  = "http://epigenomegateway.wustl.edu/browser/?genome=" + epiGenomeMapping + "&hicUrl=" + open_data_url;
            var win = window.open(targetLocation, '_blank');
            win.focus();
        }

        return (
            <DropdownItem data-tip="Visualize this file in WashU Epigenome Browser" onClick={onClick} key="epigenome" className="text-left">
                Epigenome Browser <i className="icon icon-fw icon-external-link-alt text-smaller fas"/>
            </DropdownItem>
        );
    }

    render(){
        const { file, href } = this.props;
        const fileIsPublic = (file.status === 'archived' || file.status === 'released');
        if (!fileIsPublic){ // If not public, then 3rd-party service such as JuiceBox cannot access file to viz it.
            const higlassBtn = this.higlassButton(false);
            return higlassBtn || null;
        }

        //const higlassBtn = this.higlassButton();
        const juiceboxBtn = this.juiceboxButton();
        const epigenomeBtn = this.epigenomeButton();
        const hasJBOrEpigenomeBtn = !!(juiceboxBtn || epigenomeBtn);

        // We are likely to have either juicebox+epigenome btn _or_ higlassBtn.
        const higlassBtn = this.higlassButton(hasJBOrEpigenomeBtn);

        if (hasJBOrEpigenomeBtn){
            return (
                <DropdownButton className="in-stacked-table-button-container" variant="primary" data-tip="Visualize this file..."
                    data-place="right" title={<i className="icon icon-fw icon-tv fas"/>} drop="up" size="xs">
                    { juiceboxBtn }{ epigenomeBtn }{ higlassBtn }
                </DropdownButton>
            );
        } else if (higlassBtn) {
            return higlassBtn;
        } else {
            return null;
        }
    }
}

/**
 * Renderer for "columnClass" : "file" column definition.
 * It takes a different param signature than ordinary file-detail columns, which accept `file`, `fieldName`, `headerIndex`, and `fileEntryBlockProps`.
 *
 * @todo (MAYBE) Create a new file and put this as well as FileEntryBlocks into it (?)
 * @returns {?JSX.Element}
 */
export function renderFileTitleColumn(file, field, detailIndex, fileEntryBlockProps){
    const fileAtId = file && object.itemUtil.atId(file);
    if (!fileAtId) return <em>No file available</em>;

    var fileTitleString;
    if (file.accession) {
        fileTitleString = file.accession;
    } else {
        var idParts = _.filter(fileAtId.split('/'));
        if (idParts[1].slice(0,5) === '4DNFI'){
            fileTitleString = idParts[1];
        } else {
            fileTitleString = fileAtId;
        }
    }

    const className = 'title-of-file' + (file.accession ? ' text-monospace' : '');

    /**
     * Allow these file rows to be dragged to other places.
     * @todo Move to file-tables.js if removing higlass-related stuff.
     */
    function onDragStart(evt){
        if (!evt || !evt.dataTransfer) return;
        var windowHrefParts = window && window.location;
        if (windowHrefParts && windowHrefParts.protocol && windowHrefParts.hostname){
            var formedURL = (
                (hrefParts.protocol || '') +
                (hrefParts.hostname ? '//' +  hrefParts.hostname + (hrefParts.port ? ':' + hrefParts.port : '') : '') +
                fileAtId
            );
            evt.dataTransfer.setData('text/plain', formedURL);
            evt.dataTransfer.setData('text/uri-list', formedURL);
        }
        evt.dataTransfer.setData('text/4dn-item-id', fileAtId);
        evt.dataTransfer.setData('text/4dn-item-json', JSON.stringify(file));
    }

    const title = (fileAtId?
        <a href={fileAtId} className={className} onDragStart={onDragStart}>{ fileTitleString }</a>
        :
        <span className={className} onDragStart={onDragStart}>{ fileTitleString }</span>
    );

    return (
        <React.Fragment>
            { title }
            <FileColumnActionsBtn file={file} href={fileEntryBlockProps.href}/>
        </React.Fragment>
    );
}

export function renderFileTypeSummaryColumn(file, field, detailIndex, fileEntryBlockProps){
    const fileFormat = commonFileUtil.getFileFormatStr(file);
    const summary = (
        file.file_type_detailed ||
        ((file.file_type && fileFormat && (file.file_type + ' (' + fileFormat + ')')) || file.file_type) ||
        fileFormat ||
        '-'
    );
    // Remove 'other', if present, because it just takes up horizontal space.
    if (summary.slice(0, 6).toLowerCase() === 'other '){
        return summary.slice(7).slice(0, -1);
    }
    return summary;
}

export function renderFileNotesColumn(file, field, detailIndex, fileEntryBlockProps) {
    const { notes_to_tsv } = file;
    if (notes_to_tsv) {
        return (<span data-tip={notes_to_tsv}><i className="icon icon-fw icon-exclamation-triangle fas" style={{ color: '#e29302' }}></i></span>);
    } else {
        return "-";
    }
}

export function renderFileMicroscopeConfigurationLinkButton(file, field, detailIndex, fileEntryBlockProps) {
    if (!file || !file.microscope_configuration) {
        return '-';
    }
    const href = object.atIdFromObject(file.microscope_configuration);
    if (!href) {
        return '-';
    }
    return (
        <a className="btn btn-xs btn-primary" data-tip="View microscope configuration details"
            href={href}>
            <i className="icon icon-fw icon-microscope fas" />
        </a>
    );
}

export function renderFileQCReportLinkButton(file, field, detailIndex, fileEntryBlockProps){
    if (!file || !file.quality_metric || !file.quality_metric.url){
        return '-';
    }
    const filename = Schemas.Term.toName('quality_metric.url', file.quality_metric.url, false);
    return (
        <a className="btn btn-xs btn-primary" data-tip={"View report - " + filename}
            href={file.quality_metric.url} target="_blank" rel="noopener noreferrer">
            <i className="icon icon-fw icon-file-alt far" />
        </a>
    );
}

export function renderFileQCDetailLinkButton(file, field, detailIndex, fileEntryBlockProps) {
    if (!file || !file.quality_metric) {
        return '-';
    }
    const href = object.atIdFromObject(file.quality_metric);
    if (!href) {
        return '-';
    }
    return (
        <a className="btn btn-xs btn-primary" data-tip="View quality metric details"
            href={href}>
            <i className="icon icon-fw icon-folder-open far" />
        </a>
    );
}

function renderFileHeaderWithCheckbox(stackedBlockProps){
    if (stackedBlockProps.selectedFiles && Array.isArray(stackedBlockProps.allFiles)){
        return (
            <FileHeaderWithCheckbox {..._.pick(stackedBlockProps, 'selectedFiles', 'allFiles', 'handleFileCheckboxChange')}
                data-tip="Select all files in this table">
                File
            </FileHeaderWithCheckbox>
        );
    } else {
        return "File";
    }
}

/**
 * To be used within Experiments Set View/Page, or
 * within a collapsible row on the browse page.
 *
 * Shows experiments only, not experiment sets.
 *
 * Allows either table component itself to control state of "selectedFiles"
 * or for a parentController (passed in as a prop) to take over management
 * of "selectedFiles" Set and "checked", for integration with other pages/UI.
 */


export class RawFilesStackedTable extends React.PureComponent {

    static StackedBlock = StackedBlock

    static builtInHeaders(expSetType = 'replicate'){
        switch (expSetType){
            case 'replicate':
            case 'custom':
            case 'experiment':
                return [
                    { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
                    { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
                    { columnClass: 'file-group',                                title: 'File Group',    initialWidth: 30,   visibleTitle : function(stackedBlockProps){
                        if (stackedBlockProps.selectedFiles && Array.isArray(stackedBlockProps.allFiles)){
                            return <FileHeaderWithCheckbox {..._.pick(stackedBlockProps, 'selectedFiles', 'allFiles', 'handleFileCheckboxChange' )} data-tip="Select all files in this table" />;
                        }
                        return null;
                    } },
                    { columnClass: 'file',                                      title: 'File',          initialWidth: 125,  render: renderFileTitleColumn   }
                ];
            default:
                return [
                    { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
                    { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
                    { columnClass: 'file',          className: 'has-checkbox',  title: 'File',          initialWidth: 125,  render: renderFileTitleColumn, visibleTitle : renderFileHeaderWithCheckbox }
                ];
        }

    }

    /* Built-in headers for props.experimentSetType, extended by any matching title from props.columnHeaders */
    static staticColumnHeaders(columnHeaders, expOrExpSet){
        const expSetType = RawFilesStackedTable.isExperimentSet(expOrExpSet) ? expOrExpSet.experimentset_type : 'experiment';
        return _.map(RawFilesStackedTable.builtInHeaders(expSetType), function(staticCol){
            return _.extend(
                _.clone(staticCol),
                _.findWhere(columnHeaders, { 'title' : staticCol.title }) || {}
            );
        });
    }

    /* Any non built-in (for experimentSetType) headers from props.columnHeaders */
    static customColumnHeaders(columnHeaders, expOrExpSet){
        const expSetType = RawFilesStackedTable.isExperimentSet(expOrExpSet) ? expOrExpSet.experimentset_type : 'experiment';
        return _.filter(columnHeaders, function(col){
            return  !_.contains(_.pluck(RawFilesStackedTable.builtInHeaders(expSetType), 'title'), col.title);
        });
    }

    /**
     * Adds Total Sequences metric column if any raw files in expOrExpSet have a `quality_metric`.
     * Or if param `showMetricColumns` is set to true;
     *
     * @see fileUtil.filterFilesWithEmbeddedMetricItem
     *
     * @param {boolean} showMetricColumns - Skips check for quality_metric and returns column if true.
     * @param {ExperimentSet} expOrExpSet - Experiment or ExperimentSet Item.
     */
    static metricColumnHeaders(showMetricColumns, expOrExpSet){
        const allFiles = RawFilesStackedTable.allRawFiles(expOrExpSet);
        // Ensure we have explicit boolean (`false`), else figure out if to show metrics columns from contents of exp array.
        showMetricColumns = (typeof showMetricColumns === 'boolean') ? showMetricColumns : commonFileUtil.filterFilesWithEmbeddedMetricItem(allFiles, true);

        if (!showMetricColumns) return null;

        return [
            { columnClass: 'file-detail', title: 'Total Sequences', initialWidth: 110, field : "quality_metric.Total Sequences" }
        ];
    }
    /**
     * Adds Microscope Configuration column if any raw files in expOrExpSet have a `microscope_configuration`.
     * Or if param `showMicroscopeConfigurationColumns` is set to true;
     *
     * @param {*} showNotesColumns - Skips check for microscope_configuration and returns column if true.
     * @param {*} expOrExpSet - Experiment or ExperimentSet Item.
     */
    static microscopeConfigurationColumnHeaders(showMicroscopeConfigurationColumns, expOrExpSet) {
        const allFiles = RawFilesStackedTable.allRawFiles(expOrExpSet);
        // Ensure we have explicit boolean (`false`), else figure out if to show notes columns from contents of exp array.
        showMicroscopeConfigurationColumns =
            (typeof showMicroscopeConfigurationColumns === 'boolean') ?
                showMicroscopeConfigurationColumns : _.any(allFiles, (f) => f.microscope_configuration);

        if (!showMicroscopeConfigurationColumns) return null;

        return [
            {
                columnClass: 'file-detail', title: 'Microscope Configuration', initialWidth: 40, render: renderFileMicroscopeConfigurationLinkButton,
                visibleTitle: function () {
                    return <i className="icon icon-fw icon-microscope fas" data-tip="Microscope Configuration" />;
                }
            }
        ];
    }
    /**
     * Adds Notes column if any raw files in expOrExpSet have a `notes_to_tsv`.
     * Or if param `showNotesColumns` is set to true;
     *
     * @param {*} showNotesColumns - Skips check for notes_to_tsv and returns column if true.
     * @param {*} expOrExpSet - Experiment or ExperimentSet Item.
     */
    static notesColumnHeaders(showNotesColumns, expOrExpSet) {
        const allFiles = RawFilesStackedTable.allRawFiles(expOrExpSet);
        // Ensure we have explicit boolean (`false`), else figure out if to show notes columns from contents of exp array.
        showNotesColumns = (typeof showNotesColumns === 'boolean') ? showNotesColumns : _.any(allFiles, (f) => f.notes_to_tsv);

        if (!showNotesColumns) return null;

        return [
            { columnClass: 'file-detail', title: 'Notes', initialWidth: 40, render: renderFileNotesColumn }
        ];
    }

    static columnHeaders(columnHeaders, showMetricColumns, showMicroscopeConfigurationColumns, showNotesColumns, expOrExpSet){
        return (RawFilesStackedTable.staticColumnHeaders(columnHeaders, expOrExpSet) || [])
            .concat(RawFilesStackedTable.customColumnHeaders(columnHeaders, expOrExpSet) || [])
            .concat(RawFilesStackedTable.metricColumnHeaders(showMetricColumns, expOrExpSet) || [])
            .concat(RawFilesStackedTable.microscopeConfigurationColumnHeaders(showMicroscopeConfigurationColumns, expOrExpSet) || [])
            .concat(RawFilesStackedTable.notesColumnHeaders(showNotesColumns, expOrExpSet) || []);
    }

    static isExperimentSet(expOrExpSet) {
        const itemType = schemaTransforms.getItemType(expOrExpSet);
        return itemType && itemType.indexOf('ExperimentSet') >= 0;
    }

    static allRawFiles(expOrExpSet) {
        return RawFilesStackedTable.isExperimentSet(expOrExpSet) ? expFxn.allFilesFromExperimentSet(expOrExpSet, false) : expOrExpSet.files;
    }

    static propTypes = {
        'columnHeaders'             : PropTypes.array,
        'selectedFiles'             : PropTypes.object,
        'experimentSet'             : PropTypes.shape({
            'replicate_exps'            : PropTypes.arrayOf(PropTypes.shape({
                'bio_rep_no'                : PropTypes.number.isRequired,
                'tec_rep_no'                : PropTypes.number.isRequired,
                'replicate_exp'             : PropTypes.shape({
                    'accession'                 : PropTypes.string,
                    'uuid'                      : PropTypes.string,
                    '@id'                       : PropTypes.string
                }).isRequired
            })).isRequired
        }),
        'collapseLongLists'         : PropTypes.bool,
        'preventExpand'             : PropTypes.bool,
        'analyticsImpressionOnMount': PropTypes.bool
    };

    static defaultProps = {
        'fadeIn'        : true,
        'width'         : null,
        'columnHeaders'     : [
            { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
            { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
            { columnClass: 'file-detail',                               title: 'File Size',     initialWidth: 80,   field : "file_size" }
        ],
        'collapseLongLists' : true,
        'showMetricColumns' : null,
        'showMicroscopeConfigurationColumns' : null,
        'showNotesColumns'  : null,
        'preventExpand'     : false
    };

    constructor(props){
        super(props);
        this.analyticsImpression = _.once(this.analyticsImpression.bind(this));
        this.handleFileCheckboxChange = this.handleFileCheckboxChange.bind(this);
        this.renderExperimentBlock = this.renderExperimentBlock.bind(this);
        this.renderBiosampleStackedBlockOfExperiments = this.renderBiosampleStackedBlockOfExperiments.bind(this);

        this.cache = {
            'oddExpRow' : true
        };
        this.state = {
            'mounted' : false
        };

        this.memoized = {
            groupedData: memoize(function(experimentSet){
                const { experiments_in_set, replicate_exps = [] } = experimentSet;
                const experimentsGroupedByBiosample = expFxn.groupExperimentsByBiosampleRepNo(
                    expFxn.combineWithReplicateNumbers(replicate_exps, experiments_in_set)
                );
                const allRawFiles = expFxn.allFilesFromExperimentSet(experimentSet, false);
                return { experimentsGroupedByBiosample, allRawFiles };
            }),
            columnHeaders: memoize(RawFilesStackedTable.columnHeaders)
        };
    }

    analyticsImpression(){
        const { experimentSet, experiment: propExperiment } = this.props;
        let experimentsGroupedByBiosample, allRawFiles;
        if (experimentSet) {
            ({ experimentsGroupedByBiosample, allRawFiles } = this.memoized.groupedData(experimentSet));
        } else {
            const experiment = _.extend({}, propExperiment, { tech_rep_no: 'N/A', bio_rep_no: 'N/A', from_experiment_set: { 'accession': 'NONE' } });
            experimentsGroupedByBiosample = [[experiment]];
            allRawFiles = _.map(experiment.files, function (f) {
                return _.extend({}, f, { 'from_experiment': f.from_experiment || experiment });
            });
        }

        const biosamples = [];
        let exps = [];

        experimentsGroupedByBiosample.forEach(function(expsWithBiosample){
            const [ { biosample } ] = expsWithBiosample; // From first exp, grab out biosample (all exps should have same 1).
            biosamples.push(biosample);
            exps = exps.concat(expsWithBiosample);
        });

        setTimeout(function(){ // Wait for analytics initialization to complete.
            analytics.impressionListOfItems(biosamples, null, "RawFilesStackedTable");
            analytics.impressionListOfItems(exps, null, "RawFilesStackedTable");
            analytics.impressionListOfItems(allRawFiles, null, "RawFilesStackedTable");
            analytics.event("RawFilesStackedTable", "Mounted", { eventLabel: experimentSet ? experimentSet.display_title : propExperiment.display_title });
        }, 250);
    }

    componentDidMount(){
        const { analyticsImpressionOnMount = false } = this.props;
        if (analyticsImpressionOnMount) {
            this.analyticsImpression();
        }
    }

    handleFileCheckboxChange(accessionTripleString, fileObj){
        return handleFileCheckboxChangeFxn(accessionTripleString, fileObj, SelectedFilesController.pick(this.props));
    }

    renderExperimentBlock(exp,i){
        this.cache.oddExpRow = !this.cache.oddExpRow;
        const { experimentSet, collapseLongLists, collapseShow = 3, collapseLimit = 2, columnHeaders, showMetricsColumns, showMicroscopeConfigurationColumns, showNotesColumns, href, preventExpand, collapseShowMoreLimit, collapseItemsIncrement } = this.props;

        const allRawFiles = exp.files || [];

        const allFilesInGroups = commonFileUtil.groupFilesByRelations(allRawFiles);
        const [ fileGroups, ungroupedFiles ] = commonFileUtil.extractSinglyGroupedItems(allFilesInGroups);

        const haveUngroupedFiles = Array.isArray(ungroupedFiles) && ungroupedFiles.length > 0;
        const haveGroups = Array.isArray(fileGroups) && fileGroups.length > 0;

        var fullColumnHeaders   = this.memoized.columnHeaders(columnHeaders, showMetricsColumns, showMicroscopeConfigurationColumns, showNotesColumns, experimentSet || exp),
            contentsClassName   = 'files',
            contents            = [];

        if (haveGroups){
            contentsClassName = 'file-groups';
            contents = contents.concat(_.map(fileGroups, function(group, j){
                // Ensure can be converted to accessionTriple
                group = _.map(group, function(f){
                    return fileUtil.extendFile(f, exp, experimentSet || { accession: 'NONE' });
                });
                // Find relation/group type(s)
                const relationshipTypes = new Set(_.pluck(_.flatten(_.pluck(group, 'related_files'), true), 'relationship_type'));
                const isPair = relationshipTypes.size === 1 && relationshipTypes.has('paired with');
                const labelTitle = isPair ? 'Pair' : 'Grp';
                return (
                    <FilePairBlock key={j} files={group}
                        excludeChildrenCheckboxes={isPair}
                        excludeOwnCheckbox={group.length === 1}
                        label={<StackedBlockNameLabel title={fileGroups.length > 1 ? labelTitle + " " + (j + 1) : labelTitle} />}
                        href={href}
                        isSingleItem={_.reduce(fileGroups, function(m,fp){ return m + (fp || []).length; }, 0) + exp.files.length + contents.length < 2 ? true : false}
                    />
                );
            }));
        }

        // Add in remaining unpaired files, if any.
        if (haveUngroupedFiles){
            contents = contents.concat(_.map(ungroupedFiles, function(file, j){
                const extendedFile = fileUtil.extendFile(file, exp, experimentSet || { accession: 'NONE' });

                return (
                    <FilePairBlock key={object.atIdFromObject(extendedFile) || j} files={[extendedFile]}
                        label={<StackedBlockNameLabel title="File"/>}
                        isSingleItem={ungroupedFiles.length + contents.length < 2 ? true : false}
                        columnClass="file-group" hideNameOnHover href={href}
                    />
                );

            }));
        }

        if (contents.length === 0){
            /* No Files Exist */
            contents.push(
                <StackedBlock key="single-empty-item" hideNameOnHover={false} columnClass="file-group">
                    { _.pluck(fullColumnHeaders, 'title').indexOf('File Group') > -1 ? <StackedBlockName/> : null }
                    <StackedBlockList title="Files" className="files">
                        <FileEntryBlock file={null} columnHeaders={fullColumnHeaders} href={href} />
                    </StackedBlockList>
                </StackedBlock>
            );
        }

        const experimentVisibleName = (
            exp.tec_rep_no ? 'Tech Replicate ' + exp.tec_rep_no :
                (exp.experiment_type && exp.experiment_type.display_title) ? exp.experiment_type.display_title :
                    exp.accession
        );
        const experimentAtId  = object.itemUtil.atId(exp);
        const linkTitle       = !experimentAtId && exp.error ? <em>{ exp.error }</em> : experimentVisibleName;
        // Shown in show more button, e.g. "Show X more Files".
        const listTitle       = (
            (haveUngroupedFiles? "Files" : '') +
            (haveUngroupedFiles && haveGroups? " or " : '') +
            (haveGroups? "Groups" : '')
        );


        const showMoreExtTitle = preventExpand && experimentSet ? (
            <a href={object.itemUtil.atId(experimentSet)}>(view in Experiment Set)</a>
        ) : null;

        return (
            <StackedBlock key={ experimentAtId || exp.tec_rep_no || i } hideNameOnHover={false} columnClass="experiment" stripe={this.cache.oddExpRow}
                label={<StackedBlockNameLabel title="Experiment" accession={exp.accession} subtitleVisible />}>
                <StackedBlockName relativePosition={expFxn.fileCountFromSingleExperiment(exp) > 6}>
                    { experimentAtId ? <a href={experimentAtId} className="name-title">{ linkTitle }</a> : <span className="name-title">{ linkTitle }</span> }
                </StackedBlockName>
                <StackedBlockList {...{ collapseLimit, collapseShow, collapseLongLists, showMoreExtTitle, collapseShowMoreLimit, collapseItemsIncrement }} title={listTitle} className={contentsClassName}>
                    { contents }
                </StackedBlockList>
            </StackedBlock>
        );
    }

    renderBiosampleStackedBlockOfExperiments(expsWithBiosample,i){
        const { collapseLimit = 3, collapseShow = 2, experimentSet, preventExpand = false, collapseShowMoreLimit, collapseItemsIncrement } = this.props;
        this.cache.oddExpRow = false; // Used & toggled by experiment stacked blocks for striping.
        const [ { biosample } ] = expsWithBiosample; // From first exp, grab out biosample (all exps should have same 1).
        const bioRepTitle = biosample.bio_rep_no ? 'Bio Replicate ' + biosample.bio_rep_no : biosample.biosource_summary;
        const biosampleAtId = object.itemUtil.atId(biosample);
        const biosampleTitle = !biosampleAtId && biosample.error ? <em>{ biosample.error }</em> : bioRepTitle;
        const appendCountStr = expsWithBiosample.length <= 5 ? null : (
            'with ' + expFxn.fileCountFromExperiments(expsWithBiosample.slice(3)) + ' Files '
        );
        const showMoreExtTitle = (
            <React.Fragment>
                { appendCountStr }
                { preventExpand ?
                    <a href={object.itemUtil.atId(experimentSet)}>(view in Experiment Set)</a>
                    : null }
            </React.Fragment>
        );

        return (
            <StackedBlock columnClass="biosample" hideNameOnHover={false}
                key={biosampleAtId || biosample.bio_rep_no || i } id={'bio-' + (biosample.bio_rep_no || i + 1)}
                label={<StackedBlockNameLabel title="Biosample" subtitle={bioRepTitle} accession={biosample.accession} subtitleVisible/>}>
                <StackedBlockName relativePosition={expsWithBiosample.length > 3 || expFxn.fileCountFromExperiments(expsWithBiosample) > 6}>
                    { biosampleAtId ?
                        <a href={biosampleAtId} className="name-title">{ biosampleTitle }</a>
                        : <span className="name-title">{ biosampleTitle }</span> }
                </StackedBlockName>
                <StackedBlockList className="experiments" title="Experiments" {...{ collapseLimit, collapseShow, showMoreExtTitle, collapseShowMoreLimit, collapseItemsIncrement }}>
                    { _.map(expsWithBiosample, this.renderExperimentBlock) }
                </StackedBlockList>
            </StackedBlock>
        );
    }

    /**
     * Here we render nested divs for a 'table' of experiments with shared elements spanning multiple rows,
     * e.g. an experiment block's height is the combined height of its containing file rows, biosample height
     * is combined height of its containing experiment rows (experiments that share that biosample).
     *  ___________________________________________________
     * |                         File   File Detail Columns|
     * |             Experiment ___________________________|
     * |                         File   File Detail Columns|
     * | Biosample  _______________________________________|
     * |                         File   File Detail Columns|
     * |             Experiment ___________________________|
     * |                         File   File Detail Columns|
     * |___________________________________________________|
     *
     * Much of styling/layouting is defined in CSS.
     */
    render(){
        const { experimentSet, experiment: propExperiment, columnHeaders: propColHeaders, showMetricsColumns, showMicroscopeConfigurationColumns, showNotesColumns, collapseLongLists, width, preventExpand } = this.props;
        let experimentsGroupedByBiosample, allRawFiles, experiment;
        if (experimentSet) {
            ({ experimentsGroupedByBiosample, allRawFiles } = this.memoized.groupedData(experimentSet));
        } else {
            experiment = _.extend({}, propExperiment, { tech_rep_no: 'N/A', bio_rep_no: 'N/A', from_experiment_set: { 'accession': 'NONE' } });
            experimentsGroupedByBiosample = [[experiment]];
            allRawFiles = _.map(experiment.files, function (f) {
                return _.extend({}, f, { 'from_experiment': f.from_experiment || experiment });
            });
        }

        const appendCountStr = experimentsGroupedByBiosample.length > 5 ?
            'with ' + _.flatten(experimentsGroupedByBiosample.slice(3), true).length + ' Experiments' : null;

        const showMoreExtTitle = (
            <React.Fragment>
                { appendCountStr }
                { preventExpand ?
                    <a href={object.itemUtil.atId(experimentSet)}>(view in Experiment Set)</a>
                    : null }
            </React.Fragment>
        );

        const columnHeaders = this.memoized.columnHeaders(propColHeaders, showMetricsColumns, showMicroscopeConfigurationColumns, showNotesColumns, experimentSet || experiment);

        return (
            <div className="stacked-block-table-outer-container overflow-auto">
                <StackedBlockTable {...SelectedFilesController.pick(this.props)} {...{ collapseLongLists, width, preventExpand, columnHeaders }}
                    className="expset-raw-files" fadeIn allFiles={allRawFiles}
                    handleFileCheckboxChange={this.handleFileCheckboxChange}>
                    <StackedBlockList className="biosamples" showMoreExtTitle={showMoreExtTitle} title="Biosamples">
                        { _.map(experimentsGroupedByBiosample, this.renderBiosampleStackedBlockOfExperiments) }
                    </StackedBlockList>
                </StackedBlockTable>
            </div>
        );
    }

}


export class ProcessedFilesStackedTable extends React.PureComponent {

    /**
     * Adds Notes column if any raw files in expSet have a `notes_to_tsv`.
     * Or if param `showNotesColumns` is set to true;
     *
     * @param {*} showNotesColumns - show/hide notes column accoording to one of 'never', 'always', 'conditional' cases
     * @param {*} processedFiles - all processed files.
     */
    static notesColumnHeaders(showNotesColumns, processedFiles) {

        showNotesColumns = (typeof showNotesColumns === 'boolean') ? showNotesColumns : _.any(processedFiles || [], (f) => f.notes_to_tsv);

        if(!showNotesColumns) {
            return null;
        }

        return [{ columnClass: 'file-detail', title: 'Notes', initialWidth: 20, render: renderFileNotesColumn }];
    }

    static columnHeaders(columnHeaders, showNotesColumns, processedFiles) {
        let clonedColumnHeaders = columnHeaders.slice(0);
        clonedColumnHeaders = clonedColumnHeaders.concat(ProcessedFilesStackedTable.notesColumnHeaders(showNotesColumns, processedFiles) || []);
        return clonedColumnHeaders;
    }

    static propTypes = {
        // These must have .experiments property, which itself should have .experiment_sets property. There's a utility function to get all files
        'files' : PropTypes.array.isRequired,
        'analyticsImpressionOnMount' : PropTypes.bool,
        'showNotesColumns': PropTypes.bool
    };

    static defaultProps = {
        'columnHeaders' : [
            { columnClass: 'experiment',  title: 'Experiment',  className: 'text-left',     initialWidth: 180  },
            //{ columnClass: 'file-group',  title: 'File Group',initialWidth: 40, visibleTitle : <i className="icon icon-download fas"></i> },
            { columnClass: 'file',        title: 'File',        className: 'has-checkbox',  initialWidth: 165,  render: renderFileTitleColumn,          visibleTitle: renderFileHeaderWithCheckbox },
            { columnClass: 'file-detail', title: 'File Type',                               initialWidth: 135,  render: renderFileTypeSummaryColumn     },
            { columnClass: 'file-detail', title: 'File Size',                               initialWidth: 70,   field : "file_size" }
        ],
        'collapseLongLists' : true,
        'nonFileHeaderCols' : ['experiment', 'file'],
        'titleForFiles'     : 'Processed Files',
        'showNotesColumns'  : null
    };

    /**
     * @static
     * @param {Item[]} files
     * @returns {[ expAAccesion: string, files: Item[] ][]}
     * @memberof ProcessedFilesStackedTable
     */
    static filesGroupedByExperimentOrGlobal(files){
        // Contains: { 'experiments' : { 'ACCESSSION1' : [..file_objects..], 'ACCESSION2' : [..file_objects..] }, 'experiment_sets' : { 'ACCESSION1' : [..file_objects..] } }
        const groupedFiles = expFxn.divideFilesFromExpSetToExpSetsAndExps(files);
        const filesGroupedByExperimentOrGlobal = _.clone(groupedFiles.experiments);

        const expSetAccessions = _.keys(groupedFiles.experiment_sets || {});
        if (expSetAccessions.length === 1){ // Should only be 1 unless files from multiple expsets present. Handle this later if becomes case.
            // Put all files which come from experiment set itself (not an experiment) under 'global' key.
            filesGroupedByExperimentOrGlobal.global = groupedFiles.experiment_sets[expSetAccessions[0]].slice();
        }
        if (expSetAccessions.length > 1) {
            logger.error('Theres more than 1 ExpSet for these files/sets - ', expSetAccessions, groupedFiles);
        }

        return _.pairs(filesGroupedByExperimentOrGlobal).sort(function ([ expAAccesion, filesForExpA ], [ expBAccesion, filesForExpB ]){
            // Bubble 'global' exps (aka grouping of files that belong to multiple exps or expset itself)
            // to top.
            if (expAAccesion === 'global') return -1;
            if (expBAccesion === 'global') return 1;
            return 0;
        });
    }

    constructor(props){
        super(props);
        this.analyticsImpression = _.once(this.analyticsImpression.bind(this));
        this.handleFileCheckboxChange = this.handleFileCheckboxChange.bind(this);
        this.oddExpRow = false;

        this.memoized = {
            filesGroupedByExperimentOrGlobal: memoize(ProcessedFilesStackedTable.filesGroupedByExperimentOrGlobal),
            columnHeaders: memoize(ProcessedFilesStackedTable.columnHeaders)
        };
    }

    analyticsImpression(){
        const { files: origFileList } = this.props;
        const filesGroupedByExperimentOrGlobal = this.memoized.filesGroupedByExperimentOrGlobal(origFileList);
        const exps = [];
        let resortedFileList = [];

        filesGroupedByExperimentOrGlobal.forEach(function([ expAccession, filesForExp ]){
            if (expAccession !== "global") {
                for (var i = 0; i < filesForExp.length; i++){
                    if (filesForExp[i].from_experiment && filesForExp[i].from_experiment.accession === expAccession) {
                        exps.push(filesForExp[i].from_experiment);
                        break;
                    }
                }
            }
            resortedFileList = resortedFileList.concat(filesForExp);
        });

        setTimeout(function(){ // Wait for analytics initialization to complete.
            analytics.impressionListOfItems(exps, null, "ProcessedFilesStackedTable");
            analytics.impressionListOfItems(resortedFileList, null, "ProcessedFilesStackedTable");
            analytics.event("ProcessedFilesStackedTable", "Mounted");
        }, 250);
    }

    componentDidMount(){
        const { analyticsImpressionOnMount = false } = this.props;
        if (analyticsImpressionOnMount) {
            this.analyticsImpression();
        }
    }

    componentDidUpdate(){
        this.oddExpRow = false;
    }

    handleFileCheckboxChange(accessionTripleString, fileObj){
        return handleFileCheckboxChangeFxn(accessionTripleString, fileObj, SelectedFilesController.pick(this.props));
    }

    renderFileBlocksForExperiment(filesForExperiment){
        const { href } = this.props;
        const fileBlocks = [];
        const filesWithPermissions = _.filter(filesForExperiment, object.itemUtil.atId);

        _.forEach(filesWithPermissions, (file, idx) => {
            this.oddExpRow = !this.oddExpRow;
            fileBlocks.push(
                <FileEntryBlock key={object.atIdFromObject(file) || idx} file={file} hideNameOnHover={false} href={href}
                    isSingleItem={filesForExperiment.length === 1 && filesWithPermissions.length === 1} stripe={this.oddExpRow} />
            );
        });

        if (filesWithPermissions.length < filesForExperiment.length){
            this.oddExpRow = !this.oddExpRow;
            fileBlocks.push(
                <FileEntryBlock key="no-view-permission-file-or-files" file={{ 'error' : 'no view permissions' }} href={href}
                    isSingleItem={filesWithPermissions.length === 0} stripe={this.oddExpRow} hideNameOnHover={false} />
            );
        }

        return fileBlocks;
    }

    renderExperimentBlocks(filesGroupedByExperimentOrGlobal){
        const { collapseLongLists, titleForFiles } = this.props;
        return filesGroupedByExperimentOrGlobal.map(([ experimentAccession, filesForExperiment ])=>{

            const experiment = filesForExperiment[0].from_experiment; // All should have same 1

            const nameTitle = (
                experimentAccession === 'global' ? ( // Case if came from multiple experiments
                    <div style={{ 'fontSize' : '1.25rem', 'height': 16 }} className="text-300">
                        Multiple Experiments
                    </div>
                ) : (
                    (experiment && typeof experiment.display_title === 'string' && experiment.display_title.replace(' - ' + experimentAccession, '')) || experimentAccession
                )
            );

            const experimentAtId = (experimentAccession !== 'global' && object.atIdFromObject(experiment)) || null;

            const replicateNumbersExists = experiment && experiment.bio_rep_no && experiment.tec_rep_no;

            var nameBlock = (
                <StackedBlockName className={replicateNumbersExists ? "double-line" : ""}>
                    { replicateNumbersExists ? <div>Bio Rep <b>{ experiment.bio_rep_no }</b>, Tec Rep <b>{ experiment.tec_rep_no }</b></div> : <div/> }
                    { experimentAtId ? <a href={experimentAtId} className="name-title text-500">{ nameTitle }</a> : <div className="name-title">{ nameTitle }</div> }
                </StackedBlockName>
            );

            var expSetAccession = filesForExperiment[0].from_experiment.from_experiment_set.accession;

            return (
                <StackedBlock columnClass="experiment" hideNameOnHover={experimentAccession === 'global'}
                    key={experimentAccession} label={
                        <StackedBlockNameLabel title={experimentAccession === 'global' ? 'From Multiple Experiments' : 'Experiment'}
                            accession={experimentAccession === 'global' ? expSetAccession : experimentAccession} subtitleVisible />
                    }>
                    { nameBlock }
                    <StackedBlockList className="files" title={titleForFiles} showMoreExtTitle={null}>
                        { this.renderFileBlocksForExperiment(filesForExperiment) }
                    </StackedBlockList>
                </StackedBlock>
            );

        });
    }

    render(){
        const { files, columnHeaders: propColHeaders, showNotesColumns, collapseLongLists } = this.props;
        const filesGroupedByExperimentOrGlobal = this.memoized.filesGroupedByExperimentOrGlobal(files);
        const experimentBlocks = this.renderExperimentBlocks(filesGroupedByExperimentOrGlobal);
        const columnHeaders = this.memoized.columnHeaders(propColHeaders, showNotesColumns, files);
        return (
            <div className="stacked-block-table-outer-container overflow-auto">
                <StackedBlockTable {..._.omit(this.props, 'children', 'files', 'columnHeaders')} columnHeaders={columnHeaders}
                    className="expset-processed-files" fadeIn allFiles={files} handleFileCheckboxChange={this.handleFileCheckboxChange}>
                    <StackedBlockList className="sets" collapseLongLists={collapseLongLists}>{experimentBlocks}</StackedBlockList>
                </StackedBlockTable>
            </div>
        );
    }

}



export class RawFilesStackedTableExtendedColumns extends React.PureComponent {

    static defaultProps = RawFilesStackedTable.defaultProps;

    static renderQCOverallQualityStatusColumn(file, field, detailIndex, fileEntryBlockProps){
        const val = object.getNestedProperty(file, field, true); // col.field should be 'quality_metric.overall_quality_status' here.
        const linkToReport = (file.quality_metric && file.quality_metric.url) || null;
        if (val === 'PASS'){
            return (
                <span>
                    <i className="icon icon-check success fas" style={{ 'color' : 'green' }}/>
                    &nbsp; { linkToReport ? <a href={linkToReport} target="_blank" rel="noreferrer noopener">Pass</a> : "Pass"}
                </span>
            );
        } else if (val === 'FAIL'){
            return (
                <span>
                    <i className="icon icon-times fas" style={{ 'color' : 'red' }}/>
                    &nbsp; { linkToReport ? <a href={linkToReport} target="_blank" rel="noreferrer noopener">Fail</a> : "Fail"}
                </span>
            );
        } else {
            return '-';
        }
    }

    render(){
        const { columnHeaders, showMetricColumns, experimentSet, experiment } = this.props;
        let extendedPropColHeaders = columnHeaders;

        const origMetricHeaders = RawFilesStackedTable.metricColumnHeaders(showMetricColumns, experimentSet || experiment);
        if (Array.isArray(origMetricHeaders) && origMetricHeaders.length > 0){
            extendedPropColHeaders = columnHeaders.slice().concat([
                {
                    columnClass: 'file-detail',
                    title: 'Sequence Length',
                    initialWidth: 110,
                    field : "quality_metric.Sequence length"
                },
                {
                    columnClass: 'file-detail',
                    title: 'Overall Quality',
                    initialWidth: 110,
                    field : "quality_metric.overall_quality_status",
                    render: RawFilesStackedTableExtendedColumns.renderQCOverallQualityStatusColumn
                }
            ]);
        }
        else { //if files do not have qc metric columns, then display default file format and type columns
            extendedPropColHeaders = columnHeaders.slice().concat([
                {
                    columnClass: 'file-detail',
                    title: 'File Format',
                    initialWidth: 110,
                    field : "file_format.display_title"
                },
                {
                    columnClass: 'file-detail',
                    title: 'File Type',
                    initialWidth: 110,
                    field : "file_type"
                }
            ]);
        }

        return <RawFilesStackedTable {...this.props} columnHeaders={extendedPropColHeaders} />;
    }
}

export class QCMetricsTable extends React.PureComponent {

    static qcSummaryItemTitleTooltipsByTitle(fileGroup) {
        const tooltipsByTitle = {};
        fileGroup.forEach(function ({ title: qmsTitle, quality_metric_summary: { title_tooltip = null } = {} }) {
            if (typeof tooltipsByTitle[qmsTitle] === "string") {
                return; // skip/continue; already found a tooltip_title for this qms title.
            }
            if (title_tooltip && typeof title_tooltip === "string") {
                tooltipsByTitle[qmsTitle] = title_tooltip;
            }
        });
        return tooltipsByTitle;
    }

    static renderForFileColValue(file) {
        const fileAtId = file && object.atIdFromObject(file);
        let fileTitleString;
        if (file.accession) {
            fileTitleString = file.accession;
        }
        if (!fileTitleString && fileAtId) {
            var idParts = _.filter(fileAtId.split('/'));
            if (idParts[1].slice(0, 5) === '4DNFI') {
                fileTitleString = idParts[1];
            }
        }
        if (!fileTitleString) {
            fileTitleString = file.uuid || fileAtId || 'N/A';
        }
        return (
            <React.Fragment>
                <div>{Schemas.Term.toName("file_type_detailed", file.file_type_detailed, true)}</div>
                <a className="text-500 name-title" href={fileAtId}>
                    {fileTitleString}
                </a>
            </React.Fragment>);
    }

    static generateAlignedColumnHeaders(fileGroups) {
        return fileGroups.map(function (fileGroup) {
            const titleTooltipsByQMSTitle = QCMetricsTable.qcSummaryItemTitleTooltipsByTitle(fileGroup);
            const columnHeaders = [ // Static / present-for-each-table headers
                { columnClass: 'experiment', title: 'Experiment', initialWidth: 145, className: 'text-left' },
                { columnClass: 'file', className: 'double-height-block', title: 'For File', initialWidth: 100, render: QCMetricsTable.renderForFileColValue }
            ].concat(fileGroup[0].quality_metric.quality_metric_summary.map(function (qmsObj, qmsIndex) { // Dynamic Headers
                const { title, title_tooltip } = qmsObj;
                // title tooltip: if missing in the first item then try to get it from the first valid one in array
                return {
                    columnClass: 'file-detail',
                    title,
                    title_tooltip: title_tooltip || titleTooltipsByQMSTitle[title] || null,
                    initialWidth: 80,
                    render: function renderColHeaderValue(file, field, colIndex, fileEntryBlockProps) {
                        const qmsItem = file.quality_metric.quality_metric_summary[qmsIndex];
                        const { value, tooltip } = QCMetricFromSummary.formatByNumberType(qmsItem);
                        return <span className="d-inline-block" data-tip={tooltip}>{value}</span>;
                    }
                };
            }));

            // Add 'Link to Report' column, if any files w/ one. Else include blank one so columns align with any other stacked ones.
            const anyFilesWithMetricURL = _.any(fileGroup, function (f) {
                return f && f.quality_metric && f.quality_metric.url;
            });

            if (anyFilesWithMetricURL) {
                columnHeaders.push({ columnClass: 'file-detail', title: 'Report', initialWidth: 35, render: renderFileQCReportLinkButton });
                columnHeaders.push({ columnClass: 'file-detail', title: 'Details', initialWidth: 35, render: renderFileQCDetailLinkButton });
            } else {
                columnHeaders.push({ columnClass: 'file-detail', title: 'Details', initialWidth: 50, render: renderFileQCDetailLinkButton });
            }
            return columnHeaders;
        });
    }

    /**
     * commonFileUtil.groupFilesByQCSummaryTitles function is wrapped to allow
     * custom sorting by QC schema's qc_order and @type Atacseq or Chipseq specific QCS items
     */
    static groupFilesByQCSummaryTitles(filesWithMetrics, schemas) {
        let filesByTitles = commonFileUtil.groupFilesByQCSummaryTitles(filesWithMetrics);

        const comparerFunc = (filesA, filesB) => {
            const [fileA] = filesA; //assumption: 1st file's QC is adequate to define order
            const [fileB] = filesB; //assumption: 1st file's QC is adequate to define order

            let orderA, orderB;
            if (schemas) {
                const itemTypeA = schemaTransforms.getItemType(fileA.quality_metric);
                if (itemTypeA && schemas[itemTypeA]) {
                    const { qc_order } = schemas[itemTypeA];
                    if (typeof qc_order === 'number') {
                        orderA = qc_order;
                    }
                }
                const itemTypeB = schemaTransforms.getItemType(fileB.quality_metric);
                if (itemTypeB && schemas[itemTypeB]) {
                    const { qc_order } = schemas[itemTypeB];
                    if (typeof qc_order === 'number') {
                        orderB = qc_order;
                    }
                }
            }

            if (orderA && orderB && orderA !== orderB) {
                return orderA - orderB;
            }

            //custom comparison for @type Atacseq or Chipseq specific QCS items
            if (_.any(fileA.quality_metric.quality_metric_summary, (qcs) => qcs.title === 'Nonredundant Read Fraction (NRF)')) {
                return -1;
            } else if (_.any(fileB.quality_metric.quality_metric_summary, (qcs) => qcs.title === 'Nonredundant Read Fraction (NRF)')) {
                return 1;
            }

            return 0;
        };

        if (filesByTitles) {
            filesByTitles = filesByTitles.slice();
            filesByTitles.sort(comparerFunc);
        }

        return filesByTitles;
    }

    static defaultProps = {
        heading: (
            <h3 className="tab-section-title mt-12">
                <span>Quality Metrics</span>
            </h3>
        )
    };

    constructor(props) {
        super(props);
        this.memoized = {
            filterFilesWithQCSummary: memoize(commonFileUtil.filterFilesWithQCSummary),
            groupFilesByQCSummaryTitles: memoize(QCMetricsTable.groupFilesByQCSummaryTitles),
            generateAlignedColumnHeaders: memoize(QCMetricsTable.generateAlignedColumnHeaders)
        };
    }

    render() {
        const { width, files, windowWidth, href, heading, schemas } = this.props;
        const filesWithMetrics = this.memoized.filterFilesWithQCSummary(files);
        const filesWithMetricsLen = filesWithMetrics.length;

        if (!filesWithMetrics || filesWithMetricsLen === 0) return null;

        const filesByTitles = this.memoized.groupFilesByQCSummaryTitles(filesWithMetrics, schemas);
        const columnHeadersForFileGroups = this.memoized.generateAlignedColumnHeaders(filesByTitles);
        const commonTableProps = {
            width, windowWidth, href,
            collapseLongLists: true, collapseLimit: 10, collapseShow: 7,
            analyticsImpressionOnMount: false, titleForFiles: "Processed File Metrics",
            showNotesColumns: false
        };

        return (
            <div className="row">
                <div className="exp-table-container col-12">
                    {heading}
                    {filesByTitles.map(function (fileGroup, i) {
                        return (
                            <ProcessedFilesStackedTable {...commonTableProps} key={i} files={fileGroup} columnHeaders={columnHeadersForFileGroups[i]} />
                        );
                    })}
                </div>
            </div>
        );
    }
}

export function QCMetricFromSummary(props){
    const { title } = props;
    const { value, tooltip } = QCMetricFromSummary.formatByNumberType(props);

    return (
        <div className="overview-list-element">
            <div className="row">
                <div className="col-4 text-right">
                    <h5 className="mb-0 mt-02">{ title }</h5>
                </div>
                <div className="col-8">
                    <div className="inner value">
                        { tooltip ? <i className="icon icon-fw icon-info-circle mr-05 fas" data-tip={tooltip} /> : null }
                        { value }
                    </div>
                </div>
            </div>
        </div>
    );
}
QCMetricFromSummary.formatByNumberType = function({ value, tooltip, numberType }){
    // We expect these values to always be strings or undefined which are passed by value (not reference).\
    // Hence we use var instead of const and safely overwrite them.
    if (numberType === 'percent'){
        value += '%';
    } else if (numberType && ['number', 'integer'].indexOf(numberType) > -1) {
        value = parseFloat(value);
        if (!tooltip && value >= 1000) {
            tooltip = valueTransforms.decorateNumberWithCommas(value);
        }
        value = valueTransforms.roundLargeNumber(value);
    }
    return { value, tooltip };
};