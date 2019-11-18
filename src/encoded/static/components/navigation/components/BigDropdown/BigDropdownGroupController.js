'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Nav } from 'react-bootstrap';
import { console, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { requestAnimationFrame as raf } from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';
import { BigDropdownContainer } from './BigDropdownContainer';


export class BigDropdownGroupController extends React.PureComponent {

    constructor(props){
        super(props);
        this.handleToggle = _.throttle(this.handleToggle.bind(this), 500);
        this.onCloseDropdown = this.onCloseDropdown.bind(this);
        this.onBodyClick = this.onBodyClick.bind(this);

        this.state = {
            visibleDropdownID: null,
            closingDropdownID: null
        };

        this.timeout = null;
    }

    componentDidMount(){
        // React catches DOM events using 1 own native event handler and then passes down
        // SyntheticEvents to event handlers bound directly to JSX elements via props.
        // This occurs at the `document.body` level (?) so clicks that are intercepted
        // via SyntheticEvent handlers (stopPropagation) do not bubble up to window seemingly.
        window.addEventListener("click", this.onBodyClick);
    }

    componentWillUnmount(){
        window.removeEventListener("click", this.onBodyClick);
    }

    componentDidUpdate(pastProps, pastState){
        const { addToBodyClassList, removeFromBodyClassList } = this.props;
        if (typeof addToBodyClassList !== 'function' || typeof removeFromBodyClassList !== 'function') {
            return;
        }
        const { visibleDropdownID: currVisible } = this.state;
        const { visibleDropdownID: pastVisible } = pastState;

        // Primarily for mobile use cases when menu might be longer than window
        if (pastVisible !== null && currVisible === null) {
            removeFromBodyClassList("overflow-sm-hidden", "overflow-xs-hidden");
        } else if (currVisible !== null && pastVisible === null){
            addToBodyClassList("overflow-sm-hidden", "overflow-xs-hidden");
        }
    }

    /**
     * To avoid placing this BigDropdownGroupController as wrapper of NavigationBar,
     * will attempt to listen to clicks to NavigationBar here instead.
     * If click on a non-nav item, we should close.
     *
     * Clicks within menu itself (as well as Nav Items) should not bubble up to here due to `event.stopPropagation` calls
     * in e.g. `this.onBackgroundClick` in BigDropdownContainer. In effect, when visibleDropdownID is not null, we'll only
     * get click events from NavBar and maybe TestWarning.
     *
     * @param {MouseEvent} mouseEvt - Click event.
     */
    onBodyClick(mouseEvt){
        if (this.state.visibleDropdownID === null){
            return false;
        }
        this.onCloseDropdown(mouseEvt);
        return false;
    }

    onCloseDropdown(mouseEvt = null, cb){
        if (mouseEvt){
            mouseEvt.stopPropagation && mouseEvt.stopPropagation();
            mouseEvt.preventDefault && mouseEvt.preventDefault();
        }
        this.setState(function({ visibleDropdownID, closingDropdown }){
            if (visibleDropdownID === null && !closingDropdown) return null;
            return { 'visibleDropdownID' : null, 'closingDropdownID' : null };
        }, cb);
    }

    handleToggle(nextID){
        this.setState(function({ visibleDropdownID }){

            //if (nextID === null || (visibleDropdownID !== null && nextID === visibleDropdownID)) {
            //    // CSSTransition in BigDropdownMenu will transition out then call this.onCloseDropdown()
            //    return { 'closingDropdown' : true };
            //}

            if (visibleDropdownID !== null){
                if (visibleDropdownID === nextID) {
                    // CSSTransition in BigDropdownMenu will transition out then call this.onCloseDropdown()
                    return { 'visibleDropdownID': null, 'closingDropdownID' : null };
                } else {
                    return { 'visibleDropdownID' : nextID, 'closingDropdownID' : visibleDropdownID };
                }
            }

            return { 'visibleDropdownID' : nextID };
        }, ()=>{
            if (this.timeout !== null){
                clearTimeout(this.timeout);
            }
            this.timeout = setTimeout(()=>{
                const { closingDropdownID, visibleDropdownID } = this.state;
                if (closingDropdownID && visibleDropdownID) {
                    this.setState({ closingDropdownID : null });
                }
                this.timeout = null;
            }, 250);
        });
    }

    render(){
        const { children, ...passProps } = this.props;
        const childProps = {
            ...passProps,
            ...this.state,
            onToggleDropdown: this.handleToggle,
            onCloseDropdown: this.onCloseDropdown
        };
        return React.Children.map(children, function(child){
            return React.cloneElement(child, childProps);
        });
    }

}

