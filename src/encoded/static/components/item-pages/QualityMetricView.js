'use strict';

import React from 'react';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, object, ajax, schemaTransforms, valueTransforms } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import DefaultItemView, { WrapInColumn } from './DefaultItemView';
import { QCMetricFromSummary, QCMetricFromEmbed } from './FileView';
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

    static getSchemaQCFieldsAsOrderedPairs = memoize(function (context, schemas) {
        if (!context || !schemas) { return []; }

        const typeSchema = schemaTransforms.getSchemaForItemType(
            schemaTransforms.getItemType(context), schemas || null
        );

        if (typeSchema && typeSchema.properties) {
            return _.chain(typeSchema.properties)
                .pick(function (value, key) { return value.qc_order !== 'undefined' && typeof value.qc_order === 'number'; })
                .pairs()
                .sortBy(function (pair) { return pair[1].qc_order; })
                .value();
        }

        return [];
    });

    render() {
        const { schemas, context } = this.props;
        const tips = object.tipsFromSchema(schemas, context);
        const commonProps = { 'metric': context, tips, schemas };


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
        const schemaQCFieldsAsOrderedPairs = QualityMetricViewOverview.getSchemaQCFieldsAsOrderedPairs(context, schemas);
        const qcMetrics = schemaQCFieldsAsOrderedPairs.length > 0 ?
            (
                <div className="overview-list-elements-container">
                    {_.map(schemaQCFieldsAsOrderedPairs, (pair) => {
                        const qcField = pair[0];
                        return <QCMetricFromEmbed {...commonProps} qcProperty={qcField} />;
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