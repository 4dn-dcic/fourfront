'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'querystring';
import _ from 'underscore';
import { isServerSide, Filters, navigate, object } from './../../util';


export class PageLimitSortController extends React.Component {

    static propTypes = {
        'href'            : PropTypes.string.isRequired,
        'context'         : PropTypes.object.isRequired,
        'navigate'        : PropTypes.func
    }

    static defaultProps = {
        'navigate' : function(href, options, callback){
            console.info('Called PageLimitSortController.props.navigate with:', href,options, callback);
            if (typeof navigate === 'function') return navigate.apply(navigate, arguments);
        }
    }

    /**
     * Grab limit & page (via '(from / limit) + 1 ) from URL, if available.
     * 
     * @static
     * @param {string} href - Current page href, with query.
     * @returns {Object} { 'page' : int, 'limit' : int }
     * 
     * @memberof PageLimitSortController
     */
    static getPageAndLimitFromURL(href){
        var urlParts = url.parse(href, true);
        var limit = parseInt(urlParts.query.limit || Filters.getLimit() || 25);
        var from  = parseInt(urlParts.query.from  || 0);
        if (isNaN(limit)) limit = 25;
        if (isNaN(from)) from = 0;
        
        return {
            'page' : (from / limit) + 1,
            'limit' : limit
        };
    }

    static getSortColumnAndReverseFromURL(href){
        var urlParts = url.parse(href, true);
        var sortParam = urlParts.query.sort;
        var reverse = false;
        if (typeof sortParam !== 'string') return {
            sortColumn : null,
            sortReverse : reverse
        };
        if (sortParam.charAt(0) === '-'){
            reverse = true;
            sortParam = sortParam.slice(1);
        }
        
        return {
            'sortColumn' : sortParam,
            'sortReverse' : reverse
        };
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.sortBy = this.sortBy.bind(this);
        this.changePage = _.throttle(this.changePage.bind(this), 250);
        this.changeLimit = _.throttle(this.changeLimit.bind(this), 250);

        // State

        // Have Filters use our state.limit, until another component overrides.
        Filters.getLimit = function(){
            return (this && this.state && this.state.limit) || 25;
        }.bind(this);

        this.state = _.extend(
            { changingPage : false },
            PageLimitSortController.getSortColumnAndReverseFromURL(props.href),
            PageLimitSortController.getPageAndLimitFromURL(props.href)
        );
    }

    componentWillReceiveProps(newProps){
        var newState = {};

        // Update page re: href.
        if (this.props.href !== newProps.href){
            var pageAndLimit = PageLimitSortController.getPageAndLimitFromURL(newProps.href);
            if (pageAndLimit.page !== this.state.page) newState.page = pageAndLimit.page;
            if (pageAndLimit.limit !== this.state.limit) newState.limit = pageAndLimit.limit;

            var { sortColumn, sortReverse } = PageLimitSortController.getSortColumnAndReverseFromURL(newProps.href);
            if (sortColumn !== this.state.sortColumn) newState.sortColumn = sortColumn;
            if (sortReverse !== this.state.sortReverse) newState.sortReverse = sortReverse;
        }

        if (_.keys(newState).length > 0){
            this.setState(newState);
        }
    }

    sortBy(key, reverse) {

        if (typeof this.props.navigate !== 'function') throw new Error("No navigate function.");
        if (typeof this.props.href !== 'string') throw new Error("Browse doesn't have props.href.");

        var urlParts = url.parse(this.props.href, true);
        //var previousLimit = parseInt(urlParts.query.limit || this.state.limit || 25);
        //urlParts.query.limit = previousLimit + '';
        urlParts.query.from = '0';
        if (key){
            urlParts.query.sort = (reverse ? '-' : '' ) + key;
        } else {
            urlParts.query.sort = null;
        }
        urlParts.search = '?' + queryString.stringify(urlParts.query);
        var newHref = url.format(urlParts);

        this.setState({ 'changingPage' : true }, ()=>{
            this.props.navigate(newHref, { 'replace' : true }, ()=>{
                this.setState({ 
                    'sortColumn' : key,
                    'sortReverse' : reverse,
                    'changingPage' : false,
                    'page' : 1
                });
            });
        });

    }

    changePage(page = null){
        
        if (typeof this.props.navigate !== 'function') throw new Error("No navigate function");
        if (typeof this.props.href !== 'string') throw new Error("Browse doesn't have props.href.");

        page = Math.min( // Correct page, so don't go past # available or under 1.
            Math.max(page, 1),
            Math.ceil(this.props.context.total / this.state.limit)
        );

        var urlParts = url.parse(this.props.href, true);
        var previousFrom = parseInt(urlParts.query.from || 0);

        if ( // Check page from URL and state to see if same and if so, cancel navigation.
            page === this.state.page && 
            page === Math.ceil(previousFrom / this.state.limit) + 1
        ){
            console.warn("Already on page " + page);
            return;
        }

        if (typeof urlParts.query.limit === 'number'){
            urlParts.query.from = (urlParts.query.limit * (page - 1)) + '';
        } else {
            urlParts.query.from = (Filters.getLimit() * (page - 1)) + '';
        }
        urlParts.search = '?' + queryString.stringify(urlParts.query);
        this.setState({ 'changingPage' : true }, ()=>{
            this.props.navigate(url.format(urlParts), { 'replace' : true }, ()=>{
                this.setState({ 
                    'changingPage' : false,
                    'page' : page
                });
            });
        });
    }

    changeLimit(limit = 25){
        
        if (typeof this.props.navigate !== 'function') throw new Error("No navigate function.");
        if (typeof this.props.href !== 'string') throw new Error("Browse doesn't have props.href.");

        var urlParts = url.parse(this.props.href, true);
        var previousLimit = parseInt(urlParts.query.limit || 25);
        var previousFrom = parseInt(urlParts.query.from || 0);
        var previousPage = parseInt(Math.ceil(urlParts.query.from / previousLimit)) + 1;

        if ( // Check page from URL and state to see if same and if so, cancel navigation.
            limit === this.state.limit &&
            limit === previousLimit
        ){
            console.warn("Already have limit " + limit);
            return;
        }

        urlParts.query.limit = limit + '';
        urlParts.query.from = parseInt(Math.max(Math.floor(previousFrom / limit), 0) * limit);
        urlParts.search = '?' + queryString.stringify(urlParts.query);
        var newHref = url.format(urlParts);

        this.setState({ 'changingPage' : true }, ()=>{
            this.props.navigate(newHref, { 'replace' : true }, ()=>{
                this.setState({ 
                    'changingPage' : false,
                    'limit' : limit,
                });
            });
        });
    }

    render(){
        return(
            <div>
                { 
                    React.Children.map(this.props.children, (c)=>{
                        return React.cloneElement(c, _.extend({
                            'maxPage' : Math.ceil(this.props.context.total / this.state.limit),
                            'sortBy' : this.sortBy,
                            'changePage' : this.changePage,
                            'changeLimit' : this.changeLimit
                        }, this.state));
                    })
                }
            </div>
        );
    }


}