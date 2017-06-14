'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console } from './../../util';
var store = require('../../../store');
var globals = require('./../../globals');


/**
 * Generates an inline <span> React element which fetches a count from the back-end.
 * 
 * @deprecated
 * @member
 * @namespace
 * @type {Component}
 * @example
 * <caption>Previous usage in View module:static-pages/home</caption>
 * render : function(){
 * ...
 * var experiment4DNBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="4DN" destination="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all" fetchLoc='/search/?type=Experiment&award.project=4DN&format=json'/>;
 * var experimentExtBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="External" destination="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all" fetchLoc='/search/?type=Experiment&award.project=External&format=json'/>;
 * var biosourceBanner = <BannerEntry session={this.props.session} text='cell types' destination='/search/?type=Biosource' fetchLoc='/search/?type=Biosource&format=json'/>;
 * 
 * return (
 *     ...
 *     <div>
 *         <div className="fourDN-banner text-left">
 *             <h1 className="page-title" style={{ fontSize : '3.25rem' }}>4DN Data Portal</h1>
 *             <h4 className="text-300 col-sm-8" style={{ float: 'none', padding : 0 }}>
 *                 The portal currently hosts {experiment4DNBanner} from
 *                 the 4DN network and {experimentExtBanner} from other
 *                 sources over {biosourceBanner}.
 *             </h4>
 *         </div>
 *     </div>
 *     ...
 */
var BannerEntry = module.exports.BannerEntry = createReactClass({

    contextTypes: {
        fetch: PropTypes.func
    },

    getInitialState: function(){
        return({
            count: null
        });
    },

    componentDidMount: function(){
        this._isMounted = true;
        this.updateCount();
    },

    componentWillUnmount: function(){
        this._isMounted = false;
    },

    componentWillReceiveProps: function(nextProps){
        if(nextProps.session !== this.props.session){
            this.updateCount();
        }
    },

    updateCount: function(){
        if(this.context.fetch('/?format=json', {}) !== null){ // for test purposes
            var request = this.context.fetch(this.props.fetchLoc, {
                headers: {'Accept': 'application/json',
                    'Content-Type': 'application/json'}
            });
            request.then(data => {
                if(this._isMounted){
                    if(data.total){
                        this.setState({
                            count: data.total
                        });
                    }else{
                        this.setState({
                            count: null
                        });
                    }
                }
            });
        }else{
            return;
        }

    },

    setFacets: function(e){
        // for 4DN or external filters: if provided, set expSetFilters correctly
        if(this.props.defaultFilter){
            var newObj = {};
            var objSet = new Set();
            objSet.add(this.props.defaultFilter);
            newObj['experiments_in_set.award.project'] = objSet;
            store.dispatch({
                type: {'expSetFilters': newObj}
            });
        }
    },

    render: function() {
        var count = this.state.count ? this.state.count : 0;
        var text = count + " " + this.props.text;
        return (
            <a className="banner-entry" href={this.props.destination} onClick={this.setFacets}>{text}</a>
        );
    }
});