'use strict';

var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { console, isServerSide, Filters } = require('./../../util');

var ActiveFiltersBar = module.exports = React.createClass({

    statics : {

        Container : React.createClass({
            render : function(){
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
        }),

        RegularCrumb : React.createClass({
            shouldComponentUpdate : function(nextProps){
                if (!_.isEqual(this.props.node && this.props.node.data, nextProps.node && nextProps.node.data)) return true;
                if (this.props.href !== nextProps.href) return true;
                if (this.props.expSetFilters !== nextProps.expSetFilters) return true;
                if (this.props.color !== nextProps.color) return true;
                return false;
            },
            render : function(){
                var node = this.props.node;
                return (
                    <span 
                        className="chart-crumb no-highlight-color"
                        data-term={node.data.term ? node.data.term : null}
                        style={{ backgroundColor : this.props.color }}
                    >
                        { node.data.name }
                        <span className="icon-container" onClick={()=>{
                            Filters.changeFilter(node.data.field, node.data.term, 'sets', this.props.expSetFilters, null, false, true, this.props.href);
                        }}>
                            <i className="icon icon-times"/>
                        </span>
                    </span>
                );
            }
        })

    },

    getDefaultProps : function(){
        return {
            'parentId' : 'main',
            'expSetFilters' : {},
            'invisible' : false
        };
    },

    componentDidMount : function(){
        // Update color if mounting after serverside render w/ filters selected.
        if (this.props.expSetFilters && _.keys(this.props.expSetFilters).length > 0){
            setTimeout(()=>{
                this.forceUpdate();
            }, 500);
        }
    },

    updateHoverNodes : _.throttle(function(sequence = []){
        vizUtil.requestAnimationFrame(()=>{
            this.setState({ 'highlighted' :  sequence });
        });
    }, 200),
    

    renderCrumbs : function(){
        if (this.props.invisible) return null;
        /*
        if (this.state.highlighted.length > 0) return (this.state.highlighted).map(function(node,i){
            return (
                <span 
                    className="chart-crumb"
                    data-field={node.data.field ? node.data.field : null}
                    key={i} 
                    style={{ backgroundColor : (node.color ? node.color : vizUtil.colorForNode(node) ) }}
                >
                    { node.data.name }
                </span>
            );
        });
        else 
        */
        if (this.props.expSetFilters) {
            var _this = this;
            return Filters.filtersToNodes(this.props.expSetFilters, this.props.orderedFieldNames).map(function(nodeSet, j){
                return (
                    <div className="field-group" key={j} data-field={nodeSet[0].data.field}>
                        { nodeSet.map(function(node, i){
                            return (<ActiveFiltersBar.RegularCrumb
                                node={node}
                                expSetFilters={_this.props.expSetFilters}
                                href={_this.props.href}
                                key={node.data.term}
                                color={(node.color ? node.color : vizUtil.colorForNode(node, {}, true))}
                            />);
                        }) }
                        <div className="field-label">{ Filters.Field.toName(nodeSet[0].data.field) || 'N/A' }</div>
                    </div>
                );
                
            });
        } else return null;
    },

    render : function(){
        if (!this.props.showTitle){
            return (<div className="chart-breadcrumbs" id={this.props.parentId + '-crumbs'}>{ this.renderCrumbs() }</div>);
        }
        return (
            <ActiveFiltersBar.Container>
                <div className="chart-breadcrumbs" id={this.props.parentId + '-crumbs'}>
                    { this.renderCrumbs() }
                </div>
            </ActiveFiltersBar.Container>
        );
    }
});