'use strict';

var React = require('react');
var _ = require('underscore');
var { console } = require('./../../util');
var store = require('../../../store');
var globals = require('./../../globals');

var BannerEntry = module.exports = React.createClass({

    statics: {
        //HomePageBanner : React.createClass({

        //})
    },

    contextTypes: {
        fetch: React.PropTypes.func
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