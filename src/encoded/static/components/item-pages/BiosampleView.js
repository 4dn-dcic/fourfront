'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox, MenuItem, Dropdown, DropdownButton } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility } from './../util';
import { FormattedInfoBlock } from './components';
import { ItemBaseView, OverViewBodyItem } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable } from './../browse/components';
import { browseTableConstantColumnDefinitions } from './../browse/BrowseView';



export default class BiosampleView extends ItemBaseView {

    getFilesTabs(width){
        var context = this.props.context;
        
        /* In addition to built-in headers for experimentSetType defined by RawFilesStackedTable */
        var expTableColumnHeaders = [
        ];

        

        var tabs = [];

        if (Array.isArray(context.files) && context.files.length > 0) {
            
            tabs.push({
                tab : <span><i className="icon icon-leaf icon-fw"/> Raw Files</span>,
                key : 'raw-files',
                content : <RawFilesTableSection
                    rawFiles={context.files}
                    width={width}
                    {..._.pick(this.props, 'context', 'schemas')}
                    {...this.state}
                />
            });

        }

        if (Array.isArray(context.processed_files) && context.processed_files.length > 0) {
            
            tabs.push({
                tab : <span><i className="icon icon-microchip icon-fw"/> Processed Files</span>,
                key : 'processed-files',
                content : <ProcessedFilesTableSection
                    processedFiles={context.processed_files}
                    width={width}
                    {..._.pick(this.props, 'context', 'schemas')}
                    {...this.state}
                />
            });

        }

        return tabs;
    }

    getTabViewContents(){

        var initTabs = [];
        var context = this.props.context;
        var width = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;
        if (width) width -= 20;

        initTabs.push(BiosampleViewOverview.getTabObject(context, this.props.schemas, width));

        return initTabs.concat(this.getCommonTabs());
    }

}

globals.panel_views.register(BiosampleView, 'Biosample');



export class BiosourcesTable extends React.Component {

    static defaultProps = {
        'columns' : {
            "biosource_type"       : "Type",
            "biosource_vendor"         : "Vendor",
            "cell_line" : "Cell Line",
            "individual" : "Individual",
        },
        'columnDefinitionOverrideMap' : _.extend({
            "individual" : {
                "render" : function(result, columnDefinition, props, width){
                    if (!result || !result.individual || !object.atIdFromObject(result.individual)) return '-';
                    var indv = result.individual;
                    var href = object.atIdFromObject(indv);
                    var sex = null;
                    if (indv.sex && typeof indv.sex === 'string'){
                        if (indv.sex.toLowerCase() === 'female'){
                            sex = <i className="icon icon-fw icon-venus"/>;
                        } else if (indv.sex.toLowerCase() === 'male'){
                            sex = <i className="icon icon-fw icon-mars"/>;
                        }
                    }
                    var title = indv.display_title;
                    var organism = null;
                    if (indv.organism && indv.organism.name && typeof indv.organism.name === 'string' && title.indexOf(indv.organism.name) === -1){
                        organism = Schemas.Term.capitalizeSentence(indv.organism.name);
                    }
                    return <span>{ sex } { organism ? <span className={(object.isAccessionRegex(organism) ? 'mono-text' : null)}> { organism } - </span> : null }
                        <a href={href} className={object.isAccessionRegex(title) ? 'mono-text' : null}>{ title }</a>
                    </span>;
                }
            }
        }, ItemPageTable.defaultProps.columnDefinitionOverrideMap)
    }

    render(){
        return (
            <ItemPageTable
                results={this.props.biosources}
                renderDetailPane={null}
                schemas={this.props.schemas}
                columns={this.props.columns}
                columnDefinitionOverrideMap={this.props.columnDefinitionOverrideMap}
                width={this.props.width}
            />
        );
    }

}




class BiosampleViewOverview extends React.Component {

    static getTabObject(context, schemas, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'experiments-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <BiosampleViewOverview context={context} schemas={schemas} width={width} />
                </div>
            )
        };
    }

    constructor(props){
        super(props);
        this.state = { mounted : false };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    render(){
        var { context, width } = this.props;

        var table = null;

        if (Array.isArray(context.biosource) && context.biosource.length > 0){
            table = (
                <div className="mt-3">
                    <h3 className="tab-section-title">
                        <span>Biosources</span>
                    </h3>
                    <BiosourcesTable biosources={context.biosource} width={this.state.mounted? width : 1140} />
                </div>
            );
        }

        return (
            <div>
                <OverViewBody result={context} schemas={this.props.schemas} />
                <CellCultureInfoBody result={context} schemas={this.props.schemas} />
                { table }
            </div>
        );

    }

}


class OverViewBody extends React.Component {

    render(){
        var result = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), result);

        return (
            <div className="row">
                <div className="col-md-12 col-xs-12">
                    <div className="row overview-blocks">

                        <div className="col-xs-6 col-md-4">
                            <OverViewBodyItem {...{ result, tips }} property='modifications' fallbackTitle="Stable Genomic Modifications" />
                        </div>

                        { Array.isArray(result.treatments) && result.treatments.length > 0 ?
                            <div className="col-xs-6 col-md-4">
                                <OverViewBodyItem {...{ result, tips }} property='treatments' fallbackTitle="Treatment" titleRenderFxn={function(field, treatment){
                                    return <div><a href={object.atIdFromObject(treatment)}>{ treatment.display_title }</a><div>({ treatment.treatment_type })</div></div>;
                                }} />
                            </div>
                        : null }

                        <div className="col-xs-6 col-md-4">
                            <OverViewBodyItem {...{ result, tips }} property='biosample_protocols' fallbackTitle="Biosample Protocols" />
                        </div>

                        


                    </div>

                </div>

            </div>
        );

    }
}

class CellCultureInfoBody extends React.Component {

    render(){
        var result = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), result);
        var cell_culture = result.cell_culture_details;

        if (!cell_culture || !object.atIdFromObject(cell_culture) || !Array.isArray(cell_culture['@type'])) return null;

        var tipsForCellCulture = object.tipsFromSchema(this.props.schemas || Schemas.get(), cell_culture);

        return (
            <div className="row">
                <div className="col-md-12 col-xs-12">
                    <h3 className="tab-section-title">
                        <span>Cell Culture</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                </div>
                <div className="col-md-12 col-xs-12">
                    <div className="row overview-blocks">

                        <div className="col-xs-6 col-md-4">
                            <OverViewBodyItem {...{ result, tips }} property='cell_culture_details' fallbackTitle="Cell Culture Information" />
                        </div>

                        <div className="col-xs-6 col-md-4">
                            <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='description' fallbackTitle="Description" />
                        </div>

                        <div className="col-xs-6 col-md-4">
                            <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='synchronization_stage' fallbackTitle="Synchronization Stage" />
                        </div>

                        <div className="col-xs-6 col-md-4">
                            <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='culture_duration' fallbackTitle="Total Days in Culture" />
                        </div>

                        <div className="col-xs-6 col-md-4">
                            <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='culture_start_date' fallbackTitle="Culture Start Date" titleRenderFxn={(field, value)=>{
                                return cell_culture.culture_start_date ? <DateUtility.LocalizedTime timestamp={cell_culture.culture_start_date}/> : 'None';
                            }} />
                        </div>


                    </div>

                </div>
            </div>
        );

    }
}




