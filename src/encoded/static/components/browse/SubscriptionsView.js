'use strict';

import React from 'react';
import _ from 'underscore';
import url from 'url';
import memoize from 'memoize-one';
import { console, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { LocalizedTime } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';

import { DropdownButton, DropdownItem, ButtonToolbar, ButtonGroup } from 'react-bootstrap';
import { EmbeddedItemSearchTable } from '../item-pages/components/tables';
import { Schemas } from '../util';

/** @deprecated - DropDownButton, Button */
/** @todo use HTML elem(s) */


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
        const { schemas, session, windowHeight } = this.props;
        const { subscriptions, initialized } = this.state;
        let intro;
        let entries;

        if (Array.isArray(subscriptions) && subscriptions.length > 0){
            intro = "View your 4DN submissions and track those you're associated with.";
            entries = _.map(subscriptions, function({ url, title }){
                return <SubscriptionEntry {...{ url, title, session, schemas, windowHeight }} key={url} />;
            });
        } else if (initialized){
            intro = "No submissions to track; you are not a submitter nor associated with any labs.";
        } else {
            intro = <i className="icon icon-spin icon-circle-notch fas" style={{ 'opacity': '0.5' }}/>;
        }
        return (
            <div id="content" className="container">
                <div className="flexible-description-box item-page-heading mb-25 mt-1">
                    <p className="text-larger">{ intro }</p>
                </div>
                { entries }
            </div>
        );
    }
}

/**
 * Main submission/subscription component. One component per subscription.
 * Hold data from the search result from the subscription and organizes
 * it into a paginated table. Also allows filtering on item type.
 */
class SubscriptionEntry extends React.PureComponent {

    static getSearchHref(baseHref, itemType){
        const hrefParts = _.clone(url.parse(baseHref, true));
        const query = _.clone(hrefParts.query);
        if (itemType) {
            query.type = itemType;
            hrefParts.query = query;
            delete hrefParts.search; // Parses query if search is undefined.
        }
        hrefParts.pathname = "/search/";
        return url.format(hrefParts);
    }

    static typeOptionTitle(val, schemas){
        let showTitle = val;
        if (showTitle === "Item") {
            showTitle = "All";
        } else {
            showTitle = Schemas.Term.toName("type", val);
        }
        return showTitle;
    }

    static defaultProps = {
        "columns" : {
            "display_title" : { "title" : "Title", widthMap : { sm: 240, md: 320, lg: 400 } },
            "@type" : { "title" : "Type" },
            "status": { "title" : "Status", widthMap : { sm: 180, md: 200, lg: 240 } },
            "last_modified.date_modified": { "title" : "Modified" },
            "date_created": { "title" : "Created" }
        }
    };

    constructor(props){
        super(props);
        this.changePage = _.throttle(this.changePage, 250);
        _.bindAll(this, 'toggleOpen', 'setAvailableTypes',
            'displayToggle', 'generateButtonToolbar', 'handleChangeType'
        );
        const open = props.title == 'My submissions' ? true : false;
        this.state = {
            'availableTypes': null,
            'itemType': 'Item',
            'total' : null,
            open
        };
        this.memoized = {
            getSearchHref: memoize(SubscriptionEntry.getSearchHref)
        };
    }

    setAvailableTypes(resp){
        const { facets = null } = resp;
        this.setState(function({ availableTypes: currAvailTypes, itemType }){
            if (currAvailTypes) {
                return null;
            }
            if (!Array.isArray(facets)) {
                return { total: resp.total || 0 };
            }
            const typesFacet = _.findWhere(facets, { field: "type" });
            if (!typesFacet) {
                return null;
            }
            const availableTypes = _.sortBy(typesFacet.terms.filter(function(itemTypeTerm){
                const { doc_count, key } = itemTypeTerm;
                if (doc_count === 0) return false;
                if (key === "Item") return false;
                return true;
            }), "doc_count").reverse().map(function(itemTypeTerm){
                const { key } = itemTypeTerm;
                return key;
            });
            availableTypes.unshift("Item");
            return { availableTypes, total: resp.total };
        });
    }

    toggleOpen(e){
        e.preventDefault();
        this.setState(function({ open }){
            return { 'open': !open };
        });
    }

    displayToggle(){ // TODO: Make into functional component
        const { open } = this.state;
        return (
            <button type="button" className="btn btn-default icon-container" onClick={this.toggleOpen}>
                <i className={"icon fas icon-" + (open ? "minus" : "plus")} />
            </button>
        );
    }

    generateButtonToolbar(){
        const { open, itemType: selectedItemType, availableTypes } = this.state;
        if (!open || !availableTypes){
            return null;
        }
        return (
            <DropdownButton variant="outline-dark" title={SubscriptionEntry.typeOptionTitle(selectedItemType)} >
                {
                    availableTypes.map((itemType) =>
                        <DropdownItem key={itemType} data-tip={itemType} eventKey={itemType} onSelect={this.handleChangeType}>
                            { SubscriptionEntry.typeOptionTitle(itemType) }
                        </DropdownItem>
                    )
                }
            </DropdownButton>
        );
    }

    handleChangeType(eventKey){
        setTimeout(()=>{
            this.setState({ 'itemType' : eventKey });
        }, 250);
    }

    render(){
        const { title, url, session, schemas, columns, windowHeight } = this.props;
        const { open, itemType: selectedItemType, total } = this.state;

        const searchHref = this.memoized.getSearchHref(url, selectedItemType);
        const body = !open ? null : (
            <EmbeddedItemSearchTable {...{ session, schemas, searchHref, columns }}
                facets={null} onLoad={this.setAvailableTypes} maxHeight={Math.floor(windowHeight * 0.6)} />
        );

        console.log('RTR', windowHeight, Math.floor(windowHeight / 2));

        return(
            <div className="mb-1">
                <div className="submission-page-heading" data-open={open}>
                    <div className="row align-items-center">
                        <h3 className="col-auto text-400">{ this.displayToggle() }</h3>
                        <h3 className="col text-400 pt-01">
                            { title }
                            { typeof total === "number" ? <span className="ml-1 text-300">{ "(" + total + ")" }</span> : null }
                        </h3>
                        <div className="col-auto">{ this.generateButtonToolbar() }</div>
                    </div>
                </div>
                { body }
            </div>
        );
    }
}
