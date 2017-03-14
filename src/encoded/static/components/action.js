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

// Master component used for user actions: create and edit
// create is considered default mode, but by simply switching the behavior
// from POST to PATCH, this can be used for editing by providing a value
// of true to the edit prop.
// This component initiates and hold the new context and coordinated
// submission/validation
var Action = module.exports = React.createClass({
    contextTypes: {
        fetch: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
        navigate: React.PropTypes.func
    },

    getInitialState: function() {
        var contType = this.props.context['@type'] || [];
        var thisSchema = this.props.schemas[contType[0]] || {};
        var reqFields = thisSchema.required || [];
        // use edit mode for patching
        return{
            'newContext': {},
            'requiredFields': reqFields,
            'validated': 0, // 0 = not validated, 1 = validated, 2 = error
            'thisType': contType[0],
            'thisSchema': thisSchema,
            'errorCount': 0,
            'file': null
        };
    },

    // run async request to get frame=object context to fill the forms
    componentDidMount: function(){
        this.contextFlatten(this.props.context);
    },

    // we need the frame=object context for create, so fetch this
    contextFlatten: function(context){
        var contextID = context['@id'] || null;
        if(!contextID){
            this.setState({'newContext': {}});
            return;
        }
        this.context.fetch(contextID + '?frame=object', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            var newID = response['@id'] || null;
            if (!newID || newID != contextID) throw response;
            return response;
        })
        .then(response => {
            response = this.clearFields(response, this.state.thisSchema);
            this.setState({'newContext': response});
        }, error => {
            // something went wrong with fetch context. Just use an empty object
            this.setState({'newContext': {}});
        });
    },

    // Loop through fields in new context. If schema for field has
    // "clear_create": "clear", then clear the value
    clearFields: function(context, schema){
        var contextKeys = Object.keys(context);
        for(var i=0; i<contextKeys.length; i++){
            if(schema.properties[contextKeys[i]]){
                var fieldSchema = schema.properties[contextKeys[i]];
                if (fieldSchema.clear_create && fieldSchema.clear_create == "clear"){
                    delete context[contextKeys[i]];
                }
            }
        }
        return context;
    },

    contextSift: function(context, schema){
        // Remove non-creatable fields from the new context
        var sifted = {};
        var contextKeys = Object.keys(context);
        for(var i=0; i<contextKeys.length; i++){
            if(schema.properties[contextKeys[i]]){
                var fieldSchema = schema.properties[contextKeys[i]];
                if (fieldSchema.exclude_from && (_.contains(fieldSchema.exclude_from,'FFedit-create') || fieldSchema.exclude_from == 'FFedit-create')){
                    continue;
                }
                // check to see if this field is a calculated val
                if (fieldSchema.calculatedProperty && fieldSchema.calculatedProperty === true){
                    continue;
                }
                // check to see if permission == import items
                if (fieldSchema.permission && fieldSchema.permission == "import_items"){
                    continue;
                }
                sifted[contextKeys[i]] = context[contextKeys[i]];
            }
        }
        return sifted;
    },

    modifyNewContext: function(field, value, del=false){
        // function that modifies new context and sets validation state whenever
        // a modification occurs. Is passed down to child elements representing
        // individual fields
        // deleting edited fields is difficult because of patching
        var splitField = field.split('.');
        var contextCopy = this.state.newContext;
        for (var i=0; i<(splitField.length-1); i++){
            if(contextCopy[splitField[i]]){
                contextCopy = contextCopy[splitField[i]];
            } else {
                console.log('PROBLEM CREATING NEW CONTEXT WITH: ', field, value);
                return;
            }
        }
        if(del){
            delete contextCopy[splitField[splitField.length-1]];
        }else{
            contextCopy[splitField[splitField.length-1]] = value;
        }
        this.setState({'newContext': contextCopy, 'validated': 0});
    },

    modifyFile: function(file){
        // function that updates state to contain a file upload
        // not used for all object types
        this.setState({'file':file});
    },

    generatePostButton: function(){
        if(this.state.validated == 1){
            return(
                <Button bsStyle="success" onClick={this.realPostNewContext}>
                    {this.props.edit ? 'Edit object' : 'Create object'}
                </Button>
            );
        }else if (this.state.validated == 0){
            return(
                <Button bsStyle="warning" onClick={this.testPostNewContext}>
                    {'Test object validity'}
                </Button>
            );
        }else{
            return(
                <Button bsStyle="danger" onClick={this.testPostNewContext}>
                    {'Failed user permissions'}
                </Button>
            );
        }
    },

    testPostNewContext: function(e){
        e.preventDefault();
        this.executePost(true);
    },

    realPostNewContext: function(e){
        e.preventDefault();
        this.executePost();
    },

    executePost: function(test=false){
        // function to test a POST of the data or actually POST it.
        // validates if test=true, POSTs if test=false.
        var stateToSet = {}; // hold state
        // get rid of any hanging errors
        for(var i=0; i<this.state.errorCount; i++){
            Alerts.deQueue({ 'title' : "Object validation error " + parseInt(i + 1)});
            stateToSet.errorCount = 0;
        }
        var objType = this.props.context['@type'][0] || 'Item';
        var lab;
        var award;
        var finalizedContext = this.contextSift(this.state.newContext, this.state.thisSchema);
        console.log('contextToPOST:', finalizedContext);
        // get award and lab info from the /me endpoint
        ajax.promise('/me?frame=embedded').then(data => {
            if (this.context.contentTypeIsJSON(data)){
                if(!data.submits_for || data.submits_for.length == 0){
                    console.log('THIS ACCOUNT DOES NOT HAVE SUBMISSION PRIVILEGE');
                    this.setState({'validated': 2});
                    return;
                }
                // use first lab for now
                var submits_for = data.submits_for[0];
                lab = submits_for['@id'] ? submits_for['@id'] : submits_for.link_id.replace(/~/g, "/");
            }
            ajax.promise(lab).then(lab_data => {
                if (this.context.contentTypeIsJSON(lab_data)){
                    if(!lab_data.awards || lab_data.awards.length == 0){
                        console.log('THE LAB FOR THIS ACCOUNT LACKS AN AWARD');
                        this.setState({'validated': 2});
                        return;
                    }
                    // should we really always use the first award?
                    award = lab_data.awards[0];
                }
                if(this.state.thisSchema.properties.award){
                    finalizedContext.award = award['@id'] ? award['@id'] : award.link_id.replace(/~/g, "/");
                }
                if(this.state.thisSchema.properties.lab){
                    finalizedContext.lab = lab;
                }
                // if testing validation, use check_only=True (see /types/base.py)
                var destination = test ? '/' + objType + '/?check_only=True' : '/' + objType;
                var actionMethod = 'POST';
                // see if this is not a test and we're editing
                if(!test && this.props.edit){
                    actionMethod = 'PATCH';
                    destination = this.state.newContext['@id'];
                }
                this.context.fetch(destination, {
                    method: actionMethod,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(finalizedContext)
                })
                .then(response => {
                    if (response.status && response.status !== 'success') throw response;
                    return response;
                })
                .then(response => {
                    if(test){
                        console.log('OBJECT SUCCESSFULLY TESTED!');
                        stateToSet.validated = 1;
                        this.setState(stateToSet);
                    }else if(this.props.edit){
                        console.log('OBJECT SUCCESSFULLY PATCHED!');
                        alert('Success! Navigating to the patched object page.');
                        this.context.navigate(destination);
                    }else{
                        console.log('OBJECT SUCCESSFULLY POSTED!');
                        var newID = response['@graph'][0]['@id'];
                        // handle file upload if this is a file
                        if(_.contains(response['@graph'][0]['@type'],'File')){
                            // FF-617. What should the body be?
                            this.context.fetch(newID + 'upload', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(response['@graph'][0])
                            })
                            .then(response => {
                                console.log('RESPONSE:', response);
                                if (!this.context.contentTypeIsJSON(response) || !response['@graph'] || !response['@graph'][0]['upload_credentials'] || !this.state.file) throw response;
                                return response;
                            })
                            .then(response => {
                                var creds = response['@graph'][0]['upload_credentials'];
                                var file_title = response['@graph'][0]['filename'] ? response['@graph'][0]['filename'] : response['@graph'][0]['display_title'];
                                var upload_info = {
                                    'id': response['@graph'][0]['@id'],
                                    'display_title': response['@graph'][0]['display_title'],
                                    'total_size': this.state.file.size,
                                    'percent_done': 0
                                };
                                var upload_manager = s3UploadFile(this.state.file, creds);
                                console.log('UPLOAD_MANAGER:', upload_manager);
                                upload_manager.on('httpUploadProgress',
                                    function(evt) {
                                        console.log("Uploaded: " + parseInt((evt.loaded * 100) / evt.total));
                                        var percentage = Math.round((evt.loaded * 100) / evt.total);
                                        upload_info.percent_done = percentage;
                                        this.props.updateUploads(creds.key, upload_info);
                                    }.bind(this))
                                    .send(function(err, data) {
                                        if(err){
                                            this.context.fetch(newID, {
                                                method: 'PATCH',
                                                headers: {
                                                    'Accept': 'application/json',
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({'status':'upload failed'})
                                            });
                                            //FF-617: catch errors on the PATCH?
                                            alert("File upload failed for " + newID);
                                        }else{
                                            this.context.fetch(newID, {
                                                method: 'PATCH',
                                                headers: {
                                                    'Accept': 'application/json',
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({'status':'uploaded'})
                                            });
                                            //FF-617: catch errors on the PATCH?
                                            alert("File uploaded successfully for " + newID);
                                        }
                                    }.bind(this));
                                alert('Success! Navigating to the uploads page.');
                                this.context.navigate('/uploads');
                            }, error => {
                                // FF-617. Handle error
                                console.log('Error getting credentials');
                            });
                        }else{
                            if(typeof newID !== 'string'){
                                newID = '/';
                            }
                            alert('Success! Navigating to the new object page.');
                            this.context.navigate(newID);
                        }
                    }
                }, error => {
                    stateToSet.validated = 0;
                    console.log('ERROR IN OBJECT VALIDATION!');
                    console.log(error);
                    var errorList = error.errors || [error.detail] || [];
                    // make an alert for each error description
                    stateToSet.errorCount = errorList.length;
                    for(var i=0; i<errorList.length; i++){
                        var detail = errorList[i].description || errorList[i] || "Unidentified error";
                        if(errorList[i].name && errorList[i].name.length > 0){
                            detail += ('. See: ' + errorList[i].name[0]);
                        }
                        Alerts.queue({ 'title' : "Object validation error " + parseInt(i + 1), 'message': detail, 'style': 'danger' });
                    }
                    // scroll to the top of the page using d3
                    function scrollTopTween(scrollTop){
                        return function(){
                            var interpolate = d3.interpolateNumber(this.scrollTop, scrollTop);
                            return function(t){ document.body.scrollTop = interpolate(t); };
                        };
                    }
                    var origScrollTop = document.body.scrollTop;
                    d3.select(document.body)
                        .interrupt()
                        .transition()
                        .duration(750)
                        .tween("bodyScroll", scrollTopTween(0));
                    this.setState(stateToSet);
                });
            });
        });
    },

    render: function() {
        var title = makeTitle({'context': this.props.context});
        var context = this.state.newContext;
        var baseContext = this.props.context; // includes calc props and the like
        var thisType = this.state.thisType;
        var itemClass = globals.itemClass(context, 'view-item');
        var schema = this.state.thisSchema;
        var createTitle = 'Creating ' + thisType + ' with ' + title + ' as template';
        var editTitle = 'Editing ' + thisType + ' ' + title;
        var reqFields = this.state.requiredFields;
        return (
            <div className={itemClass}>
                <h2>{this.props.edit ? editTitle : createTitle}</h2>
                <h4 style={{'color':'#808080', 'paddingBottom': '10px'}}>Add, edit, and remove field values. Submit at the bottom of the form.</h4>
                <FieldPanel thisType={thisType} context={context} baseContext={baseContext} schema={schema} modifyNewContext={this.modifyNewContext} modifyFile={this.modifyFile} reqFields={reqFields}/>
                <div>{this.generatePostButton()}</div>
            </div>
        );
    }
});

