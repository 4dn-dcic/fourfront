'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { DropdownItem, DropdownButton } from 'react-bootstrap';
import { Fade } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Fade';
import { console, searchFilters, isSelectAction } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util';
import { memoizedUrlParse } from './../../globals';


export class SearchBar extends React.PureComponent {

    static renderHiddenInputsForURIQuery(query) {
        return _.flatten(_.map(
            _.pairs(query),
            function (qp) {
                if (Array.isArray(qp[1])) {
                    return _.map(qp[1], function (queryValue, idx) {
                        return <input key={qp[0] + '.' + idx} type="hidden" name={qp[0]} value={queryValue} />;
                    });
                } else {
                    return <input key={qp[0]} type="hidden" name={qp[0]} value={qp[1]} />;
                }
            }
        ));
    }

    static hasInput(typedSearchQuery) {
        return (typedSearchQuery && typeof typedSearchQuery === 'string' && typedSearchQuery.length > 0) || false;
    }

    constructor(props) {
        super(props);
        this.toggleSearchAllItems = this.toggleSearchAllItems.bind(this);
        this.onSearchInputChange = this.onSearchInputChange.bind(this);
        this.onResetSearch = this.onResetSearch.bind(this);
        this.onSearchInputBlur = this.onSearchInputBlur.bind(this);
        this.selectItemTypeDropdown = this.selectItemTypeDropdown.bind(this);
        this.getDropdownTitleText=this.getDropdownTitleText.bind(this);

        var initialQuery = '';
        if (props.href) {
            initialQuery = searchFilters.searchQueryStringFromHref(props.href) || '';
        }
        this.state = {
            'searchItemType': props.href && navigate.isSearchHref(props.href) || 'sets' ,
            'typedSearchQuery': initialQuery,
        };
    }

    componentDidUpdate(pastProps) {
        const { href } = this.props;
        if (pastProps.href !== href) {
            const query = searchFilters.searchQueryStringFromHref(href) || '';
            this.setState(function ({ typedSearchQuery }) {
                if (query !== typedSearchQuery) {
                    return { 'typedSearchQuery': query };
                }
                return null;
            });
        }
    }
    getCurrentResultsSearchQuery(hrefParts) {
        if (!hrefParts) {
            hrefParts = url.parse(this.props.href, true);
        }
        return (hrefParts && hrefParts.query && hrefParts.query.q) || null;
    }
    getDropdownTitleText() {
        const { href } = this.props;
        const { searchItemType } = this.state;
        const isBrowseOrSearchActive = href && href.indexOf('/browse/') > -1 || href && href.indexOf('/search/') > -1;
        if (!isBrowseOrSearchActive && searchItemType === 'within') {
            this.setState({ 'searchItemType': 'sets' });
        }
        switch (searchItemType) {
            case 'sets':
                return 'Experiment Sets';
            case 'all':
                return 'All Items (advanced)';
            case 'within':
                return 'Within Results';
            default:
                return 'Experiment Sets';
        }
    }

    toggleSearchAllItems(searchItemEventKey) {
        this.setState(function () {
            if (typeof searchItemEventKey === 'string') {

                switch (searchItemEventKey) {
                    case 'sets':
                        return { 'searchItemType': searchItemEventKey };
                    case 'all':
                        return { 'searchItemType': searchItemEventKey };
                    case 'within':
                        return { 'searchItemType': searchItemEventKey };
                    default:
                        return { 'searchItemType': 'sets' };
                }

            }
            else {
                return { 'searchItemType': 'sets' };
            }
        });
    }
    onSearchInputChange(e) {
        const newValue = e.target.value;
        const state = { 'typedSearchQuery': newValue };
        if (!SearchBar.hasInput(newValue) && !isSelectAction(this.props.currentAction)) {
            state.searchItemType = '';
        }
        this.setState(state);
    }

