import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import { path as d3Path } from 'd3-path';
import {
    standardizeObjectsInList, findNodeWithId,
    createObjectGraph, createRelationships, getRelationships
} from './data-utilities';
import { assignTreeHeightIndices, orderObjectGraph, positionObjectGraph } from './layout-utilities';
import {
    getGraphHeight, getGraphWidth,
    createEdges, relationshipTopPosition,
    graphToDiseaseIndices, orderNodesBottomRightToTopLeft
} from './layout-utilities-drawing';
import { IndividualsLayer, doesAncestorHaveId } from './IndividualsLayer';
import { IndividualNodeShapeLayer } from './IndividualNodeShapeLayer';
import { EdgesLayer } from './EdgesLayer';
import { DefaultDetailPaneComponent } from './DefaultDetailPaneComponent';



/**
 * @typedef DatasetEntry
 * @type {Object}
 * @prop {!(string|number)} id          Unique Identifier of Individual within dataset.
 * @prop {string} [name]                Publicly visible name of Individual/Node.
 * @prop {string} gender                Should be one of "m", "f", or "u".
 * @prop {?number} [age]                Should be calculated from date of birth to be in context of today.
 * @prop {?string[]} [diseases]         List of diseases affecting the individual.
 * @prop {!boolean} [isProband]         If true, identifies the proband individual.
 * @prop {!boolean} [isDeceased]        If true, then Individual is deceased.
 * @prop {!string} [causeOfDeath]       Describes cause of death.
 * @prop {!boolean} [isConsultand]      If true, Individual is seeking consultation.
 * @prop {?boolean} [isStillBirth]      If present & true, deceased must also be truthy _and_ must have no children.
 * @prop {?boolean} [isPregnancy]       If present & true, this individual is not yet born.
 * @prop {?boolean} [isSpontaneousAbortion] `isPregnancy` must also be `true`.
 * @prop {?boolean} [isTerminatedPregnancy] `isPregnancy` must also be `true`.
 * @prop {?boolean} [isEctopic]         `isPregnancy` must also be `true`.
 * @prop {?Object} [data]               Additional or raw data of the Individual which may not be relevant in pedigree. Would only appear in detailpane.
 *
 * @prop {string[]} [parents]           List of parents of Individual in form of IDs.
 * @prop {?string[]} [children]         List of children of Individual in form of IDs.
 * @prop {!string} [father]             Father of Individual in form of ID. Gets merged into 'parents'.
 * @prop {!string} [mother]             Mother of Individual in form of ID. Gets merged into 'parents'.
 */

/**
 * Default values for `props.dimensionOpts`
 */
const POSITION_DEFAULTS = {
    individualWidth: 80,
    individualXSpacing: 80, // THIS MUST BE EQUAL TO OR MULTIPLE OF INDIVIDUAL WIDTH FOR TIME BEING
    individualHeight: 80,
    individualYSpacing: 180,
    graphPadding: 60,
    relationshipSize: 40,
    edgeLedge: 40,
    edgeCornerDiameter: 20
};

/**
 * Primary component to feed data into.
 *
 * @see https://s3-us-west-2.amazonaws.com/utsw-patientcare-web-production/documents/pedigree.pdf
 * @todo Many things, including
 *  - Texts (and containing rect) for markers such as stillBirth, age, ECT, age deceased, pregnancy info, etc.
 *    - Will keep in SVG instead of HTML for simpler exports/printing.
 *  - Texts (center of shape) for "P" (pregnancy), # of grouped individuals.
 *    - Handle grouped individuals (todo: requirements need to be defined)
 *    - Figure out placement if circle of dots or rect of partitions are present (also centered within shape)
 *       - Maybe add to side if something already in center (?)
 *  - Twins of different specificites (requires additions to bounding box calculations, edge segments, etc.)
 */
export class PedigreeViz extends React.PureComponent {

