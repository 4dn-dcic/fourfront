'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { DropdownButton, Button, MenuItem, Panel, Table, Collapse, Fade, Checkbox, InputGroup, FormGroup, FormControl } from 'react-bootstrap';
import { ajax, console, object, Schemas } from './../../util';
import Alerts from './../../alerts';
import { BasicStaticSectionBody } from './../../static-pages/components/BasicStaticSectionBody';
import { Line as ProgressBar } from 'rc-progress';
import { LinkToSelector } from './LinkToSelector';


/**
 * Individual component for each type of field. Contains the appropriate input
 * if it is a simple number/text/enum, or generates a child component for
 * attachment, linked object, array, object, and file fields. Contains delete
 * logic for the field as well (deleting is done by setting value to null).
 *
 * @todo Possibly rename both this class and the containing file to be `SubmissionViewField` or `SubmissionField`.
 */
export class BuildField extends React.PureComponent {

    /**
     * Gets the (interal) field type from a schema for a field.
     * Possible return values include 'attachment', 'linked object', 'enum', 'text', 'html', 'code', 'boolean', 'number', 'integer', etc.
     *
     * @todo Handle date formats, other things, etc.
     *
     * @param {{ 'type' : string }} fieldSchema - Schema definition for this property. Should be same as `app.state.schemas[CurrentItemType].properties[currentField]`.
     * @returns {string} Type of field that will be created, according to schema.
     */
    static fieldTypeFromFieldSchema(fieldSchema){
        let fieldType = fieldSchema.type ? fieldSchema.type : "text";
        // transform some types...
        if (fieldType === 'string'){
            fieldType = 'text';
            if (typeof fieldSchema.formInput === 'string'){
                if (['textarea', 'html', 'code'].indexOf(fieldSchema.formInput) > -1) return fieldSchema.formInput;
            }
        }
        // check if this is an enum
        if (fieldSchema.enum || fieldSchema.suggested_enum){
            fieldType = 'enum';
        }
        // handle a linkTo object on the the top level
        if (fieldSchema.linkTo){
            fieldType = 'linked object';
        } else if (fieldSchema.attachment && fieldSchema.attachment === true){
            fieldType = 'attachment';
        }
        return fieldType;
    }

