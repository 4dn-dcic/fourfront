'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ajax, console, DateUtility, object, isServerSide, Filters, expFxn, layout, Schemas } from './../util';
import * as globals from './../globals';
import { ItemPageTitle, ItemHeader, FormattedInfoBlock, ItemDetailList, ItemFooterRow, Publications, TabbedView, AuditTabView, AttributionTabView, SimpleFilesTable } from './components';
import { OverViewBodyItem, OverviewHeadingContainer } from './DefaultItemView';
import { WorkflowRunTracingView, FileViewGraphSection } from './WorkflowRunTracingView';
import { FacetList, RawFilesStackedTable, ProcessedFilesStackedTable } from './../browse/components';

 
/**
 * ExperimentSet Item view/page.
 *
 * @prop {Object} schemas - state.schemas passed down from app Component.
 * @prop {Object} context - JSON representation of current ExperimentSet item.
 */
export default class ExperimentSetView extends WorkflowRunTracingView {

    static propTypes = {
        'schemas' : PropTypes.object,
        'context' : PropTypes.object
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        var state = {
            'selectedFiles': new Set(),
            'mounted' : false
        };
        if (!this.state) this.state = state; // May inherit from WorkfowRunTracingView
        else _.extend(this.state, state);
    }

    getTabViewContents(){

        var context = this.props.context;

        /* In addition to built-in headers for experimentSetType defined by RawFilesStackedTable */
        var expTableColumnHeaders = [{ 'columnClass' : 'file-detail', 'title' : 'File Info'}];

        if (context.experimentset_type === 'replicate') {
            expTableColumnHeaders.unshift({ 'columnClass' : 'file-detail', 'title' : 'File Type'});
        }

        var processedFiles = expFxn.allProcessedFilesFromExperimentSet(context);

        var width = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;

        if (width) width -= 20;

        var tabs = [];

        // Raw files tab, if have experiments
        if (Array.isArray(context.experiments_in_set) && context.experiments_in_set.length > 0){
            tabs.push({
                tab : <span><i className="icon icon-leaf icon-fw"/> Raw Files</span>,
                key : 'experiments',
                content : <RawFilesStackedTableSection
                    width={width} context={context}
                    {..._.pick(this.props, 'schemas', 'facets')}
                    {...this.state}
                />
            });
        }

        if (processedFiles && processedFiles.length > 0){

            // Processed Files Table Tab
            tabs.push({
                tab : <span><i className="icon icon-microchip icon-fw"/> Processed Files</span>,
                key : 'processed-files',
                content : <ProcessedFilesStackedTableSection
                    processedFiles={processedFiles}
                    width={width} context={context}
                    {..._.pick(this.props, 'schemas')}
                    {...this.state}
                />
            });

            // Graph Section Tab
            if (Array.isArray(context.processed_files) && context.processed_files.length > 0){
                tabs.push(FileViewGraphSection.getTabObject(
                    _.extend({}, this.props, {
                        'isNodeCurrentContext' : function(node){
                            var context = this.props.context;
                            if (!context) return false;
                            if (!node || !node.meta || !node.meta.run_data || !node.meta.run_data.file) return false;
                            if (Array.isArray(node.meta.run_data.file)) return false;
                            if (typeof node.meta.run_data.file.accession !== 'string') return false;
                            if (!context.processed_files || !Array.isArray(context.processed_files) || context.processed_files === 0) return false;
                            if (_.contains(_.pluck(context.processed_files, 'accession'), node.meta.run_data.file.accession)) return true;
                            return false;
                        }.bind(this)
                    }),
                    this.state,
                    this.handleToggleAllRuns
                ));
            }
        }

        return tabs.concat(this.getCommonTabs()).map((tabObj)=>{
            return _.extend(tabObj, {
                'style' : { minHeight : Math.max(this.state.mounted && !isServerSide() && (window.innerHeight - 180), 100) || 800 }
            });
        });

    }

    itemHeader(){
        return <ExperimentSetHeader {...this.props} />;
    }

