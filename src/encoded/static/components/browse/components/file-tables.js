'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import url from 'url';
import { Button, DropdownButton, MenuItem } from 'react-bootstrap';
import { StackedBlock, StackedBlockList, StackedBlockName, StackedBlockNameLabel, StackedBlockTable, FileEntryBlock, FilePairBlock } from './StackedBlockTable';
import { expFxn, console, isServerSide, analytics, object, Schemas, typedefs, fileUtil, navigate } from './../../util';

var { Item, ExperimentSet } = typedefs;




class FileColumnActionsBtn extends React.PureComponent {

    static hostFromHref = memoize(function(href){
        const hrefParts = (href && url.parse(href)) || null;
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
        const fileFormat = fileUtil.getFileFormatStr(file);
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
                <MenuItem data-tip="Visualize this file using the HiGlass Browser" onClick={onClick} key="higlass">
                    HiGlass
                </MenuItem>
            );
        } else {
            return (
                <div className="inline-block" style={{ 'position' : 'relative', 'zIndex' : 2 }}>
                    <Button bsSize="xs" className="in-stacked-table-button" bsStyle="primary" data-tip="Visualize with HiGlass" onClick={onClick}>
                        <i className="icon icon-fw icon-television"/>
                    </Button>
                </div>
            );
        }

    }

    juiceboxButton(){
        const { file, href } = this.props;
        const host = FileColumnActionsBtn.hostFromHref(href);

        if (!host || !file.href) return null; // Needed for a link to be made

        if (!this.isFileHIC()){ // Juicebox & epigenome browser can only viz HIC files at moment?
            return null;
        }

        function onClick(){
            // If we're server-side, there is access to the global browser window object/API.
            if (isServerSide()) return null;
            var targetLocation = "http://aidenlab.org/juicebox/?hicUrl=" + host + file.href;
            var win = window.open(targetLocation, '_blank');
            win.focus();
        }

        return (
            <MenuItem data-tip="Visualize this file in TCGA's JuiceBox Browser" onClick={onClick} key="juicebox" className="text-left">
                JuiceBox <i className="icon icon-fw icon-external-link text-smaller"/>
            </MenuItem>
        );

    }

    epigenomeButton(){
        const { file, href } = this.props;
        const host = FileColumnActionsBtn.hostFromHref(href);
        const genomeAssembly = file.genome_assembly || null;
        const epiGenomeMapping = (genomeAssembly && FileColumnActionsBtn.epiGenomeAssemblyMapping[genomeAssembly]) || null;

        // If the file lacks a genome assembly or it isn't in the expected mappings, do not show the button.
        if (!epiGenomeMapping || !host || !file.href) return null; // Needed for a link to be made

        if (!this.isFileHIC()){ // Juicebox & epigenome browser can only viz HIC files at moment?
            return null;
        }

        function onClick(){
            // If we're server-side, there is access to the global browser window object/API.
            if (isServerSide()) return null;
            var targetLocation  = "http://epigenomegateway.wustl.edu/browser/?genome=" + epiGenomeMapping + "&hicUrl=" + host + file.href;
            var win = window.open(targetLocation, '_blank');
            win.focus();
        }

        return (
            <MenuItem data-tip="Visualize this file in WashU Epigenome Browser" onClick={onClick} key="epigenome" className="text-left">
                Epigenome Browser <i className="icon icon-fw icon-external-link text-smaller"/>
            </MenuItem>
        );
    }

    render(){
        const { file, href } = this.props;
        const fileIsPublic = (file.status === 'archived' || file.status === 'released');
        if (!fileIsPublic){ // If not public, then 3rd-party service such as JuiceBox cannot access file to viz it.
            return null;
        }

        //const higlassBtn = this.higlassButton();
        const juiceboxBtn = this.juiceboxButton();
        const epigenomeBtn = this.epigenomeButton();
        const hasJBOrEpigenomeBtn = !!(juiceboxBtn || epigenomeBtn);

        // We are likely to have either juicebox+epigenome btn _or_ higlassBtn.
        const higlassBtn = this.higlassButton(hasJBOrEpigenomeBtn);

        if (hasJBOrEpigenomeBtn){
            return (
                <DropdownButton className="in-stacked-table-button" bsStyle="primary" data-tip="Visualize this file..."
                    title={<i className="icon icon-fw icon-television"/>} dropup bsSize="xs">
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

    const className = 'title-of-file' + (file.accession ? ' mono-text' : '');

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
    const fileFormat = fileUtil.getFileFormatStr(file);
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


export function renderFileQCReportLinkButton(file, field, detailIndex, fileEntryBlockProps){
    if (!file || !file.quality_metric || !file.quality_metric.url){
        return '-';
    }
    const filename = Schemas.Term.toName('quality_metric.url', file.quality_metric.url, false);
    return (
        <Button bsStyle="primary" bsSize="xs" data-tip={"View report - " + filename} href={file.quality_metric.url} target="_blank" rel="noopener noreferrer">
            <i className="icon icon-fw icon-file-text-o" />
        </Button>
    );
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
            case 'replicate' :
                return [
                    { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
                    { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
                    { columnClass: 'file-group',                                title: 'File Group',    initialWidth: 30,   visibleTitle : function(stackedBlockProps){
                        if (stackedBlockProps.selectedFiles && typeof stackedBlockProps.selectFile === 'function' && typeof stackedBlockProps.unselectFile === 'function'){
                            return <i className="icon icon-download"/>;
                        }
                        return null;
                    } },
                    { columnClass: 'file',                                      title: 'File',          initialWidth: 125,  render: renderFileTitleColumn   }
                ];
            default:
                return [
                    { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
                    { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
                    { columnClass: 'file',                                      title: 'File',          initialWidth: 125,  render: renderFileTitleColumn}
                ];
        }

    }

    /* Built-in headers for props.experimentSetType, extended by any matching title from props.columnHeaders */
    static staticColumnHeaders(columnHeaders, experimentSet){
        return _.map(RawFilesStackedTable.builtInHeaders(experimentSet.experimentset_type), function(staticCol){
            return _.extend(
                _.clone(staticCol),
                _.findWhere(columnHeaders, { 'title' : staticCol.title }) || {}
            );
        });
    }

    /* Any non built-in (for experimentSetType) headers from props.columnHeaders */
    static customColumnHeaders(columnHeaders, experimentSet){
        return _.filter(columnHeaders, function(col){
            return  !_.contains(_.pluck(RawFilesStackedTable.builtInHeaders(experimentSet.experimentset_type), 'title'), col.title);
        });
    }

    /**
     * Adds Total Sequences matric column if any raw files in expSet have a `quality_metric`.
     * Or if param `showMetricColumns` is set to true;
     *
     * @see fileUtil.filterFilesWithEmbeddedMetricItem
     *
     * @param {boolean} showMetricColumns - Skips check for quality_metric and returns column if true.
     * @param {ExperimentSet} experimentSet - ExperimentSet Item.
     */
    static metricColumnHeaders(showMetricColumns, experimentSet){
        // Ensure we have explicit boolean (`false`), else figure out if to show metrics columns from contents of exp array.
        showMetricColumns = (typeof showMetricColumns === 'boolean' && showMetricColumns) || fileUtil.filterFilesWithEmbeddedMetricItem(
            expFxn.allFilesFromExperimentSet(experimentSet, false), true
        ) ? true : false;

        if (!showMetricColumns) return null;

        return [
            { columnClass: 'file-detail', title: 'Total Sequences', initialWidth: 110, field : "quality_metric.Total Sequences" }
        ];
    }

    static columnHeaders = memoize(function(columnHeaders, showMetricColumns, experimentSet){
        return (RawFilesStackedTable.staticColumnHeaders(columnHeaders, experimentSet) || [])
            .concat(RawFilesStackedTable.customColumnHeaders(columnHeaders, experimentSet) || [])
            .concat(RawFilesStackedTable.metricColumnHeaders(showMetricColumns, experimentSet) || []);
    });

    /**
     * Adds `from_experiment : { from_experiment_set : { accession }, accession }`
     * to a file.
     */
    static extendFile(file, experiment, experimentSet){
        return _.extend(
            {}, file, {
                'from_experiment' : _.extend(
                    {}, experiment, { 'from_experiment_set' : experimentSet }
                )
            }
        );
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
                    'link_id'                   : PropTypes.string
                }).isRequired
            })).isRequired
        }),
        'collapseLongLists'         : PropTypes.bool
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
        'showMetricColumns' : null
    };

    constructor(props){
        super(props);
        this.renderExperimentBlock = this.renderExperimentBlock.bind(this);
        this.renderBiosampleStackedBlockOfExperiments = this.renderBiosampleStackedBlockOfExperiments.bind(this);

        this.cache = {
            'oddExpRow' : true
        };
        this.state = {
            'mounted' : false
        };
    }

    renderExperimentBlock(exp,i){
        this.cache.oddExpRow = !this.cache.oddExpRow;
        const { experimentSet, collapseLongLists, collapseShow, collapseLimit, columnHeaders, showMetricsColumns, href } = this.props;

        const allRawFiles = exp.files || [];

        const allFilesInGroups = fileUtil.groupFilesByRelations(allRawFiles);
        const [ fileGroups, ungroupedFiles ] = fileUtil.extractSinglyGroupedItems(allFilesInGroups);

        const haveUngroupedFiles = Array.isArray(ungroupedFiles) && ungroupedFiles.length > 0;
        const haveGroups = Array.isArray(fileGroups) && fileGroups.length > 0;

        var fullColumnHeaders   = RawFilesStackedTable.columnHeaders(columnHeaders, showMetricsColumns, experimentSet),
            contentsClassName   = 'files',
            contents            = [];

        if (haveGroups){
            contentsClassName = 'file-groups';
            contents = contents.concat(_.map(fileGroups, function(group, j){
                // Ensure can be converted to accessionTriple
                group = _.map(group, function(f){
                    return RawFilesStackedTable.extendFile(f, exp, experimentSet);
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
                const extendedFile = RawFilesStackedTable.extendFile(file, exp, experimentSet);

                return (
                    <FilePairBlock key={object.atIdFromObject(extendedFile) || j} files={[extendedFile]}
                        label={<StackedBlockNameLabel title="File"/>}
                        isSingleItem={ungroupedFiles.length + contents.length < 2 ? true : false}
                        columnClass="file-group" hideNameOnHover={true} href={href}
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

        var experimentVisibleName = (
                exp.tec_rep_no ? 'Tech Replicate ' + exp.tec_rep_no :
                    (exp.experiment_type && exp.experiment_type.display_title) ? exp.experiment_type.display_title :
                        exp.accession
            ),
            experimentAtId  = object.itemUtil.atId(exp),
            linkTitle       = !experimentAtId && exp.error ? <em>{ exp.error }</em> : experimentVisibleName,
            // Shown in show more button, e.g. "Show X more Files".
            listTitle       = (
                (haveUngroupedFiles? "Files" : '') +
                (haveUngroupedFiles && haveGroups? " or " : '') +
                (haveGroups? "Groups" : '')
            );

        return (
            <StackedBlock key={ experimentAtId || exp.tec_rep_no || i } hideNameOnHover={false} columnClass="experiment" stripe={this.cache.oddExpRow}
                label={<StackedBlockNameLabel title="Experiment" accession={exp.accession} subtitleVisible />}>
                <StackedBlockName relativePosition={expFxn.fileCountFromSingleExperiment(exp) > 6}>
                    { experimentAtId ? <a href={experimentAtId} className="name-title">{ linkTitle }</a> : <span className="name-title">{ linkTitle }</span> }
                </StackedBlockName>
                <StackedBlockList title={listTitle} className={contentsClassName}
                    collapseLimit={collapseLimit || 3} collapseShow={collapseShow || 2} collapseLongLists={collapseLongLists}>
                    { contents }
                </StackedBlockList>
            </StackedBlock>
        );
    }

    renderBiosampleStackedBlockOfExperiments(expsWithBiosample,i){
        const { collapseLimit, collapseShow } = this.props;
        this.cache.oddExpRow = false; // Used & toggled by experiment stacked blocks for striping.
        var biosample       = expsWithBiosample[0].biosample,
            bioRepTitle     = biosample.bio_rep_no ? 'Bio Replicate ' + biosample.bio_rep_no : biosample.biosource_summary,
            biosampleAtId   = object.itemUtil.atId(biosample),
            biosampleTitle  = !biosampleAtId && biosample.error ? <em>{ biosample.error }</em> : bioRepTitle,
            showMoreExtraTitle = expsWithBiosample.length <= 5 ? null : (
                    'with ' + expFxn.fileCountFromExperiments(expsWithBiosample.slice(3)) + ' Files'
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
                <StackedBlockList className="experiments" title="Experiments" collapseLimit={collapseLimit || 3} collapseShow={collapseShow || 2}
                    showMoreExtTitle={showMoreExtraTitle}>
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
        const { experimentSet, columnHeaders, showMetricsColumns, collapseLongLists } = this.props;
        const { accession, experiments_in_set, replicate_exps } = experimentSet;

        const experimentsGroupedByBiosample = expFxn.groupExperimentsByBiosampleRepNo(
            expFxn.combineWithReplicateNumbers(replicate_exps, experiments_in_set)
        );

        const showMoreExtTitle = experimentsGroupedByBiosample.length > 5 ?
            'with ' + _.flatten(experimentsGroupedByBiosample.slice(3), true).length + ' Experiments' : null;

        const fullColumnHeaders = RawFilesStackedTable.columnHeaders(columnHeaders, showMetricsColumns, experimentSet);

        return (
            <StackedBlockTable {..._.pick(this.props, 'selectedFiles', 'selectFile', 'unselectFile', 'collapseLongLists', 'width')}
                columnHeaders={fullColumnHeaders} className="expset-raw-files" fadeIn>
                <StackedBlockList className="biosamples" showMoreExtTitle={showMoreExtTitle} title="Biosamples">
                    { _.map(experimentsGroupedByBiosample, this.renderBiosampleStackedBlockOfExperiments) }
                </StackedBlockList>
            </StackedBlockTable>
        );
    }

}


export class ProcessedFilesStackedTable extends React.PureComponent {

    static propTypes = {
        // These must have .experiments property, which itself should have .experiment_sets property. There's a utility function to get all files
        'files' : PropTypes.array.isRequired
    };

    static defaultProps = {
        'columnHeaders' : [
            { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 165   },
            //{ columnClass: 'file-group',  title: 'File Group',initialWidth: 40, visibleTitle : <i className="icon icon-download"></i> },
            { columnClass: 'file',        title: 'File',      initialWidth: 135, render: renderFileTitleColumn },
            { columnClass: 'file-detail', title: 'File Type', initialWidth: 135, render: renderFileTypeSummaryColumn },
            { columnClass: 'file-detail', title: 'File Size', initialWidth: 70, field : "file_size" }
        ],
        'collapseLongLists' : true,
        'nonFileHeaderCols' : ['experiment', 'file'],
        'titleForFiles'     : 'Processed Files'
    };

    static filesGroupedByExperimentOrGlobal = memoize(function(files){
        // Contains: { 'experiments' : { 'ACCESSSION1' : [..file_objects..], 'ACCESSION2' : [..file_objects..] }, 'experiment_sets' : { 'ACCESSION1' : [..file_objects..] } }
        const groupedFiles = expFxn.processedFilesFromExperimentSetToGroup(files);
        const filesGroupedByExperimentOrGlobal = _.clone(groupedFiles.experiments);

        // This should always be true (or false b.c of 0). It might change to not always be true (> 1). In this case, we should, figure out a different way of handling it. Like an extra stacked block at front for ExpSet.
        const expSetAccessions = _.keys(groupedFiles.experiment_sets || {});
        if (expSetAccessions.length === 1){
            filesGroupedByExperimentOrGlobal.global = groupedFiles.experiment_sets[expSetAccessions[0]];
        } else if (expSetAccessions.length > 1) {
            console.error('Theres more than 1 ExpSet for these files/sets - ', expSetAccessions, groupedFiles);
        }
        return filesGroupedByExperimentOrGlobal;
    });

    constructor(props){
        super(props);
        this.oddExpRow = false;
    }

    renderFileBlocksForExperiment(filesForExperiment){
        const { href } = this.props;
        var fileBlocks = [],
            filesWithPermissions = _.filter(filesForExperiment, object.itemUtil.atId);

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

        return _.map(_.pairs(filesGroupedByExperimentOrGlobal).sort(function([ expAAccesion, filesForExpA ], [ expBAccesion, filesForExpB ]){
            // Bubble 'global' exps (aka grouping of files that belong to multiple exps or expset itself)
            // to top.
            if (expAAccesion === 'global') return -1;
            if (expBAccesion === 'global') return 1;
            return 0;
        }), ([ experimentAccession, filesForExperiment ])=>{

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
                <StackedBlockName style={replicateNumbersExists ? { paddingTop : 19, paddingBottom: 19 } : null}>
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
        const { files, collapseLongLists } = this.props;
        const filesGroupedByExperimentOrGlobal = ProcessedFilesStackedTable.filesGroupedByExperimentOrGlobal(files);
        const experimentBlocks = this.renderExperimentBlocks(filesGroupedByExperimentOrGlobal);
        return (
            <StackedBlockTable {..._.omit(this.props, 'children', 'files')} className="expset-processed-files" fadeIn>
                <StackedBlockList className="sets" collapseLongLists={collapseLongLists}>{ experimentBlocks }</StackedBlockList>
            </StackedBlockTable>
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
                    <i className="icon icon-check success" style={{ 'color' : 'green' }}/>
                    &nbsp; { linkToReport ? <a href={linkToReport} target="_blank" rel="noreferrer noopener">Pass</a> : "Pass"}
                </span>
            );
        } else if (val === 'FAIL'){
            return (
                <span>
                    <i className="icon icon-times" style={{ 'color' : 'red' }}/>
                    &nbsp; { linkToReport ? <a href={linkToReport} target="_blank" rel="noreferrer noopener">Fail</a> : "Fail"}
                </span>
            );
        } else {
            return '-';
        }
    }

    render(){
        const { columnHeaders, showMetricColumns, experimentSet } = this.props;
        let extendedPropColHeaders = columnHeaders;

        const origMetricHeaders = RawFilesStackedTable.metricColumnHeaders(showMetricColumns, experimentSet);
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

        return <RawFilesStackedTable {...this.props} columnHeaders={extendedPropColHeaders} />;
    }
}

