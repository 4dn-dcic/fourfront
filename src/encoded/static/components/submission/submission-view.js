'use strict';

import React from 'react';
import * as globals from '../globals';
import _ from 'underscore';
import url from 'url';
import { ajax, console, JWT, object, isServerSide, layout, Schemas } from '../util';
import moment from 'moment';
import {getS3UploadUrl, s3UploadFile} from '../util/aws';
import { DropdownButton, Button, MenuItem, Panel, Table, Collapse, Fade, Modal, InputGroup, FormGroup, FormControl } from 'react-bootstrap';
import Search from './../browse/SearchView';
import ReactTooltip from 'react-tooltip';
import { getLargeMD5 } from '../util/file';
import SubmissionTree from './expandable-tree';
import BuildField, { AliasInputField } from './submission-fields';
import Alerts from '../alerts';
import { Detail } from '../item-pages/components';

/**
 * Key container component for Submission components.
 *
 * Holds object values for all downstream components and owns the methods
 * for submitting data. Passes the appropriate data downwards to the individual
 * object views.
 *
 * The general function of Submission view is a container that holds the state
 * off all objects being created, as well as state required to change view between
 * object, coordinate uploads, and the alias naming process.
 *
 * The functions modifyKeyContext and setSubmissionState are used to change object
 * creation views and modify the each object's content. Other functions, like
 * updateUpload and addExistingObj are used to interface with lower level
 * components for specific state changes.
 *
 * This component also holds submission logic and a few functions for generating
 * JSX to be rendered depending on state.
 *
 * @class SubmissionView
 * @prop {string} href      Current browser URL/href. If a search href, should have a 'type=' query component to infer type of Item to create.
 * @prop {Object} [context] Current resource (Item) at our current href path. Used to get '@type' from, if not a search page.
 * @prop {Object} schemas   Schemas as returned from back-end via /profiles/ endpoint. Required.
 */
export default class SubmissionView extends React.Component{

    constructor(props){
        super(props);
        /**
         * *** DETAIL ON THIS.STATE ***
         * There are a lot of individual states to keep track of, but most workflow-runs
         * the same way: they are objects where the key is this.state.currKey and the
         * content is some information about the object created.
         *
         * @prop {!number} currKey                  Is an int that is used to index the objects you are creating and acts as a switch for the states.
         * @prop {{ number : Object }} keyContext   (idx: currKey) stores the context for each new object
         * @prop {{ number : number }} keyValid     (idx: currKey) stores the validation status for each new object; 0 is cannot yet validate (incomplete children), 1 is ready to validate, 2 is validation error, 3 is successfully validated, 4 is submitted.
         * @prop {{ number : string }} keyDisplay   (idx: currKey) stores the formatted titles for each object
         * @prop {{ number : string }} keyComplete  (idx: currKey) stores completed custom object's @id path by key.
         * @prop {number} keyIter                   (int) is a reference to the current maximum currKey. Is used to iterate to add more keys.
         * @prop {!number} currKey                  (int) controls which object we're manipulating.
         * @prop {{ number : Object }} keyHierarchy Nested form of object relationships, where values are currKey idxs for created objects and @id paths for existing objects.
         * @prop {{ number : Array.<string> }} keyLinkBookmarks - (idx: currKey) all possible child object types for a given currKey. Stored as schema title, or schema LinkTo if not present.
         * @prop {{ number : string }} keyLinks     (idx: currKey) holds the corresponding keyLinkBookmarks field for each key.
         * @prop {boolean} processingFetch          keeps track of whether top level is processing a request
         * @prop {number} errorCount                (int) keeps track of how many validation errors currently exist
         * @prop {!number} ambiguousIdx             (int) has to do with linkTo selection when multiple object types are associated with a single linkTo (example: File -> FileProcessed, FileFastq...)
         * @prop {!string} ambiguousType            Originally selected ambiguous linkTo type
         * @prop {!string} ambiguousSelected        Selected type to resolve ambiguity
         * @prop {!number} creatingIdx              (int) Has to do with alias creation. Value is equal to a currKey index when currently creating an alias, null otherwise.
         * @prop {!string} creatingType             Similar to creatingIdx, but string object type.
         * @prop {!string} creatingLink             Similar to creatingIdx, but string link type.
         * @prop {!string} creatingAlias            Stores input when creating an alias
         * @prop {!string} creatingAliasMessage     Stores any error messages to display while alias creation is occuring.
         * @prop {!string} creatingLinkForField     Stores temporarily the name of the field on the parent item for which a new object/item is being created.
         * @prop {boolean} fullScreen               If true, the whole component rendered is the Search page for pre-existing object selection.
         * @prop {number} md5Progress               (int) md5 percentage complete for uploading files. Equals null if no current md5 calcuation.
         * @prop {boolean} roundTwo                 Begins false, true only when first round submissions is done AND there are second round submission fields.
         * @prop {number[]} roundTwoKeys      List of key idxs that need round two submission
         * @prop {!Object} file                     Holds currently uploading file info (round two)
         * @prop {!Object} upload                   Holds upload info to be passed to children
         * @prop {!string} uploadStatus             Holds message relevant to file BuildField. Reset to null when currKey changes.
         * @prop {!Object} currentSubmittingUser    Holds current/submitting User Item; used primarily for submission permission(s) and autosuggesting an alias.
         */
        this.state = {
            'keyContext'            : null,
            'keyValid'              : null,
            'keyTypes'              : null,
            'keyDisplay'            : null,     // serves to hold navigation-formatted names for objs
            'keyComplete'           : {},       // init to empty dict b/c objs cannot be complete on initialization
            'keyIter'               : 0,        // serves as key versions for child objects. 0 is reserved for principal
            'currKey'               : null,     // start with viewing principle object (key = 0),
            'keyHierarchy'          : {0:{}},   // initalize with principal item at top
            'keyLinkBookmarks'      : {},       // hold bookmarks LinkTos for each obj key
            'keyLinks'              : {},       // associates each non-primary key with a field
            'processingFetch'       : false,
            'errorCount'            : 0,
            'ambiguousIdx'          : null,
            'ambiguousType'         : null,
            'ambiguousSelected'     : null,
            'creatingIdx'           : null,
            'creatingType'          : null,
            'creatingLink'          : null,
            'creatingAlias'         : '',
            'creatingAliasMessage'  : null,
            'creatingLinkForField'  : null,
            'fullScreen'            : false,
            'md5Progress'           : null,
            'roundTwo'              : false,
            'roundTwoKeys'          : [],
            'file'                  : null,
            'upload'                : null,
            'uploadStatus'          : null,
            'currentSubmittingUser' : null
        };
    }

    /**
     * Call initializePrincipal to get state set up, but only if schemas are
     * available.
     */
    componentDidMount(){
        if(this.props.schemas && Object.keys(this.props.schemas).length > 0){
            this.initializePrincipal(this.props.context, this.props.schemas);
        }
    }

    /**
     * If schemas in props change (this should not happen often), re-initialize.
     * The main functionality of this is to wait for schemas if they're not
     * available on componentDidMount.
     */
    componentWillReceiveProps(nextProps){
        if(this.props.schemas !== nextProps.schemas){
            if(this.state.currKey === null){
                this.initializePrincipal(nextProps.context, nextProps.schemas);
            }
        }
    }

    /**
     * Function that modifies new context and sets validation state whenever
     * a modification occurs
     */
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

    /**
     * Function to look at a specific object (reference by key) and
     * use searchHierarchy() to see if the children of the given key
     * contain any un-submitted custom objects. If they do, return
     * 1 (ready to validate). Otherwise return 0 (not ready to validate)
     */
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

    /**
     * Initialize state for the principal object (i.e. the primary object we
     * are creating/editing/cloning). It has the index of 0.
     * Editing/cloning, fetch the frame=object context and use it initialize
     * the values of the fields.
     * initObjs is used to hold the linked objects for edited/cloned objects.
     * These are later used with initCreateObj to put those objects' information
     * in state.
     */
    initializePrincipal = (context, schemas) => {
        var initContext = {};
        var contextID = context['@id'] || null;
        var principalTypes = this.props.context['@type'];
        if (principalTypes[0] === 'Search' || principalTypes[0] === 'Browse'){
            // If we're creating from search or browse page, use type from href.
            var typeFromHref = url.parse(this.props.href, true).query.type || 'Item';
            if (Array.isArray(typeFromHref)) typeFromHref = _.without(typeFromHref, 'Item')[0];
            if (typeFromHref && typeFromHref !== 'Item') principalTypes = [typeFromHref]; // e.g. ['ExperimentSetReplicate']
        }
        var initType = {0: principalTypes[0]};
        var initValid = {0: 1};
        var principalDisplay = 'New ' + principalTypes[0];
        var initDisplay = {0: principalDisplay};
        var initBookmarks = {};
        var bookmarksList = [];
        var schema = schemas[principalTypes[0]];
        var existingAlias = false;

        // Step A : Get labs from User, in order to autogenerate alias.
        var userInfo = JWT.getUserInfo();
        var userHref = null;
        if (userInfo && Array.isArray(userInfo.user_actions)){
            userHref = _.findWhere(userInfo.user_actions, {'id' : 'profile'}).href;
        } else if (userInfo) {
            userHref = '/me';
        }

        // Step B : Callback for after grabbing user w/ submits_for
        var continueInitProcess = function(){
            // if @id cannot be found or we are creating from scratch, start with empty fields
            if(!contextID || this.props.create){
                initContext[0] = buildContext({}, schema, bookmarksList, this.props.edit, this.props.create);
                initBookmarks[0] = bookmarksList;

                this.setState({
                    'keyContext': initContext,
                    'keyValid': initValid,
                    'keyTypes': initType,
                    'keyDisplay': initDisplay,
                    'currKey': 0,
                    'keyLinkBookmarks': initBookmarks
                });
                this.initCreateObj(principalTypes[0], 0, 'Primary Object');
            }else{
                ajax.promise(contextID + '?frame=object').then(response => {
                    var initObjs = [];
                    if (response['@id'] && response['@id'] === contextID){
                        initContext[0] = buildContext(response, schema, bookmarksList, this.props.edit, this.props.create, null, initObjs);
                        initBookmarks[0] = bookmarksList;
                        if(this.props.edit && response.aliases && response.aliases.length > 0){
                            // we already have an alias for editing, so use it for title
                            // setting creatingIdx and creatingType to null prevents alias creation
                            initDisplay[0] = response.aliases[0];
                            existingAlias = true;
                        }
                    }else{
                        // something went wrong with fetching context. Just use an empty object
                        initContext[0] = buildContext({}, schema, bookmarksList, this.props.edit, this.props.create);
                        initBookmarks[0] = bookmarksList;
                    }
                    this.setState({
                        'keyContext': initContext,
                        'keyValid': initValid,
                        'keyTypes': initType,
                        'keyDisplay': initDisplay,
                        'currKey': 0,
                        'keyLinkBookmarks': initBookmarks
                    });
                    if(initObjs.length > 0){
                        initObjs.forEach((initObj, idx) => this.initExistingObj(initObj));
                    }
                    // if we are cloning and there is not an existing alias
                    // never prompt alias creation on edit
                    // do not initiate ambiguous type lookup on edit or create
                    if(!this.props.edit && !existingAlias){
                        this.initCreateObj(principalTypes[0], 0, 'Primary Object', true);
                    }
                });
            }
            // set state in app to prevent accidental mid-submission navigation
            this.props.setIsSubmitting(true);

        }.bind(this);

        // Grab current user via AJAX and store to state. To use for alias auto-generation using current user's top submits_for lab name.
        if (userHref){
            ajax.load(userHref + '?frame=embedded', (r)=>{
                if (Array.isArray(r.submits_for) && r.submits_for.length > 0 && typeof r.submits_for[0].name === 'string'){
                    this.setState({ 'currentSubmittingUser' : r });
                }
                continueInitProcess();
            }, 'GET', continueInitProcess);
        } else {
            continueInitProcess();
        }

    }