    static propTypes = {
        dataset: PropTypes.arrayOf(PropTypes.exact({
            'id'                : PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            'name'              : PropTypes.string,
            'gender'            : PropTypes.oneOf(["m", "M", "male", "f", "F", "female", "u", "U", "undetermined"]).isRequired,
            'age'               : PropTypes.number,
            'diseases'          : PropTypes.arrayOf(PropTypes.string),
            'carrierOfDiseases' : PropTypes.arrayOf(PropTypes.string),
            'asymptoticDiseases': PropTypes.arrayOf(PropTypes.string),
            'isProband'         : PropTypes.bool,
            'isDeceased'        : PropTypes.bool,
            'isConsultand'      : PropTypes.bool,
            'isPregnancy'       : PropTypes.bool,
            'isStillBirth'      : PropTypes.bool,
            'isSpontaneousAbortion' : PropTypes.bool,
            'isTerminatedPregnancy' : PropTypes.bool,
            'isEctopic'         : PropTypes.bool,
            'data'              : PropTypes.object,
            'parents'           : PropTypes.arrayOf(PropTypes.oneOfType([ PropTypes.string, PropTypes.number ])),
            'children'          : PropTypes.arrayOf(PropTypes.oneOfType([ PropTypes.string, PropTypes.number ])),
            'mother'            : PropTypes.oneOfType([ PropTypes.string, PropTypes.number ]),
            'father'            : PropTypes.oneOfType([ PropTypes.string, PropTypes.number ]),
        })),
        dimensionOpts: PropTypes.objectOf(PropTypes.number),
        height: PropTypes.number,
        width: PropTypes.number,
        editable: PropTypes.bool,
        onNodeSelect: PropTypes.func,
        overlaysContainer: PropTypes.element,
        //detailPaneComponent: PropTypes.elementType,
        renderDetailPane: PropTypes.func
    };

    static defaultProps = {
        /** @type {DatasetEntry[]} dataset - Dataset to be visualized. */
        "dataset" : [
            {
                id: 1,
                name: "Jack",
                isProband: true,
                father: 2,
                mother: 3,
                gender: "m",
                data: {
                    "notes" : "Likes cheeseburger and other sandwiches. Dislikes things that aren't those things.",
                    "description" : "Too many calories in the diet."
                },
                age: 42,
                diseases: ["Badfeelingitis", "Ubercrampus", "Blue Thumb Syndrome"],
                carrierOfDiseases: ["Green Thumbitis", "BlueClues", "BlueClues2", "BluesClues3"],
                //asymptoticDiseases: ["Green Thumbitis", "BlueClues", "BlueClues2", "BluesClues3"]
            },
            { id: 2, name: "Joe", gender: "m" },
            { id: 3, name: "Mary", gender: "f", diseases: ["Blue Thumb Syndrome", "Green Thumbitis"] },
            { id: 4, name: "George", gender: "m", parents: [2,3], age: 45, carrierOfDiseases: ["Blue Thumb Syndrome"], },
            { id: 19, name: "George II", gender: "m", parents: [2,3], age: 46, carrierOfDiseases: ["Blue Thumb Syndrome"], },
            { id: 5, name: "Patricia", gender: "f", parents: [3, 6], diseases: ["Badfeelingitis", "Ubercrampus", "Blue Thumb Syndrome"] },
            {
                id: 6, name: "Patrick", gender: "m", children: [5],
                carrierOfDiseases: ["Blue Thumb Syndrome", "Ubercrampus"]
            },
            {
                id: 7, name: "Phillip", gender: "m", children: [6],
                carrierOfDiseases: ["Blue Thumb Syndrome", "Ubercrampus", "Green Thumbitis", "Badfeelingitis", "BlueClues", "BlueClues2", "BlueClues3"]
            },
            { id: 8, name: "Phillipina", gender: "f", children: [6] },
            { id: 9, name: "Josephina", gender: "f", children: [2] },
            { id: 10, name: "Joseph", gender: "m", children: [2] },
            {
                id: 11, name: "Max", gender: "m", parents: [],
                asymptoticDiseases: ["Green Thumbitis", "BlueClues", "BlueClues2", "BluesClues3"]
            },
            { id: 12, name: "Winnie the Pooh", gender: "u", parents: [11, 5], isDeceased: true, age: 24 },
            {
                id: 13, name: "Rutherford", gender: "m", parents: [10, 5], age: 0.3,
                isPregnancy: true, isDeceased: true, isTerminatedPregnancy: true,
                diseases: ["Ubercrampus", "Blue Thumb Syndrome", "Green Thumbitis"],
                carrierOfDiseases: ["BlueClues", "BlueClues2", "BluesClues3"]
            },
            { id: 14, name: "Sally", gender: "f", parents: [12, 9] },
            { id: 15, name: "Sally2", gender: "f" },
            { id: 16, name: "Silly", gender: "m", parents: [15, 12] },
            { id: 17, name: "Silly2", gender: "m", parents: [15, 12] },
            { id: 18, name: "Silly3", gender: "f", parents: [16, 14] },
        ],

        /**
         * Dimensions for drawing/layout of nodes.
         * Shouldn't need to change these.
         * May define some or all or no dimensions (defaults will be applied).
         *
         * @required
         */
        "dimensionOpts" : Object.assign({}, POSITION_DEFAULTS),

        /**
         * Height of parent container.
         * If not defined, visualization will be unbounded and extend as
         * tall as needed instead of being vertically scrollable.
         * Depending on UX/context, this is likely desirable.
         *
         * @optional
         */
        //"height" : null,

        /**
         * Width of parent container.
         * Will be scrollable left/right if greater than this.
         *
         * @required
         */
        //"width" : 600,

        /**
         * NOT YET SUPPORTED.
         * If true (unsupported yet), will be able to modify and add/remove nodes.
         */
        "editable" : false,

        /**
         * Callback function called upon changing of selectedNode.
         *
         * @optional
         */
        "onNodeSelect" : function(node){
            console.log('Selected', node);
        },

        /**
         * A function which returns a React Component.
         * Will be instantiated/rendered at side of visualization.
         *
         * @type {function}
         */
        "renderDetailPane" : function(vizProps){
            return <DefaultDetailPaneComponent {...vizProps} />;
        },


        /**
         * Can supply an array of strings to color only those diseases.
         * If null, then _all_ diseases will be colored.
         *
         * @type {!string[]}
         */
        "visibleDiseases": null,


        "scale" : 1
    };

