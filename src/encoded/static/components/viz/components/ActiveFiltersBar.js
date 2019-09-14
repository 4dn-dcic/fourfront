'use strict';

import React from 'react';
import _ from 'underscore';
import * as vizUtil from '@hms-dbmi-bgm/shared-portal-components/src/components/viz/utilities';
import { console, searchFilters, analytics } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { Schemas, navigate } from './../../util';



export class ActiveFiltersBar extends React.Component {

    static defaultProps = {
        'parentId' : 'main',
        'expSetFilters' : {},
        'invisible' : false
    };

    constructor(props){
        super(props);
        this.updateHoverNodes = _.throttle(this.updateHoverNodes.bind(this), 200);
        this.renderCrumbs = this.renderCrumbs.bind(this);
    }

    componentDidMount(){
        // Update color if mounting after serverside render w/ filters selected.
        if (this.props.expSetFilters && _.keys(this.props.expSetFilters).length > 0){
            setTimeout(()=>{
                this.forceUpdate();
            }, 500);
        }
    }

    updateHoverNodes(sequence = []){
        vizUtil.requestAnimationFrame(()=>{
            this.setState({ 'highlighted' :  sequence });
        });
    }

    renderCrumbs(){
        const { invisible, expSetFilters, context, orderedFieldNames, href, schemas } = this.props;
        if (invisible) return null;

        if (expSetFilters) {
            const contextFacets = (context && context.facets) || null;

            return searchFilters.filtersToNodes(expSetFilters, orderedFieldNames).map(function(nodeSet, j){

                // Try to get more accurate title from context.facets list, if available.
                const releventContextFacet = contextFacets && _.findWhere(contextFacets, { 'field' : nodeSet[0].data.field });
                const facetFieldTitle = (
                    (releventContextFacet && releventContextFacet.title) ||
                    Schemas.Field.toName(nodeSet[0].data.field, schemas) ||
                    'N/A'
                );

                return (
                    <div className="field-group" key={j} data-field={nodeSet[0].data.field}>
                        { nodeSet.map(function(node, i){
                            return (
                                <RegularCrumb {...{ node, expSetFilters, href }}
                                    key={node.data.term} color={node.color || null} />
                            );
                        }) }
                        <div className="field-label">{ facetFieldTitle }</div>
                    </div>
                );
            });
        } else return null;
    }

    render(){
        if (!this.props.showTitle){
            return (<div className="chart-breadcrumbs" id={this.props.parentId + '-crumbs'}>{ this.renderCrumbs() }</div>);
        }
        return (
            <Container>
                <div className="chart-breadcrumbs" id={this.props.parentId + '-crumbs'}>
                    { this.renderCrumbs() }
                </div>
            </Container>
        );
    }

}

function Container({ sequential, children }){
    const title = sequential ? "Examining" : "Currently-selected Filters";
    return (
        <div className="chart-breadcrumbs-container">
            <h5 className="crumbs-title">
                { title }
            </h5>
            { children }
        </div>
    );
}


const RegularCrumb = React.memo(function RegularCrumb(props){
    const { node, color, expSetFilters } = props;
    const { data : { term = null, name, field } } = node;
    return (
        <span className="chart-crumb no-highlight-color"
            data-term={term}
            style={{ backgroundColor : color }}>
            { name }
            <span className="icon-container" onClick={()=>{
                searchFilters.changeFilter(field, term, expSetFilters, null, false, null, navigate.getBrowseBaseParams());
                analytics.event('QuickInfoBar', 'Unset Filter', {
                    'eventLabel' : analytics.eventLabelFromChartNode(node.data),
                    'dimension1' : analytics.getStringifiedCurrentFilters(expSetFilters)
                });
            }}>
                <i className="icon icon-times fas"/>
            </span>
        </span>
    );
});

