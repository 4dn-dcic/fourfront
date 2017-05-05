'use strict';
var React = require('react');
var globals = require('../globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide, layout } = require('../util');
var {getS3UploadUrl, s3UploadFile} = require('../util/aws');
var { DropdownButton, Button, MenuItem, Panel, Table, Collapse, Fade, Modal} = require('react-bootstrap');
var BuildField = require('./submission-fields').BuildField;
var makeTitle = require('../item-pages/item').title;
var Alerts = require('../alerts');
var Search = require('../search').Search;
var getLargeMD5 = require('../util/file-utility').getLargeMD5;
var ReactTooltip = require('react-tooltip');
import SubmissionTree from './expandable-tree';

/*
Master container component for Submission components.
Holds object values for all downstream components and owns the methods
for submitting data. Passes the appropriate data downwards to the individual
object views.
*/
export default class SubmissionView extends React.Component{

    constructor(props){
        super(props);
    }

    state = {
        'masterContext': null,
        'masterValid': null, // 0 = not validated, 1 = validated, 2 = error
        'masterTypes': null,
        'masterDisplay': null, // serves to hold navigation-formatted names for objs
        'keyIter': 0, // serves as key versions for child objects. 0 is reserved for principal
        'currKey': null, // start with viewing principle object (key = 0),
        'keyHierarchy': {},
        'navigationIsOpen': false,
        'processingFetch': false,
        'errorCount': 0,
        'creatingIdx': null,
        'creatingType': null,
        'creatingAlias': '',
        'creatingAliasMessage': null
    }

    // run async request to get frame=object context to fill the forms
    componentDidMount(){
        if(this.props.schemas){
            this.initializePrincipal(this.props.context, this.props.schemas);
        }
    }

    componentWillReceiveProps(nextProps){
        if(this.props.schemas != nextProps.schemas){
            this.initializePrincipal(nextProps.context, nextProps.schemas);
        }
    }

    modifyMasterContext = (objKey, newContext, del=false) => {
        // function that modifies new context and sets validation state whenever
        // a modification occurs. Is passed down to child elements representing
        // individual fields
        // deleting edited fields is difficult because of patching
        var contextCopy = this.state.masterContext;
        var validCopy = this.state.masterValid;
        var typesCopy = this.state.masterTypes;
        if(del){
            delete contextCopy[objKey];
            delete validCopy[objKey];
            delete typesCopy[objKey];
        }else{
            contextCopy[objKey] = newContext;
            validCopy[objKey] = 0;
        }
        console.log('newContext:', contextCopy);
        this.setState({
            'masterContext': contextCopy,
            'masterValid': validCopy,
            'masterTypes': typesCopy
        });
    }

    // we need the frame=object context for create, so fetch this
    initializePrincipal = (context, schemas) => {
        var initContext = {};
        var contextID = context['@id'] || null;
        var principalTypes = this.props.context['@type'];
        var initType = {0: principalTypes[0]};
        var initValid = {0: 0};
        var principalDisplay = 'New ' + principalTypes[0];
        var initDisplay = {0: principalDisplay};
        var schema = schemas[principalTypes[0]];
        var hierarchy = this.state.keyHierarchy;
        hierarchy[0] = {};
        // if @id cannot be found or we are creating from scratch, start with empty fields
        if(!contextID || this.props.create){
            initContext[0] = buildContext({}, schema, this.props.edit, this.props.create);
            this.setState({
                'masterContext': initContext,
                'masterValid': initValid,
                'masterTypes': initType,
                'masterDisplay': initDisplay,
                'currKey': 0,
                'keyHierarchy': hierarchy,
                'creatingIdx': 0,
                'creatingType': principalTypes[0]
            });
            return;
        }
        ajax.promise(contextID + '?frame=object').then(response => {
            if (response['@id'] && response['@id'] === contextID){
                initContext[0] = buildContext(response, schema, this.props.edit, this.props.create);
                this.setState({
                    'masterContext': initContext,
                    'masterValid': initValid,
                    'masterTypes': initType,
                    'masterDisplay': initDisplay,
                    'currKey': 0,
                    'keyHierarchy': hierarchy,
                    'creatingIdx': 0,
                    'creatingType': principalTypes[0]
                });
            }else{
                // something went wrong with fetching context. Just use an empty object
                initContext[0] = buildContext({}, schema, this.props.edit, this.props.create);
                this.setState({
                    'masterContext': initContext,
                    'masterValid': initValid,
                    'masterTypes': initType,
                    'masterDisplay': initDisplay,
                    'currKey': 0,
                    'keyHierarchy': hierarchy,
                    'creatingIdx': 0,
                    'creatingType': principalTypes[0]
                });
            }
        });
    }

    initCreateObj = (type, newIdx) => {
        this.setState({
            'creatingIdx': newIdx,
            'creatingType': type
        });
    }

    handleAliasChange = (e) => {
        var inputElement = e.target;
        var currValue = inputElement.value;
        this.setState({'creatingAlias': currValue});
    }

    submitAlias = (e) =>{
        e.preventDefault();
        var type = this.state.creatingType;
        var schema = this.props.schemas[type];
        var newIdx = this.state.creatingIdx;
        if(type === null || newIdx === null){
            return;
        }
        var alias = this.state.creatingAlias;
        // check if created object supports aliases
        var hasAlias = schema && schema.properties && schema.properties.aliases;
        if(alias.length > 0 && hasAlias){
            var patt = new RegExp('\\S+:\\S+');
            var regexRes = patt.test(alias);
            if(!regexRes){
                this.setState({
                    'creatingAliasMessage': 'ERROR. Aliases must be formatted as: <text>:<text> (e.g. dcic-lab:42).'
                });
                return;
            }
            for(var key in this.state.masterDisplay){
                if(this.state.masterDisplay[key] === alias){
                    this.setState({
                        'creatingAliasMessage': 'You have already used this alias.'
                    });
                    return;
                }
            }
            // see if the input alias is already being used
            ajax.promise('/' + alias).then(data => {
                if (data && data.title && data.title === "Not Found"){
                    this.createObj(type, newIdx, alias);
                }else{
                    this.setState({
                        'creatingAliasMessage': 'ERROR. That alias is already taken.'
                    });
                    return;
                }
            });
        }
    }

    modifyAlias = (aliases) => {
        var masterDisplay = this.state.masterDisplay;
        var masterTypes = this.state.masterTypes;
        var currKey = this.state.currKey;
        var currAlias = masterDisplay[currKey];
        console.log('-->', aliases, 'CURR:', currAlias);
        // no aliases
        if(aliases === null){
            masterDisplay[currKey] = 'My ' + masterTypes[currKey] + ' ' + currKey;
        }else if(!_.contains(aliases, currAlias)){
            var lastAlias = aliases[aliases.length-1];
            if(lastAlias !== null){
                masterDisplay[currKey] = lastAlias;
            }else{
                masterDisplay[currKey] = 'My ' + masterTypes[currKey] + ' ' + currKey;
            }
        }
        console.log('NEW:', masterDisplay[currKey]);
        this.setState({'masterDisplay': masterDisplay});
    }

    createObj = (type, newIdx, alias) => {
        var contextCopy = this.state.masterContext;
        var validCopy = this.state.masterValid;
        var typesCopy = this.state.masterTypes;
        var parentKeyIdx = this.state.currKey;
        var hierarchy = this.state.keyHierarchy;
        var masterDisplay = this.state.masterDisplay;
        // increase key iter by 1 for a unique key
        // this is used as a key for masterContext, masterValid, and masterTypes
        var keyIdx;
        var newHierarchy;
        if(newIdx === 0){ // initial object creation
            keyIdx = 0;
            newHierarchy = hierarchy;
        }else{
            keyIdx = this.state.keyIter + 1;
            if(newIdx !== keyIdx){
                console.log('ERROR: key index inconsistencies!')
                return;
            }
            newHierarchy = modifyHierarchy(hierarchy, keyIdx, parentKeyIdx);
            validCopy[keyIdx] = 0;
            typesCopy[keyIdx] = type;
        }
        var addAlias = contextCopy[keyIdx] ? contextCopy[keyIdx] : {};
        if(addAlias.aliases){
            addAlias.aliases.push(alias)
        }else{
            addAlias.aliases = [alias];
        }
        console.log('ERROR ON EDIT:', addAlias.aliases);
        contextCopy[keyIdx] = buildContext(addAlias, this.props.schemas[type], true);
        masterDisplay[keyIdx] = alias;
        // get rid of any hanging errors
        for(var i=0; i<this.state.errorCount; i++){
            Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1)});
        }
        this.setState({
            'masterContext': contextCopy,
            'masterValid': validCopy,
            'masterTypes': typesCopy,
            'masterDisplay': masterDisplay,
            'currKey': keyIdx,
            'keyIter': keyIdx,
            'keyHierarchy': newHierarchy,
            'processingFetch': false,
            'errorCount': 0,
            'creatingIdx': null,
            'creatingType': null,
            'creatingAlias': '',
            'creatingAliasMessage': null
        });
    }

    // key is @id for exisiting objs, state key idx for custom objs
    removeObj = (key) => {
        var contextCopy = this.state.masterContext;
        var validCopy = this.state.masterValid;
        var typesCopy = this.state.masterTypes;
        var masterDisplay = this.state.masterDisplay;
        if(masterDisplay[key]){
            var hierarchy = this.state.keyHierarchy;
            var newHierarchy = trimHierarchy(hierarchy, key);
            delete masterDisplay[key];
            if(contextCopy[key]){ // custom object
                delete validCopy[key];
                delete contextCopy[key];
                delete typesCopy[key];
            }
            this.setState({
                'keyHierarchy': newHierarchy,
                'masterDisplay': masterDisplay,
                'masterContext': contextCopy,
                'masterValid': validCopy,
                'masterTypes': typesCopy
            });
        }
    }

    addExistingObj = (path, display) => {
        var parentKeyIdx = this.state.currKey;
        var hierarchy = this.state.keyHierarchy;
        var masterDisplay = this.state.masterDisplay;
        hierarchy = modifyHierarchy(hierarchy, path, parentKeyIdx);
        masterDisplay[path] = display;
        this.setState({
            'keyHierarchy': hierarchy,
            'masterDisplay': masterDisplay
        });
    }

    setMasterState = (key, value) => {
        var newState = this.state;
        if(_.contains(Object.keys(newState),key)){
            if(key === 'currKey' && value !== this.state.currKey){
                // get rid of any hanging errors
                for(var i=0; i<this.state.errorCount; i++){
                    Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1)});
                    newState.errorCount = 0;
                }
                newState.processingFetch = false;
            }
            newState[key] = value;
            this.setState(newState);
        }
    }

    generateValidationButton(){
        var validity = this.state.masterValid[this.state.currKey];
        var style={'marginLeft':'10px', 'marginBottom':'10px', 'width':'100px'};
        // if(this.state.md5Progress && this.state.md5Progress != 100){
        //     return(
        //         <Button bsStyle="info" style={style} disabled>
        //             {'Calculating md5...'}
        //         </Button>
        //     );
        // }
        if(validity == 2){
            return(
                <Button bsSize="xsmall" bsStyle="info" style={style} disabled>
                    {'Validated'}
                </Button>
            );
        }else if(this.state.processingFetch){
            return(
                <Button bsSize="xsmall" bsStyle="info" style={style} disabled>
                    <i className="icon icon-spin icon-circle-o-notch"></i>
                </Button>
            );
        }else if (validity == 0){
            return(
                <Button bsSize="xsmall" bsStyle="info" style={style} onClick={this.testPostNewContext}>
                    {'Validate'}
                </Button>
            );
        }else{
            return(
                <Button bsSize="xsmall" bsStyle="danger" style={style} onClick={this.testPostNewContext}>
                    {'Validate'}
                </Button>
            );
        }
    }

    generatePostButton(){
        var validity = this.state.masterValid[this.state.currKey];
        var style={'marginLeft':'10px', 'marginBottom':'10px', 'width':'100px'};
        if(validity == 2 && !this.state.processingFetch){
            return(
                <Button bsSize="xsmall" bsStyle="success" style={style} onClick={this.realPostNewContext}>
                    {'Submit'}
                </Button>
            );
        }else if(validity == 2 && this.state.processingFetch){
            return(
                <Button bsSize="xsmall" bsStyle="success" style={style} disabled>
                    <i className="icon icon-spin icon-circle-o-notch"></i>
                </Button>
            );
        }else if(validity == 3){
            return(
                <Button bsSize="xsmall" bsStyle="success" style={style} disabled>
                    {'Submitted'}
                </Button>
            );
        }else{
            return(
                <Button bsSize="xsmall" bsStyle="success" style={style} disabled>
                    {'Submit'}
                </Button>
            );
        }
    }

    testPostNewContext = (e) => {
        e.preventDefault();
        this.executePost(this.state.currKey, true);
    }

    realPostNewContext = (e) => {
        e.preventDefault();
        this.executePost(this.state.currKey);
    }

    // must remove nulls, which are used to represent an empty value in the
    // creation process
    removeNullsFromContext = (inKey) => {
        var finalizedContext = JSON.parse(JSON.stringify(this.state.masterContext[inKey]));
        var noNulls = removeNulls(finalizedContext);
        return noNulls;
    }

    executePost = (inKey, test=false) => {
        // function to test a POST of the data or actually POST it.
        // validates if test=true, POSTs if test=false.
        var stateToSet = {}; // hold state
        var masterValid = this.state.masterValid;
        var currType = this.state.masterTypes[inKey];
        var currSchema = this.props.schemas[currType];
        var currContext = this.state.masterContext[inKey];
        // this will always be reset when stateToSet is implemented
        stateToSet.processingFetch = false;
        stateToSet.masterValid = masterValid;
        var lab;
        var award;
        var finalizedContext = this.removeNullsFromContext(inKey);
        // get rid of any hanging errors
        for(var i=0; i<this.state.errorCount; i++){
            Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1)});
            stateToSet.errorCount = 0;
        }
        console.log('contextToPOST:', finalizedContext);
        this.setState({'processingFetch': true});
        ajax.promise('/me?frame=embedded').then(data => {
            if(!data || !data.submits_for || data.submits_for.length == 0){
                console.log('THIS ACCOUNT DOES NOT HAVE SUBMISSION PRIVILEGE');
                masterValid[inKey] = 4;
                this.setState(stateToSet);
                return;
            }
            // use first lab for now
            var submits_for = data.submits_for[0];
            lab = submits_for['@id'] ? submits_for['@id'] : submits_for.link_id.replace(/~/g, "/");
            ajax.promise(lab).then(lab_data => {
                if(!lab || !lab_data.awards || lab_data.awards.length == 0){
                    console.log('THE LAB FOR THIS ACCOUNT LACKS AN AWARD');
                    masterValid[inKey] = 1;
                    this.setState(stateToSet);
                    return;
                }
                // should we really always use the first award?
                award = lab_data.awards[0];
                // if editing, use pre-existing award, lab, and submitted_by
                if(this.props.edit && currContext.award && currContext.lab){
                    finalizedContext.award = currContext.award;
                    finalizedContext.lab = currContext.lab;
                    // an admin is editing. Use the pre-existing submitted_by
                    // otherwise, permissions won't let us change this field
                    if(data.groups && _.contains(data.groups, 'admin')){
                        finalizedContext.submitted_by = currContext.submitted_by;
                    }
                }else{ // use info of person creating/cloning
                    if(currSchema.properties.award){
                        finalizedContext.award = award['@id'] ? award['@id'] : award.link_id.replace(/~/g, "/");
                    }
                    if(currSchema.properties.lab){
                        finalizedContext.lab = lab;
                    }
                }
                // if testing validation, use check_only=True (see /types/base.py)
                var destination = test ? '/' + currType + '/?check_only=True' : '/' + currType;
                var actionMethod = 'POST';
                // see if this is not a test and we're editing
                if(!test && this.props.edit){
                    actionMethod = 'PUT';
                    destination = currContext['@id'];
                    // must add uuid (and accession, if available) to PUT body
                    finalizedContext.uuid = currContext.uuid;
                    // not all objects have accessions
                    if(currContext.accession){
                        finalizedContext.accession = currContext.accession;
                    }
                }
                var payload = JSON.stringify(finalizedContext);
                ajax.promise(destination, actionMethod, {}, payload).then(response => {
                    if (response.status && response.status !== 'success'){ // error
                        masterValid[inKey] = 1;
                        console.log('ERROR IN OBJECT VALIDATION!');
                        var errorList = response.errors || [response.detail] || [];
                        // make an alert for each error description
                        stateToSet.errorCount = errorList.length;
                        for(var i=0; i<errorList.length; i++){
                            var detail = errorList[i].description || errorList[i] || "Unidentified error";
                            if(errorList[i].name && errorList[i].name.length > 0){
                                detail += ('. See ' + errorList[i].name[0] + ' in ' + this.state.masterDisplay[inKey]);
                            }else{
                                detail += ('. See ' + this.state.masterDisplay[inKey]);
                            }
                            Alerts.queue({
                                'title' : "Validation error " + parseInt(i + 1),
                                'message': detail,
                                'style': 'danger'
                            });
                        }
                        setTimeout(layout.animateScrollTo(0), 100);
                        this.setState(stateToSet);
                    }else{
                        var response_data;
                        if(test){
                            console.log('OBJECT SUCCESSFULLY TESTED!');
                            masterValid[inKey] = 2;
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
                            this.props.navigate('/uploads');
                        }else{
                            console.log('ACTION SUCCESSFUL!');
                            alert('Success! Navigating to the object page.');
                            this.props.navigate(destination);
                        }
                    }
                });
            });
        });
    }

    render(){
        console.log('TOP LEVEL STATE:', this.state);
        //hard coded for now
        var currKey = this.state.currKey;
        // see if initialized
        if(!this.state.masterContext || currKey === null){
            return null;
        }
        var aliasModal = this.state.creatingIdx !== null && this.state.creatingType !== null;
        var currType = this.state.masterTypes[currKey];
        var currSchema = this.props.schemas[currType];
        var currContext = this.state.masterContext[currKey];
        // remove context and navigate from this.props
        const{
            context,
            navigate,
            ...others
        } = this.props;
        var currObjDisplay = this.state.masterDisplay[currKey] || currType;
        return(
            <div>
                <Modal show={aliasModal}>
                    <Modal.Header>
                        <Modal.Title>{'Give your new object an alias'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p style={{'marginBottom':'15px'}}>
                            {'Aliases are lab specific identifiers to reference an object. The format is colon separated lab name and lab identifier. (e.g. dcic-lab:42).'}
                        </p>
                        <div className="input-wrapper" style={{'marginBottom':'15px'}}>
                            <input
                                id="aliasInput"
                                type="text"
                                inputMode="latin"
                                autoFocus={true}
                                placeholder={'Enter a new alias'}
                                onChange={this.handleAliasChange}
                            />
                        </div>
                        <Collapse in={this.state.creatingAliasMessage !== null}>
                            <div style={{'marginBottom':'15px', 'color':'#7e4544','fontSize':'1.2em'}}>
                                {this.state.creatingAliasMessage}
                            </div>
                        </Collapse>
                        <Button bsSize="xsmall" bsStyle="success" disabled={this.state.creatingAlias.length == 0} onClick={this.submitAlias}>
                            Submit
                        </Button>
                    </Modal.Body>
                </Modal>
                <div className="clearfix row">
                    <div className="col-sm-5 col-md-5 col-lg-5">
                        <SubmissionTree
                            setMasterState={this.setMasterState}
                            hierarchy={this.state.keyHierarchy}
                            masterValid={this.state.masterValid}
                            masterTypes={this.state.masterTypes}
                            masterDisplay={this.state.masterDisplay}
                            currKey={this.state.currKey}
                            navigationIsOpen={this.state.navigationIsOpen}
                        />
                    </div>
                    <div className="col-sm-7 col-md-7 col-lg-7">
                        <div className="pull-right" style={{'marginTop':'10px'}}>
                            <h3 style={{'display':'inline'}}>{currObjDisplay}</h3>
                            {this.generateValidationButton()}
                            {this.generatePostButton()}
                        </div>
                    </div>
                </div>
                <RoundOneObject
                    {...others}
                    currKey={currKey}
                    keyIter={this.state.keyIter}
                    schema={currSchema}
                    currContext={currContext}
                    modifyMasterContext={this.modifyMasterContext}
                    initCreateObj={this.initCreateObj}
                    removeObj={this.removeObj}
                    addExistingObj={this.addExistingObj}
                    masterDisplay={this.state.masterDisplay}
                    setMasterState={this.setMasterState}
                    modifyAlias={this.modifyAlias}
                />
            </div>
        );
    }
}

