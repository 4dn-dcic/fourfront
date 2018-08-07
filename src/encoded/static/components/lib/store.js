'use strict';

/** @preventMungle */
/* ^ see http://stackoverflow.com/questions/30110437/leading-underscore-transpiled-wrong-with-es6-classes */

/** @ignore */
import _ from 'underscore';
import { ajax } from './../util';

/**
 * @module lib/store
 */

/**
 * Store for a collection of items persisted via the backend REST API
 *
 * @param {Array} items - Initial collection of items
 * @param view - View that should be notified of changes
 * @param {string} stateKey - Name in the view's state that should be updated with the changed collection
 */
class ItemStore {

    /** @ignore */
    constructor(items, view, stateKey) {
        this._fetch = ajax.fetch;
        this._items = items;
        this._listeners = [{view: view, stateKey: stateKey}];
    }

    /**
     * Create an item
     */
    create(collection, data) {
        return this.fetch(collection, {
            method: 'POST',
            body: JSON.stringify(data),
        }, response => {
            var item = response['@graph'][0];
            this._items.push(item);
            this.dispatch('onCreate', response);
        });
    }

    /**
     * Update an item
     * Ensure that data includes uuid and accession, if applicable, for PUT
     */
    update(data) {
        return this.fetch(data['@id'], {
            method: 'PUT',
            body: JSON.stringify(data),
        }, response => {
            var item = _.find(this._items, i => i['@id'] === data['@id']);
            _.extend(item, data);
            this.dispatch('onUpdate', item);
        });
    }

    /**
     * Delete an item (set its status to deleted)
     * del_item should include @id, uuid, and accession if applicable
     */
    delete(del_item) {
        var dispatch_body = {'status': 'deleted'};
        if(del_item.accession){
            dispatch_body.accession = del_item.accession;
        }
        if(del_item.uuid){
            dispatch_body.uuid = del_item.uuid;
        }
        return this.fetch(del_item['@id'] + '?render=false', {
            method: 'PATCH',
            body: JSON.stringify(dispatch_body),
        }, response => {
            var item = _.find(this._items, i => i['@id'] === del_item['@id']);
            this._items = _.reject(this._items, i => i['@id'] === del_item['@id']);
            this.dispatch('onDelete', item);
        });
    }

    /**
     * Call the backend
     */
    fetch(url, options, callback) {
        ajax.promise(
            url,
            options.method || 'GET',
            options.headers || {},
            options.body || null
        ).then(response => {
            console.log(response);
            if (response.status && response.status != 'success') throw response;
            return response;
        }).then(callback).catch(err => {
            this.dispatch('onError', err);
        });
    }

    /**
     * Notify listening views of actions and update their state
     * (should we update state optimistically?)
     * @param {string} method - Method
     * @param arg - Argument
     */
    dispatch(method, arg) {
        this._listeners.forEach(listener => {
            var view = listener.view;
            if (view[method] !== undefined) {
                view[method](arg);
            }
            var newState = {};
            newState[listener.stateKey] = this._items;
            view.setState(newState);
        });
    }
};

module.exports.ItemStore = ItemStore;
