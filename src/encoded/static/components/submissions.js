'use strict';
var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide, DateUtility } = require('./util');
var { DropdownButton, Button, MenuItem, Panel, Table} = require('react-bootstrap');

/*
*/
var Submissions = module.exports = React.createClass({

    contextTypes: {
        fetch: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
    },

    getInitialState: function(){
        return({'subscriptions': null});
    },

    componentDidMount: function(){
        // make async call to get user subscriptions
        this.getUserInfo();
    },

    getUserInfo: function(){
        this.context.fetch('/me?frame=embedded', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!this.context.contentTypeIsJSON(response) || !response['subscriptions']) throw response;
            this.setState({'subscriptions': response['subscriptions']});
        },
        error => {
            this.setState({'subscriptions': null});
        });
    },

    generateSubscription: function(scrip){
        return(
            <SubscriptionEntry url={scrip.url} title={scrip.title} />
        );
    },

    render: function(){
        var subscrip_list;
        if(this.state.subscriptions){
            subscrip_list = this.state.subscriptions.map((scrip) => this.generateSubscription(scrip));
        }
        return(
            <div>
                <h1 className="page-title">Submission tracking</h1>
                <div className="flexible-description-box item-page-heading">
                    <p className="text-larger">
                        View your 4DN submissions and track those you've subscribed to.
                    </p>
                </div>
                {subscrip_list}
            </div>
        );
    }
});

var SubscriptionEntry = React.createClass({

    contextTypes: {
        fetch: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
    },

    getInitialState: function(){
        var is_open = false;
        // user submissions default to open
        if(this.props.title == 'My submissions'){
            is_open = true;
        }
        return({
            'data': null,
            'types': null,
            'selected_type': null,
            'open': is_open
        });
    },

    componentDidMount: function(){
        // make async call to get first subscription data
        // only call this if open to improve performance
        if(this.state.open){
            this.loadSubscriptionData('/search/?' + this.props.url);
        }
    },

    toggleOpen: function(e){
        e.preventDefault();
        // load data if it hasn't been already
        if(!this.state.data){
            this.loadSubscriptionData('/search/?' + this.props.url);
        }
        this.setState({'open':!this.state.open});
    },

    loadSubscriptionData: function(url){
        // search sorts by date_created as default. Thus, @graph results will be sorted
        this.context.fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!this.context.contentTypeIsJSON(response) || !response['@graph'] || !response['facets']) throw response;
            var types;
            var selected_type;
            // no specified item type, so set the types state
            if(url.indexOf("?type=") == -1 && url.indexOf("&type=") == -1){
                types = this.findTypesFromFacets(response['facets']);
                selected_type = 'Item';
            }
            this.setState({'data': response['@graph'], 'types': types, 'selected_type': selected_type});
        },
        error => {
            this.setState({'data': null, 'types': null, 'selected_type': null});
        });
    },

    // find all item types represented in this result
    findTypesFromFacets: function(facets){
        var types = [];
        for(var i=0; i<facets.length; i++){
            if(facets[i]['field'] == 'type'){
                for(var j=0; j<facets[i]['terms'].length; j++){
                    if(facets[i]['terms'][j]['doc_count'] > 0){
                        types.push(facets[i]['terms'][j]['key']);
                    }
                }
                break;
            }
        }
        return types;
    },

    displayToggle: function(){
        if(this.state.open){
            if(!this.state.data){
                // still loading
                return(
                    <i className="icon icon-spin icon-circle-o-notch" style={{'paddingLeft': '5px','opacity': '0.5' }}></i>
                );
            }else{
                return(
                    <a className='array-contract' style={{'paddingLeft': '5px'}} href="#" onClick={this.toggleOpen} title="Close">
                        <i className="icon icon-toggle-up icon-fw"></i>
                    </a>
                );
            }
        }else{
            return(
                <a className='array-expand' style={{'paddingLeft': '5px'}} href="#" onClick={this.toggleOpen} title="Expand">
                    <i className="icon icon-toggle-down icon-fw"></i>
                </a>
            );
        }
    },

    generateEntry: function(entry){
        if(!entry['@type'] || !entry.date_created || !entry.status || !entry.display_title || !entry.link_id){
            return;
        }else if(this.state.selected_type && !_.contains(entry['@type'], this.state.selected_type)){
            return;
        }
        var format_id = entry.link_id.replace(/~/g, "/");
        return(
            <tr key={entry.date_created}>
                <td>
                    <a href={format_id}>{entry.display_title}</a>
                </td>
                <td>{entry['@type'][0]}</td>
                <td>{entry.status}</td>
                <td>
                    <DateUtility.LocalizedTime timestamp={entry.date_created} formatType='date-time-md' dateTimeSeparator=" at " />
                </td>
            </tr>
        );
    },

    generateTypeDropdown: function(){
        if(!this.state.types || !this.state.open){
            return null;
        }
        return(
            <div style={{'float':'right','marginBottom':'10px','display':'inline-block','marginTop':'25px'}}>
                <DropdownButton id="dropdown-size-extra-small" title={this.filterEnumTitle(this.state.selected_type)} >
                    {this.state.types.map((type) => this.buildEnumEntry(type))}
                </DropdownButton>
            </div>
        );
    },

    buildEnumEntry: function(val){
        return(
            <MenuItem key={val} title={this.filterEnumTitle(val) || ''} eventKey={val} onSelect={this.submitEnumVal}>
                {this.filterEnumTitle(val) || ''}
            </MenuItem>
        );
    },

    submitEnumVal: function(eventKey){
        this.setState({'selected_type': eventKey});
    },

    // very simple. If title == Item, return 'All'
    filterEnumTitle: function(title){
        if(title == 'Item'){
            return 'All'
        }else{
            return title;
        }
    },

    render: function(){
        var submissions;
        if(this.state.data){
            submissions = this.state.data.map((entry) => this.generateEntry(entry))
        }
        return(
            <div>
                <div>
                    <h3 className='submission-subtitle'>{this.props.title}</h3>
                    <h3 className='submission-subtitle'>{this.displayToggle()}</h3>
                    {this.generateTypeDropdown()}
                </div>
                {this.state.open ?
                    <div className="sub-panel panel-body-with-header" style={{'maxHeight':'300px', 'overflowY':'auto'}}>
                        <Table striped fill>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Date submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions}
                            </tbody>
                        </Table>
                    </div>
                : null}
            </div>
        );
    }

});

globals.content_views.register(Submissions, 'Submissions');
