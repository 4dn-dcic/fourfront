'use strict';

var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { console, isServerSide, Filters, Schemas, analytics } = require('./../../util');



export class ActiveFiltersBar extends React.Component {

    static defaultProps = {
        'parentId' : 'main',
        'expSetFilters' : {},
        'invisible' : false
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.updateHoverNodes = _.throttle(this.updateHoverNodes.bind(this), 200);
        this.renderCrumbs = this.renderCrumbs.bind(this);
        this.render = this.render.bind(this);
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
        if (this.props.invisible) return null;

        if (this.props.expSetFilters) {
            var contextFacets = (this.props.context && this.props.context.facets) || null;
            var _this = this;

            return Filters.filtersToNodes(
                this.props.expSetFilters,
                this.props.orderedFieldNames
            ).map(function(nodeSet, j){

                // Try to get more accurate title from context.facets list, if available.
                var releventContextFacet = contextFacets && _.findWhere(contextFacets, { 'field' : nodeSet[0].data.field });
                var facetFieldTitle = (releventContextFacet && releventContextFacet.title) || Schemas.Field.toName(nodeSet[0].data.field, _this.props.schemas) || 'N/A';

                return (
                    <div className="field-group" key={j} data-field={nodeSet[0].data.field}>
                        { nodeSet.map(function(node, i){
                            return (<RegularCrumb
                                node={node}
                                expSetFilters={_this.props.expSetFilters}
                                href={_this.props.href}
                                key={node.data.term}
                                color={node.color || null}
                            />);
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

class Container extends React.Component {
    render(){
        var title = null;
        if (this.props.sequential){
            title = "Examining";
        } else {
            title = "Currently-selected Filters";
        }
        return (
            <div className="chart-breadcrumbs-container">
                <h5 className="crumbs-title">
                    { title }
                </h5>
                { this.props.children }
            </div>
        );
    }
}

class RegularCrumb extends React.Component {
    render(){
        var node = this.props.node;
        return (
            <span 
                className="chart-crumb no-highlight-color"
                data-term={node.data.term ? node.data.term : null}
                style={{ backgroundColor : this.props.color }}
            >
                { node.data.name }
                <span className="icon-container" onClick={()=>{
                    Filters.changeFilter( node.data.field, node.data.term, this.props.expSetFilters );
                    analytics.event('QuickInfoBar', 'Unset Filter', {
                        'eventLabel' : analytics.eventLabelFromChartNode(node.data),
                        'dimension1' : analytics.getStringifiedCurrentFilters(this.props.expSetFilters)
                    });
                }}>
                    <i className="icon icon-times"/>
                </span>
            </span>
        );
    }
}
