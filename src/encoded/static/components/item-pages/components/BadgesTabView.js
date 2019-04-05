'use strict';

import React from 'react';
import _ from 'underscore';
import memoize from 'memoize-one';
import { pie, arc } from 'd3-shape';
import PropTypes from 'prop-types';


export class BadgesTabView extends React.PureComponent {

    static getTabObject(props){
        var context = props.context,
            badges = BadgesTabView.getBadgesList(context);
        return {
            tab : (
                <span>
                    <SummaryIcon context={context} /> Badges
                </span>
            ),
            disabled : !badges,
            key : "badges",
            content : <BadgesTabView {...props} />
        };
    }

    static getBadgesList = memoize(function(context){
        var badges = context && context['aggregated-items'] && context['aggregated-items'].badges;
        if (!Array.isArray(badges) || badges.length === 0) return null;
        return badges;
    });

    static badgeClassification(badge){
        var badgeItem = badge && badge.item && badge.item.badge;
        if (typeof badgeItem.warning === 'string' && badgeItem.warning){
            return 'Warning';
        }
        if (typeof badgeItem.commendation === 'string' && badgeItem.commendation){
            return 'Commendation';
        }
        throw new Error('Badge classification cannot be determined');
    }

    render(){
        return 'Test';
    }


}



class SummaryIcon extends React.PureComponent {

    static getWarningRatio = memoize(function(context){
        const badges = BadgesTabView.getBadgesList(context);
        if (!badges) {
            return null;
        }
        const [ warnings, commendations ] = _.partition(badges, function(badge){
            return BadgesTabView.badgeClassification(badge) === 'Warning';
        });
        const warningsLen = warnings.length, commendationsLen = commendations.length;

        // Assume have at least 1 of one of these, else `badges` above would be null.
        if (warningsLen === 0) return 0;
        if (commendationsLen === 0) return 1;
        return warningsLen / commendationsLen;
    });

    static defaultProps = {
        'size' : 20,
        'innerRadius' : 3
    };

    constructor(props){
        super(props);
        this.pieGenerator = pie();
    }

    render(){
        const { context, size, innerRadius } = this.props;
        const outerRadius = size / 2;
        const warningRatio = 0.31243; //SummaryIcon.getWarningRatio(context);

        if (typeof warningRatio !== 'number'){
            // Shouldn't happen unless BadgesTabView is present on Item w/o any badges.
            return <i className="icon icon-fw icon-asterisk"/>; // Todo: maybe different icon
        }

        const commendationRatio = 1 - warningRatio;
        const tooltip = (Math.round(warningRatio * 10000) / 100) + "% Warnings + " + (Math.round(commendationRatio * 10000) / 100) + "% Commendations";
        const pieChartDims = this.pieGenerator([ warningRatio, commendationRatio ]);
        const arcGenerator = arc().innerRadius(innerRadius).outerRadius(outerRadius);

        return (
            <div className="inline-block pie-chart-icon-container mr-08" data-tip={tooltip}>
                <svg width={size} height={size} style={{ verticalAlign : 'middle' }}>
                    <g transform={"translate(" + outerRadius + "," + outerRadius + ")"}>
                        <path d={arcGenerator(pieChartDims[0])} className="warning-path" style={{ fill : '#b32606' }} />
                        <path d={arcGenerator(pieChartDims[1])} className="commendation-path" style={{ fill : '#d0af00' }} />
                    </g>
                </svg>
            </div>
        );

    }


}