    static initState(dataset){
        const jsonList = dataset ? standardizeObjectsInList(dataset) : null;
        const history = jsonList? [jsonList] : [];
        return {
            // New individuals created in viz will be added to here.
            // If none, use a default trio set?
            history,
            'timesChanged' : 0,
            'currCounter' : history.length - 1
        };
    }

    constructor(props){
        super(props);
        this.state = PedigreeViz.initState(props.dataset);
    }

    componentDidUpdate(pastProps, pastState){
        const { dataset } = this.props;
        if (dataset !== pastProps.dataset){
            this.setState(PedigreeViz.initState(dataset));
        }
        /*
        if (stateDataset !== pastState.dataset){
            this.setState(function({ timesChanged, history: pastHistory }){
                const history = pastHistory.slice();
                return { 'timesChanged' : timesChanged + 1 };
            });
        }
        */
    }

    componentWillUnmount(){
        // TODO: if state.jsonList has changed, ask to save before exiting.
    }

    render(){
        const { dataset, ...passProps } = this.props;
        const { history, currCounter } = this.state;
        const jsonList = history[currCounter];
        return (
            <GraphTransformer jsonList={jsonList} {...passProps} />
        );
    }

}


function isMobileSize(windowWidth){
    if ((windowWidth || window.innerWidth) < 800){
        return true;
    }
    return false;
}

function getFullDims(dimensionOpts){
    return Object.assign(
        {},
        POSITION_DEFAULTS,
        dimensionOpts,
        {
            graphPadding : Math.max(
                dimensionOpts.graphPadding || POSITION_DEFAULTS.graphPadding,
                dimensionOpts.individualXSpacing || POSITION_DEFAULTS.individualXSpacing,
                dimensionOpts.individualYSpacing || POSITION_DEFAULTS.individualYSpacing
            )
        }
    );
}


class GraphTransformer extends React.PureComponent {

    constructor(props){
        super(props);
        // Funcs for which we don't expect result to change unless props.jsonList does.
        this.memoized = {
            createObjectGraph       : memoize(createObjectGraph),
            createRelationships     : memoize(createRelationships),
            assignTreeHeightIndices : memoize(assignTreeHeightIndices),
            orderObjectGraph        : memoize(orderObjectGraph),
            positionObjectGraph     : memoize(positionObjectGraph),
            getGraphHeight          : memoize(getGraphHeight),
            getGraphWidth           : memoize(getGraphWidth),
            createEdges             : memoize(createEdges),
            findNodeWithId          : memoize(findNodeWithId),
            getFullDims             : memoize(getFullDims),
            getRelationships        : memoize(getRelationships),
            orderNodesBottomRightToTopLeft : memoize(orderNodesBottomRightToTopLeft),
            graphToDiseaseIndices   : memoize(graphToDiseaseIndices)
        };
    }

