'use strict';

import React from 'react';
import _ from 'underscore';
import url from 'url';
import queryString from 'query-string';
import { ajax, console, JWT, object, layout, Schemas, itemTypeHierarchy } from '../util';
//import { s3UploadFile } from '../util/aws';
import { DropdownButton, Button, MenuItem, Panel, Table, Collapse, Fade, Modal, InputGroup, FormGroup, FormControl } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import { getLargeMD5 } from '../util/file';
import Alerts from '../alerts';
import { Detail } from './../item-pages/components/ItemDetailList';

import { SubmissionTree, fieldSchemaLinkToType, fieldSchemaLinkToPath } from './components/SubmissionTree';
import { BuildField, AliasInputField, isValueNull } from './components/submission-fields';

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
 * @prop {boolean} create   Is this a new Item being created?
 * @prop {boolean} edit     Is this an Item being edited?
 */
export default class SubmissionView extends React.PureComponent{

    /**
     * Function to look at a specific object (reference by key) and
     * use searchHierarchy() to see if the children of the given key
     * contain any un-submitted custom objects. If they do, return
     * 1 (ready to validate). Otherwise return 0 (not ready to validate)
     *
     * @todo maybe memoize this and replace usage of state.keyValid w/ it.
     */
    static findValidationState(keyIdx, prevKeyHierarchy, keyContext, keyComplete){
        const hierarchy = object.deepClone(prevKeyHierarchy);
        const keyHierarchy = searchHierarchy(hierarchy, keyIdx);
        if (keyHierarchy === null) return 0;
        var validationReturn = 1;
        _.keys(keyHierarchy).forEach(function(key, index){
            if(!isNaN(key)){
                if (!keyComplete[key] && keyContext[key]){
                    validationReturn = 0;
                }
            }
        });
        return validationReturn;
    }

    static principalTitle(context, edit, create, itemType=null){
        let principalDisplay; // Name of our current Item being created.
        if (create === true && !edit){
            principalDisplay = 'New ' + itemType;
        } else if (edit === true && !create){
            if (context && typeof context.accession === 'string'){
                principalDisplay = context.accession;
            } else {
                principalDisplay = itemType;
            }
        }
        return principalDisplay;
    }

