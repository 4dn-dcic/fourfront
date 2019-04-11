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

        var tooltip = null, svgArcPaths = null, svgExtraAppends = null;

        if (!classificationRatios){
            // Shouldn't happen unless BadgesTabView is present on Item w/o any badges.
            return <i className="icon icon-fw icon-circle-o"/>; // Todo: maybe different icon
        }

        const pieChartDims = this.pieGenerator(_.values(classificationRatios));
        const arcGenerator = arc().innerRadius(innerRadius).outerRadius(outerRadius);

        svgArcPaths = _.map(classificationRatioPairs, function([ classificationTitle, classificationRatio ], idx){
            return (
                <path d={arcGenerator(pieChartDims[idx])} className={"path-for-" + classificationTitle}
                    style={{ 'fill' : classificationColorMap[classificationTitle] || '#ccc' }} />
            );
        });

        // LOGIC NOT FINAL --- TODO: Mapping of classifications to icon (?) for when all badges are of same classification
        if (classificationRatioPairs.length === 1){
            tooltip = classificationRatioPairs[0][0]; // 'Classification' instead of percentages of classifications
            if (tooltip === 'Commendation'){
                svgArcPaths = null;
                svgExtraAppends = <EmbeddableSVGBadgeIcon/>;
            }
        } else {
            tooltip = _.map(classificationRatioPairs, function([ classificationTitle, classificationRatio ]){
                return (Math.round(classificationRatio * 10000) / 100) + '% ' + classificationTitle + 's';
            }).join(' + ');
        }

        return (
            <div className="inline-block pie-chart-icon-container mr-08" data-tip={tooltip}>
                <svg width={size} height={size} style={{ verticalAlign : 'middle' }}>
                    <g transform={"translate(" + outerRadius + "," + outerRadius + ")"}>{ svgArcPaths }</g>
                    { svgExtraAppends }
                </svg>
            </div>
        );

    }

}


function BadgeItem(props){
    const { item, parent, windowWidth, height, context } = props;
    const { message, badge } = item;
    const { badge_icon, description } = badge;
    const classification = BadgesTabView.badgeClassification(props);
    const badgeTitle = BadgesTabView.badgeTitle(props, classification);
    const linkMsg = parent && object.itemUtil.atId(context) !== parent ? (
        <React.Fragment>
            -- <a href={parent} data-tip="Click to visit item containing badge.">View Item</a>
        </React.Fragment>
    ) : null;
    const image = badge_icon && (
        <div className="text-center">
            <img src={badge_icon} style={{ 'maxWidth': '100%', 'maxHeight' : height }}/>
        </div>
    );

    return (
        <div className="badge-item row flexrow mt-1" style={{ 'minHeight' : height }}>
            <div className="col-xs-12 col-sm-2">{ image }</div>
            <div className="col-xs-12 col-sm-10" style={{ alignItems : "center", display: "flex" }}>
                <div className="inner mb-05">
                    <h4 className="text-500 mb-0 mt-0">
                        { badgeTitle }
                        { description ? <i className="icon icon-fw icon-info-circle ml-05" data-tip={description} /> : null }
                    </h4>
                    { message ? <p className="mb-0">{ message } { linkMsg }</p> : linkMsg }
                </div>
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
                <stop offset="0" style={{ stopOpacity: 1, stopColor: "#dbba67" }}/>
                <stop offset="0.514543" style={{ stopOpacity: 1, stopColor: "#f8e78f" }} />
                <stop offset="1" style={{ stopOpacity: 1, stopColor: "#e0c26e" }} />
            </linearGradient>
        );
    }

    static defaultProps = {
        'size' : 20
    };

    render(){
        var size = this.props.size,
            origSize = 124,
            scale = size / origSize;

        return (
            <g transform={"scale(" + scale + ")"}>
                <defs>{ EmbeddableSVGBadgeIcon.linearGradientDefinition() }</defs>
                <path
                    style={{ 'fill' : "url(#linearGradient843)" }}
                    d="m 122.5,62.000686 -8.69589,10.399902 3.96006,13.102207 -12.0026,5.99052 -1.34796,13.651155 -13.321286,0.78304 -6.2661,12.11793 L 72.188901,113.6388 62.000001,122.5 51.812433,113.6388 39.17511,118.04544 32.907679,105.92751 19.586395,105.1431 18.238432,91.491946 6.2358359,85.502795 10.195894,72.400588 1.5000002,62.000686 10.195894,51.598045 6.2358359,38.497207 18.239762,32.508057 19.587726,18.855533 32.90901,18.072494 39.173779,5.9545612 51.812433,10.361207 62.000001,1.5000025 l 10.1889,8.8612045 12.637323,-4.4066458 6.2661,12.1179328 13.321286,0.784408 1.34796,13.651155 12.0026,5.990519 -3.96006,13.099469 z"
                />
                <path
                    d="m 105.10525,59.047919 c 1.632,23.806666 -16.346662,44.428001 -40.151994,46.057331 -23.808,1.632 -44.429333,-16.345332 -46.058666,-40.151998 -1.630667,-23.808 16.346666,-44.427999 40.153332,-46.058666 23.806666,-1.630666 44.426668,16.346667 46.057328,40.153333 z"
                    style={{
                        "fill" : "none", "stroke" : "#fff", "strokeWidth" : 1, "strokeLinecap" : "butt",
                        "strokeLinejoin" : "miter", "strokeMiterlimit" : 10, "strokeDasharray" : "none",
                        "strokeOpacity" : 1
                    }}/>
            </g>
        );
    }
}


