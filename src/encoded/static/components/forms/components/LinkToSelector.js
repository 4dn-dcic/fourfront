'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import ReactTooltip from 'react-tooltip';
import { console, object } from './../../util';


/**
 * Global variable which holds reference to child window, if any.
 * Is re-used if one is open to prevent additional windows being created.
 */
let linkedObjChildWindow = null;

/**
 * Use to help select Items from a second/child window's SearchView.
 *
 * While `props.isSelecting` is true, this component will keep window event listeners active to
 * listen for ondrag/ondrop events as well as for 'message' events (e.g. from other window(s)).
 * 
 * Upon receiving a drop or message of an Item, `props.onSelect` is called with the Item's @ID and
 * its context (if available) as parameters. `props.onSelect` is expected to handle setting `props.isSelecting`
 * to false and/or unmounting this component.
 *
 * Upon `props.isSelecting` becoming true (or component mounted with
 * that value), component will initialize/open a child window which will be
 * kept open until is closed or `props.isSelecting` becomes false (or this component becomes
 * unmounted).
 * 
 * This component does not render any of its own JSX/HTML, but will render children if any are passed in.
 */
export class LinkToSelector extends React.PureComponent {

    static propTypes = {
        'isSelecting'       : PropTypes.bool.isRequired,
        'onSelect'          : PropTypes.func.isRequired,
        'searchURL'         : PropTypes.string.isRequired,
        'childWindowAlert'  : PropTypes.shape({
            'title'             : PropTypes.string.isRequired,
            'message'           : PropTypes.any.isRequired,
            'style'             : PropTypes.string
        }),
        'onCloseChildWindow': PropTypes.func,
        'dropMessage'       : PropTypes.string.isRequired
    };

    static defaultProps = {
        'isSelecting'       : false,
        'onSelect'          : function(itemAtID, itemContext){
            console.log("Selected", itemAtID, itemContext);
        },
        'onCloseChildWindow': function(){
            console.log("Closed child window");
        },
        'searchURL'         : '/search/?type=Item',
        'childWindowAlert'  : null,
        'children'          : null,
        'dropMessage'       : "Drop Item Here"
    };

    constructor(props){
        super(props);
        this.showAlertInChildWindow = this.showAlertInChildWindow.bind(this);
        this.setChildWindowMessageHandler = this.setChildWindowMessageHandler.bind(this);
        this.handleChildWindowMessage = this.handleChildWindowMessage.bind(this);
        this.handleWindowDragOver = this.handleWindowDragOver.bind(this);
        this.refreshWindowDropReceiver = _.throttle(this.refreshWindowDropReceiver.bind(this), 300);
        this.closeWindowDropReceiver = this.closeWindowDropReceiver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.receiveData = this.receiveData.bind(this);

        this.windowDropReceiverHideTimeout = null;
    }

    componentDidMount(){
        this.manageWindowOnDragHandler({ 'isSelecting' : false }, this.props);
        this.manageChildWindow({ 'isSelecting' : false }, this.props);
    }

    componentDidUpdate(pastProps){
        if (pastProps.isSelecting !== this.props.isSelecting) {
            this.manageWindowOnDragHandler(pastProps, this.props);
            this.manageChildWindow(pastProps, this.props);
        }
        ReactTooltip.rebuild();
    }

    componentWillUnmount(){
        this.manageWindowOnDragHandler(this.props, { 'isSelecting' : false });
        this.manageChildWindow(this.props, { 'isSelecting' : false }, true);
    }

    manageWindowOnDragHandler(pastProps, nextProps){

        if (!window) {
            console.error('No window object available. Fine if this appears in a test.');
            return;
        }

        var pastInSelection       = pastProps.isSelecting,
            nowInSelection        = nextProps.isSelecting,
            hasUnsetInSelection   = pastInSelection && !nowInSelection,
            hasSetInSelection     = !pastInSelection && nowInSelection;

        if (hasUnsetInSelection){
            window.removeEventListener('dragenter', this.handleWindowDragEnter);
            window.removeEventListener('dragover',  this.handleWindowDragOver);
            window.removeEventListener('drop',      this.handleDrop);
            this.closeWindowDropReceiver();
            //console.warn('Removed window event handlers for component', this);
            //console.log(pastInSelection, nowInSelection, _.clone(pastProps), _.clone(nextProps))
        } else if (hasSetInSelection){
            var _this = this;
            setTimeout(function(){
                if (!_this || !_this.props.isSelecting) return false;
                //if (!_this || !_this.isInSelectionField(_this.props)) return false;
                window.addEventListener('dragenter', _this.handleWindowDragEnter);
                window.addEventListener('dragover',  _this.handleWindowDragOver);
                window.addEventListener('drop',      _this.handleDrop);
                //console.warn('Added window event handlers for field', _this.props.field);
                //console.log(pastInSelection, nowInSelection, _.clone(pastProps), _.clone(nextProps))
            }, 250);
        } else {
            // No action occurred
        }
    }

