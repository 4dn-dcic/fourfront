'use strict';
var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide } = require('./util');
var {getS3UploadUrl, s3UploadFile} = require('./util/aws');
var { DropdownButton, Button, MenuItem, Panel, Table} = require('react-bootstrap');
var makeTitle = require('./item-pages/item').title;
var Alerts = require('./alerts');
var d3 = require('d3');
var store = require('../store');
var getLargeMD5 = require('./util/file-utility').getLargeMD5;

/*
This is a key/input pair for any one field. Made to be stateless; changes
 to the newContext state of Action propogate downwards. Also includes a
 description and some validation message based on the schema
 */
var BuildField = module.exports.BuildField = React.createClass({
    // display a limited message including if the field is required and its type
    displayMessage: function(field_case){
        if(this.props.required){
            return(
                <div className="display-message">
                    <span className="display-bold">Required field. </span>
                    <span>{'Type: ' + field_case}</span>
                </div>
            );
        }else{
            return(
                <div className="display-message">
                    <span>{'Type: ' + field_case}</span>
                </div>
            );
        }
    },

    displayField: function(field_case){
        var inputProps = {
            'id' : this.props.label,
            'disabled' : this.props.disabled || false,
            'ref' : "inputElement",
            'value' : this.props.value || '',
            'onChange' : this.handleChange,
            'name' : this.props.label,
            'autoFocus': true,
            'placeholder': "No value"
        };

        switch(field_case){
            case 'text' : return (
                <div className="input-wrapper">
                    <input type="text" inputMode="latin" {...inputProps} />
                </div>
            );
            case 'integer' : return (
                <div className="input-wrapper">
                    <input id="intNumber" type="number" inputMode="latin" {...inputProps} />
                </div>
            );
            case 'number' : return (
                <div className="input-wrapper">
                    <input id="floatNumber" type="number" inputMode="latin" {...inputProps} />
                </div>
            );
            case 'enum' : return (
                <span className="input-wrapper">
                    <DropdownButton id="dropdown-size-extra-small" title={this.props.value || "No value"}>
                        {this.props.enumValues.map((val) => this.buildEnumEntry(val))}
                    </DropdownButton>
                </span>
            );
            case 'linked object' : return (
                    <LinkedObj field={this.props.label} value={inputProps.value} collection={this.props.schema.linkTo} modifyNewContext={this.props.modifyNewContext} getFieldValue={this.props.getFieldValue}/>
            );
            case 'array' : return (
                <ArrayField field={this.props.label} value={this.props.value} schema={this.props.schema} modifyNewContext={this.props.modifyNewContext} getFieldValue={this.props.getFieldValue}/>
            );
            case 'object' : return (
                <ObjectField field={this.props.label} value={this.props.value} schema={this.props.schema} modifyNewContext={this.props.modifyNewContext} getFieldValue={this.props.getFieldValue}/>
            );
            case 'attachment' : return (
                <AttachmentInput {...inputProps} field={this.props.label} modifyNewContext={this.props.modifyNewContext} getFieldValue={this.props.getFieldValue}/>
            );
            case 'file upload' : return (
                <S3FileInput {...inputProps} field={this.props.label} modifyNewContext={this.props.modifyNewContext} modifyFile={this.props.modifyFile} modifyMD5Progess={this.props.modifyMD5Progess} md5Progress={this.props.md5Progress} schema={this.props.schema} getFieldValue={this.props.getFieldValue}/>
            );
        }
        // Fallback
        return <div>No field for this case yet.</div>;
    },

    // create a dropdown item corresponding to one enum value
    buildEnumEntry: function(val){
        return(
            <MenuItem key={val} title={val || ''} eventKey={val} onSelect={this.submitEnumVal}>
                {val || ''}
            </MenuItem>
        );
    },

    submitEnumVal: function(eventKey){
        //TODO: add an option to remove the value?
        this.props.modifyNewContext(this.props.label, eventKey);
    },

    handleChange: function(e){
        var inputElement = e && e.target ? e.target : this.refs.inputElement;
        var currValue = inputElement.value;
        // TODO: add case for array
        if (this.props.fieldType == 'integer'){
            if(!isNaN(parseInt(currValue))){
                currValue = parseInt(currValue);
            }
        } else if (this.props.fieldType == 'number'){
            if(!isNaN(parseFloat(currValue))){
                currValue = parseFloat(currValue);
            }
        }
        this.props.modifyNewContext(this.props.label, currValue);
    },

    // call modifyNewContext from parent to delete the value in the field
    deleteField : function(e){
        e.preventDefault();
        this.props.modifyNewContext(this.props.label, null, true);
    },

    render: function(){
        var isArray = this.props.isArray || false;
        // array entries don't need dt/dd rows
        if(isArray){
            return(
                <div>
                    {this.displayField(this.props.fieldType)}
                </div>
            );
        }
        var field_title = this.props.label;
        if(this.props.schema.title && this.props.schema.title.length > 0){
            field_title = this.props.schema.title;
        }
        // TODO: come up with a schema based solution for code below?
        // hardcoded fields you can't delete
        var cannot_delete = ['filename'];
        return(
            <dl className="key-value row extra-footspace">
                <dt className="col-sm-3">
                        <span style={{'display':'inline-block', 'width':'120px'}}>
                            {field_title}
                        </span>
                        {!_.contains(cannot_delete,this.props.label) ?
                            <a href="#" className="cancel-button" onClick={this.deleteField} title="Delete">
                                <i className="icon icon-times-circle-o icon-fw"></i>
                            </a>
                            :
                            null}
                </dt>
                <dd className="col-sm-9">
                    {this.displayField(this.props.fieldType)}
                    <div className="display-tip">{this.props.fieldTip}</div>
                    {this.displayMessage(this.props.fieldType)}
                </dd>

            </dl>
        );
    }
});
/*
Case for a linked object. Fetches the search results for that subobject to
allow the user to pick one from a displayed table. This component holds the
state of whether it is currently open and the fetched data.
*/
var LinkedObj = React.createClass({
    contextTypes: {
        contentTypeIsJSON: React.PropTypes.func
    },

    getInitialState: function(){
        return{
            'open': false,
            'data': {},
            'collection': this.props.collection || null
        };
    },

    // fetch the appropriate linked object collection
    componentDidMount: function(){
        // test for this
        var state = {};
        if(this.props.collection){
            ajax.promise('/' + this.props.collection + '/?format=json').then(data => {
                if (this.context.contentTypeIsJSON(data) && data['@graph']){
                    state['data'] = data['@graph'];
                    // get a nicer collection name
                    state['collection'] = data['@id'].split('/')[1];
                }else{
                    console.log('Available object failed. See LinkedObj in create.js');
                    state['data'] = {};
                }
                this.propSetState(state);
            });
        }
    },

    toggleOpen: function(e){
        e.preventDefault();
        this.setState({'open':!this.state.open});
    },

    // dummy function needed to set state through componentDidMount
    propSetState: function(state){
        this.setState(state);
    },

    displayToggle: function(){
        if(this.state.open){
            return(
                <a style={{'paddingLeft': '5px'}} href="#" onClick={this.toggleOpen} title="Close objects">
                    <i className="icon icon-toggle-up icon-fw"></i>
                </a>
            );
        }else{
            return(
                <a style={{'paddingLeft': '5px'}} href="#" onClick={this.toggleOpen} title="Expand objects">
                    <i className="icon icon-toggle-down icon-fw"></i>
                </a>
            );
        }
    },

    // render the object results in a table
    displayObjectList: function(){
        var collections = this.state.collection || 'objects';
        var tableContent = Object.keys(this.state.data).map((key) => this.objectEntry(key));
        if(this.state.open){
            return(
                <Panel className='panel-create-obj' header={'Available ' + collections + ':'}>
                    <Table fill bordered condensed>
                        <tbody>{tableContent}</tbody>
                    </Table>
                </Panel>

            );
        }
    },

    // each individual object corresponds to a <tr> in the table
    // onClick for these objects modifies the top level newContext state
    // through this.props.modifyNewContext
    objectEntry: function(key){
        var thisObj = this.state.data[key];
        var moreStyles = {};
        var targetVal = null;
        var popLink = null;
        var display = makeTitle({'context': thisObj});

        if(thisObj['@id']){
            if(thisObj['@id'] == this.props.value){
                moreStyles['className'] = 'active-object';
            }
            targetVal = thisObj['@id'];
            if(window !== 'undefined'){
                popLink = thisObj['@id'];
            }else{
                popLink = '/';
            }
        }
        return(
            <tr key={key}><td {...moreStyles}>
                <a href="#" className="tab-left" onClick={function(e){
                    e.preventDefault();
                    this.props.modifyNewContext(this.props.field, targetVal);
                }.bind(this)} title="Select">
                    {display}
                </a>
                <span style={{'color':'#808080', 'textAlign':'center'}}>
                    {thisObj.description || null}
                </span>
                <a href="#" className="tab-right" onClick={function(e){
                    e.preventDefault();
                    var win = window.open(popLink, '_blank');
                    if(win){
                        win.focus();
                    }else{
                        alert('Object page popup blocked!');
                    }
                }} title="Select">
                    <i className="icon icon-external-link icon-fw"></i>
                </a>
            </td></tr>
        );
    },

    render: function(){
        if(this.state.data == {}){
            return(<div>{this.props.value || "No object"}</div>);
        }
        return(
            <div>
                <span>
                    {this.props.value || "No object"}
                    {this.displayToggle()}
                </span>
                {this.displayObjectList()}
            </div>
        );
    }
});


