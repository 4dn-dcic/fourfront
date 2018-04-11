'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { FacetList } from './FacetList';
import { StackedBlock, StackedBlockList, StackedBlockName, StackedBlockTable, FileEntryBlock, FilePairBlock, FileEntryBlockPairColumn } from './StackedBlockTable';
import { expFxn, Filters, console, isServerSide, analytics, object } from './../../util';


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


export class RawFilesStackedTable extends React.Component {

    static StackedBlock = StackedBlock

    static builtInHeaders(expSetType = 'replicate'){
        switch (expSetType){
            case 'replicate' :
                return [
                    { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
                    { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
                    { columnClass: 'file-pair',                                 title: 'File Pair',     initialWidth: 40,   visibleTitle : function(stackedBlockProps){
                        if (stackedBlockProps.selectedFiles && typeof stackedBlockProps.selectFile === 'function' && typeof stackedBlockProps.unselectFile === 'function'){
                            return <i className="icon icon-download"/>;
                        }
                        return null;
                    } },
                    { columnClass: 'file',                                      title: 'File',          initialWidth: 125   }
                ];
            default:
                return [
                    { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
                    { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
                    { columnClass: 'file',                                      title: 'File',          initialWidth: 125   }
                ];
        }

    }

    static propTypes = {
        'columnHeaders'             : PropTypes.array,
        'experimentArray'           : PropTypes.array,
        'selectedFiles'             : PropTypes.object,
        'experimentSetAccession'    : PropTypes.string.isRequired,
        'replicateExpsArray'        : PropTypes.arrayOf(PropTypes.shape({
            'bio_rep_no'                : PropTypes.number.isRequired,
            'tec_rep_no'                : PropTypes.number.isRequired,
            'replicate_exp'             : PropTypes.shape({
                'accession'                 : PropTypes.string,
                'uuid'                      : PropTypes.string,
                'link_id'                   : PropTypes.string
            }).isRequired
        })).isRequired,
        'keepCounts'                : PropTypes.bool, // Whether to run updateCachedCounts and store output in this.counts (get from instance if ref, etc.),
        'collapseLongLists'         : PropTypes.bool
    }

    static defaultProps = {
        'keepCounts'    : false,
        'fadeIn'        : true,
        'width'         : null,
        'columnHeaders'     : [
            { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
            { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
            { columnClass: 'file',                                      title: 'File Info',     initialWidth: 120   },
            { columnClass: 'file-detail', title: 'File Size', initialWidth: 80, field : "file_size" }
        ],
        'collapseLongLists' : true
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.staticColumnHeaders = this.staticColumnHeaders.bind(this);
        this.customColumnHeaders = this.customColumnHeaders.bind(this);
        this.columnHeaders = this.columnHeaders.bind(this);
        this.renderExperimentBlock = this.renderExperimentBlock.bind(this);
        this.renderBiosampleStackedBlockOfExperiments = this.renderBiosampleStackedBlockOfExperiments.bind(this);
        this.renderRootStackedBlockListOfBiosamplesWithExperiments = this.renderRootStackedBlockListOfBiosamplesWithExperiments.bind(this);
        this.renderers.replicate = this.renderers.replicate.bind(this);
        this.renderers.default = this.renderers.default.bind(this);


        this.cache = {
            oddExpRow : true
        };
        var initialState = {
            columnWidths : null, // set on componentDidMount via updateColumnWidths
            mounted : false
        };
        this.state = initialState;
    }


    /* Built-in headers for props.experimentSetType, extended by any matching title from props.columnHeaders */
    staticColumnHeaders(){
        if (this.cache.staticColumnHeaders) return this.cache.staticColumnHeaders;
        this.cache.staticColumnHeaders = RawFilesStackedTable.builtInHeaders(this.props.experimentSetType).map((staticCol) => {
            return _.extend(
                _.clone(staticCol),
                _.findWhere(this.props.columnHeaders, { title : staticCol.title }) || {}
            );
        });
        return this.cache.staticColumnHeaders;
    }

    /* Any non built-in (for experimentSetType) headers from props.columnHeaders */
    customColumnHeaders(){
        if (this.cache.customColumnHeaders) return this.cache.customColumnHeaders;
        this.cache.customColumnHeaders = this.props.columnHeaders.filter((col) => {
            return  !_.contains(_.pluck(RawFilesStackedTable.builtInHeaders(this.props.experimentSetType), 'title'), col.title);
        });
        return this.cache.customColumnHeaders;
    }

    /* Combined top row of headers */
    columnHeaders(){
        return this.staticColumnHeaders().concat(this.customColumnHeaders());
    }


    renderExperimentBlock(exp,i){
        this.cache.oddExpRow = !this.cache.oddExpRow;
        var columnHeaders = this.columnHeaders();

        var contentsClassName = 'files';
        var contents = [];

        if (Array.isArray(exp.file_pairs)){
            contentsClassName = 'file-pairs';
            contents = contents.concat(exp.file_pairs.map((filePair,j) => {
                if (filePair.length === 1){
                    return <FileEntryBlockPairColumn
                        key={object.atIdFromObject(filePair[0]) || j}
                        file={filePair[0]}
                        experiment={exp}
                        label={ exp.file_pairs.length > 1 ?
                            { title : "Pair " + (j + 1) } : { title : "Pair" }
                        }
                        hideNameOnHover={false}
                        isSingleItem={_.reduce(exp.file_pairs, function(m,fp){ return m + (fp || []).length; }, 0) + exp.files.length + contents.length < 2 ? true : false}
                    />;
                } else {
                    return <FilePairBlock
                        key={j}
                        files={filePair}
                        experiment={exp}
                        label={ exp.file_pairs.length > 1 ?
                            { title : "Pair " + (j + 1) } : { title : "Pair" }
                        }
                        isSingleItem={_.reduce(exp.file_pairs, function(m,fp){ return m + (fp || []).length; }, 0) + exp.files.length + contents.length < 2 ? true : false}
                    />;
                }
            }));
        }

        // Add in remaining unpaired files, if any.
        if (Array.isArray(exp.files) && exp.files.length > 0){
            contents = contents.concat(exp.files.map((file, j) =>
                <FileEntryBlockPairColumn
                    key={object.atIdFromObject(file) || j}
                    file={file}
                    columnClass="file-pair"
                    hideNameOnHover={false}
                    experiment={exp}
                    isSingleItem={exp.files.length + contents.length < 2 ? true : false}
                />
            ));
        }

        if (contents.length === 0){
            /* No Files Exist */
            contents.push(
                <StackedBlock
                    key="single-empty-item"
                    hideNameOnHover={false}
                    columnClass="file-pair"
                >
                    { _.pluck(columnHeaders, 'title').indexOf('File Pair') > -1 ? <StackedBlockName/> : null }
                    <StackedBlockList title="Files" className="files">
                        <FileEntryBlock file={null} columnHeaders={columnHeaders} />
                    </StackedBlockList>
                </StackedBlock>
            );
        }

        var experimentVisibleName = (
            exp.tec_rep_no ? 'Tech Replicate ' + exp.tec_rep_no :
                exp.experiment_type ? exp.experiment_type : exp.accession
        );

        var experimentAtId = object.itemUtil.atId(exp);
        var linkTitle = !experimentAtId && exp.error ? <em>{ exp.error }</em> : experimentVisibleName;

        return (
            <StackedBlock
                key={ experimentAtId || exp.tec_rep_no || i }
                hideNameOnHover={false}
                columnClass="experiment"
                label={{
                    'accession'       : exp.accession,
                    'title'           : 'Experiment',
                    'subtitle'        : experimentVisibleName,
                    'subtitleVisible' : true
                }}
                stripe={this.cache.oddExpRow}
                id={(exp.bio_rep_no && exp.tec_rep_no) ? 'exp-' + exp.bio_rep_no + '-' + exp.tec_rep_no : exp.accession || object.atIdFromObject(exp)}
            >
                <StackedBlockName relativePosition={expFxn.fileCount(exp) > 6}>
                    { experimentAtId ? <a href={experimentAtId} className="name-title">{ linkTitle }</a> : <span className="name-title">{ linkTitle }</span> }
                </StackedBlockName>
                <StackedBlockList
                    className={contentsClassName}
                    collapseLimit={this.props.collapseLimit || 3}
                    collapseShow={this.props.collapseShow || 2}
                    title={contentsClassName === 'file-pairs' ? 'File Pairs' : 'Files'}
                    children={contents}
                />
            </StackedBlock>
        );
    }

    renderBiosampleStackedBlockOfExperiments(expsWithBiosample,i){
        this.cache.oddExpRow = false; // Used & toggled by experiment stacked blocks for striping.
        var biosample = expsWithBiosample[0].biosample;

        var bioRepTitle = biosample.bio_rep_no ? 'Bio Replicate ' + biosample.bio_rep_no : biosample.biosource_summary;
        var biosampleAtId = object.itemUtil.atId(biosample);
        var linkTitle = !biosampleAtId && biosample.error ? <em>{ biosample.error }</em> : bioRepTitle;
        return (
            <StackedBlock
                columnClass="biosample"
                hideNameOnHover={false}
                key={biosampleAtId || biosample.bio_rep_no || i }
                id={'bio-' + (biosample.bio_rep_no || i + 1)}
                label={{
                    title : 'Biosample',
                    subtitle : bioRepTitle,
                    subtitleVisible : true,
                    accession : biosample.accession
                }}
            >
                <StackedBlockName relativePosition={expsWithBiosample.length > 3 || expFxn.fileCountFromExperiments(expsWithBiosample) > 6}>
                    { biosampleAtId ? <a href={biosampleAtId} className="name-title">{ linkTitle }</a> : <span className="name-title">{ linkTitle }</span> }
                </StackedBlockName>
                <StackedBlockList
                    className="experiments"
                    title="Experiments"
                    children={_.map(expsWithBiosample, this.renderExperimentBlock)}
                    collapseLimit={this.props.collapseLimit || 3}
                    collapseShow={this.props.collapseShow || 2}
                    showMoreExtTitle={
                        expsWithBiosample.length > 5 ?
                            'with ' + (
                                _.all(expsWithBiosample.slice(3), function(exp){
                                    return exp.file_pairs !== 'undefined';
                                }) ? /* Do we have filepairs for all exps? */
                                    _.flatten(_.pluck(expsWithBiosample.slice(3), 'file_pairs'), true).length +
                                    ' File Pairs'
                                    :
                                    expFxn.fileCountFromExperiments(expsWithBiosample.slice(3)) + 
                                    ' Files'
                            )
                            :
                            null
                    }
                />

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
    renderRootStackedBlockListOfBiosamplesWithExperiments(experimentsGroupedByBiosample){
        return (
            <StackedBlockList
                className="biosamples"
                title="Biosamples"
                children={experimentsGroupedByBiosample.map(this.renderBiosampleStackedBlockOfExperiments)}
                rootList={true}
                showMoreExtTitle={
                    experimentsGroupedByBiosample.length > 5 ?
                        'with ' + _.flatten(experimentsGroupedByBiosample.slice(3), true).length + ' Experiments'
                        :
                        null
                }
            />
        );
    }

    renderers = {

        replicate : function(){

            var experimentsGroupedByBiosample = _.compose(
                this.renderRootStackedBlockListOfBiosamplesWithExperiments,
                expFxn.groupExperimentsByBiosampleRepNo,
                expFxn.groupFilesByPairsForEachExperiment,
                expFxn.combineWithReplicateNumbers
            );

            return experimentsGroupedByBiosample(this.props.replicateExpsArray, this.props.experimentArray);
        },

        default : function(){
            var experimentsGroupedByBiosample = _.compose(
                this.renderRootStackedBlockListOfBiosamplesWithExperiments,
                expFxn.groupExperimentsByBiosample,
                expFxn.flattenFileSetsToFilesIfNoFilesForEachExperiment
            );

            return experimentsGroupedByBiosample(this.props.experimentArray);
        }
    }

    render(){
        var columnHeaders = this.columnHeaders();
        return (
            <StackedBlockTable
                columnHeaders={columnHeaders}
                className="expset-raw-files"
                fadeIn
                selectedFiles={this.props.selectedFiles}
                selectFile={this.props.selectFile}
                unselectFile={this.props.unselectFile}
                experimentSetAccession={this.props.experimentSetAccession}
                collapseLongLists={this.props.collapseLongLists}
                width={this.props.width}
            >
                {   !Array.isArray(this.props.experimentArray) ? null :
                    this.props.experimentSetType && typeof this.renderers[this.props.experimentSetType] === 'function' ?
                        this.renderers[this.props.experimentSetType]() : this.renderers.default()
                }
            </StackedBlockTable>
        );
    }

}


export class ProcessedFilesStackedTable extends React.Component {

    static propTypes = {
        'experimentSetAccession' : PropTypes.string.isRequired, // These must have .experiments property, which itself should have .experiment_sets property. There's a utility function to get all files
        'files' : PropTypes.array.isRequired
    };

    static defaultProps = {
        'columnHeaders' : [
            //{ columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
            { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
            //{ columnClass: 'file-pair',                                 title: 'File Pair',     initialWidth: 40,   visibleTitle : <i className="icon icon-download"></i> },
            { columnClass: 'file',                                      title: 'File',          initialWidth: 100   },
            { columnClass: 'file-detail', title: 'File Type', initialWidth: 90 },
            { columnClass: 'file-detail', title: 'File Size', initialWidth: 80, field : "file_size" }
        ],
        'collapseLongLists' : true,
        'nonFileHeaderCols' : ['experiment', 'file'],
        'titleForFiles'     : 'Processed Files'
    };

    constructor(props){
        super(props);
        this.oddExpRow = false;
    }

    componentWillUpdate(nextProps, nextState){
        this.oddExpRow = false;
    }

    renderFileBlocksForExperiment(experimentAccession, filesForExperiment, experimentObj){
        return _.map(filesForExperiment, (file) => {
            this.oddExpRow = !this.oddExpRow;
            return (
                <FileEntryBlock
                    key={object.atIdFromObject(file)}
                    file={file}
                    hideNameOnHover={false}
                    experimentAccession={experimentAccession === 'global' ? 'NONE' : experimentAccession}
                    isSingleItem={filesForExperiment.length === 1}
                    stripe={this.oddExpRow}
                />
            );
        });
    }

    renderExperimentBlocks(filesGroupedByExperimentOrGlobal){

        return _.map(_.pairs(filesGroupedByExperimentOrGlobal).sort(function(aP, bP){
            if (aP[0] === 'global') return -1;
            if (bP[0] === 'global') return 1;
            return 0;
        }), (p)=>{
            var experimentAccession = p[0];
            var filesForExperiment = p[1];
            var experimentObj = _.find(_.pluck(filesForExperiment, 'from_experiment'), function(exp){ return exp && exp.accession && exp.accession === experimentAccession; });

            var nameTitle = (
                experimentAccession === 'global' ? <div style={{ fontSize : '1.25rem', lineHeight : '16px', height: 16 }} className="text-300">Multiple Experiments</div>
                : (experimentObj && typeof experimentObj.display_title === 'string' && experimentObj.display_title.replace(' - ' + experimentAccession, '')) || experimentAccession
            );
            var nameLink = (experimentAccession !== 'global' && object.atIdFromObject(experimentObj)) || null;
            var repsExist = experimentObj && experimentObj.bio_rep_no && experimentObj.tec_rep_no;
            var nameBlock = (
                <StackedBlockName
                    style={
                        repsExist ? { paddingTop : 19, paddingBottom: 19 }
                        : null
                    }
                >
                    { repsExist ?
                        <div>Bio Rep <b>{ experimentObj.bio_rep_no }</b>, Tec Rep <b>{ experimentObj.tec_rep_no }</b></div>
                    : <div/> }
                    { nameLink ?
                        <a href={nameLink} className="name-title text-500">{ nameTitle }</a>
                        :
                        <div className={"name-title" + (nameTitle === this.props.experimentSetAccession ? ' mono-text' : '')}>{ nameTitle }</div>
                    }
                    
                </StackedBlockName>
            );
            return (
                <StackedBlock
                    columnClass="experiment"
                    hideNameOnHover={experimentAccession === 'global'}
                    key={experimentAccession}
                    id={'exp-' + experimentAccession}
                    label={{
                        title : experimentAccession === 'global' ? 'From Multiple Experiments' : 'Experiment',
                        //subtitle : visibleBiosampleTitle,
                        subtitleVisible : true,
                        accession : experimentAccession === 'global' ? this.props.experimentSetAccession : experimentAccession
                    }}>
                    { nameBlock }
                    <StackedBlockList
                        className="files"
                        title={this.props.titleForFiles}
                        children={ this.renderFileBlocksForExperiment(experimentAccession, filesForExperiment, experimentObj) /*expsWithBiosample.map(this.renderExperimentBlock)*/}
                        showMoreExtTitle={null} />
                </StackedBlock>
            );

        });

    }

    doRender(files = this.props.files){

        var { collapseLongLists, width, experimentSetAccession, selectedFiles, selectFile, unselectFile, columnHeaders } = this.props;

        // Contains: { 'experiments' : { 'ACCESSSION1' : [..file_objects..], 'ACCESSION2' : [..file_objects..] }, 'experiment_sets' : { 'ACCESSION1' : [..file_objects..] } }
        var groupedFiles = expFxn.processedFilesFromExperimentSetToGroup(files);
        var filesGroupedByExperimentOrGlobal = _.clone(groupedFiles.experiments);

        // This should always be true (or false b.c of 0). It might change to not always be true (> 1). In this case, we should, figure out a different way of handling it. Like an extra stacked block at front for ExpSet.
        var expSetAccessions = _.keys(groupedFiles.experiment_sets || {});
        if (expSetAccessions.length === 1){
            filesGroupedByExperimentOrGlobal.global = groupedFiles.experiment_sets[expSetAccessions[0]];
        } else if (expSetAccessions.length > 1) {
            console.error('Theres more than 1 ExpSet for these files/sets - ', expSetAccessions, groupedFiles);
        }

        return (
            <StackedBlockTable
                columnHeaders={columnHeaders}
                className="expset-processed-files" fadeIn
                selectedFiles={selectedFiles} selectFile={selectFile} unselectFile={unselectFile}
                experimentSetAccession={experimentSetAccession}
                width={width} collapseLongLists={collapseLongLists}
            >
                <StackedBlockList
                    className="sets"
                    title="Experiments"
                    children={this.renderExperimentBlocks(filesGroupedByExperimentOrGlobal)}
                    rootList={true}
                    //showMoreExtTitle={
                        //experimentsGroupedByBiosample.length > 5 ?
                        //    'with ' + _.flatten(experimentsGroupedByBiosample.slice(3), true).length + ' Experiments'
                        //    :
                        //    null
                    //}
                />
            </StackedBlockTable>
        );
    }

    render(){
        return this.doRender(this.props.files);
    }

}



export class ProcessedFilesQCStackedTable extends ProcessedFilesStackedTable {

    static filterFiles(files){
        return _.filter(files.slice(0), function(f){
            return f.quality_metric && f.quality_metric.overall_quality_status;
        });
    }

    static defaultProps = {
        'columnHeaders' : [
            //{ columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
            { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
            //{ columnClass: 'file-pair',                                 title: 'File Pair',     initialWidth: 40,   visibleTitle : <i className="icon icon-download"></i> },
            { columnClass: 'file',        title: 'For File',          initialWidth: 100   },
            { columnClass: 'file-detail', title: 'Total Reads', initialWidth: 80, field : "quality_metric.Total reads" },
            { columnClass: 'file-detail', title: 'Cis/Trans Ratio', initialWidth: 80, field : "quality_metric.Cis/Trans ratio" },
            { columnClass: 'file-detail', title: '% LR IC Reads', initialWidth: 80, field : "quality_metric.% Long-range intrachromosomal reads" },
            { columnClass: 'file-detail', title: 'Link to Report', initialWidth: 80, field : "quality_metric.url" }
        ],
        'titleForFiles' : "Processed File Metrics"
    }

}

export class RawFilesQCStackedTable extends ProcessedFilesQCStackedTable {

    static defaultProps = {
        'columnHeaders' : [
            //{ columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
            { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
            //{ columnClass: 'file-pair',                                 title: 'File Pair',     initialWidth: 40,   visibleTitle : <i className="icon icon-download"></i> },
            { columnClass: 'file',        title: 'For File',          initialWidth: 120   },
            { columnClass: 'file-detail', title: 'Total Sequences', initialWidth: 110, field : "quality_metric.Total Sequences" },
            { columnClass: 'file-detail', title: 'Sequence Length', initialWidth: 110, field : "quality_metric.Sequence length" },
            { columnClass: 'file-detail', title: 'Overall Quality', initialWidth: 110, field : "quality_metric.overall_quality_status" },
            { columnClass: 'file-detail', title: 'Link to Report', initialWidth: 145, field : "quality_metric.url" },
            //{ columnClass: 'file-detail', title: 'Overall Quality', initialWidth: 80, field : "quality_metric.overall_quality_status" }
        ],
        'titleForFiles' : "Raw File Metrics"
    }

}


