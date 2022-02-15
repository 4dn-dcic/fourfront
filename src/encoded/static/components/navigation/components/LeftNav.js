'use strict';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import Nav from 'react-bootstrap/esm/Nav';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import DropdownButton from 'react-bootstrap/esm/DropdownButton';
import url from 'url';
import _ from 'underscore';
import { object, console, memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util'; // Extended w. browseBaseHref & related fxns.
import {
    BigDropdownNavItem,
    BigDropdownPageLoader,
    BigDropdownPageTreeMenu,
    BigDropdownPageTreeMenuIntroduction,
    BigDropdownBigLink
} from './BigDropdown';
import { SearchBar } from './SearchBar';


export const LeftNav = React.memo(function LeftNav(props){
    // `props` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer,
    // visibleDropdownID, closingDropdownID, etc.
    const { visibleDropdownID } = props;
    const isSearchBarOpen = (visibleDropdownID === 'search-menu-item');
    const passProps = isSearchBarOpen ? _.extend({ 'active': false }, props) : props;
    return (
        <Nav className="mr-auto">
            <DataNavItem {...passProps} />
            <ToolsNavItem {...passProps} />
            <ResourcesNavItem {...passProps} />
            <HelpNavItem {...passProps} />
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
    const { active: propActive } = navItemProps;

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
    const active = propActive !== false && bodyProps.isAnyActive;
    return ( // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
        <BigDropdownNavItem {...navItemProps} id="data-menu-item" navItemHref={bodyProps.browseHref} navItemContent={navLink}
            active={active}>
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
        const title = {
            display_title: 'Search',
            description: 'Search Items in the 4D Nucleome Database',
            name: 'search'
        };

        return {
            searchQueryFromHref, searchTypeFromHref, title
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
        <BigDropdownNavItem {...navItemProps} id="search-menu-item" navItemHref="/search" navItemContent={navLink} autoHideOnClick={false}>
            <SearchNavItemBody {...bodyProps} />
        </BigDropdownNavItem>
    );
}

const SearchNavItemBody = React.memo(function SearchNavItemBody(props) {
    const { searchQueryFromHref, searchTypeFromHref, title } = props;

    const searchTextInputEl = useRef(null);
    useEffect(() => {
        setTimeout(() => {
            if (searchTextInputEl && searchTextInputEl.current) {
                searchTextInputEl.current.focus();
            }
        }, 350);
    }, []);

    const initialItemType = AvailableSearchItemTypes[searchTypeFromHref] ? searchTypeFromHref : 'Item';
    const [searchText, setSearchText] = useState(searchQueryFromHref || '');
    const [searchItemType, setSearchItemType] = useState(initialItemType);
    const [searchInputIsValid, setSearchInputIsValid] = useState(true);

    //hidden form inputs & search placeholder text
    const [hiddenInputsForURIQuery, placeholderText] = useMemo(function () {
        // hiddenInputsForURIQuery
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
        const hiddenInputsForURIQuery = SearchBar.renderHiddenInputsForURIQuery(query);

        //placeholder text
        let placeholderText = '';
        switch (searchItemType) {
            case 'Item':
                placeholderText = 'Search in All Items';
                break;
            case 'ByAccession':
                placeholderText = 'Type Item\'s Complete Accession (e.g. 4DNXXXX ...)';
                break;
            default:
                placeholderText = "Search in " + AvailableSearchItemTypes[searchItemType].text;
                break;
        }

        return [hiddenInputsForURIQuery, placeholderText];
    }, [searchItemType]);
    //handler for search item selection
    const onChangeSearchItemType = useCallback(function (evtKey) {
        if (typeof evtKey === 'string') {
            setSearchItemType(evtKey);

            //validate accession
            let isValid = true;
            if (evtKey === 'ByAccession') {
                isValid = object.isAccessionRegex(searchText);
            }
            if (searchInputIsValid !== isValid) {
                setSearchInputIsValid(isValid);
            }
        }
    });
    //navigate to Item page directly without searching
    const navigateByAccession = function (evt) {
        if (searchItemType === 'ByAccession') {
            const accession = searchText && searchText.trim();
            if (accession) {
                evt.preventDefault();
                evt.stopPropagation();
                navigate('/' + accession);
            }
        }
    };
    //handler for search text change
    const handleOnChange = function (evt) {
        const value = evt.target.value;
        setSearchText(value);

        //validate accession
        let isValid = true;
        if (searchItemType === 'ByAccession') {
            isValid = object.isAccessionRegex(value);
        }
        if (searchInputIsValid !== isValid) {
            setSearchInputIsValid(isValid);
        }
    };
    //select all text when focused
    const handleFocus = function (evt) {
        evt.target.select();
    };

    const selectedItem = AvailableSearchItemTypes[searchItemType];
    const action = (selectedItem && selectedItem.action) || '/search';
    const btnIconClassName = 'icon icon-fw fas ' + (searchItemType === 'ByAccession' ? 'icon-arrow-right' : 'icon-search');
    const btnDisabled = !(searchText &&  typeof searchText === 'string' && searchText.length > 0);
    const searchTextClassName = 'form-control' + (!searchInputIsValid ? ' border border-danger' : '');

    return (//Form submission gets serialized and AJAXed via onSubmit handlers in App.js
        <React.Fragment>
            <BigDropdownPageTreeMenuIntroduction titleIcon="search fas" menuTree={title} />
            <form action={action} method="GET" className="navbar-search-form-container" onSubmit={navigateByAccession}>
                <div className="row">
                    <div className="col-lg-3 col-md-4 col-sm-12 mt-1">
                        <SelectItemTypeDropdownBtn {...{ searchItemType }} disabled={false} onChangeSearchItemType={onChangeSearchItemType} />
                    </div>
                    <div className="col-lg-8 col-md-6 col-sm-12 mt-1">
                        <input type="search" key="global-search-input" name="q" className={searchTextClassName} placeholder={placeholderText}
                            value={searchText} onChange={handleOnChange} onFocus={handleFocus} autoComplete="off" ref={searchTextInputEl} />
                    </div>
                    <div className="col-lg-1 col-md-2 col-sm-12 mt-1">
                        <button type="submit" className="btn btn-outline-light w-100" data-id="global-search-button" data-handle-click={true} disabled={btnDisabled}>
                            <i className={btnIconClassName} data-id="global-search-button-icon" data-handle-click={true} />
                        </button>
                    </div>
                </div>
                {hiddenInputsForURIQuery}
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