'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as plansData from '../testdata/stacked-block-matrix-list';
import StaticPage from './StaticPage';
import { StackedBlockVisual, sumPropertyFromList, StackedBlockGroupedRow } from './components';
import { PageTitleContainer, TitleAndSubtitleUnder, StaticPageBreadcrumbs, pageTitleViews } from './../PageTitle';

import { object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

/**************
 *
 * TODO LATER:
 * Move these utility functions to (probably) util/object.js, since they are generic transforms of JSON lists of objects and should be re-used if possible (rather than new ones created later).
 *
 ************/



export default class PlannedSubmissionsPage extends React.Component {

    static propTypes = {
        "context" : PropTypes.shape({

        }).isRequired
    };

    /**
     * The render function. Renders homepage contents.
     * @returns {Element} A React <div> element.
     */
    render() {
        var c = this.props.context.content; // Content
        var groupingProperties = ['grant_type', 'center_name',  'lab_name'];
        var columnGrouping = 'experiment_category',
            columnSubGrouping = 'experiment_type';

        var headerColumnsOrder = [
            'Hi-C',
            'ChIA-PET',
            'Capture-Hi-C',
            'single cell omics',
            'other omics',
            'DNA-FISH',
            'SRM',
            'live cell imaging',
            'other imaging',
            'proteomics'
        ];

        // Filter out properties from objects which we don't want to be shown in tooltip.
        var keysToInclude = [
            'grant_type','center_name', 'lab_name',
            'experiment_category', 'experiment_type', 'data_type',
            'reference_publication', 'experiments_expected_2017', 'experiments_expected_2020', 'additional_comments', 'in_production_stage_standardized_protocol',
        ];

        var listOfObjectsToVisualize = _.map(plansData.list, function(o){
            return _.pick(o, ...keysToInclude);
        });


        return (
            <StaticPage.Wrapper>
                <StackedBlockVisual
                    data={listOfObjectsToVisualize}
                    titleMap={plansData.titleMap}
                    groupingProperties={groupingProperties}
                    columnGrouping={columnGrouping}
                    headerColumnsOrder={headerColumnsOrder}
                    columnSubGrouping={columnSubGrouping}
                    groupValue={function (data) {
                        return sumPropertyFromList(StackedBlockGroupedRow.flattenChildBlocks(data), 'experiments_expected_2017');
                    }}
                    blockRenderedContents={function (data) {
                        var defaultOutput = <span>&nbsp;</span>;
                        var experimentsCountExpected = 0;

                        function getCount(num) {
                            try {
                                var n = parseInt(num);
                                if (isNaN(n)) return 0;
                                return n;
                            } catch (e) {
                                return 0;
                            }
                        }

                        if (Array.isArray(data)) {
                            experimentsCountExpected = sumPropertyFromList(data, 'experiments_expected_2017');
                        } else if (data) {
                            experimentsCountExpected = getCount(data.experiments_expected_2017);
                        }

                        if (experimentsCountExpected && experimentsCountExpected >= 1000) {
                            return <span style={{ fontSize: '0.825rem', position: 'relative', top: -1 }}>{experimentsCountExpected}</span>;
                        }

                        return experimentsCountExpected || defaultOutput;
                    }}
                    blockClassName={function (data) {

                        // Figure out if we are submitted, planned, or N/A.
                        function checkDataObjForProduction(d) {
                            if (typeof d.in_production_stage_standardized_protocol === 'string') {
                                var checkStr = d.in_production_stage_standardized_protocol.toLowerCase();
                                if (checkStr === 'yes' || checkStr === 'true') {
                                    return true;
                                }
                            }
                            return false;
                        }

                        var origClassName = StackedBlockVisual.defaultProps.blockClassName(data);

                        var statusClass = 'cellType-in-submission';

                        if (Array.isArray(data)) {
                            if (_.any(data, checkDataObjForProduction)) statusClass = 'cellType-submitted';
                        } else if (data && checkDataObjForProduction(data)) {
                            statusClass = 'cellType-submitted';
                        }

                        return origClassName + (statusClass ? ' ' + statusClass : '');
                    }}
                    // The below is no longer used / deprecated. If we need to use this view again, we should migrate this to `blockPopover`.
                    // We could also add prop for how blockPopover is activated and allow onHover/onMouseOut
                    blockTooltipContents={function (data, groupingTitle, groupingPropertyTitle, props) {

                        var keysToShow = ['center_name', 'lab_name', 'experiments_expected_2017', 'experiments_expected_2020', 'in_production_stage_standardized_protocol', 'additional_comments'];

                        var filteredData = data;
                        if (!Array.isArray(data)) {
                            filteredData = _.pick(data, ...keysToShow);
                        } else {
                            filteredData = _.map(data, function (o) { return _.pick(o, ...keysToShow); });
                        }

                        var tips = {}; // StackedBlockVisual.defaultProps.blockTooltipContents(filteredData, groupingTitle, groupingPropertyTitle, props);

                        if (Array.isArray(data) && data.length > 1) {

                            var moreData = _.reduce(filteredData, function (m, o) {
                                for (var i = 0; i < keysToShow.length; i++) {
                                    if (m[keysToShow[i]] === null) {
                                        m[keysToShow[i]] = new Set();
                                    }
                                    m[keysToShow[i]].add(o[keysToShow[i]]);
                                }
                                return m;
                            }, _.object(_.zip(keysToShow, [].fill.call({ length: keysToShow.length }, null, 0, keysToShow.length))));

                            _.forEach(_.keys(moreData), function (k) {
                                if (k === 'additional_comments') {
                                    delete moreData[k]; // Don't show when multiple, too long.
                                    return;
                                }
                                moreData[k] = Array.from(moreData[k]);
                                if (moreData[k].length === 0) {
                                    delete moreData[k];
                                } else if (moreData[k].length > 1) {
                                    moreData[k] = '<span class="text-300">(' + moreData[k].length + ')</span> ' + moreData[k].join(', ');
                                } else {
                                    moreData[k] = moreData[k][0];
                                }
                            });

                        }

                        return tips;

                    }}
                />
            </StaticPage.Wrapper>
        );
    }

}
const PlannedSubmissionPageTitle = React.memo(function PlannedSubmissionPageTitle(props) {
    const { alerts, context, schemas, session, href } = props;

    if (context.status === 'error' && context.code && (context.code === 404 || context.code === 403)) {
        return (
            <PageTitleContainer alerts={alerts}>
                <TitleAndSubtitleUnder>
                    Forbidden
                </TitleAndSubtitleUnder>
            </PageTitleContainer>
        );
    }
    const thisTypeTitle = object.itemUtil.getTitleStringFromContext(context, schemas);
    return (
        <PageTitleContainer alerts={alerts}>
            <StaticPageBreadcrumbs {...{ context, session, href }} key="breadcrumbs" />
            <TitleAndSubtitleUnder title={thisTypeTitle}>
            </TitleAndSubtitleUnder>
        </PageTitleContainer>
    );
});
pageTitleViews.register(PlannedSubmissionPageTitle, "Planned-submissionsPage");