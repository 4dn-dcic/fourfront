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

    /*
    * There are a lot of individual states to keep track of, but most workflow-runs
    * the same way: they are objects where the key is this.state.currKey and the
    * content is some information about the object created.
    * - currKey is an int that is used to index the objects you are creating and
    *   acts as a switch for the states.
    * - masterContext (idx: currKey) stores the context for each new object
    * - masterValid (idx: currKey) stores the validation status for each new object
        0 is unvalidated, 1 is error, 2 is validated, and 3 is submitted.
    * - masterDisplay (idx: currKey) stores the formatted titles for each object
    * - keyIter (type: int) is a reference to the current maximum currKey. Is
    *   used to iterate to add more keys.
    * - currKey (type: int) controls which object we're manipulating.
    * - keyHierarchy (type: obj) nested form of object relationships, where values
    *   are currKey idxs for created objects and @id paths for existing objects.
    * - unusedLinks (idx: currKey) all possible child object types for a given currKey.
    * - processingFetch (type: bool) keeps track of whether top level is processing a request
    * - errorCount (type: int) keeps track of how many validation errors currently exist
    * - creatingIdx (type: int) has to do with alias creation. Value is equal to a currKey
    *   index when currently creating an alias, null otherwise.
    * - creatingType (type: str) similar to creatingIdx, but string object type.
    * - creatingAlias (type: str) stores input when creating an alias
    * - creatingAliasMessage (type: str) stores any error messages to display while
    *   alias creation is occuring.
    * - fullScreen (type: bool) if true, the whole component rendered is the Search
    *   page for pre-existing object selection.
    */
    state = {
        'masterContext': null,
        'masterValid': null,
        'masterTypes': null,
        'masterDisplay': null, // serves to hold navigation-formatted names for objs
        'keyIter': 0, // serves as key versions for child objects. 0 is reserved for principal
        'currKey': null, // start with viewing principle object (key = 0),
        'keyHierarchy': {},
        'unusedLinks': {}, // hold unused LinkTos for each obj key
        'processingFetch': false,
        'errorCount': 0,
        'creatingIdx': null,
        'creatingType': null,
        'creatingAlias': '',
        'creatingAliasMessage': null,
        'fullScreen': false
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

    modifyMasterContext = (objKey, newContext) => {
        // function that modifies new context and sets validation state whenever
        // a modification occurs. Is passed down to child elements representing
        // individual fields
        var contextCopy = this.state.masterContext;
        var validCopy = this.state.masterValid;
        contextCopy[objKey] = newContext;
        validCopy[objKey] = 0;
        this.setState({
            'masterContext': contextCopy,
            'masterValid': validCopy
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
        var initUnused = {};
        var unusedList = [];
        var creatingIdx = 0;
        var creatingType = principalTypes[0];
        var schema = schemas[principalTypes[0]];
        var hierarchy = this.state.keyHierarchy;
        hierarchy[0] = {};
        // if @id cannot be found or we are creating from scratch, start with empty fields
        if(!contextID || this.props.create){
            initContext[0] = buildContext({}, schema, unusedList, this.props.edit, this.props.create);
            initUnused[0] = unusedList;
        }else{
            ajax.promise(contextID + '?frame=object').then(response => {
                if (response['@id'] && response['@id'] === contextID){
                    initContext[0] = buildContext(response, schema, unusedList, this.props.edit, this.props.create);
                    initUnused[0] = unusedList;
                    if(this.props.edit && response.aliases && response.aliases.length > 0){
                        // we already have an alias for editing, so use it for title
                        // setting creatingIdx and creatingType to null prevents alias creation
                        creatingIdx = null;
                        creatingType = null;
                        initDisplay[0] = response.aliases[0];
                    }
                    this.setState({
                        'masterContext': initContext,
                        'masterValid': initValid,
                        'masterTypes': initType,
                        'masterDisplay': initDisplay,
                        'currKey': 0,
                        'keyHierarchy': hierarchy,
                        'unusedLinks': initUnused,
                        'creatingIdx': creatingIdx,
                        'creatingType': creatingType
                    });
                    return;
                }else{
                    // something went wrong with fetching context. Just use an empty object
                    initContext[0] = buildContext({}, schema, unusedList, this.props.edit, this.props.create);
                    initUnused[0] = unusedList;
                }

            });
        }
        this.setState({
            'masterContext': initContext,
            'masterValid': initValid,
            'masterTypes': initType,
            'masterDisplay': initDisplay,
            'currKey': 0,
            'keyHierarchy': hierarchy,
            'unusedLinks': initUnused,
            'creatingIdx': creatingIdx,
            'creatingType': creatingType
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

    modifyAlias = () => {
        var masterDisplay = this.state.masterDisplay;
        var masterTypes = this.state.masterTypes;
        var currKey = this.state.currKey;
        var currAlias = masterDisplay[currKey];
        var aliases = this.state.masterContext[currKey].aliases || null;
        // no aliases
        if(aliases === null || aliases === []){
            masterDisplay[currKey] = 'My ' + masterTypes[currKey] + ' ' + currKey;
        }else if(!_.contains(aliases, currAlias)){
            var lastAlias = aliases[aliases.length-1];
            if(lastAlias !== null){
                masterDisplay[currKey] = lastAlias;
            }else{
                masterDisplay[currKey] = 'My ' + masterTypes[currKey] + ' ' + currKey;
            }
        }
        this.setState({'masterDisplay': masterDisplay});
    }

    createObj = (type, newIdx, alias) => {
        var contextCopy = this.state.masterContext;
        var validCopy = this.state.masterValid;
        var typesCopy = this.state.masterTypes;
        var parentKeyIdx = this.state.currKey;
        var hierarchy = this.state.keyHierarchy;
        var masterDisplay = this.state.masterDisplay;
        var unusedCopy = this.state.unusedLinks;
        var unusedList = [];
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
        contextCopy[keyIdx] = buildContext(addAlias, this.props.schemas[type], unusedList, true);
        // remove the new object type from parent's unusedList
        if(_.contains(unusedCopy[parentKeyIdx], type)){
            var rmIdx = unusedCopy[parentKeyIdx].indexOf(type);
            if(rmIdx > -1){
                unusedCopy[parentKeyIdx].splice(rmIdx,1)
            }
        }
        unusedCopy[keyIdx] = unusedList;
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
            'unusedLinks': unusedCopy,
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
        var unusedCopy = this.state.unusedLinks;
        if(masterDisplay[key]){
            var hierarchy = this.state.keyHierarchy;
            var newHierarchy = trimHierarchy(hierarchy, key);
            if(unusedCopy[key]){
                delete unusedCopy[key];
            }
            // add the deleted type back to the unused links of the current object
            if(!_.contains(unusedCopy[this.state.currKey], typesCopy[key])){
                unusedCopy[this.state.currKey].push(typesCopy[key]);
            }
            delete typesCopy[key];
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

    addExistingObj = (path, display, type) => {
        var parentKeyIdx = this.state.currKey;
        var hierarchy = this.state.keyHierarchy;
        var masterDisplay = this.state.masterDisplay;
        var masterTypes = this.state.masterTypes;
        var unusedCopy = this.state.unusedLinks;
        hierarchy = modifyHierarchy(hierarchy, path, parentKeyIdx);
        masterDisplay[path] = display;
        masterTypes[path] = type;
        if(_.contains(unusedCopy[parentKeyIdx], type)){
            var rmIdx = unusedCopy[parentKeyIdx].indexOf(type);
            if(rmIdx > -1){
                unusedCopy[parentKeyIdx].splice(rmIdx,1)
            }
        }
        this.setState({
            'keyHierarchy': hierarchy,
            'masterDisplay': masterDisplay,
            'masterTypes': masterTypes,
            'unusedLinks': unusedCopy
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
        var style={'width':'100px'};
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
        var style={'width':'100px','marginLeft':'10px'};
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
        var navCol = this.state.fullScreen ? 'submission-hidden-nav' : 'col-sm-2';
        var bodyCol = this.state.fullScreen ? 'col-sm-12' : 'col-sm-10';
        var headerStyle = {'marginTop':'10px', 'marginBottom':'10px'};
        if(this.state.fullScreen){
            headerStyle.display = 'none';
        }
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
                        <Modal.Title>{'Give your new ' + currType +' an alias'}</Modal.Title>
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
                    <div className={navCol}>
                        <SubmissionTree
                            setMasterState={this.setMasterState}
                            hierarchy={this.state.keyHierarchy}
                            masterValid={this.state.masterValid}
                            masterTypes={this.state.masterTypes}
                            masterDisplay={this.state.masterDisplay}
                            currKey={this.state.currKey}
                            unusedLinks={this.state.unusedLinks}
                        />
                    </div>
                    <div className={bodyCol}>
                        <div style={headerStyle}>
                            <h3 className="submission-working-title">
                                <span className='working-subtitle'>
                                    {currType}
                                </span>
                                <span>
                                    {this.state.masterDisplay[currKey]}
                                </span>
                            </h3>
                            <div className="pull-right">
                                {this.generateValidationButton()}
                                {this.generatePostButton()}
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
                </div>
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

    /*
    * State in this component mostly has to do with selection of existing objs
    * - selectType (type: str) type of existing object being selected (i.e. ExperimentHiC).
    * - selectData (type: obj) initial collection context fed to Search, given by
    *   LinkedObj in submission-fields.js.
    * - selectQuery (type: str) Search query held by this component for in-place navigation
    * - selectField (type: str) actual fieldname that we're selecting the existing obj for.
    *   may be nested in the case of subobjects, e.g. experiments_in_set.experiment
    * - arrayIdx (type: arr) list of int numbers keeping track of list positions of the
    *   object we're selecting for. Since you can have arrays within arrays, one
    *   int won't do. Example: [1,2] would mean the current field is the second item
    *   within the first item of the array given by the top level field. When null, no arrays involved.
    */
    state = {
        'selectType': null, // type of existing object being selected
        'selectData': null, // context used for existing object selection
        'selectQuery': null, // currently held search query
        'selectField': null, // the actual fieldname that we're selecting for. May be given in nested format for embe
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

    // Takes a field and value and modifies the masterContext held in parent.
    // if objDelete is true, check to see if the value could be an object
    // getting removed. If field == 'aliases', change masterDisplay to reflect
    // the new alias name.
    modifyNewContext = (field, value, fieldType, arrayIdx=null, type=null) => {
        var splitField = field.split('.');
        var arrayIdxPointer = 0;
        var contextCopy = this.props.currContext;
        var pointer = contextCopy;
        if(fieldType === 'new linked object'){
            value = this.props.keyIter + 1;
        }
        var prevValue = null;
        for (var i=0; i<(splitField.length-1); i++){
            if(pointer[splitField[i]]){
                pointer = pointer[splitField[i]];
            }else{
                console.log('PROBLEM CREATING NEW CONTEXT WITH: ', field, value);
                return;
            }
            if(pointer instanceof Array){
                pointer = pointer[arrayIdx[arrayIdxPointer]];
                arrayIdxPointer += 1;
            }
        }
        if(pointer[splitField[splitField.length-1]] instanceof Array && fieldType !== 'array'){
            // move pointer into array
            pointer = pointer[splitField[splitField.length-1]];
            prevValue = pointer[arrayIdx[arrayIdxPointer]];
            if(value === null){ // delete this array item
                pointer.splice(arrayIdx[arrayIdxPointer], 1);
            }else{
                pointer[arrayIdx[arrayIdxPointer]] = value;
            }
        }else{ // value we're trying to set is not inside an array at this point
            var prevValue = pointer[splitField[splitField.length-1]];
            pointer[splitField[splitField.length-1]] = value;
        }
        // actually change value
        this.props.modifyMasterContext(this.props.currKey, contextCopy);
        if(fieldType === 'new linked object'){
            // value is new key index in this case
            this.props.initCreateObj(type, value);
        }
        if(fieldType === 'linked object'){
            this.checkObjectRemoval(value, prevValue);
        }
        if(field === 'aliases'){
            this.props.modifyAlias();
        }
    }

    fetchObjTitle = (value, type) => {
        ajax.promise(value).then(data => {
            if (data['display_title']){
                this.props.addExistingObj(value, data['display_title'], type);
            }else{
                this.props.addExistingObj(value, value, type);
            }
        });
    }

    checkObjectRemoval = (value, prevValue) => {
         if(value === null){
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

    // passed as the navigation function to search
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
                    this.props.setMasterState('fullScreen', false);
                }
            });
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
        this.props.setMasterState('fullScreen', true);
    }

    // callback passed to Search when selecting existing object
    // when value is null, function is delete
    selectComplete = (value) => {
        var isRepeat = false;
        var current = this.props.currContext[this.state.selectField];
        if(current instanceof Array && _.contains(Object.keys(current), value)){
            isRepeat = true;
        }
        if(this.state.selectField && !isRepeat){
            this.modifyNewContext(this.state.selectField, value, 'existing linked object', this.state.selectArrayIdx);
            this.fetchObjTitle(value, this.state.selectType);
        }else{
            this.modifyNewContext(this.state.selectField, null, 'existing linked object', this.state.selectArrayIdx);
        }
        this.setState({
            'selectType': null,
            'selectData': null,
            'selectQuery': null,
            'selectField': null,
            'selectArrayIdx': null
        });
        this.props.setMasterState('fullScreen', false);
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
            if(linkTo !== null){
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
                nestedField={field}
                enumValues={enumValues}
                disabled={false}
                modifyNewContext={this.modifyNewContext}
                modifyFile={null}
                modifyMD5Progess={null}
                md5Progress={null}
                getFieldValue={this.getFieldValue}
                required={required}
                isLinked={isLinked}
                selectObj={this.selectObj}
                title={fieldTitle}
                arrayIdx={null}
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
        var fields = this.props.currContext ? Object.keys(this.props.currContext) : [];
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

export function buildContext(context, schema, objList=null, edit=false, create=true){
    // Build context based off an object's and populate values from
    // pre-existing context. Empty fields are given null value
    // All linkTo fields are added to objList
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
            if(objList !== null){
                var linked = delveObject(fieldSchema);
                if(linked !== null && !_.contains(objList, linked)){
                    objList.push(linked);
                }
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
 anywhere in its nested structure. Returns objec type if found, null otherwise.
*/
var delveObject = function myself(json){
    var found_obj = null;
    Object.keys(json).forEach(function(key, index){
        if(key == 'linkTo'){
            found_obj = json[key];
        }else if(json[key] !== null && typeof json[key] === 'object'){
            var test = myself(json[key]);
            if(test !== null){
                found_obj = test;
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
