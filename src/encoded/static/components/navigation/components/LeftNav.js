'use strict';

import React from 'react';
import Nav from 'react-bootstrap/es/Nav';
import url from 'url';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util'; // Extended w. browseBaseHref & related fxns.
import {
    BigDropdownNavItem,
    BigDropdownPageLoader,
    BigDropdownPageTreeMenu,
    BigDropdownPageTreeMenuIntroduction,
    BigDropdownBigLink
} from './BigDropdown';
import { memoizedUrlParse } from '../../globals';


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
        <BigDropdownPageLoader treeURL="/help" session={session}>
            <BigDropdownNavItem {...navItemProps} id="help-menu-item" navItemHref="/help" navItemContent="Help">
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
        <BigDropdownPageLoader treeURL="/resources" session={session}>
            <BigDropdownNavItem {...navItemProps} id="resources-menu-item" navItemHref="/resources" navItemContent="Resources">
                <BigDropdownPageTreeMenuIntroduction titleIcon="book fas" />
                <BigDropdownPageTreeMenu />
            </BigDropdownNavItem>
        </BigDropdownPageLoader>
    );
}

export const DataNavItem = React.memo(function DataNavItem(props){
    const { href, browseBaseState, ...navItemProps } = props;

    // Figure out if any items are active
    const { query = {}, pathname = "/a/b/c/d/e" } = memoizedUrlParse(href);
    const browseHref = navigate.getBrowseBaseHref(browseBaseState);
    const seqencingDataHref = browseHref + "&experiments_in_set.experiment_type.experiment_category=Sequencing";
    const microscopyDataHref = "/microscopy-data-overview";
    const isMicroscopyActive = pathname === microscopyDataHref;
    let isBrowseActive = pathname === "/browse/";
    let isSequencingActive = false;
    if (isBrowseActive) {
        isSequencingActive = true;
        const { query: sequencingQuery = {} } = url.parse(seqencingDataHref, true);
        const seqKeys = Object.keys(sequencingQuery);
        for (var i = 0; i < seqKeys.length; i++){
            if (sequencingQuery[seqKeys[i]] !== query[seqKeys[i]]){
                isSequencingActive = false;
                break;
            }
        }
        if (isSequencingActive) { // Show only 1 of these as active, if both are (since isSequencing is subset of browse all)
            isBrowseActive = false;
        }
    }
    const isAnyActive = isBrowseActive || isMicroscopyActive || isSequencingActive;
    // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer

    const navLink = (
        <React.Fragment>
            <i className="icon icon-fw icon-database fas mr-05 align-middle" />
            <span className="text-black">Data</span>
        </React.Fragment>
    );

    return (
        <BigDropdownNavItem {...navItemProps} id="data-menu-item" navItemHref={browseHref} navItemContent={navLink} active={isAnyActive}>
            <DataNavItemBody {...{ browseHref, seqencingDataHref, microscopyDataHref, isBrowseActive, isSequencingActive, isMicroscopyActive }} />
        </BigDropdownNavItem>
    );
});

const DataNavItemBody = React.memo(function DataNavItemBody(props) {
    const {
        browseHref, seqencingDataHref, microscopyDataHref,
        isBrowseActive = false,
        isSequencingActive = false,
        isMicroscopyActive = false,
        ...passProps
    } = props;
    return (
        <React.Fragment>

            <BigDropdownBigLink href={browseHref} isActive={isBrowseActive} titleIcon="th fas" className="primary-big-link">
                <h4>Browse All</h4>
                <div className="description">
                    Search All Experiment Sets in the 4D Nucleome Database
                </div>
            </BigDropdownBigLink>

            <BigDropdownBigLink href={seqencingDataHref} isActive={isSequencingActive} titleIcon="dna fas">
                <h4>Browse Sequencing Data</h4>
                <div className="description">
                    Search Sequencing Experiment Sets in the 4D Nucleome Database
                </div>
            </BigDropdownBigLink>

            <BigDropdownBigLink href={microscopyDataHref} isActive={isMicroscopyActive} titleIcon="microscope fas" className="bottom-edge-child">
                <h4>View Microscopy Data</h4>
                <div className="description">
                    View Microscopy Datasets in the 4D Nucleome Database
                </div>
            </BigDropdownBigLink>

        </React.Fragment>
    );
});
