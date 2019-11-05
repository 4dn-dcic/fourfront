'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Nav } from 'react-bootstrap';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BigDropdownContainer } from './BigDropdownContainer';


export class BigDropdownNavItem extends React.PureComponent {

    static defaultProps = {
        'id'                : 'help-menu-item',
        'session'           : false,
        'isFullscreen'      : false,
        'testWarning'       : false,
        'navItemHref'       : "/help/",
        'navItemContent'    : <React.Fragment>Hello World</React.Fragment>,
        'overlaysContainer' : null,
        'children'          : <div>Hello World Again</div>
    };

    /** Relatively arbitrary point where wanna show/enable the big dropdown */
    static isDesktopView = memoize(function(windowWidth){
        return windowWidth > 768;
    });

    constructor(props){
        super(props);
        this.handleToggle = this.handleToggle.bind(this);
        this.onCloseDropdown = this.onCloseDropdown.bind(this);

        this.state = {
            'isDropdownVisible': false,
            'closingDropdown': false
        };
    }

    onCloseDropdown(cb){
        this.setState(function({ isDropdownVisible }){
            if (!isDropdownVisible && !closingDropdown) return null;
            return { 'isDropdownVisible' : false, 'closingDropdown' : false };
        }, cb);
    }

    handleToggle(e){
        e && e.preventDefault();
        this.setState(function({ isDropdownVisible }){
            if (!isDropdownVisible){
                return { 'isDropdownVisible' : true };
            } else {
                // CSSTransition in BigDropdownMenu will transition out then call this.onCloseDropdown()
                return { 'closingDropdown' : true };
            }
        });
    }


    render(){
        const {
            children,
            navItemContent,
            mounted,
            isFullscreen = false,
            testWarning = false,
            //menuTree = null,
            isLoadingMenuTree = false,
            href = "/",
            navItemHref = null,
            id = "help",
            overlaysContainer,
            ...passProps
        } = this.props;
        const { windowHeight, windowWidth } = passProps;
        const { isDropdownVisible, closingDropdown } = this.state;
        const isDesktopView = BigDropdownNavItem.isDesktopView(windowWidth);
        const active = href.indexOf(navItemHref) > -1;

        const navItemProps = {
            id, active,
            "key" : id,
            "href": navItemHref,
            'className' : "id-" + id,
        };

        if (!children || !mounted || !isDesktopView || isLoadingMenuTree) {
            // Normal link to 'href'
            return <Nav.Link {...navItemProps} disabled={!(href)}>{ navItemContent }</Nav.Link>;
        }

        navItemProps.className += " dropdown-toggle" + (isDropdownVisible ? " dropdown-open-for" : "");

        const navItem = (
            <Nav.Link {...navItemProps} onClick={this.handleToggle}>
                { navItemContent }
            </Nav.Link>
        );

        const inclBigMenu = children && isDropdownVisible && isDesktopView;

        if (!inclBigMenu){
            return navItem;
        } else {
            const testWarningVisible = testWarning & !isFullscreen;
            const dropdownBody = React.Children.map(children, function(child){
                return React.cloneElement(child, passProps);
            });
            return (
                <React.Fragment>
                    { navItem }
                    <BigDropdownContainer {...{ windowWidth, windowHeight, href, overlaysContainer, id }}
                        className={testWarningVisible ? 'test-warning-visible' : null}
                        onClose={this.onCloseDropdown} open={isDropdownVisible} closing={closingDropdown}>
                        {/*
                        <BigDropdownPageTreeMenuIntroduction menuTree={menuTree} />
                        <BigDropdownPageTreeMenu menuTree={menuTree} />
                        */}
                        { dropdownBody }
                    </BigDropdownContainer>
                </React.Fragment>
            );
        }

    }

}