    render(){
        const { jsonList, children, dimensionOpts, filterUnrelatedIndividuals, ...passProps } = this.props;
        const { objectGraph, disconnectedIndividuals } = this.memoized.createObjectGraph(jsonList, filterUnrelatedIndividuals);
        const relationships = this.memoized.createRelationships(objectGraph);
        this.memoized.assignTreeHeightIndices(objectGraph);
        const order = this.memoized.orderObjectGraph(objectGraph, relationships, this.memoized);
        const dims = this.memoized.getFullDims(dimensionOpts);
        this.memoized.positionObjectGraph(objectGraph, order, dims);
        const graphHeight = this.memoized.getGraphHeight(order.orderByHeightIndex, dims);
        const edges = this.memoized.createEdges(objectGraph, dims, graphHeight);
        console.log('TTT2', objectGraph, relationships, edges);

        const viewProps = {
            ...passProps,
            objectGraph, relationships, dims, order, edges,
            disconnectedIndividuals, filterUnrelatedIndividuals,
            memoized: this.memoized
        };

        if (children){
            return React.Children.map(children, (child) => React.cloneElement(child, viewProps));
        } else {
            return <PedigreeVizView {...viewProps} memoized={this.memoized} />;
        }
    }
}


export class PedigreeVizView extends React.PureComponent {

    static defaultProps = {
        'width': 600,
        "scale" : 1
    };

    constructor(props){
        super(props);
        this.handleNodeMouseIn = this.handleNodeMouseIn.bind(this);
        this.handleNodeMouseLeave = this.handleNodeMouseLeave.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.handleUnselectNode = this.handleUnselectNode.bind(this);
        this.handleContainerClick = this.handleContainerClick.bind(this);
        this.state = {
            'currHoverNodeId' : null,
            'currSelectedNodeId' :  null
        };
    }

    componentDidUpdate(pastProps){
        const { objectGraph, memoized } = this.props;
        if (objectGraph !== pastProps.objectGraph){
            this.setState(function({ currSelectedNodeId }){
                const retState = { currHoverNodeId: null };
                const selectedNode = currSelectedNodeId && memoized.findNodeWithId(objectGraph, currSelectedNodeId);
                if (!selectedNode){
                    retState.currSelectedNodeId = null;
                }
                return retState;
            });
        }
    }

    handleNodeMouseIn(id){
        const { windowWidth = null } = this.props;
        if (isMobileSize(windowWidth)){
            // Prevent hover interaction handling on mobile sizes for perf/safety.
            return false;
        }
        if (!id) {
            return;
        }
        this.setState({ 'currHoverNodeId' : id });
    }

    handleNodeMouseLeave(evt){
        const { currHoverNodeId = null } = this.state;
        if (!currHoverNodeId){
            return false;
        }
        //console.log('out', evt.currentTarget, evt.target, evt.relatedTarget);
        this.setState({ 'currHoverNodeId' : null });
    }

    handleNodeClick(id){
        if (!id){
            return false;
        }
        this.setState(function({ currSelectedNodeId }){
            if (currSelectedNodeId === id){
                return null;
            }
            return {
                'currSelectedNodeId' : id,
                // For mobile
                'currHoverNodeId' : id
            };
        }, ()=>{
            const { onNodeSelect, memoized, objectGraph } = this.props;
            const { currSelectedNodeId } = this.state;
            if (typeof onNodeSelect === 'function'){
                const currSelectedNode = currSelectedNodeId && memoized.findNodeWithId(objectGraph, currSelectedNodeId);
                onNodeSelect(currSelectedNode);
            }
        });
    }

    handleUnselectNode(){
        this.setState({ 'currSelectedNodeId' : null }, ()=>{
            const { onNodeSelect, memoized, objectGraph } = this.props;
            const { currSelectedNodeId } = this.state;
            if (typeof onNodeSelect === 'function'){
                // Should always eval to null but keep remainder of logic in case state.currSelectedNodeId changes interim.
                const currSelectedNode = currSelectedNodeId && memoized.findNodeWithId(objectGraph, currSelectedNodeId);
                onNodeSelect(currSelectedNode);
            }
        });
    }

    handleContainerClick(evt){
        this.handleUnselectNode();
    }

