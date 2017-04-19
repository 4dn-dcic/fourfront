'use strict';
var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide } = require('./util');
var {getS3UploadUrl, s3UploadFile} = require('./util/aws');
var { DropdownButton, Button, MenuItem, Panel, Table} = require('react-bootstrap');
var BuildField = require('./submission-fields').BuildField;
var makeTitle = require('./item-pages/item').title;
var Alerts = require('./alerts');
var d3 = require('d3');
var store = require('../store');
var getLargeMD5 = require('./util/file-utility').getLargeMD5;

/*
Master container component for Submission components.
Holds object values for all downstream components and owns the methods
for submitting data. Passes the appropriate data downwards to the individual
object views.
*/
class SubmissionView extends React.Component{
    contextTypes: {
        fetch: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
        navigate: React.PropTypes.func
    },

    constructor(props){
        super(props);
    }

    state = {
        'masterContext': {},
        'requiredFields': reqFields,
        'validated': 0, // 0 = not validated, 1 = validated, 2 = error
        'processingFetch': false,
        'thisType': contType[0],
        'thisSchema': thisSchema,
        'errorCount': 0,
        'file': null,
        'md5Progress': null
    }

    buildContext(context, schema){
        // Build context based off an object's and populate values from
        // pre-existing context. Empty fields are given null value
        var built = {};
        var fields = schema['properties'] ? Object.keys(schema['properties']) : [];
        for(var i=0; i<fields.length; i++){
            if(schema.properties[fields[i]]){
                var fieldSchema = object.getNestedProperty(schema, ['properties', field], true);
                if (!fieldSchema){
                    continue;
                }
                if (fieldSchema.exclude_from && (_.contains(fieldSchema.exclude_from,'FFedit-create') || fieldSchema.exclude_from == 'FFedit-create')){
                    continue;
                }
                // check to see if this field is a calculated prop
                if (fieldSchema.calculatedProperty && fieldSchema.calculatedProperty === true){
                    continue;
                }
                // check to see if permission == import items
                if (fieldSchema.permission && fieldSchema.permission == "import_items"){
                    continue;
                }
                // set value to context value if editing/cloning.
                // if creating or value not present, set to null
                if(this.props.edit){
                    if(fieldSchema.ff_clear && fieldSchema.ff_clear == "edit"){
                        built[fields[i]] = null;
                    }else{
                        built[fields[i]] = context[fields[i]];
                    }
                }else if(!this.props.create){ //clone
                    }if(!tfieldSchema.ff_clear && fieldSchema.ff_clear == "clone"){
                        built[fields[i]] = null;
                    }else{
                        built[fields[i]] = context[fields[i]];
                    }
                }else{
                    built[fields[i]] = null;
                }
            }
        }
        return built;
    }

    modifyMasterContext(objKey, newContext, del=false){
        // function that modifies new context and sets validation state whenever
        // a modification occurs. Is passed down to child elements representing
        // individual fields
        // deleting edited fields is difficult because of patching
        var splitKey = objKey.split('.');
        var contextCopy = this.state.masterContext;
        for (var i=0; i<(splitField.length-1); i++){
            if(contextCopy[splitField[i]]){
                contextCopy = contextCopy[splitField[i]].context;
            } else {
                console.log('PROBLEM CHANGING MASTER CONTEXT WITH: ', field, value);
                return;
            }
        }
        if(del){
            delete contextCopy[splitField[splitField.length-1]];
        }else{
            contextCopy[splitField[splitField.length-1]] = value;
        }
        this.setState({'masterContext': contextCopy, 'validated': 0});
    }

