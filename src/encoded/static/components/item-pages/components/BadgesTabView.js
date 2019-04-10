'use strict';

import React from 'react';
import _ from 'underscore';
import memoize from 'memoize-one';
import { pie, arc } from 'd3-shape';
import { object, layout } from './../../util';
import PropTypes from 'prop-types';


export class BadgesTabView extends React.PureComponent {

    static getTabObject(props){
        var context = props.context,
            badgeList = BadgesTabView.getBadgesList(context),
            badgeListLen = (badgeList && badgeList.length) || 0;

        return {
            tab : (
                <span>
                    <SummaryIcon context={context} /> { badgeListLen } Badge{ badgeListLen > 1 ? 's' : '' }
                </span>
            ),
            disabled : badgeListLen === 0,
            key : "badges",
            content : <BadgesTabView {...props} />
        };
    }

    static getBadgesList = memoize(function(context){
        var badges = context && context['aggregated-items'] && context['aggregated-items'].badges;
        if (!Array.isArray(badges) || badges.length === 0) return null;
        return badges;
    });

    static propMapping = {
        'commendation'  : "Commendation",
        'warning'       : "Warning"
    };

    static badgeClassification(badge, propMapping = BadgesTabView.propMapping){
        var badgeItem = badge && badge.item && badge.item.badge,
            propMappingKeys = _.keys(propMapping),
            propMappingLen = propMappingKeys.length,
            i, propertyToTestPresenceOf , classificationTitle;

        for (i = 0; i < propMappingLen; i++){
            propertyToTestPresenceOf = propMappingKeys[i];
            classificationTitle = propMapping[propertyToTestPresenceOf];

            if (typeof badgeItem[propertyToTestPresenceOf] === 'string' && badgeItem[propertyToTestPresenceOf]){
                return classificationTitle;
            }
        } // else
        throw new Error('Badge classification cannot be determined.');
    }

    static badgeTitle(badge, badgeClassification = null, propMapping = BadgesTabView.propMapping){
        const badgeItem = badge && badge.item && badge.item.badge;
        if (!badgeClassification){
            badgeClassification = BadgesTabView.badgeClassification(badge, propMapping);
        }
        const inversedPropMapping = _.invert(propMapping);
        return badgeItem[inversedPropMapping[badgeClassification]];
    }

    /**
     * Given a context containing aggegated-items/badge, returns a
     * grouping of these badges according to their classification title.
     *
     * @param {Item} context - Item representation with an `aggregated-items` property containing badges.
     */
    static badgesByClassification = memoize(function(context, classificationPropMapping = BadgesTabView.propMapping){
        const badges = BadgesTabView.getBadgesList(context);
        if (!badges) return null;
        return _.groupBy(badges, function(b){ return BadgesTabView.badgeClassification(b, classificationPropMapping); });
    });

    render(){
        const { context, windowWidth } = this.props;
        const badgeList = BadgesTabView.getBadgesList(context);
        const badgeListLen = (badgeList && badgeList.length) || 0;
        const badgesByClassification = BadgesTabView.badgesByClassification(context);

        if (!badgeListLen) return <h4>No Badges</h4>; // Shouldn't happen unless `#badges` is in URL.

        const body = _.map(_.keys(badgesByClassification), function(badgeClassification){
            const badgesForClassification = badgesByClassification[badgeClassification];
            const badgesLen = badgesForClassification.length;
            const heading = badgeListLen === 1 ? badgeClassification : badgesLen + ' ' + badgeClassification + (badgesLen > 1 ? 's' : '');
            return (
                <div className="badge-classification-group mb-3 mt-15" data-badge-classification={badgeClassification} key={badgeClassification}>
                    <h5 className="text-400 mt-0">{ heading }</h5>
                    { _.map(badgesForClassification, function(badge, idx){
                        var atId = badge && badge.item && badge.item.badge && object.itemUtil.atId(badge.item.badge);
                        return <BadgeItem {...badge} key={atId || idx} {...{ context, windowWidth }} />;
                    }) }
                </div>
            );
        });

        return (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    <span className="text-400">{ badgeListLen }</span> Badge{ badgeListLen > 1 ? 's' : '' }
                </h3>
                <hr className="tab-section-title-horiz-divider mb-1"/>
                { body }
            </div>
        );
    }
}


