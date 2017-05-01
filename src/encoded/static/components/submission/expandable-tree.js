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

    handleToggle = (e) => {
        e.preventDefault();
        this.props.setMasterState('navigationIsOpen', !this.props.navigationIsOpen);
    }

    render() {
        const{
            keyIdx,
            ...others
        } = this.props;
        return(
            <div style={{'marginTop':'10px'}}>
                <Button className="icon-container" onClick={this.handleToggle}>
                        {'Toggle object navigation'}
                </Button>
                <div className="submission-nav-tree">
                    <Collapse in={this.props.navigationIsOpen}>
                        <div style={{'paddingLeft':'20px'}}>
                            <SubmissionLeaf {...others} keyIdx={0} open={true}/>
                        </div>
                    </Collapse>
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
                hierarchy={this.props.hierarchy[this.props.keyIdx]}
            />
        );
    }

    callBack = (e) => {
        e.preventDefault();
        this.props.setMasterState('currKey', this.props.keyIdx);
    }

    render() {
        var key = this.props.keyIdx;
        var masterValid = this.props.masterValid;
        var masterTypes = this.props.masterTypes;
        var children = Object.keys(this.props.hierarchy[key]).map((childKey) => this.generateChild(childKey));
        var style = {
                        'marginLeft':'-20px',
                        'overflow': 'hidden',
                        'whiteSpace': 'nowrap',
                        'textOverflow': 'ellipsis'
                    };
        var title;
        var titleText = this.props.masterDisplay[key] || key;
        // if key is not a number (i.e. path), the object is not a custom one
        if(isNaN(key)){
            style.backgroundColor = '#b7e1bb';
            title = (<span style={{'padding':'1px 5px'}}>
                        {titleText}
                    </span>);
        }else{
            if(masterValid[key] == 0){
                style.backgroundColor = '#fcd19c';
            }
            if(parseInt(key) === parseInt(this.props.currKey)){
                style.fontWeight = "bold";
                title = (<span style={{'padding':'1px 5px'}} >
                            {titleText}
                        </span>);
            }else{
                title = (<span style={{'padding':'1px 5px'}} onClick={this.callBack}>
                            {titleText}
                        </span>);
            }
        }
        var leftButton;
        if(children.length > 0){
            // Button to expand children
            leftButton = (<Button bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                            <i className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                        </Button>);
        }else if(isNaN(key)){
            // Button to let you open obj in a new tab
            leftButton=(
                <Button bsSize="xsmall" className="icon-container pull-left" onClick={function(e){
                    e.preventDefault();
                    var win = window.open(key, '_blank');
                    if(win){
                        win.focus();
                    }else{
                        alert('Object page popup blocked!');
                    }
                }.bind(this)}>
                    <i className={"icon icon-external-link"}></i>
                </Button>);
        }else{
            // dummy Button
            leftButton=(
                <Button bsSize="xsmall" className="icon-container pull-left" disabled></Button>
            );
        }
        return(
            <div className="submission-nav-leaf">
                <div className="clearfix" style={style}>
                    {leftButton}
                    {title}
                </div>
                <Collapse in={this.state.open}>
                    <div style={{'paddingLeft':'20px'}}>
                        {children}
                    </div>
                </Collapse>
            </div>
        );
    }
}