    onSearchInputBlur(e) {
        const lastQuery = searchFilters.searchQueryStringFromHref(this.props.href);
        if (SearchBar.hasInput(lastQuery) && !SearchBar.hasInput(this.state.typedSearchQuery)) {
            this.setState({ 'typedSearchQuery': lastQuery });
        }
    }

    onResetSearch (e){
        const { href } = this.props;
        const hrefParts = _.clone(memoizedUrlParse(href));
        hrefParts.query = _.clone(hrefParts.query || {});
        if (typeof hrefParts.search === 'string'){
            delete hrefParts.query['q'];
            delete hrefParts.search;
        }
        this.setState(
            { 'searchItemType': '', 'typedSearchQuery': '' },
            navigate.bind(navigate, url.format(hrefParts))
        );
    }
    actionSearchType() {
        const { searchItemType } = this.state;
        switch (searchItemType) {
            case 'sets':
                return "/browse/";
            case 'all':
                return "/search/";
            case 'within':
                return '';
            default:
                return "/browse/";
        }
    }
    selectItemTypeDropdown(visible = false) {
        const { currentAction,href } = this.props;
        if (isSelectAction(currentAction)) return null;
        const isBrowseOrSearchActive =  href && href.indexOf('/browse/') > -1 ||href && href.indexOf('/search/') > -1;
        if (isBrowseOrSearchActive) {
            return (
                <Fade in={visible} appear>
                    <DropdownButton id="search-item-type-selector" bsSize="sm" pullRight
                        onSelect={(eventKey, evt) => { toggleSearchAllItems(eventKey); }}
                        title={this.getDropdownTitleText()}>
                        <DropdownItem eventKey="sets" data-key="sets" active={ "sets"=== this.state.searchItemType ? true : false}>
                            Experiment Sets
                        </DropdownItem>
                        <DropdownItem eventKey="all" data-key="all" active={"all" === this.state.searchItemType ? true : false}>
                            All Items (advanced)
                        </DropdownItem>
                        <DropdownItem eventKey="within" data-key="within" active={"within" === this.state.searchItemType ? true : false}>
                            Within Results
                        </DropdownItem>
                    </DropdownButton>
                </Fade>
            );
        }
        else {
            return (
                <Fade in={visible} appear>
                    <DropdownButton id="search-item-type-selector" bsSize="sm" pullRight
                        onSelect={(eventKey, evt) => { toggleSearchAllItems(eventKey); }}
                        title={this.getDropdownTitleText()}>
                        <DropdownItem eventKey="sets" data-key="sets" active={"sets" === this.state.searchItemType ? true : false}>
                            Experiment Sets
                        </DropdownItem>
                        <DropdownItem eventKey="all" data-key="all" active={"all" === this.state.searchItemType ? true : false}>
                            All Items (advanced)
                        </DropdownItem>
                    </DropdownButton>
                </Fade>
            );
        }
    }

