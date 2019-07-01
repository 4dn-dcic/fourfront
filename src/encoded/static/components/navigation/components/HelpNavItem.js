'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { NavItem } from 'react-bootstrap';

/** WILL BE PROJECT-SPECIFIC */

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
        var { setOpenDropdownID, openDropdownID } = this.props;
        if (typeof setOpenDropdownID !== 'function') {
            throw new Error('No func setOpenDropdownID passed in props.');
        }
        setOpenDropdownID((openDropdownID === this.dropdownID) ? null : this.dropdownID);
    }

    render(){
        var { mounted, href, session, helpItemHref, id, openDropdownID, helpMenuTree, isLoadingHelpMenuTree, windowWidth } = this.props,
            isOpen          = openDropdownID === this.dropdownID,
            active          = href.indexOf(helpItemHref) > -1,
            commonProps     = { id, active, 'key' : id },
            isDesktopView   = windowWidth >= 768;

        if (!helpMenuTree || (helpMenuTree.children || []).length === 0 || !mounted || !isDesktopView){
            return <NavItem {...commonProps} href={helpItemHref} children="Help" />;
        }

        return (
            <NavItem {...commonProps} onClick={this.handleToggle} className={isOpen ? 'dropdown-open-for' : null}>
                Help <span className="caret"/>
            </NavItem>
        );

    }

}