    /**
     * Takes in an object type, the newIdx to create it under, the newLink linkTo
     * fieldname for it. If there are multiple available schemas for the linkTo,
     * set up the 'ambiguous lookup' process, which uses a modal to prompt the user
     * to select a type. If not an ambiguous linkTo type, move directly to alias
     * creation (initCreateAlias). If init (bool) is true, skip ambiguous type
     * lookup even if applicable and move right to alias selection.
     */
    initCreateObj = (type, newIdx, newLink, init=false, parentField=null) => {
        // check to see if we have an ambiguous linkTo type.
        // this means there could be multiple types of linked objects for a
        // given type. let the user choose one.
        if(this.props.schemas){
            if(type in Schemas.itemTypeHierarchy && !init){
                // ambiguous linkTo type found
                this.setState({
                    'ambiguousIdx': newIdx,
                    'ambiguousType': type,
                    'ambiguousSelected': null,
                    'creatingLink': newLink
                });
            }else{
                this.initCreateAlias(type, newIdx, newLink, parentField);
            }
        }
    }

    /**
     * Takes a type, newIdx, linkTo type (newLink). Clears the state of the ambiguous object
     * type information and initializes state for the alias creation process.
     * If the current object's schemas does not support aliases, finish out the
     * creation process with createObj using a boilerplate placeholer obj name.
     */
    initCreateAlias = (type, newIdx, newLink, parentField=null) => {
        var schema = this.props.schemas[type] || null;
        var autoSuggestedAlias = '';
        if (this.state.currentSubmittingUser && Array.isArray(this.state.currentSubmittingUser.submits_for) && this.state.currentSubmittingUser.submits_for[0] && typeof this.state.currentSubmittingUser.submits_for[0].name === 'string'){
            autoSuggestedAlias = this.state.currentSubmittingUser.submits_for[0].name + ':';
        }
        if(schema && schema.properties.aliases){
            this.setState({
                'ambiguousIdx': null,
                'ambiguousType': null,
                'ambiguousSelected': null,
                'creatingAlias' : autoSuggestedAlias,
                'creatingIdx': newIdx,
                'creatingType': type,
                'creatingLink': newLink,
                'creatingLinkForField' : parentField
            });
        }else{ // schema doesn't support aliases
            var fallbackAlias = 'My ' + type + ' ' + newIdx;
            this.createObj(type, newIdx, newLink, fallbackAlias);
        }
    }

    /**
     * Callback function used with the ambiguous input element. Called when a type
     * is selected from the enum ambiguousType list.
     * Move to initCreateAlias afterwards.
     */
    submitAmbiguousType = (e) => {
        e.preventDefault();
        var type = this.state.ambiguousSelected;
        var schema = this.props.schemas[type];
        var newIdx = this.state.ambiguousIdx;
        var newLink = this.state.creatingLink;
        // safety check to ensure schema exists for selected type
        if(schema && type){
            this.initCreateAlias(type, newIdx, newLink);
        }else{
            // abort
            this.setState({
                'ambiguousIdx': null,
                'ambiguousType': null,
                'ambiguousSelected': null
            });
        }
    }

    /** Simple function to generate enum entries for ambiguous types */
    buildAmbiguousEnumEntry = (val) => {
        return(
            <MenuItem key={val} title={val || ''} eventKey={val} onSelect={this.handleTypeSelection}>
                {val || ''}
            </MenuItem>
        );
    }

    /**
     * Enum callback to change state in ambiguous type selection
     */
    handleTypeSelection = (e) => {
        this.setState({
            'ambiguousSelected': e
        });
    }

    /**
     * Callback function used to change state in response to user input in the
     * alias creation process
     */
    handleAliasChange = (value) => {
        this.setState({'creatingAlias': value});
    }

    /**
     * Callback function used to change state in response to user input in the
     * alias creation process
     */
    handleAliasLabChange = (e) => {
        var inputElement = e.target;
        var currValue = inputElement.value;
        this.setState({'creatingAlias': currValue});
    }

