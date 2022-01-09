'use strict';

import React, { useMemo, useState, useCallback } from 'react';
import Nav from 'react-bootstrap/esm/Nav';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import DropdownButton from 'react-bootstrap/esm/DropdownButton';
import url from 'url';
import _ from 'underscore';
import { console, memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util'; // Extended w. browseBaseHref & related fxns.
import {
    BigDropdownNavItem,
    BigDropdownPageLoader,
    BigDropdownPageTreeMenu,
    BigDropdownPageTreeMenuIntroduction,
    BigDropdownBigLink
} from './BigDropdown';
import { SearchBar } from '.';


export const LeftNav = React.memo(function LeftNav(props){
    // `props` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer,
    // visibleDropdownID, closingDropdownID, etc.
    return (
        <Nav className="mr-auto">
            <DataNavItem {...props} />
            <ToolsNavItem {...props} />
            <ResourcesNavItem {...props} />
            <HelpNavItem {...props} />
            <SearchNavItem {...props} />
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

function SearchNavItem(props){
    const { href, browseBaseState, ...navItemProps } = props;

    /** @see https://reactjs.org/docs/hooks-reference.html#usememo */
    const bodyProps = useMemo(function(){
        const hrefParts = memoizedUrlParse(href);
        const searchQueryFromHref = (hrefParts && hrefParts.query && hrefParts.query.q) || '';
        const searchTypeFromHref = (hrefParts && hrefParts.query && hrefParts.query.type) || '';

        return {
            searchQueryFromHref, searchTypeFromHref
        };
    }, [ href, browseBaseState ]);

    const navLink = (
        <React.Fragment>
            <span className="border border-secondary rounded p-2 ml-lg-5">
                <span className="d-inline-block text-black">Search ...</span>
                <i className="icon icon-fw icon-search fas align-middle" />
            </span>
        </React.Fragment>
    );

    return ( // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
        <BigDropdownNavItem {...navItemProps} id="search-menu-item" navItemHref="/search" navItemContent={navLink}
            active={false} autoHideOnClick={false}>
            <SearchNavItemBody {...bodyProps} />
        </BigDropdownNavItem>
    );
}

const SearchNavItemBody = React.memo(function SearchNavItemBody(props) {
    const { searchQueryFromHref, searchTypeFromHref } = props;

    const initialItemType = AvailableSearchItemTypes[searchTypeFromHref] ? searchTypeFromHref : 'Item';
    const [searchText, setSearchText] = useState(searchQueryFromHref || '');
    const [searchItemType, setSearchItemType] = useState(initialItemType);

    const onChangeSearchItemType = useCallback(function (evtKey) {
        if (typeof evtKey === 'string') {
            setSearchItemType(evtKey);
        }
    });
    //render hidden form inputs
    const renderHiddenInputsForURIQuery = useCallback(function () {
        const query = {};
        switch (searchItemType) {
            case 'ExperimentSetReplicate': {
                const browseBaseParams = navigate.getBrowseBaseParams();
                _.extend(query, browseBaseParams);
            }
                break;
            case 'ByAccession':
                break;
            default: {
                _.extend(query, { 'type': searchItemType });
            }
                break;
        }
        return SearchBar.renderHiddenInputsForURIQuery(query);
    });
    //custom placeholder text for search item type
    const getSearchTextPlaceholder = useCallback(function () {
        switch (searchItemType) {
            case 'Item':
                return 'Search 4DN Data Portal';
            case 'ByAccession':
                return 'Type Item\'s Accession (e.g. 4DNXXXX ...)';
            default:
                return "Search in " + AvailableSearchItemTypes[searchItemType].text;
        }
    });
    //navigate to Item page directly without searching
    const navigateByAccession = useCallback(function (evt) {
        if (searchItemType === 'ByAccession') {
            evt.preventDefault();
            evt.stopPropagation();
            navigate('/' + searchText);
        }
    });
    //select all text when focused
    const handleFocus = useCallback(function (evt) {
        evt.target.select();
    });

    const selectedItem = AvailableSearchItemTypes[searchItemType];
    const action = (selectedItem && selectedItem.action) || '/search';
    const btnIconClassName = 'icon icon-fw fas ' + (searchItemType === 'ByAccession' ? 'icon-arrow-right' : 'icon-search');
    const btnDisabled = !(searchText &&  typeof searchText === 'string' && searchText.length > 0);

    return (//Form submission gets serialized and AJAXed via onSubmit handlers in App.js
        <React.Fragment>
            <h4>Search</h4>
            <form action={action} method="GET" className="form-inline navbar-search-form-container" onSubmit={navigateByAccession}>
                <div className="container">
                    <div className="row">
                        <div className="col-lg-3 col-md-4 col-sm-12 mt-1">
                            <SelectItemTypeDropdownBtn {...{ searchItemType }} disabled={false} onChangeSearchItemType={onChangeSearchItemType} />
                        </div>
                        <div className="form-inputs-container description col-lg-8 col-md-6 col-sm-12 mt-1">
                            <input type="search" className="form-control search-query w-100" placeholder={getSearchTextPlaceholder()} name="q"
                                value={searchText} onChange={function (e) { setSearchText(e.target.value); }} onFocus={handleFocus} />
                        </div>
                        <div className="form-visibility-toggle col-lg-1 col-md-2 col-sm-12 mt-1">
                            <button type="submit" className="btn btn-outline-light w-100" data-id="global-search-button" data-is-form-button={true} disabled={btnDisabled}>
                                <i className={btnIconClassName} data-id="global-search-button-icon" data-is-form-button={true} />
                            </button>
                        </div>
                    </div>
                </div>
                {renderHiddenInputsForURIQuery()}
            </form>
        </React.Fragment>
    );
});

const SelectItemTypeDropdownBtn = React.memo(function SelectItemTypeDropdownBtn(props){
    const { searchItemType, onChangeSearchItemType, disabled = true } = props;
    const selectedItem = AvailableSearchItemTypes[searchItemType];

    return (
        <div className="search-item-type-wrapper">
            <DropdownButton id="search-item-type-selector" size="l" variant="outline-light w-100" disabled={disabled}
                title={!selectedItem ? 'Search in specific type ...' : selectedItem.text}>
                {
                    _.values(AvailableSearchItemTypes).map(function (item) {
                        return (
                            <DropdownItem key={item.type} eventKey={item.type} data-key={item.type}
                                className="w-100" onSelect={onChangeSearchItemType} active={searchItemType == item.type}>
                                {item.text}
                            </DropdownItem>);
                    })
                }
            </DropdownButton>
        </div>
    );
});

const AvailableSearchItemTypes = {
    'Item': { type: 'Item', text: 'General (All Item Types)' },
    'ByAccession': { type: 'ByAccession', text: "By Accession" },
    'ExperimentSetReplicate': { type: 'ExperimentSetReplicate', text: 'Experiment Sets', action: '/browse' },
    'Publication': { type: 'Publication', text: 'Publications' },
    'File': { type: 'File', text: 'Files' },
    'Biosource': { type: 'Biosource', text: 'Biosources' },
};