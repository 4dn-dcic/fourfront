'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import DropdownItem from 'react-bootstrap/es/DropdownItem';
import DropdownButton from 'react-bootstrap/es/DropdownButton';
import Fade from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Fade';
import { console, searchFilters, isSelectAction } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util';
import { memoizedUrlParse } from './../../globals';


export class SearchBar extends React.PureComponent{

    static renderHiddenInputsForURIQuery(query){
        return _.flatten(_.map(
            _.pairs(query),
            function(qp){
                if (Array.isArray(qp[1])){
                    return _.map(qp[1], function(queryValue, idx){
                        return <input key={qp[0] + '.' + idx} type="hidden" name={qp[0]} value={queryValue} />;
                    });
                } else {
                    return <input key={qp[0]} type="hidden" name={qp[0]} value={qp[1]} />;
                }
            }
        ));
    }

    static hasInput(typedSearchQuery){
        return (typedSearchQuery && typeof typedSearchQuery === 'string' && typedSearchQuery.length > 0) || false;
    }

    constructor(props){
        super(props);
        this.toggleSearchAllItems   = this.toggleSearchAllItems.bind(this);
        this.onSearchInputChange    = this.onSearchInputChange.bind(this);
        this.onResetSearch          = this.onResetSearch.bind(this);
        this.onSearchInputBlur      = this.onSearchInputBlur.bind(this);
        this.selectItemTypeDropdown = this.selectItemTypeDropdown.bind(this);

        var initialQuery = '';
        if (props.href){
            initialQuery = searchFilters.searchQueryStringFromHref(props.href) || '';
        }
        this.state = {
            'searchAllItems'    : props.href && navigate.isSearchHref(props.href),
            'typedSearchQuery'  : initialQuery
        };
    }

    componentDidUpdate(pastProps){
        const { href } = this.props;
        if (pastProps.href !== href){
            const query = searchFilters.searchQueryStringFromHref(href) || '';
            this.setState(function({ typedSearchQuery }){
                if (query !== typedSearchQuery){
                    return { 'typedSearchQuery' : query };
                }
                return null;
            });
        }
    }

    toggleSearchAllItems(willSearchAllItems = !this.state.searchAllItems){
        this.setState(function({ searchAllItems }){
            if (typeof willSearchAllItems === 'boolean'){
                if (willSearchAllItems === searchAllItems){
                    return null;
                }
                return { 'searchAllItems' : willSearchAllItems };
            } else {
                return { 'searchAllItems' : !searchAllItems };
            }
        });
    }

    onSearchInputChange(e){
        const newValue = e.target.value;
        const state = { 'typedSearchQuery': newValue };
        if (!SearchBar.hasInput(newValue) && !isSelectAction(this.props.currentAction)) {
            state.searchAllItems = false;
        }
        this.setState(state);
    }

    onSearchInputBlur(e){
        const lastQuery = searchFilters.searchQueryStringFromHref(this.props.href);
        if (SearchBar.hasInput(lastQuery) && !SearchBar.hasInput(this.state.typedSearchQuery)) {
            this.setState({ 'typedSearchQuery' : lastQuery });
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
            { 'searchAllItems' : false, 'typedSearchQuery' : '' },
            navigate.bind(navigate, url.format(hrefParts))
        );
    }

    selectItemTypeDropdown(visible = false){
        const { currentAction } = this.props;
        const { searchAllItems } = this.state;
        if (isSelectAction(currentAction)) return null;
        return (
            <Fade in={visible} appear>
                <DropdownButton id="search-item-type-selector" bsSize="sm" pullRight
                    onSelect={(eventKey, evt)=>{ this.toggleSearchAllItems(eventKey === 'all' ? true : false); }}
                    title={searchAllItems ? 'All Items' : 'Experiment Sets'}>
                    <DropdownItem eventKey="sets" data-key="sets" active={!searchAllItems}>
                        Experiment Sets
                    </DropdownItem>
                    <DropdownItem eventKey="all" data-key="all" active={searchAllItems}>
                        All Items (advanced)
                    </DropdownItem>
                </DropdownButton>
            </Fade>
        );
    }

    render() {
        const { href, currentAction } = this.props;
        const { searchAllItems, typedSearchQuery } = this.state;
        const hrefParts = memoizedUrlParse(href);
        const searchQueryFromHref = (hrefParts && hrefParts.query && hrefParts.query.q) || '';
        const searchTypeFromHref = (hrefParts && hrefParts.query && hrefParts.query.type) || '';
        const showingCurrentQuery = (searchQueryFromHref && searchQueryFromHref === typedSearchQuery) && (
            (searchTypeFromHref === 'Item' && searchAllItems) || (searchTypeFromHref === 'ExperimentSetReplicate' && !searchAllItems)
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
        } else if (searchAllItems && !isSelectAction(currentAction)) {
            _.extend(query, { 'type' : 'Item' });                // Don't preserve facets (expsettype=replicates, type=expset, etc.)
        } else {
            _.extend(query, _.omit(hrefParts.query || {}, 'q'), browseBaseParams); // Preserve facets (except 'q') & browse base params.
        }

        return ( // Form submission gets serialized and AJAXed via onSubmit handlers in App.js
            <form className={_.filter(formClasses).join(' ')} action={searchAllItems ? "/search/" : "/browse/" } method="GET">
                <SelectItemTypeDropdownBtn currentAction={currentAction} visible={!!(searchBoxHasInput || searchQueryFromHref)}
                    toggleSearchAllItems={this.toggleSearchAllItems} searchAllItems={searchAllItems} />
                <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search"
                    name="q" value={typedSearchQuery} onChange={this.onSearchInputChange} key="search-input" onBlur={this.onSearchInputBlur} />
                { showingCurrentQuery ? <i className="reset-button icon icon-times fas" onClick={this.onResetSearch}/> : null }
                { showingCurrentQuery ? null : (
                    <button type="submit" className="search-icon-button">
                        <i className="icon icon-fw icon-search fas"/>
                    </button>
                ) }
                { SearchBar.renderHiddenInputsForURIQuery(query) }
            </form>
        );
    }
}

const SelectItemTypeDropdownBtn = React.memo(function SelectItemTypeDropdownBtn(props){
    const { currentAction, searchAllItems, toggleSearchAllItems, visible } = props;
    if (isSelectAction(currentAction) || !visible) return null;
    return (
        <Fade in={visible} appear>
            <div className="search-item-type-wrapper">
                <DropdownButton id="search-item-type-selector" size="sm" variant="outline-secondary"
                    onSelect={(eventKey, evt)=>{ toggleSearchAllItems(eventKey === 'all' ? true : false); }}
                    title={searchAllItems ? 'All Items' : 'Experiment Sets'}>
                    <DropdownItem eventKey="sets" data-key="sets" active={!searchAllItems}>
                        Experiment Sets
                    </DropdownItem>
                    <DropdownItem eventKey="all" data-key="all" active={searchAllItems}>
                        All Items (advanced)
                    </DropdownItem>
                </DropdownButton>
            </div>
        </Fade>
    );
});

