'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { MenuItem, Checkbox, DropdownButton, Fade, Collapse } from 'react-bootstrap';
import { console, navigate, Filters } from './../../util';


export class SearchBar extends React.Component{

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

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.toggleSearchAllItems = this.toggleSearchAllItems.bind(this);
        this.onSearchInputChange = this.onSearchInputChange.bind(this);
        this.onResetSearch = this.onResetSearch.bind(this);
        this.onSearchInputBlur = this.onSearchInputBlur.bind(this);
        this.selectItemTypeDropdown = this.selectItemTypeDropdown.bind(this);
        var initialQuery = '';
        if (props.href){
            initialQuery = Filters.searchQueryStringFromHref(props.href) || '';
        }
        this.state = {
            'searchAllItems' : props.href && navigate.isSearchHref(props.href),
            'typedSearchQuery' : initialQuery
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.href !== this.props.href){
            var query = Filters.searchQueryStringFromHref(nextProps.href) || '';
            if (query !== this.state.typedSearchQuery){
                this.setState({ 'typedSearchQuery' : query });
            }
        }
    }

    hasInput(typedSearchQuery = this.state.typedSearchQuery){
        return (typedSearchQuery && typeof typedSearchQuery === 'string' && typedSearchQuery.length > 0) || false;
    }

    toggleSearchAllItems(willSearchAllItems = !this.state.searchAllItems){
        this.setState({ 'searchAllItems' : willSearchAllItems }, ()=>{
            this.refs && this.refs.form && this.refs.form.dispatchEvent(new Event('submit', { bubbles : true }) );
        });
    }

    onSearchInputChange(e){
        var newValue = e.target.value;
        var state = { 'typedSearchQuery' : newValue };
        if (!this.hasInput(newValue) && this.props.currentAction !== 'selection') {
            state.searchAllItems = false;
        }
        this.setState(state);
    }

    onSearchInputBlur(e){
        var lastQuery = Filters.searchQueryStringFromHref(this.props.href);
        if (this.hasInput(lastQuery) && !this.hasInput(this.state.typedSearchQuery)) {
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

    selectItemTypeDropdown(inProp = false){
        if (this.props.currentAction === 'selection') return null;
        return (
            <Fade in={inProp} appear>
                <DropdownButton
                    id="search-item-type-selector"
                    bsSize="sm"
                    pullRight
                    onSelect={(eventKey, evt)=>{
                        this.toggleSearchAllItems(eventKey === 'all' ? true : false);
                    }}
                    title={this.state.searchAllItems ? 'All Items' : 'Experiment Sets'}
                >
                    <MenuItem eventKey='sets' data-key="sets" active={!this.state.searchAllItems}>
                        Experiment Sets
                    </MenuItem>
                    <MenuItem eventKey='all' data-key="all" active={this.state.searchAllItems}>
                        All Items (advanced)
                    </MenuItem>
                </DropdownButton>
            </Fade>
        );
    }

    render() {
        var { searchAllItems, typedSearchQuery } = this.state,
            hrefParts           = url.parse(this.props.href, true),
            searchQueryFromHref = (hrefParts && hrefParts.query && hrefParts.query.q) || '',
            resetIconButton     = searchQueryFromHref ? <i className="reset-button icon icon-close" onClick={this.onResetSearch}/> : null,
            searchBoxHasInput   = this.hasInput(),
            query               = {}, // Don't preserve facets.
            browseBaseParams    = navigate.getBrowseBaseParams();

        if (this.props.currentAction === 'selection'){
            _.extend(query, _.omit(hrefParts.query || {}, 'q')); // Preserve facets (except 'q'), incl type facet.
        } else if (searchAllItems && this.props.currentAction !== 'selection') {
            _.extend(query, { 'type' : 'Item' });                // Don't preserve facets (expsettype=replicates, type=expset, etc.)
        } else {
            _.extend(query, _.omit(hrefParts.query || {}, 'q'), browseBaseParams); // Preserve facets (except 'q') & browse base params.
        }

        return (
            <form className={"navbar-search-form-container navbar-form navbar-right" + (searchQueryFromHref ? ' has-query' : '') + (this.hasInput() ? ' has-input' : '')}
                action={searchAllItems ? "/search/" : "/browse/" } method="GET" ref="form">
                { this.selectItemTypeDropdown(!!(searchBoxHasInput || searchQueryFromHref)) }
                <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search"
                    ref="q" name="q" value={typedSearchQuery} onChange={this.onSearchInputChange} key="search-input" onBlur={this.onSearchInputBlur} />
                { resetIconButton }
                { SearchBar.renderHiddenInputsForURIQuery(query) }
                <button type="submit" className="search-icon-button">
                    <i className="icon icon-fw icon-search"/>
                </button>
            </form>
        );
    }
}