/*
Round one view for editing an object. This includes all non-same level
linkTo object relationships and non-file upload fields.
Essentially, this takes data held by the container component and passes it down
to the correct BuildFields
*/
class RoundOneObject extends React.Component{

    constructor(props){
        super(props);
    }

    state = {
        'selectType': null, // type of existing object being selected
        'selectData': null, // context used for existing object selection
        'selectQuery': null, // currently held search query
        'selectField': null, // the actual fieldname that we're selecting for
        'selectArrayIdx': null,
        'fadeState': false
    }

    componentWillReceiveProps(nextProps){
        // scroll to top if worked-on object changes
        if(this.props.currKey !== nextProps.currKey){
            setTimeout(layout.animateScrollTo(0), 100);
            this.setState({'fadeState': true});
        }else{
            this.setState({'fadeState': false});
        }
    }

    modifyNewContext = (field, value, addExistingObj=false, objDelete=false) => {
        var splitField = field.split('.');
        var contextCopy = this.props.currContext;
        var pointer = contextCopy;
        for (var i=0; i<(splitField.length-1); i++){
            if(pointer[splitField[i]]){
                pointer = pointer[splitField[i]];
            } else {
                console.log('PROBLEM CREATING NEW CONTEXT WITH: ', field, value);
                return;
            }
        }
        var prevValue = pointer[splitField[splitField.length-1]];
        if(objDelete){
            this.checkObjectRemoval(value, prevValue);
        }
        if(field === 'aliases'){
            this.props.modifyAlias(value);
        }
        pointer[splitField[splitField.length-1]] = value;
        this.props.modifyMasterContext(this.props.currKey, contextCopy);
        if(addExistingObj){
            this.fetchObjTitle(value);
        }
    }

