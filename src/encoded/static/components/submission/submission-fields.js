'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import * as globals from '../globals';
import _ from 'underscore';
import url from 'url';
import ReactTooltip from 'react-tooltip';
import { DropdownButton, Button, MenuItem, Panel, Table, Collapse, Fade, Checkbox, InputGroup, FormGroup, FormControl } from 'react-bootstrap';
import { ajax, console, object, isServerSide, animateScrollTo, Schemas } from '../util';
import Alerts from '../alerts';
import { BasicStaticSectionBody } from './../static-pages/components/BasicStaticSectionBody';


var ProgressBar = require('rc-progress').Line;

var makeTitle = object.itemUtil.title;



/*
Individual component for each type of field. Contains the appropriate input
if it is a simple number/text/enum, or generates a child component for
attachment, linked object, array, object, and file fields. Contains delete
logic for the field as well (deleting is done by setting value to null).
*/
export default class BuildField extends React.PureComponent {

    /**
     * @param {{ 'type' : string }} fieldSchema - Schema definition for this property. Should be same as `app.state.schemas[CurrentItemType].properties[currentField]`.
     */
    static fieldTypeFromFieldSchema(fieldSchema){
        var fieldType = fieldSchema.type ? fieldSchema.type : "text";
        // transform some types...
        if(fieldType === 'string'){
            fieldType = 'text';
            if (typeof fieldSchema.formInput === 'string'){
                if (['textarea', 'html', 'code'].indexOf(fieldSchema.formInput) > -1) return fieldSchema.formInput;
            }
        }
        // check if this is an enum
        if(fieldSchema.enum || fieldSchema.suggested_enum){
            fieldType = 'enum';
        }
        // handle a linkTo object on the the top level
        if(fieldSchema.linkTo){
            fieldType = 'linked object';
        } else if (fieldSchema.attachment && fieldSchema.attachment === true){
            fieldType = 'attachment';
        }
        return fieldType;
    }