    /**
     * Callback function used when alias creation process is complete.
     * Evaluates the input alias (this.state.creatingAlias) and checks it using
     * a regex and makes sure it is not redundant with any aliases already used
     * in this object creation session or elsewhere on fourfront. If there is
     * an error in the alias given, display a helpful message (kept in
     * this.state.creatingAliasMessage). If alias is valid, finalize the object
     * create process with createObj.
     */
    submitAlias = (e) => {
        e.preventDefault();
        e.stopPropagation();
        var type = this.state.creatingType;
        var schema = this.props.schemas[type];
        var newIdx = this.state.creatingIdx;
        var newLink = this.state.creatingLink;
        if(type === null || newIdx === null || newLink === null){
            return false;
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
                return false;
            }
            for(var key in this.state.keyDisplay){
                if(this.state.keyDisplay[key] === alias){
                    this.setState({
                        'creatingAliasMessage': 'You have already used this alias.'
                    });
                    return false;
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
                    return false;
                }
            });
        }
        return false;
    }

    /**
     * Function passed down in props to modify the display title used for custom
     * objects upon a change of the alias field in the main creation process.
     * If all aliases are manually removed, use a placeholder object name. Otherwise,
     * use the lasst alias in the aliases field (an array).
     */
    modifyAlias = () => {
        var keyDisplay = this.state.keyDisplay;
        var keyTypes = this.state.keyTypes;
        var currKey = this.state.currKey;
        var currAlias = keyDisplay[currKey];
        var aliases = this.state.keyContext[currKey].aliases || null;
        // no aliases
        if (aliases === null || (Array.isArray(aliases) && aliases.length === 0)){
            // Try 'name' & 'title', then fallback to 'My ItemType currKey'
            var name = this.state.keyContext[currKey].name || this.state.keyContext[currKey].title || null;
            if (name){
                keyDisplay[currKey] = name;
            } else {
                keyDisplay[currKey] = 'My ' + keyTypes[currKey] + ' ' + currKey;
            }
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

    /**
     * Takes in the type, newIdx, linkTo type (newLink), and the alias for a new
     * custom object. Used to generate an entry in all relevant key-indexed states
     * in SubmissionView. These are: keyContext, keyValid, keyTypes, keyHierarchy,
     * keyDisplay, keyLinkBookmarks, and keyLinks. Also resets state related to
     * the ambiguous type selection and alias creation processes (these should be
     * complete at this point).

     * Iterates keyIter, which is used as the master placeholder for the index of
     * the next created object. Sets currKey to the idx of the newly created object
     * so the view changes to it.
     */
    createObj = (type, newIdx, newLink, alias) => {
        var contextCopy = this.state.keyContext;
        var validCopy = this.state.keyValid;
        var typesCopy = this.state.keyTypes;
        var parentKeyIdx = this.state.currKey;
        var hierarchy = this.state.keyHierarchy;
        var keyDisplay = this.state.keyDisplay;
        var bookmarksCopy = this.state.keyLinkBookmarks;
        var linksCopy = this.state.keyLinks;
        var bookmarksList = [];
        // increase key iter by 1 for a new unique key
        var keyIdx;
        var newHierarchy;
        if(newIdx === 0){ // initial object creation
            keyIdx = 0;
            newHierarchy = hierarchy;
        }else{
            keyIdx = this.state.keyIter + 1;
            if(newIdx !== keyIdx){
                console.error('ERROR: KEY INDEX INCONSISTENCY!');
                return;
            }
            newHierarchy = modifyHierarchy(hierarchy, keyIdx, parentKeyIdx);
            validCopy[keyIdx] = 1; // new object has no incomplete children yet
            validCopy[parentKeyIdx] = 0; // parent is now not ready for validation
            typesCopy[keyIdx] = type;
        }
        var contextWithAlias = (contextCopy && contextCopy[keyIdx]) ? contextCopy[keyIdx] : {};
        if(contextWithAlias.aliases){
            contextWithAlias.aliases.push(alias);
        }else{
            contextWithAlias.aliases = [alias];
        }
        contextCopy[keyIdx] = buildContext(contextWithAlias, this.props.schemas[type], bookmarksList, true, false);
        bookmarksCopy[keyIdx] = bookmarksList;
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
            'keyLinkBookmarks': bookmarksCopy,
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
            'creatingAliasMessage': null,
            'creatingLinkForField' : null
        });
    }

    /**
     * Takes in a key for an object to removed from the state. Effectively deletes
     * an object by removing its idx from keyContext and other key-indexed state.
     * Used for the both pre-existing, where key is their string path, and custom
     * objects that have index keys.
     * If deleting a pre-existing object, dont modify the key-indexed states for
     * it since other occurences of that object may be used in the creation
     * process and those should not be affected. Effectively, removing a pre-
     * existing object amounts to removing it from keyHierarchy.
     */
    removeObj = (key) => {
        var contextCopy = this.state.keyContext;
        var validCopy = this.state.keyValid;
        var typesCopy = this.state.keyTypes;
        var keyDisplay = this.state.keyDisplay;
        var keyComplete = this.state.keyComplete;
        var bookmarksCopy = this.state.keyLinkBookmarks;
        var linksCopy = this.state.keyLinks;
        var roundTwoCopy = this.state.roundTwoKeys.slice();
        var hierarchy = this.state.keyHierarchy;
        var dummyHierarchy = JSON.parse(JSON.stringify(hierarchy));
        var hierKey = key;
        // the key may be a @id string and not keyIdx if already submitted
        _.keys(keyComplete).forEach(function(compKey) {
            if (keyComplete[compKey] == key) {
                hierKey = compKey;
            }
        });
        // find hierachy below the object being deleted
        dummyHierarchy = searchHierarchy(dummyHierarchy, hierKey);
        if(dummyHierarchy === null){
            // occurs when keys cannot be found to delete
            return;
        }
        // get a list of all keys to remove
        var toDelete = flattenHierarchy(dummyHierarchy);
        toDelete.push(key); // add this key
        // trimming the hierarchy effectively removes objects from creation process
        var newHierarchy = trimHierarchy(hierarchy, hierKey);
        // for housekeeping, remove the keys from keyLinkBookmarks, keyLinks, and keyComplete
        for(var i=0; i<toDelete.length; i++){
            // only remove creation data for non-sumbitted, non-preexisiting objs
            if(!isNaN(toDelete[i])){
                // remove key from roundTwoKeys if necessary
                // NOTE: submitted custom objects will NOT be removed from this
                // after deletion. Still give user opportunity for second round edits
                if(_.contains(roundTwoCopy, toDelete[i])){
                    var rmIdx = roundTwoCopy.indexOf(toDelete[i]);
                    if(rmIdx > -1){
                        roundTwoCopy.splice(rmIdx,1);
                    }
                }
                delete typesCopy[toDelete[i]];
                delete validCopy[toDelete[i]];
                delete contextCopy[toDelete[i]];
                delete typesCopy[toDelete[i]];
                delete linksCopy[toDelete[i]];
                delete bookmarksCopy[toDelete[i]];
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
            'keyLinkBookmarks': bookmarksCopy,
            'roundTwoKeys': roundTwoCopy
        });
    }

    /**
     * Uses an object holding specific data needed to initializing pre-existing
     * objects in the principal object initializing process when cloning/editing.
     * Exclusively called from initializePrincipal. Calls addExistingObj
     */
    initExistingObj = (objData) => {
        this.addExistingObj(objData.path, objData.display, objData.type, objData.newLink, true);
    }

    /**
     * Takes in the @id path of an exisiting object, a display name for it, the
     * object type, the linkTo field type (newLink), and whether or not it's
     * being added during the initializePrincipal process (bool init). Sets up
     * state to contain the newly introduced pre-existing object and adds it into
     * keyHierarchy. The key for pre-existing objects are their @id path. Thus,
     * isNan() for the key of a pre-existing object will return true.
     */
    addExistingObj = (path, display, type, newLink, init=false) => {
        // on init=true, all objects are children of the principal object (keyIdx = 0)
        var parentKeyIdx = init ? 0 : this.state.currKey;
        var hierarchy = this.state.keyHierarchy;
        var keyDisplay = this.state.keyDisplay;
        var keyTypes = this.state.keyTypes;
        var bookmarksCopy = this.state.keyLinkBookmarks;
        var linksCopy = this.state.keyLinks;
        hierarchy = modifyHierarchy(hierarchy, path, parentKeyIdx);
        keyDisplay[path] = display;
        keyTypes[path] = type;
        linksCopy[path] = newLink;
        this.setState({
            'keyHierarchy': hierarchy,
            'keyDisplay': keyDisplay,
            'keyTypes': keyTypes,
            'keyLinkBookmarks': bookmarksCopy,
            'keyLinks': linksCopy
        });
    }

    /**
     * Takes a key and value and sets the corresponding state in this component to the value.
     *
     * Primarily used as a callback to change currKey, in which case we
     * ensure that there are no current uploads of md5 calculations running. If
     * allowed to change keys, attempt to automatically validate the key we are
     * leaving if its validation state == 1 (has no incomplete children). Also
     * remove any hanging Alert error messages from validation.
     */
    setSubmissionState = (key, value) => {
        var stateToSet = this.state;
        if(key in stateToSet){
            // this means we're navigating to a new object if true
            if(key === 'currKey' && value !== this.state.currKey){
                // don't allow navigation when we have an uploading file
                // or calculating md5
                if(this.state.upload !== null || this.state.md5Progress !== null){
                    alert('Please wait for your upload to finish.');
                    return;
                }
                var keyValid = this.state.keyValid;
                // get rid of any hanging errors
                for(var i=0; i<this.state.errorCount; i++){
                    Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1)});
                    stateToSet.errorCount = 0;
                }
                // skip validation stuff if in roundTwo
                if(!this.state.roundTwo){
                    // if current key is ready for validation, first try that
                    // but suppress warning messages
                    if(keyValid[this.state.currKey] == 1){
                        this.submitObject(this.state.currKey, true, true);
                    }
                    // see if newly-navigated obj is ready for validation
                    if(keyValid[value] == 0){
                        var validState = this.findValidationState(value);
                        if(validState == 1){
                            keyValid[value] = 1;
                            stateToSet['keyValid'] = keyValid;
                        }
                    }
                }
                // reset some state
                stateToSet.processingFetch = false;
                stateToSet.uploadStatus = null;
            }
            stateToSet[key] = value;
            this.setState(stateToSet);
        }
    }

    /**
     * Function used to initialize uploads, complete them, and end them on failure.
     *
     * Sets the upload status, upload (which holds the s3 upload manager), and
     * also communicates to app.js that there is an upload occuring.
     * When upload is initialized, calculate the md5sum of the file before uploading.
     * In app, state is changed so users are prompted before navigating away from a running
     * upload. When upload is complete, call finishRoundTwo to finish the object
     * creation process for the file object with the upload.
     */
    updateUpload = (uploadInfo, completed=false, failed=false) => {
        var stateToSet = {};
        if(completed){
            stateToSet.uploadStatus = 'Upload complete';
            stateToSet.upload = null;
            stateToSet.file = null;
            this.finishRoundTwo();
            this.setState(stateToSet);
        }else if(failed){
            var destination = this.state.keyComplete[this.state.currKey];
            var payload = JSON.stringify({'status':'upload failed'});
            // set status to upload failed for the file
            ajax.promise(destination, 'PATCH', {}, payload).then(data => {
                // doesn't really matter what response is
                stateToSet.uploadStatus = 'Upload failed';
                stateToSet.upload = null;
                this.setState(stateToSet);
            });
        }else{ // must be the initial run
            // Calculate the md5sum for the file held in state and save it to the md5
            // field of the current key's context (this can only be a file due to the
            // submission process). Resets file and md5Progess in state after running.
            var file = this.state.file;
            // md5 calculation should ONLY occur when current type is file
            if(file === null) return;
            getLargeMD5(file, this.modifyMD5Progess).then((hash) => {
                // perform async patch to set md5sum field of the file
                var destination = this.state.keyComplete[this.state.currKey];
                var payload = JSON.stringify({'md5sum': hash});
                ajax.promise(destination, 'PATCH', {}, payload).then(data => {
                    if(data.status && data.status == 'success'){
                        console.info('HASH SET TO:', hash, 'FOR', destination);
                        stateToSet.upload = uploadInfo;
                        stateToSet.md5Progress = null;
                        stateToSet.uploadStatus = null;
                        this.setState(stateToSet);
                    }else if(data.status && data.title && data.status == 'error' && data.title == 'Conflict'){
                        // md5 key conflict
                        stateToSet.uploadStatus = 'MD5 conflicts with another file';
                        stateToSet.md5Progress = null;
                        this.setState(stateToSet);
                    }else{
                        // error setting md5
                        stateToSet.uploadStatus = 'MD5 calculation error';
                        stateToSet.md5Progress = null;
                        this.setState(stateToSet);
                    }
                });

            }).catch((error) => {
                stateToSet.uploadStatus = 'MD5 calculation error';
                stateToSet.file = null;
                stateToSet.md5Progress = null;
                this.setState(stateToSet);
            });
        }
    }

    /**
     * Generate JSX for a validation button. Disabled unless validation state == 1
     * (when all children are complete and no errors/unsubmitted) or == 2
     * (submitted by validation errors). If the submission is processing, render
     * a spinner icon.
     * When roundTwo, validation becomes Skip, which allows you to skip roundTwo
     * submissions for an object. Disable when the is an initialized upload or the
     * md5 is calculating.
     */
    generateValidationButton(){
        var validity = this.state.keyValid[this.state.currKey];
        // when roundTwo, replace the validation button with a Skip
        // button that completes the submission process for currKey
        if (this.state.roundTwo){
            if(this.state.upload === null && this.state.md5Progress === null){
                return(
                    <Button bsStyle="warning" onClick={function(e){
                        e.preventDefault();
                        this.finishRoundTwo();
                    }.bind(this)}>Skip</Button>
                );
            }else{
                return <Button bsStyle="warning" disabled>Skip</Button>;
            }
        } else if(validity === 3 || validity === 4){
            return(
                <Button bsStyle="info" disabled>Validated</Button>
            );
        } else if(validity === 2){
            if (this.state.processingFetch) {
                return <Button bsStyle="danger" disabled><i className="icon icon-spin icon-circle-o-notch"/></Button>;
            } else {
                return <Button bsStyle="danger" onClick={this.testPostNewContext}>Validate</Button>;
            }
        } else if (validity === 1){
            if (this.state.processingFetch) {
                return <Button bsStyle="info" disabled><i className="icon icon-spin icon-circle-o-notch"/></Button>;
            } else {
                return <Button bsStyle="info" onClick={this.testPostNewContext}>Validate</Button>;
            }
        } else {
            return <Button bsStyle="info" disabled>Validate</Button>;
        }
    }

    /**
     * Generate JSX for the the button that allows users to submit their custom
     * objects. Only active when validation state == 3 (validation successful).
     *
     * In roundTwo, there is no validation step, so only inactive when there is
     * an active upload of md5 calculation.
     */
    generateSubmitButton(){
        var validity = this.state.keyValid[this.state.currKey];
        if (this.state.roundTwo) {
            if (this.state.upload !== null || this.state.processingFetch || this.state.md5Progress !== null) {
                return <Button bsStyle="success" disabled><i className="icon icon-spin icon-circle-o-notch"/></Button>;
            } else {
                return <Button bsStyle="success" onClick={this.realPostNewContext}>Submit</Button>;
            }
        } else if (validity == 3) {
            if(this.state.processingFetch){
                return <Button bsStyle="success" disabled><i className="icon icon-spin icon-circle-o-notch"/></Button>;
            }else{
                return <Button bsStyle="success" onClick={this.realPostNewContext}>Submit</Button>;
            }
        } else if (validity == 4) {
            return <Button bsStyle="success" disabled>Submitted</Button>;
        } else {
            return <Button bsStyle="success" disabled>Submit</Button>;
        }
    }

    generateCancelButton(){
        return(
            <Button bsStyle="danger" onClick={this.cancelCreatePrimaryObject}>Cancel / Exit</Button>
        );
    }

    testPostNewContext = (e) => {
        e.preventDefault();
        this.submitObject(this.state.currKey, true);
    }

    realPostNewContext = (e) => {
        e.preventDefault();
        this.submitObject(this.state.currKey);
    }

    /**
     * Takes the context held in keyContext for a given key idx and returns a
     * copy that has been passed through removeNulls to delete any key-value pair
     * with a null value.
     */
    removeNullsFromContext = (inKey) => {
        var finalizedContext = JSON.parse(JSON.stringify(this.state.keyContext[inKey]));
        var noNulls = removeNulls(finalizedContext);
        return noNulls;
    }

    /**
     * Adds the accession and uuid from the already submitted context (stored in
     * keyContext under the path of the submitted object) to the context used to
     * patch the same object in roundTwo.
     */
    addSubmittedContext = (newContext) => {
        var path = this.state.keyComplete[this.state.currKey];
        if(path){
            var alreadySubmittedContext = this.state.keyContext[path];
            newContext.uuid = alreadySubmittedContext.uuid;
            if(alreadySubmittedContext.accession){
                newContext.accession = alreadySubmittedContext.accession;
            }
        }
        return newContext;
    }

    /** Set md5Progress in state to val. Passed as callback to getLargeMD5 */
    modifyMD5Progess = (val) => {
        this.setState({'md5Progress': val});
    }

    /**
     * Master object submission function. Takes a key index and uses ajax to
     * POST/PATCH/PUT the json to the object collection (a new object) or to the
     * specific object path (a pre-existing/roundTwo object). If test=true,
     * the POST is made to the check_only=True endpoint for validation without
     * actual submission.
     *
     * Upon successful submission, reponse data for the newly instantiated object
     * is stored in state (with key equal to the new object's path). On the
     * principal object submission if there are object that require roundTwo
     * submission, this function initializes the roundTwo process by setting
     * this.state.roundTwo to true and the currKey to the first index in the process.
     * If there are no roundTwo objects, completes submission process.
     *
     * Handles roundTwo submission slightly differently. Uses PATCH and kicks off
     * uploads using updateUpload if there is a file given. Completes submission
     * process once all roundTwo objects have been skipped or submitted.
     */
    submitObject = (inKey, test=false, suppressWarnings=false) => {
        // function to test a POST of the data or actually POST it.
        // validates if test=true, POSTs if test=false.
        var stateToSet = {}; // hold state
        var keyValid = this.state.keyValid;
        var currType = this.state.keyTypes[inKey];
        var currSchema = this.props.schemas[currType];
        var propContext = this.props.context;
        // this will always be reset when stateToSet is implemented
        stateToSet.processingFetch = false;
        stateToSet.keyValid = keyValid;
        var lab;
        var award;
        var finalizedContext = this.removeNullsFromContext(inKey);
        var i;
        // get rid of any hanging errors
        for(i=0; i<this.state.errorCount; i++){
            Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1)});
            stateToSet.errorCount = 0;
        }
        this.setState({'processingFetch': true});


        var submitProcess = function(me_data){ // me_data = current user fields
            if(!me_data || !me_data.submits_for || me_data.submits_for.length == 0){
                console.error('THIS ACCOUNT DOES NOT HAVE SUBMISSION PRIVILEGE');
                keyValid[inKey] = 2;
                this.setState(stateToSet);
                return;
            }
            // use first lab for now
            var submits_for = me_data.submits_for[0];
            lab = object.atIdFromObject(submits_for);
            ajax.promise(lab).then(lab_data => {
                if(!lab || !lab_data.awards || lab_data.awards.length == 0){
                    console.error('THE LAB FOR THIS ACCOUNT LACKS AN AWARD');
                    keyValid[inKey] = 2;
                    this.setState(stateToSet);
                    return;
                }
                // should we really always use the first award?
                award = lab_data.awards[0];
                // if editing, use pre-existing award, lab, and submitted_by
                if(this.props.edit && propContext.award && propContext.lab){
                    finalizedContext.award = object.atIdFromObject(propContext.award);
                    finalizedContext.lab = object.atIdFromObject(propContext.lab);
                    // an admin is editing. Use the pre-existing submitted_by
                    // otherwise, permissions won't let us change this field
                    if(me_data.groups && _.contains(me_data.groups, 'admin')){
                        if(propContext.submitted_by){
                            finalizedContext.submitted_by = object.atIdFromObject(propContext.submitted_by);
                        }else{
                            // use current user
                            finalizedContext.submitted_by = object.atIdFromObject(me_data);
                        }
                    }
                }else{ // use info of person creating/cloning unless values present
                    if(currSchema.properties.award && !('award' in finalizedContext)){
                        finalizedContext.award = object.atIdFromObject(award);
                    }
                    if(currSchema.properties.lab && !('lab' in finalizedContext)){
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
                        // add uuid and accession from submitted context
                        finalizedContext = this.addSubmittedContext(finalizedContext);
                    }else if(this.props.edit && inKey == 0){ // PUT for principal obj on edit
                        actionMethod = 'PUT';
                        destination = propContext['@id'];
                        // must add uuid (and accession, if available) to PUT body
                        finalizedContext.uuid = propContext.uuid;
                        // not all objects have accessions
                        if(propContext.accession){
                            finalizedContext.accession = propContext.accession;
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
                            for(i = 0; i<errorList.length; i++){
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
                            console.info('OBJECT SUCCESSFULLY TESTED!');
                            keyValid[inKey] = 3;
                            this.setState(stateToSet);
                            return;
                        }else{
                            responseData = response['@graph'][0];
                            // if not editing/not on principal, get path from new POST
                            if(!this.props.edit || inKey !== 0){
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
                                // this will set off a chain of aync events.
                                // first, md5 will be calculated and then the
                                // file will be uploaded to s3. If all of this
                                // is succesful, call finishRoundTwo.
                                stateToSet.uploadStatus = null;
                                this.setState(stateToSet);
                                this.updateUpload(upload_manager);
                            }else{
                                // state cleanup for this key
                                this.finishRoundTwo();
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
                            var typesCopy = this.state.keyTypes;
                            var keyComplete = this.state.keyComplete;
                            var linksCopy = this.state.keyLinks;
                            var displayCopy = this.state.keyDisplay;
                            // set contextCopy to returned data from POST
                            var contextCopy = this.state.keyContext;
                            var roundTwoCopy = this.state.roundTwoKeys.slice();
                            // update the state storing completed objects.
                            keyComplete[inKey] = destination;
                            // represent the submitted object with its new path
                            // rather than old keyIdx.
                            linksCopy[destination] = linksCopy[inKey];
                            typesCopy[destination] = currType;
                            displayCopy[destination] = displayCopy[inKey];
                            contextCopy[destination] = responseData;
                            stateToSet.keyLinks = linksCopy;
                            stateToSet.keyTypes = typesCopy;
                            stateToSet.keyComplete = keyComplete;
                            stateToSet.keyDisplay = displayCopy;
                            stateToSet.keyContext = contextCopy;
                            var needsRoundTwo = [];
                            // update context with response data and check if submitted object needs a round two
                            contextCopy[inKey] = buildContext(responseData, currSchema, null, true, false, needsRoundTwo);
                            // update roundTwoKeys if necessary
                            if(needsRoundTwo.length > 0){
                                if(!_.contains(roundTwoCopy, inKey)){
                                    // was getting an error where this could be str
                                    roundTwoCopy.push(parseInt(inKey));
                                    stateToSet.roundTwoKeys = roundTwoCopy;
                                }
                            }
                            // inKey is 0 for the primary object
                            if(inKey == 0){
                                // see if we need to go into round two submission
                                if(roundTwoCopy.length == 0){
                                    // we're done!
                                    this.props.setIsSubmitting(false);
                                    alert('Success! Navigating to your new object.');
                                    setTimeout(()=>{
                                        this.props.navigate(destination);
                                    }, 500);
                                }else{
                                    // break this out into another fxn?
                                    // roundTwo initiation
                                    stateToSet.roundTwo = true;
                                    stateToSet.currKey = roundTwoCopy[0];
                                    // reset validation state for all round two keys
                                    for(i = 0; i < roundTwoCopy.length; i++){
                                        keyValid[roundTwoCopy[i]] = 0;
                                    }
                                    alert('Success! All objects were submitted. However, one or more have additional fields that can be only filled in second round submission. You will now be guided through this process for each object.');
                                    this.setState(stateToSet);
                                }
                            }else{
                                alert(this.state.keyDisplay[inKey] + ' was successfully submitted.');
                                this.setState(stateToSet);
                            }
                        }
                        ReactTooltip.rebuild();
                    }
                });

            });
        }.bind(this);

        if (this.state.currentSubmittingUser){ // We've already loaded user during initPrincipal().
            submitProcess(this.state.currentSubmittingUser);
        } else {
            ajax.promise('/me?frame=embedded').then(submitProcess);
        }

    }

    /**
     * Finish the roundTwo process for the current key. Removes the currKey from
     * this.state.roundTwoKeys and modifies state to finish out for that object.
     * If there are no keys left in roundTwoKeys, navigate to the path of the
     * principal object we created.
     */
    finishRoundTwo = () => {
        var stateToSet = {};
        var currKey = this.state.currKey;
        var validationCopy = this.state.keyValid;
        var roundTwoCopy = this.state.roundTwoKeys.slice();
        validationCopy[currKey] = 4;
        if(_.contains(roundTwoCopy, currKey)){
            var rmIdx = roundTwoCopy.indexOf(currKey);
            if(rmIdx > -1){
                roundTwoCopy.splice(rmIdx,1);
            }
        }
        // navigate to next key in roundTwoKeys
        if(roundTwoCopy.length > 0) stateToSet.currKey = roundTwoCopy[0];
        stateToSet.uploadStatus = null;
        stateToSet.keyValid = validationCopy;
        stateToSet.roundTwoKeys = roundTwoCopy;
        this.setState(stateToSet);
        if(roundTwoCopy.length == 0){
            // we're done!
            this.props.setIsSubmitting(false);
            alert('Success! Navigating to your new object.');
            setTimeout(()=>{
                this.props.navigate(this.state.keyComplete[0]);
            }, 500);
        }
    }

    cancelCreateNewObject = () => {
        if (!this.state.creatingIdx) return;
        var exIdx = this.state.creatingIdx;
        var keyContext = this.state.keyContext;
        var currentContextPointer = this.state.keyContext[this.state.currKey];
        var parentFieldToClear = typeof this.state.creatingLinkForField === 'string' && this.state.creatingLinkForField;
        _.pairs(currentContextPointer).forEach(function(p){
            if (p[0] === parentFieldToClear){
                // Unset value to null
                if (p[1] === exIdx){
                    currentContextPointer[p[0]] = null;
                }
                // Remove value from array.
                if (Array.isArray(p[1])){
                    var idxInArray = p[1].indexOf(exIdx);
                    if (idxInArray > -1){
                        currentContextPointer[p[0]].splice(idxInArray, 1);
                    }
                }
            }
        });
        this.setState({
            'ambiguousIdx': null,
            'ambiguousType': null,
            'ambiguousSelected': null,
            'creatingAlias' : '',
            'creatingIdx': null,
            'creatingType': null,
            'creatingLink': null,
            'keyContext' : keyContext,
            'creatingLinkForField' : null
        });
    }

    /** Navigate to version of same page we're on, minus the '#!<action> hash. */
    cancelCreatePrimaryObject = (skipAskToLeave = false) => {
        var leaveFunc = () =>{
            // Navigate out.
            var parts = url.parse(this.props.href);
            this.props.navigate(parts.path, { skipRequest : true });
        };

        if (skipAskToLeave === true){
            return this.props.setIsSubmitting(false, leaveFunc);
        } else {
            return leaveFunc();
        }
    }

    /**
     * Render the navigable SubmissionTree and IndividualObjectView for the
     * current key. Also render modals for ambiguous type selection or alias
     * creation if necessary.
     */
    render(){
        console.log('TOP LEVEL STATE:', this.state);
        //hard coded for now
        var currKey = this.state.currKey;
        // see if initialized
        if(!this.state.keyContext || currKey === null){
            return null;
        }
        var showAmbiguousModal = this.state.ambiguousIdx !== null && this.state.ambiguousType !== null;
        var showAliasModal = !showAmbiguousModal && this.state.creatingIdx !== null && this.state.creatingType !== null;
        var currType = this.state.keyTypes[currKey];
        var currContext = this.state.keyContext[currKey];
        var navCol = this.state.fullScreen ? 'submission-hidden-nav' : 'col-sm-3';
        var bodyCol = this.state.fullScreen ? 'col-sm-12' : 'col-sm-9';

        // remove context and navigate from this.props
        const{
            context,
            navigate,
            ...others
        } = this.props;
        var currObjDisplay = this.state.keyDisplay[currKey] || currType;
        return(
            <div className="submission-view-page-container">
                <TypeSelectModal
                    show={showAmbiguousModal} {..._.pick(this.state, 'ambiguousType', 'ambiguousSelected', 'currKey', 'creatingIdx')} schemas={this.props.schemas}
                    buildAmbiguousEnumEntry={this.buildAmbiguousEnumEntry} submitAmbiguousType={this.submitAmbiguousType} cancelCreateNewObject={this.cancelCreateNewObject} cancelCreatePrimaryObject={this.cancelCreatePrimaryObject}
                />
                <AliasSelectModal
                    show={showAliasModal} {..._.pick(this.state, 'creatingAlias', 'creatingType', 'creatingAliasMessage', 'currKey', 'creatingIdx', 'currentSubmittingUser')}
                    handleAliasChange={this.handleAliasChange} submitAlias={this.submitAlias} cancelCreateNewObject={this.cancelCreateNewObject} cancelCreatePrimaryObject={this.cancelCreatePrimaryObject}
                />
                <WarningBanner cancelCreatePrimaryObject={this.cancelCreatePrimaryObject} actionButtons={[this.generateCancelButton(), this.generateValidationButton(), this.generateSubmitButton()]} />
                <DetailTitleBanner
                    hierarchy={this.state.keyHierarchy} setSubmissionState={this.setSubmissionState}
                    {..._.pick(this.state, 'keyContext', 'keyTypes', 'keyDisplay', 'currKey', 'fullScreen')}
                />
                <div className="clearfix row">
                    <div className={navCol}>
                        <SubmissionTree
                            setSubmissionState={this.setSubmissionState}
                            hierarchy={this.state.keyHierarchy}
                            {..._.pick(this.state, 'keyValid', 'keyTypes', 'keyDisplay', 'keyComplete', 'currKey', 'keyLinkBookmarks', 'keyLinks')}
                        />
                    </div>
                    <div className={bodyCol}>
                        <IndividualObjectView
                            {...others}
                            schemas={this.props.schemas}
                            currType={currType}
                            currContext={currContext}
                            modifyKeyContext={this.modifyKeyContext}
                            initCreateObj={this.initCreateObj}
                            removeObj={this.removeObj}
                            addExistingObj={this.addExistingObj}
                            setSubmissionState={this.setSubmissionState}
                            modifyAlias={this.modifyAlias}
                            updateUpload={this.updateUpload}
                            {..._.pick(this.state, 'keyDisplay', 'keyComplete', 'keyIter', 'currKey', 'keyContext', 'upload', 'uploadStatus', 'md5progress', 'roundTwo', 'currentSubmittingUser')}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

class WarningBanner extends React.Component {
    render() {
        return(
            <div className="mb-2 text-400 warning-banner">
                <div className="row">
                    <div className="col-md-7 col-lg-8">
                        Please note: your work will be lost if you navigate away from, refresh or close this page while submitting. The submission process is under active development and features may change.
                    </div>
                    <div className="col-md-5 col-lg-4">
                        <div className="action-buttons-container text-right" children={this.props.actionButtons} />
                    </div>
                </div>
            </div>
        );
    }
}

class DetailTitleBanner extends React.Component {

    /**
     * Traverse keyHierarchy option to get a list of hierarchical keys, e.g. 0,1,4 if are on currKey 4 that is a child of currKey 1 that is a child of currKey 0.
     *
     * @param {Object} hierachy - Hierarchy as defined on state of SubmissionView components.
     * @param {number} currKey - Current key of Object/Item we're editing.
     * @returns {number[]} List of keys leading from 0 to currKey.
     */
    static getListOfKeysInPath(hierachy, currKey){
        function findNestedKey(obj){
            if (typeof obj[currKey] !== 'undefined'){
                return [currKey];
            } else {
                var nestedFound = _.find(
                    _.map(
                        _.pairs(obj), // p[0] = key, p[1] = child obj with keys
                        function(p){ return [ p[0], findNestedKey(p[1]) ]; }
                    ),
                    function(p){
                        return (typeof p[1] !== 'undefined' && p[1] !== null);
                    }
                );
                if (nestedFound){
                    return [parseInt(nestedFound[0])].concat(nestedFound[1]);
                }

            }
        }
        return findNestedKey(hierachy);
    }

    static getContextPropertyNameOfNextKey(context, nextKey, getArrayIndex = false){
        var foundPropertyName = null;
        var arrayIdx = null;
        _.pairs(context).forEach(function(p){
            if (foundPropertyName) return;
            if (p[1] === nextKey){
                foundPropertyName = p[0];
            }
            // Remove value from array.
            if (Array.isArray(p[1])){
                arrayIdx = p[1].indexOf(nextKey);
                if (typeof arrayIdx === 'number' && arrayIdx > -1){
                    foundPropertyName = p[0];
                } else {
                    arrayIdx = null;
                }
            }
        });
        if (getArrayIndex){
            return [foundPropertyName, arrayIdx];
        }
        return foundPropertyName;
    }

    constructor(props){
        super(props);
        this.generateCrumbTitle = this.generateCrumbTitle.bind(this);
        this.toggleOpen = _.throttle(this.toggleOpen.bind(this), 500);
        this.generateHierarchicalTitles = this.generateHierarchicalTitles.bind(this);
        this.state = { 'open' : true };
    }

    handleClick(keyIdx, e){
        e.preventDefault();
        this.props.setSubmissionState('currKey', keyIdx);
    }

    toggleOpen(e){
        e.preventDefault();
        this.setState({ 'open' : !this.state.open });
    }

    generateCrumbTitle(numKey, i = 0, hierarchyKeyList = null){
        var { currKey, keyTypes, keyDisplay, hierarchy, schemas, fullScreen, actionButtons, keyContext } = this.props;
        if (hierarchyKeyList === null){
            hierarchyKeyList = [numKey];
        }
        var icon = i === 0 ? null : <i className="icon icon-fw">&crarr;</i>;
        var isLast = i + 1 === hierarchyKeyList.length;
        var parentPropertyName = null;
        if (i !== 0){
            try {
                var [ parentPropertyNameUnsanitized, parentPropertyValueIndex ] = DetailTitleBanner.getContextPropertyNameOfNextKey(  keyContext[hierarchyKeyList[i - 1]]  ,  hierarchyKeyList[i]  ,  true  );
                parentPropertyName = Schemas.Field.toName(parentPropertyNameUnsanitized, Schemas.get(), false, keyTypes[hierarchyKeyList[i - 1]]);
                if (parentPropertyValueIndex !== null){
                    parentPropertyName += ' (Item #' + (parentPropertyValueIndex + 1) + ')';
                }
            } catch (e){ console.warn('Couldnt get property name for', keyContext[hierarchyKeyList[i - 1]], hierarchyKeyList[i]); }
        }
        return (
            <Collapse in transitionAppear={(hierarchyKeyList.length !== 1)} key={i}>
                <div className={"title-crumb depth-level-" + i + (isLast ? ' last-title' : ' mid-title')}>
                    <div className="submission-working-title">
                        <span onClick={this.handleClick.bind(this, numKey)}>
                            { icon }
                            { parentPropertyName ? <span className="next-property-name">{ parentPropertyName }: </span> : null }
                            <span className='working-subtitle'>{ Schemas.getTitleForType(keyTypes[numKey], schemas || Schemas.get()) }</span> <span>{ keyDisplay[numKey] }</span>
                        </span>
                    </div>
                </div>
            </Collapse>
        );
    }

    generateHierarchicalTitles(){
        return _.map(DetailTitleBanner.getListOfKeysInPath(this.props.hierarchy, this.props.currKey), this.generateCrumbTitle);
    }

    render(){
        if (this.props.fullScreen) return null;
        return (
            <h3 className="crumbs-title mb-2">
                <div className="subtitle-heading form-section-heading mb-08">
                    <span className="inline-block clickable" onClick={this.toggleOpen}>
                        Currently Editing { this.props.currKey > 0 ? <i className={"icon icon-fw icon-caret-" + (this.state.open ? 'down' : 'right')} /> : null }
                    </span>
                </div>
                { this.state.open ? this.generateHierarchicalTitles() : this.generateCrumbTitle(this.props.currKey) }
            </h3>
        );
    }
}

class TypeSelectModal extends React.Component {

    constructor(props){
        super(props);
        this.onHide = this.onHide.bind(this);
        this.onContainerKeyDown = this.onContainerKeyDown.bind(this);
    }

    onHide(){
        if (this.props.creatingIdx === 0){
            // If just starting (creating first item / idx), navigate to non-edit version of page we are currently on.
            this.props.cancelCreatePrimaryObject(true);
        } else if (this.props.creatingIdx > 0){
            // Else cancel creating new object by unsetting temporary state & values.
            this.props.cancelCreateNewObject();
        }
    }

    onContainerKeyDown(enterKeyCallback, event){
        if (event.which == 13 || event.keyCode == 13) {
            enterKeyCallback(event);
            return false;
        }
        return true;
    }

    render(){
        var { show, ambiguousType, ambiguousSelected, buildAmbiguousEnumEntry, submitAmbiguousType, schemas } = this.props;
        if (!show) return null;

        var ambiguousDescrip = null;
        if (ambiguousSelected !== null && schemas[ambiguousSelected].description){
            ambiguousDescrip = schemas[ambiguousSelected].description;
        }
        return (
            <Modal show onHide={this.onHide} className="submission-view-modal">
                <Modal.Header closeButton>
                    <Modal.Title>{'Multiple object types found for your new ' + ambiguousType}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div onKeyDown={this.onContainerKeyDown.bind(this, submitAmbiguousType)}>
                        <p style={{'marginBottom':'15px'}}>
                            {'Please select a specific object type from the menu below.'}
                        </p>
                        <div className="input-wrapper" style={{'marginBottom':'15px'}}>
                            <DropdownButton bsSize="small" id="dropdown-size-extra-small" title={ambiguousSelected || "No value"}>
                                {ambiguousType !== null ?
                                    Schemas.itemTypeHierarchy[ambiguousType].map((val) => buildAmbiguousEnumEntry(val))
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
                        <Button bsSize="xsmall" bsStyle="success" disabled={ambiguousSelected === null} onClick={submitAmbiguousType}>
                            Submit
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }
}

/** Ordinary React Component which just inherits TypeSelectModal.onHide() */
class AliasSelectModal extends TypeSelectModal {

    render(){
        var { show, creatingType, creatingAlias, handleAliasChange, creatingAliasMessage, submitAlias, currentSubmittingUser } = this.props;
        if (!show) return null;

        return (
            <Modal show onHide={this.onHide} className="submission-view-modal">
                <Modal.Header closeButton>
                    <Modal.Title>{'Give your new ' + creatingType +' an alias'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div onKeyDown={this.onContainerKeyDown.bind(this, submitAlias)}>
                        <p className="mt-0 mb-1">Aliases are lab specific identifiers to reference an object. The format is <code>{'<lab-name>:<identifier>'}</code> - a lab name and an identifier separated by a colon, e.g. <code>dcic-lab:42</code>.</p>
                        <p className="mt-0 mb-1">Please create your own alias to help you to refer to this Item later.</p>
                        <div className="input-wrapper mt-2 mb-2">
                            <AliasInputField value={creatingAlias} errorMessage={creatingAliasMessage} onAliasChange={handleAliasChange} currentSubmittingUser={currentSubmittingUser} />
                        </div>
                        <Collapse in={creatingAliasMessage !== null}>
                            <div style={{'marginBottom':'15px', 'color':'#7e4544','fontSize':'1.2em'}}>
                                {creatingAliasMessage}
                            </div>
                        </Collapse>
                        <div className="text-right">
                            <Button type="button" bsStyle="danger" onClick={this.onHide}>Cancel / Exit</Button>
                            {' '}
                            <Button type="button" bsStyle="success" disabled={creatingAlias.indexOf(':') < 0 || (creatingAlias.indexOf(':') + 1 === creatingAlias.length)} onClick={submitAlias}>Submit</Button>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }
}



/**
 * Main view for editing a specific object. This includes all non-same level
 * linkTo object relationships and non-file upload fields.
 * Essentially, this takes data held by the container component and passes it down
 * to the correct BuildFields. Also interfaces with SubmissionView to change
 * the context for this specific object and create custom and/or pre-existing
 * objects. Render changes slightly for RoundTwo.
 *
 * @class IndividualObjectView
 * @see SubmissionView
 * @prop {number} currKey - Current key being edited.
 */
class IndividualObjectView extends React.Component{

    constructor(props){
        super(props);
        this.modifyNewContext = this.modifyNewContext.bind(this);

        /**
         * State in this component mostly has to do with selection of existing objs
         *
         * @prop {!string} selectType           Type of existing object being selected (i.e. ExperimentHiC).
         * @prop {!Object} selectData           Initial collection context fed to Search, given by LinkedObj in submission-fields.js.
         * @prop {!string} selectQuery          Search query held by this component for in-place navigation
         * @prop {!string} selectField          Actual fieldname that we're selecting the existing obj for. May be nested in the case of subobjects, e.g. experiments_in_set.experiment
         * @prop {!number[]} selectArrayIdx     List of int numbers keeping track of list positions of the object we're selecting for. Since you can have arrays within arrays, one int won't do. Example: [1,2] would mean the current field is the second item within the first item of the array given by the top level field. When null, no arrays involved.
         * @prop {boolean} fadeState            Controls whether a fade animation should be triggered in render
         */
        this.state = {
            'selectType'    : null,
            'selectData'    : null,
            'selectQuery'   : null,
            'selectField'   : null,
            'selectLink'    : null,
            'selectArrayIdx': null,
            'fadeState'     : false
        };
    }

    /** Fade the JSX rendered by this and scroll to top when this.props.currKey changes. */
    componentWillReceiveProps(nextProps){
        // scroll to top if worked-on object changes
        if(this.props.currKey !== nextProps.currKey){
            //setTimeout(layout.animateScrollTo(0), 100);
            this.setState({'fadeState': true});
        }else{
            this.setState({'fadeState': false});
        }
    }

    /**
     * Takes a field and value and modifies the keyContext held in parent.
     * Also uses the fieldType, which is unique among BuildField children,
     * to direct any special functionality (such as running initCreateObj for
     * new linked objects). Also takes the linkTo field of the new context,
     * arrayIdxs used, and object type if applicable. If field == 'aliases',
     * change keyDisplay to reflect the new alias name.
     *
     * The format of field is nested to allow for subobjects. For example, for the
     * Related experiments flag, the actual linkTo experiment is stored using the
     * following field: experiment_relation.experiment. ArrayIdx is an array of
     * array indeces used to reference the specific value of the field. For example,
     * if a value is submitted for the 3rd array element inside the 2nd array element
     * of a larger field, arrayIdx would be [1,2].
     *
     * @param {string} field        Name of field on parent Item for which a value is being changed.
     * @param {any} value           New value we are setting for this field.
     * @param {string} fieldType    Internal descriptor for field type we're editing.
     * @param {string} newLink      Schema-formatted property name for linked Item property, e.g. 'Biosources', 'Treatments', 'Cell Culture Information' when editing a parent "Biosample" Item.
     * @param {!number} arrayIdx    Index in array of value when entire value for property is an array.
     * @param {!string} type        Type of Item we're linking to, if creating new Item/object only, if property is a linkTo. E.g. 'ExperimentSetReplicate', 'BiosampleCellCulture', etc.
     */
    modifyNewContext(field, value, fieldType, newLink, arrayIdx=null, type=null){
        if(fieldType === 'new linked object'){
            value = this.props.keyIter + 1;
            if(this.props.roundTwo){
                alert('Objects cannot be created in the stage of submission. Please select an existing one.');
                return;
            }
        }
        var splitField = field.split('.');
        var splitFieldLeaf = splitField[splitField.length-1];
        var arrayIdxPointer = 0;
        var contextCopy = this.props.currContext;
        var pointer = contextCopy;
        var prevValue = null;
        for (var i=0; i < splitField.length - 1; i++){
            if(pointer[splitField[i]]){
                pointer = pointer[splitField[i]];
            }else{
                console.error('PROBLEM CREATING NEW CONTEXT WITH: ', field, value);
                return;
            }
            if(Array.isArray(pointer)){
                pointer = pointer[arrayIdx[arrayIdxPointer]];
                arrayIdxPointer += 1;
            }
        }
        if(Array.isArray(pointer[splitFieldLeaf]) && fieldType !== 'array'){
            // move pointer into array
            pointer = pointer[splitFieldLeaf];
            prevValue = pointer[arrayIdx[arrayIdxPointer]];
            if(value === null){ // delete this array item
                pointer.splice(arrayIdx[arrayIdxPointer], 1);
            }else{
                pointer[arrayIdx[arrayIdxPointer]] = value;
            }
        }else{ // value we're trying to set is not inside an array at this point
            prevValue = pointer[splitFieldLeaf];
            pointer[splitFieldLeaf] = value;
        }
        // actually change value
        this.props.modifyKeyContext(this.props.currKey, contextCopy);
        if(fieldType === 'new linked object'){
            // value is new key index in this case
            this.props.initCreateObj(type, value, newLink, false, field);
        }
        if(fieldType === 'linked object'){
            this.checkObjectRemoval(value, prevValue);
        }
        if(splitFieldLeaf === 'aliases' || splitFieldLeaf === 'name' || splitFieldLeaf === 'title'){
            this.props.modifyAlias();
        }
    }

    /** Simple function, return the currContext. Used in BuildField */
    getCurrContext = () => {
        return this.props.currContext;
    }

    /** Simple function, return the current schema. Used in BuildField */
    getCurrSchema = () => {
        return this.props.schemas[this.props.currType];
    }

    /**
     * Use ajax to get the display_title for an existing object. Use that to kicks
     * of the addExistingObj process; if a title can't be found, use the object
     * path as a fallback.
     */
    fetchObjTitle = (value, type, newLink) => {
        ajax.promise(value).then(data => {
            if (data['display_title']){
                this.props.addExistingObj(value, data['display_title'], type, newLink);
            }else{
                this.props.addExistingObj(value, value, type, newLink);
            }
        });
    }

    /**
     * If a value is null that was previously non-null, remove the linked object
     * from the current context and change state in SubmissionView accordingly.
     */
    checkObjectRemoval = (value, prevValue) => {
        if(value === null){
            this.props.removeObj(prevValue);
        }
    }

    /**
     * Navigation function passed to Search so that faceting can be done in-place
     * through ajax. If no results are returned from the search, abort.
     */
    inPlaceNavigate = (destination, options, callback) => {
        if(this.state.selectQuery){
            var dest = destination;
            // ensure destination is formatted correctly when clearing/removing filters
            if(destination == '/'){
                dest = '/search/?type=' + this.state.selectType;
            }else if(destination.slice(0,8) != '/search/' && destination.slice(0,1) == '?'){
                dest = '/search/' + destination;
            }
            ajax.promise(dest).then(data => {
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
                    this.props.setSubmissionState('fullScreen', false);
                }
            }).then(data => {
                if (typeof callback === 'function'){
                    callback(data);
                }
            });
        }
    }

    /**
     * Initializes the first search (with just type=<type>) and sets state
     * accordingly. Set the fullScreen state in SubmissionView to alter its render
     * and hide the object navigation tree.
     */
    selectObj = (collection, field, newLink, array=null) => {
        ajax.promise('/' + collection + '/?format=json').then(data => {
            if (data && data['@graph']){
                var results = data['@graph'];
                if(results.length > 0){
                    setTimeout(layout.animateScrollTo(0), 100);
                    this.setState({
                        'selectType': collection,
                        'selectData': data,
                        'selectQuery': '/search/?type=' + collection,
                        'selectField': field,
                        'selectLink': newLink,
                        'selectArrayIdx': array
                    });
                    this.props.setSubmissionState('fullScreen', true);
                }else{ // this is not a great long-term solution
                    alert('No objects of this type exist yet! Please use "Create new"');
                }
            }
        });
    }

    /**
     * Callback passed to Search to select a pre-existing object. Cleans up
     * object selection state, modifies context, and initializes the fetchObjTitle
     * process.
     */
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
        this.props.setSubmissionState('fullScreen', false);
    }

    /**
     * Exit out of the selection process and clean up state
     */
    selectCancel = (e) => {
        e.preventDefault();
        this.modifyNewContext(this.state.selectField, null, 'existing linked object', this.state.selectLink, this.state.selectArrayIdx);
        this.setState({
            'selectType': null,
            'selectData': null,
            'selectQuery': null,
            'selectField': null,
            'selectLink': null,
            'selectArrayIdx': null
        });
        this.props.setSubmissionState('fullScreen', false);
    }

    /**
     * Given a field, use the schema to generate the sufficient information to
     * make a BuildField component for that field. Different fields are returned
     * for roundOne and roundTwo.
     */
    initiateField = (field) => {
        var currSchema = this.props.schemas[this.props.currType];
        var fieldSchema = object.getNestedProperty(currSchema, ['properties', field], true);
        if(!fieldSchema) return null;
        var secondRoundField = fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round';
        var fieldTitle = fieldSchema.title || field;
        if(this.props.roundTwo && !secondRoundField){
            return null;
        }else if(!this.props.roundTwo && secondRoundField){
            // return a placeholder informing user that this field is for roundTwo
            return(
                <div key={fieldTitle} className="row field-row" required={false} title={fieldTitle} style={{'overflow':'visible'}}>
                    <div className="col-sm-12 col-md-4">
                        <h5 className="facet-title submission-field-title">
                            {fieldTitle}
                        </h5>
                    </div>
                    <div className="col-sm-12 col-md-8">
                        <div className="field-container">
                            <div className="notice-message">This field is available after finishing initial submission.</div>
                        </div>
                    </div>
                </div>
            );
        }
        var fieldTip = fieldSchema.description ? fieldSchema.description : null;
        if(fieldSchema.comment){
            fieldTip = fieldTip ? fieldTip + ' ' + fieldSchema.comment : fieldSchema.comment;
        }
        var fieldType = fieldSchema.type ? fieldSchema.type : "text";
        var fieldValue = this.props.currContext[field] || null;
        var enumValues = [];
        var isLinked = false;
        // transform some types...
        if(fieldType == 'string'){
            fieldType = 'text';
        }
        // check if this is an enum
        if(fieldSchema.enum || fieldSchema.suggested_enum){
            fieldType = 'enum';
            enumValues = fieldSchema.enum || fieldSchema.suggested_enum;
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
            // when editing a File principal object.
            // there may be a bug where status automatically gets reset to uploading
            // when edit is PUT, despite the file not changing. That's a wrangler issue
            var path = this.props.keyComplete[this.props.currKey];
            var completeContext = this.props.keyContext[path];
            var statusCheck = completeContext.status && (completeContext.status == 'uploading' || completeContext.status == 'upload failed');
            if(this.props.edit){
                if(statusCheck){
                    fieldType = 'file upload';
                }else{
                    return null;
                }
            }else{
                fieldType = 'file upload';
            }
        }
        // set a required flag if this field is required
        var required = _.contains(currSchema.required, field);
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
                md5Progress={this.props.md5Progress}
                required={required}
                linkType={linked}
                isLinked={isLinked}
                selectObj={this.selectObj}
                getCurrContext={this.getCurrContext}
                getCurrSchema={this.getCurrSchema}
                title={fieldTitle}
                arrayIdx={null}
                edit={this.props.edit}
                create={this.props.create}
                keyDisplay={this.props.keyDisplay}
                keyComplete={this.props.keyComplete}
                setSubmissionState={this.props.setSubmissionState}
                updateUpload={this.props.updateUpload}
                upload={this.props.upload}
                uploadStatus={this.props.uploadStatus}
                currentSubmittingUser={this.props.currentSubmittingUser}
            />
        );
    }

    /**
     * Render the fieldPanels which contain the BuildFields for regular field and
     * linked object fields, respectively.
     *
     * On round two, combine all types of BuildFields and also render a
     * RoundTwoDetailPanel, which shows the attributes for the already submitted
     * object.
     */
    render(){
        var fields = this.props.currContext ? _.keys(this.props.currContext) : [];
        var buildFields = [];
        var linkedObjs = [];
        var detailContext;
        var i;
        var built;
        var fieldComponents = sortPropFields(_.filter(
            _.map(fields, this.initiateField),
            function(f){ return !!f; } // Removes falsy (e.g. null) items.
        ));
        if(this.props.roundTwo){
            var path = this.props.keyComplete[this.props.currKey];
            detailContext = this.props.keyContext[path];
        }
        // sort fields first by requirement and secondly alphabetically. These are JSX BuildField components.
        //fieldComponents = sortPropFields(fieldComponents);
        var selecting = false;
        if(this.state.selectData !== null){
            selecting = true;
        }
        return(
            <div>
                <Fade in={selecting} transitionAppear={true}>
                    <div>
                        <div>
                            {selecting ?
                                <Button bsStyle="danger" onClick={this.selectCancel}>
                                    {'Cancel selection'}
                                </Button>
                                : null
                            }
                        </div>
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
                        <FormFieldsContainer children={fieldComponents} currKey={this.props.currKey}/>
                        {
                            this.props.roundTwo ?
                            <RoundTwoDetailPanel schemas={this.props.schemas} context={detailContext} open={true} />
                            :
                            null
                        }
                    </div>
                </Fade>
            </div>
        );
    }
}

class FormFieldsContainer extends React.Component {
    render(){
        if(React.Children.count(this.props.children) === 0) return null;
        return(
            <div className="form-fields-container">
                <h4 className="clearfix page-subtitle form-section-heading submission-field-header">Fields & Dependencies</h4>
                <div>
                    { this.props.children }
                </div>
            </div>
        );
    }
}

/**
 * Simple Component that holds open/close logic and renders the BuildFields passed
 * to it.
 */
class FieldPanel extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            'open': this.props.open || false
        };
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

/**
 * Simple Component that opens/closes and renders a Detail panel using the context
 * and schemas passed to it.
 */
class RoundTwoDetailPanel extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            'open': this.props.open || false
        };
    }

    handleToggle = (e) => {
        e.preventDefault();
        this.setState({'open': !this.state.open});
    }

    render(){
        return(
            <div className="current-item-properties round-two-panel">
                <h4 className="clearfix page-subtitle submission-field-header">
                    <Button bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                        <i className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                    </Button>
                    <span>
                        {'Object attributes'}
                    </span>
                </h4>
                <Collapse in={this.state.open}>
                    <div className="item-page-detail">
                        <Detail excludedKeys={Detail.defaultProps.excludedKeys.concat('upload_credentials')} context={this.props.context} schemas={this.props.schemas} open={false} popLink={true}/>
                    </div>
                </Collapse>
            </div>

        );
    }
}