    fetchObjTitle = (value) => {
        ajax.promise(value).then(data => {
            if (data['display_title']){
                this.props.addExistingObj(value, data['display_title']);
            }else{
                this.props.addExistingObj(value, value);
            }
        });
    }

    checkObjectRemoval = (value, prevValue) =>{
        // If deleting, check array and object cases to see if the removed
        // value is a key to a custom/existing linked object; update top-level
        // state if so.
        // Must repeatedly check for arrays/objects
        if(prevValue instanceof Array){
            prevValue.forEach(function(arrayValue, index){
                if(arrayValue instanceof Array || arrayValue instanceof Object){
                    var nextValue;
                    if(value === null){
                        nextValue = null;
                    }else{
                        // this might be a problem in some edge cases
                        nextValue = value[index];
                    }
                    this.checkObjectRemoval(nextValue, arrayValue);
                }else if(value === null || !_.contains(value, arrayValue)){
                    this.props.removeObj(arrayValue);
                }
            }.bind(this));
        }else if(prevValue instanceof Object){
            Object.keys(prevValue).map(function(key){
                if(prevValue[key] instanceof Array || prevValue[key] instanceof Object){
                    var nextValue;
                    if(value === null){
                        nextValue = null;
                    }else{
                        nextValue = value[key];
                    }
                    this.checkObjectRemoval(nextValue, prevValue[key]);
                }else if(value === null || (prevValue[key] !== null && value[key] === null)){
                    this.props.removeObj(prevValue[key]);
                }
            }.bind(this));
        }else if(value === null){
            this.props.removeObj(prevValue);
        }

    }

