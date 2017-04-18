/**
 *  Copyright (c) 2015, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from "react";
import _ from "underscore";
import ArcEdge from "./edge-arc";
import LinearEdge from "./edge-linear";
import SquareEdge from "./edge-square";
import AngledEdge from "./edge-angled";

export default React.createClass({

    getDefaultProps() {
        return {
            color: "#ddd",
            width: 4,
            position: 0,
            selected: false,
            muted: false,
            invisible: false,
            arrow: false,
            fillColor: "none"
        };
    },

    render() {
        // Class for edge
        let classed = "edge";
        if (this.props.selected) {
            classed += " selected";
        }
        if (this.props.muted) {
            classed += " muted";
        }
        if (!_.isUndefined(this.props.classed)) {
            classed += " " + this.props.classed;
        }

        // Render based on shape
        if (this.props.shape === "curved") {
            return (
                <ArcEdge
                    x1={this.props.x1}
                    x2={this.props.x2}
                    y1={this.props.y1}
                    y2={this.props.y2}
                    key={this.props.name}
                    label={this.props.label}
                    labelPosition={this.props.labelPosition}
                    labelStyle={this.props.labelStyle}
                    labelOffsetX={this.props.labelOffsetX}
                    labelOffsetY={this.props.labelOffsetY}
                    textAnchor={this.props.textAnchor}
                    color={this.props.color}
                    width={this.props.width}
                    selected={this.props.selected}
                    muted={this.props.muted}
                    classed={classed}
                    arrow={this.props.arrow}
                    arrowWidth={this.props.arrowWidth}
                    arrowHeight={this.props.arrowHeight}
                    position={this.props.position}
                    curveDirection={this.props.curveDirection}
                    offset={this.props.offset}
                    name={this.props.name}
                    invisible={this.props.invisible}
                    onSelectionChange={this.props.onSelectionChange} />
            );
        } else if (this.props.shape === "square") {
            return (
                <SquareEdge
                    x1={this.props.x1}
                    x2={this.props.x2}
                    y1={this.props.y1}
                    y2={this.props.y2}
                    key={this.props.name}
                    label={this.props.label}
                    labelPosition={this.props.labelPosition}
                    labelStyle={this.props.labelStyle}
                    labelOffsetX={this.props.labelOffsetX}
                    labelOffsetY={this.props.labelOffsetY}
                    textAnchor={this.props.textAnchor}
                    color={this.props.color}
                    width={this.props.width}
                    selected={this.props.selected}
                    muted={this.props.muted}
                    classed={classed}
                    roundedX={this.props.roundedX}
                    roundedY={this.props.roundedY}
                    fillColor={this.props.fillColor}
                    size={this.props.size}
                    centerLine={this.props.centerLine}
                    name={this.props.name}
                    invisible={this.props.invisible}
                    onSelectionChange={this.props.onSelectionChange}/>
            );
        } else if (this.props.shape === "angled") {
            return (
                <AngledEdge
                    x1={this.props.x1}
                    x2={this.props.x2}
                    y1={this.props.y1}
                    y2={this.props.y2}
                    key={this.props.name}
                    label={this.props.label}
                    labelPosition={this.props.labelPosition}
                    labelStyle={this.props.labelStyle}
                    labelOffsetX={this.props.labelOffsetX}
                    labelOffsetY={this.props.labelOffsetY}
                    textAnchor={this.props.textAnchor}
                    color={this.props.color}
                    width={this.props.width}
                    selected={this.props.selected}
                    muted={this.props.muted}
                    classed={classed}
                    arrow={this.props.arrow}
                    arrowWidth={this.props.arrowWidth}
                    arrowHeight={this.props.arrowHeight}
                    position={this.props.position}
                    curveDirection={this.props.curveDirection}
                    offset={this.props.offset}
                    name={this.props.name}
                    invisible={this.props.invisible}
                    onSelectionChange={this.props.onSelectionChange} />
            );
        } else {
            return (
                <LinearEdge
                    x1={this.props.x1}
                    x2={this.props.x2}
                    y1={this.props.y1}
                    y2={this.props.y2}
                    key={this.props.name}
                    label={this.props.label}
                    labelPosition={this.props.labelPosition}
                    labelStyle={this.props.labelStyle}
                    labelOffsetX={this.props.labelOffsetX}
                    labelOffsetY={this.props.labelOffsetY}
                    textAnchor={this.props.textAnchor}
                    color={this.props.color}
                    width={this.props.width}
                    selected={this.props.selected}
                    muted={this.props.muted}
                    classed={classed}
                    arrow={this.props.arrow}
                    arrowWidth={this.props.arrowWidth}
                    arrowHeight={this.props.arrowHeight}
                    position={this.props.position}
                    name={this.props.name}
                    invisible={this.props.invisible}
                    onSelectionChange={this.props.onSelectionChange} />
            );
        }
    }
});

