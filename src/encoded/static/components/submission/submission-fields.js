'use strict';
var React = require('react');
var globals = require('../globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide, animateScrollTo } = require('../util');
var {getS3UploadUrl, s3UploadFile} = require('../util/aws');
var { DropdownButton, Button, MenuItem, Panel, Table, Collapse, Fade} = require('react-bootstrap');
var makeTitle = require('../item-pages/item').title;
var Alerts = require('../alerts');
var getLargeMD5 = require('../util/file-utility').getLargeMD5;
var ReactTooltip = require('react-tooltip');

/*
This is a key/input pair for any one field. Made to be stateless; changes
 to the newContext state of Action propogate downwards. Also includes a
 description and some validation message based on the schema
 */
var BuildField = module.exports.BuildField = React.createClass({

    componentDidMount: function(){
        ReactTooltip.rebuild();
    },

    displayField: function(field_case){
        var inputProps = {
            'id' : this.props.field,
            'disabled' : this.props.disabled || false,
            'ref' : "inputElement",
            'value' : this.props.value || '',
            'onChange' : this.handleChange,
            'name' : this.props.field,
            'autoFocus': true,
            'placeholder': "No value"
        };
        var otherProps = {
            'id' : this.props.field,
            'value' : this.props.value,
            'field': this.props.field,
            'collection': this.props.schema.linkTo,
            'modifyNewContext': this.props.modifyNewContext,
            'getFieldValue': this.props.getFieldValue,
            'selectObj': this.props.selectObj,
            'arrayIdx': this.props.arrayIdx,
            'isArray': this.props.isArray,
            'nestedField': this.props.nestedField,
            'schema': this.props.schema,
            'md5Progress': this.props.md5Progress,
            'modifyFile': this.props.modifyFile,
            'modifyMD5Progess': this.props.modifyMD5Progess,
            'masterDisplay': this.props.masterDisplay,
            'setMasterState': this.props.setMasterState
        };
        switch(field_case){
            case 'text' : return (
                <div className="input-wrapper" style={{'display':'inline'}}>
                    <input type="text" inputMode="latin" {...inputProps} />
                </div>
            );
            case 'integer' : return (
                <div className="input-wrapper" style={{'display':'inline'}}>
                    <input id="intNumber" type="number" inputMode="latin" {...inputProps} />
                </div>
            );
            case 'number' : return (
                <div className="input-wrapper" style={{'display':'inline'}}>
                    <input id="floatNumber" type="number" inputMode="latin" {...inputProps} />
                </div>
            );
            case 'enum' : return (
                <span className="input-wrapper" style={{'display':'inline'}}>
                    <DropdownButton bsSize="xsmall" id="dropdown-size-extra-small" title={this.props.value || "No value"}>
                        {this.props.enumValues.map((val) => this.buildEnumEntry(val))}
                    </DropdownButton>
                </span>
            );
            case 'linked object' : return (
                <div style={{'display':'inline-block'}}>
                    <LinkedObj {...otherProps}/>
                </div>
            );
            case 'array' : return (
                <div style={{'display':'inline'}}>
                    <ArrayField {...otherProps}/>
                </div>

            );
            case 'object' : return (
                <div style={{'display':'inline'}}>
                    <ObjectField {...otherProps}/>
                </div>
            );
            case 'attachment' : return (
                <div style={{'display':'inline'}}>
                    <AttachmentInput {...otherProps}/>
                </div>
            );
            case 'file upload' : return (
                <div style={{'display':'inline'}}>
                    <S3FileInput {...otherProps}/>
                </div>
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
        this.props.modifyNewContext(this.props.nestedField, eventKey, this.props.fieldType, this.props.arrayIdx);
    },

    handleChange: function(e){
        var inputElement = e && e.target ? e.target : this.refs.inputElement;
        var currValue = inputElement.value;
        if (this.props.fieldType == 'integer'){
            if(!isNaN(parseInt(currValue))){
                currValue = parseInt(currValue);
            }
        } else if (this.props.fieldType == 'number'){
            if(!isNaN(parseFloat(currValue))){
                currValue = parseFloat(currValue);
            }
        }
        this.props.modifyNewContext(this.props.nestedField, currValue, this.props.fieldType, this.props.arrayIdx);
    },

    // call modifyNewContext from parent to delete the value in the field
    deleteField : function(e){
        e.preventDefault();
        this.props.modifyNewContext(this.props.nestedField, null, this.props.fieldType, this.props.arrayIdx);
    },

    // this needs to live in BuildField for styling purposes
    pushArrayValue: function(e){
        e.preventDefault();
        if(this.props.fieldType !== 'array'){
            return;
        }
        var valueCopy = this.props.value ? this.props.value.slice() : [];
        valueCopy.push(null);
        this.props.modifyNewContext(this.props.nestedField, valueCopy, this.props.fieldType, this.props.arrayIdx);
    },

    render: function(){
        // TODO: come up with a schema based solution for code below?
        // hardcoded fields you can't delete
        var cannot_delete = ['filename'];
        var showDelete = false;
        // don't show delet button unless:
        // 1. not in hardcoded cannot delete list AND 2. has a value (non-null)
        // AND 3. is not an object or non-empty array element (individual values get deleted)
        if(!_.contains(cannot_delete, this.props.field) && this.props.value !== null && this.props.fieldType !== 'array'){
            showDelete = true;
        }
        // array items don't need fieldnames/tooltips
        if(this.props.isArray){
            // if we've got an object that's inside inside an array, only allow
            // the array to be deleted if ALL individual fields are null
            if(this.props.fieldType === 'object'){
                var valueCopy = this.props.value ? JSON.parse(JSON.stringify(this.props.value)) : {};
                var nullItems = Object.keys(valueCopy).filter(item => valueCopy[item] === null);
                if( Object.keys(valueCopy).length !== nullItems.length){
                    showDelete = false;
                }
            }
            return(
                <div className="row facet" style={{'overflow':'visible'}}>
                    <div className="col-sm-12">
                        <div>
                            {this.displayField(this.props.fieldType)}
                            <Fade in={showDelete}>
                                <div className="pull-right">
                                    <Button bsSize="xsmall" bsStyle="danger" style={{'width':'80px'}} disabled={!showDelete} onClick={this.deleteField}>
                                        {'Delete item'}
                                    </Button>
                                </div>
                            </Fade>
                        </div>
                    </div>
                </div>
            );
        }
        return(

            <div className="row facet" style={{'overflow':'visible'}}>
                <div className="col-sm-12 col-md-3">
                    <h5 className="facet-title submission-field-title">
                        <span style={{'marginRight': '6px'}} className="inline-block">{this.props.title}</span>
                        <InfoIcon children={this.props.fieldTip}/>
                        {this.props.required ?
                            <span style={{'color':'#a94442', "marginRight":"6px"}}>Required</span>
                            : null
                        }
                        {this.props.fieldType === 'array' ?
                            <Button bsSize="xsmall" onClick={this.pushArrayValue}>
                                {'Add'}
                            </Button>
                            :
                            null
                        }
                    </h5>
                </div>
                <div className="col-sm-12 col-md-9">
                    <div>
                        {this.displayField(this.props.fieldType)}
                        <Fade in={showDelete}>
                            <div className="pull-right">
                                <Button bsSize="xsmall" bsStyle="danger" style={{'width':'80px'}} disabled={!showDelete} onClick={this.deleteField}>
                                    {'Delete'}
                                </Button>
                            </div>
                        </Fade>
                    </div>
                </div>
            </div>
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
            'data': {},
            'type': null,
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
                    var results = data['@graph'];
                    if(results.length === 0){
                        state['data'] = null;
                        state['type'] = null;
                    }else{
                        var type = results[0]['@type'][0];
                        state['type'] = type;
                        state['data'] = data;
                    }
                }else{
                    state['data'] = null;
                    state['type'] = null;
                }
                this.propSetState(state);
            });
        }
    },

    // dummy function needed to set state through componentDidMount
    propSetState: function(state){
        this.setState(state);
    },

    render: function(){
        var style={'width':'160px', 'marginRight':'10px'};
        // object chosen or being created
        if(this.props.value){
            var masterDisplay = this.props.masterDisplay;
            var thisDisplay;
            if(isNaN(this.props.value)){
                thisDisplay = masterDisplay ? masterDisplay[this.props.value] : this.props.value;
                return(
                    <div>
                        <a href={this.props.value} target="_blank">
                            <span>{thisDisplay}</span>
                            <i style={{'paddingLeft':'4px'}} className={"icon icon-external-link"}></i>
                        </a>
                    </div>
                );
            }else{
                var intKey = parseInt(this.props.value);
                thisDisplay = masterDisplay ? masterDisplay[intKey] : this.props.value;
                return(
                    <div>
                        <a href="" onClick={function(e){
                                e.preventDefault();
                                this.props.setMasterState('currKey', intKey);
                            }.bind(this)}>
                            {thisDisplay}
                        </a>
                    </div>
                );

            }

        }
        return(
            <div>
                {this.state.data ?
                    <Button bsSize="xsmall" style={style} onClick={function(e){
                            e.preventDefault();
                            this.props.selectObj(this.state.collection, this.state.data, this.props.nestedField, this.props.arrayIdx);
                        }.bind(this)}>
                        {'Select existing'}
                    </Button>
                    :
                    <Button bsSize="xsmall" style={style} disabled>
                        {'No existing objects'}
                    </Button>
                }
                <Button bsSize="xsmall" style={style}onClick={function(e){
                        e.preventDefault();
                        this.props.modifyNewContext(this.props.nestedField, null, 'new linked object', this.props.arrayIdx, this.state.type);
                    }.bind(this)}>
                    {'Create new'}
                </Button>
            </div>
        );
    }
});


