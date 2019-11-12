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

        this.state = {
            visibleDropdownID: null,
            closingDropdownID: null
        };

        this.timeout = null;
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
            removeFromBodyClassList("overflow-sm-hidden", "overflow-md-hidden", "overflow-xs-hidden");
        } else if (currVisible !== null && pastVisible === null){
            addToBodyClassList("overflow-sm-hidden", "overflow-md-hidden", "overflow-xs-hidden");
        }
    }

    onCloseDropdown(closeID = null, cb){
        this.setState(function({ visibleDropdownID, closingDropdown }){
            if (visibleDropdownID === null && !closingDropdown) return null;
            //if (visibleDropdownID !== null && closeID !== null && visibleDropdownID !== closeID) {
            //    return { 'closingDropdownID' : null };
            //}
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