    /**
     * Handles drop event for the (temporarily-existing-while-dragging-over) window drop receiver element.
     * Grabs @ID of Item from evt.dataTransfer, attempting to grab from 'text/4dn-item-id', 'text/4dn-item-json', or 'text/plain'.
     *
     * @see Notes and inline comments for handleChildFourFrontSelectionClick re isValidAtId.
     * @param {DragEvent} Drag event.
     */
    handleDrop(evt){
        evt.preventDefault();
        evt.stopPropagation();
        var draggedContext  = evt.dataTransfer && evt.dataTransfer.getData('text/4dn-item-json'),
            draggedURI      = evt.dataTransfer && evt.dataTransfer.getData('text/plain'),
            draggedID       = evt.dataTransfer && evt.dataTransfer.getData('text/4dn-item-id'),
            atId            = draggedID || (draggedContext && object.itemUtil.atId(draggedContext)) || url.parse(draggedURI).pathname || null;

        this.receiveData(atId, draggedContext);
    }

    handleWindowDragEnter(evt){
        evt.preventDefault();
        evt.stopPropagation();
    }

    handleWindowDragOver(evt){
        evt.preventDefault();
        evt.stopPropagation();
        this.refreshWindowDropReceiver(evt);
    }

    closeWindowDropReceiver(evt){
        var elem = this.windowDropReceiverElement;
        if (!elem) return;
        elem.style.opacity = 0;
        setTimeout(()=>{
            document.body.removeChild(elem);
            this.windowDropReceiverElement = null;
            this.windowDropReceiverHideTimeout = null;
        }, 250);
    }

    refreshWindowDropReceiver(evt){
        if (!document || !document.createElement) return;

        if (this.windowDropReceiverHideTimeout !== null) {
            clearTimeout(this.windowDropReceiverHideTimeout);
            this.windowDropReceiverHideTimeout = setTimeout(this.closeWindowDropReceiver, 500);
            return;
        }

        var { dropMessage } = this.props,
            element     = document.createElement('div');

        element.className = "full-window-drop-receiver";

        var innerText       = dropMessage, //"Drop " + (itemType || "Item") + " for field '" + (prettyTitle || nestedField) +  "'",
            innerBoldElem   = document.createElement('h2');

        innerBoldElem.appendChild(document.createTextNode(innerText));
        element.appendChild(innerBoldElem);
        element.appendChild(document.createElement('br'));
        document.body.appendChild(element);
        this.windowDropReceiverElement = element;

        setTimeout(()=>{
            this.windowDropReceiverElement.style.opacity = 1;
        }, 10);

        this.windowDropReceiverHideTimeout = setTimeout(this.closeWindowDropReceiver, 500);
    }