/* Display fields that are arrays. To do this, use a table of array elements
made with buildField, but pass in a different function to build new context,
which essentially aggregates the context of the elements are propogates them
upwards using this.props.modifyNewContext*/

var ArrayField = React.createClass({

    initiateArrayField: function(arrayInfo) {
        var value = arrayInfo[0] || null;
        var fieldSchema = arrayInfo[1];
        // use arrayIdx as stand-in value for field
        var arrayIdx = arrayInfo[2];
        var fieldTip = fieldSchema.description || null;
        if(fieldSchema.comment){
            fieldTip = fieldTip ? fieldTip + ' ' + fieldSchema.comment : fieldSchema.comment;
        }
        var title = fieldSchema.title || 'Item';
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
        var style = {};
        // stripe every other item for ease of visibility
        if(arrayIdx % 2 == 0){
            style.backgroundColor = '#f4f4f4';
        }else{
            style.backgroundColor = '#fff';
            style.border = "1px solid #ccc";
        }
        var arrayIdxList;
        if(this.props.arrayIdx){
            arrayIdxList = this.props.arrayIdx.slice();
        }else{
            arrayIdxList = [];
        }
        arrayIdxList.push(arrayIdx);
        return(
            <div key={arrayIdx} style={style}>
                <BuildField
                    value={value}
                    schema={fieldSchema}
                    field={this.props.field}
                    fieldType={fieldType}
                    fieldTip={fieldTip}
                    title={title}
                    enumValues={enumValues}
                    disabled={false}
                    modifyNewContext={this.props.modifyNewContext}
                    required={false}
                    selectObj={this.props.selectObj}
                    arrayIdx={arrayIdxList}
                    nestedField={this.props.nestedField}
                    isArray={true}
                    masterDisplay={this.props.masterDisplay}
                    setMasterState= {this.props.setMasterState}
                />
            </div>
        );
    },

    render: function(){
        var schema = this.props.schema.items || {};
        var value = this.props.value || [];
        var arrayInfo = [];
        for(var i=0; i<value.length; i++){
            arrayInfo.push([value[i], schema, i]);
        }
        return(
            <div>
                {this.props.value ?
                    <div>
                        {arrayInfo.map((entry) => this.initiateArrayField(entry))}
                    </div>
                    :
                    null
                }
            </div>
        );
    }
});

