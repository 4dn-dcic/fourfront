'use strict';

import React from 'react';
import { Nav } from 'react-bootstrap';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util'; // Extended w. browseBaseHref & related fxns.
import {
    BigDropdownNavItem,
    BigDropdownPageLoader,
    BigDropdownPageTreeMenu,
    BigDropdownPageTreeMenuIntroduction,
} from './BigDropdown';


export const LeftNav = React.memo(function LeftNav(props){
    // `props` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer,
    // visibleDropdownID, closingDropdownID, etc.
    return (
        <Nav className="mr-auto">
            <DataNavItem {...props} />
            <ResourcesNavItem {...props} />
            <HelpNavItem {...props} />
        </Nav>
    );
});



export function HelpNavItem(props){
    const { session, ...navItemProps } = props;
    // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
    return (
        <BigDropdownPageLoader treeURL="/pages/311d0f4f-56ee-4450-8cbb-780c10229284/@@embedded" session={session}>
            <BigDropdownNavItem {...navItemProps} id="help-menu-item" navItemHref="/help/" navItemContent="Help">
                <BigDropdownPageTreeMenuIntroduction titleIcon="info-circle fas" />
                <BigDropdownPageTreeMenu />
            </BigDropdownNavItem>
        </BigDropdownPageLoader>
    );
}


export function ResourcesNavItem(props){
    const { session, ...navItemProps } = props;
    // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
    return (
        <BigDropdownPageLoader treeURL="/pages/f0f0f0f0-0000-0000-0000-aaaaaa000001/@@embedded" session={session}>
            <BigDropdownNavItem {...navItemProps} id="resources-menu-item" navItemHref="/help/analysis" navItemContent="Resources">
                <BigDropdownPageTreeMenuIntroduction titleIcon="book fas" />
                <BigDropdownPageTreeMenu />
            </BigDropdownNavItem>
        </BigDropdownPageLoader>
    );
}

export function DataNavItem(props){
    const { href, browseBaseState, ...navItemProps } = props;
    const browseHref = navigate.getBrowseBaseHref(browseBaseState);
    const active =  href && href.indexOf('/browse/') > -1;
    // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
    return (
        <BigDropdownNavItem {...navItemProps} id="data-menu-item" navItemHref={browseHref} navItemContent="Data" active={active}>
            <DateNavItemBody browseHref={browseHref} />
        </BigDropdownNavItem>
    );
}

function DateNavItemBody(props) {
    const { browseHref, onMenuItemClick, ...passProps } = props;
    return (
        <React.Fragment>
            <div className="intro-section">
                <h4>
                    <a href={browseHref} onClick={onMenuItemClick}>
                        <i className="icon icon-fw icon-microscope fas mr-1"/>
                        Browse Experiment Sets
                    </a>
                </h4>
                <div className="description">Search the 4D Nucleome Database for Experiment Sets</div>
            </div>
            <div className="intro-section">
                <h4>
                    <a href={browseHref} onClick={onMenuItemClick}>
                        <i className="icon icon-fw icon-microscope fas mr-1"/>
                        Imaging Data
                    </a>
                </h4>
                <div className="description">Search the 4D Nucleome Database for Experiment Sets</div>
            </div>
        </React.Fragment>
    );
}
