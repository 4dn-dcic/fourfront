'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import globals from '../globals';
import _ from 'underscore';
import { ajax, console, object, isServerSide } from '../util';
import { DropdownButton, Button, MenuItem, Panel, Table, Collapse} from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';

// Create a custom tree to represent object hierarchy in front end submission.
// Each leaf is clickable and will bring you to a view of the new object
export default class SubmissionTree extends React.Component {

    static propTypes = {
        'keyHierarchy'      : PropTypes.object.isRequired,
        'keyValid'          : PropTypes.object.isRequired,
        'keyTypes'          : PropTypes.object.isRequired,
        'keyDisplay'        : PropTypes.object.isRequired,
        'keyComplete'       : PropTypes.object.isRequired,
        'currKey'           : PropTypes.number.isRequired,
        'keyLinkBookmarks'  : PropTypes.object.isRequired,
        'keyLinks'          : PropTypes.object.isRequired,
        'setSubmissionState': PropTypes.func.isRequired
    }

    constructor(props){
        super(props);
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render() {
        var infoTip = 'This panel is for navigating between objects in the creation process. Colors correspond to the state of each object: <br>  <br> Orange: has incomplete children, cannot yet be validated <br> Blue: all children are complete, can be validated <br> Red: validation failed. Fix fields and try again <br> Light green: validation passed, ready for submission <br> Dark green: successfully submitted or pre-existing <br> White: bookmarks organizing child object types <br>  <br> Click on object titles to navigate around and edit individually.';
        const{
            keyIdx,
            ...others
        } = this.props;
        return(
            <div className="submission-view-navigation-tree">
                <h3 className="form-section-heading mb-08">Navigation <InfoIcon children={infoTip} /></h3>
                <SubmissionLeaf {...others} keyIdx={0} open />
            </div>
        );
    }
}

/*
Generate an entry in SubmissionTree that corresponds to an object. When clicked
on, either change the currKey to that object's key if a custom object, or
open that object's page in a new tab if a pre-existing or submitted object.
*/
class SubmissionLeaf extends React.Component{

    static defaultProps = {
        'depth' : 0
    }

    constructor(props){
        super(props);
        this.handleToggle = _.throttle(this.handleToggle.bind(this), 500, { 'trailing' : false });
        this.handleClick = _.throttle(this.handleClick.bind(this), 500, { 'trailing' : false });
        this.generateChild = this.generateChild.bind(this);
        this.generatePlaceholder = this.generatePlaceholder.bind(this);
        this.state = { 'open' : typeof this.props.open === 'boolean' ? this.props.open : true };
    }

    handleToggle(e){
        e.preventDefault();
        this.setState({'open': !this.state.open});
    }

    generateChild(childKey){
        if(!isNaN(childKey)) childKey = parseInt(childKey);

        // replace key and hierarchy in props
        return(
            <SubmissionLeaf
                {...this.props}
                key={childKey}
                keyIdx={childKey}
                hierarchy={this.props.hierarchy[this.props.keyIdx]}
                open
                depth={this.props.depth + 1}
            />
        );
    }

    /**
     * Generate placeholders in the SubmissionTree for every linkTo name and
     * create a SubmissionLeaf for each child object under its corresponding
     * placholder.
     * 
     * @param {string} bookmark - Name of the leaf/view we're on.
     * @returns {JSX.Element} Visible leaf/branch-representing element.
     */
    generatePlaceholder(bookmark){
        var children = _.map(
            _.keys(this.props.hierarchy[this.props.keyIdx]),
            (childKey) => this.props.keyLinks[childKey] === bookmark ? this.generateChild(childKey) : null
        );
        var style = {
            'marginLeft': '-15px',
            'overflow': 'hidden',
            'whiteSpace': 'nowrap',
            'textOverflow': 'ellipsis',
            'fontSize': '0.8em'
        };
        var buttonStyle = {
            'height': '15px',
            'width': '15px',
            'padding':'4px 7px 0px 3px'
        };
        return(
            <div key={bookmark} className={"submission-nav-leaf linked-item-type-name leaf-depth-" + this.props.depth}>
                <div className="clearfix inner-title" style={style}>
                    <span>{ bookmark }</span>
                </div>
                <div className="children-container" children={children} />
            </div>
        );
    }

