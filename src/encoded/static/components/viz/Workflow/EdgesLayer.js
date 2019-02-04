'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { TransitionGroup, Transition } from 'react-transition-group';
import { console } from './../../util';

import Edge from './Edge';


export default class EdgesLayer extends React.Component {

    /**
     * Move selected edges to top, and disabled ones to bottom, because CSS z-index doesn't work for SVG elements.
     */
    static sortedEdges(edges, selectedNode, isNodeDisabled){
        return edges.slice(0).sort((a,b)=>{
            var isASelected = Edge.isSelected(a, selectedNode, isNodeDisabled);
            var isBSelected = Edge.isSelected(b, selectedNode, isNodeDisabled);

            if (isASelected && !isBSelected){
                return 1;
            } else if (!isASelected && isBSelected){
                return -1;
            } else {
                return 0;
            }
        }).sort((a,b)=>{
            var isADisabled = Edge.isDisabled(a, isNodeDisabled);
            var isBDisabled = Edge.isDisabled(b, isNodeDisabled);

            if (isADisabled && !isBDisabled){
                return -1;
            } else if (!isADisabled && isBDisabled) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    constructor(props){
        super(props);
        this.sortedEdges = this.sortedEdges.bind(this);
        //this.getAllPathElements = this.getAllPathElements.bind(this);
        //this.edgeRefs = [];
    }

    static edgeOnEnter(elem)    { elem.style.opacity = 0; }
    static edgeOnEntering(elem) { elem.style.opacity = 0; }
    static edgeOnEntered(elem)  { elem.style.opacity = null; /** Allows CSS to override, e.g. .15 opacity for disabled edges */ }
    static edgeOnExit(elem)     { elem.style.opacity = 0; }

    sortedEdges = memoize(function(edges, selectedNodes, isNodeDisabled){
        var nextEdges = EdgesLayer.sortedEdges(edges, selectedNodes, isNodeDisabled);
        // Create new list of refs each time we're updated.
        //this.edgeRefs = [];
        //_.forEach(nextEdges, ()=>{
        //    this.edgeRefs.push(React.createRef());
        //});
        return nextEdges;
    });

    // Experimentation with transitioning multiple edges at once within requestAnimationFrame.
    // Need to rethink design of this, an array for this.edgeRefs won't work as we need to keep
    // state.source.x, state.source.y cached in state and associated w/ each edge.
    // Possibly can use object keyed by 'key' string (as determined in render method).
    // Keeping for reference.
    //
    //getAllPathElements(){
    //    return _.map(this.edgeRefs, function(ref){
    //        return ref && ref.current && ref.current.pathRef && ref.current.pathRef.current;
    //    });
    //}

    pathArrows(){
        if (!this.props.pathArrows) return null;
        return Edge.pathArrowsMarkers();
    }

    /**
     * Wraps Edges and each Edge in TransitionGroup and Transition, respectively.
     * We cannot use CSSTransition at the moment because it does not change the className
     * of SVG element(s). We must manually change it (or an attribute of it).
     */
    render(){
        var { outerHeight, innerWidth, innerMargin, width, edges, selectedNode, isNodeDisabled } = this.props,
            divWidth = Math.max(width, this.props.contentWidth),
            edgeCount = edges.length;
        return (
            <div className="edges-layer-wrapper" style={{ 'width' : divWidth, 'height' : outerHeight }}>
                <svg className="edges-layer" width={divWidth} height={outerHeight}>
                    { this.pathArrows() }
                    <TransitionGroup component={null}>
                    {
                        _.map(this.sortedEdges(edges, selectedNode, isNodeDisabled), (edge, index) => {
                            var key = (edge.source.id || edge.source.name) + "----" + (edge.target.id || edge.target.name);
                            return (
                                <Transition unmountOnExit mountOnEnter timeout={500} key={key}
                                    onEnter={EdgesLayer.edgeOnEnter} onEntering={EdgesLayer.edgeOnEntering}
                                    onExit={EdgesLayer.edgeOnExit} onEntered={EdgesLayer.edgeOnEntered}>
                                    <Edge {...this.props} {...{ key, edge, edgeCount }}
                                        startX={edge.source.x} startY={edge.source.y}
                                        endX={edge.target.x} endY={edge.target.y} />
                                </Transition>
                            );
                        })
                    }
                    </TransitionGroup>
                </svg>
            </div>
        );
    }

}
