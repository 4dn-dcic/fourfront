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

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render() {
        var infoTip = 'This panel is for navigating between objects in the creation process. Colors correspond to the state of each object: <br>  <br> Orange: has incomplete children, cannot yet be validated <br> Blue: all children are complete, can be validated <br> Red: validation failed. Fix fields and try again <br> Light green: validation passed, ready for submission <br> Dark green: successfully submitted or pre-existing <br> White: available but unused child object type <br>  <br> Click on object titles to navigate around and edit individually.';
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

class SubmissionLeaf extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            'open': this.props.open || true
        }
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
        this.props.setKeyState('currKey', intKey);
        this.props.setKeyState('navigationIsOpen', false);
    }

    render() {
        var key = this.props.keyIdx;
        var keyValid = this.props.keyValid;
        var keyTypes = this.props.keyTypes;
        var keyComplete = this.props.keyComplete;
        var children = Object.keys(this.props.hierarchy[key]).map((childKey) => this.generateChild(childKey));
        var placeholders;
        if(this.props.keyUnused[key]){
            placeholders = this.props.keyUnused[key].map((link) => this.generatePlaceholder(link))
        }
        var style = {
            'marginLeft': '-15px',
            'overflow': 'hidden',
            'whiteSpace': 'nowrap',
            'textOverflow': 'ellipsis',
            'fontSize': '0.8em',
            'borderLeft' : '1px solid #fff',
            'borderRight' : '1px solid #fff',
            'borderTop' : '1px solid #fff',
            'borderBottom' : '1px solid #fff',
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
        var linkType;
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
            title = (<span style={{'padding':'1px 5px','cursor': 'pointer'}} onClick={function(e){
                            e.preventDefault();
                            var win = window.open(popDestination, '_blank');
                            if(win){
                                win.focus();
                            }else{
                                alert('Object page popup blocked!');
                            }
                        }.bind(this)}>
                        {titleText}
                    </span>);
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
            if(parseInt(key) === parseInt(this.props.currKey)){
                style.fontWeight = "bold";
                style.borderTop = "1px solid #000";
                style.borderBottom = "1px solid #000";
                style.borderLeft = "1px solid #000";
                style.borderRight = "1px solid #000";
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
        if(parseInt(key) == 0){
            style.marginLeft = 0;
            leftButton = null;
            dummyButton = null;
        }else if(children.length > 0 || (placeholders && placeholders.length > 0)){
            // Button to expand children
            leftButton = (<Button style={buttonStyle} bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                            <i style={iconStyle} className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                        </Button>);
        }else{
            leftButton = dummyButton;
        }
        var linkStyle;
        if(this.props.keyLinks[key]){
            linkStyle = JSON.parse(JSON.stringify(style));
            linkStyle.color = '#fff';
            style.borderBottom = "none";
            linkStyle.borderTop = "none";
            if(parseInt(key) === parseInt(this.props.currKey)){
                linkStyle.fontWeight = "bold";
                linkStyle.borderBottom = "1px solid #000";
                linkType = (<span style={{'padding':'1px 5px'}} >
                            {this.props.keyLinks[key]}
                        </span>);
            }else{
                linkType = (<span style={{'padding':'1px 5px', 'cursor':'pointer'}} onClick={this.callBack}>
                            {this.props.keyLinks[key]}
                        </span>);
            }

        }
        return(
            <div className="submission-nav-leaf">
                <div className="clearfix" style={style}>
                    {leftButton}
                    {title}
                </div>
                {linkType ?
                    <div className="clearfix" style={linkStyle}>
                        {dummyButton}
                        {linkType}
                    </div>
                    :
                    null
                }
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