/***** MISC. FUNCIONS *****/

/**
 * Build context based off an object's and populate values from
 * pre-existing context. Empty fields are given null value.
 * All linkTo fields are added to objList.
 * If initObjs provided (edit or clone functionality), pre-existing objs will be added.
 * Also checks user info to see if user is admin, which affects which fields are displayed.
 */
export function buildContext(context, schema, objList=null, edit=false, create=true, roundTwoSwitch=null, initObjs=null){
    var built = {};
    var userInfo = JWT.getUserInfo();
    var userGroups = [];
    if (userInfo){
        var currGroups = object.getNestedProperty(userInfo, ['details', 'groups'], true);
        if(currGroups && Array.isArray(currGroups)){
            userGroups = currGroups;
        }
    }
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
            // if admin, allow import_items fields
            if (fieldSchema.permission && fieldSchema.permission == "import_items"){
                if(!_.contains(userGroups, 'admin')){
                    continue;
                }
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
            if(objList !== null){
                var linked = delveObject(fieldSchema);
                var roundTwoExclude = fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round';
                if(linked !== null && !roundTwoExclude){
                    var listTerm = fieldSchema.title ? fieldSchema.title : linked;
                    if(!_.contains(objList, listTerm)) objList.push(listTerm);
                    // add pre-existing linkTo objects
                    if(initObjs !== null && built[fields[i]] !== null){
                        delvePreExistingObjects(initObjs, built[fields[i]], fieldSchema, listTerm, linked);
                    }
                }
                objList.sort();
            }
        }
    }
    return built;
}