    constructor(props){
        super(props);
        this.wrapWithLabel = this.wrapWithLabel.bind(this);
        this.wrapWithNoLabel = this.wrapWithNoLabel.bind(this);
        this.displayField = this.displayField.bind(this);
        this.state = {
            'dropdownOpen' : false
        };
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    handleDropdownButtonToggle = (isOpen, evt) => {
        if (isOpen) {
            this.setState({ 'dropdownOpen' : true });
        } else {
            this.setState({ 'dropdownOpen' : false });
        }
    }

    displayField(field_case){
        var { field, value, disabled, enumValues, currentSubmittingUser, roundTwo, fieldType, currType, getCurrContext } = this.props;
        var inputProps = {
            'key'       :        field,
            'id'                : 'field_for_' + field,
            'disabled'          : disabled || false,
            'ref'               : "inputElement",
            'value'             : (typeof value === 'number' ? value || 0 : value || ''),
            'onChange'          : this.handleChange,
            'name'              : field,
            'placeholder'       : "No value",
            'data-field-type'   : field_case
        };

        // Unique per-type overrides

        if (currType === 'StaticSection' && field === 'body'){
            // Static section preview
            var currContext = getCurrContext(), // Make sure we have a filetype.
                filetype = currContext && currContext.options && currContext.options.filetype;
            if (filetype === 'md' || filetype === 'html'){
                return <PreviewField {...this.props} filetype={filetype} onChange={this.handleChange} />;
            }
        }

        // Common field types
        switch(field_case){
            case 'text' :
                if (field === 'aliases'){
                    return <div className="input-wrapper"><AliasInputField {...inputProps} onAliasChange={this.handleAliasChange} currentSubmittingUser={currentSubmittingUser} /></div>;
                }
                return <FormControl type="text" inputMode="latin" {...inputProps} />;
            case 'textarea':
                return <FormControl type="text" inputMode="latin" {...inputProps} componentClass="textarea" rows={4} />;
            case 'html':
            case 'code':
                return <FormControl type="text" inputMode="latin" {...inputProps} componentClass="textarea" rows={8} wrap="off" style={{ 'fontFamily' : "Source Code Pro, monospace", 'fontSize' : 'small' }} />;
            case 'integer'          : return <FormControl type="number" {...inputProps} step={1} />;
            case 'number'           : return <FormControl type="number" {...inputProps} />;
            case 'boolean'          : return (
                <Checkbox {..._.omit(inputProps, 'value', 'placeholder')} checked={!!(value)} className="mb-07 mt-07">
                    <span style={{ 'verticalAlign' : 'middle', 'textTransform' : 'capitalize' }}>
                        { typeof value === 'boolean' ? value + '' : null }
                    </span>
                </Checkbox>
            );
            case 'enum'             : return (
                <span className="input-wrapper" style={{'display':'inline'}}>
                    <DropdownButton title={value || <span className="text-300">No value</span>} onToggle={this.handleDropdownButtonToggle}>
                        {_.map(enumValues, (val) => this.buildEnumEntry(val))}
                    </DropdownButton>
                </span>
            );
            case 'linked object'    : return <LinkedObj key="linked-item" {...this.props}/>;
            case 'array'            : return <ArrayField {...this.props} pushArrayValue={this.pushArrayValue} value={value || null} roundTwo={roundTwo} />;
            case 'object'           : return <div style={{'display':'inline'}}><ObjectField {...this.props}/></div>;
            case 'attachment'       : return <div style={{'display':'inline'}}><AttachmentInput {...this.props}/></div>;
            case 'file upload'      : return <S3FileInput {...this.props} />;
        }
        // Fallback
        return <div>No field for this case yet.</div>;
    }

    // create a dropdown item corresponding to one enum value
    buildEnumEntry = (val) => {
        return(
            <MenuItem key={val} title={val || ''} eventKey={val} onSelect={this.submitEnumVal}>
                {val || ''}
            </MenuItem>
        );
    }

    submitEnumVal = (eventKey) => {
        this.props.modifyNewContext(this.props.nestedField, eventKey, this.props.fieldType, this.props.linkType, this.props.arrayIdx);
    }

    handleChange = (e) => {
        var inputElement = e && e.target ? e.target : this.refs.inputElement;
        var currValue = inputElement.value;
        if (this.props.fieldType === 'boolean'){
            currValue = inputElement.checked;
        } else if (this.props.fieldType === 'integer'){
            currValue = parseInt(currValue);
            if (isNaN(currValue)){
                currValue = null;
            }
        } else if (this.props.fieldType === 'number'){
            currValue = parseFloat(currValue);
            if (isNaN(currValue)){
                currValue = null;
            }
        }
        //console.log('VAL', this.props.nestedField, currValue, this.props.fieldType, this.props.value, this.props.arrayIdx);
        this.props.modifyNewContext(this.props.nestedField, currValue, this.props.fieldType, this.props.linkType, this.props.arrayIdx);
    }

    handleAliasChange = (currValue) =>{
        this.props.modifyNewContext(this.props.nestedField, currValue, this.props.fieldType, this.props.linkType, this.props.arrayIdx);
    }

    // call modifyNewContext from parent to delete the value in the field
    deleteField = (e) => {
        e.preventDefault();
        this.props.modifyNewContext(this.props.nestedField, null, this.props.fieldType, this.props.linkType, this.props.arrayIdx);
    }

    // this needs to live in BuildField for styling purposes
    pushArrayValue = (e) => {
        e && e.preventDefault();
        if(this.props.fieldType !== 'array'){
            return;
        }
        var valueCopy = this.props.value ? this.props.value.slice() : [];
        if(this.props.schema.items && this.props.schema.items.type === 'object'){
            // initialize with empty obj in only this case
            valueCopy.push({});
        }else{
            valueCopy.push(null);
        }
        this.props.modifyNewContext(this.props.nestedField, valueCopy, this.props.fieldType, this.props.linkType, this.props.arrayIdx);
    }

    commonRowProps(){
        return {
            'className' : (
                "field-row" +
                (this.state.dropdownOpen ? ' active-submission-row' : '') +
                (this.props.isArray ? ' in-array-field clearfix row'  : '')
            ),
            'data-field-type' : this.props.fieldType,
            'data-field-name' : this.props.field,
            'style' : { 'overflow' : 'visible' }
        };
    }

    labelTypeDescriptor(){
        return <div className="field-descriptor">{ this.props.required ? <span style={{'color':'#a94442'}}> Required</span> : null }</div>;

    }

    wrapWithLabel(){
        var { fieldTip, title, fieldType, schema } = this.props;
        return(
            <div {...this.commonRowProps()}>
                <div className="row">
                    <div className="col-sm-12 col-md-4">
                        <h5 className="submission-field-title text-ellipsis-container">
                            { this.labelTypeDescriptor() }
                            { fieldTip ? [<InfoIcon children={fieldTip} title={title} fieldType={fieldType} schema={schema} />, <span>&nbsp;&nbsp; </span>] : null}
                            <span>{ title }</span>
                        </h5>
                    </div>
                    <div className="col-sm-12 col-md-8">
                        <div className="row field-container">
                            { Array.prototype.slice.call(arguments) }
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    wrapWithNoLabel(){
        return <div {...this.commonRowProps()}>{ Array.prototype.slice.call(arguments) }</div>;
    }

    render = () => {
        // TODO: come up with a schema based solution for code below?
        var { value, isArray, field, fieldType, arrayIdx, isLastItemInArray, schema } = this.props;
        var cannot_delete = ['filename'], // hardcoded fields you can't delete
            showDelete = false,
            disableDelete = false,
            extClass = '';

        // don't show delet button unless:
        // not in hardcoded cannot delete list AND is not an object or
        // non-empty array element (individual values get deleted)
        if(!_.contains(cannot_delete, field) && fieldType !== 'array'){
            showDelete = true;
        }

        // if there is no value in the field and non-array, hide delete button
        if (isValueNull(value) && !isArray) {
            showDelete = false;
        }

        var wrapFunc = this.wrapWithLabel;

        var excludeRemoveButton = (fieldType === 'array' || fieldType === 'file upload'); // In case we render our own w/ dif functionality lower down.

        var fieldToDisplay = this.displayField(fieldType);

        if (isArray) {
            // array items don't need fieldnames/tooltips
            wrapFunc = this.wrapWithNoLabel;

            if (isLastItemInArray && isValueNull(value)){
                showDelete = false;
                if (Array.isArray(arrayIdx) && arrayIdx[0] !== 0){
                    extClass += " last-item-empty";
                }
            } else if (fieldType === 'object') {
                // if we've got an object that's inside inside an array, only allow
                // the array to be deleted if ALL individual fields are null
                if (!isValueNull(value)){
                    disableDelete = true;
                }
                //var valueCopy = this.props.value ? JSON.parse(JSON.stringify(this.props.value)) : {};
                //var nullItems = _.filter( _.keys(valueCopy), isValueNull);
                //if( _.keys(valueCopy).length !== nullItems.length){
                //    showDelete = false;
                //}
            }
        }

        if (fieldType === 'linked object' && LinkedObj.isInSelectionField(this.props)){
            extClass += ' in-selection-field';
        }

        return wrapFunc(
            <div className={'field-column col-xs-' + (excludeRemoveButton ? "12": "10") + extClass} children={fieldToDisplay}/>,
            excludeRemoveButton ? null : <SquareButton show={showDelete} disabled={disableDelete} tip={isArray ? 'Remove Item' : 'Clear Value'} onClick={this.deleteField} />
        );
    }
}



class SquareButton extends React.Component {

    static defaultProps = {
        'bsStyle' : 'danger',
        'icon' : 'times',
        'style' : null
    }

    render(){
        var { show, disabled, onClick, tip, bsStyle, buttonContainerClassName, icon, style } = this.props;
        return (
            <div className="col-xs-2 remove-button-column" style={style}>
                <Fade in={show}>
                    <div className={"pull-right remove-button-container" + (!show ? ' hidden' : '') + (buttonContainerClassName ? ' ' + buttonContainerClassName : '')}>
                        <Button tabIndex={2} bsStyle={bsStyle} disabled={disabled} onClick={onClick} data-tip={tip}><i className={"icon icon-fw icon-" + icon}/></Button>
                    </div>
                </Fade>
            </div>
        );
    }
}



var linkedObjChildWindow = null; // Global var

/** Case for a linked object. */
class LinkedObj extends React.PureComponent{

    /**
     * @param {Object} props - Props passed from LinkedObj or BuildField.
     * @param {string} props.nestedField - Field of LinkedObj
     * @param {number[]|null} props.arrayIdx - Array index (if any) of this item, if any.
     * @param {string} props.fieldBeingSelected - Field currently selected for linkedTo item selection.
     * @param {number[]|null} props.fieldBeingSelectedArrayIdx - Array index (if any) of currently selected for linkedTo item selection.
     * @returns {boolean} Whether is currently selected field/item or not.
     */
    static isInSelectionField(props){
        if (!props) return false;
        return props.fieldBeingSelected && props.fieldBeingSelected === props.nestedField && ( // & check if array indices match, if any
            (props.arrayIdx === null && props.fieldBeingSelectedArrayIdx === null) ||
            (Array.isArray(props.arrayIdx) && Array.isArray(props.fieldBeingSelectedArrayIdx) && props.fieldBeingSelectedArrayIdx[0] === props.arrayIdx[0])
        );
    }

    constructor(props){
        super(props);
        this.updateContext = this.updateContext.bind(this);
        this.setSubmissionStateToLinkedToItem = this.setSubmissionStateToLinkedToItem.bind(this);
        this.showAlertInChildWindow = this.showAlertInChildWindow.bind(this);
        this.setChildWindowMessageHandler = this.setChildWindowMessageHandler.bind(this);
        this.handleChildWindowMessage = this.handleChildWindowMessage.bind(this);
        this.handleChildFourFrontSelectionClick = this.handleChildFourFrontSelectionClick.bind(this);
        this.handleSelectItemClick = this.handleSelectItemClick.bind(this);
        this.handleCreateNewItemClick = this.handleCreateNewItemClick.bind(this);
        this.handleWindowDragOver = this.handleWindowDragOver.bind(this);
        this.refreshWindowDropReceiver = _.throttle(this.refreshWindowDropReceiver.bind(this), 300);
        this.closeWindowDropReceiver = this.closeWindowDropReceiver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleTextInputChange = this.handleTextInputChange.bind(this);
        this.handleAcceptTypedID = this.handleAcceptTypedID.bind(this);

        this.windowDropReceiverHideTimeout = null;
        this.state = {
            'textInputValue' : (typeof props.value === 'string' && props.value) || ''
        };
    }

    componentDidMount(){
        this.updateContext();
    }

    componentDidUpdate(pastProps){
        this.updateContext();

        if (pastProps.fieldBeingSelected !== this.props.fieldBeingSelected || pastProps.fieldBeingSelectedArrayIdx !== this.props.fieldBeingSelectedArrayIdx) {
            this.manageWindowOnDragHandler(pastProps, this.props);
        }

        ReactTooltip.rebuild();
    }

    componentWillUnmount(){
        this.manageWindowOnDragHandler(this.props, null);
        //if (this.props.fieldBeingSelected !== null){
        //    this.cleanChildWindow();
        //}
    }

    /**
     * Mechanism for changing value of linked object in parent context
     * from {number} keyIdx to {string} path of newly submitted object.
     */
    updateContext(){
        var { keyComplete, value, linkType, arrayIdx, nestedField, modifyNewContext } = this.props;
        if (keyComplete[value] && !isNaN(value)) {
            modifyNewContext(nestedField, keyComplete[value], 'finished linked object', linkType, arrayIdx);
            ReactTooltip.rebuild();
        }
    }

    manageWindowOnDragHandler(pastProps, nextProps){
        var pastInSelection     = this.isInSelectionField(pastProps),
            nowInSelection      = this.isInSelectionField(nextProps),
            hasUnsetInSelection = pastInSelection && !nowInSelection,
            hasSetInSelection   = !pastInSelection && nowInSelection;

        if (hasUnsetInSelection){
            window.removeEventListener('dragenter', this.handleWindowDragEnter);
            window.removeEventListener('dragover',  this.handleWindowDragOver);
            window.removeEventListener('drop',      this.handleDrop);
            this.closeWindowDropReceiver();
            if (this.childWindowClosedInterval){
                clearInterval(this.childWindowClosedInterval);
                delete this.childWindowClosedInterval;
                this.cleanChildWindowEventHandlers();
            }
            console.warn('Removed window event handlers for field', this.props.field);
            //console.log(pastInSelection, nowInSelection, _.clone(pastProps), _.clone(nextProps))
        } else if (hasSetInSelection){
            var _this = this;
            setTimeout(function(){
                if (!_this || !_this.isInSelectionField(_this.props)) return false;
                window.addEventListener('dragenter', _this.handleWindowDragEnter);
                window.addEventListener('dragover',  _this.handleWindowDragOver);
                window.addEventListener('drop',      _this.handleDrop);
                console.warn('Added window event handlers for field', _this.props.field);
                //console.log(pastInSelection, nowInSelection, _.clone(pastProps), _.clone(nextProps))
            }, 250);
        }
    }

    setSubmissionStateToLinkedToItem(e){
        e.preventDefault();
        e.stopPropagation();
        var intKey = parseInt(this.props.value);
        if (isNaN(intKey)) throw new Error('Expected an integer for props.value, received', this.props.value);
        this.props.setSubmissionState('currKey', intKey);
    }

    isInSelectionField(props = this.props){ return LinkedObj.isInSelectionField(props); }

    showAlertInChildWindow(){
        var { schema, nestedField, title } = this.props;
        var itemType = schema.linkTo;
        var prettyTitle = schema && ((schema.parentSchema && schema.parentSchema.title) || schema.title);
        var childAlerts = this.windowObjectReference && this.windowObjectReference.fourfront && this.windowObjectReference.fourfront.alerts;
        if (childAlerts){
            childAlerts.queue({
                'title' : 'Selecting ' + itemType + ' for field ' + (prettyTitle ? prettyTitle + ' ("' + nestedField + '")' : '"' + nestedField + '"'),
                'message' : (
                    <div>
                        <p className="mb-0">
                            Please either <b>drag and drop</b> an Item (row) from this window into the submissions window or click its corresponding select (checkbox) button.
                        </p>
                        <p className="mb-0">You may also browse around and drag & drop a link into the submissions window as well.</p>
                    </div>
                ),
                'style' : 'info'
            });
        }
    }

    handleSelectItemClick(e){
        e.preventDefault();

        if (!window) return;

        var { schema, nestedField, linkType, arrayIdx, selectObj, selectCancel } = this.props;

        var itemType    = schema.linkTo,
            searchURL   = '/search/?type=' + itemType + '#!selection';

        if (linkedObjChildWindow && !linkedObjChildWindow.closed && linkedObjChildWindow.fourfront && typeof linkedObjChildWindow.fourfront.navigate === 'function'){
            // We have access to the JS of our child window. Call app.navigate(URL) directly instead of reloading entire HTML. May not work for some browsers.
            this.windowObjectReference = linkedObjChildWindow;
            this.windowObjectReference.fourfront.navigate(searchURL, {}, this.showAlertInChildWindow);
            this.windowObjectReference.focus();
        } else {
            // Some browsers (*cough* MS Edge *cough*) are strange and will encode '#' to '%23' initially.
            this.windowObjectReference = linkedObjChildWindow = window.open(
                "about:blank",
                "selection-search",
                "menubar=0,toolbar=1,location=0,resizable=1,scrollbars=1,status=1,navigation=1,width=1010,height=600"
            );
            setTimeout(()=>{
                this.windowObjectReference.location.assign(searchURL);
                this.windowObjectReference.location.hash = '#!selection';
            }, 100);
        }
        this.setChildWindowMessageHandler();

        selectObj(itemType, nestedField, linkType, arrayIdx);

        this.childWindowClosedInterval = setInterval(()=>{
            if (!this || !this.windowObjectReference || this.windowObjectReference.closed) {
                clearInterval(this.childWindowClosedInterval);
                delete this.childWindowClosedInterval;
                if (this && this.windowObjectReference && this.windowObjectReference.closed){
                    selectCancel();
                }
                this.cleanChildWindowEventHandlers();
                this.windowObjectReference = linkedObjChildWindow = null;
            }
        }, 1000);
    }

    handleChildWindowMessage(evt){
        var eventType = evt && evt.data && evt.data.eventType;
        if (!eventType) {
            console.error("No eventType specified in message. Canceling.");
            return;
        }

        // Authenticate message origin to prevent XSS attacks.
        var eventOriginParts = url.parse(evt.origin);
        if (window.location.host !== eventOriginParts.host){
            console.error('Received message from unauthorized host. Canceling.');
            return;
        }
        if (window.location.protocol !== eventOriginParts.protocol){
            console.error('Received message from unauthorized protocol. Canceling.');
            return;
        }

        if (eventType === 'fourfrontselectionclick') {
            return this.handleChildFourFrontSelectionClick(evt);
        }

        if (eventType === 'fourfrontinitialized') {
            return this.showAlertInChildWindow();
        }
    }

    setChildWindowMessageHandler(){
        setTimeout(()=>{
            window && window.addEventListener('message', this.handleChildWindowMessage);
            console.log('Updated \'message\' event handler');
        }, 200);
    }

    cleanChildWindowEventHandlers(){
        window.removeEventListener('message', this.handleChildWindowMessage);
        if (!this || !this.windowObjectReference) {
            console.warn('Child window no longer available to unbind event handlers. Fine if closed.');
            return;
        }
    }

    cleanChildWindow(){
        if (this && this.windowObjectReference){
            if (!this.windowObjectReference.closed) this.windowObjectReference.close();
            this.cleanChildWindowEventHandlers();
            this.windowObjectReference = linkedObjChildWindow = null;
        }
    }

    handleCreateNewItemClick(e){
        e.preventDefault();
        if (this.props.fieldBeingSelected !== null) {
            this.props.selectCancel();
        }
        this.props.modifyNewContext(this.props.nestedField, null, 'new linked object', this.props.linkType, this.props.arrayIdx, this.props.schema.linkTo);
    }

    handleChildFourFrontSelectionClick(evt){
        // Grab from custom event
        var atId = evt && ((evt.data && evt.data.id) || (evt.detail && evt.detail.id) || null);

        if (!object.isValidAtIDFormat(atId)) {
            // Possibly unnecessary as all #!selection clicked items would have evt.detail.id in proper format, or not have it.
            // Also more validation performed in SubmissionView.prototype.fetchAndValidateItem().

            // TODO: Perhaps turn failureCallback to own func on SubmissionView.prototype and pass it in as prop here to be called.
            throw new Error('No valid @id available.');
        } else {
            Alerts.deQueue({ 'title' : "Invalid Item Dropped" });
        }

        console.log('Fourfront Submissions - CLICKED SELECT BUTTON FOR', atId, evt, evt.detail);

        this.props.selectComplete(atId);
        this.cleanChildWindow();
    }

    /**
     * Handles drop event for the (temporarily-existing-while-dragging-over) window drop receiver element.
     * Grabs @ID of Item from evt.dataTransfer, attempting to grab from 'text/4dn-item-id', 'text/4dn-item-json', or 'text/plain'.
     * @see Notes and inline comments for handleChildFourFrontSelectionClick re isValidAtId.
     */
    handleDrop(evt){
        evt.preventDefault();
        evt.stopPropagation();
        var draggedContext = evt.dataTransfer && evt.dataTransfer.getData('text/4dn-item-json'),
            draggedURI = evt.dataTransfer && evt.dataTransfer.getData('text/plain'),
            draggedID = evt.dataTransfer && evt.dataTransfer.getData('text/4dn-item-id'),
            atId = draggedID || (draggedContext && object.itemUtil.atId(draggedContext)) || url.parse(draggedURI).pathname || null;

        var isValidAtId = object.isValidAtIDFormat(atId),
            invalidTitle = "Invalid Item Dropped";

        if (!atId || !isValidAtId){
            Alerts.queue({
                'title' : invalidTitle,
                'message': "You have dragged & dropped an item or link which doesn't have a valid 4DN ID or URL associated with it. Please try again.",
                'style': 'danger'
            });
            throw new Error('No valid @id available.');
        } else {
            Alerts.deQueue({ 'title' : invalidTitle });
        }

        console.log('Fourfront Submissions - DROPPED', atId, evt, this.props);

        this.props.selectComplete(atId);
        this.cleanChildWindow();
    }

    handleWindowDragEnter(evt){
        evt.preventDefault();
        evt.stopPropagation();
    }

    handleWindowDragOver(evt){
        evt.preventDefault();
        evt.stopPropagation();
        this.refreshWindowDropReceiver(evt);
    }

    closeWindowDropReceiver(evt){
        var elem = this.windowDropReceiverElement;
        if (!elem) return;
        elem.style.opacity = 0;
        setTimeout(()=>{
            document.body.removeChild(elem);
            this.windowDropReceiverElement = null;
            this.windowDropReceiverHideTimeout = null;
        }, 250);
    }

    refreshWindowDropReceiver(evt){
        if (!document || !document.createElement) return;

        if (this.windowDropReceiverHideTimeout !== null) {
            clearTimeout(this.windowDropReceiverHideTimeout);
            this.windowDropReceiverHideTimeout = setTimeout(this.closeWindowDropReceiver, 500);
            return;
        }

        var { schema, nestedField } = this.props,
            itemType = schema.linkTo,
            prettyTitle = schema && ((schema.parentSchema && schema.parentSchema.title) || schema.title);

        var element = document.createElement('div');
        element.className = "full-window-drop-receiver";

        var innerText = "Drop " + (itemType || "Item") + " for field '" + (prettyTitle || nestedField) +  "'";
        var innerBoldElem = document.createElement('h2');
        innerBoldElem.appendChild(document.createTextNode(innerText));
        element.appendChild(innerBoldElem);
        element.appendChild(document.createElement('br'));
        document.body.appendChild(element);
        this.windowDropReceiverElement = element;

        setTimeout(()=>{
            this.windowDropReceiverElement.style.opacity = 1;
        }, 10);

        this.windowDropReceiverHideTimeout = setTimeout(this.closeWindowDropReceiver, 500);
    }

    handleAcceptTypedID(evt){
        console.log(evt);
        if (!this || !this.state || !this.state.textInputValue){
            throw new Error('Invalid @id format.');
        }
        this.props.selectComplete(this.state.textInputValue);
        this.cleanChildWindow();
    }

    handleTextInputChange(evt){
        this.setState({ 'textInputValue' : evt.target.value });
    }

    renderSelectInputField(){
        var { value, selectCancel, selectComplete } = this.props;
        var textInputValue              = this.state.textInputValue,
            canShowAcceptTypedInput     = typeof textInputValue === 'string' && textInputValue.length > 3,
            extClass                    = !canShowAcceptTypedInput && textInputValue ? ' has-error' : '';
        return (
            <div className="linked-object-text-input-container row flexrow">
                <div className="field-column col-xs-10">
                    <input onChange={this.handleTextInputChange} className={"form-control" + extClass} inputMode="latin" type="text" placeholder="Drag & drop Item from the search view or type in a valid @ID." value={this.state.textInputValue} onDrop={this.handleDrop} />
                </div>
                { canShowAcceptTypedInput ? <SquareButton show onClick={this.handleAcceptTypedID} icon="check" bsStyle="success" tip="Accept typed identifier and look it up in database." /> : null }
                <SquareButton show onClick={(e)=>{ selectCancel(); this.cleanChildWindow(); }} tip="Cancel selection" style={{ 'marginRight' : 9 }} />
            </div>
        );
    }

    renderEmptyField(){
        var { schema, value, keyDisplay, keyComplete, setSubmissionState } = this.props;
        return (
            <div className="linked-object-buttons-container">
                <Button className="select-create-linked-item-button" onClick={this.handleSelectItemClick}>
                    <i className="icon icon-fw icon-search"/> Select existing
                </Button>
                <Button className="select-create-linked-item-button" onClick={this.handleCreateNewItemClick}>
                    <i className="icon icon-fw icon-file-o"/> Create new
                </Button>
            </div>
        );
    }

    render(){
        var { schema, value, keyDisplay, keyComplete, setSubmissionState, nestedField, fieldBeingSelected } = this.props;

        if (this.isInSelectionField()){
            return this.renderSelectInputField();
        }

        // object chosen or being created
        if (value){
            var thisDisplay = keyDisplay[value] || value;
            if (isNaN(value)) {
                //thisDisplay = keyDisplay[value] || value;
                return(
                    <div className="submitted-linked-object-display-container text-ellipsis-container">
                        <i className="icon icon-fw icon-database" />&nbsp;&nbsp;
                        <a href={value} target="_blank" data-tip={"This Item, '" + thisDisplay + "' is already in the database"} children={thisDisplay} />
                        &nbsp;<i style={{'marginLeft': 5, 'fontSize' : '0.85rem'}} className="icon icon-fw icon-external-link"/>
                    </div>
                );
            } else {
                // it's a custom object. Either render a link to editing the object
                // or a pop-up link to the object if it's already submitted
                var intKey = parseInt(value);
                //thisDisplay = keyDisplay[value] || value;
                // this is a fallback - shouldn't be int because value should be
                // string once the obj is successfully submitted
                if (keyComplete[intKey]){
                    return(
                        <div>
                            <a href={keyComplete[intKey]} target="_blank" children={thisDisplay}/>
                            <i style={{'marginLeft': 5}} className="icon icon-fw icon-external-link"/>
                        </div>
                    );
                } else {
                    return(
                        <div className="incomplete-linked-object-display-container text-ellipsis-container">
                            <i className="icon icon-fw icon-sticky-note-o" />&nbsp;&nbsp;
                            <a href="#" onClick={this.setSubmissionStateToLinkedToItem} data-tip="Continue editing/submitting" children={thisDisplay} />
                            &nbsp;<i style={{'marginLeft': 5, 'fontSize' : '0.85rem'}} className="icon icon-fw icon-pencil"/>
                        </div>
                    );
                }
            }
        } else {
            // nothing chosen/created yet
            return this.renderEmptyField();
        }
    }
}



class PreviewField extends React.Component {

    render(){
        var { value, filetype, field, onChange } = this.props;
        return (
            <div className="preview-field-container">
                { value && <h6 className="mt-0 text-600">Preview:</h6> }
                { value && <hr className="mb-1 mt-05" /> }
                { value &&  <BasicStaticSectionBody content={value || ''} filetype={filetype} /> }
                { value && <hr className="mb-05 mt-05" /> }
                <FormControl onChange={onChange} id={"field_for_" + field} name={field} value={value} type="text" inputMode="latin" componentClass="textarea" rows={8}
                    wrap="off" style={{ 'fontFamily' : "Source Code Pro, monospace", 'fontSize' : 'small' }} />
            </div>
        );
    }

}


/**
 * Display fields that are arrays. To do this, make a BuildField for each
 * object in the value and use a custom render method. initiateArrayField is
 * unique to ArrayField, since it needs to update the arrayIdx
 */
class ArrayField extends React.Component{

    static typeOfItems(itemSchema){
        var fieldType = itemSchema.type ? itemSchema.type : "text";
        // transform some types...
        if (fieldType === 'string'){
            fieldType = 'text';
        }
        // check if this is an enum
        if(itemSchema.enum){
            fieldType = 'enum';
        }
        // handle a linkTo object on the the top level
        if(itemSchema.linkTo){
            fieldType = 'linked object';
        }
        return fieldType;
    }

    static shouldPushArrayValue(currentArr, field = null){
        if (!currentArr ||
            (
                Array.isArray(currentArr) && (
                    currentArr.length === 0 || !isValueNull(currentArr[currentArr.length - 1])
                )
            )
        ){
            if (field !== 'aliases') {
                return true;
            } else {
                if (currentArr && currentArr.length >= 1) return true;
            }
        }
        return false;
    }

    /**
     * If empty array, add initial 'null' element. On Mount & Update.
     */
    componentDidMount(){
        if (ArrayField.shouldPushArrayValue(this.props.value, this.props.field)){
            this.props.pushArrayValue();
        }
    }

    componentDidUpdate(prevProps, prevState){ // We can't do a comparison of props.value here because parent property mutates yet stays part of same obj.
        if (ArrayField.shouldPushArrayValue(this.props.value, this.props.field)){
            this.props.pushArrayValue();
        } else {
            if (Array.isArray(this.props.value) && this.props.value.length >= 2){
                if (isValueNull(this.props.value[this.props.value.length - 1]) && isValueNull(this.props.value[this.props.value.length - 2])){
                    this.props.modifyNewContext(this.props.nestedField, null, ArrayField.typeOfItems(this.props.schema.items || {}), this.props.linkType, [this.props.value.length - 2]);
                }
            }
        }
    }

    initiateArrayField = (arrayInfo, index, allItems) => {
        var value = arrayInfo[0] || null;
        var fieldSchema = arrayInfo[1];
        // use arrayIdx as stand-in value for field
        var arrayIdx = arrayInfo[2];
        var fieldTip = fieldSchema.description || null;
        if(fieldSchema.comment){
            fieldTip = fieldTip ? fieldTip + ' ' + fieldSchema.comment : fieldSchema.comment;
        }
        var title = fieldSchema.title || 'Item';
        var fieldType = ArrayField.typeOfItems(fieldSchema);
        var enumValues = fieldSchema.enum ? (fieldSchema.enum || []) : []; // check if this is an enum

        var arrayIdxList;
        if(this.props.arrayIdx){
            arrayIdxList = this.props.arrayIdx.slice();
        }else{
            arrayIdxList = [];
        }
        arrayIdxList.push(arrayIdx);
        fieldSchema = _.extend({}, fieldSchema, { 'parentSchema' : this.props.schema });
        return(
            <div key={arrayIdx} className={"array-field-container " + (arrayIdx % 2 === 0 ? 'even' : 'odd')} data-field-type={fieldType}>
                <BuildField
                    {...{ value, fieldTip, fieldType, title, enumValues }}
                    { ..._.pick(this.props, 'field', 'modifyNewContext', 'linkType', 'selectObj', 'selectComplete', 'selectCancel',
                        'nestedField', 'keyDisplay', 'keyComplete', 'setSubmissionState', 'fieldBeingSelected', 'fieldBeingSelectedArrayIdx',
                        'updateUpload', 'upload', 'uploadStatus', 'md5Progress', 'currentSubmittingUser', 'roundTwo', 'currType' ) }
                    isArray={true} isLastItemInArray={allItems.length - 1 === index} arrayIdx={arrayIdxList}
                    schema={fieldSchema} disabled={false} required={false} key={arrayIdx} />
            </div>
        );
    }

    generateAddButton(){
        var values = this.props.value || [];
        return (
            <div className="add-array-item-button-container">
                <Button bsSize={values.length > 0 ? 'small' : null} onClick={this.props.pushArrayValue}><i className="icon icon-fw icon-plus"/> Add</Button>
            </div>
        );
    }

    render(){
        var schema = this.props.schema.items || {};
        var values = this.props.value || [];
        var valuesToRender = _.map( values.length === 0 ? [null] : values , function(v,i){ return [v, schema, i]; });
        var showAddButton = !isValueNull(values[valuesToRender.length - 1]);

        return(
            <div className="list-of-array-items">
                { valuesToRender.map(this.initiateArrayField) }
                { showAddButton ? this.generateAddButton() : null }
            </div>
        );
    }
}



/**
 * Builds a field that represents a sub-object. Essentially serves to hold
 * and coordinate BuildFields that correspond to the fields within the subfield.
 */
class ObjectField extends React.Component {

    constructor(props){
        super(props);
    }

    componentDidMount(){
        // initialize with empty dictionary
        var initVal = this.props.value || {};
        this.props.modifyNewContext(this.props.nestedField, initVal, 'object', this.props.linkType, this.props.arrayIdx);
    }

    includeField = (schema, field) => {
        if (!schema) return null;
        var schemaVal = object.getNestedProperty(schema, ['properties', field], true);
        if (!schemaVal) return null;
        // check to see if this field should be excluded based on exclude_from status
        if (schemaVal.exclude_from && (_.contains(schemaVal.exclude_from,'FFedit-create') || schemaVal.exclude_from == 'FFedit-create')){
            return null;
        }
        if (schemaVal.exclude_from && (_.contains(schemaVal.exclude_from,'FF-calculate') || schemaVal.exclude_from == 'FF-calculate')){
            return null;
        }
        // check to see if this field is a calculated val
        if (schemaVal.calculatedProperty && schemaVal.calculatedProperty === true){
            return null;
        }
        // check to see if permission == import items
        if (schemaVal.permission && schemaVal.permission == "import_items"){
            return null;
        }
        return schemaVal;
    }

    initiateField = ([ field, fieldSchema ]) => {
        var fieldTip = fieldSchema.description ? fieldSchema.description : null;
        if(fieldSchema.comment){
            fieldTip = fieldTip ? fieldTip + ' ' + fieldSchema.comment : fieldSchema.comment;
        }
        var fieldType = BuildField.fieldTypeFromFieldSchema(fieldSchema);
        var title = fieldSchema.title || field;
        var fieldValue;
        if(this.props.value){
            fieldValue = this.props.value[field];
        }else{
            fieldValue = null;
        }
        var enumValues = [];
        // check if this is an enum
        if(fieldType === 'enum'){
            enumValues = fieldSchema.enum || fieldSchema.suggested_enum || [];
        }
        // format field as <this_field>.<next_field> so top level modification
        // happens correctly
        var nestedField = this.props.nestedField + '.' + field;
        return (
            <BuildField
                { ..._.pick(this.props, 'modifyNewContext', 'linkType', 'setSubmissionState',
                    'selectObj', 'selectComplete', 'selectCancel', 'arrayIdx', 'keyDisplay', 'keyComplete', 'currType',
                    'updateUpload', 'upload', 'uploadStatus', 'md5Progress', 'fieldBeingSelected', 'fieldBeingSelectedArrayIdx'
                )}
                { ...{ field, fieldType, fieldTip, enumValues, nestedField, title } }
                value={fieldValue} key={field} schema={fieldSchema}
                disabled={false} required={false} isArray={false} />
        );
    }

    render(){
        var objectSchema = this.props.schema,
            allFieldsInSchema = objectSchema['properties'] ? _.keys(objectSchema['properties']) : [],
            fieldsToBuild = _.filter(_.map(allFieldsInSchema, (f)=>{ // List of [field, fieldSchema] pairs.
                var fieldSchemaToUseOrNull = this.includeField(objectSchema, f);
                return (fieldSchemaToUseOrNull && [f, fieldSchemaToUseOrNull]) || null;
            }));

        return <div className="object-field-container" children={_.map(fieldsToBuild, this.initiateField)} />;
    }
}



/**
 * For version 1. A simple local file upload that gets the name, type,
 * size, and b64 encoded stream in the form of a data url. Upon successful
 * upload, adds this information to NewContext
 */
class AttachmentInput extends React.Component{

    constructor(props){
        super(props);
    }

    acceptedTypes(){
        // hardcoded back-up
        var types = object.getNestedProperty(this.props.schema, ['properties', 'type', 'enum'], true);
        if(!types){
            // generic backup types
            types = [
                "application/pdf",
                "application/zip",
                "application/msword",
                "text/plain",
                "text/tab-separated-values",
                "image/jpeg",
                "image/tiff",
                "image/gif",
                "text/html",
                "image/png",
                "image/svs",
                "text/autosql"
            ];
        }
        return(types.toString());
    }

    handleChange = (e) => {
        var attachment_props = {};
        var file = e.target.files[0];
        if(!file){
            this.props.modifyNewContext(this.props.nestedField, null, 'attachment', this.props.linkType, this.props.arrayIdx);
            return;
        }
        attachment_props.type = file.type;
        if(file.size) {attachment_props.size = file.size;}
        if(file.name) {attachment_props.download = file.name;}
        var fileReader = new window.FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onloadend = function (e) {
            if(e.target.result){
                attachment_props.href = e.target.result;
            }else{
                alert('There was a problem reading the given file.');
                return;
            }

        }.bind(this);
        this.props.modifyNewContext(this.props.nestedField, attachment_props, 'attachment', this.props.linkType, this.props.arrayIdx);
    }

    render(){
        var attach_title;
        if(this.props.value && this.props.value.download){
            attach_title = this.props.value.download;
        }else{
            attach_title = "No file chosen";
        }
        var labelStyle = {
            'paddingRight':'5px',
            'paddingLeft':'5px'
        };
        return(
            <div style={{'display': 'inherit'}}>
                <input id={"field_for_" + this.props.field} type='file' onChange={this.handleChange} style={{'display':'none'}} accept={this.acceptedTypes()}/>
                <Button>
                    <label className="text-400 mb-0" htmlFor={"field_for_" + this.props.field} style={labelStyle}>
                        {attach_title}
                    </label>
                </Button>
            </div>
        );
    }
}



/**
 * Input for an s3 file upload. Context value set is local value of the filename.
 * Also updates this.state.file for the overall component. Runs file uploads
 * async using the upload_manager passed down in props.
 */
class S3FileInput extends React.Component{

    constructor(props){
        super(props);
        this.getFileExtensionRequired = this.getFileExtensionRequired.bind(this);
        this.state = {
            'percentDone': null,
            'sizeUploaded': null,
            'newFile': false,
            'status': null
        };
    }

    componentWillReceiveProps(nextProps){
        if(this.props.upload === null && nextProps.upload !== null){
            this.handleAsyncUpload(nextProps.upload);
        }
        if(this.props.uploadStatus !== nextProps.uploadStatus){
            this.setState({'status': nextProps.uploadStatus});
        }
    }

    modifyFile = (val) => {
        this.props.setSubmissionState('file', val);
        if(val !== null){
            this.setState({
                'newFile': true,
                'status': null
            });
        }else{
            this.setState({
                'newFile': false,
                'status': null
            });
        }
    }

    getFileExtensionRequired(){
        // get the current context and overall schema for the file object
        var currContext = this.props.getCurrContext();
        var currSchema = this.props.getCurrSchema();
        var schema_extensions = object.getNestedProperty(currSchema, ['file_format_file_extension'], true);
        var extension;
        // find the extension the file should have
        if (currContext.file_format in schema_extensions) {
            extension = schema_extensions[currContext.file_format];
        } else {
            alert('Internal file extension conflict.');
            return null;
        }
        return extension;
    }

    /*
    Handle file selection. Store the file in SubmissionView state and change
    the filename context using modifyNewContext
    */
    handleChange = (e) => {
        var extension = this.getFileExtensionRequired();
        var file = e.target.files[0];
        // file was not chosen
        if(!file || typeof extension !== 'string'){
            return;
        }else{
            var filename = file.name ? file.name : "unknown";
            // check extension
            if(!filename.endsWith(extension)){
                alert('File extension error! Please enter a file of type: ' + extension);
                return;
            }
            this.props.modifyNewContext(this.props.nestedField, filename, 'file upload', this.props.linkType, this.props.arrayIdx);
            // calling modifyFile changes the 'file' state of top level component
            this.modifyFile(file);
        }
    }

    /*
    Handle the async file upload which is coordinated by the file_manager held
    in this.props.upload. Call this.props.updateUpload on failure or completion.
    */
    handleAsyncUpload = (upload_manager) => {
        if(upload_manager === null){
            return;
        }
        upload_manager.on('httpUploadProgress',
            function(evt) {
                var percentage = Math.round((evt.loaded * 100) / evt.total);
                this.modifyRunningUploads(percentage, evt.total);
            }.bind(this))
            .send(function(err, data) {
                if(err){
                    this.modifyRunningUploads(null, null);
                    this.props.updateUpload(null, false, true);
                    alert("File upload failed!");
                }else{
                    this.modifyRunningUploads(null, null);
                    // this will finish roundTwo for the file
                    this.props.updateUpload(null, true);
                }
            }.bind(this));
    }

    /*
    Set state to reflect new upload percentage and size complete for the given upload
    */
    modifyRunningUploads = (percentage, size) => {
        this.setState({
            'percentDone': percentage,
            'sizeUploaded': size
        });
    }

    cancelUpload = (e) => {
        e.preventDefault();
        if(this.state.percentDone === null || this.props.upload === null){
            return;
        }
        this.props.upload.abort();
    }

    deleteField = (e) => {
        e.preventDefault();
        this.props.modifyNewContext(this.props.nestedField, null, 'file upload', this.props.linkType, this.props.arrayIdx);
        this.modifyFile(null);
    }

    render(){
        var statusTip = this.state.status;
        var showDelete = false;
        var filename_text = "No file chosen";
        if(this.props.value){
            if(this.state.newFile){
                if(this.props.md5Progress === null && this.props.upload === null){
                    showDelete = true;
                }
                filename_text = this.props.value;
            }else{
                statusTip = 'Previous file: ' + this.props.value;
            }
        }
        var disableFile = this.props.md5Progress !== null || this.props.upload !== null;
        return(
            <div>
                <div>
                    <input id={"field_for_" + this.props.field} type='file' onChange={this.handleChange} disabled={disableFile} style={{'display':'none'}} />
                    <Button disabled={disableFile} style={{'padding':'0px'}}>
                        <label children={filename_text} className="text-400" htmlFor={"field_for_" + this.props.field} style={{'paddingRight':'12px','paddingTop':'6px','paddingBottom':'6px','paddingLeft':'12px','marginBottom':'0px'}}/>
                    </Button>
                    <Fade in={showDelete}>
                        <div className="pull-right">
                            <Button tabIndex={2} bsStyle="danger" disabled={!showDelete} onClick={this.deleteField}><i className="icon icon-fw icon-times"/></Button>
                        </div>
                    </Fade>
                </div>
                {statusTip ?
                    <div style={{'color':'#a94442', 'paddingTop':'10px'}}>
                        {statusTip}
                    </div>
                    :
                    null
                }
                {this.props.md5Progress ?
                    <div style={{'paddingTop':'10px'}}>
                        <i className="icon icon-spin icon-circle-o-notch" style={{'opacity': '0.5' }}></i>
                        <span style={{'paddingLeft':'10px'}}>
                            {'Calculating MD5... ' + this.props.md5Progress + '%'}
                        </span>
                    </div>
                    :
                    null
                }
                {this.state.percentDone !== null ?
                    <div className="row" style={{'paddingTop':'10px'}}>
                        <div className="col-sm-3" style={{'float':'left'}}>
                            <a href="" style={{'color':'#a94442','paddingLeft':'10px'}} onClick={this.cancelUpload} title="Cancel">
                                {'Cancel upload'}
                            </a>
                        </div>
                        <div className="col-sm-9" style={{'float':'right'}}>
                            <div>
                                <div style={{'float':'left'}}>{this.state.percentDone + "% complete"}</div>
                                <div style={{'float':'right'}}>{"Total size: " + this.state.sizeUploaded}</div>
                            </div>
                            <ProgressBar percent={this.state.percentDone} strokeWidth="1" strokeColor="#388a92" />
                        </div>
                    </div>
                    :
                    null
                }
            </div>
        );
    }
}



/**
 * Accepts a 'value' prop (which should contain a colon, at minimum) and present two fields for modifying its two parts.
 *
 * First part is name of a "submits_for" lab, second part is any custom string identifier.
 * Present a drop-down for submit_for lab selection, and text input box for identifier.
 * On change of either inputs, calls 'onAliasChange' function callback, passing the new modified value (including colon) as parameter.
 */
export class AliasInputField extends React.Component {

    static getInitialSubmitsForLabName(submitter){
        var submits_for_list = (submitter && Array.isArray(submitter.submits_for) && submitter.submits_for.length > 0 && submitter.submits_for) || null;
        var primaryLab = submitter && submitter.lab;
        if (_.pluck(submits_for_list, 'uuid').indexOf(primaryLab.uuid) > -1) {
            return primaryLab.name;
        } else if (submits_for_list && submits_for_list.length >= 1){
            return submits_for_list[0].name;
        }
        return null;
    }

    static propTypes = {
        'value' : PropTypes.string.isRequired,
        'onAliasChange' : PropTypes.func.isRequired,
        'currentSubmittingUser' : PropTypes.shape({
            'submits_for' : PropTypes.arrayOf(PropTypes.shape({
                'name' : PropTypes.string,
                'display_title' : PropTypes.string
            }))
        }).isRequired,
        'errorMessage' : PropTypes.string // String or null
    }

    static defaultProps = {
        'value' : ':'
    }

    static splitInTwo(str){
        var parts = (str || ':').split(':');
        if (parts.length > 2){
            return [ parts[0], parts.slice(1).join(':') ];
        }
        return parts;
    }

    constructor(props){
        super(props); // Inherits this.onHide() function.
        this.onAliasSecondPartChange = this.onAliasSecondPartChange.bind(this);
        this.onAliasFirstPartChange = this.onAliasFirstPartChange.bind(this);
        this.onAliasFirstPartChangeTyped = this.onAliasFirstPartChangeTyped.bind(this);
    }

    getInitialSubmitsForPart(){
        return AliasInputField.getInitialSubmitsForLabName(this.props.currentSubmittingUser);
    }

    finalizeAliasPartsChange(aliasParts){
        // Also check to see if need to add first or second part, e.g. if original value passed in was '' or null.
        if (!aliasParts[0] || aliasParts[0] === '') {
            aliasParts[0] = this.getInitialSubmitsForPart();
        }
        if (aliasParts.length === 1){
            aliasParts[1] = '';
        }
        this.props.onAliasChange(aliasParts.join(':'));
    }

    onAliasFirstPartChangeTyped(evt){
        var newValue = evt.target.value || '';
        return this.onAliasFirstPartChange(newValue, evt);
    }

    onAliasFirstPartChange(evtKey, e){
        e.preventDefault();
        var firstPartOfAlias = evtKey;
        var aliasParts = AliasInputField.splitInTwo(this.props.value);
        aliasParts[0] = firstPartOfAlias;
        this.finalizeAliasPartsChange(aliasParts);
    }

    onAliasSecondPartChange(e){
        e.preventDefault();
        var secondPartOfAlias = e.target.value;
        var aliasParts = AliasInputField.splitInTwo(this.props.value);
        aliasParts[1] = secondPartOfAlias;
        this.finalizeAliasPartsChange(aliasParts);
    }

    render(){
        var { currentSubmittingUser, errorMessage, withinModal, value } = this.props;
        var parts = AliasInputField.splitInTwo(value),
            submits_for_list = (currentSubmittingUser && Array.isArray(currentSubmittingUser.submits_for) && currentSubmittingUser.submits_for.length > 0 && currentSubmittingUser.submits_for) || null,
            initialDefaultFirstPartValue = this.getInitialSubmitsForPart(),
            firstPartSelect;

        if (currentSubmittingUser && Array.isArray(currentSubmittingUser.groups) && currentSubmittingUser.groups.indexOf('admin') > -1){
            // Render an ordinary input box for admins (can specify any lab).
            firstPartSelect = (
                <FormControl id="aliasFirstPartInput" type="text" inputMode="latin"
                    value={(parts.length > 1 && parts[0]) || ''} placeholder={"Lab (default: " + initialDefaultFirstPartValue + ")"}
                    onChange={this.onAliasFirstPartChangeTyped} style={{ 'paddingRight' : 8, 'borderRight' : 'none' }} />
            );
        } else if (submits_for_list && submits_for_list.length === 1){
            firstPartSelect = <InputGroup.Addon className="alias-lab-single-option">{ initialDefaultFirstPartValue }</InputGroup.Addon>;
        } else if (submits_for_list && submits_for_list.length > 1){
            firstPartSelect = (
                <DropdownButton className="alias-lab-select form-control alias-first-part-input"
                    onSelect={this.onAliasFirstPartChange} componentClass={InputGroup.Button}
                    id="aliasFirstPartInput" title={(parts.length > 1 && (
                        <span className="text-400"><small className="pull-left">Lab: </small><span className="pull-right text-ellipsis-container" style={{ maxWidth : '80%' }}>{ ((parts[0] !== '' && parts[0]) || this.getInitialSubmitsForPart()) }</span></span>
                    )) || 'Select a Lab'} children={_.map(submits_for_list, (lab) =>
                        <MenuItem key={lab.name} eventKey={lab.name}><span className="text-500">{ lab.name }</span> ({ lab.display_title })</MenuItem>
                    )} />
            );
        }
        return (
            <FormGroup className="mb-0" validationState={this.props.errorMessage ? 'error' : null}>
                <InputGroup>
                    { firstPartSelect }
                    { firstPartSelect ? <InputGroup.Addon className="colon-separator">:</InputGroup.Addon> : null}
                    <FormControl
                        id="aliasInput"
                        type="text"
                        inputMode="latin"
                        value={parts[1] || ''}
                        autoFocus={this.props.withinModal && !parts[1] ? true : false}
                        placeholder="Type in a new identifier"
                        onChange={this.onAliasSecondPartChange}
                    />
                </InputGroup>
                <FormControl.Feedback />
            </FormGroup>
        );
    }

}



class InfoIcon extends React.Component{

    fieldTypeDescriptor(){
        if (typeof this.props.fieldType !== 'string' || this.props.fieldType.length === 0) return null;

        var type = Schemas.Term.capitalizeSentence(this.props.fieldType === 'array' ? ArrayField.typeOfItems(this.props.schema.items) : this.props.fieldType);
        if (this.props.fieldType === 'array'){
            type = type + ' <span class="array-indicator">[]</span>';
        }
        return type;

    }

    render() {
        if (!this.props.children || typeof this.props.children !== 'string') return null;
        var tip = this.props.children;
        if (typeof this.props.title === 'string' && this.props.title.length){
            tip = '<h5 class="mt-03 mb-05 text-600">' + this.props.title + '</h5>' + tip;
        }
        if (typeof this.props.fieldType === 'string' && this.props.fieldType.length){
            tip += '<h6 class="mt-07 text-300">Field Type: <span class="text-400">' + this.fieldTypeDescriptor() + '</span></h6>';
        }
        return (
            <i className="icon icon-info-circle" data-tip={tip} data-html/>
        );
    }
}



export function isValueNull(value){
    if (value === null) return true;
    if (typeof value === 'undefined') return true;
    if (typeof value === 'number') return false;
    if (value === '') return true;
    if (Array.isArray(value)){
        if (value.length === 0) return true;
        else if (_.every(value, isValueNull)) {
            return true;
        }
        else return false;
    }
    if (typeof value === 'object'){
        var keys = _.keys(value);
        if (keys.length === 0) return true;
        else if ( _.every(keys, function(k){ return isValueNull(value[k]); }) ) return true;
    }
    return false;
}
