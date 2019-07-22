'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { DropdownItem, DropdownButton } from 'react-bootstrap';
//import { DropdownItem, DropdownButton } from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/components/DropdownButton';
import { Fade } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/Fade';
import { console, searchFilters } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { navigate } from './../../util';


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
        //this.toggleSearchAllItems   = this.toggleSearchAllItems.bind(this);
        this.onSearchInputChange    = this.onSearchInputChange.bind(this);
        this.onResetSearch          = this.onResetSearch.bind(this);
        this.onSearchInputBlur      = this.onSearchInputBlur.bind(this);
        //this.selectItemTypeDropdown = this.selectItemTypeDropdown.bind(this);

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

    getCurrentResultsSearchQuery(hrefParts){
        if (!hrefParts){
            hrefParts = url.parse(this.props.href, true);
        }
        return (hrefParts && hrefParts.query && hrefParts.query.q) || null;
    }

    /*
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
    */

    onSearchInputChange(e){
        const newValue = e.target.value;
        const state = { 'typedSearchQuery' : newValue };
        if (!SearchBar.hasInput(newValue) && this.props.currentAction !== 'selection') {
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
        var hrefParts = url.parse(this.props.href, true);
        if (typeof hrefParts.search === 'string'){
            delete hrefParts.query['q'];
            delete hrefParts.search;
        }
        this.setState(
            { 'searchAllItems' : false, 'typedSearchQuery' : '' },
            navigate.bind(navigate, url.format(hrefParts))
        );
    }

    /*
    selectItemTypeDropdown(visible = false){
        const { currentAction } = this.props;
        const { searchAllItems } = this.state;
        if (currentAction === 'selection') return null;
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
    */

    render() {
        const { href, currentAction } = this.props;
        const { typedSearchQuery } = this.state;
        const hrefParts           = url.parse(href, true);
        const searchQueryFromHref = (hrefParts && hrefParts.query && hrefParts.query.q) || '';
        const showingCurrentQuery = (searchQueryFromHref && searchQueryFromHref === typedSearchQuery);
        const searchBoxHasInput   = SearchBar.hasInput(typedSearchQuery);
        const query               = {}; // Don't preserve facets.
        const formClasses = [
            'form-inline',
            'navbar-search-form-container',
            searchQueryFromHref && 'has-query',
            searchBoxHasInput && 'has-input'
        ];

        if (currentAction === 'selection'){
            _.extend(query, _.omit(hrefParts.query || {}, 'q')); // Preserve facets (except 'q'), incl type facet.
        } else {
            _.extend(query, { 'type' : 'Item' });                // Don't preserve facets (expsettype=replicates, type=expset, etc.)
        }

        return ( // Form submission gets serialized and AJAXed via onSubmit handlers in App.js
            <form className={_.filter(formClasses).join(' ')} action="/search/" method="GET">
                <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search"
                    name="q" value={typedSearchQuery} onChange={this.onSearchInputChange} key="search-input" onBlur={this.onSearchInputBlur} />
                { showingCurrentQuery ? <i className="reset-button icon icon-close" onClick={this.onResetSearch}/> : null }
                { showingCurrentQuery ? null : (
                    <button type="submit" className="search-icon-button">
                        <i className="icon icon-fw icon-search fas"/>
                    </button>
                ) }
            </form>
        );
    }
}