    render() {
        const { href, currentAction } = this.props;
        const { searchItemType, typedSearchQuery } = this.state;
        const hrefParts = memoizedUrlParse(href);

        const searchQueryFromHref = (hrefParts && hrefParts.query && hrefParts.query.q) || '';
        const searchTypeFromHref = (hrefParts && hrefParts.query && hrefParts.query.type) || '';
        const showingCurrentQuery = (searchQueryFromHref && searchQueryFromHref === typedSearchQuery) && (
            (searchTypeFromHref === 'Item' && searchItemType === 'all') || (searchTypeFromHref === 'ExperimentSetReplicate' && searchItemType === 'sets') || (searchTypeFromHref === 'ExperimentSetReplicate' && searchItemType === 'within')
        );
        const searchBoxHasInput = SearchBar.hasInput(typedSearchQuery);
        const query = {}; // Don't preserve facets.
        const browseBaseParams = navigate.getBrowseBaseParams();
        const formClasses = [
            'form-inline',
            'navbar-search-form-container',
            searchQueryFromHref && 'has-query',
            searchBoxHasInput && 'has-input'
        ];

        if (isSelectAction(currentAction)) {
            _.extend(query, _.omit(hrefParts.query || {}, 'q')); // Preserve facets (except 'q'), incl type facet.
        } else if (searchItemType === 'all' && !isSelectAction(currentAction)) {
            _.extend(query, { 'type': 'Item' });                // Don't preserve facets (expsettype=replicates, type=expset, etc.)
        } else if (searchItemType === 'sets')  {
            _.extend(query, browseBaseParams);
        }
        else if (searchItemType === 'within') {
            _.extend(query, _.omit(hrefParts.query || {}, 'q'));
        }
        else {
            _.extend(query, browseBaseParams);
        }

        return ( // Form submission gets serialized and AJAXed via onSubmit handlers in App.js
            <form className={_.filter(formClasses).join(' ')} action={this.actionSearchType()} method="GET">
                <SelectItemTypeDropdownBtn currentAction={currentAction} href={href} visible={!!(searchBoxHasInput || searchQueryFromHref)}
                    toggleSearchAllItems={this.toggleSearchAllItems} getDropdownTitleText={this.getDropdownTitleText} currentPageType={this.currentPageType} searchItemType={searchItemType} />
                <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search"
                    name="q" value={typedSearchQuery} onChange={this.onSearchInputChange} key="search-input" onBlur={this.onSearchInputBlur} />
                {showingCurrentQuery ? <i className="reset-button icon icon-times fas" onClick={this.onResetSearch} /> : null}
                {showingCurrentQuery ? null : (
                    <button type="submit" className="search-icon-button">
                        <i className="icon icon-fw icon-search fas" />
                    </button>
                )}
                {SearchBar.renderHiddenInputsForURIQuery(query)}
            </form>
        );
    }
}

const SelectItemTypeDropdownBtn = React.memo(function SelectItemTypeDropdownBtn(props) {
    const { currentAction, toggleSearchAllItems, visible, getDropdownTitleText, href,searchItemType } = props;
    if (isSelectAction(currentAction) || !visible) return null;
    const isBrowseOrSearchActive =  href && href.indexOf('/browse/') > -1 ||href && href.indexOf('/search/') > -1;
    if (isBrowseOrSearchActive) {
        return (
            <Fade in={visible} appear>
                <div className="search-item-type-wrapper">
                    <DropdownButton id="search-item-type-selector" size="sm" variant="outline-secondary"
                        onSelect={(eventKey, evt) => { toggleSearchAllItems(eventKey); }}
                        title={getDropdownTitleText()}>
                        <DropdownItem eventKey="sets" data-key="sets" active={"sets" === searchItemType ? true : false}>
                            Experiment Sets
                        </DropdownItem>
                        <DropdownItem eventKey="all" data-key="all" active={"all" === searchItemType ? true : false}>
                            All Items (advanced)
                        </DropdownItem>
                        <DropdownItem eventKey="within" data-key="within" active={"within" === searchItemType ? true : false}>
                            Within Results
                        </DropdownItem>
                    </DropdownButton>
                </div>
            </Fade>
        );
    }
    else {
        return (
            <Fade in={visible} appear>
                <div className="search-item-type-wrapper">
                    <DropdownButton id="search-item-type-selector" size="sm" variant="outline-secondary"
                        onSelect={(eventKey, evt) => {toggleSearchAllItems(eventKey); }}
                        title={getDropdownTitleText()}>
                        <DropdownItem eventKey="sets" data-key="sets" active={"sets" === searchItemType ? true : false}>
                            Experiment Sets
                        </DropdownItem>
                        <DropdownItem eventKey="all" data-key="all" active={"all" === searchItemType ? true : false}>
                            All Items (advanced)
                        </DropdownItem>
                    </DropdownButton>
                </div>
            </Fade>
        );
    }

});

