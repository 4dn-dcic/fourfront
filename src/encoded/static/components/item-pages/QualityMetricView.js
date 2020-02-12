'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import DefaultItemView, { WrapInColumn } from './DefaultItemView';
import { QCMetricFromEmbed } from './FileView';



export default class QualityMetricView extends DefaultItemView {

    getTabViewContents(){
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
    'schema_version', '@id', 'actions'
];

const QualityMetricViewOverview = React.memo(function QualityMetricViewOverview({ context, schemas }) {
    const tips = object.tipsFromSchema(schemas, context);
    const commonProps = { 'metric': context, 'tips': tips };
    const keys = _.difference(_.keys(context), excludedKeys);
    //move url to end
    keys.push(keys.splice(keys.indexOf('url'), 1)[0]);
    const metrics = keys.length > 0 ?
        (
            <div className="overview-list-elements-container">
                {_.map(keys, (propKey) => <QCMetricFromEmbed {...commonProps} qcProperty={propKey} />)}
            </div>
        ) : (
            <em>Not Available</em>
        );

    return (
        <WrapInColumn wrap="col-12 col-md-6" defaultWrapClassName="col-sm-12">
            <div className="inner">
                <object.TooltipInfoIconContainerAuto result={context} property={null} tips={tips}
                    elementType="h5" fallbackTitle="Quality Metrics" />
                {metrics}
            </div>
        </WrapInColumn>
    );
});
QualityMetricViewOverview.getTabObject = function ({ context, schemas }) {
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
};
