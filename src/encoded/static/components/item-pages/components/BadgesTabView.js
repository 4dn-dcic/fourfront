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
        },
        'classificationSingleItemMap' : {
            "Commendation" : function commendationBadge(props){
                const { size } = props;
                return (
                    <div className="inline-block pie-chart-icon-container mr-08" data-tip="Commendation">
                        <svg height={size} width={size} style={{ verticalAlign : 'middle' }}>
                            <EmbeddableSVGBadgeIcon badgeType="gold" size={size} />
                        </svg>
                    </div>
                );
            },
            "Warning" : function warningBadge(props){
                return (
                    <span className="active">
                        <i className="icon icon-fw icon-warning" data-tip="Warning"/>
                    </span>
                );
            }
        }
    };

    constructor(props){
        super(props);
        this.generateArcs = this.generateArcs.bind(this);
        this.generatePieChart = this.generatePieChart.bind(this);
        this.pieGenerator = pie();
    }

    generateArcs = memoize(function(classificationRatioPairs){
        const { innerRadius, classificationColorMap, size } = this.props;
        const outerRadius = size / 2;
        const pieChartDims = this.pieGenerator(  _.pluck(classificationRatioPairs, 1)   );
        const arcGenerator = arc().innerRadius(innerRadius).outerRadius(outerRadius);
        return _.map(classificationRatioPairs, function([ classificationTitle, classificationRatio ], idx){
            return (
                <path d={arcGenerator(pieChartDims[idx])} className={"path-for-" + classificationTitle}
                    style={{ 'fill' : classificationColorMap[classificationTitle] || '#ccc' }} />
            );
        });
    });

    generatePieChart(classificationRatioPairs){
        const { size } = this.props;
        const outerRadius = size / 2;
        const tooltip = _.map(classificationRatioPairs, function([ classificationTitle, classificationRatio ]){
            return (Math.round(classificationRatio * 10000) / 100) + '% ' + classificationTitle + 's';
        }).join(' + ');

        return (
            <div className="inline-block pie-chart-icon-container mr-08" data-tip={tooltip}>
                <svg width={size} height={size} style={{ verticalAlign : 'middle' }}>
                    <g transform={"translate(" + outerRadius + "," + outerRadius + ")"}>{ this.generateArcs(classificationRatioPairs) }</g>
                </svg>
            </div>
        );
    }

    render(){
        const { context, classificationSingleItemMap } = this.props;
        const classificationRatios = SummaryIcon.getClassificationRatios(context);
        const classificationRatioPairs = _.pairs(classificationRatios);
        var singleClassification;

        if (!classificationRatios){
            // Shouldn't happen unless BadgesTabView is present on Item w/o any badges.
            return <i className="icon icon-fw icon-circle-o"/>; // Todo: maybe different icon
        }

        if (classificationRatioPairs.length === 1){
            singleClassification = classificationRatioPairs[0][0];
            if (singleClassification && classificationSingleItemMap && classificationSingleItemMap[singleClassification]){
                return classificationSingleItemMap[singleClassification](this.props);
            }
        }

        return this.generatePieChart(classificationRatioPairs);
    }

}