/**
 * Takes an initObjs array that it will fill with data for each existing
 * object in an edit/clone situation. json is json content for the field,
 * schema is the individual fields schema. Recursively handles objects and arrays
 */
var delvePreExistingObjects = function myself(initObjs, json, schema, listTerm, linked){
    var populateInitObjs = function(initObjs, data, listTerm, linked){
        var initData = {};
        initData.path = data;
        initData.display = data;
        initData.newLink = listTerm;
        initData.type = linked;
        initObjs.push(initData);
    };
    if(Array.isArray(json)){
        for(var j=0; j < json.length; j++){
            if(schema.items){
                delvePreExistingObjects(initObjs, json[j], schema.items, listTerm, linked);
            }
        }
    }else if (json instanceof Object && json){
        if(schema.properties){
            _.keys(json).forEach(function(key, idx){
                if(schema.properties[key]){
                    delvePreExistingObjects(initObjs, json[key], schema.properties[key], listTerm, linked);
                }
            });
        }
    }else if (_.contains(_.keys(schema),'linkTo')) { // non-array, non-object field. check schema to ensure there's a linkTo
        populateInitObjs(initObjs, json, listTerm, linked);
    }
};

/** Sort a list of BuildFields first by required status, then by schema lookup order, then by title */
function sortPropFields(fields){
    var reqFields = [];
    var optFields = [];

    /** Compare by schema property 'lookup' meta-property, if available. */
    function sortSchemaLookupFunc(a,b){
        if (a.props.schema && b.props.schema){
            var aLookup = a.props.schema.lookup || 750, bLookup = b.props.schema.lookup || 750;
            if (typeof aLookup === 'number' && typeof bLookup === 'number') {
                return aLookup - bLookup;
            }
        } else {
            if (a.props.schema && !b.props.schema) return -1;
            if (b.props.schema && !a.props.schema) return 1;
        }
        return 0;
    }

    function sortTitle(a,b){
        if (typeof a.props.title === 'string' && typeof b.props.title === 'string'){
            if(a.props.title.toUpperCase() < b.props.title.toUpperCase()) return -1;
            if(a.props.title.toUpperCase() > b.props.title.toUpperCase()) return 1;
        }
        return 0;
    }

    _.forEach(fields, function(field){
        if (!field) return;
        if (field.props.required) {
            reqFields.push(field);
        } else {
            optFields.push(field);
        }
    });
    reqFields.sort(sortTitle).sort(sortSchemaLookupFunc);
    optFields.sort(sortTitle).sort(sortSchemaLookupFunc);
    return reqFields.concat(optFields);
}