    getFieldValue = (field) => {
        if(this.props.currContext.hasOwnProperty(field)){
            return this.props.currContext[field];
        }else{
            return null;
        }
    }

    inPlaceNavigate = (destination) => {
        if(this.state.selectQuery){
            var dest = destination;
            // to clear filters
            if(destination == '/'){
                dest = '?type=' + this.state.selectType
            }
            ajax.promise('/search/' + dest).then(data => {
                if (data && data['@graph']){
                    this.setState({
                        'selectData': data,
                        'selectQuery': dest
                    });
                }else{
                    console.log('Available object failed. See LinkedObj in create.js');
                    this.setState({
                        'selectType': null,
                        'selectData': null,
                        'selectQuery': null,
                        'selectField': null,
                        'selectArrayIdx': null
                    });
                }
            });
        }
    }

    createObj = (type, nestedField, arrayIdx) => {
        if(arrayIdx !== null){
            // we have arrays involved
            // use an array of array indexes and nested field structure
            // made by the BuildFields to set the context correctly.
            var splitField = nestedField.split('.');
            var arrayIdxPointer = 0;
            var contextCopy = this.props.currContext;
            var pointer = contextCopy;
            var newIdx = this.props.keyIter + 1;
            for (var i=0; i<(splitField.length-1); i++){
                if(pointer[splitField[i]]){
                    pointer = pointer[splitField[i]];
                }else{
                    return;
                }
                if(pointer instanceof Array){
                    pointer = pointer[arrayIdx[arrayIdxPointer]];
                    arrayIdxPointer += 1;
                }
            }
            if(pointer[splitField[splitField.length-1]] instanceof Array){
                // move pointer into array
                pointer = pointer[splitField[splitField.length-1]];
                pointer[arrayIdx[arrayIdxPointer]] = newIdx;
            }else{ // must be a dict
                pointer[splitField[splitField.length-1]] = newIdx;
            }
            this.props.modifyMasterContext(this.props.currKey, contextCopy);
            this.props.initCreateObj(type, newIdx);
        }else{
            this.modifyNewContext(this.state.selectField, newIdx);
            this.props.initCreateObj(type, newIdx);
        }
    }