// --------------NEED TO REVISE>>>>

    // run async request to get frame=object context to fill the forms
    componentDidMount(){
        this.contextFlatten(this.props.context);
    }

    // we need the frame=object context for create, so fetch this
    contextFlatten(context){
        var contextID = context['@id'] || null;
        // if @id cannot be found or we are creating from scratch, start with empty fields
        if(!contextID || this.props.create){
            this.setState({'masterContext': {}});
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
            // clear fields based off of action method and ff_clear values in schema
            response = this.clearFields(response, this.state.thisSchema);
            this.setState({'masterContext': response});
        }, error => {
            // something went wrong with fetch context. Just use an empty object
            this.setState({'masterContext': {}});
        });
    }

    generateValidationButton(){
        var style={'width':'160px'};
        if(this.state.md5Progress && this.state.md5Progress != 100){
            return(
                <Button bsStyle="info" style={style} disabled>
                    {'Calculating md5...'}
                </Button>
            );
        }else if(this.state.validated == 1){
            return(
                <Button bsStyle="info" style={style} disabled>
                    {'Validated'}
                </Button>
            );
        }else if(this.state.processingFetch){
            return(
                <Button bsStyle="info" style={style} disabled>
                    <i className="icon icon-spin icon-circle-o-notch"></i>
                </Button>
            );
        }else if (this.state.validated == 0){
            return(
                <Button bsStyle="info" style={style} onClick={this.testPostNewContext}>
                    {'Test object validity'}
                </Button>
            );
        }else{
            return(
                <Button bsStyle="danger" style={style} onClick={this.testPostNewContext}>
                    {'Failed permissions'}
                </Button>
            );
        }
    }

    generatePostButton(){
        var style={'marginLeft':'30px','width':'160px'};
        if(this.state.validated == 1 && !this.state.processingFetch){
            return(
                <Button bsStyle="success" style={style} onClick={this.realPostNewContext}>
                    {this.props.edit ? 'Edit object' : 'Create object'}
                </Button>
            );
        }else if(this.state.validated == 1 && this.state.processingFetch){
            return(
                <Button bsStyle="success" style={style} disabled>
                    <i className="icon icon-spin icon-circle-o-notch"></i>
                </Button>
            );
        }else{
            return(
                <Button bsStyle="success" style={style} disabled>
                    {this.props.edit ? 'Edit object' : 'Create object'}
                </Button>
            );
        }
    }

    testPostNewContext = (e) => {
        e.preventDefault();
        this.executePost(true);
    }

    realPostNewContext = (e) => {
        e.preventDefault();
        this.executePost();
    }

    executePost(test=false){
        // function to test a POST of the data or actually POST it.
        // validates if test=true, POSTs if test=false.
        var stateToSet = {}; // hold state
        // this will always be reset when stateToSet is implemented
        stateToSet.processingFetch = false;
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
        this.setState({'processingFetch': true});
        ajax.promise('/me?frame=embedded').then(data => {
            if (this.context.contentTypeIsJSON(data)){
                if(!data.submits_for || data.submits_for.length == 0){
                    console.log('THIS ACCOUNT DOES NOT HAVE SUBMISSION PRIVILEGE');
                    stateToSet.validated = 2;
                    this.setState(stateToSet);
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
                        stateToSet.validated = 2;
                        this.setState(stateToSet);
                        return;
                    }
                    // should we really always use the first award?
                    award = lab_data.awards[0];
                }
                // if editing, use pre-existing award, lab, and submitted_by
                if(this.props.edit && this.state.newContext.award && this.state.newContext.lab){
                    finalizedContext.award = this.state.newContext.award;
                    finalizedContext.lab = this.state.newContext.lab;
                    // an admin is editing. Use the pre-existing submitted_by
                    // otherwise, permissions won't let us change this field
                    if(data.groups && _.contains(data.groups, 'admin')){
                        finalizedContext.submitted_by = this.state.newContext.submitted_by;
                    }
                }else{ // use info of person creating/cloning
                    if(this.state.thisSchema.properties.award){
                        finalizedContext.award = award['@id'] ? award['@id'] : award.link_id.replace(/~/g, "/");
                    }
                    if(this.state.thisSchema.properties.lab){
                        finalizedContext.lab = lab;
                    }
                }
                // if testing validation, use check_only=True (see /types/base.py)
                var destination = test ? '/' + objType + '/?check_only=True' : '/' + objType;
                var actionMethod = 'POST';
                // see if this is not a test and we're editing
                if(!test && this.props.edit){
                    actionMethod = 'PUT';
                    destination = this.state.newContext['@id'];
                    // must add uuid (and accession, if available) to PUT body
                    finalizedContext.uuid = this.state.newContext.uuid;
                    // not all objects have accessions
                    if(this.state.newContext.accession){
                        finalizedContext.accession = this.state.newContext.accession;
                    }
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
                    var response_data;
                    if(test){
                        console.log('OBJECT SUCCESSFULLY TESTED!');
                        stateToSet.validated = 1;
                        this.setState(stateToSet);
                        return;
                    }else{
                        response_data = response['@graph'][0];
                        if(!this.props.edit){
                            destination = response_data['@id'];
                        }
                    }
                    // handle file upload if this is a file
                    if(this.state.file && response_data['upload_credentials']){
                        // add important info to result from finalizedContext
                        // that is not added from /types/file.py get_upload
                        var creds = response_data['upload_credentials'];
                        var upload_manager = s3UploadFile(this.state.file, creds);
                        var upload_info = {
                            'context': response_data,
                            'manager': upload_manager
                        };
                        // Passes upload_manager to uploads.js through app.js
                        this.props.updateUploads(destination, upload_info);
                        alert('Success! Navigating to the uploads page.');
                        this.context.navigate('/uploads');
                    }else{
                        console.log('ACTION SUCCESSFUL!');
                        alert('Success! Navigating to the object page.');
                        this.context.navigate(destination);
                    }
                }, error => {
                    stateToSet.validated = 0;
                    console.log('ERROR IN OBJECT VALIDATION!');
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
    }

    render(){
        return();
    }
}

/*
Round one view for editing an object. This includes all non-same level
linkTo object relationships and non-file upload fields.
Essentially, this takes data held by the container component and passes it down
to the correct BuildFields
*/
var RoundOneObject = React.createClass({

    modifyNewContext: function(field, value, del=false){
        var splitField = field.split('.');
        var contextCopy = this.props.context;
        var pointer = contextCopy;
        for (var i=0; i<(splitField.length-1); i++){
            if(pointer[splitField[i]]){
                pointer = pointer[splitField[i]];
            } else {
                console.log('PROBLEM CREATING NEW CONTEXT WITH: ', field, value);
                return;
            }
        }
        if(del){
            delete pointer[splitField[splitField.length-1]];
        }else{
            pointer[splitField[splitField.length-1]] = value;
        }
        this.props.modifyMasterContext(this.props.objectKey, contextCopy);
    },

    getFieldValue: function(field){
        if(this.props.context.hasOwnProperty(field)){
            return this.props.context[field];
        }else{
            return null;
        }
    },

    // collect props necessary to build create a BuildField child
    initiateField: function(field) {
        var fieldSchema = object.getNestedProperty(this.props.schema, ['properties', field], true);
        if (!fieldSchema) return null;
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
        // handle a linkTo object on the the top level
        // check if any schema-specific adjustments need to made:
        if(fieldSchema.linkTo){
            fieldType = 'linked object';
        }else if (fieldSchema.attachment && fieldSchema.attachment === true){
            return null;
            // fieldType = 'attachment';
        }else if (fieldSchema.s3Upload && fieldSchema.s3Upload === true){
            return null;
            // // only render file upload input if status is 'uploading' or 'upload_failed'
            // if(this.props.edit && this.props.baseContext.status){
            //     if(this.props.baseContext.status == 'uploading' || this.props.baseContext.status == 'upload failed'){
            //         fieldType = 'file upload';
            //     }else{
            //         return null;
            //     }
            // }else{
            //     fieldType = 'file upload';
            // }
        }
        // set a required flag if this field is required
        var required = _.contains(this.props.schema.required, field);

        return(
            <BuildField value={fieldValue} key={field} schema={fieldSchema} label={field} fieldType={fieldType} fieldTip={fieldTip} enumValues={enumValues} disabled={false} modifyNewContext={this.modifyNewContext} modifyFile={null} modifyMD5Progess={null} md5Progress={null} getFieldValue={this.props.getFieldValue} required={required}/>
        );
    },

    render: function() {
        var schema = this.props.schema;
        // get the fields from passed down context
        var fields = Object.keys(this.props.context) || [];
        var buildFields = [];
        for (var i=0; i<fields.length; i++){
            var built = this.initiateField(fields[i]);
            if (built){
                buildFields.push(built);
            }
        }
        return(
            <div>
                {buildFields}
            </div>
        );
    }
});

class RoundTwoObject extends React.Component{
    contextTypes: {
        fetch: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
        navigate: React.PropTypes.func
    },

    constructor(props){
        super(props);
    }

    state = {
        'file': null,
        'md5Progress': null
    }

    modifyFile(file){
        // function that updates state to contain a file upload
        // not used for all object types
        this.setState({'file':file});
    }

    modifyMD5Progess(progress){
        // set this.state.md5Progress to passed in progress value (should be int)
        this.setState({'md5Progress':progress});
    }

    render(){
        return();
    }
}
