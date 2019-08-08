'use strict';

import React from 'react';
import memoize from 'memoize-one';
import { individualLeftPosition, individualTopPosition } from './layout-utilities-drawing';


export function doesAncestorHaveId(id, htmlNode, maxDepth = 10){
    let currElem = { parentNode: htmlNode };
    let count = 0;
    while (currElem.parentNode && count <= maxDepth){
        count++;
        currElem = currElem.parentNode;
        if (currElem.id === id) return true;
    }
    return false;
}

export function individualClassName(individual, isBeingHovered = false, isSelected = false){
    const classes = [];
    const { gender, isProband = false, diseases = [], deceased } = individual;
    if (deceased){
        classes.push("is-deceased");
    }
    if (diseases.length > 0){
        classes.push("is-affected");
    }
    if (gender){
        classes.push("gender-" + gender);
    }
    if (isProband === true){
        classes.push('is-proband');
    }
    if (isBeingHovered) {
        classes.push('is-hovered-over');
    }
    if (isSelected) {
        classes.push('is-selected');
    }
    return classes.join(' ');
}





export const IndividualsLayer = React.memo(function IndividualsLayer(props){
    const { objectGraph: g, ...passProps } = props;
    const { graphHeight, graphWidth } = passProps;
    return (
        <div className="individuals-layer">
            { g.map((indv) => <IndividualDiv key={indv.id} individual={indv} {...passProps} /> )}
        </div>
    );
});


/** Contains some memoized per-indv-node funcs/methods to be extended by a view. */
export class IndividualNodeBase extends React.PureComponent {
    constructor(props){
        super(props);
        // Different from PedigreeViz.memoized
        this.memoized = {
            className   : memoize(individualClassName),
            left        : memoize(individualLeftPosition),
            top         : memoize(individualTopPosition)
        };
    }
}


export class IndividualDiv extends IndividualNodeBase {

    constructor(props){
        super(props);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onAddBtnClick = this.onAddBtnClick.bind(this);
        this.state = {
            'currentOption' : null
        };
    }

    componentDidUpdate(pastProps, pastState){
        const { currSelectedNodeId, individual : { id } } = this.props;
        if (currSelectedNodeId !== pastProps.currSelectedNodeId){
            if (currSelectedNodeId !== id){
                this.setState(function({ currentOption }){
                    if (currentOption !== null){
                        return { currentOption: null };
                    }
                    return null;
                });
            }
        }
    }

    onMouseEnter(evt){
        const { onNodeMouseIn, individual: { id } } = this.props;
        evt.stopPropagation();
        onNodeMouseIn(id);
    }

    onClick(evt){
        const { onNodeClick, individual: { id } } = this.props;
        evt.stopPropagation();
        onNodeClick(id);
    }

    onAddBtnClick(evt){
        this.setState({ "currentOption" : "add" });
    }

    handleAddNewIndividual(evt){
        evt.persist();
        console.log('EEE', evt);
    }

    render(){
        const {
            dims, graphHeight, individual, onNodeMouseLeave,
            currHoverNodeId, currSelectedNodeId, editable
        } = this.props;
        const { currentOption } = this.state;
        const { id, name, _drawing : { heightIndex, xCoord, yCoord } } = individual;
        const elemStyle = {
            width       : dims.individualWidth,
            height      : dims.individualHeight,
            top         : this.memoized.top(yCoord, dims),//this.memoized.top(heightIndex, dims, graphHeight),
            left        : this.memoized.left(xCoord, dims)
        };
        const isBeingHovered = currHoverNodeId === id;
        const isSelected = currSelectedNodeId === id;
        let actionButtons = null;
        if (editable && !currentOption){
            /** TODO */
            actionButtons = (
                <div className={"btns-container" + (isSelected || isBeingHovered ? " visible" : "")}>
                    <button type="button" className="add-btn" onClick={this.onAddBtnClick}>
                        <i className="icon icon-fw icon-plus fas"/>
                    </button>
                    <button type="button" className="add-btn">
                        <i className="icon icon-fw icon-link fas"/>
                    </button>
                </div>
            );
        }

        const indvNodeCls = (
            "pedigree-individual"
            + (editable ? " is-editable " : " ")
            + this.memoized.className(individual, isBeingHovered, isSelected)
        );

        const detailStyle = {
            maxWidth: dims.individualWidth + dims.individualXSpacing - 10,
            //left: dims.individualWidth + 8,
            left: -dims.individualWidth * .05,
            top: dims.individualHeight + 10
        };
        return (
            <div style={elemStyle} id={id} data-height-index={heightIndex} className={indvNodeCls}
                data-y-coord={yCoord}
                onMouseEnter={this.onMouseEnter} onMouseLeave={onNodeMouseLeave} onClick={this.onClick}>
                { actionButtons }
                { currentOption === 'add' ? /** TODO */
                    <NodeOptionsPanel {...this.props} onAddSelect={this.handleAddNewIndividual} /> : null
                }
                {/* TODO: make below a cuztomizable prop */}
                <div className="detail-text" style={detailStyle}>
                    <span className="name line-item">{ name }</span>
                </div>
            </div>
        );
    }
}

/** TODO */
function NodeOptionsPanel(props){
    const { onAddSelect, individual } = props;
    const { _parentReferences } = individual;
    const numParents = _parentReferences.length;
    return (
        <div className="node-options-panel btns-container">
            <select onChange={onAddSelect} onSelect={onAddSelect}>
                <option name="sibling">Sibling</option>
                <option name="child">Child</option>
                <option name="parent">{ numParents === 0 ? "Parents" : "Parent" }</option>
            </select>
        </div>
    );
}