    // use when selecting a new object
    selectObj = (type, data, field, array=null) => {
        setTimeout(layout.animateScrollTo(0), 100);
        this.setState({
            'selectType': type,
            'selectData': data,
            'selectQuery': '?type=' + type,
            'selectField': field,
            'selectArrayIdx': array
        });
        // close navigation menu
        this.props.setMasterState('navigationIsOpen', false);
    }

    // callback passed to Search when selecting existing object
    // when value is null, function is delete
    selectComplete = (value) => {
        if(this.state.selectField){
            if(this.state.selectArrayIdx !== null){
                // we have arrays involved
                // use an array of array indexes and nested field structure
                // made by the BuildFields to set the context correctly.
                var splitField = this.state.selectField.split('.');
                var arrayIdxPointer = 0;
                var contextCopy = this.props.currContext;
                var pointer = contextCopy;
                for (var i=0; i<(splitField.length-1); i++){
                    if(pointer[splitField[i]]){
                        pointer = pointer[splitField[i]];
                    } else {
                        this.setState({
                            'selectType': null,
                            'selectData': null,
                            'selectQuery': null,
                            'selectField': null,
                            'selectArrayIdx': null
                        });
                        return;
                    }
                    if(pointer instanceof Array){
                        pointer = pointer[this.state.selectArrayIdx[arrayIdxPointer]];
                        arrayIdxPointer += 1;
                    }
                }
                if(pointer[splitField[splitField.length-1]] instanceof Array){
                    // move pointer into array
                    pointer = pointer[splitField[splitField.length-1]];
                    pointer[this.state.selectArrayIdx[arrayIdxPointer]] = value;
                }else{ // must be a dict
                    pointer[splitField[splitField.length-1]] = value;
                }
                this.props.modifyMasterContext(this.props.currKey, contextCopy);
                this.fetchObjTitle(value);
            }else{
                this.modifyNewContext(this.state.selectField, value, true);
            }
        }
        this.setState({
            'selectType': null,
            'selectData': null,
            'selectQuery': null,
            'selectField': null,
            'selectArrayIdx': null
        });
    }