/**
 * Given a `context` which represents an Item with aggregated-items/badges,
 * generates a pie chart depicting the ratio(s) of different types classification
 */
class SummaryIcon extends React.PureComponent {

    static getClassificationRatios = memoize(function(context, classificationPropMapping = BadgesTabView.propMapping){
        const badgesGroupedByClassification = BadgesTabView.badgesByClassification(context, classificationPropMapping);
        if (!badgesGroupedByClassification) return null;

        const badgeClassifications = _.keys(badgesGroupedByClassification);
        const badgeClassificationsLen = badgeClassifications.length;
        const classificationRatios = {};
        var i, currClassification, totalBadges = 0;

        for (i = 0; i < badgeClassificationsLen; i++){
            currClassification = badgeClassifications[i];
            totalBadges += badgesGroupedByClassification[currClassification].length;
        }

        for (i = 0; i < badgeClassificationsLen; i++){
            currClassification = badgeClassifications[i];
            classificationRatios[currClassification] = badgesGroupedByClassification[currClassification].length / totalBadges;
        }

        return classificationRatios;
    });

    static defaultProps = {
        'size' : 20,
        'innerRadius' : 3,
        'classificationColorMap' : {
            "Commendation"  : '#e5ca75',
            "Warning"       : '#d46200'
        }
    };

    constructor(props){
        super(props);
        this.pieGenerator = pie();
    }

    render(){
        const { context, size, innerRadius, classificationColorMap } = this.props;
        const outerRadius = size / 2;
        const classificationRatios = SummaryIcon.getClassificationRatios(context);
        const classificationRatioPairs = _.pairs(classificationRatios);
        var tooltip = null, svgBodyItems;

        if (!classificationRatios){
            // Shouldn't happen unless BadgesTabView is present on Item w/o any badges.
            return <i className="icon icon-fw icon-circle-o"/>; // Todo: maybe different icon
        }

        const pieChartDims = this.pieGenerator(_.values(classificationRatios));
        const arcGenerator = arc().innerRadius(innerRadius).outerRadius(outerRadius);

        svgBodyItems = _.map(classificationRatioPairs, function([ classificationTitle, classificationRatio ], idx){
            return (
                <path d={arcGenerator(pieChartDims[idx])} className={"path-for-" + classificationTitle}
                    style={{ 'fill' : classificationColorMap[classificationTitle] || '#ccc' }} />
            );
        });

        if (classificationRatioPairs.length === 1){
            tooltip = classificationRatioPairs[0][0];
            // TODO append a badge graphic to this list
            // @see EmbeddableSVGBadgeIcon (incomplete)
        } else {
            tooltip = _.map(classificationRatioPairs, function([ classificationTitle, classificationRatio ]){
                return (Math.round(classificationRatio * 10000) / 100) + '% ' + classificationTitle + 's';
            }).join(' + ');
        }

        return (
            <div className="inline-block pie-chart-icon-container mr-08" data-tip={tooltip}>
                <svg width={size} height={size} style={{ verticalAlign : 'middle' }}>
                    <g transform={"translate(" + outerRadius + "," + outerRadius + ")"}>{ svgBodyItems }</g>
                </svg>
            </div>
        );

    }

}