    manageChildWindow(pastProps, nextProps, willUnmount = false){

        if (!window) {
            console.error('No window object available. Fine if this appears in a test.');
            return;
        }

        var { searchURL, onCloseChildWindow } = this.props,
            pastInSelection       = pastProps.isSelecting,
            nowInSelection        = nextProps.isSelecting,
            hasUnsetInSelection   = pastInSelection && !nowInSelection,
            hasSetInSelection     = !pastInSelection && nowInSelection;

        if (hasSetInSelection){

            if (linkedObjChildWindow && !linkedObjChildWindow.closed && linkedObjChildWindow.fourfront && typeof linkedObjChildWindow.fourfront.navigate === 'function'){
                // We have access to the JS of our child window.
                // Call app.navigate(URL) directly instead of reloading entire HTML.
                // MAY NOT WORK FOR SOME BROWSERS --- if so, should be caught by if check
                this.windowObjectReference = linkedObjChildWindow;
                this.windowObjectReference.fourfront.navigate(searchURL, {}, this.showAlertInChildWindow);
                this.windowObjectReference.focus();
            } else {
                // Some browsers (*cough* MS Edge *cough*) are strange and will encode '#' to '%23' initially.
                this.windowObjectReference = linkedObjChildWindow = window.open(
                    "about:blank",
                    "selection-search",
                    "menubar=0,toolbar=1,location=0,resizable=1,scrollbars=1,status=1,navigation=1,width=1010,height=600"
                );
                setTimeout(()=>{
                    this.windowObjectReference.location.assign(searchURL);
                    this.windowObjectReference.location.hash = '#!selection';
                }, 100);
            }

            this.setChildWindowMessageHandler();

            this.childWindowClosedInterval = setInterval(()=>{
                // Check every 1s if our child window is still open.
                // If not, stop checking & cleanup event handlers.
                if (!this || !this.windowObjectReference || this.windowObjectReference.closed) {
                    clearInterval(this.childWindowClosedInterval);
                    delete this.childWindowClosedInterval;
                    if (this && this.windowObjectReference && this.windowObjectReference.closed){
                        if (typeof onCloseChildWindow === 'function'){
                            onCloseChildWindow();
                        }
                    }
                    this.cleanChildWindowEventHandlers();
                    this.windowObjectReference = linkedObjChildWindow = null;
                }
            }, 1000);

        } else if (hasUnsetInSelection){

            if (this.childWindowClosedInterval){
                clearInterval(this.childWindowClosedInterval);
                delete this.childWindowClosedInterval;
                if (willUnmount){
                    this.cleanChildWindow();
                } else {
                    this.cleanChildWindowEventHandlers();
                }
            }
            
        }

    }

    /**
     * This functioned is used as a listener/handler for messages received to this window.
     * Messages might be sent from child window directly to this parent window via e.g. `window.opener.postMessage(message, origin, ...)`
     *
     * @param {MessageEvent} evt - See https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent.
     */
    handleChildWindowMessage(evt){
        var eventType = evt && evt.data && evt.data.eventType;

        if (!eventType) {
            // We require an 'eventType' to be present in cross-window messages to help ID what the message is.
            console.error("No eventType specified in message. Canceling.");
            return;
        }

        // Authenticate message origin to prevent XSS attacks.
        var eventOriginParts = url.parse(evt.origin);
        if (window.location.host !== eventOriginParts.host){
            console.error('Received message from unauthorized host. Canceling.');
            return;
        }
        if (window.location.protocol !== eventOriginParts.protocol){
            console.error('Received message from unauthorized protocol. Canceling.');
            return;
        }

        // The meat of this function/handler. This is what we listen to / expect.
        if (eventType === 'fourfrontselectionclick') {
            // Attempt to grab Item ID & context from custom event
            var atId    = (evt.data && evt.data.id) || (evt.detail && evt.detail.id) || null,
                context = evt.data && evt.data.json;
            return this.receiveData(atId, context);
        }

        // If we have a `props.childWindowAlert`, show it once child window lets us know it has initialized it JS environment.
        if (eventType === 'fourfrontinitialized') {
            return this.showAlertInChildWindow();
        }
    }

    setChildWindowMessageHandler(){
        setTimeout(()=>{
            window && window.addEventListener('message', this.handleChildWindowMessage);
            console.log('Updated \'message\' event handler');
        }, 200);
    }

    cleanChildWindowEventHandlers(){
        window.removeEventListener('message', this.handleChildWindowMessage);
        if (!this || !this.windowObjectReference) {
            console.warn('Child window no longer available to unbind event handlers. Fine if closed.');
            return;
        }
    }

    cleanChildWindow(){
        if (this && this.windowObjectReference){
            if (!this.windowObjectReference.closed) this.windowObjectReference.close();
            this.cleanChildWindowEventHandlers();
            this.windowObjectReference = linkedObjChildWindow = null;
        }
    }

    /**
     * @param {string} itemAtID - ID of selected Item, if any.
     * @param {Object} itemContext - JSON of selected Item, if present (NOT GUARANTEED TO BE PROVIDED).
     */
    receiveData(itemAtID, itemContext){
        this.cleanChildWindow();
        this.props.onSelect(itemAtID, itemContext);
    }

    /**
     * THIS MAY NOT WORK FOR ALL BROWSERS
     */
    showAlertInChildWindow(){
        var { childWindowAlert } = this.props;
        if (!childWindowAlert) return;

        var childAlerts = this.windowObjectReference && this.windowObjectReference.fourfront && this.windowObjectReference.fourfront.alerts;
        if (!Array.isArray(childAlerts) || !childAlerts) return;
        childAlerts.queue(childWindowAlert);
    }

    render(){
        return this.props.children;
    }

}