    render(){
        const {
            width: containerWidth,
            height: propHeight,
            objectGraph, dims, order, memoized,
            overlaysContainer, renderDetailPane, containerStyle,
            visibleDiseases = null,
            scale = 1,
            ...passProps
        } = this.props;
        const { currSelectedNodeId } = this.state;

        let diseaseToIndex;
        if (Array.isArray(visibleDiseases)){
            diseaseToIndex = {};
            visibleDiseases.forEach(function(disease, index){
                diseaseToIndex[disease] = index + 1;
            });
        } else {
            diseaseToIndex = memoized.graphToDiseaseIndices(objectGraph);
        }

        const graphHeight = memoized.getGraphHeight(order.orderByHeightIndex, dims);
        const graphWidth = memoized.getGraphWidth(objectGraph, dims);
        const containerHeight = propHeight || graphHeight;
        const orderedNodes = memoized.orderNodesBottomRightToTopLeft(objectGraph);

        const useContainerStyle = {
            //width: containerWidth,
            height: "auto",
            minHeight : containerHeight || "none",
            ...containerStyle
        };

        const vizAreaStyle = {
            'width': graphWidth * scale,
            // Add extra to offset text @ bottom of nodes.
            'height': (graphHeight * scale) + 60,
            'transform' : scale !== 1 ? "scale(" + scale + ")" : null
        };

        const commonChildProps = {
            objectGraph: orderedNodes,
            graphHeight, graphWidth, dims, memoized, diseaseToIndex,
            containerHeight, containerWidth,
            'onNodeMouseIn' : this.handleNodeMouseIn,
            'onNodeMouseLeave' : this.handleNodeMouseLeave,
            'onNodeClick' : this.handleNodeClick,
            ...passProps, ...this.state
        };

        let selectedNodePane = null;

        if (typeof renderDetailPane === 'function'){
            selectedNodePane = renderDetailPane({
                objectGraph,
                currSelectedNodeId,
                memoized,
                diseaseToIndex,
                overlaysContainer,
                'unselectNode' : this.handleUnselectNode,
                'onNodeClick' : this.handleNodeClick,
            });
        }

        const cls = (
            "pedigree-viz-container" +
            (currSelectedNodeId ? ' node-selected' : '')
        );

        const detailPanelCls = (
            "detail-pane-container" +
            (selectedNodePane && currSelectedNodeId ? ' has-selected-node' : '')
        );

        return (
            <div className={cls} style={useContainerStyle}>
                <div className="inner-container" onClick={this.handleContainerClick}>
                    <div className="viz-area" style={vizAreaStyle}>
                        <ShapesLayer {...commonChildProps} />
                        <RelationshipsLayer {...commonChildProps} />
                        <IndividualsLayer {...commonChildProps} />
                    </div>
                </div>
                { selectedNodePane ? <div className={detailPanelCls}>{ selectedNodePane }</div> : null }
            </div>
        );
    }
}



const ShapesLayer = React.memo(function ShapesLayer(props){
    const { graphHeight, graphWidth } = props;
    const svgStyle = { width: graphWidth, height: graphHeight };
    return (
        <svg className="shapes-layer" viewBox={"0 0 " + graphWidth + " " + graphHeight} style={svgStyle}>
            <EdgesLayer {...props} />
            <SelectedNodeIdentifier {...props} />
            <IndividualNodeShapeLayer {...props} />
        </svg>
    );
});


/**
 * @todo _Maybe_
 * Make into instantiable component and if currSelectedNodeId change then use d3 transition
 * to adjust transform attribute as some browsers won't transition attribute using CSS3.
 * **BUT** Using CSS transition for SVG transform is part of newer spec so browsers should ideally
 * support it, can likely just wait for (more) browsers to implement?
 */
const SelectedNodeIdentifier = React.memo(function SelectedNodeIdentifier(props){
    const { memoized, currSelectedNodeId, objectGraph, dims } = props;
    const selectedNode = currSelectedNodeId && memoized.findNodeWithId(objectGraph, currSelectedNodeId);
    if (!selectedNode){
        return null;
    }
    const { id, _drawing: { xCoord, yCoord } } = selectedNode;

    let useHeight = dims.individualHeight;
    let useWidth = dims.individualWidth;

    if (id.slice(0,13) === "relationship:"){ // Is relationship node.
        useHeight = dims.relationshipSize;
        useWidth = dims.relationshipSize;
    }

    const topLeftX = dims.graphPadding + xCoord - (useWidth / 2);
    const topLeftY = dims.graphPadding + yCoord - (useHeight / 2);
    const transform = "translate(" + topLeftX + ", " + topLeftY + ")";

    return (
        <g className="selected-node-identifier" transform={transform}>
            <SelectedNodeIdentifierShape height={useHeight} width={useWidth} />
        </g>
    );
});

