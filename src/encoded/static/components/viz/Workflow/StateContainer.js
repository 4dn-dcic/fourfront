'use strict';

var React = require('react');
import PropTypes from 'prop-types';
var url = require('url');
var _ = require('underscore');
import { console, isServerSide } from './../../util';


export function findNodeFromHref(href, nodes){
    if (typeof href !== 'string' || !Array.isArray(nodes)) return null;
    var parts = url.parse(href);
    return (
        typeof parts.hash === 'string' &&
        parts.hash.length > 0 &&
        _.findWhere(nodes, { 'name' : decodeURIComponent(parts.hash.slice(1)) })
    ) || null;
}


export default class StateContainer extends React.Component {

    static defaultProps = {
        'checkHrefForSelectedNode' : true,
        'checkWindowLocationHref' : true,
        'onNodeClick' : null
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.defaultOnNodeClick = this.defaultOnNodeClick.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.href = this.href.bind(this);
        this.render = this.render.bind(this);

        var state = {
            'selectedNode' : null
        };

        if (props.checkHrefForSelectedNode){
            var href = this.href(props.href, props.checkWindowLocationHref);
            var foundNode = findNodeFromHref(href, props.nodes);
            if (foundNode){
                state.selectedNode = foundNode;
            }
        }

        this.state = state;
    }

    componentWillReceiveProps(nextProps){

        var newState = {};

        if (nextProps.checkHrefForSelectedNode){
            // Update selectedNode from location hash.
            var foundNode = findNodeFromHref(this.href(nextProps.href, nextProps.checkWindowLocationHref), nextProps.nodes);
            if (foundNode){
                newState.selectedNode = foundNode;
            } else {
                newState.selectedNode = null;
                if (window && window.location && window.location.hash) window.location.hash = '';
            }
        }

        // Update own selectedNode to latest v, if still exists & new one not otherwise set.
        if (typeof newState.selectedNode === 'undefined' && this.state.selectedNode){
            var find = { 'name' : this.state.selectedNode.name };
            if (this.state.selectedNode.id) find.id = this.state.selectedNode.id;
            var foundNode = _.findWhere(this.props.nodes, find);
            if (foundNode){
                newState.selectedNode = foundNode;
            } else {
                newState.selectedNode = null;
            }
        }

        if (_.keys(newState).length > 0) this.setState(newState);
    }

    defaultOnNodeClick(node, selectedNode, evt){
        this.setState({ 'selectedNode' : node });
    }

    href(
        fallbackHref = (this.props && this.props.href) || null,
        checkWindowLocationHref = (this.props && typeof this.props.checkWindowLocationHref === 'boolean') ? this.props.checkWindowLocationHref : true
    ){
        var href = fallbackHref;
        if (checkWindowLocationHref && !isServerSide() && window.location && window.location.href) href = window.location.href;
        return href;
    }

    handleNodeClick(node, evt){
        if (typeof this.props.onNodeClick === 'function'){
            this.props.onNodeClick.call(this, node, this.state.selectedNode, evt);
        } else {
            this.defaultOnNodeClick(node, this.state.selectedNode, evt);
        }
    }

    render(){
        return (
            <div className="state-container">
            {
                React.Children.map(this.props.children, (child)=>{
                    return React.cloneElement(child, _.extend(
                        _.omit(this.props, 'children'), { onNodeClick : this.handleNodeClick }, this.state
                    ))
                })
            }
            </div>
        );
    }

}