    // collect props necessary to build create a BuildField child
    initiateField = (field) => {
        var fieldSchema = object.getNestedProperty(this.props.schema, ['properties', field], true);
        if (!fieldSchema) return null;
        var fieldTip = fieldSchema.description ? fieldSchema.description : null;
        if(fieldSchema.comment){
            fieldTip = fieldTip ? fieldTip + ' ' + fieldSchema.comment : fieldSchema.comment;
        }
        var fieldType = fieldSchema.type ? fieldSchema.type : "text";
        var fieldValue = this.props.currContext[field] || null;
        var fieldTitle = fieldSchema.title || field;
        var enumValues = [];
        var isLinked = false;
        // transform some types...
        if(fieldType == 'string'){
            fieldType = 'text';
        }
        // check if this is an enum
        if(fieldSchema.enum){
            fieldType = 'enum';
            enumValues = fieldSchema.enum;
        }
        // check for linkTo if further down in object or array
        if(fieldType == 'array' || fieldType == 'object'){
            var linkTo = delveObject(fieldSchema);
            if(linkTo){
                isLinked = true;
            }
        }
        // handle a linkTo object on the the top level
        // check if any schema-specific adjustments need to made:
        if(fieldSchema.linkTo){
            fieldType = 'linked object';
            isLinked = true;
        }else if (fieldSchema.attachment && fieldSchema.attachment === true){
            fieldType = 'attachment';
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
            <BuildField
                value={fieldValue}
                key={field}
                schema={fieldSchema}
                field={field}
                fieldType={fieldType}
                fieldTip={fieldTip}
                enumValues={enumValues}
                disabled={false}
                modifyNewContext={this.modifyNewContext}
                modifyFile={null}
                modifyMD5Progess={null}
                md5Progress={null}
                getFieldValue={this.getFieldValue}
                required={required} isLinked={isLinked}
                selectObj={this.selectObj}
                createObj={this.createObj}
                title={fieldTitle}
                edit={this.props.edit}
                create={this.props.create}
                masterDisplay={this.props.masterDisplay}
                setMasterState={this.props.setMasterState}
            />
        );
    }

