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
        this.onToggleVisibility     = this.onToggleVisibility.bind(this);
        this.toggleSearchAllItems   = this.toggleSearchAllItems.bind(this);
        this.onSearchInputChange    = this.onSearchInputChange.bind(this);
        this.onResetSearch          = this.onResetSearch.bind(this);
        this.onSearchInputBlur      = this.onSearchInputBlur.bind(this);
        this.selectItemTypeDropdown = this.selectItemTypeDropdown.bind(this);

        let initialQuery = '';
        if (props.href){
            initialQuery = searchFilters.searchQueryStringFromHref(props.href) || '';
        }

        this.state = {
            'searchAllItems'    : props.href && navigate.isSearchHref(props.href),
            'typedSearchQuery'  : initialQuery,
            'isVisible'         : isSelectAction(props.currentAction) || SearchBar.hasInput(initialQuery) || false
        };

        this.inputElemRef = React.createRef();
    }

    componentDidUpdate(pastProps){
        const { href, currentAction } = this.props;
        const { href: pastHref } = pastProps;

        if (pastHref !== href){
            // Since is PureComponent, if state values are updated to be same value, will not update/rerender.
            this.setState(function(currState){
                const typedSearchQuery = searchFilters.searchQueryStringFromHref(href) || '';
                return {
                    // We don't want to hide if was already open.
                    isVisible : isSelectAction(currentAction) || currState.isVisible || SearchBar.hasInput(typedSearchQuery) || false,
                    typedSearchQuery
                };
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
        const state = { 'typedSearchQuery': newValue };
        if (!SearchBar.hasInput(newValue) && !isSelectAction(this.props.currentAction)) {
            state.searchAllItems = false;
        }
        this.setState(state);
    }

    onSearchInputBlur(e){
        const { href, currentAction } = this.props;
        const lastQuery = searchFilters.searchQueryStringFromHref(href);

        this.setState(function({ typedSearchQuery: currQueryStr }){
            let typedSearchQuery = currQueryStr; // No change - default
            if (SearchBar.hasInput(lastQuery) && !SearchBar.hasInput(currQueryStr)) {
                // Replace new value entered with current search query in URL if new value is empty string
                typedSearchQuery = lastQuery;
            }
            // Prevent closing onBlur if on selection view, or if have input.
            const isVisible = isSelectAction(currentAction) || SearchBar.hasInput(typedSearchQuery) || false;
            return { typedSearchQuery, isVisible };
        });
    }

    onResetSearch(e){
        const { href, currentAction } = this.props;
        const hrefParts = _.clone(memoizedUrlParse(href));
        hrefParts.query = _.clone(hrefParts.query || {});
        if (typeof hrefParts.search === 'string'){
            delete hrefParts.query['q'];
            delete hrefParts.search;
        }
        this.setState({
            'searchAllItems' : false,
            'typedSearchQuery' : '',
            'isVisible' : isSelectAction(currentAction) || false
        }, () => { // Doesn't refer to `this` so could be plain/pure function; but navigation is kind of big 'side effect' so... eh
            navigate(url.format(hrefParts));
        });
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
        const { searchAllItems, typedSearchQuery, isVisible } = this.state;
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
            "form-inline",
            "navbar-search-form-container",
            searchQueryFromHref && "has-query",
            searchBoxHasInput && "has-input",
            isVisible && "form-is-visible"
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
                <div className="form-inputs-container">
                    <SelectItemTypeDropdownBtn {...{ currentAction, searchAllItems }} disabled={!(searchBoxHasInput || searchQueryFromHref)}
                        toggleSearchAllItems={this.toggleSearchAllItems} />
                    <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search" ref={this.inputElemRef}
                        name="q" value={typedSearchQuery} onChange={this.onSearchInputChange} key="search-input" onBlur={this.onSearchInputBlur} />
                    { showingCurrentQuery ? <i className="reset-button icon icon-times fas" onClick={this.onResetSearch}/> : null }
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

const SelectItemTypeDropdownBtn = React.memo(function SelectItemTypeDropdownBtn(props){
    const { currentAction, searchAllItems, toggleSearchAllItems, disabled = true } = props;
    if (isSelectAction(currentAction)) return null;
    return (
        <div className="search-item-type-wrapper">
            <DropdownButton id="search-item-type-selector" size="sm" variant="outline-secondary" disabled={disabled}
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
    );
});