    itemMidSection(){
        return [<Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} />, <OverviewHeading context={this.props.context} />];
    }

    itemFooter(){
        return <ItemFooterRow context={this.props.context} schemas={this.props.schemas} />;
    }

}

// Register ExperimentSetView to be the view for these @types.
globals.content_views.register(ExperimentSetView, 'ExperimentSet');
globals.content_views.register(ExperimentSetView, 'ExperimentSetReplicate');

class OverviewHeading extends React.Component {
    render(){
        var expSet = this.props.context;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), expSet);
        var commonProps = { 'result' : expSet, 'tips' : tips, 'wrapInColumn' : 'col-sm-6 col-md-3' };
        return (
            <OverviewHeadingContainer {...this.props}>
                {/* <OverViewBodyItem result={expSet} tips={tips} property='award.project' fallbackTitle="Project" wrapInColumn={col} /> */}
                <OverViewBodyItem {...commonProps} property='experimentset_type' fallbackTitle="Set Type" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.biosource.individual.organism' fallbackTitle="Organism" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.biosource.biosource_type' fallbackTitle="Biosource Type" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.biosource_summary' fallbackTitle="Biosource" />

                <OverViewBodyItem {...commonProps} property='experiments_in_set.experiment_type' fallbackTitle="Experiment Type(s)" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.digestion_enzyme' fallbackTitle="Enzyme" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.modifications.modification_type' fallbackTitle="Modification Type" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.treatments.treatment_type' fallbackTitle="Treatment Type" />
            </OverviewHeadingContainer>
        );
    }
}




/**
 * Renders ItemHeader parts wrapped in ItemHeader.Wrapper, with appropriate values.
 * 
 * @memberof module:item-pages/experiment-set-view
 * @private
 * @prop {Object} context - Same context prop as available on parent component.
 * @prop {string} href - Current page href, passed down from app or Redux store.
 */
class ExperimentSetHeader extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        if (this.props.debug) console.log('render ExperimentSetHeader');
        return (
            <ItemHeader.Wrapper className="exp-set-header-area" context={this.props.context} href={this.props.href} schemas={this.props.schemas}>
                <ItemHeader.TopRow />
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }
}


export class RawFilesStackedTableSection extends React.Component {
    render(){
        /* In addition to built-in headers for experimentSetType defined by RawFilesStackedTable */
        var expTableColumnHeaders = [
            { columnClass: 'file-detail', title: 'File Info'},
            { columnClass: 'file-detail', title: 'File Size', initialWidth: 80, field : "file_size" }
        ];

        if (this.props.context.experimentset_type === 'replicate') {
            expTableColumnHeaders.unshift({ columnClass: 'file-detail', title : 'File Type'});
        }

        var context = this.props.context;
        var files = expFxn.allFilesFromExperimentSet(context);
        var fileCount = files.length;
        var expSetCount = (context.experiments_in_set && context.experiments_in_set.length) || 0;
        return (
            <div className="exp-table-section">
                { expSetCount ? 
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ fileCount }</span> Raw Files</span>
                </h3>
                : null }
                <div className="exp-table-container">
                    <RawFilesStackedTable
                        ref="experimentsTable"
                        width={this.props.width}
                        experimentSetType={this.props.context.experimentset_type}
                        facets={ this.props.facets }
                        experimentSetAccession={this.props.context.accession || null}
                        experimentArray={this.props.context.experiments_in_set}
                        replicateExpsArray={this.props.context.replicate_exps}
                        keepCounts={false}
                        columnHeaders={expTableColumnHeaders}
                    />
                </div>
            </div>
        );
    }
}

export class ProcessedFilesStackedTableSection extends React.Component {
    render(){
        return (
            <div className="processed-files-table-section">
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ this.props.processedFiles.length }</span> Processed Files</span>
                </h3>
                <ProcessedFilesStackedTable
                    files={this.props.processedFiles}
                    width={this.props.width}
                    experimentSetAccession={this.props.context.accession || null}
                    experimentArray={this.props.context.experiments_in_set}
                    replicateExpsArray={this.props.context.replicate_exps}
                    collapseLongLists={false}
                />
            </div>
        );
    }
}