/* Display fields that are arrays. To do this, use a table of array elements
made with buildField, but pass in a different function to build new context,
which essentially aggregates the context of the elements are propogates them
upwards using this.props.modifyNewContext*/

var ArrayField = React.createClass({
    getInitialState: function(){
        return{'open': false};
    },

    toggleOpen: function(e){
        e.preventDefault();
        this.setState({'open':!this.state.open});
    },

    displayToggle: function(){
        if(this.state.open){
            return(
                <a className='array-contract' style={{'paddingLeft': '5px'}} href="#" onClick={this.toggleOpen} title="Close objects">
                    <i className="icon icon-toggle-up icon-fw"></i>
                </a>
            );
        }else{
            return(
                <a className='array-expand' style={{'paddingLeft': '5px'}} href="#" onClick={this.toggleOpen} title="Expand objects">
                    <i className="icon icon-toggle-down icon-fw"></i>
                </a>
            );
        }
    },

    modifyArrayContent: function(idx, value){
        var valueCopy = this.props.value;
        valueCopy[idx] = value;
        this.props.modifyNewContext(this.props.field, valueCopy);
    },

    pushArrayValue: function(e){
        e.preventDefault();
        var valueCopy = this.props.value || [];
        valueCopy.push(null);
        this.props.modifyNewContext(this.props.field, valueCopy);
    },

    deleteArrayValue: function(idx){
        var valueCopy = this.props.value;
        valueCopy.splice(idx, 1);
        this.props.modifyNewContext(this.props.field, valueCopy);
    },

    initiateArrayField: function(arrayInfo) {
        var value = arrayInfo[0] || null;
        var fieldSchema = arrayInfo[1];
        var field = fieldSchema.title || "No title";
        // use arrayIdx as stand-in value for field
        var arrayIdx = arrayInfo[2];
        var fieldTip = null;
        var fieldType = fieldSchema.type ? fieldSchema.type : "text";
        var enumValues = [];
        // transform some types...
        if(fieldType == 'string'){
            fieldType = 'text';
        }
        // check if this is an enum
        if(fieldSchema.enum){
            fieldType = 'enum';
            enumValues = fieldSchema.enum;
        }
        // handle a linkTo object on the the top level
        if(fieldSchema.linkTo){
            fieldType = 'linked object';
        }

        return(
            <tr key={field + parseInt(arrayIdx)}><td>
                <BuildField value={value} key={arrayIdx} schema={fieldSchema} label={arrayIdx} fieldType={fieldType} fieldTip={fieldTip} enumValues={enumValues} disabled={false} modifyNewContext={this.modifyArrayContent} required={false} isArray={true}/>
                <a href="#" className="cancel-button-inline" onClick={function(e){
                    e.preventDefault();
                    this.deleteArrayValue(arrayIdx);
                }.bind(this)} title="Delete item">
                    {'Delete item'}
                </a>
            </td></tr>

        );
    },

    render: function(){
        var schema = this.props.schema.items || {};
        var title = this.props.schema.title ? this.props.schema.title + ' ' : '';
        var fieldTip = schema.description ? title +schema.description + ' ' : title;
        var fieldType = schema.type || 'undefined';
        var arrayTable = null;
        if(fieldType == 'string'){
            fieldType = 'text';
        }
        if (schema.enum){
            fieldType = 'enum';
        }
        var value = this.props.value || [];
        var arrayInfo = [];
        for(var i=0; i<value.length; i++){
            arrayInfo.push([value[i], schema, i]);
        }
        if(this.state.open){
            arrayTable = (
                <Panel className='panel-create-obj' header={
                    <div>
                        <span className="display-tip">{fieldTip}</span>
                        <span className="display-message">{'Type: ' + fieldType}</span>
                        <a href="#" style={{'display':'inline-block', 'float':'right', 'color':'#388a92'}} onClick={this.pushArrayValue} title="Add item">
                            <i className="icon icon-plus-circle icon-fw"></i>
                        </a>
                    </div>
                }>
                    <Table fill bordered condensed>
                        <tbody>{arrayInfo.map((entry) => this.initiateArrayField(entry))}</tbody>
                    </Table>
                </Panel>
            );
        }
        return(
            <div>
                <span>
                    {parseInt(value.length) + ' items'}
                    {this.displayToggle()}
                </span>
                {arrayTable}
            </div>
        );
    }
});

