'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility } from './../util';
import { FormattedInfoBlock, ExperimentSetTablesLoadedFromSearch } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';
import { IndividualItemTitle } from './BiosourceView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable } from './../browse/components';


export default class BiosampleView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [],
            context = this.props.context,
            windowWidth = this.props.windowWidth,
            width = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;

        if (width) width -= 20;

        initTabs.push(BiosampleViewOverview.getTabObject(this.props, width));
        initTabs.push(ExpSetsUsedIn.getTabObject(this.props, width));

        return initTabs.concat(this.getCommonTabs());
    }

}

globals.content_views.register(BiosampleView, 'Biosample');



export class BiosourcesTable extends React.PureComponent {

    static defaultProps = {
        'columns' : {
            "display_title" : { "title" : "Title" },
            "biosource_type" : { "title" : "Type" },
            "biosource_vendor" : { "title" : "Vendor" },
            "cell_line" : { "title" : "Cell Line" },
            "individual" : {
                "title" : "Individual",
                "render" : function(result, columnDefinition, props, width){
                    if (!result || !result.individual || !object.atIdFromObject(result.individual)) return '-';
                    return <IndividualItemTitle context={result.individual} />;
                }
            }
        }
    }

    render(){
        return <ItemPageTable {..._.pick(this.props, 'schemas', 'columns', 'width')} results={this.props.biosources} renderDetailPane={null} />;
    }

}




class BiosampleViewOverview extends React.Component {

    static getTabObject({context, schemas, windowWidth }, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'biosample-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <BiosampleViewOverview {...{ context, schemas, width, windowWidth }} />
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
        var { context, width, windowWidth, schemas } = this.props;

        var biosources = null;

        if (Array.isArray(context.biosource) && context.biosource.length > 0){
            if (context.biosource.length > 1){
                biosources = (
                    <div className="mt-3">
                        <h3 className="tab-section-title">
                            <span>Biosources</span>
                        </h3>
                        <BiosourcesTable biosources={context.biosource} width={this.state.mounted? width : 1140} windowWidth={windowWidth} />
                    </div>
                );
            } else {
                biosources = <BiosourceInfoBody result={context} biosource={context.biosource[0]} windowWidth={windowWidth} />;
            }
        }

        return (
            <div>
                <OverViewBody result={context} schemas={schemas} windowWidth={windowWidth} />
                { biosources }
                <CellCultureInfoBody result={context} schemas={schemas} windowWidth={windowWidth} />
            </div>
        );

    }

}


class OverViewBody extends React.Component {

    render(){
        var result = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), result);

        var commonProps = {
            result, tips,
            'wrapInColumn' : true,
            //'listItemElement' : 'div',
            //'listWrapperElement' : 'div',
            //'singleItemClassName' : 'block'
        };

        return (
            <div className="row">
                <div className="col-md-12 col-xs-12">
                    <div className="row overview-blocks">

                        <OverViewBodyItem {...commonProps} property='modifications' fallbackTitle="Stable Genomic Modifications" />

                        <OverViewBodyItem {...commonProps} property='treatments' fallbackTitle="Treatment" titleRenderFxn={OverViewBodyItem.titleRenderPresets.biosample_treatments} />

                        <OverViewBodyItem {...commonProps} property='biosample_protocols' listItemElement='div' listWrapperElement='div' singleItemClassName="block" fallbackTitle="Biosample Protocols" titleRenderFxn={OverViewBodyItem.titleRenderPresets.embedded_item_with_attachment} />

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
            <div className="row mt-3">
                <div className="col-md-12 col-xs-12">
                    <h3 className="tab-section-title">
                        <span>Cell Culture</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                </div>
                <div className="col-md-12 col-xs-12">
                    <div className="row overview-blocks">

                        <OverViewBodyItem {...{ result, tips }} property='cell_culture_details' fallbackTitle="Cell Culture Information" wrapInColumn />

                        <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='description' fallbackTitle="Description" wrapInColumn />

                        <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='synchronization_stage' fallbackTitle="Synchronization Stage" wrapInColumn />

                        <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='morphology_image' fallbackTitle="Morphology Image" singleItemClassName="block" wrapInColumn titleRenderFxn={OverViewBodyItem.titleRenderPresets.embedded_item_with_image_attachment} />

                        <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='culture_duration' fallbackTitle="Total Days in Culture" wrapInColumn />
 
                        <OverViewBodyItem result={cell_culture} tips={tipsForCellCulture} property='culture_start_date' fallbackTitle="Culture Start Date" wrapInColumn titleRenderFxn={OverViewBodyItem.titleRenderPresets.local_date_time} />

                    </div>

                </div>
            </div>
        );

    }
}

class BiosourceInfoBody extends React.Component {
    
    render(){
        var result = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), result);
        var biosource = _.extend({ '@type' : ['Biosource', 'Item'] }, this.props.biosource); // WE EXPECT ONLY 1!

        if (!biosource || !object.atIdFromObject(biosource) || !biosource.display_title) return null;

        var tipsForBiosource = object.tipsFromSchema(this.props.schemas || Schemas.get(), biosource);

        return (
            <div className="row mt-3">
                <div className="col-md-12 col-xs-12">
                    <h3 className="tab-section-title">
                        <span>Biosource</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                </div>
                <div className="col-md-12 col-xs-12">
                    <div className="row overview-blocks">

                        <OverViewBodyItem result={result} tips={tips} property='biosource' fallbackTitle="Biosource" wrapInColumn />

                        <OverViewBodyItem result={biosource} tips={tipsForBiosource} property='biosource_type' fallbackTitle="Biosource Type" wrapInColumn />
                        
                        <OverViewBodyItem result={biosource} tips={tipsForBiosource} property='cell_line' fallbackTitle="Cell Line Name" wrapInColumn hideIfNoValue />

                        <OverViewBodyItem result={biosource} tips={tipsForBiosource} property='individual' fallbackTitle="Individual" wrapInColumn titleRenderFxn={function(field, val){
                            return <IndividualItemTitle context={val} />;
                        }} />

                        <OverViewBodyItem result={biosource} tips={tipsForBiosource} property='biosource_vendor' fallbackTitle="Biosource Vendor" wrapInColumn />

                    </div>

                </div>
            </div>
        );

    }
}

class ExpSetsUsedIn extends React.Component {

    static getTabObject({ context, schemas, windowWidth }, width){
        return {
            tab : <span><i className="icon icon-users icon-fw"/> Experiment Sets</span>,
            key : "experiment-sets",
            //disabled : (!context.lab && !context.award && !context.submitted_by),
            content : (
                <div className="overflow-hidden">
                    <ExperimentSetTablesLoadedFromSearch {...{ width, schemas, windowWidth }}
                        requestHref={"/search/?type=ExperimentSetReplicate&experiments_in_set.biosample.uuid=" + encodeURIComponent(context.uuid)} />
                </div>
            )
        };
    }

    render(){
        return <div>Test</div>;
    }
}


