'use strict';
import React from 'react';
import globals from '../globals';
import _ from 'underscore';
import { ajax, console, object, isServerSide } from '../util';
import { DropdownButton, Button, MenuItem, Panel, Table, Collapse} from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';

// Create a custom tree to represent object hierarchy in front end submission.
// Each leaf is clickable and will bring you to a view of the new object
export default class SubmissionTree extends React.Component{

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
            <div className="submission-nav-tree" style={{'marginTop':'10px'}}>
                <h4>
                    {'Navigation'}
                    <InfoIcon children={infoTip}/>
                </h4>
                <div>
                    <SubmissionLeaf {...others} keyIdx={0} open={true}/>
                </div>
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
    constructor(props){
        super(props);
        this.state = {
            'open': this.props.open || true
        };
    }

    handleToggle = (e) => {
        e.preventDefault();
        this.setState({'open': !this.state.open});
    }

    generateChild = (childKey) => {
        if(!isNaN(childKey)){
            childKey = parseInt(childKey);
        }
        // replace key and hierarchy in props
        const{
            keyIdx,
            hierarchy,
            ...others
        } = this.props;
        return(
            <SubmissionLeaf
                key={childKey}
                {...others}
                keyIdx={childKey}
                open={true}
                hierarchy={this.props.hierarchy[this.props.keyIdx]}
            />
        );
    }

    /*
    Generate placeholders in the SubmissionTree for every linkTo name and
    create a SubmissionLeaf for each child object under its corresponding
    placholder.
    */
    generatePlaceholder = (bookmark) =>{
        var children = Object.keys(this.props.hierarchy[this.props.keyIdx]).map(function(childKey){
            if(this.props.keyLinks[childKey] == bookmark){
                return this.generateChild(childKey);
            }else{
                return null;
            }
        }.bind(this));
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
            <div key={bookmark} className="submission-nav-leaf">
                <div className="clearfix" style={style}>
                    <Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" disabled/>
                    <span>
                        {bookmark}
                    </span>
                </div>
                <div>
                    {children}
                </div>
            </div>
        );
    }

    /*
    Change the currKey of submissionView
    */
    callBack = (e) => {
        e.preventDefault();
        var intKey = this.props.keyIdx;
        this.props.setSubmissionState('currKey', intKey);
    }

    render() {
        var { keyValid, keyIdx, keyTypes, keyComplete } = this.props;
        var key = keyIdx;
        var placeholders;
        if(!isNaN(key)){
            placeholders = this.props.keyLinkBookmarks[key].map((link) => this.generatePlaceholder(link));
        }else{
            // must be a submitted object - plot directly
            placeholders = _.keys(this.props.hierarchy[key]).map((child) => this.generateChild(child));
        }
        var style = {
            'marginLeft': '-15px',
            'overflow': 'hidden',
            'whiteSpace': 'nowrap',
            'textOverflow': 'ellipsis',
            'fontSize': '0.8em',
            'border' : '1px solid #fff'
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
        var leftButton;
        var titleText = this.props.keyDisplay[key] || key;
        // if key is not a number (i.e. path), the object is not a custom one.
        // format the leaf as the following if pre-existing obj or submitted
        // custom object.
        if(isNaN(key) || (keyValid[key] == 4 && keyComplete[key])){
            // dark green bg with white text
            style.backgroundColor = '#4c994c';
            style.color = '#fff';
            var popDestination;
            if(isNaN(key)){
                popDestination = key;
            }else{
                popDestination = keyComplete[key];
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
            if(keyValid[key] == 0){
                style.backgroundColor = '#fcd19c'; // orange
            }else if(keyValid[key] == 1){
                style.backgroundColor = '#acd1ec'; // blue
            }else if(keyValid[key] == 2){
                style.backgroundColor = '#e2b6b6'; // red
            }else if(keyValid[key] == 3){
                style.backgroundColor = '#b7e1bb'; // light green
            }
            if(key === this.props.currKey){ // Current key selected
                style.fontWeight = "bold";
                style.border = "1px solid #000";
                title = (<span style={{'padding':'1px 5px'}} >
                            {titleText}
                        </span>);
            }else{
                title = (<span style={{'padding':'1px 5px','cursor': 'pointer'}} onClick={this.callBack}>
                            {titleText}
                        </span>);
            }
        }
        var dummyButton = <Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" disabled></Button>;
        if(key == 0){
            style.marginLeft = 0;
            leftButton = null;
            dummyButton = null;
        }else if (placeholders.length > 0){
            leftButton = (<Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                            <i style={iconStyle} className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                        </Button>);
        }else{
            leftButton = dummyButton;
        }
        return(
            <div className="submission-nav-leaf">
                <div className="clearfix" style={style}>
                    {leftButton}
                    {title}
                </div>
                <Collapse in={this.state.open}>
                    <div style={{'paddingLeft':'15px'}}>
                        {placeholders}
                    </div>
                </Collapse>
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
            <i style={{"marginLeft":"6px", 'fontSize':'0.8em'}} className="icon icon-info-circle" data-place="right" data-html={true} data-tip={this.props.children}/>
        );
    }
}