/**
 * Function to recursively find whether a json object contains a linkTo fields
 * anywhere in its nested structure. Returns object type if found, null otherwise.
 */
var delveObject = function myself(json){
    var found_obj = null;
    _.keys(json).forEach(function(key, index){
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
};

/**
 * Given the parent object key and a new object key, return a version
 * of this.state.keyHierarchy that includes the new parent-child relation.
 * Recursive function
 */
var modifyHierarchy = function myself(hierarchy, keyIdx, parentKeyIdx){
    _.keys(hierarchy).forEach(function(key, index){
        if(key == parentKeyIdx){
            hierarchy[parentKeyIdx][keyIdx] = {};
        }else{
            hierarchy[key] = myself(hierarchy[key], keyIdx, parentKeyIdx);
        }
    });
    return hierarchy;
};

/** Remove given key from hierarchy. Recursive function. */
var trimHierarchy = function myself(hierarchy, keyIdx){
    if(hierarchy[keyIdx]){
        delete hierarchy[keyIdx];
    }else{
        _.keys(hierarchy).forEach(function(key, index){
            hierarchy[key] = myself(hierarchy[key], keyIdx);
        });
    }
    return hierarchy;
};

/**
 * Returns the entire hierarchy below for the given keyIdx. keyIdx must be a
 * number (custom object). Recursive function.
 */
var searchHierarchy = function myself(hierarchy, keyIdx){
    if(!hierarchy) return null;
    var found_hierarchy = null;
    _.keys(hierarchy).forEach(function(key, index){
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
};

/** Finds the key of direct parent for a given key in a hierarchy */
var findParentFromHierarchy = function myself(hierarchy, keyIdx){
    if(isNaN(keyIdx) || !hierarchy) return null;
    var found_parent = null;
    _.keys(hierarchy).forEach(function(key, index){
        if(keyIdx in hierarchy[key]){
            found_parent = key;
        }else{
            var test = myself(hierarchy[key], keyIdx);
            if(test !== null) found_parent = test;
        }
    });
    return found_parent;
};

/** Replace a key with a different key in the hierarchy */
var replaceInHierarchy = function myself(hierarchy, current, toReplace){
    if (typeof current === 'number') current = current + '';
    _.keys(hierarchy).forEach(function(key, index){
        if(key === current){
            var downstream = hierarchy[key];
            hierarchy[toReplace] = downstream;
            delete hierarchy[key];
        }else{
            hierarchy[key] = myself(hierarchy[key], current, toReplace);
        }
    });
    return hierarchy;
};

/** Return a list of all keys contained within a given hierarchy */
var flattenHierarchy = function myself(hierarchy){
    var found_keys = [];
    _.keys(hierarchy).forEach(function(key, index){
        if(!isNaN(key)) key = parseInt(key);
        var sub_keys = myself(hierarchy[key]);
        found_keys = _.union(found_keys, sub_keys, [key]);
    });
    return found_keys;
};


/**
 * Remove any field with a null value from given json context.
 * also remove empty arrays and objects
 *
 * @param {Object} context - Object representing an Item, with properties & values.
 * @returns {Object} The same context which was passed in, minus null-y values.
 */
var removeNulls = function myself(context){
    _.keys(context).forEach(function(key, index){
        if(context[key] === null){
            delete context[key];
        }else if(Array.isArray(context[key]) && (context[key].length === 0 || (context[key].length === 1 && context[key][0] === null))){
            delete context[key];
        }else if(context[key] instanceof Object){
            if(_.keys(context[key]).length === 0){
                delete context[key];
            }else{
                context[key] = myself(context[key]);
            }
        }
    });
    return context;
};