    render(){
        var schema = this.props.schema;
        var selecting = false;
        if(this.state.selectData !== null){
            selecting = true;
        }
        // get the fields from passed down context
        var fields = Object.keys(this.props.currContext) || [];
        var buildFields = [];
        var linkedObjs = [];
        for (var i=0; i<fields.length; i++){
            var built = this.initiateField(fields[i]);
            if (built && built.props.isLinked){
                linkedObjs.push(built);
            }else if(built){
                buildFields.push(built);
            }
        }
        // sort fields first by requirement and secondly alphabetically
        linkedObjs = sortPropFields(linkedObjs);
        buildFields = sortPropFields(buildFields);
        return(
            <div>
                <Fade in={selecting} transitionAppear={true}>
    				<div>
                        {selecting ?
                            <Search {...this.props}
                                context={this.state.selectData}
                                navigate={this.inPlaceNavigate}
                                selectCallback={this.selectComplete}
                                submissionBase={this.state.selectQuery}/>
                            : null
                        }
                    </div>
                </Fade>
                <Fade in={!selecting || this.state.fadeState} transitionAppear={true}>
    				<div>
                        <RoundOnePanel title='Fields' fields={buildFields} currKey={this.props.currKey}/>
                        <RoundOnePanel title='Linked objects' fields={linkedObjs} currKey={this.props.currKey}/>
                    </div>
                </Fade>
            </div>
        );
    }
}

class RoundOnePanel extends React.Component{
    constructor(props){
        super(props);
    }

    state = {
        'open': false
    }

    componentWillReceiveProps(nextProps){
        // scroll to top if worked-on object changes
        if(this.props.currKey !== nextProps.currKey){
            this.setState({'open': false});
        }
    }

