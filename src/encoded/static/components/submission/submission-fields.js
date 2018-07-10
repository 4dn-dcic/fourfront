'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import * as globals from '../globals';
import _ from 'underscore';
import { ajax, console, object, isServerSide, animateScrollTo, Schemas } from '../util';
import { DropdownButton, Button, MenuItem, Panel, Table, Collapse, Fade, Checkbox, InputGroup, FormGroup, FormControl } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';

var ProgressBar = require('rc-progress').Line;

var makeTitle = object.itemUtil.title;

/*
Individual component for each type of field. Contains the appropriate input
if it is a simple number/text/enum, or generates a child component for
attachment, linked object, array, object, and file fields. Contains delete
logic for the field as well (deleting is done by setting value to null).
*/
export default class BuildField extends React.Component {

    /**
     * @param {{ 'type' : string }} fieldSchema - Schema definition for this property. Should be same as `app.state.schemas[CurrentItemType].properties[currentField]`.
     */
    static fieldTypeFromFieldSchema(fieldSchema){
        var fieldType = fieldSchema.type ? fieldSchema.type : "text";
        // transform some types...
        if(fieldType === 'string'){
            fieldType = 'text';
            if (typeof fieldSchema.formInput === 'string'){
                if (fieldSchema.formInput === 'textarea' || fieldSchema.formInput === 'html') return fieldSchema.formInput;
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

    displayField = (field_case) => {
        var { field, value, disabled, enumValues, currentSubmittingUser, roundTwo } = this.props;
        var inputProps = {
            'id' : 'field_for_' + field,
            'disabled' : disabled || false,
            'ref' : "inputElement",
            'value' : (typeof value === 'number' ? value || 0 : value || ''),
            'onChange' : this.handleChange,
            'name' : field,
            'placeholder': "No value",
            'data-field-type' : field_case
        };
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
                    <span style={{ 'verticalAlign' : 'middle', 'text-transform' : 'capitalize' }}>
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
            case 'linked object'    : return <LinkedObj {...this.props}/>;
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
        // hardcoded fields you can't delete
        var cannot_delete = ['filename'];
        var showDelete = false;
        var disableDelete = false;
        var extClass = '';
        // don't show delet button unless:
        // not in hardcoded cannot delete list AND is not an object or
        // non-empty array element (individual values get deleted)
        if(!_.contains(cannot_delete, this.props.field) && this.props.fieldType !== 'array'){
            showDelete = true;
        }

        // if there is no value in the field and non-array, hide delete button
        if(
            isValueNull(this.props.value) && !this.props.isArray
        ) {
            showDelete = false;
        }

        var wrapFunc = this.wrapWithLabel;

        var excludeRemoveButton = (this.props.fieldType === 'array' || this.props.fieldType === 'file upload'); // In case we render our own w/ dif functionality lower down.

        if (this.props.isArray) {
            // array items don't need fieldnames/tooltips
            wrapFunc = this.wrapWithNoLabel;

            if (this.props.isLastItemInArray && isValueNull(this.props.value)){
                showDelete = false;
                if (Array.isArray(this.props.arrayIdx) && this.props.arrayIdx[0] !== 0) extClass = "last-item-empty";
            } else if (this.props.fieldType === 'object') {
                // if we've got an object that's inside inside an array, only allow
                // the array to be deleted if ALL individual fields are null
                if (!isValueNull(this.props.value)){
                    disableDelete = true;
                }
                //var valueCopy = this.props.value ? JSON.parse(JSON.stringify(this.props.value)) : {};
                //var nullItems = _.filter( _.keys(valueCopy), isValueNull);
                //if( _.keys(valueCopy).length !== nullItems.length){
                //    showDelete = false;
                //}
            }
        }

        return wrapFunc(
            <div className={'field-column col-xs-' + (excludeRemoveButton ? "12": "10") + ' ' + extClass}>
                {this.displayField(this.props.fieldType)}
            </div>,
            excludeRemoveButton ? null : (
                <div className="col-xs-2 remove-button-column">
                    <Fade in={showDelete}>
                        <div className={"pull-right remove-button-container" + (!showDelete ? ' hidden' : '')}>
                            <Button tabIndex={2} bsStyle="danger" disabled={disableDelete} onClick={this.deleteField} data-tip={this.props.isArray ? 'Remove Item' : 'Clear Value'}><i className="icon icon-fw icon-times"/></Button>
                        </div>
                    </Fade>
                </div>
            )
        );
    }
}

/** Case for a linked object. */
class LinkedObj extends React.Component{

    constructor(props){
        super(props);
    }


    // mechanism for changing value of linked object in parent context
    // from int keyIdx to string path of newly submitted object
    componentDidMount(){
        if(this.props.keyComplete[this.props.value] && !isNaN(this.props.value)){
            this.props.modifyNewContext(this.props.nestedField, this.props.keyComplete[this.props.value], 'finished linked object', this.props.linkType, this.props.arrayIdx);
            ReactTooltip.rebuild();
        }
    }

    componentDidUpdate(){
        if(this.props.keyComplete[this.props.value] && !isNaN(this.props.value)){
            this.props.modifyNewContext(this.props.nestedField, this.props.keyComplete[this.props.value], 'finished linked object', this.props.linkType, this.props.arrayIdx);
            ReactTooltip.rebuild();
        }
    }

    render(){
        var objType = this.props.schema.linkTo;
        // object chosen or being created
        if(this.props.value){
            var keyDisplay = this.props.keyDisplay;
            var thisDisplay;
            if(isNaN(this.props.value)){
                thisDisplay = keyDisplay[this.props.value] || this.props.value;
                return(
                    <div className="submitted-linked-object-display-container">
                        <a href={this.props.value} target="_blank" className="inline-block" data-tip="This Item is already in the database">
                            <span>{thisDisplay}</span>
                        </a>
                        &nbsp;<i style={{'marginLeft':'5px', 'fontSize' : '0.85rem'}} className="icon icon-external-link"/>
                    </div>
                );
            }else{
                // it's a custom object. Either render a link to editing the object
                // or a pop-up link to the object if it's already submitted
                var intKey = parseInt(this.props.value);
                thisDisplay = keyDisplay[this.props.value] || this.props.value;
                // this is a fallback - shouldn't be int because value should be
                // string once the obj is successfully submitted
                if(this.props.keyComplete[intKey]){
                    return(
                        <div>
                            <a href="#" onClick={function(e){
                                e.preventDefault();
                                var win = window.open(this.props.keyComplete[intKey], '_blank');
                                if(win){
                                    win.focus();
                                }else{
                                    alert('Object page popup blocked!');
                                }
                            }.bind(this)}>
                                <span>{thisDisplay}</span>
                                <i style={{'paddingLeft':'4px'}} className={"icon icon-external-link"}></i>
                            </a>
                        </div>
                    );
                }else{
                    return(
                        <div className="incomplete-linked-object-display-container" data-tip="Continue editing/submitting">
                            <a href="#" onClick={function(e){
                                e.preventDefault();
                                this.props.setSubmissionState('currKey', intKey);
                            }.bind(this)}>
                                {thisDisplay}
                            </a>
                        </div>
                    );
                }
            }
        }
        // nothing chosen/created yet
        return(
            <div className="linked-object-buttons-container">
                <Button className="select-create-linked-item-button" onClick={function(e){
                    e.preventDefault();
                    this.props.selectObj(objType, this.props.nestedField, this.props.linkType, this.props.arrayIdx);
                }.bind(this)}>Select existing</Button>
                <Button className="select-create-linked-item-button" onClick={function(e){
                    e.preventDefault();
                    this.props.modifyNewContext(this.props.nestedField, null, 'new linked object', this.props.linkType, this.props.arrayIdx, objType);
                }.bind(this)}>Create new</Button>
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

    constructor(props){
        super(props);
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
        return(
            <div key={arrayIdx} className={"array-field-container " + (arrayIdx % 2 === 0 ? 'even' : 'odd')} data-field-type={fieldType}>
                <BuildField
                    value={value}
                    schema={fieldSchema}
                    fieldType={fieldType}
                    fieldTip={fieldTip}
                    title={title}
                    enumValues={enumValues}
                    disabled={false}
                    required={false}
                    arrayIdx={arrayIdxList}
                    isArray={true}
                    isLastItemInArray={allItems.length - 1 === index}
                    { ..._.pick(this.props, 'field', 'modifyNewContext', 'linkType', 'selectObj',
                        'nestedField', 'keyDisplay', 'keyComplete', 'setSubmissionState',
                        'updateUpload', 'upload', 'uploadStatus', 'md5Progress', 'currentSubmittingUser', 'roundTwo') }
                />
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

    initiateField = (fieldInfo) => {
        var field = fieldInfo[0];
        var fieldSchema = fieldInfo[1];
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
                value={fieldValue}
                key={field}
                schema={fieldSchema}
                field={field}
                fieldType={fieldType}
                fieldTip={fieldTip}
                enumValues={enumValues}
                disabled={false}
                modifyNewContext={this.props.modifyNewContext}
                required={false}
                linkType={this.props.linkType}
                selectObj={this.props.selectObj}
                title={title}
                nestedField={nestedField}
                isArray={false}
                arrayIdx={this.props.arrayIdx}
                keyDisplay={this.props.keyDisplay}
                keyComplete={this.props.keyComplete}
                setSubmissionState= {this.props.setSubmissionState}
                updateUpload={this.props.updateUpload}
                upload={this.props.upload}
                uploadStatus={this.props.uploadStatus}
                md5Progress={this.props.md5Progress}
            />
        );
    }

    render(){
        var schema = this.props.schema;
        var fields = schema['properties'] ? _.keys(schema['properties']) : [];
        var buildFields = [];
        for (var i=0; i<fields.length; i++){
            var fieldSchema = this.includeField(schema, fields[i]);
            if (fieldSchema){
                buildFields.push([fields[i], fieldSchema]);
            }
        }
        return(
            <div className="object-field-container">
                {buildFields.map((field) => this.initiateField(field))}
            </div>
        );
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
        var firstPartSelect = null;
        var parts = AliasInputField.splitInTwo(this.props.value);
        var submits_for_list = (this.props.currentSubmittingUser && Array.isArray(this.props.currentSubmittingUser.submits_for) && this.props.currentSubmittingUser.submits_for.length > 0 && this.props.currentSubmittingUser.submits_for) || null;
        if (submits_for_list && submits_for_list.length === 1){
            firstPartSelect = <InputGroup.Addon className="alias-lab-single-option">{ this.getInitialSubmitsForPart() }</InputGroup.Addon>;
        } else if (submits_for_list && submits_for_list.length > 1){
            firstPartSelect = (
                <DropdownButton
                    className="alias-lab-select form-control alias-first-part-input"
                    onSelect={this.onAliasFirstPartChange}
                    componentClass={InputGroup.Button}
                    id="aliasFirstPartInput"
                    title={(parts.length > 1 && (
                        <span className="text-400"><small className="pull-left">Lab: </small><span className="pull-right text-ellipsis-container" style={{ maxWidth : '80%' }}>{ ((parts[0] !== '' && parts[0]) || this.getInitialSubmitsForPart()) }</span></span>
                    )) || 'Select a Lab'}
                >
                    { _.map(submits_for_list, function(lab){
                        return <MenuItem key={lab.name} eventKey={lab.name}><span className="text-500">{ lab.name }</span> ({ lab.display_title })</MenuItem>;
                    }) }
                </DropdownButton>
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
