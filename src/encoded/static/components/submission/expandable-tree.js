'use strict';
var React = require('react');
var globals = require('../globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide } = require('../util');
var { DropdownButton, Button, MenuItem, Panel, Table, Collapse} = require('react-bootstrap');
var d3 = require('d3');
var ReactTooltip = require('react-tooltip');

// Create a custom tree to represent object hierarchy in front end submission.
// Each leaf is clickable and will bring you to a view of the new object
export default class SubmissionTree extends React.Component{

    constructor(props){
        super(props);
    }

    render() {
        const{
            keyIdx,
            ...others
        } = this.props;
        return(
            <div className="submission-nav-tree" style={{'marginTop':'10px'}}>
                <h4>Navigation</h4>
                <div>
                    <SubmissionLeaf {...others} keyIdx={0} open={true}/>
                </div>
            </div>
        );
    }
}

class SubmissionLeaf extends React.Component{
    constructor(props){
        super(props);
    }

    state = {
        'open': this.props.open || true
    }

    handleToggle = (e) => {
        e.preventDefault();
        this.setState({'open': !this.state.open});
    }

    generateChild = (childKey) => {
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

    generatePlaceholder = (unused) =>{
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
            <div key={unused} className="submission-nav-leaf">
                <div className="clearfix" style={style}>
                    <Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" disabled/>
                    <span style={{'padding':'1px 5px'}}>
                        {unused}
                    </span>
                </div>
            </div>
        );
    }

    callBack = (e) => {
        e.preventDefault();
        var intKey = parseInt(this.props.keyIdx);
        this.props.setMasterState('currKey', intKey);
        this.props.setMasterState('navigationIsOpen', false);
    }

    render() {
        var key = this.props.keyIdx;
        var masterValid = this.props.masterValid;
        var masterTypes = this.props.masterTypes;
        var children = Object.keys(this.props.hierarchy[key]).map((childKey) => this.generateChild(childKey));
        var placeholders;
        if(this.props.unusedLinks[key]){
            placeholders = this.props.unusedLinks[key].map((link) => this.generatePlaceholder(link))
        }
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
            'padding':'3px 6px 1px 4px'
        };
        var iconStyle = {
            'fontSize': '0.8em',
            'verticalAlign': 'super'
        };
        var title;
        var titleText = this.props.masterDisplay[key] || key;
        // if key is not a number (i.e. path), the object is not a custom one
        if(isNaN(key)){
            // dark green bg with white text - same as a submitted obj
            style.backgroundColor = '#4c994c';
            style.color = '#fff'
            title = (<span style={{'padding':'1px 5px'}}>
                        {titleText}
                    </span>);
        }else{
            if(masterValid[key] == 0){
                style.backgroundColor = '#fcd19c'; // orange
            }else if(masterValid[key] == 1){
                style.backgroundColor = '#acd1ec'; // blue
            }else if(masterValid[key] == 2){
                style.backgroundColor = '#e2b6b6'; // red
            }else if(masterValid[key] == 3){
                style.backgroundColor = '#b7e1bb'; // light green
            }else if(masterValid[key] == 4){
                style.backgroundColor = '#4c994c'; // darker green
                style.color = '#fff' // white text
            }
            if(parseInt(key) === parseInt(this.props.currKey)){
                style.fontWeight = "bold";
                title = (<span style={{'padding':'1px 5px'}} >
                            {titleText}
                        </span>);
            }else{
                title = (<span style={{'padding':'1px 5px','cursor': 'pointer'}} onClick={this.callBack}>
                            {titleText}
                        </span>);
            }
        }
        var leftButton;
        if(parseInt(key) == 0){
            style.marginLeft = 0;
            leftButton = null;
        }else if(children.length > 0 || (placeholders && placeholders.length > 0)){
            // Button to expand children
            leftButton = (<Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                            <i style={iconStyle} className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                        </Button>);
        }else if(isNaN(key)){
            // Button to let you open obj in a new tab
            leftButton=(
                <Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" onClick={function(e){
                    e.preventDefault();
                    var win = window.open(key, '_blank');
                    if(win){
                        win.focus();
                    }else{
                        alert('Object page popup blocked!');
                    }
                }.bind(this)}>
                    <i style={iconStyle} className={"icon icon-external-link"}></i>
                </Button>);
        }else{
            // dummy Button
            leftButton=(
                <Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" disabled></Button>
            );
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
                        {children}
                    </div>
                </Collapse>
            </div>
        );
    }
}