/* Builds a field that represents an inline object. Based off of FieldPanel*/
var ObjectField = React.createClass({

    modifyObjectContent: function(field, value){
        var valueCopy;
        if(!this.props.value || this.props.value == '' || this.props.value == 'No value'){
            valueCopy = {};
        }else{
            valueCopy = this.props.value;
        }
        valueCopy[field] = value;
        this.props.modifyNewContext(this.props.field, valueCopy);
    },

    includeField : function(schema, field){
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
    },

    initiateField: function(fieldInfo) {
        var field = fieldInfo[0];
        var fieldSchema = fieldInfo[1];
        var fieldTip = fieldSchema.description ? fieldSchema.description : null;
        var fieldType = fieldSchema.type ? fieldSchema.type : "text";
        var fieldValue;
        if(this.props.value){
            fieldValue = this.props.value[field] || null;
        }else{
            fieldValue = null;
        }
        var enumValues = [];
        // transform some types...
        if(fieldType == 'string'){
            fieldType = 'text';
        }
        // check if this is an enum
        if(fieldSchema.enum){
            fieldType = 'enum';
            enumValues = fieldSchema.enum;
        }
        // handle a linkTo object on the the top level
        if(fieldSchema.linkTo){
            fieldType = 'linked object';
        }
        return(
            <BuildField value={fieldValue} key={field} schema={fieldSchema} label={field} fieldType={fieldType} fieldTip={fieldTip} enumValues={enumValues} disabled={false} modifyNewContext={this.modifyObjectContent} required={false}/>
        );
    },

    render: function() {
        var schema = this.props.schema;
        var fields = schema['properties'] ? Object.keys(schema['properties']) : [];
        var buildFields = [];
        for (var i=0; i<fields.length; i++){
            var fieldSchema = this.includeField(schema, fields[i]);
            if (fieldSchema){
                buildFields.push([fields[i], fieldSchema]);
            }
        }
        return(
            <div>
                {buildFields.map((field) => this.initiateField(field))}
            </div>
        );
    }
});