/**
 * @todo Move segmentLength to dims?
 * @todo Make into instantiable component and if detect width change, height change, etc, then use d3 transition.
 */
const SelectedNodeIdentifierShape = React.memo(function SelectedNodeIdentifierShape(props){
    const {
        height, width,
        segmentLengthY = 7,
        segmentLengthX = 7,
        offset = 18
    } = props;

    const cornerPaths = {
        topLeft: null, topRight: null, bottomRight: null, bottomleft: null
    };

    const topLeft = d3Path();
    topLeft.moveTo(-offset, -offset + segmentLengthY);
    topLeft.lineTo(-offset, -offset);
    topLeft.lineTo(-offset + segmentLengthX, -offset);
    cornerPaths.topLeft = topLeft.toString();

    const topRight = d3Path();
    topRight.moveTo(0 - segmentLengthX + offset, -offset);
    topRight.lineTo(offset, -offset);
    topRight.lineTo(offset, -offset + segmentLengthY);
    cornerPaths.topRight = topRight.toString();

    const bottomRight = d3Path();
    bottomRight.moveTo(offset, offset - segmentLengthY);
    bottomRight.lineTo(offset, offset);
    bottomRight.lineTo(offset - segmentLengthX, offset);
    cornerPaths.bottomRight = bottomRight.toString();

    const bottomLeft = d3Path();
    bottomLeft.moveTo(-offset + segmentLengthX, offset);
    bottomLeft.lineTo(-offset, offset);
    bottomLeft.lineTo(-offset, offset - segmentLengthY);
    cornerPaths.bottomLeft = bottomLeft.toString();

    const cornerPathsJSX = Object.keys(cornerPaths).map(function(pos){
        const pathStr = cornerPaths[pos];
        const t = { x: 0, y: 0 };
        if (pos === "topRight" || pos === "bottomRight"){
            t.x = width;
        }
        if (pos === "bottomLeft" || pos === "bottomRight"){
            t.y = height;
        }
        return (
            <g className={"identifier-corner corner-" + pos} key={pos} transform={"translate(" + t.x + ", " + t.y + ")"}>
                <path d={pathStr} />
            </g>
        );
    });

    return <React.Fragment>{ cornerPathsJSX }</React.Fragment>;
});



const RelationshipsLayer = React.memo(function RelationshipsLayer(props){
    const { relationships, ...passProps } = props;
    const visibleRelationshipElements = relationships.map(function(relationship, idx){
        const partnersStr = relationship.partners.map(function(p){ return p.id; }).join(',');
        return <RelationshipNode relationship={relationship} key={partnersStr} partnersStr={partnersStr} {...passProps} />;
    });
    return (
        <div className="relationships-layer">{ visibleRelationshipElements }</div>
    );
});


function relationshipClassName(relationship, isSelected, isBeingHovered){
    const classes = ["pedigree-relationship"];
    if (isBeingHovered) {
        classes.push('is-hovered-over');
    }
    if (isSelected) {
        classes.push('is-selected');
    }
    return classes.join(' ');
}


class RelationshipNode extends React.PureComponent {

    constructor(props){
        super(props);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onClick = this.onClick.bind(this);
        this.memoized = {
            top: memoize(relationshipTopPosition)
        };
    }

    onMouseEnter(evt){
        const { onNodeMouseIn, relationship: { id } } = this.props;
        evt.stopPropagation();
        onNodeMouseIn(id);
    }

    onClick(evt){
        const { onNodeClick, relationship: { id } } = this.props;
        evt.stopPropagation();
        onNodeClick(id);
    }

    render(){
        const {
            relationship, partnersStr, dims, onNodeMouseLeave,
            currHoverNodeId, currSelectedNodeId, editable
        } = this.props;
        const { id, children = [], partners = [], _drawing : { xCoord, yCoord } } = relationship;

        const isSelected = currSelectedNodeId === id;
        const isHoveredOver = currHoverNodeId === id;

        const elemStyle = {
            width : dims.relationshipSize,
            height: dims.relationshipSize,
            top: this.memoized.top(yCoord, dims),
            left: dims.graphPadding + xCoord - (dims.relationshipSize / 2)
        };
        return (
            <div style={elemStyle} className={relationshipClassName(relationship, isSelected, isHoveredOver)}
                data-partners={partnersStr} onMouseEnter={this.onMouseEnter} onMouseLeave={onNodeMouseLeave}
                onClick={this.onClick}>
            </div>
        );
    }
}