// Based off EditPanel in edit.js
var FieldPanel = React.createClass({

    includeField : function(schema, field){
        if (!schema) return null;
        var schemaVal = object.getNestedProperty(schema, ['properties', field], true);
        if (!schemaVal) return null;
        // check to see if this field should be excluded based on exclude_from status
        if (schemaVal.exclude_from && (_.contains(schemaVal.exclude_from,'FFedit-create') || schemaVal.exclude_from == 'FFedit-create')){
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

    // collect props necessary to build create a BuildField child
    initiateField: function(fieldInfo) {
        var field = fieldInfo[0];
        var fieldSchema = fieldInfo[1];
        var fieldTip = fieldSchema.description ? fieldSchema.description : null;
        var fieldType = fieldSchema.type ? fieldSchema.type : "text";
        var fieldValue = this.props.context[field] || null;
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
        // set a required flag if this field is required
        var required = _.contains(this.props.reqFields, field);
        // handle a linkTo object on the the top level

        // check if any schema-specific adjustments need to made:
        if(fieldSchema.linkTo){
            fieldType = 'linked object';
        } else if (fieldSchema.attachment && fieldSchema.attachment === true){
            fieldType = 'attachment';
        } else if (fieldSchema.s3Upload && fieldSchema.s3Upload === true){
            fieldType = 'file upload';
            // format tip for files specifically
            // if(fieldSchema.file_format_file_extension && this.props.context[file_format_file_extension]){
            //     fieldTip = "Must be " + this.props.context[file_format_file_extension];
            // }
        }
        // @id of the whole object, may be useful down the line
        var masterID = this.props.baseContext['@id'] || this.props.baseContext.link_id.replace(/~/g, "/");
        return(
            <BuildField value={fieldValue} key={field} schema={fieldSchema} label={field} fieldType={fieldType} fieldTip={fieldTip} enumValues={enumValues} disabled={false} modifyNewContext={this.props.modifyNewContext} modifyFile={this.props.modifyFile} required={required} masterID={masterID}/>
        );
    },

    render: function() {
        var schema = this.props.schema;
        // get the fields from the schema of this item
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

/*
This is a key/input pair for any one field. Made to be stateless; changes
 to the newContext state of Action propogate downwards. Also includes a
 description and some validation message based on the schema
 */
var BuildField = React.createClass({
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
                    <LinkedObj field={this.props.label} value={inputProps.value} collection={this.props.schema.linkTo} modifyNewContext={this.props.modifyNewContext}/>
            );
            case 'array' : return (
                <ArrayField field={this.props.label} value={this.props.value} schema={this.props.schema} modifyNewContext={this.props.modifyNewContext}/>
            );
            case 'object' : return (
                <ObjectField field={this.props.label} value={this.props.value} schema={this.props.schema} modifyNewContext={this.props.modifyNewContext}/>
            );
            case 'attachment' : return (
                <AttachmentInput {...inputProps} field={this.props.label} modifyNewContext={this.props.modifyNewContext}/>
            );
            case 'file upload' : return (
                <S3FileInput {...inputProps} masterID={this.props.masterID} field={this.props.label} modifyNewContext={this.props.modifyNewContext} modifyFile={this.props.modifyFile} schema={this.props.schema}/>
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

        return(
            <dl className="key-value row extra-footspace">
                <dt className="col-sm-3">
                        <span style={{'display':'inlineBlock', 'width':'80px'}}>
                            {field_title}
                        </span>
                        <a href="#" className="cancel-button" onClick={this.deleteField} title="Delete">
                            <i className="icon icon-times-circle-o icon-fw"></i>
                        </a>
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
        return(
            <input id={this.props.field} type='file' onChange={this.handleChange} ref="fileInput" accept={this.acceptedTypes()}/>
        );
    }
});

/* Input for an s3 file upload. If file_format_file_extension is defined in the
schema, will enforce that a file of that type is used. Context value set is
local value of the filename. Also updates this.state.file for the overall component.
*/
var S3FileInput = React.createClass({
    handleChange: function(e){
        // var req_type = this.props.schema.file_format_file_extension || null;
        var req_type = null;
        var file = e.target.files[0];
        var filename = file.name ? file.name : "unknown";
        if(req_type && filename.indexOf(req_type) !== -1){
            this.props.modifyNewContext(this.props.field, filename);
            this.props.modifyFile(file);
        }else if(req_type){
            this.refs.fileInput.value = '';
            alert('File must be of type: ' + req_type);
        }else{
            this.props.modifyNewContext(this.props.field, filename);
            this.props.modifyFile(file);
        }
    },

    render: function(){
        return(
            <input id={this.props.field} type='file' onChange={this.handleChange} ref="fileInput"/>
        );
    }
});
