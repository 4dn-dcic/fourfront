'use strict';
var React = require('react');
var globals = require('../globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide, layout } = require('../util');
var {getS3UploadUrl, s3UploadFile} = require('../util/aws');
var { DropdownButton, Button, MenuItem, Panel, Table, Collapse, Fade, Modal} = require('react-bootstrap');
var makeTitle = require('../item-pages/item').title;
var Alerts = require('../alerts');
var Search = require('../search').Search;
var getLargeMD5 = require('../util/file-utility').getLargeMD5;
var ReactTooltip = require('react-tooltip');
import SubmissionTree from './expandable-tree';
import BuildField from './submission-fields';

// global variable holding hard-coded object optiosn for ambiguous linkTos
var linkToLookup = {
    'Experiment': ['ExperimentHiC', 'ExperimentMic', 'ExperimentCaptureC', 'ExperimentRepliseq'],
    'ExperimentSet': ['ExperimentSet', 'ExperimentSetReplicate'],
    'File': ['FileCalibration', 'FileFasta', 'FileFastq', 'FileProcessed', 'FileReference'],
    'FileSet': ['FileSet', 'FileSetCalibration'],
    'Individual': ['IndividualHuman', 'IndividualMouse'],
    'Treatment': ['TreatmentChemical', 'TreatmentRnai']
};

/*
Key container component for Submission components.
Holds object values for all downstream components and owns the methods
for submitting data. Passes the appropriate data downwards to the individual
object views.
*/
export default class SubmissionView extends React.Component{

    constructor(props){
        super(props);
        /*
        * *** DETAIL ON THIS.STATE ***
        * There are a lot of individual states to keep track of, but most workflow-runs
        * the same way: they are objects where the key is this.state.currKey and the
        * content is some information about the object created.
        * - currKey is an int that is used to index the objects you are creating and
        *   acts as a switch for the states.
        * - keyContext (idx: currKey) stores the context for each new object
        * - keyValid (idx: currKey) stores the validation status for each new object
            0 is cannot yet validate (incomplete children), 1 is ready to validate,
            2 is validation error, 3 is successfully validated, 4 is submitted
        * - keyDisplay (idx: currKey) stores the formatted titles for each object
        * - keyComplete (idx: currKey) stores completed custom object's @id path by key.
        * - keyIter (type: int) is a reference to the current maximum currKey. Is
        *   used to iterate to add more keys.
        * - currKey (type: int) controls which object we're manipulating.
        * - keyHierarchy (type: obj) nested form of object relationships, where values
        *   are currKey idxs for created objects and @id paths for existing objects.
        * - keyUnused (idx: currKey) all possible child object types for a given currKey.
            Stored as schema title, or schema LinkTo if not present.
        * - keyLinks (idx: currKey) holds the corresponding keyUnused field for each key.
        * - processingFetch (type: bool) keeps track of whether top level is processing a request
        * - errorCount (type: int) keeps track of how many validation errors currently exist
        * - ambiguousIdx (type: int) has to do with linkTo selection when multiple object
            types are associated with a single linkTo (example: File -> FileProcessed, FileFastq...)
        * - ambiguousType (type: str) originally selected ambiguous linkTo type
        * - ambiguousSelected (type: str) selected type to resolve ambiguity
        * - creatingIdx (type: int) has to do with alias creation. Value is equal to a currKey
        *   index when currently creating an alias, null otherwise.
        * - creatingType (type: str) similar to creatingIdx, but string object type.
        * - creatingLink (type: str) similar to creatingIdx, but string link type.
        * - creatingAlias (type: str) stores input when creating an alias
        * - creatingAliasMessage (type: str) stores any error messages to display while
        *   alias creation is occuring.
        * - fullScreen (type: bool) if true, the whole component rendered is the Search
        *   page for pre-existing object selection.
        * - md5Progress (type: int) md5 percentage complete for uploading files.
            Equals null if no current md5 calcuation.
        * - roundTwo (type: bool) begins false, true only when first round submissions
            is done AND there are second round submission fields.
        * - roundTwoKeys (type: array) list of key idxs that need round two submission
        * - file (type: object) holds currently uploading file info (round two)
        */
        this.state = {
            'keyContext': null,
            'keyValid': null,
            'keyTypes': null,
            'keyDisplay': null, // serves to hold navigation-formatted names for objs
            'keyComplete': {}, // init to empty dict b/c objs cannot be complete on initialization
            'keyIter': 0, // serves as key versions for child objects. 0 is reserved for principal
            'currKey': null, // start with viewing principle object (key = 0),
            'keyHierarchy': {},
            'keyUnused': {}, // hold unused LinkTos for each obj key
            'keyLinks': {}, // associates each non-primary key with a field
            'processingFetch': false,
            'errorCount': 0,
            'ambiguousIdx': null,
            'ambiguousType': null,
            'ambiguousSelected': null,
            'creatingIdx': null,
            'creatingType': null,
            'creatingLink': null,
            'creatingAlias': '',
            'creatingAliasMessage': null,
            'fullScreen': false,
            'md5Progress': null,
            'roundTwo': false,
            'roundTwoKeys': [],
            'file': null
        }
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

    // function that modifies new context and sets validation state whenever
    // a modification occurs. Is passed down to child elements representing
    // individual fields
    modifyKeyContext = (objKey, newContext) => {
        var contextCopy = this.state.keyContext;
        var validCopy = this.state.keyValid;
        contextCopy[objKey] = newContext;
        validCopy[objKey] = this.findValidationState(objKey);
        this.setState({
            'keyContext': contextCopy,
            'keyValid': validCopy
        });
    }

    // use searchHierarchy() to see if the children of the given key
    // contain any un-submitted custom objects. If they do, return
    // 1 (ready to validate). Otherwise return 0 (not ready to validate)
    findValidationState = (keyIdx) => {
        var hierarchy = JSON.parse(JSON.stringify(this.state.keyHierarchy));
        var keyHierarchy = searchHierarchy(hierarchy, keyIdx);
        if(keyHierarchy === null) return 0;
        var validationReturn = 1;
        Object.keys(keyHierarchy).forEach(function(key, index){
            if(!isNaN(key)){
                if(!this.state.keyComplete[key] && this.state.keyContext[key]){
                    validationReturn = 0;
                }
            }
        }.bind(this));
        return validationReturn;
    }

    // we need the frame=object context for create, so fetch this
    initializePrincipal = (context, schemas) => {
        var initContext = {};
        var contextID = context['@id'] || null;
        var principalTypes = this.props.context['@type'];
        var initType = {0: principalTypes[0]};
        var initValid = {0: 1};
        var principalDisplay = 'New ' + principalTypes[0];
        var initDisplay = {0: principalDisplay};
        var initUnused = {};
        var unusedList = [];
        var schema = schemas[principalTypes[0]];
        var hierarchy = this.state.keyHierarchy;
        var existingAlias = false;
        hierarchy[0] = {};
        // if @id cannot be found or we are creating from scratch, start with empty fields
        if(!contextID || this.props.create){
            initContext[0] = buildContext({}, schema, unusedList, this.props.edit, this.props.create);
            initUnused[0] = unusedList;
            this.setState({
                'keyContext': initContext,
                'keyValid': initValid,
                'keyTypes': initType,
                'keyDisplay': initDisplay,
                'currKey': 0,
                'keyHierarchy': hierarchy,
                'keyUnused': initUnused
            });
            this.initCreateObj(principalTypes[0], 0, 'Primary Object');
        }else{
            ajax.promise(contextID + '?frame=object').then(response => {
                if (response['@id'] && response['@id'] === contextID){
                    initContext[0] = buildContext(response, schema, unusedList, this.props.edit, this.props.create);
                    initUnused[0] = unusedList;
                    if(this.props.edit && response.aliases && response.aliases.length > 0){
                        // we already have an alias for editing, so use it for title
                        // setting creatingIdx and creatingType to null prevents alias creation
                        initDisplay[0] = response.aliases[0];
                        existingAlias = true;
                    }
                }else{
                    // something went wrong with fetching context. Just use an empty object
                    initContext[0] = buildContext({}, schema, unusedList, this.props.edit, this.props.create);
                    initUnused[0] = unusedList;
                }
                this.setState({
                    'keyContext': initContext,
                    'keyValid': initValid,
                    'keyTypes': initType,
                    'keyDisplay': initDisplay,
                    'currKey': 0,
                    'keyHierarchy': hierarchy,
                    'keyUnused': initUnused,
                    'keyLinks': initLinks
                });
                this.initCreateObj(principalTypes[0], 0, 'Primary Object', existingAlias);
            });
        }
    }

    initCreateObj = (type, newIdx, newLink, existingAlias=false) => {
        // check to see if we have an ambiguous linkTo type.
        // this means there could be multiple types of linked objects for a
        // given type. let the user choose one.
        if(this.props.schemas){
            if(type in linkToLookup){
                // ambiguous linkTo type found
                this.setState({
                    'ambiguousIdx': newIdx,
                    'ambiguousType': type,
                    'ambiguousSelected': null,
                    'creatingLink': newLink
                });
            }else{
                this.initCreateAlias(type, newIdx, newLink, existingAlias);
            }
        }
    }

    initCreateAlias = (type, newIdx, newLink, existingAlias) => {
        // don't prompt alias input if an alias already exists or not in schema
        if(!existingAlias && this.props.schemas){
            var schema = this.props.schemas[type] || null;
            if(schema && schema.properties.aliases){
                this.setState({
                    'ambiguousIdx': null,
                    'ambiguousType': null,
                    'ambiguousSelected': null,
                    'creatingIdx': newIdx,
                    'creatingType': type,
                    'creatingLink': newLink
                });
            }else{ // schema doesn't support aliases
                var fallbackAlias = 'My ' + type + ' ' + newIdx;
                this.createObj(type, newIdx, newLink, fallbackAlias);
            }
        }
    }

    submitAmbiguousType = (e) => {
        e.preventDefault();
        var type = this.state.ambiguousSelected;
        var schema = this.props.schemas[type];
        var newIdx = this.state.ambiguousIdx;
        var newLink = this.state.creatingLink;
        // safety check to ensure schema exists for selected type
        if(schema && type){
            this.initCreateAlias(type, newIdx, newLink, false);
        }else{
            // abort
            this.setState({
                'ambiguousIdx': null,
                'ambiguousType': null,
                'ambiguousSelected': null
            });
        }
    }

    buildAmbiguousEnumEntry = (val) => {
        return(
            <MenuItem key={val} title={val || ''} eventKey={val} onSelect={this.handleTypeSelection}>
                {val || ''}
            </MenuItem>
        );
    }

    handleTypeSelection = (e) => {
        this.setState({
            'ambiguousSelected': e
        });
    }

    handleAliasChange = (e) => {
        var inputElement = e.target;
        var currValue = inputElement.value;
        this.setState({'creatingAlias': currValue});
    }

    submitAlias = (e) => {
        e.preventDefault();
        var type = this.state.creatingType;
        var schema = this.props.schemas[type];
        var newIdx = this.state.creatingIdx;
        var newLink = this.state.creatingLink;
        if(type === null || newIdx === null || newLink === null){
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
            for(var key in this.state.keyDisplay){
                if(this.state.keyDisplay[key] === alias){
                    this.setState({
                        'creatingAliasMessage': 'You have already used this alias.'
                    });
                    return;
                }
            }
            // see if the input alias is already being used
            ajax.promise('/' + alias).then(data => {
                if (data && data.title && data.title === "Not Found"){
                    this.createObj(type, newIdx, newLink, alias);
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
        var keyDisplay = this.state.keyDisplay;
        var keyTypes = this.state.keyTypes;
        var currKey = this.state.currKey;
        var currAlias = keyDisplay[currKey];
        var aliases = this.state.keyContext[currKey].aliases || null;
        // no aliases
        if(aliases === null || (aliases instanceof Array && aliases.length == 0)){
            keyDisplay[currKey] = 'My ' + keyTypes[currKey] + ' ' + currKey;
        }else if(!_.contains(aliases, currAlias)){
            var lastAlias = aliases[aliases.length-1];
            if(lastAlias !== null){
                keyDisplay[currKey] = lastAlias;
            }else{
                keyDisplay[currKey] = 'My ' + keyTypes[currKey] + ' ' + currKey;
            }
        }
        this.setState({'keyDisplay': keyDisplay});
    }

    createObj = (type, newIdx, newLink, alias) => {
        var contextCopy = this.state.keyContext;
        var validCopy = this.state.keyValid;
        var typesCopy = this.state.keyTypes;
        var parentKeyIdx = this.state.currKey;
        var hierarchy = this.state.keyHierarchy;
        var keyDisplay = this.state.keyDisplay;
        var unusedCopy = this.state.keyUnused;
        var linksCopy = this.state.keyLinks;
        var unusedList = [];
        // increase key iter by 1 for a new unique key
        var keyIdx;
        var newHierarchy;
        if(newIdx === 0){ // initial object creation
            keyIdx = 0;
            newHierarchy = hierarchy;
        }else{
            keyIdx = this.state.keyIter + 1;
            if(newIdx !== keyIdx){
                console.log('ERROR: KEY INDEX INCONSISTENCY!');
                return;
            }
            newHierarchy = modifyHierarchy(hierarchy, keyIdx, parentKeyIdx);
            validCopy[keyIdx] = 1; // new object has no incomplete children yet
            validCopy[parentKeyIdx] = 0; // parent is now not ready for validation
            typesCopy[keyIdx] = type;
        }
        var contextWithAlias = (contextCopy && contextCopy[keyIdx]) ? contextCopy[keyIdx] : {};
        if(contextWithAlias.aliases){
            contextWithAlias.aliases.push(alias)
        }else{
            contextWithAlias.aliases = [alias];
        }
        contextCopy[keyIdx] = buildContext(contextWithAlias, this.props.schemas[type], unusedList, true, false);
        // remove the new object type from parent's unusedList
        if(_.contains(unusedCopy[parentKeyIdx], newLink)){
            var rmIdx = unusedCopy[parentKeyIdx].indexOf(newLink);
            if(rmIdx > -1){
                unusedCopy[parentKeyIdx].splice(rmIdx,1)
            }
        }
        unusedCopy[keyIdx] = unusedList;
        linksCopy[keyIdx] = newLink;
        keyDisplay[keyIdx] = alias;
        // get rid of any hanging errors
        for(var i=0; i<this.state.errorCount; i++){
            Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1)});
        }
        this.setState({
            'keyContext': contextCopy,
            'keyValid': validCopy,
            'keyTypes': typesCopy,
            'keyDisplay': keyDisplay,
            'currKey': keyIdx,
            'keyIter': keyIdx,
            'keyHierarchy': newHierarchy,
            'keyUnused': unusedCopy,
            'keyLinks': linksCopy,
            'processingFetch': false,
            'errorCount': 0,
            'ambiguousIdx': null,
            'ambiguousType': null,
            'ambiguousSelected': null,
            'creatingIdx': null,
            'creatingType': null,
            'creatingLink': null,
            'creatingAlias': '',
            'creatingAliasMessage': null
        });
    }

    // key is @id for exisiting objs, state key idx for custom objs
    removeObj = (key) => {
        var contextCopy = this.state.keyContext;
        var validCopy = this.state.keyValid;
        var typesCopy = this.state.keyTypes;
        var keyDisplay = this.state.keyDisplay;
        var keyComplete = this.state.keyComplete;
        var unusedCopy = this.state.keyUnused;
        var linksCopy = this.state.keyLinks;
        var roundTwoCopy = this.state.roundTwoKeys.slice();
        var hierarchy = this.state.keyHierarchy;
        var dummyHierarchy = JSON.parse(JSON.stringify(hierarchy));
        // find hierachy below the object being deleted
        dummyHierarchy = searchHierarchy(dummyHierarchy, key);
        // get a list of all keys to remove
        var toDelete = flattenHierarchy(dummyHierarchy);
        toDelete.push(key); // add this key
        console.log('DELETING:', toDelete);
        // trimming the hierarchy effectively removes objects from creation process
        var newHierarchy = trimHierarchy(hierarchy, key);
        // for housekeeping, remove the keys from keyUnused, keyLinks, and keyComplete
        if(key in linksCopy){
            var delLink = linksCopy[key];
            // add the deleted type back to the unused links of the current object
            if(!_.contains(unusedCopy[this.state.currKey], delLink)){
                unusedCopy[this.state.currKey].push(delLink);
            }
        }
        for(var i=0; i<toDelete.length; i++){
            // only remove creation data for non-sumbitted, non-preexisiting objs
            if(!isNaN(toDelete[i])){
                // remove key from roundTwoKeys if necessary
                // NOTE: submitted custom objects will NOT be removed from this
                // after deletion. Still give user opportunity for second round edits
                if(_.contains(roundTwoCopy, toDelete[i])){
                    var rmIdx = roundTwoCopy.indexOf(toDelete[i]);
                    if(rmIdx > -1){
                        roundTwoCopy.splice(rmIdx,1)
                    }
                }
                delete typesCopy[toDelete[i]];
                delete validCopy[toDelete[i]];
                delete contextCopy[toDelete[i]];
                delete typesCopy[toDelete[i]];
                delete linksCopy[toDelete[i]];
                delete unusedCopy[toDelete[i]];
                delete keyComplete[toDelete[i]];
            }
        }
        this.setState({
            'keyHierarchy': newHierarchy,
            'keyDisplay': keyDisplay,
            'keyContext': contextCopy,
            'keyValid': validCopy,
            'keyTypes': typesCopy,
            'keyLinks': linksCopy,
            'keyUnused': unusedCopy,
            'roundTwoKeys': roundTwoCopy
        });
    }

    addExistingObj = (path, display, type, newLink) => {
        var parentKeyIdx = this.state.currKey;
        var hierarchy = this.state.keyHierarchy;
        var keyDisplay = this.state.keyDisplay;
        var keyTypes = this.state.keyTypes;
        var unusedCopy = this.state.keyUnused;
        var linksCopy = this.state.keyLinks;
        hierarchy = modifyHierarchy(hierarchy, path, parentKeyIdx);
        keyDisplay[path] = display;
        keyTypes[path] = type;
        linksCopy[path] = newLink;
        if(_.contains(unusedCopy[parentKeyIdx], newLink)){
            var rmIdx = unusedCopy[parentKeyIdx].indexOf(newLink);
            if(rmIdx > -1){
                unusedCopy[parentKeyIdx].splice(rmIdx,1)
            }
        }
        this.setState({
            'keyHierarchy': hierarchy,
            'keyDisplay': keyDisplay,
            'keyTypes': keyTypes,
            'keyUnused': unusedCopy,
            'keyLinks': linksCopy
        });
    }

    setKeyState = (key, value) => {
        var newState = this.state;
        if(key in newState){
            // this means we're navigating to a new object if true
            if(key === 'currKey' && value !== this.state.currKey){
                var keyValid = this.state.keyValid;
                // if current key is ready for validation, first try that
                // but suppress warning messages
                if(keyValid[this.state.currKey] == 1){
                    this.submitObject(this.state.currKey, true, true);
                }
                // get rid of any hanging errors
                for(var i=0; i<this.state.errorCount; i++){
                    Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1)});
                    newState.errorCount = 0;
                }
                newState.processingFetch = false;
                // see if newly-navigated obj is ready for validation
                if(keyValid[value] == 0){
                    var validState = this.findValidationState(value);
                    if(validState == 1){
                        keyValid[value] = 1;
                        newState['keyValid'] = keyValid;
                    }
                }
            }
            newState[key] = value;
            this.setState(newState);
        }
    }

    generateValidationButton(){
        var validity = this.state.keyValid[this.state.currKey];
        var style={'width':'100px'};
        if(this.state.md5Progress && this.state.md5Progress != 100){
            return(
                <Button bsStyle="info" style={style} disabled>
                    {'Calculating md5'}
                </Button>
            );
        }else if(validity == 3 || validity == 4){
            return(
                <Button bsSize="xsmall" bsStyle="info" style={style} disabled>
                    {'Validated'}
                </Button>
            );
        }else if(this.state.processingFetch){
            if (validity == 2){
                return(
                    <Button bsSize="xsmall" bsStyle="danger" style={style} disabled>
                        <i className="icon icon-spin icon-circle-o-notch"></i>
                    </Button>
                );
            }else{
                return(
                    <Button bsSize="xsmall" bsStyle="info" style={style} disabled>
                        <i className="icon icon-spin icon-circle-o-notch"></i>
                    </Button>
                );
            }
        }else if (validity == 2){
            return(
                <Button bsSize="xsmall" bsStyle="danger" style={style} onClick={this.testPostNewContext}>
                    {'Validate'}
                </Button>
            );
        }else if (validity == 1){
            return(
                <Button bsSize="xsmall" bsStyle="info" style={style} onClick={this.testPostNewContext}>
                    {'Validate'}
                </Button>
            );
        }else{
            return(
                <Button bsSize="xsmall" bsStyle="info" style={style} disabled>
                    {'Validate'}
                </Button>
            );
        }
    }

    generatePostButton(){
        var validity = this.state.keyValid[this.state.currKey];
        var style={'width':'100px','marginLeft':'10px'};
        if(validity == 3 && !this.state.processingFetch){
            return(
                <Button bsSize="xsmall" bsStyle="success" style={style} onClick={this.realPostNewContext}>
                    {'Submit'}
                </Button>
            );
        }else if(validity == 3 && this.state.processingFetch){
            return(
                <Button bsSize="xsmall" bsStyle="success" style={style} disabled>
                    <i className="icon icon-spin icon-circle-o-notch"></i>
                </Button>
            );
        }else if(validity == 4){
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
        this.submitObject(this.state.currKey, true);
    }

    realPostNewContext = (e) => {
        e.preventDefault();
        this.submitObject(this.state.currKey);
    }

    // must remove nulls, which are used to represent an empty value in the
    // creation process
    removeNullsFromContext = (inKey) => {
        var finalizedContext = JSON.parse(JSON.stringify(this.state.keyContext[inKey]));
        var noNulls = removeNulls(finalizedContext);
        return noNulls;
    }

    submitObject = (inKey, test=false, suppressWarnings=false) => {
        // function to test a POST of the data or actually POST it.
        // validates if test=true, POSTs if test=false.
        var stateToSet = {}; // hold state
        var keyValid = this.state.keyValid;
        var currType = this.state.keyTypes[inKey];
        var currSchema = this.props.schemas[currType];
        var currContext = this.state.keyContext[inKey];
        // this will always be reset when stateToSet is implemented
        stateToSet.processingFetch = false;
        stateToSet.keyValid = keyValid;
        var lab;
        var award;
        var finalizedContext = this.removeNullsFromContext(inKey);
        // get rid of any hanging errors
        for(var i=0; i<this.state.errorCount; i++){
            Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1)});
            stateToSet.errorCount = 0;
        }
        this.setState({'processingFetch': true});
        ajax.promise('/me?frame=embedded').then(data => {
            if(!data || !data.submits_for || data.submits_for.length == 0){
                console.log('THIS ACCOUNT DOES NOT HAVE SUBMISSION PRIVILEGE');
                keyValid[inKey] = 2;
                this.setState(stateToSet);
                return;
            }
            // use first lab for now
            var submits_for = data.submits_for[0];
            lab = submits_for['@id'] ? submits_for['@id'] : submits_for.link_id.replace(/~/g, "/");
            ajax.promise(lab).then(lab_data => {
                if(!lab || !lab_data.awards || lab_data.awards.length == 0){
                    console.log('THE LAB FOR THIS ACCOUNT LACKS AN AWARD');
                    keyValid[inKey] = 2;
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
                // change actionMethod and destination based on edit/round two
                if(!test){
                    if(this.state.roundTwo){
                        actionMethod = 'PUT';
                        destination = this.state.keyComplete[inKey];
                        var submittedData = this.state.keyContext[destination];
                        finalizedContext.uuid = submittedData.uuid;
                        if(submittedData.accession){
                            finalizedContext.accession = submittedData.accession;
                        }
                    }else if(this.props.edit){
                        actionMethod = 'PUT';
                        destination = currContext['@id'];
                        // must add uuid (and accession, if available) to PUT body
                        finalizedContext.uuid = currContext.uuid;
                        // not all objects have accessions
                        if(currContext.accession){
                            finalizedContext.accession = currContext.accession;
                        }
                    }

                }
                var payload = JSON.stringify(finalizedContext);
                ajax.promise(destination, actionMethod, {}, payload).then(response => {
                    if (response.status && response.status !== 'success'){ // error
                        keyValid[inKey] = 2;
                        if(!suppressWarnings){
                            var errorList = response.errors || [response.detail] || [];
                            // make an alert for each error description
                            stateToSet.errorCount = errorList.length;
                            for(var i=0; i<errorList.length; i++){
                                var detail = errorList[i].description || errorList[i] || "Unidentified error";
                                if(errorList[i].name && errorList[i].name.length > 0){
                                    detail += ('. See ' + errorList[i].name[0] + ' in ' + this.state.keyDisplay[inKey]);
                                }else{
                                    detail += ('. See ' + this.state.keyDisplay[inKey]);
                                }
                                Alerts.queue({
                                    'title' : "Validation error " + parseInt(i + 1),
                                    'message': detail,
                                    'style': 'danger'
                                });
                            }
                            setTimeout(layout.animateScrollTo(0), 100);
                        }
                        this.setState(stateToSet);
                    }else{
                        var responseData;
                        if(test){
                            console.log('OBJECT SUCCESSFULLY TESTED!');
                            keyValid[inKey] = 3;
                            this.setState(stateToSet);
                            return;
                        }else{
                            responseData = response['@graph'][0];
                            if(!this.props.edit){
                                destination = responseData['@id'];
                            }
                        }
                        // handle submission for round two
                        if(this.state.roundTwo){
                            // there is a file
                            if(this.state.file && responseData['upload_credentials']){
                                // add important info to result from finalizedContext
                                // that is not added from /types/file.py get_upload
                                var creds = responseData['upload_credentials'];
                                var upload_manager = s3UploadFile(this.state.file, creds);
                                var upload_info = {
                                    'context': responseData,
                                    'manager': upload_manager
                                };
                                // Passes upload_manager to uploads.js through app.js
                                this.props.updateUploads(destination, upload_info);
                                alert('Success! Navigating to the uploads page.');
                                // this.props.navigate('/uploads');
                            }else{
                                // splice out element 0 of roundTwoKeys
                                this.setState(stateToSet);
                            }
                        }else{
                            keyValid[inKey] = 4;
                            // Perform final steps when object is submitted
                            // *** SHOULD THIS STUFF BE BROKEN OUT INTO ANOTHER FXN?
                            // find key of parent object, starting from top of hierarchy
                            var parentKey = findParentFromHierarchy(this.state.keyHierarchy, inKey);
                            // navigate to parent obj if it was found. Else, go to top level
                            stateToSet.currKey = parentKey !== null ? parentKey : 0;
                            var keyUnused = this.state.keyUnused;
                            var hierarchy = JSON.parse(JSON.stringify(this.state.keyHierarchy));
                            var typesCopy = this.state.keyTypes;
                            var keyComplete = this.state.keyComplete;
                            var linksCopy = this.state.keyLinks;
                            var displayCopy = this.state.keyDisplay;
                            // set contextCopy to returned data from POST
                            var contextCopy = this.state.keyContext;
                            var roundTwoCopy = this.state.roundTwoKeys.slice();
                            // update the state storing completed objects.
                            keyComplete[inKey] = destination;
                            // delete all unused links for completed objects.
                            if(keyUnused[inKey]) delete keyUnused[inKey];
                            // represent the submitted object with its new path
                            // rather than old keyIdx.
                            linksCopy[destination] = linksCopy[inKey];
                            typesCopy[destination] = currType;
                            displayCopy[destination] = displayCopy[inKey];
                            contextCopy[destination] = responseData;
                            var newHierarchy = replaceInHierarchy(hierarchy, inKey, destination);
                            stateToSet.keyLinks = linksCopy;
                            stateToSet.keyTypes = typesCopy;
                            stateToSet.keyHierarchy = newHierarchy;
                            stateToSet.keyComplete = keyComplete;
                            stateToSet.keyUnused = keyUnused;
                            stateToSet.keyDisplay = displayCopy;
                            stateToSet.keyContext = contextCopy;
                            // update context with response data and check if submitted object needs a round two
                            var needsRoundTwo = [];
                            contextCopy[inKey] = buildContext(responseData, currSchema, [], this.props.edit, this.props.create, needsRoundTwo);
                            // update roundTwoKeys if necessary
                            if(needsRoundTwo.length > 0){
                                if(!_.contains(roundTwoCopy, inKey)){
                                    roundTwoCopy.push(inKey);
                                    stateToSet.roundTwoKeys = roundTwoCopy;
                                }
                            }
                            // inKey is 0 for the primary object
                            if(inKey == 0){
                                // see if we need to go into round two submission
                                if(roundTwoCopy === 0){
                                    alert('Success! Navigating to your new object.');
                                    this.props.navigate(destination);
                                }else{
                                    stateToSet.roundTwo = true;
                                    stateToSet.currKey = roundTwoCopy[0];
                                    alert('Success! All objects were submitted. However, some of them have additional fields that can be only filled in second round submission. You will now be guided through this process for each object.');
                                    this.setState(stateToSet);
                                }
                            }else{
                                alert(this.state.keyDisplay[inKey] + ' was successfully submitted.');
                                this.setState(stateToSet);
                            }
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
        if(!this.state.keyContext || currKey === null){
            return null;
        }
        var ambiguousModal = this.state.ambiguousIdx !== null && this.state.ambiguousType !== null;
        var ambiguousDescrip = null;
        if(this.state.ambiguousSelected !== null && this.props.schemas[this.state.ambiguousSelected].description){
            ambiguousDescrip = this.props.schemas[this.state.ambiguousSelected].description;
        }
        var aliasModal = !ambiguousModal && this.state.creatingIdx !== null && this.state.creatingType !== null;
        var currType = this.state.keyTypes[currKey];
        var currSchema = this.props.schemas[currType];
        var currContext = this.state.keyContext[currKey];
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
        var currObjDisplay = this.state.keyDisplay[currKey] || currType;
        return(
            <div>
                <Modal show={ambiguousModal}>
                    <Modal.Header>
                        <Modal.Title>{'Multiple object types found for your new ' + this.state.ambiguousType}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p style={{'marginBottom':'15px'}}>
                            {'Please select a specific object type from the menu below.'}
                        </p>
                        <div className="input-wrapper" style={{'marginBottom':'15px'}}>
                            <DropdownButton bsSize="small" id="dropdown-size-extra-small" title={this.state.ambiguousSelected || "No value"}>
                                {this.state.ambiguousType !== null ?
                                    linkToLookup[this.state.ambiguousType].map((val) => this.buildAmbiguousEnumEntry(val))
                                    :
                                    null
                                }
                            </DropdownButton>
                        </div>
                        <Collapse in={ambiguousDescrip !== null}>
                            <div style={{'marginBottom':'15px', 'fontSize':'1.2em'}}>
                                {'Description: ' + ambiguousDescrip}
                            </div>
                        </Collapse>
                        <Button bsSize="xsmall" bsStyle="success" disabled={this.state.ambiguousSelected === null} onClick={this.submitAmbiguousType}>
                            Submit
                        </Button>
                    </Modal.Body>
                </Modal>
                <Modal show={aliasModal}>
                    <Modal.Header>
                        <Modal.Title>{'Give your new ' + this.state.creatingType +' an alias'}</Modal.Title>
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
                            setKeyState={this.setKeyState}
                            hierarchy={this.state.keyHierarchy}
                            keyValid={this.state.keyValid}
                            keyTypes={this.state.keyTypes}
                            keyDisplay={this.state.keyDisplay}
                            keyComplete={this.state.keyComplete}
                            currKey={this.state.currKey}
                            keyUnused={this.state.keyUnused}
                            keyLinks={this.state.keyLinks}
                        />
                    </div>
                    <div className={bodyCol}>
                        <div style={headerStyle}>
                            <h3 className="submission-working-title">
                                <span className='working-subtitle'>
                                    {currType}
                                </span>
                                <span>
                                    {this.state.keyDisplay[currKey]}
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
                            modifyKeyContext={this.modifyKeyContext}
                            initCreateObj={this.initCreateObj}
                            removeObj={this.removeObj}
                            addExistingObj={this.addExistingObj}
                            keyDisplay={this.state.keyDisplay}
                            setKeyState={this.setKeyState}
                            modifyAlias={this.modifyAlias}
                            keyComplete={this.state.keyComplete}
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
        /*
        * State in this component mostly has to do with selection of existing objs
        * - selectType (type: str) type of existing object being selected (i.e. ExperimentHiC).
        * - selectData (type: obj) initial collection context fed to Search, given by
        *   LinkedObj in submission-fields.js.
        * - selectQuery (type: str) Search query held by this component for in-place navigation
        * - selectField (type: str) actual fieldname that we're selecting the existing obj for.
        *   may be nested in the case of subobjects, e.g. experiments_in_set.experiment
        * - selectArrayIdx (type: arr) list of int numbers keeping track of list positions of the
        *   object we're selecting for. Since you can have arrays within arrays, one
        *   int won't do. Example: [1,2] would mean the current field is the second item
        *   within the first item of the array given by the top level field. When null, no arrays involved.
        * - fadeState (type: bool) controls whether a fade animation should be triggered in render
        */
        this.state = {
            'selectType': null, // type of existing object being selected
            'selectData': null, // context used for existing object selection
            'selectQuery': null, // currently held search query
            'selectField': null, // the actual fieldname that we're selecting for
            'selectLink': null,
            'selectArrayIdx': null,
            'fadeState': false
        }
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

    // Takes a field and value and modifies the keyContext held in parent.
    // if objDelete is true, check to see if the value could be an object
    // getting removed. If field == 'aliases', change keyDisplay to reflect
    // the new alias name.
    modifyNewContext = (field, value, fieldType, newLink, arrayIdx=null, type=null) => {
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
        this.props.modifyKeyContext(this.props.currKey, contextCopy);
        if(fieldType === 'new linked object'){
            // value is new key index in this case
            this.props.initCreateObj(type, value, newLink);
        }
        if(fieldType === 'linked object'){
            this.checkObjectRemoval(value, prevValue);
        }
        if(splitField[splitField.length-1] === 'aliases'){
            this.props.modifyAlias();
        }
    }

    fetchObjTitle = (value, type, newLink) => {
        ajax.promise(value).then(data => {
            if (data['display_title']){
                this.props.addExistingObj(value, data['display_title'], type, newLink);
            }else{
                this.props.addExistingObj(value, value, type, newLink);
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
                    this.setState({
                        'selectType': null,
                        'selectData': null,
                        'selectQuery': null,
                        'selectField': null,
                        'selectLink': null,
                        'selectArrayIdx': null
                    });
                    this.props.setKeyState('fullScreen', false);
                }
            });
        }
    }

    // use when selecting a new object
    selectObj = (collection, field, newLink, array=null) => {
        ajax.promise('/' + collection + '/?format=json').then(data => {
            if (data && data['@graph']){
                var results = data['@graph'];
                if(results.length > 0){
                    setTimeout(layout.animateScrollTo(0), 100);
                    this.setState({
                        'selectType': collection,
                        'selectData': data,
                        'selectQuery': '?type=' + collection,
                        'selectField': field,
                        'selectLink': newLink,
                        'selectArrayIdx': array
                    });
                    this.props.setKeyState('fullScreen', true);
                }
            }
        });
    }

    // callback passed to Search when selecting existing object
    // when value is null, function is delete
    selectComplete = (value) => {
        var isRepeat = false;
        var current = this.props.currContext[this.state.selectField];
        if(current instanceof Array && _.contains(current, value)){
            isRepeat = true;
        }
        if(this.state.selectField && !isRepeat){
            this.modifyNewContext(this.state.selectField, value, 'existing linked object', this.state.selectLink, this.state.selectArrayIdx);
            this.fetchObjTitle(value, this.state.selectType, this.state.selectLink);
        }else{
            this.modifyNewContext(this.state.selectField, null, 'existing linked object', this.state.selectLink, this.state.selectArrayIdx);
        }
        this.setState({
            'selectType': null,
            'selectData': null,
            'selectQuery': null,
            'selectField': null,
            'selectLink': null,
            'selectArrayIdx': null
        });
        this.props.setKeyState('fullScreen', false);
    }

    // collect props necessary to build create a BuildField child
    initiateField = (field) => {
        var fieldSchema = object.getNestedProperty(this.props.schema, ['properties', field], true);
        if(!fieldSchema) return null;
        if(fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round'){
            // register that this object will need round 2 submission
            return null;
        }
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
        var linked = delveObject(fieldSchema);
        if(linked !== null){
            linked = fieldSchema.title ? fieldSchema.title : linked;
            isLinked = true;
        }
        // handle a linkTo object on the the top level
        // check if any schema-specific adjustments need to made:
        if(fieldSchema.linkTo){
            fieldType = 'linked object';
        }else if (fieldSchema.attachment && fieldSchema.attachment === true){
            fieldType = 'attachment';
        }else if (fieldSchema.s3Upload && fieldSchema.s3Upload === true){
            // only render file upload input if status is 'uploading' or 'upload_failed'
            if(this.props.edit && this.props.baseContext.status){
                if(this.props.baseContext.status == 'uploading' || this.props.baseContext.status == 'upload failed'){
                    fieldType = 'file upload';
                }else{
                    return null;
                }
            }else{
                fieldType = 'file upload';
            }
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
                linkType={linked}
                isLinked={isLinked}
                selectObj={this.selectObj}
                title={fieldTitle}
                arrayIdx={null}
                edit={this.props.edit}
                create={this.props.create}
                keyDisplay={this.props.keyDisplay}
                keyComplete={this.props.keyComplete}
                setKeyState={this.props.setKeyState}
            />
        );
    }

    render(){
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
        var linkedObjs = sortPropFields(linkedObjs);
        var buildFields = sortPropFields(buildFields);
        var selecting = false;
        if(this.state.selectData !== null){
            selecting = true;
        }
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
        this.state = {
            'open': false
        }
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
        this.state = {
            'file': null,
            'md5Progress': null
        }
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

export function buildContext(context, schema, objList=null, edit=false, create=true, roundTwoSwitch=null){
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
            if(fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round'){
                // register that this object will need round 2 submission
                if(roundTwoSwitch !== null) roundTwoSwitch.push(fieldSchema);
            }
            // set value to context value if editing/cloning.
            // if creating or value not present, set to null
            if(edit){
                if(!context[fields[i]] || (fieldSchema.ff_flag && fieldSchema.ff_flag == "clear edit")){
                    built[fields[i]] = null;
                }else{
                    built[fields[i]] = context[fields[i]];
                }
            }else if(!create){ //clone
                if(!context[fields[i]] || (!fieldSchema.ff_flag && fieldSchema.ff_flag == "clear clone")){
                    built[fields[i]] = null;
                }else{
                    built[fields[i]] = context[fields[i]];
                }
            }else{
                built[fields[i]] = null;
            }
            if(objList !== null ){
                var linked = delveObject(fieldSchema);
                var roundTwoExclude = fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round';
                if(linked !== null && !roundTwoExclude){
                    var listTerm = fieldSchema.title ? fieldSchema.title : linked;
                    if(!_.contains(objList, listTerm)) objList.push(listTerm);
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

// Function to recursively find whether a json object contains a linkTo field
// anywhere in its nested structure. Returns object type if found, null otherwise.
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

// Given the parent object key and a new object key, return a version
// of this.state.keyHierarchy that includes the new parent-child relation.
// Recursive function
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

// remove given key from hierarchy. Recursive function.
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

// returns the entire hierarchy below for the given keyIdx. keyIdx must be a
// number (custom object). Recursive function.
var searchHierarchy = function myself(hierarchy, keyIdx){
    if(!hierarchy) return null;
    var found_hierarchy = null;
    Object.keys(hierarchy).forEach(function(key, index){
        if(key == keyIdx){
            found_hierarchy = hierarchy[key];
        }else{
            var test = myself(hierarchy[key], keyIdx);
            if(test !== null){
                found_hierarchy = test;
            }
        }
    });
    return found_hierarchy;
}

var findParentFromHierarchy = function myself(hierarchy, keyIdx){
    if(isNaN(keyIdx) || !hierarchy) return null;
    var found_parent = null;
    Object.keys(hierarchy).forEach(function(key, index){
        if(keyIdx in hierarchy[key]){
            found_parent = key;
        }else{
            var test = myself(hierarchy[key], keyIdx);
            if(test !== null) found_parent = test;
        }
    });
    return found_parent;
}

var replaceInHierarchy = function myself(hierarchy, current, toReplace){
    Object.keys(hierarchy).forEach(function(key, index){
        if(key == current){
            var downstream = hierarchy[key];
            hierarchy[toReplace] = downstream;
            delete hierarchy[key];
        }else{
            hierarchy[key] = myself(hierarchy[key], current, toReplace);
        }
    });
    return hierarchy
}

// return a list of all keys contained within a given hierarchy
var flattenHierarchy = function myself(hierarchy){
    var found_keys = [];
    Object.keys(hierarchy).forEach(function(key, index){
        var sub_keys = myself(hierarchy[key]);
        found_keys = _.union(found_keys, sub_keys, [key]);
    });
    return found_keys
}


// remove any field with a null value from given json context.
// also remove empty arrays and objects
var removeNulls = function myself(context){
    Object.keys(context).forEach(function(key, index){
        if(context[key] === null){
            delete context[key];
        }else if(context[key] instanceof Array && context[key].length == 0){
            delete context[key];
        }else if(context[key] instanceof Object){
            if(Object.keys(context[key]).length == 0){
                delete context[key];
            }else{
                context[key] = myself(context[key]);
            }
        }
    });
    return context;
}
