'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object, ajax, valueTransforms } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import DefaultItemView, { WrapInColumn } from './DefaultItemView';
import { QCMetricFromSummary, QCMetricFromEmbed } from './FileView';



export default class QualityMetricView extends DefaultItemView {

    getTabViewContents() {
        const initTabs = [];
        initTabs.push(QualityMetricViewOverview.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}

const excludedKeys = [
    'public_release', 'aggregated-items', 'status',
    'principals_allowed', 'validation-errors', 'date_created',
    'uuid', 'submitted_by', 'last_modified', '@type', '@context',
    'lab', 'award', 'display_title', 'external_references', 'project_release',
    'schema_version', '@id', 'actions', 'static_headers', 'url'
];

class QualityMetricViewOverview extends React.PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            'qcSummary': null
        };
    }

    componentDidMount() {
        this.getQCSummary();
    }

    getQCSummary() {
        const { context } = this.props;

        ajax.load('/search/?type=File&quality_metric.uuid=' + context.uuid, (r) => {
            if (r['@graph'] && Array.isArray(r['@graph']) && r['@graph'].length > 0 && r['@graph'][0].quality_metric_summary) {
                const qcSummary = r['@graph'][0].quality_metric_summary;
                this.setState({ 'qcSummary': qcSummary });
            } else {
                this.setState({ 'qcSummary': {} });
            }
        }, 'GET', (err) => {
            console.error('No results found');
            this.setState({ 'qcSummary': {} });
        });
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

    render() {
        const { schemas, context } = this.props;
        const { qcSummary } = this.state;

        //QC metrics
        const tips = object.tipsFromSchema(schemas, context);
        const commonProps = { 'metric': context, 'tips': tips };
        const keys = _.difference(_.keys(context), excludedKeys);
        //keys.push(keys.splice(keys.indexOf('url'), 1)[0]);//move url to end
        const metrics = keys.length > 0 ?
            (
                <div className="overview-list-elements-container">
                    {_.map(keys, (propKey) => <QCMetricFromEmbed {...commonProps} qcProperty={propKey} />)}
                </div>
            ) : (
                <em>Not Available</em>
            );
        //QC metrics summary
        const metricsSummary = !qcSummary ?
            (
                <div className="container text-center">
                    <i className="icon icon-spin icon-circle-notch fas text-larger mt-5" />
                </div>
            ) : (
                <div className="overview-list-elements-container">
                    {_.map(qcSummary, function (qmsItem) { return <QCMetricFromSummary {...qmsItem} key={qmsItem.title} />; })}
                    {context.url ?
                        <QCMetricFromSummary title="Report" tooltip="Link to full quality metric report" value={
                            <React.Fragment>
                                <a href={context.url} target="_blank" rel="noopener noreferrer">{valueTransforms.hrefToFilename(context.url)}</a>
                                <i className="ml-05 icon icon-fw icon-external-link-alt text-small fas" />
                            </React.Fragment>
                        } />
                        : null}
                </div>
            );

        return (
            <React.Fragment>
                <WrapInColumn wrap="col-12 col-md-9" defaultWrapClassName="col-sm-12">
                    <div className="inner">
                        <object.TooltipInfoIconContainerAuto result={null} property={null} tips={tips}
                            elementType="h5" fallbackTitle="Summary" />
                        {metricsSummary}
                    </div>
                </WrapInColumn>
                <WrapInColumn wrap="col-12 col-md-9" defaultWrapClassName="col-sm-12">
                    <div className="inner">
                        <object.TooltipInfoIconContainerAuto result={context} property={null} tips={tips}
                            elementType="h5" fallbackTitle="All Metrics" />
                        {metrics}
                    </div>
                </WrapInColumn>
            </React.Fragment>
        );
    }
}

// const QualityMetricViewOverview = React.memo(function QualityMetricViewOverview({ context, schemas }) {
//     const tips = object.tipsFromSchema(schemas, context);
//     const commonProps = { 'metric': context, 'tips': tips };
//     const keys = _.difference(_.keys(context), excludedKeys);
//     //move url to end
//     keys.push(keys.splice(keys.indexOf('url'), 1)[0]);
//     const metrics = keys.length > 0 ?
//         (
//             <div className="overview-list-elements-container">
//                 {_.map(keys, (propKey) => <QCMetricFromEmbed {...commonProps} qcProperty={propKey} />)}
//             </div>
//         ) : (
//             <em>Not Available</em>
//         );

//     return (
//         <WrapInColumn wrap="col-12 col-md-6" defaultWrapClassName="col-sm-12">
//             <div className="inner">
//                 <object.TooltipInfoIconContainerAuto result={context} property={null} tips={tips}
//                     elementType="h5" fallbackTitle="Quality Metrics" />
//                 {metrics}
//             </div>
//         </WrapInColumn>
//     );
// });
// QualityMetricViewOverview.getTabObject = function ({ context, schemas }) {
//     return {
//         'tab': <span><i className="icon far icon-file-alt icon-fw" /> Overview</span>,
//         'key': 'quality-metric-info',
//         'content': (
//             <div className="overflow-hidden">
//                 <h3 className="tab-section-title">
//                     <span>More Information</span>
//                 </h3>
//                 <hr className="tab-section-title-horiz-divider" />
//                 <div className="row overview-blocks">
//                     <QualityMetricViewOverview context={context} schemas={schemas} />
//                 </div>
//             </div>
//         )
//     };
// };
