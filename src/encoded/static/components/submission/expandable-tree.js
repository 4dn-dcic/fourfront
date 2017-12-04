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
        'setSubmissionState': PropTypes.func.isRequired,
        'schemas'           : PropTypes.object,
    }

    constructor(props){
        super(props);
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render() {
        var infoTip = '<h5>This panel is for navigating between objects in the creation process</h5> Click on Item/dependency titles to navigate around and edit each individually. Dependencies must be submitted before their parent can be.';
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

class SubmissionProperty extends React.Component {

    constructor(props){
        super(props);
        this.handleToggle = _.throttle(this.handleToggle.bind(this), 500, { 'trailing' : false });
        this.generateChild = this.generateChild.bind(this);
        this.state = { 'open' : typeof this.props.open === 'boolean' ? this.props.open : true };
    }

    handleToggle(e){
        e.preventDefault();
        e.stopPropagation();
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

    render(){
        var { field, schemas, keyTypes, keyIdx, hierarchy, keyLinks, depth } = this.props;

        var itemSchema = schemas[keyTypes[keyIdx]];
        var isRequired = Array.isArray(itemSchema.required) && _.contains(itemSchema.required, field);
        var fieldBase = field.split('.')[0];
        var fieldSchema = itemSchema.properties[fieldBase];

        var bookmark = (fieldSchema && fieldSchema.title) || delveObject(fieldSchema);
        var children = _.map(
            _.filter(
                _.keys(hierarchy[keyIdx]),
                function(childKey){ return keyLinks[childKey] === field; }
            ),
            this.generateChild
        );
        return(
            <div key={bookmark} className={"submission-nav-leaf linked-item-type-name leaf-depth-" + depth + (isRequired ? ' is-required' : '') + (children.length > 0 ? ' has-children' : '' )}>
                <div className="clearfix inner-title">
                    <i className={"icon property-expand-icon clickable icon-" + (this.state.open ? 'minus' : 'plus')} onClick={this.handleToggle}/>
                    <span>{ children.length } { bookmark || field }</span>
                </div>
                { children.length > 0 ? <Collapse in={this.state.open}><div className="children-container" children={children} /></Collapse> : null }
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
        this.handleClick = _.throttle(this.handleClick.bind(this), 500, { 'trailing' : false });
        this.generateAllPlaceholders = this.generateAllPlaceholders.bind(this);
        this.placeholderSortFxn = this.placeholderSortFxn.bind(this);
        this.generateChild = this.generateChild.bind(this);
        this.state = { 'open' : typeof this.props.open === 'boolean' ? this.props.open : true };
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

    placeholderSortFxn(fieldA, fieldB){
        var itemSchema = this.props.schemas[this.props.keyTypes[this.props.keyIdx]];
        var fieldABase = fieldA.split('.')[0];
        var fieldBBase = fieldB.split('.')[0];

        if (Array.isArray(itemSchema.required)){
            if (_.contains(itemSchema.required, fieldA)) return -1;
            if (_.contains(itemSchema.required, fieldB)) return 1;
            if (_.contains(itemSchema.required, fieldABase)) return -1;
            if (_.contains(itemSchema.required, fieldBBase)) return -1;
        }

        var fieldASchema = itemSchema.properties[fieldABase];
        var fieldBSchema = itemSchema.properties[fieldBBase];

        if (fieldASchema.lookup || 750 > fieldBSchema.lookup || 750) return -1; 
        if (fieldASchema.lookup || 750 < fieldBSchema.lookup || 750) return 1;
        
        return 0;

    }

    /**
     * Generate placeholders in the SubmissionTree for every linkTo name and
     * create a SubmissionLeaf for each child object under its corresponding
     * placholder.
     * 
     * @param {string} bookmark - Name of the leaf/view we're on.
     * @returns {JSX.Element} Visible leaf/branch-representing element.
     */
    generateAllPlaceholders(){
        var { keyValid, keyIdx, keyTypes, keyComplete, schemas } = this.props;
        var placeholders;
        
        var fieldsWithLinkTosToShow = this.props.keyLinkBookmarks[keyIdx].sort(this.placeholderSortFxn);

        return _.map(fieldsWithLinkTosToShow, (field) => <SubmissionProperty {...this.props} field={field} /> );
    }

    /** Change the currKey of submissionView to that of props.keyIdx */
    handleClick(e){
        e.preventDefault();
        this.props.setSubmissionState('currKey', this.props.keyIdx);
    }

    render() {
        var { keyValid, keyIdx, keyTypes, keyComplete, schemas } = this.props;
        var itemSchema = schemas[keyTypes[keyIdx]];

        var placeholders;
        if (!isNaN(keyIdx)) {
            placeholders = this.generateAllPlaceholders();
        } else {
            // must be a submitted object - plot directly
            placeholders = _.keys(this.props.hierarchy[keyIdx]).map(this.generateChild);
            console.log('TEST24543', placeholders); // Haven't hit this yet?? XX Have hit this at selecting a sub-object linkTo
        }
        var extIcon;
        var titleText = this.props.keyDisplay[keyIdx] || keyIdx;
        var statusClass = null;
        var isCurrentlySelected = false;
        var tip = null;

        var clickHandler = this.handleClick;

        // if key is not a number (i.e. path), the object is not a custom one.
        // format the leaf as the following if pre-existing obj or submitted
        // custom object.
        if(isNaN(keyIdx) || (keyValid[keyIdx] === 4 && keyComplete[keyIdx])){

            statusClass = 'existing-item';
            /** Open a new tab on click */
            clickHandler = function(e){
                e.preventDefault();
                var win = window.open(isNaN(keyIdx) ? keyIdx : keyComplete[keyIdx], '_blank');
                if(win){
                    win.focus();
                }else{
                    alert('Object page popup blocked!');
                }
            }.bind(this);
            
            icon = <i className="icon icon-hdd-o indicator-icon"/>;
            tip = "Successfully submitted or pre-existing item; already exists in the database.<br>Click to view this item/dependency in new tab/window.";
            extIcon = <i className="icon icon-external-link pull-right" />;

        }else{
            switch (keyValid[keyIdx]){
                case 0:
                    statusClass = 'not-complete';
                    icon = <i className="icon icon-stop-circle-o indicator-icon" />;
                    tip = "Has incomplete children, cannot yet be validated.";
                    break;
                case 1:
                    statusClass = 'complete-not-validated';
                    icon = <i className="icon icon-circle-o indicator-icon" />;
                    tip = "All children are complete, can be validated.";
                    break;
                case 2:
                    statusClass = 'failed-validation';
                    icon = <i className="icon icon-times indicator-icon" />;
                    tip = "Validation failed. Fix fields and try again.";
                    break;
                case 3:
                    statusClass = 'validated';
                    icon = <i className="icon icon-check indicator-icon" />;
                    tip = "Validation passed, ready for submission.";
                    break;
                default:
                    statusClass = 'status-not-determined';
                    break;
            }
        }

        var icon;
        if (keyIdx === this.props.currKey){ // We're currently on this Item
            isCurrentlySelected = true;
            extIcon = <i className="icon icon-pencil pull-right" data-tip="Item which you are currently editing." />;
        }

        return(
            <div className={"submission-nav-leaf linked-item-title leaf-depth-" + (this.props.depth) + (isCurrentlySelected ? ' active' : '')}>
                <div className={"clearfix inner-title " + statusClass} onClick={clickHandler} data-tip={tip} data-html>
                    {extIcon}{icon}<span className="title-text">{titleText}</span>
                </div>
                { placeholders && placeholders.length > 0 ? <div className="list-of-properties" children={placeholders} /> : null }
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


/**
 * Function to recursively find whether a json object contains a linkTo fields
 * anywhere in its nested structure. Returns object type if found, null otherwise.
 */
export const delveObject = function myself(json, getProperty=false){
    var found_obj = null;
    _.keys(json).forEach(function(key, index){
        if(key === 'linkTo'){
            found_obj = json[key];
        }else if(json[key] !== null && typeof json[key] === 'object'){
            var test = myself(json[key]);
            if(test !== null){
                found_obj = test;
            }
        }
    });
    return found_obj;
};

export const delveObjectProperty = function myself(json){
    var jsonKeys = _.keys(json);
    var key;
    for (var i = 0; i < jsonKeys.length; i++){
        key = jsonKeys[i];
        if (key === 'linkTo') {
            return true;
        } else if (json[key] !== null && typeof json[key] === 'object') {
            var test = myself(json[key]);
            if (test === true){
                return [key];
            } else if (Array.isArray(test)){
                return [key].concat(test);
            } else {
                continue;
            }
        }
    }
};
