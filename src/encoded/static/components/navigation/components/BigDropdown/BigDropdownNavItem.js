'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Nav } from 'react-bootstrap';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { memoizedUrlParse } from './../../../globals';
import { BigDropdownContainer } from './BigDropdownContainer';


export class BigDropdownNavItem extends React.PureComponent {

    static defaultProps = {
        'id'                : 'help-menu-item', // MUST be supplied
        'testWarningVisible': false,
        'navItemHref'       : null,
        'navItemContent'    : <React.Fragment>Hello World</React.Fragment>,
        'overlaysContainer' : null,
        'children'          : <div>Hello World Again</div>,
        'className'         : null,
        'mounted'           : true,
        'active'            : null, // Will override navItemHref check to determine `active` if is bool
        'windowWidth'       : undefined,
        'windowHeight'      : undefined,
        'addToBodyClassList' : null,
        'removeFromBodyClassList' : null
    };

    /** Relatively arbitrary point where wanna show/enable the big dropdown */
    /** Number comparisons are slightly faster than reference comparisons in JS so no point in memoizing. */
    static isDesktopView = function(windowWidth = 0){
        return windowWidth > 768;
    }

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
        const { visibleDropdownID, onCloseDropdown, id } = this.props;

        if (typeof visibleDropdownID !== "undefined" && typeof onCloseDropdown === "function") {
            // Defer to BigDropdownGroupController
            onCloseDropdown();
        }
    }

    handleToggle(e){
        e && e.preventDefault();
        e && e.stopPropagation();
        const { visibleDropdownID, onToggleDropdown, id = null } = this.props;
        onToggleDropdown(id);
    }


    render(){
        const {
            children,
            navItemContent,
            mounted,
            testWarningVisible = false,
            menuTree = null,
            isLoadingMenuTree = false,
            href = "/",
            active: propActive = null,
            navItemHref: propNavItemHref = null,
            id = "help",
            overlaysContainer,
            visibleDropdownID,
            closingDropdownID,
            className = null,
            ...passProps
        } = this.props;
        const { windowHeight, windowWidth } = passProps;

        const open = visibleDropdownID === id;
        const closing = closingDropdownID === id;
        const isDesktopView = BigDropdownNavItem.isDesktopView(windowWidth);
        const navItemHref = propNavItemHref || menuTree && menuTree.name || null;
        const active = (
            typeof propActive === "boolean" ? propActive
                : typeof navItemHref === "string" && typeof href === "string" ? (memoizedUrlParse(href).pathname.indexOf(navItemHref) > -1)
                    : false
        );

        const navItemProps = {
            id, active,
            "key" : id,
            "href": navItemHref,
            'className' : "clickable id-" + id + (className ? " " + className : ""),
        };

        if (!children || !mounted || isLoadingMenuTree) {
            // Normal link to 'href'
            return <Nav.Link {...navItemProps} disabled={!(href)}>{ navItemContent }</Nav.Link>;
        }

        navItemProps.className += " big-dropdown-toggle dropdown-toggle" + (open ? " dropdown-open-for" : "");

        const navItem = (
            <Nav.Link {...navItemProps} onClick={this.handleToggle}>
                { navItemContent }
            </Nav.Link>
        );

        const childProps = { ...passProps, menuTree, 'isActive': active };
        const dropdownBody = React.Children.map(children, function(child){
            return React.cloneElement(child, childProps);
        });

        const dropdownContainerProps = {
            href, overlaysContainer, id, open, closing,
            isDesktopView, testWarningVisible,
            windowWidth, windowHeight,
            'onClose' : this.onCloseDropdown,
            'onToggle': this.handleToggle,
            'otherDropdownOpen' : !!(visibleDropdownID && !open),
            'otherDropdownClosing' : !!(open && closingDropdownID && closingDropdownID !== id)
        };

        const dropdownMenu = <BigDropdownContainer {...dropdownContainerProps}>{ dropdownBody }</BigDropdownContainer>;

        /*
        if (children && open) {
            const childProps = { ...passProps, menuTree };
            const dropdownBody = React.Children.map(children, function(child){
                return React.cloneElement(child, childProps);
            });
            openMenu = (
                <BigDropdownContainer {...{ windowWidth, windowHeight, href, overlaysContainer, id, open, closing, isDesktopView, testWarningVisible }}
                    onClose={this.onCloseDropdown}>
                    { dropdownBody }
                </BigDropdownContainer>
            );
        }
        */

        return <React.Fragment>{ navItem }{ dropdownMenu }</React.Fragment>;
    }

}