    handleToggle = (e) => {
        e.preventDefault();
        this.setState({'open': !this.state.open});
    }

    render(){
        if(this.props.fields.length == 0){
            return null;
        }
        return(
            <div>
                <h4 className="clearfix page-subtitle submission-field-header">
                    <Button bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                        <i className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                    </Button>
                    <span>
                        {this.props.title}
                    </span>
                </h4>
                <Collapse in={this.state.open}>
                    <div>
                        {this.props.fields}
                    </div>
                </Collapse>
            </div>
        );
    }
}

class RoundTwoObject extends React.Component{
    contextTypes: {
        fetch: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
        navigate: React.PropTypes.func
    }

    constructor(props){
        super(props);
    }

    state = {
        'file': null,
        'md5Progress': null
    }

    modifyFile = (file) =>{
        // function that updates state to contain a file upload
        // not used for all object types
        this.setState({'file':file});
    }

    modifyMD5Progess = (progress) => {
        // set this.state.md5Progress to passed in progress value (should be int)
        this.setState({'md5Progress':progress});
    }

    render(){
        return null;
    }
}

/***** MISC. FUNCIONS *****/

export function buildContext(context, schema, edit=false, create=true){
    // Build context based off an object's and populate values from
    // pre-existing context. Empty fields are given null value
    var built = {};
    var fields = schema['properties'] ? Object.keys(schema['properties']) : [];
    for(var i=0; i<fields.length; i++){
        if(schema.properties[fields[i]]){
            var fieldSchema = object.getNestedProperty(schema, ['properties', fields[i]], true);
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
            if(edit){
                if(!context[fields[i]] || (fieldSchema.ff_clear && fieldSchema.ff_clear == "edit")){
                    built[fields[i]] = null;
                }else{
                    built[fields[i]] = context[fields[i]];
                }
            }else if(!create){ //clone
                if(!context[fields[i]] || (!fieldSchema.ff_clear && fieldSchema.ff_clear == "clone")){
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

// sort a list of BuildFields first by required status, then by title
function sortPropFields(fields){
    var reqFields = [];
    var optFields = [];
    fields.map(function(field){
        if(field.props.required){
            reqFields.push(field);
        }else{
            optFields.push(field);
        }
    });
    reqFields.sort(function(a,b){
        if(a.props.title.toUpperCase() < b.props.title.toUpperCase()) return -1;
        if(a.props.title.toUpperCase() > b.props.title.toUpperCase()) return 1;
        return 0;
    });
    optFields.sort(function(a,b){
        if(a.props.title.toUpperCase() < b.props.title.toUpperCase()) return -1;
        if(a.props.title.toUpperCase() > b.props.title.toUpperCase()) return 1;
        return 0;
    });
    var retFields = reqFields.concat(optFields);
    return retFields;
}

/*
 Function to recursively find whether a json object contains a linkTo field
 anywhere in its nested structure. Returns true if found, false otherwise.
*/
var delveObject = function myself(json){
    var found_obj = false;
    Object.keys(json).forEach(function(key, index){
        if(key == 'linkTo'){
            found_obj = true;
        }else if(json[key] !== null && typeof json[key] === 'object'){
            var test = myself(json[key]);
            if(test){
                found_obj = true;
            }
        }
    });
    return found_obj;
}

// given the parent object key and a new object key, return a version
// of this.state.keyHierarchy that includes the new parent-child relation
// recursive function
var modifyHierarchy = function myself(hierarchy, keyIdx, parentKeyIdx){
    Object.keys(hierarchy).forEach(function(key, index){
        if(key == parentKeyIdx){
            hierarchy[parentKeyIdx][keyIdx] = {};
        }else{
            hierarchy[key] = myself(hierarchy[key], keyIdx, parentKeyIdx);
        }
    });
    return hierarchy
}

// remove given key from hierarchy
var trimHierarchy = function myself(hierarchy, keyIdx){
    if(hierarchy[keyIdx]){
        delete hierarchy[keyIdx];
    }else{
        Object.keys(hierarchy).forEach(function(key, index){
            hierarchy[key] = myself(hierarchy[key], keyIdx);
        });
    }
    return hierarchy;
}

var removeNulls = function myself(context){
    Object.keys(context).forEach(function(key, index){
        if(context[key] === null){
            delete context[key];
        }else if(context[key] instanceof Object){
            context[key] = myself(context[key]);
        }
    });
    return context;
}

class InfoIcon extends React.Component{
    render() {
        if (!this.props.children) return null;
        return (
            <i className="icon icon-info-circle" data-tip={this.props.children}/>
        );
    }
}
