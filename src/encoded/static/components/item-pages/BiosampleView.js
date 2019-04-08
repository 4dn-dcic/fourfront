'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object, Schemas, layout } from './../util';
import { ItemPageTable, ExperimentSetTableTabView } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';
import { IndividualItemTitle } from './BiosourceView';


export default class BiosampleView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [],
            width = this.getTabViewWidth();

        initTabs.push(BiosampleViewOverview.getTabObject(this.props, width));

        initTabs.push(ExperimentSetTableTabView.getTabObject(_.extend({}, this.props, {
            'requestHref' : "/browse/?type=ExperimentSetReplicate&award.project=4DN&experimentset_type=replicate&experiments_in_set.biosample.display_title=" + this.props.context.display_title,
            'title' : function(props, { totalCount }){
                return (totalCount ? totalCount + ' ' : '') + "Experiment Sets";
            }
        })));

        return initTabs.concat(this.getCommonTabs());
    }

}


function BiosourcesTable(props){
    return <ItemPageTable {..._.pick(props, 'schemas', 'width', 'columns', 'results')} renderDetailPane={null} />;
}
BiosourcesTable.defaultProps = {
    'columns' : {
        "display_title" : { "title" : "Title" },
        "biosource_type" : { "title" : "Type" },
        "biosource_vendor" : { "title" : "Vendor" },
        "cell_line" : { "title" : "Cell Line" },
        "individual" : {
            "title" : "Individual",
            "render" : function resultVal(result, columnDefinition, props, width){
                if (!result || !result.individual || !object.atIdFromObject(result.individual)) return '-';
                return <IndividualItemTitle context={result.individual} />;
            }
        }
    }
};


function CellCultureDetailsTable(props){
    return <ItemPageTable {..._.pick(props, 'schemas', 'columns', 'width', 'results')} renderDetailPane={null} />;
}
CellCultureDetailsTable.defaultProps = {
    'columns' : {
        "display_title" : {
            "title" : "Title",
            "widthMap" : { "sm" : 200, "md" : 300, "lg" : 340 },
            "render" : function ccdTitle(result, columnDefinition){
                const resultHref = object.itemUtil.atId(result);
                const title = result.description || result.display_title;
                return (
                    <a href={resultHref} className="text-ellipsis-container" data-tip={title.length > 15 ? title : null}>{ title }</a>
                );
            }
        },
        //"description" : { "title" : "Description" },
        "synchronization_stage" : { "title" : "Synchronization Stage" },
        "culture_duration" : { "title" : "Total Days in Culture" },
        "culture_start_date" : { "title" : "Culture Start Date", "render" : OverViewBodyItem.titleRenderPresets.local_date_time }
    }
};




class BiosampleViewOverview extends React.PureComponent {

    static getTabObject({context, schemas, windowWidth }, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'overview',
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

    render(){
        const propsToPass = _.pick(this.props, 'context', 'schemas', 'width', 'windowWidth');
        return (
            <div>
                <OverViewBody {...propsToPass} />
                <BiosourceInfoBody {...propsToPass} />
                <CellCultureInfoBody {...propsToPass} />
            </div>
        );

    }

}


class OverViewBody extends React.PureComponent {

    render(){
        var context = this.props.context;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), context);

        var commonProps = {
            'result' : context, tips,
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


class CellCultureInfoBody extends React.PureComponent {

    render(){
        const { context, schemas, width, windowWidth } = this.props;
        const cell_cultures = _.filter(context.cell_culture_details || [], object.itemUtil.atId); // Cell cultures with view permissions.

        if (cell_cultures.length === 0) return null;

        const tipsForBiosample = object.tipsFromSchema(schemas || Schemas.get(), context);
        const tipsForCellCulture = object.tipsFromSchema(schemas || Schemas.get(), cell_cultures[0]);

        let body = null;

        if (cell_cultures.length === 1){
            body = (
                <div className="row overview-blocks">

                    <OverViewBodyItem result={context} tips={tipsForBiosample} property='cell_culture_details' fallbackTitle="Cell Culture Information" wrapInColumn />

                    <OverViewBodyItem result={cell_cultures[0]} tips={tipsForCellCulture} property='description' fallbackTitle="Description" wrapInColumn />

                    <OverViewBodyItem result={cell_cultures[0]} tips={tipsForCellCulture} property='synchronization_stage' fallbackTitle="Synchronization Stage" wrapInColumn />

                    <OverViewBodyItem result={cell_cultures[0]} tips={tipsForCellCulture} property='morphology_image' fallbackTitle="Morphology Image" singleItemClassName="block" wrapInColumn titleRenderFxn={OverViewBodyItem.titleRenderPresets.embedded_item_with_image_attachment} />

                    <OverViewBodyItem result={cell_cultures[0]} tips={tipsForCellCulture} property='culture_duration' fallbackTitle="Total Days in Culture" wrapInColumn />

                    <OverViewBodyItem result={cell_cultures[0]} tips={tipsForCellCulture} property='culture_start_date' fallbackTitle="Culture Start Date" wrapInColumn titleRenderFxn={OverViewBodyItem.titleRenderPresets.local_date_time} />

                </div>
            );
        } else {
            body = <CellCultureDetailsTable results={cell_cultures} width={width} windowWidth={windowWidth} />;
        }

        return (
            <div className="mt-3">
                <h3 className="tab-section-title">
                    <span>Cell Culture</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { body }
            </div>
        );

    }
}

class BiosourceInfoBody extends React.PureComponent {

    render(){
        const { context, schemas, width, windowWidth } = this.props;
        const biosources = _.filter(context.biosource || [], object.itemUtil.atId);
        let body = null;
        let title = null;

        if (biosources.length === 0){
            // Throw an error instead?
            return null;
        }

        if (biosources.length === 1){
            const tipsForBiosample = object.tipsFromSchema(schemas || Schemas.get(), context);
            const tipsForBiosource = object.tipsFromSchema(schemas || Schemas.get(), biosources[0]);
            title = "Biosource";
            body = (
                <div className="row overview-blocks">

                    <OverViewBodyItem result={context} tips={tipsForBiosample} property='biosource' fallbackTitle="Biosource" wrapInColumn />

                    <OverViewBodyItem result={biosources[0]} tips={tipsForBiosource} property='biosource_type' fallbackTitle="Biosource Type" wrapInColumn />

                    <OverViewBodyItem result={biosources[0]} tips={tipsForBiosource} property='cell_line' fallbackTitle="Cell Line Name" wrapInColumn hideIfNoValue />

                    <OverViewBodyItem result={biosources[0]} tips={tipsForBiosource} property='individual' fallbackTitle="Individual" wrapInColumn titleRenderFxn={function(field, val){
                        return <IndividualItemTitle context={val} />;
                    }} />

                    <OverViewBodyItem result={biosources[0]} tips={tipsForBiosource} property='biosource_vendor' fallbackTitle="Biosource Vendor" wrapInColumn />

                </div>
            );
        } else {
            title = "Biosources";
            body = <BiosourcesTable results={biosources} width={width} windowWidth={windowWidth} />;
        }

        return (
            <div className="mt-3">
                <h3 className="tab-section-title">{ title }</h3>
                <hr className="tab-section-title-horiz-divider"/>
                { body }
            </div>
        );

    }
}