/* For version 1. A simple local file upload that gets the name, type,
size, and b64 encoded stream in the form of a data url. Upon successful
upload, adds this information to NewContext*/
var AttachmentInput = React.createClass({

    acceptedTypes: function(){
        var types = [
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
        return(types.toString());
    },

    handleChange: function(e){
        var attachment_props = {};
        var file = e.target.files[0];
        if(!file){
            this.props.modifyNewContext(this.props.field, null, true);
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
        this.props.modifyNewContext(this.props.field, attachment_props);
    },

    render: function(){
        var attach_title;
        if(this.props.value && this.props.value.download){
            attach_title = this.props.value.download;
        }else{
            attach_title = "No file chosen";
        }
        return(
            <div>
                <input id={this.props.field} type='file' onChange={this.handleChange} style={{'display':'none'}} accept={this.acceptedTypes()}/>
                <Button style={{'padding':'0px'}}>
                    <label htmlFor={this.props.field} style={{'paddingRight':'12px','paddingTop':'6px','paddingBottom':'6px','paddingLeft':'12px','marginBottom':'0px'}}>
                        {attach_title}
                    </label>
                </Button>
            </div>
        );
    }
});

/* Input for an s3 file upload. Context value set is local value of the filename.
Also updates this.state.file for the overall component.
*/
var S3FileInput = React.createClass({
    handleChange: function(e){
        var req_type = null;
        var file = e.target.files[0];
        // file was not chosen
        if(!file){
            return;
        }else{
            var filename = file.name ? file.name : "unknown";
            getLargeMD5(file, this.props.modifyMD5Progess).then((hash) => {
                this.props.modifyNewContext('md5sum',hash);
                console.log('HASH SET TO:', hash, 'FOR FILE:', this.props.value);
                this.props.modifyMD5Progess(null);
            }).catch((error) => {
                console.log('ERROR CALCULATING MD5!', error);
                // TODO: should file upload fail on a md5 error?
                this.props.modifyMD5Progess(null);
            });
            this.props.modifyNewContext(this.props.field, filename);
            // calling modifyFile changes the 'file' state of top level component
            this.props.modifyFile(file);
        }
    },

    render: function(){
        var edit_tip;
        var previous_status = this.props.getFieldValue('status');
        var filename_text = this.props.value ? this.props.value : "No file chosen";
        var md5sum = this.props.getFieldValue('md5sum');
        if(this.props.value && !md5sum && previous_status){
            // edit tip to show that there is filename metadata but no actual file
            // selected (i.e. no file held in state)
            edit_tip = "Previous file: " + this.props.value;
            // inform them if the upload failed previously
            if(previous_status == 'upload failed'){
                edit_tip += ' (upload FAILED)';
            }
            filename_text = "No file chosen";
        }
        return(
            <div>
                <input id={this.props.field} type='file' onChange={this.handleChange} disabled={this.props.md5Progress ? true : false} style={{'display':'none'}}/>
                <Button disabled={this.props.md5Progress ? true : false} style={{'padding':'0px'}}>
                    <label htmlFor={this.props.field} style={{'paddingRight':'12px','paddingTop':'6px','paddingBottom':'6px','paddingLeft':'12px','marginBottom':'0px'}}>
                        {filename_text}
                    </label>
                </Button>
                {edit_tip ?
                    <span style={{'color':'#a94442','paddingBottom':'6px', 'paddingLeft':'10px'}}>
                        {edit_tip}
                    </span>
                    :
                    null}
                {this.props.md5Progress ?
                    <div style={{'paddingTop':'10px','paddingBottom':'6px'}}>
                        <i className="icon icon-spin icon-circle-o-notch" style={{'opacity': '0.5' }}></i>
                        <span style={{'paddingLeft':'10px'}}>
                            {'Calculating md5... ' + this.props.md5Progress + '%'}
                        </span>
                    </div>
                    :
                    null}
            </div>
        );

    }
});
