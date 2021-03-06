'use strict';

import React, { useMemo } from 'react';
import Nav from 'react-bootstrap/esm/Nav';
import url from 'url';
import { console, memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util'; // Extended w. browseBaseHref & related fxns.
import {
    BigDropdownNavItem,
    BigDropdownPageLoader,
    BigDropdownPageTreeMenu,
    BigDropdownPageTreeMenuIntroduction,
    BigDropdownBigLink
} from './BigDropdown';


export const LeftNav = React.memo(function LeftNav(props){
    // `props` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer,
    // visibleDropdownID, closingDropdownID, etc.
    return (
        <Nav className="mr-auto">
            <DataNavItem {...props} />
            <ToolsNavItem {...props} />
            <ResourcesNavItem {...props} />
            <HelpNavItem {...props} />
        </Nav>
    );
});



function HelpNavItem(props){
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


function ResourcesNavItem(props){
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


function ToolsNavItem(props){
    const { session, ...navItemProps } = props;
    // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
    return (
        <BigDropdownPageLoader treeURL="/tools" session={session}>
            <BigDropdownNavItem {...navItemProps} id="tools-menu-item" navItemHref="/tools" navItemContent="Tools">
                <BigDropdownPageTreeMenuIntroduction titleIcon="tools fas" />
                <BigDropdownPageTreeMenu />
            </BigDropdownNavItem>
        </BigDropdownPageLoader>
    );
}

function DataNavItem(props){
    const { href, browseBaseState, ...navItemProps } = props;

    /** @see https://reactjs.org/docs/hooks-reference.html#usememo */
    const bodyProps = useMemo(function(){
        // Figure out if any items are active
        const { query = {}, pathname = "/a/b/c/d/e" } = memoizedUrlParse(href);

        const browseHref = navigate.getBrowseBaseHref(browseBaseState);
        const sequencingDataHref = browseHref + "&experiments_in_set.experiment_type.experiment_category=Sequencing";
        const microscopyDataHref = "/microscopy-data-overview";
        const publicationsHref = "/search/?type=Publication&sort=static_content.location&sort=-number_of_experiment_sets&number_of_experiment_sets.from=1";
        const isSearchActive = pathname === "/search/";
        const isMicroscopyActive = pathname === microscopyDataHref;
        const isPublicationsActive = isSearchActive && query.type === "Publication";
        let isBrowseActive = pathname === "/browse/";
        let isSequencingActive = false;
        if (isBrowseActive) {
            isSequencingActive = true;
            const { query: sequencingQuery = {} } = url.parse(sequencingDataHref, true);
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
        const isAnyActive = (isSearchActive || isBrowseActive || isMicroscopyActive || isSequencingActive || isPublicationsActive);
        return {
            browseHref, sequencingDataHref, microscopyDataHref, publicationsHref,
            isAnyActive, isMicroscopyActive, isSearchActive, isBrowseActive, isSequencingActive, isPublicationsActive
        };
    }, [ href, browseBaseState ]);

    const navLink = (
        <React.Fragment>
            <i className="icon icon-fw icon-database fas mr-05 align-middle" />
            <span className="text-black">Data</span>
        </React.Fragment>
    );

    return ( // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
        <BigDropdownNavItem {...navItemProps} id="data-menu-item" navItemHref={bodyProps.browseHref} navItemContent={navLink}
            active={bodyProps.isAnyActive}>
            <DataNavItemBody {...bodyProps} />
        </BigDropdownNavItem>
    );
}

const DataNavItemBody = React.memo(function DataNavItemBody(props) {
    const {
        browseHref, sequencingDataHref, microscopyDataHref, publicationsHref,
        isBrowseActive = false,
        isSequencingActive = false,
        isMicroscopyActive = false,
        isPublicationsActive = false,
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

            <BigDropdownBigLink href={sequencingDataHref} isActive={isSequencingActive} titleIcon="dna fas">
                <h4>Browse Sequencing Data</h4>
                <div className="description">
                    Search Sequencing Experiment Sets in the 4D Nucleome Database
                </div>
            </BigDropdownBigLink>

            <BigDropdownBigLink href={microscopyDataHref} isActive={isMicroscopyActive} titleIcon="microscope fas">
                <h4>View Microscopy Data</h4>
                <div className="description">
                    View Microscopy Datasets in the 4D Nucleome Database
                </div>
            </BigDropdownBigLink>

            <BigDropdownBigLink href={publicationsHref} isActive={isPublicationsActive} titleIcon="book-open fas" className="bottom-edge-child">
                <h4>Browse by Publication</h4>
                <div className="description">
                    View Publications in the 4D Nucleome Database
                </div>
            </BigDropdownBigLink>

        </React.Fragment>
    );
});