    /** Change the currKey of submissionView to that of props.keyIdx */
    handleClick(e){
        e.preventDefault();
        this.props.setSubmissionState('currKey', this.props.keyIdx);
    }

    render() {
        var { keyValid, keyIdx, keyTypes, keyComplete } = this.props;
        var placeholders;
        if (!isNaN(keyIdx)) {
            placeholders = this.props.keyLinkBookmarks[keyIdx].map((link) => this.generatePlaceholder(link));
        } else {
            // must be a submitted object - plot directly
            placeholders = _.keys(this.props.hierarchy[keyIdx]).map((child) => this.generateChild(child));
        }
        var style = {
            
        };
        var buttonStyle = {
            'height': '15px',
            'width': '15px',
            'padding':'3px 6px 1px 4px'
        };
        var iconStyle = {
            'fontSize': '0.8em',
            'verticalAlign': 'super'
        };
        var title;
        var leftButton = null;
        var titleText = this.props.keyDisplay[keyIdx] || keyIdx;
        var statusClass = null;
        var isCurrentlySelected = false;
        // if key is not a number (i.e. path), the object is not a custom one.
        // format the leaf as the following if pre-existing obj or submitted
        // custom object.
        if(isNaN(keyIdx) || (keyValid[keyIdx] == 4 && keyComplete[keyIdx])){

            statusClass = 'existing-item';

            // dark green bg with white text
            style.backgroundColor = '#4c994c';
            style.color = '#fff';
            var popDestination;
            if(isNaN(keyIdx)){
                popDestination = keyIdx;
            }else{
                popDestination = keyComplete[keyIdx];
            }
            // open a new tab on click
            title = (
                <span style={{'padding':'1px 5px','cursor': 'pointer'}} onClick={function(e){
                    e.preventDefault();
                    var win = window.open(popDestination, '_blank');
                    if(win){
                        win.focus();
                    }else{
                        alert('Object page popup blocked!');
                    }
                }.bind(this)}>{ titleText }</span>
            );
        }else{
            switch (keyValid[keyIdx]){
                case 0: statusClass = 'not-complete'; break;
                case 1: statusClass = 'complete-not-validated'; break;
                case 2: statusClass = 'failed-validation'; break;
                case 3: statusClass = 'validated'; break;
                default: statusClass = 'status-not-determined'; break;
            }
            /*
            if(keyValid[keyIdx] === 0){
                statusClass = 'not-complete';
                //style.backgroundColor = '#fcd19c'; // orange
            }else if(keyValid[keyIdx] === 1){
                statusClass = 'complete-not-validated';
                //style.backgroundColor = '#acd1ec'; // blue
            }else if(keyValid[keyIdx] === 2){
                statusClass = 'failed-validation';
                //style.backgroundColor = '#e2b6b6'; // red
            }else if(keyValid[keyIdx] === 3){
                statusClass = 'validated';
                //style.backgroundColor = '#b7e1bb'; // light green
            }
            */
            if(keyIdx === this.props.currKey){ // Current key selected
                isCurrentlySelected = true;
                style.fontWeight = "bold";
                style.border = "1px solid #000";
                title = (<span style={{'padding':'1px 5px'}} >
                            {titleText}
                        </span>);
            }else{
                title = (<span style={{'padding':'1px 5px','cursor': 'pointer'}} onClick={this.handleClick}>
                            {titleText}
                        </span>);
            }
        }

        if (keyIdx !== 0 && placeholders.length > 0) {
            leftButton = (
                <Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                    <i style={iconStyle} className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                </Button>
            );
        }

        return(
            <div className={"submission-nav-leaf linked-item-title leaf-depth-" + (this.props.depth)}>
                <div className={"clearfix inner-title " + statusClass + (isCurrentlySelected ? ' active' : '')} style={style}>
                    {leftButton}
                    {title}
                </div>
                <Collapse in={this.state.open}><div className="list-of-properties">{ placeholders }</div></Collapse>
            </div>
        );
    }
}

class InfoIcon extends React.Component{

    constructor(props){
        super(props);
    }

    render() {
        if (!this.props.children) return null;
        return (
            <i style={{"marginLeft":"6px", 'fontSize':'0.8em'}} className={"icon icon-info-circle" + (this.props.className ? ' ' + this.props.className : '')} data-place="right" data-html={true} data-tip={this.props.children}/>
        );
    }
}
