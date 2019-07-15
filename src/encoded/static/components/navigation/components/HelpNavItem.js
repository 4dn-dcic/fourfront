'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { NavItem, Nav } from 'react-bootstrap';

/**
 * Renders a Menu Item in NavBar for "Help".
 * Sends its `props.dropdownID` (or null, if === `props.openDropdownID`) to (function) `props.setOpenDropdownID` on click.
 *
 * To be used within a React-Bootstrap `<Nav>` section of a NavBar.
 */
export class HelpNavItem extends React.PureComponent {

    static defaultProps = {
        'id'            : 'help-menu-item',
        'dropdownID'    : 'help'
    };

    constructor(props){
        super(props);
        this.handleToggle = this.handleToggle.bind(this);
        this.dropdownID = props.dropdownID || props.id;
    }

    handleToggle(e){
        const { setOpenDropdownID, openDropdownID } = this.props;
        e.preventDefault();
        if (typeof setOpenDropdownID !== 'function') {
            throw new Error('No func setOpenDropdownID passed in props.');
        }
        setOpenDropdownID((openDropdownID === this.dropdownID) ? null : this.dropdownID);
    }

    render(){
        const { mounted, href, session, helpItemHref, id, openDropdownID, helpMenuTree, isLoadingHelpMenuTree, windowWidth } = this.props;
        const isOpen = openDropdownID === this.dropdownID;
        const active = href.indexOf(helpItemHref) > -1;
        const commonProps = { id, active, 'key' : id, 'href': helpItemHref };
        const isDesktopView = windowWidth >= 768;
        let cls = "id-" + id; // `id` is no longer pass as HTML attrib to[NavLink->]Dropdown so we add to className;

        if (!helpMenuTree || (helpMenuTree.children || []).length === 0 || !mounted || !isDesktopView){
            return <Nav.Link {...commonProps} className={cls}>Help</Nav.Link>;
        }

        cls += " dropdown-toggle" + (isOpen ? " dropdown-open-for" : "");

        return (
            <Nav.Link {...commonProps} onClick={this.handleToggle} className={cls}>
                Help
            </Nav.Link>
        );

    }

}
