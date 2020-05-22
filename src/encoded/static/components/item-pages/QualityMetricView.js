'use strict';

import React from 'react';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, object, ajax, schemaTransforms, valueTransforms } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import DefaultItemView, { WrapInColumn } from './DefaultItemView';
import { Schemas } from './../util';
import { unstable_batchedUpdates } from 'react-dom';



export default class QualityMetricView extends DefaultItemView {

    getTabViewContents() {
        const initTabs = [];
        initTabs.push(QualityMetricViewOverview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}

class QualityMetricViewOverview extends React.PureComponent {

    constructor(props) {
        super(props);
    }

    static getTabObject({ context, schemas }) {
        return {
            'tab': <span><i className="icon far icon-file-alt icon-fw" /> Overview</span>,
            'key': 'quality-metric-info',
            'content': (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>More Information</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider" />
                    <div className="row overview-blocks">
                        <QualityMetricViewOverview context={context} schemas={schemas} />
                    </div>
                </div>
            )
        };
    }

    static getSchemaQCFieldsAsOrderedPairs = memoize(function (schemaProp, context, schemas) {

        if (!schemaProp && !context && !schemas) { return []; }

        let propObj = (schemaProp && schemaProp.type === 'object' && typeof schemaProp.items === 'object' && schemaProp.items) || null;
        if (!propObj && context && schemas) {
            const typeSchema = schemaTransforms.getSchemaForItemType(
                schemaTransforms.getItemType(context), schemas || null
            );
            if (typeSchema && typeSchema.properties) {
                propObj = typeSchema.properties;
            }
        }

        if (propObj) {
            return _.chain(propObj)
                .pick(function (value, key) { return typeof value.qc_order === 'number'; })
                .pairs()
                .sortBy(function (pair) { return pair[1].qc_order; })
                .value();
        }

        return [];
    });

    render() {
        const { schemas, context } = this.props;
        const tips = object.tipsFromSchema(schemas, context);

        //QC Metrics Summary
        const { quality_metric_summary } = context;
        const qcMetricsSummary = context.quality_metric_summary ?
            (
                <div className="overview-list-elements-container">
                    {_.map(quality_metric_summary, function (qmsItem) { return <QCMetricFromSummary {...qmsItem} key={qmsItem.title} />; })}
                    {context.url ?
                        <QCMetricFromSummary title="Report" tooltip="Link to full quality metric report" value={
                            <React.Fragment>
                                <a href={context.url} target="_blank" rel="noopener noreferrer">{valueTransforms.hrefToFilename(context.url)}</a>
                                <i className="ml-05 icon icon-fw icon-external-link-alt text-small fas" />
                            </React.Fragment>
                        } />
                        : null}
                </div>
            ) : null;
        //QC Metrics
        const schemaQCFieldsAsOrderedPairs = QualityMetricViewOverview.getSchemaQCFieldsAsOrderedPairs(null, context, schemas);
        const qcMetrics = schemaQCFieldsAsOrderedPairs.length > 0 ?
            (
                <div className="overview-list-elements-container">
                    {_.map(schemaQCFieldsAsOrderedPairs, (pair) => {
                        const qcSchemaFieldKey = pair[0];
                        const qcSchemaFieldValue  = pair[1];
                        return <QCMetricFromEmbed {...{ 'metric': context, schemas, tips, 'schemaItem': qcSchemaFieldValue, 'qcProperty': qcSchemaFieldKey }} />;
                    })}
                </div>
            ) : (
                <em>Not Available</em>
            );

        return (
            <React.Fragment>
                {qcMetricsSummary ? (
                    <WrapInColumn wrap="col-12 col-md-9" defaultWrapClassName="col-sm-12">
                        <div className="inner">
                            <object.TooltipInfoIconContainerAuto result={null} property={null} tips={tips}
                                elementType="h5" fallbackTitle="Summary" />
                            {qcMetricsSummary}
                        </div>
                    </WrapInColumn>) : null}
                <WrapInColumn wrap="col-12 col-md-9" defaultWrapClassName="col-sm-12">
                    <div className="inner">
                        <object.TooltipInfoIconContainerAuto result={context} property={null} tips={tips}
                            elementType="h5" fallbackTitle="All Metrics" />
                        {qcMetrics}
                    </div>
                </WrapInColumn>
            </React.Fragment>
        );
    }
}

function QCMetricFromEmbed(props){
    const { metric, qcProperty, schemaItem, schemas, fallbackTitle, tips, percent } = props;

    if (!schemaItem && typeof schemaItem.qc_order !== 'number') return null;
    if (typeof metric[qcProperty] === 'undefined') return null;

    const title = (schemaItem && schemaItem.title) || null;
    const tip = (schemaItem && schemaItem.description) || null;
    
    let value = metric[qcProperty];
    
    let subQCRows = null;
    if (schemaItem && typeof schemaItem === 'object') {
        const pairs = QualityMetricViewOverview.getSchemaQCFieldsAsOrderedPairs(schemaItem, null, null);
        
        if (pairs.length > 0) {
            if (pairs.length === 1 && pairs[0][1].type !== 'object' && typeof value[pairs[0][0]] !== 'undefined') {
                value = pairs[0][0] + ': ' + value[pairs[0][0]];
            }
            else {
                subQCRows = _.map(pairs, function (pair) {
                    return QCMetricFromEmbed({ 'metric': value, 'qcProperty': pair[0], schemas, 'schemaItem': pair[1], tips: pair[1].description || tips });
                })
            }
        }
    }
    
    return (
        <React.Fragment>
            <div className="overview-list-element">
                <div className="row">
                    <div className="col-4 text-right">
                        <object.TooltipInfoIconContainerAuto result={metric} property={qcProperty} title={title} tips={tip || tips}
                            elementType="h5" fallbackTitle={fallbackTitle || qcProperty} schemas={schemas}
                            className="mb-0 mt-02 text-break" />
                    </div>
                    <div className="col-8">
                        <div className="inner value">
                            {percent ? QCMetricFromEmbed.percentOfTotalReads(metric, qcProperty) : Schemas.Term.toName('quality_metric.' + qcProperty, value, true)}
                        </div>
                    </div>
                </div>
            </div>
            {subQCRows}
        </React.Fragment>
    );
}
QCMetricFromEmbed.percentOfTotalReads = function(quality_metric, field){
    var numVal = object.getNestedProperty(quality_metric, field);
    if (numVal && typeof numVal === 'number' && quality_metric && quality_metric['Total reads']){
        var percentVal = Math.round((numVal / quality_metric['Total reads']) * 100 * 1000) / 1000;
        var numValRounded = valueTransforms.roundLargeNumber(numVal);
        return (
            <span className="inline-block" data-tip={"Percent of total reads (= " + numValRounded + ")."}>{ percentVal + '%' }</span>
        );
    }
    return '-';
};


function QCMetricFromSummary(props){
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

export class QualityControlResults extends React.PureComponent {

    static defaultProps = {
        'hideIfNoValue' : false
    };

    /** To be deprecated (?) */
    metricsFromEmbeddedReport(){
        const { file, schemas } = this.props;
        const commonProps = { 'metric' : file.quality_metric, 'tips' : object.tipsFromSchema(schemas, file.quality_metric) };
        return (
            <div className="overview-list-elements-container">
                <QCMetricFromEmbed {...commonProps} qcProperty="Total reads" fallbackTitle="Total Reads in File" />
                <QCMetricFromEmbed {...commonProps} qcProperty="Total Sequences" />
                <QCMetricFromEmbed {...commonProps} qcProperty="Sequence length" />
                <QCMetricFromEmbed {...commonProps} qcProperty="Cis reads (>20kb)" percent />
                <QCMetricFromEmbed {...commonProps} qcProperty="Short cis reads (<20kb)" percent />
                <QCMetricFromEmbed {...commonProps} qcProperty="Trans reads" fallbackTitle="Trans Reads" percent />
                <QCMetricFromEmbed {...commonProps} qcProperty="Sequence length" />
                <QCMetricFromEmbed {...commonProps} qcProperty="overall_quality_status" fallbackTitle="Overall Quality" />
                <QCMetricFromEmbed {...commonProps} qcProperty="url" fallbackTitle="Link to Report" />
            </div>
        );
    }

    metricsFromSummary(){
        const { file, schemas } = this.props;
        const metric = file && file.quality_metric;
        const metricURL = metric && metric.url;
        return (
            <div className="overview-list-elements-container">
                { _.map(file.quality_metric_summary, function(qmsItem){ return <QCMetricFromSummary {...qmsItem} key={qmsItem.title} />; }) }
                { metricURL ?
                    <QCMetricFromSummary title="Report" tooltip="Link to full quality metric report" value={
                        <React.Fragment>
                            <a href={metricURL} target="_blank" rel="noopener noreferrer">{ valueTransforms.hrefToFilename(metricURL) }</a>
                            <i className="ml-05 icon icon-fw icon-external-link-alt text-small fas"/>
                        </React.Fragment>
                    } />
                    : null }
            </div>
        );

    }

    render(){
        const { file, hideIfNoValue, schemas, wrapInColumn } = this.props;

        let metrics, titleProperty = "quality_metric_summary";

        const qualityMetricEmbeddedExists = file && file.quality_metric && object.itemUtil.atId(file.quality_metric);
        const qualityMetricSummaryExists = file && Array.isArray(file.quality_metric_summary) && file.quality_metric_summary.length > 0;

        if (qualityMetricSummaryExists){
            metrics = this.metricsFromSummary();
        } else if (qualityMetricEmbeddedExists){
            metrics = this.metricsFromEmbeddedReport();
            titleProperty = "quality_metric";
        } else if (hideIfNoValue){
            return null;
        }

        const tips = FileView.schemaForFile(file, schemas);

        return (
            <WrapInColumn wrap={wrapInColumn} defaultWrapClassName="col-sm-12">
                <div className="inner">
                    <object.TooltipInfoIconContainerAuto result={file} property={titleProperty} tips={tips}
                        elementType="h5" fallbackTitle="Quality Metric Summary" />
                    { metrics || (<em>Not Available</em>) }
                </div>
            </WrapInColumn>
        );
    }

}