    constructor(props){
        super(props);

        _.bindAll(this, 'modifyKeyContext', 'initializePrincipal', 'initCreateObj',
            'initCreateAlias', 'submitAmbiguousType', 'buildAmbiguousEnumEntry', 'handleTypeSelection',
            'handleAliasChange', 'handleAliasLabChange', 'submitAlias', 'modifyAlias', 'createObj', 'removeObj',
            'initExistingObj', 'addExistingObj', 'setSubmissionState', 'updateUpload',
            'testPostNewContext', 'realPostNewContext', 'removeNullsFromContext', 'checkRoundTwo',
            'buildDeleteFields', 'modifyMD5Progess', 'submitObject', 'finishRoundTwo', 'cancelCreateNewObject', 'cancelCreatePrimaryObject'
        );

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
            'keyHierarchy'          : { 0: {} },   // initalize with principal item at top
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
            'currentSubmittingUser' : null,
            'edit'                  : props.currentAction === 'edit',
            'create'                : (props.currentAction === 'create' || props.currentAction === 'add')
        };
    }

    /**
     * Call initializePrincipal to get state set up, but only if schemas are
     * available.
     */
    componentDidMount(){
        const { schemas } = this.props;
        if (schemas && _.keys(schemas).length > 0){
            this.initializePrincipal();
        }
    }

    /**
     * If schemas in props change (this should not happen often), re-initialize.
     * The main functionality of this is to wait for schemas if they're not
     * available on componentDidMount.
     */
    componentDidUpdate(pastProps, pastState){
        const { schemas, currentAction } = this.props;
        if (schemas && schemas !== pastProps.schemas){
            if (pastState.currKey === null){
                this.initializePrincipal();
            }
        }
        if (currentAction !== pastProps.currentAction){
            var edit = ncurrentAction === 'edit';
            var create = (currentAction === 'create' || currentAction === 'add');
            this.setState({ edit, create });
        }
    }

    /**
     * Function that modifies new context and sets validation state whenever
     * a modification occurs
     *
     * @param {number} objKey - Key of Item being modified.
     * @param {Object} newContext - New Context/representation for this Item to be saved.
     */
    modifyKeyContext(objKey, newContext){
        this.setState(({ keyContext, keyValid, keyHierarchy : prevKeyHierarchy, keyComplete }) => {
            const contextCopy = object.deepClone(keyContext);
            const validCopy   = object.deepClone(keyValid);
            contextCopy[objKey] = newContext;

            // TODO maybe get rid of this state.keyValid and just use memoized static function.
            validCopy[objKey] = SubmissionView.findValidationState(objKey, prevKeyHierarchy, keyContext, keyComplete);
            return {
                'keyContext': contextCopy,
                'keyValid': validCopy
            };
        }, ReactTooltip.rebuild);
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
    initializePrincipal(){
        const { context, schemas, href, setIsSubmitting } = this.props;
        const { edit, create } = this.state;
        const initContext = {};
        const contextID = object.itemUtil.atId(context) || null;
        var principalTypes = context['@type'];
        if (principalTypes[0] === 'Search' || principalTypes[0] === 'Browse'){
            // If we're creating from search or browse page, use type from href.
            let typeFromHref = url.parse(href, true).query.type || 'Item';
            if (Array.isArray(typeFromHref)) {
                [ typeFromHref ] = _.without(typeFromHref, 'Item');
            }
            if (typeFromHref && typeFromHref !== 'Item') principalTypes = [ typeFromHref ]; // e.g. ['ExperimentSetReplicate']
        }
        var initType = { 0 : principalTypes[0] };
        var initValid = { 0 : 1 };
        var initDisplay = { 0 : SubmissionView.principalTitle(context, edit, create, principalTypes[0]) };
        var initBookmarks = {};
        var bookmarksList = [];
        var schema = schemas[principalTypes[0]];
        var existingAlias = false;

        // Step A : Get labs from User, in order to autogenerate alias.
        var userInfo = JWT.getUserInfo(); // Should always succeed, else no edit permission..
        var userHref = null;
        if (userInfo && Array.isArray(userInfo.user_actions)){
            userHref = _.findWhere(userInfo.user_actions, { 'id' : 'profile' }).href;
        } else {
            userHref = '/me';
        }

        // Step B : Callback for after grabbing user w/ submits_for
        const continueInitProcess = () => {
            // if @id cannot be found or we are creating from scratch, start with empty fields
            if (!contextID || create){
                // We may not have schema (if Abstract type). If so, leave empty and allow initCreateObj ... -> createObj() to create it.
                if (schema) initContext[0] = buildContext({}, schema, bookmarksList, edit, create);
                initBookmarks[0] = bookmarksList;
                this.setState({
                    'keyContext': initContext,
                    'keyValid': initValid,
                    'keyTypes': initType, // Gets updated in submitAmbiguousType
                    'keyDisplay': initDisplay,
                    'currKey': 0,
                    'keyLinkBookmarks': initBookmarks
                }, () => {
                    this.initCreateObj(principalTypes[0], 0, 'Primary Object');
                });
            } else {
                // get the DB result to avoid any possible indexing hang-ups
                ajax.promise(contextID + '?frame=object&datastore=database').then((response) => {
                    const reponseAtID = object.itemUtil.atId(response);
                    const initObjs = []; // Gets modified/added-to in-place by buildContext.

                    if (reponseAtID && reponseAtID === contextID){
                        initContext[0] = buildContext(response, schema, bookmarksList, edit, create, initObjs);
                        initBookmarks[0] = bookmarksList;
                        if (edit && response.aliases && response.aliases.length > 0){
                            // we already have an alias for editing, so use it for title
                            // setting creatingIdx and creatingType to null prevents alias creation
                            initDisplay[0] = response.aliases[0];
                            existingAlias = true;
                        }
                    } else {
                        // something went wrong with fetching context. Just use an empty object
                        initContext[0] = buildContext({}, schema, bookmarksList, edit, create);
                        initBookmarks[0] = bookmarksList;
                    }

                    this.setState({
                        'keyContext': initContext,
                        'keyValid': initValid,
                        'keyTypes': initType,
                        'keyDisplay': initDisplay,
                        'currKey': 0,
                        'keyLinkBookmarks': initBookmarks
                    }, ()=>{
                        _.forEach(initObjs, (initObj, idx) => this.initExistingObj(initObj));
                        // if we are cloning and there is not an existing alias
                        // never prompt alias creation on edit
                        // do not initiate ambiguous type lookup on edit or create
                        if (!edit && !existingAlias){
                            this.initCreateObj(principalTypes[0], 0, 'Primary Object', true);
                        }
                    });
                });
            }
            // set state in app to prevent accidental mid-submission navigation
            setIsSubmitting(true);
        };

        // Grab current user via AJAX and store to state. To use for alias auto-generation using current user's top submits_for lab name.
        ajax.load(userHref + '?frame=embedded', (r)=>{
            this.setState({ 'currentSubmittingUser' : r }, continueInitProcess);
        }, 'GET', continueInitProcess);
    }

    /**
     * Takes in an object type, the newIdx to create it under, the newLink linkTo
     * fieldname for it. If there are multiple available schemas for the linkTo,
     * set up the 'ambiguous lookup' process, which uses a modal to prompt the user
     * to select a type. If not an ambiguous linkTo type, move directly to alias
     * creation (initCreateAlias). If init (bool) is true, skip ambiguous type
     * lookup even if applicable and move right to alias selection.
     */
    initCreateObj(type, newIdx, newLink, init=false, parentField=null){
        // check to see if we have an ambiguous linkTo type.
        // this means there could be multiple types of linked objects for a
        // given type. let the user choose one.
        if (type in itemTypeHierarchy && !init){
            // ambiguous linkTo type found
            this.setState({
                'ambiguousIdx': newIdx,
                'ambiguousType': type,
                'ambiguousSelected': null,
                'creatingLink': newLink
            });
        } else {
            this.initCreateAlias(type, newIdx, newLink, parentField);
        }
    }

    /**
     * Takes a type, newIdx, linkTo type (newLink). Clears the state of the ambiguous object
     * type information and initializes state for the alias creation process.
     * If the current object's schemas does not support aliases, finish out the
     * creation process with createObj using a boilerplate placeholer obj name.
     */
    initCreateAlias(type, newIdx, newLink, parentField=null, extraState={}){
        const { schemas } = this.props;
        const { currentSubmittingUser } = this.state;
        const schema = (schemas && schemas[type]) || null;
        var autoSuggestedAlias = '';
        if (currentSubmittingUser && Array.isArray(currentSubmittingUser.submits_for) && currentSubmittingUser.submits_for[0] && typeof currentSubmittingUser.submits_for[0].name === 'string'){
            autoSuggestedAlias = AliasInputField.getInitialSubmitsForFirstPart(currentSubmittingUser) + ':';
        }
        if (schema && schema.properties.aliases){
            this.setState(_.extend({
                'creatingAlias'         : autoSuggestedAlias,
                'creatingIdx'           : newIdx,
                'creatingType'          : type,
                'creatingLink'          : newLink,
                'creatingLinkForField'  : parentField
            }, extraState));
        } else { // schema doesn't support aliases
            const fallbackAlias = 'My ' + type + ' ' + newIdx;
            this.createObj(type, newIdx, newLink, fallbackAlias, extraState);
        }
    }

    /**
     * Callback function used with the ambiguous input element. Called when a type
     * is selected from the enum ambiguousType list.
     * Move to initCreateAlias afterwards.
     */
    submitAmbiguousType(e){
        e.preventDefault();
        const { schemas } = this.props;
        const { ambiguousSelected : type, ambiguousIdx : newIdx, creatingLink : newLink } = this.state;
        const schema = schemas[type];
        const stateChange = {
            'ambiguousIdx'      : null,
            'ambiguousType'     : null,
            'ambiguousSelected' : null
        };
        // safety check to ensure schema exists for selected type
        if (schema && type){
            this.initCreateAlias(type, newIdx, newLink, null, stateChange);
        } else {
            this.setState(stateChange); // abort
        }
    }

    /** Simple function to generate enum entries for ambiguous types */
    buildAmbiguousEnumEntry(val){
        return(
            <MenuItem key={val} title={val || ''} eventKey={val} onSelect={this.handleTypeSelection}>
                {val || ''}
            </MenuItem>
        );
    }

    /**
     * Enum callback to change state in ambiguous type selection
     */
    handleTypeSelection(e){
        this.setState({ 'ambiguousSelected': e });
    }

    /**
     * Callback function used to change state in response to user input in the
     * alias creation process
     */
    handleAliasChange(value){
        this.setState({ 'creatingAlias': value });
    }

    /**
     * Callback function used to change state in response to user input in the
     * alias creation process
     */
    handleAliasLabChange(e){
        var inputElement = e.target;
        var currValue = inputElement.value;
        this.setState({ 'creatingAlias': currValue });
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
    submitAlias(e){
        e.preventDefault();
        e.stopPropagation();

        const { schemas } = this.props;
        const { creatingType : type, creatingIdx : newIdx, creatingLink : newLink, creatingAlias : alias, keyDisplay } = this.state;
        const schema = schemas[type];

        if (type === null || newIdx === null || newLink === null){
            return false;
        }

        // check if created object supports aliases
        const hasAlias = schema && schema.properties && schema.properties.aliases;
        if (alias.length > 0 && hasAlias){
            var patt = new RegExp('\\S+:\\S+');
            var regexRes = patt.test(alias);
            if(!regexRes){
                this.setState({ 'creatingAliasMessage': 'ERROR. Aliases must be formatted as: <text>:<text> (e.g. dcic-lab:42).' });
                return false;
            }
            for(var key in keyDisplay){
                if (keyDisplay[key] === alias){
                    this.setState({ 'creatingAliasMessage': 'You have already used this alias.' });
                    return false;
                }
            }
            // see if the input alias is already being used
            ajax.promise('/' + alias).then((data) => {
                if (data && data.title && data.title === "Not Found"){
                    this.createObj(type, newIdx, newLink, alias, {
                        'creatingIdx'           : null,
                        'creatingType'          : null,
                        'creatingLink'          : null,
                        'creatingAlias'         : '',
                        'creatingAliasMessage'  : null,
                        'creatingLinkForField'  : null
                    });
                } else {
                    this.setState({ 'creatingAliasMessage': 'ERROR. That alias is already taken.' });
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
    modifyAlias(){
        this.setState(function({ keyDisplay, keyTypes, currKey, keyContext, edit, create }){
            const currAlias = keyDisplay[currKey];
            const aliases = keyContext[currKey].aliases || null;
            // Try to get 'alias' > 'name' > 'title' > then fallback to 'My ItemType currKey'
            const name = (( Array.isArray(aliases) && aliases.length > 1 && aliases[aliases.length - 2] ) || keyContext[currKey].name || keyContext[currKey].title || null);
            const nextKeyDisplay = _.clone(keyDisplay);
            if (name) {
                nextKeyDisplay[currKey] = name;
            } else if (currKey === 0) {
                nextKeyDisplay[currKey] = SubmissionView.principalTitle(null, edit, create, keyTypes[currKey]);
            } else {
                nextKeyDisplay[currKey] = 'My ' + keyTypes[currKey] + ' ' + currKey;
            }
            if (nextKeyDisplay[currKey] === currAlias) return null;
            return { 'keyDisplay': nextKeyDisplay };
        });
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
    createObj(type, newIdx, newLink, alias, extraState={}){
        const { errorCount } = this.state;

        // get rid of any hanging errors
        for (var i=0; i < errorCount; i++){
            Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1) });
        }

        this.setState(function(currState, currProps){
            const { schemas } = currProps;
            const { keyTypes, currKey, keyHierarchy, keyIter, keyContext, keyValid, keyLinkBookmarks, keyLinks, keyDisplay : prevKeyDisplay } = currState;

            const contextCopy     = _.clone(keyContext);
            const validCopy       = _.clone(keyValid);
            const typesCopy       = _.clone(keyTypes);
            const parentKeyIdx    = currKey;
            const bookmarksCopy   = _.clone(keyLinkBookmarks);
            const linksCopy       = object.deepClone(keyLinks);
            const keyDisplay      = _.clone(prevKeyDisplay);
            const bookmarksList   = [];
            let keyIdx;
            let newHierarchy;

            if (newIdx === 0){ // initial object creation
                keyIdx = 0;
                newHierarchy = _.clone(keyHierarchy);
            } else {
                keyIdx = keyIter + 1; // increase key iter by 1 for a new unique key
                if (newIdx !== keyIdx) {
                    console.error('ERROR: KEY INDEX INCONSISTENCY!');
                    return;
                }
                newHierarchy = modifyHierarchy(_.clone(keyHierarchy), keyIdx, parentKeyIdx);
                validCopy[keyIdx] = 1; // new object has no incomplete children yet
                validCopy[parentKeyIdx] = 0; // parent is now not ready for validation
            }

            typesCopy[keyIdx] = type;
            const contextWithAlias = (contextCopy && contextCopy[keyIdx]) ? contextCopy[keyIdx] : {};
            if (Array.isArray(contextWithAlias.aliases)) {
                contextWithAlias.aliases = _.uniq(_.filter(contextWithAlias.aliases.slice(0)).concat([ alias ]));
            } else {
                contextWithAlias.aliases = [ alias ];
            }

            contextCopy[keyIdx] = buildContext(contextWithAlias, schemas[type], bookmarksList, true, false);
            bookmarksCopy[keyIdx] = bookmarksList;
            linksCopy[keyIdx] = newLink;
            keyDisplay[keyIdx] = alias;

            return _.extend({
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
                'errorCount': 0
            }, extraState);
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
     *
     * @param {number} key - Key of item to remove.
     */
    removeObj(key){
        this.setState(function({ keyContext, keyValid, keyTypes, keyComplete, keyLinkBookmarks, keyLinks, roundTwoKeys, keyHierarchy }){
            const contextCopy = object.deepClone(keyContext);
            const validCopy = object.deepClone(keyValid);
            const typesCopy = object.deepClone(keyTypes);
            const keyCompleteCopy = object.deepClone(keyComplete);
            const bookmarksCopy = _.clone(keyLinkBookmarks);
            const linksCopy = _.clone(keyLinks);
            const roundTwoCopy = roundTwoKeys.slice();
            const hierarchy = _.clone(keyHierarchy);
            let dummyHierarchy = object.deepClone(hierarchy);
            let hierKey = key;

            // the key may be a @id string and not keyIdx if already submitted
            _.keys(keyCompleteCopy).forEach(function(compKey) {
                if (keyCompleteCopy[compKey] === key) {
                    hierKey = compKey;
                }
            });

            // find hierachy below the object being deleted
            dummyHierarchy = searchHierarchy(dummyHierarchy, hierKey);
            if (dummyHierarchy === null){
                // occurs when keys cannot be found to delete
                return null;
            }

            // get a list of all keys to remove
            const toDelete = flattenHierarchy(dummyHierarchy);
            toDelete.push(key); // add this key

            // trimming the hierarchy effectively removes objects from creation process
            const newHierarchy = trimHierarchy(hierarchy, hierKey);

            // for housekeeping, remove the keys from keyLinkBookmarks, keyLinks, and keyCompleteCopy
            _.forEach(toDelete, function(keyToDelete){
                if (isNaN(keyToDelete)) return; // only remove creation data for non-sumbitted, non-preexisiting objs

                // remove key from roundTwoKeys if necessary
                // NOTE: submitted custom objects will NOT be removed from this
                // after deletion. Still give user opportunity for second round edits
                if(_.contains(roundTwoCopy, keyToDelete)){
                    var rmIdx = roundTwoCopy.indexOf(keyToDelete);
                    if(rmIdx > -1){
                        roundTwoCopy.splice(rmIdx,1);
                    }
                }
                delete typesCopy[keyToDelete];
                delete validCopy[keyToDelete];
                delete contextCopy[keyToDelete];
                delete linksCopy[keyToDelete];
                delete bookmarksCopy[keyToDelete];
                delete keyCompleteCopy[keyToDelete];
            });

            return {
                'keyHierarchy': newHierarchy,
                'keyContext': contextCopy,
                'keyValid': validCopy,
                'keyTypes': typesCopy,
                'keyLinks': linksCopy,
                'keyLinkBookmarks': bookmarksCopy,
                'roundTwoKeys': roundTwoCopy,
                'keyComplete' : keyCompleteCopy
            };
        });
    }

    /**
     * Uses an object holding specific data needed to initializing pre-existing
     * objects in the principal object initializing process when cloning/editing.
     * Exclusively called from initializePrincipal. Calls addExistingObj
     */
    initExistingObj({ path, display, type, field }){
        this.addExistingObj(path, display, type, field, true);
    }

    /**
     * Takes in the @id path of an exisiting object, a display name for it, the
     * object type, the linkTo field type (newLink), and whether or not it's
     * being added during the initializePrincipal process (bool init). Sets up
     * state to contain the newly introduced pre-existing object and adds it into
     * keyHierarchy. The key for pre-existing objects are their @id path. Thus,
     * isNan() for the key of a pre-existing object will return true.
     */
    addExistingObj(path, display, type, field, init=false){
        this.setState(function({
            currKey,
            keyHierarchy : prevKeyHierarchy,
            keyDisplay : prevKeyDisplay,
            keyTypes : prevKeyTypes,
            keyLinks : prevKeyLinks
        }){
            const parentKeyIdx = init ? 0 : currKey;
            const keyDisplay = _.clone(prevKeyDisplay);
            const keyTypes = _.clone(prevKeyTypes);
            const keyLinks = _.clone(prevKeyLinks);
            const keyHierarchy = modifyHierarchy(_.clone(prevKeyHierarchy), path, parentKeyIdx);
            keyDisplay[path] = display;
            keyTypes[path] = type;
            keyLinks[path] = field;
            return { keyHierarchy, keyDisplay, keyTypes, keyLinks };
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
    setSubmissionState(key, value){
        const { currKey, upload, md5Progress, keyValid, errorCount, roundTwo, keyHierarchy, keyContext, keyComplete } = this.state;
        var stateToSet = {};
        if (typeof this.state[key] !== 'undefined'){
            // this means we're navigating to a new object if true
            if (key === 'currKey' && value !== currKey){
                // don't allow navigation when we have an uploading file
                // or calculating md5
                if (upload !== null || md5Progress !== null){
                    alert('Please wait for your upload to finish.');
                    return;
                }
                // get rid of any hanging errors
                for(var i=0; i < errorCount; i++){
                    Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1) });
                    stateToSet.errorCount = 0;
                }
                // skip validation stuff if in roundTwo
                if(!roundTwo){
                    // if current key is ready for validation, first try that
                    // but suppress warning messages
                    if (keyValid[currKey] === 1) {
                        this.submitObject(currKey, true, true);
                    }
                    // see if newly-navigated obj is ready for validation
                    if(keyValid[value] === 0){
                        const validState = SubmissionView.findValidationState(value, keyHierarchy, keyContext, keyComplete);
                        if (validState === 1){
                            const nextKeyValid = _.clone(keyValid);
                            nextKeyValid[value] = 1;
                            stateToSet['keyValid'] = nextKeyValid;
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
    updateUpload(uploadInfo, completed=false, failed=false){
        var stateToSet = {};
        if (completed){
            stateToSet.uploadStatus = 'Upload complete';
            stateToSet.upload = null;
            stateToSet.file = null;
            this.finishRoundTwo();
            this.setState(stateToSet);
        }else if(failed){
            var destination = this.state.keyComplete[this.state.currKey];
            var payload = JSON.stringify({ 'status':'upload failed' });
            // set status to upload failed for the file
            ajax.promise(destination, 'PATCH', {}, payload).then((data) => {
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
                var payload = JSON.stringify({ 'md5sum': hash });
                ajax.promise(destination, 'PATCH', {}, payload).then((data) => {
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

    testPostNewContext(e){
        e.preventDefault();
        this.submitObject(this.state.currKey, true);
    }

    realPostNewContext(e){
        e.preventDefault();
        this.submitObject(this.state.currKey);
    }

    /**
     * Takes the context held in keyContext for a given key idx and returns a
     * copy that has been passed through removeNulls to delete any key-value pair
     * with a null value.
     */
    removeNullsFromContext(inKey){
        const { keyContext } = this.state;
        return removeNulls(object.deepClone(keyContext[inKey]));
    }

    /**
     * Returns true if the given schema has a round two flag within it
     * Used within the submission process to see if items will need second round submission.
     */
    checkRoundTwo(schema){
        var fields = schema.properties ? _.keys(schema.properties) : [];
        for (var i=0; i<fields.length; i++){
            if(schema.properties[fields[i]]){
                var fieldSchema = object.getNestedProperty(schema, ['properties', fields[i]], true);
                if (!fieldSchema){
                    continue;
                }
                if(fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round'){
                    // this object needs second round submission
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Used to generate a list of fields that have been removed in the submission
     * process. This list will in turn be used to make a deleteFields string
     * that is passed to the server with the PATCH request for editing or
     * second round submission. Takes the patchContext, which is the submission
     * content after removeNulls and submitObject processing, and compares it
     * to the original content (which is passed through removeNulls). If the
     * roundTwo flag is set to true, only operate on roundTwo submission fields.
     * Otherwise, do not operate on roundTwo fields.
     *
     * Returns a list of stirng fieldnames to delete.
     */
    buildDeleteFields(patchContext, origContext, schema){
        var deleteFields = [];
        // must remove nulls from the orig copy to sync with patchContext
        var origCopy = object.deepClone(origContext);
        origCopy = removeNulls(origCopy);
        var userGroups = JWT.getUserGroups();
        _.keys(origCopy).forEach((field, index) => {
            // if patchContext already has a value (such as admin edited
            // import_items fields), don't overwrite
            if(!isValueNull(patchContext[field])){
                return;
            }
            if(schema.properties[field]){
                var fieldSchema = object.getNestedProperty(schema, ['properties', field], true);
                if (!fieldSchema){
                    return;
                }
                // skip calculated properties and exclude_from fields
                if (fieldSchema.calculatedProperty && fieldSchema.calculatedProperty === true){
                    return;
                }
                if (fieldSchema.exclude_from && (_.contains(fieldSchema.exclude_from,'FFedit-create') || fieldSchema.exclude_from == 'FFedit-create')){
                    return;
                }
                // if the user is admin, they already have these fields available;
                // only register as removed if admin did it intentionally
                if (fieldSchema.permission && fieldSchema.permission == "import_items"){
                    if(_.contains(userGroups, 'admin')) deleteFields.push(field);
                    return;
                }
                // check round two fields if the parameter roundTwo is set
                if(fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round'){
                    if(this.state.roundTwo) deleteFields.push(field);
                    return;
                }
                // if we're here, the submission field was legitimately deleted
                if(!this.state.roundTwo) deleteFields.push(field);
            }
        });
        return deleteFields;
    }

    /** Set md5Progress in state to val. Passed as callback to getLargeMD5 */
    modifyMD5Progess(val){
        this.setState({ 'md5Progress': val });
    }

    /**
     * Master object submission function. Takes a key index and uses ajax to
     * POST/PATCH the json to the object collection (a new object) or to the
     * specific object path (a pre-existing/roundTwo object). If test=true,
     * the POST is made to the check_only=true endpoint for validation without
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
    submitObject(inKey, test=false, suppressWarnings=false){
        // function to test a POST of the data or actually POST it.
        // validates if test=true, POSTs if test=false.
        const { context, schemas, setIsSubmitting, navigate } = this.props;
        const { keyValid, keyTypes, errorCount, currentSubmittingUser, edit, roundTwo, keyComplete,
            keyContext, keyDisplay, file, keyHierarchy, keyLinks, roundTwoKeys } = this.state;
        const stateToSet = {}; // hold next state
        const currType = keyTypes[inKey];
        const currSchema = schemas[currType];

        // this will always be reset when stateToSet is implemented
        stateToSet.processingFetch = false;
        stateToSet.keyValid = _.clone(keyValid);

        const finalizedContext = this.removeNullsFromContext(inKey);

        var i;
        // get rid of any hanging errors
        for (i=0; i < errorCount; i++){
            Alerts.deQueue({ 'title' : "Validation error " + parseInt(i + 1) });
            stateToSet.errorCount = 0;
        }

        this.setState({ 'processingFetch': true });

        if (!currentSubmittingUser){
            console.error('No user account info.');
            stateToSet.keyValid[inKey] = 2;
            this.setState(stateToSet);
            return;
        }

        const submitProcessContd = (userLab = null, userAward = null) => {

            // if editing, use pre-existing award, lab, and submitted_by
            // this should only be done on the primary object
            if (edit && inKey === 0 && context.award && context.lab){

                if (currSchema.properties.award && !('award' in finalizedContext)){
                    finalizedContext.award = object.itemUtil.atId(context.award);
                }

                if (currSchema.properties.lab && !('lab' in finalizedContext)){
                    finalizedContext.lab = object.itemUtil.atId(context.lab);
                }

                // an admin is editing. Use the pre-existing submitted_by
                // otherwise, permissions won't let us change this field
                if (currentSubmittingUser.groups && _.contains(currentSubmittingUser.groups, 'admin')){
                    if (context.submitted_by){
                        finalizedContext.submitted_by = object.itemUtil.atId(context.submitted_by);
                    } else {
                        // use current user
                        finalizedContext.submitted_by = object.itemUtil.atId(currentSubmittingUser);
                    }
                }

            } else if (userLab && userAward && currType !== 'User') {
                // Otherwise, use lab/award of user submitting unless values present
                // Skip this is we are working on a User object
                if (currSchema.properties.award && !('award' in finalizedContext)){
                    finalizedContext.award = object.itemUtil.atId(userAward);
                }
                if (currSchema.properties.lab && !('lab' in finalizedContext)){
                    finalizedContext.lab = object.itemUtil.atId(userLab);
                }
            }

            let destination;
            let actionMethod;
            let deleteFields;   // used to keep track of fields to delete with PATCH for edit/round two; will become comma-separated string
            if (roundTwo){      // change actionMethod and destination based on edit/round two
                destination = keyComplete[inKey];
                actionMethod = 'PATCH';
                const alreadySubmittedContext = keyContext[destination];
                // roundTwo flag set to true for second round
                deleteFields = this.buildDeleteFields(finalizedContext, alreadySubmittedContext, currSchema);
            } else if (edit && inKey === 0){
                destination = object.itemUtil.atId(context);
                actionMethod = 'PATCH';
                deleteFields = this.buildDeleteFields(finalizedContext, context, currSchema);
            } else {
                destination = '/' + currType + '/';
                actionMethod = 'POST';
            }

            if (test){
                // if testing validation, use check_only=true (see /types/base.py)'
                destination += '?check_only=true';
            } else {
                console.log('FINALIZED PAYLOAD:', finalizedContext);
                console.log('DELETE FIELDS:', deleteFields);
            }

            const payload = JSON.stringify(finalizedContext);

            // add delete_fields parameter to request if necessary
            if (deleteFields && Array.isArray(deleteFields) && deleteFields.length > 0){
                var deleteString = deleteFields.join(',');
                destination = destination + (test ? '&' : '?') + 'delete_fields=' + deleteString;
                console.log('DESTINATION:', destination);
            }

            // Perform request
            ajax.promise(destination, actionMethod, {}, payload).then((response) => {
                if (response.status && response.status !== 'success'){ // error
                    stateToSet.keyValid[inKey] = 2;
                    if(!suppressWarnings){
                        var errorList = response.errors || [response.detail] || [];
                        // make an alert for each error description
                        stateToSet.errorCount = errorList.length;
                        for(i = 0; i<errorList.length; i++){
                            var detail = errorList[i].description || errorList[i] || "Unidentified error";
                            if (errorList[i].name){
                                detail += ('. ' + errorList[i].name + ' in ' + keyDisplay[inKey]);
                            } else {
                                detail += ('. See ' + keyDisplay[inKey]);
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
                } else {
                    let responseData;
                    let submitted_at_id;
                    if (test){
                        stateToSet.keyValid[inKey] = 3;
                        this.setState(stateToSet);
                        return;
                    } else {
                        [ responseData ] = response['@graph'];
                        submitted_at_id = object.itemUtil.atId(responseData);
                    }
                    // handle submission for round two
                    if (roundTwo){
                        // there is a file
                        if (file && responseData.upload_credentials){
                            // add important info to result from finalizedContext
                            // that is not added from /types/file.py get_upload
                            var creds = responseData.upload_credentials;

                            require.ensure(['../util/aws'], (require)=>{

                                var awsUtil = require('../util/aws'),
                                    upload_manager = awsUtil.s3UploadFile(file, creds);

                                if (upload_manager === null){
                                    // bad upload manager. Cause an alert
                                    alert("Something went wrong initializing the upload. Please contact the 4DN-DCIC team.");
                                } else {
                                    // this will set off a chain of aync events.
                                    // first, md5 will be calculated and then the
                                    // file will be uploaded to s3. If all of this
                                    // is succesful, call finishRoundTwo.
                                    stateToSet.uploadStatus = null;
                                    this.setState(stateToSet);
                                    this.updateUpload(upload_manager);
                                }
                            }, "aws-utils-bundle");

                        } else {
                            // state cleanup for this key
                            this.finishRoundTwo();
                            this.setState(stateToSet);
                        }
                    } else {
                        stateToSet.keyValid[inKey] = 4;
                        // Perform final steps when object is submitted
                        // *** SHOULD THIS STUFF BE BROKEN OUT INTO ANOTHER FXN?
                        // find key of parent object, starting from top of hierarchy
                        var parentKey = parseInt(findParentFromHierarchy(keyHierarchy, inKey));
                        // navigate to parent obj if it was found. Else, go to top level
                        stateToSet.currKey = (parentKey !== null && !isNaN(parentKey) ? parentKey : 0);
                        var typesCopy = _.clone(keyTypes);
                        var keyCompleteCopy = _.clone(keyComplete);
                        var linksCopy = _.clone(keyLinks);
                        var displayCopy = _.clone(keyDisplay);
                        // set contextCopy to returned data from POST
                        var contextCopy = _.clone(keyContext);
                        var roundTwoCopy = roundTwoKeys.slice();
                        // update the state storing completed objects.
                        keyCompleteCopy[inKey] = submitted_at_id;
                        // represent the submitted object with its new path
                        // rather than old keyIdx.
                        linksCopy[submitted_at_id] = linksCopy[inKey];
                        typesCopy[submitted_at_id] = currType;
                        displayCopy[submitted_at_id] = displayCopy[inKey];
                        contextCopy[submitted_at_id] = responseData;
                        contextCopy[inKey] = buildContext(responseData, currSchema, null, true, false);
                        stateToSet.keyLinks = linksCopy;
                        stateToSet.keyTypes = typesCopy;
                        stateToSet.keyComplete = keyCompleteCopy;
                        stateToSet.keyDisplay = displayCopy;
                        stateToSet.keyContext = contextCopy;

                        // update roundTwoKeys if necessary
                        const needsRoundTwo = this.checkRoundTwo(currSchema);
                        if (needsRoundTwo && !_.contains(roundTwoCopy, inKey)){
                            // was getting an error where this could be str
                            roundTwoCopy.push(parseInt(inKey));
                            stateToSet.roundTwoKeys = roundTwoCopy;
                        }

                        // inKey is 0 for the primary object
                        if (inKey === 0){
                            // see if we need to go into round two submission
                            if (roundTwoCopy.length === 0){
                                // we're done!
                                setIsSubmitting(false, ()=>{
                                    navigate(submitted_at_id);
                                });
                            } else {
                                // break this out into another fxn?
                                // roundTwo initiation
                                stateToSet.roundTwo = true;
                                stateToSet.currKey = roundTwoCopy[0];
                                // reset validation state for all round two keys
                                for (i = 0; i < roundTwoCopy.length; i++){
                                    stateToSet.keyValid[roundTwoCopy[i]] = 0;
                                }
                                alert('Success! All objects were submitted. However, one or more have additional fields that can be only filled in second round submission. You will now be guided through this process for each object.');
                                this.setState(stateToSet);
                            }
                        } else {
                            alert(keyDisplay[inKey] + ' was successfully submitted.');
                            this.setState(stateToSet);
                        }
                    }
                    ReactTooltip.rebuild();
                }
            });
        };

        if (currentSubmittingUser && Array.isArray(currentSubmittingUser.submits_for) && currentSubmittingUser.submits_for.length > 0){
            // use first lab for now
            ajax.promise(object.itemUtil.atId(currentSubmittingUser.submits_for[0])).then((myLab) => {
                // use first award for now
                var myAward = (myLab && Array.isArray(myLab.awards) && myLab.awards.length > 0 && myLab.awards[0]) || null;
                submitProcessContd(myLab, myAward);
            });
        } else {
            submitProcessContd();
        }
    }

    /**
     * Finish the roundTwo process for the current key. Removes the currKey from
     * this.state.roundTwoKeys and modifies state to finish out for that object.
     * If there are no keys left in roundTwoKeys, navigate to the path of the
     * principal object we created.
     */
    finishRoundTwo(){
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
            //alert('Success! Navigating to your new object.');
            this.props.setIsSubmitting(false, ()=>{
                this.props.navigate(this.state.keyComplete[0]);
            });

        }
    }

    cancelCreateNewObject(){
        this.setState(function({ creatingIdx, keyContext, currKey, creatingLinkForField }){
            if (!creatingIdx) return null;
            const nextKeyContext = _.clone(keyContext);
            const currentContextPointer = nextKeyContext[currKey];
            const parentFieldToClear = typeof creatingLinkForField === 'string' && creatingLinkForField;
            _.pairs(currentContextPointer).forEach(function([field, idx]){
                if (field === parentFieldToClear){
                    // Unset value to null
                    if (idx === creatingIdx){
                        currentContextPointer[field] = null;
                    }
                    // Remove value from array.
                    if (Array.isArray(idx)){
                        const idxInArray = idx.indexOf(creatingIdx);
                        if (idxInArray > -1){
                            currentContextPointer[field].splice(idxInArray, 1);
                        }
                    }
                }
            });
            return {
                'ambiguousIdx': null,
                'ambiguousType': null,
                'ambiguousSelected': null,
                'creatingAlias' : '',
                'creatingIdx': null,
                'creatingType': null,
                'creatingLink': null,
                'keyContext' : nextKeyContext,
                'creatingLinkForField' : null
            };
        });
    }

    /** Navigate to version of same page we're on, minus the `currentAction` URI parameter. */
    cancelCreatePrimaryObject(skipAskToLeave = false){
        const { href, navigate, setIsSubmitting } = this.props;
        var leaveFunc = () =>{
            // Navigate out.
            var parts = url.parse(href, true),
                modifiedQuery = _.omit(parts.query, 'currentAction'),
                modifiedSearch = queryString.stringify(modifiedQuery),
                nextURI;

            parts.query = modifiedQuery;
            parts.search = (modifiedSearch.length > 0 ? '?' : '') + modifiedSearch;
            nextURI = url.format(parts);

            navigate(nextURI, { skipRequest : true });
        };

        if (skipAskToLeave === true){
            return setIsSubmitting(false, leaveFunc);
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
        const { schemas } = this.props;
        const { currKey, keyContext, ambiguousIdx, ambiguousType, creatingType, creatingIdx, keyTypes, fullScreen, keyDisplay, keyHierarchy } = this.state;

        // see if initialized
        if (!keyContext || currKey === null){
            return null;
        }
        const showAmbiguousModal = ambiguousIdx !== null && ambiguousType !== null;
        const showAliasModal = !showAmbiguousModal && creatingIdx !== null && creatingType !== null;
        const currType = keyTypes[currKey];
        const currContext = keyContext[currKey];
        const navCol = fullScreen ? 'submission-hidden-nav' : 'col-sm-3';
        const bodyCol = fullScreen ? 'col-sm-12' : 'col-sm-9';

        // remove context and navigate from this.props
        const { context, navigate, ...propsToPass } = this.props;
        const currObjDisplay = keyDisplay[currKey] || currType;
        return (
            <div className="submission-view-page-container container" id="content">
                <TypeSelectModal
                    show={showAmbiguousModal} {..._.pick(this.state, 'ambiguousIdx', 'ambiguousType', 'ambiguousSelected', 'currKey', 'creatingIdx')} schemas={schemas}
                    buildAmbiguousEnumEntry={this.buildAmbiguousEnumEntry} submitAmbiguousType={this.submitAmbiguousType} cancelCreateNewObject={this.cancelCreateNewObject} cancelCreatePrimaryObject={this.cancelCreatePrimaryObject}
                />
                <AliasSelectModal
                    show={showAliasModal} {..._.pick(this.state, 'creatingAlias', 'creatingType', 'creatingAliasMessage', 'currKey', 'creatingIdx', 'currentSubmittingUser')}
                    handleAliasChange={this.handleAliasChange} submitAlias={this.submitAlias} cancelCreateNewObject={this.cancelCreateNewObject} cancelCreatePrimaryObject={this.cancelCreatePrimaryObject}
                />
                <WarningBanner cancelCreatePrimaryObject={this.cancelCreatePrimaryObject}>
                    <button type="button" className="btn btn-danger" onClick={this.cancelCreatePrimaryObject}>Cancel / Exit</button>
                    <ValidationButton {..._.pick(this.state, 'currKey', 'keyValid', 'md5Progress', 'upload', 'roundTwo', 'processingFetch')}
                        testPostNewContext={this.testPostNewContext} finishRoundTwo={this.finishRoundTwo}  />
                    <SubmitButton {..._.pick(this.state, 'keyValid', 'currKey', 'roundTwo', 'upload', 'processingFetch', 'md5Progress')}
                        realPostNewContext={this.realPostNewContext} />
                </WarningBanner>
                <DetailTitleBanner
                    hierarchy={keyHierarchy} setSubmissionState={this.setSubmissionState}
                    {..._.pick(this.state, 'keyContext', 'keyTypes', 'keyDisplay', 'currKey', 'fullScreen')}
                />
                <div className="clearfix row">
                    <div className={navCol}>
                        <SubmissionTree
                            setSubmissionState={this.setSubmissionState}
                            hierarchy={keyHierarchy}
                            schemas={schemas}
                            {..._.pick(this.state, 'keyValid', 'keyTypes', 'keyDisplay', 'keyComplete', 'currKey', 'keyLinkBookmarks', 'keyLinks', 'keyHierarchy')}
                        />
                    </div>
                    <div className={bodyCol}>
                        <IndividualObjectView
                            {...propsToPass}
                            schemas={schemas}
                            currType={currType}
                            currContext={currContext}
                            modifyKeyContext={this.modifyKeyContext}
                            initCreateObj={this.initCreateObj}
                            removeObj={this.removeObj}
                            addExistingObj={this.addExistingObj}
                            setSubmissionState={this.setSubmissionState}
                            modifyAlias={this.modifyAlias}
                            updateUpload={this.updateUpload}
                            hierarchy={keyHierarchy}
                            {..._.pick(this.state, 'keyDisplay', 'keyComplete', 'keyIter', 'currKey', 'keyContext', 'upload', 'uploadStatus', 'md5Progress', 'roundTwo', 'currentSubmittingUser')}
                        />
                    </div>
                </div>
            </div>
        );
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
const ValidationButton = React.memo(function ValidationButton(props){
    const { currKey, keyValid, md5Progress, upload, roundTwo, processingFetch, finishRoundTwo, testPostNewContext } = props;
    const validity = keyValid[currKey];
    // when roundTwo, replace the validation button with a Skip
    // button that completes the submission process for currKey
    if (roundTwo){
        if (upload === null && md5Progress === null){
            return (
                <button type="button" className="btn btn-warning" onClick={finishRoundTwo}>
                    Skip
                </button>
            );
        } else {
            return <button type="button" className="btn btn-warning" disabled>Skip</button>;
        }
    } else if (validity === 3 || validity === 4){
        return <button type="button" className="btn btn-info" disabled>Validated</button>;
    } else if (validity === 2){
        if (processingFetch) {
            return (
                <button type="button" className="btn btn-danger" disabled>
                    <i className="icon icon-spin icon-circle-o-notch"/>
                </button>
            );
        } else {
            return <button type="button" className="btn btn-danger" onClick={testPostNewContext}>Validate</button>;
        }
    } else if (validity === 1){
        if (processingFetch) {
            return (
                <button type="button" className="btn btn-info" disabled>
                    <i className="icon icon-spin icon-circle-o-notch"/>
                </button>
            );
        } else {
            return <button type="button" className="btn btn-info" onClick={testPostNewContext}>Validate</button>;
        }
    } else {
        return <button type="button" className="btn btn-info" disabled>Validate</button>;
    }
});

/**
 * Generate JSX for the the button that allows users to submit their custom
 * objects. Only active when validation state == 3 (validation successful).
 *
 * In roundTwo, there is no validation step, so only inactive when there is
 * an active upload of md5 calculation.
 */

const SubmitButton = React.memo(function(props){
    const { keyValid, currKey, roundTwo, upload, processingFetch, md5Progress, realPostNewContext } = props;
    const validity = keyValid[currKey];
    if (roundTwo) {
        if (upload !== null || processingFetch || md5Progress !== null) {
            return (
                <button type="button" disabled className="btn btn-success">
                    <i className="icon icon-spin icon-circle-o-notch"/>
                </button>
            );
        } else {
            return <button type="button" className="btn btn-success" onClick={realPostNewContext}>Submit</button>;
        }
    } else if (validity == 3) {
        if (processingFetch){
            return (
                <button type="button" disabled className="btn btn-success">
                    <i className="icon icon-spin icon-circle-o-notch"/>
                </button>
            );
        } else {
            return <button type="button" className="btn btn-success" onClick={realPostNewContext}>Submit</button>;
        }
    } else if (validity == 4) {
        return <button type="button" className="btn btn-success" disabled>Submitted</button>;
    } else {
        return <button type="button" className="btn btn-success" disabled>Submit</button>;
    }
});


const WarningBanner = React.memo(function WarningBanner(props){
    const { children } = props;
    return(
        <div className="mb-2 mt-1 text-400 warning-banner">
            <div className="row">
                <div className="col-md-7 col-lg-8">
                    Please note: your work will be lost if you navigate away from, refresh or close this page while submitting. The submission process is under active development and features may change.
                </div>
                <div className="col-md-5 col-lg-4">
                    <div className="action-buttons-container text-right">{ children }</div>
                </div>
            </div>
        </div>
    );
});

class DetailTitleBanner extends React.PureComponent {

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
        this.setState(function({ open }){
            return { 'open' : !open };
        });
    }

    generateCrumbTitle(numKey, i = 0, hierarchyKeyList = null){
        var { keyTypes, keyDisplay, hierarchy, schemas, fullScreen, actionButtons, keyContext } = this.props;
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
            <Collapse in appear={(hierarchyKeyList.length !== 1)} key={i}>
                <div className={"title-crumb depth-level-" + i + (isLast ? ' last-title' : ' mid-title')}>
                    <div className="submission-working-title">
                        <span onClick={this.handleClick.bind(this, numKey)}>
                            { icon }
                            { parentPropertyName ? <span className="next-property-name">{ parentPropertyName }: </span> : null }
                            <span className="working-subtitle">{ Schemas.getTitleForType(keyTypes[numKey], schemas || Schemas.get()) }</span> <span>{ keyDisplay[numKey] }</span>
                        </span>
                    </div>
                </div>
            </Collapse>
        );
    }

    generateHierarchicalTitles(){
        var { hierarchy, currKey } = this.props;
        return _.map(DetailTitleBanner.getListOfKeysInPath(hierarchy, currKey), this.generateCrumbTitle);
    }

    render(){
        const { fullScreen, currKey } = this.props;
        const { open } = this.state;
        if (fullScreen) return null;
        return (
            <h3 className="crumbs-title mb-2">
                <div className="subtitle-heading form-section-heading mb-08">
                    <span className="inline-block clickable" onClick={this.toggleOpen}>
                        Currently Editing { currKey > 0 ? <i className={"icon icon-fw icon-caret-" + (open ? 'down' : 'right')} /> : null }
                    </span>
                </div>
                { open ? this.generateHierarchicalTitles() : this.generateCrumbTitle(currKey) }
            </h3>
        );
    }
}


/** TODO: DropdownButton to be v4 bootstrap compliant */
class TypeSelectModal extends React.Component {

    constructor(props){
        super(props);
        this.onHide = this.onHide.bind(this);
        this.onContainerKeyDown = this.onContainerKeyDown.bind(this);
    }

    onHide(){
        const { ambiguousIdx, cancelCreatePrimaryObject, cancelCreateNewObject } = this.props;
        if (ambiguousIdx === null || ambiguousIdx === 0){
            // If just starting (creating first item / idx), navigate to non-edit version of page we are currently on.
            cancelCreatePrimaryObject(true);
        } else if (ambiguousIdx > 0){
            // Else cancel creating new object by unsetting temporary state & values.
            cancelCreateNewObject();
        }
    }

    onContainerKeyDown(enterKeyCallback, event){
        if (event.which === 13 || event.keyCode === 13) {
            enterKeyCallback(event);
            return false;
        }
        return true;
    }

    render(){
        const { show, ambiguousType, ambiguousSelected, buildAmbiguousEnumEntry, submitAmbiguousType, schemas } = this.props;
        if (!show) return null;

        let ambiguousDescrip = null;
        if (ambiguousSelected !== null && schemas[ambiguousSelected].description){
            ambiguousDescrip = schemas[ambiguousSelected].description;
        }
        return (
            <Modal show onHide={this.onHide} className="submission-view-modal">
                <Modal.Header>
                    <Modal.Title>{'Multiple object types found for your new ' + ambiguousType}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div onKeyDown={this.onContainerKeyDown.bind(this, submitAmbiguousType)}>
                        <p>Please select a specific object type from the menu below.</p>
                        <div className="input-wrapper mb-15">
                            <DropdownButton id="dropdown-type-select" title={ambiguousSelected || "No value"}>
                                { ambiguousType !== null ?
                                    itemTypeHierarchy[ambiguousType].map((val) => buildAmbiguousEnumEntry(val))
                                    : null
                                }
                            </DropdownButton>
                        </div>
                        { ambiguousDescrip ?
                            <div className="mb-15 mt-15">
                                <h5 className="text-500 mb-02">Description</h5>
                                { ambiguousDescrip }
                            </div>
                            : null}
                        <button type="button" className="btn btn-primary" disabled={ambiguousSelected === null} onClick={submitAmbiguousType}>
                            Submit
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }
}

/** Ordinary React Component which just inherits TypeSelectModal.onHide() */
class AliasSelectModal extends TypeSelectModal {

    render(){
        const { show, creatingType, creatingAlias, handleAliasChange, creatingAliasMessage, submitAlias, currentSubmittingUser } = this.props;
        if (!show) return null;

        const disabledBtn = creatingAlias.indexOf(':') < 0 || (creatingAlias.indexOf(':') + 1 === creatingAlias.length);

        return (
            <Modal show onHide={this.onHide} className="submission-view-modal">
                <Modal.Header>
                    <Modal.Title>Give your new { creatingType } an alias</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div onKeyDown={this.onContainerKeyDown.bind(this, submitAlias)}>
                        <p className="mt-0 mb-1">Aliases are lab specific identifiers to reference an object. The format is <code>{'<lab-name>:<identifier>'}</code> - a lab name and an identifier separated by a colon, e.g. <code>dcic-lab:42</code>.</p>
                        <p className="mt-0 mb-1">Please create your own alias to help you to refer to this Item later.</p>
                        <div className="input-wrapper mt-2 mb-2">
                            <AliasInputField value={creatingAlias} errorMessage={creatingAliasMessage} onAliasChange={handleAliasChange} currentSubmittingUser={currentSubmittingUser} withinModal />
                        </div>
                        { creatingAliasMessage ?
                            <div style={{ 'marginBottom':'15px', 'color':'#7e4544','fontSize':'1.2em' }}>
                                { creatingAliasMessage }
                            </div>
                            : null }
                        <div className="text-right">
                            {/*
                            <Button type="button" bsStyle="danger" onClick={this.onHide}>Cancel / Exit</Button>
                            {' '}
                            */}
                            <button type="button" className="btn btn-primary" disabled={disabledBtn} onClick={submitAlias}>Submit</button>
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
 * @see SubmissionView
 * @prop {number} currKey - Current key being edited.
 *
 * @todo
 * Use _.bindAll, make sure setState is using functional updater anywhere state update may derive from other state.
 */
class IndividualObjectView extends React.Component {

    constructor(props){
        super(props);
        _.bindAll(this, 'modifyNewContext', 'fetchAndValidateItem', 'checkObjectRemoval',
            'selectObj', 'selectComplete', 'selectCancel', 'initiateField'
        );

        /**
         * State in this component mostly has to do with selection of existing objs
         *
         * @prop {!string} selectType           Type of existing object being selected (i.e. ExperimentHiC).
         * @prop {!string} selectField          Actual fieldname that we're selecting the existing obj for. May be nested in the case of subobjects, e.g. experiments_in_set.experiment
         * @prop {!number[]} selectArrayIdx     List of int numbers keeping track of list positions of the object we're selecting for. Since you can have arrays within arrays, one int won't do. Example: [1,2] would mean the current field is the second item within the first item of the array given by the top level field. When null, no arrays involved.
         */
        this.state = {
            'selectType'    : null,
            'selectField'   : null,
            'selectArrayIdx': null
        };
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
                alert('Objects cannot be created in this stage of submission. Please select an existing one.');
                return;
            }
        }

        if (!field || typeof field !== 'string'){
            // Throw error instead?
            console.error('No field supplied', ...arguments);
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

        if (fieldType === 'linked object'){
            this.checkObjectRemoval(value, prevValue);
        }
        if (fieldType === 'new linked object'){
            // value is new key index in this case
            this.props.initCreateObj(type, value, field, false, field);
        } else {
            // actually change value
            this.props.modifyKeyContext(this.props.currKey, contextCopy);
        }

        if(splitFieldLeaf === 'aliases' || splitFieldLeaf === 'name' || splitFieldLeaf === 'title'){
            this.props.modifyAlias();
        }
    }

    /**
     * Use ajax to get the display_title for an existing object. Use that to kicks
     * of the addExistingObj process; if a title can't be found, use the object
     * path as a fallback.
     *
     * @param {string} value    The @ID or unique key of the Item for which we want to validate and get title for.
     * @param {string} type     The Item type of value.
     * @param {any} newLink     No idea what this is.
     */
    fetchAndValidateItem(itemAtID, field, type, arrayIdx, newLink = null){
        const { addExistingObj } = this.props;

        let hrefToFetch = itemAtID;
        const failureAlertTitle = "Validation error for field '" + field + "'" + (typeof arrayIdx === 'number' ? ' [' + arrayIdx + ']' : '');
        const failureCallback = () => {
            Alerts.queue({
                "title"     : failureAlertTitle,
                "message"   : "Could not find valid" + (type ? " '" + type + "'" : '') + " Item in database for value '" + itemAtID + "'.",
                "style"     : "danger"
            });
            layout.animateScrollTo(0); // Scroll to top of page so alert b visible to end-user.
            this.modifyNewContext(field, null, 'existing linked object', null, arrayIdx);
        };
        const successCallback = (result)=>{
            Alerts.deQueue({ 'title' : failureAlertTitle });
            this.modifyNewContext(field, itemAtID, 'existing linked object', null, arrayIdx);
            addExistingObj(itemAtID, result.display_title, type, field);
        };

        if (typeof hrefToFetch !== 'string') {
            failureCallback();
            return;
        }

        if (hrefToFetch.charAt(0) !== '/'){ // Pre-pend slash so will request hostname + '/' + itemAtID.
            hrefToFetch = '/' + hrefToFetch;
        }

        ajax.load(hrefToFetch, (result)=>{
            if (result && result.display_title && Array.isArray(result['@type']) ){
                if (type) { // Check for matching Type validity.
                    if (result['@type'].indexOf(type) > -1) {
                        successCallback(result);
                        return;
                    }
                } else { // Any Item type == valid, is assumed (e.g. linkTo type Item)
                    successCallback(result);
                    return;
                }
            }
            failureCallback();
        }, 'GET', failureCallback);
    }

    /**
     * If a itemAtID is null that was previously non-null, remove the linked object
     * from the current context and change state in SubmissionView accordingly.
     */
    checkObjectRemoval(value, prevValue){
        const { removeObj } = this.props;
        if (value === null){
            removeObj(prevValue);
        }
    }

    /**
     * Initializes the first search (with just type=<type>) and sets state
     * accordingly. Set the fullScreen state in SubmissionView to alter its render
     * and hide the object navigation tree.
     */
    selectObj(collection, field, arrayIdx=null){
        this.setState({ 'selectField' : field, 'selectArrayIdx': arrayIdx, 'selectType' : collection });
    }

    /**
     * Callback passed to Search to select a pre-existing object. Cleans up
     * object selection state, modifies context, and initializes the fetchAndValidateItem
     * process.
     */
    selectComplete(value){
        const { currContext } = this.props;
        const { selectField, selectArrayIdx, selectType } = this.state;
        if (!selectField) throw new Error('No field being selected for');

        const current = selectField && currContext[selectField];
        const isRepeat = (Array.isArray(current) && _.contains(current, value));

        if (!isRepeat) {
            //this.modifyNewContext(selectField, value, 'existing linked object', null, selectArrayIdx);
            this.fetchAndValidateItem(value, selectField, selectType, selectArrayIdx, null);
        } else {
            this.modifyNewContext(selectField, null, 'existing linked object', null, selectArrayIdx);
        }

        this.setState({ 'selectField': null, 'selectArrayIdx': null, 'selectType': null });
    }

    /** Exit out of the selection process and clean up state */
    selectCancel(e){
        var { selectField, selectArrayIdx } = this.state;
        this.modifyNewContext(selectField, null, 'existing linked object', null, selectArrayIdx);
        this.setState({ 'selectType': null, 'selectField': null, 'selectArrayIdx': null });
    }

    /**
     * Given a field, use the schema to generate the sufficient information to
     * make a BuildField component for that field. Different fields are returned
     * for roundOne and roundTwo.
     */
    initiateField(field) {
        const { schemas, currType, currKey, roundTwo, currContext, keyComplete, keyContext, edit } = this.props;
        const currSchema  = schemas[currType];
        const fieldSchema = object.getNestedProperty(currSchema, ['properties', field], true);

        if (!fieldSchema) return null;

        const secondRoundField    = fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round';
        const fieldTitle          = fieldSchema.title || field;

        if(roundTwo && !secondRoundField){
            return null;
        } else if (!roundTwo && secondRoundField){
            // return a placeholder informing user that this field is for roundTwo
            return(
                <div key={fieldTitle} className="row field-row" required={false} title={fieldTitle} style={{ 'overflow':'visible' }}>
                    <div className="col-sm-12 col-md-4">
                        <h5 className="facet-title submission-field-title">{ fieldTitle }</h5>
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

        var fieldType   = BuildField.fieldTypeFromFieldSchema(fieldSchema),
            fieldValue  = currContext[field] !== null ? currContext[field] : null,
            enumValues  = [],
            isLinked    = false,
            linked      = fieldSchemaLinkToType(fieldSchema);

        // check if this is an enum
        if (fieldType === 'enum'){
            enumValues = fieldSchema.enum || fieldSchema.suggested_enum;
        }

        // check for linkTo if further down in object or array
        if(linked !== null){
            linked = fieldSchema.title ? fieldSchema.title : linked;
            isLinked = true;
        }

        // handle a linkTo object on the the top level
        // check if any schema-specific adjustments need to made:
        if (fieldSchema.s3Upload && fieldSchema.s3Upload === true){
            // only render file upload input if status is 'uploading' or 'upload_failed'
            // when editing a File principal object.
            var path            = keyComplete[currKey],
                completeContext = keyContext[path],
                statusCheck     = completeContext.status && (completeContext.status == 'uploading' || completeContext.status == 'upload failed');

            if (edit) {
                if (statusCheck) {
                    fieldType = 'file upload';
                } else {
                    return null;
                }
            } else {
                fieldType = 'file upload';
            }
        }
        return (
            <BuildField
                {...{ field, fieldType, fieldTip, enumValues, isLinked, currType, currContext }}
                {..._.pick(this.props, 'md5Progress', 'edit', 'create', 'keyDisplay', 'keyComplete', 'setSubmissionState', 'upload', 'uploadStatus', 'updateUpload', 'currentSubmittingUser', 'roundTwo')}
                value={fieldValue} key={field} schema={fieldSchema} nestedField={field} title={fieldTitle} modifyFile={null} linkType={linked} disabled={false}
                arrayIdx={null} required={_.contains(currSchema.required, field)}
                modifyNewContext={this.modifyNewContext} selectObj={this.selectObj} selectComplete={this.selectComplete} selectCancel={this.selectCancel}
                fieldBeingSelected={this.state.selectField} fieldBeingSelectedArrayIdx={this.state.selectArrayIdx} />
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
        const { currContext, keyComplete, keyContext, currKey, schemas, roundTwo } = this.props;
        const fields = currContext ? _.keys(currContext) : [];
        const fieldJSXComponents = sortPropFields(_.filter( // Sort fields first by requirement and secondly alphabetically. These are JSX BuildField components.
            _.map(fields, this.initiateField),
            function(f){ return !!f; } // Removes falsy (e.g. null) items.
        ));
        const roundTwoDetailContext = roundTwo && keyComplete[currKey] && keyContext[keyComplete[currKey]];

        return(
            <div>
                <FormFieldsContainer currKey={currKey}>{ fieldJSXComponents }</FormFieldsContainer>
                { roundTwo ? <RoundTwoDetailPanel schemas={schemas} context={roundTwoDetailContext} open={true} /> : null }
            </div>
        );
    }
}


const FormFieldsContainer = React.memo(function FormFieldsContainer(props){
    const { children, title } = props;
    if (React.Children.count(children) === 0) return null;
    return (
        <div className="form-fields-container">
            <h4 className="clearfix page-subtitle form-section-heading submission-field-header">{ title }</h4>
            <div className="form-section-body">{ children }</div>
        </div>
    );
});
FormFieldsContainer.defaultProps = {
    'title' : 'Fields & Dependencies',
    'currKey' : 0
};

/**
 * Simple Component that opens/closes and renders a Detail panel using the context
 * and schemas passed to it.
 */
class RoundTwoDetailPanel extends React.PureComponent {
    constructor(props){
        super(props);
        this.handleToggle = this.handleToggle.bind(this);
        this.state = {
            'open': props.open || false
        };
    }

    handleToggle(e){
        e.preventDefault();
        this.setState(function({ open }){
            return { 'open' : !open };
        });
    }

    render(){
        const { context, schemas } = this.props;
        const { open } = this.state;
        return(
            <div className="current-item-properties round-two-panel">
                <h4 className="clearfix page-subtitle submission-field-header">
                    <Button bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                        <i className={"icon " + (open ? "icon-minus" : "icon-plus")}></i>
                    </Button>
                    <span>Object Attributes</span>
                </h4>
                <Collapse in={open}>
                    <div className="item-page-detail">
                        <Detail excludedKeys={Detail.defaultProps.excludedKeys.concat('upload_credentials')} context={context} schemas={schemas} open={false} popLink={true}/>
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
 *
 * @returns {Object} A new object represent context.
 */
export function buildContext(context, itemSchema, objList=null, edit=false, create=true, initObjs=null){
    const built = {};
    const userGroups = JWT.getUserGroups();
    const fields = itemSchema.properties ? _.keys(itemSchema.properties) : [];

    _.forEach(fields, function(field, i){
        const fieldSchema = object.getNestedProperty(itemSchema, ['properties', field], true);

        if (!fieldSchema){
            return;
        }

        if (fieldSchema.exclude_from && ((Array.isArray(fieldSchema.exclude_from) && _.contains(fieldSchema.exclude_from,'FFedit-create')) || fieldSchema.exclude_from === 'FFedit-create')){
            return;
        }

        // check to see if this field is a calculated prop
        if (fieldSchema.calculatedProperty && fieldSchema.calculatedProperty === true){
            return;
        }

        // check to see if permission == import items; if admin, allow import_items fields
        if (fieldSchema.permission && fieldSchema.permission == "import_items"){
            if (!_.contains(userGroups, 'admin')){
                return;
            }
        }

        // set value to context value if editing/cloning.
        // if creating or value not present, set to null
        if (edit){
            if (context[field] === null || (fieldSchema.ff_flag && fieldSchema.ff_flag === "clear edit")){
                built[field] = null;
            } else {
                built[field] = context[field] || null;
            }
        } else if (!create){ //clone
            if (context[field] === null || (fieldSchema.ff_flag && fieldSchema.ff_flag === "clear clone")){
                built[field] = null;
            } else {
                built[field] = context[field] || null;
            }
        } else {
            built[field] = null;
        }

        if (objList !== null) {

            let linkedProperty = fieldSchemaLinkToPath(fieldSchema); // Is it a linkTo (recursively or not)?
            const roundTwoExclude = fieldSchema.ff_flag && fieldSchema.ff_flag == 'second round';

            if ((linkedProperty !== null && typeof linkedProperty !== 'undefined') && !roundTwoExclude){ // If linkTo, add to our list, selecting a nice name for it first.
                //var listTerm = fieldSchema.title ? fieldSchema.title : linked;
                let fieldToStore = field;

                linkedProperty = _.reject(linkedProperty, function(p){ return p === 'items' || p === 'properties'; });

                if (linkedProperty.length > 0){
                    fieldToStore += '.' + linkedProperty.join('.');
                }

                if (!_.contains(objList, fieldToStore)){
                    objList.push(fieldToStore);
                }

                // add pre-existing linkTo objects
                if (initObjs !== null && built[field] !== null){
                    delvePreExistingObjects(initObjs, built[field], fieldSchema, fieldToStore);
                }
            }
            objList.sort();
        }
    });

    return built;
}


/**
 * Takes an initObjs array that it will fill with data for each existing
 * object in an edit/clone situation. json is json content for the field,
 * schema is the individual fields schema. Recursively handles objects and arrays
 */
function delvePreExistingObjects(initObjs, json, fieldSchema, listTerm){
    if (Array.isArray(json)){
        for (var j=0; j < json.length; j++){
            if (fieldSchema.items){
                delvePreExistingObjects(initObjs, json[j], fieldSchema.items, listTerm);
            }
        }
    } else if (json instanceof Object && json){
        if(fieldSchema.properties){
            _.keys(json).forEach(function(key, idx){
                if(fieldSchema.properties[key]){
                    delvePreExistingObjects(initObjs, json[key], fieldSchema.properties[key], listTerm);
                }
            });
        }
    } else if (_.contains(_.keys(fieldSchema),'linkTo')) { // non-array, non-object field. check schema to ensure there's a linkTo
        initObjs.push({
            'path'      : json,
            'display'   : json,
            'field'     : listTerm,
            'type'      : fieldSchemaLinkToType(fieldSchema)
        });
    }
}

/** Sort a list of BuildFields first by required status, then by schema lookup order, then by title */
function sortPropFields(fields){
    var reqFields = [];
    var optFields = [];

    /** Compare by schema property 'lookup' meta-property, if available. */
    function sortSchemaLookupFunc(a,b){
        var aLookup = (a.props.schema && a.props.schema.lookup) || 750,
            bLookup = (b.props.schema && b.props.schema.lookup) || 750,
            res;

        if (typeof aLookup === 'number' && typeof bLookup === 'number') {
            //if (a.props.field === 'ch02_power_output' || b.props.field === 'ch02_power_output') console.log('X', aLookup - bLookup, a.props.field, b.props.field);
            res = aLookup - bLookup;
        }

        if (res !== 0) return res;
        else {
            return sortTitle(a,b);
        }
    }

    /** Compare by property title, alphabetically. */
    function sortTitle(a,b){
        if (typeof a.props.field === 'string' && typeof b.props.field === 'string'){
            if(a.props.field.toLowerCase() < b.props.field.toLowerCase()) return -1;
            if(a.props.field.toLowerCase() > b.props.field.toLowerCase()) return 1;
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

    reqFields.sort(sortSchemaLookupFunc);
    optFields.sort(sortSchemaLookupFunc);

    return reqFields.concat(optFields);
}



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
function removeNulls(context){
    _.keys(context).forEach(function(key, index){
        if (isValueNull(context[key])){
            delete context[key];
        } else if (Array.isArray(context[key])){
            context[key] = _.filter(context[key], function(v){ return !isValueNull(v); });
            // Recurse for any objects
            context[key] = _.map(context[key], function(v){
                return (v && typeof v === 'object') ? removeNulls(v) : v;
            });
        } else if (context[key] instanceof Object) {
            context[key] = removeNulls(context[key]);
        }
    });
    return context;
}
