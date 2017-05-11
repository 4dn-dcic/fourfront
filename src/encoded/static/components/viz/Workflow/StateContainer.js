'use strict';

var React = require('react');
import PropTypes from 'prop-types';
var url = require('url');
var _ = require('underscore');
import { console, isServerSide } from './../../util';


export default class StateContainer extends React.Component {

    static defaultProps = {
        'checkHrefForSelectedNode' : true,
        'checkWindowLocationHref' : true,
        'onNodeClick' : function(node, selectedNode, evt){
            this.setState({ 'selectedNode' : node });
        }
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.href = this.href.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);

        var state = {
            'selectedNode' : null
        };

        if (props.checkHrefForSelectedNode){
            var href = this.href(props.href, props.checkWindowLocationHref);
            if (typeof href === 'string' && Array.isArray(props.nodes)){
                var parts = url.parse(href);
                var foundNode = typeof parts.hash === 'string' && parts.hash.length > 0 && _.findWhere(props.nodes, { 'name' : parts.hash.slice(1) });
                if (foundNode){
                    state.selectedNode = foundNode;
                }
            }
        }

        this.state = state;
    }

    href(
        fallbackHref = (this.props && this.props.href) || null,
        checkWindowLocationHref = (this.props && typeof this.props.checkWindowLocationHref === 'boolean') ? this.props.checkWindowLocationHref : true
    ){
        var href = fallbackHref;
        if (checkWindowLocationHref && !isServerSide() && window.location && window.location.href) href = window.location.href;
        return href;
    }

    componentWillReceiveProps(nextProps){

        var newState = {};

        if (typeof nextProps.href === 'string' && nextProps.checkHrefForSelectedNode){
            // Update selectedNode from location hash.
            var newParts = url.parse(this.href(nextProps.href));
            var oldParts = url.parse(this.props.href);
            if (typeof newParts.hash === 'string' && newParts.hash.length > 0){
                var foundNode = _.findWhere(nextProps.nodes, { 'name' : newParts.hash.slice(1) });
                if (newParts.hash !== oldParts.hash && foundNode){
                    newState.selectedNode = foundNode;
                }
                if (!foundNode){
                    newState.selectedNode = null;
                    if (window && window.location && window.location.hash) window.location.hash = '';
                }
            } else if (!newParts.hash || (typeof newParts.hash === 'string' && newParts.hash.length === 0) && newParts.hash !== oldParts.hash){
                newState.selectedNode = null;
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

    handleNodeClick(node, evt){
        this.props.onNodeClick.call(this, node, this.state.selectedNode, evt);
        //this.setState({ 'selectedNode' : node });
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