function BadgeItem(props){
    const { item, parent, windowWidth, height, context } = props;
    const { messages, badge } = item;
    const { badge_icon, description } = badge;
    const classification = BadgesTabView.badgeClassification(props);
    const badgeTitle = BadgesTabView.badgeTitle(props, classification);

    const linkMsg = parent && object.itemUtil.atId(context) !== parent ? (
        <div className="mt-02">
            <a href={parent} className="text-500" data-tip="Click to visit item containing badge.">View Item</a>
        </div>
    ) : null;

    const image = badge_icon && (
        <div className="text-center">
            <img src={badge_icon} style={{ 'maxWidth': '100%', 'maxHeight' : height }}/>
        </div>
    );

    let renderedMessages = null;

    if (Array.isArray(messages) && messages.length > 0){
        if (messages.length === 1){
            renderedMessages = <p className="mb-0 mt-0">{ messages[0] }</p>;
        } else {
            renderedMessages = (
                <ul className="mb-0 mt-02" style={{ paddingLeft: 32 }}>
                    { _.map(messages, function(msg, i){ return <li key={i}>{ msg }</li>; }) }
                </ul>
            );
        }
    }

    return (
        <div className="badge-item row flexrow mt-1" style={{ 'minHeight' : height }}>
            <div className="col-xs-12 col-sm-2">{ image }</div>
            <div className="col-xs-12 col-sm-10" style={{ alignItems : "center", display: "flex" }}>
                <div className="inner mb-05">
                    <h4 className="text-500 mb-0 mt-0">
                        { badgeTitle }
                        { description ? <i className="icon icon-fw icon-info-circle ml-05" data-tip={description} /> : null }
                    </h4>
                    { renderedMessages }
                    { linkMsg }
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

        if (type === 'gold-deprecated'){
            // Gold variant 1 - light streak in center
            return (
                <linearGradient
                    id="embeddable_badge_svg_gradient_definition"
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

        if (type === 'gold'){
            // Gold variant 2 - light streak near top
            return (
                <linearGradient x1="0" y1="0" x2="1" y2="0"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="matrix(-84.350783,-86.777598,84.350783,-86.777598,104.17548,105.38879)"
                    spreadMethod="pad"
                    id="embeddable_badge_svg_gradient_definition">
                    <stop offset="0" style={{ stopOpacity: 1, stopColor: "#d29a11" }} />
                    <stop offset="0.336498" style={{ stopOpacity: 1, stopColor: "#dcae3c" }} />
                    <stop offset="1" style={{ stopOpacity: 1, stopColor: "#eed781" }}  />
                </linearGradient>
            );
        }

    }

    static ribbons(color = "#081ebb"){
        const style = { fill : color, fillOpacity: 1, fillRule: "nonzero", stroke: "none" };
        return (
            <g transform="matrix(1.3333333, 0, 0, -1.3333333, -1, 130)">
                <g transform="translate(-6.8762048,-4.9273304)">
                    <path d="m 26.7374,12.0591 23.046,28.77 -15.008,12.022 -23.469,-29.297" style={style} />
                    <path d="m 18.1642,25.7154 11.924,-9.368 -9.368,-11.923" style={style} />
                    <path d="m 5.5362,16.3135 9.492,11.824 11.824,-9.492" style={style} />
                </g>
                <g transform="translate(-6.8762048,-4.9273304)">
                    <path d="m 95.7296,22.6348 -21.179,30.171 -15.738,-11.047 21.565,-30.725" style={style} />
                    <path d="m 80.2208,18.2227 12.328,8.828 8.828,-12.328" style={style} />
                    <path d="m 85.7169,3.4693 -8.698,12.42 12.419,8.698" style={style} />
                </g>
            </g>
        );
    }

    static defaultProps = {
        'size' : 20,
        'badgeType' : 'gold',
        'ribbons' : true,
        'innerCircleStrokeWidth' : 3
    };

    render(){
        var { size, badgeType, ribbons, innerCircleStrokeWidth } = this.props,
            origSize = 132,
            scale = size / origSize;

        return (
            <g transform={"scale(" + scale + ")"}>
                <defs>{ EmbeddableSVGBadgeIcon.linearGradientDefinition(badgeType) }</defs>
                { ribbons && EmbeddableSVGBadgeIcon.ribbons() }
                <path
                    style={{ 'fill' : "url(#embeddable_badge_svg_gradient_definition)" }}
                    d="m 122.5,62.000686 -8.69589,10.399902 3.96006,13.102207 -12.0026,5.99052 -1.34796,13.651155 -13.321286,0.78304 -6.2661,12.11793 L 72.188901,113.6388 62.000001,122.5 51.812433,113.6388 39.17511,118.04544 32.907679,105.92751 19.586395,105.1431 18.238432,91.491946 6.2358359,85.502795 10.195894,72.400588 1.5000002,62.000686 10.195894,51.598045 6.2358359,38.497207 18.239762,32.508057 19.587726,18.855533 32.90901,18.072494 39.173779,5.9545612 51.812433,10.361207 62.000001,1.5000025 l 10.1889,8.8612045 12.637323,-4.4066458 6.2661,12.1179328 13.321286,0.784408 1.34796,13.651155 12.0026,5.990519 -3.96006,13.099469 z"
                />
                <path
                    d="m 105.10525,59.047919 c 1.632,23.806666 -16.346662,44.428001 -40.151994,46.057331 -23.808,1.632 -44.429333,-16.345332 -46.058666,-40.151998 -1.630667,-23.808 16.346666,-44.427999 40.153332,-46.058666 23.806666,-1.630666 44.426668,16.346667 46.057328,40.153333 z"
                    style={{
                        "fill" : "none", "stroke" : "#fff", "strokeWidth" : innerCircleStrokeWidth, "strokeLinecap" : "butt",
                        "strokeLinejoin" : "miter", "strokeMiterlimit" : 10, "strokeDasharray" : "none",
                        "strokeOpacity" : 1
                    }}/>
            </g>
        );
    }
}
