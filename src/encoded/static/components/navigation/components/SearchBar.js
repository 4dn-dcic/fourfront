'use strict';

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import memoize from 'memoize-one';
import _ from 'underscore';

import { console, searchFilters, isSelectAction, memoizedUrlParse, logger } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util';


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

    static buildURIQuery(hrefParts = {}){
        const query = {};
        // Preserve filters, incl type facet.
        _.extend(query,
            _.omit(hrefParts.query || {}, 'q')  // Remove 'q' as is provided via the <input name="q" .../> element.
        );
        return query;
    }

    constructor(props) {
        super(props);
        this.onToggleVisibility     = this.onToggleVisibility.bind(this);
        this.onSearchInputChange    = this.onSearchInputChange.bind(this);
        this.onResetSearch          = this.onResetSearch.bind(this);
        this.onSearchInputBlur      = this.onSearchInputBlur.bind(this);

        let initialQuery = '';
        if (props.href){
            initialQuery = searchFilters.searchQueryStringFromHref(props.href) || '';
        }

        this.memoized = {
            buildURIQuery: memoize(SearchBar.buildURIQuery)
        };

        this.state = {
            'typedSearchQuery'  : initialQuery,
            'isVisible'         : isSelectAction(props.currentAction) || SearchBar.hasInput(initialQuery) || false
        };

        this.inputElemRef = React.createRef();
    }

    componentDidUpdate(pastProps) {
        const { href, currentAction } = this.props;
        const { href: pastHref } = pastProps;

        if (pastHref !== href) {
            this.setState(({ isVisible, searchItemType })=>{
                const typedSearchQuery = searchFilters.searchQueryStringFromHref(href) || '';
                return {
                    // We don't want to hide if was already open.
                    isVisible : isSelectAction(currentAction) || isVisible || SearchBar.hasInput(typedSearchQuery) || false,
                    typedSearchQuery
                };
            });
        }
    }

    onToggleVisibility(evt){
        const { currentAction } = this.props;
        this.setState(function({ isVisible, typedSearchQuery }){
            return { isVisible: isSelectAction(currentAction) || !isVisible };
        }, ()=> {
            // Guaranteed to be up to date in callback.
            const { isVisible } = this.state;
            if (isVisible && this.inputElemRef.current) {
                this.inputElemRef.current.focus();
            }
        });
    }

    onSearchInputChange(e){
        const newValue = e.target.value;
        this.setState(({ searchItemType })=>{
            const state = { 'typedSearchQuery': newValue };
            return state;
        });
    }

    onSearchInputBlur(e){
        const { href, currentAction } = this.props;
        const lastQuery = searchFilters.searchQueryStringFromHref(href);

        setTimeout(() => {
            this.setState(({ typedSearchQuery: currQueryStr }) => {
                let typedSearchQuery = currQueryStr; // No change - default
                if (SearchBar.hasInput(lastQuery) && !SearchBar.hasInput(currQueryStr)) {
                    // Replace new value entered with current search query in URL if new value is empty string
                    typedSearchQuery = lastQuery;
                }
                // Prevent closing onBlur if on selection view, or if have input.
                const isVisible = isSelectAction(currentAction) || SearchBar.hasInput(typedSearchQuery) || false;
                return { typedSearchQuery, isVisible };
            });
        }, 200);
    }

    onResetSearch(e){
        const { href, currentAction } = this.props;
        const hrefParts = _.clone(memoizedUrlParse(href));
        hrefParts.query = _.clone(hrefParts.query || {});
        if (typeof hrefParts.search === 'string'){
            delete hrefParts.query.q;
            delete hrefParts.search;
        }
        this.setState(({ searchItemType })=>{
            return {
                'typedSearchQuery' : '',
                'isVisible' : isSelectAction(currentAction) || false
            };
        }, () => { // Doesn't refer to `this` so could be plain/pure function; but navigation is kind of big 'side effect' so... eh
            navigate(url.format(hrefParts));
        });
    }

    render() {
        const { href } = this.props;
        const { typedSearchQuery, isVisible } = this.state;
        const hrefParts = memoizedUrlParse(href);

        const searchQueryFromHref = (hrefParts && hrefParts.query && hrefParts.query.q) || '';
        const showingCurrentQuery = (searchQueryFromHref && searchQueryFromHref === typedSearchQuery);
        const searchBoxHasInput = SearchBar.hasInput(typedSearchQuery);
        const query = this.memoized.buildURIQuery(hrefParts);
        const formClasses = [
            "form-inline",
            "navbar-search-form-container",
            searchQueryFromHref && "has-query",
            searchBoxHasInput && "has-input",
            isVisible && "form-is-visible"
        ];

        return ( // Form submission gets serialized and AJAXed via onSubmit handlers in App.js
            <form className={_.filter(formClasses).join(' ')} action={''} method="GET">
                <div className="form-inputs-container">
                    <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search" ref={this.inputElemRef}
                        name="q" value={typedSearchQuery} onChange={this.onSearchInputChange} key="search-input" onBlur={this.onSearchInputBlur} />
                    { showingCurrentQuery ? <i className="reset-button icon icon-times fas" onClick={this.onResetSearch} /> : null }
                    { showingCurrentQuery ? null : (
                        <button type="submit" className="search-icon-button">
                            <i className="icon icon-fw icon-search fas"/>
                        </button>
                    ) }
                    { SearchBar.renderHiddenInputsForURIQuery(query) }
                </div>
                <div className="form-visibility-toggle">
                    <button type="button" onClick={this.onToggleVisibility}>
                        <i className="icon icon-fw icon-search fas"/>
                    </button>
                </div>
            </form>
        );
    }
}