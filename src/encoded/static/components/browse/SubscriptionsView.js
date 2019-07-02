'use strict';

import React from 'react';
import _ from 'underscore';
import { console, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { LocalizedTime } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/LocalizedTime';
import { DropdownButton, DropdownItem } from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/components/DropdownButton';

/** @deprecated - DropDownButton, Button */
/** @todo use HTML elem(s) */
import { ButtonToolbar, ButtonGroup } from 'react-bootstrap';

/**
 * @typedef {Object} Subscription
 * @property {string} url       Search request URI.
 * @property {string} title     Human-readable subscription title.
 *
 * @todo Move to util/typedef.js if will be re-used in other files.
 */
var Subscription;


/** @TODO REFACTOR RE: LINTING & REACT STANDARDS */

/**
 * Container component for the submissions page. Fetches the user info and
 * coordinates individual subscriptions.
 */
export default class SubscriptionsView extends React.PureComponent {

    constructor(props){
        super(props);
        this.getUserInfo = this.getUserInfo.bind(this);
        /**
         * @private
         * @type {Object}
         */
        this.state = {
            'subscriptions': null,
            'initialized': false
        };
    }

    /**
     * Triggers async call to get user subscriptions.
     * @private
     */
    componentDidMount(){
        this.getUserInfo();
    }

    /**
     * Makes async call to `/me` endpoint to get user subscriptions.
     *
     * @private
     * @returns {void}
     */
    getUserInfo() {
        ajax.promise('/me?frame=embedded').then((response) => {
            if (!response.uuid || !response.subscriptions){
                this.setState({
                    'subscriptions': null,
                    'initialized': true
                });
            } else {
                this.setState({
                    'subscriptions': response.subscriptions,
                    'initialized': true
                });
            }
        });
    }

    /**
     * @private
     * @returns {JSX.Element} Div containing list of subscription views.
     */
    render(){
        const { subscriptions, initialized } = this.state;
        let subscrip_list, main_message;

        if (Array.isArray(subscriptions) && subscriptions.length > 0){
            subscrip_list = _.map(subscriptions, function(scrip){
                return <SubscriptionEntry key={scrip.url} url={scrip.url} title={scrip.title} />;
            });
            main_message = "View your 4DN submissions and track those you're associated with.";
        } else if (initialized){
            main_message = "No submissions to track; you are not a submitter nor associated with any labs.";
        } else {
            main_message = <i className="icon icon-spin icon-circle-o-notch" style={{ 'opacity': '0.5' }}/>;
        }
        return (
            <div id="content" className="container">
                <div className="flexible-description-box item-page-heading mb-25 mt-1">
                    <p className="text-larger">{main_message}</p>
                </div>
                {subscrip_list}
            </div>
        );
    }
}

/**
 * Main submission/subscription component. One component per subscription.
 * Hold data from the search result from the subscription and organizes
 * it into a paginated table. Also allows filtering on item type.
 */
class SubscriptionEntry extends React.Component{

    constructor(props){
        super(props);
        this.changePage = _.throttle(this.changePage, 250);
        _.bindAll(this, 'toggleOpen', 'loadSubscriptionData', 'findTypesFromFacets', 'findTypesFromFacets',
            'displayToggle', 'generateEntry', 'generateButtonToolbar', 'buildEnumEntry', 'submitEnumVal',
            'filterEnumTitle'
        );
        const open = props.title == 'My submissions' ? true : false;
        this.state = {
            'data': null,
            'types': null,
            'selected_type': 'Item',
            'open': open,
            'page': 1,
            'changing_page': false,
            'num_pages': null
        };
    }

    componentDidMount(){
        // make async call to get first subscription data
        // only call this if open to improve performance
        if(this.state.open){
            this.loadSubscriptionData(this.props.url, this.state.page, this.state.selected_type);
        }
    }

    toggleOpen(e){
        e.preventDefault();
        this.setState(function({ open }){
            return { 'open': !open };
        }, ()=>{
            // load data if it hasn't been already
            const { url } = this.props;
            const { data, page, selected_type } = this.state;
            if (!data){
                this.loadSubscriptionData(url, page, selected_type);
            }
        });
    }

    loadSubscriptionData(url, page, type) {
        // search sorts by date_created as default. Thus, @graph results will be sorted
        // use page number to implement pagination
        var no_type_in_url = url.indexOf("?type=") == -1 && url.indexOf("&type=") == -1;
        var fromInt = (page-1) * 25;
        var pagination = '&limit=25&from=' + fromInt.toString();
        var fetch_url = '/search/' + url + pagination;
        if(no_type_in_url){
            fetch_url = fetch_url + '&type=' + type;
        }

        ajax.promise(fetch_url).then((response) => {
            if (!response['@graph'] || !response['facets']){
                this.setState({
                    'data': null,
                    'types': null,
                    'changing_page':false,
                    'num_pages': null,
                    'page': 1,
                    'type': 'Item'
                });
            } else {
                var types;
                // no specified item type, so set the types state
                // only want to run this once, with type=Item
                if(no_type_in_url && this.state.types === null){
                    this.findTypesFromFacets(response['facets']);
                }
                // use 25 items per page. Change when types change
                var num_pages = Math.ceil(response['total']/25);
                this.setState({
                    'data': response['@graph'],
                    'changing_page': false,
                    'num_pages': num_pages
                });
            }
        });
    }

    // find all item types represented in this result by parsing @graph
    // can't use facets because they ignore pagination
    findTypesFromFacets(facets){
        var types = [];
        for(var i=0; i<facets.length; i++){
            if(facets[i]['field'] == 'type'){
                for(var j=0; j<facets[i]['terms'].length; j++){
                    if(facets[i]['terms'][j]['doc_count'] > 0 && facets[i]['terms'][j]['key'] != 'Item'){
                        types.push(facets[i]['terms'][j]['key']);
                    }
                }
                break;
            }
        }
        types.sort();
        types.unshift('Item'); // add Item to front of the array
        this.setState({ types });
    }

    displayToggle(){ // TODO: Make into functional component
        const { open, data } = this.state;
        if (open && !data) {
            return (
                <i className="icon icon-spin icon-circle-o-notch" style={{ 'marginLeft': '5px','opacity': '0.5' }}/>
            );
        } else {
            return (
                <button type="button" className="btn btn-xs btn-outline-dark icon-container submission-btn" onClick={this.toggleOpen}>
                    <i className={"icon icon-" + (open ? "minus" : "plus")}/>
                </button>
            );
        }
    }

    generateEntry(entry){
        if(!entry['@type'] || !entry.date_created || !entry.status || !entry.display_title || !entry['@id']){
            return;
        }
        var format_id = entry['@id'];
        return(
            <tr key={entry.date_created}>
                <td>
                    <a href={format_id}>{entry.display_title}</a>
                </td>
                <td>
                    {(entry.aliases && entry.aliases.length > 0) ?
                        <div style={{ 'wordWrap':'break-word','overflowWrap':'break-word' }}>
                            {entry.aliases.join(', ')}
                        </div>
                        : ""
                    }
                </td>
                <td>{entry['@type'][0]}</td>
                <td>{entry.status}</td>
                <td>
                    <LocalizedTime timestamp={entry.date_created} formatType="date-time-md" dateTimeSeparator=" at " />
                </td>
            </tr>
        );
    }

    generateButtonToolbar(){
        const { open, selected_type, types, num_pages, page, changing_page } = this.state;
        if (!open){
            return null;
        }
        const prevPageClick = changing_page ? null : (e) => {
            this.changePage(page - 1);
        };
        const nextPageClick = changing_page ? null : (e) => {
            this.changePage(page + 1);
        };
        return(
            <ButtonToolbar className="pull-right" style={{ 'marginTop':'-5px' }}>
                {types ?
                    <DropdownButton id="dropdown-size-extra-small" title={this.filterEnumTitle(selected_type)} >
                        {types.map((type) => this.buildEnumEntry(type))}
                    </DropdownButton>
                    : null}
                <ButtonGroup>
                    <button type="button" disabled={changing_page || !num_pages  || page === 1}
                        className="btn btn-secondary" onClick={prevPageClick}>
                        <i className="icon icon-angle-left icon-fw"/>
                    </button>

                    <button type="button" className="btn btn-secondary" disabled style={{ 'minWidth': 120 }}>
                        { changing_page === true || !num_pages ?
                            <i className="icon icon-spin icon-circle-o-notch" style={{ 'opacity': 0.5 }}/>
                            : 'Page ' + page + ' of ' + num_pages
                        }
                    </button>

                    <button type="button" disabled={changing_page || !num_pages || page === num_pages}
                        className="btn btn-secondary" onClick={nextPageClick}>
                        <i className="icon icon-angle-right icon-fw"/>
                    </button>

                </ButtonGroup>
            </ButtonToolbar>
        );
    }

    buildEnumEntry(val){
        return(
            <DropdownItem key={val} title={this.filterEnumTitle(val) || ''} eventKey={val} onSelect={this.submitEnumVal}>
                {this.filterEnumTitle(val) || ''}
            </DropdownItem>
        );
    }

    submitEnumVal(eventKey){
        // reset page to 1 on a type change
        this.loadSubscriptionData(this.props.url, 1, eventKey);
        this.setState({ 'page':1, 'selected_type': eventKey });
    }

    // very simple. If title == Item, return 'All'
    filterEnumTitle(title){
        if(title == 'Item'){
            return 'All';
        }else{
            return title;
        }
    }

    changePage(page){
        this.setState(function({ page: currPage, num_pages }){
            if (page > num_pages || page < 1){
                return null;
            }
            return { page, 'changing_page' : true };
        }, ()=>{
            const { url } = this.props, { selected_type } = this.state;
            this.loadSubscriptionData(url, page, selected_type);
        });
    }

    render(){
        var submissions;
        if(this.state.data){
            submissions = this.state.data.map((entry) => this.generateEntry(entry));
        }
        return(
            <div className="mb-1">
                <div className="submission-page-heading">
                    <h3 className="submission-subtitle">{this.props.title}</h3>
                    <h3 className="submission-subtitle">{this.displayToggle()}</h3>
                    {this.generateButtonToolbar()}
                </div>
                {this.state.open ?
                    <div className="sub-panel panel-body-with-header" style={{ 'maxHeight':'300px', 'overflowY':'auto' }}>
                        <table className="table table-striped table-fill">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Aliases</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Date submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions}
                            </tbody>
                        </table>
                    </div>
                    : null}
            </div>
        );
    }
}