    constructor(props){
        super(props);
        _.bindAll(this,
            'displayField', 'handleDropdownButtonToggle', 'handleAliasChange',
            'buildEnumEntry', 'submitEnumVal', 'handleChange', 'handleAliasChange', 'deleteField', 'pushArrayValue',
            'commonRowProps', 'labelTypeDescriptor', 'wrapWithLabel', 'wrapWithNoLabel'
        );
        this.state = {
            'dropdownOpen' : false
        };

        this.inputElementRef = React.createRef();
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    handleDropdownButtonToggle(isOpen, evt){
        this.setState(function({ dropdownOpen }){
            if (isOpen === dropdownOpen) return null;
            return { 'dropdownOpen' : isOpen };
        });
    }

    /**
     * Renders out an input field (or more fields of itself via more advanced input field component, e.g. for arrays).
     *
     * @param {string} [fieldType=this.props.fieldType] Type of input field to render, if different from `props.fieldType`.
     * @returns {JSX.Element} A JSX `<input>` element, a Bootstrap input element component, or custom React component which will render input fields.
     */
    displayField(fieldType){
        const { field, value, disabled, enumValues, currentSubmittingUser, roundTwo, currType, currContext, fieldType : propFieldType } = this.props;
        fieldType = fieldType || propFieldType;
        const inputProps = {
            'key'       :        field,
            'id'                : 'field_for_' + field,
            'disabled'          : disabled || false,
            'ref'               : this.inputElementRef,
            'value'             : (typeof value === 'number' ? value || 0 : value || ''),
            'onChange'          : this.handleChange,
            'name'              : field,
            'placeholder'       : "No value",
            'data-field-type'   : fieldType
        };

        // Unique per-type overrides

        if (currType === 'StaticSection' && field === 'body'){
            // Static section preview
            const filetype = currContext && currContext.options && currContext.options.filetype;
            if (filetype === 'md' || filetype === 'html'){
                return <PreviewField {...this.props} filetype={filetype} onChange={this.handleChange} />;
            }
        }

        // Common field types
        switch(fieldType){
            case 'text' :
                if (field === 'aliases'){
                    return (
                        <div className="input-wrapper">
                            <AliasInputField {...inputProps} onAliasChange={this.handleAliasChange} currentSubmittingUser={currentSubmittingUser} />
                        </div>
                    );
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
                <span className="input-wrapper" style={{ 'display':'inline' }}>
                    <DropdownButton title={value || <span className="text-300">No value</span>} onToggle={this.handleDropdownButtonToggle}>
                        {_.map(enumValues, (val) => this.buildEnumEntry(val))}
                    </DropdownButton>
                </span>
            );
            case 'linked object'    : return <LinkedObj key="linked-item" {...this.props}/>;
            case 'array'            : return <ArrayField {...this.props} pushArrayValue={this.pushArrayValue} value={value || null} roundTwo={roundTwo} />;
            case 'object'           : return <div style={{ 'display':'inline' }}><ObjectField {...this.props}/></div>;
            case 'attachment'       : return <div style={{ 'display':'inline' }}><AttachmentInput {...this.props}/></div>;
            case 'file upload'      : return <S3FileInput {...this.props} />;
        }
        // Fallback
        return <div>No field for this case yet.</div>;
    }

    // create a dropdown item corresponding to one enum value
    buildEnumEntry(val){
        return (
            <MenuItem key={val} title={val || ''} eventKey={val} onSelect={this.submitEnumVal}>
                {val || ''}
            </MenuItem>
        );
    }

    submitEnumVal(eventKey){
        const { modifyNewContext, nestedField, fieldType, linkType, arrayIdx } = this.props;
        modifyNewContext(nestedField, eventKey, fieldType, linkType, arrayIdx);
    }

    handleChange(e){
        const { fieldType, modifyNewContext, nestedField, linkType, arrayIdx } = this.props;
        const inputElement = e && e.target ? e.target : this.inputElementRef.current;
        let currValue = inputElement.value;
        if (fieldType === 'boolean'){
            currValue = inputElement.checked;
        } else if (fieldType === 'integer'){
            currValue = parseInt(currValue);
            if (isNaN(currValue)){
                currValue = null;
            }
        } else if (fieldType === 'number'){
            currValue = parseFloat(currValue);
            if (isNaN(currValue)){
                currValue = null;
            }
        }
        //console.log('VAL', this.props.nestedField, currValue, this.props.fieldType, this.props.value, this.props.arrayIdx);
        modifyNewContext(nestedField, currValue, fieldType, linkType, arrayIdx);
    }

    handleAliasChange(currValue){
        const { fieldType, modifyNewContext, nestedField, linkType, arrayIdx } = this.props;
        modifyNewContext(nestedField, currValue, fieldType, linkType, arrayIdx);
    }

    // call modifyNewContext from parent to delete the value in the field
    deleteField(e){
        const { fieldType, modifyNewContext, nestedField, linkType, arrayIdx } = this.props;
        e.preventDefault();
        modifyNewContext(nestedField, null, fieldType, linkType, arrayIdx);
    }

    // this needs to live in BuildField for styling purposes
    pushArrayValue(e){
        const { fieldType, value, schema, modifyNewContext, nestedField, linkType, arrayIdx } = this.props;
        e && e.preventDefault();
        if (fieldType !== 'array') {
            return;
        }
        const valueCopy = value ? value.slice() : [];
        if (schema.items && schema.items.type === 'object'){
            // initialize with empty obj in only this case
            valueCopy.push({});
        }else{
            valueCopy.push(null);
        }
        modifyNewContext(nestedField, valueCopy, fieldType, linkType, arrayIdx);
    }

    /**
     * Returns an object representing `props` which would be common to any type of input field
     * element which this component renders.
     *
     * @returns {{ 'className': string, 'data-field-type': string, 'data-field-name': string, 'style': Object.<string|number> }} Object of props and values.
     */
    commonRowProps(){
        const { isArray, fieldType, field } = this.props;
        const { dropdownOpen } = this.state;
        return {
            'className' : (
                "field-row" +
                (dropdownOpen ? ' active-submission-row' : '') +
                (isArray ? ' in-array-field clearfix row'  : '')
            ),
            'data-field-type' : fieldType,
            'data-field-name' : field,
            'style' : { 'overflow' : 'visible' }
        };
    }

    /**
     * Returns a `<div>` JSX element with 'Required' label/text, if `props.required` is true or truthy.
     */
    labelTypeDescriptor(){
        const { required } = this.props;
        return <div className="field-descriptor">{ required ? <span style={{ 'color':'#a94442' }}> Required</span> : null }</div>;
    }

    /** @ignore */
    wrapWithLabel(){
        var { fieldTip, title, fieldType, schema } = this.props;
        return(
            <div {...this.commonRowProps()}>
                <div className="row">
                    <div className="col-sm-12 col-md-4">
                        <h5 className="submission-field-title text-ellipsis-container">
                            { this.labelTypeDescriptor() }
                            { fieldTip ?
                                <InfoIcon className="mr-07" title={title} fieldType={fieldType} schema={schema}>{ fieldTip }</InfoIcon>
                                : null}
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

    /** @ignore */
    wrapWithNoLabel(){
        return <div {...this.commonRowProps()}>{ Array.prototype.slice.call(arguments) }</div>;
    }

    /**
     * Renders out input for this field. Performs this recursively (through adding own component down in render tree)
     * if necessary re: data structure.
     *
     * @todo Come up with a schema based solution for code below?
     * @private
     * @returns {JSX.Element} Appropriate element/markup for this field.
     */
    render(){
        const { value, isArray, field, fieldType, arrayIdx, isLastItemInArray } = this.props;
        const cannot_delete       = ['filename']; // hardcoded fields you can't delete
        let showDelete          = false;
        let disableDelete       = false;
        let extClass            = '';

        // Don't show delete button unless:
        // not in hardcoded cannot delete list AND is not an object or
        // non-empty array element (individual values get deleted)
        if(!_.contains(cannot_delete, field) && fieldType !== 'array'){
            showDelete = true;
        }

        // if there is no value in the field and non-array, hide delete button
        if (isValueNull(value) && !isArray) {
            showDelete = false;
        }

        let wrapFunc = this.wrapWithLabel;
        const excludeRemoveButton = (fieldType === 'array' || fieldType === 'file upload'); // In case we render our own w/ dif functionality lower down.
        const fieldToDisplay = this.displayField(fieldType);  // The rendered field.

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
            <React.Fragment>
                <div className={'field-column col-xs-' + (excludeRemoveButton ? "12": "10") + extClass}>{ fieldToDisplay }</div>
                { excludeRemoveButton ? null : <SquareButton show={showDelete} disabled={disableDelete} tip={isArray ? 'Remove Item' : 'Clear Value'} onClick={this.deleteField} /> }
            </React.Fragment>
        );
    }
}



const SquareButton = React.memo(function SquareButton(props){
    const { show, disabled, onClick, tip, bsStyle, buttonContainerClassName, icon, style } = props;
    return (
        <div className="col-xs-2 remove-button-column" style={style}>
            <Fade in={show}>
                <div className={"pull-right remove-button-container" + (!show ? ' hidden' : '') + (buttonContainerClassName ? ' ' + buttonContainerClassName : '')}>
                    <Button tabIndex={2} bsStyle={bsStyle} disabled={disabled} onClick={onClick} data-tip={tip}><i className={"icon icon-fw icon-" + icon}/></Button>
                </div>
            </Fade>
        </div>
    );
});
SquareButton.defaultProps = {
    'bsStyle' : 'danger',
    'icon' : 'times',
    'style' : null
};



//var linkedObjChildWindow = null; // Global var

/** Case for a linked object. */
class LinkedObj extends React.PureComponent {

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
        this.handleStartSelectItem = this.handleStartSelectItem.bind(this);
        this.handleFinishSelectItem = this.handleFinishSelectItem.bind(this);
        this.handleCreateNewItemClick = this.handleCreateNewItemClick.bind(this);
        this.handleTextInputChange = this.handleTextInputChange.bind(this);
        this.handleAcceptTypedID = this.handleAcceptTypedID.bind(this);

        this.state = {
            'textInputValue' : (typeof props.value === 'string' && props.value) || ''
        };
    }

    componentDidMount(){
        this.updateContext();
    }

    componentDidUpdate(pastProps){
        this.updateContext();
        ReactTooltip.rebuild();
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


    setSubmissionStateToLinkedToItem(e){
        e.preventDefault();
        e.stopPropagation();
        var intKey = parseInt(this.props.value);
        if (isNaN(intKey)) throw new Error('Expected an integer for props.value, received', this.props.value);
        this.props.setSubmissionState('currKey', intKey);
    }

    isInSelectionField(props = this.props){ return LinkedObj.isInSelectionField(props); }

    handleStartSelectItem(e){
        e.preventDefault();
        if (!window) return;

        const { schema, nestedField, currType, linkType, arrayIdx, selectObj, selectCancel } = this.props;
        const itemType = schema.linkTo;

        selectObj(itemType, nestedField, arrayIdx);
    }

    /**
     * Handles drop event for the (temporarily-existing-while-dragging-over) window drop receiver element.
     * Grabs @ID of Item from evt.dataTransfer, attempting to grab from 'text/4dn-item-id', 'text/4dn-item-json', or 'text/plain'.
     * @see Notes and inline comments for handleChildFourFrontSelectionClick re isValidAtId.
     */
    handleFinishSelectItem(atId, itemContext){
        const { selectComplete } = this.props;
        const isValidAtId     = object.isValidAtIDFormat(atId);
        const invalidTitle    = "Invalid Item Selected";

        if (!atId || !isValidAtId) {
            Alerts.queue({
                'title' : invalidTitle,
                'message': "You have dragged & dropped an item or link which doesn't have a valid 4DN ID or URL associated with it. Please try again.",
                'style': 'danger'
            });
            throw new Error('No valid @id available.');
        } else {
            Alerts.deQueue({ 'title' : invalidTitle });
        }

        selectComplete(atId);
    }

    handleCreateNewItemClick(e){
        e.preventDefault();
        const { fieldBeingSelected, selectCancel, modifyNewContext, nestedField, linkType, arrayIdx, schema } = this.props;
        if (fieldBeingSelected !== null) selectCancel();
        modifyNewContext(nestedField, null, 'new linked object', linkType, arrayIdx, schema.linkTo);
    }

    handleAcceptTypedID(evt){
        console.log(evt);
        if (!this || !this.state || !this.state.textInputValue){
            throw new Error('Invalid @id format.');
        }
        this.props.selectComplete(this.state.textInputValue);
    }

    handleTextInputChange(evt){
        this.setState({ 'textInputValue' : evt.target.value });
    }

    renderSelectInputField(){
        var { value, selectCancel, selectComplete, schema, currType, nestedField } = this.props,
            textInputValue              = this.state.textInputValue,
            canShowAcceptTypedInput     = typeof textInputValue === 'string' && textInputValue.length > 3,
            extClass                    = !canShowAcceptTypedInput && textInputValue ? ' has-error' : '',
            itemType                    = schema.linkTo,
            prettyTitle                 = schema && ((schema.parentSchema && schema.parentSchema.title) || schema.title),
            dropMessage                 = "Drop " + (itemType || "Item") + " for field '" + (prettyTitle || nestedField) +  "'",
            searchURL                   = '/search/?currentAction=selection&type=' + itemType,
            childWindowAlert            = function(){
                // We have this inside a function instead of passing JSX element(s) because
                // as JSX elements they might gain non-serializable properties when being passed down thru props.
                return {
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
                };
            };

        // check if we have any schema flags that will affect the searchUrl
        if (schema.ff_flag && schema.ff_flag.startsWith('filter:')) {
            // the field to facet on could be set dynamically
            if (schema.ff_flag == "filter:valid_item_types"){
                searchURL += '&valid_item_types=' + currType;
            }
        }

        return (
            <React.Fragment>
                <div className="linked-object-text-input-container row flexrow">
                    <div className="field-column col-xs-10">
                        <input onChange={this.handleTextInputChange} className={"form-control" + extClass} inputMode="latin" type="text" placeholder="Drag & drop Item from the search view or type in a valid @ID." value={this.state.textInputValue} onDrop={this.handleDrop} />
                    </div>
                    { canShowAcceptTypedInput ?
                        <SquareButton show onClick={this.handleAcceptTypedID} icon="check"
                            bsStyle="success" tip="Accept typed identifier and look it up in database." />
                        : null }
                    <SquareButton show onClick={selectCancel} tip="Cancel selection" style={{ 'marginRight' : 9 }} />
                </div>
                <LinkToSelector isSelecting onSelect={this.handleFinishSelectItem} onCloseChildWindow={selectCancel}
                    childWindowAlert={childWindowAlert} dropMessage={dropMessage} searchURL={searchURL} />
            </React.Fragment>
        );
    }

    renderEmptyField(){
        return (
            <div className="linked-object-buttons-container">
                <Button className="select-create-linked-item-button" onClick={this.handleStartSelectItem}>
                    <i className="icon icon-fw icon-search"/> Select existing
                </Button>
                <Button className="select-create-linked-item-button" onClick={this.handleCreateNewItemClick}>
                    <i className="icon icon-fw icon-file-o"/> Create new
                </Button>
            </div>
        );
    }

    render(){
        const { value, keyDisplay, keyComplete } = this.props;
        const isSelecting = this.isInSelectionField();

        if (isSelecting){
            return this.renderSelectInputField();
        }

        // object chosen or being created
        if (value){
            var thisDisplay = keyDisplay[value] || value;
            if (isNaN(value)) {
                return(
                    <div className="submitted-linked-object-display-container text-ellipsis-container">
                        <i className="icon icon-fw icon-database" />&nbsp;&nbsp;
                        <a href={value} target="_blank" data-tip={"This Item, '" + thisDisplay + "' is already in the database"}>{ thisDisplay }</a>
                        &nbsp;<i style={{ 'fontSize' : '0.85rem' }} className="icon icon-fw icon-external-link ml-05"/>
                    </div>
                );
            } else {
                // it's a custom object. Either render a link to editing the object
                // or a pop-up link to the object if it's already submitted
                var intKey = parseInt(value);
                // this is a fallback - shouldn't be int because value should be
                // string once the obj is successfully submitted
                if (keyComplete[intKey]){
                    return(
                        <div>
                            <a href={keyComplete[intKey]} target="_blank" children>{ thisDisplay }</a>
                            <i className="icon icon-fw icon-external-link ml-05"/>
                        </div>
                    );
                } else {
                    return(
                        <div className="incomplete-linked-object-display-container text-ellipsis-container">
                            <i className="icon icon-fw icon-sticky-note-o" />&nbsp;&nbsp;
                            <a href="#" onClick={this.setSubmissionStateToLinkedToItem} data-tip="Continue editing/submitting">{ thisDisplay }</a>
                            &nbsp;<i style={{ 'fontSize' : '0.85rem' }} className="icon icon-fw icon-pencil ml-05"/>
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


const PreviewField = React.memo(function PreviewField(props){
    const { value, filetype, field, onChange } = props;
    const preview = value && (
        <React.Fragment>
            <h6 className="mt-1 text-600">Preview:</h6>
            <hr className="mb-1 mt-05" />
            <BasicStaticSectionBody content={value || ''} filetype={filetype} />
        </React.Fragment>
    );
    return (
        <div className="preview-field-container">
            <FormControl onChange={onChange} id={"field_for_" + field} name={field} value={value} type="text" inputMode="latin" componentClass="textarea" rows={8}
                wrap="off" style={{ 'fontFamily' : "Source Code Pro, monospace", 'fontSize' : 'small' }} />
            { preview }
        </div>
    );
});


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

    constructor(props){
        super(props);
        _.bindAll(this, 'initiateArrayField', 'generateAddButton');
    }

    /**
     * If empty array, add initial 'null' element. On Mount & Update.
     */
    componentDidMount(){
        const { value, field, pushArrayValue } = this.props;
        if (ArrayField.shouldPushArrayValue(value, field)){
            pushArrayValue();
        }
    }

    componentDidUpdate(prevProps, prevState){ // We can't do a comparison of props.value here because parent property mutates yet stays part of same obj.
        const { value, field, pushArrayValue, modifyNewContext, nestedField, schema, linkType } = this.props;
        if (ArrayField.shouldPushArrayValue(value, field)){
            pushArrayValue();
        } else {
            if (Array.isArray(value) && value.length >= 2){
                if (isValueNull(value[value.length - 1]) && isValueNull(value[value.length - 2])){
                    modifyNewContext(nestedField, null, ArrayField.typeOfItems(schema.items || {}), linkType, [value.length - 2]);
                }
            }
        }
    }

    initiateArrayField(arrayInfo, index, allItems){
        const { arrayIdx : propArrayIdx, schema } = this.props;
        // use arrayIdx as stand-in value for field
        const [ inArrValue, fieldSchema, arrayIdx ] = arrayInfo;
        const value = inArrValue || null;

        let fieldTip = fieldSchema.description || null;
        if (fieldSchema.comment){
            fieldTip = fieldTip ? fieldTip + ' ' + fieldSchema.comment : fieldSchema.comment;
        }
        const title = fieldSchema.title || 'Item';
        const fieldType = ArrayField.typeOfItems(fieldSchema);
        const enumValues = fieldSchema.enum ? (fieldSchema.enum || []) : []; // check if this is an enum

        let arrayIdxList;
        if (propArrayIdx){
            arrayIdxList = propArrayIdx.slice();
        }else{
            arrayIdxList = [];
        }
        arrayIdxList.push(arrayIdx);
        const childFieldSchema = _.extend({}, fieldSchema, { 'parentSchema' : schema });
        return(
            <div key={arrayIdx} className={"array-field-container " + (arrayIdx % 2 === 0 ? 'even' : 'odd')} data-field-type={fieldType}>
                <BuildField
                    {...{ value, fieldTip, fieldType, title, enumValues }}
                    { ..._.pick(this.props, 'field', 'modifyNewContext', 'linkType', 'selectObj', 'selectComplete', 'selectCancel',
                        'nestedField', 'keyDisplay', 'keyComplete', 'setSubmissionState', 'fieldBeingSelected', 'fieldBeingSelectedArrayIdx',
                        'updateUpload', 'upload', 'uploadStatus', 'md5Progress', 'currentSubmittingUser', 'roundTwo', 'currType' ) }
                    isArray={true} isLastItemInArray={allItems.length - 1 === index} arrayIdx={arrayIdxList}
                    schema={childFieldSchema} disabled={false} required={false} key={arrayIdx} />
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
        const { schema : propSchema, value : propValue } = this.props;
        const schema = propSchema.items || {};
        const values = propValue || [];
        const valuesToRender = _.map( values.length === 0 ? [null] : values , function(v,i){ return [v, schema, i]; });
        const showAddButton = !isValueNull(values[valuesToRender.length - 1]);

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
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

    /*
    Handle file selection. Store the file in SubmissionView state and change
    the filename context using modifyNewContext
    */
    handleChange = (e) => {
        var { modifyNewContext, nestedField, linkType, arrayIdx, currContext } = this.props,
            file = e.target.files[0];

        if (!file) return; // No file was chosen.

        var filename = file.name ? file.name : "unknown";

        // check Extensions
        var fileFormat = currContext.file_format;
        if(!fileFormat.startsWith('/')){
            fileFormat = '/' + fileFormat;
        }
        var extensions = [];
        ajax.promise(fileFormat + '?frame=object').then(response => {
            if (response['file_format'] && response['@id']){
                extensions = response.standard_file_extension ? [response.standard_file_extension] : [];
                if(response.other_allowed_extensions){
                    extensions = extensions.concat(response.other_allowed_extensions);
                }
                // Fail if "other" extension is not used and a valid extension is not provided
                if (extensions.indexOf("other") === -1 && !_.any(extensions, function(ext){return filename.endsWith(ext);})){
                    alert('File extension error! Please enter a file with one of the following extensions: ' + extensions.join(', '));
                    return;
                }

                modifyNewContext(nestedField, filename, 'file upload', linkType, arrayIdx);
                // calling modifyFile changes the 'file' state of top level component
                this.modifyFile(file);
            }else{
                alert('Internal file extension conflict.');
                return;
            }
        });
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

    static emailToString(email){
        return email.replace('@', "_at_");
    }

    static getInitialSubmitsForFirstPart(submitter){
        const submits_for_list = (submitter && Array.isArray(submitter.submits_for) && submitter.submits_for.length > 0 && submitter.submits_for) || null;
        const primaryLab = (submitter && submitter.lab) || null;
        const primaryLabID = primaryLab && object.itemUtil.atId(primaryLab);

        if (!submits_for_list){ // Fallback to using submitter ID.
            return AliasInputField.emailToString(submitter.email);
        }

        if (primaryLabID && primaryLab.name && _.map(submits_for_list, object.itemUtil.atId).indexOf(primaryLabID) > -1) {
            return primaryLab.name;
        } else {
            return submits_for_list[0].name;
        }
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
    };

    static defaultProps = {
        'value' : ':'
    };

    static splitInTwo(str){
        var parts = (str || ':').split(':');
        if (parts.length > 2){
            return [ parts[0], parts.slice(1).join(':') ];
        }
        return parts;
    }

    constructor(props){
        super(props);
        _.bindAll(this, 'onAliasSecondPartChange', 'onAliasFirstPartChange', 'onAliasFirstPartChangeTyped',
            'getInitialSubmitsForPart', 'finalizeAliasPartsChange'
        );
    }

    getInitialSubmitsForPart(){
        const { currentSubmittingUser } = this.props;
        return AliasInputField.getInitialSubmitsForFirstPart(currentSubmittingUser);
    }

    finalizeAliasPartsChange(aliasParts){
        const { onAliasChange } = this.props;
        // Also check to see if need to add first or second part, e.g. if original value passed in was '' or null.
        if (!aliasParts[0] || aliasParts[0] === '') {
            aliasParts[0] = this.getInitialSubmitsForPart();
        }
        if (aliasParts.length === 1){
            aliasParts[1] = '';
        }
        onAliasChange(aliasParts.join(':'));
    }

    onAliasFirstPartChangeTyped(evt){
        var newValue = evt.target.value || '';
        return this.onAliasFirstPartChange(newValue, evt);
    }

    onAliasFirstPartChange(evtKey, e){
        const { value } = this.props;
        e.preventDefault();
        const firstPartOfAlias = evtKey;
        const aliasParts = AliasInputField.splitInTwo(value);
        aliasParts[0] = firstPartOfAlias;
        this.finalizeAliasPartsChange(aliasParts);
    }

    onAliasSecondPartChange(e){
        const { value } = this.props;
        e.preventDefault();
        const secondPartOfAlias = e.target.value;
        const aliasParts = AliasInputField.splitInTwo(value);
        aliasParts[1] = secondPartOfAlias;
        this.finalizeAliasPartsChange(aliasParts);
    }

    render(){
        const { currentSubmittingUser, errorMessage, withinModal, value } = this.props;
        const parts = AliasInputField.splitInTwo(value);
        const submits_for_list = (currentSubmittingUser && Array.isArray(currentSubmittingUser.submits_for) && currentSubmittingUser.submits_for.length > 0 && currentSubmittingUser.submits_for) || null;
        const initialDefaultFirstPartValue = this.getInitialSubmitsForPart();
        const currFirstPartValue = (parts.length > 1 && parts[0]) || initialDefaultFirstPartValue;
        // const userEmailAsPrefix = AliasInputField.emailToString(currentSubmittingUser.email); // TODO - maybe have as dropdown option
        let firstPartSelect;

        if (currentSubmittingUser && Array.isArray(currentSubmittingUser.groups) && currentSubmittingUser.groups.indexOf('admin') > -1){
            // Render an ordinary input box for admins (can specify any lab).
            firstPartSelect = (
                <FormControl type="text" inputMode="latin" id="firstPartSelect" // Todo append index to id if in array
                    value={currFirstPartValue || ''} placeholder={"Lab (default: " + initialDefaultFirstPartValue + ")"}
                    onChange={this.onAliasFirstPartChangeTyped} style={{ 'paddingRight' : 8, 'borderRight' : 'none' }} />
            );
        } else if (submits_for_list && submits_for_list.length > 1){
            firstPartSelect = (
                <DropdownButton className="alias-lab-select form-control alias-first-part-input" id="firstPartSelect"
                    onSelect={this.onAliasFirstPartChange} componentClass={InputGroup.Button}
                    title={(parts.length > 1 && (
                        <span className="text-400">
                            <small className="pull-left">Lab: </small>
                            <span className="pull-right text-ellipsis-container" style={{ maxWidth : '80%' }}>
                                { ((parts[0] !== '' && parts[0]) || this.getInitialSubmitsForPart()) }
                            </span>
                        </span>
                    )) || 'Select a Lab'}>
                    {_.map(submits_for_list, (lab) =>
                        <MenuItem key={lab.name} eventKey={lab.name}><span className="text-500">{ lab.name }</span> ({ lab.display_title })</MenuItem>
                    )}
                </DropdownButton>
            );
        } else { // Only 1 submits_for lab or 0 submits_for -- fallback to staticy thingy
            firstPartSelect = <InputGroup.Addon className="alias-lab-single-option">{ currFirstPartValue }</InputGroup.Addon>;
        }
        return (
            <FormGroup className="mb-0" validationState={errorMessage ? 'error' : null}>
                <InputGroup>
                    { firstPartSelect }
                    { firstPartSelect ? <InputGroup.Addon className="colon-separator">:</InputGroup.Addon> : null}
                    <FormControl
                        id="aliasInput"
                        type="text"
                        inputMode="latin"
                        value={parts[1] || ''}
                        autoFocus={withinModal && !parts[1] ? true : false}
                        placeholder="Type in a new identifier"
                        onChange={this.onAliasSecondPartChange}
                    />
                </InputGroup>
                <FormControl.Feedback />
            </FormGroup>
        );
    }

}



class InfoIcon extends React.PureComponent {

    fieldTypeDescriptor(){
        const { fieldType, schema } = this.props;
        if (typeof fieldType !== 'string' || fieldType.length === 0) return null;

        let type = Schemas.Term.capitalizeSentence(fieldType === 'array' ? ArrayField.typeOfItems(schema.items) : fieldType);
        if (fieldType === 'array'){
            type = type + ' <span class="array-indicator">[]</span>';
        }
        return type;

    }

    render() {
        const { children, title, fieldType, className } = this.props;
        if (!children || typeof children !== 'string') return null;
        let tip = children;
        if (typeof title === 'string' && title.length > 0){
            tip = '<h5 class="mt-03 mb-05 text-600">' + title + '</h5>' + tip;
        }
        if (typeof fieldType === 'string' && fieldType.length > 0){
            tip += '<h6 class="mt-07 text-300">Field Type: <span class="text-400">' + this.fieldTypeDescriptor() + '</span></h6>';
        }
        return (
            <i className={"icon icon-info-circle" + (className? ' ' + className : '')} data-tip={tip} data-html/>
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