/* Builds a field that represents an inline object. Based off of FieldPanel*/
var ObjectField = React.createClass({

    componentDidMount: function(){
        // initialize with empty dictionary
        var initVal = this.props.value || {};
        this.props.modifyNewContext(this.props.nestedField, initVal, 'object', this.props.arrayIdx);
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
        if(fieldSchema.comment){
            fieldTip = fieldTip ? fieldTip + ' ' + fieldSchema.comment : fieldSchema.comment;
        }
        var fieldType = fieldSchema.type ? fieldSchema.type : "text";
        var title = fieldSchema.title || field;
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
        // format field as <this_field>.<next_field> so top level modification
        // happens correctly
        var nestedField = this.props.nestedField + '.' + field;
        return(
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
                selectObj={this.props.selectObj}
                title={title}
                nestedField={nestedField}
                isArray={false}
                arrayIdx={this.props.arrayIdx}
                masterDisplay={this.props.masterDisplay}
                setMasterState= {this.props.setMasterState}
            />
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
            this.props.modifyNewContext(this.props.nestedField, null, 'attachment', this.props.arrayIdx);
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
        this.props.modifyNewContext(this.props.nestedField, null, 'attachment', this.props.arrayIdx);
    },

    render: function(){
        var attach_title;
        if(this.props.value && this.props.value.download){
            attach_title = this.props.value.download;
        }else{
            attach_title = "No file chosen";
        }
        var labelStyle = {
            'paddingRight':'5px',
            'paddingTop':'1px',
            'paddingBottom':'1px',
            'paddingLeft':'5px',
            'marginBottom':'0px',
            'fontWeight':'400'
        };
        return(
            <div>
                <input id={this.props.field} type='file' onChange={this.handleChange} style={{'display':'none'}} accept={this.acceptedTypes()}/>
                <Button bsSize="xsmall" style={{'padding':'0px'}}>
                    <label htmlFor={this.props.field} style={labelStyle}>
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
                this.props.modifyNewContext('md5sum', hash, 'file upload', this.props.arrayIdx);
                console.log('HASH SET TO:', hash, 'FOR FILE:', this.props.value);
                this.props.modifyMD5Progess(null);
            }).catch((error) => {
                console.log('ERROR CALCULATING MD5!', error);
                // TODO: should file upload fail on a md5 error?
                this.props.modifyMD5Progess(null);
            });
            this.props.modifyNewContext(this.props.nestedField, filename, 'file upload', this.props.arrayIdx);
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

class InfoIcon extends React.Component{
    render() {
        if (!this.props.children) return null;
        return (
            <i style={{"marginRight":"6px",'marginLeft':'0px'}} className="icon icon-info-circle" data-tip={this.props.children}/>
        );
    }
}