function BadgeItem(props){
    const { item, parent, windowWidth, height, context } = props;
    const { message, badge } = item;
    const { badge_icon, description } = badge;
    const responsiveGridState = layout.responsiveGridState(windowWidth);
    const classification = BadgesTabView.badgeClassification(props);
    const badgeTitle = BadgesTabView.badgeTitle(props, classification);
    const extTitleClassName = (
        responsiveGridState === 'xs' ? 'mt-0' : 'mt-2'
    );
    const linkMsg = parent && object.itemUtil.atId(context) !== parent ? (
        <React.Fragment>
            -- <a href={parent} data-tip="Click to visit item containing badge.">View Item</a>
        </React.Fragment>
    ) : null;
    const image = badge_icon && (
        <div className="text-center">
            <img src={badge_icon} style={{ 'maxWidth': '100%', maxHeight : height }}/>
        </div>
    );

    return (
        <div className="badge-item row mt-1" style={{ minHeight : height }}>
            <div className="col-xs-3 col-sm-2">{ image }</div>
            <div className="col-xs-9 col-sm-10">
                <h4 className={"text-500 mb-0 " + extTitleClassName}>
                    { badgeTitle }
                    { description ? <i className="icon icon-fw icon-info-circle ml-05" data-tip={description} /> : null }
                </h4>
                { message ? <p className="mb-0">{ message } { linkMsg }</p> : linkMsg }
            </div>
        </div>
    );

}

BadgeItem.defaultProps = {
    'height' : 90
};


/**
 * @todo:
 * Improve & make use of possibly.
 * Currently blocker is that the path dimensions specified in `d` attribute(s)
 * are in context of SVG having 124 height and width. We need these to be correctly resized
 * re: `props.size` somehow.
 */
export class EmbeddableSVGBadgeIcon extends React.PureComponent {

    static linearGradientDefinition(type = "gold"){ // TODO: Implement other colors/types
        return (
            <linearGradient
                id="linearGradient843"
                spreadMethod="pad"
                gradientTransform="matrix(-63.389961,63.389961,63.389961,63.389961,84.548042,23.789524)"
                gradientUnits="userSpaceOnUse"
                y2="0"
                x2="1"
                y1="0"
                x1="0">
                <stop offset="0" style="stop-opacity:1;stop-color:#dbba67" />
                <stop offset="0.514543" style="stop-opacity:1;stop-color:#f8e78f" />
                <stop offset="1" style="stop-opacity:1;stop-color:#e0c26e" />
            </linearGradient>
        );
    }

    static defaultProps = {
        'size' : 124
    };

    render(){
        return (
            <g transform="matrix(1.3333333,0,0,-1.3333333,0,123.99999)">
                <g transform="matrix(0.99799853,0,0,1.0267115,-6.2472151,-10.466581)" style={{ display: "inline" }}>
                    <path
                        d="M 98.319,55.484 91.784,47.887 94.76,38.316 85.74,33.94 84.727,23.968 74.716,23.396 70.007,14.544 60.51,17.763 52.853,11.29 45.197,17.763 35.7,14.544 l -4.71,8.852 -10.011,0.573 -1.013,9.972 -9.02,4.375 2.976,9.571 -6.535,7.597 6.535,7.599 -2.976,9.57 9.021,4.375 1.013,9.973 10.011,0.572 4.708,8.852 9.498,-3.219 7.656,6.473 7.657,-6.473 9.497,3.219 4.709,-8.852 L 84.727,87 85.74,77.028 94.76,72.652 91.784,63.083 Z"
                        style={{ 'fill' : "url(#linearGradient843)" }}
                    />
                </g>
                <g transform="translate(-6.3530571,-8.9847457)" style={{ display: "inline" }}>
                    <path
                        style={{
                            "fill" : "none", "stroke" : "#fff", "strokeWidth" : 1, "strokeLinecap" : "butt",
                            "strokeLinejoin" : "miter", "strokeMiterlimit" : 10, "strokeDasharray" : "none",
                            "strokeOpacity" : 1
                        }}
                        d="m 85.182,57.6988 c 1.224,-17.855 -12.26,-33.321 -30.114,-34.543 -17.856,-1.224 -33.322,12.259 -34.544,30.114 -1.223,17.856 12.26,33.321 30.115,34.544 17.855,1.223 33.32,-12.26 34.543,-30.115 z" />
                </g>
            </g>
        );
    }
}


