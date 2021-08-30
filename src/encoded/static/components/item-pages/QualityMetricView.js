'use strict';

import React from 'react';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, object, schemaTransforms, valueTransforms } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { Collapse } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Collapse';
import DefaultItemView, { WrapInColumn } from './DefaultItemView';
import { Schemas } from './../util';



export default class QualityMetricView extends DefaultItemView {

    getTabViewContents() {
        const initTabs = [];
        initTabs.push(QualityMetricViewOverview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}

class QualityMetricViewOverview extends React.PureComponent {

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
    /**
     * Utility method to get schema field-value pairs as an array
     * @param {object} schemaProp - schema property
     * @param {object} context - Current QC Item being shown
     * @param {object} schemas - all schema definitions
     */
    static getSchemaQCFieldsAsOrderedPairs(schemaProp, context, schemas) {

        if (!schemaProp && !context && !schemas) { return []; }

        let properties = schemaProp && schemaProp.type === 'object' && schemaProp.properties;
        if (!properties) {
            properties = schemaProp && schemaProp.type === 'array' && schemaProp.items && schemaProp.items.type === 'object' && schemaProp.items.properties;
        }
        //try to get properties from schemas using @type of context
        if (!properties && context && schemas) {
            const typeSchema = schemaTransforms.getSchemaForItemType(schemaTransforms.getItemType(context), schemas || null);
            properties = typeSchema && typeSchema.properties;
        }

        if (properties) {
            return _.chain(properties)
                .pick(function (value, key) { return typeof value.qc_order === 'number'; })
                .pairs()
                .sortBy(function (pair) { return pair[1].qc_order; })
                .value();
        }

        return [];
    }

    constructor(props) {
        super(props);

        this.memoized = {
            getSchemaQCFieldsAsOrderedPairs: memoize(QualityMetricViewOverview.getSchemaQCFieldsAsOrderedPairs)
        };
    }

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
        const schemaQCFieldsAsOrderedPairs = this.memoized.getSchemaQCFieldsAsOrderedPairs(null, context, schemas);
        const firstObjectOrArrayIdx =
            _.findIndex(
                schemaQCFieldsAsOrderedPairs,
                (pair) => (pair[1].type === 'object' || pair[1].type === 'array') && context[pair[0]]);
        const qcMetrics = schemaQCFieldsAsOrderedPairs.length > 0 ?
            (
                <div className="overview-list-elements-container">
                    {_.map(schemaQCFieldsAsOrderedPairs, (pair, idx) => {
                        const [qcSchemaFieldKey, qcSchemaFieldValue] = pair;
                        const defaultOpen = (firstObjectOrArrayIdx === idx);
                        return <QCMetricFromEmbed {...{ 'metric': context, schemas, tips, 'schemaItem': qcSchemaFieldValue, 'qcProperty': qcSchemaFieldKey, defaultOpen }} />;
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
                                elementType="h4" fallbackTitle="Summary" className="qc-section-title" />
                            {qcMetricsSummary}
                        </div>
                    </WrapInColumn>) : null}
                <WrapInColumn wrap="col-12 col-md-9" defaultWrapClassName="col-sm-12">
                    <div className="inner">
                        <object.TooltipInfoIconContainerAuto result={null} property={null} tips={tips}
                            elementType="h4" fallbackTitle="All Metrics" className="qc-section-title" />
                        {qcMetrics}
                    </div>
                </WrapInColumn>
            </React.Fragment>
        );
    }
}

class QCMetricFromEmbed extends React.PureComponent {

    static percentOfTotalReads(quality_metric, field){
        var numVal = object.getNestedProperty(quality_metric, field);
        if (numVal && typeof numVal === 'number' && quality_metric && quality_metric['Total reads']){
            var percentVal = Math.round((numVal / quality_metric['Total reads']) * 100 * 1000) / 1000;
            var numValRounded = valueTransforms.roundLargeNumber(numVal);
            return (
                <span className="d-inline-block" data-tip={"Percent of total reads (= " + numValRounded + ")."}>{ percentVal + '%' }</span>
            );
        }
        return '-';
    }

    constructor(props) {
        super(props);

        const { defaultOpen } = props;
        this.toggleOpen = _.throttle(this.toggleOpen.bind(this), 1000);
        this.state = {
            'open': defaultOpen || false,
            'closing': false
        };
        this.memoized = {
            getSchemaQCFieldsAsOrderedPairs: memoize(QualityMetricViewOverview.getSchemaQCFieldsAsOrderedPairs)
        };
    }

    toggleOpen(open, e){
        this.setState(function(currState){
            if (typeof open !== 'boolean'){
                open = !currState.open;
            }
            var closing = !open && currState.open;
            return { open, closing };
        }, ()=>{
            setTimeout(()=>{
                this.setState(function(currState){
                    if (!currState.open && currState.closing){
                        return { 'closing' : false };
                    }
                    return null;
                });
            }, 500);
        });
    }

    render() {
        const { metric, qcProperty, schemaItem, schemas, fallbackTitle, tips, percent } = this.props;
        const { open, closing } = this.state;

        const { qc_order = null, title = null, description: tip = null } = schemaItem || {};
        if (schemaItem && typeof qc_order !== 'number') return null;
        let value = metric[qcProperty];
        if (typeof value === "undefined") return null;

        let subQCRows = null;
        if (qcProperty !== 'qc_list' && schemaItem && typeof schemaItem === 'object') {
            const pairs = this.memoized.getSchemaQCFieldsAsOrderedPairs(schemaItem, null, null);
            if (pairs.length > 0) {
                //if child qc item also has 1 child then combine them and display as a single line
                if (pairs.length === 1 && pairs[0][1].type !== 'object' && typeof value[pairs[0][0]] !== 'undefined') {
                    value = pairs[0][0] + ': ' + value[pairs[0][0]];
                }
                else {
                    if (Array.isArray(value)) {
                        subQCRows = _.reduce(value, function (memo, valueItem) {
                            return memo.concat(_.map(pairs, function (pair) {
                                return <QCMetricFromEmbed {...{ 'metric': valueItem, 'qcProperty': pair[0], schemas, 'schemaItem': pair[1], tips: pair[1].description || tips }} />;
                            }));
                        }, []);
                    }
                    else {
                        subQCRows = _.map(pairs, function (pair) {
                            return <QCMetricFromEmbed {...{ 'metric': value, 'qcProperty': pair[0], schemas, 'schemaItem': pair[1], tips: pair[1].description || tips }} />;
                        });
                    }
                }
            } else if (schemaItem.type === 'array' && schemaItem.items && schemaItem.items && schemaItem.items.type && ['string', 'number', 'boolean'].indexOf(schemaItem.items.type) > -1) {
                subQCRows = _.map(value, function (val, index) {
                    return (
                        <div className="overview-list-element">
                            <div className="row">
                                <div className="col-4 text-right">
                                    <object.TooltipInfoIconContainerAuto
                                        elementType="h5" fallbackTitle={(index + 1) + "."}
                                        className="mb-0 mt-02 text-break" />
                                </div>
                                <div className="col-8">
                                    <div className="inner value">
                                        {val}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                });
            }
        //qc_list is a special case. we do workaround to just display links to listed QCs.
        } else if (qcProperty === 'qc_list') {
            subQCRows = _.map(value, function (qcItem, index) {
                const text = qcItem.value.display_title || qcItem.value.error || '';
                return (
                    <div className="overview-list-element">
                        <div className="row">
                            <div className="col-4 text-right">
                                <object.TooltipInfoIconContainerAuto
                                    elementType="h5" fallbackTitle={(index + 1) + "."}
                                    className="mb-0 mt-02 text-break" />
                            </div>
                            <div className="col-8">
                                <div className="inner value">
                                    <a href={object.atIdFromObject(qcItem.value)}>{text}</a>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            });
        }

        return (
            <React.Fragment>
                {!subQCRows ?
                    (
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
                    ) : (<h5 className="qc-grouping-title" onClick={this.toggleOpen}><i className={"icon icon-fw fas mr-5 icon-" + (open ? 'minus' : 'plus')} /><span>{title || qcProperty}</span></h5>)}
                {subQCRows ?
                    (
                        <Collapse in={open}>
                            <div className="inner">
                                {(open || closing) ? subQCRows : null}
                            </div>
                        </Collapse>
                    ) : null}
            </React.Fragment>
        );
    }
}

export class QualityControlResults extends React.PureComponent {

    static defaultProps = {
        'hideIfNoValue' : false
    };

    /** To be deprecated (?) - still used in files view */
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
        const { file } = this.props;
        const metric = file && file.quality_metric;
        const metricURL = metric && metric.url;
        return (
            <div className="overview-list-elements-container">
                { _.map(file.quality_metric.quality_metric_summary, function(qmsItem){ return <QCMetricFromSummary {...qmsItem} key={qmsItem.title} />; }) }
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
        const qualityMetricSummaryExists = file && file.quality_metric && Array.isArray(file.quality_metric.quality_metric_summary) && file.quality_metric.quality_metric_summary.length > 0;

        if (qualityMetricSummaryExists){
            metrics = this.metricsFromSummary();
        } else if (qualityMetricEmbeddedExists){
            metrics = this.metricsFromEmbeddedReport();
            titleProperty = "quality_metric";
        } else if (hideIfNoValue){
            return null;
        }

        const tips = object.tipsFromSchema(schemas, file);

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