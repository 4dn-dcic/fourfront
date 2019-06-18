'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'querystring';
import memoize from 'memoize-one';
import _ from 'underscore';
import { isServerSide, navigate, object } from './../../util';


export class SortController extends React.PureComponent {

    static propTypes = {
        'href'          : PropTypes.string.isRequired,
        'context'       : PropTypes.object.isRequired,
        'navigate'      : PropTypes.func,
        'children'      : PropTypes.node.isRequired
    };

    static defaultProps = {
        'navigate' : function(href, options, callback){
            console.info('Called SortController.props.navigate with:', href,options, callback);
            if (typeof navigate === 'function') return navigate.apply(navigate, arguments);
        }
    };

    /**
     * Grab limit & page (via '(from / limit) + 1 ) from URL, if available.
     *
     * @static
     * @param {string} href - Current page href, with query.
     * @returns {Object} { 'page' : int, 'limit' : int }
     *
     * @memberof SortController
     */
    static getPageAndLimitFromURL = memoize(function(href){
        const { query } = url.parse(href, true);
        let limit = parseInt(query.limit || 25);
        let from  = parseInt(query.from  || 0);
        if (isNaN(limit)) limit = 25;
        if (isNaN(from)) from = 0;
        return {
            'page' : (from / limit) + 1,
            'limit' : limit
        };
    });

    static getSortColumnAndReverseFromContext = memoize(function(context){
        const defaults = {
            'sortColumn'    : null,
            'sortReverse'   : false
        };
        if (!context || !context.sort) return defaults;
        let sortKey = _.keys(context.sort);
        if (sortKey.length > 0){
            // Use first if multiple.
            // eslint-disable-next-line prefer-destructuring
            sortKey = sortKey[0];
        } else {
            return defaults;
        }
        const reverse = context.sort[sortKey].order === 'desc';
        return {
            'sortColumn'    : sortKey,
            'sortReverse'   : reverse
        };
    });

    constructor(props){
        super(props);
        this.sortBy = this.sortBy.bind(this);
        this.state = { 'changingPage' : false }; // 'changingPage' = historical name, analogous of 'loading'
    }

    sortBy(key, reverse) {
        const { navigate : propNavigate, href } = this.props;
        if (typeof propNavigate !== 'function') throw new Error("No navigate function.");
        if (typeof href !== 'string') throw new Error("Browse doesn't have props.href.");

        const { query, ...urlParts } = url.parse(href, true);
        if (key){
            query.sort = (reverse ? '-' : '' ) + key;
        } else {
            delete query.sort;
        }
        urlParts.search = '?' + queryString.stringify(query);
        const newHref = url.format(urlParts);

        this.setState({ 'changingPage' : true }, ()=>{
            propNavigate(newHref, { 'replace' : true }, ()=>{
                this.setState({
                    //'sortColumn' : key,
                    //'sortReverse' : reverse,
                    'changingPage' : false,
                    //'page' : 1
                });
            });
        });

    }

    render(){
        const { children, context, href } = this.props;
        const { sortColumn, sortReverse } = SortController.getSortColumnAndReverseFromContext(context);
        // The below `page` and `limit` aren't used any longer (I think).
        const { page, limit } = SortController.getPageAndLimitFromURL(href);
        const propsToPass = _.extend(
            _.omit(this.props, 'children'),
            { 'sortBy' : this.sortBy, },
            { sortColumn, sortReverse, page, limit }
        );
        return (
            <div>
                {
                    React.Children.map(children, function(c){
                        return React.cloneElement(c, propsToPass);
                    })
                }
            </div>
        );
    }


}