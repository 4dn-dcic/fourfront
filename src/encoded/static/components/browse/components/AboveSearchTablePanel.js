'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { console, Schemas, ajax } from './../../util';



class AboveSearchTablePanelStaticContentPane extends React.Component {

    static isTargetHrefValid(targetHref){
        if (typeof targetHref === 'string') return true;
        return false;
    }

    constructor(props){
        super(props);
        this.state = {
            'content' : null,
            'title' : null
        };
        this.loadStaticContent();
    }

    componentDidUpdate(pastProps, pastState){
        if (AboveSearchTablePanelStaticContentPane.isTargetHrefValid(this.props.targetHref) && this.props.targetHref !== pastProps.targetHref){
            this.loadStaticContent();
        }
    }

    loadStaticContent(targetHref = this.props.targetHref){
        if (!AboveSearchTablePanelStaticContentPane.isTargetHrefValid(targetHref)){ return null; }

        var callback = function(resp){
            if (!resp || (resp.code && (resp.code === 403 || resp.code === 404))) return;
            
            
            var content = null, title = null;
            // TODO: Adjust for static block once we have those (once it exists it wont have sections).
            if (resp && resp.sections && resp.sections[0] && typeof resp.sections[0].content === 'string'){
                content = resp.sections[0].content;
                title = resp.sections[0].title || resp.title;
            }

            if (content){
                this.setState({ content, title });
            }
        }.bind(this);

        ajax.load(targetHref, callback, 'GET', callback);
    }

    render(){
        if (!AboveSearchTablePanelStaticContentPane.isTargetHrefValid(this.props.targetHref)) return null;
        console.log('CONTENT', this.state);

        var title = null;
        if (this.state.title){
            title = (
                <h4 className="text-300">
                    { this.state.title }
                </h4>
            );
        }

        return (
            <div className="row">
                <div className="col-md-3 hidden-xs hidden-sm">
                    <div>&nbsp;</div>
                </div>
                <div className="col-md-9 hidden-xs hidden-sm">
                    { title }
                    <div dangerouslySetInnerHTML={{ __html : this.state.content }} />
                </div>
            </div>
            
        );
    }

}


export class AboveSearchTablePanel extends React.Component {

    static currentItemTypesFromHrefParts(urlParts){
        var searchItemType = 'Item', abstractType;
        if (typeof urlParts.query.type === 'string') { // Non-empty
            if (urlParts.query.type !== 'Item') {
                searchItemType = urlParts.query.type;
            }
        }

        abstractType = Schemas.getAbstractTypeForType(searchItemType);
        return { searchItemType, abstractType };
    }

    static staticContentByTypeMap = {
        'Protocol' : '/search-info-header/Protocol'
    }

    static propTypes = {
        'href' : PropTypes.string.isRequired,
        'context' : PropTypes.object.isRequired
    }

    routeStaticContentHref(contextHref, context){
        var targetHref = null; // Our return val. Null by default.

        // 1. By Type
        var urlParts = url.parse(contextHref, true);
        var { searchItemType, abstractType } = AboveSearchTablePanel.currentItemTypesFromHrefParts(urlParts);
        var lookupMap = AboveSearchTablePanel.staticContentByTypeMap;
        targetHref = lookupMap[abstractType] || lookupMap[searchItemType] || null;
        if (typeof targetHref === 'string'){
            return targetHref;
        }

        // 2. TBD. By URL or other parameters or something.


        // 3. Fallback/default/null
        return null;

    }

    render(){

        // TODO: Add in custom front-end controls if/when applicable.
        // If we migrate 'full screen', 'select x for download' etc buttons/controls here (desireable) we need to make sure it communicates with external state container for the SearchResultTable.
        // SearchResultTable would likely need to expose some functions which would be accessible via instance reference to SearchResultTable and passed up as callback props into this one.

        return (
            <div className="above-table-panel">
                <AboveSearchTablePanelStaticContentPane targetHref={this.routeStaticContentHref(this.props.href, this.props.context)} />
            </div>
        );
    }

}